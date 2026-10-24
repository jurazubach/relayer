// Индекс переменных по checks.md («Общие данные»): статический проход по дереву без комментариев.
// Запись — `~ x =`, `+=`, `-=`, `++`, `--`; чтение — всё остальное: условия, подстановки, правые части, аргументы.
import { walk } from '../../lib/ink.mjs';
import { finalNodes } from './graph.mjs';

const TOKEN = /[\p{L}\p{N}_]+(?:\.[\p{L}\p{N}_]+)*(\s*\()?/gu;
const WRITE = /^(temp\s+)?([\p{L}\p{N}_]+)\s*(\+\+|--|[+\-*/]?=(?!=))\s*(.*)$/u;
/** Виды чтения, которые игрок видит: реплика под условием, подстановка в тексте, кнопка под условием. */
export const VISIBLE = new Set(['реплика', 'текст', 'кнопка']);

const noStrings = (s) => s.replace(/"[^"]*"/g, '""');

/**
 * «{x == 1: -> a}» на одной строке: parseInk выносит переход отдельно, а от строки остаётся «{x == 1: }»
 * как будто реплика. Это скрытая проверка, а не текст.
 */
export const isInlineDivert = (text) => /^\{[^{}]*:\s*\}$/.test(String(text).trim());

/** Имена из выражения: переменные (без скобки) и вызовы функций (со скобкой). */
function names(expr, vars, fns) {
  const v = new Set();
  const f = new Set();
  for (const m of noStrings(expr).matchAll(TOKEN)) {
    const name = m[0].replace(/\s*\($/, '');
    if (m[1] && fns.has(name)) f.add(name);
    else if (vars.has(name)) v.add(name);
  }
  return { v, f };
}

/** Куски в фигурных скобках из текста реплики или кнопки: «{x}», «{x: да|нет}». */
const braces = (text) => [...String(text).matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]);

/** Выводит ли контейнер что-то игроку: реплику, системную строку или кнопку. */
function speaks(items) {
  let yes = false;
  walk(items, (it) => { if (['msg', 'me', 'sys', 'choice'].includes(it.type)) yes = true; });
  return yes;
}

/**
 * @returns {{ vars: object[], byName: Map, final: Set, distributors: Set, lastChapter: number, chapters: number }}
 *   у переменной: name, init, writes[], reads[] ({ node, chapter, kind, line, via? }), derivedFrom, flags[]
 */
export function varIndex(tree) {
  const decl = tree.vars.filter((d) => d.kind === 'VAR');
  const vars = new Set(decl.map((d) => d.name));
  const fns = new Set(tree.functions.map((f) => f.id));
  const rows = new Map(decl.map((d) => [d.name, { name: d.name, init: d.value, writes: [], reads: [], derived: new Set(), feeds: new Set() }]));
  const fnUse = new Map(); // функция → { reads: [{name, kind}], writes: [name], calls: Set }

  const scan = (owner, items, emit) => {
    const ctx = []; // условия над текущим местом: переменные, которые их решают
    const visit = (list, guard) => {
      for (const it of list) {
        if (it.type === 'code') {
          const m = it.text.match(WRITE);
          if (m && !m[1] && vars.has(m[2])) {
            emit.write(m[2], it.line, guard);
            const rhs = m[3] === '++' || m[3] === '--' ? '' : m[4];
            const { v, f } = names(rhs, vars, fns);
            for (const x of v) if (x !== m[2]) emit.read(x, 'код', it.line);
            for (const x of f) emit.call(x, 'код');
          } else {
            const expr = m ? m[4] : it.text.replace(/^temp\s+/, '');
            const { v, f } = names(expr, vars, fns);
            for (const x of v) emit.read(x, 'код', it.line);
            for (const x of f) emit.call(x, 'код');
          }
        } else if (['msg', 'me', 'sys'].includes(it.type)) {
          const hidden = isInlineDivert(it.text);
          for (const b of braces(it.text)) {
            const kind = hidden ? 'переход' : 'текст';
            const { v, f } = names(b.split(':')[0], vars, fns);
            for (const x of v) emit.read(x, kind, it.line);
            for (const x of f) emit.call(x, kind);
          }
        } else if (it.type === 'choice') {
          const guardVars = new Set();
          for (const c of it.conds) {
            const { v, f } = names(c, vars, fns);
            for (const x of v) { emit.read(x, 'кнопка', it.line); guardVars.add(x); }
            for (const x of f) emit.call(x, 'кнопка');
          }
          for (const b of braces(it.text)) {
            const { v } = names(b.split(':')[0], vars, fns);
            for (const x of v) emit.read(x, 'текст', it.line);
          }
          visit(it.items, new Set([...(guard ?? []), ...guardVars]));
        } else if (it.type === 'cond') {
          const any = it.branches.some((b) => speaks(b.items));
          const headVars = it.head ? names(it.head, vars, fns) : { v: new Set(), f: new Set() };
          for (const x of headVars.v) emit.read(x, any ? 'реплика' : 'переход', null);
          for (const x of headVars.f) emit.call(x, any ? 'реплика' : 'переход');
          for (const b of it.branches) {
            const own = b.cond && b.cond !== 'else' ? names(b.cond, vars, fns) : { v: new Set(), f: new Set() };
            const kind = speaks(b.items) ? 'реплика' : 'переход';
            for (const x of own.v) emit.read(x, kind, null);
            for (const x of own.f) emit.call(x, kind);
            visit(b.items, new Set([...(guard ?? []), ...headVars.v, ...own.v]));
          }
        }
      }
    };
    visit(items, null);
    return ctx;
  };

  // функции: что читают и пишут, — чтобы приписать это узлу, который их вызывает (одна ступень)
  for (const fn of tree.functions) {
    const use = { reads: [], writes: [], calls: new Set() };
    scan(fn.id, fn.items, {
      write: (name) => use.writes.push(name),
      read: (name, kind) => use.reads.push({ name, kind }),
      call: (name) => use.calls.add(name),
    });
    fnUse.set(fn.id, use);
  }
  const fnReads = (fn, seen = new Set()) => {
    if (seen.has(fn)) return { reads: [], writes: [] };
    seen.add(fn);
    const u = fnUse.get(fn);
    if (!u) return { reads: [], writes: [] };
    const out = { reads: [...u.reads], writes: [...u.writes] };
    for (const c of u.calls) {
      const r = fnReads(c, seen);
      out.reads.push(...r.reads);
      out.writes.push(...r.writes);
    }
    return out;
  };

  for (const k of tree.knots) {
    const at = (line) => ({ node: k.id, chapter: k.chapter, line: line ?? null, ...(k.file ? { file: k.file } : {}) });
    scan(k.id, k.items, {
      write: (name, line, guard) => {
        const row = rows.get(name);
        row.writes.push(at(line));
        for (const g of guard ?? []) if (g !== name) { row.derived.add(g); rows.get(g)?.feeds.add(name); }
      },
      read: (name, kind, line) => rows.get(name).reads.push({ ...at(line), kind }),
      call: (fn, kind) => {
        const r = fnReads(fn);
        // чтение внутри функции видно игроку так же, как место вызова
        for (const x of r.reads) rows.get(x.name)?.reads.push({ ...at(null), kind: VISIBLE.has(kind) ? kind : 'функция', via: fn });
        for (const x of r.writes) rows.get(x)?.writes.push({ ...at(null), via: fn });
      },
    });
  }

  const { final, distributors } = finalNodes(tree);
  const lastChapter = Math.max(0, ...tree.knots.map((k) => k.chapter ?? 0));
  const out = [...rows.values()].map((r) => {
    // производные: «y пишется внутри условия на x» — чтение y засчитывается и x (одна ступень)
    const viaFeeds = [...r.feeds].flatMap((y) => rows.get(y).reads.map((rd) => ({ ...rd, via: rd.via ?? y })));
    const reads = [...r.reads, ...viaFeeds];
    const visible = reads.filter((x) => VISIBLE.has(x.kind));
    const inFinal = reads.filter((x) => final.has(x.node) || distributors.has(x.node));
    const minCh = (list) => (list.length ? Math.min(...list.map((x) => x.chapter ?? 0)) : null);
    const flags = [];
    if (r.writes.length && !reads.length) flags.push('мёртвая');
    if (!r.writes.length) flags.push('не пишется');
    if (reads.length && !visible.length) flags.push('невидимая');
    const early = r.writes.some((w) => (w.chapter ?? 0) < lastChapter);
    if (reads.length && early && reads.every((x) => final.has(x.node) || distributors.has(x.node) || (x.chapter ?? 0) >= lastChapter)) flags.push('только финал');
    return {
      name: r.name, init: r.init, writes: r.writes, reads, ownReads: r.reads.length,
      visibleReads: visible.length, hiddenReads: reads.length - visible.length,
      firstWrite: minCh(r.writes), firstRead: minCh(reads), firstVisible: minCh(visible),
      readByFinal: inFinal.length > 0, derivedFrom: [...r.derived], feeds: [...r.feeds], flags,
    };
  });
  return { vars: out, byName: new Map(out.map((v) => [v.name, v])), final, distributors, lastChapter };
}
