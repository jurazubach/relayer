// Режим --compress (compress.md): насколько историю надо ужать до N минут по клику или до одной сессии и что
// в ней сейчас крупнее, чем вмещает короткая форма. Числа — story:sessions, story:trace, story:cast, story:vars,
// story:endings; пределы короткой формы — ключи thresholds.json. Что именно резать, решает модель по compress.md.
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { parseCli, storyJson } from './fix-core.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/compress-plan.mjs --story <id> (--minutes N | --session) [--json]

План сжатия для story-fix --compress: сейчас → цель → во сколько раз ужать, и что в истории крупнее короткой
формы (таблица «что резать» в compress.md, якорь #attn-cut):

  время       по клику (медиана story:sessions) и реальное время; цель --minutes N — по клику
  сессии      медиана сессий; --session — цель одна сессия: перечислены паузы от story.pause.session_s,
              которые надо убрать или сжать (узел, глава, длина)
  реплики     строк у персоны random (story:trace): сколько оставить при том же темпе
  контакты    по уровням story:cast против story.short.contacts_max — сколько собеседников вмещает короткая
  переменные  story:vars против attn.state.axes (short_vars_max при истории до short_min)
  финалы      story:endings — сколько финалов и какие решают переменные

  --story <id>    история
  --minutes N     цель: N минут по клику
  --session       цель: одна сессия без пауз от story.pause.session_s
  --json          данными
  --help          эта справка

Код выхода: 0 — план построен; 2 — нет цели или команда упала (тогда «нет данных: …»).`;

const args = parseCli(process.argv.slice(2), ['session', 'json']);
if (args.has('help') || args.has('h')) { console.log(HELP); process.exit(0); }
const id = args.get('story');
const minutes = args.get('minutes') ? Number(args.get('minutes')) : null;
const oneSession = args.has('session');
if (!id || (!minutes && !oneSession)) { console.error('нужны --story <id> и --minutes N или --session\n'); console.log(HELP); process.exit(2); }

const T = thresholds();
const noData = [];
const get = (cmd, a) => { const r = storyJson(cmd, a); if (!r.ok) noData.push(`нет данных: ${r.cmd}: ${r.error}`); return r.ok ? (r.data.stories?.[0] ?? r.data) : null; };
const ses = get('sessions', ['--story', id]);
const tr = get('trace', ['--story', id]);
const cast = get('cast', ['--story', id]);
const vars = get('vars', ['--story', id]);
const ends = get('endings', ['--story', id]);

const p = ses?.personas?.[0];
const clickMin = p ? p.click.median / 60 : null;
const realH = p ? p.real.median / 3600 : null;
const target = minutes ?? clickMin;
const ratio = clickMin && target ? target / clickMin : null;
const lines = tr?.runs?.[0]?.totals?.lines ?? null;
const sessionS = T.value('story.pause.session_s');
const shortMin = T.value('attn.state.axes').short_min;
const short = target != null && target <= shortMin;
const pauses = (p?.middle?.sessions ?? []).filter((s) => s.pauseBefore >= sessionS).map((s) => ({ knot: s.knot, chapter: s.chapter, pause_s: s.pauseBefore }));
const levels = cast?.levels ?? {};
const main = (levels['ось'] ?? []).length + (levels['сторона'] ?? []).length;
const contactsCap = T.value('story.short.contacts_max');
const varsCount = vars?.vars?.length ?? null;
const varsCap = short ? T.value('attn.state.axes').short_vars_max : T.value('attn.state.axes').axes_max;

const plan = {
  story: id,
  goal: minutes ? `${minutes} мин по клику` : 'одна сессия',
  now: { click_min: clickMin && Math.round(clickMin), real_h: realH && Math.round(realH * 10) / 10, sessions: p?.sessions?.median ?? null, lines, chapters: vars?.chapters ?? null },
  ratio: ratio && Math.round(ratio * 100) / 100,
  keep_lines: lines && ratio ? Math.round(lines * Math.min(1, ratio)) : null,
  pauses_to_remove: oneSession ? pauses : [],
  cut: [
    { what: 'контакты, с кем говорят (ось и сторона)', now: main, cap: contactsCap, key: 'story.short.contacts_max', all: Object.values(levels).flat().length },
    { what: 'переменные', now: varsCount, cap: varsCap, key: short ? 'attn.state.axes.short_vars_max' : 'attn.state.axes.axes_max' },
    { what: 'финалы', now: ends?.endings?.length ?? null, deciders: (ends?.deciders ?? []).map((d) => d.name ?? d).slice(0, 6) },
  ],
  short,
  noData,
};

if (args.has('json')) { console.log(JSON.stringify(plan, null, 1)); process.exit(noData.length === 5 ? 2 : 0); }

const out = [`compress-plan · ${id} · цель: ${plan.goal}`, ''];
out.push(`сейчас: по клику ≈ ${plan.now.click_min ?? '—'} мин · реальное время ≈ ${plan.now.real_h ?? '—'} ч · сессий ${plan.now.sessions ?? '—'} · строк (random) ${lines ?? '—'} · глав ${plan.now.chapters ?? '—'}`);
if (minutes) out.push(ratio != null ? (ratio >= 1 ? `цель не меньше текущего — сжимать нечего (×${plan.ratio})` : `ужать в ${(1 / ratio).toFixed(1)} раза: оставить ≈ ${plan.keep_lines} строк при том же темпе`) : 'нет данных для доли');
if (short) out.push(`цель короче attn.state.axes.short_min — короткая форма: «минимальные версии» и таблица «что резать» в compress.md`);
if (oneSession) {
  out.push('', `паузы от story.pause.session_s, которые разрывают историю на сессии (${pauses.length}):`);
  for (const x of pauses) out.push(`   гл. ${x.chapter} · ${x.knot} · ${x.pause_s >= 3600 ? `${(x.pause_s / 3600).toFixed(1)} ч` : `${Math.round(x.pause_s / 60)} мин`} — склеить (F-03) или превратить в скачок времени мира`);
  if (!pauses.length) out.push('   нет — история уже одна сессия');
}
out.push('', 'что крупнее короткой формы (compress.md):');
for (const c of plan.cut) {
  if (c.cap != null) out.push(`   ${c.what}: ${c.now ?? '—'}${c.all != null ? ` (всего контактов ${c.all})` : ''} · предел ${c.cap} (${c.key})${c.now != null && c.now > c.cap ? ' — резать' : ''}`);
  else out.push(`   ${c.what}: ${c.now ?? '—'}${c.deciders?.length ? ` · решают: ${c.deciders.join(', ')}` : ''}`);
}
for (const e of noData) out.push(e);
out.push('', 'дальше: compress.md — порядок резки; каждое сокращение — вариант с ink до/после и одобрение по пункту (approval.md)');
console.log(out.join('\n'));
