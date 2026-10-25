// Можно ли угадать (скилл story-mystery, mystery-fair-play:P-16, checklists §4): холодный читатель видит
// переписку до узла раскрытия и называет свою версию. Тонкая обёртка над `npm run story:cold-read -- --mode guess`:
// по одному прохождению на персону, ключ — виновник из facts.md. Без --ask читателя не спрашивает: только
// проверяет, что узел встречается на маршрутах, и печатает размер переписки — claude -p не запускается.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadStory, parseStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { loadThresholds } from '../../../../scripts/lib/thresholds.mjs';
import { factsOf } from '../../../../scripts/lint/checks/C-54.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/guess.mjs --story <id|путь> [--until <узел>] [--personas a,b,c] [--seed N] [--ask] [--json]

Угадывается ли разгадка до раскрытия. Для каждого узла «// reveal:» (или --until) и каждой персоны —
story:cold-read в режиме guess: переписка до первого входа в узел, без ink и карточки.
  без --ask  план и проверка маршрутов: дошла ли персона до узла, сколько строк и кнопок увидела
  --ask      спросить холодного читателя (claude -p, по одному на персону) и сверить ответ с ключом:
             назван ли виновник из facts.md («виновник: <id>») в строке с самой вероятной версией
Доля угадавших сравнивается с полосой C-54.guess_share: выше — улики слишком явные, ниже — тёмные
или их мало (mystery-fair-play:P-16). Без виновника в facts.md — только ответы, судит модель.

  --story <id|путь>  история (одна)
  --until <узел>     узел вместо узлов «// reveal:»
  --personas a,b     персоны cold-read (по умолчанию random,curious,distracted)
  --seed N           seed прохождений (по умолчанию 1)
  --ask              спросить читателя (тратит запуски Opus)
  --json             всё данными
  --help             эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const COLD = join(ROOT, 'scripts/story/cold-read.mjs');
const T = loadThresholds();
const ref = storyRefs([opt('--story')].filter(Boolean))[0];
if (!opt('--story') || !ref) { console.error('нужно --story <id|путь> (см. --help)'); process.exit(2); }
let story;
try { story = loadStory(ref); } catch (e) { console.error(`нет данных: ${e.message}`); process.exit(2); }
const tree = parseStory(story);
const nodes = opt('--until') ? [opt('--until')] : tree.knots.filter((k) => k.marks.some((m) => m.kind === 'reveal')).map((k) => k.id);
if (!nodes.length) {
  const msg = 'нет узлов «// reveal:» — укажи узел разгадки: --until <узел>';
  if (args.includes('--json')) console.log(JSON.stringify({ story: story.id, nodes: [], error: msg }));
  else console.error(msg);
  process.exit(2);
}
const personas = (opt('--personas') ?? 'random,curious,distracted').split(',').map((s) => s.trim()).filter(Boolean);
const seed = opt('--seed') ?? '1';
const ask = args.includes('--ask');

const facts = factsOf(story);
const culprit = facts ? readFileSync(facts, 'utf8').match(/виновник\s*[:—-]\s*`?([\p{L}\p{N}_]+)/u)?.[1] ?? null : null;
const char = (story.meta?.characters ?? []).find((c) => c.id === culprit);
// имя ищем по основе: «Лёня», «Лёни», «Лёню» — одна основа; id — для ответов, где читатель назвал чат
const stems = culprit ? [...new Set([culprit, ...(char?.name ?? '').split(/\s+/)].filter((w) => w.length >= 3).map((w) => w.toLowerCase().replace(/ё/g, 'е').slice(0, Math.max(3, w.length - 1))))] : [];
const named = (text) => stems.some((s) => text.toLowerCase().replace(/ё/g, 'е').includes(s));
// строка с отметкой самой вероятной версии (вопрос 2 протокола guess); нет такой — весь ответ
const likely = (answer) => answer.split('\n').filter((l) => /вероятн|скорее всего|ставлю на|думаю, что/i.test(l)).join('\n') || answer;

const rows = [];
for (const until of nodes) {
  for (const persona of personas) {
    const argv = [COLD, '--story', ref, '--until', until, '--mode', 'guess', '--persona', persona, '--seed', String(seed), '--json', ...(ask ? ['--ask'] : [])];
    const r = spawnSync('node', argv, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
    let data = null;
    try { data = JSON.parse(r.stdout); } catch {}
    if (!data) { rows.push({ until, persona, ok: false, error: (r.stderr || r.stdout || '').trim().split('\n').at(-1) }); continue; }
    const row = { until, persona, ok: true, lines: data.lines, choices: data.choices, route: data.route, speakers: data.key?.speakers ?? [] };
    if (ask) Object.assign(row, { answer: data.answer, isolation: data.isolation?.ok ?? null, guessed: culprit ? named(likely(data.answer ?? '')) : null });
    rows.push(row);
  }
}

const band = T.value('C-54.guess_share');
const scored = rows.filter((r) => r.ok && r.guessed != null && r.isolation !== false);
const share = scored.length ? scored.filter((r) => r.guessed).length / scored.length : null;
const verdict = share == null ? null : share > band.max ? 'слишком явно' : share < band.min ? 'слишком темно' : 'в полосе';
const out = { story: story.id, nodes, personas, seed: Number(seed), asked: ask, culprit, facts: facts ?? null, band, share, verdict, rows };
if (args.includes('--json')) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }

const pct = (x) => `${Math.round(x * 100)} %`;
const L = [`guess · ${story.id} · персоны ${personas.join(', ')} · seed ${seed} · виновник: ${culprit ?? (facts ? 'в facts.md нет строки «виновник:»' : 'facts.md нет')}`];
for (const r of rows) {
  if (!r.ok) { L.push(`  ✗ ${r.until} · ${r.persona}: ${r.error}`); continue; }
  L.push(`  ${r.until} · ${r.persona}: строк ${r.lines}, кнопок ${r.choices}, говорили ${r.speakers.join(', ') || '—'}${ask ? ` · ${r.isolation === false ? 'изоляция нарушена — не в счёт' : r.guessed == null ? 'ключа нет' : r.guessed ? 'назвал виновника' : 'не назвал'}` : ''}`);
  if (ask && r.answer) L.push(...r.answer.split('\n').map((l) => `      ${l}`));
}
if (!ask) L.push('', 'читателя не спрашивали: добавь --ask (по одному claude -p на персону и узел)');
else if (share != null) L.push('', `угадали: ${pct(share)} (${scored.length} ответов) · полоса C-54.guess_share ${pct(band.min)}–${pct(band.max)} · ${verdict}`);
else L.push('', 'долю не посчитать: нет ключа (виновника в facts.md) или ответов без нарушения изоляции — суди по ответам (модель)');
console.log(L.join('\n'));
process.exit(rows.some((r) => !r.ok) ? 1 : 0);
