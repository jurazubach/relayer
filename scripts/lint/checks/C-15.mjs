// C-15. Недостижимое: условная кнопка не показана ни разу, редкий вариант, порог выше максимума переменной,
// блок без else, узел, куда бот почти не заходит, длинная редкая ветка (R-36), отклик в общем стволе на запись
// единиц прогонов (meaningful-choice:contra-9). Случайный бот недооценивает целенаправленную игру.
import { walk } from '../../lib/ink.mjs';
import { cleanText } from '../static.mjs';
import { median, visitShare } from '../journal.mjs';
import { pct, plural, short } from '../text.mjs';

const lineCount = (items) => { let n = 0; walk(items, (it) => { if (it.type === 'msg' || it.type === 'me' || it.type === 'sys') n++; }); return n; };

const IDENT = /[\p{L}_][\p{L}\p{N}_]*/gu;
// доля без «0 %»: запись в одном прогоне из 400 — не ноль
const share = (x) => (x < 0.01 ? `${(x * 100).toFixed(1).replace('.', ',')} %` : pct(x));

const num = (v) => (typeof v === 'number' ? v : v === true ? 1 : v === false ? 0 : Number(v));

export default {
  id: 'C-15',
  title: 'Недостижимое',
  plan: false,
  partial: false,
  run(ctx, find) {
    const { st, T, tree } = ctx;
    const runs = ctx.runs;
    if (!runs.length) return;
    // показы кнопок по прохождениям, а не по показам
    const shown = new Map();
    for (const r of runs) {
      const seen = new Set();
      for (const c of r.choices) for (const t of c.texts) seen.add(`${c.knot}|${cleanText(t)}`);
      for (const k of seen) shown.set(k, (shown.get(k) ?? 0) + 1);
    }
    const visits = visitShare(runs);
    for (const b of st.buttons.list) {
      if (!b.conds.length || /\{/.test(b.text) || !cleanText(b.text) || b.knot.startsWith('test_')) continue;
      if (!visits.get(b.knot)) continue; // в узел не зашли — это (д), а не условие
      const n = shown.get(`${b.knot}|${cleanText(b.text)}`) ?? 0;
      if (n === T.value('C-15.never')) find('C-15.never', { node: b.knot, chapter: b.chapter, message: `вариант «${short(b.text)}» не показан ни разу за ${runs.length} прохождений — условие {${b.conds.join('} {')}} перекрыто или недостижимо` });
      else if (n / runs.length < T.value('C-15.rare_button')) find('C-15.rare_button', { node: b.knot, chapter: b.chapter, message: `вариант «${short(b.text)}» показан в ${pct(n / runs.length)} прохождений` });
    }

    // (в) порог x >= N выше максимума x по прогонам
    const init = new Map(tree.vars.filter((v) => v.kind === 'VAR').map((v) => [v.name, num(v.value)]));
    const max = new Map(init);
    for (const r of runs) for (const e of r.vars) { const x = num(e.value); if (Number.isFinite(x) && x > (max.get(e.name) ?? -Infinity)) max.set(e.name, x); }
    const reported = new Set();
    for (const k of tree.knots) {
      walk(k.items, (it) => {
        const conds = it.type === 'choice' ? it.conds : it.type === 'cond' ? [it.head, ...it.branches.map((b) => b.cond)] : [];
        for (const c of conds) {
          for (const m of String(c).matchAll(/([\p{L}_][\p{L}\p{N}_]*)\s*(>=|>)\s*(\d+)/gu)) {
            const need = Number(m[3]) + (m[2] === '>' ? 1 : 0);
            const top = max.get(m[1]);
            if (top == null || !Number.isFinite(top) || top >= need || reported.has(`${k.id}|${m[0]}`)) continue;
            reported.add(`${k.id}|${m[0]}`);
            find('C-15.threshold_unreached', { node: k.id, chapter: st.chapterOf(k.id), message: `${m[0]} в ${k.id}: ${m[1]} не поднимался выше ${top} за ${runs.length} прохождений` });
          }
        }
        if (it.type === 'cond' && it.branches.length >= 2 && !it.branches.some((b) => b.cond === 'else')) {
          find('C-15.no_else', { node: k.id, chapter: st.chapterOf(k.id), message: `${k.id}: блок из ${it.branches.length} веток без else` });
        }
      });
    }

    // (д) редкий узел: не финал и не test_*
    for (const k of tree.knots) {
      if (st.finals.has(k.id) || k.id.startsWith('test_') || k.id === 'beta_stop') continue;
      const v = visits.get(k.id) ?? 0;
      if (v < T.value('C-15.rare_node')) find('C-15.rare_node', { node: k.id, chapter: st.chapterOf(k.id), message: `${k.id}: посещён в ${pct(v)} прогонов — достижим ли он целенаправленно?` });
    }

    // (е) редкая ветка длиннее порога (R-36). Ветка — связная по переходам группа редких узлов: редкая сцена часто
    // занимает несколько узлов и прерывается общим туннелем. Длина — медиана строк группы по прогонам, которые в неё
    // зашли, с первой строки узла. Финалы не в счёт: финал не необязательная сторона, его доли — C-06 и story:endings.
    const rareShare = T.value('C-15.rare_branch_share');
    const ending = new Set(st.endings.endings.map((e) => e.id));
    const isRare = (id) => !!id && st.byId.has(id) && !st.finals.has(id) && !ending.has(id) && !id.startsWith('test_') && id !== 'beta_stop' && (visits.get(id) ?? 0) < rareShare;
    const root = new Map(tree.knots.filter((k) => isRare(k.id)).map((k) => [k.id, k.id]));
    const top = (id) => { while (root.get(id) !== id) id = root.get(id); return id; };
    for (const a of root.keys()) for (const e of st.edges.get(a) ?? []) if (root.has(e.to)) root.set(top(e.to), top(a));
    // от каждого редкого узла — строки группы с его первой строки: развилка внутри редкой сцены не размывает медиану
    // короткими прогонами, которые свернули раньше
    const lens = new Map(); // узел -> длины по прогонам
    const route = new Map(); // узел -> узлы группы после него в первом прогоне, который через него прошёл
    for (const r of runs) {
      const from = new Map(); // узел -> индекс первой строки
      const gl = r.lines.map((l) => (root.has(l.knot) ? top(l.knot) : null));
      r.lines.forEach((l, i) => { if (gl[i] && !from.has(l.knot)) from.set(l.knot, i); });
      for (const [id, i] of from) {
        const g = top(id);
        let n = 0;
        for (let j = i; j < gl.length; j++) if (gl[j] === g) n++;
        lens.set(id, [...(lens.get(id) ?? []), n]);
        if (!route.has(id)) route.set(id, [...new Set(r.lines.slice(i).filter((l, j) => gl[i + j] === g).map((l) => l.knot))]);
      }
    }
    const flagged = new Map(); // группа -> самый частый узел, от которого ветка длинная
    for (const [id, l] of lens) {
      if (median(l) < T.value('C-15.rare_branch_msgs')) continue;
      const g = top(id);
      const was = flagged.get(g);
      if (!was || l.length > lens.get(was).length) flagged.set(g, id);
    }
    for (const start of flagged.values()) {
      const path = route.get(start);
      const n = median(lens.get(start));
      find('C-15.rare_branch_msgs', { node: start, chapter: st.chapterOf(start), message: `ветка ${path.slice(0, 3).join(' → ')}${path.length > 3 ? ' → …' : ''}: в неё попадают ${share(lens.get(start).length / runs.length)} прогонов, а в ней ${plural(n, 'сообщение', 'сообщения', 'сообщений')} — дорогой текст для меньшинства: сократи или перенеси главное на видный путь` });
    }
    // кнопка, которую жмут реже доли, с длинным текстом под собой в общем узле (в редком узле его считает ветка)
    const picked = new Map();
    for (const r of runs) {
      const seen = new Set();
      for (const c of r.choices) seen.add(`${c.knot}|${cleanText(c.texts[c.picked])}`);
      for (const k of seen) picked.set(k, (picked.get(k) ?? 0) + 1);
    }
    for (const b of st.buttons.list) {
      if (isRare(b.knot) || b.knot.startsWith('test_') || !visits.get(b.knot) || /\{/.test(b.text)) continue;
      const part = (picked.get(`${b.knot}|${cleanText(b.text)}`) ?? 0) / runs.length;
      const n = lineCount(b.choice.items);
      if (part < rareShare && n >= T.value('C-15.rare_branch_msgs')) find('C-15.rare_branch_msgs', { node: b.knot, chapter: b.chapter, message: `кнопку «${short(b.text)}» жмут в ${pct(part)} прогонов, а под ней ${plural(n, 'сообщение', 'сообщения', 'сообщений')} — дорогой текст для меньшинства` });
    }

    // (ж) отклик в общем стволе на запись единиц прогонов (meaningful-choice:contra-9): редкая ветка получает сцену
    // внутри себя, а условная реплика в узле, который проходит заметная доля, напишется для немногих
    const wrote = new Map();
    for (const r of runs) for (const name of new Set(r.vars.map((e) => e.name))) wrote.set(name, (wrote.get(name) ?? 0) + 1);
    const scarce = new Map([...st.vars.index.values()]
      .map((v) => [v.name, (wrote.get(v.name) ?? 0) / runs.length])
      .filter(([, x]) => x > 0 && x < T.value('C-15.echo_skip_share')));
    const said = new Set();
    for (const k of tree.knots) {
      if (k.id.startsWith('test_') || (visits.get(k.id) ?? 0) < T.value('C-15.echo_required_share')) continue;
      const own = new Set([...st.vars.index.values()].filter((v) => v.writes.some((w) => w.node === k.id)).map((v) => v.name));
      const hit = (expr) => (String(expr).replace(/"[^"]*"/g, ' ').match(IDENT) ?? []).filter((n) => scarce.has(n) && !own.has(n) && !said.has(n));
      const report = (names) => {
        for (const n of new Set(names)) {
          said.add(n);
          find('C-15.echo_skip_share', { node: k.id, chapter: st.chapterOf(k.id), message: `отклик на ${n} в ${k.id}: узел проходят ${pct(visits.get(k.id))} прогонов, а ${n} пишут ${share(scarce.get(n))} — реплику увидят единицы; сцену дай внутри редкой ветки` });
        }
      };
      walk(k.items, (it) => {
        if (it.type === 'choice') report(it.conds.flatMap(hit));
        if ((it.type === 'msg' || it.type === 'me' || it.type === 'sys') && /\{[^{}]*:/.test(it.text)) report([...it.text.matchAll(/\{([^{}:]*):/g)].flatMap((m) => hit(m[1])));
        // блок считается откликом, только если его ветка говорит то, чего нет в соседних: условие, которое меняет
        // одну паузу, — механика, а не отклик
        if (it.type === 'cond') {
          const texts = it.branches.map((br) => { const out = new Set(); walk(br.items, (x) => { if (x.type === 'msg' || x.type === 'me' || x.type === 'sys') out.add(cleanText(x.text)); }); return out; });
          it.branches.forEach((br, i) => {
            const names = [...hit(it.head), ...(br.cond === 'else' ? [] : hit(br.cond))];
            if (!names.length) return;
            const others = new Set(texts.filter((_, j) => j !== i).flatMap((t) => [...t]));
            if ([...texts[i]].some((t) => !others.has(t))) report(names);
          });
        }
      });
    }
  },
};
