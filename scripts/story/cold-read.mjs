// story:cold-read — видимая переписка до узла для холодного читателя; --ask — сам читатель через claude -p
// из пустого каталога, без инструментов (план §6, claude-code-format.md §4.1).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runCli, intFlag } from './core/cli.mjs';
import { PERSONAS, PERSONA_IDS } from './core/personas.mjs';
import { prepare, runOnce } from './core/run.mjs';
import { MODES, checkIsolation, compose, nextLines, readProtocol } from './core/cold.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
// Протокол — у скилла story-playtest (TH-88); заглушка рядом остаётся запасной, если скилла в проекте нет.
const SKILL_PROTOCOL = join(HERE, '../../.claude/skills/story-playtest/references/cold-reader.md');
const PROTOCOL = existsSync(SKILL_PROTOCOL) ? SKILL_PROTOCOL : join(HERE, 'cold-reader-protocol.md');
// Модель не настраивается: Opus для всех агентов — решение автора (INTENT.md), совет flow-review о второй модели им перекрыт.
const MODEL = 'claude-opus-5-5';

const PROFILE_HINT = 'hurried — торопливый, attentive — внимательный, skeptic — скептик, distracted — отвлечённый, unresponsive — неотвечающий';
// персона прохождения по умолчанию для профиля: отвлечённый уходит на паузах, неотвечающий не жмёт кнопки
const PROFILE_PERSONA = { skeptic: 'suspicious', distracted: 'distracted', unresponsive: 'unresponsive' };

const HELP = `npm run story:cold-read -- --story <id> --until <узел> [--mode opening|return|click|guess|voices]
                          [--persona <имя>] [--seed N] [--route 0,2,1] [--last N] [--ask] [--profile <профиль>]
                          [--protocol <файл>] [--json]

Выгружает то, что игрок видел на экране до первого входа в узел: чаты, реплики, свои ответы, тишину.
Без ink, шапки, карточки и описания — холодный читатель знает только переписку. Маршрут — прохождение
персоной (по умолчанию random, seed 1); его печатает stderr, им переписка воспроизводится.

Режимы:
${Object.entries(MODES).map(([k, v]) => `  ${k.padEnd(9)}${v}`).join('\n')}

Без --ask переписка печатается в stdout (сводка — в stderr), ключ — только в --json.

--ask запускает читателя: claude -p --model ${MODEL} из пустого временного каталога, --tools "",
без MCP, настроек, команд и автопамяти, роль и вопросы — из протокола (по умолчанию
.claude/skills/story-playtest/references/cold-reader.md, без скилла — заглушка
scripts/story/cold-reader-protocol.md). Контрольные вопросы (служебное имя последнего узла, финалы и
виновник, название истории) проверяют изоляцию: если в ответе есть имя узла, финала или истории,
которого нет в переписке, или следы проекта — изоляция нарушена, код выхода 1. Строки ответа об
окружении claude -p (почта, рабочая папка, пути) из сохраняемого ответа вырезаются: это не знание
об истории, а шум окружения; сколько вырезано — isolation.env.

Профили (раздел «Профиль: <id>» протокола дописывается к роли): ${PROFILE_HINT}.
Без --persona профиль skeptic проходит персоной suspicious, distracted — distracted, unresponsive — unresponsive.

  --story <id>      история по id, файл .json / .ink или папка (одна)
  --until <узел>    переписка до первого входа в узел; узел должен встретиться на маршруте
  --mode            режим (по умолчанию opening)
  --persona <имя>   кто проходит: ${PERSONA_IDS.join(', ')}
  --seed N          seed прохождения (по умолчанию 1)
  --route 0,2,1     номера кнопок по порядку развилок, дальше — персона
  --last N          только последние N видимых строк перед узлом: случайный срез без контекста
                    (maass-fire-in-fiction:P-16, lab.playtest.slice.lines)
  --ask             спросить холодного читателя (claude -p)
  --profile <имя>   профиль читателя из протокола: hurried, attentive, skeptic, distracted, unresponsive
  --protocol <файл> другой протокол с теми же разделами
  --json            переписка, ключ, вопросы и (с --ask) ответ и проверка изоляции данными
  --help            эта справка`;

/** Разделы «## Профиль: <id>» протокола: id → текст. */
export function readProfiles(file) {
  const text = readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const out = {};
  let name = null;
  for (const line of text.split('\n')) {
    const h = line.match(/^## (.+)$/);
    if (h) { const m = h[1].match(/^Профиль:\s*([a-z-]+)/); name = m ? m[1] : null; if (name) out[name] = []; continue; }
    if (name) out[name].push(line);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join('\n').trim()]));
}

// Строки, в которых claude -p рассказывает о своём окружении, а не о переписке: почта аккаунта, рабочая папка, пути.
const ENV_LINE = [
  /[\w.+-]+@[\w-]+\.[\w.-]+/,
  /(^|[\s«"'(])(\/(Users|home|private|tmp|var|opt)\/|[A-Z]:\\)/,
  /рабоч(ая|ей|ую) (папк|директори|каталог)|рабочий каталог|working directory|\bcwd\b/i,
  /\b(claude code|claude\.md|system prompt|системн(ый|ом) промпт)/i,
];

/** Ответ без строк об окружении; kinds — какие признаки сработали (сам текст не сохраняется). */
export function redactEnv(answer) {
  const kinds = new Set();
  const kept = [];
  let removed = 0;
  for (const line of String(answer).split('\n')) {
    const hit = ENV_LINE.map((re, i) => (re.test(line) ? ['почта', 'путь', 'рабочая папка', 'окружение'][i] : null)).filter(Boolean);
    if (hit.length) { removed++; hit.forEach((k) => kinds.add(k)); } else kept.push(line);
  }
  return { answer: kept.join('\n').trim(), removed, kinds: [...kinds] };
}

/** checkIsolation по полному ответу (утечка остаётся утечкой и в вырезанной строке) + вырезание окружения. */
export function isolate(answer, p, transcript) {
  const isolation = checkIsolation(answer, p, transcript);
  const env = redactEnv(answer);
  return { answer: env.answer, isolation: { ...isolation, env: { removed: env.removed, kinds: env.kinds } } };
}

function ask(prompt, role, model) {
  const dir = mkdtempSync(join(tmpdir(), 'cold-read-'));
  // вложенный запуск из сессии Claude Code: без этих переменных claude -p не считает себя частью проекта
  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.CLAUDE_PROJECT_DIR;
  try {
    const r = spawnSync('claude', [
      '-p', '--model', model, '--tools', '', '--strict-mcp-config', '--setting-sources', '',
      '--disable-slash-commands', '--settings', '{"autoMemoryEnabled":false}', '--system-prompt', role,
      '--no-session-persistence', '--output-format', 'json',
    ], { cwd: dir, env, input: prompt, encoding: 'utf8', maxBuffer: 1 << 26, timeout: 15 * 60 * 1000 });
    if (r.error) throw new Error(`claude -p не запустился: ${r.error.message}`);
    let data;
    try { data = JSON.parse(r.stdout); } catch { throw new Error(`claude -p: код ${r.status}, вывод не JSON: ${(r.stderr || r.stdout).trim().split('\n')[0]}`); }
    if (data.is_error) throw new Error(`claude -p: ${data.result ?? data.subtype}`);
    return { answer: String(data.result ?? '').trim(), cost: data.total_cost_usd ?? null, usage: data.usage ?? null };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const main = async (args) => {
  const ref = args.get('story');
  if (!ref || ref === true) throw new Error('нужна --story <id>');
  const until = args.get('until');
  if (!until || until === true) throw new Error('нужен --until <узел>: до какого места читатель видит переписку');
  const mode = args.get('mode', 'opening');
  if (!MODES[mode]) throw new Error(`--mode: ${Object.keys(MODES).join(', ')}, а не «${mode}»`);
  const profile = args.get('profile');
  if (profile === true) throw new Error('--profile: нужно имя профиля');
  const protocolFile = resolve(args.get('protocol') ?? PROTOCOL);
  const profiles = profile ? readProfiles(protocolFile) : {};
  if (profile && !profiles[profile]) throw new Error(`в протоколе нет профиля «${profile}» (есть: ${Object.keys(profiles).join(', ') || '—'})`);
  const persona = args.get('persona', PROFILE_PERSONA[profile] ?? 'random');
  if (!PERSONAS[persona]) throw new Error(`нет персоны «${persona}» (есть: ${PERSONA_IDS.join(', ')})`);
  const seed = intFlag(args, 'seed', 1);
  const route = args.get('route') ? String(args.get('route')).split(',').map((x) => Number(x.trim())) : null;
  if (route?.some((n) => !Number.isInteger(n) || n < 0)) throw new Error('--route: номера кнопок через запятую, с нуля');

  const p = prepare(ref);
  if (!p.nodes.includes(until)) throw new Error(`${p.story.path}: нет узла «${until}»`);
  const r = runOnce(p, { persona, seed, route, mode: mode === 'click' ? 'click' : 'realtime' });
  const at = r.timeline.items.findIndex((x) => x.knot === until);
  if (at < 0) throw new Error(`узел «${until}» не встретился на маршруте ${PERSONAS[persona].name}, seed ${seed} (финал ${r.ending.name}); возьми другой --seed, --persona или --route`);
  const upto = r.timeline.items.slice(0, at);
  let items = upto;
  const last = intFlag(args, 'last', 0);
  if (last) {
    const lineAt = items.map((x, i) => (x.type === 'line' ? i : -1)).filter((i) => i >= 0);
    if (lineAt.length > last) items = items.slice(lineAt[lineAt.length - last]);
  }
  if (!items.some((i) => i.type === 'line')) throw new Error(`до узла «${until}» игрок ничего не видел`);
  const { transcript, key } = compose(p, items, mode);
  const shown = items.filter((i) => i.type === 'line');
  // ключ — для того, кто сверяет ответы; читателю он не уходит
  Object.assign(key, {
    until, ending: r.ending.name,
    speakers: [...new Set(shown.filter((i) => i.who && (i.kind === 'in' || i.kind === 'photo')).map((i) => i.whoName ?? i.who))],
    next: nextLines(r.timeline.items.slice(at)).map((i) => (i.kind === 'sys' ? `· ${i.text}` : `${i.kind === 'me' ? 'Вы' : i.whoName ?? i.name}: ${i.text}`)),
  });
  const meta = {
    story: p.story.id, mode, until, persona, profile: profile ?? null, last: last || null, seed, route: r.route.slice(0, upto.filter((i) => i.type === 'choice').length),
    lines: shown.length, choices: items.filter((i) => i.type === 'choice').length,
  };
  const json = args.has('json');

  if (!args.has('ask')) {
    if (json) console.log(JSON.stringify({ ...meta, transcript, key }, null, 1));
    else {
      console.log(transcript);
      console.error(`story:cold-read · ${p.story.id} · ${mode} · до ${until} · ${PERSONAS[persona].name}, seed ${seed} · строк ${meta.lines}, кнопок ${meta.choices} · --route ${meta.route.join(',') || '—'}`);
    }
    return 0;
  }

  const protocol = readProtocol(protocolFile);
  const questions = protocol.mode(mode);
  if (!protocol.role || !questions || !protocol.control) throw new Error(`в протоколе нет разделов «Роль», «Режим: ${mode}» или «Контроль»`);
  let role = protocol.role;
  if (profile) role = `${role}\n\n${profiles[profile]}`;
  const model = MODEL;
  const prompt = [
    'Вот переписка, которую ты видишь на экране телефона.', '', '<переписка>', transcript, '</переписка>', '',
    questions, '', protocol.control, ...(protocol.format ? ['', protocol.format] : []),
  ].join('\n');
  const res = ask(prompt, role, model);
  const { answer, isolation } = isolate(res.answer, p, transcript);
  if (json) console.log(JSON.stringify({ ...meta, profile: profile ?? null, model, transcript, questions, key, answer, isolation, cost: res.cost, usage: res.usage }, null, 1));
  else {
    console.log(`story:cold-read · ${p.story.id} · ${mode} · до ${until} · ${PERSONAS[persona].name}, seed ${seed} · читатель ${model}${profile ? `, профиль ${profile}` : ''}\n`);
    console.log(answer);
    if (isolation.env.removed) console.log(`\n(вырезано строк об окружении: ${isolation.env.removed} — ${isolation.env.kinds.join(', ')})`);
    console.log(`\nключ: говорили ${key.speakers.join(', ') || '—'}; финал этого маршрута ${key.ending}${key.voices ? `; голоса ${Object.entries(key.voices).map(([l, n]) => `${l} = ${n}`).join(', ')}` : ''}`);
    if (key.next.length) console.log(`дальше пришло бы: ${key.next.join(' / ')}`);
    console.log(isolation.ok
      ? '✓ изоляция: в ответе нет имён узлов, финалов и следов проекта'
      : `✗ изоляция нарушена: ${[...isolation.leaks.map((w) => `«${w}»`), ...isolation.traces].join(', ')}`);
  }
  return isolation.ok ? 0 : 1;
};

// импорт (самопроверка) не запускает команду
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) runCli(HELP, main, { bool: ['ask'] });
