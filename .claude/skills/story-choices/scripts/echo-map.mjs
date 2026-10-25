// Карта эха: для каждой переменной — где её пишет выбор игрока и где игрок это видит. Счёт записей и чтений —
// индекс story:vars (scripts/story/core/vars-index.mjs), поэтому числа совпадают с `npm run story:vars`. Сверху —
// то, чего story:vars не показывает: дальность отклика в главах против ключей C-04, отношение записей к
// чтениям против C-02, кто пишет (адресат кнопки) и кто откликается (говорящий в видимом чтении).
import { prepare } from '../../../../scripts/story/core/run.mjs';
import { varIndex, VISIBLE } from '../../../../scripts/story/core/vars-index.mjs';
import { storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { walk } from '../../../../scripts/lib/ink.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/echo-map.mjs [--story <id|путь>,…] [--var <имя>] [--final] [--json]

Карта эха (скилл story-choices, проверки C-01…C-04, приём F-08). Колонки:
  пиш.        записей (как у story:vars)            кнопок — сколько кнопок пишут переменную
  видно/скр.  видимых и скрытых чтений (как у story:vars: реплика, текст, кнопка — видно)
  дальность   глав от первой записи до первого видимого чтения; ! — от C-04.gap_hint, !! — от C-04.gap_warning
  з/ч         записей на чтение; ! — выше C-02.ratio без видимых чтений (счётчик вслепую)
  кто пишет   адресаты кнопок, которые пишут переменную (#to)
  кто отвечает  кто говорит в видимых чтениях (#from); «третий» — не тот, кому писал игрок (meaningful-choice:GREEN-02)
  метки       метки story:vars: мёртвая (C-01), невидимая, только финал (C-03), молчит (vars.silent_chapters)

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --var <имя> одна переменная подробно: каждая запись и чтение
  --final     только переменные, которые читают финалы и распределители: кнопки, которые их пишут, и первые
              две реплики после кнопки — намекает ли реакция на цену (bateman-game-writing:RED-12, F-09 у story-endings)
  --json      всё данными
  --help      эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const refs = storyRefs((opt('--story') ?? '').split(',').filter(Boolean));
const one = opt('--var');
const finalOnly = args.includes('--final');

const IDENT = /[\p{L}_][\p{L}\p{N}_]*/gu;
const namesIn = (s) => new Set(String(s ?? '').replace(/"[^"]*"/g, ' ').match(IDENT) ?? []);
const bracesNames = (text) => {
  const out = new Set();
  for (const m of String(text).matchAll(/\{([^{}]*)\}/g)) for (const n of namesIn(m[1].split(':')[0])) out.add(n);
  return out;
};
const firstLines = (items, n) => {
  const out = [];
  walk(items, (it) => { if (out.length < n && ['msg', 'me', 'sys'].includes(it.type)) out.push(`${it.who ? `${it.who}: ` : ''}${it.text}`); });
  return out;
};
const speakers = (items) => {
  const out = new Set();
  walk(items, (it) => { if (it.type === 'msg' && it.who) out.add(it.who); });
  return out;
};

/** Кто пишет и кто откликается: адресаты кнопок с записью, говорящие в видимых чтениях. */
function actors(tree, vars) {
  const writers = new Map([...vars].map((v) => [v, { to: new Set(), buttons: [] }]));
  const voices = new Map([...vars].map((v) => [v, new Set()]));
  for (const k of tree.knots) {
    const visit = (items, choice) => {
      for (const it of items) {
        if (it.type === 'code' && choice) {
          const m = it.text.match(/^([\p{L}_][\p{L}\p{N}_]*)\s*(\+\+|--|[+\-*/]?=(?!=))/u);
          if (m && writers.has(m[1])) {
            const w = writers.get(m[1]);
            if (choice.tags.to) w.to.add(choice.tags.to);
            if (!w.buttons.some((b) => b.choice === choice)) w.buttons.push({ choice, knot: k.id, chapter: k.chapter, text: choice.text, after: firstLines(choice.items, 2) });
          }
        } else if (it.type === 'msg') {
          for (const n of bracesNames(it.text)) if (voices.has(n) && it.who) voices.get(n).add(it.who);
        } else if (it.type === 'choice') {
          visit(it.items, it);
        } else if (it.type === 'cond') {
          const head = namesIn(it.head);
          for (const b of it.branches) {
            const names = new Set([...head, ...(b.cond && b.cond !== 'else' ? namesIn(b.cond) : [])]);
            for (const n of names) if (voices.has(n)) for (const s of speakers(b.items)) voices.get(n).add(s);
            visit(b.items, choice);
          }
        }
      }
    };
    visit(k.items, null);
  }
  return { writers, voices };
}

const report = [];
for (const ref of refs) {
  const p = prepare(ref);
  const idx = varIndex(p.tree);
  const { writers, voices } = actors(p.tree, idx.vars.map((v) => v.name));
  let list = idx.vars.map((v) => {
    const reads = v.reads.length;
    const visible = v.reads.filter((r) => VISIBLE.has(r.kind)).length;
    const gap = v.firstWrite != null && v.firstVisible != null ? v.firstVisible - v.firstWrite : null;
    const w = writers.get(v.name);
    const voice = [...voices.get(v.name)];
    const third = voice.filter((s) => !w.to.has(s));
    const blind = reads > 0 && visible === 0 && v.writes.length / reads > T.value('C-02.ratio');
    return {
      name: v.name, writes: v.writes.length, buttons: w.buttons.length, visible, hidden: reads - visible,
      first_write: v.firstWrite ?? null, first_visible: v.firstVisible ?? null, gap,
      gap_level: gap == null ? null : gap >= T.value('C-04.gap_warning') ? 'warning' : gap >= T.value('C-04.gap_hint') ? 'hint' : null,
      ratio: reads ? v.writes.length / reads : null, blind,
      writers_to: [...w.to], voices: voice, third_voice: third,
      read_by_final: v.readByFinal, flags: v.flags,
      writer_buttons: w.buttons.map((b) => ({ knot: b.knot, chapter: b.chapter, text: b.text, after: b.after })),
      detail: one ? { writes: v.writes, reads: v.reads } : undefined,
    };
  });
  if (one) {
    list = list.filter((v) => v.name === one);
    if (!list.length) { console.error(`${p.story.path}: нет переменной «${one}»`); process.exit(1); }
  }
  if (finalOnly) list = list.filter((v) => v.read_by_final);
  report.push({ id: p.story.id, path: p.story.path, chapters: idx.lastChapter, vars: list });
}

if (args.includes('--json')) {
  console.log(JSON.stringify({ stories: report, keys: { gap_hint: T.value('C-04.gap_hint'), gap_warning: T.value('C-04.gap_warning'), ratio: T.value('C-02.ratio') } }, null, 1));
  process.exit(0);
}
const pad = (s, n) => String(s).padEnd(n - 1) + ' ';
for (const r of report) {
  console.log(`${r.path} · переменных ${r.vars.length}${finalOnly ? ' (читает финал)' : ''} · глав ${r.chapters}`);
  if (one) {
    const v = r.vars[0];
    console.log(`\n${v.name}: пишут ${v.writes} раз (${v.buttons} кнопок, адресаты: ${v.writers_to.join(', ') || '—'}); видно ${v.visible}, скрыто ${v.hidden}; дальность ${v.gap ?? '—'}`);
    for (const w of v.detail.writes) console.log(`   пишется  гл.${w.chapter} ${w.node}`);
    for (const x of v.detail.reads) console.log(`   читается гл.${x.chapter} ${x.node} — ${x.kind}${VISIBLE.has(x.kind) ? '' : ' (скрыто)'}`);
    console.log(`   отвечают: ${v.voices.join(', ') || '—'}${v.third_voice.length ? ` (третьи: ${v.third_voice.join(', ')})` : ''}\n`);
    continue;
  }
  if (finalOnly) {
    for (const v of r.vars) {
      console.log(`\n   ${v.name} · видно ${v.visible} · ${v.flags.join(', ') || 'без меток'}`);
      for (const b of v.writer_buttons) console.log(`     [${b.text}] (${b.knot}, гл. ${b.chapter}) → ${b.after.map((t) => `«${t.slice(0, 50)}»`).join(' / ') || 'ни одной реплики'}`);
    }
    console.log('\n   Вопрос ревьюеру: намекает ли реакция на кнопку на цену? Нет — признак bateman-game-writing:RED-12.\n');
    continue;
  }
  console.log(`   ${pad('VAR', 22)}${pad('пиш.', 6)}${pad('кнопок', 8)}${pad('видно/скр.', 12)}${pad('дальность', 11)}${pad('з/ч', 7)}${pad('кто пишет', 16)}${pad('кто отвечает', 22)}метки`);
  for (const v of r.vars) {
    const gap = v.gap == null ? '—' : `${v.gap}${v.gap_level === 'warning' ? '!!' : v.gap_level === 'hint' ? '!' : ''}`;
    const ratio = v.ratio == null ? '—' : `${v.ratio.toFixed(1)}${v.blind ? '!' : ''}`;
    const voice = v.voices.length ? v.voices.map((s) => (v.third_voice.includes(s) ? `${s}*` : s)).join(',') : '—';
    console.log(`   ${pad(v.name, 22)}${pad(v.writes, 6)}${pad(v.buttons, 8)}${pad(`${v.visible}/${v.hidden}`, 12)}${pad(gap, 11)}${pad(ratio, 7)}${pad(v.writers_to.join(',') || '—', 16)}${pad(voice, 22)}${v.flags.join(', ')}`);
  }
  console.log(`   ! дальность — от C-04.gap_hint (${T.value('C-04.gap_hint')}), !! — от C-04.gap_warning (${T.value('C-04.gap_warning')}); ! з/ч — выше C-02.ratio без видимых; * — третий голос\n`);
}
