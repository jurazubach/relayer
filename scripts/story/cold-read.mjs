// story:cold-read — видимая переписка до узла для холодного читателя; --ask — сам читатель через claude -p
// из пустого каталога, без инструментов (план §6, claude-code-format.md §4.1).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCli, intFlag } from './core/cli.mjs';
import { PERSONAS, PERSONA_IDS } from './core/personas.mjs';
import { prepare, runOnce } from './core/run.mjs';
import { MODES, checkIsolation, compose, nextLines, readProtocol } from './core/cold.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROTOCOL = join(HERE, 'cold-reader-protocol.md');
// Модель не настраивается: Opus для всех агентов — решение автора (INTENT.md), совет flow-review о второй модели им перекрыт.
const MODEL = 'claude-opus-5-5';

const HELP = `npm run story:cold-read -- --story <id> --until <узел> [--mode opening|return|click|guess|voices]
                          [--persona <имя>] [--seed N] [--route 0,2,1] [--ask]
                          [--protocol <файл>] [--json]

Выгружает то, что игрок видел на экране до первого входа в узел: чаты, реплики, свои ответы, тишину.
Без ink, шапки, карточки и описания — холодный читатель знает только переписку. Маршрут — прохождение
персоной (по умолчанию random, seed 1); его печатает stderr, им переписка воспроизводится.

Режимы:
${Object.entries(MODES).map(([k, v]) => `  ${k.padEnd(9)}${v}`).join('\n')}

Без --ask переписка печатается в stdout (сводка — в stderr), ключ — только в --json.

--ask запускает читателя: claude -p --model ${MODEL} из пустого временного каталога, --tools "",
без MCP, настроек, команд и автопамяти, роль и вопросы — из протокола (по умолчанию
scripts/story/cold-reader-protocol.md, заглушка до протокола story-playtest). Контрольные вопросы
(служебное имя последнего узла, финалы и виновник, что в контексте) проверяют изоляцию: если в ответе
есть имя узла, финала или истории, которого нет в переписке, или следы проекта — изоляция нарушена,
код выхода 1.

  --story <id>      история по id, файл .json / .ink или папка (одна)
  --until <узел>    переписка до первого входа в узел; узел должен встретиться на маршруте
  --mode            режим (по умолчанию opening)
  --persona <имя>   кто проходит: ${PERSONA_IDS.join(', ')}
  --seed N          seed прохождения (по умолчанию 1)
  --route 0,2,1     номера кнопок по порядку развилок, дальше — персона
  --ask             спросить холодного читателя (claude -p)
  --protocol <файл> другой протокол с теми же разделами
  --json            переписка, ключ, вопросы и (с --ask) ответ и проверка изоляции данными
  --help            эта справка`;

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

runCli(HELP, async (args) => {
  const ref = args.get('story');
  if (!ref || ref === true) throw new Error('нужна --story <id>');
  const until = args.get('until');
  if (!until || until === true) throw new Error('нужен --until <узел>: до какого места читатель видит переписку');
  const mode = args.get('mode', 'opening');
  if (!MODES[mode]) throw new Error(`--mode: ${Object.keys(MODES).join(', ')}, а не «${mode}»`);
  const persona = args.get('persona', 'random');
  if (!PERSONAS[persona]) throw new Error(`нет персоны «${persona}» (есть: ${PERSONA_IDS.join(', ')})`);
  const seed = intFlag(args, 'seed', 1);
  const route = args.get('route') ? String(args.get('route')).split(',').map((x) => Number(x.trim())) : null;
  if (route?.some((n) => !Number.isInteger(n) || n < 0)) throw new Error('--route: номера кнопок через запятую, с нуля');

  const p = prepare(ref);
  if (!p.nodes.includes(until)) throw new Error(`${p.story.path}: нет узла «${until}»`);
  const r = runOnce(p, { persona, seed, route, mode: mode === 'click' ? 'click' : 'realtime' });
  const at = r.timeline.items.findIndex((x) => x.knot === until);
  if (at < 0) throw new Error(`узел «${until}» не встретился на маршруте ${PERSONAS[persona].name}, seed ${seed} (финал ${r.ending.name}); возьми другой --seed, --persona или --route`);
  const items = r.timeline.items.slice(0, at);
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
    story: p.story.id, mode, until, persona, seed, route: r.route.slice(0, items.filter((i) => i.type === 'choice').length),
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

  const protocol = readProtocol(resolve(args.get('protocol') ?? PROTOCOL));
  const questions = protocol.mode(mode);
  if (!protocol.role || !questions || !protocol.control) throw new Error(`в протоколе нет разделов «Роль», «Режим: ${mode}» или «Контроль»`);
  const model = MODEL;
  const prompt = [
    'Вот переписка, которую ты видишь на экране телефона.', '', '<переписка>', transcript, '</переписка>', '',
    questions, '', protocol.control, ...(protocol.format ? ['', protocol.format] : []),
  ].join('\n');
  const res = ask(prompt, protocol.role, model);
  const isolation = checkIsolation(res.answer, p, transcript);
  if (json) console.log(JSON.stringify({ ...meta, model, transcript, questions, key, answer: res.answer, isolation, cost: res.cost, usage: res.usage }, null, 1));
  else {
    console.log(`story:cold-read · ${p.story.id} · ${mode} · до ${until} · ${PERSONAS[persona].name}, seed ${seed} · читатель ${model}\n`);
    console.log(res.answer);
    console.log(`\nключ: говорили ${key.speakers.join(', ') || '—'}; финал этого маршрута ${key.ending}${key.voices ? `; голоса ${Object.entries(key.voices).map(([l, n]) => `${l} = ${n}`).join(', ')}` : ''}`);
    if (key.next.length) console.log(`дальше пришло бы: ${key.next.join(' / ')}`);
    console.log(isolation.ok
      ? '✓ изоляция: в ответе нет имён узлов, финалов и следов проекта'
      : `✗ изоляция нарушена: ${[...isolation.leaks.map((w) => `«${w}»`), ...isolation.traces].join(', ')}`);
  }
  return isolation.ok ? 0 : 1;
}, { bool: ['ask'] });
