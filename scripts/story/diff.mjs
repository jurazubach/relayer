// story:diff — метрики истории до и после между ревизиями git; --text — реплики по узлам до и после.
import { spawn } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStory, parseStory } from '../lib/story.mjs';
import { runCli, intFlag, table } from './core/cli.mjs';
import { dialogueMap, hunks, lineDiff } from './core/dialogue.mjs';
import { WORKTREE, changedStories, describeRef, isWorktree, storyAt } from './core/revisions.mjs';
import { fmtDuration } from './core/timeline.mjs';
import { threshold } from './core/thresholds.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const GROUPS = ['lint', 'trace', 'sessions', 'cast', 'endings'];

const HELP = `npm run story:diff -- <реф-до> [<реф-после>] [--story <id>] [--only lint,trace,…] [--runs N]
                      [--quick] [--partial] [--full] [--text [--node <узел>]] [--json]

Метрики истории до и после между ревизиями git (тег <id>-r3, ветка, коммит; «.» — рабочая копия,
по умолчанию вторая ревизия — она). Обе версии меряются нынешними командами, одной линейкой:
файлы src/stories/<id> из ревизии копируются во временную папку.

Группы метрик (--only — часть из них):
  lint      находки story:lint по уровням и по C-NN; какие «C-NN · узел» появились и ушли
  trace     story:trace --persona all: у каждой персоны финал, строк, кнопок, время в обоих режимах
  sessions  story:sessions: медианы реального времени и по клику, самая длинная пауза, хвост,
            сессии и доля микросессий, число замечаний
  cast      story:cast: контакты по уровням, реплики и уровень каждого контакта
  endings   story:endings: доля каждого финала по всем персонам, решающие переменные, подсказки

Команда упала на ревизии — «нет данных: <команда>», остальные группы считаются.

  <реф-до> [<реф-после>]  ревизии; «.» — рабочая копия
  --story <id>   какие истории; по умолчанию — те, чьи файлы в src/stories различаются между ревизиями
  --only <гр.>   только эти группы, через запятую
  --runs N       прохождений вместо умолчаний команд (lint --runs, sessions, cast, endings)
  --quick        быстро: lint --quick, остальным lint.runs.quick прохождений
  --partial      история из части глав (beta_stop) — передаётся командам
  --full         печатать и неизменившиеся метрики
  --text         вместо метрик — реплики по узлам до и после в виде переписки: что убрано (−),
                 что добавлено (+), новые и удалённые узлы
  --node <узел>  с --text — только этот узел и его stitch'и
  --json         всё данными
  --help         эта справка`;

const CONTEXT = 1;

/**
 * Команда story:* с --json → { ok, data, error }. Асинхронно: обе ревизии и все группы идут параллельно.
 * stdout — в файл, а не в трубу: story:lint завершается process.exit, и труба обрезает JSON на 64 КБ.
 */
function runJson(script, args, outFile) {
  return new Promise((resolve) => {
    const fd = openSync(outFile, 'w');
    const child = spawn(process.execPath, [script, ...args, '--json'], { stdio: ['ignore', fd, 'pipe'] });
    const err = [];
    child.stderr.on('data', (c) => err.push(c));
    child.on('close', (code) => {
      closeSync(fd);
      try {
        resolve({ ok: true, data: JSON.parse(readFileSync(outFile, 'utf8')), code });
      } catch {
        const msg = Buffer.concat(err).toString('utf8').trim().split('\n')[0] || `код ${code}, вывод не JSON`;
        resolve({ ok: false, error: msg, code });
      }
    });
  });
}

/** Очередь с пределом параллельности: команды бота едят процессор. */
async function pool(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;
  const worker = async () => { while (next < tasks.length) { const i = next++; results[i] = await tasks[i](); } };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

function commandFor(group, path, o) {
  // --quick: у линта свой быстрый режим, остальным — тот же предел прохождений lint.runs.quick
  const n = o.runs ?? (o.quick ? threshold('lint.runs.quick') : null);
  const runs = n != null ? ['--runs', String(n)] : [];
  const partial = o.partial ? ['--partial'] : [];
  switch (group) {
    case 'lint': return { script: join(HERE, '../lint/lint.mjs'), args: [path, ...(o.runs == null && o.quick ? ['--quick'] : runs), ...partial], name: 'story:lint' };
    case 'trace': return { script: join(HERE, 'trace.mjs'), args: ['--story', path, '--persona', 'all', '--visible', ...partial], name: 'story:trace' };
    case 'sessions': return { script: join(HERE, 'sessions.mjs'), args: ['--story', path, ...runs, ...partial], name: 'story:sessions' };
    case 'cast': return { script: join(HERE, 'cast.mjs'), args: ['--story', path, ...runs], name: 'story:cast' };
    case 'endings': return { script: join(HERE, 'endings.mjs'), args: ['--story', path, ...runs, ...partial], name: 'story:endings' };
    default: throw new Error(`нет группы ${group}`);
  }
}

// ───────── метрики из --json команд: [{ name, value, unit }]; unit: 'с' — длительность, 'доля', null

const m = (name, value, unit = null) => ({ name, value, unit });

function lintMetrics(d) {
  const s = d.stories[0];
  const out = [m('ошибок', s.counts.error ?? 0), m('предупреждений', s.counts.warning ?? 0), m('подсказок', s.counts.hint ?? 0)];
  const byCheck = new Map();
  for (const f of s.findings) byCheck.set(f.check, (byCheck.get(f.check) ?? 0) + 1);
  for (const [id, n] of [...byCheck].sort()) out.push(m(id, n));
  if (s.suppressed?.length) out.push(m('подавлено // намеренно', s.suppressed.length));
  return out;
}

/** Набор «C-NN · узел» — что появилось и ушло: число по проверке не скажет, сменилось ли место. */
const lintPlaces = (d) => new Set(d.stories[0].findings.map((f) => `${f.check} · ${f.node ?? 'вся история'}`));

function traceMetrics(d) {
  const out = [];
  for (const r of d.stories[0].runs) {
    const p = r.persona;
    out.push(m(`${p}: финал`, r.ending?.name ?? '—'), m(`${p}: строк`, r.totals.lines), m(`${p}: кнопок`, r.totals.choices),
      m(`${p}: реальное время`, r.totals.real, 'с'), m(`${p}: по клику`, r.totals.click, 'с'), m(`${p}: строк после последней кнопки`, r.totals.tail.lines));
  }
  return out;
}

function sessionsMetrics(d) {
  const s = d.stories[0];
  const out = [];
  for (const p of s.personas) {
    const pre = s.personas.length > 1 ? `${p.persona}: ` : '';
    out.push(m(`${pre}реальное время, медиана`, p.real?.median, 'с'), m(`${pre}по клику, медиана`, p.click?.median, 'с'),
      m(`${pre}самая длинная пауза`, p.maxPause?.median, 'с'), m(`${pre}пауза после последней кнопки`, p.tail?.median, 'с'),
      m(`${pre}сессий, медиана`, p.sessions?.median), m(`${pre}доля микросессий`, p.sessions?.microShare, 'доля'));
  }
  out.push(m('замечаний', Object.values(s.problems ?? {}).flat().length));
  if (s.card) out.push(m('карточка: минут', s.card.minutes ?? '—'), m('карточка: дней', s.card.days ?? '—'));
  return out;
}

function castMetrics(d) {
  const s = d.stories[0];
  const out = [m('контактов', s.cast.length)];
  for (const [level, ids] of Object.entries(s.levels)) out.push(m(`уровень «${level}»`, ids.length));
  for (const c of s.cast) out.push(m(`${c.id}: уровень`, c.level), m(`${c.id}: реплик`, c.lines), m(`${c.id}: кнопок к нему`, c.buttons));
  return out;
}

function endingsMetrics(d) {
  const s = d.stories[0];
  const out = [m('финалов', s.endings.length), m('прохождений', s.runs)];
  for (const e of s.endings) out.push(m(`${e.name}: доля`, e.share ?? 0, 'доля'));
  out.push(m('решающих переменных', s.deciders?.length ?? 0), m('подсказок', s.hints?.length ?? 0), m('финалов без метки', s.unmarked?.length ?? 0));
  return out;
}

const EXTRACT = { lint: lintMetrics, trace: traceMetrics, sessions: sessionsMetrics, cast: castMetrics, endings: endingsMetrics };

/** Склейка метрик до и после по имени: метрика, которой нет в одной из версий, — «—». */
function pair(before, after, { zero = false } = {}) {
  const names = [...new Set([...before.map((x) => x.name), ...after.map((x) => x.name)])];
  const get = (list, n) => list.find((x) => x.name === n);
  return names.map((name) => {
    const a = get(before, name);
    const b = get(after, name);
    const unit = a?.unit ?? b?.unit ?? null;
    // у счётчиков (находки по C-NN) «нет строки» в посчитанной версии значит ноль, а не «нет данных»
    const va = a?.value ?? (zero && before.length ? 0 : null);
    const vb = b?.value ?? (zero && after.length ? 0 : null);
    return { name, unit, before: va, after: vb, changed: !same(va, vb, unit) };
  });
}

/** Одинаково ли для глаза: длительности — до секунды, доли — до процента. */
function same(a, b, unit) {
  if (typeof a === 'number' && typeof b === 'number') {
    if (unit === 'с') return Math.round(a) === Math.round(b);
    if (unit === 'доля') return Math.round(a * 100) === Math.round(b * 100);
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

const fmt = (v, unit) => {
  if (v == null) return '—';
  if (typeof v !== 'number') return String(v);
  if (unit === 'с') return fmtDuration(v);
  if (unit === 'доля') return `${Math.round(v * 100)}%`;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
};

function delta(r) {
  if (!r.changed) return '';
  if (r.before == null) return 'появилось';
  if (r.after == null) return 'ушло';
  if (typeof r.before !== 'number' || typeof r.after !== 'number') return '≠';
  const d = r.after - r.before;
  const sign = d > 0 ? '+' : '−';
  if (r.unit === 'с') return `${sign}${fmtDuration(Math.abs(d))}`;
  if (r.unit === 'доля') return `${sign}${Math.abs(Math.round(d * 100))} п.п.`;
  return `${sign}${fmt(Math.abs(d))}`;
}

// ───────── --text: реплики по узлам

function textDiff(pathA, pathB, onlyNode) {
  const load = (p) => (p ? dialogueMap(parseStory(loadStory(p))) : new Map());
  const A = load(pathA);
  const B = load(pathB);
  const ids = [...new Set([...A.keys(), ...B.keys()])]
    .filter((id) => !onlyNode || id === onlyNode || id.startsWith(`${onlyNode}.`));
  if (onlyNode && !ids.length) throw new Error(`нет узла «${onlyNode}» ни до, ни после`);
  const nodes = [];
  for (const id of ids) {
    const a = A.get(id);
    const b = B.get(id);
    const status = !a ? 'новый' : !b ? 'удалён' : 'изменён';
    const d = lineDiff(a?.lines ?? [], b?.lines ?? []);
    const removed = d.filter((x) => x.op === '-').length;
    const added = d.filter((x) => x.op === '+').length;
    if (!removed && !added && !onlyNode) continue;
    nodes.push({ id, chapter: b?.chapter ?? a?.chapter ?? null, status: removed || added ? status : 'без изменений', removed, added, hunks: onlyNode ? d : hunks(d, CONTEXT) });
  }
  return nodes;
}

function textOut(nodes) {
  const out = [];
  for (const n of nodes) {
    out.push(`@@ ${n.id}${n.chapter ? ` (гл. ${n.chapter})` : ''} · ${n.status}${n.removed || n.added ? ` · −${n.removed} +${n.added}` : ''}`);
    for (const h of n.hunks) out.push(h.op === '…' ? `   … ${h.skipped} без изменений …` : ` ${h.op} ${h.text}`);
    out.push('');
  }
  const count = (s) => nodes.filter((n) => n.status === s).length;
  out.push(`узлов: изменено ${count('изменён')}, новых ${count('новый')}, удалено ${count('удалён')} · реплик −${nodes.reduce((s, n) => s + n.removed, 0)} +${nodes.reduce((s, n) => s + n.added, 0)}`);
  return out.join('\n');
}

// ───────── запуск

const refLabel = (r) => (isWorktree(r.ref) ? 'рабочая копия' : `${r.ref}${r.short && r.short !== r.ref ? ` (${r.short}, ${r.date})` : ` (${r.date})`}`);

runCli(HELP, async (args) => {
  const refs = args.positional;
  if (!refs.length || refs.length > 2) throw new Error('нужны одна или две ревизии: npm run story:diff -- stories-v1 HEAD («.» — рабочая копия)');
  const a = describeRef(refs[0]);
  const b = describeRef(refs[1] ?? WORKTREE);
  const json = args.has('json');
  const only = args.get('only') ? String(args.get('only')).split(',').map((x) => x.trim()) : GROUPS;
  const bad = only.filter((g) => !GROUPS.includes(g));
  if (bad.length) throw new Error(`--only: нет групп ${bad.join(', ')} (есть: ${GROUPS.join(', ')})`);
  const o = { runs: intFlag(args, 'runs', null), quick: args.has('quick'), partial: args.has('partial') };

  const explicit = args.all('story').flatMap((s) => String(s).split(',')).filter(Boolean);
  const ids = explicit.length ? explicit : changedStories(a, b);
  const head = `story:diff ${refLabel(a)} → ${refLabel(b)}`;
  if (!ids.length) {
    if (json) console.log(JSON.stringify({ a, b, stories: [] }, null, 1));
    else console.log(`${head}\nистории в src/stories между ревизиями не менялись (--story <id> — сравнить всё равно)`);
    return 0;
  }

  const tmp = mkdtempSync(join(tmpdir(), 'story-diff-'));
  try {
    const report = [];
    for (const id of ids) {
      const pathA = storyAt(a, id, tmp);
      const pathB = storyAt(b, id, tmp);
      if (!pathA && !pathB) throw new Error(`истории «${id}» нет ни в ${refLabel(a)}, ни в ${refLabel(b)}`);
      const entry = { id, before: pathA ? refLabel(a) : null, after: pathB ? refLabel(b) : null };
      if (args.has('text')) {
        entry.nodes = textDiff(pathA, pathB, args.get('node'));
        report.push(entry);
        if (!json) console.log(`${head} · ${id} · реплики по узлам\n${!pathA ? `   (в ${refLabel(a)} истории нет)\n` : ''}${!pathB ? `   (в ${refLabel(b)} истории нет)\n` : ''}\n${textOut(entry.nodes)}\n`);
        continue;
      }
      const tasks = [];
      for (const g of only) {
        for (const [side, path] of [['before', pathA], ['after', pathB]]) {
          if (!path) continue;
          const c = commandFor(g, path, o);
          const out = join(tmp, `${id}.${g}.${side}.json`);
          tasks.push(async () => ({ g, side, name: c.name, res: await runJson(c.script, c.args, out) }));
        }
      }
      const results = await pool(tasks, Math.max(2, availableParallelism() - 1));
      entry.groups = [];
      for (const g of only) {
        const got = (side) => results.find((r) => r.g === g && r.side === side);
        const before = got('before');
        const after = got('after');
        const errors = [before, after].filter((r) => r && !r.res.ok).map((r) => `нет данных: ${r.name} (${r.side === 'before' ? refLabel(a) : refLabel(b)}): ${r.res.error}`);
        const metrics = (r) => (r?.res.ok ? EXTRACT[g](r.res.data) : []);
        const group = { group: g, rows: pair(metrics(before), metrics(after), { zero: g === 'lint' }), errors };
        if (g === 'lint' && before?.res.ok && after?.res.ok) {
          const pa = lintPlaces(before.res.data);
          const pb = lintPlaces(after.res.data);
          group.appeared = [...pb].filter((x) => !pa.has(x)).sort();
          group.gone = [...pa].filter((x) => !pb.has(x)).sort();
        }
        entry.groups.push(group);
      }
      report.push(entry);
      if (json) continue;
      const out = [`${head} · ${id}`];
      if (!pathA) out.push(`   в ${refLabel(a)} истории нет — «до» пусто`);
      if (!pathB) out.push(`   в ${refLabel(b)} истории нет — «после» пусто`);
      let hidden = 0;
      for (const grp of entry.groups) {
        out.push('', grp.group);
        for (const e of grp.errors) out.push(`   ${e}`);
        const rows = grp.rows.filter((r) => args.has('full') || r.changed);
        hidden += grp.rows.length - rows.length;
        if (rows.length) out.push(table(rows.map((r) => [r.name, fmt(r.before, r.unit), fmt(r.after, r.unit), delta(r)]), ['метрика', 'до', 'после', 'Δ']).replace(/^/gm, '   '));
        else if (!grp.errors.length) out.push('   без изменений');
        const list = (xs) => `${xs.slice(0, 12).join('; ')}${xs.length > 12 ? `; и ещё ${xs.length - 12}` : ''}`;
        if (grp.appeared?.length) out.push(`   появились: ${list(grp.appeared)}`);
        if (grp.gone?.length) out.push(`   ушли: ${list(grp.gone)}`);
      }
      if (hidden) out.push('', `без изменений ещё ${hidden} метрик (--full — показать)`);
      console.log(`${out.join('\n')}\n`);
    }
    if (json) console.log(JSON.stringify({ a, b, stories: report }, null, 1));
    return 0;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}, { bool: ['text', 'full', 'quick', 'partial'] });
