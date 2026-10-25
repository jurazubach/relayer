// story:cast — контакты истории: когда появляются, сколько говорят, сколько к ним обращаются, какой у них вес.
import { walk } from '../lib/ink.mjs';
import { runCli, intFlag, median, pct, table } from './core/cli.mjs';
import { prepare, runOnce } from './core/run.mjs';
import { threshold, thresholdEntry } from '../lib/thresholds.mjs';
import { varIndex } from './core/vars-index.mjs';

const HELP = `npm run story:cast -- [--story <id>] [--runs N] [--seed N] [--json]

Контакты истории: # contact, characters из описания и все, кто пишет (#from).
Статически по дереву: глава появления, реплики, блоки #from, кнопки к контакту (#to или кнопка
в его чате), главы присутствия, связанные переменные. По прохождениям (случайная персона):
сколько реплик игрок видит за прохождение и в какой доле прохождений контакт вообще есть.

Уровень — первое подходящее правило:
  эпизодический  реплик < cast.episodic_lines (R-75) или он есть только в одной главе
                 (если глав от трёх)
  ось            к нему не меньше cast.side_buttons кнопок, и его переменная (называется <id>_…
                 или больше половины её записей — под кнопками к нему) читается финалом,
                 распределителем или в последней главе: отношения с ним решают исход
  сторона        кнопок к нему не меньше cast.side_buttons и он есть хотя бы в доле глав
                 cast.side_presence: игрок с ним разговаривает, но исход он не решает
  источник       реплик не меньше cast.main_lines, а разговора нет (кнопок меньше
                 cast.side_buttons или глав меньше cast.side_presence): приносит сведения
  фон            все остальные: пишет, но не ведёт и не решает
Пороги — ключи cast.* в docs/playbook/thresholds.json.

Пометки: «нет в characters» (C-45 п. 6), «# contact без реплик».

  --story <id>  история или несколько через запятую; по умолчанию все из src/stories
  --runs N      прохождений для подсчёта по ходу игры (по умолчанию bot.runs; 0 — без них)
  --seed N      начальный seed (по умолчанию 1)
  --json        всё данными
  --help        эта справка`;

function castOf(p, { runs = 0, seed = 1 } = {}) {
  const { tree, story } = p;
  const idx = varIndex(tree);
  const chapters = Math.max(1, idx.lastChapter);
  const chars = (story.meta.characters ?? []).filter((c) => c.id);
  const rows = new Map();
  const row = (id) => {
    if (!rows.has(id)) rows.set(id, { id, name: tree.contacts[id]?.name ?? chars.find((c) => c.id === id)?.name ?? id, lines: 0, blocks: 0, buttons: 0, chapters: new Set(), first: null, unlock: null, vars: new Set(), under: new Map() });
    return rows.get(id);
  };
  for (const id of Object.keys(tree.contacts)) row(id);
  for (const c of chars) row(c.id);
  for (const k of tree.knots) {
    walk(k.items, (it) => {
      if (it.type === 'msg' && it.who) {
        const r = row(it.who);
        r.lines++;
        if ('from' in it.tags) r.blocks++;
        r.chapters.add(k.chapter);
        if (r.first == null || k.chapter < r.first) r.first = k.chapter;
      }
      if (['msg', 'me', 'sys', 'tags'].includes(it.type) && it.tags?.unlock) {
        const r = row(it.tags.unlock);
        if (r.unlock == null || k.chapter < r.unlock) r.unlock = k.chapter;
      }
      // напоминание и скрытая ветка «не ответил» — не кнопка: разговора с игроком в них нет
      if (it.type === 'choice' && it.role === 'button') {
        const to = it.tags.to || it.speaker;
        if (!to) return;
        const r = row(to);
        r.buttons++;
        walk(it.items, (x) => {
          const m = x.type === 'code' && x.text.match(/^([\p{L}\p{N}_]+)\s*(\+\+|--|[+\-*/]?=(?!=))/u);
          if (m && idx.byName.has(m[1])) r.under.set(m[1], (r.under.get(m[1]) ?? 0) + 1);
        });
      }
    });
  }
  // переменная контакта: названа <id>_… или большая часть её записей — под кнопками к нему
  for (const r of rows.values()) {
    for (const v of idx.vars) if (v.name.toLowerCase().startsWith(`${r.id.toLowerCase()}_`)) r.vars.add(v.name);
    for (const [name, n] of r.under) if (n * 2 > idx.byName.get(name).writes.length) r.vars.add(name);
  }

  // по ходу игры: сколько реплик игрок видит на самом деле — статический счёт завышают ветки
  const seen = new Map();
  for (let k = 0; k < runs; k++) {
    const r = runOnce(p, { persona: 'random', seed: seed + k });
    const per = new Map();
    for (const it of r.timeline.items) if (it.type === 'line' && (it.kind === 'in' || it.kind === 'photo') && it.who) per.set(it.who, (per.get(it.who) ?? 0) + 1);
    for (const id of rows.keys()) {
      if (!seen.has(id)) seen.set(id, []);
      seen.get(id).push(per.get(id) ?? 0);
    }
    for (const [id, n] of per) if (!rows.has(id)) { row(id); seen.set(id, [...Array(k).fill(0), n]); }
  }

  const T = {
    episodic: threshold('cast.episodic_lines'), main: threshold('cast.main_lines'),
    buttons: threshold('cast.side_buttons'), presence: threshold('cast.side_presence'),
  };
  return [...rows.values()].map((r) => {
    const present = r.chapters.size;
    const share = present / chapters;
    // исход решается в финалах и распределителях, а в истории с одним END — в последней главе
    const decides = (v) => v.readByFinal || (chapters > 1 && v.reads.some((x) => (x.chapter ?? 0) >= idx.lastChapter));
    const finalVars = [...r.vars].filter((v) => decides(idx.byName.get(v)));
    let level;
    let why;
    if (r.lines < T.episodic || (chapters >= 3 && present <= 1)) { level = 'эпизодический'; why = r.lines < T.episodic ? `реплик ${r.lines} < ${T.episodic}` : 'одна глава'; }
    else if (r.buttons >= T.buttons && finalVars.length) { level = 'ось'; why = `финал читает ${finalVars.join(', ')}`; }
    else if (r.buttons >= T.buttons && share >= T.presence) { level = 'сторона'; why = `кнопок ${r.buttons}, глав ${present} из ${chapters}`; }
    else if (r.lines >= T.main) { level = 'источник'; why = `реплик ${r.lines}, кнопок ${r.buttons}`; }
    else { level = 'фон'; why = `реплик ${r.lines}, кнопок ${r.buttons}, глав ${present}`; }
    const notes = [];
    if (chars.length && !chars.some((c) => c.id === r.id)) notes.push('нет в characters');
    if (tree.contacts[r.id] && !r.lines) notes.push('# contact без реплик');
    const s = seen.get(r.id) ?? [];
    return {
      id: r.id, name: r.name, level, why, first: r.first, unlock: r.unlock, lines: r.lines, blocks: r.blocks, buttons: r.buttons,
      chapters: [...r.chapters].sort((a, b) => a - b), presence: share, vars: [...r.vars], finalVars, notes, under: Object.fromEntries(r.under),
      played: runs ? { median: median(s), share: s.filter((n) => n > 0).length / runs } : null,
    };
  }).sort((a, b) => b.lines - a.lines);
}

const ORDER = ['ось', 'сторона', 'источник', 'фон', 'эпизодический'];

runCli(HELP, async (args) => {
  const json = args.has('json');
  const runs = intFlag(args, 'runs', threshold('bot.runs'));
  const seed = intFlag(args, 'seed', 1);
  const report = [];
  for (const ref of args.refs) {
    const p = prepare(ref);
    const cast = castOf(p, { runs, seed });
    const levels = Object.fromEntries(ORDER.map((l) => [l, cast.filter((c) => c.level === l).map((c) => c.id)]));
    report.push({ id: p.story.id, path: p.story.path, runs, levels, cast });
    if (json) continue;
    console.log(`${p.story.path} · контактов ${cast.length}${runs ? ` · по ходу игры — ${runs} прохождений` : ''}`);
    console.log(table(cast.map((c) => [
      c.id, c.name, c.level, c.first ?? '—', c.lines, c.blocks, c.buttons, c.chapters.join(',') || '—',
      c.played ? `${c.played.median} · ${pct(Math.round(c.played.share * 100), 100)}` : '',
      c.vars.slice(0, 3).join(', ') + (c.vars.length > 3 ? ` +${c.vars.length - 3}` : ''), [c.why, ...c.notes].join('; '),
    ]), ['id', 'имя', 'уровень', 'гл.', 'реплик', 'блоков', 'кнопок', 'главы', 'за игру', 'переменные', 'почему']).replace(/^/gm, '   '));
    console.log(`   ${ORDER.map((l) => `${l}: ${levels[l].length}`).join(' · ')}\n`);
  }
  if (json) console.log(JSON.stringify({ stories: report, thresholds: ['cast.episodic_lines', 'cast.main_lines', 'cast.side_buttons', 'cast.side_presence'].map(thresholdEntry) }, null, 1));
});
