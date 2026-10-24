// Ядро story:lint: контекст истории для проверок, запуск модулей checks/C-NN.mjs, подавление
// «// намеренно: C-NN причина», вывод «уровень · C-NN · узел · сообщение · порог (опора)».
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { compile, formatMessages } from '../lib/compile.mjs';
import { compileInput, parseStory } from '../lib/story.mjs';
import { buildStatic } from './static.mjs';
import { runBot } from './journal.mjs';
import { LEVEL_RU } from './thresholds.mjs';

const CHECKS_DIR = fileURLToPath(new URL('./checks/', import.meta.url));
const CHECKS_MD = fileURLToPath(new URL('../../docs/playbook/checks.md', import.meta.url));

let known = null;
/** ID проверок из заголовков checks.md: «намеренно» на несуществующую проверку — ошибка разметки. */
export function knownChecks() {
  known ??= new Set([...readFileSync(CHECKS_MD, 'utf8').matchAll(/^### (C-\d\d)\./gm)].map((m) => m[1]));
  return known;
}

/** Все проверки: новый файл checks/C-NN.mjs — новая проверка, регистрировать не нужно. */
export async function loadChecks() {
  const files = readdirSync(CHECKS_DIR).filter((f) => /^C-\d\d\.mjs$/.test(f)).sort();
  const out = [];
  for (const f of files) out.push((await import(pathToFileURL(join(CHECKS_DIR, f)).href)).default);
  return out;
}

/**
 * Контекст одной истории. Бот запускается лениво: статическим проверкам (C-01, C-53…) он не нужен.
 * @param {object} o { runs, seed, partial, plan }
 */
export function analyze(story, T, o = {}) {
  const tree = parseStory(story);
  const st = buildStatic(tree);
  let built = null;
  let runs = null;
  return {
    story, tree, st, T, meta: story.meta ?? {}, partial: !!o.partial, plan: !!o.plan, knownChecks: knownChecks(),
    get built() { return (built ??= compile(compileInput(story))); },
    get runs() {
      if (!runs) runs = this.built.ok ? runBot(this.built.json, st, T, { runs: o.runs, seed: o.seed ?? 1 }) : [];
      return runs;
    },
  };
}

/** Метки «намеренно»: по узлу и общие (до первого узла — на всю историю). */
function suppressions(tree) {
  const byNode = [];
  const seen = new Set();
  for (const k of tree.knots) {
    for (const m of k.marks) {
      if (m.kind !== 'намеренно') continue;
      byNode.push({ id: m.id, reason: m.reason, node: k.id });
      seen.add(`${m.file ?? ''}:${m.line}`);
    }
  }
  const story = tree.comments
    .filter((c) => c.mark?.kind === 'намеренно' && !seen.has(`${c.file ?? ''}:${c.line}`))
    .map((c) => ({ id: c.mark.id, reason: c.mark.reason, node: null }));
  return [...byNode, ...story];
}

/**
 * Прогон проверок по истории.
 * @returns {{ id, path, findings, suppressed, skipped, compile }}
 */
export async function lintStory(story, T, o = {}) {
  const checks = o.checks ?? (await loadChecks());
  const ctx = analyze(story, T, o);
  const findings = [];
  const skipped = [];
  const result = { id: story.id, path: story.path, mode: o.plan ? 'plan' : o.partial ? 'partial' : 'full', findings, suppressed: [], skipped };

  if (!ctx.built.ok) {
    result.compile = ctx.built.errors;
    findings.push({ check: 'compile', level: 'error', key: null, node: null, chapter: null, message: `ошибка компиляции:\n${formatMessages(ctx.built.errors)}`, threshold: null });
    return result;
  }
  if (o.partial && !ctx.st.ids.has('beta_stop')) {
    findings.push({ check: 'partial', level: 'error', key: null, node: null, chapter: null, message: 'флаг --partial, но в истории нет узла beta_stop', threshold: null });
    return result;
  }

  for (const c of checks) {
    if (o.only && !o.only.includes(c.id)) continue;
    if (o.plan && !c.plan) { skipped.push({ check: c.id, why: 'не для скелета (--plan)' }); continue; }
    if (o.partial && c.partial === false) { skipped.push({ check: c.id, why: 'нужна вся история (--partial)' }); continue; }
    const find = (key, f) => {
      const t = T.get(key);
      // одно и то же место с тем же сообщением — одно срабатывание
      const same = findings.find((x) => x.check === c.id && x.key === key && x.node === (f.node ?? null) && x.message === f.message);
      if (same) return same;
      const item = {
        check: c.id, level: f.level ?? t.level, key, node: f.node ?? null, chapter: f.chapter ?? null,
        message: f.message, threshold: T.show(key), ...(f.examples ? { examples: f.examples } : {}), ...(f.data ? { data: f.data } : {}),
      };
      findings.push(item);
      return item;
    };
    c.run(ctx, find);
  }

  const sup = suppressions(ctx.tree);
  result.findings = findings.filter((f) => {
    // метка над узлом гасит находки узла и его stitch'ей; метка до первого узла — находки всей истории
    const s = sup.find((x) => x.id === f.check && (x.node == null ? f.node == null : f.node === x.node || f.node?.startsWith(`${x.node}.`)));
    if (!s) return true;
    result.suppressed.push({ ...f, suppressed: s.reason || '(без причины)' });
    return false;
  });
  return result;
}

const ORDER = { error: 0, warning: 1, hint: 2 };

/** Текст для человека: по истории, по уровню; похожих находок в одной главе — не больше lint.examples. */
export function formatStory(res, T) {
  const max = T.value('lint.examples');
  const lines = [];
  const counts = countLevels(res.findings);
  lines.push(`${counts.error ? '✗' : '✓'} ${res.path}${res.mode !== 'full' ? ` [${res.mode}]` : ''} — ошибок ${counts.error}, предупреждений ${counts.warning}, подсказок ${counts.hint}${res.suppressed.length ? `, подавлено ${res.suppressed.length}` : ''}`);
  const sorted = [...res.findings].sort((a, b) => ORDER[a.level] - ORDER[b.level] || a.check.localeCompare(b.check) || (a.chapter ?? 0) - (b.chapter ?? 0));
  const groups = new Map();
  for (const f of sorted) {
    const g = `${f.level}|${f.check}|${f.key}|${f.chapter ?? ''}`;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(f);
  }
  for (const list of groups.values()) {
    for (const f of list.slice(0, max)) lines.push('   ' + formatFinding(f));
    if (list.length > max) {
      const f = list[0];
      lines.push(`   ${LEVEL_RU[f.level]} · ${f.check} · … и ещё ${list.length - max}${f.chapter ? ` в главе ${f.chapter}` : ''} того же вида (все — в --json)`);
    }
  }
  return lines.join('\n');
}

export function formatFinding(f) {
  const where = f.node ? f.node + (f.chapter ? ` (гл. ${f.chapter})` : '') : f.chapter ? `глава ${f.chapter}` : 'история';
  const parts = [LEVEL_RU[f.level], f.check, where, f.message];
  if (f.threshold) parts.push(f.threshold);
  return parts.join(' · ');
}

export function countLevels(findings) {
  const c = { error: 0, warning: 0, hint: 0 };
  for (const f of findings) c[f.level]++;
  return c;
}
