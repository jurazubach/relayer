// Статусы строк матрицы: used / merged-into / rejected / superseded / deferred.
// Причина rejected — только из фиксированного списка (flow-review.md §C «Защита», п. 2): свободный текст
// превращает отказ в способ закрыть строку, не читая её.
import { splitRow } from './clean.mjs';
import { parseOpora } from './kb-owners.mjs';

export const REJECT_REASONS = {
  'not-our-format': 'не наш формат',
  'duplicate': 'дубль кластера X — duplicate:<кластер>',
  'contradicts': 'противоречит D-NN — contradicts:D-NN',
  'obsolete': 'устарело при E-NN — obsolete:E-NN',
  'needs-engine': 'нужна фича движка',
};

export const STATUS_HELP = [
  'used — знание берётся (по умолчанию)',
  'merged-into:<ID строки> — влито в другую строку, её уровень и считается',
  `rejected:<причина> — ${Object.values(REJECT_REASONS).join('; ')}`,
  'superseded:<A-NN|D-NN> — отменено решением автора (superseded.md) или истории',
  'deferred:<E-NN> — ждёт фичи движка из build-plan.md §11',
];

/** Ошибка статуса или null. */
export function statusError(status, { rows, clusters, features }) {
  if (status === 'used') return null;
  let m = status.match(/^merged-into:(.+)$/);
  if (m) return rows.has(m[1]) ? null : `merged-into: нет строки «${m[1]}»`;
  m = status.match(/^rejected:([^:]+)(?::(.+))?$/);
  if (m) {
    const [, reason, arg] = m;
    if (!(reason in REJECT_REASONS)) return `rejected: причина «${reason}» не из списка (${Object.keys(REJECT_REASONS).join(', ')})`;
    if (reason === 'duplicate' && !(arg && (clusters.has(arg) || rows.has(arg)))) return `rejected:duplicate: нет кластера «${arg ?? ''}»`;
    if (reason === 'contradicts' && !/^D-\d+$/.test(arg ?? '')) return 'rejected:contradicts: нужен D-NN';
    if (reason === 'obsolete' && !/^E-\d+$/.test(arg ?? '')) return 'rejected:obsolete: нужен E-NN';
    if (['not-our-format', 'needs-engine'].includes(reason) && arg) return `rejected:${reason}: без уточнения — причина из списка`;
    return null;
  }
  m = status.match(/^superseded:(.+)$/);
  if (m) return /^(A|D)-\d+$/.test(m[1]) ? null : 'superseded: нужна ссылка A-NN (superseded.md) или D-NN';
  m = status.match(/^deferred:(.+)$/);
  if (m) return features.has(m[1]) ? null : `deferred: нет фичи «${m[1]}» в build-plan.md §11`;
  return `неизвестный статус «${status}»`;
}

/** Фичи движка E-NN из build-plan.md §11. */
export function engineFeatures(planText) {
  return new Set(planText.match(/\*\*E-\d+/g)?.map((s) => s.slice(2)) ?? []);
}

/**
 * Отменённое базой — из superseded.md «База: что отменено». Столбец «в силе»: «—» — отменено целиком,
 * иначе часть остаётся знанием (partial). Таблица без столбца — по вступлению раздела («в силе в части»).
 */
export function supersededIndex(text, resolve, aliases) {
  const out = new Map();
  const lines = text.split('\n');
  let on = false;
  let decision = null;
  let preamble = '';
  let cols = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s+База/.test(line)) on = true;
    else if (/^##\s/.test(line)) on = false;
    if (!on) continue;
    const h = line.match(/^###\s+.*\((A-\d+)\)/);
    if (h) {
      decision = h[1];
      preamble = '';
      cols = null;
      continue;
    }
    if (!/^\|/.test(line)) {
      cols = null;
      if (line.trim()) preamble += ' ' + line;
      continue;
    }
    const cells = splitRow(line);
    if (!cols) {
      cols = cells;
      continue;
    }
    if (/^[\s:-]+$/.test(cells[0]) || !decision) continue;
    const live = cols.indexOf('в силе');
    const partial = live >= 0 ? cells[live] && cells[live] !== '—' : /в силе в части/.test(preamble);
    const first = cells[0].replace(/`([a-z][a-z0-9-]+)\/attention\.md`\s*§(\d+)/g, '`$1:attention§$2`');
    for (const { id } of parseOpora(first, resolve, aliases)) {
      if (/^[RCF]-/.test(id) || out.has(id)) continue;
      // Раздел attention — много пунктов, отменён всегда только один из них.
      out.set(id, { decision, partial: Boolean(partial) || id.includes('attention§'), line: i + 1 });
    }
  }
  return out;
}
