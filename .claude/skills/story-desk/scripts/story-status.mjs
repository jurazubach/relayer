// story-status — обёртка над npm run story:status (scripts/story/status.mjs) для story-desk: завести папку
// состояния, проверить её формат, сменить шаг или активную историю, показать, кто ведёт главы (Б-6), и что
// по циклу дальше. Разбор STATUS.md и decisions.md — тот же модуль, что у story:status: числа совпадают.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runCli, table } from '../../../../scripts/story/core/cli.mjs';
import {
  ROOT, STATE_DIR, STEPS, chapterFiles, currentBranch, knownStep, parseStatus, pickActive, readDecisions, readStates, readText,
  setStatusField, stateDir, today, tryStory,
} from './desk-core.mjs';

// Цикл build-plan.md §2: шаг → кто ведёт → чем шаг закрывается → следующий шаг. Это порядок процесса, не порог.
const CYCLE = {
  idea: { skill: 'story-brainstorm', done: '3–5 направлений с трейлерами, автор выбрал одно (D-NN «направление»)', next: 'directions' },
  directions: { skill: 'story-core', done: 'ядро v1 и ответы автора на вопросы ядра (D-NN «ядро v1», STATUS: ядро)', next: 'core' },
  core: { skill: 'story-plan (+ агент story-architect)', done: '2–3 плана сравнены числами, выбран один (D-NN «план vN», STATUS: план)', next: 'plan' },
  plan: { skill: 'story-plan', done: 'скелет всей истории: check:story, story:endings, story:lint --plan без ошибок; story-review --plan', next: 'skeleton' },
  skeleton: { skill: 'chapter-write', done: 'главы 1–2 начисто с beta_stop, быстрый хук зелёный', next: 'chapters:1-2' },
  'chapters:1-2': { skill: 'story-review', done: 'отчёт ревью в reviews/<дата>.md, автор отметил, что чинить', next: 'review' },
  review: { skill: 'story-fix', done: 'одобренные правки применены, lint до и после', next: 'fix' },
  fix: { skill: 'story-time → story-playtest', done: 'оба режима проверены, напоминания; комплект для тестеров собран', next: 'playtest:wave1' },
  'playtest:wave1': { skill: 'story-fix (Б-2) → story-desk + story-plan (Б-1) → chapter-write', done: 'правки по сводке, план сверен с тестом (новая версия), все главы написаны, beta_stop снят, ранние сверены с поздними (stale-check)', next: 'chapters:3-N' },
  'chapters:3-N': { skill: 'story-review → story-fix', done: 'полное ревью без --partial, P1 закрыты', next: 'review:full' },
  'review:full': { skill: 'story-playtest', done: 'вторая волна, свежие люди на начало', next: 'playtest:wave2' },
  'playtest:wave2': { skill: 'story-release', done: 'гейт выпуска пройден, ревизия и тег <id>-rN', next: 'release' },
  release: { skill: 'story-release (следующая ревизия)', done: '—', next: null },
};
const stepKey = (s) => (CYCLE[s] ? s : /^chapters:\d+-(\d+|N)$/.test(s) ? (s === 'chapters:1-2' ? s : 'chapters:3-N') : /^playtest:wave\d+$/.test(s) ? (s === 'playtest:wave1' ? s : 'playtest:wave2') : null);

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/story-status.mjs [--story <id>] [--all] [--json]
node \${CLAUDE_SKILL_DIR}/scripts/story-status.mjs --init <id> [--lead <кто>] [--step <шаг>]
node \${CLAUDE_SKILL_DIR}/scripts/story-status.mjs --check [--story <id>]
node \${CLAUDE_SKILL_DIR}/scripts/story-status.mjs --owners --story <id>
node \${CLAUDE_SKILL_DIR}/scripts/story-status.mjs --next --story <id>
node \${CLAUDE_SKILL_DIR}/scripts/story-status.mjs --step <шаг> --story <id>
node \${CLAUDE_SKILL_DIR}/scripts/story-status.mjs --activate <id>

Без флагов и с --all — то же, что npm run story:status (вывод этой команды).

  --init <id>      завести ${STATE_DIR}/<id>/: STATUS.md по шаблону scripts/story/templates/STATUS.md,
                   пустые decisions.md и ideas.md; уже есть — ничего не трогает
  --check          формат состояния: шаг из списка плана §7, ядро есть в decisions.md, файл плана существует,
                   у каждой главы есть, кто её ведёт (Б-6); «активная: да» у двух историй и больше — ⚠, не ошибка:
                   хук и story:status берут правленную последней, снимать флаг — только по слову автора
  --owners         главы истории → кто ведёт по STATUS.md («Кто что пишет») → последний автор в git
  --next           шаг сейчас → кто его ведёт → чем он закрывается → следующий шаг (цикл build-plan.md §2)
  --step <шаг>     записать шаг в STATUS.md (после согласия автора); шаги: ${STEPS.join(', ')}
  --activate <id>  сделать историю активной: «активная: да» у неё, у остальных — снять
  --dir <папка>    где лежит состояние (по умолчанию ${STATE_DIR})
  --lead <кто>     для --init: кто ведёт историю (по умолчанию «автор»)
  --json           данными

Код выхода: 0; у --check — 1, если есть ошибки формата.`;

/** «- глава 2 — chapter-writer, черновик» → { 2: 'chapter-writer, черновик' }; «главы 3–5 — Даша» — каждой. */
function owners(status) {
  const sec = Object.entries(status.sections).find(([name]) => /кто.*пиш|владел|авторы/i.test(name));
  const map = new Map();
  for (const item of sec?.[1] ?? []) {
    const m = item.match(/^глав[аы]?\s+(\d+)(?:\s*[–-]\s*(\d+))?\s*[—:-]\s*(.+)$/i);
    if (!m) continue;
    const a = Number(m[1]), b = Number(m[2] ?? m[1]);
    for (let n = a; n <= b; n++) map.set(n, m[3].trim());
  }
  return map;
}

function gitAuthor(path) {
  try { return execFileSync('git', ['log', '-1', '--format=%an', '--', path], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null; } catch { return null; }
}

function storyStatus(argv) {
  return execFileSync('node', [join(ROOT, 'scripts/story/status.mjs'), ...argv], { encoding: 'utf8' });
}

function checkOne(s, dir) {
  const errs = [], warns = [];
  if (!s.status) { errs.push('нет STATUS.md'); return { errs, warns }; }
  const st = s.status;
  if (!st.step) errs.push('шаг не указан');
  else if (!knownStep(st.step)) errs.push(`шаг «${st.step}» не из списка плана §7`);
  const decs = readDecisions(join(dir, s.id, 'decisions.md'));
  if (st.core && !decs.some((d) => d.id === st.core)) errs.push(`ядро ${st.core} нет в decisions.md`);
  const after = STEPS.indexOf(stepKey(st.step ?? '') ?? '');
  if (!st.core && after > STEPS.indexOf('directions')) errs.push(`шаг ${st.step}, а ядро не указано`);
  if (st.plan && !existsSync(join(dir, s.id, st.plan))) errs.push(`план ${st.plan}: файла нет`);
  if (!st.plan && after > STEPS.indexOf('core')) warns.push(`шаг ${st.step}, а план не указан`);
  const ids = decs.map((d) => d.n);
  const dup = ids.filter((n, i) => ids.indexOf(n) !== i);
  if (dup.length) errs.push(`номера решений повторяются: ${[...new Set(dup)].map((n) => `D-${String(n).padStart(2, '0')}`).join(', ')}`);
  const story = tryStory(s.id);
  if (story) {
    const own = owners(st);
    const missing = chapterFiles(story).filter((c) => !own.has(c.n)).map((c) => c.n);
    if (own.size && missing.length) warns.push(`у глав ${missing.join(', ')} не записано, кто ведёт`);
  }
  return { errs, warns };
}

runCli(HELP, async (args) => {
  const dir = args.get('dir', STATE_DIR);
  const json = args.has('json');

  if (args.has('init')) {
    const id = args.get('init');
    if (!id || id === true || !/^[a-z0-9-]+$/.test(id)) throw new Error('--init <id>: id истории латиницей через дефис');
    const d = join(dir, id);
    const made = [];
    mkdirSync(d, { recursive: true });
    const tpl = readFileSync(join(ROOT, 'scripts/story/templates/STATUS.md'), 'utf8');
    // шаблон ставит «активная: да»; вторая заведённая история активной не становится — переключает --activate
    const othersActive = (readStates(dir) ?? []).some((s) => s.id !== id && s.status?.active);
    let status = setStatusField(setStatusField(setStatusField(tpl.replace('<id>', id), 'ведёт', args.get('lead', 'автор')), 'шаг', args.get('step', 'idea')), 'обновлено', today());
    if (othersActive) status = setStatusField(status, 'активная', 'нет');
    const files = {
      'STATUS.md': status,
      'decisions.md': `# Решения · ${id}\n`,
      'ideas.md': `# Идеи · ${id}\n`,
    };
    if (args.has('step') && !knownStep(args.get('step'))) throw new Error(`шаг «${args.get('step')}» не из списка: ${STEPS.join(', ')}`);
    for (const [name, text] of Object.entries(files)) {
      const p = join(d, name);
      if (existsSync(p)) continue;
      writeFileSync(p, text);
      made.push(p);
    }
    console.log(json ? JSON.stringify({ dir: d, made }) : made.length ? `заведено: ${made.join(', ')}` : `${d}/ уже есть, ничего не тронуто`);
    return 0;
  }

  if (args.has('activate')) {
    const id = args.get('activate');
    stateDir(id, dir);
    const states = readStates(dir) ?? [];
    for (const s of states) {
      const p = join(dir, s.id, 'STATUS.md');
      if (!existsSync(p)) continue;
      const was = parseStatus(readText(p)).active;
      if (s.id === id || was) writeFileSync(p, setStatusField(readText(p), 'активная', s.id === id ? 'да' : 'нет'));
    }
    console.log(`активная: ${id}`);
    return 0;
  }

  if (args.has('step')) {
    const id = args.get('story');
    const step = args.get('step');
    if (!knownStep(step)) throw new Error(`шаг «${step}» не из списка: ${STEPS.join(', ')}`);
    const p = join(stateDir(id, dir), 'STATUS.md');
    writeFileSync(p, setStatusField(setStatusField(readText(p), 'шаг', step), 'обновлено', today()));
    console.log(`${id}: шаг ${step}`);
    return 0;
  }

  if (args.has('check')) {
    const states = readStates(dir) ?? [];
    const only = args.get('story');
    const list = states.filter((s) => !only || s.id === only);
    const marked = states.filter((s) => s.status?.active);
    const res = list.map((s) => ({ id: s.id, ...checkOne(s, dir) }));
    // две активные — законное состояние (автор ведёт одну и не трогает другую): хук при старте уже берёт
    // правленную последней, а снятый без спроса флаг — решение за автора (W5, стык 4)
    const global = marked.length > 1 ? [`«активная: да» у ${marked.length} историй: ${marked.map((s) => s.id).join(', ')} — story:status берёт правленную последней; снять флаг — только по слову автора (--activate <id>)`] : [];
    const bad = res.some((r) => r.errs.length);
    if (json) { console.log(JSON.stringify({ dir, global, stories: res }, null, 1)); return bad ? 1 : 0; }
    if (!list.length) { console.log(`в ${dir}/ нет историй${only ? ` с id ${only}` : ''}`); return 0; }
    for (const g of global) console.log(`⚠ ${g}`);
    for (const r of res) {
      console.log(`${r.errs.length ? '✗' : '✓'} ${r.id}`);
      for (const e of r.errs) console.log(`   ✗ ${e}`);
      for (const w of r.warns) console.log(`   ⚠ ${w}`);
    }
    return bad ? 1 : 0;
  }

  if (args.has('owners')) {
    const id = args.get('story');
    const st = parseStatus(readText(join(stateDir(id, dir), 'STATUS.md')));
    const story = tryStory(id);
    const own = owners(st);
    const rows = chapterFiles(story).map((c) => ({ chapter: c.n, file: c.path, lead: own.get(c.n) ?? null, git: gitAuthor(c.path) }));
    if (json) { console.log(JSON.stringify({ story: id, lead: st.lead, chapters: rows }, null, 1)); return 0; }
    if (!rows.length) { console.log(`${id}: глав-файлов нет (история не в src/stories или одним .json)`); return 0; }
    console.log(`${id}: ведёт историю — ${st.lead ?? '—'}\n`);
    console.log(table(rows.map((r) => [r.chapter, r.file, r.lead ?? '⚠ не записано', r.git ?? '—']), ['глава', 'файл', 'ведёт (STATUS.md)', 'последний в git']));
    return 0;
  }

  if (args.has('next')) {
    const states = readStates(dir) ?? [];
    const id = args.get('story');
    const s = id ? states.find((x) => x.id === id) : pickActive(states, currentBranch())?.state;
    if (!s?.status) throw new Error(id ? `нет ${dir}/${id}/STATUS.md` : 'нет активной истории: --story <id>');
    const key = stepKey(s.status.step ?? '');
    const c = key ? CYCLE[key] : null;
    const out = { story: s.id, step: s.status.step, skill: c?.skill ?? null, done: c?.done ?? null, next: c?.next ?? null, nextSkill: c?.next ? CYCLE[c.next].skill : null };
    if (json) { console.log(JSON.stringify(out, null, 1)); return 0; }
    if (!c) { console.log(`${s.id}: шаг «${s.status.step ?? '—'}» не из цикла — поправить STATUS.md (шаги: ${STEPS.join(', ')})`); return 0; }
    console.log(`${s.id}: шаг ${s.status.step} · ведёт ${c.skill}\n   закрыт, когда: ${c.done}\n   дальше: ${c.next ?? '— (последний шаг)'}${c.next ? ` · ${CYCLE[c.next].skill}` : ''}`);
    return 0;
  }

  // Обычный вывод — сама команда story:status: одна правда о состоянии
  const pass = [];
  if (args.has('all')) pass.push('--all');
  if (args.get('story')) pass.push('--story', args.get('story'));
  if (dir !== STATE_DIR) pass.push('--dir', dir);
  if (json) pass.push('--json');
  process.stdout.write(storyStatus(pass));
  return 0;
}, { bool: ['all', 'check', 'owners', 'next'] });
