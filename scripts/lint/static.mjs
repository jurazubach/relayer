// Статический разбор для проверок: граф узлов, финальные узлы и распределители, индекс переменных,
// классы кнопок. Определения — checks.md, «Общие данные и определения»; здесь они один раз на все проверки.
import { findEndings, nodeIds, resolveTarget, walk } from '../lib/ink.mjs';

const IDENT = /[\p{L}_][\p{L}\p{N}_]*/gu;
const ASSIGN = /^(?:temp\s+)?([\p{L}_][\p{L}\p{N}_]*)\s*(\+\+|--|\+=|-=|=(?!=))\s*(.*)$/u;

/** Глава узла: knot.chapter по #chapter; узлы до первой главы — глава 1. Функции главы не имеют. */
export const chapterOfKnot = (k) => (k.kind === 'function' ? null : Math.max(1, k.chapter || 0));

/** Выражение без строковых литералов: «"locked"» — значение, а не имя переменной. */
const idents = (expr) => (String(expr).replace(/"[^"]*"/g, ' ').match(IDENT) ?? []);

/** Чтения в тексте реплики: {x}, {x: a|b}, {x > 2: …}. Последовательности {a|b} без двоеточия — не чтения. */
function textReads(text) {
  const out = [];
  for (const m of String(text).matchAll(/\{([^{}]*)\}/g)) {
    const body = m[1];
    const colon = body.indexOf(':');
    if (colon >= 0) out.push(...idents(body.slice(0, colon)));
    else if (!body.includes('|')) out.push(...idents(body));
  }
  return out;
}

const hasOutput = (items) => {
  let found = false;
  walk(items, (it) => { if (it.type === 'msg' || it.type === 'me' || it.type === 'sys') found = true; });
  return found;
};

export function buildStatic(tree) {
  const ids = new Set(nodeIds(tree));
  const knots = tree.knots;
  const byId = new Map(knots.map((k) => [k.id, k]));
  const varNames = new Set(tree.vars.filter((v) => v.kind === 'VAR').map((v) => v.name));
  const chapterOf = (id) => (byId.has(id) ? chapterOfKnot(byId.get(id)) : null);
  const lastChapter = Math.max(1, ...knots.map(chapterOfKnot));

  // ── граф: переходы, кнопки
  const edges = new Map(); // id -> [{ to, kind }]
  const hasChoice = new Set();
  const labels = new Map(); // id -> метки сборок узла: «-> loop» на свою метку — петля в узле (хаб)
  for (const k of knots) {
    const own = new Set();
    walk(k.items, (it) => { if ((it.type === 'gather' || it.type === 'choice') && it.label) own.add(it.label); });
    labels.set(k.id, own);
  }
  for (const k of knots) {
    const out = [];
    const own = labels.get(k.id);
    walk(k.items, (it) => {
      if (it.type === 'choice') hasChoice.add(k.id);
      if (it.type !== 'divert') return;
      if (it.kind === 'return') { out.push({ to: '->->', kind: 'return' }); return; }
      if (own.has(it.target) || own.has(it.target.split('.').at(-1)) && it.target.startsWith(`${k.id}.`)) { out.push({ to: k.id, kind: it.kind, label: true }); return; }
      const to = it.target === 'END' || it.target === 'DONE' ? 'END' : resolveTarget(it.target, k.id, ids);
      if (to) out.push({ to, kind: it.kind });
    });
    // knot без своего текста, но со stitch'ами, проваливается в первый stitch
    if (k.kind === 'knot' && !k.items.some((it) => it.type !== 'comment')) {
      const first = knots.find((s) => s.kind === 'stitch' && s.id.startsWith(`${k.id}.`));
      if (first) out.push({ to: first.id, kind: 'divert' });
    }
    edges.set(k.id, out);
  }

  // ── финальные узлы: без кнопок, все выходы (кроме туннелей) — в END или в финальные; до неподвижной точки
  const finals = new Set();
  for (let changed = true; changed;) {
    changed = false;
    for (const k of knots) {
      if (finals.has(k.id) || hasChoice.has(k.id)) continue;
      const exits = edges.get(k.id).filter((e) => e.kind !== 'tunnel');
      if (exits.length && exits.every((e) => e.to === 'END' || finals.has(e.to))) { finals.add(k.id); changed = true; }
    }
  }
  const endings = findEndings(tree);
  const marked = new Set(endings.source === 'mark' ? endings.endings.map((e) => e.id) : []);
  for (const id of marked) finals.add(id);
  // распределитель: переходы хотя бы в два разных финальных узла
  const distributors = knots.filter((k) => {
    const to = new Set(edges.get(k.id).filter((e) => e.kind !== 'tunnel' && finals.has(e.to) && e.to !== k.id).map((e) => e.to));
    return to.size >= 2;
  }).map((k) => k.id);

  const vars = buildVarIndex(tree, varNames, chapterOf);
  const buttons = buildButtons(tree, ids, vars);
  const choiceChapters = buttons.list.map((b) => b.chapter).filter((c) => c != null);
  const lastChoiceChapter = choiceChapters.length ? Math.max(...choiceChapters) : lastChapter;

  // строки под условием или под кнопкой с условием: «знание на пути» (C-51) такие не проверяет
  const condTexts = new Set();
  for (const k of knots) {
    walk(k.items, (it, path) => {
      if ((it.type === 'msg' || it.type === 'me' || it.type === 'sys') && path.some((p) => p.type === 'cond' || (p.type === 'choice' && p.conds.length))) condTexts.add(`${k.id}|${it.text}`);
    });
  }
  // кнопка по узлу и тексту: так точка выбора журнала находит свою кнопку в исходнике
  const buttonByText = new Map();
  for (const b of buttons.list) buttonByText.set(`${b.knot}|${cleanText(b.text)}`, b);
  // первый узел каждой главы — по строке #chapter
  const chapterStart = new Map(tree.chapters.map((c) => [c.n, c.knot]));

  return {
    ids, byId, varNames, chapterOf, lastChapter, lastChoiceChapter, edges, hasChoice,
    finals, distributors: new Set(distributors), endings, vars, buttons, labels, condTexts, chapterStart,
    endingMarks: endingMarks(tree),
    /** Кнопка исходника для варианта точки выбора журнала (узел + текст) или null. */
    button: (knot, text) => buttonByText.get(`${knot}|${cleanText(text)}`) ?? null,
    /** Переменные, которые читает распределитель R, с одной ступенью производных (C-06, C-08, C-09). */
    readsOf(R) {
      const out = new Set();
      for (const v of vars.index.values()) if (v.reads.some((r) => r.node === R)) out.add(v.name);
      for (const y of [...out]) for (const x of vars.derive.get(y) ?? []) out.add(x);
      return out;
    },
  };
}

/** Текст кнопки для сравнения: без пробелов по краям и двойных пробелов. */
export const cleanText = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();

/**
 * Индекс переменных (checks.md «Индекс переменных»): записи и чтения каждой VAR с узлом и главой.
 * Чтение видимое, если стоит в тексте, в условии кнопки или в условии, ветка которого выводит реплику.
 * Производные: запись y внутри условия на x — чтение y засчитывается и x (одна ступень).
 */
function buildVarIndex(tree, varNames, chapterOf) {
  const index = new Map([...varNames].map((n) => [n, { name: n, writes: [], reads: [] }]));
  const derive = new Map(); // y -> Set(x)
  const owners = [...tree.knots.map((k) => ({ k, fn: false })), ...tree.functions.map((k) => ({ k, fn: true }))];

  for (const { k, fn } of owners) {
    const node = k.id;
    const chapter = fn ? null : chapterOf(node);
    const read = (names, visible, where, line) => {
      for (const n of names) if (index.has(n)) index.get(n).reads.push({ node, chapter, visible, where, line, fn });
    };
    const visit = (items, ctx) => {
      for (const it of items) {
        if (it.type === 'code') {
          const m = it.text.match(ASSIGN);
          if (m && !/^temp\s/.test(it.text) && index.has(m[1])) {
            index.get(m[1]).writes.push({ node, chapter, choice: ctx.choice, fn, op: m[2], rhs: m[3].trim(), conds: ctx.conds });
            for (const x of ctx.condVars) {
              if (x === m[1] || !index.has(x)) continue;
              if (!derive.has(m[1])) derive.set(m[1], new Set());
              derive.get(m[1]).add(x);
            }
            // «x = x + 1» — та же запись, а не чтение x
            read(idents(m[3]).filter((n) => n !== m[1]), false, 'code');
          } else read(idents(m ? m[3] : it.text), false, 'code');
        } else if (it.type === 'msg' || it.type === 'me' || it.type === 'sys') {
          read(textReads(it.text), true, 'text', it.line);
        } else if (it.type === 'choice') {
          const condNames = it.conds.flatMap(idents);
          read(condNames, true, 'choice', it.line);
          read(textReads(it.text), true, 'choice', it.line);
          visit(it.items, { choice: it, condVars: [...ctx.condVars, ...condNames], conds: [...ctx.conds, ...it.conds] });
        } else if (it.type === 'cond') {
          const headNames = idents(it.head);
          const anyOut = it.branches.some((b) => hasOutput(b.items));
          read(headNames, anyOut, 'cond');
          for (const b of it.branches) {
            const names = b.cond === 'else' ? [] : idents(b.cond);
            read(names, hasOutput(b.items), 'cond');
            visit(b.items, { choice: ctx.choice, condVars: [...ctx.condVars, ...headNames, ...names], conds: [...ctx.conds, b.cond === 'else' ? `else ${it.head}` : [it.head, b.cond].filter(Boolean).join(' ')] });
          }
        }
      }
    };
    visit(k.items, { choice: null, condVars: [], conds: [] });
  }
  // производные: чтение y — чтение и его источника x
  for (const [y, xs] of derive) {
    for (const r of index.get(y).reads) {
      for (const x of xs) index.get(x).reads.push({ ...r, derived: y });
    }
  }
  return { index, derive };
}

const isWrite = (it) => it.type === 'code' && ASSIGN.test(it.text) && !/^temp\s/.test(it.text);

/**
 * Кнопки и их классы (checks.md «Классы кнопок»): узел → переменные → только реплика → без тела.
 * Группа — подряд идущие кнопки одного списка; сборка после неё может «оживить» пустую кнопку,
 * если читает переменную, которую пишет группа (meaningful-choice:§2).
 */
function buildButtons(tree, ids, vars) {
  const list = [];
  const groups = [];
  for (const k of tree.knots) {
    const chapter = chapterOfKnot(k);
    const scan = (items, seq) => {
      let i = 0;
      while (i < items.length) {
        if (items[i].type !== 'choice') {
          const it = items[i];
          if (it.type === 'cond') for (const b of it.branches) scan(b.items, []);
          i++;
          continue;
        }
        const group = { knot: k.id, chapter, buttons: [], line: items[i].line };
        while (i < items.length && (items[i].type === 'choice' || items[i].type === 'comment')) {
          if (items[i].type === 'choice') group.buttons.push(classify(items[i], k, ids, chapter));
          i++;
        }
        // что читает продолжение после сборки — до следующей группы кнопок
        const after = [];
        let j = i;
        while (j < items.length && items[j].type !== 'choice') after.push(items[j++]);
        const written = new Set(group.buttons.flatMap((b) => b.writes));
        if (written.size) {
          const readsAfter = new Set();
          walk(after, (it) => {
            if (it.type === 'cond') { idents(it.head).forEach((n) => readsAfter.add(n)); it.branches.forEach((b) => idents(b.cond).forEach((n) => readsAfter.add(n))); }
            if (it.type === 'msg' || it.type === 'me' || it.type === 'sys') textReads(it.text).forEach((n) => readsAfter.add(n));
            if (it.type === 'choice') it.conds.flatMap(idents).forEach((n) => readsAfter.add(n));
          });
          if ([...written].some((n) => readsAfter.has(n))) {
            for (const b of group.buttons) if (b.cls === 'none') { b.cls = 'vars'; b.indirect = true; }
          }
        }
        for (const b of group.buttons) b.group = group;
        group.cosmetic = group.buttons.every((b) => b.cls === 'reply' || b.cls === 'none');
        group.bodyless = group.buttons.every((b) => b.cls === 'none');
        groups.push(group);
        seq.push(group);
        list.push(...group.buttons);
        for (const b of group.buttons) scan(b.choice.items, []);
      }
      return seq;
    };
    // серии развилок подряд в одном узле — по корневому списку узла
    const top = scan(k.items, []);
    let streak = [];
    for (const g of top) {
      if (g.cosmetic) streak.push(g);
      else streak = [];
      g.streak = streak.length;
    }
  }
  return { list, groups };
}

function classify(choice, knot, ids, chapter) {
  let cls = 'none';
  let node = false;
  let varsW = false;
  let reply = false;
  const writes = [];
  walk(choice.items, (it) => {
    if (it.type === 'divert' && it.kind !== 'return') {
      if (it.target === 'END' || it.target === 'DONE') node = true;
      else {
        const to = resolveTarget(it.target, knot.id, ids);
        if (to && to !== knot.id) node = true;
      }
    }
    if (isWrite(it)) { varsW = true; writes.push(it.text.match(ASSIGN)[1]); }
    if (it.type === 'msg') reply = true;
  });
  if (node) cls = 'node';
  else if (varsW) cls = 'vars';
  else if (reply) cls = 'reply';
  return {
    choice, knot: knot.id, chapter, text: choice.text, line: choice.line, cls, writes,
    silent: 'silent' in choice.tags, to: choice.tags.to ?? null, conds: choice.conds,
  };
}

/**
 * Метки финалов с «подписью»: первая реплика после метки в том же списке. По ней видно, какую ветку
 * состояния прошёл прогон, если в одном узле несколько финалов. Метка над узлом подписи не имеет.
 */
function endingMarks(tree) {
  const out = [];
  for (const k of tree.knots) {
    for (const m of k.marks.filter((x) => x.kind === 'финал')) {
      const inLead = k.lead.some((c) => c.line === m.line && c.mark?.kind === 'финал');
      out.push({ node: k.id, name: m.value || k.id, line: m.line, signature: inLead ? null : signatureAfter(k.items, m.line) ?? null });
    }
  }
  return out;
}

function signatureAfter(items, line) {
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.type === 'comment' && it.line === line) {
      for (let j = i + 1; j < items.length; j++) {
        if (items[j].type === 'msg' || items[j].type === 'me' || items[j].type === 'sys') return items[j].text.split('{')[0].trim() || null;
        if (items[j].type === 'choice' || items[j].type === 'cond') break;
      }
      return null;
    }
    const nested = it.type === 'choice' ? [it.items] : it.type === 'cond' ? it.branches.map((b) => b.items) : [];
    for (const list of nested) {
      const s = signatureAfter(list, line);
      if (s !== undefined) return s;
    }
  }
  return undefined;
}
