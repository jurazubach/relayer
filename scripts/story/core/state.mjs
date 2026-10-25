// Состояние истории в репозитории (план §7): docs/stories/<id>/STATUS.md и decisions.md.
// Разбор терпимый: STATUS.md пишут и люди, и скиллы, поэтому ключи узнаются по нескольким написаниям.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const STATE_DIR = 'docs/stories';

/** Шаги цикла из плана §7; главы и волны теста — с номерами. */
export const STEPS = ['idea', 'directions', 'core', 'plan', 'skeleton', 'chapters:1-2', 'review', 'fix',
  'playtest:wave1', 'chapters:3-N', 'review:full', 'playtest:wave2', 'release'];
export const knownStep = (s) => STEPS.includes(s) || /^chapters:\d+-(\d+|N)$/.test(s) || /^playtest:wave\d+$/.test(s);

const FIELDS = {
  step: ['шаг', 'step'],
  active: ['активная', 'активна', 'active'],
  lead: ['ведёт', 'ведет', 'кто ведёт', 'кто ведет', 'lead'],
  core: ['ядро', 'core'],
  plan: ['план', 'plan'],
  updated: ['обновлено', 'updated', 'дата'],
};
const YES = /^(да|yes|true|\+|✓)$/i;
const EMPTY = /^(—|-|–|нет|none|)$/i;

/** Поля STATUS.md: строки «- ключ: значение», «ключ: значение» или «**ключ:** значение». */
export function parseStatus(text) {
  const fields = {};
  const sections = {};
  let section = null;
  for (const raw of text.replace(/<!--[\s\S]*?-->/g, '').split('\n')) {
    const h = raw.match(/^#{2,4}\s+(.*)$/);
    if (h) { section = h[1].trim(); sections[section] = []; continue; }
    const m = raw.match(/^\s*(?:[-*]\s+)?\**([^:*|]+?)\**:\**\s*(.*)$/);
    if (m && !section) {
      const key = m[1].trim().toLowerCase();
      for (const [name, aliases] of Object.entries(FIELDS)) if (aliases.includes(key)) fields[name] = m[2].trim().replace(/^`|`$/g, '');
    }
    if (section) {
      const item = raw.match(/^\s*[-*]\s+(.*\S)/) ?? raw.match(/^\s*\d+[.)]\s+(.*\S)/);
      if (item) sections[section].push(item[1].trim());
    }
  }
  for (const k of ['core', 'plan', 'lead']) if (fields[k] != null && EMPTY.test(fields[k])) fields[k] = null;
  const questions = Object.entries(sections).filter(([name]) => /вопрос/i.test(name)).flatMap(([, items]) => items);
  return {
    step: fields.step ?? null,
    active: fields.active != null ? YES.test(fields.active) : false,
    lead: fields.lead ?? null, core: fields.core ?? null, plan: fields.plan ?? null, updated: fields.updated ?? null,
    questions, sections,
  };
}

/**
 * Решения D-NN из decisions.md в любой из трёх форм: заголовок «## D-03 · дата · кто — что»,
 * пункт «- **D-03** …» или строка таблицы «| D-03 | дата | кто | что | … |».
 */
export function parseDecisions(text) {
  const out = [];
  const lines = text.split('\n');
  let header = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith('|')) {
      const cells = l.split('|').slice(1, -1).map((c) => c.trim());
      if (/^\|[\s:|-]+\|$/.test(l)) continue;
      const m = cells[0]?.match(/^\**(D-\d+)\**$/);
      if (!m) { header = cells.map((c) => c.toLowerCase()); continue; }
      const get = (name) => { const at = header?.findIndex((h) => h.startsWith(name)) ?? -1; return at >= 0 ? cells[at] : null; };
      out.push({ id: m[1], n: Number(m[1].slice(2)), date: get('дата'), who: get('кто'), what: get('что') ?? cells.slice(1).join(' · '), line: i + 1 });
      continue;
    }
    header = null;
    const m = l.match(/^#{2,4}\s*(D-\d+)\b\s*[.:·—-]?\s*(.*)$/) ?? l.match(/^[-*]\s+\**(D-\d+)\b\**\s*[.:·—-]?\s*(.*)$/);
    if (!m) continue;
    let rest = m[2].trim();
    if (!rest) rest = lines.slice(i + 1).find((x) => x.trim() && !/^#/.test(x))?.trim() ?? '';
    const parts = rest.split(/\s+·\s+/);
    const date = parts[0]?.match(/^\(?(\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4})\)?$/) ? parts.shift() : null;
    let who = null;
    let what = parts.join(' · ');
    const dash = what.match(/^([^—]+?)\s+—\s+(.*)$/);
    if (date && dash) { who = dash[1].trim(); what = dash[2].trim(); }
    out.push({ id: m[1], n: Number(m[1].slice(2)), date, who, what, line: i + 1 });
  }
  return out;
}

/** Время последней правки папки: коммит git, иначе mtime самого свежего файла. */
function touched(dir) {
  try {
    const t = execFileSync('git', ['log', '-1', '--format=%ct', '--', dir], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (t) return Number(t) * 1000;
  } catch { /* не репозиторий — берём файлы */ }
  let latest = 0;
  for (const f of readdirSync(dir)) latest = Math.max(latest, statSync(join(dir, f)).mtimeMs);
  return latest;
}

/** Все истории папки состояния: { id, dir, status, decisions, files, touched }. Папки нет — null. */
export function readStates(root = STATE_DIR) {
  if (!existsSync(root)) return null;
  const out = [];
  for (const id of readdirSync(root).sort()) {
    const dir = join(root, id);
    if (id.startsWith('.') || id.startsWith('_') || !statSync(dir).isDirectory()) continue;
    const statusFile = join(dir, 'STATUS.md');
    const decisionsFile = join(dir, 'decisions.md');
    const status = existsSync(statusFile) ? parseStatus(readFileSync(statusFile, 'utf8')) : null;
    const decisions = existsSync(decisionsFile) ? parseDecisions(readFileSync(decisionsFile, 'utf8')).sort((a, b) => b.n - a.n) : [];
    out.push({ id, dir, status, decisions, files: readdirSync(dir).sort(), touched: touched(dir) });
  }
  return out;
}

/** Ветка git сейчас: активная история фиксируется и в имени ветки story/<id> (flow-review.md, раздел B). */
export function currentBranch() {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return null; }
}

/** Активная история и почему именно она: метка в STATUS.md → ветка story/<id> → последняя правка. */
export function pickActive(states, branch = currentBranch()) {
  const withStatus = states.filter((s) => s.status);
  const marked = withStatus.filter((s) => s.status.active);
  const newest = (list) => [...list].sort((a, b) => b.touched - a.touched)[0];
  if (marked.length === 1) return { state: marked[0], why: 'STATUS.md: «активная: да»' };
  if (marked.length > 1) return { state: newest(marked), why: `«активная: да» у ${marked.length} историй (${marked.map((s) => s.id).join(', ')}) — взята правленная последней` };
  const m = branch?.match(/^story\/(.+)$/);
  const byBranch = m && states.find((s) => s.id === m[1]);
  if (byBranch) return { state: byBranch, why: `ветка ${branch}` };
  if (withStatus.length) return { state: newest(withStatus), why: 'метки «активная» нет — взята правленная последней' };
  return null;
}
