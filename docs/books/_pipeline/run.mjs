// Конвейер базы знаний: один источник = один агент `claude -p`, после него — отдельный агент-ревьюер.
// Ревью источника стартует сразу, как только его разбор готов, параллельно с остальными разборами.
//
//   node docs/books/_pipeline/run.mjs ashwell-standard-patterns edgerton-hooked   # выбранные
//   node docs/books/_pipeline/run.mjs --priority 1                               # по приоритету
//   node docs/books/_pipeline/run.mjs --all -j 4                                 # все, 4 агента разом
//   node docs/books/_pipeline/run.mjs --status                                   # только таблица
//   --deep — второй проход: после разбора и ревью ещё углубление (deepen.md) и второе ревью (review2.md)
//   --force — переделать готовое, --review-only — только ревью
import { readFileSync, writeFileSync, existsSync, mkdirSync, createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const BOOKS = join(ROOT, 'docs', 'books');
const LOGS = join(HERE, 'logs');
const FILES = ['README.md', 'principles.md', 'patterns.md', 'flags.md', 'checklists.md', 'for-relayer.md'];
const MODEL = 'claude-opus-5-5';
const TIMEOUT = 100 * 60 * 1000;
// агент пишет поток событий; если молчит дольше этого — считаем, что завис
const IDLE = 20 * 60 * 1000;
const LIMIT_FLAG = join(HERE, 'logs', 'LIMIT');
const LIMIT_RE = /usage limit|rate[ _-]?limit|limit reached|quota|overloaded_error|credit balance/i;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const jobs = Number(opt('-j', 4));
let limited = false;
const { sources } = JSON.parse(readFileSync(join(HERE, 'sources.json'), 'utf8'));

const has = (s, ...files) => files.every((f) => existsSync(join(BOOKS, s.alias, f)));
const extracted = (s) => has(s, ...FILES);
const reviewed = (s) => has(s, 'REVIEW.md');
const DONE = {
  extract: extracted,
  review: reviewed,
  deepen: (s) => has(s, 'DEEPEN.md', 'lessons.md', 'attention.md'),
  review2: (s) => has(s, 'REVIEW-2.md'),
};
const STAGES = flag('--deep') ? ['extract', 'review', 'deepen', 'review2'] : ['extract', 'review'];
const verdict = (s) => {
  if (!reviewed(s)) return '';
  const m = readFileSync(join(BOOKS, s.alias, 'REVIEW.md'), 'utf8').match(/Вердикт:\s*(.+)/);
  return m ? m[1].trim() : '?';
};

/** Таблица в README между маркерами — чтобы TODO всегда показывал реальное состояние папок. */
function writeStatus() {
  const v2 = (s) => {
    if (!DONE.review2(s)) return DONE.deepen(s) ? 'углублено' : '—';
    const m = readFileSync(join(BOOKS, s.alias, 'REVIEW-2.md'), 'utf8').match(/Вердикт:\s*(.+)/);
    return m ? m[1].trim() : '?';
  };
  const rows = sources.map((s) => {
    const icon = DONE.review2(s) ? '🏁' : extracted(s) && reviewed(s) ? '✅' : extracted(s) ? '🔎' : '⬜';
    return `| ${icon} | ${s.priority} | [${s.alias}](${s.alias}/) | ${s.title} — ${s.author} | ${extracted(s) ? 'да' : '—'} | ${verdict(s) || '—'} | ${v2(s)} |`;
  });
  const table = ['| | П | алиас | источник | разбор | ревью | второй проход |', '|---|---|---|---|---|---|---|', ...rows].join('\n');
  const readme = join(BOOKS, 'README.md');
  const text = readFileSync(readme, 'utf8');
  writeFileSync(readme, text.replace(/<!-- status:start -->[\s\S]*<!-- status:end -->/, `<!-- status:start -->\n${table}\n<!-- status:end -->`));
  return table;
}

if (flag('--status')) {
  console.log(writeStatus());
  process.exit(0);
}

let picked = sources.filter((s) => args.includes(s.alias));
if (flag('--all')) picked = sources;
if (opt('--priority')) picked = sources.filter((s) => s.priority <= Number(opt('--priority')));
if (!picked.length) {
  console.error('Укажи алиасы, --priority N или --all. Источники:\n' + sources.map((s) => `  ${s.priority} ${s.alias}`).join('\n'));
  process.exit(1);
}

function fill(template, s) {
  const vars = {
    alias: s.alias, title: s.title, author: s.author, kind: s.kind, year: s.year ?? 'не указан',
    why: s.why, focus: s.focus, dir: `docs/books/${s.alias}`,
    urls: s.urls.length ? s.urls.join(', ') : 'нет — ищи сам по легальным источникам',
    input: s.input ? `\`${s.input}\` — прочитай его, это основной материал` : 'нет',
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

function runAgent(s, stage) {
  return new Promise((resolve) => {
    mkdirSync(join(BOOKS, s.alias), { recursive: true });
    mkdirSync(LOGS, { recursive: true });
    const prompt = fill(readFileSync(join(HERE, `${stage}.md`), 'utf8'), s);
    const log = createWriteStream(join(LOGS, `${s.alias}.${stage}.log`), { flags: 'a' });
    // вложенный claude отказывается стартовать внутри другой сессии, если видит CLAUDECODE
    const env = { ...process.env };
    delete env.CLAUDECODE;
    const started = Date.now();
    let last = Date.now();
    let result = null;
    let tail = '';
    const child = spawn('claude', ['-p', '--dangerously-skip-permissions', '--model', MODEL, '--output-format', 'stream-json', '--verbose'], { cwd: ROOT, env });
    const onData = (buf) => {
      last = Date.now();
      log.write(buf);
      tail = (tail + buf.toString()).slice(-200000);
      for (const line of tail.split('\n')) {
        if (line.startsWith('{"type":"result"')) { try { result = JSON.parse(line); } catch {} }
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.stdin.end(prompt);
    let reason = '';
    const kill = (why) => { reason = why; child.kill('SIGTERM'); setTimeout(() => child.kill('SIGKILL'), 10000); };
    const timer = setTimeout(() => kill('таймаут'), TIMEOUT);
    const watchdog = setInterval(() => { if (Date.now() - last > IDLE) kill('завис: нет вывода 20 мин'); }, 30000);
    console.log(`▶ ${stage.padEnd(7)} ${s.alias}`);
    child.on('close', (code) => {
      clearTimeout(timer);
      clearInterval(watchdog);
      log.end();
      const min = ((Date.now() - started) / 60000).toFixed(1);
      const ok = code === 0 && !result?.is_error && DONE[stage](s);
      const text = result ? `${result.result ?? ''} ${result.subtype ?? ''}` : tail.slice(-3000);
      const limit = !ok && LIMIT_RE.test(text);
      if (limit) { limited = true; writeFileSync(LIMIT_FLAG, `${new Date().toISOString()} ${s.alias} ${stage}\n${text.slice(0, 2000)}`); }
      const cost = result?.total_cost_usd ? ` · $${result.total_cost_usd.toFixed(2)}` : '';
      console.log(`${ok ? '✓' : '✗'} ${stage.padEnd(7)} ${s.alias} · ${min} мин${cost}${ok ? '' : ` · ${limit ? 'ЛИМИТ' : reason || 'код ' + code}, лог: docs/books/_pipeline/logs/${s.alias}.${stage}.log`}`);
      writeStatus();
      resolve({ ok, limit });
    });
  });
}

// Пул: разборы идут по очереди не больше jobs разом; ревью встаёт впереди очереди, как только разбор готов.
const queue = [];
const nextStage = (s, after) => {
  const from = after ? STAGES.indexOf(after) + 1 : 0;
  return STAGES.slice(from).find((st) => flag('--force') || !DONE[st](s));
};
for (const s of picked) {
  if (flag('--review-only')) { if (extracted(s) && (flag('--force') || !reviewed(s))) queue.push({ s, stage: 'review' }); continue; }
  const st = nextStage(s);
  if (st) queue.push({ s, stage: st });
}
let running = 0;
await new Promise((done) => {
  const next = () => {
    if ((!queue.length || limited) && running === 0) return done();
    while (!limited && running < jobs && queue.length) {
      const job = queue.shift();
      running++;
      runAgent(job.s, job.stage).then(({ ok, limit }) => {
        running--;
        const st = ok && !flag('--review-only') ? nextStage(job.s, job.stage) : null;
        if (st) queue.unshift({ s: job.s, stage: st });
        // один повтор при сбое, который не связан с лимитами
        else if (!ok && !limit && !job.retried) queue.push({ ...job, retried: true });
        next();
      });
    }
  };
  next();
});
if (limited) console.log('\n⚠ упёрлись в лимит, новые агенты не запускаются: ' + LIMIT_FLAG);
console.log('\n' + writeStatus());
