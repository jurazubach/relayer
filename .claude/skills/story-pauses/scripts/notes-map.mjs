// Карта заметок — внешней памяти игрока (R-100): какие кнопки пишут в служебный чат, какие переменные они
// ставят, кто их потом читает и в какой главе. Записи и чтения — индекс story:vars (scripts/story/core/vars-index.mjs),
// поэтому счёт чтений совпадает с `npm run story:vars`. Служебные контакты — dict.service_contacts и
// service: true в meta.json, как у story:lint.
import { prepare } from '../../../../scripts/story/core/run.mjs';
import { varIndex, VISIBLE } from '../../../../scripts/story/core/vars-index.mjs';
import { walk } from '../../../../scripts/lib/ink.mjs';
import { storyRefs } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/notes-map.mjs [--story <id|путь>,…] [--json]

Заметки как внешняя память игрока (скилл story-pauses: R-100, TH-43). Для каждой кнопки с #to:<служебный контакт>:

  запись      текст кнопки (что игрок записал) и глава
  ставит      переменные, которые пишет ветка кнопки (лучше note_*)
  читают      где переменную читают: глава и вид чтения (как story:vars); «кнопка» — условная кнопка-выстрел
  статус      «пустой клик» — запись ничего не ставит или переменную никто не читает; «только финал» —
              читают только распределители финала (игрок не видит связи); «та же глава» — запись нужна в той же
              сессии (attention-today:P-05#нюанс); «ок» — читает видимое чтение в более поздней главе
  вопрос      запись — вопрос («?»): перед долгой паузой в заметках нужна строка-вопрос (inkle-ingold:LESSON-04)

  --story     история по id, файл .json / .ink или папка; через запятую; по умолчанию все из src/stories
  --json      всё данными
  --help      эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const refs = storyRefs((opt('--story') ?? '').split(',').filter(Boolean));
const WRITE = /^(?:temp\s+)?([\p{L}_][\p{L}\p{N}_]*)\s*(\+\+|--|[+\-*/]?=(?!=))/u;

const report = [];
for (const ref of refs) {
  const p = prepare(ref);
  const meta = p.story.meta ?? {};
  const service = new Set([...T.value('dict.service_contacts'), ...(meta.characters ?? []).filter((c) => c.service && c.id).map((c) => c.id)]);
  const idx = varIndex(p.tree);
  const byName = new Map(idx.vars.map((v) => [v.name, v]));
  const notes = [];
  for (const k of p.tree.knots) {
    walk(k.items, (it) => {
      // «Не сохранять #silent» — отказ от записи, а не запись
      if (it.type !== 'choice' || !service.has(it.tags?.to) || 'silent' in (it.tags ?? {})) return;
      const sets = new Set();
      walk(it.items ?? [], (x) => { if (x.type === 'code') { const m = x.text.match(WRITE); if (m) sets.add(m[1]); } });
      const reads = [...sets].flatMap((name) => (byName.get(name)?.reads ?? []).map((r) => ({ var: name, node: r.node, chapter: r.chapter, kind: r.kind, visible: VISIBLE.has(r.kind) })));
      const later = reads.filter((r) => r.visible && r.chapter > k.chapter);
      const visible = reads.filter((r) => r.visible);
      const finalOnly = reads.length > 0 && reads.every((r) => idx.final.has(r.node) || idx.distributors.has(r.node));
      const status = !sets.size || !reads.length ? 'пустой клик' : finalOnly ? 'только финал' : later.length ? 'ок' : visible.length ? 'та же глава' : 'скрыто';
      notes.push({ knot: k.id, chapter: k.chapter, to: it.tags.to, text: it.text, label: it.tags.label ?? null, question: /\?/.test(it.text), sets: [...sets], reads, status });
    });
  }
  const counts = notes.reduce((m, n) => ({ ...m, [n.status]: (m[n.status] ?? 0) + 1 }), {});
  report.push({ id: p.story.id, path: p.story.path, service: [...service].filter((s) => p.tree.contacts[s]), notes, counts, questions: notes.filter((n) => n.question).length });
}

if (args.includes('--json')) { console.log(JSON.stringify({ stories: report }, null, 1)); process.exit(0); }
for (const r of report) {
  console.log(`${r.path} · служебные чаты: ${r.service.join(', ') || 'нет'} · записей ${r.notes.length} (${Object.entries(r.counts).map(([k, v]) => `${k} ${v}`).join(', ') || '—'}) · записей-вопросов ${r.questions}`);
  if (!r.notes.length) { console.log('   заметок нет: внешней памяти у игрока нет (R-100 — если есть паузы от story.pause.long_s и кнопки, которые опираются на старые факты)\n'); continue; }
  for (const n of r.notes) {
    const reads = n.reads.length ? n.reads.map((x) => `гл.${x.chapter} ${x.node} (${x.kind}${x.visible ? '' : ', скрыто'})`).slice(0, 4).join('; ') : '—';
    console.log(`\n   гл.${n.chapter} ${n.knot} · ${n.status}${n.question ? ' · вопрос' : ''}`);
    console.log(`     запись: «${n.text.length > 80 ? n.text.slice(0, 79) + '…' : n.text}»${n.label ? ` [${n.label}]` : ''}`);
    console.log(`     ставит: ${n.sets.join(', ') || '—'} · читают: ${reads}`);
  }
  console.log('');
}
