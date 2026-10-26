// report — шаг 8 ревью: отчёт автору из merged.json. Поломки отдельно от впечатления (narrative-testing:P-02),
// по главам не больше skill.review.top_per_chapter находок, остальное — в приложение; у каждой находки в режиме
// «объясни» — почему это важно. Отчёт печатается; в docs/stories/<id>/reviews/ его кладёт story-desk.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { runCli } from '../../../../scripts/story/core/cli.mjs';
import { T, checkInfo, prepare, readJson, today } from './review-core.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/report.mjs --story <id> [--partial | --plan [путь]] [--explain] [--json]

Собирает отчёт автору из merged.json папки прогона (сначала merge-findings.mjs). Порядок — references/report.md:
шапка (история, ревизия, коммит, линзы, читатели, счёт story:lint) → «Поломки» → «По главам» (P1…P3, внутри —
баг, непонятно, нестыковка, не верю, скучно; не больше skill.review.top_per_chapter на главу) → «Приложение»
(остальные находки, не сверенное, ложные, скрытые отклонённые, конфликты человек/замер, вне линзы) → строка
для STATUS.md.

  --explain   у каждой находки основного списка — «почему важно»: что почувствует игрок, какая проверка и
              откуда правило (режим «объясни», references/explain.md)
  --json      то же данными: main, appendix, status`;

/** Что почувствует игрок при каждом типе (narrative-testing:P-15): одна строка «почему важно». */
const TYPE_WHY = {
  'баг': 'история ломается или застревает — игрок упирается в поломку раньше, чем в сюжет',
  'непонятно': 'игрок не может связать людей и события; пока это не починено, скука и выбор не важны — он бросит раньше',
  'нестыковка': 'факт, время или знание расходятся между местами — внимательный игрок перестаёт доверять миру',
  'не верю': 'персонаж, выбор или мир ведут себя против установленного — решения и финал теряют вес',
  'скучно': 'внимание уходит: долго без хода игрока или без события — здесь откладывают телефон',
};
const BASIS_WHY = {
  'замер': 'число из story:lint, сверено аудитором с узлом и правилом',
  'модель': 'суждение модели — кандидат, пока его не подтвердит человек или замер',
  'человек': 'сказал тестер: симптом реален, рецепт — нет (narrative-testing:P-05)',
};

function line(it) {
  const place = it.nodes.length ? it.nodes.join(', ') : it.place;
  const ch = it.chapter ? ` (гл. ${it.chapter})` : '';
  const fix = it.fix || '→ владелец линзы';
  const tags = [it.checks.join(', '), it.bases.join(' + '), it.simulation ? 'симуляция' : null, it.confidence, it.unverified ? 'не сверено' : null].filter(Boolean).join(' · ');
  return `P${it.p} · ${it.type}${it.candidate ? ' (кандидат)' : ''} · ${place}${ch} · ${it.summary} · ${fix} · [${tags}]`;
}

function why(it, info) {
  const parts = [TYPE_WHY[it.type] ?? 'место, где игрок спотыкается'];
  for (const c of it.checks) {
    const x = info.get(c);
    if (x) parts.push(`${c} «${x.title}»${x.why ? ` — ${x.why}` : ''}`);
  }
  // без сверки строка замера ещё не прошла LOCAL-04 — не обещаем того, чего не было
  const basis = (b) => (b === 'замер' && it.unverified ? 'число из story:lint, с узлом ещё не сверено (LOCAL-04)' : BASIS_WHY[b]);
  parts.push(it.bases.map(basis).filter(Boolean).join('; '));
  if (it.raised) parts.push(`выше на ступень: ${it.raised}`);
  if (it.note) parts.push(it.note);
  return parts.filter(Boolean).join('. ');
}

function commit() {
  try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return '—'; }
}

await runCli(HELP, async (args) => {
  const ctx = prepare(args, { needLint: false });
  const file = join(ctx.dir, 'merged.json');
  if (!existsSync(file)) throw new Error('нет merged.json — сначала node ${CLAUDE_SKILL_DIR}/scripts/merge-findings.mjs --story <id>');
  const m = readJson(file);
  const top = T().value('skill.review.top_per_chapter');
  const info = checkInfo();
  const explain = args.has('explain');
  const bugs = m.items.filter((x) => x.type === 'баг');
  const rest = m.items.filter((x) => x.type !== 'баг');
  const chapters = [...new Set(rest.map((x) => x.chapter ?? 0))].sort((a, b) => (a || 99) - (b || 99));
  const main = [];
  const appendix = [];
  for (const c of chapters) {
    const list = rest.filter((x) => (x.chapter ?? 0) === c);
    main.push({ chapter: c, items: list.slice(0, top) });
    if (list.length > top) appendix.push({ chapter: c, items: list.slice(top) });
  }
  const p = (n) => m.items.filter((x) => x.p === n).length;
  const head = m.items[0];
  const reviewFile = `reviews/${today()}-story-review.md`;
  const status = `ревью story-review ${today()}: P1 — ${p(1)}, P2 — ${p(2)}, главное — ${head ? `${head.type} в ${head.nodes.join(', ') || head.place}` : 'находок нет'}, отчёт — ${reviewFile}`;
  if (args.has('json')) { console.log(JSON.stringify({ story: m.story, bugs, main, appendix, status }, null, 1)); return 0; }

  const out = [];
  const say = (s = '') => out.push(s);
  const item = (it) => { say(line(it)); if (explain) say(`  почему важно: ${why(it, info)}`); };
  say(`# Ревью · ${m.story} · ${today()}`);
  say('');
  say(`- история: ${m.story}, ревизия ${m.revision ?? '—'}, коммит ${commit()}, режим ${m.mode}`);
  say(`- линзы: ${m.lensesRun.join(', ') || '—'}; ответы: ${m.inputs.join(', ') || '—'}`);
  say(`- story:lint: ${m.lint.total} находок (${Object.entries(m.lint.levels).map(([k, v]) => `${k} ${v}`).join(', ')}); сверка: ${Object.entries(m.lint.status).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  say(`- итого в отчёте: ${m.items.length} — P1 ${p(1)}, P2 ${p(2)}, P3 ${p(3)}; на главу показано не больше ${top} (skill.review.top_per_chapter), остальное — в приложении`);
  if (m.lintOnly) say('- **только замер:** аудиторы не запускались, находки не сверены с ink (LOCAL-04) — это черновик, не ревью');
  say('');
  say('Формат: `P · тип · узел · симптом · правка · [проверка · источник · уверенность]`. Сначала непонятное, потом скучное.');
  say('');
  say('## Поломки');
  say('');
  if (bugs.length) bugs.forEach(item); else say('нет: тупиков, недостижимого и сломанной разметки замер не нашёл');
  say('');
  say('## По главам');
  for (const g of main) {
    say('');
    say(`### ${g.chapter ? `Глава ${g.chapter}` : 'Вся история'}`);
    say('');
    g.items.forEach(item);
  }
  say('');
  say('## Приложение');
  if (appendix.length) {
    say('');
    say('### Остальные находки');
    for (const g of appendix) { say(''); say(`${g.chapter ? `Глава ${g.chapter}` : 'Вся история'}:`); g.items.forEach((it) => say(line(it))); }
  }
  const group = (list) => {
    const by = new Map();
    for (const f of list) { const k = `${f.check} · гл. ${f.chapter ?? '—'}`; by.set(k, (by.get(k) ?? 0) + 1); }
    return [...by].map(([k, n]) => `${k} ×${n}`).join('; ');
  };
  const notChecked = m.lintRest.filter((f) => f.status === 'не сверено' && f.level !== 'hint');
  const notTaken = m.lintRest.filter((f) => f.status === 'не разобрано' && f.level !== 'hint');
  const hints = m.lintRest.filter((f) => f.level === 'hint' && ['не сверено', 'не разобрано'].includes(f.status));
  say('');
  say('### Замер без сверки');
  say('');
  say(`- линзу не запускали (ошибки и предупреждения): ${notChecked.length ? group(notChecked) : 'нет'}`);
  say(`- линза отвечала, строку не разобрала: ${notTaken.length ? group(notTaken) : 'нет'}`);
  say(`- подсказки для ручного ревью: ${hints.length}`);
  say('');
  say('### Ложные срабатывания');
  say('');
  if (m.falses.length) for (const f of m.falses) say(`- ${f.intended ? 'намеренно: ' : ''}${f.check} · ${f.nodes.join(', ') || '—'} · ${f.why || 'без причины'} — предложить \`// намеренно: ${f.check} <причина>\` над узлом`);
  else say('нет');
  say('');
  say('### Отклонено автором');
  say('');
  say(m.hidden.length ? m.hidden.map((h) => `- ${h.decision} · ${h.nodes.join(', ')} · ${h.checks.join(', ') || h.type} — узел не менялся, не поднимаем`).join('\n') : 'нет');
  if (m.reopened.length) say(`- узел изменился после ${m.reopened.join(', ')} — находка снова в списке с пометкой`);
  say('');
  say('### Человек против замера (Б-3)');
  say('');
  say(m.conflicts.length ? m.conflicts.map((c) => `- ${c.node} · ${c.type} · ${c.rule} → ${c.win}${c.checks.length ? ` (${[...new Set(c.checks)].join(', ')})` : ''}`).join('\n') : 'нет');
  say('');
  say('### Вне линзы');
  say('');
  say(m.outside.length ? m.outside.map((o) => `- ${o.lens} · ${o.text} (из ${o.source})`).join('\n') : 'нет');
  if (m.nodata.length) { say(''); say('### Нет данных'); say(''); for (const n of m.nodata) say(`- ${n.text} (${n.source})`); }
  say('');
  say('## Для STATUS.md (через story-desk, после одобрения)');
  say('');
  say(status);
  console.log(out.join('\n'));
  return 0;
});
