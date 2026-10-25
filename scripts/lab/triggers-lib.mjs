// Чистые функции теста срабатывания: разбор потока claude -p, наборы фраз, подсчёт долей.
// CLI и запуск процессов — в triggers.mjs; здесь ничего не ходит в сеть, поэтому всё покрыто тестом.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { loadThresholds as loadAll } from '../lib/thresholds.mjs';

export const NONE = 'none';

// Ключи теста срабатывания; числа — только в docs/playbook/thresholds.json, общий загрузчик scripts/lib/thresholds.mjs.
export const TRIGGER_KEYS = [
  'lab.triggers.runs_per_phrase', 'lab.triggers.min_share', 'lab.triggers.max_false',
  'lab.triggers.jobs', 'lab.triggers.max_turns', 'lab.triggers.timeout_s',
];

/** Пороги теста срабатывания: { values, source }. Ключа нет — исключение загрузчика, а не запасное число. */
export function loadThresholds(path) {
  const T = loadAll(path);
  return {
    values: Object.fromEntries(TRIGGER_KEYS.map((k) => [k, T.value(k)])),
    source: Object.fromEntries(TRIGGER_KEYS.map((k) => [k, 'thresholds.json'])),
    found: true,
  };
}

/** Имена проектных скиллов: папки `.claude/skills/<имя>/` с `SKILL.md`. */
export function projectSkills(skillsDir) {
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(skillsDir, d.name, 'SKILL.md')))
    .map((d) => d.name)
    .sort();
}

const asText = (p) => (typeof p === 'string' ? p : p?.text);

/** Проверяет и нормализует файл фраз скилла. Ошибки — строками, чтобы показать все сразу. */
export function parseSkillFile(data, file) {
  const errors = [];
  const name = basename(file, '.json');
  const skill = data.skill ?? name;
  if (data.skill && data.skill !== name && !name.startsWith('_')) errors.push(`${file}: поле skill «${data.skill}» не совпадает с именем файла`);
  for (const key of ['positive', 'negative']) {
    if (!Array.isArray(data[key])) errors.push(`${file}: нет массива «${key}»`);
  }
  const items = [];
  for (const p of data.positive ?? []) {
    const text = asText(p);
    if (!text) errors.push(`${file}: пустая фраза в positive`);
    else items.push({ text, expect: skill, kind: 'positive', owner: skill, file });
  }
  for (const p of data.negative ?? []) {
    const text = asText(p);
    if (!text) {
      errors.push(`${file}: пустая фраза в negative`);
      continue;
    }
    // Отрицательная фраза без адреса проверяет только «не этот скилл»; с адресом — ещё и куда она должна уйти.
    const to = typeof p === 'object' ? p.expect : undefined;
    items.push({ text, expect: to ?? `!${skill}`, kind: 'negative', owner: skill, file });
  }
  const neighbors = new Set(data.neighbors ?? []);
  for (const p of data.negative ?? []) if (typeof p === 'object' && p.expect && p.expect !== NONE) neighbors.add(p.expect);
  neighbors.delete(skill);
  return { skill, neighbors: [...neighbors], items, errors };
}

/** `_routing.json`: `{ "фраза": "скилл" | "none" }`; ключи на `_` и `$` — служебные. */
export function parseRouting(data, file) {
  const errors = [];
  const items = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { items, errors: [`${file}: ожидается объект «фраза → скилл»`] };
  for (const [text, expect] of Object.entries(data)) {
    if (text.startsWith('_') || text.startsWith('$')) continue;
    if (typeof expect !== 'string' || !expect) errors.push(`${file}: у фразы «${text}» нет ожидаемого скилла`);
    else items.push({ text, expect, kind: 'routing', owner: expect === NONE ? null : expect, file });
  }
  return { items, errors };
}

/** Все наборы из папки: файлы на `_` — не скиллы (шаблон, пример, маршруты, окружение). */
export function loadPhraseDir(dir) {
  const skills = [];
  const errors = [];
  let routing = [];
  if (!existsSync(dir)) return { skills, routing, errors };
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const path = join(dir, f);
    let data;
    try {
      data = JSON.parse(readFileSync(path, 'utf8'));
    } catch (e) {
      errors.push(`${f}: не JSON (${e.message})`);
      continue;
    }
    if (f === '_routing.json') {
      const r = parseRouting(data, f);
      routing = r.items;
      errors.push(...r.errors);
    } else if (!f.startsWith('_')) {
      const s = parseSkillFile(data, f);
      skills.push(s);
      errors.push(...s.errors);
    }
  }
  return { skills, routing, errors };
}

/** Какие скиллы ожидает фраза (или запрещает): нужен, чтобы понять, существует ли адресат. */
export function expectedSkill(expect) {
  if (expect === NONE) return null;
  return expect.startsWith('!') ? expect.slice(1) : expect;
}

/**
 * Собирает план прогона. Фразы скиллов, которых ещё нет в `.claude/skills/`, пропускаются с пометкой:
 * так файлы фраз можно класть заранее, а прогон на пустом наборе ничего не тратит.
 * `focus` — `--skill`: сам скилл, его соседи (в обе стороны) и маршруты к ним.
 */
export function buildPlan({ skills, routing }, { present, focus, explicit = false }) {
  const has = (s) => explicit || present.includes(s);
  let group = null;
  if (focus) {
    group = new Set([focus]);
    const own = skills.find((s) => s.skill === focus);
    for (const n of own?.neighbors ?? []) group.add(n);
    for (const s of skills) if (s.neighbors.includes(focus)) group.add(s.skill);
  }
  const items = [];
  const skipped = [];
  const take = (item, reason) => (reason ? skipped.push({ ...item, reason }) : items.push(item));
  for (const s of skills) {
    if (group && !group.has(s.skill)) continue;
    for (const item of s.items) {
      // У соседа берём только положительные: они проверяют, что фокусный скилл не перехватывает чужое.
      if (group && s.skill !== focus && item.kind !== 'positive') continue;
      const target = expectedSkill(item.expect);
      if (!has(s.skill)) take(item, `скилла ${s.skill} нет в .claude/skills`);
      else if (item.kind === 'negative' && target !== s.skill && target && !has(target)) take(item, `скилла ${target} нет в .claude/skills`);
      else take(item);
    }
  }
  for (const item of routing) {
    if (group && !(item.owner && group.has(item.owner))) continue;
    if (item.owner && !has(item.owner)) take(item, `скилла ${item.owner} нет в .claude/skills`);
    // Без единого скилла «ничего не вызвано» — тавтология, гонять её незачем.
    else if (!item.owner && !present.length && !explicit) take(item, 'проектных скиллов нет');
    else take(item);
  }
  // Одна фраза может прийти из двух файлов: гоняем один раз, ожидания проверяем все.
  const byText = new Map();
  for (const item of items) {
    const prev = byText.get(item.text);
    if (prev) prev.checks.push(item);
    else byText.set(item.text, { text: item.text, checks: [item] });
  }
  return { phrases: [...byText.values()], skipped, group: group ? [...group] : null };
}

const SKILL_MD = /(?:^|[/\\])skills[/\\]([^/\\\s'"]+)[/\\]SKILL\.md\b/;

/**
 * Разбор потока stream-json одного прогона (claude-code-format.md §4.2).
 * Срабатывание — первый `tool_use` `Skill` в событии без `parent_tool_use_id`; события агентов не считаются.
 * Чтение `SKILL.md` через Read или Bash — «обход»: Claude Code сам называет его запрещённым, попаданием не считаем.
 */
export function createStreamParser() {
  const state = { init: null, skill: null, bypass: [], tools: [], result: null, events: 0 };
  function push(ev) {
    state.events++;
    if (ev.type === 'system' && ev.subtype === 'init') {
      state.init = { skills: ev.skills ?? [], plugins: ev.plugins ?? [], mcp_servers: ev.mcp_servers ?? [], model: ev.model, version: ev.claude_code_version };
      return;
    }
    if (ev.type === 'result') {
      state.result = { subtype: ev.subtype, is_error: !!ev.is_error, num_turns: ev.num_turns, cost: ev.total_cost_usd };
      return;
    }
    if (ev.type !== 'assistant' || ev.parent_tool_use_id) return;
    for (const c of ev.message?.content ?? []) {
      if (c.type !== 'tool_use') continue;
      state.tools.push(c.name);
      if (c.name === 'Skill' && !state.skill) state.skill = String(c.input?.skill ?? c.input?.name ?? '?');
      const where = c.name === 'Read' ? c.input?.file_path : c.name === 'Bash' ? c.input?.command : null;
      const m = typeof where === 'string' && (where.match(SKILL_MD) ?? (/SKILL\.md/.test(where) ? [null, '?'] : null));
      if (m && !state.skill) state.bypass.push(m[1]);
    }
  }
  function feed(chunk) {
    // Строки потока бывают длинными и приходят кусками: дробим только по переводу строки.
    state._buf = (state._buf ?? '') + chunk;
    const lines = state._buf.split('\n');
    state._buf = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        push(JSON.parse(line));
      } catch {
        // Не JSON — предупреждение CLI посреди потока; на результат не влияет.
      }
    }
  }
  function end() {
    if (state._buf?.trim()) feed('\n');
    const { _buf, ...out } = state;
    return out;
  }
  return { feed, push, end, get skill() { return state.skill; }, get init() { return state.init; } };
}

/** Убирает префикс плагина: `plugin:skill` и `skill` — один и тот же для сравнения. */
export const bareName = (s) => (s ? String(s).replace(/^.*:/, '') : s);

/** Совпал ли исход прогона с ожиданием. `outcome` — имя вызванного скилла или null. */
export function isHit(expect, outcome) {
  const got = bareName(outcome);
  if (expect === NONE) return !got;
  if (expect.startsWith('!')) return got !== bareName(expect.slice(1));
  return got === bareName(expect);
}

/**
 * Сводка по прогонам. Для каждого скилла:
 * - hit_rate — доля прогонов, где фраза для него вызвала именно его;
 * - false_rate — доля прогонов чужих фраз (негативы, соседи, маршруты, none), где он сработал;
 * - bypass — сколько раз его SKILL.md прочитали в обход Skill.
 */
export function summarize(phrases, { present = [] } = {}) {
  const per = new Map();
  const row = (s) => {
    if (!per.has(s)) per.set(s, { skill: s, expected: 0, hits: 0, foreign: 0, false: 0, bypass: 0, missed_to: {}, false_from: [] });
    return per.get(s);
  };
  const targetOf = (c) => (c.expect === NONE || c.expect.startsWith('!') ? null : bareName(c.expect));
  // Все участники заранее: иначе скилл, впервые сработавший на десятой фразе, недосчитается чужих прогонов.
  for (const s of present) row(s);
  for (const p of phrases) {
    for (const c of p.checks) if (targetOf(c)) row(targetOf(c));
    for (const r of p.runs) if (!r.error && r.skill) row(bareName(r.skill));
  }
  let checks = 0;
  let passed = 0;
  let errors = 0;
  for (const p of phrases) {
    const ok = p.runs.filter((r) => !r.error);
    errors += p.runs.length - ok.length;
    for (const r of ok) for (const b of r.bypass) if (b !== '?') row(b).bypass++;
    for (const c of p.checks) {
      const target = targetOf(c);
      for (const r of ok) {
        checks++;
        const hit = isHit(c.expect, r.skill);
        if (hit) passed++;
        if (target) {
          const t = row(target);
          t.expected++;
          if (hit) t.hits++;
          else t.missed_to[r.skill ?? NONE] = (t.missed_to[r.skill ?? NONE] ?? 0) + 1;
        }
      }
    }
    // Ложное срабатывание считаем по фразе, а не по проверке: фраза из двух файлов — один прогон.
    const targets = new Set(p.checks.map(targetOf));
    for (const [s, t] of per) {
      if (targets.has(s)) continue;
      for (const r of ok) {
        t.foreign++;
        if (bareName(r.skill) === s) {
          t.false++;
          if (!t.false_from.includes(p.text)) t.false_from.push(p.text);
        }
      }
    }
  }
  const skills = [...per.values()]
    .map((t) => ({ ...t, hit_rate: t.expected ? t.hits / t.expected : null, false_rate: t.foreign ? t.false / t.foreign : null }))
    .sort((a, b) => a.skill.localeCompare(b.skill));
  return { skills, checks, passed, rate: checks ? passed / checks : null, errors };
}

/** Что не так с окружением: чужие скиллы в листинге, свои пропали, лишние плагины и MCP. */
export function checkEnv(init, { project, allowed }) {
  const warnings = [];
  if (!init) return ['нет события init: не удалось узнать, какие скиллы загружены'];
  const listed = new Set(init.skills.map(bareName));
  const ok = new Set([...project, ...allowed.map(bareName)]);
  const foreign = init.skills.filter((s) => !ok.has(bareName(s)));
  if (foreign.length) warnings.push(`в листинге чужие скиллы (${foreign.length}): ${foreign.join(', ')} — они могут перехватить фразы; отключи в .claude/settings.local.json или добавь в docs/lab/triggers/_env.json`);
  const missing = project.filter((s) => !listed.has(s));
  if (missing.length) warnings.push(`проектных скиллов нет в листинге: ${missing.join(', ')} (off, disable-model-invocation или битый frontmatter?)`);
  const plugins = init.plugins.filter((p) => !String(p.source ?? p.name).endsWith('@builtin'));
  if (plugins.length) warnings.push(`подключены плагины: ${plugins.map((p) => p.source ?? p.name).join(', ')}`);
  if (init.mcp_servers.length) warnings.push(`подключены MCP: ${init.mcp_servers.map((m) => m.name ?? m).join(', ')}`);
  return warnings;
}

/** Проверка порогов для кода выхода: доля попаданий не ниже `min`, ложных не больше `maxFalse`. */
export function gate(summary, { min, maxFalse }) {
  const fails = [];
  for (const s of summary.skills) {
    if (s.hit_rate !== null && s.hit_rate < min) fails.push(`${s.skill}: попаданий ${pct(s.hit_rate)} < ${pct(min)}`);
    if (s.false_rate !== null && s.false_rate > maxFalse) fails.push(`${s.skill}: ложных ${pct(s.false_rate)} > ${pct(maxFalse)}`);
  }
  return fails;
}

export const pct = (x) => (x === null || x === undefined ? '—' : `${Math.round(x * 100)}%`);
