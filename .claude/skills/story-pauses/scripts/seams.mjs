// Стыки глав на путях бота: конец главы, пауза на стыке, вход в следующую — то, что C-39 меряет по четырём
// признакам, одной картинкой для аудитора. Прогоны — те же, что у story:lint (analyze), признаки крючка — hookIn,
// события начала главы — как в scripts/lint/checks/C-39.mjs, поэтому «без крючка» и «без события» совпадают с C-39.
import { analyze } from '../../../../scripts/lint/core.mjs';
import { isIncoming, median } from '../../../../scripts/lint/journal.mjs';
import { firstLines, fmtDur, hookIn, short } from '../../../../scripts/lint/text.mjs';
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/seams.mjs [--story <id|путь>,…] [--runs N] [--json]

Стыки глав (скилл story-pauses: C-39, R-66, R-72; приёмы F-01, F-02). Для каждого #chapter на путях бота:

  конец       последняя входящая главы и признак крючка в C-39.end_window строках до #chapter (а)
  пауза       медиана паузы на строке главы; «потом» — ещё пауза до первой входящей (пустое возвращение,
              chat-fiction-apps:RED-03)
  вход        первая входящая главы и есть ли событие в C-39.start_lines входящих: новый отправитель, фото,
              #unlock, вопрос или кнопка в окне (б)
  кнопкой     глава после паузы от story.pause.long_s открывается кнопкой без входящих (г)

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --runs N    прогонов бота (по умолчанию lint.runs.full, как story:lint)
  --json      всё данными
  --help      эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const refs = storyRefs((opt('--story') ?? '').split(',').filter(Boolean));
const runs = opt('--runs') ? Number(opt('--runs')) : T.value('lint.runs.full');
const long = T.value('story.pause.long_s');

const report = [];
for (const ref of refs) {
  const story = loadStory(ref);
  const ctx = analyze(story, T, { runs });
  if (!ctx.built.ok) { console.error(`${story.path}: не компилируется — сначала npm run story:lint`); process.exitCode = 1; continue; }
  const seams = new Map();
  for (const run of ctx.runs) {
    const firstOf = firstLines(run);
    for (const l of run.lines.filter((x) => x.isChapter && x.i > 0)) {
      const s = seams.get(l.chapter) ?? { chapter: l.chapter, knot: l.knot, n: 0, noHook: 0, noEvent: 0, cold: 0, long: 0, pauses: [], extra: [], ends: new Map(), starts: new Map() };
      s.n++;
      const before = run.lines.slice(Math.max(0, l.i - T.value('C-39.end_window')), l.i);
      if (!hookIn(before, firstOf, T)) s.noHook++;
      const next = run.lines.slice(l.i).filter(isIncoming).slice(0, T.value('C-39.start_lines'));
      const until = next.at(-1)?.i ?? l.i;
      const asked = run.choices.some((c) => c.at > l.i && c.at <= until + 1);
      if (!(asked || next.some((x) => x.kind === 'photo' || x.unlock.length || x.text.includes('?') || (x.who && firstOf.get(x.who) === x.i)))) s.noEvent++;
      s.pauses.push(l.delay);
      const firstIn = next[0];
      s.extra.push(firstIn ? run.lines.slice(l.i + 1, firstIn.i + 1).reduce((t, x) => t + x.delay, 0) : 0);
      if (l.delay >= long) {
        s.long++;
        const c = run.choices.find((x) => x.at > l.i);
        if (c && !run.lines.slice(l.i + 1, c.at).some(isIncoming)) s.cold++;
      }
      const end = before.findLast(isIncoming)?.text ?? '—';
      const start = firstIn?.text ?? '—';
      s.ends.set(end, (s.ends.get(end) ?? 0) + 1);
      s.starts.set(start, (s.starts.get(start) ?? 0) + 1);
      seams.set(l.chapter, s);
    }
  }
  const top = (m) => [...m].sort((a, b) => b[1] - a[1])[0][0];
  const list = [...seams.values()].sort((a, b) => a.chapter - b.chapter).map((s) => ({
    chapter: s.chapter, knot: s.knot, paths: s.n,
    end: top(s.ends), start: top(s.starts),
    end_hook: !(s.noHook * 2 > s.n), start_event: !(s.noEvent * 2 > s.n),
    cold_button: s.long > 0 && s.cold * 2 > s.long,
    pause: median(s.pauses), pause_after_title: median(s.extra),
  }));
  report.push({ id: story.id, path: story.path, runs, seams: list });
}

if (args.includes('--json')) { console.log(JSON.stringify({ stories: report }, null, 1)); process.exit(process.exitCode ?? 0); }
for (const r of report) {
  console.log(`${r.path} · стыков глав ${r.seams.length} (прогонов ${r.runs})`);
  for (const s of r.seams) {
    const flags = [s.end_hook ? null : 'конец без крючка (C-39 а)', s.start_event ? null : 'вход без события (C-39 б)', s.cold_button ? 'вход кнопкой (C-39 г)' : null,
      s.pause_after_title >= T.seconds('story.pause.notice_min') ? `пауза после заголовка ${fmtDur(s.pause_after_title)}` : null].filter(Boolean);
    console.log(`\n   гл.${s.chapter - 1} → гл.${s.chapter} (${s.knot}) · пауза ${fmtDur(s.pause)} · путей ${s.paths}${flags.length ? ` · ⚠ ${flags.join(', ')}` : ''}`);
    console.log(`     конец: «${short(s.end, 90)}»`);
    console.log(`     вход:  «${short(s.start, 90)}»`);
  }
  console.log('');
}
