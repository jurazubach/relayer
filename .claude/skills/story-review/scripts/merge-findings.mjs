// merge-findings — шаг 7 ревью: сводит ответы аудиторов, холодного читателя, QA «шесть списков» и тестеров с
// выводом story:lint в один список. Дубли по узлу и проверке сливаются, источники складываются; отклонённое
// автором с тем же хэшем узла не всплывает; спор человека с замером решается по references/conflicts.md.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runCli, table } from '../../../../scripts/story/core/cli.mjs';
import { BUG_CHECKS, LENSES, T, chapterOf, inputs, lensOf, parseAnswer, prepare, rejectedFindings, rel, typeRank } from './review-core.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/merge-findings.mjs --story <id> [--partial | --plan [путь]] [--lint-only] [--json]

Читает папку прогона (review-cache.mjs): lint.json и ответы lens-<скилл>.md, cold-*.md, qa-six.md,
human-*.md. Строка находки — общий формат (references/finding-format.md):
  P1 · непонятно · <узел> · симптом · правка (F-NN) · [C-NN · замер|модель|человек · уверенность]

Что делает (references/priority.md, conflicts.md):
  — находки story:lint сверяет с ответами аудиторов: «подтверждено» (есть в находках линзы), «ложное»
    (в разделе «ложные»), «не разобрано» (линза отвечала, а строку не назвала), «не сверено» (линзу не
    запускали) — в основной список идут только сверенные (LOCAL-04);
  — дубли (тот же узел и та же проверка, или тот же узел и тип без проверки) сливает, источники складывает;
    пункт qa-six сливается с пунктом линзы той же C-NN, если у них есть общий узел;
    два разных источника (замер, модель, человек) поднимают находку на ступень;
  — потолки P (skill.review.p_cap, LOCAL-16): «скучно» без человека — не выше boring, если глава держится
    (P1 остаётся, когда замер подтвердил линзу, а холодный читатель в той же главе «отложил бы»); голоса,
    неразличимые только по форме (C-44 без слепого теста и человека), — не выше voice_form; хвост после
    последней кнопки и скрытый порог финала (C-42, C-06, C-02) — тип «непонятно», без потолка «скучно»;
  — отклонённое автором (decisions.md, вид «отклонено», узел и хэш) прячет, пока хэш узла тот же;
  — человек против замера: по «скучно» и «не верю» прав человек, по структуре — замер, один тестер против
    замера — «нужен третий» (lab.playtest.repeat_min);
  — сортирует: P, потом тип (баг → непонятно → нестыковка → не верю → скучно), потом глава.

Пишет merged.json в папку прогона и печатает сводку; отчёт для автора — report.mjs.

  --lint-only   ответов нет: сводка только по story:lint, всё с пометкой «не сверено» (быстрый взгляд)
  --json        сводка данными`;

const keyOf = (f) => `${[...f.nodes].sort().join(',') || f.quote || f.place}|${f.checks[0] ?? f.type}`;
const BASE_OF_KIND = { cold: 'модель', qa: 'модель', human: 'человек', lens: null, other: null };
const STRUCTURE = new Set(['баг', 'нестыковка']);
// LOCAL-16: исход, которого игрок не узнает, — «непонятно», а не «скучно»: хвост после последней кнопки (C-42),
// скрытый порог распределителя (C-06) и счётчик вслепую (C-02). Линза ставила «скучно», и находка оседала в P2
const UNCLEAR_CHECKS = new Set(['C-42', 'C-06', 'C-02']);
const RETYPE_FROM = new Set(['скучно', 'не верю']);

/** Сколько людей сказали одно и то же: «человек · 2 из 3», «2 тестера». */
function people(f) {
  const m = f.bracket.match(/(\d+)\s*(?:из\s*\d+|тестер|человек|чел)/);
  return m ? Number(m[1]) : 1;
}

await runCli(HELP, async (args) => {
  const ctx = prepare(args);
  const lint = ctx.lint.findings;
  const files = inputs(ctx.dir);
  const items = [];
  const falses = [];
  const outside = [];
  const nodata = [];
  const lensesRun = new Set();
  if (!args.has('lint-only')) {
    for (const inp of files) {
      const ans = parseAnswer(readFileSync(inp.file, 'utf8'), ctx.tree);
      const lens = inp.lens ?? (ans.header?.match(/линза:\s*(story-[a-z]+)/)?.[1] ?? null);
      if (lens && lensOf(lens)) lensesRun.add(lens);
      for (const f of ans.findings) {
        const basis = f.basis ?? BASE_OF_KIND[inp.kind] ?? (f.checks.length ? 'замер' : 'модель');
        items.push({ ...f, basis, bases: [basis], sources: [inp.name], lens, kind: inp.kind, people: basis === 'человек' ? people(f) : 0 });
      }
      for (const x of ans.falses) falses.push({ ...x, source: inp.name });
      for (const o of ans.outside) outside.push({ ...o, source: inp.name });
      for (const n of ans.nodata) nodata.push({ text: n, source: inp.name });
    }
  }

  // Строки story:lint: подтверждена ли каждая ответом линзы (LOCAL-04: без сверки в отчёт не идёт).
  const lintStatus = lint.map((f) => {
    const isFalse = falses.find((x) => x.check === f.check && (!x.nodes.length || x.nodes.includes(f.node)));
    const confirmed = items.find((i) => i.checks.includes(f.check) && (i.nodes.includes(f.node) || (!f.node && i.chapter === f.chapter)));
    const status = isFalse ? (isFalse.intended ? 'намеренно' : 'ложное') : confirmed ? 'подтверждено' : lensesRun.has(f.owner) ? 'не разобрано' : 'не сверено';
    return { ...f, status, by: isFalse?.source ?? confirmed?.sources[0] ?? null };
  });

  if (args.has('lint-only') || !files.length) {
    const lens = (o) => lensOf(o);
    for (const f of lintStatus.filter((x) => x.level !== 'hint')) {
      const type = BUG_CHECKS.has(f.check) ? 'баг' : lens(f.owner)?.type ?? 'нестыковка';
      items.push({
        p: f.level === 'error' ? 1 : 2, type, candidate: false, place: f.node ?? '—', nodes: f.node ? [f.node] : [], quote: null,
        chapter: f.chapter, summary: f.message, fix: `→ ${f.owner}`, fixes: [], checks: [f.check], basis: 'замер', bases: ['замер'],
        simulation: false, confidence: null, bracket: `${f.check} · замер`, raw: '', sources: ['lint.json'], lens: f.owner, kind: 'lint',
        people: 0, unverified: true,
      });
    }
  }

  // Дубли: одна находка от нескольких источников — одна строка, источники вместе.
  const merged = new Map();
  for (const it of items) {
    const k = keyOf(it);
    const was = merged.get(k);
    if (!was) { merged.set(k, { ...it }); continue; }
    was.p = Math.min(was.p, it.p);
    was.bases = [...new Set([...was.bases, ...it.bases])];
    was.sources = [...new Set([...was.sources, ...it.sources])];
    was.people = Math.max(was.people, it.people);
    if (!was.fix && it.fix) was.fix = it.fix;
    if (typeRank(it.type) < typeRank(was.type)) was.type = it.type;
  }
  // QA «шесть списков» и линза называют одно место разным набором узлов: та же C-NN и общий узел — одна находка
  for (const [k, q] of [...merged]) {
    if (q.kind !== 'qa' || !q.checks.length) continue;
    const twin = [...merged.values()].find((x) => x !== q && x.kind !== 'qa' && x.checks.includes(q.checks[0]) && x.nodes.some((n) => q.nodes.includes(n)));
    if (!twin) continue;
    twin.p = Math.min(twin.p, q.p);
    twin.bases = [...new Set([...twin.bases, ...q.bases])];
    twin.sources = [...new Set([...twin.sources, ...q.sources])];
    twin.nodes = [...new Set([...twin.nodes, ...q.nodes])];
    merged.delete(k);
  }
  const list = [...merged.values()];
  const cap = T().value('skill.review.p_cap');
  for (const it of list) {
    it.chapter ??= it.nodes.length ? chapterOf(ctx.tree, it.nodes[0]) : null;
    if (it.checks.some((c) => UNCLEAR_CHECKS.has(c)) && RETYPE_FROM.has(it.type)) {
      it.note = `тип «${it.type}» → «непонятно»: игрок не узнает исход (${it.checks.join(', ')}, LOCAL-16)`;
      it.type = 'непонятно';
      it.candidate = false;
    }
    if (it.bases.length > 1 && it.p > 1) { it.p -= 1; it.raised = `два источника: ${it.bases.join(' + ')}`; }
  }
  // глава не держится: холодный читатель в ней «теряю» или «отложил бы» (cold-*.md, тип «скучно»)
  const drops = new Set(list.filter((x) => x.type === 'скучно' && x.sources.some((s) => s.startsWith('cold-')) && x.chapter != null).map((x) => x.chapter));
  for (const it of list) {
    const human = it.bases.includes('человек');
    // «Скучно» до людей — только кандидат (build-plan.md §13): не выше boring, если глава держится. Не держится —
    // линза поставила P1, замер его подтвердил, а читатель в той же главе бросил бы: тогда P1 остаётся (LOCAL-16).
    if (it.type === 'скучно' && !human) {
      it.candidate = true;
      const holds = !(it.p === 1 && it.bases.includes('замер') && drops.has(it.chapter));
      if (holds && it.p < cap.boring) { it.p = cap.boring; it.note = `скучно без человека — кандидат, не выше P${cap.boring}: глава держится (priority.md)`; }
      else if (!holds) it.note = 'скучно без человека, но глава не держится: замер и холодный читатель в той же главе — P1 (priority.md)';
    }
    // голоса по форме (C-44: расстояние профилей) без слепого теста — регистр и содержание могут их различать
    if (it.checks.includes('C-44') && !human && !/слеп/i.test(`${it.bracket} ${it.raw}`) && it.p < cap.voice_form) {
      it.p = cap.voice_form;
      it.note = `голоса различаются только по форме (C-44 без слепого теста) — не выше P${cap.voice_form} (priority.md)`;
    }
  }

  // Б-3: человек против замера на том же узле.
  const repeat = T().value('lab.playtest.repeat_min');
  const conflicts = [];
  for (const h of list.filter((x) => x.bases.includes('человек'))) {
    const falseHere = lintStatus.filter((f) => f.status === 'ложное' && h.nodes.includes(f.node));
    const lintHere = lintStatus.filter((f) => h.nodes.includes(f.node) && f.status !== 'ложное');
    if (falseHere.length) {
      const win = STRUCTURE.has(h.type) ? 'замер' : 'человек';
      conflicts.push({ node: h.nodes.join(','), type: h.type, rule: win === 'человек' ? 'по «скучно» и «не верю» человек сильнее модели' : 'по структуре сильнее замер', win, checks: falseHere.map((f) => f.check) });
      if (win === 'замер') { h.p = Math.max(h.p, 3); h.note = 'спор с замером: структура — за замером, симптом человека записан'; }
    }
    if (h.people < repeat && !lintHere.length && !h.bases.includes('модель')) {
      h.note = `один человек, замер молчит — нужен ещё тестер (lab.playtest.repeat_min); решение отложить в decisions.md с датой`;
      h.needThird = true;
      conflicts.push({ node: h.nodes.join(','), type: h.type, rule: 'один тестер против замера', win: 'нужен третий', checks: [] });
    }
    if (h.people >= repeat && h.p > 1) { h.p = 1; h.raised = `${h.people} человек в одном месте (P-06)`; }
  }

  // Отклонённое автором: тот же хэш узла — не показываем; узел изменился — можно поднять снова.
  const rejected = await rejectedFindings(ctx.id, ctx.story);
  const hidden = [];
  const reopened = [];
  const shown = list.filter((it) => {
    const r = rejected.find((d) => it.nodes.includes(d.node) && (!d.finding || it.checks.includes(d.finding) || !/^C-\d\d$/.test(d.finding)));
    if (!r) return true;
    if (r.same) { hidden.push({ ...it, decision: r.id }); return false; }
    it.note = `узел изменился после ${r.id} (хэш ${r.hash} → ${r.now}) — отклонение можно пересмотреть`;
    reopened.push(r.id);
    return true;
  });

  shown.sort((a, b) => a.p - b.p || typeRank(a.type) - typeRank(b.type) || (a.chapter ?? 99) - (b.chapter ?? 99) || b.bases.length - a.bases.length);
  const stat = { подтверждено: 0, ложное: 0, намеренно: 0, 'не разобрано': 0, 'не сверено': 0 };
  for (const f of lintStatus) stat[f.status] += 1;
  const out = {
    story: ctx.id, mode: ctx.mode, key: ctx.key, date: new Date().toISOString().slice(0, 10), revision: ctx.story.meta?.revision ?? null,
    inputs: files.map((f) => f.name), lensesRun: [...lensesRun], lensesKnown: LENSES.map((l) => l.id),
    lint: { total: lint.length, levels: lint.reduce((m, f) => ({ ...m, [f.level]: (m[f.level] ?? 0) + 1 }), {}), status: stat },
    items: shown, hidden, reopened, conflicts, outside, nodata, falses,
    lintRest: lintStatus.filter((f) => f.status !== 'подтверждено').map(({ data, ...f }) => f),
    lintOnly: args.has('lint-only') || !files.length,
  };
  writeFileSync(join(ctx.dir, 'merged.json'), JSON.stringify(out, null, 1));
  if (args.has('json')) { console.log(JSON.stringify(out, null, 1)); return 0; }
  const byP = [1, 2, 3].map((p) => shown.filter((x) => x.p === p).length);
  console.log(`story-review · ${ctx.id} · сведено → ${rel(join(ctx.dir, 'merged.json'))}`);
  console.log(`ответов: ${files.length} (${files.map((f) => f.name).join(', ') || '—'})${out.lintOnly ? ' · только story:lint, всё «не сверено»' : ''}`);
  console.log(`находок: ${shown.length} — P1 ${byP[0]}, P2 ${byP[1]}, P3 ${byP[2]}; скрыто отклонённых ${hidden.length}; конфликтов человек/замер ${conflicts.length}`);
  console.log(`story:lint ${lint.length}: ${Object.entries(stat).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  console.log('');
  console.log(table(shown.slice(0, T().value('lint.summary.top')).map((x) => [`P${x.p}`, x.type, x.nodes.join(',') || x.place, x.chapter ?? '—', x.bases.join('+'), x.checks.join(',') || '—']), ['P', 'тип', 'узел', 'гл.', 'источник', 'проверка']));
  if (shown.length > T().value('lint.summary.top')) console.log(`… ещё ${shown.length - T().value('lint.summary.top')} (report.mjs)`);
  if (outside.length) console.log(`\nвне линзы: ${outside.length} — в приложении отчёта`);
  return 0;
});
