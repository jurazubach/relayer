// C-49. Факты, хронология, карточка: числа карточки есть в тексте, synopsis не спойлерит поздних героев и
// называет роль игрока, пункты features звучат в истории, затравки — из завязки и главы 1, обещанные финалы
// есть, глав карточка не называет (A-08). Хронология — по docs/stories/<id>/facts.md, если он есть; ложь героя
// помечается «// намеренно: C-49 ложь». Таблица фактов — для глаз, без вердикта.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { walk } from '../../lib/ink.mjs';
import { endingCandidates, endingOf } from '../endings.mjs';
import { isIncoming } from '../journal.mjs';
import { returnDeadline, roots, short } from '../text.mjs';

const NUMERALS = ['один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять', 'десять'];
const FEMININE = { одна: 1, две: 2 };

/** Основа имени с левой границей слова: «Ника» не находится в «техника». */
const nameRe = (name) => new RegExp(`(?<!\\p{L})${name.split(/\s+/)[0].toLowerCase().slice(0, 4)}`, 'u');

export default {
  id: 'C-49',
  title: 'Факты, хронология, карточка',
  plan: false,
  partial: false,
  model: true,
  run(ctx, find) {
    const { st, T, tree, meta, story } = ctx;
    const texts = [];
    for (const k of tree.knots) walk(k.items, (it) => { if ((it.type === 'msg' || it.type === 'me' || it.type === 'sys' || it.type === 'choice') && !('chapter' in (it.tags ?? {}))) texts.push({ text: it.text, knot: k.id, who: it.who, chapter: st.chapterOf(k.id) ?? 1 }); });
    const all = texts.map((x) => x.text.toLowerCase()).join('\n');
    // в какой главе слово впервые звучит в тексте (реплики, кнопки, системные строки)
    const firstMention = (re) => Math.min(...texts.filter((x) => re.test(x.text.toLowerCase())).map((x) => x.chapter), Infinity);
    // (а) числа карточки
    const card = `${meta.tagline ?? ''} ${meta.synopsis ?? ''}`;
    const nums = new Set([...(card.match(/\d+/g) ?? []), ...(card.toLowerCase().match(T.re('dict.numerals').source.includes('|') ? new RegExp(`(?<!\\p{L})(${T.value('dict.numerals')})(?!\\p{L})`, 'gu') : /$^/g) ?? [])]);
    for (const n of nums) if (!all.includes(n)) find('C-49.card_number', { message: `в описании «${n}», в сценарии такого числа нет` });
    // (б) герой из synopsis впервые пишет после главы 2 — спойлер, если игрок не слышит его имя в главе 1
    const firstCh = new Map();
    for (const k of tree.knots) walk(k.items, (it) => { if (it.type === 'msg' && it.who) { const c = st.chapterOf(k.id); if (!firstCh.has(it.who) || firstCh.get(it.who) > c) firstCh.set(it.who, c); } });
    const heroes = (meta.characters ?? []).filter((c) => c.id && c.name && !c.service);
    for (const c of heroes) {
      const re = nameRe(c.name);
      if (!re.test((meta.synopsis ?? '').toLowerCase()) || (firstCh.get(c.id) ?? 0) <= T.value('C-49.spoiler_chapter')) continue;
      if (firstMention(re) <= T.value('C-49.known_chapter')) continue;
      find('C-49.spoiler_chapter', { message: `synopsis называет «${c.name}», а он пишет впервые в главе ${firstCh.get(c.id)} и до этого не звучит — спойлер карточки` });
    }
    // (в) роль игрока в synopsis
    if (meta.synopsis && !T.re('dict.player_role').test(meta.synopsis.toLowerCase())) find('C-49.no_role', { message: 'в питче нет роли игрока: ни «ты», ни «вы»' });
    // (г) хронология facts.md: время ЧЧ:ММ, которого в ней нет
    const facts = join('docs/stories', story.id ?? '', 'facts.md');
    if (existsSync(facts)) {
      const known = new Set(readFileSync(facts, 'utf8').match(/\d{1,2}:\d\d/g) ?? []);
      for (const x of texts) for (const t of x.text.match(/\d{1,2}:\d\d/g) ?? []) if (!known.has(t)) find('C-49.facts', { node: x.knot, chapter: st.chapterOf(x.knot), message: `${x.knot}: время ${t} в «${short(x.text, 30)}» — нет в хронологии facts.md` });
    }
    // таблица фактов для глаз: слово-якорь рядом с разными числами
    const win = T.value('C-49.anchor_window');
    const anchors = new Map();
    for (const x of texts) {
      const w = x.text.toLowerCase().match(/[\p{L}\d:]+/gu) ?? [];
      w.forEach((tok, i) => {
        if (!/^\d+$/.test(tok)) return;
        for (const a of w.slice(Math.max(0, i - win), i + win + 1)) {
          if (a.length < T.value('C-49.root') || /\d/.test(a)) continue;
          const r = a.slice(0, T.value('C-49.root'));
          if (!anchors.has(r)) anchors.set(r, new Map());
          anchors.get(r).set(tok, x.knot);
        }
      });
    }
    const table = [...anchors].filter(([, m]) => m.size >= 2).map(([anchor, m]) => ({ anchor, numbers: [...m.keys()], knots: [...new Set(m.values())] }));
    if (table.length) find('C-49.facts', { message: `таблица фактов: ${table.length} слов-якорей стоят рядом с разными числами (${table.slice(0, 4).map((x) => `${x.anchor}…: ${x.numbers.slice(0, 3).join(', ')}`).join('; ')}) — для сверки с хронологией, полная таблица в --json`, data: { table } });
    // (д) synopsis пересказывает первые входящие
    const first = ctx.runs[0]?.lines.filter(isIncoming).slice(0, T.value('C-49.overlap_lines')) ?? [];
    const head = new Set();
    for (const l of first) for (const m of l.text.match(/\p{Lu}\p{Ll}{2,}|\d+/gu) ?? []) head.add(m.toLowerCase().slice(0, 4));
    const syn = new Set((meta.synopsis ?? '').match(/\p{Lu}\p{Ll}{2,}|\d+/gu)?.map((m) => m.toLowerCase().slice(0, 4)) ?? []);
    const overlap = [...syn].filter((x) => head.has(x));
    if (overlap.length > T.value('C-49.synopsis_overlap')) find('C-49.synopsis_overlap', { message: `synopsis и первые входящие совпадают на ${overlap.length} конкретных (${overlap.join(', ')}) — карточка пересказывает начало` });
    // (е) пункты features звучат в тексте, хотя бы один — в главе 1; пункт о финалах сверяет (з), а не слова
    const n = T.value('C-49.root');
    const endingsWord = T.re('C-49.endings_word');
    const textRoots = new Set(texts.flatMap((x) => [...roots(x.text, n)]));
    const ch1Roots = new Set(texts.filter((x) => x.chapter === 1).flatMap((x) => [...roots(x.text, n)]));
    let inCh1 = 0;
    for (const f of meta.features ?? []) {
      const rs = [...roots(f, n)];
      if (!endingsWord.test(f) && !rs.some((r) => textRoots.has(r))) find('C-49.feature_absent', { message: `пункт карточки «${short(f)}» не звучит ни в одной реплике и кнопке` });
      if (rs.some((r) => ch1Roots.has(r))) inCh1++;
    }
    if ((meta.features ?? []).length && inCh1 === T.value('C-49.feature_ch1')) find('C-49.feature_ch1', { chapter: 1, message: 'ни один пункт карточки не звучит в главе 1 — обещание сбывается слишком поздно' });
    // (ж) затравки: 2–3, из завязки и главы 1, без поздних имён и чисел, по docs/style.md
    if (Array.isArray(meta.teasers)) teasersCheck(ctx, find, { texts, heroes, firstMention, firstCh });
    // (и) глав игрок не видит (A-08): карточка не возвращает их словами; series («Сезон 2») — название, не счёт
    const chapterWord = T.re('C-49.chapter_word');
    const fields = [['tagline', meta.tagline], ['synopsis', meta.synopsis], ...(meta.features ?? []).map((f, i) => [`features ${i + 1}`, f]), ...(Array.isArray(meta.teasers) ? meta.teasers.map((t, i) => [`затравка ${i + 1}`, t]) : [])];
    for (const [field, text] of fields) {
      const m = typeof text === 'string' && text.match(chapterWord);
      if (m) find('C-49.chapter_word', { message: `${field} «${short(text)}»: «${m[0]}» — глав игрок не видит (A-08), масштаб истории говорят два времени карточки` });
    }
    // (з) карточка обещает финалы — столько их и есть у обычного игрока
    const promise = [...(meta.features ?? []), meta.tagline ?? '', meta.synopsis ?? ''].find((f) => endingsWord.test(f) && promisedEndings(f) !== 1);
    if (promise) {
      const got = endingsCount(ctx);
      const want = promisedEndings(promise) ?? T.value('C-49.endings_min');
      if (got < Math.max(want, T.value('C-49.endings_min'))) find('C-49.endings_min', { message: `карточка обещает финалы («${short(promise)}»), а у прохождений бота их ${got}` });
    }
  },
};

/** Сколько финалов обещает строка: число или числительное рядом со словом; null — «несколько». */
function promisedEndings(text) {
  const t = text.toLowerCase();
  const digit = t.match(/(\d+)\s+\p{L}*/u);
  if (digit) return Number(digit[1]);
  for (const [w, v] of Object.entries(FEMININE)) if (new RegExp(`(?<!\\p{L})${w}(?!\\p{L})`, 'u').test(t)) return v;
  const i = NUMERALS.findIndex((w) => new RegExp(`(?<!\\p{L})${w}(?!\\p{L})`, 'u').test(t));
  return i >= 0 ? i + 1 : null;
}

/** Финалы, до которых доходит бот: та же раскладка, что у C-40 и story:endings. */
function endingsCount(ctx) {
  const cand = endingCandidates(ctx.st);
  return new Set(ctx.runs.filter((r) => r.ended).map((r) => endingOf(r, ctx.st, cand)).filter(Boolean)).size;
}

function teasersCheck(ctx, find, { texts, heroes, firstMention, firstCh }) {
  const { T, meta } = ctx;
  const list = meta.teasers.filter((t) => typeof t === 'string' && t.trim());
  const { min, max } = T.value('C-49.teasers');
  if (list.length < min || list.length > max) find('C-49.teasers', { message: `затравок ${list.length}, на карточке их ${min}–${max}: карточка показывает первые ${max}` });
  const early = T.value('C-49.teaser_chapter');
  const n = T.value('C-49.root');
  const ground = new Set([
    ...roots(`${meta.tagline ?? ''} ${meta.synopsis ?? ''} ${meta.chapters?.[0]?.about ?? ''}`, n),
    ...texts.filter((x) => x.chapter <= early).flatMap((x) => [...roots(x.text, n)]),
  ]);
  const earlyText = texts.filter((x) => x.chapter <= early).map((x) => x.text.toLowerCase()).join('\n');
  list.forEach((t, i) => {
    const where = `затравка ${i + 1} «${short(t)}»`;
    const low = t.toLowerCase();
    for (const c of heroes) {
      const re = nameRe(c.name);
      if (!re.test(low)) continue;
      const at = Math.min(firstMention(re), firstCh.get(c.id) ?? Infinity);
      if (at > early) find('C-49.teaser_chapter', { message: `${where} называет «${c.name}», а игрок слышит это имя впервые ${at === Infinity ? 'нигде' : `в главе ${at}`} — спойлер` });
    }
    for (const num of t.match(/\d+/g) ?? []) {
      if (earlyText.includes(num)) continue;
      const at = firstMention(new RegExp(`(?<!\\d)${num}(?!\\d)`));
      find('C-49.teaser_chapter', { message: `${where}: число «${num}» ${at === Infinity ? 'не звучит в сценарии' : `звучит впервые в главе ${at}`}` });
    }
    const rs = [...roots(t, n)];
    const share = rs.length ? rs.filter((r) => ground.has(r)).length / rs.length : 1;
    if (share < T.value('C-49.teaser_ground')) find('C-49.teaser_ground', { message: `${where}: только ${Math.round(share * 100)} % её слов есть в описании и главе ${early} — затравка не из завязки` });
    const bad = teaserStyle(t, T);
    if (bad.length > T.value('C-49.teaser_style')) find('C-49.teaser_style', { message: `${where}: ${bad.join('; ')} (docs/style.md)` });
  });
}

/** Затравка показывается пузырём: те же запреты docs/style.md, что у реплики. */
function teaserStyle(t, T) {
  const low = t.toLowerCase();
  const out = [];
  if (t.length > T.value('C-49.teaser_chars')) out.push('длиннее C-49.teaser_chars (ST-01)');
  if (returnDeadline(low, T)) out.push('срок возвращения (ST-60, A-01)');
  if (T.re('dict.absence_reproach').test(low)) out.push('упрёк за отсутствие (ST-66, A-03)');
  if (T.re('dict.empty_tease').test(low)) out.push('анонс без содержания (ST-61)');
  if (T.re('dict.player_time').test(low)) out.push('угадывает время игрока (ST-64)');
  if (T.re('dict.praise').test(low)) out.push('оценка выбора (§11)');
  if ((t.match(/…|\.\.\./g) ?? []).length > T.value('style.ellipsis_per_queue')) out.push('многоточий больше style.ellipsis_per_queue (ST-05)');
  return out;
}
