// select-lenses — шаг 3 ревью: какие линзы (диагностические скиллы) запускать аудиторами и почему.
// Правило — references/routing.md: разметка (// reveal:, // финал:), метрики ink (контакты, паузы, финалы)
// и находки story:lint по полю owner. Каждая линза получает задание в формате агента story-auditor.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { runCli, table } from '../../../../scripts/story/core/cli.mjs';
import { allMarks, findEndings, parseDelay, walk } from '../../../../scripts/lib/ink.mjs';
import { LENSES, STATE_DIR, T, chapterStart, inputs, lensOf, prepare, rel } from './review-core.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/select-lenses.mjs --story <id> [--partial | --plan [путь]]
       [--focus story-pace,story-time] [--skip story-voice] [--symptom "<слова автора>"]
       [--task <линза> | --tasks] [--json]

Выбирает линзы ревью по references/routing.md и печатает таблицу «линза · запускать? · почему · ответ
уже в папке», точки холодного читателя и команду QA «шесть списков». Вывод story:lint берёт из кэша
review-cache.mjs (нет — прогоняет сам).

Линза выбирается, если:
  — у неё есть ошибки или предупреждения story:lint (owner — owners.md §3);
  — сработал её признак в разметке или метриках ink (routing.md, «Признаки»);
  — автор назвал её симптом (--focus).
В скелете (--plan) — только линзы с проверками структуры: у реплик, пауз и голоса текста ещё нет.

  --focus a,b       запустить эти линзы в любом случае (симптом автора → линза по таблице CLAUDE.md)
  --skip a,b        не запускать (автор просил не трогать) — причина пишется в таблицу
  --symptom "…"     фокус словами автора: попадёт в задание каждому аудитору
  --task <линза>    задание агенту story-auditor для одной линзы: строки story:lint этой линзы
                    (не больше skill.review.task_max_lines, остальное — счётом по проверкам)
  --tasks           задания всем выбранным линзам подряд
  --json            выбор, признаки и задания данными`;

const LEVEL_RU = { error: 'ошибка', warning: 'предупреждение', hint: 'подсказка' };
const ORDER = { error: 0, warning: 1, hint: 2 };

/** Признаки разметки и метрик ink — то, что команда видит без суждения. */
function signals(ctx) {
  const { tree, story } = ctx;
  const service = new Set([...T().value('dict.service_contacts'), ...(story.meta?.characters ?? []).filter((c) => c.service && c.id).map((c) => c.id)]);
  const speakers = new Set();
  let maxDelay = 0;
  let remind = 0;
  let choices = 0;
  for (const k of tree.knots) {
    walk(k.items, (it) => {
      if (it.who && !service.has(it.who) && (it.type === 'msg' || it.type === 'photo')) speakers.add(it.who);
      const d = it.tags?.delay;
      if (d) maxDelay = Math.max(maxDelay, parseDelay(d));
      if (it.type === 'choice') { choices += 1; if (it.tags && 'remind' in it.tags) remind += 1; }
    });
  }
  const marks = allMarks(tree);
  const endings = findEndings(tree);
  const endingVar = tree.vars.some((v) => v.name === 'ending');
  return {
    chapters: tree.chapters.length || Math.max(0, ...tree.knots.map((k) => k.chapter ?? 0)),
    speakers: [...speakers],
    maxDelay,
    remind,
    choices,
    reveal: marks.filter((m) => m.kind === 'reveal').length,
    endings: endings.endings.length,
    endingsMarked: endings.source === 'mark',
    endingVar,
    facts: existsSync(join(STATE_DIR, ctx.id, 'facts.md')),
    head: Object.keys(tree.head ?? {}),
    finalMarks: marks.filter((m) => m.kind === 'финал').length,
  };
}

/** Признак линзы: что в истории говорит, что эту линзу стоит запустить, даже если линт молчит. */
function trigger(lens, s, mode) {
  const T0 = T();
  const session = T0.value('story.pause.session_s');
  const notice = T0.value('story.pause.notice_min') * 60;
  switch (lens) {
    case 'story-opening': return mode !== 'plan' || s.chapters ? 'глава 1 в объёме ревью — начало проверяется всегда' : null;
    case 'story-choices': return s.choices ? `кнопок в ink: ${s.choices}` : null;
    case 'story-endings':
      if (mode === 'partial') return null;
      if (s.endings > 1) return `финалов: ${s.endings}${s.endingsMarked ? ' (// финал:)' : ''}`;
      if (s.endingVar) return 'VAR ending — финал различается состоянием';
      return null;
    case 'story-mystery':
      if (s.reveal) return `меток // reveal: ${s.reveal}`;
      if (s.facts) return `есть docs/stories/<id>/facts.md`;
      return null;
    case 'story-continuity': return s.speakers.length > 1 ? `пишут контактов: ${s.speakers.length} — сведения ходят между чатами` : null;
    case 'story-cast': return s.speakers.length > 1 ? `пишут контактов: ${s.speakers.length}` : null;
    case 'story-pace': return mode !== 'plan' ? 'текст есть — ритм проверяется всегда' : null;
    case 'story-pauses': return mode !== 'plan' && s.maxDelay >= session ? `самая длинная пауза ${Math.round(s.maxDelay / 60)} мин ≥ story.pause.session_s` : null;
    case 'story-time':
      if (mode === 'plan') return null;
      if (s.remind) return `напоминаний #remind: ${s.remind}`;
      return s.maxDelay >= notice ? 'есть паузы от story.pause.notice_min — оба режима (A-04)' : null;
    case 'story-voice': return mode !== 'plan' && s.speakers.length ? 'реплики есть — голоса и стиль проверяются всегда' : null;
    default: return null;
  }
}

function pick(ctx, args) {
  const s = signals(ctx);
  const focus = String(args.get('focus') ?? '').split(',').filter(Boolean);
  const skip = String(args.get('skip') ?? '').split(',').filter(Boolean);
  for (const x of [...focus, ...skip]) if (!lensOf(x)) throw new Error(`нет такой линзы: ${x} (линзы: ${LENSES.map((l) => l.id).join(', ')})`);
  const have = new Set(inputs(ctx.dir).filter((i) => i.kind === 'lens').map((i) => i.lens));
  const rows = LENSES.map((l) => {
    const mine = ctx.lint.findings.filter((f) => f.owner === l.id);
    const lv = { error: 0, warning: 0, hint: 0 };
    for (const f of mine) lv[f.level] += 1;
    const why = [];
    if (lv.error || lv.warning) why.push(`story:lint: ошибок ${lv.error}, предупреждений ${lv.warning}`);
    const t = trigger(l.id, s, ctx.mode);
    if (t) why.push(t);
    if (focus.includes(l.id)) why.push('симптом автора (--focus)');
    let run = why.length > 0;
    let reason = why.join('; ');
    if (ctx.mode === 'plan' && !l.plan && !focus.includes(l.id)) { run = false; reason = 'в скелете нет текста и пауз — линза после глав'; }
    if (skip.includes(l.id)) { run = false; reason = `автор просил не трогать (--skip)${reason ? `; было: ${reason}` : ''}`; }
    if (!run && !reason) reason = lv.hint ? `только подсказки (${lv.hint}) и нет признака — в приложение отчёта` : 'нет ни находок, ни признака';
    return { lens: l.id, what: l.what, run, reason, levels: lv, done: have.has(l.id), findings: mine };
  });
  return { signals: s, rows };
}

/** Задание агенту story-auditor (контракт — .claude/agents/story-auditor.md, «Задание»). */
function task(ctx, row, symptom) {
  const max = T().value('skill.review.task_max_lines');
  const list = [...row.findings].sort((a, b) => ORDER[a.level] - ORDER[b.level] || (a.chapter ?? 99) - (b.chapter ?? 99));
  const shown = list.slice(0, max);
  const rest = list.slice(max);
  const mode = ctx.mode === 'plan' ? `--plan ${ctx.skeleton ? rel(ctx.skeleton) : ''}`.trim() : ctx.mode === 'partial' ? '--partial' : 'полный';
  const lines = [
    `линза: ${row.lens}`,
    `история: ${ctx.id} | ${ctx.story.path}        режим: ${mode}`,
    `узлы (story:lint, owner = линза): ${list.length}${rest.length ? `, показано ${shown.length} (skill.review.task_max_lines)` : ''}`,
    ...shown.map((f) => `  ${LEVEL_RU[f.level]} · ${f.check} · ${f.node ?? '—'}${f.chapter ? ` (гл. ${f.chapter})` : ''} · ${f.message} · чинит ${f.owner}`),
  ];
  if (!list.length) lines.push('  — (строк нет: замерь сам командой из шага «Замер» скилла)');
  if (rest.length) {
    const by = new Map();
    for (const f of rest) { const k = `${LEVEL_RU[f.level]} ${f.check}`; if (!by.has(k)) by.set(k, []); by.get(k).push(f.node ?? '—'); }
    lines.push(`  ещё ${rest.length}: ${[...by].map(([k, n]) => `${k} ×${n.length} (${[...new Set(n)].slice(0, 4).join(', ')}${new Set(n).size > 4 ? ', …' : ''})`).join('; ')}`);
  }
  lines.push(`фокус: ${symptom || '—'}`);
  lines.push('');
  lines.push('Верни ответ ровно в формате раздела «Формат выхода» агента: находки строкой P1–P3, ложные с причиной, нет данных, вне линзы.');
  return lines.join('\n');
}

/** Точки холодного читателя: конец главы 1 (кто пишет, зачем) и середина (что дальше, кому не веришь). */
function coldPoints(ctx, s) {
  const ref = ctx.mode === 'plan' ? rel(ctx.skeleton) : ctx.ref;
  const cmd = (until, mode, profile) => `npm run -s story:cold-read -- --story ${ref} --until ${until} --mode ${mode} --profile ${profile} --ask`;
  const out = [];
  const tree = ctx.tree;
  const ends = findEndings(tree).endings;
  const last = ctx.mode === 'partial' && tree.knots.some((k) => k.id === 'beta_stop') ? 'beta_stop' : ends[0]?.id ?? tree.knots.at(-1)?.id;
  if (ctx.mode === 'plan') {
    const mid = chapterStart(tree, Math.ceil(s.chapters / 2) + 1) ?? last;
    if (mid) out.push({ file: 'cold-plan-attentive.md', why: 'Б-7: скелет глазами свежего читателя — что понятно и чего ждёшь', cmd: cmd(mid, 'guess', 'attentive') });
    return out;
  }
  const ch2 = chapterStart(tree, 2) ?? last;
  if (ch2) out.push({ file: 'cold-opening-hurried.md', why: 'начало: кто пишет, чего хочет, где бросил бы (торопливый)', cmd: cmd(ch2, 'opening', 'hurried') });
  if (s.chapters >= 3) {
    const mid = chapterStart(tree, Math.ceil(s.chapters / 2) + 1);
    if (mid) out.push({ file: 'cold-middle-skeptic.md', why: 'середина: что дальше, кому не веришь (скептик)', cmd: cmd(mid, 'guess', 'skeptic') });
  }
  return out;
}

await runCli(HELP, async (args) => {
  const ctx = prepare(args);
  const { signals: s, rows } = pick(ctx, args);
  const symptom = args.get('symptom') && args.get('symptom') !== true ? String(args.get('symptom')) : '';
  const one = args.get('task');
  if (one && one !== true) {
    const row = rows.find((r) => r.lens === one);
    if (!row) throw new Error(`нет такой линзы: ${one}`);
    console.log(task(ctx, row, symptom));
    return 0;
  }
  const cold = coldPoints(ctx, s);
  const qa = ctx.mode === 'plan' ? null : `node \${CLAUDE_SKILL_DIR}/scripts/qa-six.mjs --story ${ctx.ref}${ctx.mode === 'partial' ? ' --partial' : ''}`;
  if (args.has('json')) {
    console.log(JSON.stringify({
      story: ctx.id, mode: ctx.mode, key: ctx.key, dir: rel(ctx.dir), signals: s,
      lenses: rows.map(({ findings, ...r }) => ({ ...r, task: r.run ? task(ctx, { ...r, findings }, symptom) : null })),
      cold, qa,
    }, null, 1));
    return 0;
  }
  if (args.has('tasks')) {
    for (const r of rows.filter((x) => x.run)) console.log(`${'─'.repeat(8)} ${r.lens} → ${rel(join(ctx.dir, `lens-${r.lens}.md`))}\n${task(ctx, r, symptom)}\n`);
    return 0;
  }
  console.log(`story-review · ${ctx.id} · режим ${ctx.mode} · папка прогона ${rel(ctx.dir)}`);
  console.log(`признаки: глав ${s.chapters}, пишут контактов ${s.speakers.length}, кнопок ${s.choices}, финалов ${s.endings}` +
    `${s.endingVar ? ' + VAR ending' : ''}, // reveal: ${s.reveal}, #remind: ${s.remind}, самая длинная пауза ${Math.round(s.maxDelay / 60)} мин`);
  const missing = ['ставка', 'вопрос', 'оси', 'логлайн'].filter((k) => !s.head.includes(k));
  if (ctx.mode !== 'plan' && (missing.length || (!s.reveal && !s.finalMarks))) {
    console.log(`разметка A-06: ${missing.length ? `в шапке нет ${missing.map((k) => `// ${k}:`).join(', ')}` : 'шапка есть'}; меток // reveal: ${s.reveal}, // финал: ${s.finalMarks}` +
      ' — C-24, C-54 и C-06 без неё молчат или считают по графу (LOCAL-02): скрытую правду назовёт только автор → --focus story-mystery');
  }
  console.log('');
  console.log(table(rows.map((r) => [r.lens, r.run ? 'да' : '—', r.done ? 'есть' : '—', r.reason]), ['линза', 'запускать', 'ответ', 'почему']));
  const todo = rows.filter((r) => r.run && !r.done);
  console.log(`\nаудиторов запустить: ${todo.length}${rows.some((r) => r.run && r.done) ? ` (ещё ${rows.filter((r) => r.run && r.done).length} уже разобраны на этой ревизии)` : ''}`);
  console.log('задание каждому: тот же вызов с --task <линза> (или --tasks — все); ответ сохранить в lens-<линза>.md папки прогона');
  console.log('\nхолодный читатель (Opus, A-07); ответ — в файл папки прогона:');
  for (const c of cold) console.log(`  ${c.file} — ${c.why}\n    ${c.cmd}`);
  if (qa) console.log(`\nQA «шесть списков» (qa-six.md): кандидаты — ${qa}; шесть списков модели — в qa-six.md папки прогона`);
  return 0;
});
