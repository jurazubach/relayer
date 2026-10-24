// C-22. Новые имена и термины: сколько новых сущностей без пояснения игрок получает в начале, за сцену
// и в одной реплике. Регулярки грубые (кириллический жаргон им не виден) — это кандидаты для ревьюера.
import { fileURLToPath } from 'node:url';
import { walk } from '../../lib/ink.mjs';
import { listStories, loadStory, parseStory } from '../../lib/story.mjs';
import { isIncoming, median, visitShare } from '../journal.mjs';
import { heroNames, places, roots, short } from '../text.mjs';

const CATALOG = fileURLToPath(new URL('../../../src/stories/', import.meta.url));
let background = null;
/**
 * Фон для «редких слов»: корни других историй каталога. Корень, который часто звучит в этой истории и
 * не встречается в остальных, — кандидат в жаргон; общая лексика («потом», «сказал») есть везде.
 */
function corpus(n) {
  if (background) return background;
  background = new Map();
  try {
    for (const p of listStories(CATALOG)) {
      const st = loadStory(p);
      const set = new Set();
      for (const k of parseStory(st).knots) walk(k.items, (it) => { if (it.type === 'msg' || it.type === 'me' || it.type === 'choice') for (const r of roots(it.text, n)) set.add(r); });
      background.set(st.id, set);
    }
  } catch { /* каталога нет — без фона редких слов нет */ }
  return background;
}

// заглавная не в начале фразы: перед ней пробел, а до пробела — не конец фразы и не двоеточие
const CAP = /(?<![.!?…:]\s)(?<=\s)(\p{Lu}\p{Ll}{2,})/gu;
const LATIN = /[A-Za-z][A-Za-z0-9-]{2,}/g;
const NUMBER = /(?<![£$₽\d:])\b\d{2,}\b(?!:\d)/g;

export default {
  id: 'C-22',
  title: 'Новые имена и термины',
  plan: false,
  partial: true,
  model: true,
  run(ctx, find) {
    const { st, T, tree, meta } = ctx;
    const n = T.value('C-22.root');
    const known = new Set();
    for (const name of heroNames(ctx).keys()) known.add(name.slice(0, n));
    for (const k of ['логлайн', 'ставка']) for (const r of roots(tree.head[k] ?? '', n)) known.add(r);
    // редкие слова: ≥ C-22.rare_min раз в истории, но не в synopsis и не в первых входящих — кандидаты в жаргон
    const freq = new Map();
    for (const k of tree.knots) walk(k.items, (it) => { if (it.type === 'msg') for (const r of roots(it.text, n)) freq.set(r, (freq.get(r) ?? 0) + 1); });
    const synopsis = roots(`${meta.synopsis ?? ''} ${meta.tagline ?? ''}`, n);
    const first = ctx.runs[0]?.lines.filter(isIncoming).slice(0, T.value('C-22.known_lines')) ?? [];
    for (const l of first) for (const r of roots(l.text, n)) synopsis.add(r);
    const others = [...corpus(n)].filter(([id]) => id !== ctx.story.id).map(([, set]) => set);
    const common = (r) => !others.length || others.some((set) => set.has(r));
    const rare = new Set([...freq].filter(([r, c]) => c >= T.value('C-22.rare_min') && !synopsis.has(r) && !known.has(r) && !common(r)).map(([r]) => r));
    // латиница и числа без «сумм» и ЧЧ:ММ
    // сущность → вид: name (заглавная, латиница) | number | rare; ключ — по корню, чтобы «Лилиан» и «лилиан» были одним
    const entities = (text) => {
      const out = new Map();
      const add = (w, kind) => { const r = w.toLowerCase().slice(0, n); if (!out.has(r)) out.set(r, { w, kind }); };
      for (const m of text.matchAll(CAP)) { if (!known.has(m[1].toLowerCase().slice(0, n))) add(m[1], 'name'); }
      if (/[а-яё]/i.test(text)) for (const m of text.match(LATIN) ?? []) add(m, 'name');
      for (const m of text.match(NUMBER) ?? []) add(m, 'number');
      for (const w of text.toLowerCase().match(/\p{L}+/gu) ?? []) if (w.length >= n && rare.has(w.slice(0, n))) add(w, 'rare');
      return out;
    };
    const explain = T.re('dict.explain');

    const before = [];
    const first15 = [];
    const scenes = new Map();
    const lineHits = places();
    const spine = new Map(); // сущность → { runs, explainedAt: Set(узел) }
    for (const run of ctx.runs) {
      const seen = new Set();
      const inc = run.lines.filter(isIncoming);
      const firstChoice = run.choices[0]?.at ?? run.lines.length;
      let nBefore = 0;
      let n15 = 0;
      let scene = 0;
      let sceneKnot = null;
      let ci = 0;
      for (let i = 0; i < inc.length; i++) {
        const l = inc[i];
        while (ci < run.choices.length && run.choices[ci].at <= l.i) { ci++; scene = 0; sceneKnot = null; }
        const found = [...entities(l.text)].filter(([r]) => !seen.has(r));
        found.forEach(([r]) => seen.add(r));
        const fresh = found.map(([, e]) => e.w);
        const explained = explain.test(l.text) || explain.test(inc[i + 1]?.text ?? '');
        // термин хребта — имя или латиница; редкое слово и число терминами хребта не считаем
        for (const [, e] of found.filter(([, e]) => e.kind === 'name')) {
          if (!spine.has(e.w)) spine.set(e.w, { runs: 0, at: new Map() });
          const s = spine.get(e.w);
          s.runs++;
          if (explained) s.at.set(l.knot, true);
        }
        const unexplained = explained ? [] : fresh;
        if (l.i < firstChoice) nBefore += unexplained.length;
        if (i < T.value('C-22.first15_lines')) n15 += fresh.length;
        scene += unexplained.length;
        sceneKnot ??= l.knot;
        if (scene > T.value('C-22.scene')) {
          const p = scenes.get(sceneKnot) ?? { knot: sceneKnot, chapter: l.chapter, max: 0 };
          p.max = Math.max(p.max, scene);
          scenes.set(sceneKnot, p);
        }
        if (fresh.length > T.value('C-22.line')) {
          const p = lineHits.add(`${l.knot}|${l.text}`, () => ({ knot: l.knot, chapter: l.chapter, text: l.text, list: fresh, photo: l.kind === 'photo' }));
          p.list = fresh;
        }
      }
      before.push(nBefore);
      first15.push(n15);
    }
    const mb = median(before);
    if (mb > T.value('C-22.before_first')) find('C-22.before_first', { chapter: 1, message: `начало: ${mb} новых имён и терминов без пояснения до первой кнопки — игрок будет листать вверх` });
    const m15 = median(first15);
    if (m15 > T.value('C-22.first15')) find('C-22.first15', { chapter: 1, message: `первые входящие несут ${m15} новых сущностей` });
    for (const p of scenes.values()) find('C-22.scene', { node: p.knot, chapter: p.chapter, message: `${p.knot}: ${p.max} новых имён и терминов за сцену без пояснения` });
    for (const p of lineHits.values()) {
      // список имён не в #photo — уже не перегруз, а стена
      const names = p.list.filter((e) => /^\p{Lu}/u.test(e));
      const key = !p.photo && names.length > T.value('C-22.line_list') ? 'C-22.line_list' : 'C-22.line';
      find(key, { node: p.knot, chapter: p.chapter, message: `«${short(p.text, 50)}»: ${p.list.length} новых в одной реплике (${p.list.slice(0, 5).join(', ')})`, model: key === 'C-22.line' });
    }
    // термин хребта (звучит на всех путях) впервые поясняется в узле, который видят не все
    const visits = visitShare(ctx.runs);
    for (const [e, s] of spine) {
      if (s.runs < ctx.runs.length || !s.at.size) continue;
      const best = Math.max(...[...s.at.keys()].map((k) => visits.get(k) ?? 0));
      if (best < T.value('C-22.spine')) {
        const k = [...s.at.keys()][0];
        find('C-22.spine', { node: k, chapter: st.chapterOf(k), message: `«${e}» звучит на всех путях, а пояснение — только в ${k} (его видят не все)` });
      }
    }
  },
};
