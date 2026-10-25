// Переписка в режиме «по клику» глазами игрока (скилл story-time; R-122, R-63, A-04): обёртка над
// `story:trace --mode click --json`. Пауз нет, скачок от engine.click.time_jump_label получает метку «спустя …»,
// и на ней видно, что ломается без ожидания: прожитое ожидание после скачка, обещанный срок, который
// приходит через секунду, утро без метки, свой #sys рядом с меткой движка. Время и метки — из story:trace.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { norm, returnDeadline } from '../../../../scripts/lib/lexicon.mjs';
import { loadStory } from '../../../../scripts/lib/story.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/click-transcript.mjs --story <id|путь> [--persona <имя>] [--seed N] [--runs N] [--route 0,2,1] [--until <узел>] [--flags] [--json]

Режим «по клику» глазами игрока (скилл story-time; R-122, R-63, ST-63, ST-65; решение A-04). Переписка
идёт без пауз; на скачке времени мира от engine.click.time_jump_label движок ставит «· спустя N».
Пометки в тексте:
  ⚠ ожидание   «наконец-то», «ты долго» (dict.lived_wait) в C-47.lived_wait_lines строках после скачка —
               по клику ожидания не было (C-47 «прожитое ожидание»)
  ⚠ срок       перед паузой от story.pause.notice_min персонаж называет срок возвращения (dict.return_deadline):
               по клику «утром напишу» и следующее сообщение идут подряд (C-27.deadline)
  ⚠ утро       «доброе утро» того же контакта после «сплю» без метки скачка — утро через секунды (C-32 п. 5)
  ⚠ свой #sys  «Прошло 3 часа» у скачка с меткой движка — две метки подряд (ST-65); «Три недели спустя» —
               время мира дальше паузы, законно
  ·  пауза     пауза от story.pause.notice_min короче метки: по клику следующее сообщение приходит сразу
В конце: время по клику (как в story:trace) против minutes карточки, сколько меток, сколько пометок.

  --story     история по id, файл .json / .ink или папка (одна)
  --persona   персона story:trace (по умолчанию random)
  --seed N    seed (по умолчанию 1); --runs N — несколько прохождений подряд (seed, seed+1, …)
  --route     номера кнопок по развилкам, как у story:trace
  --until     печатать до первого входа в узел
  --flags     только пометки и сводка, без переписки
  --json      пометки и сводка данными
  --help      эта справка

Сверка: npm run -s story:trace -- --story <id> --mode click --visible — та же переписка без пометок;
npm run -s story:sessions -- --story <id> — медиана по клику на всех прохождениях.`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const ref = opt('--story');
if (!ref) { console.error('нужен --story <id|путь>'); process.exit(1); }

const TRACE = fileURLToPath(new URL('../../../../scripts/story/trace.mjs', import.meta.url));
const pass = ['--persona', '--seed', '--runs', '--route', '--until'].flatMap((k) => (opt(k) != null ? [k, opt(k)] : []));
const run = spawnSync(process.execPath, [TRACE, '--story', ref, '--mode', 'click', '--json', ...pass], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (run.status !== 0) { console.error(`нет данных: story:trace --mode click (${(run.stderr || run.stdout).trim().split('\n')[0]})`); process.exit(1); }
const data = JSON.parse(run.stdout).stories[0];
let meta = {};
try { meta = loadStory(ref).meta ?? {}; } catch {}

const notice = T.value('story.pause.notice_min') * 60;
const lw = T.value('C-47.lived_wait_lines');
const win = T.value('C-27.window_lines');
const OWN_LABEL = /(?<!\p{L})(спустя|прошл[оаи]|позже)(?!\p{L})/iu;
const BEYOND = /(?<!\p{L})(сут|дн[яеий]|день|недел|месяц|год|лет)/iu;
const fmt = (sec) => {
  if (sec < 60) return `${Math.round(sec)} с`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h >= 48) return `${Math.round(h / 24)} дн`;
  return !h ? `${m} мин` : m ? `${h} ч ${m} мин` : `${h} ч`;
};
const incoming = (x) => x.type === 'line' && (x.kind === 'in' || x.kind === 'photo');

/** Пометки одного прохождения: { at (индекс), kind, text, note }. */
function flagsOf(items) {
  const out = [];
  const lines = items.map((x, i) => ({ ...x, i })).filter((x) => x.type === 'line');
  const slept = new Map(); // кто сказал «сплю» и не было ли метки с тех пор
  lines.forEach((l, k) => {
    const pause = l.delay >= notice;
    if (pause) {
      for (const b of lines.slice(Math.max(0, k - win), k)) if (returnDeadline(b.text, T)) out.push({ at: b.i, kind: 'срок', text: b.text, note: `по клику обещанное и следующее сообщение идут подряд (пауза ${fmt(l.delay)})` });
      if (!l.jump) out.push({ at: l.i, kind: 'пауза', text: l.text, note: `пауза ${fmt(l.delay)} без метки: по клику приходит сразу` });
    }
    if (l.jump) {
      for (const x of lines.slice(k, k + lw)) if (incoming(x) && T.re('dict.lived_wait').test(x.text.toLowerCase())) out.push({ at: x.i, kind: 'ожидание', text: x.text, note: `после скачка «спустя ${fmt(l.delay)}» — по клику ожидания не было` });
      for (const x of lines.slice(Math.max(0, k - 1), k + 2)) if (x.kind === 'sys' && !x.isChapter && OWN_LABEL.test(x.text) && !BEYOND.test(x.text)) out.push({ at: x.i, kind: 'свой #sys', text: x.text, note: 'рядом и метка движка — две метки подряд' });
      slept.clear();
    }
    if (!incoming(l)) return;
    const n = norm(l.text);
    if (T.re('dict.sleep').test(n)) slept.set(l.who, l.i);
    else if (slept.has(l.who) && T.re('dict.morning').test(n)) { out.push({ at: l.i, kind: 'утро', text: l.text, note: 'после «сплю» без метки скачка — утро через секунды' }); slept.delete(l.who); }
  });
  const seen = new Set();
  return out.filter((f) => { const key = `${f.at}|${f.kind}`; if (seen.has(key)) return false; seen.add(key); return true; }).sort((a, b) => a.at - b.at);
}

const runs = data.runs.map((r) => {
  const flags = flagsOf(r.items);
  const labels = r.items.filter((x) => x.type === 'line' && x.jump).length;
  return { persona: r.persona, seed: r.seed, route: r.route, ending: r.ending?.name ?? null, click_s: r.totals.click, real_s: r.totals.real, labels, stalls: r.stalls?.length ?? 0, flags, items: r.items };
});
const card = typeof meta.minutes === 'number' ? meta.minutes : null;

if (args.includes('--json')) {
  console.log(JSON.stringify({ id: data.id, path: data.path, card_minutes: card, runs: runs.map(({ items, ...r }) => ({ ...r, flags: r.flags.map((f) => ({ ...f, knot: items[f.at]?.knot ?? null })) })) }, null, 1));
  process.exit(0);
}

for (const r of runs) {
  console.log(`== ${data.path} · по клику · ${r.persona} · seed ${r.seed}${r.route?.length ? ` · маршрут ${r.route.join(',')}` : ''}`);
  if (!args.includes('--flags')) {
    const byAt = new Map();
    for (const f of r.flags) { if (!byAt.has(f.at)) byAt.set(f.at, []); byAt.get(f.at).push(f); }
    let thread = null;
    r.items.forEach((x, i) => {
      if (x.type === 'line') {
        if (x.jump) console.log(`   · спустя ${fmt(x.delay)}`);
        if (x.thread && x.thread !== thread) { thread = x.thread; console.log(`— чат: ${x.name ?? x.thread}`); }
        const who = x.kind === 'sys' ? '·' : x.kind === 'me' ? 'Вы:' : `${x.whoName ?? x.who}:`;
        console.log(`   ${who} ${x.text}`);
      } else if (x.type === 'choice') {
        console.log(`   [ ${x.options.map((o) => o.text || '(молча)').join(' | ')} ]`);
        console.log(x.silent ? '   (вы промолчали)' : `   Вы: ${x.text}`);
      }
      for (const f of byAt.get(i) ?? []) console.log(`   ${f.kind === 'пауза' ? '·' : '⚠'} ${f.kind}: ${f.note}`);
    });
  } else {
    for (const f of r.flags.filter((x) => x.kind !== 'пауза')) console.log(`   ⚠ ${f.kind} · ${r.items[f.at]?.knot ?? '?'}: «${f.text}» — ${f.note}`);
  }
  const count = (k) => r.flags.filter((f) => f.kind === k).length;
  console.log(`\n   по клику ${fmt(r.click_s)} (реальное время ${fmt(r.real_s)}); на карточке ${card ?? '—'} мин · меток «спустя …» ${r.labels}`);
  console.log(`   пометки: ожидание ${count('ожидание')}, срок ${count('срок')}, утро ${count('утро')}, свой #sys ${count('свой #sys')}; пауз без метки ${count('пауза')}${r.stalls ? ` · кнопка ждала ${r.stalls} раз (по клику напоминаний нет)` : ''}`);
  console.log(`   финал: ${r.ending ?? '—'}\n`);
}
