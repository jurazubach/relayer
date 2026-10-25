// Слепой тест голосов (ST-21, nicklin-writing-for-games:P-03): по style.blind_min.of реплик двух контактов без #from,
// перемешанных, и подсчёт ответа — угадано ли не меньше style.blind_min.hits у каждого. Пару по умолчанию выбирает то
// же расстояние профилей, что у C-44. Судит не тот, кто знает историю: --ask спрашивает claude -p из пустого каталога
// без инструментов (как story:cold-read), иначе выборку отдают холодному читателю, а ответ считают через --answer.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadStory } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { analyze } from '../../../../scripts/lint/core.mjs';
import { METRICS, voiceLines } from '../../../../scripts/lint/checks/C-44.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/blind-sample.mjs --story <id|путь> [--pair a,b] [--seed N] [--ask] [--answer "1A 2B …"] [--json]

Слепой тест голосов (скилл story-voice, ST-21, blind-test.md):
  выборка   по style.blind_min.of реплик каждого из двух контактов, без #from и имён, вперемешку, с номерами
  пара      --pair a,b; по умолчанию — самая близкая пара по расстоянию профилей, посчитанному как у C-44,
            но с размахом по контактам, у которых реплик хватает на выборку (поэтому число может
            отличаться от story:lint и voice-stats.mjs)
  карточки  если у контактов есть characters[].voice, читатель раскладывает реплики по карточкам A и B;
            нет — делит на две группы, засчитывается лучшая из двух раскладок
  порог     у каждого контакта угадано не меньше style.blind_min.hits из style.blind_min.of

  --story    история по id, файл .json / .ink или папка
  --pair     два id контактов через запятую
  --seed N   какие реплики и в каком порядке (по умолчанию 1)
  --ask      спросить холодного читателя: claude -p из пустого каталога, без инструментов и настроек
  --answer   ответ читателя строкой «1A 2B 3A …» (или --answer-file <файл>): посчитать попадания
  --key      напечатать ключ (кому какая реплика) — только для подсчёта руками, не показывай читателю
  --json     выборка, ключ и (с --ask / --answer) счёт данными
  --help     эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const { hits: minHits, of: n } = T.value('style.blind_min');
const ref = opt('--story');
if (!ref) { console.error('нужна --story <id>'); process.exit(2); }
const seed = Number(opt('--seed') ?? 1);

// линейный конгруэнтный генератор: тот же seed — та же выборка, чтобы тест можно было повторить
const rng = (s) => () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
const shuffle = (xs, rand) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);

const story = loadStory(ref);
const ctx = analyze(story, T, { runs: 1 });
const by = voiceLines(ctx);
const cast = new Map((story.meta?.characters ?? []).filter((c) => c.id).map((c) => [c.id, c]));
const nameOf = (id) => cast.get(id)?.name ?? ctx.tree.contacts?.[id]?.name ?? id;
// реплика, где звучит имя одного из пары, выдаёт ответ: в выборку не идёт
const stems = (id) => nameOf(id).toLowerCase().split(/\s+/).filter((w) => w.length > 2).map((w) => w.slice(0, Math.max(3, w.length - 2)));
const usable = (id, pair) => [...new Set((by.get(id) ?? []).map((r) => r.text))].filter((t) => !pair.flatMap(stems).some((s) => t.toLowerCase().includes(s)));

let pair = opt('--pair')?.split(',').map((x) => x.trim());
let distance = null;
const enough = [...by.keys()].filter((id) => usable(id, [id]).length >= n);
const prof = new Map(enough.map((id) => [id, METRICS.map((_, i) => mean(by.get(id).map((r) => r.m[i])))]));
const range = METRICS.map((_, i) => { const xs = [...prof.values()].map((v) => v[i]); return (Math.max(...xs) - Math.min(...xs)) || 1; });
const dist = (a, b) => prof.get(a).reduce((s, x, k) => s + Math.abs(x - prof.get(b)[k]) / range[k], 0) / METRICS.length;
if (!pair) {
  let best = null;
  for (let i = 0; i < enough.length; i++) for (let j = i + 1; j < enough.length; j++) {
    const d = dist(enough[i], enough[j]);
    if (!best || d < best.d) best = { a: enough[i], b: enough[j], d };
  }
  if (!best) { console.error(`нет данных: ни у двух контактов нет style.blind_min.of = ${n} реплик без имён (${[...by].map(([id, r]) => `${id} ${r.length}`).join(', ')})`); process.exit(1); }
  pair = [best.a, best.b];
  distance = Math.round(best.d * 100) / 100;
} else if (prof.has(pair[0]) && prof.has(pair[1])) distance = Math.round(dist(pair[0], pair[1]) * 100) / 100;

const rand = rng(seed);
const items = [];
for (const [k, id] of pair.entries()) {
  const pool = usable(id, pair);
  if (pool.length < n) { console.error(`нет данных: у ${id} ${pool.length} реплик без имён, нужно style.blind_min.of = ${n}`); process.exit(1); }
  for (const text of shuffle(pool, rand).slice(0, n)) items.push({ text, who: id, label: 'AB'[k] });
}
const sample = shuffle(items, rand).map((x, i) => ({ n: i + 1, ...x }));
const cards = pair.map((id) => cast.get(id)?.voice ?? null);
const withCards = cards.every(Boolean);

const prompt = [
  'Перед тобой реплики из переписки в мессенджере. Их писали два человека, A и B, — поровну. Имена убраны.',
  withCards
    ? `Как пишет каждый:\nA — ${typeof cards[0] === 'string' ? cards[0] : JSON.stringify(cards[0])}\nB — ${typeof cards[1] === 'string' ? cards[1] : JSON.stringify(cards[1])}\nРазложи реплики: кто написал каждую.`
    : 'Как они пишут, не сказано. Раздели реплики на две группы — A и B, по одному автору в группе.',
  '',
  ...sample.map((x) => `${x.n}. ${x.text}`),
  '',
  'Ответь одной строкой: номер и буква через пробел, например «1A 2B 3A …». Потом одной фразой — по каким признакам решал.',
].join('\n');

/** «1A 2B …» → попадания по каждому контакту; без карточек — лучшая из двух раскладок. */
function score(answer) {
  const got = new Map([...String(answer).matchAll(/(\d+)\s*[—:.-]?\s*([ABАВ])(?![\p{L}])/gu)].map((m) => [Number(m[1]), m[2] === 'А' ? 'A' : m[2] === 'В' ? 'B' : m[2]]));
  const count = (flip) => Object.fromEntries(pair.map((id, k) => [id, sample.filter((x) => x.who === id && got.get(x.n) === (flip ? 'AB'[1 - k] : 'AB'[k])).length]));
  const straight = count(false);
  const flipped = count(true);
  const sum = (o) => Object.values(o).reduce((s, x) => s + x, 0);
  const hits = !withCards && sum(flipped) > sum(straight) ? flipped : straight;
  return { answered: got.size, hits, pass: Object.values(hits).every((h) => h >= minHits) };
}

function ask(text) {
  const dir = mkdtempSync(join(tmpdir(), 'blind-voice-'));
  // вложенный запуск из сессии Claude Code: без этих переменных claude -p не считает себя частью проекта
  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.CLAUDE_PROJECT_DIR;
  try {
    const r = spawnSync('claude', ['-p', '--model', opt('--model') ?? 'claude-opus-5-5', '--tools', '', '--strict-mcp-config', '--setting-sources', '',
      '--disable-slash-commands', '--settings', '{"autoMemoryEnabled":false}', '--no-session-persistence', '--output-format', 'json'],
    { cwd: dir, env, input: text, encoding: 'utf8', maxBuffer: 1 << 24, timeout: 10 * 60 * 1000 });
    if (r.error) throw new Error(`claude -p не запустился: ${r.error.message}`);
    const data = JSON.parse(r.stdout);
    if (data.is_error) throw new Error(`claude -p: ${data.result ?? data.subtype}`);
    return String(data.result ?? '').trim();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

let answer = opt('--answer') ?? (opt('--answer-file') ? readFileSync(opt('--answer-file'), 'utf8') : null);
if (args.includes('--ask')) {
  try { answer = ask(prompt); } catch (e) { console.error(`нет данных: ${e.message}`); process.exit(1); }
}
const result = answer ? score(answer) : null;
const key = Object.fromEntries(sample.map((x) => [x.n, x.label]));

if (args.includes('--json')) {
  console.log(JSON.stringify({ story: story.id, pair, distance, seed, with_cards: withCards, prompt, sample, key, answer, result, keys: { 'style.blind_min': T.value('style.blind_min'), 'C-44.distance': T.value('C-44.distance') } }, null, 1));
  process.exit(0);
}
console.error(`${story.path} · пара ${pair[0]} (A) — ${pair[1]} (B)${distance != null ? ` · расстояние профилей ${String(distance).replace('.', ',')} (C-44.distance = ${T.value('C-44.distance')})` : ''} · seed ${seed} · ${withCards ? 'по карточкам' : 'без карточек: две группы'}`);
if (!result) console.log(prompt);
if (args.includes('--key')) console.log(`\nключ: ${sample.map((x) => `${x.n}${x.label}`).join(' ')}`);
if (result) {
  console.log(`ответ: ${String(answer).split('\n')[0]}`);
  for (const id of pair) console.log(`   ${id}: угадано ${result.hits[id]} из ${n}${result.hits[id] < minHits ? ` — меньше style.blind_min.hits = ${minHits}` : ''}`);
  console.log(result.pass ? '   голоса различимы вслепую (ST-21)' : '   голоса сливаются: развести форму, словарь и желание (voice-sheet.md, ST-20…ST-22)');
  if (String(answer).split('\n').length > 1) console.log(`   почему: ${String(answer).split('\n').slice(1).join(' ').trim()}`);
}
