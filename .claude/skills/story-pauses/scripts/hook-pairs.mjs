// Пары «последняя строка до паузы / первая после» по всем путям бота: крючок и возвращение рядом, как их
// читает аудитор. Прогоны — те же, что у story:lint (analyze, seed 1, lint.runs.full), признаки крючка —
// hookIn из scripts/lint/text.mjs, поэтому «без крючка» здесь совпадает с C-26.share, а «приветствие» — с C-28.greeting.
import { analyze } from '../../../../scripts/lint/core.mjs';
import { isIncoming, median, norm } from '../../../../scripts/lint/journal.mjs';
import { firstLines, fmtDur, hookIn, isClosing, places, short } from '../../../../scripts/lint/text.mjs';
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/hook-pairs.mjs [--story <id|путь>,…] [--session] [--runs N] [--all] [--json]

Пары «до / после» для каждой паузы (скилл story-pauses: C-26, C-28, C-29; приёмы F-01, F-02). Место — узел и
первая строка после паузы; одно место на многих путях — одна строка таблицы.

  до          последняя входящая реплика перед паузой (#sys «не в сети» и «Прочитано» пропускаются, ST-60)
  крючок      признак крючка в окне C-26.window_lines (как C-26): ? · фото · #unlock · новый контакт ·
              обещание · срок в мире; «—» — нет на большинстве путей; «прощание» — закрывающая без крючка
  тип         догадка о типе (вопрос, прибытие, фото, событие мира, обещание, угроза по dict.threat); откровение,
              дилемма и отношения словарь не видит — их ставит аудитор (R-66)
  после       первая входящая строка после паузы; «привет» — приветствие или пустая (как C-28.greeting)
  якорь       есть ли общий корень или тот же отправитель в окне C-28.link_window (как C-28.link)
  пачка       медиана входящих от паузы до кнопки (C-28.pack; после C-28.pack_long_pause_s — C-28.pack_long);
              story:lint склеивает одинаковые сообщения в одном узле, поэтому «стен» здесь бывает чуть больше
  развилка    пауза сразу после кнопки: «пусто» — ветки ничего не записали (serial-hooks:RED-11)

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --session   паузы от story.pause.session_s, а не от story.pause.long_s (как C-29 и C-33)
  --runs N    прогонов бота (по умолчанию lint.runs.full, как story:lint)
  --all       и паузы после последней кнопки (эпилог; по умолчанию скрыты — их меряет C-42)
  --json      всё данными
  --help      эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const refs = storyRefs((opt('--story') ?? '').split(',').filter(Boolean));
const runs = opt('--runs') ? Number(opt('--runs')) : T.value('lint.runs.full');
const minDelay = args.includes('--session') ? T.value('story.pause.session_s') : T.value('story.pause.long_s');
const withTail = args.includes('--all');

const THREAT = T.re('dict.threat');
function guessType(lines, firstOf) {
  for (const l of [...lines].reverse()) {
    const t = l.text.toLowerCase();
    if (l.unlock.length || (l.who && isIncoming(l) && firstOf.get(l.who) === l.i)) return 'прибытие';
    if (l.kind === 'photo') return 'фото';
    if (l.text.includes('?')) return 'вопрос';
    if (THREAT.test(t)) return 'угроза';
    if (T.re('dict.world_deadline').test(t)) return 'событие мира';
    if (T.re('dict.content_promise').test(t)) return 'обещание';
  }
  return '—';
}

const w = T.value('C-28.link_window');
const rootsOf = (lines) => new Set(lines.flatMap((l) => norm(l.text).split(' ').filter((x) => x.length >= w.min_word).map((x) => x.slice(0, w.root))));

const report = [];
for (const ref of refs) {
  const story = loadStory(ref);
  const ctx = analyze(story, T, { runs });
  if (!ctx.built.ok) { console.error(`${story.path}: не компилируется — сначала npm run story:lint`); process.exitCode = 1; continue; }
  const all = places();
  for (const run of ctx.runs) {
    const firstOf = firstLines(run);
    const lastChoice = run.choices.at(-1)?.at ?? -1;
    for (const l of run.lines) {
      if (l.delay < minDelay || l.i === 0) continue;
      const tail = l.i >= lastChoice;
      if (tail && !withTail) continue;
      const before = run.lines.slice(Math.max(0, l.i - T.value('C-26.window_lines')), l.i);
      const last = before.findLast(isIncoming) ?? before.at(-1);
      const next = run.choices.find((c) => c.at > l.i);
      const pack = run.lines.slice(l.i, next ? next.at : run.lines.length).filter(isIncoming);
      const first = pack[0] ?? l;
      const p = all.add(`${l.knot}|${l.text}`, () => ({
        knot: last.knot, after_knot: l.knot, chapter: ctx.st.chapterOf(l.knot), delay: l.delay, before: last.text, after: first.text,
        tail, noHook: 0, closing: 0, greet: 0, unlinked: 0, packs: [], types: new Map(), afterChoice: 0, emptyChoice: 0,
      }));
      const hook = hookIn(before, firstOf, T);
      if (!hook) p.noHook++;
      if (!hook && isClosing(last.text, T)) p.closing++;
      const type = hook ? guessType(before, firstOf) : '—';
      p.types.set(type, (p.types.get(type) ?? 0) + 1);
      const n = norm(first.text);
      const arrival = first.who && !run.lines.slice(0, first.i).some((x) => x.who === first.who && isIncoming(x));
      if (!arrival && (T.re('dict.greeting').test(n) || !n || isClosing(first.text, T))) p.greet++;
      const b = run.lines.slice(Math.max(0, l.i - w.before), l.i);
      const a = pack.slice(0, w.after);
      const rb = rootsOf(b);
      if (!(a.some((x) => b.some((y) => y.who && y.who === x.who && isIncoming(y))) || [...rootsOf(a)].some((r) => rb.has(r)))) p.unlinked++;
      if (next && pack.length) p.packs.push(pack.length);
      // пауза сразу после кнопки: между кнопкой и паузой нет входящих
      const prevChoice = run.choices.findLast((c) => c.at <= l.i);
      if (prevChoice && !run.lines.slice(prevChoice.at, l.i).some(isIncoming)) {
        p.afterChoice++;
        if (!run.vars.some((v) => v.at >= prevChoice.at && v.at <= l.i)) p.emptyChoice++;
      }
    }
  }
  const half = (x, p) => x * 2 > p.n;
  const rows = all.values().map((p) => ({
    knot: p.knot, after_knot: p.after_knot, chapter: p.chapter, delay: p.delay, paths: p.n, tail: p.tail,
    before: p.before, after: p.after,
    hook: half(p.noHook, p) ? (half(p.closing, p) ? 'прощание' : '—') : 'есть',
    type: [...p.types].sort((x, y) => y[1] - x[1])[0][0],
    greeting: half(p.greet, p), anchor: !half(p.unlinked, p),
    pack: p.packs.length ? median(p.packs) : null,
    pack_over: p.packs.length ? median(p.packs) > T.value(p.delay >= T.value('C-28.pack_long_pause_s') ? 'C-28.pack_long' : 'C-28.pack') : false,
    after_choice: half(p.afterChoice, p) ? (half(p.emptyChoice, p) ? 'пусто' : 'да') : '',
  }));
  const body = rows.filter((r) => !r.tail);
  const summary = {
    pauses: body.length,
    no_hook: body.filter((r) => r.hook !== 'есть').length,
    closing: body.filter((r) => r.hook === 'прощание').length,
    // как C-28: только паузы, после которых до кнопки есть хоть одна входящая
    greeting: rows.filter((r) => r.greeting && r.pack).length,
    no_anchor: rows.filter((r) => !r.anchor && r.pack).length,
    pack_over: rows.filter((r) => r.pack_over).length,
    empty_choice: body.filter((r) => r.after_choice === 'пусто').length,
    types: Object.fromEntries([...body.reduce((m, r) => m.set(r.type, (m.get(r.type) ?? 0) + 1), new Map())]),
  };
  report.push({ id: story.id, path: story.path, runs, min_delay_s: minDelay, summary, pairs: rows });
}

if (args.includes('--json')) {
  console.log(JSON.stringify({ stories: report, keys: { window: T.value('C-26.window_lines'), share: T.value('C-26.share'), pack: T.value('C-28.pack'), pack_long: T.value('C-28.pack_long') } }, null, 1));
  process.exit(process.exitCode ?? 0);
}
for (const r of report) {
  const s = r.summary;
  const share = s.pauses ? Math.round((s.no_hook / s.pauses) * 100) : 0;
  console.log(`${r.path} · пауз от ${fmtDur(r.min_delay_s)} до последней кнопки: ${s.pauses} (прогонов ${r.runs})`);
  console.log(`   без крючка ${s.no_hook} (${share} %, порог C-26.share = ${Math.round(T.value('C-26.share') * 100)} %), из них прощанием ${s.closing}; первая строка — приветствие ${s.greeting}; без якоря ${s.no_anchor}; пачка выше порога ${s.pack_over}; пауза после пустой развилки ${s.empty_choice}`);
  console.log(`   типы крючков (догадка словаря, тип ставит аудитор): ${Object.entries(s.types).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  for (const p of r.pairs) {
    const flags = [p.hook === 'есть' ? null : p.hook === 'прощание' ? 'прощание' : 'нет крючка', p.greeting ? 'привет' : null, p.anchor ? null : 'нет якоря', p.pack_over ? 'стена' : null, p.after_choice === 'пусто' ? 'пустая развилка' : null, p.tail ? 'эпилог' : null].filter(Boolean);
    console.log(`\n   гл.${p.chapter} ${p.knot} → ${fmtDur(p.delay)} → ${p.after_knot} · путей ${p.paths} · тип ${p.type}${p.pack != null ? ` · пачка ${p.pack}` : ''}${flags.length ? ` · ⚠ ${flags.join(', ')}` : ''}`);
    console.log(`     до:    «${short(p.before, 90)}»`);
    console.log(`     после: «${short(p.after, 90)}»`);
  }
  console.log('');
}
