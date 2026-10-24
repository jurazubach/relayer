// Уровни покрытия по файлам скиллов (flow-review.md §C «Уровни»):
// L0 — нигде; L1 — только в sources.md (не покрытие); L2 — блок с якорем на ID, длиннее порога, с ключевыми
// терминами оригинала (у P и PAT — ещё и «когда не работает», у строки с порогом — ключ thresholds.json);
// L3 — блок L2 и знание исполняемо: проверка story:lint, развилка в decisions-*.md, пример ink, который
// компилируется, или мутант. RED засчитывается на L3 только с мутантом (там же, «Защита», п. 6).
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { compile } from '../lib/compile.mjs';

export const LEVELS = ['L0', 'L1', 'L2', 'L3'];
export const levelNum = (l) => LEVELS.indexOf(l);

const STOP = new Set(
  ('который которая которые которых чтобы когда только после перед между через этого этому этой этот эти тоже также ' +
    'можно нужно нельзя должен должна всегда никогда каждый каждая каждое каждую каждой другой другие другого ' +
    'потому поэтому если иначе почему зачем потом сразу очень более менее самый самое самой своей свой свои своих ' +
    'игрок игрока игроку игроком история истории историю relayer работает работают делает делать чтение пример ' +
    'источник источника наша оценка уверенность высокая средняя низкая модели знание сообщение сообщения сообщений')
    .split(' '),
);

const norm = (s) => s.toLowerCase().replace(/ё/g, 'е');
/** Основа слова: русская морфология без словаря — по началу слова. */
export const stem = (w) => (w.length > 6 ? w.slice(0, 6) : w.slice(0, Math.max(4, w.length - 1)));

function words(text) {
  return (norm(text).match(/[\p{L}]{5,}/gu) ?? []).filter((w) => !STOP.has(w));
}

/** Ключевые термины строки — самые редкие по базе основы из заголовка и «Сути» (там же, «Защита», п. 1). */
export function keyTerms(rows, max) {
  const df = new Map();
  const bag = new Map();
  for (const r of rows) {
    const s = [...new Set(words(`${r.title ?? ''} ${r.gist ?? ''}`.slice(0, 600)).map(stem))];
    bag.set(r.id, s);
    for (const t of s) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const out = new Map();
  for (const [id, s] of bag) {
    // Из заголовка — в первую очередь: он и есть имя правила.
    const head = new Set(words(rows.find((r) => r.id === id)?.title ?? '').map(stem));
    const ranked = s.sort((a, b) => (head.has(b) - head.has(a)) || df.get(a) - df.get(b) || a.localeCompare(b));
    out.set(id, ranked.slice(0, max));
  }
  return out;
}

export function termHits(text, terms) {
  const t = norm(text);
  return terms.filter((s) => new RegExp(`(?<![\\p{L}])${s}`, 'u').test(t));
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir).sort()) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const FENCE_RE = /^\s*(```+|~~~+)\s*([\w-]*)/;
const QUAL_RE = /`?([a-z][a-z0-9-]+):((?:P|PAT|GREEN|RED|LESSON|SYS|contra)-\d+|attention§\d+)(#нюанс)?`?/g;
const GLOBAL_RE = /(?<![\w:-])((?:R|C|F|LOCAL)-\d+|#attn-[a-z0-9-]+)\b/g;

/** ID строк в заголовке: `алиас:P-NN`, `алиас:P-NN#нюанс`, R/C/F/LOCAL, #attn-…; короткие алиасы — через resolve. */
export function headingIds(heading, resolve, pad) {
  const ids = [];
  const nuance = /нюанс/i.test(heading);
  for (const m of heading.matchAll(QUAL_RE)) {
    const alias = resolve(m[1]);
    if (!alias) continue;
    let id = m[2];
    const k = id.match(/^(P|PAT|GREEN|RED|LESSON|SYS|contra)-(\d+)$/);
    if (k) id = ['SYS', 'contra'].includes(k[1]) ? `${k[1]}-${Number(k[2])}` : `${k[1]}-${pad(k[2])}`;
    const isNuance = m[3] || (nuance && k && !['SYS', 'contra'].includes(k[1]));
    ids.push(`${alias}:${id}${isNuance ? '#нюанс' : ''}`);
  }
  for (const m of heading.matchAll(GLOBAL_RE)) {
    const id = m[1].startsWith('#') ? m[1] : m[1].replace(/-(\d+)$/, (_, n) => `-${pad(n)}`);
    ids.push(id);
  }
  return [...new Set(ids)];
}

/** Блоки markdown: заголовок с ID → тело до заголовка того же или старшего уровня. */
export function blocksOf(text, file, resolve, pad) {
  const lines = text.split('\n');
  const heads = [];
  let fence = null;
  lines.forEach((line, i) => {
    const f = line.match(FENCE_RE);
    if (f) {
      fence = fence ? null : f[1][0];
      return;
    }
    if (fence) return;
    const h = line.match(HEADING_RE);
    if (h) heads.push({ i, level: h[1].length, heading: h[2] });
  });
  const out = [];
  heads.forEach((h, k) => {
    const ids = headingIds(h.heading, resolve, pad);
    if (!ids.length) return;
    const next = heads.slice(k + 1).find((x) => x.level <= h.level);
    const body = lines.slice(h.i + 1, next ? next.i : lines.length).join('\n');
    out.push({ file, line: h.i + 1, heading: h.heading, ids, body });
  });
  return out;
}

function inkSnippets(body) {
  const out = [];
  const re = /^\s*(```+|~~~+)\s*ink\s*\n([\s\S]*?)^\s*\1\s*$/gm;
  for (const m of body.matchAll(re)) out.push(m[2]);
  return out;
}

/**
 * Что лежит в скиллах: блоки по ID, списки sources.md, свидетели L3.
 * @returns {{ skills: Map<string, {dir, files, blocks, sources: Set}>, lintText: string, mutantText: string }}
 */
export function scanSkills({ skillsDir, skillNames, resolve, pad, root, lintChecksDir, mutantsDir }) {
  const skills = new Map();
  for (const name of skillNames) {
    const dir = join(skillsDir, name);
    const files = walk(dir).filter((f) => f.endsWith('.md'));
    const blocks = [];
    const sources = new Set();
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      const rel = relative(root, f);
      if (basename(f) === 'sources.md') {
        for (const line of text.split('\n')) for (const id of headingIds(line, resolve, pad)) sources.add(id);
        continue;
      }
      blocks.push(...blocksOf(text, rel, resolve, pad));
    }
    skills.set(name, { dir: relative(root, dir), exists: existsSync(dir), files: files.map((f) => relative(root, f)), blocks, sources });
  }
  const lintFiles = walk(lintChecksDir).filter((f) => f.endsWith('.mjs'));
  const lintIds = new Set(lintFiles.map((f) => basename(f, '.mjs')));
  const lintText = lintFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
  const mutantText = walk(mutantsDir).filter((f) => /\.(json|md|ink)$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n');
  return { skills, lintIds, lintText, mutantText };
}

const mentions = (text, id) => {
  const esc = id.replace(/[.*+?^${}()|[\]\\#§]/g, '\\$&');
  return new RegExp(`(?<![\\w:-])${esc}(?![\\w-])`).test(text);
};

/**
 * Уровень одной строки в скилле-владельце.
 * @param {object} cfg { minChars, minTerms, thresholdKeys: Map<rowId, string[]> }
 */
export function rowLevel(row, terms, skill, scan, cfg) {
  const why = [];
  if (!skill?.exists) return { level: 'L0', why: ['скилла ещё нет'], blocks: [] };
  const blocks = skill.blocks.filter((b) => b.ids.includes(row.id));
  let best = null;
  const checked = [];
  for (const b of blocks) {
    const plainBody = b.body.replace(/\s+/g, ' ').trim();
    const fails = [];
    if (plainBody.length < cfg.minChars) fails.push(`блок короче ${cfg.minChars} знаков (${plainBody.length})`);
    const hits = termHits(b.body, terms);
    const need = Math.min(cfg.minTerms, terms.length);
    if (hits.length < need) fails.push(`ключевых терминов ${hits.length} из ${need} (${terms.join(', ')})`);
    if (['P', 'PAT'].includes(row.kind) && !/не работает|не срабатывает|исключени/i.test(b.body)) fails.push('нет условия «когда не работает»');
    const keys = cfg.thresholdKeys.get(row.id) ?? [];
    if (keys.length && !keys.some((k) => b.body.includes(k))) fails.push(`нет ключа thresholds.json (${keys.join(', ')})`);
    // Пример ink в блоке обязан компилироваться: нерабочий пример хуже, чем никакого.
    const snippets = inkSnippets(b.body);
    const inkOk = snippets.filter((src) => compile(src).ok).length;
    if (inkOk < snippets.length) fails.push(`пример ink не компилируется (${snippets.length - inkOk} из ${snippets.length})`);
    const exec = [];
    if (!fails.length) {
      if (mentions(scan.mutantText, row.id)) exec.push('мутант');
      if (row.kind !== 'RED') {
        if (row.kind === 'C' && scan.lintIds.has(row.id)) exec.push(`story:lint ${row.id}`);
        for (const c of b.body.match(/\bC-\d\d\b/g) ?? []) if (scan.lintIds.has(c)) exec.push(`story:lint ${c}`);
        if (mentions(scan.lintText, row.id)) exec.push('story:lint');
        if (/^decisions-/.test(basename(b.file))) exec.push(`развилка ${basename(b.file)}`);
        if (snippets.length) exec.push('пример ink');
      }
    }
    const level = fails.length ? 'L1' : exec.length ? 'L3' : 'L2';
    checked.push({ file: b.file, line: b.line, level, fails, exec: [...new Set(exec)] });
    if (!best || levelNum(level) > levelNum(best.level)) best = checked.at(-1);
  }
  if (best && levelNum(best.level) >= 2) return { level: best.level, why: best.exec.length ? best.exec : [], blocks: checked };
  if (blocks.length) why.push(...checked.flatMap((c) => c.fails.map((f) => `${c.file}:${c.line}: ${f}`)));
  if (skill.sources.has(row.id)) return { level: 'L1', why: why.length ? why : ['только в sources.md'], blocks: checked };
  return { level: blocks.length ? 'L1' : 'L0', why: why.length ? why : ['нет блока с якорем'], blocks: checked };
}
