// Сторож агентов: хук PreToolUse из frontmatter .claude/agents/<агент>.md. Один файл с белым списком на агента
// вместо однострочных node -e: правила видны, их проверяет npm run test:hooks, а отказ — одна короткая строка
// (сообщение хука агент получает в свой контекст, claude-code-format.md §2.5).
// Запуск из frontmatter: node "${CLAUDE_PROJECT_DIR:-.}"/scripts/hooks/agent-guard.mjs <агент>
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HELP = `node scripts/hooks/agent-guard.mjs <агент>

Хук PreToolUse агента: читает вход хука из stdin и пропускает только то, что агенту разрешено.
  story-architect  запись: новые docs/stories/<id>/plans/plan-vN.md и skeleton-vN.ink (только свои за запуск);
                   Bash: npm run story:<чтение> или check:story, скрипты story-plan / story-branch / story-core,
                   idea-park.mjs только с --list или --dry-run, grep, ls
  chapter-writer   запись: src/stories/<id>/chNN.ink (одна история и одна глава за запуск), story.ink и
                   common.ink — только Edit; Bash: npm run story:<чтение> или check:story, скрипты chapter-write
                   (chapter-context, chapter-lint, ink-compile, style-sample), scripts/hooks/full.mjs, grep, ls, wc
  story-auditor    только чтение; Bash: npm run story:<чтение>, скрипты десяти линз story-review, grep
  cold-reader      только npm run story:cold-read -- …
Везде одна команда: без ; & | < > $ \` кавычек внутри, ../ и флагов записи (--out, --write, --new, --ask …).
Разрешено — exit 0 (architect и writer ещё и одобряют вызов: в фоне спросить некому); запрещено — exit 2
и строка причины в stderr; сломанный вход или неизвестный агент — тоже exit 2 (сторож закрывает, а не открывает).

  --help   эта справка`;

const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
// чтение без записи: общие команды story:* и бот; запись (--out, --write, --ask) режется отдельно
const READ_NPM = (extra = '') => `npm run (-s )?(story:(lint|trace|vars|sessions|cast|endings|rule|status${extra}))`;
const SHELL = /[;&|<>$`'"\\\n\r]|\.\.\//;

/** Белые списки. bash — разрешённое начало команды; flags — запрещённые флаги; approve — одобрить вызов. */
export const AGENTS = {
  'story-architect': {
    approve: true,
    bash: new RegExp(`^(${READ_NPM()}|npm run (-s )?check:story)( |$)|^node (\\S*\\/)?\\.claude\\/skills\\/(story-(plan|branch|core)\\/scripts\\/[a-z-]+|story-desk\\/scripts\\/idea-park)\\.mjs( |$)|^grep( -[A-Za-z]+)* |^ls( -[A-Za-z]+)*( |$)`),
    flags: /--(out|ask|answer-file|write|new|take)\b/,
    extra: (q) => (/idea-park/.test(q) && !/--(list|dry-run)\b/.test(q) ? 'idea-park — только --list или --dry-run: запись в ideas.md делает story-desk' : null),
    hint: 'одна команда — npm run story:<чтение> или check:story, скрипт story-plan/story-branch/story-core, idea-park --list|--dry-run, grep, ls; без ; & | > $ и --out/--ask/--write/--new',
    write: architectWrite,
  },
  'chapter-writer': {
    approve: true,
    bash: new RegExp(`^(${READ_NPM()}|npm run (-s )?check:story)( |$)|^node (\\S*\\/)?\\.claude\\/skills\\/chapter-write\\/scripts\\/(chapter-context|chapter-lint|ink-compile|style-sample)\\.mjs( |$)|^node (\\S*\\/)?scripts\\/hooks\\/full\\.mjs( |$)|^grep( -[A-Za-z]+)* |^(ls|wc)( -[A-Za-z]+)*( |$)`),
    flags: /--(out|ask|answer-file|write|take|from-save)\b/,
    // --new у full.mjs — «только новые ошибки» (чтение); у остальных команд это запись
    extra: (q) => (/--new\b/.test(q) && !/^node (\S*\/)?scripts\/hooks\/full\.mjs /.test(q) ? '--new разрешён только у full.mjs' : null),
    hint: 'одна команда — npm run story:<чтение> или check:story, скрипт chapter-write, full.mjs, grep, ls, wc; без ; & | > $ и --out/--write; порог — Read thresholds.json',
    write: writerWrite,
  },
  'story-auditor': {
    approve: false,
    bash: new RegExp(`^${READ_NPM('|diff')}( |$)|^node (\\S*\\/)?\\.claude\\/skills\\/story-(opening|pace|pauses|time|choices|endings|cast|voice|continuity|mystery)\\/scripts\\/[a-z-]+\\.mjs( |$)|^grep( -[A-Za-z]+)* `),
    flags: /--(out|ask|answer-file)\b/,
    hint: 'только чтение — одна команда: npm run story:<чтение>, скрипт линзы или grep; без ; & | > $ и --out/--ask',
    write: null,
  },
  'cold-reader': {
    approve: false,
    // аргументы читателя идут в кавычках (--profile «…»), поэтому кавычки здесь не режутся — только подстановки
    raw: /^npm run (-s )?story:cold-read( -- [^;&|<>`$\\\n\r]*)?$/,
    hint: 'разрешена только одна команда npm run story:cold-read -- … без ; && | > и подстановок',
    write: null,
  },
};

/** Кавычки — внутрь не смотрим: в них текст аргумента (--text "…"), а не команда. */
const unquote = (c) => c.replace(/'[^']*'/g, 'Q').replace(/"(?:[^"$`\\]|\\[^"$`\\\n])*"/g, 'Q');

function checkBash(rule, command) {
  const c = String(command ?? '').trim();
  if (rule.raw) return rule.raw.test(c) ? null : rule.hint;
  const q = unquote(c);
  if (!rule.bash.test(q) || SHELL.test(q) || rule.flags.test(q)) return rule.hint;
  return rule.extra?.(q) ?? null;
}

/** Журнал запуска агента: что он сам создал или какую главу взял. Ключ — agent_id, иначе session_id. */
const logPath = (agent, input, dir, ext) => join(dir, `${agent}-${String(input.agent_id || input.session_id || 'x').replace(/[^A-Za-z0-9_-]/g, '')}.${ext}`);

function architectWrite(p, abs, input, dir) {
  const m = abs.match(/\/docs\/stories\/[a-z0-9-]+\/plans\/(plan-v[0-9]+[a-z]?\.md|skeleton-v[0-9]+[a-z]?\.ink)$/);
  if (!m || p.includes('..')) return 'писать можно только docs/stories/<id>/plans/plan-vN.md и skeleton-vN.ink';
  const log = logPath('story-architect', input, dir, 'txt');
  let mine = [];
  try { mine = readFileSync(log, 'utf8').split('\n'); } catch { /* первый файл запуска */ }
  if (existsSync(abs)) {
    if (!mine.includes(abs)) return `${basename(abs)} уже есть, его писал не ты: новая версия — новый файл со следующим N`;
  } else appendFileSync(log, `${abs}\n`);
  return null;
}

function writerWrite(p, abs, input, dir) {
  const m = abs.match(/\/src\/stories\/([a-z0-9-]+)\/(ch([0-9]+)\.ink|story\.ink|common\.ink)$/);
  if (!m || p.includes('..')) return 'писать можно только src/stories/<id>/chNN.ink, story.ink (строка INCLUDE) и common.ink';
  if (!existsSync(join(dirname(abs), 'meta.json'))) return `истории ${m[1]} нет: новую историю заводит не агент`;
  if (!m[3] && input.tool_name === 'Write' && existsSync(abs)) return `${m[2]} — только точечно через Edit, целиком не переписывать`;
  const log = logPath('chapter-writer', input, dir, 'json');
  let st = {};
  try { st = JSON.parse(readFileSync(log, 'utf8')); } catch { /* первый файл запуска */ }
  if (st.story && st.story !== m[1]) return `одна история за запуск, уже ${st.story}`;
  if (m[3]) {
    const n = String(Number(m[3]));
    if (st.chapter && st.chapter !== n) return `одна глава за запуск, уже ch${st.chapter}: нужное в другой главе — строкой в выходе`;
    st.chapter = n;
  }
  st.story = m[1];
  writeFileSync(log, JSON.stringify(st));
  return null;
}

/**
 * Решение сторожа: { allow, reason }. dir — где журнал запуска (по умолчанию системный tmp; самопроверка даёт свой).
 */
export function guard(agent, input, { dir = tmpdir() } = {}) {
  const rule = AGENTS[agent];
  if (!rule) return { allow: false, reason: `agent-guard: неизвестный агент «${agent}» (${Object.keys(AGENTS).join(', ')})` };
  const tool = input?.tool_name ?? '';
  const t = input?.tool_input ?? {};
  let why;
  if (tool === 'Bash') why = checkBash(rule, t.command);
  else if (WRITE_TOOLS.has(tool)) {
    const p = String(t.file_path || t.notebook_path || '');
    if (!rule.write) why = 'только чтение: писать файлы нельзя';
    else if (!p) why = 'нет пути файла';
    else why = rule.write(p, resolve(input.cwd || process.cwd(), p), input, dir);
  } else return { allow: true, reason: null, approve: false };
  return why ? { allow: false, reason: `${agent}: ${why}` } : { allow: true, reason: null, approve: rule.approve };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const agent = process.argv[2];
  if (!agent || agent === '--help' || agent === '-h') { console.log(HELP); process.exit(agent ? 0 : 2); }
  let s = '';
  process.stdin.on('data', (d) => (s += d)).on('end', () => {
    try {
      const input = JSON.parse(s);
      const r = guard(agent, input);
      if (!r.allow) { console.error(r.reason); process.exitCode = 2; return; }
      if (r.approve) {
        console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', permissionDecisionReason: `${agent}: в белом списке agent-guard` } }));
      }
    } catch (e) {
      // сбой сторожа не должен пропускать вызов: exit 1 хук считает не блокирующим
      console.error(`agent-guard: сбой (${e.message.split('\n')[0]}) — вызов не пропущен`);
      process.exitCode = 2;
    }
  });
}
