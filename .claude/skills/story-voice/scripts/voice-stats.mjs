// Профиль голоса каждого контакта: форма реплик, обращение, частые слова и сверка с карточкой голоса из meta.json.
// Реплики, метрики, нормировка и расстояние — те же функции, что у проверки C-44 (scripts/lint/checks/C-44.mjs),
// поэтому пары «пишут похоже» совпадают с `npm run story:lint -- --only C-44`. Сверх линта: контакты с малым числом
// реплик (у них голос тоже должен узнаваться, R-75), профиль по главам (R-82) и частые слова — кандидаты в словечко.
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { analyze } from '../../../../scripts/lint/core.mjs';
import { METRICS, cardMarkers, cardMismatches, voiceLines } from '../../../../scripts/lint/checks/C-44.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/voice-stats.mjs [--story <id|путь>,…] [--contact <id>] [--chapters] [--json]

Профиль голоса по контактам (скилл story-voice, R-75, R-82, проверка C-44, voice-sheet.md):
  реплик      строк контакта в ink (без #sys, #me, #photo и служебных каналов) — как у C-44
  слов        слов на реплику (среднее)
  строч/точка доля реплик со строчной буквы / с точкой в конце
  ! ? эмодзи  доля реплик с «!», с «?»; эмодзи на реплику
  длинных     доля реплик длиннее C-34.long_chars знаков и длиннее style.line_words слов
  ты / Вы     реплик с обращением на «ты» и на «Вы»
  частые      слова, которые контакт повторяет чаще всего, — кандидаты в словечко (судит модель)
  карточка    маркеры characters[].voice и сколько реплик идут против них (C-44.card_share)
  шутят       карточки, где сказано «шутит» / «юмор» / «ирония», против style.jokers_max (R-87, humor.md)

Пары: расстояние профилей, как у C-44 (контакты от C-44.min_lines реплик; ! — меньше C-44.distance).
Ниже порога C-44: те же пары для контактов от C-44.card_min_lines реплик — кандидаты, решает слепой тест
(blind-sample.mjs), а не число.

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --contact   только этот контакт (профиль по главам — всегда)
  --chapters  профиль каждого контакта по главам: меняется ли голос с отношением (R-82)
  --json      всё данными
  --help      эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const refs = storyRefs((opt('--story') ?? '').split(',').filter(Boolean));
const only = opt('--contact');
const byChapter = args.includes('--chapters') || !!only;

const STOP = new Set('это что как где кто там тут так вот уже еще ещё если или его она они оно мне меня тебя тебе тебе вас вам нас нам был была было были есть нет без для при над под про через после перед когда тогда потом сейчас просто только очень тоже даже всё все всех ничего чтобы этот эта эти того тот той ним ней них сам сама себя свой своя ваш твой мой моя'.split(' '));
const EMOJI = /\p{Extended_Pictographic}/gu;
const YOU = /(^|[^\p{L}])(ты|тебя|тебе|тобой|твой|твоя|твоё|твое|твои)(?!\p{L})/iu;
const VY = /(^|[^\p{L}])(вы|вас|вам|вами|ваш|ваша|ваше|ваши)(?!\p{L})/iu;
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const r2 = (x) => Math.round(x * 100) / 100;
const pct = (x) => `${Math.round(x * 100)}%`;

function profile(rows) {
  const texts = rows.map((r) => r.text);
  const m = METRICS.map((_, i) => mean(rows.map((r) => r.m[i])));
  const words = new Map();
  for (const t of texts) for (const w of t.toLowerCase().match(/\p{L}{3,}/gu) ?? []) if (!STOP.has(w)) words.set(w, (words.get(w) ?? 0) + 1);
  return {
    lines: rows.length,
    words: r2(m[0]), lower: r2(m[1]), period: r2(m[2]), excl: r2(m[3]), quest: r2(m[4]), emoji: r2(m[5]),
    long_chars: r2(mean(texts.map((t) => (t.length > T.value('C-34.long_chars') ? 1 : 0)))),
    long_words: r2(mean(texts.map((t) => (t.split(/\s+/).filter(Boolean).length > T.value('style.line_words') ? 1 : 0)))),
    emoji_over: texts.filter((t) => (t.match(EMOJI) ?? []).length > T.value('style.emoji_per_line')).length,
    you: texts.filter((t) => YOU.test(t)).length,
    vy: texts.filter((t) => VY.test(t)).length,
    top: [...words].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([w, n]) => ({ word: w, n })),
  };
}

/** Расстояние как у C-44: среднее модулей разностей, каждая метрика нормирована на размах по набору контактов. */
function pairs(profiles) {
  const ids = [...profiles.keys()];
  const raw = new Map(ids.map((id) => [id, profiles.get(id).vector]));
  const range = METRICS.map((_, i) => { const xs = [...raw.values()].map((v) => v[i]); return Math.max(...xs) - Math.min(...xs) || 1; });
  const out = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = raw.get(ids[i]);
      const b = raw.get(ids[j]);
      const d = a.reduce((s, x, k) => s + Math.abs(x - b[k]) / range[k], 0) / a.length;
      out.push({ a: ids[i], b: ids[j], distance: r2(d), close: METRICS.filter((_, k) => Math.abs(a[k] - b[k]) / range[k] < T.value('C-44.distance')) });
    }
  }
  return out.sort((x, y) => x.distance - y.distance);
}

const report = [];
for (const ref of refs) {
  const story = loadStory(ref);
  const ctx = analyze(story, T, { runs: 1 });
  const by = voiceLines(ctx);
  const cast = new Map((story.meta?.characters ?? []).filter((c) => c.id).map((c) => [c.id, c]));
  const contacts = [];
  for (const [id, rows] of by) {
    if (only && id !== only) continue;
    const p = profile(rows);
    const markers = cardMarkers(cast.get(id)?.voice);
    const card = markers ? cardMismatches(markers, rows.map((r) => r.text)).map((x) => ({ ...x, over: !!x.of && x.against / x.of > T.value('C-44.card_share') })) : null;
    const chapters = byChapter
      ? [...new Set(rows.map((r) => r.chapter))].sort((a, b) => a - b).map((ch) => ({ chapter: ch, ...profile(rows.filter((r) => r.chapter === ch)) }))
      : null;
    contacts.push({ id, name: cast.get(id)?.name ?? ctx.tree.contacts?.[id]?.name ?? id, ...p, vector: METRICS.map((_, i) => mean(rows.map((r) => r.m[i]))), card: cast.get(id)?.voice ? { voice: cast.get(id).voice, markers, mismatches: card } : null, chapters });
  }
  contacts.sort((a, b) => b.lines - a.lines);
  const big = new Map(contacts.filter((c) => c.lines >= T.value('C-44.min_lines')).map((c) => [c.id, c]));
  const small = new Map(contacts.filter((c) => c.lines >= T.value('C-44.card_min_lines')).map((c) => [c.id, c]));
  const lintPairs = only || big.size < 2 ? [] : pairs(big).map((p) => ({ ...p, flagged: p.distance < T.value('C-44.distance') }));
  const lowPairs = only || small.size < 2 ? [] : pairs(small).filter((p) => !(big.has(p.a) && big.has(p.b))).slice(0, 5).map((p) => ({ ...p, flagged: p.distance < T.value('C-44.distance') }));
  const jokers = [...cast.values()].filter((c) => /шут|юмор|ирони/i.test(typeof c.voice === 'string' ? c.voice : JSON.stringify(c.voice ?? ''))).map((c) => c.id);
  report.push({ id: story.id, path: story.path, contacts: contacts.map(({ vector, ...c }) => c), pairs: lintPairs, low_pairs: lowPairs, jokers, jokers_over: jokers.length > T.value('style.jokers_max') });
}

if (args.includes('--json')) {
  const keys = ['C-44.min_lines', 'C-44.distance', 'C-44.card_share', 'C-44.card_min_lines', 'C-34.long_chars', 'style.line_words', 'style.emoji_per_line', 'style.jokers_max'];
  console.log(JSON.stringify({ stories: report, keys: Object.fromEntries(keys.map((k) => [k, T.value(k)])) }, null, 1));
  process.exit(0);
}

for (const r of report) {
  console.log(`${r.path} · контактов с репликами ${r.contacts.length}`);
  for (const c of r.contacts) {
    const few = c.lines < T.value('C-44.min_lines') ? ' · мало реплик для C-44' : '';
    console.log(`   ${c.id} (${c.name}) · реплик ${c.lines}${few}`);
    console.log(`      слов ${c.words} · строч ${pct(c.lower)} · точка ${pct(c.period)} · ! ${pct(c.excl)} · ? ${pct(c.quest)} · эмодзи ${c.emoji}/реплику` +
      ` · длинных ${pct(c.long_chars)} (> C-34.long_chars) / ${pct(c.long_words)} (> style.line_words) · ты ${c.you} / Вы ${c.vy}` +
      (c.emoji_over ? ` · реплик с эмодзи больше style.emoji_per_line: ${c.emoji_over}` : ''));
    if (c.top.length) console.log(`      частые: ${c.top.map((t) => `${t.word} ×${t.n}`).join(', ')}`);
    if (!c.card) console.log('      карточки голоса нет (R-75, ST-20): сверять не с чем');
    else if (!c.card.markers) console.log(`      карточка: «${typeof c.card.voice === 'string' ? c.card.voice : JSON.stringify(c.card.voice)}» — проверяемых маркеров формы нет`);
    else console.log(`      карточка: ${c.card.mismatches.map((x) => `${x.over ? '! ' : ''}${x.marker}: против ${x.against} из ${x.of}`).join(' · ')}`);
    for (const ch of c.chapters ?? []) console.log(`        гл. ${ch.chapter}: реплик ${ch.lines} · слов ${ch.words} · строч ${pct(ch.lower)} · точка ${pct(ch.period)} · ! ${pct(ch.excl)} · эмодзи ${ch.emoji} · ты ${ch.you} / Вы ${ch.vy}`);
  }
  if (r.pairs.length) {
    console.log(`   пары (от C-44.min_lines = ${T.value('C-44.min_lines')} реплик; ! — ближе C-44.distance = ${T.value('C-44.distance')}):`);
    for (const p of r.pairs.slice(0, 8)) console.log(`     ${p.flagged ? '!' : ' '} ${p.a} — ${p.b}: ${String(p.distance).replace('.', ',')}${p.close.length ? ` · близко: ${p.close.join(', ')}` : ''}`);
  }
  if (r.low_pairs.length) {
    console.log(`   ниже порога C-44 (от C-44.card_min_lines = ${T.value('C-44.card_min_lines')} реплик; самые близкие; ! — ближе C-44.distance) — кандидаты для слепого теста:`);
    for (const p of r.low_pairs) console.log(`     ${p.flagged ? '!' : ' '} ${p.a} — ${p.b}: ${String(p.distance).replace('.', ',')}${p.close.length ? ` · близко: ${p.close.join(', ')}` : ''}`);
  }
  console.log(`   шутят по карточкам: ${r.jokers.length ? r.jokers.join(', ') : 'никто не записан'}${r.jokers_over ? ` — больше style.jokers_max = ${T.value('style.jokers_max')}` : ''}`);
  console.log('');
}
