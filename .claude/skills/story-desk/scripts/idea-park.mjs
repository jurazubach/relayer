// idea-park — банк идей (план §7): всё предложенное и не взятое лежит в docs/stories/<id>/ideas.md с причиной
// и «когда вернуться». Банк общий: --list ищет по всем историям, потому что отвергнутое для одной может
// подойти другой. Генерация новых направлений из банка — у story-brainstorm, здесь только парковка и поиск.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runCli, table } from '../../../../scripts/story/core/cli.mjs';
import { STATE_DIR, nextId, stateDir, today } from './desk-core.mjs';

const IDEA_KINDS = ['направление', 'ядро', 'план', 'развилка', 'финал', 'персонаж', 'рецепт', 'сцена', 'другое'];

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/idea-park.mjs --story <id> --kind <вид> --text "<идея>"
       --why "<почему не взяли>" --when "<когда вернуться>" [--from D-07|plans/plan-1.md] [--who <кто>]
       [--date ГГГГ-ММ-ДД] [--dir <папка>] [--dry-run] [--json]
node \${CLAUDE_SKILL_DIR}/scripts/idea-park.mjs --list [--story <id>] [--kind <вид>] [--query <слово>] [--open] [--json]
node \${CLAUDE_SKILL_DIR}/scripts/idea-park.mjs --take I-03 --story <id> --into <id> [--decision D-NN]

Парковка: дописывает в ${STATE_DIR}/<id>/ideas.md

  ## I-NN · дата · вид — идея
  - не взято: …         причина: без неё идею нельзя честно достать
  - когда вернуться: …  условие, а не дата: «если найдётся личный риск», «в следующей истории про море»
  - откуда: …           D-NN, план, ревью, рецепт тестера
  - статус: в банке     или «взято: <id> D-NN»

Виды: ${IDEA_KINDS.join(', ')}. «рецепт» — решение, предложенное тестером: симптом идёт в сводку теста,
а сам рецепт — сюда (narrative-testing:P-05).

  --list            банк по всем историям (или одной: --story); старые записи пунктом
                    «- идея. Не взято: … Когда вернуться: …» тоже читаются
  --kind, --query   отбор по виду и по слову в идее, причине и условии
  --open            только «в банке», без взятых
  --take I-NN       отметить, что идею взяли: --into <история>, --decision <D-NN в той истории>
  --dir <папка>     где лежит состояние (по умолчанию ${STATE_DIR})
  --dry-run, --json как обычно

Без --why или --when парковка не пишется: идея без причины и условия возврата в банке мёртвая.`;

/** Записи ideas.md: заголовки I-NN с полями и пункты старого вида «- текст. Не взято: … Когда вернуться: …». */
function parseIdeas(text, story) {
  const lines = text.split('\n');
  const out = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const h = l.match(/^#{2,4}\s*(I-\d+)\s*·\s*(.*)$/);
    if (h) {
      const parts = h[2].split(/\s+·\s+/);
      const date = /^\d{4}-\d{2}-\d{2}$/.test(parts[0]) ? parts.shift() : null;
      const rest = parts.join(' · ');
      const m = rest.match(/^([^—]+?)\s+—\s+(.*)$/);
      cur = { story, id: h[1], date, kind: m ? m[1].trim() : null, text: m ? m[2].trim() : rest, why: null, when: null, from: null, state: 'в банке', line: i + 1 };
      out.push(cur);
      continue;
    }
    if (/^#{1,4}\s/.test(l)) { cur = null; continue; }
    const f = l.match(/^\s*[-*]\s+(не взято|почему|когда вернуться|откуда|статус|кто):\s*(.*)$/i);
    if (cur && f) {
      const key = { 'не взято': 'why', 'почему': 'why', 'когда вернуться': 'when', 'откуда': 'from', 'статус': 'state', 'кто': 'who' }[f[1].toLowerCase()];
      cur[key] = f[2].trim();
      continue;
    }
    const b = l.match(/^\s*[-*]\s+(.+)$/);
    if (b && !cur) {
      const t = b[1];
      const why = t.match(/Не взято:\s*(.*?)(?=\s*Когда вернуться:|$)/i)?.[1]?.replace(/\.$/, '') ?? null;
      const when = t.match(/Когда вернуться:\s*(.*)$/i)?.[1]?.replace(/\.$/, '') ?? null;
      const head = t.split(/\s*Не взято:/i)[0].replace(/\.$/, '');
      out.push({ story, id: null, date: null, kind: null, text: head, why, when, from: null, state: 'в банке', line: i + 1 });
    }
  }
  return out;
}

function allIdeas(dir, only) {
  if (!existsSync(dir)) return [];
  const ids = readdirSync(dir).filter((d) => !d.startsWith('.') && !d.startsWith('_') && statSync(join(dir, d)).isDirectory()).sort();
  return ids.filter((id) => !only || id === only).flatMap((id) => {
    const f = join(dir, id, 'ideas.md');
    return existsSync(f) ? parseIdeas(readFileSync(f, 'utf8'), id) : [];
  });
}

const isOpen = (x) => !/^взят/i.test(x.state ?? '');

runCli(HELP, async (args) => {
  const dir = args.get('dir', STATE_DIR);
  const json = args.has('json');
  const id = args.get('story');

  if (args.has('list')) {
    const q = args.get('query');
    const kind = args.get('kind');
    let list = allIdeas(dir, id);
    if (kind) list = list.filter((x) => x.kind === kind);
    if (q) list = list.filter((x) => [x.text, x.why, x.when, x.from].join(' ').toLowerCase().includes(String(q).toLowerCase()));
    if (args.has('open')) list = list.filter(isOpen);
    const dead = list.filter((x) => !x.why || !x.when);
    if (json) { console.log(JSON.stringify({ dir, total: list.length, open: list.filter(isOpen).length, incomplete: dead.length, ideas: list }, null, 1)); return 0; }
    if (!list.length) { console.log(`Банк идей пуст${id ? ` у ${id}` : ''}${q ? ` по «${q}»` : ''} (${dir}/*/ideas.md).`); return 0; }
    console.log(`Банк идей: ${list.length}, в банке ${list.filter(isOpen).length}${dead.length ? `, без причины или условия возврата ${dead.length}` : ''}\n`);
    console.log(table(list.map((x) => [x.story, x.id ?? '—', x.kind ?? '—', x.text.slice(0, 60), (x.when ?? '⚠ нет').slice(0, 40), isOpen(x) ? 'в банке' : x.state]),
      ['история', 'ID', 'вид', 'идея', 'когда вернуться', 'статус']));
    return 0;
  }

  const sdir = stateDir(id, dir);
  const file = join(sdir, 'ideas.md');
  const text = existsSync(file) ? readFileSync(file, 'utf8') : `# Идеи · ${id}\n`;

  if (args.has('take')) {
    const num = args.get('take');
    const into = args.get('into');
    if (!into || into === true) throw new Error('--take: нужно --into <история>, куда взяли идею');
    const lines = text.split('\n');
    const at = lines.findIndex((l) => new RegExp(`^#{2,4}\\s*${num}\\b`).test(l));
    if (at < 0) throw new Error(`в ${file} нет ${num}`);
    let end = lines.findIndex((l, i) => i > at && /^#{1,4}\s/.test(l));
    if (end < 0) end = lines.length;
    const mark = `- статус: взято: ${into}${args.get('decision') ? ` ${args.get('decision')}` : ''} · ${today()}`;
    const si = lines.slice(at, end).findIndex((l) => /^\s*[-*]\s+статус:/i.test(l));
    if (si >= 0) lines[at + si] = mark;
    else { let ins = end; while (ins > at + 1 && !lines[ins - 1].trim()) ins--; lines.splice(ins, 0, mark); }
    if (!args.has('dry-run')) writeFileSync(file, lines.join('\n'));
    console.log(json ? JSON.stringify({ file, id: num, state: mark.slice(10) }) : `${file}: ${num} ${mark.slice(2)}`);
    return 0;
  }

  const kind = args.get('kind');
  const idea = args.get('text');
  const why = args.get('why');
  const when = args.get('when');
  if (!IDEA_KINDS.includes(kind)) throw new Error(`--kind: одно из ${IDEA_KINDS.join(', ')}`);
  if (!idea || idea === true) throw new Error('нужно --text: сама идея одной-двумя фразами');
  if (!why || why === true || !when || when === true) throw new Error('нужны --why (почему не взяли) и --when (когда вернуться): без них идея в банке мёртвая');
  const num = nextId('I', text);
  const lines = [`## ${num} · ${args.get('date', today())} · ${kind} — ${idea}`, '', `- не взято: ${why}`, `- когда вернуться: ${when}`];
  if (args.get('from')) lines.push(`- откуда: ${args.get('from')}`);
  if (args.get('who')) lines.push(`- кто: ${args.get('who')}`);
  lines.push('- статус: в банке');
  const entry = lines.join('\n');
  if (!args.has('dry-run')) writeFileSync(file, `${text.replace(/\s+$/, '')}\n\n${entry}\n`);
  if (json) console.log(JSON.stringify({ file, id: num, kind, text: idea, why, when, from: args.get('from', null), written: !args.has('dry-run') }, null, 1));
  else console.log(`${args.has('dry-run') ? 'будет записано' : 'записано'} в ${file}:\n\n${entry}`);
  return 0;
}, { bool: ['list', 'open', 'dry-run'] });
