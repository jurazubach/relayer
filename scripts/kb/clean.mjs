// Очистка входа сборщиков: копия базы docs/books без строк про наши истории.
// Скиллы не должны учиться на трёх текущих историях (их перепишут), поэтому сборщики читают
// docs/books/_clean/, а вырезанное уходит в docs/lab/cases/ — кейсы для экспериментов.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStories, buildMatcher } from './story-terms.mjs';

const HELP = `Очистка базы знаний от упоминаний наших историй.

  npm run kb:clean                     собрать docs/books/_clean/<алиас>/ и docs/lab/cases/<история>.md
  node scripts/kb/clean.mjs --verify   проверить, что в _clean не осталось упоминаний и она не устарела

Флаги:
  --verify      только проверка, ничего не пишет; код выхода 1, если что-то не так
  --json        вывод в JSON (статистика или результат проверки)
  --quiet       без таблицы, только итог
  --help        эта справка

Что считается упоминанием: алиасы и названия историй, имена героев и контактов
(characters и # contact:), имена узлов и переменных из ink. Словарь — scripts/kb/story-terms.mjs.`;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BOOKS = join(ROOT, 'docs/books');
const CLEAN = join(BOOKS, '_clean');
const CASES = join(ROOT, 'docs/lab/cases');
const SHARED = '_shared';

const MARK_SECTION = '> Раздел про наши истории вынесен в `docs/lab/cases/`: это кейсы для экспериментов, а не правила.';
const MARK_ITEM = '> Пункт целиком про наши истории: вынесен в `docs/lab/cases/` как кейс для экспериментов.';
const MARK_INLINE = 'вынесено: пункт про наши истории';

const ID_TOKEN = /[A-Z]{1,8}-\d+[a-z]?/;
const ID_LEAD = /^[\s*_`]*([A-Z]{1,8}-\d+[a-z]?(?:\s*[,–-]\s*[A-Z]{1,8}-\d+[a-z]?)*)/;
const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const FENCE_RE = /^\s*(```+|~~~+)/;
const ID_LABEL_RE = /^(?:\*\*)?`?[A-Z]{1,8}-\d+[a-z]?`?(?:\s*[,–-]\s*`?[A-Z]{1,8}-\d+[a-z]?`?)*(?:\*\*)?[.:]?\s+/;
const LABEL_RE = /^(\*\*[^*]+?\*\*:?\s*|\*[^*\s][^*]*?\*:?\s*|_[^_\s][^_]*?_:?\s*)/;
const EXAMPLE_RE = /^[*_]*\s*(?:Пример|Примеры|Например|Образец|Как у нас|У нас|В наших истори)/i;
const OUR_STORIES_RE = /наш\p{L}*\s+истори/iu;
// Предложение, которое продолжает вырезанное: без него оно теряет смысл.
const ANAPHORA_RE =
  /^[«"(*_]*(?:Это|Эт[аоиу]|Там|Здесь|Тут|Отсюда|Поэтому|Так|Он|Она|Оно|Они|Его|Её|Ее|Их|Ему|Ей|Им|Тогда|Значит|Следом|Дальше|Затем|Причём|При этом|Но|А|И|Зато|Однако|Ещё|Там же)(?![\p{L}])/u;
const ABBR = new Set(['см', 'гл', 'т', 'е', 'др', 'ср', 'напр', 'стр', 'ч', 'мин', 'рис', 'табл', 'им', 'г', 'тыс', 'млн', 'п', 'с', 'пр', 'вып']);

/** Делит текст на предложения, не разрывая «см.», «гл.», «т. е.». */
export function splitSentences(text) {
  const out = [];
  let start = 0;
  for (const m of text.matchAll(/(?<=[.!?…][»")*_]*)\s+(?=[«"„(*_`\p{Lu}])/gu)) {
    const before = text.slice(start, m.index);
    const word = before.match(/(\p{L}+)[.!?…][»")*_]*$/u)?.[1];
    if (word && ABBR.has(word.toLowerCase())) continue;
    out.push(before);
    start = m.index + m[0].length;
  }
  out.push(text.slice(start));
  return out.filter((s) => s.trim());
}

/** Делит строку таблицы на ячейки; `|` внутри кода и `\|` ячейку не закрывают. */
export function splitRow(line) {
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells = [];
  let cur = '';
  let code = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '`') code = !code;
    if (ch === '|' && !code && body[i - 1] !== '\\') {
      cells.push(cur);
      cur = '';
    } else cur += ch;
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

const hasLetters = (s) => /\p{L}/u.test(s);
const isLabelOnly = (text) => !hasLetters(text.replace(LIST_RE, '').replace(/^\s*>\s*/, '').replace(LABEL_RE, ''));

export function createCleaner(matcher) {
  const has = (s) => matcher.has(s);

  /**
   * Чистит одну единицу текста (строку, пункт списка, ячейку).
   * same — упоминаний нет; trimmed — вырезаны предложения или скобки; removed — единица целиком про историю.
   */
  function cleanText(text, { example = false } = {}) {
    const hits = matcher.find(text);
    if (!hits.length) return { status: 'same', text, hits };
    const removed = { status: 'removed', text: null, hits };
    if (example) return removed;
    const prefix = text.match(/^(\s*(?:(?:[-*+]|\d+[.)])\s+|>\s*)*)/)[1];
    let rest = text.slice(prefix.length);
    // Номер пункта в начале («`P-09`:», «**RED-05.**») держим как метку: иначе он уйдёт вместе с предложением.
    const idLabel = rest.match(ID_LABEL_RE)?.[0] ?? '';
    rest = rest.slice(idLabel.length);
    const label = idLabel + (rest.match(LABEL_RE)?.[1] ?? '');
    rest = rest.slice(label.length - idLabel.length);
    if (label && (has(label) || EXAMPLE_RE.test(label))) return removed;

    rest = rest.replace(/\s*\([^()]*\)/g, (p) => (has(p) ? '' : p));
    const sentences = splitSentences(rest);
    // У поля с меткой («*Общество.* …») первое предложение задаёт тему; если оно про историю, остальное тоже.
    if (label && sentences.length && has(sentences[0])) return removed;
    const kept = [];
    let dropping = false;
    for (const s of sentences) {
      if (has(s)) dropping = true;
      else if (dropping && ANAPHORA_RE.test(s.trim())) continue;
      else {
        dropping = false;
        kept.push(s.trim());
      }
    }
    const body = kept.join(' ').trim();
    if (!hasLetters(body) || has(body)) return removed;
    return { status: 'trimmed', text: prefix + label + body, hits };
  }

  return { cleanText };
}

/** Какие пункты (P-, PAT-, RED-, LESSON- и т. п.) объявлены в файле: заголовки, первые ячейки, начала пунктов списка. */
export function declaredIds(text) {
  const ids = [];
  let fence = false;
  for (const line of text.split('\n')) {
    if (FENCE_RE.test(line)) fence = !fence;
    if (fence) continue;
    const h = line.match(HEADING_RE);
    if (h) {
      const id = h[2].match(ID_LEAD);
      if (id) ids.push(id[1]);
    } else if (/^\s*\|/.test(line)) {
      const id = splitRow(line)[0].match(ID_LEAD);
      if (id && !/[:-]{3}/.test(line)) ids.push(id[1]);
    } else if (LIST_RE.test(line)) {
      const id = line.replace(LIST_RE, '').match(ID_LEAD);
      if (id && /^[*_`]/.test(line.replace(LIST_RE, ''))) ids.push(id[1]);
    }
  }
  return ids.sort();
}

/**
 * Чистит один файл разбора. Возвращает очищенный текст и записи о вынесенном:
 * { section, stories, kind: 'section' | 'item' | 'removed' | 'trimmed', lines, cut? }.
 */
export function cleanFile(text, matcher) {
  const { cleanText } = createCleaner(matcher);
  const lines = text.split('\n');
  const out = lines.slice();
  const records = [];

  // Код-блоки и заголовки вне кода.
  const fenceEnd = new Map();
  const inFence = new Array(lines.length).fill(false);
  for (let i = 0; i < lines.length; i++) {
    if (!FENCE_RE.test(lines[i])) continue;
    let j = i + 1;
    while (j < lines.length && !FENCE_RE.test(lines[j])) j++;
    fenceEnd.set(i, Math.min(j, lines.length - 1));
    for (let k = i; k <= j && k < lines.length; k++) inFence[k] = true;
    i = j;
  }
  const headings = [];
  for (let i = 0; i < lines.length; i++) {
    const h = !inFence[i] && lines[i].match(HEADING_RE);
    if (h) headings.push({ i, level: h[1].length, text: h[2].trim(), id: h[2].match(ID_LEAD)?.[1] ?? null });
  }
  const sectionEnd = (k) => {
    const h = headings[k];
    const next = headings.slice(k + 1).find((x) => x.level <= h.level);
    return next ? next.i : lines.length;
  };
  const storiesOf = (s) => matcher.resolve(matcher.find(s));

  // Контекст для неоднозначных узлов вроде `ch1_hub`: истории, названные в заголовках над строкой.
  const headingAt = new Array(lines.length);
  {
    const path = [];
    let hk = 0;
    for (let i = 0; i < lines.length; i++) {
      if (hk < headings.length && headings[hk].i === i) {
        const h = headings[hk++];
        while (path.length && path.at(-1).level >= h.level) path.pop();
        path.push(h);
      }
      headingAt[i] = path.slice();
    }
  }
  const sectionName = (i) => headingAt[i].at(-1)?.text.replace(/\*\*/g, '') ?? '(начало файла)';
  const contextAt = (i) => [...new Set(headingAt[i].flatMap((h) => storiesOf(h.text)))];

  // 1. Разделы целиком про наши истории: «Разбор наших историй», «Ретро-разметка: …» и т. п.
  const moved = new Array(lines.length).fill(false);
  for (let k = 0; k < headings.length; k++) {
    const h = headings[k];
    if (h.id || h.level < 2 || moved[h.i]) continue;
    if (!matcher.has(h.text) && !OUR_STORIES_RE.test(h.text)) continue;
    const end = sectionEnd(k);
    if (headings.some((x) => x.i > h.i && x.i < end && x.id)) continue; // пункты внутри не теряем
    for (let i = h.i; i < end; i++) moved[i] = true;
    const num = h.text.match(/^(\d+\.\s*)/)?.[1] ?? '';
    const title = matcher.has(h.text) ? `${num}Разбор наших историй` : h.text;
    let tail = end;
    while (tail > h.i + 1 && !lines[tail - 1].trim()) tail--;
    out[h.i] = `${'#'.repeat(h.level)} ${title}\n\n${MARK_SECTION}` + (tail < end ? '' : '\n');
    for (let i = h.i + 1; i < tail; i++) out[i] = null;
    records.push(...splitSection(lines.slice(h.i, tail), h, matcher));
  }

  // 2. Остальное — построчно, с учётом списков, таблиц и кода.
  let idScope = null; // { start, end, heading, records, hadBody }
  const stack = []; // пункты списка: { indent, removed, record, idx, children, removedChildren, firstChildRecord }
  let last = []; // истории последней вынесенной строки: продолжение раздела обычно про ту же историю

  const sink = () => (idScope ? idScope.records : records);
  const addRecord = (i, kind, hits, srcLines, extra = {}) => {
    const stories = matcher.resolve(hits, [...contextAt(i), ...last]);
    last = stories;
    const r = { section: sectionName(i), stories, kind, lines: srcLines, ...extra };
    sink().push(r);
    return r;
  };
  // Код, таблица или строка внутри сохранённого пункта списка — тоже его содержимое.
  const childOf = (indent, record) => {
    const top = stack.at(-1);
    if (!top || indent <= top.indent) return;
    top.children++;
    if (record) {
      top.removedChildren++;
      top.firstChildRecord ??= record;
    }
  };
  const popTo = (indent) => {
    while (stack.length && stack.at(-1).indent >= indent) {
      const e = stack.pop();
      const parent = stack.at(-1);
      if (parent) {
        parent.children++;
        if (e.removed) parent.removedChildren++;
        if (e.removed && !parent.firstChildRecord) parent.firstChildRecord = e.record;
      }
      // «- **Пример:**», у которого вырезаны все подпункты, сам ничего не говорит.
      if (!e.removed && e.children && e.children === e.removedChildren && isLabelOnly(out[e.idx] ?? '')) {
        e.firstChildRecord.lines.unshift(lines[e.idx]);
        out[e.idx] = null;
        if (parent) parent.removedChildren++;
      }
    }
  };
  const closeIdScope = () => {
    if (!idScope) return;
    popTo(0);
    const s = idScope;
    idScope = null;
    const bodyLeft = out.slice(s.start + 1, s.end).some((l) => l !== null && l.trim());
    const headHit = matcher.has(s.heading.text);
    if (headHit || (s.hadBody && !bodyLeft)) {
      const hits = matcher.find(lines.slice(s.start, s.end).join('\n'));
      let tail = s.end;
      while (tail > s.start + 1 && !lines[tail - 1].trim()) tail--;
      const title = headHit ? `${s.heading.id}. Пункт про наши истории` : s.heading.text;
      out[s.start] = `${'#'.repeat(s.heading.level)} ${title}\n\n${MARK_ITEM}`;
      for (let i = s.start + 1; i < tail; i++) out[i] = null;
      addRecord(s.start, 'item', hits, lines.slice(s.start, tail));
    } else records.push(...s.records);
  };

  let hk = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (idScope && i >= idScope.end) closeIdScope();
    if (moved[i]) {
      while (hk < headings.length && headings[hk].i <= i) hk++;
      continue;
    }

    if (fenceEnd.has(i)) {
      const end = fenceEnd.get(i);
      const block = lines.slice(i, end + 1);
      const indent = line.match(/^\s*/)[0].length;
      const top = stack.at(-1);
      if (top && indent > top.indent && top.removed) {
        top.record.lines.push(...block);
        for (let k = i; k <= end; k++) out[k] = null;
      } else {
        if (!top || indent <= top.indent) popTo(indent);
        const hits = matcher.find(block.join('\n'), { code: true });
        let rec = null;
        if (hits.length) {
          for (let k = i; k <= end; k++) out[k] = null;
          rec = addRecord(i, 'removed', hits, block);
        }
        childOf(indent, rec);
      }
      if (idScope) idScope.hadBody = true;
      i = end;
      continue;
    }

    if (hk < headings.length && headings[hk].i === i) {
      const h = headings[hk];
      const k = hk++;
      popTo(0);
      if (h.id) {
        closeIdScope();
        idScope = { start: i, end: sectionEnd(k), heading: h, records: [], hadBody: false };
        continue;
      }
      const res = cleanText(h.text);
      if (res.status !== 'same') {
        out[i] = `${'#'.repeat(h.level)} ${res.text ?? 'Без названия: вынесено'}`;
        addRecord(i, 'trimmed', res.hits, [line]);
      }
      continue;
    }

    if (!line.trim()) continue;
    if (idScope) idScope.hadBody = true;
    const indent = line.match(/^\s*/)[0].length;

    if (/^\s*\|/.test(line)) {
      let end = i;
      while (end + 1 < lines.length && /^\s*\|/.test(lines[end + 1])) end++;
      const top = stack.at(-1);
      if (top && indent > top.indent && top.removed) {
        top.record.lines.push(...lines.slice(i, end + 1));
        for (let k = i; k <= end; k++) out[k] = null;
      } else {
        if (!top || indent <= top.indent) popTo(indent);
        cleanTable(i, end);
      }
      i = end;
      continue;
    }

    const lm = line.match(LIST_RE);
    if (lm) {
      popTo(indent);
      const parent = stack.at(-1);
      if (parent?.removed) {
        parent.record.lines.push(line);
        out[i] = null;
        stack.push({ indent, removed: true, record: parent.record, idx: i, children: 0, removedChildren: 0 });
        continue;
      }
      const after = line.slice(lm[0].length);
      const isId = /^[*_`]/.test(after) && ID_LEAD.test(after);
      const res = cleanText(line, { example: EXAMPLE_RE.test(after) });
      const entry = { indent, removed: false, record: null, idx: i, children: 0, removedChildren: 0 };
      if (res.status === 'removed') {
        if (isId) {
          out[i] = `${lm[0]}**${after.match(ID_LEAD)[1]}.** ${MARK_INLINE}.`;
          entry.record = addRecord(i, 'item', res.hits, [line]);
        } else {
          out[i] = null;
          entry.record = addRecord(i, 'removed', res.hits, [line]);
        }
        entry.removed = true;
      } else if (res.status === 'trimmed') {
        out[i] = res.text;
        addRecord(i, 'trimmed', res.hits, [line]);
      }
      stack.push(entry);
      continue;
    }

    // Продолжение пункта списка или обычный абзац.
    const top = stack.at(-1);
    if (top && indent > top.indent) {
      if (top.removed) {
        top.record.lines.push(line);
        out[i] = null;
        continue;
      }
    } else popTo(0);
    const res = cleanText(line, { example: EXAMPLE_RE.test(line.trim().replace(/^>\s*/, '')) });
    if (res.status === 'removed') {
      out[i] = null;
      childOf(indent, addRecord(i, 'removed', res.hits, [line]));
    } else {
      childOf(indent, null);
    }
    if (res.status === 'trimmed') {
      out[i] = res.text;
      addRecord(i, 'trimmed', res.hits, [line]);
    }
  }
  popTo(0);
  closeIdScope();

  function cleanTable(a, b) {
    const rows = lines.slice(a, b + 1);
    const isSep = (l) => /^\s*\|[\s:|-]+\|?\s*$/.test(l);
    const header = isSep(rows[1] ?? '') ? splitRow(rows[0]) : [];
    const exampleCol = header.map((h) => /пример/i.test(h));
    for (let r = 0; r < rows.length; r++) {
      const i = a + r;
      const row = rows[r];
      if (isSep(row) || !matcher.has(row)) continue;
      const cells = splitRow(row);
      const isHeader = r === 0 && header.length > 0;
      const isId = !isHeader && ID_LEAD.test(cells[0]) && ID_TOKEN.test(cells[0]);
      const res = cells.map((c, k) => cleanText(c, { example: exampleCol[k] && !isHeader }));
      const lost = res.map((x) => x.status === 'removed');
      const hits = res.flatMap((x) => x.hits);
      const indent = row.match(/^\s*/)[0];
      const build = (cs) => `${indent}| ${cs.join(' | ')} |`;
      if (isHeader) {
        out[i] = build(res.map((x) => x.text ?? '—'));
        addRecord(i, 'trimmed', hits, [row]);
      } else if (isId && (lost[0] || lost[1])) {
        out[i] = build([cells[0].match(ID_LEAD)[1], MARK_INLINE, ...cells.slice(2).map(() => '—')]);
        addRecord(i, 'item', hits, [row]);
      } else if (isId || !lost.some(Boolean)) {
        out[i] = build(res.map((x) => x.text ?? '—'));
        addRecord(i, 'trimmed', hits, [row]);
      } else {
        out[i] = null;
        addRecord(i, 'removed', hits, [row]);
      }
    }
  }

  const cleaned = out
    .filter((l) => l !== null)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
  return { text: cleaned, records };
}

/** Делит вынесенный раздел на куски по историям: подзаголовок или абзац с названием открывает кусок. */
function splitSection(sectionLines, heading, matcher) {
  const blocks = [];
  let cur = [];
  let fence = false;
  for (const l of sectionLines.slice(1)) {
    if (FENCE_RE.test(l)) fence = !fence;
    const top = !fence && (HEADING_RE.test(l) || /^(?:[-*+]|\d+[.)])\s|^\*\*/.test(l) || !l.trim());
    if (top && cur.some((x) => x.trim())) {
      blocks.push(cur);
      cur = [];
    }
    cur.push(l);
  }
  if (cur.some((x) => x.trim())) blocks.push(cur);

  const headStories = matcher.resolve(matcher.find(heading.text));
  let sticky = headStories;
  const tagged = blocks.map((b) => {
    const hits = matcher.find(b.join('\n'));
    const own = hits.length ? matcher.resolve(hits, sticky) : null;
    if (own) sticky = own;
    return { lines: b, stories: own };
  });
  // Вводный абзац до первой истории относится к той, что идёт следом.
  let next = null;
  for (let k = tagged.length - 1; k >= 0; k--) {
    if (tagged[k].stories) next = tagged[k].stories;
    else if (!headStories.length && next && !tagged.slice(0, k).some((t) => t.stories)) tagged[k].stories = next;
  }
  sticky = headStories.length ? headStories : [SHARED];
  const recs = [];
  for (const t of tagged) {
    const stories = t.stories ?? sticky;
    sticky = stories;
    const prev = recs.at(-1);
    if (prev && prev.stories.join() === stories.join()) prev.lines.push(...t.lines);
    else recs.push({ section: heading.text.replace(/\*\*/g, ''), stories, kind: 'section', lines: t.lines.slice() });
  }
  recs.forEach((r, n) => {
    if (n === 0) r.lines.unshift(sectionLines[0]);
    while (r.lines.length && !r.lines.at(-1).trim()) r.lines.pop();
    while (r.lines.length && !r.lines[0].trim()) r.lines.shift();
  });
  return recs;
}

/** Все алиасы базы и их .md-файлы. Служебные папки (_pipeline, _clean) не трогаем. */
export function listBase(books = BOOKS) {
  return readdirSync(books)
    .filter((d) => !d.startsWith('_') && !d.startsWith('.') && statSync(join(books, d)).isDirectory())
    .sort()
    .map((alias) => ({
      alias,
      files: readdirSync(join(books, alias))
        .filter((f) => f.endsWith('.md'))
        .sort(),
    }));
}

/** Чистит всю базу в памяти: ничего не пишет. */
export function cleanBase({ books = BOOKS, stories = loadStories(join(ROOT, 'src/stories')) } = {}) {
  const matcher = buildMatcher(stories);
  const files = [];
  for (const { alias, files: names } of listBase(books)) {
    for (const file of names) {
      const src = readFileSync(join(books, alias, file), 'utf8');
      const { text, records } = cleanFile(src, matcher);
      files.push({ alias, file, src, text, records: records.map((r) => ({ alias, file, ...r })) });
    }
  }
  return { stories, matcher, files };
}

function stats(files, stories) {
  const byAlias = new Map();
  const byStory = new Map([...stories.map((s) => [s.id, { records: 0, lines: 0 }]), [SHARED, { records: 0, lines: 0 }]]);
  for (const f of files) {
    if (!byAlias.has(f.alias)) byAlias.set(f.alias, { moved: 0, trimmed: 0, records: 0, items: 0, sections: 0 });
    const a = byAlias.get(f.alias);
    for (const r of f.records) {
      const n = r.lines.filter((l) => l.trim()).length;
      a.records++;
      if (r.kind === 'trimmed') a.trimmed += n;
      else a.moved += n;
      if (r.kind === 'item') a.items++;
      if (r.kind === 'section' && r.lines[0] && HEADING_RE.test(r.lines[0])) a.sections++;
      for (const id of r.stories) {
        const s = byStory.get(id) ?? byStory.get(SHARED);
        s.records++;
        s.lines += n;
      }
    }
  }
  const total = [...byAlias.values()].reduce(
    (t, a) => ({ moved: t.moved + a.moved, trimmed: t.trimmed + a.trimmed, records: t.records + a.records, items: t.items + a.items, sections: t.sections + a.sections }),
    { moved: 0, trimmed: 0, records: 0, items: 0, sections: 0 },
  );
  return { byAlias: Object.fromEntries(byAlias), byStory: Object.fromEntries(byStory), total };
}

const KIND = {
  section: 'раздел вынесен целиком',
  item: 'пункт целиком про историю: в базе оставлен номер с пометкой',
  removed: 'строка вырезана',
  trimmed: 'из строки вырезаны предложения про историю, остальное осталось в базе',
};

function caseFile(story, records, total) {
  const title = story ? `${story.label} (\`${story.id}\`)` : 'несколько историй сразу или без названия';
  const out = [
    `# Кейсы: ${title}`,
    '',
    'Строки и пункты базы `docs/books/`, которые говорят об этой истории. `npm run kb:clean` вырезал их из',
    'очищенной копии `docs/books/_clean/`, по которой собираются скиллы: правила не должны держаться на трёх',
    'текущих историях. Здесь это материал для экспериментов — проверить правило на живом примере, сравнить',
    'историю до и после переписывания.',
    '',
    'Файл собирается заново при каждом запуске, ручные правки пропадут. Источник записи — `алиас:файл:раздел`.',
    '',
    `Записей: ${records.length}, строк: ${total}.`,
  ];
  let alias = null;
  let source = null;
  let note = null;
  for (const r of records) {
    if (r.alias !== alias) {
      alias = r.alias;
      out.push('', `## ${alias}`);
    }
    const src = `${r.alias}:${r.file}:${r.section}`;
    const also = story ? r.stories.filter((id) => id !== story.id) : [];
    const n = `*${KIND[r.kind]}*${also.length ? ` · ещё про: ${also.join(', ')}` : ''}`;
    if (src !== source) out.push('', `### \`${src}\``);
    if (src !== source || n !== note) out.push('', n);
    source = src;
    note = n;
    out.push('', '~~~~markdown', ...r.lines, '~~~~');
  }
  return out.join('\n') + '\n';
}

function indexFile(st, stories) {
  const out = [
    '# Кейсы наших историй',
    '',
    'Что `npm run kb:clean` вынес из базы `docs/books/` в эту папку. Сборщики скиллов читают',
    '`docs/books/_clean/` — копию без этих строк, а кейсы нужны для экспериментов. Файлы собираются',
    'заново при каждом запуске.',
    '',
    '| история | файл | записей | строк |',
    '|---|---|---|---|',
    ...stories.map((s) => `| ${s.label} | [${s.id}.md](${s.id}.md) | ${st.byStory[s.id].records} | ${st.byStory[s.id].lines} |`),
  ];
  if (st.byStory[SHARED].records) out.push(`| без названия | [${SHARED}.md](${SHARED}.md) | ${st.byStory[SHARED].records} | ${st.byStory[SHARED].lines} |`);
  out.push(
    '',
    '## По разборам',
    '',
    '«Вынесено» — строки, которые ушли из базы целиком (разделы, пункты, строки-примеры); «подрезано» —',
    'строки, из которых вырезаны только предложения про истории.',
    '',
    '| разбор | вынесено строк | подрезано строк | разделов | пунктов с пометкой |',
    '|---|---|---|---|---|',
    ...Object.entries(st.byAlias).map(([a, x]) => `| ${a} | ${x.moved} | ${x.trimmed} | ${x.sections} | ${x.items} |`),
    `| **всего** | **${st.total.moved}** | **${st.total.trimmed}** | **${st.total.sections}** | **${st.total.items}** |`,
  );
  return out.join('\n') + '\n';
}

function build({ json, quiet }) {
  const { stories, files } = cleanBase();
  rmSync(CLEAN, { recursive: true, force: true });
  for (const f of files) {
    mkdirSync(join(CLEAN, f.alias), { recursive: true });
    writeFileSync(join(CLEAN, f.alias, f.file), f.text);
  }
  const all = files.flatMap((f) => f.records);
  const st = stats(files, stories);
  mkdirSync(CASES, { recursive: true });
  for (const s of stories) {
    const recs = all.filter((r) => r.stories.includes(s.id));
    writeFileSync(join(CASES, `${s.id}.md`), caseFile(s, recs, st.byStory[s.id].lines));
  }
  const shared = all.filter((r) => r.stories.some((id) => !stories.some((s) => s.id === id)));
  const sharedPath = join(CASES, `${SHARED}.md`);
  if (shared.length) writeFileSync(sharedPath, caseFile(null, shared, st.byStory[SHARED].lines));
  else rmSync(sharedPath, { force: true });
  writeFileSync(join(CASES, 'README.md'), indexFile(st, stories));

  if (json) return console.log(JSON.stringify({ ok: true, files: files.length, ...st }, null, 2));
  if (!quiet) {
    console.log('разбор                              вынесено  подрезано  разделов  пунктов');
    for (const [a, x] of Object.entries(st.byAlias)) {
      if (!x.records) continue;
      console.log(`${a.padEnd(36)} ${String(x.moved).padStart(8)} ${String(x.trimmed).padStart(10)} ${String(x.sections).padStart(9)} ${String(x.items).padStart(8)}`);
    }
    console.log('');
    for (const s of stories) console.log(`  ${s.id}: ${st.byStory[s.id].records} записей, ${st.byStory[s.id].lines} строк`);
  }
  console.log(
    `✓ _clean: ${files.length} файлов; вынесено строк ${st.total.moved}, подрезано ${st.total.trimmed} → docs/lab/cases/`,
  );
}

function verify({ json }) {
  const problems = [];
  if (!existsSync(CLEAN)) problems.push('нет docs/books/_clean — сначала npm run kb:clean');
  else {
    const { matcher, files } = cleanBase();
    for (const f of files) {
      const path = join(CLEAN, f.alias, f.file);
      const where = `${f.alias}/${f.file}`;
      if (!existsSync(path)) {
        problems.push(`${where}: нет в _clean`);
        continue;
      }
      const text = readFileSync(path, 'utf8');
      let fence = false;
      text.split('\n').forEach((l, n) => {
        if (FENCE_RE.test(l)) fence = !fence;
        const hits = matcher.find(l, { code: fence });
        if (hits.length) problems.push(`${where}:${n + 1}: упоминание ${hits.map((h) => `«${h.term}»`).join(', ')}`);
      });
      const a = declaredIds(f.src).join();
      const b = declaredIds(text).join();
      if (a !== b) problems.push(`${where}: пункты не совпадают с исходником (было ${declaredIds(f.src).length}, стало ${declaredIds(text).length})`);
      if (text !== f.text) problems.push(`${where}: _clean устарела — перезапусти npm run kb:clean`);
    }
    const known = new Set(files.map((f) => `${f.alias}/${f.file}`));
    for (const alias of readdirSync(CLEAN)) {
      for (const file of readdirSync(join(CLEAN, alias))) {
        if (!known.has(`${alias}/${file}`)) problems.push(`${alias}/${file}: лишний файл в _clean`);
      }
    }
  }
  if (json) console.log(JSON.stringify({ ok: !problems.length, problems }, null, 2));
  else if (problems.length) {
    console.error(`✗ _clean: ${problems.length} проблем`);
    for (const p of problems.slice(0, 50)) console.error('  ' + p);
    if (problems.length > 50) console.error(`  … и ещё ${problems.length - 50}`);
  } else console.log('✓ _clean: упоминаний наших историй нет, пункты на месте, копия свежая');
  if (problems.length) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opts = { json: args.includes('--json'), quiet: args.includes('--quiet') };
  const unknown = args.filter((a) => !['--verify', '--json', '--quiet', '--help', '-h'].includes(a));
  if (args.includes('--help') || args.includes('-h')) console.log(HELP);
  else if (unknown.length) {
    console.error(`неизвестный флаг: ${unknown.join(' ')}\n\n${HELP}`);
    process.exitCode = 2;
  } else if (args.includes('--verify')) verify(opts);
  else build(opts);
}
