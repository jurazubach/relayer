// Разбор исходника ink в дерево — один на все инструменты (check:story, graph, story:*).
// Это не компилятор: inkjs проверяет синтаксис и исполняет, а здесь — структура, которую видит автор:
// узлы, выборы, условия, кто говорит, главы и разметка в комментариях.

/** Имя в ink: буквы любого алфавита, цифры, подчёркивание. */
const ID = '[\\p{L}\\p{N}_]+';
const ID_RE = new RegExp(`^${ID}$`, 'u');

/** Разметка в комментариях (план §9): шапка истории и метки у узлов. */
export const HEAD_KEYS = ['ставка', 'вопрос', 'оси', 'логлайн'];
export const MARK_KEYS = ['reveal', 'намеренно', 'финал'];
const MARK_RE = new RegExp(`^(${[...HEAD_KEYS, ...MARK_KEYS].join('|')})\\s*:\\s*(.*)$`, 'u');

/** Комментарий → метка или null. «// намеренно: C-12 причина» даёт id проверки и причину. */
export function parseMark(text) {
  const m = text.trim().match(MARK_RE);
  if (!m) return null;
  const mark = { kind: m[1], value: m[2].trim() };
  if (mark.kind === 'намеренно') {
    const [id, ...reason] = mark.value.split(/\s+/);
    mark.id = id || '';
    mark.reason = reason.join(' ');
  }
  return mark;
}

/**
 * Строки без комментариев и сами комментарии отдельно, с номерами строк.
 * Строчный // режем, только если перед ним не двоеточие: «https://…» в тексте реплики — не комментарий.
 * Блочные /* … *\/ номера строк не сдвигают.
 */
export function tokenize(src) {
  const lines = src.split('\n');
  const out = [];
  let block = null; // открытый /* … */: { text, line }
  for (let i = 0; i < lines.length; i++) {
    let rest = lines[i];
    let code = '';
    const comments = [];
    while (rest.length) {
      if (block) {
        const end = rest.indexOf('*/');
        if (end < 0) { block.text += (block.text ? '\n' : '') + rest; rest = ''; break; }
        block.text += (block.text ? '\n' : '') + rest.slice(0, end);
        comments.push({ type: 'comment', kind: 'block', text: block.text.trim(), line: block.line });
        block = null;
        rest = rest.slice(end + 2);
        continue;
      }
      const open = rest.indexOf('/*');
      const lc = rest.search(/(^|[^:])\/\//);
      const lineAt = lc < 0 ? -1 : rest[lc] === '/' ? lc : lc + 1;
      if (lineAt >= 0 && (open < 0 || lineAt < open)) {
        code += rest.slice(0, lineAt);
        comments.push({ type: 'comment', kind: 'line', text: rest.slice(lineAt + 2).trim(), line: i + 1 });
        rest = '';
      } else if (open >= 0) {
        code += rest.slice(0, open);
        block = { text: '', line: i + 1 };
        rest = rest.slice(open + 2);
      } else {
        code += rest;
        rest = '';
      }
    }
    for (const c of comments) {
      const mark = parseMark(c.text);
      if (mark) c.mark = mark;
    }
    out.push({ n: i + 1, code, comments });
  }
  if (block) out.at(-1).comments.push({ type: 'comment', kind: 'block', text: block.text.trim(), line: block.line, open: true });
  return out;
}

/** Теги строки: «текст #a:1 #b» → текст и {a: '1', b: ''}. Решётка внутри фигурных скобок — не тег. */
export function splitTags(line) {
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

/** Тег из рантайма inkjs («delay: 12m») → { key, value }. */
export function parseTag(tag) {
  const i = tag.indexOf(':');
  return i < 0 ? { key: tag.trim(), value: '' } : { key: tag.slice(0, i).trim(), value: tag.slice(i + 1).trim() };
}

/** #delay в секундах: «90», «12m», «1.5h». Непонятное значение — ноль, как в движке. */
export function parseDelay(v) {
  const m = String(v).trim().match(/^(\d+(?:\.\d+)?)\s*(s|m|h)?$/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  return n * (m[2] === 'h' ? 3600 : m[2] === 'm' ? 60 : 1);
}

const DIVERT_RE = new RegExp(`->\\s*->|->\\s*([\\p{L}\\p{N}_.]+)(?=(\\s*->)?)`, 'gu');

/** Переходы в строке: обычные, туннели (-> x ->) и возврат из туннеля (->->). */
export function findDiverts(text) {
  const out = [];
  // цепочка туннелей «-> a -> b -> c»: стрелку после цели не съедаем, она начинает следующий переход
  const re = new RegExp(DIVERT_RE.source, 'gu');
  let m;
  while ((m = re.exec(text))) {
    if (!m[1]) out.push({ target: '->->', kind: 'return' });
    else out.push({ target: m[1], kind: m[2] ? 'tunnel' : 'divert' });
  }
  return { diverts: out, rest: text.replace(re, '').trim() };
}

/**
 * Разбор одного или нескольких файлов ink в дерево.
 *
 * Узел — это knot или stitch (id «knot.stitch»). Функции ink (`=== function f ===`) узлами не считаются:
 * они лежат в `functions`. Это единственное определение узла — его берут все инструменты.
 *
 * Элементы узла: msg / me / sys / tags / code / gather / divert / choice (с items) / cond (с branches → items)
 * и comment. Комментарии не выбрасываются: метки `// финал:`, `// reveal:`, `// намеренно:` собираются
 * в `knot.marks`, шапка `// ставка:` … `// логлайн:` до первого узла — в `head`.
 * Комментарии над заголовком узла (до него нет кода) относятся к этому узлу: лежат в `knot.lead`.
 *
 * @param {string | {name: string, text: string}[]} input исходник или файлы в порядке INCLUDE (главный первым)
 */
export function parseInk(input) {
  const files = typeof input === 'string' ? [{ name: null, text: input }] : input;
  const res = {
    contacts: {}, header: [], head: {}, vars: [], includes: [], externals: [],
    knots: [], functions: [], start: null, chapters: [], comments: [],
  };
  let chapter = 0;
  let sections = false; // после первого === шапка закончилась
  for (const f of files) {
    const r = parseFile(f.text, f.name, res, { chapter, sections });
    chapter = r.chapter;
    sections = r.sections;
  }
  return res;
}

function parseFile(src, file, res, st) {
  const { contacts, header, knots, chapters } = res;
  const lines = tokenize(src);
  let knot = null;
  let stack = null; // контейнеры: root | choice | cond | branch
  let speaker = null; // кто пишет — переносится по ходу текста, как #from в движке
  let { chapter, sections } = st;
  let pending = []; // комментарии, ещё не знающие, к чему относятся

  const top = () => stack[stack.length - 1];
  const push = (item) => top().items.push(item);

  const addMark = (owner, c) => {
    if (!c.mark) return;
    const m = { ...c.mark, line: c.line, ...(file ? { file } : {}) };
    // шапка часто стоит прямо над первым === — она всё равно про историю, а не про этот узел
    if (HEAD_KEYS.includes(m.kind) && !knots.length && !res.functions.length) {
      if (!(m.kind in res.head)) res.head[m.kind] = m.value;
      return;
    }
    if (owner) {
      owner.marks.push(m);
      if (m.kind === 'финал' && owner.ending == null) owner.ending = m.value || owner.id;
    } else if (HEAD_KEYS.includes(m.kind) && !(m.kind in res.head)) res.head[m.kind] = m.value;
  };
  const note = (c) => { res.comments.push(file ? { ...c, file } : c); };
  // комментарии до кода внутри узла — его элементы; до шапки и между функциями — общие
  const flush = () => {
    for (const c of pending) {
      if (knot && stack) { push(c); addMark(knot, c); } else addMark(null, c);
    }
    pending = [];
  };

  const open = (id, kind, n) => {
    const node = { id, kind, chapter, items: [], line: n, marks: [], lead: pending };
    if (file) node.file = file;
    for (const c of pending) addMark(node, c);
    pending = [];
    if (kind === 'function') res.functions.push(node);
    else knots.push(node);
    knot = node;
    stack = [{ type: 'root', items: node.items, speaker }];
  };

  const knotRe = new RegExp(`^={2,}\\s*(function\\s+)?(${ID})\\s*(?:\\(([^)]*)\\))?`, 'u');
  const stitchRe = new RegExp(`^=\\s*(${ID})\\s*(?:\\(([^)]*)\\))?`, 'u');
  const declRe = /^(VAR|CONST|LIST)\s+([\p{L}\p{N}_]+)\s*=\s*(.*)$/u;

  for (let i = 0; i < lines.length; i++) {
    const { n, code, comments } = lines[i];
    const line = code.trim();
    for (const c of comments) note(c);
    if (!line) { pending.push(...comments); continue; }

    let m;
    if ((m = line.match(knotRe))) {
      sections = true;
      const params = m[3] ? m[3].split(',').map((p) => p.trim()).filter(Boolean) : [];
      open(m[2], m[1] ? 'function' : 'knot', n);
      if (params.length) knot.params = params;
      pending = [...comments];
      continue;
    }
    if ((m = line.match(stitchRe)) && knot && knot.kind !== 'function') {
      const parent = knots.filter((k) => k.kind === 'knot').at(-1);
      open(`${parent.id}.${m[1]}`, 'stitch', n);
      pending = [...comments];
      continue;
    }
    if ((m = line.match(declRe))) {
      flush();
      res.vars.push({ kind: m[1], name: m[2], value: m[3].trim(), line: n, ...(file ? { file } : {}) });
      pending = [...comments];
      continue;
    }
    if ((m = line.match(/^INCLUDE\s+(.+)$/))) { res.includes.push({ path: m[1].trim(), line: n, ...(file ? { file } : {}) }); pending.push(...comments); continue; }
    if ((m = line.match(/^EXTERNAL\s+(.+)$/))) { res.externals.push(m[1].trim()); pending.push(...comments); continue; }

    if (!knot) {
      flush();
      if (!sections) {
        if ((m = line.match(/^#\s*contact:\s*(\w+)\s*,\s*([^,]+?)\s*(?:,\s*(\w+))?$/))) contacts[m[1]] = { name: m[2], color: m[3] ?? 'grey' };
        else if ((m = line.match(/^->\s*(\w+)/))) res.start = m[1];
        else if (line.startsWith('#')) header.push(line.slice(1).trim());
      }
      pending = [...comments];
      continue;
    }

    flush();
    pending = [...comments];
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
      const next = lines.slice(i + 1).find((l) => l.code.trim())?.code;
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
        sticky: line.trimStart().startsWith('+'), items: [], line: n, speaker: parent.speaker,
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
  flush();

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
      if (text) push({ type: kind, who, text, tags, line: n });
      else push({ type: 'tags', tags });
    }
    for (const d of diverts) push({ type: 'divert', ...d });
  }

  return { chapter, sections };
}

/** Обход элементов узла вглубь: выборы, условия и ветки. fn(item, path), path — цепочка контейнеров. */
export function walk(items, fn, path = []) {
  for (const it of items) {
    fn(it, path);
    if (it.type === 'choice') walk(it.items, fn, [...path, it]);
    else if (it.type === 'cond') for (const b of it.branches) walk(b.items, fn, [...path, it, b]);
  }
}

/** Id всех узлов — то, что считают «узлом» check:story, карта и story:*. */
export const nodeIds = (tree) => tree.knots.map((k) => k.id);

/** Элементы без комментариев — та же форма, что видит игрок. Дерево не меняется. */
export function stripComments(items) {
  const out = [];
  for (const it of items) {
    if (it.type === 'comment') continue;
    if (it.type === 'choice') out.push({ ...it, items: stripComments(it.items) });
    else if (it.type === 'cond') out.push({ ...it, branches: it.branches.map((b) => ({ ...b, items: stripComments(b.items) })) });
    else out.push(it);
  }
  return out;
}

/** Цель перехода → id узла: полное имя, stitch внутри текущего knot или сам knot у «knot.метка». */
export function resolveTarget(target, fromId, ids) {
  if (ids.has(target)) return target;
  const local = `${fromId.split('.')[0]}.${target}`;
  if (ids.has(local)) return local;
  const head = target.split('.')[0];
  if (ids.has(head)) return head;
  return null;
}

/**
 * Финалы истории. Если в истории есть хоть одна метка `// финал: <имя>` — финалы только размеченные узлы
 * (у THE NUMBER одно END, а финалы различаются состоянием, поэтому по END их не посчитать).
 * Без меток — узлы, где встречается `-> END`.
 * @returns {{ source: 'mark' | 'end', endings: {id: string, name: string, line: number, file?: string}[], unmarked: string[] }}
 *   unmarked — узлы с `-> END` без метки, когда метки в истории уже есть
 */
export function findEndings(tree) {
  const hasEnd = (k) => {
    let found = false;
    walk(k.items, (it) => { if (it.type === 'divert' && it.target === 'END') found = true; });
    return found;
  };
  // каждая метка — свой финал: в одном узле их может быть несколько, по веткам состояния
  const marked = tree.knots.flatMap((k) => k.marks.filter((m) => m.kind === 'финал')
    .map((m) => ({ id: k.id, name: m.value || k.id, line: m.line, ...(k.file ? { file: k.file } : {}) })));
  if (marked.length) {
    return {
      source: 'mark',
      endings: marked,
      unmarked: tree.knots.filter((k) => k.ending == null && hasEnd(k)).map((k) => k.id),
    };
  }
  return {
    source: 'end',
    endings: tree.knots.filter(hasEnd).map((k) => ({ id: k.id, name: k.id, line: k.line, ...(k.file ? { file: k.file } : {}) })),
    unmarked: [],
  };
}

/** Все метки истории одним списком: { kind, value, line, knot }. */
export function allMarks(tree) {
  return tree.knots.flatMap((k) => k.marks.map((m) => ({ ...m, knot: k.id })));
}

export const isIdent = (s) => ID_RE.test(s);
