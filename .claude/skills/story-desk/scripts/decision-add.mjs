// decision-add — новая запись D-NN в docs/stories/<id>/decisions.md (план §4, §7). Номер, дата, хэш узла
// для отклонённой находки и проверка опор считаются здесь, а не на глаз: номер не повторяется, хэш один.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runCli } from '../../../../scripts/story/core/cli.mjs';
import { KINDS, STATE_DIR, nextId, nodeHash, readDecisions, readText, setStatusField, stateDir, today, tryStory } from './desk-core.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/decision-add.mjs --story <id> --who <кто> --what "<что решили>"
       [--why "<почему>"] [--basis R-09,C-35,narrative-postmortems:P-07] [--replaces D-03]
       [--kind ${KINDS.join('|')}] [--node <узел> --finding C-NN]
       [--set-core] [--set-plan plans/plan-v3.md] [--date ГГГГ-ММ-ДД] [--dir <папка>] [--dry-run] [--json]
node \${CLAUDE_SKILL_DIR}/scripts/decision-add.mjs --story <id> --hash <узел>

Дописывает решение в ${STATE_DIR}/<id>/decisions.md в формате, который читает npm run story:status:

  ## D-NN · дата · кто — что
  - вид: …            ядро, план, ветка, отклонено, отложено, откат, автор, направление, другое
  - почему: …
  - опора: …           R-NN, C-NN, A-NN, D-NN, алиас:ID — существование проверяется
  - заменяет: D-NN     прежнее решение остаётся в журнале, номера не переиспользуются
  - узел: … · хэш: …   для отклонённой находки: не всплывает снова, пока хэш узла тот же

  --kind отклонено     требует --node и --finding; хэш узла считается по src/stories/<id>/
  --set-core           это новое ядро: в STATUS.md «ядро: D-NN», дальше — stale-check.mjs
  --set-plan <путь>    это новая версия плана: в STATUS.md «план: <путь>» (файл должен существовать)
  --hash <узел>        только посчитать хэш узла, ничего не писать
  --dry-run            показать запись, не писать
  --dir <папка>        где лежит состояние (по умолчанию ${STATE_DIR}) — для проверок
  --json               запись данными

Запись делается после согласия автора: скилл предлагает текст, пишет одобренное.`;

const RULES = 'docs/playbook/rules.md';
const CHECKS = 'docs/playbook/checks.md';
const SUPERSEDED = 'docs/playbook/superseded.md';

/** Опоры: ID свода должны быть в своде, алиас — в базе, D-NN — в журнале этой истории. */
function checkBasis(list, decisionsText) {
  const bad = [];
  const rules = readText(RULES), checks = readText(CHECKS), sup = readText(SUPERSEDED);
  for (const id of list) {
    let ok = true;
    if (/^R-\d+$/.test(id)) ok = new RegExp(`\\*\\*${id}\\.`).test(rules);
    else if (/^C-\d+$/.test(id)) ok = new RegExp(`\\b${id}\\b`).test(checks);
    else if (/^A-\d+$/.test(id)) ok = new RegExp(`\\*\\*${id}\\*\\*`).test(sup);
    else if (/^D-\d+$/.test(id)) ok = new RegExp(`\\b${id}\\b`).test(decisionsText);
    else if (/^[a-z0-9-]+:[\wА-я§#-]+$/.test(id)) ok = existsSync(join('docs/books', id.split(':')[0]));
    else if (/^LOCAL-\d+$/.test(id)) ok = new RegExp(`\\b${id}\\b`).test(readText('docs/playbook/local-lessons.md'));
    if (!ok) bad.push(id);
  }
  return bad;
}

runCli(HELP, async (args) => {
  const id = args.get('story');
  const dir = args.get('dir', STATE_DIR);
  const json = args.has('json');

  if (args.has('hash')) {
    const story = tryStory(id);
    if (!story) throw new Error(`нет истории ${id} в src/stories`);
    const h = nodeHash(story, args.get('hash'));
    if (!h) throw new Error(`в ${id} нет узла «${args.get('hash')}»`);
    console.log(json ? JSON.stringify(h, null, 1) : `${h.node} · ${h.file}:${h.line} · хэш ${h.hash}`);
    return 0;
  }

  const sdir = stateDir(id, dir);
  const file = join(sdir, 'decisions.md');
  const text = existsSync(file) ? readFileSync(file, 'utf8') : `# Решения · ${id}\n`;
  const who = args.get('who');
  const what = args.get('what');
  if (!who || !what || who === true || what === true) throw new Error('нужны --who и --what: кто решил и что');
  const kind = args.get('kind', null);
  if (kind && !KINDS.includes(kind)) throw new Error(`--kind: одно из ${KINDS.join(', ')}`);
  const basis = String(args.get('basis', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
  const bad = checkBasis(basis, text);
  if (bad.length) throw new Error(`опоры не найдены: ${bad.join(', ')} (свод — npm run story:rule <ID>)`);
  const replaces = args.get('replaces', null);
  if (replaces && !readDecisions(file).some((d) => d.id === replaces)) throw new Error(`--replaces ${replaces}: такого решения в ${file} нет`);

  let hash = null;
  const node = args.get('node', null);
  const finding = args.get('finding', null);
  if (kind === 'отклонено') {
    if (!node || !finding) throw new Error('отклонённая находка: нужны --node <узел> и --finding C-NN');
    const story = tryStory(id);
    if (!story) throw new Error(`нет истории ${id} в src/stories — хэш узла не посчитать`);
    hash = nodeHash(story, node);
    if (!hash) throw new Error(`в ${id} нет узла «${node}»`);
  }
  const plan = args.get('set-plan', null);
  if (plan && !existsSync(join(sdir, plan))) throw new Error(`--set-plan: нет файла ${join(sdir, plan)}`);

  const num = nextId('D', text);
  const date = args.get('date', today());
  const lines = [`## ${num} · ${date} · ${who} — ${what}`, ''];
  if (kind) lines.push(`- вид: ${kind}`);
  if (args.get('why')) lines.push(`- почему: ${args.get('why')}`);
  if (basis.length) lines.push(`- опора: ${basis.join(', ')}`);
  if (replaces) lines.push(`- заменяет: ${replaces}`);
  if (finding) lines.push(`- находка: ${finding}`);
  if (hash) lines.push(`- узел: ${hash.node} · хэш: ${hash.hash}`);
  const entry = lines.join('\n');

  const status = join(sdir, 'STATUS.md');
  let statusText = readText(status);
  const touched = [];
  if (args.has('set-core')) { statusText = setStatusField(statusText, 'ядро', num); touched.push(`ядро: ${num}`); }
  if (plan) { statusText = setStatusField(statusText, 'план', plan); touched.push(`план: ${plan}`); }
  if (touched.length) statusText = setStatusField(statusText, 'обновлено', date);

  const out = { story: id, file, id: num, date, who, what, kind, why: args.get('why', null), basis, replaces, finding, node: hash, status: touched, written: !args.has('dry-run') };
  if (!args.has('dry-run')) {
    writeFileSync(file, `${text.replace(/\s+$/, '')}\n\n${entry}\n`);
    if (touched.length) {
      if (!statusText) throw new Error(`нет ${status} — сначала story-status.mjs --init ${id}`);
      writeFileSync(status, statusText);
    }
  }
  if (json) { console.log(JSON.stringify(out, null, 1)); return 0; }
  console.log(`${args.has('dry-run') ? 'будет записано' : 'записано'} в ${file}:\n\n${entry}\n`);
  if (touched.length) console.log(`STATUS.md: ${touched.join(', ')}`);
  if ((args.has('set-core') || kind === 'ядро') && replaces) console.log(`Ядро сменилось — что устарело: node \${CLAUDE_SKILL_DIR}/scripts/stale-check.mjs --story ${id}`);
  else if (args.has('set-core') || kind === 'ядро') console.log('Первое ядро (без «заменяет:»): главы и планы не устаревают; сменить ядро — новое D-NN с --replaces');
  return 0;
}, { bool: ['set-core', 'dry-run'] });
