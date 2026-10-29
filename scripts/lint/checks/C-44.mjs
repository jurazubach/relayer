// C-44. Голоса: профиль каждого контакта по шести метрикам. Пары с близким профилем, голос, который не
// меняется за историю, строки вне профиля, реплики против карточки голоса (R-75, ST-20). Метрики — кандидаты:
// решает слепой тест модели (style.blind_min). measure, voiceLines и cardMarkers берёт скрипт voice-stats скилла
// story-voice, чтобы его числа совпадали с проверкой.
import { walk } from '../../lib/ink.mjs';
import { plural, short } from '../text.mjs';

const EMOJI = /\p{Extended_Pictographic}/gu;
const HAS_EMOJI = /\p{Extended_Pictographic}/u;
export const METRICS = ['слов', 'со строчной', 'с точкой', '«!»', '«?»', 'эмодзи'];
export const measure = (t) => [
  t.split(/\s+/).filter(Boolean).length,
  /^\p{Ll}/u.test(t) ? 1 : 0,
  /\.$/.test(t) && !/\.\.$/.test(t) ? 1 : 0,
  t.includes('!') ? 1 : 0,
  t.includes('?') ? 1 : 0,
  (t.match(EMOJI) ?? []).length,
];
const mean = (rows, i) => rows.reduce((s, r) => s + r[i], 0) / (rows.length || 1);

/** Реплики контактов по дереву: как в движке, без #sys, #me, #photo, служебных и подстановок {…}. */
export function voiceLines(ctx) {
  const by = new Map(); // id -> [{ m, text, chapter, knot }]
  for (const k of ctx.tree.knots) {
    walk(k.items, (it) => {
      if (it.type !== 'msg' || !it.who || ctx.service.has(it.who) || 'photo' in it.tags) return;
      const text = it.text.replace(/\{[^{}]*\}/g, '').trim();
      if (!text) return;
      if (!by.has(it.who)) by.set(it.who, []);
      by.get(it.who).push({ m: measure(text), text, chapter: ctx.st.chapterOf(k.id), knot: k.id });
    });
  }
  return by;
}

const YOU = /(^|[^\p{L}])(ты|тебя|тебе|тобой|твой|твоя|твоё|твое|твои|твоего|твоей)(?!\p{L})/iu;
const VY = /(^|[^\p{L}])(вы|вас|вам|вами|ваш|ваша|ваше|ваши|вашего|вашей)(?!\p{L})/iu;

/**
 * Маркеры карточки голоса (characters[].voice — строка или поля): что карточка обещает о форме. Только то, что
 * можно сверить с репликой: регистр первой буквы, точка в конце, «без эмодзи», «ты» / «Вы».
 */
export function cardMarkers(voice) {
  if (!voice) return null;
  const t = (typeof voice === 'string' ? voice : Object.values(voice).flat().join(' · ')).toLowerCase();
  const out = {};
  if (/строчн|без заглавн|без больш/.test(t)) out.case = 'lower';
  else if (/заглавн|с большой/.test(t)) out.case = 'upper';
  if (/без точ|точек нет|не ставит точ/.test(t)) out.period = false;
  else if (/точк|точкой/.test(t)) out.period = true;
  if (/без эмодзи|ни одного эмодзи|эмодзи нет|не ставит эмодзи|не шлёт эмодзи/.test(t)) out.emoji = false;
  if (/на «?вы»?(?!\p{L})|«вы»/u.test(t)) out.address = 'вы';
  else if (/на «?ты»?(?!\p{L})|«ты»/u.test(t)) out.address = 'ты';
  return Object.keys(out).length ? out : null;
}

/** Расхождения реплик с маркерами: [{ marker, card, against, of }] — сколько реплик идут против карточки. */
export function cardMismatches(markers, texts) {
  const out = [];
  const n = texts.length;
  const count = (f) => texts.filter(f).length;
  if (markers.case === 'lower') out.push({ marker: 'строчные', against: count((x) => /^\p{Lu}/u.test(x)), of: n, what: 'с заглавной' });
  if (markers.case === 'upper') out.push({ marker: 'с заглавной', against: count((x) => /^\p{Ll}/u.test(x)), of: n, what: 'со строчной' });
  if (markers.period === false) out.push({ marker: 'без точки', against: count((x) => /[^.]\.$|^\.$/.test(x)), of: n, what: 'с точкой в конце' });
  if (markers.period === true) out.push({ marker: 'с точкой', against: count((x) => /[\p{L}\p{N}]$/u.test(x)), of: n, what: 'без знака в конце' });
  if (markers.emoji === false) out.push({ marker: 'без эмодзи', against: count((x) => HAS_EMOJI.test(x)), of: n, what: 'с эмодзи' });
  if (markers.address) {
    const other = markers.address === 'вы' ? YOU : VY;
    const own = markers.address === 'вы' ? VY : YOU;
    const addressed = texts.filter((x) => other.test(x) || own.test(x));
    out.push({ marker: `на «${markers.address === 'вы' ? 'Вы' : 'ты'}»`, against: addressed.filter((x) => other.test(x) && !own.test(x)).length, of: addressed.length, what: `на «${markers.address === 'вы' ? 'ты' : 'Вы'}»` });
  }
  return out;
}

export default {
  id: 'C-44',
  title: 'Голоса',
  plan: false,
  partial: true,
  model: true,
  run(ctx, find) {
    const { T, meta } = ctx;
    const by = voiceLines(ctx);
    // карточка голоса против реплик — у любого контакта от C-44.card_min_lines: голос держит и эпизодический
    for (const c of meta.characters ?? []) {
      const markers = cardMarkers(c.voice);
      const rows = by.get(c.id) ?? [];
      if (!markers || rows.length < T.value('C-44.card_min_lines')) continue;
      const bad = cardMismatches(markers, rows.map((r) => r.text)).filter((x) => x.of && x.against / x.of > T.value('C-44.card_share'));
      if (bad.length) {
        const first = rows.find((r) => cardMismatches(markers, [r.text]).some((x) => x.against));
        find('C-44.card_share', { node: first?.knot, chapter: first?.chapter, message: `${c.id}: реплики против карточки голоса — ${bad.map((x) => `${x.marker} в карточке, а ${x.what} ${x.against} из ${x.of}`).join('; ')} (например, «${short(first?.text ?? '')}»)` });
      }
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
