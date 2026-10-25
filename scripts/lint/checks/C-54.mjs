// C-54. Честная игра улик: к узлу раскрытия (метка «// reveal: clue_a, clue_b» над ним) игрок приходит
// с уликами, одна из них видна всегда, улики пришли от разных людей, между последней уликой и раскрытием
// есть выбор, виновник появляется рано, верная кнопка не выдаёт себя длиной. Без разметки проверка молчит.
// Виновник — строка «виновник: <id>» в docs/stories/<id>/facts.md (или в facts.md рядом с историей).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pct, short } from '../text.mjs';

const truthy = (v) => !(v === 0 || v === false || v === '' || v === '0' || v === 'false' || v == null);

// История вне каталога (мутант во временной папке, черновик) держит facts.md рядом с собой.
export function factsOf(story) {
  const own = story.path ? join(story.form === 'folder' ? story.path : dirname(story.path), 'facts.md') : null;
  return [join('docs/stories', story.id ?? '', 'facts.md'), own].filter(Boolean).find((p) => existsSync(p)) ?? null;
}

function culpritOf(story) {
  const file = factsOf(story);
  return file ? readFileSync(file, 'utf8').match(/виновник\s*[:—-]\s*`?([\p{L}\p{N}_]+)/u)?.[1] ?? null : null;
}

/**
 * Где в исходнике выставляется улика и чья строка стоит перед записью (R-93: «~ clue_x = true» сразу за
 * строкой улики). По журналу этого не понять: inkjs выполняет «~» с заглядыванием вперёд, и запись
 * попадает то до, то после своей строки.
 */
export function clueSources(tree, names) {
  const out = new Map([...names].map((n) => [n, []]));
  for (const k of tree.knots) {
    const scan = (items, last) => {
      for (const it of items) {
        if (it.type === 'msg' || it.type === 'sys') last = it;
        else if (it.type === 'code') {
          const m = it.text.match(/^([\p{L}_][\p{L}\p{N}_]*)\s*=(?!=)\s*(.+)$/u);
          if (m && out.has(m[1]) && truthy(m[2].trim())) out.get(m[1]).push({ knot: k.id, who: last?.who ?? null, text: last?.text ?? null });
        } else if (it.type === 'choice') scan(it.items, last);
        else if (it.type === 'cond') for (const b of it.branches) scan(b.items, last);
      }
    };
    scan(k.items, null);
  }
  return out;
}

/** Данные одного узла раскрытия по прогонам — их же печатает clues.mjs скилла story-mystery. */
export function revealStats(ctx, at, clues) {
  const sources = clueSources(ctx.tree, clues);
  const whoOf = (e, run) => {
    const near = [run.lines[e.at - 1], run.lines[e.at]].filter(Boolean);
    const cand = (sources.get(e.name) ?? []).filter((c) => c.knot === e.knot);
    const hit = cand.find((c) => near.some((l) => l.text === c.text)) ?? (cand.length === 1 ? cand[0] : null);
    return hit?.who ?? run.lines[e.at - 1]?.who ?? null;
  };
  const init = new Map(ctx.tree.vars.filter((v) => v.kind === 'VAR').map((v) => [v.name, v.value.replace(/^"|"$/g, '')]));
  const minClues = ctx.T.value('C-54.min_clues');
  const out = { at, clues, runs: ctx.runs.length, reached: 0, enough: 0, gapless: 0, seen: new Map(clues.map((c) => [c, 0])), counts: [], voices: [], gates: new Map() };
  for (const run of ctx.runs) {
    const enter = run.lines.find((l) => l.knot === at);
    if (!enter) continue;
    out.reached++;
    const state = new Map(clues.map((c) => [c, init.get(c)]));
    const from = new Map();
    let lastSet = -1;
    for (const e of run.vars) {
      if (e.at > enter.i) break;
      if (!state.has(e.name)) continue;
      state.set(e.name, e.value);
      // отправитель строки улики и есть её канал
      if (truthy(e.value)) { lastSet = e.at; from.set(e.name, whoOf(e, run)); }
    }
    const have = clues.filter((c) => truthy(state.get(c)));
    have.forEach((c) => out.seen.set(c, out.seen.get(c) + 1));
    out.counts.push(have.length);
    if (have.length >= minClues) out.enough++;
    out.voices.push(new Set(have.map((c) => from.get(c)).filter(Boolean)).size);
    if (lastSet >= 0 && !run.choices.some((c) => c.at > lastSet && c.at <= enter.i)) out.gapless++;
    // ворота — последний выбор перед раскрытием (RED-06: в одном-двух узлах до него)
    const gate = run.choices.filter((c) => c.at <= enter.i).at(-1);
    if (gate) out.gates.set(gate.knot, (out.gates.get(gate.knot) ?? 0) + 1);
  }
  return out;
}

export default {
  id: 'C-54',
  title: 'Честная игра улик',
  plan: false,
  partial: false,
  run(ctx, find) {
    const { st, T, tree, story } = ctx;
    const reveals = tree.knots.flatMap((k) => k.marks.filter((m) => m.kind === 'reveal').map((m) => ({ at: k.id, clues: m.value.split(/[,\s]+/).filter(Boolean) })));
    if (!reveals.length) return;
    const stats = [];
    for (const { at, clues } of reveals) {
      const where = { node: at, chapter: st.chapterOf(at) };
      const s = revealStats(ctx, at, clues);
      stats.push(s);
      const { reached, enough, gapless, seen } = s;
      if (!reached) continue;
      if (enough / reached < T.value('C-54.clue_share')) find('C-54.min_clues', { ...where, message: `улики: «${clues.join(', ')}» — в ${pct(1 - enough / reached)} прогонов игрок дошёл до ${at} меньше чем с ${T.value('C-54.min_clues')} уликами` });
      const best = Math.max(...seen.values()) / reached;
      if (best < T.value('C-54.sure_clue')) find('C-54.sure_clue', { ...where, message: `ни одну улику к ${at} не видят все: самая частая — в ${pct(best)} прогонов` });
      if (gapless && gapless * 2 > reached) find('C-54.gap_choice', { ...where, message: `между последней уликой и ${at} нет ни одного выбора — игроку некогда подумать` });
      // каналы (mystery-fair-play:P-07): две улики одного голоса — одна попытка заметить
      const twoVoices = s.voices.filter((n) => n >= T.value('C-54.channels')).length;
      if (clues.length >= T.value('C-54.channels') && enough && twoVoices * 2 < reached) find('C-54.channels', { ...where, message: `улики к ${at} в ${pct(1 - twoVoices / reached)} прогонов приходят от одного контакта — одна причина пропуска гасит все` });
    }
    // виновник из facts.md: когда он впервые пишет или оставляет след (culprit_seen), и не выдаёт ли себя кнопка
    const culprit = culpritOf(story);
    if (culprit) {
      const shares = ctx.runs.map((r) => {
        const line = r.lines.findIndex((l) => l.who === culprit);
        const trace = r.vars.find((e) => e.name === 'culprit_seen' && truthy(e.value))?.at ?? -1;
        const i = [line, trace].filter((x) => x >= 0);
        return i.length && r.lines.length ? Math.min(...i) / r.lines.length : null;
      }).filter((x) => x != null);
      if (shares.length) {
        const late = shares.sort((a, b) => a - b)[Math.floor(shares.length / 2)];
        const key = late > T.value('C-54.culprit_error') ? 'C-54.culprit_error' : late > T.value('C-54.culprit_late') ? 'C-54.culprit_late' : null;
        if (key) find(key, { message: `виновник ${culprit} впервые пишет на ${pct(late)} пути — честной игре нужна первая треть` });
      }
    }
    const name = culprit ? (ctx.meta.characters ?? []).find((c) => c.id === culprit)?.name?.toLowerCase().slice(0, 4) ?? culprit.toLowerCase() : null;
    // верная кнопка: называет виновника или записывает solved*; ворота — узел раскрытия и узел последнего выбора перед ним
    const right = (b) => (name && b.text.toLowerCase().includes(name)) || b.writes.some((w) => /^solved/.test(w));
    for (const s of stats) {
      const knots = new Set([s.at, ...[...s.gates].filter(([, n]) => n * 2 > s.reached).map(([k]) => k)]);
      for (const g of st.buttons.groups.filter((x) => knots.has(x.knot) && x.buttons.length > 1)) {
        const hit = g.buttons.find(right);
        const min = Math.min(...g.buttons.filter((b) => b !== hit).map((b) => b.text.length));
        if (hit && hit.text.length > T.value('C-54.long_answer') * min) find('C-54.long_answer', { node: g.knot, chapter: st.chapterOf(g.knot), message: `${g.knot}: верная кнопка «${short(hit.text)}» заметно длиннее остальных — ответ угадывается по длине` });
      }
    }
  },
};
