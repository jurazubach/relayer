// Влияние развилки: на что действует каждая кнопка — переменные и оси, финалы, состав чатов, объём своей
// области и где ветки сливаются. Это замер для меню «куда свернуть»: варианты сравниваются числами, а не на глаз.
import { analyze, T } from './branch-core.mjs';
import { storyRefs } from '../../../../scripts/lib/story.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/branch-impact.mjs [--story <id|путь>] [--node <узел>] [--chapter N] [--expensive] [--runs N] [--json]

Влияние развилок (скилл story-branch). На каждую кнопку:
  вид        окраска (только реплика) · память (пишет переменную) · ветка (свой узел) · дорогая (своя область
             не меньше story.branch.expensive.msgs сообщений, или свой финал, или свой контакт #unlock)
  своё       сообщений в области кнопки — узлах, куда попадают только через неё (цена в тексте)
  слияние    переходов до ближайшего общего узла и сам узел (— ветки не сходятся до конца)
  пишет      переменные; ⚑ — ось из шапки «// оси:», ◆ — читает финал или распределитель (как story:vars)
  финалы     достижимые финалы (как story:endings); «свои» — достижимые только через эту кнопку
  чаты       контакты в области; «свои» — которых нет в областях соседних кнопок; #unlock — открывает чат
  игроков    доля прогонов бота, где кнопку нажали (--runs, персона random)

  --story     история: id, папка, .json или .ink (в том числе docs/stories/<id>/plans/skeleton.ink);
              по умолчанию все из src/stories
  --node      только развилки этого узла (узел.шов — тоже)
  --chapter   только развилки этой главы
  --expensive только развилки, где есть дорогая кнопка
  --runs N    прогонов бота для долей игроков (по умолчанию endings.runs; 0 — без бота)
  --json      всё данными
  --help      эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const runs = opt('--runs') != null ? Number(opt('--runs')) : T.value('endings.runs');
if (!Number.isInteger(runs) || runs < 0) { console.error('ошибка: --runs — целое число'); process.exit(2); }
const node = opt('--node');
const chapter = opt('--chapter') != null ? Number(opt('--chapter')) : null;

const report = [];
try {
  for (const ref of storyRefs((opt('--story') ?? '').split(',').filter(Boolean))) {
    const a = analyze(ref, { runs });
    let points = a.points;
    if (node) points = points.filter((x) => x.knot === node || x.knot.startsWith(`${node}.`));
    if (chapter != null) points = points.filter((x) => x.chapter === chapter);
    if (args.includes('--expensive')) points = points.filter((x) => x.expensive);
    if (node && !points.length) throw new Error(`${a.path}: в узле «${node}» нет развилок из двух и больше кнопок`);
    report.push({ id: a.id, path: a.path, axes: a.axes, final_vars: a.finalVars, endings: a.endings, runs: a.runs, points: points.map(({ shown, ...x }) => ({ ...x, shown_runs: a.runs ? shown : null })) });
  }
} catch (e) {
  console.error(`ошибка: ${e.message}`);
  process.exit(2);
}

// exitCode, а не process.exit: иначе большой --json в трубу обрезается
const json = args.includes('--json');
if (json) {
  console.log(JSON.stringify({ stories: report, keys: { expensive_msgs: T.value('story.branch.expensive.msgs') } }, null, 1));
}

const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)}%`);
for (const r of json ? [] : report) {
  console.log(`${r.path} · развилок ${r.points.length} · оси: ${r.axes.join(', ') || 'нет шапки «// оси:»'} · финалов ${r.endings.length}${r.runs ? ` · прогонов ${r.runs}` : ''}`);
  for (const pt of r.points) {
    console.log(`\n  ${pt.knot} (гл. ${pt.chapter}, стр. ${pt.line})${pt.expensive ? ' · ДОРОГАЯ' : ''} · слияние: ${pt.merge ?? '— (не сходятся)'}`);
    for (const o of pt.options) {
      const w = o.writes.map((v) => `${v}${o.axes.includes(v) ? '⚑' : ''}${o.final_vars.includes(v) ? '◆' : ''}`).join(', ') || '—';
      const fin = o.endings.length === r.endings.length && r.endings.length > 1 ? 'все' : o.endings.join(', ') || (o.ends_story ? 'END' : '—');
      console.log(`    [${o.text.slice(0, 40)}]${o.to ? ` →${o.to}` : ''}${o.conds.length ? ' (по условию)' : ''}`);
      console.log(`      ${o.kind} · своё ${o.own_msgs} сообщ. в ${o.own_knots.length} узл. · до слияния ${o.hops ?? '—'} · игроков ${pct(o.share)}`);
      console.log(`      пишет: ${w} · финалы: ${fin}${o.own_endings.length ? ` (свои: ${o.own_endings.join(', ')})` : ''}`);
      console.log(`      чаты: ${o.contacts.join(', ') || '—'}${o.own_contacts.length ? ` (свои: ${o.own_contacts.join(', ')})` : ''}${o.unlocks.length ? ` · #unlock: ${o.unlocks.join(', ')}` : ''}`);
    }
  }
  console.log(`\n  ⚑ ось из шапки · ◆ читает финал · дорогая — от story.branch.expensive.msgs (${T.value('story.branch.expensive.msgs')}) сообщений, свой финал или свой #unlock\n`);
}
