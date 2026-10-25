// Упрёки за отсутствие и давление (скилл story-time; R-74, R-114, R-120; C-32 п. 7, C-37; решение A-03).
// Отличает реакцию на нажатый #silent (разрешено: это ответ на выбор) от упрёка за отсутствие — после паузы,
// которую поставила история, после напоминания, в ветке «не ответил» (запрещено). Контекст строки — из
// C-32 (reproachContexts), давление — из C-37 (pressureLines), поэтому счёт совпадает со story:lint.
import { loadStory, storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { isReproach, returnDeadline } from '../../../../scripts/lib/lexicon.mjs';
import { play, reminderSeries, seeded, strategies } from '../../../../scripts/lib/bot.mjs';
import { walk } from '../../../../scripts/lib/ink.mjs';
import { lintStory, loadChecks } from '../../../../scripts/lint/core.mjs';
import { FORBIDDEN, reproachContexts, silentRuns } from '../../../../scripts/lint/checks/C-32.mjs';
import { pressureLines } from '../../../../scripts/lint/checks/C-37.mjs';
import { pathToFileURL } from 'node:url';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/guilt-scan.mjs [<id>] [--story <id|путь>,…] [--node <узел>] [--runs N] [--seed N] [--missing] [--json]

Упрёки за отсутствие и давление (скилл story-time; R-74, R-114, R-120; C-32 п. 7, C-37; решение A-03).
Каждая реплика из словаря dict.absence_reproach получает контекст — после чего она пришла:
  ✓ silent    ответ на нажатый #silent до следующей паузы — можно: это реакция на выбор
  · button    ответ на нажатую кнопку до паузы — та же строка у любого игрока; смысл судит C-47 и ты
  ✗ pause     после паузы от story.pause.notice_min, которую поставила история, — нельзя, что бы ни нажал игрок
  ✗ remind    в напоминании или после него; ✗ noanswer — в ветке «не ответил» (и когда ею стал #silent)
  ✗ fallback  запасная кнопка после напоминаний, когда вести некуда
Пути: «неотвечающий» (как C-32 п. 7, C-32.no_answer_runs прогонов) и случайный (столько же), плюс текст
ink: где стоит каждая такая строка (ответ на #silent, напоминание, «не ответил», условие, ствол).
Давление C-37: реплики dict.pressure по главам без напоминаний (C-37.per_chapter), сроки dict.ultimatum,
реплики напоминаний с давлением, упрёком или сроком возвращения (R-120: без упрёка и без срока).
Ждёт без напоминаний (A-03, R-120, ST-66): развилки, где перед кнопками — входящая реплика собеседника
(не #sys, не служебный контакт, не «Вы»), а скрытых #remind нет. Хаб (ни одна кнопка не ведёт в чат того, кто
писал последним) и меню (все кнопки «+») — не в счёт: там никто не ждёт. Кнопки в начале узла (реплика пришла
из прошлого) — по журналу «неотвечающего»: «реплика из прошлого узла». Перебор-петлю на «*» скрипт не отличит —
сними на сверке. «?» — реплика-вопрос; «бот» — «неотвечающий» в реальном
времени здесь встал (stall waits, как ℹ «кнопка ждёт» в story:trace --compare silent). По клику напоминаний
нет по замыслу — список про реальное время, текст один на оба режима.

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --node      только этот узел (и его stitch)
  --runs N    прогонов на путь (по умолчанию C-32.no_answer_runs)
  --seed N    seed случайного пути (по умолчанию 1; «неотвечающий» — как в C-32)
  --missing   только развилки «ждёт без напоминаний»
  --json      всё данными (reminders.missing: node, contact, last_line, has_silent, has_noanswer, …)
  --help      эта справка

Сверка: npm run -s story:lint -- --story <id> --only C-32,C-37,C-47 — те же находки C-32.no_answer_reproach,
C-37.* и C-47.absence; npm run -s story:trace -- --story <id> --compare silent — путь «неотвечающего» целиком.`;

const SKIP = new Set(['tags', 'code', 'comment', 'gather']);

/** Последняя реплика перед кнопками в том же списке: { who, text, line } входящей или null. */
function lineBefore(items, i, service) {
  for (let j = i - 1; j >= 0; j--) {
    const it = items[j];
    if (SKIP.has(it.type)) continue;
    // без #from говорящий перенесён из прошлого узла: статически он неизвестен, решит #to кнопок
    if (it.type === 'msg') return service.has(it.who) ? null : it;
    // условие перед кнопками: реплика собеседника в конце любой ветки — он ждёт хотя бы на этом пути
    if (it.type === 'cond') {
      for (const b of it.branches) {
        const x = lineBefore(b.items, b.items.length, service);
        if (x) return x;
      }
    }
    return null;
  }
  return null;
}

/**
 * Развилки, где собеседник ждёт ответа, а напоминаний нет (A-03, R-120). Группа — подряд идущие варианты
 * одного списка, как в story:lint (static.mjs). Хаб и меню отсекаются: у хаба ни одна кнопка не ведёт к тому,
 * кто писал последним, у меню все кнопки «+» — оно возвращается само, ждать там некому.
 */
export function waitingForks(tree, service, chapterOf = () => null) {
  const out = [];
  const unresolved = [];
  for (const k of tree.knots) {
    const scan = (items) => {
      let i = 0;
      while (i < items.length) {
        const it = items[i];
        if (it.type !== 'choice') {
          if (it.type === 'cond') for (const b of it.branches) scan(b.items);
          i++;
          continue;
        }
        const start = i;
        const group = [];
        while (i < items.length && (items[i].type === 'choice' || items[i].type === 'comment')) {
          if (items[i].type === 'choice') group.push(items[i]);
          i++;
        }
        for (const c of group) scan(c.items);
        const buttons = group.filter((c) => c.role === 'button');
        if (!buttons.length || group.some((c) => c.role === 'remind')) continue;
        if (buttons.every((c) => c.sticky)) continue;
        const last = lineBefore(items, start, service);
        // кнопки в начале списка: реплика пришла раньше, из прошлого узла — решит журнал бота (waitingStalls)
        if (!last && start === 0 && items === k.items) unresolved.push({ node: k.id, line: group[0].line, texts: buttons.map((c) => c.text), has_silent: buttons.some((c) => 'silent' in c.tags), has_noanswer: group.some((c) => c.role === 'noanswer' || 'noanswer' in c.tags) });
        if (!last) continue;
        const named = buttons.filter((c) => !('silent' in c.tags)).map((c) => c.tags.to).filter(Boolean);
        const who = last.who ?? (new Set(named).size === 1 ? named[0] : null);
        if (!who) continue;
        // хаб — ни одна кнопка не отвечает тому, кто писал последним; кнопка без #to — текущий чат, то есть ему.
        // Смешанная развилка («ответить Лене / спросить Итана») — не хаб: Лена ждёт
        const tos = buttons.filter((c) => !('silent' in c.tags)).map((c) => c.tags.to || who);
        if (tos.length && !tos.includes(who)) continue;
        const noanswer = group.find((c) => c.role === 'noanswer' || 'noanswer' in c.tags);
        out.push({
          node: k.id, chapter: chapterOf(k.id), line: group[0].line, contact: who, last_line: last.text,
          question: /\?\s*$/.test(last.text), buttons: buttons.length,
          has_silent: buttons.some((c) => 'silent' in c.tags), has_noanswer: !!noanswer,
          // #noanswer:30m — свой срок: кнопка не стоит, но напоминаний перед ним всё равно нет
          noanswer_after: noanswer?.tags.noanswer || null,
        });
      }
    };
    const from = out.length;
    scan(k.items);
    // вложенные развилки собираются раньше внешних — читателю нужен порядок текста
    out.splice(from, out.length - from, ...out.slice(from).sort((a, b) => a.line - b.line));
  }
  out.unresolved = unresolved;
  return out;
}

/**
 * Те же развилки по журналу «неотвечающего» (stall waits): статика не видит кнопки в начале узла, когда
 * реплика пришла из прошлого. Последняя строка перед остановкой — входящая, кнопки отвечают её автору.
 */
export function waitingStalls(runs, service, unresolved) {
  const out = new Map();
  const groupOf = (knot, options) => unresolved.find((g) => g.node === knot && options.some((o) => g.texts.includes(o.text)));
  for (const r of runs) {
    let last = null;
    let stall = null;
    for (const e of r.events) {
      if (e.type === 'line') last = e;
      else if (e.type === 'stall') stall = e.reason === 'waits' ? e : null;
      else if (e.type === 'choice' && stall) {
        const named = e.options.filter((o) => !o.tags.includes('silent')).map((o) => o.tags.find((t) => t.startsWith('to:'))?.slice(3).trim()).filter(Boolean);
        const who = last?.who ?? (new Set(named).size === 1 ? named[0] : null);
        const ok = last?.kind === 'msg' && who && !service.has(who) && (!named.length || named.includes(who));
        const g = ok && groupOf(stall.knot, e.options);
        // одна строка на развилку: в петлю хаба бот входит с разными репликами
        if (g && !out.has(g)) out.set(g, { node: g.node, line: g.line, contact: who, last_line: last.text, buttons: g.texts.length, has_silent: g.has_silent, has_noanswer: g.has_noanswer });
        stall = null;
      }
    }
  }
  return [...out.values()];
}

const main = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
const args = main ? process.argv.slice(2) : [];
if (main && (args.includes('--help') || args.includes('-h'))) { console.log(HELP); process.exit(0); }
async function cli() {
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const T = thresholds();
  // id без ключа — тоже история: «guilt-scan.mjs the-number» не должен молча идти по всему каталогу
  const VALUED = new Set(['--story', '--node', '--runs', '--seed']);
  const positional = args.filter((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1]));
  const refs = storyRefs([...(opt('--story') ?? '').split(','), ...positional].filter(Boolean));
  const onlyNode = opt('--node');
  const runs = Number(opt('--runs') ?? T.value('C-32.no_answer_runs'));
  const seed = Number(opt('--seed') ?? 1);
  const inNode = (knot) => !onlyNode || knot === onlyNode || knot?.startsWith(`${onlyNode}.`);
  const CTX = {
    silent: '✓ ответ на нажатый #silent', button: '· ответ на нажатую кнопку — сверь смысл', pause: '✗ после паузы, которую поставила история',
    remind: '✗ после напоминания', noanswer: '✗ в ветке «не ответил»', fallback: '✗ после напоминаний и запасной кнопки', start: '· до первой кнопки',
  };
  const all = await loadChecks();
  const pick = (ids) => all.filter((c) => ids.includes(c.id));

  /** Где строка стоит в тексте: ответ на #silent, напоминание, «не ответил», условие или ствол. */
  function placeOf(path) {
    const choice = path.filter((p) => p.type === 'choice').at(-1);
    if (choice?.role === 'remind') return 'remind';
    if (choice?.role === 'noanswer') return 'noanswer';
    if (choice && 'silent' in choice.tags) return 'silent';
    if (path.some((p) => p.type === 'cond')) return 'cond';
    return choice ? 'button' : 'trunk';
  }
  const PLACE = { silent: 'ответ на #silent', remind: 'напоминание', noanswer: 'ветка «не ответил»', cond: 'под условием', button: 'ответ на кнопку', trunk: 'ствол' };

  /** Упрёки по прогонам: место → контексты (на скольких прогонах в каком). */
  function collect(runList) {
    const map = new Map();
    for (const r of runList) {
      for (const x of reproachContexts(r.events, T)) {
        if (!inNode(x.knot)) continue;
        const key = `${x.knot}|${x.text}`;
        if (!map.has(key)) map.set(key, { node: x.knot, text: x.text, ctx: {} });
        const p = map.get(key);
        p.ctx[x.ctx] = (p.ctx[x.ctx] ?? 0) + 1;
      }
    }
    return [...map.values()].map((p) => ({ ...p, forbidden: Object.keys(p.ctx).some((c) => FORBIDDEN.has(c)) }));
  }

  async function scan(ref) {
    const story = loadStory(ref);
    let ctx = null;
    const [c32, c37, c47] = pick(['C-32', 'C-37', 'C-47']);
    const probe = { ...c32, run(c, find) { ctx = c; c32.run(c, find); } };
    const res = await lintStory(story, T, { checks: [probe, c37, c47].filter(Boolean), runs: T.value('lint.runs.full'), seed: 1 });
    if (!ctx) return { id: story.id, path: story.path, error: res.findings[0]?.message ?? 'не собралась' };
    const { st, tree } = ctx;
    const unresponsive = silentRuns(ctx).runs.slice(0, runs);
    const rng = seeded(seed);
    const nodes = [...st.ids];
    const random = Array.from({ length: runs }, () => play(ctx.built.json, { rng, nodes, maxSteps: T.value('lint.max_steps'), strategy: strategies.random(), trackVars: false }));

    // текст: каждая строка-упрёк и где она стоит; напоминания — давление, упрёк, срок возвращения
    const text = [];
    const reminders = [];
    for (const k of tree.knots) {
      if (!inNode(k.id)) continue;
      walk(k.items, (it, path) => {
        if (it.type !== 'msg' || ctx.service.has(it.who)) return;
        const where = placeOf(path);
        if (isReproach(it.text, T)) text.push({ node: k.id, chapter: st.chapterOf(k.id), line: it.line, text: it.text, where });
        if (where === 'remind') {
          const t = it.text.toLowerCase();
          reminders.push({ node: k.id, chapter: st.chapterOf(k.id), text: it.text, reproach: isReproach(it.text, T), deadline: returnDeadline(it.text, T) || T.re('dict.ultimatum').test(t), pressure: T.re('dict.pressure').test(t) });
        }
      });
    }
    const pr = pressureLines(ctx);
    const perChapter = [...pr.perChapter].map(([chapter, list]) => ({ chapter, n: list.length, over: list.length > T.value('C-37.per_chapter'), lines: list.filter((x) => inNode(x.knot)).map((x) => ({ node: x.knot, text: x.text })) }));
    const series = unresponsive.flatMap((r) => reminderSeries(r.events)).filter((s) => inNode(s.knot));
    const seriesByKnot = new Map();
    for (const s of series) if (!seriesByKnot.has(s.knot) || s.n > seriesByKnot.get(s.knot).n) seriesByKnot.set(s.knot, s);
    // сверка с ботом: где «неотвечающий» в реальном времени встал у кнопки без напоминаний
    const stalled = new Set(unresponsive.flatMap((r) => r.events.filter((e) => e.type === 'stall' && e.reason === 'waits').map((e) => e.knot)));
    const forks = waitingForks(tree, ctx.service, (id) => st.chapterOf(id));
    const missing = forks.filter((f) => inNode(f.node)).map((f) => ({ ...f, bot_stall: stalled.has(f.node) }));
    for (const f of waitingStalls(unresponsive, ctx.service, forks.unresolved)) {
      if (inNode(f.node)) missing.push({ ...f, chapter: st.chapterOf(f.node), question: /\?\s*$/.test(f.last_line), noanswer_after: null, bot_stall: true, from: 'bot' });
    }
    const lintKeys = ['C-32.no_answer_reproach', 'C-37.per_chapter', 'C-37.false_deadline', 'C-37.shout_share', 'C-47.absence', 'C-47.lived_wait'];
    const lint = Object.fromEntries(lintKeys.map((k) => [k, res.findings.filter((f) => f.key === k && (!onlyNode || inNode(f.node))).length]));
    return {
      id: story.id, path: story.path, runs,
      unresponsive: collect(unresponsive), random: collect(random), text,
      pressure: { per_chapter: perChapter, limit: T.value('C-37.per_chapter'), in_reminders: pr.lines.filter((x) => x.reminder && x.pressure && inNode(x.knot)).length, ultimatum: pr.lines.filter((x) => x.ultimatum && inNode(x.knot)).map((x) => ({ node: x.knot, text: x.text, reminder: x.reminder })) },
      reminders: { lines: reminders, series: [...seriesByKnot.values()].map((s) => ({ node: s.knot, n: s.n, repeats: s.repeats, next: s.next })), max: T.value('story.reminders.max'), missing },
      lint,
    };
  }

  const report = [];
  for (const ref of refs) report.push(await scan(ref));
  if (args.includes('--json')) {
    console.log(JSON.stringify({ stories: report }, null, 1));
    process.exit(0);
  }

  const missingOnly = args.includes('--missing');
  const printMissing = (rm) => {
    const ms = rm.missing;
    console.log(`\n   ждёт без напоминаний (A-03, R-120 · P2): ${ms.length} развилок${ms.length ? `, из них вопросом ${ms.filter((m) => m.question).length}, бот встал в ${ms.filter((m) => m.bot_stall).length}` : ''}`);
    for (const m of ms) {
      const tail = [m.question && '?', m.bot_stall && 'бот', m.has_silent && '#silent есть', m.has_noanswer && `#noanswer${m.noanswer_after ? `:${m.noanswer_after}` : ''}`].filter(Boolean).join(', ');
      console.log(`      ⚠ ждёт без напоминаний · ${m.node} (гл. ${m.chapter ?? '—'}, стр. ${m.line}${m.from === 'bot' ? ', реплика из прошлого узла — по журналу бота' : ''}) · ${m.contact}: «${m.last_line}» → кнопок ${m.buttons}${tail ? ` · ${tail}` : ''}`);
    }
  };
  const ctxLine = (p) => Object.entries(p.ctx).map(([c, n]) => `${CTX[c] ?? c} ×${n}`).join('; ');
  for (const r of report) {
    if (r.error) { console.log(`${r.path}: нет данных — ${r.error}\n`); continue; }
    if (missingOnly) { console.log(r.path); printMissing(r.reminders); console.log(''); continue; }
    console.log(`${r.path} · путей по ${r.runs} прогонов: «неотвечающий» и случайный`);
    console.log(`   как в story:lint: ${Object.entries(r.lint).map(([k, n]) => `${k} ${n}`).join(' · ')}`);
    console.log(`\n   упрёки за отсутствие (dict.absence_reproach) в тексте: ${r.text.length}`);
    for (const x of r.text) console.log(`      ${x.where === 'silent' ? '✓' : x.where === 'remind' || x.where === 'noanswer' ? '✗' : '·'} ${x.node} (гл. ${x.chapter}) — ${PLACE[x.where]}: «${x.text}»`);
    for (const [name, list] of [['на пути «неотвечающего»', r.unresponsive], ['на случайном пути', r.random]]) {
      const bad = list.filter((p) => p.forbidden).length;
      console.log(`\n   ${name}: ${list.length} мест${list.length ? `, запрещённых ${bad}` : ''}`);
      for (const p of list.sort((a, b) => b.forbidden - a.forbidden)) console.log(`      ${p.node}: «${p.text}» — ${ctxLine(p)}`);
    }
    const pr = r.pressure;
    console.log(`\n   давление (C-37, без напоминаний): ${pr.per_chapter.length ? pr.per_chapter.map((c) => `гл. ${c.chapter} — ${c.n}${c.over ? ' ⚠' : ''}`).join(', ') : 'нет'} (предел C-37.per_chapter = ${pr.limit}); в напоминаниях не в счёт — ${pr.in_reminders}`);
    for (const c of pr.per_chapter.filter((x) => x.over)) for (const l of c.lines) console.log(`      гл. ${c.chapter} ${l.node}: «${l.text}»`);
    for (const u of pr.ultimatum) console.log(`      ⚠ срок «${u.text}» в ${u.node}${u.reminder ? ' (в напоминании)' : ''} — от скорости ответа ничего не зависит (C-37.false_deadline, R-114)`);
    const rm = r.reminders;
    console.log(`\n   напоминания: реплик ${rm.lines.length}, развилок с ними на пути «неотвечающего» ${rm.series.length}`);
    for (const l of rm.lines.filter((x) => x.reproach || x.deadline)) console.log(`      ✗ ${l.node}: «${l.text}» — ${[l.reproach && 'упрёк', l.deadline && 'срок'].filter(Boolean).join(' и ')} в напоминании (R-120)`);
    for (const s of rm.series.filter((x) => x.n > rm.max || x.repeats.length || x.next === 'стоит')) console.log(`      ✗ ${s.node}: напоминаний ${s.n}${s.repeats.length ? `, повтор «${s.repeats[0]}»` : ''}${s.next === 'стоит' ? ', после них история стоит' : ''} (C-32 п. 6)`);
    printMissing(rm);
    console.log('');
  }
  if (!report.length) console.log('историй нет');
}

if (main) await cli();
