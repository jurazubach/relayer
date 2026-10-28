// Хронология мира (R-91, R-121): каждое ЧЧ:ММ в репликах и кнопках — где звучит, текущее это время или время
// события, есть ли оно в хронологии facts.md; и часы мира на пути бота: две реплики «сейчас ЧЧ:ММ» должны
// разойтись на столько, сколько между ними прошло #delay. Время — мира, а не игрока (A-02).
import { walk } from '../../../../scripts/lib/ink.mjs';
import { lintStory } from '../../../../scripts/lint/core.mjs';
import { args, emit, load, pct, short, TIME } from './common.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/timeline.mjs [--story <id|путь>,…] [--all] [--runs N] [--json]

Хронология и часы мира (скилл story-continuity, R-91, R-121, timeline.md):
  время       каждое ЧЧ:ММ в репликах и кнопках: узлы, глава первого упоминания, кто называет
  вид         «сейчас» — реплика называет текущее время мира (dict.clock_now), иначе «событие»
  facts.md    ✓ — время есть в хронологии docs/stories/<id>/facts.md, ✗ — нет (это же считает C-49 (г),
              её находки C-49.facts — рядом); без facts.md — «нет хронологии»
  часы        пары реплик «сейчас» на одном пути бота: часы мира против суммы #delay между ними;
              ! — расхождение больше C-51.clock_drift_min (минут), доля прогонов с таким расхождением

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --all       все времена, а не только «сейчас» и отсутствующие в facts.md (без facts.md — все и так)
  --runs N    прогонов бота (по умолчанию lint.runs.full — как у story:lint)
  --json      всё данными
  --help      эта справка`;

const A = args(HELP);
const showAll = A.has('--all');
const NOW = new RegExp(A.T.value('dict.clock_now'), 'iu');
const drift = A.T.value('C-51.clock_drift_min');
const DAY = 24 * 60;
const minutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const report = [];

for (const ref of A.refs) {
  const { story, ctx, facts } = load(ref, A.T, A.runs);
  if (!ctx.built.ok) { report.push({ id: story.id, path: story.path, error: 'нет данных: история не компилируется' }); continue; }
  const { st, tree } = ctx;
  const times = new Map();
  for (const k of tree.knots) {
    walk(k.items, (it) => {
      const text = it.type === 'choice' ? it.text : ['msg', 'me', 'sys'].includes(it.type) ? it.text : null;
      if (!text) return;
      for (const t of text.match(TIME) ?? []) {
        const e = times.get(t) ?? { time: t, nodes: new Set(), chapter: Infinity, who: new Set(), now: false, texts: [] };
        e.nodes.add(k.id);
        e.chapter = Math.min(e.chapter, st.chapterOf(k.id) ?? 1);
        if (it.who) e.who.add(it.type === 'choice' ? 'игрок' : it.who);
        if (it.type === 'choice') e.who.add('игрок');
        if (NOW.exec(text)?.[1] === t) e.now = true;
        if (e.texts.length < 2) e.texts.push(text);
        times.set(t, e);
      }
    });
  }
  const rows = [...times.values()].sort((a, b) => a.chapter - b.chapter || minutes(a.time) - minutes(b.time)).map((e) => ({
    time: e.time, chapter: e.chapter, nodes: [...e.nodes], who: [...e.who], kind: e.now ? 'сейчас' : 'событие',
    inFacts: facts ? facts.times.has(e.time) : null, sample: e.texts[0],
  }));

  // часы на пути: «сейчас A», потом через Σ#delay «сейчас B» — ожидали A + Σ, расхождение по кругу суток
  const pairs = new Map();
  for (const run of ctx.runs) {
    let last = null;
    let elapsed = 0;
    for (const l of run.lines) {
      elapsed += (l.delay ?? 0) + (l.typing ?? 0);
      if (l.kind === 'photo') continue;
      const m = NOW.exec(l.text);
      if (!m) continue;
      const at = minutes(m[1]);
      if (last) {
        const expect = (last.at + Math.round(elapsed / 60)) % DAY;
        const d = Math.abs(expect - at);
        const off = Math.min(d, DAY - d);
        const key = `${last.knot}|${last.time}|${l.knot}|${m[1]}`;
        const p = pairs.get(key) ?? { from: last.knot, fromTime: last.time, to: l.knot, toTime: m[1], runs: 0, bad: 0, maxOff: 0, waited: Math.round(elapsed / 60) };
        p.runs++;
        if (off > drift) { p.bad++; p.maxOff = Math.max(p.maxOff, off); }
        pairs.set(key, p);
      }
      last = { at, time: m[1], knot: l.knot };
      elapsed = 0;
    }
  }
  const total = ctx.runs.length;
  let c49 = [];
  if (facts) {
    const lint = await lintStory(story, A.T, { only: ['C-49'], runs: A.runs, seed: 1 });
    c49 = lint.findings.filter((f) => f.key === 'C-49.facts' && f.node).map((f) => ({ node: f.node, message: f.message }));
  }
  report.push({
    id: story.id, path: story.path, runs: total, facts: facts ? facts.file : null,
    times: rows, clock: [...pairs.values()].map((p) => ({ ...p, share: p.bad / total })), c49,
  });
}

emit(A.json, report, () => report.map((r) => {
  if (r.error) return `${r.id}: ${r.error}`;
  const out = [`${r.id} · времён в тексте: ${r.times.length} · facts.md: ${r.facts ? 'есть' : 'нет хронологии (R-91: заведи, черновик — facts.mjs --draft)'}`];
  const shown = showAll || !r.facts ? r.times : r.times.filter((t) => t.kind === 'сейчас' || t.inFacts === false);
  if (shown.length < r.times.length) out.push(`  показаны «сейчас» и отсутствующие в facts.md; все ${r.times.length} — --all`);
  for (const t of shown) out.push(`  ${t.time} · ${t.kind} · гл. ${t.chapter} · ${t.nodes.slice(0, 3).join(', ')}${t.nodes.length > 3 ? ` +${t.nodes.length - 3}` : ''} · ${t.who.join(', ') || '—'}${t.inFacts == null ? '' : t.inFacts ? ' · ✓ facts.md' : ' · ✗ нет в facts.md'} · «${short(t.sample)}»`);
  if (r.c49.length) out.push(`  C-49 (г), story:lint: ${r.c49.length} находок C-49.facts — те же времена вне хронологии`);
  out.push(`  часы мира на пути (пары «сейчас»): ${r.clock.length || 'нет'}`);
  for (const p of r.clock) out.push(`    ${p.from} ${p.fromTime} → ${p.to} ${p.toTime} · между ними ≈${p.waited} мин #delay${p.bad ? ` · ! расходится до ${p.maxOff} мин в ${pct(p.share)} прогонов` : ' · сходится'}`);
  return out.join('\n');
}).join('\n\n') || 'историй нет');
