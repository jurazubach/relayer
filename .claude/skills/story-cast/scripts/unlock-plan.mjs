// Расписание открытия контактов (unlock-schedule.md): кто впервые появляется в каждой главе и как входит,
// первые реплики нового контакта (голос и желание — R-78), сколько чатов открыто и сколько ждут ответа
// одновременно (attn.chats.waiting). Новые контакты главы считаются как в C-21: те же прогоны бота (seed 1),
// первое появление в #from, #unlock или #to, медиана главы по прогонам; служебные и немые не считаются.
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { walk } from '../../../../scripts/lib/ink.mjs';
import { analyze } from '../../../../scripts/lint/core.mjs';
import { isIncoming, median } from '../../../../scripts/lint/journal.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/unlock-plan.mjs [--story <id|путь>,…] [--runs N] [--lines N] [--json]

Когда открываются контакты (скилл story-cast, R-77, R-78, проверка C-21):
  до кнопки   медиана разных собеседников до первой кнопки — порог C-21.from_before_first
  глава k     новые контакты главы (как в C-21) — порог C-21.new_ch1 (короткая история —
              C-21.new_ch1_short), дальше C-21.new_other; вход: #unlock / первая реплика / кнопка
  открыто     медиана открытых чатов к концу главы (без служебных) — attn.chats.waiting.open
  ждут        медиана по прогонам наибольшего числа чатов, где последняя реплика — вопрос без ответа,
              в точке выбора главы — attn.chats.waiting.ch1 / .later
  первые      первые реплики нового контакта в прогоне seed 1: видно ли голос, желание и откуда он знает
              игрока (R-78, video-three-things:GREEN-05) — судит модель

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --runs N    прогонов бота (по умолчанию lint.runs.full — как у story:lint)
  --lines N   сколько первых реплик показать (по умолчанию C-21.new_ch1)
  --json      всё данными
  --help      эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const runs = opt('--runs') ? Number(opt('--runs')) : T.value('lint.runs.full');
const show = opt('--lines') ? Number(opt('--lines')) : T.value('C-21.new_ch1');
const waitKeys = T.value('attn.chats.waiting');

function plan(story) {
  const ctx = analyze(story, T, { runs, seed: 1 });
  if (!ctx.built.ok) return { error: 'нет данных: история не компилируется (npm run story:lint)' };
  const writers = new Set();
  for (const k of ctx.tree.knots) walk(k.items, (it) => { if (it.tags?.from && !ctx.service.has(it.tags.from)) writers.add(it.tags.from); });
  const firstCh = new Map();
  const via = new Map();
  const before = [];
  const open = new Map();
  const waiting = new Map();
  ctx.runs.forEach((run, ri) => {
    const firstAt = run.choices[0]?.at ?? run.lines.length;
    before.push(new Set(run.lines.slice(0, firstAt).filter((l) => isIncoming(l) && l.who && !ctx.service.has(l.who)).map((l) => l.who)).size);
    const seen = new Map();
    const note = (id, ch, how) => {
      if (!writers.has(id) || seen.has(id)) return;
      seen.set(id, ch);
      if (ri === 0) via.set(id, how);
    };
    const pending = new Map(); // контакт → последняя реплика — вопрос, кнопки к нему с тех пор не было
    const peak = new Map();
    const openAt = new Map();
    for (const item of run.seq) {
      if (item.type === 'choice') {
        const ch = item.chapter;
        peak.set(ch, Math.max(peak.get(ch) ?? 0, [...pending.values()].filter(Boolean).length));
        item.tos.forEach((t) => t && note(t, ch, 'кнопка'));
        const to = item.tos[item.picked];
        if (to) pending.set(to, false);
        continue;
      }
      for (const u of item.unlock) note(u, item.chapter, '#unlock');
      if (isIncoming(item) && item.who && !ctx.service.has(item.who)) {
        note(item.who, item.chapter, 'реплика');
        pending.set(item.who, item.text.trim().endsWith('?'));
      }
      openAt.set(item.chapter, new Set([...(openAt.get(item.chapter) ?? []), ...seen.keys()]));
    }
    for (const [id, ch] of seen) firstCh.set(id, [...(firstCh.get(id) ?? []), ch]);
    let acc = new Set();
    for (const ch of [...openAt.keys()].sort((a, b) => a - b)) {
      acc = new Set([...acc, ...openAt.get(ch)]);
      open.set(ch, [...(open.get(ch) ?? []), acc.size]);
    }
    for (const [ch, n] of peak) waiting.set(ch, [...(waiting.get(ch) ?? []), n]);
  });
  // первые реплики — из одного прохождения (seed 1), чтобы модель читала связный текст
  const sample = ctx.runs[0];
  const firstLines = (id) => (sample?.lines ?? []).filter((l) => isIncoming(l) && l.who === id).slice(0, show).map((l) => l.text);
  const short = story.meta.minutes != null && story.meta.minutes <= T.value('story.short_min');
  const byCh = new Map();
  for (const [id, chs] of firstCh) {
    const ch = median(chs);
    byCh.set(ch, [...(byCh.get(ch) ?? []), id]);
  }
  const chapters = [...new Set([...byCh.keys(), ...open.keys()])].sort((a, b) => a - b).map((ch) => {
    const key = ch === 1 ? (short ? 'C-21.new_ch1_short' : 'C-21.new_ch1') : 'C-21.new_other';
    const fresh = (byCh.get(ch) ?? []).map((id) => ({ id, via: via.get(id) ?? '—', first: firstLines(id) }));
    const wait = median(waiting.get(ch) ?? []) ?? 0;
    const waitMax = ch === 1 ? waitKeys.ch1 : waitKeys.later;
    return {
      chapter: ch, new: fresh, key, limit: T.value(key), over: fresh.length > T.value(key),
      open: median(open.get(ch) ?? []) ?? 0, open_over: (median(open.get(ch) ?? []) ?? 0) > waitKeys.open,
      waiting: wait, waiting_limit: waitMax, waiting_over: wait > waitMax,
    };
  });
  const b = median(before) ?? 0;
  return { before_first: b, before_over: b > T.value('C-21.from_before_first'), chapters };
}

const report = storyRefs((opt('--story') ?? '').split(',').filter(Boolean)).map((ref) => {
  const story = loadStory(ref);
  return { id: story.id, path: story.path, runs, ...plan(story) };
});

if (args.includes('--json')) {
  console.log(JSON.stringify({ stories: report, keys: ['C-21.from_before_first', 'C-21.new_ch1', 'C-21.new_ch1_short', 'C-21.new_other', 'attn.chats.waiting'] }, null, 1));
  process.exit(0);
}
for (const r of report) {
  if (r.error) { console.log(`${r.path}: ${r.error}\n`); continue; }
  console.log(`${r.path} · прогонов ${r.runs} · до первой кнопки собеседников ${r.before_first}${r.before_over ? ' ! (C-21.from_before_first)' : ''}`);
  for (const c of r.chapters) {
    const flags = [c.over && `! новых больше ${c.key}`, c.open_over && '! открыто больше attn.chats.waiting.open', c.waiting_over && '! ждут больше attn.chats.waiting'].filter(Boolean);
    console.log(`   глава ${c.chapter}: новых ${c.new.length} (${c.key} = ${c.limit}) · открыто ${c.open} · ждут ответа ${c.waiting} из ${c.waiting_limit}${flags.length ? ` · ${flags.join(' · ')}` : ''}`);
    for (const n of c.new) console.log(`      ${n.id} (${n.via}): ${n.first.map((t) => `«${t}»`).join(' · ') || '— (в прогоне seed 1 не пишет)'}`);
  }
  console.log('');
}
