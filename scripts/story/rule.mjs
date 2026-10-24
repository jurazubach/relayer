// story:rule — правило, проверка или решение по ID: текст из свода, пороги из thresholds.json, владелец, отмены.
import { runCli } from './core/cli.mjs';
import { KINDS, PLAYBOOK, lookupId, normalizeId, titleOf } from './core/playbook.mjs';

const HELP = `npm run story:rule -- <ID> [<ID> …] [--brief] [--json]

Текст по ID из свода — чтобы скилл подтягивал правило, а не пересказывал его по памяти (план §4):
${Object.entries(KINDS).map(([p, k]) => `  ${(p + '-NN').padEnd(9)}${k.what} — ${PLAYBOOK}/${k.file}`).join('\n')}

К тексту добавляются:
  пороги     ключи thresholds.json: у проверки C-NN — C-NN.* и ключи с ней в «checks»,
             у правила — ключи, где оно названо в «sources»; значение, условие, уровень, опора
  владелец   строка owners.md: какой скилл и какой файл reference за ID отвечают
  отмена     строки superseded.md: что в ID изменено решением автора и чем заменено
  связи      у правила — проверки, которые на него ссылаются; у проверки — правила из её текста

  <ID>       R-61, C-35, A-01, F-04, LOCAL-01, TH-88; можно несколько, через пробел или запятую;
             регистр и ведущие нули не важны (r61 = R-61)
  --brief    только первый абзац (формулировка) и пороги
  --json     всё данными
  --help     эта справка

Код выхода 2, если ID нет ни в своде, ни в таблицах владельцев.`;

const fmtValue = (v) => {
  if (typeof v === 'string') return v.length > 70 ? `«${v.slice(0, 67)}…»` : `«${v}»`;
  if (v && typeof v === 'object') { const s = JSON.stringify(v); return s.length > 70 ? `${s.slice(0, 67)}…` : s; }
  return String(v);
};

function thresholdLine(t) {
  const cond = t.op ? `${t.op} ${fmtValue(t.value)}` : `= ${fmtValue(t.value)}`;
  const level = { error: 'ошибка', warning: 'предупреждение', hint: 'подсказка' }[t.level] ?? 'настройка';
  const basis = t.basis === 'source' ? 'источник' : t.basis === 'our_estimate' ? 'наша оценка' : t.basis ?? '—';
  return `   ${t.key}  ${cond}${t.unit ? ` ${t.unit}` : ''} · ${level} · ${basis}`;
}

/** Формулировка: у правила — жирная первая строка, у проверки — заголовок и порог. */
function briefText(e) {
  const lines = e.text.split('\n');
  if (!e.id.startsWith('C-')) return lines[0];
  const at = lines.findIndex((l) => /^- \*\*Порог/.test(l));
  if (at < 0) return lines[0];
  let end = at + 1;
  while (end < lines.length && !/^- \*\*/.test(lines[end])) end++;
  return [lines[0], ...lines.slice(at, end)].join('\n');
}

function show(e, brief) {
  const out = [`${e.id} · ${e.kind} · ${e.file}${e.line ? `:${e.line}` : ''}`];
  if (!e.exists) out.push(`   (${e.file} ещё нет — есть только строка владельцев)`);
  if (e.text) {
    const text = brief ? briefText(e) : e.text;
    out.push('', text.replace(/^\*\*(.*)\*\*$/m, '$1'));
  }
  if (e.thresholds.length) {
    out.push('', `пороги (${PLAYBOOK}/thresholds.json):`);
    for (const t of e.thresholds) out.push(thresholdLine(t));
  } else out.push('', 'пороги: нет ключей в thresholds.json');
  if (brief) return out.join('\n');
  // owners.md называет ID и в сводной таблице, и в кластере темы: строки без файла — повтор
  const owners = e.owners.filter((o, i, all) => o['файл'] || !all.some((x) => x['файл'] && x['владелец'] === o['владелец']));
  for (const o of owners) {
    const file = o['файл'] ?? '';
    out.push('', `владелец: ${o['владелец'] ?? '—'}${file ? ` · ${file}` : ''}${o['ссылаются'] ? ` · ссылаются: ${o['ссылаются']}` : ''}`);
  }
  for (const s of e.superseded) {
    out.push('', `⚠ изменено решением автора ${s['решение'] ?? ''} (${PLAYBOOK}/superseded.md, «${s.section}»):`);
    if (s['что было'] || s['что советует']) out.push(`   было: ${s['что было'] ?? s['что советует']}`);
    if (s['в силе']) out.push(`   в силе: ${s['в силе']}`);
    if (s['чем заменено']) out.push(`   теперь: ${s['чем заменено']}`);
  }
  if (e.related.length) {
    out.push('', `${e.id.startsWith('R-') ? 'проверки по нему' : 'связано'}:`);
    for (const id of e.related) out.push(`   ${id}  ${titleOf(id) ?? ''}`.trimEnd());
  }
  return out.join('\n');
}

runCli(HELP, async (args) => {
  const raw = args.positional.flatMap((s) => s.split(',')).filter(Boolean);
  if (!raw.length) throw new Error('нужен ID: npm run story:rule -- R-61');
  const found = [];
  const missing = [];
  for (const r of raw) {
    const id = normalizeId(r);
    if (!id) { missing.push(`«${r}» не похоже на ID (R-NN, C-NN, A-NN, F-NN, LOCAL-NN, TH-NN)`); continue; }
    const e = lookupId(id);
    if (!e) { missing.push(`${id}: нет в ${PLAYBOOK}/${KINDS[id.slice(0, id.lastIndexOf('-'))].file} и owners.md`); continue; }
    found.push(e);
  }
  if (args.has('json')) console.log(JSON.stringify({ ids: found, missing }, null, 1));
  else console.log(found.map((e) => show(e, args.has('brief'))).join('\n\n────────\n\n'));
  if (missing.length) {
    for (const m of missing) console.error(`ошибка: ${m}`);
    return 2;
  }
}, { bool: ['brief'] });
