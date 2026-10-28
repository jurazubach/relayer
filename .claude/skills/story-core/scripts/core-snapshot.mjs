// Запись одобренного ядра: D-NN «ядро vN» в docs/stories/<id>/decisions.md через decision-add.mjs скилла
// story-desk (номер, дата, опоры, «ядро: D-NN» в STATUS.md считает он), затем поля ядра под записью и
// шапка ink из 4 строк для story.ink или скелета. Пишет только одобренное: по умолчанию — показ без записи.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runCli } from '../../../../scripts/story/core/cli.mjs';
import { CORE_FIELDS, ROOT, STATE_DIR, decisionsWithFields, readCore, readText } from './core-lib.mjs';

const DESK = join(ROOT, '.claude/skills/story-desk/scripts/decision-add.mjs');

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/core-snapshot.mjs --story <id> --draft <файл> --who <кто> [--why "<почему>"]
       [--replaces D-NN] [--write] [--keep-draft] [--dir <папка>] [--json]
node \${CLAUDE_SKILL_DIR}/scripts/core-snapshot.mjs --story <id> --header

Записывает одобренное ядро (story-core, шаг 7 алгоритма):
  1. черновик «- поле: значение» (логлайн, вопрос, ставка, оси, роль, герой, противник, тема, время мира,
     состав, скрытая правда, финалы) → запись D-NN через story-desk/scripts/decision-add.mjs:
     вид «ядро», --set-core (STATUS.md: «ядро: D-NN»), опоры R-01…R-08, R-39, R-84, «заменяет»;
  2. поля ядра — строками под заголовком записи (одно место правды: в STATUS.md только номер);
  3. шапка ink из 4 строк (// логлайн:, // вопрос:, // ставка:, // оси:) — вставить до первой строки ink.

Без --write только показывает, что будет записано (одобрение автора, в конвейере — королевы, — до записи).
Пустое обязательное поле — отказ: сначала core-check.mjs --draft.

  --story <id>     история (docs/stories/<id>/ заводит story-desk: story-status.mjs --init)
  --draft <файл>   черновик ядра; после записи удаляется, если не дан --keep-draft
  --who <кто>      кто одобрил: автор, королева
  --why "<текст>"  почему это ядро (по умолчанию — «ядро vN из направления …»)
  --replaces D-NN  прежнее ядро: остаётся в журнале, дальше — stale-check.mjs у story-desk
  --write          записать (без него — показ)
  --keep-draft     не удалять черновик после записи
  --header         только шапка ink из текущего ядра (STATUS.md → D-NN)
  --dir <папка>    где лежит состояние (по умолчанию ${STATE_DIR})
  --json           результат данными`;

const BASIS = ['R-01', 'R-02', 'R-03', 'R-06', 'R-07', 'R-08', 'R-39', 'R-84'];

/** Шапка ink из полей ядра: ровно 4 строки, порядок — как в build-plan.md §9. */
export const headerLines = (fields) => CORE_FIELDS.filter((d) => d.head).map((d) => `// ${d.key}: ${fields[d.key] ?? '…'}`);

runCli(HELP, async (args) => {
  const id = args.get('story');
  if (!id || id === true) throw new Error('нужна --story <id>');
  const dir = args.get('dir', STATE_DIR);
  if (args.has('header')) {
    const core = readCore(id, { dir });
    if (!core.source) throw new Error(`у ${id} нет ядра: ни «ядро: D-NN» в STATUS.md, ни записи «вид: ядро»`);
    const lines = headerLines(core.fields);
    if (args.has('json')) console.log(JSON.stringify({ story: id, core: core.id, header: lines }, null, 2));
    else console.log(`шапка ink из ядра ${core.id}:\n\n${lines.join('\n')}`);
    return 0;
  }
  const draft = args.get('draft');
  const who = args.get('who');
  if (!draft || draft === true) throw new Error('нужен --draft <файл>: черновик ядра');
  if (!who || who === true) throw new Error('нужен --who: кто одобрил ядро');
  const core = readCore(id, { draft, dir });
  const missing = CORE_FIELDS.filter((d) => d.need && !core.fields[d.key]).map((d) => d.key);
  if (missing.length) throw new Error(`в черновике не решено: ${missing.join(', ')} — node \${CLAUDE_SKILL_DIR}/scripts/core-check.mjs --story ${id} --draft ${draft}`);

  const cores = core.decisions.filter((d) => d.kind === 'ядро');
  const version = cores.length + 1;
  const replaces = args.get('replaces', core.status.fields?.core ?? null);
  const what = `ядро v${version}: ${core.fields['логлайн']}`;
  const why = args.get('why', core.other['почему'] ?? `ядро v${version}, вопросы автору с вариантами, проверено core-check.mjs`);
  const deskArgs = [DESK, '--story', id, '--who', who, '--what', what, '--why', why, '--kind', 'ядро', '--set-core', '--basis', BASIS.join(','), '--dir', dir];
  if (replaces && replaces !== true) deskArgs.push('--replaces', replaces);
  const fieldLines = CORE_FIELDS.filter((d) => core.fields[d.key]).map((d) => `- ${d.key}: ${core.fields[d.key]}`);
  const header = headerLines(core.fields);
  const write = args.has('write');
  if (!write) deskArgs.push('--dry-run');
  const r = spawnSync(process.execPath, deskArgs, { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`decision-add.mjs: ${(r.stderr || r.stdout).trim()}`);

  let num = null;
  if (write) {
    // поля ядра — под только что записанной записью, перед следующей (её нет: запись последняя)
    const file = join(dir, id, 'decisions.md');
    const text = readText(file);
    const last = decisionsWithFields(text).at(-1);
    num = last?.id ?? null;
    writeFileSync(file, `${text.replace(/\s*$/, '')}\n${fieldLines.join('\n')}\n`);
    if (!args.has('keep-draft') && existsSync(draft) && !readFileSync(draft, 'utf8').includes('## D-')) rmSync(draft);
  }
  const res = { story: id, written: write, id: num, version, replaces: replaces === true ? null : replaces, what, fields: core.fields, header, desk: r.stdout.trim() };
  if (args.has('json')) { console.log(JSON.stringify(res, null, 2)); return 0; }
  console.log(r.stdout.trim());
  console.log(`\n${write ? 'дописано под записью' : 'будет дописано под записью'}:\n${fieldLines.join('\n')}`);
  console.log(`\nшапка ink (до первой строки story.ink или plans/skeleton.ink):\n${header.join('\n')}`);
  if (!write) console.log('\nпоказ без записи: после одобрения — тот же вызов с --write');
  else if (replaces) console.log(`\nядро сменилось — что устарело: story-desk, stale-check.mjs --story ${id}`);
  return 0;
});
