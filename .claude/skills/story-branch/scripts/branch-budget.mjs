// Бюджет дорогих веток: сколько потрачено и сколько осталось, какую долю текста видит одно прохождение,
// где дорогая ветка достаётся меньшинству и где веер в середине не сходится. Отвечает на «и ещё сюда ветку»
// числом, а не на глаз (meaningful-choice:P-15, LESSON-10; R-26, R-37).
import { analyze, spend, T } from './branch-core.mjs';
import { storyRefs } from '../../../../scripts/lib/story.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/branch-budget.mjs [--story <id|путь>] [--add <сообщений>] [--runs N] [--json]

Бюджет дорогих веток (скилл story-branch).
  потрачено   дорогих развилок (хотя бы одна кнопка с областью от story.branch.expensive.msgs сообщений — на скелете
              от story.branch.expensive.skeleton_lines строк-сцен, — своим финалом или своим контактом) против бюджета
              story.branch.budget.min…story.branch.budget.max; история короче story.branch.budget.short_msgs
              сообщений — story.branch.budget.short. Тот же счёт печатают plan-check и plan-compare скилла story-plan
  доля текста сколько сообщений истории видит одно прохождение бота в среднем, против story.branch.seen_share.min и
              story.branch.seen_share.max (R-37); у короткой истории не сравнивается (narrative-testing:P-13)
  редкая      дорогая кнопка, которую нажимают меньше C-15.rare_branch_share игроков (R-37, ashwell-standard-patterns:P-10)
  веер        развилка в главах 2…N-1, где кнопка не сходится с соседними дольше story.branch.fan.merge_hops переходов
              (emshort-structures:RED-07)
  --add N     что будет, если добавить дорогую ветку на N сообщений, которую увидит доля игроков C-15.rare_branch_share…1:
              бюджет и доля текста после добавления (оценка до написания)

  --story     история: id, папка, .json или .ink (в том числе docs/stories/<id>/plans/skeleton.ink);
              по умолчанию все из src/stories
  --runs N    прогонов бота (по умолчанию endings.runs; 0 — без доли текста и редких веток)
  --json      всё данными
  --help      эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const runs = opt('--runs') != null ? Number(opt('--runs')) : T.value('endings.runs');
const add = opt('--add') != null ? Number(opt('--add')) : null;
if (!Number.isInteger(runs) || runs < 0 || (add != null && !(add > 0))) { console.error('ошибка: --runs — целое ≥ 0, --add — число сообщений > 0'); process.exit(2); }

const K = {
  rare: T.value('C-15.rare_branch_share'),
  hops: T.value('story.branch.fan.merge_hops'),
  seenMin: T.value('story.branch.seen_share.min'),
  seenMax: T.value('story.branch.seen_share.max'),
};

const report = [];
try {
  for (const ref of storyRefs((opt('--story') ?? '').split(',').filter(Boolean))) {
    const a = analyze(ref, { runs });
    const sp = spend(a);
    const budget = sp.budget;
    const spent = a.points.filter((x) => x.expensive).map((x) => ({
      knot: x.knot, chapter: x.chapter, line: x.line, merge: x.merge,
      options: x.options.filter((o) => o.expensive).map((o) => ({ text: o.text, own_msgs: o.own_msgs, own_endings: o.own_endings, unlocks: o.unlocks, share: o.share })),
    }));
    const rare = a.runs ? spent.flatMap((x) => x.options.filter((o) => o.share != null && o.share < K.rare).map((o) => ({ knot: x.knot, chapter: x.chapter, ...o }))) : [];
    const fan = a.points.filter((x) => x.chapter > 1 && x.chapter < a.chapters)
      .flatMap((x) => x.options.filter((o) => o.hops == null || o.hops > K.hops).map((o) => ({ knot: x.knot, chapter: x.chapter, text: o.text, hops: o.hops })));
    const byChapter = {};
    for (const x of a.points) {
      const c = (byChapter[x.chapter] ??= { points: 0, expensive: 0, branches: 0, memory: 0, colour: 0 });
      c.points++;
      if (x.expensive) c.expensive++;
      const kinds = new Set(x.options.map((o) => o.kind));
      if (kinds.has('дорогая') || kinds.has('ветка')) c.branches++;
      else if (kinds.has('память')) c.memory++;
      else c.colour++;
    }
    const used = sp.used;
    const what = add == null ? null : (() => {
      const total = a.totalMsgs + add;
      const seen = a.seenShare == null ? null : a.seenShare * a.totalMsgs;
      return {
        add, used: used + 1, left: budget.max - used - 1, over: used + 1 > budget.max,
        seen_share_low: seen == null ? null : (seen + add * K.rare) / total,
        seen_share_high: seen == null ? null : (seen + add) / total,
      };
    })();
    report.push({
      id: a.id, path: a.path, minutes: a.minutes, chapters: a.chapters, total_msgs: a.totalMsgs, runs: a.runs,
      skeleton: a.skeleton, budget, used, left: sp.left, status: sp.status,
      seen_share: a.seenShare, seen_status: a.seenShare == null ? null : budget.short ? 'короткая — не сравнивается' : a.seenShare < K.seenMin ? 'мало' : a.seenShare > K.seenMax ? 'много' : 'норма',
      spent, rare, fan, by_chapter: byChapter, what_if: what,
    });
  }
} catch (e) {
  console.error(`ошибка: ${e.message}`);
  process.exit(2);
}

// exitCode, а не process.exit: иначе большой --json в трубу обрезается
const json = args.includes('--json');
if (json) {
  console.log(JSON.stringify({ stories: report, keys: { expensive_msgs: T.value('story.branch.expensive.msgs'), expensive_skeleton_lines: T.value('story.branch.expensive.skeleton_lines'), ...K } }, null, 1));
}

const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)}%`);
for (const r of json ? [] : report) {
  const b = r.budget;
  console.log(`${r.path}${r.skeleton ? ' · скелет' : ''} · глав ${r.chapters} · ${r.skeleton ? 'строк-сцен' : 'сообщений'} ${r.total_msgs}${r.minutes ? ` · ≈${r.minutes} мин` : ''}`);
  console.log(`  дорогие развилки: ${r.used} из ${b.min}…${b.max}${b.short ? ' (короткая история)' : ''} — ${r.status}; осталось ${Math.max(0, r.left)}`);
  for (const x of r.spent) {
    for (const o of x.options) console.log(`    гл. ${x.chapter} ${x.knot}: [${o.text.slice(0, 36)}] своё ${o.own_msgs} сообщ.${o.own_endings.length ? `, финал ${o.own_endings.join(', ')}` : ''}${o.unlocks.length ? `, #unlock ${o.unlocks.join(', ')}` : ''} · игроков ${pct(o.share)}`);
  }
  console.log(`  по главам (развилок: с переходом / память / окраска · дорогих):`);
  for (const [c, v] of Object.entries(r.by_chapter)) console.log(`    гл. ${c}: ${v.points} — ${v.branches} / ${v.memory} / ${v.colour} · ${v.expensive}`);
  if (r.seen_share != null) console.log(`  доля текста за прохождение: ${pct(r.seen_share)} (норма ${pct(K.seenMin)}…${pct(K.seenMax)}, R-37) — ${r.seen_status}`);
  if (r.rare.length) {
    console.log(`  редкие дорогие (меньше ${pct(K.rare)} игроков):`);
    for (const o of r.rare) console.log(`    гл. ${o.chapter} ${o.knot}: [${o.text.slice(0, 36)}] ${o.own_msgs} сообщ. · ${pct(o.share)}`);
  }
  if (r.fan.length) {
    console.log(`  веер в середине (не сходятся дольше ${K.hops} переходов):`);
    for (const o of r.fan.slice(0, 12)) console.log(`    гл. ${o.chapter} ${o.knot}: [${o.text.slice(0, 36)}] ${o.hops ?? 'не сходится'}`);
    if (r.fan.length > 12) console.log(`    … и ещё ${r.fan.length - 12} (--json)`);
  }
  if (r.what_if) {
    const w = r.what_if;
    console.log(`  если добавить ветку на ${w.add} сообщ.: дорогих ${w.used} из ${b.max}${w.over ? ' — СВЕРХ бюджета: только вместо одной из потраченных' : `, останется ${w.left}`}`);
    if (w.seen_share_low != null) console.log(`    доля текста станет ${pct(w.seen_share_low)}…${pct(w.seen_share_high)} (ветку видят ${pct(K.rare)}…100% игроков)`);
  }
  console.log('');
}
