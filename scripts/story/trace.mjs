// story:trace — прохождения персонами: переписка, маршрут, переменные, время в обоих режимах.
import { readFileSync } from 'node:fs';
import { runCli, intFlag } from './core/cli.mjs';
import { PERSONAS, PERSONA_IDS, parsePersonas } from './core/personas.mjs';
import { NO_ANSWER, reminderSeries } from '../lib/bot.mjs';
import { BETA_STOP, parseValue, prepare, readSave, runOnce } from './core/run.mjs';
import { fmtDuration, fmtMoment } from './core/timeline.mjs';
import { isReproach } from '../lib/lexicon.mjs';
import { threshold } from '../lib/thresholds.mjs';
import { cutAt, visibleText } from './core/visible.mjs';

const HELP = `npm run story:trace -- [--story <id>] [--persona <имя>|all] [--runs N] [--seed N]
                       [--mode click|realtime] [--visible] [--partial] [--until <узел>]
                       [--start <узел> --set var=значение …] [--from-save <файл>] [--route 0,2,1]
                       [--compare silent] [--json]

Прохождение истории ботом-персоной: переписка как в чате, маршрут кнопок, переменные и время.

Персоны:
${PERSONA_IDS.map((id) => `  ${id.padEnd(13)}${PERSONAS[id].name} — ${PERSONAS[id].about}`).join('\n')}

  --story <id>      история по id, файл .json / .ink или папка; можно несколько через запятую;
                    по умолчанию все из src/stories
  --persona         одна, несколько через запятую или all (по умолчанию random)
  --runs N          прохождений на персону (порог trace.runs); прогон k идёт с seed + k
  --seed N          начальный seed (по умолчанию 1): один seed — одно и то же прохождение
  --mode            realtime — паузы настоящие (по умолчанию); click — пауз нет, остаются только
                    короткие до C-31.click_delay_max_s, на скачке от engine.click.time_jump_label — метка «спустя …»
  --visible         только то, что видит игрок: чаты, реплики, кнопки, тишина; без узлов, тегов и переменных
  --partial         история из части глав: узел ${BETA_STOP} — законный конец, а не финал
  --until <узел>    печатать до первого входа в узел (прохождение идёт целиком)
  --start <узел>    начать с узла; --set var=значение (можно несколько) — переменные перед стартом
  --from-save <файл> продолжить с сохранения движка (relay:<id> из localStorage, или вся выгрузка
                    localStorage) либо повторить маршрут из --json этой же команды
  --route 0,2,1     номера кнопок (с нуля) по порядку развилок, -1 — «не ответил» (напоминания и ветка
                    «не ответил»); дальше — персона. Маршрут каждого прохождения печатается в шапке,
                    им прохождение воспроизводится
  --compare silent  «неотвечающий» против #silent в тех же развилках (C-32 п. 6–7): ветка «не ответил»
                    (напоминания #remind, потом #noanswer или #silent) против нажатого #silent — финалы,
                    переменные и варианты на следующей развилке должны совпасть или «не ответил» —
                    стоить не дороже; плюс напоминания у каждой развилки (сколько, повторы, есть ли
                    продолжение), развилки, где «не ответил» некуда вести, и упрёки за отсутствие
  --json            всё данными: прохождения с хронологией (для других команд и скиллов)
  --help            эта справка

«Неотвечающий» в реальном времени ждёт напоминаний (#remind:2h у скрытого варианта развилки), потом
идёт веткой «не ответил»: #noanswer, иначе #silent. По клику напоминаний нет, кнопка ждёт — это stall.
Синтаксис — docs/capabilities.json, «Напоминание при молчании».`;

const fmtT = (sec) => {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const show = (v) => (typeof v === 'string' ? JSON.stringify(v) : String(v));

/** Полный журнал: время, глава, узел, теги, переменные, кнопки с номерами. */
function fullText(r, items, mode) {
  const out = [];
  const state = { ...r.initial };
  for (const it of items) {
    if (it.type === 'line') {
      const t = mode === 'click' ? it.tClick : it.tReal;
      const d = mode === 'click' ? it.clickDelay : it.delay;
      if (it.isChapter) {
        const changed = Object.entries(state).filter(([k, v]) => r.initial[k] !== v).map(([k, v]) => `${k}=${show(v)}`);
        out.push(`══ глава ${it.chapter} · переменные: ${changed.length ? changed.join(', ') : 'без изменений'}`);
      }
      const pause = d ? ` ⏸ ${fmtDuration(d)}` : mode === 'click' && it.jump ? ` (скачок ${fmtDuration(it.delay)}: метка «спустя»)` : '';
      const who = it.kind === 'me' ? `я→${it.thread}` : it.kind === 'sys' ? `sys@${it.thread}` : it.who ?? '?';
      out.push(`${fmtT(t)} гл.${it.chapter} ${it.knot ?? '—'} · ${who}: ${it.text}${pause}${it.unlock.length ? ` [+${it.unlock.join(', ')}]` : ''}`);
    } else if (it.type === 'var') {
      state[it.name] = it.value;
      out.push(`         ~ ${it.name}: ${show(it.prev)} → ${show(it.value)}`);
    } else if (it.type === 'remind') {
      out.push(`         … молчит ${fmtDuration(it.wait)} → напоминание ${it.n}${it.text ? ` «${it.text}»` : ''}`);
    } else if (it.type === 'stall') {
      const why = { click: 'по клику напоминаний нет, кнопка ждёт', waits: 'ни напоминаний, ни срока #noanswer — кнопка ждёт', 'no-target': `после ${it.reminders} напоминаний нет ни #noanswer, ни #silent — история стоит` }[it.reason];
      out.push(`         ■ молчит: ${why}; дальше случайная кнопка`);
    } else if (it.type === 'choice') {
      const opts = it.options.map((o, i) => `${i === it.picked ? '▶' : ' '}${i} «${o.text}»${o.silent ? ' #silent' : ''}${o.to ? ` #to:${o.to}` : ''}`);
      out.push(`         ? ${opts.join('  ')}`);
      if (it.noAnswer) out.push(`         ▶ не ответил: молчит ${fmtDuration(it.noAnswer.seconds)} после ${it.noAnswer.reminders} напоминаний → ${it.noAnswer.via === 'silent' ? `#silent «${it.text}»` : '#noanswer'}`);
    } else if (it.type === 'end') out.push(`■ END в ${it.knot}`);
    else if (it.type === 'stuck') out.push(`■ предел ${threshold('bot.max_lines')} строк в ${it.knot}: возможен цикл`);
  }
  return out.join('\n');
}

const compactItem = (it, visible) => {
  if (visible) {
    if (it.type === 'line') return { type: 'line', chat: it.name, who: it.kind === 'me' ? 'Вы' : it.kind === 'sys' ? null : it.whoName ?? it.name, kind: it.kind, text: it.text, pause: it.delay };
    if (it.type === 'choice') return { type: 'choice', chat: it.name, options: it.options.map((o) => o.text), picked: it.picked, silent: it.silent, ...(it.noAnswer ? { noAnswer: true, wait: it.noAnswer.seconds } : {}) };
    if (it.type === 'remind') return { type: 'remind', wait: it.wait };
    if (it.type === 'var' || it.type === 'stall') return null;
    return { type: it.type };
  }
  const { tags, ...rest } = it;
  return rest;
};

/** «Неотвечающий» против #silent в тех же развилках: ветка «не ответил» (с напоминаниями) против нажатого #silent. */
function compareSilent(p, base) {
  const u = runOnce(p, { ...base, persona: 'unresponsive' });
  const forks = u.timeline.items.filter((i) => i.type === 'choice');
  const pairs = [];
  let noSilent = 0;
  forks.forEach((f, j) => {
    if (!f.noAnswer) return;
    const b = f.options.findIndex((o) => o.silent);
    if (b < 0) { noSilent++; return; }
    const prefix = u.route.slice(0, j);
    const tail = { ...base, persona: 'random', seed: (base.seed ?? 1) * 1000 + j };
    const A = runOnce(p, { ...tail, route: [...prefix, NO_ANSWER] });
    const B = runOnce(p, { ...tail, route: [...prefix, b] });
    const nextOpts = (r) => r.timeline.items.filter((i) => i.type === 'choice')[j + 1]?.options.map((o) => o.text) ?? [];
    const na = nextOpts(A);
    const nb = nextOpts(B);
    const lost = nb.filter((t) => !na.includes(t));
    const varDiff = Object.keys(B.vars ?? {}).filter((k) => JSON.stringify(A.vars[k]) !== JSON.stringify(B.vars[k]));
    pairs.push({
      knot: f.knot, chapter: f.chapter, via: f.noAnswer.via, reminders: f.noAnswer.reminders,
      silent: b, endingNoAnswer: A.ending.name, endingSilent: B.ending.name,
      sameEnding: A.ending.name === B.ending.name, varDiff, lostOptions: lost,
      ok: A.ending.name === B.ending.name && !lost.length,
    });
  });
  const reproach = [];
  let lastSilent = true;
  for (const it of u.timeline.items) {
    // упрёк уместен только как реакция на нажатый #silent; после «не ответил» — нет (R-74, R-120)
    if (it.type === 'choice') lastSilent = it.silent && !it.noAnswer;
    else if (it.type === 'line' && (it.kind === 'in' || it.kind === 'photo') && isReproach(it.text) && !lastSilent) {
      reproach.push({ knot: it.knot, chapter: it.chapter, text: it.text });
    }
  }
  const max = threshold('story.reminders.max');
  const reminders = reminderSeries(u.timeline.items);
  const badReminders = reminders.filter((r) => r.n > max || r.repeats.length || r.next === 'стоит');
  const stalls = new Map();
  for (const s of u.stalls.filter((x) => x.reason !== 'no-target')) stalls.set(s.knot, (stalls.get(s.knot) ?? 0) + 1);
  return {
    seed: u.seed, forks: forks.length, noAnswer: forks.filter((f) => f.noAnswer).length, noSilent, pairs, reproach, reminders,
    stalls: [...stalls].map(([knot, n]) => ({ knot, n })),
    ok: pairs.every((x) => x.ok) && !reproach.length && !badReminders.length,
  };
}

function compareText(c) {
  const out = [`  seed ${c.seed}: развилок ${c.forks}, «не ответил» в ${c.noAnswer} (из них с #silent рядом ${c.pairs.length}, без #silent ${c.noSilent}), история стоит в ${c.stalls.reduce((s, x) => s + x.n, 0)}`];
  const bad = c.pairs.filter((x) => !x.ok);
  if (!c.pairs.length) out.push('   ℹ «не ответил» рядом с #silent не встретился — сравнивать не с чем');
  else out.push(bad.length
    ? bad.map((x) => `   ⚠ ${x.knot}: «не ответил» → ${x.endingNoAnswer}, #silent → ${x.endingSilent}${x.lostOptions.length ? `; «не ответил» закрывает: ${x.lostOptions.map((t) => `«${t}»`).join(', ')}` : ''}`).join('\n')
    : `   ✓ во всех ${c.pairs.length} развилках с #silent исходы и следующие варианты совпадают${c.pairs.length && c.pairs.every((x) => x.via === 'silent' && !x.reminders) ? ' (напоминаний нет, «не ответил» — тот же #silent: совпадение ожидаемо)' : ''}`);
  const max = threshold('story.reminders.max');
  for (const r of c.reminders) {
    const issues = [];
    if (r.n > max) issues.push(`${r.n} напоминаний — больше ${max}`);
    if (r.repeats.length) issues.push(`дословный повтор: ${r.repeats.map((t) => `«${t}»`).join(', ')}`);
    if (r.next === 'стоит') issues.push('после последнего история стоит');
    out.push(`   ${issues.length ? '✗' : '✓'} ${r.knot ?? '(до первого узла)'}: напоминаний ${r.n} (${r.waits.map(fmtDuration).join(', ')}) → ${r.next}${issues.length ? ` — ${issues.join('; ')}` : ''}`);
  }
  if (c.stalls.length) out.push(`   ℹ кнопка ждёт (нет напоминаний и срока #noanswer): ${c.stalls.slice(0, 8).map((s) => `${s.knot}${s.n > 1 ? ` ×${s.n}` : ''}`).join(', ')}${c.stalls.length > 8 ? ` и ещё ${c.stalls.length - 8}` : ''}`);
  for (const r of c.reproach.slice(0, 5)) out.push(`   ⚠ упрёк за отсутствие не после #silent: ${r.knot}: «${r.text}»`);
  return out.join('\n');
}

runCli(HELP, async (args) => {
  const json = args.has('json');
  const personas = parsePersonas(args.get('persona'));
  const runs = intFlag(args, 'runs', threshold('trace.runs'));
  const seed = intFlag(args, 'seed', 1);
  const mode = args.get('mode', 'realtime');
  if (!['click', 'realtime'].includes(mode)) throw new Error(`--mode: click или realtime, а не «${mode}»`);
  const visible = args.has('visible');
  const partial = args.has('partial');
  const until = args.get('until');
  const start = args.get('start');
  const set = {};
  for (const s of args.all('set')) {
    const i = String(s).indexOf('=');
    if (i <= 0) throw new Error(`--set: нужно var=значение, а не «${s}»`);
    set[s.slice(0, i).trim()] = parseValue(s.slice(i + 1).trim());
  }
  const route = args.get('route') ? String(args.get('route')).split(',').map((x) => Number(x.trim())) : null;
  if (route?.some((n) => !Number.isInteger(n) || n < NO_ANSWER)) throw new Error('--route: номера кнопок через запятую, с нуля; -1 — «не ответил»');
  const compare = args.get('compare');
  if (compare && compare !== 'silent') throw new Error(`--compare: пока есть только silent, а не «${compare}»`);

  const report = [];
  for (const ref of args.refs) {
    const p = prepare(ref);
    if (partial && !p.nodes.includes(BETA_STOP)) throw new Error(`${p.story.path}: --partial, но узла ${BETA_STOP} нет`);
    const save = args.get('from-save') ? readSave(args.get('from-save'), p.story.id) : null;
    const base = { mode, partial, start, set, save, route };
    if (compare) {
      const list = [];
      for (let k = 0; k < runs; k++) list.push(compareSilent(p, { ...base, seed: seed + k }));
      report.push({ id: p.story.id, path: p.story.path, compare: 'silent', ok: list.every((c) => c.ok), runs: list });
      if (!json) {
        console.log(`${p.story.path} · неотвечающий против #silent · ${mode}`);
        for (const c of list) console.log(compareText(c));
      }
      continue;
    }
    const out = [];
    for (const persona of personas) {
      for (let k = 0; k < runs; k++) {
        const r = runOnce(p, { ...base, persona, seed: seed + k });
        const items = cutAt(r.timeline.items, until);
        out.push({ r, items });
        if (json) continue;
        const head = [
          `# ${p.story.path} · ${PERSONAS[persona].name} (${persona}) · seed ${r.seed} · ${mode === 'click' ? 'по клику' : 'реальное время'}`,
          `маршрут: --route ${r.route.join(',') || '—'}${r.start ? ` --start ${r.start}` : ''}${r.set ? ' ' + Object.entries(r.set).map(([a, b]) => `--set ${a}=${b}`).join(' ') : ''}`,
          `финал: ${r.ending.name} · строк ${r.timeline.totals.lines} · кнопок ${r.timeline.totals.choices} · реальное время ${fmtDuration(r.timeline.totals.real)} · по клику ${fmtDuration(r.timeline.totals.click)}`,
        ];
        if (r.stalls.length) {
          const dead = r.stalls.filter((s) => s.reason === 'no-target');
          const waits = r.stalls.filter((s) => s.reason !== 'no-target');
          if (waits.length) head.push(`кнопка ждёт в ${waits.length} развилках (${mode === 'click' ? 'по клику напоминаний нет' : 'нет напоминаний и срока #noanswer'}): ${[...new Set(waits.map((s) => s.knot))].slice(0, 8).join(', ')}`);
          if (dead.length) head.push(`✗ после напоминаний история стоит: ${[...new Set(dead.map((s) => s.knot))].join(', ')}`);
        }
        if (r.timeline.batches.length) {
          const b = r.timeline.batches;
          head.push(`отлучек ${b.length}: пачка при возвращении — до ${Math.max(...b.map((x) => x.lines))} сообщений, в среднем ${(b.reduce((s, x) => s + x.lines, 0) / b.length).toFixed(1)}; самая долгая отлучка ${fmtDuration(Math.max(...b.map((x) => x.span ?? 0)))} (${fmtMoment(b.reduce((m, x) => ((x.span ?? 0) > (m.span ?? 0) ? x : m)).leftAt)})`);
        }
        if (visible) console.log(`== переписка · ${PERSONAS[persona].name} · seed ${r.seed} · ${mode === 'click' ? 'по клику' : 'реальное время'}\n\n${visibleText(items, mode)}\n`);
        else console.log(`${head.join('\n')}\n\n${fullText(r, items, mode)}\n`);
      }
    }
    report.push({
      id: p.story.id, path: p.story.path, mode, visible,
      runs: out.map(({ r, items }) => ({
        persona: r.persona, seed: r.seed, mode, route: r.route, start: r.start, set: r.set,
        ended: r.ended, ending: r.ending, totals: r.timeline.totals,
        stalls: r.stalls, batches: r.timeline.batches,
        ...(visible ? {} : { initial: r.initial, vars: r.vars }),
        items: items.map((i) => compactItem(i, visible)).filter(Boolean),
      })),
    });
  }
  if (json) console.log(JSON.stringify({ stories: report }, null, 1));
});
