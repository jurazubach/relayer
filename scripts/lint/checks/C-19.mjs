// C-19. Хабы: узел, который возвращается сам в себя (-> себя или -> своя метка сборки). Правила 1–8
// по дереву; перебор порядков спиц заменён статикой: одинаковые строки в разных спицах.
import { resolveTarget, walk } from '../../lib/ink.mjs';
import { plural, short } from '../text.mjs';

const IDENT = /[\p{L}_][\p{L}\p{N}_.]*/gu;

const lineCount = (items) => { let n = 0; walk(items, (it) => { if (it.type === 'msg' || it.type === 'me' || it.type === 'sys') n++; }); return n; };

export default {
  id: 'C-19',
  title: 'Хабы',
  plan: true,
  partial: true,
  run(ctx, find) {
    const { st, T } = ctx;
    const risk = T.re('dict.risk');
    // имена в условиях и подстановках по главам: так читается счётчик посещений метки спицы «* (asked) […]»
    const named = [];
    for (const k of ctx.tree.knots) {
      const ch = st.chapterOf(k.id);
      const add = (expr) => { for (const m of String(expr).replace(/"[^"]*"/g, ' ').matchAll(IDENT)) named.push({ name: m[0], ch, node: k.id }); };
      walk(k.items, (it) => {
        if (it.type === 'choice') it.conds.forEach(add);
        if (it.type === 'cond') [it.head, ...it.branches.map((b) => b.cond)].forEach(add);
        if (it.type === 'msg' || it.type === 'me' || it.type === 'sys' || it.type === 'choice') for (const m of String(it.text).matchAll(/\{([^{}|]*)[:}]/g)) add(m[1]);
      });
    }
    for (const [id, edges] of st.edges) {
      if (!edges.some((e) => e.to === id && e.kind !== 'tunnel')) continue;
      const k = st.byId.get(id);
      const spokes = st.buttons.list.filter((b) => b.knot === id);
      if (!spokes.length) continue;
      const at = { node: id, chapter: st.chapterOf(id) };
      const back = (b) => {
        let self = false;
        walk(b.choice.items, (it) => { if (it.type === 'divert' && (it.target === id || st.labels.get(id)?.has(it.target))) self = true; });
        return self;
      };
      const exits = spokes.filter((b) => !back(b) && b.cls === 'node');
      // 1. нет выхода по условию или «+». Видимый простой выход — другой случай, чем «уйти можно, только перебрав
      // всё»: уйти можно сразу, ничего не спросив (inkle-ingold:PAT-06, ловушки). Ключ один, сообщение — по случаю.
      if (exits.filter((b) => b.choice.sticky || b.conds.length).length === T.value('C-19.no_exit')) {
        const plain = exits.filter((b) => b.text.trim());
        find('C-19.no_exit', {
          ...at,
          message: plain.length
            ? `хаб ${id}: выход «${short(plain[0].text)}» доступен сразу и без условия — можно уйти, ничего не спросив; нет ни + , ни выхода по счётчику`
            : `хаб ${id}: нет выхода по условию или кнопки + — уйти можно, только перебрав все варианты`,
        });
      }
      // 2. число вариантов
      if (spokes.length < T.value('C-19.spokes_min') || spokes.length > T.value('C-19.spokes_max')) {
        find(spokes.length < T.value('C-19.spokes_min') ? 'C-19.spokes_min' : 'C-19.spokes_max', { ...at, message: `хаб ${id}: ${spokes.length} вариантов` });
      }
      // 3. анкета: варианты к одному #to без ~, которые возвращаются в хаб
      const survey = new Map();
      for (const b of spokes) if (b.to && !b.writes.length && back(b)) survey.set(b.to, (survey.get(b.to) ?? 0) + 1);
      for (const [to, n] of survey) if (n >= T.value('C-19.survey')) find('C-19.survey', { ...at, message: `хаб ${id}: ${n} вопроса к ${to} без последствий — разговор-анкета` });
      // 4. выход без предупреждения: нет #label и слов риска в строках над кнопками
      const text = [];
      walk(k.items, (it, path) => { if (!path.length && (it.type === 'msg' || it.type === 'sys')) text.push(it.text); });
      const warned = text.slice(-T.value('C-19.exit_window')).some((t) => risk.test(t.toLowerCase()));
      for (const b of exits) {
        if (b.choice.tags.label == null && !warned) find('C-19.exit_unwarned', { ...at, message: `хаб ${id} закрывается кнопкой «${short(b.text)}» без предупреждения` });
      }
      // 5. тонкая спица
      for (const b of spokes.filter(back)) {
        if (lineCount(b.choice.items) <= T.value('C-19.thin_spoke')) find('C-19.thin_spoke', { ...at, message: `хаб ${id}: «${short(b.text)}» даёт ${lineCount(b.choice.items)} строку и возвращает обратно` });
      }
      // 6. одинаковые входящие в разных спицах
      const seen = new Map();
      spokes.forEach((b, i) => walk(b.choice.items, (it) => {
        if (it.type !== 'msg' || it.text.length < 2) return;
        if (seen.has(it.text) && seen.get(it.text) !== i) find('C-19.same_lines', { ...at, message: `хаб ${id}: «${short(it.text)}» звучит в разных ветках — при другом порядке обхода игрок прочтёт её дважды` });
        else seen.set(it.text, i);
      }));
      // 7. спица читает переменную соседней спицы без условия
      spokes.forEach((b, i) => {
        const others = new Set(spokes.filter((_, j) => j !== i).flatMap((x) => x.writes));
        walk(b.choice.items, (it, path) => {
          if (it.type !== 'msg' || path.some((p) => p.type === 'cond')) return;
          for (const m of it.text.matchAll(/\{([\p{L}_][\p{L}\p{N}_]*)\}/gu)) {
            if (others.has(m[1])) find('C-19.sibling_read', { ...at, message: `хаб ${id}: «${short(b.text)}» подставляет «${m[1]}», которую ставит соседняя ветка, — при другом порядке там пусто` });
          }
        });
      });
      // 8. длинный отросток без флага (R-36): спица, которая возвращается в хаб, длиннее порога реплик, но не
      // пишет ничего, что прочтут в этой или следующей главе. Реплики туннеля из спицы — тоже её.
      const ch = st.chapterOf(id);
      const near = (c) => c == null || (c >= ch && c <= ch + 1); // функция без главы: где вызовут, неизвестно
      for (const b of spokes.filter(back)) {
        let n = lineCount(b.choice.items);
        const writes = new Set(b.writes);
        walk(b.choice.items, (it) => {
          if (it.type !== 'divert' || it.kind !== 'tunnel') return;
          const to = resolveTarget(it.target, id, st.ids);
          if (!to || !st.byId.has(to)) return;
          n += lineCount(st.byId.get(to).items);
          for (const v of st.vars.index.values()) if (v.writes.some((w) => w.node === to)) writes.add(v.name);
        });
        if (n <= T.value('C-19.spur_msgs')) continue;
        const read = [...writes].some((v) => st.vars.index.get(v)?.reads.some((r) => near(r.chapter)));
        const label = b.choice.label && named.some((x) => near(x.ch) && (x.name === b.choice.label || x.name === `${id}.${b.choice.label}`));
        if (read || label) continue;
        find('C-19.spur_msgs', {
          ...at,
          message: writes.size
            ? `хаб ${id}: «${short(b.text)}» — ${plural(n, 'реплика', 'реплики', 'реплик')} и обратно, ставит ${[...writes].join(', ')}, но не читают ни в главе ${ch}, ни в ${ch + 1}`
            : `хаб ${id}: «${short(b.text)}» — ${plural(n, 'реплика', 'реплики', 'реплик')} и обратно без флага: отросток ничего не оставляет`,
        });
      }
    }
  },
};
