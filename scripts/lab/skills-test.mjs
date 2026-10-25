// skills:test — мутанты против story:lint и скиллов: ловит ли инструмент дефект своей зоны.
// Мутанты — копии основы docs/lab/mutants/_base с одним дефектом, ключ — docs/lab/mutants/key.json.
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStory, parseStory } from '../lib/story.mjs';
import { knownChecks, lintStory, loadChecks } from '../lint/core.mjs';
import { buildStatic } from '../lint/static.mjs';
import { loadThresholds } from '../lint/thresholds.mjs';
import { createStreamParser, bareName } from './triggers-lib.mjs';
import {
  buildKey, buildMutant, checkOwners, lintDiff, lintVerdict, matchFinding, neutralId, parseFindings,
  pct, skillPrompt, skillsFromOwners, table, validateSpec, zoneSummary,
} from './mutants-lib.mjs';
import { MUTANTS } from './mutants-spec.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = join(ROOT, 'docs/lab/mutants');
const BASE = join(DIR, '_base');
const KEY = join(DIR, 'key.json');
const SKILLS = join(ROOT, '.claude/skills');
const RUNS = join(ROOT, 'docs/lab/runs/mutants');

// Прогон ничего не пишет и не видит ключа: запись запрещена, ключ и спецификация мутантов закрыты от чтения.
const DENY = [
  'Write', 'Edit', 'NotebookEdit', 'Artifact', 'ArtifactComments', 'ArtifactData', 'DesignSync',
  'CronCreate', 'CronDelete', 'RemoteTrigger', 'ScheduleWakeup', 'PushNotification', 'SendMessage',
  'EnterWorktree', 'Workflow', 'Read(./docs/lab/mutants/**)', 'Read(./scripts/lab/**)', 'Read(./docs/lab/runs/**)',
  // node scripts/* разрешён ради линта и бота, но skills-test.mjs --json печатает ключ целиком
  'Bash(node scripts/lab/*)',
];
const ALLOW = ['Read', 'Grep', 'Glob', 'Skill', 'Bash(npm run story:*)', 'Bash(npm run -s story:*)', 'Bash(node scripts/*)', 'Bash(node .claude/skills/*)'];

const HELP = `npm run skills:test [-- флаги]

Мутанты — 20–25 копий основы docs/lab/mutants/_base, в каждой один дефект; ключ docs/lab/mutants/key.json:
зона скилла, C-NN, узел, что сломано. Правки мутантов — scripts/lab/mutants-spec.mjs.

Без --skill (или с --lint-only) — story:lint на основе и каждом мутанте. Основа обязана быть чистой
(без ошибок и предупреждений). Мутант пойман, если у него появились находки всех проверок из поля lint
ключа и его собственной C-NN, когда она уже есть в scripts/lint/checks. Проверки, которой в линте ещё нет,
мутант ждёт — он в отчёте, но не роняет прогон. Код 1, если полнота ниже lab.mutants.lint_min_recall.

С --skill <имя> — скилл через claude -p на мутантах своей зоны: каждый мутант копируется во временную
папку с нейтральным id (ключ и спецификация закрыты от чтения), скилл вызывается через Skill, находки
он выводит JSON-блоком. Попадание — находка в узле дефекта или с его C-NN. Отчёт — полнота по зонам.

  --lint-only        только story:lint (по умолчанию без --skill)
  --build            пересобрать папки мутантов и key.json из mutants-spec.mjs и выйти
  --skill <имя>      прогнать скилл .claude/skills/<имя> на мутантах его зоны
  --zone <скилл>     для --skill: мутанты другой зоны (по умолчанию зона = имя скилла)
  --mutant <id,…>    только эти мутанты
  --control          для --skill: ещё прогон на основе — сколько находок скилл даёт на чистой истории
  --runs <N>         прогонов на мутанта (по умолчанию lab.mutants.skill_runs)
  --min [доля]       для --skill: код 1, если полнота ниже доли; без числа — lab.mutants.skill_min_recall
  --jobs <N>         одновременных claude, 1–3 (по умолчанию 1)
  --model <имя>      модель (по умолчанию claude-opus-5-5)
  --dry-run          для --skill: план прогона без запуска
  --out <путь>       куда записать результат --skill (по умолчанию docs/lab/runs/mutants/<дата>-<скилл>.json)
  --no-save          не записывать результат
  --json             результат одним JSON
  --quiet            без строк по мутантам, только сводка по зонам
  --help             эта справка

Пороги — lab.mutants.* в docs/playbook/thresholds.json. Коды выхода: 0 — прошло, 1 — полнота ниже
порога или основа не чистая, 2 — ошибка набора (ключ устарел, правка не легла, скилла нет).`;

const VALUED = ['--skill', '--zone', '--mutant', '--runs', '--jobs', '--model', '--out'];
const FLAGS = ['--lint-only', '--build', '--control', '--dry-run', '--no-save', '--json', '--quiet', '--help', '-h'];

function parseArgs(argv) {
  const o = {};
  const bad = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (VALUED.includes(a)) {
      if (argv[i + 1] === undefined || argv[i + 1].startsWith('--')) bad.push(`${a} без значения`);
      else o[a.slice(2)] = argv[++i];
    } else if (a === '--min') o.min = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    else if (FLAGS.includes(a)) o[a.replace(/^-+/, '')] = true;
    else bad.push(`неизвестный аргумент: ${a}`);
  }
  return { o, bad };
}

const fail = (msg, code = 2) => {
  console.error(`skills:test: ${msg}`);
  process.exit(code);
};

const T = loadThresholds();
const { o: args, bad } = parseArgs(process.argv.slice(2));
if (args.help || args.h) { console.log(HELP); process.exit(0); }
if (bad.length) fail(`${bad.join('; ')} (см. --help)`);
if (args.skill && args['lint-only']) fail('--skill и --lint-only вместе не бывают');
const say = (...a) => { if (!args.json) console.log(...a); };

const owners = readFileSync(join(ROOT, 'docs/playbook/owners.md'), 'utf8');
const specErrors = validateSpec(MUTANTS, { count: T.value('lab.mutants.count'), skills: skillsFromOwners(owners), checks: knownChecks() });
if (specErrors.length) fail(`mutants-spec.mjs:\n  ${specErrors.join('\n  ')}`);

const base = { ink: readFileSync(join(BASE, 'story.ink'), 'utf8'), meta: JSON.parse(readFileSync(join(BASE, 'meta.json'), 'utf8')) };
const built = MUTANTS.map((m) => buildMutant(m, base));
const buildErrors = built.flatMap((b) => b.errors.map((e) => `${b.id}: ${e}`));
if (buildErrors.length) fail(`правки не легли на основу:\n  ${buildErrors.join('\n  ')}`);
const key = buildKey(MUTANTS, {
  what: 'Ключ мутантов T-13: какой скилл (zone) должен найти дефект, какая проверка его меряет (check), где он (node) и что сломано (broken). lint — проверки story:lint, которые ловят мутанта уже сейчас.',
  build: 'npm run skills:test -- --build (из scripts/lab/mutants-spec.mjs); руками не править',
  test: 'npm run skills:test — линт; npm run skills:test -- --skill <имя> — скилл через claude -p',
});

if (args.build) {
  for (const d of readdirSync(DIR, { withFileTypes: true })) {
    if (d.isDirectory() && /^m\d\d-/.test(d.name) && !built.some((b) => b.id === d.name)) rmSync(join(DIR, d.name), { recursive: true });
  }
  for (const b of built) {
    mkdirSync(join(DIR, b.id), { recursive: true });
    for (const [f, text] of Object.entries(b.files)) writeFileSync(join(DIR, b.id, f), text);
  }
  writeFileSync(KEY, `${JSON.stringify(key, null, 2)}\n`);
  say(`собрано мутантов: ${built.length} → docs/lab/mutants/, ключ → docs/lab/mutants/key.json`);
  process.exit(0);
}

// Папки и ключ на диске должны совпадать со сборкой: иначе тест идёт не по тем файлам, что видит скилл.
const stale = [];
if (!existsSync(KEY) || readFileSync(KEY, 'utf8') !== `${JSON.stringify(key, null, 2)}\n`) stale.push('key.json');
for (const b of built) {
  for (const [f, text] of Object.entries(b.files)) {
    const p = join(DIR, b.id, f);
    if (!existsSync(p) || readFileSync(p, 'utf8') !== text) stale.push(`${b.id}/${f}`);
  }
}
if (stale.length) fail(`мутанты устарели относительно основы или спецификации (${stale.slice(0, 5).join(', ')}${stale.length > 5 ? ' …' : ''}): npm run skills:test -- --build`);

let entries = key.mutants;
if (args.mutant) {
  const want = args.mutant.split(',').map((s) => s.trim());
  const unknown = want.filter((id) => !entries.some((e) => e.id === id));
  if (unknown.length) fail(`нет мутантов: ${unknown.join(', ')}`);
  entries = entries.filter((e) => want.includes(e.id));
}

if (args.skill) await skillMode(entries);
else await lintMode(entries);

// ───────── линт

async function lintMode(list) {
  const checks = await loadChecks();
  const implemented = new Set(checks.map((c) => c.id));
  const owner = checkOwners(owners);
  const lint = (ref) => {
    const story = loadStory(ref);
    return lintStory(story, T, { checks, runs: T.value('lint.runs.full'), seed: 1 }).then((res) => ({ story, res }));
  };
  const { res: baseRes } = await lint(BASE);
  const dirty = baseRes.findings.filter((f) => f.level !== 'hint');
  if (dirty.length) {
    const lines = dirty.map((f) => `${f.check} · ${f.node ?? 'история'} · ${f.message}`);
    if (args.json) console.log(JSON.stringify({ ok: false, base: 'dirty', findings: dirty }, null, 2));
    else console.error(`✗ основа не чистая — мутанты сравнивать не с чем:\n  ${lines.join('\n  ')}`);
    process.exit(1);
  }

  const results = [];
  for (const entry of list) {
    const { story, res } = await lint(join(ROOT, entry.path));
    if (res.compile) fail(`${entry.id} не компилируется: ${res.findings[0].message}`);
    const st = buildStatic(parseStory(story));
    const nodeOk = entry.node == null || st.ids.has(entry.node);
    const diff = lintDiff(baseRes.findings, res.findings);
    const verdict = lintVerdict(entry, diff, implemented);
    results.push({ entry, verdict, nodeOk, owner: owner.get(entry.check) ?? null, diff });
  }
  const badNodes = results.filter((r) => !r.nodeOk).map((r) => `${r.entry.id}: узла ${r.entry.node} нет`);
  if (badNodes.length) fail(`ключ указывает на несуществующие узлы:\n  ${badNodes.join('\n  ')}`);

  const zones = zoneSummary(results);
  const measured = results.filter((r) => r.verdict.status !== 'pending');
  const recall = measured.length ? measured.filter((r) => r.verdict.status === 'caught').length / measured.length : null;
  const ok = recall == null || recall >= T.value('lab.mutants.lint_min_recall');

  if (args.json) {
    console.log(JSON.stringify({
      ok, mode: 'lint', recall, min_recall: T.value('lab.mutants.lint_min_recall'), base_hints: baseRes.findings.length,
      zones, mutants: results.map((r) => ({ ...r.entry, owner: r.owner, ...r.verdict, new_findings: r.diff.map((f) => ({ check: f.check, key: f.key, node: f.node, level: f.level, message: f.message })) })),
    }, null, 2));
  } else {
    say(`skills:test · story:lint на ${results.length} мутантах · основа чистая${baseRes.findings.length ? ` (подсказок ${baseRes.findings.length})` : ''}\n`);
    if (!args.quiet) {
      const mark = { caught: '✓', partial: '◐', missed: '✗', pending: '·' };
      for (const r of results) {
        const v = r.verdict;
        const what = v.status === 'pending'
          ? `ждёт ${v.waits} в линте${r.diff.length ? `; попутно: ${[...new Set(r.diff.map((f) => f.check))].join(', ')}` : ''}`
          : `${v.status === 'caught' ? 'пойман' : v.status === 'partial' ? 'частично' : 'не пойман'}: ${v.caught.join(', ') || '—'}${v.missing.length ? `; нет ${v.missing.join(', ')}` : ''}${v.extra.length ? `; попутно ${v.extra.join(', ')}` : ''}`;
        say(`${mark[v.status]} ${r.entry.id.padEnd(28)} ${r.entry.zone.padEnd(17)} ${String(r.entry.check).padEnd(5)} ${what}`);
      }
      say('');
    }
    say(table(zones.map((z) => [z.zone, z.mutants, z.measured, z.caught, z.pending, pct(z.recall)]), ['зона', 'мутантов', 'есть проверка', 'пойманы', 'ждут проверку', 'полнота линта']));
    const pending = [...new Set(results.filter((r) => r.verdict.waits).map((r) => r.verdict.waits))].sort();
    say(`\nполнота линта: ${pct(recall)} (${measured.filter((r) => r.verdict.status === 'caught').length} из ${measured.length}), порог ${pct(T.value('lab.mutants.lint_min_recall'))}`);
    if (pending.length) say(`ждут проверок, которых в story:lint ещё нет: ${pending.join(', ')} — их мутантов найдёт только скилл (--skill <зона>)`);
    const present = existsSync(SKILLS) ? readdirSync(SKILLS).filter((d) => existsSync(join(SKILLS, d, 'SKILL.md'))) : [];
    const zonesWithSkill = zones.map((z) => z.zone).filter((z) => present.includes(z));
    if (zonesWithSkill.length) say(`скиллы зон уже есть: ${zonesWithSkill.join(', ')} — npm run skills:test -- --skill <имя>`);
    say(ok ? '✓ прошло' : '✗ полнота ниже порога');
  }
  process.exit(ok ? 0 : 1);
}

// ───────── скилл

async function skillMode(all) {
  const skill = args.skill;
  if (!existsSync(join(SKILLS, skill, 'SKILL.md'))) fail(`скилла ${skill} нет: .claude/skills/${skill}/SKILL.md`);
  const zone = args.zone ?? skill;
  const list = all.filter((e) => e.zone === zone);
  if (!list.length) fail(`у зоны ${zone} нет мутантов (зоны: ${[...new Set(all.map((e) => e.zone))].join(', ')})`);
  const o = {
    runs: args.runs ? int(args.runs, '--runs', 1, 10) : T.value('lab.mutants.skill_runs'),
    jobs: args.jobs ? int(args.jobs, '--jobs', 1, 3) : 1,
    model: args.model ?? 'claude-opus-5-5',
    timeout: T.value('lab.mutants.skill_timeout_s'),
    maxTurns: T.value('lab.mutants.skill_max_turns'),
    min: args.min === undefined ? null : args.min === true ? T.value('lab.mutants.skill_min_recall') : share(args.min),
  };
  const targets = [...list.map((entry) => ({ entry, path: join(ROOT, entry.path) }))];
  if (args.control) targets.push({ entry: { id: '_base', zone, check: null, node: null, broken: 'основа без дефекта' }, path: BASE, control: true });
  if (args['dry-run']) {
    say(`скилл ${skill}, зона ${zone}: ${list.length} мутантов × ${o.runs} прогонов${args.control ? ' + основа' : ''} = ${targets.length * o.runs} запусков claude`);
    for (const t of targets) say(`  ${t.entry.id.padEnd(28)} ${t.entry.check ?? ''} ${t.entry.node ?? ''}`);
    process.exit(0);
  }

  const tmp = mkdtempSync(join(tmpdir(), 'relayer-mutants-'));
  const tasks = [];
  const results = targets.map((t) => ({ ...t, runs: [] }));
  results.forEach((r, i) => {
    for (let k = 0; k < o.runs; k++) {
      tasks.push(async () => {
        const id = neutralId(r.entry.id, `${k}`);
        const dir = join(tmp, `${i}-${k}`, id);
        cpSync(r.path, dir, { recursive: true });
        const metaPath = join(dir, 'meta.json');
        writeFileSync(metaPath, `${JSON.stringify({ ...JSON.parse(readFileSync(metaPath, 'utf8')), id }, null, 2)}\n`);
        const nodes = [...buildStatic(parseStory(loadStory(dir))).ids];
        const run = await runClaude(skillPrompt(skill, dir), { ...o, dir: tmp });
        const findings = parseFindings(run.text, nodes);
        const hit = !r.control && run.skill === skill ? matchFinding(r.entry, findings) : null;
        r.runs.push({ skill_called: run.skill, hit: !!hit, matched: hit, findings, error: run.error ?? null, denied: run.denied ?? [], turns: run.turns, cost: run.cost, answer: run.text });
        if (!args.json) process.stderr.write(`${hit ? '✓' : r.control ? '·' : '✗'} ${r.entry.id} #${k + 1}${run.error ? ` (${run.error})` : run.skill !== skill ? ` (вызван ${run.skill ?? 'никакой скилл'})` : ''}\n`);
      });
    }
  });
  await pool(tasks, o.jobs);
  rmSync(tmp, { recursive: true, force: true });

  const measured = results.filter((r) => !r.control);
  const zones = zoneSummary(measured.map((r) => ({ ...r, runs: r.runs.filter((x) => !x.error) })));
  const failed = measured.reduce((n, r) => n + r.runs.filter((x) => x.error).length, 0);
  const recall = zones[0]?.recall ?? null;
  const control = results.find((r) => r.control);
  const ok = o.min == null || (recall ?? 0) >= o.min;
  const out = {
    ok, mode: 'skill', skill, zone, model: o.model, runs: o.runs, failed_runs: failed, recall, min_recall: o.min, zones,
    control: control ? { findings: control.runs.map((x) => x.findings.length) } : null,
    mutants: measured.map((r) => ({ ...r.entry, hits: r.runs.filter((x) => x.hit).length, runs: r.runs })),
  };
  if (!args['no-save']) {
    const file = args.out ? resolve(process.cwd(), args.out) : join(RUNS, `${new Date().toISOString().slice(0, 10)}-${skill}.json`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
    say(`результат → ${relative(ROOT, file)}`);
  }
  if (args.json) console.log(JSON.stringify(out, null, 2));
  else {
    if (!args.quiet) {
      for (const r of measured) {
        const hits = r.runs.filter((x) => x.hit).length;
        say(`${hits * 2 >= r.runs.length ? '✓' : '✗'} ${r.entry.id.padEnd(28)} ${hits}/${r.runs.length}  ${r.entry.check ?? ''} ${r.entry.node ?? ''} — ${r.entry.broken}`);
      }
      say('');
    }
    say(table(zones.map((z) => [z.zone, z.mutants, z.caught, `${z.hits}/${z.runs}`, pct(z.recall)]), ['зона', 'мутантов', 'найдены', 'попаданий', 'полнота скилла']));
    if (failed) say(`\n⚠ прогонов не состоялось: ${failed} (ошибка запуска или отказ в правах) — в полноту не входят`);
    if (control) say(`\nна чистой основе находок: ${control.runs.map((x) => x.findings.length).join(', ')} (шум скилла)`);
    if (o.min != null) say(ok ? `✓ полнота ${pct(recall)} ≥ ${pct(o.min)}` : `✗ полнота ${pct(recall)} ниже ${pct(o.min)}`);
  }
  process.exit(ok ? 0 : 1);
}

function runClaude(prompt, o) {
  return new Promise((done) => {
    const parser = createStreamParser();
    let text = null;
    let denied = [];
    let buf = '';
    const child = spawn('claude', [
      '-p', prompt, '--model', o.model, '--output-format', 'stream-json', '--verbose',
      '--no-session-persistence', '--strict-mcp-config', '--max-turns', String(o.maxTurns),
      '--permission-prompts', 'none', '--disallowedTools', DENY.join(','),
      // копия мутанта лежит вне репозитория: без --add-dir её не прочитать, без allowedTools — не прогнать линт
      '--add-dir', o.dir, '--allowedTools', ALLOW.join(','),
    ], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, o.timeout * 1000);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      buf += chunk;
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const ev = JSON.parse(line);
          parser.push(ev);
          if (ev.type === 'result' && typeof ev.result === 'string') text = ev.result;
          if (ev.type === 'result') denied = (ev.permission_denials ?? []).map((d) => d.tool_name ?? '?');
        } catch {
          // предупреждение CLI посреди потока
        }
      }
    });
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (e) => { clearTimeout(timer); done({ error: `не удалось запустить claude: ${e.message}`, skill: null, text: null }); });
    child.on('close', (code) => {
      clearTimeout(timer);
      const r = parser.end();
      const out = { skill: bareName(r.skill), text, denied, turns: r.result?.num_turns ?? null, cost: r.result?.cost ?? null };
      if (timedOut) out.error = `не уложился в ${o.timeout} с`;
      else if (text == null) out.error = `claude вышел с кодом ${code}: ${stderr.trim().split('\n').slice(-2).join(' ') || 'без ответа'}`;
      // отказ в правах без единой находки — прогон не состоялся, а не «скилл не нашёл»
      else if (denied.length && !/"findings"\s*:\s*\[\s*\{/.test(text)) out.error = `отказано в правах: ${denied.join(', ')}`;
      done(out);
    });
  });
}

async function pool(tasks, jobs) {
  let next = 0;
  const worker = async () => { while (next < tasks.length) await tasks[next++](); };
  await Promise.all(Array.from({ length: Math.min(jobs, tasks.length) }, worker));
}

function int(v, flag, lo, hi) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < lo || n > hi) fail(`${flag}: нужно целое от ${lo} до ${hi}, а не «${v}»`);
  return n;
}

function share(v) {
  const n = String(v).endsWith('%') ? parseFloat(v) / 100 : parseFloat(v);
  if (!(n >= 0 && n <= 1)) fail(`--min: нужна доля от 0 до 1 или процент, а не «${v}»`);
  return n;
}
