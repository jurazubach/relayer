// C-44. Голоса: профиль каждого контакта по шести метрикам. Пары с близким профилем, голос, который не
// меняется за историю, строки вне профиля. Метрики — кандидаты: решает слепой тест модели (style.blind_min).
import { walk } from '../../lib/ink.mjs';
import { plural, short } from '../text.mjs';

const EMOJI = /\p{Extended_Pictographic}/gu;
const METRICS = ['слов', 'со строчной', 'с точкой', '«!»', '«?»', 'эмодзи'];
const measure = (t) => [
  t.split(/\s+/).filter(Boolean).length,
  /^\p{Ll}/u.test(t) ? 1 : 0,
  /\.$/.test(t) && !/\.\.$/.test(t) ? 1 : 0,
  t.includes('!') ? 1 : 0,
  t.includes('?') ? 1 : 0,
  (t.match(EMOJI) ?? []).length,
];
const mean = (rows, i) => rows.reduce((s, r) => s + r[i], 0) / (rows.length || 1);

export default {
  id: 'C-44',
  title: 'Голоса',
  plan: false,
  partial: true,
  model: true,
  run(ctx, find) {
    const { st, T, tree } = ctx;
    const by = new Map(); // id -> [{ m, text, chapter, knot }]
    for (const k of tree.knots) {
      walk(k.items, (it) => {
        if (it.type !== 'msg' || !it.who || ctx.service.has(it.who) || 'photo' in it.tags) return;
        const text = it.text.replace(/\{[^{}]*\}/g, '').trim();
        if (!text) return;
        if (!by.has(it.who)) by.set(it.who, []);
        by.get(it.who).push({ m: measure(text), text, chapter: st.chapterOf(k.id), knot: k.id });
      });
    }
    const cast = [...by].filter(([, rows]) => rows.length >= T.value('C-44.min_lines'));
    if (cast.length < 1) return;
    const prof = new Map(cast.map(([id, rows]) => [id, METRICS.map((_, i) => mean(rows.map((r) => r.m), i))]));
    const range = METRICS.map((_, i) => {
      const xs = [...prof.values()].map((p) => p[i]);
      return Math.max(...xs) - Math.min(...xs) || 1;
    });
    const dist = (a, b) => a.reduce((s, x, i) => s + Math.abs(x - b[i]) / range[i], 0) / a.length;
    const ids = [...prof.keys()];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const d = dist(prof.get(ids[i]), prof.get(ids[j]));
        if (d < T.value('C-44.distance')) {
          const close = METRICS.filter((_, m) => Math.abs(prof.get(ids[i])[m] - prof.get(ids[j])[m]) / range[m] < T.value('C-44.distance'));
          find('C-44.distance', { message: `${ids[i]} и ${ids[j]} пишут похоже (расстояние ${String(Math.round(d * 100) / 100).replace('.', ',')}): ${close.join(', ')}` });
        }
      }
    }
    for (const [id, rows] of cast) {
      // голос от первой до последней главы присутствия
      const chs = [...new Set(rows.map((r) => r.chapter))].sort((a, b) => a - b);
      if (chs.length >= 2) {
        const a = rows.filter((r) => r.chapter === chs[0]).map((r) => r.m);
        const b = rows.filter((r) => r.chapter === chs.at(-1)).map((r) => r.m);
        const same = METRICS.every((_, i) => Math.abs(mean(a, i) - mean(b, i)) / range[i] < T.value('C-44.static_voice'));
        if (same) find('C-44.static_voice', { chapter: chs.at(-1), message: `${id} звучит одинаково от главы ${chs[0]} до главы ${chs.at(-1)}` });
      }
      // строки вне профиля: ≥ N признаков дальше kσ
      const mu = METRICS.map((_, i) => mean(rows.map((r) => r.m), i));
      const sd = METRICS.map((_, i) => Math.sqrt(mean(rows.map((r) => [(r.m[i] - mu[i]) ** 2]), 0)) || 1);
      const out = rows.filter((r) => r.m.filter((x, i) => Math.abs(x - mu[i]) / sd[i] > T.value('C-44.outlier_sigma')).length >= T.value('C-44.outlier_features'));
      if (out.length) find('C-44.outlier_features', { node: out[0].knot, chapter: out[0].chapter, message: `${id}: ${plural(out.length, 'строка', 'строки', 'строк')} вне профиля голоса (например, «${short(out[0].text)}»)` });
    }
  },
};
