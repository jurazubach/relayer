// Чистые функции skills:test: сборка мутантов из основы, сверка ключа, разница находок линта,
// разбор ответа скилла и полнота по зонам. Процессы и файлы — в skills-test.mjs.
import { createHash } from 'node:crypto';

/** Правки основы: каждая «найти» ровно один раз, иначе мутант собран не из того места. */
export function applyEdits(src, edits) {
  const errors = [];
  let text = src;
  edits.forEach(([find, replace], i) => {
    const n = text.split(find).length - 1;
    if (n !== 1) errors.push(`правка ${i + 1}: «${find.split('\n')[0].slice(0, 50)}» встречается ${n} раз, а нужно ровно 1`);
    else text = text.replace(find, () => replace);
  });
  if (!errors.length && text === src) errors.push('правки не изменили основу');
  return { text, errors };
}

/** Мутант целиком: story.ink и meta.json, id в meta — id мутанта (свой прогресс в localStorage). */
export function buildMutant(m, base) {
  const { text, errors } = applyEdits(base.ink, m.edits ?? []);
  let meta = { ...base.meta, id: m.id };
  if (m.meta) meta = { ...m.meta(meta), id: m.id };
  return { id: m.id, errors, files: { 'story.ink': text, 'meta.json': `${JSON.stringify(meta, null, 2)}\n` } };
}

export const KEY_FIELDS = ['id', 'zone', 'check', 'node', 'broken', 'lint', 'catches'];
const RED_ID = /^[a-z0-9-]+:RED-\d\d$/;

/**
 * Запись ключа: то, что сверяют линт и скилл. Правки сюда не попадают — они в mutants-spec.mjs.
 * catches — полные ID строк базы и проверки, которые мутант ловит: по ним story:coverage засчитывает RED на L3.
 */
export function keyEntry(m) {
  const entry = {
    id: m.id, zone: m.zone, check: m.check, node: m.node ?? null, broken: m.broken, lint: [...(m.lint ?? [])],
    lint_auto: m.lint_auto !== false,
  };
  if (m.lint_auto === false) entry.lint_why = m.lint_why;
  entry.catches = [...new Set([...(m.catches ?? []), ...(m.check ? [m.check] : []), ...(m.lint ?? [])])];
  entry.path = `docs/lab/mutants/${m.id}`;
  return entry;
}

export function buildKey(mutants, about) {
  return { _about: about, base: 'docs/lab/mutants/_base', mutants: mutants.map(keyEntry) };
}

/**
 * Проверка набора по спецификации: размер, поля, известные скиллы и проверки, единственность id.
 * @param o { count: {min,max}, skills: Set, checks: Set }
 */
export function validateSpec(mutants, o) {
  const errors = [];
  if (mutants.length < o.count.min || mutants.length > o.count.max) {
    errors.push(`мутантов ${mutants.length}, а нужно ${o.count.min}–${o.count.max} (lab.mutants.count)`);
  }
  const ids = new Set();
  for (const m of mutants) {
    const at = m.id ?? '(без id)';
    for (const f of KEY_FIELDS) if (!(f in m) && f !== 'node') errors.push(`${at}: нет поля ${f}`);
    if (!/^m\d\d-[a-z0-9-]+$/.test(m.id ?? '')) errors.push(`${at}: id не вида m01-что-сломано`);
    if (ids.has(m.id)) errors.push(`${at}: id повторяется`);
    ids.add(m.id);
    if (o.skills && !o.skills.has(m.zone)) errors.push(`${at}: зона «${m.zone}» — не скилл из owners.md §1`);
    if (o.checks) {
      if (m.check && !o.checks.has(m.check)) errors.push(`${at}: проверки ${m.check} нет в checks.md`);
      for (const c of m.lint ?? []) if (!o.checks.has(c)) errors.push(`${at}: lint ждёт ${c}, её нет в checks.md`);
    }
    if (!Array.isArray(m.edits) || !m.edits.length) errors.push(`${at}: нет правок`);
    if (!Array.isArray(m.catches)) errors.push(`${at}: catches — не список строк базы (алиас:RED-NN)`);
    for (const c of m.catches ?? []) if (!RED_ID.test(c)) errors.push(`${at}: catches «${c}» — не алиас:RED-NN`);
    if (m.lint_auto === false && !(m.lint_why?.length >= 20)) errors.push(`${at}: lint_auto: false без причины lint_why`);
    if (!m.broken || m.broken.length < 20) errors.push(`${at}: «broken» пустой или слишком короткий для сверки`);
  }
  return errors;
}

/** Скиллы из таблицы «Сводка по скиллам» owners.md §1. */
export function skillsFromOwners(md) {
  const sec = md.slice(md.indexOf('## 1.'), md.indexOf('## 2.'));
  return new Set([...sec.matchAll(/^\| `(story-[a-z-]+|chapter-write)` \|/gm)].map((m) => m[1]));
}

/** Владелец проверки по owners.md §3 (таблица C-NN): для подсказки «зона ≠ владелец». */
export function checkOwners(md) {
  const out = new Map();
  for (const m of md.matchAll(/^\| (C-\d\d) \| [^|]+\| `([^`]+)` \|/gm)) out.set(m[1], m[2]);
  return out;
}

const sig = (f) => `${f.check}|${f.key}|${f.node ?? ''}`;

/** Находки мутанта, которых нет у основы: место и ключ порога, без текста (в тексте доли и счётчики). */
export function lintDiff(baseFindings, mutFindings) {
  const seen = new Set(baseFindings.map(sig));
  return mutFindings.filter((f) => !seen.has(sig(f)));
}

/**
 * Поймал ли линт мутанта. Ждём все проверки из lint и саму check, если она уже есть в линте. lint_auto: false —
 * своя check мутанта по определению не может его поймать (задача скилла): ждём только поле lint, а без него
 * мутант — «skill» и в полноту линта не входит.
 * @returns {{ status: 'caught'|'partial'|'missed'|'pending'|'skill', expected, caught, missing, extra, waits }}
 */
export function lintVerdict(entry, diff, implemented) {
  const auto = entry.lint_auto !== false;
  const expected = [...new Set([...(entry.lint ?? []), ...(auto && entry.check && implemented.has(entry.check) ? [entry.check] : [])])];
  const fired = new Set(diff.map((f) => f.check));
  const caught = expected.filter((c) => fired.has(c));
  const missing = expected.filter((c) => !fired.has(c));
  const extra = [...fired].filter((c) => !expected.includes(c));
  const waits = auto && entry.check && !implemented.has(entry.check) ? entry.check : null;
  const status = !expected.length ? (auto ? 'pending' : 'skill') : !missing.length ? 'caught' : caught.length ? 'partial' : 'missed';
  return { status, expected, caught, missing, extra, waits };
}

/** Полнота по зонам. results: [{ entry, verdict }] (линт) или [{ entry, runs: [{ hit }] }] (скилл). */
export function zoneSummary(results) {
  const zones = new Map();
  for (const r of results) {
    const z = zones.get(r.entry.zone) ?? { zone: r.entry.zone, mutants: 0, measured: 0, caught: 0, pending: 0, skill: 0, runs: 0, hits: 0 };
    z.mutants++;
    if (r.verdict) {
      if (r.verdict.status === 'pending') z.pending++;
      else if (r.verdict.status === 'skill') z.skill++;
      else {
        z.measured++;
        if (r.verdict.status === 'caught') z.caught++;
      }
    }
    if (r.runs) {
      z.runs += r.runs.length;
      z.hits += r.runs.filter((x) => x.hit).length;
      z.measured++;
      if (r.runs.length && r.runs.filter((x) => x.hit).length * 2 >= r.runs.length) z.caught++;
    }
    zones.set(r.entry.zone, z);
  }
  const list = [...zones.values()].sort((a, b) => a.zone.localeCompare(b.zone));
  for (const z of list) z.recall = z.runs ? z.hits / z.runs : z.measured ? z.caught / z.measured : null;
  return list;
}

/** Нейтральный id копии для скилла: имя папки и meta.id не выдают дефект. */
export function neutralId(id, salt = '') {
  return `story-${createHash('sha1').update(id + salt).digest('hex').slice(0, 6)}`;
}

/** Промпт прогона скилла на мутанте. Формат находок — build-plan.md §4, плюс JSON для сверки. */
export function skillPrompt(skill, dir) {
  return [
    `Проверь историю в папке ${dir} скиллом ${skill}: вызови его через Skill и следуй ему.`,
    'Это отдельная история вне каталога src/stories. Ничего не правь и не создавай файлов — только найди проблемы.',
    'Если скиллу нужны docs/stories/<id>/STATUS.md или docs/style.md, а их нет, работай без них.',
    'Команды story:* принимают путь к папке истории вместо id.',
    'В самом конце ответа выведи все находки одним блоком ```json и больше ничего после него:',
    '{"findings": [{"node": "<узел ink или null>", "check": "<C-NN или null>", "summary": "<симптом одной строкой>"}]}',
  ].join('\n');
}

/**
 * Находки из ответа скилла: последний блок ```json с findings; если его нет — строки формата
 * «P1 · … · <узел> · симптом · … C-NN …» (build-plan.md §4).
 */
export function parseFindings(text, nodes = []) {
  if (!text) return [];
  const blocks = [...text.matchAll(/```json\s*([\s\S]*?)```/g)].map((m) => m[1]);
  for (const raw of blocks.reverse()) {
    try {
      const data = JSON.parse(raw);
      const list = Array.isArray(data) ? data : data.findings;
      if (Array.isArray(list)) {
        return list.map((f) => ({ node: f.node ? String(f.node) : null, check: normCheck(f.check), summary: String(f.summary ?? '') }));
      }
    } catch {
      // не JSON — пробуем следующий блок, потом строки
    }
  }
  const known = new Set(nodes);
  const out = [];
  for (const line of text.split('\n')) {
    if (!/^\s*[-*]?\s*P\d\s*·/.test(line)) continue;
    const parts = line.split('·').map((s) => s.trim().replace(/`/g, ''));
    const node = parts.find((p) => known.has(p) || known.has(p.split(/\s/)[0])) ?? null;
    out.push({ node: node?.split(/\s/)[0] ?? null, check: normCheck(line.match(/C-\d\d/)?.[0]), summary: line.trim() });
  }
  return out;
}

const normCheck = (c) => (c && /^C-\d\d$/.test(String(c).trim()) ? String(c).trim() : null);

/** Нашёл ли скилл дефект: находка в узле дефекта (или его stitch) или с той же проверкой. */
export function matchFinding(entry, findings) {
  return findings.find((f) => {
    if (entry.node && f.node && (f.node === entry.node || f.node.startsWith(`${entry.node}.`))) return true;
    return !!entry.check && f.check === entry.check;
  }) ?? null;
}

export const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)}%`);

export function table(rows, head) {
  const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (r) => r.map((c, i) => String(c).padEnd(w[i])).join('  ').trimEnd();
  return [line(head), line(w.map((n) => '─'.repeat(n))), ...rows.map(line)].join('\n');
}
