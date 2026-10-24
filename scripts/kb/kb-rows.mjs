// Строки матрицы покрытия: единицы знания базы (docs/books/_clean) и свода (docs/playbook).
// Строка — не только ID: нюанс, система, противоречие и раздел attention тоже строки, чтобы их нельзя
// было закрыть ссылкой на родительский P (flow-review.md §C «Защита от формального закрытия», п. 4).
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { splitRow } from './clean.mjs';

export const BASE_KINDS = ['P', 'PAT', 'GREEN', 'RED', 'LESSON'];
export const KINDS = [...BASE_KINDS, 'nuance', 'SYS', 'contra', 'attention', 'R', 'C', 'F', 'attn', 'LOCAL'];
export const KIND_RU = {
  P: 'принципы', PAT: 'приёмы', GREEN: 'зелёные флаги', RED: 'красные флаги', LESSON: 'уроки',
  nuance: 'нюансы', SYS: 'системы', contra: 'противоречия', attention: 'разделы attention',
  R: 'правила', C: 'проверки', F: 'приёмы правки', attn: 'якоря attention-merged', LOCAL: 'наши уроки',
};

// Файлы, где ID объявлены (flow-review.md §C «Подсчёт»): в остальных файлах разбора — только ссылки.
const DEFINING = ['principles.md', 'patterns.md', 'flags.md', 'lessons.md'];
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const FENCE_RE = /^\s*(```+|~~~+)/;
const BASE_ID = '(P|PAT|GREEN|RED|LESSON)-(\\d+)';
const DEF_HEADING_RE = new RegExp(`^#{2,5}\\s+\\**${BASE_ID}\\b[.:)]?\\**\\s*(.*)$`);
const DEF_ROW_RE = new RegExp(`^\\|\\s*\\**\`?${BASE_ID}\`?\\**\\s*\\|`);
// Обёртки attention-merged.md без своего текста: владельца у них нет (owners.md §6).
export const ATTN_WRAPPERS = ['#attn', '#attn-toc', '#attn-min', '#attn-check', '#attn-return', '#attn-slicing'];

export const pad = (n) => String(Number(n)).padStart(2, '0');
export const baseId = (kind, n) => `${kind}-${pad(n)}`;

/** Строки markdown с пометкой «внутри кода», чтобы заголовки в примерах не считались разделами. */
function scan(text) {
  let fence = null;
  return text.split('\n').map((line, i) => {
    const f = line.match(FENCE_RE);
    let code = fence != null;
    if (f) {
      if (fence == null) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      code = true;
    }
    const h = !code && line.match(HEADING_RE);
    return { line, n: i + 1, code, level: h ? h[1].length : 0, heading: h ? h[2].trim() : null };
  });
}

/** Тело раздела: от строки после заголовка до заголовка того же или старшего уровня. */
function sectionEnd(lines, i) {
  const lvl = lines[i].level;
  let j = i + 1;
  while (j < lines.length && !(lines[j].level && lines[j].level <= lvl)) j++;
  return j;
}

const body = (lines, from, to) => lines.slice(from, to).map((l) => l.line).join('\n').trim();
const clip = (s, n = 400) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s);
const plain = (s) => s.replace(/[*_`#>|]/g, ' ').replace(/\s+/g, ' ').trim();

/** «Суть» записи: строка «**Суть:**» или первый абзац тела. */
function gist(text) {
  const m = text.match(/\*\*Суть:?\*\*:?\s*(.+)/);
  if (m) return m[1];
  return text.split(/\n\s*\n/)[0] ?? '';
}

export function listAliases(booksDir) {
  return readdirSync(booksDir)
    .filter((d) => !d.startsWith('_') && !d.startsWith('.') && statSync(join(booksDir, d)).isDirectory())
    .sort();
}

/** Короткий алиас из owners.md и flow-review.md («video», «attention», «mystery») → полный. */
export function aliasResolver(aliases) {
  const set = new Set(aliases);
  const cache = new Map();
  return (short) => {
    if (set.has(short)) return short;
    if (cache.has(short)) return cache.get(short);
    let hit = aliases.filter((a) => a.startsWith(short + '-'));
    if (hit.length !== 1) hit = aliases.filter((a) => a.startsWith(short));
    const res = hit.length === 1 ? hit[0] : null;
    cache.set(short, res);
    return res;
  };
}

/** Строки одного разбора. */
export function bookRows(dir, alias, root) {
  const rows = [];
  const rel = (f) => relative(root, join(dir, f));
  const read = (f) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), 'utf8') : null);
  const seen = new Set();
  const inline = [];
  const add = (row) => {
    if (seen.has(row.id)) return;
    seen.add(row.id);
    rows.push(row);
  };

  for (const file of DEFINING) {
    const text = read(file);
    if (text == null) continue;
    const lines = scan(text);
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l.code) continue;
      let m = l.heading != null && `${'#'.repeat(l.level)} ${l.heading}`.match(DEF_HEADING_RE);
      if (m) {
        const end = sectionEnd(lines, i);
        const text = body(lines, i + 1, end);
        const id = `${alias}:${baseId(m[1], m[2])}`;
        add({ id, kind: m[1], alias, file: rel(file), line: l.n, title: plain(m[3]), gist: plain(gist(text)), text });
        // Нюанс строкой внутри записи («- **Нюансы:** …») — та же отдельная строка, что и раздел нюансов.
        const nu = text.match(/^[-*+]\s+\*\*Нюанс\p{L}*:?\*\*:?\s*(.+(?:\n(?![-*+]\s+\*\*|#).+)*)/mu);
        if (nu) inline.push({ id: `${id}#нюанс`, kind: 'nuance', alias, parent: id, file: rel(file), line: l.n, title: `нюанс к ${baseId(m[1], m[2])}`, gist: plain(nu[1]), text: nu[0] });
        continue;
      }
      m = !l.level && l.line.match(DEF_ROW_RE);
      if (m) {
        const cells = splitRow(l.line);
        add({ id: `${alias}:${baseId(m[1], m[2])}`, kind: m[1], alias, file: rel(file), line: l.n, title: plain(cells[1] ?? ''), gist: plain(cells[2] ?? ''), text: cells.slice(1).join(' · ') });
      }
    }
  }

  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
    const text = read(file);
    const lines = scan(text);
    nuances(lines, alias, rel(file)).forEach(add);
    systems(lines, alias, rel(file), rows).forEach(add);
    if (file === 'for-relayer.md') contras(lines, alias, rel(file)).rows.forEach(add);
    if (file === 'attention.md') attentionSections(lines, alias, rel(file)).forEach(add);
  }
  for (const r of inline) {
    const had = rows.find((x) => x.id === r.id);
    if (had) had.text = `${r.text}\n${had.text}`;
    else add(r);
  }
  return rows;
}

// Запись нюанса начинается с ID: «- **P-01.** …», «### PAT-03», «| P-04 | …». Диапазон «P-01…P-03» — каждому.
const NUANCE_LEAD_RE = new RegExp(`^(?:\\s{0,1}[-*+]\\s+|#{2,6}\\s+|\\|\\s*)[*_\`\\s]*(?:К\\s+)?\`?${BASE_ID}((?:\\s*(?:[,…–]|и|-)\\s*\`?(?:(?:P|PAT|GREEN|RED|LESSON)-)?\\d+\`?)*)`);

function nuanceIds(m) {
  const kind = m[1];
  const ids = [baseId(kind, m[2])];
  let prev = Number(m[2]);
  for (const t of (m[3] ?? '').matchAll(/([,…–]|и|-)\s*`?(?:(P|PAT|GREEN|RED|LESSON)-)?(\d+)/g)) {
    const k = t[2] ?? kind;
    const n = Number(t[3]);
    if (t[1] === '…' || t[1] === '–') for (let x = prev + 1; x < n; x++) ids.push(baseId(k, x));
    ids.push(baseId(k, n));
    prev = n;
  }
  return ids;
}

function nuances(lines, alias, file) {
  const out = new Map();
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.level || !/нюанс/i.test(l.heading)) continue;
    const end = sectionEnd(lines, i);
    let cur = null;
    let tableKind = null;
    for (let j = i + 1; j < end; j++) {
      const s = lines[j];
      if (s.code) {
        if (cur) cur.text.push(s.line);
        continue;
      }
      // Таблица «| P | не работает, если | …» с номером в первой ячейке: «| 01 подтверждение |».
      if (/^\|/.test(s.line) && /^\|[\s|:-]+\|?\s*$/.test(lines[j + 1]?.line ?? '')) {
        tableKind = splitRow(s.line)[0].match(/^(P|PAT|GREEN|RED|LESSON)$/)?.[1] ?? null;
        continue;
      }
      if (!/^\|/.test(s.line)) tableKind = null;
      const t = tableKind && s.line.match(/^\|\s*\**(\d+)\b/);
      if (t) {
        cur = null;
        const key = `${alias}:${baseId(tableKind, t[1])}#нюанс`;
        if (!out.has(key)) out.set(key, { id: key, kind: 'nuance', alias, parent: `${alias}:${baseId(tableKind, t[1])}`, file, line: s.n, title: `нюанс к ${baseId(tableKind, t[1])}`, parts: [] });
        out.get(key).parts.push({ text: [s.line] });
        continue;
      }
      const m = s.line.match(NUANCE_LEAD_RE);
      if (m && !/^\|\s*-+/.test(s.line)) {
        cur = { ids: nuanceIds(m), line: s.n, text: [s.line] };
        for (const id of cur.ids) {
          const key = `${alias}:${id}#нюанс`;
          if (!out.has(key)) out.set(key, { id: key, kind: 'nuance', alias, parent: `${alias}:${id}`, file, line: s.n, title: `нюанс к ${id}`, parts: [] });
          out.get(key).parts.push(cur);
        }
        continue;
      }
      if (s.level || (!s.line.trim() && lines[j + 1] && !/^\s/.test(lines[j + 1].line))) cur = null;
      else if (cur && s.line.trim()) cur.text.push(s.line);
    }
    i = end - 1;
  }
  return [...out.values()].map((r) => {
    const text = [...new Set(r.parts)].map((p) => p.text.join('\n')).join('\n');
    delete r.parts;
    return { ...r, gist: plain(text.replace(NUANCE_LEAD_RE, '')), text };
  });
}

// Системы: разделы «Устройство авторских систем» с подзаголовками «S-1», «Система 1», «СИСТЕМА-2», «SYS-03», «С-4».
const SYS_SECTION_RE = /устройств\p{L}*.*систем|систем\p{L}*.*по устройству|^устройство\s/iu;
const SYS_NUM_RE = /^(?:SYS|СИСТЕМА|Система|СИС|S|С)[-\s.]?(\d+|[A-ZА-Я])\b/u;

function systems(lines, alias, file, existing) {
  const out = [];
  const taken = new Set(existing.filter((r) => r.kind === 'SYS').map((r) => r.id));
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.level || !SYS_SECTION_RE.test(l.heading)) continue;
    const end = sectionEnd(lines, i);
    // Под разделом системы — ближайший уровень подзаголовков; «Нюансы» внутри раздела — не система.
    const subs = lines.slice(i + 1, end).filter((s) => s.level > l.level);
    const lvl = Math.min(...subs.map((s) => s.level));
    // Одна система, разобранная по сторонам («Элементы», «Шаги», «Ошибки понимания»), — одна строка.
    const top = subs.filter((s) => s.level === lvl && !/нюанс/i.test(s.heading));
    if (!top.length || top.every((s) => /элемент|шаг|ошибк|адаптир|коротк|вход|выход/i.test(s.heading))) {
      let n = 1;
      while (taken.has(`${alias}:SYS-${n}`)) n++;
      taken.add(`${alias}:SYS-${n}`);
      const text = body(lines, i + 1, end);
      out.push({ id: `${alias}:SYS-${n}`, kind: 'SYS', alias, file, line: l.n, title: plain(l.heading), label: null, gist: plain(gist(text)), text });
      i = end - 1;
      continue;
    }
    let ord = 0;
    for (let j = i + 1; j < end; j++) {
      const s = lines[j];
      if (s.level !== lvl || /нюанс/i.test(s.heading)) continue;
      ord++;
      const m = s.heading.match(SYS_NUM_RE);
      let n = m && /\d/.test(m[1]) ? Number(m[1]) : ord;
      while (taken.has(`${alias}:SYS-${n}`)) n++;
      const id = `${alias}:SYS-${n}`;
      taken.add(id);
      const text = body(lines, j + 1, sectionEnd(lines, j));
      out.push({ id, kind: 'SYS', alias, file, line: s.n, title: plain(s.heading), label: m ? m[0] : null, gist: plain(gist(text)), text });
    }
    i = end - 1;
  }
  return out;
}

// Ссылки «алиас:ID» и голые «P-NN» (голые — на тот же разбор).
const REF_RE = /(?:`?([a-z][a-z0-9-]+):)?`?((?:P|PAT|GREEN|RED|LESSON)-\d+)`?/g;

export function refsIn(text, alias) {
  const out = [];
  for (const m of text.matchAll(REF_RE)) {
    const [, a, id] = m;
    const [kind, n] = id.split('-');
    out.push({ alias: a ?? alias, id: baseId(kind, n), bare: !a });
  }
  return out;
}

/**
 * Раздел «Согласия и противоречия» for-relayer.md. Согласия — связи для кластеров (flow-review.md §C
 * «Кластеры»: там согласия уже сведены), противоречия — отдельные строки `алиас:contra-N`.
 */
export function contras(lines, alias, file) {
  const agree = [];
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.level || !/согласи.*противореч/i.test(l.heading)) continue;
    const end = sectionEnd(lines, i);
    let mode = null;
    let cur = null;
    const flush = () => {
      if (!cur) return;
      const text = cur.text.join('\n');
      if (cur.mode === 'agree') agree.push({ line: cur.line, text });
      else if (cur.mode === 'contra') {
        const lead = text.startsWith('|') ? splitRow(text).slice(0, 3).join(' · ') : text.replace(/^([-*+]|\d+[.)])\s+/, '');
        const title = lead.match(/^(?:\*\*|\*|_)([^*_]+?)[.:]?(?:\*\*|\*|_)/)?.[1] ?? clip(plain(lead), 100);
        rows.push({ id: `${alias}:contra-${rows.length + 1}`, kind: 'contra', alias, file, line: cur.line, title: plain(title), gist: plain(lead), text });
      }
      cur = null;
    };
    for (let j = i + 1; j < end; j++) {
      const s = lines[j];
      const marker = s.level ? s.heading : s.line.match(/^\s*\*\*([^*]+)\*\*/)?.[1] ?? (/^[А-ЯЁA-Z].*:\s*$/.test(s.line) ? s.line : null);
      if (marker && !/^\s*[-*+]\s/.test(s.line)) {
        flush();
        if (/противореч|расход|спор/i.test(marker)) mode = 'contra';
        else if (/соглас|совпад|подтвержд/i.test(marker)) mode = 'agree';
        else mode = null;
        continue;
      }
      // Строка таблицы — тоже пункт; шапка (над разделителем) и разделитель — нет.
      const tableRow = /^\|/.test(s.line) && !/^\|[\s|:-]+\|?\s*$/.test(s.line) && !/^\|[\s|:-]+\|?\s*$/.test(lines[j + 1]?.line ?? '');
      if (/^[-*+]\s+/.test(s.line) || /^\d+[.)]\s+/.test(s.line) || tableRow) {
        flush();
        cur = { mode, line: s.n, text: [s.line] };
        if (tableRow) flush();
      } else if (cur && s.line.trim()) cur.text.push(s.line);
    }
    flush();
    i = end - 1;
  }
  return { agree, rows };
}

function attentionSections(lines, alias, file) {
  const out = [];
  let ord = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.level !== 2) continue;
    ord++;
    const n = Number(l.heading.match(/^§?\s*(\d+)/)?.[1] ?? ord);
    const text = body(lines, i + 1, sectionEnd(lines, i));
    out.push({ id: `${alias}:attention§${n}`, kind: 'attention', alias, file, line: l.n, title: plain(l.heading.replace(/^§?\s*\d+[.)]?\s*/, '')), gist: plain(text.split(/\n\s*\n/)[0] ?? ''), text });
  }
  return out;
}

/** Свод: R из rules.md (с «Источниками»), C из checks.md, F из skills.md §6, якоря attention-merged.md, LOCAL. */
export function playbookRows(playbookDir, root) {
  const rows = [];
  const rel = (f) => relative(root, join(playbookDir, f));
  const read = (f) => (existsSync(join(playbookDir, f)) ? readFileSync(join(playbookDir, f), 'utf8') : null);

  const rules = read('rules.md');
  if (rules) {
    const lines = scan(rules);
    for (let i = 0; i < lines.length; i++) {
      const m = !lines[i].code && lines[i].line.match(/^\*\*(R-\d+)\.\s*(.+?)\*\*/);
      if (!m) continue;
      let j = i + 1;
      while (j < lines.length && !lines[j].level && !/^\*\*R-\d+\./.test(lines[j].line)) j++;
      const text = body(lines, i, j);
      const sources = text.match(/^Источники:\s*(.+)$/m)?.[1] ?? '';
      rows.push({ id: m[1], kind: 'R', file: rel('rules.md'), line: lines[i].n, title: clip(plain(m[2]), 160), gist: plain(m[2]), text, sources });
      i = j - 1;
    }
  }
  const checks = read('checks.md');
  if (checks) {
    const lines = scan(checks);
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].heading?.match(/^(C-\d+)\.\s*(.+)$/);
      if (!m) continue;
      const text = body(lines, i + 1, sectionEnd(lines, i));
      rows.push({ id: m[1], kind: 'C', file: rel('checks.md'), line: lines[i].n, title: plain(m[2]), gist: plain(gist(text)), text });
    }
  }
  const skills = read('skills.md');
  if (skills) {
    for (const [i, line] of skills.split('\n').entries()) {
      const m = line.match(/^\|\s*(F-\d+)\s*\|/);
      if (!m || rows.some((r) => r.id === m[1])) continue;
      const cells = splitRow(line);
      rows.push({ id: m[1], kind: 'F', file: rel('skills.md'), line: i + 1, title: plain(cells[1] ?? ''), gist: plain(`${cells[1] ?? ''} ${cells[2] ?? ''}`), text: cells.slice(1).join(' · ') });
    }
  }
  const attn = read('attention-merged.md');
  if (attn) {
    const lines = scan(attn);
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].heading?.match(/^(.*?)\s*\{(#attn[a-z0-9-]*)\}\s*$/);
      if (!m || ATTN_WRAPPERS.includes(m[2])) continue;
      const text = body(lines, i + 1, sectionEnd(lines, i));
      rows.push({ id: m[2], kind: 'attn', file: rel('attention-merged.md'), line: lines[i].n, title: plain(m[1].replace(/^[\d.]+\s*/, '')), gist: plain(gist(text)), text });
    }
  }
  // Наши уроки появятся с живым тестом (build-plan.md §10): пока файла нет, строк нет.
  const local = read('local-lessons.md');
  if (local) {
    const lines = scan(local);
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].heading?.match(/^(LOCAL-\d+)\.?\s*(.*)$/);
      if (!m) continue;
      const text = body(lines, i + 1, sectionEnd(lines, i));
      rows.push({ id: m[1], kind: 'LOCAL', file: rel('local-lessons.md'), line: lines[i].n, title: plain(m[2]), gist: plain(gist(text)), text });
    }
  }
  return rows;
}

/** Все строки и связи-согласия. */
export function loadRows({ booksDir, playbookDir, root }) {
  const aliases = listAliases(booksDir);
  const rows = [];
  const agree = [];
  for (const alias of aliases) {
    const dir = join(booksDir, alias);
    rows.push(...bookRows(dir, alias, root));
    const fr = join(dir, 'for-relayer.md');
    if (existsSync(fr)) for (const a of contras(scan(readFileSync(fr, 'utf8')), alias, relative(root, fr)).agree) agree.push({ ...a, alias });
  }
  rows.push(...playbookRows(playbookDir, root));
  return { aliases, rows, agree };
}

export const _test = { scan, nuances, systems, attentionSections, nuanceIds, NUANCE_LEAD_RE };
