// Общее для хуков: какие истории тронуты, прогон check:story и story:lint, короткий отчёт.
// Хуки зовут готовые команды отдельным процессом: у check:story нет API, а повторять её разбор — значит
// получить вторую правду о том, что такое «тупик».
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadThresholds } from '../lib/thresholds.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const STORIES = 'src/stories';

const T = loadThresholds();
export const MAX_CHARS = T.value('skill.hook.max_output_chars');
export const MAX_FINDINGS = T.value('skill.hook.max_findings');
export const EXAMPLES = T.value('lint.examples');

/** id истории по пути файла: src/stories/<id>/… или src/stories/<id>.json; иначе null. */
export function storyOfPath(file, root = ROOT) {
  if (!file) return null;
  const rel = relative(root, file).split(sep).join('/');
  const m = rel.match(/^src\/stories\/([^/]+?)(?:\.json$|\/.)/);
  return m ? m[1] : null;
}

/** Файлы историй, которые git считает изменёнными, с подписью «размер:mtime» (удалённый — «-»). */
export function storySnapshot(root = ROOT) {
  let out = '';
  try {
    out = execFileSync('git', ['status', '--porcelain', '--untracked-files=all', '--', STORIES], { cwd: root, encoding: 'utf8' });
  } catch {
    return null;
  }
  const snap = {};
  for (const line of out.split('\n').filter(Boolean)) {
    const path = line.slice(3).split(' -> ').at(-1).replace(/^"|"$/g, '');
    try {
      const st = statSync(join(root, path));
      snap[path] = `${st.size}:${st.mtimeMs}`;
    } catch {
      snap[path] = '-';
    }
  }
  return snap;
}

/** Истории, файлы которых поменялись между двумя снимками (в том числе вернулись к версии из git). */
export function changedSince(before, after) {
  const ids = new Set();
  for (const path of new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])) {
    if ((before ?? {})[path] === (after ?? {})[path]) continue;
    const id = storyOfPath(join(ROOT, path));
    if (id) ids.add(id);
  }
  return [...ids].filter(storyExists);
}

export const storyExists = (id) => existsSync(join(ROOT, STORIES, id)) || existsSync(join(ROOT, STORIES, `${id}.json`));

const BETA_STOP_RE = /^[ \t]*={2,}[ \t]*beta_stop\b/m;

/**
 * Часть истории: главы 1–N с узлом beta_stop (набор для теста, главы 1–2 до главы 3). Без --partial lint
 * считает обрыв части тупиком сюжета и требует всего, что бывает только в целой истории (C-01, C-06, C-40…).
 */
export function isPartial(id, root = ROOT) {
  const dir = join(root, STORIES, id);
  try {
    if (existsSync(dir)) return readdirSync(dir).filter((f) => f.endsWith('.ink')).some((f) => BETA_STOP_RE.test(readFileSync(join(dir, f), 'utf8')));
    const data = JSON.parse(readFileSync(join(root, STORIES, `${id}.json`), 'utf8'));
    return [data.ink ?? '', ...Object.values(data.includes ?? {})].some((t) => BETA_STOP_RE.test(String(t)));
  } catch {
    return false;
  }
}

/** Состояние хуков одной сессии: снимок файлов и находки, о которых модели уже сказали. */
export function sessionState(sessionId) {
  const dir = join(tmpdir(), 'relayer-hooks');
  const key = createHash('sha1').update(ROOT).digest('hex').slice(0, 10);
  const file = join(dir, `${key}-${String(sessionId || 'nosession').replace(/[^\w-]/g, '_')}.json`);
  let data = { snapshot: null, seen: {} };
  try { data = { ...data, ...JSON.parse(readFileSync(file, 'utf8')) }; } catch { /* первый вызов в сессии */ }
  return {
    data,
    save() {
      try { mkdirSync(dir, { recursive: true }); writeFileSync(file, JSON.stringify(data)); } catch { /* без состояния хук просто повторится */ }
    },
  };
}

function runJson(script, args) {
  // stdout в файл, а не в трубу: из трубы доходят только первые 64 КБ, если команда выйдет раньше, чем допишет вывод
  const dir = mkdtempSync(join(tmpdir(), 'relayer-hook-'));
  const out = join(dir, 'out.json');
  const fd = openSync(out, 'w');
  let r;
  try {
    r = spawnSync(process.execPath, [script, ...args, '--json'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', fd, 'pipe'] });
  } finally {
    closeSync(fd);
  }
  let json = null;
  try { json = JSON.parse(readFileSync(out, 'utf8')); } catch { /* разберём stderr ниже */ }
  rmSync(dir, { recursive: true, force: true });
  return { json, stderr: (r.stderr || '').trim(), status: r.status };
}

/**
 * Проверка одной истории. quick — story:lint --quick (lint.runs.quick прогонов), иначе полный lint.
 * partial — story:lint --partial; по умолчанию сам, если в истории есть узел beta_stop (isPartial).
 * Находки приводятся к одному виду: { level, check, where, message, threshold? }.
 */
export function checkStory(id, { quick = true, partial = isPartial(id) } = {}) {
  const findings = [];
  // seed 1, как у story:lint: одинаковый сценарий — одинаковые находки, и «новые» не мигают от случайности бота
  const cs = runJson(join(ROOT, 'scripts/check-story.mjs'), [id, '--seed', '1']);
  const s = cs.json?.stories?.[0];
  if (!s) {
    findings.push({ level: 'error', check: 'check:story', where: 'история', message: firstLines(cs.stderr) || 'check:story не запустился' });
    return { id, compiled: false, findings };
  }
  if (s.errors) {
    for (const e of s.errors) {
      findings.push({ level: 'error', check: 'компиляция', where: e.file ? `${e.file}:${e.line ?? '?'}` : `строка ${e.line ?? '?'}`, message: e.message });
    }
    return { id, compiled: false, findings };
  }
  if (s.endings < s.runs) {
    findings.push({ level: 'error', check: 'check:story', where: 'история', message: `тупик: до конца дошли ${s.endings} прохождений из ${s.runs}` });
  }
  if (s.nodes.unvisited.length) {
    findings.push({ level: 'error', check: 'check:story', where: s.nodes.unvisited.join(', '), message: 'узлы недостижимы' });
  }
  for (const p of s.problems ?? []) findings.push({ level: 'warning', check: 'check:story', where: 'история', message: p });

  const lintScript = join(ROOT, 'scripts/lint/lint.mjs');
  // быстрый режим — story:lint --changed --quick --summary: сводка не длиннее skill.hook.max_output_chars
  const part = partial ? ['--partial'] : [];
  let lint = runJson(lintScript, quick ? [id, '--changed', '--quick', '--summary', ...part] : [id, ...part]);
  // правку откатили к версии из git — --changed историю не видит, а прежние находки нельзя счесть исправленными
  if (quick && lint.json && !lint.json.stories.length) lint = runJson(lintScript, [id, '--quick', '--summary', ...part]);
  if (!lint.json) {
    findings.push({ level: 'error', check: 'story:lint', where: 'история', message: firstLines(lint.stderr) || 'story:lint не запустился' });
  }
  for (const st of lint.json?.stories ?? []) {
    for (const f of st.findings) {
      const where = f.node ? f.node + (f.chapter ? ` (гл. ${f.chapter})` : '') : f.chapter ? `глава ${f.chapter}` : 'история';
      findings.push({ level: f.level, check: f.check, where, message: f.message, threshold: f.threshold });
    }
  }
  // из сводки — только счётчики по проверкам: находки хук отбирает сам (новые поимённо, прежние числом)
  const byCheck = lint.json?.summary?.split('\n').find((l) => l.startsWith('  по проверкам:'))?.trim() ?? null;
  return { id, compiled: true, partial, findings, byCheck, stats: { runs: s.runs, nodes: s.nodes.total } };
}

export const fingerprint = (f) => `${f.check}|${f.where}|${f.message}`;

export function counts(findings) {
  const c = { error: 0, warning: 0, hint: 0 };
  for (const f of findings) c[f.level] = (c[f.level] ?? 0) + 1;
  return c;
}

const LEVEL_SHORT = { error: '✗', warning: '⚠', hint: '·' };
export const findingLine = (f, withThreshold = false) =>
  `  ${LEVEL_SHORT[f.level] ?? '?'} ${f.check} · ${f.where} · ${f.message}${withThreshold && f.threshold ? ` · ${f.threshold}` : ''}`;

/** Режет текст до лимита поля хука: больше — модель получит только превью (claude-code-format.md §3.3). */
export function clip(text, max = MAX_CHARS) {
  if (text.length <= max) return text;
  const tail = '\n… вывод обрезан';
  return text.slice(0, max - tail.length) + tail;
}

function firstLines(text, n = 6) {
  return text.split('\n').filter(Boolean).slice(0, n).join(' / ');
}
