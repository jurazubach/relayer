// Разбор docs/playbook/owners.md: владелец и файл у R/C/F/TH/якорей, «опора» кластеров TH-NN.
// owners.md — единственная раскладка владельцев (build-plan.md §5): покрытие не выбирает владельца само.
import { splitRow } from './clean.mjs';
import { pad, ATTN_WRAPPERS } from './kb-rows.mjs';

const UNIT_RE = /^((?:R|C|F)-\d+|TH-\d+|#attn-[a-z0-9-]+)$/;
const COLS = { 'ID': 'id', 'якорь': 'id', 'тема': 'topic', 'раздел': 'topic', 'владелец': 'owner', 'файл': 'file', 'опора': 'opora', 'ссылаются': 'refs' };

/** Скиллы из §1 «Сводка по скиллам» (плюс инфраструктура story:lint). */
export function ownerSkills(text) {
  const skills = [];
  let on = false;
  for (const line of text.split('\n')) {
    if (/^##\s+1\./.test(line)) on = true;
    else if (on && /^##\s/.test(line)) break;
    if (!on || !/^\|/.test(line)) continue;
    const name = splitRow(line)[0].match(/^`([^`]+)`/)?.[1];
    if (name) skills.push(name);
  }
  return skills;
}

/** Первый файл из колонки «файл»: «`clock.md` (`promise-scan.mjs`)» → clock.md. */
export function mainFile(cell) {
  return cell.match(/`([^`]+)`/)?.[1] ?? cell.trim();
}

/** Единицы owners.md: строки таблиц с ID в первой колонке. */
export function parseOwners(text) {
  const units = new Map();
  const dups = [];
  let cols = null;
  let section = null;
  for (const line of text.split('\n')) {
    const h = line.match(/^##\s+(\d+)\./);
    if (h) section = Number(h[1]);
    if (!/^\|/.test(line)) {
      cols = null;
      continue;
    }
    const cells = splitRow(line);
    if (!cols) {
      cols = cells.map((c) => COLS[c] ?? null);
      continue;
    }
    if (/^[\s:-]+$/.test(cells[0])) continue;
    const id = cells[0].replace(/`/g, '');
    if (!UNIT_RE.test(id)) continue;
    const u = { id, section };
    cells.forEach((c, i) => cols[i] && (u[cols[i]] = c));
    u.owner = (u.owner ?? '').replace(/`/g, '').trim();
    u.file = u.file != null ? mainFile(u.file) : null;
    if (units.has(id)) dups.push(id);
    else units.set(id, u);
  }
  return { units, dups };
}

/** target по колонке «файл»: `skill/file#якорь`; у story:lint — сам файл. */
export function targetOf(unit, rowId) {
  if (!unit?.file) return null;
  if (unit.owner === 'story:lint') return unit.file;
  return `${unit.owner}/${unit.file}${rowId.startsWith('#') ? '' : '#'}${rowId}`;
}

// Токены «опоры»: маркер алиаса («`video:», «`inkle`», «`алиас:») и ID.
const ALIAS_TOKEN = /`([a-z][a-z0-9-]*|алиас):|`([a-z][a-z0-9-]*)`/g;
const ID_TOKEN = /\b(P|PAT|GREEN|RED|LESSON|SYS|R|C|F)-(\d+)\b|attention§(\d+)|(?<![\p{L}])§(\d+)|Система\s+(\d+)|(?<![\p{L}])С-(\d+)/gu;

/**
 * ID из ячейки «опора»: `алиас:ID`, голый ID того же алиаса до «;», диапазоны «P-03…P-06»,
 * `алиас:attention§2` ×30 — у всех разборов. «кроме взятых ниже» — слабая опора: уступает явной.
 */
export function parseOpora(cell, resolve, aliases) {
  const out = [];
  for (const seg of cell.split(';')) {
    const weak = /кроме/.test(seg);
    const tokens = [];
    for (const m of seg.matchAll(ALIAS_TOKEN)) tokens.push({ at: m.index, alias: m[1] ?? m[2] });
    for (const m of seg.matchAll(ID_TOKEN)) tokens.push({ at: m.index, end: m.index + m[0].length, m });
    tokens.sort((a, b) => a.at - b.at);
    let alias = null;
    let prev = null;
    for (const t of tokens) {
      if (t.alias) {
        alias = t.alias === 'алиас' ? '*' : resolve(t.alias);
        continue;
      }
      const m = t.m;
      let kind;
      let n;
      if (m[1]) [kind, n] = [m[1], Number(m[2])];
      else if (m[3] || m[4]) [kind, n] = ['attention', Number(m[3] ?? m[4])];
      else [kind, n] = ['SYS', Number(m[5] ?? m[6])];
      const global = ['R', 'C', 'F'].includes(kind);
      if (!global && !alias) continue;
      const ids = [n];
      const gap = prev ? seg.slice(prev.end, t.at) : '';
      if (prev && prev.kind === kind && /…/.test(gap) && !/[,;]/.test(gap.replace(/`/g, ''))) {
        for (let x = prev.n + 1; x < n; x++) ids.unshift(x);
      }
      for (const x of ids) {
        const ref = (a) => (global ? `${kind}-${pad(x)}` : kind === 'attention' ? `${a}:attention§${x}` : kind === 'SYS' ? `${a}:SYS-${x}` : `${a}:${kind}-${pad(x)}`);
        if (alias === '*' && !global) for (const a of aliases) out.push({ id: ref(a), weak: true });
        else out.push({ id: ref(alias), weak });
      }
      prev = { kind, n, end: t.end };
    }
  }
  return out;
}

/** ID строки → кластер TH-NN по «опоре». Явная опора сильнее слабой, меньший номер TH — сильнее (owners.md §5). */
export function oporaIndex(units, resolve, aliases) {
  const map = new Map();
  for (const u of units.values()) {
    if (!u.id.startsWith('TH-') || !u.opora) continue;
    const th = Number(u.id.slice(3));
    for (const { id, weak } of parseOpora(u.opora, resolve, aliases)) {
      const had = map.get(id);
      const better = !had || (had.weak && !weak) || (had.weak === weak && th < had.n);
      if (better) map.set(id, { th: u.id, n: th, weak });
    }
  }
  return map;
}

/**
 * Проверка owners.md §8, постоянной командой: каждый R/C/F/TH/якорь ровно один раз в колонке «владелец»,
 * владелец — из §1, полнота — по rules.md, checks.md, skills.md §6 и якорям attention-merged.md.
 */
export function ownersCheck({ owners, rules, checks, skills, attention }) {
  const { units, dups } = parseOwners(owners);
  const known = new Set(ownerSkills(owners));
  const bad = [...units.values()].filter((u) => !known.has(u.owner)).map((u) => `${u.id} → ${u.owner || '(пусто)'}`);
  const ids = (t, re) => [...new Set(t.match(re) ?? [])];
  const need = [
    ...ids(rules, /^\*\*R-\d+/gm).map((s) => s.slice(2)),
    ...ids(checks, /^### C-\d+/gm).map((s) => s.slice(4)),
    ...ids(skills, /^\| F-\d+/gm).map((s) => s.slice(2)),
    ...ids(attention, /\{#attn-[a-z0-9-]+\}/g).map((s) => s.slice(1, -1)).filter((a) => !ATTN_WRAPPERS.includes(a)),
  ];
  const miss = need.filter((k) => !units.has(k));
  const th = [...units.keys()].filter((k) => k.startsWith('TH-')).length;
  return { ok: !dups.length && !miss.length && !bad.length, units: units.size, th, skills: known.size, dups, miss, bad };
}
