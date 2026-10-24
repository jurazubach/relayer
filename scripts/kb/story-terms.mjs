// Словарь упоминаний наших историй: алиасы, названия, имена героев и контактов, узлы и переменные ink.
// Всё берётся из src/stories/*.json, чтобы новая или переписанная история попадала в словарь сама.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Имена контактов, которые ничего не говорят об истории: в базе они встречаются как общие слова.
const GENERIC_NAME_WORDS = new Set([
  'Вы', 'Неизвестный', 'Новый', 'номер', 'Номер', 'Заметки', 'Парковочная', 'служба', 'Сержант', 'Плюс', 'Банк',
]);

// Узлы и переменные-обычные слова. Голыми не ищем вообще, в обратных кавычках — только те, что не из этого
// списка: `ending`, `cover`, `proof` и номера глав база использует и в общих советах про ink.
const GENERIC_IDENTS = new Set([
  'function', 'ending', 'cover', 'alias', 'world', 'proof', 'night', 'hub', 'plan', 'audio', 'talk', 'gate',
  'unit', 'deal', 'lied', 'warned', 'moves', 'snapshot', 'skill',
  // id контактов-ролей
  'unknown', 'ghost', 'fake', 'notes', 'lead', 'sec', 'intern', 'manager', 'partner', 'watcher', 'storage',
  'dental', 'carrier', 'parking', 'phone', 'bank',
]);
const GENERIC_IDENT_RE = /^(?:ch|c)\d+$/;

// Формы, которые совпадают с обычными словами («Бета» — не родительный от «Бет»).
const BAD_FORMS = new Set(['Бета', 'Бете', 'Бету', 'Бетом']);
// Строчными имена пишут сами герои («там лили работала», «я ходила к оуэну»). Короткие имена
// и эти строчными не ищем: «том», «кай», «марш», «вела» — обычные слова.
const LOWER_MIN = 4;
const LOWER_BAD = new Set(['марш', 'марша', 'маршу', 'маршем', 'марше', 'маршом', 'вела', 'велы', 'веле', 'велу', 'велой', 'вели']);

// Названия из текста сценария, которых нет ни в героях, ни в контактах, но база их упоминает.
const EXTRA = {
  'slepoe-pyatno': ['Лунный экспресс', 'Лунного экспресса', 'Лунном экспрессе'],
  // Лилиан и Слоун — имена из #rename: и реплик, в characters их нет.
  'chuzhoy-golos': ['Денни', ...nameForms('Дэн'), '£12', ...nameForms('Лилиан'), 'Lily', 'Kind regards, J', 'Синяя калитка'],
  'the-number': nameForms('Слоун'),
};

const LETTER = '\\p{L}\\p{N}_';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Падежные формы имени: в разборах пишут «у Дины», «с Рэем», «Коннору». */
export function nameForms(name) {
  let forms;
  if (/а$/.test(name)) forms = ['а', 'ы', 'и', 'е', 'у', 'ой', 'ою'].map((x) => name.slice(0, -1) + x);
  else if (/я$/.test(name)) forms = ['я', 'и', 'е', 'ю', 'ей', 'ею'].map((x) => name.slice(0, -1) + x);
  else if (/й$/.test(name)) forms = ['й', 'я', 'ю', 'ем', 'е'].map((x) => name.slice(0, -1) + x);
  else if (/[бвгджзклмнпрстфхцчшщ]$/.test(name)) forms = ['', 'а', 'у', 'ом', 'е'].map((x) => name + x);
  else forms = [name];
  return forms.filter((f) => !BAD_FORMS.has(f));
}

/**
 * Название из двух слов в любом падеже: «Чужой голос» → «Чужого голоса», «Слепом пятне».
 * С заглавной: строчное «писать чужим голосом» в базе — общий приём, а не наша история.
 */
function titlePattern(title) {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.some((w) => !/^\p{L}+$/u.test(w)) || !/[а-яё]/i.test(title)) return esc(title);
  return words
    .map((w, i) => {
      const stem = w.length > 4 ? w.replace(/[аеёиоуыэюяй]+$/i, '') : w;
      return esc(stem) + '\\p{L}{0,3}';
    })
    .join('\\s+');
}

function inkIdents(ink) {
  const ids = new Set();
  for (const m of ink.matchAll(/^\s*={1,3}\s*(?:function\s+)?(\w+)/gm)) ids.add(m[1]);
  for (const m of ink.matchAll(/^\s*(?:VAR|CONST|LIST)\s+(\w+)/gm)) ids.add(m[1]);
  return ids;
}

export function loadStories(dir = 'src/stories') {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
    .map((s) => ({
      id: s.id,
      title: s.title,
      series: s.series,
      label: s.series ? `${s.series} · ${s.title}` : s.title,
      characters: s.characters ?? [],
      ink: s.ink ?? '',
    }));
}

/**
 * Собирает словарь и функцию поиска. find(text) → [{ term, stories: [id] }];
 * resolve(hits, context) выбирает истории, к которым относится текст: узлы вроде `ch1_hub` есть в двух.
 */
export function buildMatcher(stories) {
  const bare = new Map(); // литерал → Set(id), ищется как отдельное слово
  const ticked = new Map(); // литерал → Set(id), только в `обратных кавычках` или #to:/#from:
  const patterns = []; // { re, id }
  const add = (map, lit, id) => {
    if (!lit) return;
    if (!map.has(lit)) map.set(lit, new Set());
    map.get(lit).add(id);
  };

  for (const s of stories) {
    add(bare, s.id, s.id);
    for (const t of [s.title, s.series].filter(Boolean)) {
      if (/^[\p{Lu}\d\s:]+$/u.test(t) && !/^\d/.test(t)) add(bare, t, s.id);
      patterns.push({ re: titlePattern(t), id: s.id });
    }
    if (s.series && s.title) add(bare, `${s.series} · ${s.title}`, s.id);

    const people = new Set(s.characters.map((c) => c.name));
    const contacts = [...s.ink.matchAll(/^\s*#\s*contact:\s*([^,\n]+),\s*([^,\n]+)/gm)].map((m) => ({
      id: m[1].trim(),
      name: m[2].trim(),
    }));
    for (const c of s.characters) if (c.id) contacts.push({ id: c.id, name: c.name });
    for (const c of contacts) {
      const name = c.name.replace(/\s*\(.*?\)\s*/g, ' ').trim();
      const words = name.split(/\s+/);
      const proper = words.filter((w) => !GENERIC_NAME_WORDS.has(w) && /^\p{Lu}/u.test(w));
      // Герои: каждое имя отдельно («Джудит», «Марш»). Сервисы: только целиком («Дентал Плюс»).
      if (words.length > 1 && !people.has(c.name) && proper.length === words.length) add(bare, name, s.id);
      else
        for (const w of proper)
          for (const f of nameForms(w)) {
            add(bare, f, s.id);
            const low = f.toLowerCase();
            if (w.length >= LOWER_MIN && !LOWER_BAD.has(low)) add(bare, low, s.id);
          }
      if (!GENERIC_IDENTS.has(c.id)) add(ticked, c.id, s.id);
    }

    for (const id of inkIdents(s.ink)) {
      if (GENERIC_IDENTS.has(id) || GENERIC_IDENT_RE.test(id)) continue;
      add(/[_\d]/.test(id) ? bare : ticked, id, s.id);
    }
    for (const x of EXTRA[s.id] ?? []) add(bare, x, s.id);
  }

  const alt = (map) => [...map.keys()].sort((a, b) => b.length - a.length).map(esc).join('|');
  const parts = [
    `(?<![${LETTER}-])(?<b>${alt(bare)})(?![${LETTER}])`,
    `\`(?<t>${alt(ticked)})\``,
    `(?<=#(?:to|from):)(?<t2>${alt(ticked)})(?![${LETTER}])`,
    ...patterns.map((p, i) => `(?<![${LETTER}])(?<p${i}>${p.re})(?![${LETTER}])`),
  ];
  const re = new RegExp(parts.join('|'), 'gu');
  // В коде ink обратных кавычек вокруг имени нет: `-> theo_goes`, `// role jess: …` пишут как есть.
  const codeRe = new RegExp([...parts, `(?<![${LETTER}-])(?<t3>${alt(ticked)})(?![${LETTER}])`].join('|'), 'gu');

  function find(text, { code = false } = {}) {
    if (!code) {
      const spans = [...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
      const prose = text.replace(/`[^`\n]+`/g, ' ');
      return [...scan(prose, re), ...spans.flatMap((x) => scan(x, codeRe))];
    }
    return scan(text, codeRe);
  }

  function scan(text, rx) {
    const hits = [];
    for (const m of text.matchAll(rx)) {
      const g = m.groups;
      const t = g.t || g.t2 || g.t3;
      if (g.b) hits.push({ term: g.b, stories: [...bare.get(g.b)] });
      else if (t) hits.push({ term: t, stories: [...ticked.get(t)] });
      else {
        const i = patterns.findIndex((_, k) => g[`p${k}`]);
        hits.push({ term: g[`p${i}`], stories: [patterns[i].id] });
      }
    }
    return hits;
  }

  function resolve(hits, context = []) {
    const unique = new Set(hits.filter((h) => h.stories.length === 1).map((h) => h.stories[0]));
    if (unique.size) return [...unique].sort();
    const any = new Set(hits.flatMap((h) => h.stories));
    const ctx = context.filter((id) => any.has(id));
    return (ctx.length ? ctx : [...any]).sort();
  }

  return { find, resolve, has: (text, opts) => find(text, opts).length > 0, size: bare.size + ticked.size + patterns.length };
}
