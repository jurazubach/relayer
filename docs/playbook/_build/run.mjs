// Конвейер сборки скиллов, агентов и инструментов по docs/playbook/build-plan.md.
// Задача идёт так: сборщик → приёмка (команды) → ревьюер → приёмка → сверка с замыслом → слияние в build/main.
// Каждая задача работает в своём git worktree (.worktrees/<id>, ветка build/t/<id>), master не трогается.
//
//   node docs/playbook/_build/run.mjs            запуск и работа до конца или до паузы
//   node docs/playbook/_build/run.mjs --status   таблица состояния
//   node docs/playbook/_build/run.mjs --dry      какие задачи готовы к запуску
//   node docs/playbook/_build/run.mjs --reset T-01 [--keep-worktree]   вернуть задачу в очередь
//   node docs/playbook/_build/run.mjs --finish T-01   пропустить сборку: приёмка → ревью → сверка → слияние
//   node docs/playbook/_build/run.mjs --skip T-01 | --done T-01   пометить вручную
//   node docs/playbook/_build/run.mjs --pause | --resume
//   node docs/playbook/_build/run.mjs --note T-01 "текст"   замечание, которое получит исполнитель в следующей попытке
//   node docs/playbook/_build/run.mjs --merge T-01   приёмка и слияние ветки задачи без агентов (после ручной доработки)
//   node docs/playbook/_build/run.mjs --print-prompt T-01 builder|reviewer|align   готовый промпт (запасной путь при лимитах)
//
// Управление на лету — runtime/control.json: { "paused": false, "maxParallel": 4, "until": "w6-final" }.
// tasks.json и промпты перечитываются перед каждым запуском задачи: правки королевы действуют сразу.
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, symlinkSync, rmSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PIPE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(PIPE, '..', '..', '..');
// переменные окружения нужны для холостого прогона: своя ветка, свои задачи, своё состояние
const RT = process.env.BUILD_RT ? resolve(process.env.BUILD_RT) : join(PIPE, 'runtime');
const LOGS = join(RT, 'logs');
const WT = join(ROOT, '.worktrees');
// решение автора 28.10: результат идёт сразу в master (рабочая копия — корень репозитория), без ветки build/main
const MAIN_BRANCH = process.env.BUILD_MAIN || 'master';
const MAIN_WT = MAIN_BRANCH === 'master' ? ROOT : join(WT, MAIN_BRANCH === 'build/main' ? '_main' : '_' + MAIN_BRANCH.replace(/\W+/g, '-'));
// после каждого слияния в master — пуш (деплой на Pages); BUILD_PUSH=0 выключает
const PUSH = MAIN_BRANCH === 'master' && process.env.BUILD_PUSH !== '0';
const TASKS = process.env.BUILD_TASKS ? resolve(process.env.BUILD_TASKS) : join(PIPE, 'tasks.json');
const MODEL = 'claude-opus-5-5';
const IDLE_MS = 25 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const WAVES = ['w0-foundation', 'w1-slice', 'w2-diagnosis', 'w3-repair', 'w4-creation', 'w5-release', 'w6-final'];
// общие файлы правят многие задачи — их пересечение не мешает параллельности, конфликты решает слияние
const SHARED = ['package.json', 'CLAUDE.md', 'README.md', '.gitignore', 'docs/capabilities.json', 'docs/lab/journal.md', 'docs/playbook/local-lessons.md'];
// без голого rate_limit: событие rate_limit_event с allowed_warning идёт в каждом потоке и не значит упор
const LIMIT_RE = /usage limit|rate limit exceeded|rate_limit_error|limit reached|quota exceeded|overloaded_error|credit balance|5-hour limit|weekly limit|out of extra usage/i;
const COAUTHOR = 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>';

mkdirSync(LOGS, { recursive: true });
const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };

// ───────────────────────── состояние и файлы

const readJSON = (p, def) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return def; } };
const statePath = join(RT, 'state.json');
const controlPath = join(RT, 'control.json');
let state = readJSON(statePath, { tasks: {}, cost: 0, started: new Date().toISOString() });
const saveState = () => writeFileSync(statePath, JSON.stringify(state, null, 2));
const control = () => ({ paused: false, maxParallel: 4, until: WAVES.at(-1), ...readJSON(controlPath, {}) });
const setControl = (patch) => writeFileSync(controlPath, JSON.stringify({ ...control(), ...patch }, null, 2));
if (!existsSync(controlPath)) setControl({});
const loadTasks = () => readJSON(TASKS, { tasks: [] }).tasks;
const st = (id) => (state.tasks[id] ??= { status: 'pending', attempts: 0, feedback: '', history: [] });

const ts = () => new Date().toISOString().slice(5, 16).replace('T', ' ');
function event(line) {
  const s = `${ts()} ${line}`;
  console.log(s);
  appendFileSync(join(RT, 'events.log'), s + '\n');
}
function inbox(id, text) {
  appendFileSync(join(RT, 'INBOX.md'), `\n## ${ts()} · ${id}\n\n${text}\n`);
  event(`? INBOX ${id}`);
}

// ───────────────────────── процессы

function sh(cmd, cwd, { env = {}, timeoutMs = 60 * 60 * 1000, log } = {}) {
  return new Promise((res) => {
    // своя группа процессов: по таймауту убиваем и внуков (node под npm), иначе они доживают и код теряется
    const child = spawn('/bin/bash', ['-c', cmd], { cwd, env: { ...process.env, ...env }, detached: true });
    let out = '';
    const onData = (b) => { out += b.toString(); if (log) appendFileSync(log, b); };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } }, timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) { const mark = `\n[таймаут ${Math.round(timeoutMs / 60000)} мин]\n`; out += mark; if (log) appendFileSync(log, mark); }
      res({ code: code ?? 1, out });
    });
  });
}
const git = (a, cwd = ROOT) => sh(`git ${a}`, cwd, { timeoutMs: 5 * 60 * 1000 });

// простые замки: git-операции в общем репозитории и e2e (один порт на всех) идут по одной
function lock() { let p = Promise.resolve(); return (fn) => { const r = p.then(fn, fn); p = r.catch(() => {}); return r; }; }
const gitLock = lock();
const e2eLock = lock();
// живые прогоны claude -p (срабатывание, мутанты) порт не делят — их ограничивает только нагрузка на API
function sem(n) {
  let active = 0; const q = [];
  return (fn) => new Promise((res, rej) => {
    const go = () => { active++; Promise.resolve().then(fn).then(res, rej).finally(() => { active--; if (q.length) q.shift()(); }); };
    if (active < n) go(); else q.push(go);
  });
}
const llmLock = sem(3);
const LIVE_RE = /lab:triggers|skills:test -- --skill|skills:test --skill/;

let limited = false;
function runAgent(prompt, cwd, logName, timeoutMin) {
  return new Promise((res) => {
    const log = join(LOGS, logName);
    const env = { ...process.env };
    delete env.CLAUDECODE;
    const started = Date.now();
    let last = Date.now(), tail = '', result = null, reason = '';
    const child = spawn('claude', ['-p', '--dangerously-skip-permissions', '--model', MODEL, '--output-format', 'stream-json', '--verbose'], { cwd, env });
    const onData = (b) => {
      last = Date.now();
      appendFileSync(log, b);
      tail = (tail + b.toString()).slice(-400000);
      for (const line of tail.split('\n')) if (line.startsWith('{"type":"result"')) { try { result = JSON.parse(line); } catch {} }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.stdin.end(prompt);
    const kill = (why) => { reason = why; child.kill('SIGTERM'); setTimeout(() => child.kill('SIGKILL'), 10000); };
    const timer = setTimeout(() => kill('таймаут'), timeoutMin * 60 * 1000);
    const watchdog = setInterval(() => { if (Date.now() - last > IDLE_MS) kill('завис: нет вывода 25 мин'); }, 30000);
    child.on('close', (code) => {
      clearTimeout(timer); clearInterval(watchdog);
      const text = result ? String(result.result ?? '') : tail.slice(-3000);
      const limit = (code !== 0 || result?.is_error) && LIMIT_RE.test(text + ' ' + (result?.subtype ?? ''));
      if (limit) { limited = true; writeFileSync(join(RT, 'LIMIT'), `${new Date().toISOString()} ${logName}\n${text.slice(0, 2000)}`); }
      if (result?.total_cost_usd) { state.cost += result.total_cost_usd; saveState(); }
      res({ ok: code === 0 && !result?.is_error, text, limit, reason, min: ((Date.now() - started) / 60000).toFixed(1) });
    });
  });
}

// ───────────────────────── git и worktree

async function ensureMain() {
  await gitLock(async () => {
    // тег с сообщением: при tag.gpgsign лёгкий тег не создаётся
    if ((await git('rev-parse --verify --quiet refs/tags/stories-v1')).code !== 0) {
      const t = await git('tag -a -m "Истории до экспериментов конвейера" stories-v1 master');
      if (t.code !== 0) event(`⚠ тег stories-v1 не создан: ${t.out.trim().slice(0, 200)}`);
    }
    if ((await git(`rev-parse --verify --quiet refs/heads/${MAIN_BRANCH}`)).code !== 0) await git(`branch ${MAIN_BRANCH} ${process.env.BUILD_BASE || 'master'}`);
    if (MAIN_WT !== ROOT && !existsSync(MAIN_WT)) {
      mkdirSync(WT, { recursive: true });
      const r = await git(`worktree add "${MAIN_WT}" ${MAIN_BRANCH}`);
      if (r.code !== 0) throw new Error('не удалось создать worktree build/main:\n' + r.out);
    }
    linkModules(MAIN_WT);
  });
}
function linkModules(dir) {
  const target = join(dir, 'node_modules');
  if (!existsSync(target) && existsSync(join(ROOT, 'node_modules'))) symlinkSync(join(ROOT, 'node_modules'), target, 'dir');
}
const wtPath = (id) => join(WT, id);
const branch = (id) => `${MAIN_BRANCH === 'build/main' || MAIN_BRANCH === 'master' ? 'build/t' : MAIN_BRANCH + '-t'}/${id}`;
async function publish(what) {
  if (!PUSH) return;
  const r = await gitLock(() => git('push origin master'));
  event(r.code === 0 ? `⬆ master запушен (${what})` : `⚠ push master не прошёл (${what}): ${r.out.trim().slice(-200)}`);
}

async function ensureTaskWorktree(id) {
  return gitLock(async () => {
    const dir = wtPath(id);
    if (!existsSync(dir)) {
      const r = await git(`worktree add -B ${branch(id)} "${dir}" ${MAIN_BRANCH}`);
      if (r.code !== 0) throw new Error(r.out);
    } else {
      // на повторе подтягиваем свежую build/main: зависимости могли уйти вперёд
      const m = await git(`merge --no-edit ${MAIN_BRANCH}`, dir);
      if (m.code !== 0) return { dir, conflict: true };
    }
    linkModules(dir);
    return { dir, conflict: false };
  });
}
// сообщение коммита — через файл: так в нём честные переводы строк и подпись последней строкой
function msgFile(msg) {
  const f = join(RT, `msg-${process.pid}-${Math.random().toString(36).slice(2)}.txt`);
  writeFileSync(f, `${msg}\n\n${COAUTHOR}\n`);
  return f;
}
async function commitAll(dir, msg) {
  await git('add -A', dir);
  const f = msgFile(msg);
  const r = await sh(`git diff --cached --quiet || git commit -q -F "${f}"`, dir);
  rmSync(f, { force: true });
  return r.code === 0;
}

// ───────────────────────── шаблоны

function fill(tpl, task, extra = {}) {
  const v = {
    id: task.id, title: task.title, type: task.type, wave: task.wave, spec: task.spec,
    attempt: String(st(task.id).attempts),
    pipeline: PIPE,
    report_dir: `docs/playbook/_build/reports/${task.id}`,
    writes: task.writes.length ? task.writes.map((w) => `- \`${w}\``).join('\n') : '- только отчёт',
    inputs: task.inputs.length ? task.inputs.map((w) => `- ${w}`).join('\n') : '- по тексту задачи',
    accept: task.accept.length ? task.accept.map((c) => `- \`${c}\``).join('\n') : '- нет команд, только ревью',
    feedback: '',
    ...extra,
  };
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => v[k] ?? '');
}
const prompt = (name) => readFileSync(join(PIPE, 'prompts', name), 'utf8');
function builderPrompt(task) {
  const fb = st(task.id).feedback;
  const feedback = fb ? `## Замечания с прошлой попытки — исправь их в первую очередь\n\n${fb}\n` : '';
  const typeFile = join(PIPE, 'prompts', `type-${task.type}.md`);
  const typePart = existsSync(typeFile) ? '\n\n' + readFileSync(typeFile, 'utf8') : '';
  return fill(prompt('builder.md') + typePart, task, { feedback });
}

// ───────────────────────── приёмка

async function accept(task, dir, tag) {
  const log = join(LOGS, `${task.id}.accept.${tag}.log`);
  writeFileSync(log, '');
  for (const cmd of task.accept) {
    // экономный режим (решение автора 26.10): живые прогоны — только после сборки; ревью и сверка меряют их сами при нужде
    if (LIVE_RE.test(cmd) && /^(review|align|merge)/.test(tag)) { appendFileSync(log, `\n$ ${cmd}\n(пропущено: живой прогон на шаге ${tag})\n`); continue; }
    appendFileSync(log, `\n$ ${cmd}\n`);
    // полный тест срабатывания на итоге волны идёт дольше 40 минут — ему таймаут задачи
    const long = /lab:triggers/.test(cmd) && !/--skill/.test(cmd);
    const run = () => sh(cmd, dir, { env: { HEADLESS: '1', CI: '1' }, timeoutMs: (long ? (task.timeoutMin ?? 120) : 40) * 60 * 1000, log });
    const r = /test:e2e/.test(cmd) ? await e2eLock(run) : /lab:triggers|skills:test/.test(cmd) ? await llmLock(run) : await run();
    if (r.code !== 0) return { ok: false, cmd, out: r.out.slice(-6000) };
  }
  return { ok: true };
}
const verdict = (file) => {
  if (!existsSync(file)) return null;
  const m = readFileSync(file, 'utf8').match(/Вердикт:\s*([^\n]+)/);
  return m ? m[1].trim().toLowerCase() : null;
};

// ───────────────────────── задача целиком

async function retryOrFail(task, why, feedback) {
  const s = st(task.id);
  s.history.push({ at: ts(), why });
  if (s.attempts >= MAX_ATTEMPTS) {
    s.status = 'failed';
    s.feedback = feedback;
    event(`✗ ${task.id} провал после ${s.attempts} попыток: ${why}`);
    inbox(task.id, `Задача не прошла: ${why}\n\nПоследние замечания:\n\n${feedback.slice(0, 3000)}\n\nЛоги: docs/playbook/_build/runtime/logs/${task.id}.*`);
  } else {
    s.status = 'pending';
    s.feedback = feedback;
    event(`↻ ${task.id} на доработку (${why})`);
  }
  saveState();
}

async function runTask(task) {
  const s = st(task.id);
  s.status = 'running';
  s.attempts++;
  s.startedAt = ts();
  saveState();
  const n = s.attempts;
  const report = (f) => join(wtPath(task.id), 'docs/playbook/_build/reports', task.id, f);

  if (task.type === 'checkpoint') return runCheckpoint(task);
  if (task.type === 'manual') {
    s.status = 'deferred';
    saveState();
    inbox(task.id, `Нужен человек: ${task.spec}`);
    return;
  }

  let wt;
  try { wt = await ensureTaskWorktree(task.id); } catch (e) { return retryOrFail(task, 'worktree', String(e)); }
  if (wt.conflict) {
    const r = await runAgent(fill(prompt('resolver.md'), task), wt.dir, `${task.id}.resolve.${n}.log`, 45);
    if (r.limit) return pauseForLimit(task);
    await commitAll(wt.dir, `${task.id}: слияние build/main`);
  }

  // 1. сборка (пропускается, если королева доделала руками: --finish)
  if (!s.skipBuild) {
    event(`▶ ${task.id} сборка (попытка ${n}) · ${task.title}`);
    const r = await runAgent(builderPrompt(task), wt.dir, `${task.id}.build.${n}.log`, task.timeoutMin ?? 120);
    if (r.limit) return pauseForLimit(task);
    await commitAll(wt.dir, `${task.id}: ${task.title}`);
    if (!r.ok) return retryOrFail(task, `сборщик: ${r.reason || 'ошибка'}`, `Сборщик завершился с ошибкой (${r.reason || 'код ≠ 0'}). Последний вывод:\n${r.text.slice(-2000)}`);
  }
  s.skipBuild = false;

  // 2. приёмка
  let a = await accept(task, wt.dir, `build${n}`);
  if (!a.ok) return retryOrFail(task, `приёмка: ${a.cmd}`, `Команда приёмки упала: \`${a.cmd}\`\n\n\`\`\`\n${a.out}\n\`\`\``);

  // 3. ревью
  event(`🔎 ${task.id} ревью`);
  const rv = await runAgent(fill(prompt('reviewer.md'), task), wt.dir, `${task.id}.review.${n}.log`, 60);
  if (rv.limit) return pauseForLimit(task);
  await commitAll(wt.dir, `${task.id}: правки ревьюера`);
  const v1 = verdict(report('review.md')) ?? (/Вердикт:\s*pass/i.test(rv.text) ? 'pass' : null);
  if (!v1?.startsWith('pass')) {
    const notes = existsSync(report('review.md')) ? readFileSync(report('review.md'), 'utf8') : rv.text.slice(-3000);
    return retryOrFail(task, 'ревью: fail', notes);
  }
  a = await accept(task, wt.dir, `review${n}`);
  if (!a.ok) return retryOrFail(task, `приёмка после ревью: ${a.cmd}`, `После правок ревьюера упала команда \`${a.cmd}\`\n\n\`\`\`\n${a.out}\n\`\`\``);

  // 4. сверка с замыслом
  event(`🧭 ${task.id} сверка`);
  const al = await runAgent(fill(prompt('align.md'), task), wt.dir, `${task.id}.align.${n}.log`, 45);
  if (al.limit) return pauseForLimit(task);
  await commitAll(wt.dir, `${task.id}: правки сверки`);
  const v2 = verdict(report('align.md')) ?? 'ok';
  if (v2.startsWith('drift-major')) {
    const notes = existsSync(report('align.md')) ? readFileSync(report('align.md'), 'utf8') : al.text.slice(-3000);
    return retryOrFail(task, 'сверка: drift-major', notes);
  }
  a = await accept(task, wt.dir, `align${n}`);
  if (!a.ok) return retryOrFail(task, `приёмка после сверки: ${a.cmd}`, `После правок сверки упала команда \`${a.cmd}\`\n\n\`\`\`\n${a.out}\n\`\`\``);

  // 5. слияние в build/main
  const merged = await merge(task, wt.dir);
  if (!merged.ok) return retryOrFail(task, 'слияние', merged.why);
  s.status = 'done';
  s.finishedAt = ts();
  s.feedback = '';
  saveState();
  event(`✓ ${task.id} готово · ${task.title}${v2.startsWith('drift-minor') ? ' (мелкий дрейф поправлен)' : ''}`);
  await gitLock(() => git(`worktree remove --force "${wt.dir}"`));
  await gitLock(() => git(`branch -D ${branch(task.id)}`));
  await publish(task.id);
}

async function merge(task, dir) {
  for (let i = 0; i < 2; i++) {
    const f = msgFile(`Слияние ${task.id}: ${task.title}`);
    const r = await gitLock(() => git(`merge --no-ff -F "${f}" ${branch(task.id)}`, MAIN_WT));
    rmSync(f, { force: true });
    if (r.code === 0) return { ok: true };
    await gitLock(() => git('merge --abort', MAIN_WT));
    // конфликт: подтягиваем build/main в ветку задачи и зовём разрешителя
    const m = await gitLock(() => git(`merge --no-edit ${MAIN_BRANCH}`, dir));
    if (m.code !== 0) {
      event(`⚔ ${task.id} конфликт слияния — разрешитель`);
      const rr = await runAgent(fill(prompt('resolver.md'), task), dir, `${task.id}.resolve.m${i}.log`, 45);
      if (rr.limit) return { ok: false, why: 'лимит во время разрешения конфликта' };
      await commitAll(dir, `${task.id}: разрешение конфликта с build/main`);
      if (/failed/i.test(rr.text.slice(-300))) return { ok: false, why: `Разрешитель не справился:\n${rr.text.slice(-2000)}` };
    }
    const a = await accept(task, dir, `merge${i}`);
    if (!a.ok) return { ok: false, why: `После слияния с build/main упала команда \`${a.cmd}\`\n\n\`\`\`\n${a.out}\n\`\`\`` };
  }
  return { ok: false, why: 'не удалось слить после двух попыток' };
}

async function runCheckpoint(task) {
  const s = st(task.id);
  event(`🏁 ${task.id} итог волны ${task.wave}`);
  const a = await accept(task, MAIN_WT, `cp${s.attempts}`);
  const tpl = prompt('checkpoint.md');
  const extra = a.ok ? '' : `\n\n# Внимание\n\nКоманда приёмки волны упала: \`${a.cmd}\`\n\n\`\`\`\n${a.out}\n\`\`\`\nРазберись в причине и опиши в отчёте.`;
  const r = await runAgent(fill(tpl, task) + extra, MAIN_WT, `${task.id}.checkpoint.${s.attempts}.log`, task.timeoutMin ?? 90);
  if (r.limit) return pauseForLimit(task);
  await commitAll(MAIN_WT, `${task.id}: итог волны ${task.wave}`);
  await publish(task.id);
  const v = verdict(join(MAIN_WT, 'docs/playbook/_build/reports', task.id, 'checkpoint.md')) ?? '?';
  s.status = 'done';
  s.verdict = v;
  s.finishedAt = ts();
  saveState();
  event(`🏁 ${task.id} вердикт: ${v}${a.ok ? '' : ' · приёмка волны упала'}`);
  if (task.pauseAfter) {
    setControl({ paused: true });
    event(`⏸ пауза после ${task.id}: королева читает docs/playbook/_build/reports/${task.id}/checkpoint.md (в worktree .worktrees/_main) и снимает паузу`);
  }
}

function pauseForLimit(task) {
  const s = st(task.id);
  s.status = 'pending';
  s.attempts = Math.max(0, s.attempts - 1);
  saveState();
  setControl({ paused: true });
  event(`⚠ ЛИМИТ на ${task.id} — конвейер на паузе (runtime/LIMIT)`);
}

// ───────────────────────── планирование

const norm = (g) => g.replace(/\/\*\*$|\*\*$/, '').replace(/\/$/, '');
function overlaps(a, b) {
  for (const x of a) for (const y of b) {
    if (SHARED.includes(x) || SHARED.includes(y)) continue;
    const p = norm(x), q = norm(y);
    if (p === q || p.startsWith(q + '/') || q.startsWith(p + '/')) return true;
  }
  return false;
}
const DONE = new Set(['done', 'skipped']);
function depSatisfied(id, byId) {
  const s = st(id).status;
  if (DONE.has(s)) return true;
  // ручная задача не держит других, если не помечена blocking
  if (s === 'deferred' && !byId[id]?.blocking) return true;
  return false;
}
const running = new Map();
function readyTasks(tasks, ctl) {
  const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
  const untilIdx = WAVES.indexOf(ctl.until);
  return tasks.filter((t) => {
    const s = st(t.id);
    if (s.status !== 'pending' || running.has(t.id)) return false;
    if (untilIdx >= 0 && WAVES.indexOf(t.wave) > untilIdx) return false;
    if (!t.deps.every((d) => depSatisfied(d, byId))) return false;
    for (const r of running.values()) if (overlaps(t.writes, r.writes)) return false;
    // итог волны и эксперименты с правкой историй идут в одиночку
    if (t.type === 'checkpoint' && running.size) return false;
    for (const r of running.values()) if (r.type === 'checkpoint') return false;
    return true;
  });
}

function writeStatus() {
  const tasks = loadTasks();
  const icon = { done: '✅', running: '🔄', pending: '⬜', failed: '❌', deferred: '🙋', skipped: '⏭' };
  const lines = [`# Конвейер: состояние`, '', `Обновлено ${ts()} · затраты ≈ $${state.cost.toFixed(2)} · ${control().paused ? '⏸ пауза' : '▶ идёт'}`, ''];
  for (const w of WAVES) {
    const ws = tasks.filter((t) => t.wave === w);
    if (!ws.length) continue;
    lines.push(`## ${w}`, '', '| | задача | попыток | заметка |', '|---|---|---|---|');
    for (const t of ws) {
      const s = st(t.id);
      lines.push(`| ${icon[s.status] ?? s.status} | ${t.id} · ${t.title} | ${s.attempts} | ${s.verdict ?? s.history.at(-1)?.why ?? ''} |`);
    }
    lines.push('');
  }
  writeFileSync(join(RT, 'STATUS.md'), lines.join('\n'));
  return lines.join('\n');
}

// ───────────────────────── команды

if (arg('--note')) {
  const s = st(arg('--note'));
  const text = args[args.indexOf('--note') + 2] ?? '';
  s.feedback = [s.feedback, `Замечание королевы: ${text}`].filter(Boolean).join('\n\n');
  saveState();
  console.log(`${arg('--note')}: замечание добавлено`);
  process.exit(0);
}
if (arg('--print-prompt')) {
  const task = loadTasks().find((t) => t.id === arg('--print-prompt'));
  const kind = args[args.indexOf('--print-prompt') + 2] || 'builder';
  console.log(kind === 'builder' ? builderPrompt(task) : fill(prompt(`${kind}.md`), task));
  process.exit(0);
}
if (arg('--merge')) {
  const task = loadTasks().find((t) => t.id === arg('--merge'));
  await ensureMain();
  const dir = wtPath(task.id);
  if (!existsSync(dir)) { console.log('нет worktree задачи'); process.exit(1); }
  await commitAll(dir, `${task.id}: ручная доработка`);
  const a = await accept(task, dir, 'manual');
  if (!a.ok) { console.log(`приёмка упала: ${a.cmd}\n${a.out}`); process.exit(1); }
  const m = await merge(task, dir);
  if (!m.ok) { console.log(m.why); process.exit(1); }
  Object.assign(st(task.id), { status: 'done', finishedAt: ts(), feedback: '' });
  saveState();
  event(`✓ ${task.id} слито вручную`);
  await git(`worktree remove --force "${dir}"`);
  process.exit(0);
}
const id = arg('--reset') || arg('--finish') || arg('--skip') || arg('--done');
if (args.includes('--status')) { console.log(writeStatus()); process.exit(0); }
if (args.includes('--pause')) { setControl({ paused: true }); console.log('пауза'); process.exit(0); }
if (args.includes('--resume')) { setControl({ paused: false }); console.log('продолжаем'); process.exit(0); }
if (args.includes('--dry')) { console.log(readyTasks(loadTasks(), control()).map((t) => `${t.id} · ${t.title}`).join('\n') || 'ничего'); process.exit(0); }
if (id) {
  const s = st(id);
  if (args.includes('--reset')) {
    Object.assign(s, { status: 'pending', attempts: 0, feedback: '', skipBuild: false });
    if (!args.includes('--keep-worktree') && existsSync(wtPath(id))) await git(`worktree remove --force "${wtPath(id)}"`);
  }
  if (args.includes('--finish')) Object.assign(s, { status: 'pending', skipBuild: true });
  if (args.includes('--skip')) s.status = 'skipped';
  if (args.includes('--done')) s.status = 'done';
  saveState();
  writeStatus();
  console.log(`${id}: ${s.status}`);
  process.exit(0);
}

// ───────────────────────── основной цикл

// проверка графа: неизвестные зависимости и циклы
{
  const tasks = loadTasks();
  const ids = new Set(tasks.map((t) => t.id));
  for (const t of tasks) for (const d of t.deps) if (!ids.has(d)) throw new Error(`${t.id}: неизвестная зависимость ${d}`);
  const seen = {}, visit = (x, path) => { if (seen[x] === 1) throw new Error('цикл: ' + [...path, x].join(' → ')); if (seen[x]) return; seen[x] = 1; for (const d of tasks.find((t) => t.id === x).deps) visit(d, [...path, x]); seen[x] = 2; };
  for (const t of tasks) visit(t.id, []);
}
// задачи, оборванные прошлым запуском, возвращаем в очередь
for (const [k, s] of Object.entries(state.tasks)) if (s.status === 'running') { s.status = 'pending'; s.attempts = Math.max(0, s.attempts - 1); }
saveState();
await ensureMain();
event(`▶ конвейер запущен · ${loadTasks().length} задач · ${MAIN_BRANCH} в ${MAIN_WT.replace(ROOT + '/', '')}`);

let pausedAnnounced = false;
while (true) {
  const ctl = control();
  const tasks = loadTasks();
  writeStatus();
  if (ctl.paused || limited) {
    if (!pausedAnnounced) { event('⏸ пауза — жду снятия (runtime/control.json → "paused": false)'); pausedAnnounced = true; }
    if (limited && !ctl.paused) limited = false;
    await new Promise((r) => setTimeout(r, 30000));
    continue;
  }
  pausedAnnounced = false;
  const ready = readyTasks(tasks, ctl);
  for (const t of ready) {
    if (running.size >= ctl.maxParallel) break;
    if (readyTasks(loadTasks(), ctl).every((x) => x.id !== t.id)) continue;
    running.set(t.id, t);
    runTask(t).catch((e) => { event(`✗ ${t.id} исключение: ${e.message}`); st(t.id).status = 'failed'; saveState(); inbox(t.id, String(e.stack || e)); })
      .finally(() => { running.delete(t.id); writeStatus(); });
  }
  if (!running.size && !readyTasks(tasks, ctl).length) {
    const left = tasks.filter((t) => !['done', 'skipped', 'deferred'].includes(st(t.id).status));
    const untilIdx = WAVES.indexOf(ctl.until);
    const inScope = left.filter((t) => WAVES.indexOf(t.wave) <= untilIdx);
    if (!inScope.length) { event(`🏁 всё в пределах «${ctl.until}» сделано · затраты ≈ $${state.cost.toFixed(2)}`); break; }
    const stuck = inScope.map((t) => `${t.id}:${st(t.id).status}`).join(', ');
    event(`⛔ запускать нечего — ждут или упали: ${stuck}`);
    setControl({ paused: true });
    continue;
  }
  await new Promise((r) => setTimeout(r, 15000));
}
writeStatus();
