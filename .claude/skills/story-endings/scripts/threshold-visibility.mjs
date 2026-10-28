// Видимость порога финала: какие переменные решают финал, звучат ли они словами персонажа до финала и есть
// ли перед распределителем сводка (R-104, R-105; приёмы F-09, F-10). Индекс переменных — тот же, что у
// story:vars и story:endings (scripts/story/core/vars-index.mjs), поэтому записи и чтения совпадают с ними.
import { loadStory, parseStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { varIndex, VISIBLE } from '../../../../scripts/story/core/vars-index.mjs';
import { resolveTarget, walk } from '../../../../scripts/lib/ink.mjs';
import { buildStatic } from '../../../../scripts/lint/static.mjs';
import { prepare, runOnce } from '../../../../scripts/story/core/run.mjs';
import { nodeGraph } from '../../../../scripts/story/core/graph.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/threshold-visibility.mjs [--story <id|путь>,…] [--var <имя>] [--json]

Видимость порога финала (скилл story-endings; R-104, R-105, C-03, C-06; приёмы F-09, F-10).
Решают финал — переменные, которые читает распределитель (узел, ведущий в два финальных и больше), и на
одну ступень те, под условием на которые они пишутся (как C-06 и story:endings).

Для каждой такой переменной:
  записи      сколько и в каких главах (как story:vars)
  звучит      видимые чтения (реплика, подстановка, кнопка под условием) вне финальных узлов и
              распределителя: в главах до последней — «раньше»; в последней главе до распределителя — «в сводке»;
              условный переход в узел с текстом — «сценой» (отклик, как в C-04, но не слова о пороге)
  вердикт     последний выбор — пишут только кнопки последней главы: это выбор игрока, порога нет (R-102);
              итог — пишется только кодом в последней главе (сумма, ending): судят по его составляющим;
              не звучит нигде до финала — порог скрыт: F-09 (C-03 C-03.invisible);
              звучит только сценой или не в сводке перед финалом — кандидат в сводку F-10 (R-105)
Итог по распределителю: есть ли в нём кнопка (финал выбирает игрок, R-102), сколько переменных из
решающих звучат в последней главе до него — сводка полная, частичная или её нет.
Без распределителя (финал один) — порога нет, вывод пустой: это не находка этого скрипта.

Перекрытие последнего выбора (по прогонам бота random, --runs): для каждой переменной, которую распределитель
читает сам (кроме последнего выбора), и каждого её значения — какой финал чаще всего у каждой кнопки последнего выбора. Если у
всех кнопок он один и тот же, а при остальных значениях кнопки финал меняют, — при этом значении кнопки финал
не решают: ранний флаг стоит в распределителе раньше выбора (так выходит, когда ранний финал переносят
к последней развилке, но проверяют первым).
Чинить — флаг как обстоятельство внутри исхода кнопки (текст финала по флагу), а не отдельным правилом.

  --story   история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --var     одна переменная: все её записи и чтения с узлами
  --runs N  прогонов бота для перекрытия (по умолчанию endings.runs); 0 — без прогонов
  --json    всё данными
  --help    эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const refs = storyRefs((opt('--story') ?? '').split(',').filter(Boolean));
const only = opt('--var');
const RUNS = opt('--runs') != null ? Number(opt('--runs')) : T.value('endings.runs');

const IDENT = /[\p{L}_][\p{L}\p{N}_]*/gu;
const idents = (expr) => (String(expr ?? '').replace(/"[^"]*"/g, ' ').match(IDENT) ?? []);
const hasText = (items) => { let f = false; walk(items, (it) => { if (['msg', 'me', 'sys'].includes(it.type)) f = true; }); return f; };

/** Условный переход в узел с текстом ({x: -> сцена}): имя → [{ node, chapter }] — как divertEchoes в C-04. */
function sceneReads(tree) {
  const ids = new Set(tree.knots.map((k) => k.id));
  const textKnots = new Set(tree.knots.filter((k) => hasText(k.items)).map((k) => k.id));
  const out = new Map();
  for (const k of tree.knots) {
    walk(k.items, (it) => {
      if (it.type !== 'cond') return;
      for (const b of it.branches) {
        if (hasText(b.items) || !b.items.some((x) => x.type === 'divert' && textKnots.has(resolveTarget(x.target, k.id, ids)))) continue;
        for (const n of [...idents(it.head), ...(b.cond === 'else' ? [] : idents(b.cond))]) {
          if (!out.has(n)) out.set(n, []);
          out.get(n).push({ node: k.id, chapter: k.chapter ?? null });
        }
      }
    });
  }
  return out;
}

const chaptersOf = (list) => [...new Set(list.map((x) => x.chapter).filter((c) => c != null))].sort((a, b) => a - b);

const report = [];
for (const ref of refs) {
  const story = loadStory(ref);
  const tree = parseStory(story);
  const idx = varIndex(tree);
  const st = buildStatic(tree);
  const scenes = sceneReads(tree);
  const { final, lastChapter } = idx;
  let { distributors } = idx;
  // финал с кнопкой-реакцией внутри ядро финалом не считает, и распределитель пропадает; тогда распределитель —
  // узел без кнопок, который прямо разводит по двум узлам с -> END или меткой // финал:
  if (!distributors.size) {
    const ends = new Set(st.endings.endings.map((e) => e.id));
    distributors = new Set([...nodeGraph(tree)].filter(([, n]) => !n.choices && new Set([...n.exits].filter((t) => ends.has(t))).size >= 2).map(([id]) => id));
  }
  // финал — и финальные узлы обоих индексов, и узлы с -> END или меткой: финал с кнопкой внутри — всё ещё финал
  const endingIds = new Set([...final, ...st.finals, ...st.endings.endings.map((e) => e.id)]);
  const late = (r) => endingIds.has(r.node) || distributors.has(r.node);
  const hasChoice = st.hasChoice;
  const chapterOfNode = new Map(tree.knots.map((k) => [k.id, k.chapter ?? null]));
  const dists = [];
  for (const R of distributors) {
    // прямые чтения распределителя и одна ступень производных: «~ ending = …» под условием на x — решает и x
    const direct = new Set(idx.vars.filter((v) => v.reads.some((r) => r.node === R && !r.via)).map((v) => v.name));
    const deciders = new Map([...direct].map((n) => [n, { via: null }]));
    for (const y of direct) for (const x of idx.byName.get(y)?.derivedFrom ?? []) if (!deciders.has(x)) deciders.set(x, { via: y });
    const rows = [];
    for (const [name, { via }] of deciders) {
      const v = idx.byName.get(name);
      if (!v) continue;
      const visible = v.reads.filter((r) => VISIBLE.has(r.kind) && !late(r));
      const earlier = visible.filter((r) => (r.chapter ?? 0) < lastChapter);
      const recap = visible.filter((r) => r.chapter === lastChapter);
      const scene = (scenes.get(name) ?? []).filter((r) => !late(r));
      // кто пишет: кнопки последней главы — это сам последний выбор; код только в последней главе — итог
      const sw = st.vars.index.get(name)?.writes ?? [];
      const lastOnly = v.writes.length > 0 && v.writes.every((w) => w.chapter === lastChapter);
      const kind = lastOnly && sw.length && sw.every((w) => w.choice) ? 'последний выбор' : lastOnly && sw.every((w) => !w.choice) ? 'итог' : null;
      const verdict = kind ?? (!visible.length && !scene.length ? 'не звучит' : !recap.length ? 'нет в сводке' : 'звучит');
      rows.push({
        name, via, init: v.init, writes: v.writes.length, write_chapters: chaptersOf(v.writes),
        by_buttons: new Set(sw.filter((w) => w.choice).map((w) => w.choice)).size,
        visible_reads: v.visibleReads, before_final: visible.length, earlier: chaptersOf(earlier), recap: recap.map((r) => r.node),
        scene: scene.map((r) => r.node), verdict,
        fix: verdict === 'не звучит' ? 'F-09' : verdict === 'нет в сводке' ? 'F-10' : null,
        flags: v.flags,
      });
    }
    const judged = rows.filter((r) => r.verdict !== 'последний выбор' && r.verdict !== 'итог');
    const inRecap = judged.filter((r) => r.recap.length).length;
    dists.push({
      node: R, chapter: chapterOfNode.get(R), button: hasChoice.has(R), deciders: rows,
      last_choice: rows.filter((r) => r.verdict === 'последний выбор').map((r) => r.name),
      recap: judged.length ? (inRecap === judged.length ? 'полная' : inRecap ? 'частичная' : 'нет') : null,
      recap_count: inRecap, judged: judged.length,
    });
  }
  // перекрытие: при каком значении ранней переменной кнопки последнего выбора дают один и тот же финал
  if (RUNS > 0 && dists.some((d) => d.last_choice.length)) {
    const p = prepare(ref);
    const runs = [];
    for (let k = 0; k < RUNS; k++) {
      const r = runOnce(p, { persona: 'random', seed: 1 + k });
      runs.push({ ending: r.ending.name, vars: r.vars });
    }
    const modal = (list) => [...list.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map())].sort((a, b) => b[1] - a[1])[0];
    for (const d of dists) {
      d.overrides = [];
      for (const L of d.last_choice) {
        for (const row of d.deciders) {
          // только то, что распределитель читает сам: производные на ступень коррелируют с флагом и дают ложное
          if (row.via || row.verdict === 'последний выбор' || row.verdict === 'итог') continue;
          const byValue = new Map();
          for (const r of runs) {
            if (!(row.name in r.vars) || !(L in r.vars)) continue;
            const v = JSON.stringify(r.vars[row.name]);
            if (!byValue.has(v)) byValue.set(v, new Map());
            const byChoice = byValue.get(v);
            const c = JSON.stringify(r.vars[L]);
            if (!byChoice.has(c)) byChoice.set(c, []);
            byChoice.get(c).push(r.ending);
          }
          const tops = (byChoice) => [...byChoice].map(([c, list]) => ({ choice: JSON.parse(c), ending: modal(list)[0], runs: list.length }));
          for (const [v, byChoice] of byValue) {
            if (byChoice.size < 2) continue;
            const here = tops(byChoice);
            if (new Set(here.map((t) => t.ending)).size !== 1) continue;
            // перекрывает именно эта переменная, а не общий перекос долей: без этого значения кнопки финал меняют
            const rest = new Map();
            for (const [w, other] of byValue) {
              if (w === v) continue;
              for (const [c, list] of other) rest.set(c, [...(rest.get(c) ?? []), ...list]);
            }
            const elsewhere = tops(rest);
            if (elsewhere.length < 2 || new Set(elsewhere.map((t) => t.ending)).size < 2) continue;
            d.overrides.push({ var: row.name, value: JSON.parse(v), last: L, ending: here[0].ending, choices: here.length, runs: here.reduce((a, t) => a + t.runs, 0) });
          }
        }
      }
    }
  }
  const one = only ? idx.byName.get(only) : null;
  report.push({
    id: story.id, path: story.path, last_chapter: lastChapter, distributors: dists,
    var: only ? (one ? { name: one.name, writes: one.writes, reads: one.reads, flags: one.flags } : { name: only, error: 'нет такой VAR' }) : undefined,
  });
}

if (args.includes('--json')) {
  console.log(JSON.stringify({ stories: report, keys: { 'C-03.invisible': T.value('C-03.invisible'), 'vars.silent_chapters': T.value('vars.silent_chapters') } }, null, 1));
  process.exit(0);
}
for (const r of report) {
  console.log(`${r.path} · последняя глава ${r.last_chapter} · распределителей ${r.distributors.length}`);
  if (!r.distributors.length) console.log('   распределителя нет — финал один или выбирается переходом без условий: скрытого порога нет');
  for (const d of r.distributors) {
    const who = d.button ? 'есть кнопка — финал выбирает игрок (R-102)' : d.last_choice.length ? `последний выбор игрока: ${d.last_choice.join(', ')} (R-102)` : 'последнего выбора нет — финал выбирает скрытая проверка (R-102, C-06)';
    console.log(`   ${d.node} (гл. ${d.chapter ?? '—'}) · ${who} · сводка перед ним: ${d.recap ?? '—'} (${d.recap_count} из ${d.judged})`);
    const mark = { 'звучит': '✓', 'не звучит': '✗', 'последний выбор': '◆', 'итог': 'Σ' };
    for (const v of d.deciders) {
      const where = v.verdict === 'последний выбор' ? `кнопок ${v.by_buttons} в последней главе` : v.verdict === 'итог' ? 'собирается кодом в последней главе — смотри составляющие' : [v.earlier.length ? `раньше: гл. ${v.earlier.join(', ')}` : null, v.scene.length ? `сценой: ${[...new Set(v.scene)].slice(0, 3).join(', ')}` : null, v.recap.length ? `в сводке: ${[...new Set(v.recap)].slice(0, 3).join(', ')}` : null].filter(Boolean).join(' · ') || 'нигде до финала';
      console.log(`     ${mark[v.verdict] ?? '·'} ${v.name.padEnd(18)} ${v.via ? `(через ${v.via}) ` : ''}записей ${v.writes} в гл. ${v.write_chapters.join(', ') || '—'} · ${where}${v.fix ? ` → ${v.fix}` : ''}`);
    }
    for (const o of d.overrides ?? []) {
      console.log(`     ⚠ при ${o.var} = ${JSON.stringify(o.value)} последний выбор не решает: у всех ${o.choices} значений ${o.last} чаще всего ${o.ending} (${o.runs} прогонов) — флаг внутрь исхода кнопки (R-102)`);
    }
  }
  if (r.var) {
    if (r.var.error) console.log(`   --var ${r.var.name}: ${r.var.error}`);
    else {
      console.log(`   --var ${r.var.name}: ${r.var.flags.join(', ') || 'без меток story:vars'}`);
      for (const w of r.var.writes) console.log(`     запись  гл. ${w.chapter ?? '—'} ${w.node}${w.line ? `:${w.line}` : ''}${w.via ? ` (в ${w.via})` : ''}`);
      for (const x of r.var.reads) console.log(`     чтение  гл. ${x.chapter ?? '—'} ${x.node} · ${x.kind}${x.via ? ` (через ${x.via})` : ''}`);
    }
  }
  console.log('');
}
