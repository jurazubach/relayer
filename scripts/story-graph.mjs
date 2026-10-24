// Карта сюжета: разбирает ink каждой истории и собирает один HTML с графом узлов,
// репликами и выборами — куда ведёт каждая кнопка. Для автора, не для игрока: спойлеры целиком.
// Запуск: npm run graph [-- путь/к/истории.json] [-- --open] → graph/index.html
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { Compiler, CompilerOptions, Story } from 'inkjs/full';

const RUNS = 400;
const OUT = 'graph/index.html';

const args = process.argv.slice(2);
const paths = args.filter((a) => !a.startsWith('--'));
const files = paths.length
  ? paths
  : readdirSync('src/stories')
      .filter((f) => f.endsWith('.json'))
      .map((f) => join('src/stories', f));

/** Теги строки: «текст #a:1 #b» → текст и {a: '1', b: ''}. Решётка внутри фигурных скобок — не тег. */
function splitTags(line) {
  let depth = 0;
  let cut = -1;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (ch === '#' && depth === 0) { cut = i; break; }
  }
  if (cut < 0) return { text: line.trim(), tags: {} };
  const tags = {};
  for (const part of line.slice(cut + 1).split('#')) {
    const t = part.trim();
    if (!t) continue;
    const i = t.indexOf(':');
    if (i < 0) tags[t] = '';
    else tags[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return { text: line.slice(0, cut).trim(), tags };
}

/** Переходы в строке: обычные, туннели (-> x ->) и возврат из туннеля (->->). */
function findDiverts(text) {
  const out = [];
  // цепочка туннелей «-> a -> b -> c»: стрелку после цели не съедаем, она начинает следующий переход
  const re = /->\s*->|->\s*([\w.]+)(?=(\s*->)?)/g;
  let m;
  while ((m = re.exec(text))) {
    if (!m[1]) out.push({ target: '->->', kind: 'return' });
    else out.push({ target: m[1], kind: m[2] ? 'tunnel' : 'divert' });
  }
  return { diverts: out, rest: text.replace(re, '').trim() };
}

/** Разбор исходника в дерево: узлы (knot / stitch) → элементы с вложенными выборами и условиями. */
function parseInk(src) {
  // комментарии: блочные целиком, строчные — если перед // не двоеточие (ссылки не трогаем)
  src = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const lines = src.split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1'));

  const contacts = {};
  const header = [];
  const knots = [];
  let start = null;
  let knot = null;
  let stack = null; // контейнеры: root | choice | cond | branch
  let speaker = null; // кто пишет — переносится по ходу текста, как #from в движке
  let chapter = 0;
  let sections = false; // после первого === шапка закончилась
  const chapters = [];

  const top = () => stack[stack.length - 1];
  const push = (item) => top().items.push(item);

  const openKnot = (id, kind) => {
    knot = { id, kind, chapter, items: [], line: 0 };
    knots.push(knot);
    stack = [{ type: 'root', items: knot.items, speaker }];
  };

  for (let n = 0; n < lines.length; n++) {
    const raw = lines[n];
    const line = raw.trim();
    if (!line) continue;

    let m;
    if ((m = line.match(/^={2,}\s*(function\s+)?(\w+)/))) {
      sections = true;
      if (m[1]) { knot = null; stack = null; continue; } // функции в граф не попадают
      openKnot(m[2], 'knot');
      knot.line = n + 1;
      continue;
    }
    if ((m = line.match(/^=\s*(\w+)/)) && knot) {
      const parent = knots.filter((k) => k.kind === 'knot').at(-1);
      openKnot(`${parent.id}.${m[1]}`, 'stitch');
      knot.line = n + 1;
      continue;
    }

    if (!knot) {
      if (!sections) {
        if ((m = line.match(/^#\s*contact:\s*(\w+)\s*,\s*([^,]+?)\s*(?:,\s*(\w+))?$/))) contacts[m[1]] = { name: m[2], color: m[3] ?? 'grey' };
        else if ((m = line.match(/^->\s*(\w+)/))) start = m[1];
        else if (line.startsWith('#')) header.push(line.slice(1).trim());
      }
      continue;
    }

    const cur = top();
    // закрывающая скобка многострочного условия
    if (line === '}') {
      while (stack.length > 1 && top().type !== 'cond') stack.pop();
      if (top().type === 'cond') stack.pop();
      continue;
    }
    // ветка условия: «- cond:» внутри открытого { … }
    const inCond = stack.some((s) => s.type === 'cond');
    if (inCond && (m = line.match(/^-\s*(.+?):\s*(.*)$/)) && !/^-\s*>/.test(line) && !m[1].includes('#')) {
      while (top().type !== 'cond') stack.pop();
      const branch = { type: 'branch', cond: m[1].trim(), items: [], speaker: top().speaker };
      top().branches.push(branch);
      stack.push(branch);
      if (m[2]) handleText(m[2], n);
      continue;
    }
    // начало многострочного условия: «{» или «{cond:» без закрывающей скобки на строке
    if ((m = line.match(/^\{([^}]*)$/))) {
      const head = m[1].trim().replace(/:$/, '').trim();
      const cond = { type: 'cond', head, branches: [], items: null, speaker: cur.speaker };
      push(cond);
      stack.push(cond);
      // «{flag:» — первая ветка сразу открыта, её условие — сам заголовок;
      // «{ var:» со строками «- "x":» ниже — это switch, ветки придут сами
      const next = lines.slice(n + 1).find((l) => l.trim());
      const isSwitch = /^\s*-\s*[^>].*:/.test(next ?? '');
      if (m[1].trim().endsWith(':') && !isSwitch) {
        const branch = { type: 'branch', cond: head, items: [], speaker: cur.speaker };
        cond.head = '';
        cond.branches.push(branch);
        stack.push(branch);
      }
      continue;
    }
    // выбор: * / ** / + (глубина — число маркеров)
    if ((m = line.match(/^((?:[*+]\s*)+)(.*)$/))) {
      const depth = (m[1].match(/[*+]/g) || []).length;
      while (top().type === 'choice' && top().depth >= depth) stack.pop();
      let body = m[2].trim();
      let label = null;
      const conds = [];
      if ((m = body.match(/^\((\w+)\)\s*/))) { label = m[1]; body = body.slice(m[0].length); }
      while ((m = body.match(/^\{([^}]*)\}\s*/))) { conds.push(m[1].trim()); body = body.slice(m[0].length); }
      // [видно на кнопке]после — текст кнопки в скобках, после скобки — то, что выводится
      const bm = body.match(/^(.*?)\[(.*?)\](.*)$/);
      const buttonRaw = bm ? bm[1] + bm[2] : body;
      const afterRaw = bm ? bm[1] + bm[3] : '';
      const { text: buttonText, tags } = splitTags(buttonRaw);
      const { diverts, rest } = findDiverts(afterRaw);
      const parent = top();
      const choice = {
        type: 'choice', depth, label, conds, text: buttonText, tags,
        sticky: line.trimStart().startsWith('+'), items: [], line: n + 1, speaker: parent.speaker,
      };
      parent.items.push(choice);
      stack.push(choice);
      if (rest) handleText(rest, n);
      for (const d of diverts) push({ type: 'divert', ...d });
      continue;
    }
    // сборка: - / - - (но не «->»)
    if ((m = line.match(/^((?:-(?!>)\s*)+)(.*)$/))) {
      const depth = (m[1].match(/-/g) || []).length;
      while (top().type === 'choice' && top().depth >= depth) stack.pop();
      let rest = m[2].trim();
      let label = null;
      if ((m = rest.match(/^\((\w+)\)\s*/))) { label = m[1]; rest = rest.slice(m[0].length); }
      push({ type: 'gather', label });
      if (rest) handleText(rest, n);
      continue;
    }
    if (line.startsWith('~')) { push({ type: 'code', text: line.slice(1).trim() }); continue; }
    handleText(line, n);
  }

  function handleText(line, n) {
    const { text: withDiverts, tags } = splitTags(line);
    const { diverts, rest } = findDiverts(withDiverts);
    const text = rest.replace(/<>/g, '').trim();
    const cur = top();
    if ('from' in tags) cur.speaker = tags.from || null;
    if ('chapter' in tags) {
      chapter++;
      chapters.push({ n: chapter, title: text, knot: knot.id });
      knot.chapter = chapter;
    }
    if (text || Object.keys(tags).length) {
      let who = cur.speaker;
      let kind = 'msg';
      if ('me' in tags) { kind = 'me'; who = tags.me; }
      else if ('sys' in tags) { kind = 'sys'; who = tags.sys || cur.speaker; }
      if (text) push({ type: kind, who, text, tags, line: n + 1 });
      else push({ type: 'tags', tags });
    }
    for (const d of diverts) push({ type: 'divert', ...d });
  }

  return { contacts, header, knots, start, chapters };
}

const condText = (head, cond) => (cond === 'else' ? 'иначе' : head ? `${head} == ${cond}` : cond);

/** Рёбра графа: каждый переход с цепочкой выборов и условий, через которую до него доходят. */
function collectEdges(knot, knotIds) {
  const edges = [];
  const resolve = (t) => {
    if (knotIds.has(t)) return t;
    const local = `${knot.id.split('.')[0]}.${t}`;
    if (knotIds.has(local)) return local;
    const head = t.split('.')[0];
    if (knotIds.has(head)) return head;
    return null;
  };
  const walk = (items, path) => {
    for (const it of items) {
      if (it.type === 'divert') {
        if (it.kind === 'return') continue;
        if (it.target === 'END' || it.target === 'DONE') { edges.push({ to: it.target, path, kind: 'end' }); continue; }
        const to = resolve(it.target);
        it.resolved = to;
        if (to && to !== knot.id) edges.push({ to, path, kind: it.kind });
      } else if (it.type === 'choice') {
        walk(it.items, [...path, { choice: it.text || it.tags.label || '…', conds: it.conds, label: it.tags.label }]);
      } else if (it.type === 'cond') {
        for (const b of it.branches) walk(b.items, [...path, { cond: condText(it.head, b.cond) }]);
      }
    }
  };
  walk(knot.items, []);
  return edges;
}

/** Сколько случайных прохождений заходят в каждый узел. */
function playtest(json, ids) {
  const visits = Object.fromEntries(ids.map((id) => [id, 0]));
  for (let run = 0; run < RUNS; run++) {
    const story = new Story(json);
    let steps = 0;
    while (steps < 3000) {
      while (story.canContinue) { story.Continue(); steps++; }
      const choices = story.currentChoices;
      if (!choices.length) break;
      story.ChooseChoiceIndex(choices[Math.floor(Math.random() * choices.length)].index);
    }
    for (const id of ids) if (story.state.VisitCountAtPathString(id) > 0) visits[id]++;
  }
  return Object.fromEntries(Object.entries(visits).map(([k, v]) => [k, Math.round((v / RUNS) * 1000) / 10]));
}

const stories = [];
for (const file of files) {
  const story = JSON.parse(readFileSync(file, 'utf8'));
  const compiler = new Compiler(story.ink, new CompilerOptions(null, [], true));
  let json;
  try {
    json = compiler.Compile().ToJson();
  } catch {
    console.error(`✗ ${file}: ошибка компиляции, карту не строю`);
    for (const e of compiler.errors) console.error('   ' + e);
    process.exitCode = 1;
    continue;
  }
  const parsed = parseInk(story.ink);
  const ids = parsed.knots.map((k) => k.id);
  const knotIds = new Set(ids);
  const visits = playtest(json, ids);
  for (const k of parsed.knots) {
    k.edges = collectEdges(k, knotIds);
    k.visits = visits[k.id];
  }
  stories.push({
    id: story.id,
    title: story.title,
    series: story.series ?? '',
    characters: story.characters ?? [],
    contacts: parsed.contacts,
    start: parsed.start,
    chapters: parsed.chapters,
    chapterMeta: story.chapters ?? [],
    knots: parsed.knots,
  });
  const edgeCount = parsed.knots.reduce((s, k) => s + k.edges.length, 0);
  console.log(`✓ ${file}: узлов ${ids.length}, переходов ${edgeCount}, глав ${parsed.chapters.length}`);
}

const template = readFileSync(new URL('./story-graph.html', import.meta.url), 'utf8');
const data = JSON.stringify(stories).replace(/</g, '\\u003c');
mkdirSync('graph', { recursive: true });
writeFileSync(OUT, template.replace('/*__DATA__*/null', data));
console.log(`→ ${OUT}`);
if (args.includes('--open')) execFile(process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open', [OUT]);
