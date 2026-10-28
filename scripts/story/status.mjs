// story:status — где мы с историями: активная, шаг цикла, последние решения (план §7). Печатает хук SessionStart.
import { listStories } from '../lib/story.mjs';
import { basename } from 'node:path';
import { runCli, table } from './core/cli.mjs';
import { STATE_DIR, STEPS, currentBranch, knownStep, pickActive, readStates } from './core/state.mjs';

const HELP = `npm run story:status -- [--all] [--story <id>] [--dir <папка>] [--json]

Читает ${STATE_DIR}/<id>/STATUS.md и decisions.md (формат — план §7, шаблон —
scripts/story/templates/STATUS.md) и печатает:
  без флагов   активную историю: шаг, кто ведёт, ядро и план, открытые вопросы, три последних решения D-NN
  --all        таблицу всех историй: шаг, ведёт, ядро, план, решений, последнее решение, вопросов;
               плюс истории каталога src/stories, у которых папки состояния ещё нет

Активная история: та, где в STATUS.md «активная: да»; иначе — по ветке story/<id>; иначе — правленная
последней (по git, без git — по файлам). Шаги цикла: ${STEPS.join(', ')}.

  --story <id>  показать эту историю, а не активную
  --dir <папка> где искать состояние (по умолчанию ${STATE_DIR}) — для проверок
  --json        всё данными
  --help        эта справка

Папки нет или в ней пусто — так и пишет, код выхода 0: хук SessionStart не должен падать.`;

const DECISIONS = 3;

const decisionLine = (d) => `${d.id}${d.date ? ` · ${d.date}` : ''}${d.who ? ` · ${d.who}` : ''} — ${d.what || '(без описания)'}`;

function stepNote(s) {
  if (!s.status) return 'нет STATUS.md';
  if (!s.status.step) return 'шаг не указан';
  return knownStep(s.status.step) ? null : `шаг «${s.status.step}» не из списка плана §7`;
}

function one(s, why) {
  const st = s.status;
  const out = [`история: ${s.id}${why ? ` (активная: ${why})` : ''} · ${s.dir}/`];
  if (!st) {
    out.push(`   нет STATUS.md — состояние не ведётся; есть: ${s.files.join(', ') || 'ничего'}`);
    return out.join('\n');
  }
  const note = stepNote(s);
  out.push(`   шаг: ${st.step ?? '—'}${note && st.step ? ` ⚠ ${note}` : ''}${st.lead ? ` · ведёт: ${st.lead}` : ''}`);
  out.push(`   ядро: ${st.core ?? '—'} · план: ${st.plan ?? '—'}${st.updated ? ` · обновлено: ${st.updated}` : ''}`);
  if (st.questions.length) {
    out.push(`   открытые вопросы (${st.questions.length}):`);
    for (const q of st.questions) out.push(`     – ${q}`);
  }
  if (s.decisions.length) {
    out.push(`   последние решения (всего ${s.decisions.length}):`);
    for (const d of s.decisions.slice(0, DECISIONS)) out.push(`     ${decisionLine(d)}`);
  } else out.push('   решений нет (decisions.md пуст или его нет)');
  return out.join('\n');
}

/** id историй каталога: папка или .json → имя. */
const catalogIds = () => listStories().map((p) => basename(p).replace(/\.json$/, ''));

runCli(HELP, async (args) => {
  const dir = args.get('dir', STATE_DIR);
  const json = args.has('json');
  const states = readStates(dir);
  // каталог сверяем только с настоящей папкой состояния, а не с фикстурой --dir
  const catalog = dir === STATE_DIR ? catalogIds() : [];
  if (!states || !states.length) {
    const msg = !states
      ? `Папки ${dir}/ нет: ни одна история ещё не ведётся по циклу (план §7).`
      : `В ${dir}/ нет ни одной истории.`;
    if (json) console.log(JSON.stringify({ dir, exists: !!states, stories: [], active: null, catalogWithoutState: catalog }, null, 1));
    else {
      console.log(msg);
      console.log(`Начать: создать ${dir}/<id>/STATUS.md по шаблону scripts/story/templates/STATUS.md (скилл story-desk).`);
      if (catalog.length) console.log(`В каталоге src/stories без состояния: ${catalog.join(', ')}.`);
    }
    return 0;
  }
  const branch = currentBranch();
  const wanted = args.get('story');
  let active = pickActive(states, branch);
  if (wanted) {
    const s = states.find((x) => x.id === wanted);
    if (!s) throw new Error(`нет ${dir}/${wanted}/ (есть: ${states.map((x) => x.id).join(', ')})`);
    active = { state: s, why: null };
  }
  const without = catalog.filter((id) => !states.some((s) => s.id === id));
  if (json) {
    console.log(JSON.stringify({
      dir, exists: true, branch,
      active: active ? { id: active.state.id, why: active.why } : null,
      stories: states.map((s) => ({ id: s.id, dir: s.dir, files: s.files, status: s.status, note: stepNote(s), decisions: s.decisions })),
      catalogWithoutState: without,
    }, null, 1));
    return 0;
  }
  if (args.has('all')) {
    const rows = states.map((s) => {
      const st = s.status;
      const last = s.decisions[0];
      return [
        `${active?.state === s ? '▶ ' : '  '}${s.id}`, st ? st.step ?? '—' : 'нет STATUS.md', st?.lead ?? '—', st?.core ?? '—', st?.plan ?? '—',
        s.decisions.length, last ? `${last.id}${last.date ? ` ${last.date}` : ''}` : '—', st ? st.questions.length : '—', stepNote(s) && st?.step ? `⚠ ${stepNote(s)}` : '',
      ];
    });
    console.log(`Истории в ${dir}/ (▶ — активная${active?.why ? `: ${active.why}` : ''}):\n`);
    console.log(table(rows, ['история', 'шаг', 'ведёт', 'ядро', 'план', 'решений', 'последнее', 'вопросов', '']));
    if (without.length) console.log(`\nВ каталоге src/stories без состояния: ${without.join(', ')}.`);
    return 0;
  }
  if (!active) {
    console.log(`В ${dir}/ ни у одной истории нет STATUS.md: ${states.map((s) => s.id).join(', ')}.`);
    return 0;
  }
  console.log(one(active.state, active.why));
  const others = states.filter((s) => s !== active.state);
  if (others.length) console.log(`\nдругие: ${others.map((s) => `${s.id} (${s.status?.step ?? 'нет STATUS.md'})`).join(', ')} — npm run story:status -- --all`);
  return 0;
}, { bool: ['all'] });
