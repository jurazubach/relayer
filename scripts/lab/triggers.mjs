// Тест срабатывания скиллов: каждую фразу автора гоняем через claude -p и смотрим, какой скилл вызван.
// Модель недетерминирована, поэтому результат — доля по нескольким прогонам, а не «да / нет».
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NONE, loadThresholds, projectSkills, loadPhraseDir, parseSkillFile, buildPlan,
  createStreamParser, summarize, checkEnv, gate, pct, isHit,
} from './triggers-lib.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SKILLS = join(ROOT, '.claude/skills');
const PHRASES = join(ROOT, 'docs/lab/triggers');
const RUNS = join(ROOT, 'docs/lab/runs/triggers');
const THRESHOLDS = join(ROOT, 'docs/playbook/thresholds.json');
const ENV = join(PHRASES, '_env.json');

const HELP = `Тест срабатывания скиллов: какая фраза автора какой скилл вызывает.

  npm run lab:triggers                       все фразы всех проектных скиллов
  npm run lab:triggers -- --skill story-pace только этот скилл и его соседи
  npm run lab:triggers -- --dry-run          показать план, ничего не запускать
  npm run lab:triggers -- --check-env        только сверить листинг скиллов с ожидаемым

Фразы: docs/lab/triggers/<скилл>.json — { "positive": [...], "negative": [...], "neighbors": [...] };
docs/lab/triggers/_routing.json — { "фраза": "скилл" | "none" }. Шаблон и пример — _template.json,
_example.json, описание — docs/lab/triggers/README.md. Фразы скиллов, которых ещё нет в .claude/skills,
пропускаются: пустой набор проходит без единого запуска.

Каждая фраза — N прогонов claude -p --model <модель> --output-format stream-json --verbose
--no-session-persistence --strict-mcp-config из корня репозитория. Срабатывание — первый вызов Skill
вне агентов (claude-code-format.md §4.2). Чтение SKILL.md через Read/Bash — колонка «обход», не попадание.

Флаги:
  --skill <имя>       только фразы скилла, его соседей и маршруты к ним
  --file <путь>       прогнать один файл фраз (например, _example.json), даже если скилла нет в проекте
  --runs <N>          прогонов на фразу (по умолчанию lab.triggers.runs_per_phrase)
  --min [доля]        код выхода 1, если у какого-то скилла попаданий меньше доли (0.8 или 80%)
                      или ложных больше lab.triggers.max_false; без числа — lab.triggers.min_share
                      (--min build — мягкий порог сборки скилла, lab.triggers.min_share_build)
  --max-false <доля>  допустимая доля ложных для --min вместо lab.triggers.max_false
  --jobs <N>          одновременных запусков claude, 1–3 (по умолчанию lab.triggers.jobs)
  --model <имя>       модель (по умолчанию claude-opus-5-5)
  --max-turns <N>     обрыв прогона после N ходов (по умолчанию lab.triggers.max_turns: нужен только
                      первый вызов)
  --timeout <сек>     предел на один прогон (по умолчанию lab.triggers.timeout_s)
  --strict-env        не запускать, если в листинге чужие скиллы, плагины или MCP
  --check-env         только сверка окружения
  --dry-run           только план: какие фразы и сколько прогонов
  --out <путь>        куда записать результат (по умолчанию docs/lab/runs/triggers/<дата>.json)
  --no-save           не записывать результат
  --json              вывод в JSON
  --quiet             без таблицы фраз, только итог по скиллам
  --help              эта справка

Пороги и умолчания — ключи lab.triggers.* (runs_per_phrase, min_share, max_false, jobs, max_turns,
timeout_s) в docs/playbook/thresholds.json; ключа нет — ошибка загрузки, запасных чисел в коде нет.

Прогон ничего не пишет и не публикует: запись, артефакты, расписания и рассылки запрещены
(--disallowedTools), всё, что спросило бы разрешения, отклоняется (--permission-prompts none). Если git status после прогона изменился — предупреждение.
Код выхода: 0 — прошло, 1 — не прошли пороги --min, 2 — ошибка запуска или файлов фраз.`;

const FLAGS_WITH_VALUE = ['--skill', '--file', '--runs', '--max-false', '--jobs', '--model', '--max-turns', '--timeout', '--out'];
const FLAGS = ['--min', '--strict-env', '--check-env', '--dry-run', '--no-save', '--json', '--quiet', '--help', '-h'];

function parseArgs(argv) {
  const o = {};
  const bad = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (FLAGS_WITH_VALUE.includes(a)) {
      if (argv[i + 1] === undefined || argv[i + 1].startsWith('--')) bad.push(`${a} без значения`);
      else o[a.slice(2)] = argv[++i];
    } else if (a === '--min') {
      o.min = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    } else if (FLAGS.includes(a)) o[a.replace(/^-+/, '')] = true;
    else bad.push(`неизвестный аргумент: ${a}`);
  }
  return { o, bad };
}

function share(v, flag) {
  const n = String(v).endsWith('%') ? parseFloat(v) / 100 : parseFloat(v);
  if (!(n >= 0 && n <= 1)) throw new Error(`${flag}: нужна доля от 0 до 1 или процент, а не «${v}»`);
  return n;
}

function int(v, flag, lo, hi) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < lo || n > hi) throw new Error(`${flag}: нужно целое от ${lo} до ${hi}, а не «${v}»`);
  return n;
}

// Прогон не должен ничего менять ни в репозитории, ни снаружи: запись, публикации, расписания, рассылки.
// Скилл от этого не зависит — его вызов гасит процесс раньше, чем дойдёт до дела.
const DENY = [
  'Write', 'Edit', 'NotebookEdit', 'Artifact', 'ArtifactComments', 'ArtifactData', 'DesignSync',
  'CronCreate', 'CronDelete', 'RemoteTrigger', 'ScheduleWakeup', 'PushNotification', 'SendMessage',
  'EnterWorktree', 'Workflow',
];

function claudeArgs(prompt, o) {
  return [
    '-p', prompt,
    '--model', o.model,
    '--output-format', 'stream-json', '--verbose',
    '--no-session-persistence', '--strict-mcp-config',
    '--max-turns', String(o.maxTurns),
    '--permission-prompts', 'none',
    '--disallowedTools', DENY.join(','),
  ];
}

/** Один прогон фразы. Как только найден вызов Skill, процесс гасим: дальше скилл начнёт работу, а она не нужна. */
function runOnce(prompt, o, { untilInit = false } = {}) {
  return new Promise((done) => {
    const parser = createStreamParser();
    const child = spawn('claude', claudeArgs(prompt, o), { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    let stopped = null;
    const stop = (why) => {
      if (stopped) return;
      stopped = why;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5000).unref();
    };
    const timer = setTimeout(() => stop('timeout'), o.timeout * 1000);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      parser.feed(chunk);
      if (untilInit && parser.init) stop('init');
      else if (parser.skill) stop('skill');
    });
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (e) => {
      clearTimeout(timer);
      done({ error: `не удалось запустить claude: ${e.message}`, skill: null, bypass: [] });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const r = parser.end();
      const out = { skill: r.skill, bypass: r.bypass, tools: r.tools, init: r.init, turns: r.result?.num_turns ?? null, cost: r.result?.cost ?? null, stopped };
      // --max-turns обрывает прогон с ошибкой (claude-code-format.md §4.2), это не сбой; сбой — если ответа не было вовсе.
      if (stopped === 'timeout' && !r.skill) out.error = `не уложился в ${o.timeout} с`;
      else if (!r.init && !untilInit) out.error = `claude вышел с кодом ${code}: ${stderr.trim().split('\n').slice(-3).join(' ') || 'без вывода'}`;
      done(out);
    });
  });
}

async function pool(tasks, jobs, onDone) {
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++;
      await tasks[i]();
      onDone?.();
    }
  };
  await Promise.all(Array.from({ length: Math.min(jobs, tasks.length) }, worker));
}

function gitStatus() {
  try {
    return execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  } catch {
    return null;
  }
}

function readEnv() {
  if (!existsSync(ENV)) return { allowed: [] };
  const data = JSON.parse(readFileSync(ENV, 'utf8'));
  return { allowed: data.allowed ?? [] };
}

function table(rows, head) {
  const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (r) => r.map((c, i) => String(c).padEnd(w[i])).join('  ').trimEnd();
  return [line(head), line(w.map((n) => '─'.repeat(n))), ...rows.map(line)].join('\n');
}

const say = (o, ...a) => !o.json && console.log(...a);
const warn = (o, ...a) => !o.json && console.error(...a);

async function main() {
  const { o: raw, bad } = parseArgs(process.argv.slice(2));
  if (raw.help || raw.h) return console.log(HELP);
  if (bad.length) {
    console.error(`${bad.join('\n')}\n\n${HELP}`);
    return (process.exitCode = 2);
  }

  const th = loadThresholds(THRESHOLDS);
  const o = {
    json: !!raw.json,
    quiet: !!raw.quiet,
    model: raw.model ?? 'claude-opus-5-5',
    runs: raw.runs ? int(raw.runs, '--runs', 1, 20) : th.values['lab.triggers.runs_per_phrase'],
    jobs: raw.jobs ? int(raw.jobs, '--jobs', 1, 3) : th.values['lab.triggers.jobs'],
    maxTurns: raw['max-turns'] ? int(raw['max-turns'], '--max-turns', 1, 10) : th.values['lab.triggers.max_turns'],
    timeout: raw.timeout ? int(raw.timeout, '--timeout', 10, 1800) : th.values['lab.triggers.timeout_s'],
    min: raw.min === undefined ? null : raw.min === true ? th.values['lab.triggers.min_share'] : raw.min === 'build' ? th.values['lab.triggers.min_share_build'] : share(raw.min, '--min'),
    maxFalse: raw['max-false'] ? share(raw['max-false'], '--max-false') : th.values['lab.triggers.max_false'],
  };
  const defaults = Object.entries(th.source).filter(([, s]) => s === 'default').map(([k]) => k);

  const present = projectSkills(SKILLS);
  let set;
  if (raw.file) {
    const path = resolve(process.cwd(), raw.file);
    const s = parseSkillFile(JSON.parse(readFileSync(path, 'utf8')), relative(ROOT, path));
    set = { skills: [s], routing: [], errors: s.errors };
  } else set = loadPhraseDir(PHRASES);
  if (set.errors.length) {
    console.error(`✗ файлы фраз:\n  ${set.errors.join('\n  ')}`);
    return (process.exitCode = 2);
  }
  if (raw.skill && !raw.file && !set.skills.some((s) => s.skill === raw.skill) && !set.routing.some((r) => r.owner === raw.skill)) {
    console.error(`✗ для скилла «${raw.skill}» нет фраз: ни docs/lab/triggers/${raw.skill}.json, ни строк в _routing.json`);
    return (process.exitCode = 2);
  }
  const plan = buildPlan(set, { present, focus: raw.skill ?? null, explicit: !!raw.file });
  const total = plan.phrases.length * o.runs;

  if (raw['dry-run']) {
    const out = { present, group: plan.group, runs: o.runs, phrases: plan.phrases.map((p) => ({ text: p.text, expect: p.checks.map((c) => c.expect) })), skipped: plan.skipped.map((s) => ({ text: s.text, reason: s.reason })), launches: total, defaults };
    if (o.json) return console.log(JSON.stringify(out, null, 2));
    say(o, `Проектных скиллов: ${present.length}${present.length ? ` (${present.join(', ')})` : ''}`);
    if (plan.group) say(o, `Группа --skill: ${plan.group.join(', ')}`);
    say(o, `Фраз к прогону: ${plan.phrases.length}, прогонов на фразу: ${o.runs}, всего запусков claude: ${total}`);
    for (const p of plan.phrases) say(o, `  ${p.checks.map((c) => c.expect).join(' / ').padEnd(28)} ${p.text}`);
    if (plan.skipped.length) {
      const missing = new Set(plan.skipped.map((s) => s.reason.match(/скилла (\S+) нет/)?.[1]).filter(Boolean));
      say(o, `Пропущено фраз: ${plan.skipped.length}${missing.size ? `; ещё нет скиллов: ${[...missing].join(', ')}` : ''}`);
    }
    return;
  }

  const env = readEnv();
  const needEnv = raw['check-env'] || plan.phrases.length;
  let envWarnings = [];
  let init = null;
  if (needEnv) {
    // Сверка до прогона: init приходит раньше обращения к модели, так что запуск гасим на нём.
    const pre = await runOnce('ping', o, { untilInit: true });
    init = pre.init;
    envWarnings = pre.error && !init ? [pre.error] : checkEnv(init, { project: present, allowed: env.allowed });
    for (const w of envWarnings) warn(o, `⚠ ${w}`);
    if (raw['check-env']) {
      if (o.json) console.log(JSON.stringify({ ok: !envWarnings.length, warnings: envWarnings, skills: init?.skills ?? [], project: present }, null, 2));
      else if (!envWarnings.length) console.log(`✓ окружение чистое: в листинге ${init.skills.length} скиллов, из них проектных ${present.length}`);
      return (process.exitCode = envWarnings.length ? 1 : 0);
    }
    if (raw['strict-env'] && envWarnings.length) {
      console.error('✗ --strict-env: окружение не чистое, прогон отменён');
      return (process.exitCode = 2);
    }
  }

  if (!plan.phrases.length) {
    const out = { ok: true, present, phrases: 0, skipped: plan.skipped.length, note: 'нечего гонять: нет проектных скиллов с фразами' };
    if (o.json) console.log(JSON.stringify(out, null, 2));
    else console.log(`✓ нечего гонять: ${present.length ? 'у проектных скиллов нет фраз' : 'проектных скиллов нет'}${plan.skipped.length ? `, пропущено фраз: ${plan.skipped.length}` : ''}`);
    return;
  }

  if (defaults.length) warn(o, `ⓘ временные значения в коде (нет в thresholds.json): ${defaults.join(', ')}`);
  say(o, `Фраз: ${plan.phrases.length} × ${o.runs} прогонов = ${total} запусков claude, по ${o.jobs} одновременно…`);
  const before = gitStatus();
  const started = Date.now();
  let finished = 0;
  const tasks = [];
  for (const p of plan.phrases) {
    p.runs = [];
    for (let i = 0; i < o.runs; i++) tasks.push(async () => p.runs.push(await runOnce(p.text, o)));
  }
  await pool(tasks, o.jobs, () => {
    finished++;
    if (!o.json && process.stderr.isTTY) process.stderr.write(`\r  ${finished}/${total}`);
  });
  if (!o.json && process.stderr.isTTY) process.stderr.write('\n');
  const after = gitStatus();
  if (before !== null && after !== before) {
    envWarnings.push('git status изменился за время прогона: проверь, не писал ли что-то прогон');
    warn(o, `⚠ ${envWarnings.at(-1)}`);
  }

  const summary = summarize(plan.phrases, { present });
  const fails = o.min === null ? [] : gate(summary, { min: o.min, maxFalse: o.maxFalse });
  const allErrors = summary.errors === total;
  const date = new Date();
  const result = {
    date: date.toISOString(),
    model: o.model,
    claude_code: init?.version ?? null,
    runs: o.runs,
    focus: raw.skill ?? null,
    file: raw.file ?? null,
    group: plan.group,
    thresholds: { ...th.values, 'lab.triggers.max_false': o.maxFalse, source: th.source },
    min: o.min,
    seconds: Math.round((Date.now() - started) / 1000),
    cost_usd: plan.phrases.flatMap((p) => p.runs).reduce((s, r) => s + (r.cost ?? 0), 0) || null,
    env: { skills: init?.skills ?? [], project: present, warnings: envWarnings },
    summary: { checks: summary.checks, passed: summary.passed, rate: summary.rate, errors: summary.errors },
    skills: summary.skills,
    phrases: plan.phrases.map((p) => ({
      text: p.text,
      checks: p.checks.map((c) => ({ expect: c.expect, kind: c.kind, file: c.file })),
      runs: p.runs.map((r) => ({ skill: r.skill, bypass: r.bypass, tools: r.tools, turns: r.turns, ...(r.error ? { error: r.error } : {}) })),
    })),
    skipped: plan.skipped.map((s) => ({ text: s.text, expect: s.expect, reason: s.reason })),
    fails,
    ok: !fails.length && !allErrors,
  };

  if (!raw['no-save']) {
    let out = raw.out ? resolve(process.cwd(), raw.out) : null;
    if (!out) {
      mkdirSync(RUNS, { recursive: true });
      const day = date.toISOString().slice(0, 10);
      out = join(RUNS, `${day}.json`);
      // Второй прогон за день не затирает первый: --skill после полного прогона — частый сценарий.
      for (let n = 2; existsSync(out); n++) out = join(RUNS, `${day}-${n}.json`);
    }
    writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
    result.saved = out.startsWith(ROOT) ? relative(ROOT, out) : out;
  }

  if (o.json) console.log(JSON.stringify(result, null, 2));
  else report(result, o);
  process.exitCode = allErrors ? 2 : fails.length ? 1 : 0;
}

function report(r, o) {
  const rows = r.skills
    .filter((s) => s.expected || s.false || s.bypass)
    .map((s) => [
      s.skill,
      s.expected ? `${pct(s.hit_rate)} (${s.hits}/${s.expected})` : '—',
      s.foreign ? `${pct(s.false_rate)} (${s.false}/${s.foreign})` : '—',
      s.bypass || '',
      Object.entries(s.missed_to).map(([k, v]) => `${k}×${v}`).join(', '),
    ]);
  console.log('');
  console.log(table(rows, ['скилл', 'попадания', 'ложные', 'обход', 'вместо него']));
  if (!o.quiet) {
    const bad = r.phrases.filter((p) => p.checks.some((c) => p.runs.some((x) => !x.error && !isHit(c.expect, x.skill))));
    if (bad.length) {
      console.log('\nМимо:');
      for (const p of bad) {
        const got = p.runs.map((x) => (x.error ? 'ошибка' : x.skill ?? NONE) + (x.bypass.length ? `+обход(${x.bypass.join(',')})` : '')).join(', ');
        console.log(`  ждали ${p.checks.map((c) => c.expect).join(' / ')} · вышло ${got} · «${p.text}»`);
      }
    }
  }
  if (r.summary.errors) console.log(`\n⚠ прогонов с ошибкой: ${r.summary.errors} (в доли не входят)`);
  console.log(`\nВсего: ${pct(r.summary.rate)} проверок прошло (${r.summary.passed}/${r.summary.checks}), ${r.seconds} с${r.cost_usd ? `, от $${r.cost_usd.toFixed(2)} (оборванные прогоны цену не сообщают)` : ''}`);
  if (r.min !== null) {
    if (r.fails.length) console.log(`✗ пороги (--min ${pct(r.min)}, ложных ≤ ${pct(r.thresholds['lab.triggers.max_false'])}):\n  ${r.fails.join('\n  ')}`);
    else console.log(`✓ пороги пройдены (--min ${pct(r.min)}, ложных ≤ ${pct(r.thresholds['lab.triggers.max_false'])})`);
  }
  if (r.saved) console.log(`Записано: ${r.saved}`);
}

main().catch((e) => {
  console.error(`✗ ${e.message}`);
  process.exitCode = 2;
});
