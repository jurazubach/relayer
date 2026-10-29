// Свод по ID: текст правила, проверки, решения или приёма; пороги из thresholds.json; владелец и отмены.
// Один источник правды на вид знаний (план §1): здесь только чтение, ничего не копируется.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
export const PLAYBOOK = 'docs/playbook';

const cache = new Map();
/** Текст файла свода или null, если файла ещё нет (local-lessons.md появится позже). */
export function doc(name) {
  if (!cache.has(name)) {
    const file = join(ROOT, PLAYBOOK, name);
    cache.set(name, existsSync(file) ? readFileSync(file, 'utf8') : null);
  }
  return cache.get(name);
}

/** Где искать тело ID по приставке. */
export const KINDS = {
  R: { what: 'правило', file: 'rules.md' },
  C: { what: 'проверка', file: 'checks.md' },
  A: { what: 'решение автора', file: 'superseded.md' },
  F: { what: 'ремонтный приём', file: 'skills.md' },
  LOCAL: { what: 'наш урок', file: 'local-lessons.md' },
  TH: { what: 'тема базы', file: 'owners.md' },
  '#attn': { what: 'раздел внимания', file: 'attention-merged.md' },
};

/**
 * «r61», «R-61», «c-035» → «R-61», «C-35»; якорь внимания «#attn-return-silence» или без «#» (оболочка
 * съедает «#» без кавычек) → «#attn-return-silence»; не похоже на ID — null.
 */
export function normalizeId(raw) {
  const s = String(raw).trim();
  const a = s.match(/^#?(attn(?:-[a-z0-9]+)*)$/i);
  if (a) return `#${a[1].toLowerCase()}`;
  const m = s.match(/^(LOCAL|TH|[RCAF])-?0*(\d+)$/i);
  if (!m) return null;
  return `${m[1].toUpperCase()}-${m[2].padStart(2, '0')}`;
}

export const prefixOf = (id) => (id.startsWith('#attn') ? '#attn' : id.slice(0, id.lastIndexOf('-')));
const token = (id) => new RegExp(`(^|[^\\w-])${id}(?![\\w-])`);

/**
 * Блок текста ID: правило `**R-NN. …**` с «Почему / Источники / Спор / Правка» до следующего правила или
 * заголовка; проверка `### C-NN.` до следующей проверки; урок — заголовок или жирная строка с ID.
 */
export function block(text, id) {
  const lines = text.split('\n');
  if (id.startsWith('#attn')) return anchorBlock(lines, id);
  const esc = id.replace('-', '\\-');
  const starts = [
    new RegExp(`^#{2,4}\\s+\`?${esc}\\b`),
    new RegExp(`^\\*\\*${esc}[.:\\s]`),
    new RegExp(`^[-*]\\s+\\*\\*${esc}\\b`),
  ];
  const at = lines.findIndex((l) => starts.some((r) => r.test(l)));
  if (at < 0) return null;
  const head = lines[at].match(/^#+/)?.[0].length ?? 0;
  let end = at + 1;
  for (; end < lines.length; end++) {
    const l = lines[end];
    const h = l.match(/^(#+)\s/);
    if (h && (!head || h[1].length <= head)) break;
    if (!head && (/^\*\*[A-Z]+-\d+[.:\s]/.test(l) || /^[-*]\s+\*\*[A-Z]+-\d+\b/.test(l) || /^---\s*$/.test(l))) break;
  }
  while (end > at && !lines[end - 1].trim()) end--;
  return { line: at + 1, text: lines.slice(at, end).join('\n') };
}

/** Раздел attention-merged.md по якорю «{#attn-…}» в заголовке: до заголовка того же уровня или выше. */
function anchorBlock(lines, id) {
  const at = lines.findIndex((l) => /^#+\s/.test(l) && l.includes(`{${id}}`));
  if (at < 0) return null;
  const head = lines[at].match(/^#+/)[0].length;
  let end = at + 1;
  while (end < lines.length && !(lines[end].match(/^(#+)\s/)?.[1].length <= head)) end++;
  while (end > at && !lines[end - 1].trim()) end--;
  return { line: at + 1, text: lines.slice(at, end).join('\n') };
}

/** Строки таблиц, у которых в первой ячейке стоит ID: { header, row, line, section }. */
export function tableRows(text, id) {
  if (!text) return [];
  const re = token(id);
  const lines = text.split('\n');
  const out = [];
  let header = null;
  let section = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const h = l.match(/^#+\s+(.*)/);
    if (h) { section = h[1].trim(); header = null; continue; }
    if (!l.startsWith('|')) { header = null; continue; }
    const cells = l.split('|').slice(1, -1).map((c) => c.trim());
    if (/^\|[\s:|-]+\|$/.test(l)) continue;
    if (!header) { header = cells; continue; }
    if (re.test(cells[0] ?? '')) out.push({ header, row: cells, line: i + 1, section });
  }
  return out;
}

let thresholdsCache = null;
export function thresholds() {
  if (!thresholdsCache) {
    const file = join(ROOT, PLAYBOOK, 'thresholds.json');
    thresholdsCache = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  }
  return thresholdsCache;
}

/**
 * Пороги ID: у проверки — ключи `C-NN.*` и ключи, где она в `checks`; у правила и прочих — ключи, где ID
 * назван в `sources`. `via` — откуда связь: «ключ», «checks», «sources».
 */
export function thresholdsFor(id) {
  const re = token(id);
  const out = [];
  for (const [key, e] of Object.entries(thresholds())) {
    if (key.startsWith('_') || !e || typeof e !== 'object') continue;
    let via = null;
    if (key.startsWith(`${id}.`)) via = 'ключ';
    else if ((e.checks ?? []).some((c) => re.test(String(c)))) via = 'checks';
    else if ((e.sources ?? []).some((s) => re.test(String(s)))) via = 'sources';
    if (via) out.push({ key, via, ...e });
  }
  return out;
}

/** ID другого вида, которые упомянуты в тексте: связанные правила у проверки и наоборот. */
export function mentions(text, prefix) {
  const re = new RegExp(`(?:^|[^\\w-])(${prefix}-\\d+)(?![\\w-])`, 'g');
  return [...new Set([...text.matchAll(re)].map((m) => normalizeId(m[1])))];
}

/** Проверки, в тексте которых упомянуто правило: { id, title }. */
export function checksMentioning(id) {
  const text = doc('checks.md');
  if (!text) return [];
  const re = token(id);
  const out = [];
  for (const m of text.matchAll(/^### (C-\d+)\.\s*(.*)$/gm)) {
    const b = block(text, m[1]);
    if (b && re.test(b.text)) out.push({ id: m[1], title: m[2].trim() });
  }
  return out;
}

/** Заголовок проверки или первая фраза правила — для коротких ссылок. */
export function titleOf(id) {
  const kind = KINDS[prefixOf(id)];
  const text = kind && doc(kind.file);
  const b = text && block(text, id);
  if (!b) return null;
  const first = b.text.split('\n')[0].replace(/^#+\s*/, '').replace(/^\*\*|\*\*$/g, '');
  return first.replace(new RegExp(`^${id}\\.\\s*`), '').replace(/\s*\{#attn[\w-]*\}$/, '');
}

/**
 * Всё про ID: тело, пороги, владелец, отмены, связи. Нет ни тела, ни строки в таблицах — null.
 * @returns {{ id, kind, file, line, text, thresholds, owners, superseded, related } | null}
 */
export function lookupId(id) {
  const prefix = prefixOf(id);
  const kind = KINDS[prefix];
  if (!kind) return null;
  const text = doc(kind.file);
  let body = text ? block(text, id) : null;
  // решения автора и приёмы живут строкой таблицы, а не разделом
  let rows = [];
  if (!body && text) {
    rows = tableRows(text, id);
    if (rows.length) body = { line: rows[0].line, text: rows.map((r) => r.header.map((h, i) => `${h || 'ID'}: ${r.row[i] ?? ''}`).join('\n')).join('\n\n') };
  }
  const owners = kind.file === 'owners.md' ? [] : tableRows(doc('owners.md'), id).map((r) => Object.fromEntries(r.header.map((h, i) => [h, r.row[i] ?? ''])));
  const superseded = prefix === 'A' ? [] : tableRows(doc('superseded.md'), id).map((r) => ({ section: r.section, ...Object.fromEntries(r.header.map((h, i) => [h, r.row[i] ?? ''])) }));
  if (!body && !owners.length) return null;
  const related = body
    ? (prefix === 'C' ? mentions(body.text, 'R') : prefix === 'R' ? checksMentioning(id).map((c) => c.id) : [...mentions(body.text, 'R'), ...mentions(body.text, 'C')])
      .filter((x) => x !== id)
    : [];
  return {
    id, kind: kind.what, file: `${PLAYBOOK}/${kind.file}`, exists: text != null,
    line: body?.line ?? null, text: body?.text ?? null,
    thresholds: thresholdsFor(id), owners, superseded, related,
  };
}
