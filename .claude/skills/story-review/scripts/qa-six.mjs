// qa-six — кандидаты для нарративного QA «шесть списков» (narrative-testing:P-14, SYS-4; references/qa-six.md):
// хронология и факты, голос, логика, пропущенные реплики, имена, орфография. Команда собирает кандидатов и
// находки story:lint по каждому списку; решает модель, читая узлы. Пустой список — «проверено, нет».
import { runCli, table, median } from '../../../../scripts/story/core/cli.mjs';
import { walk } from '../../../../scripts/lib/ink.mjs';
import { T, prepare } from './review-core.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/qa-six.mjs --story <id> [--partial] [--list <список>] [--contact <id>] [--json]

Шесть списков нарративного QA по references/qa-six.md. Для каждого — находки story:lint этой темы (из кэша
review-cache.mjs, числа те же) и кандидаты, которые команда видит в тексте:

  chronology  хронология и факты: числа и время с якорным словом (C-49.anchor_window), один якорь — разные
              числа; находки C-49
  voice       голос: профиль каждого контакта (реплик, медиана длины, строчная первая буква, точка в конце,
              эмодзи) и реплики против большинства контакта; находки C-44, C-46
  logic       логика: кто знает то, чего ему не сообщали; находки C-51, C-50
  missing     пропущенные реплики: кнопка без ответа, молчание без следа, немой контакт; находки C-10, C-11, C-45
  names       имена: формы имени каждого героя в репликах; находки C-48
  spelling    орфография: двойной пробел, пробел перед знаком, повтор слова, латиница внутри кириллицы,
              непарные кавычки и скобки — последний проход, после правок 1–5

  --list <список>   один список целиком (без --list — сводка по шести и первые lint.examples кандидатов)
  --contact <id>    все реплики одного контакта подряд с узлами: короткая форма SYS-4 «чтение по контактам»
  --partial         набор с beta_stop (тот же вывод story:lint, что у ревью части)
  --json            данными

Кандидат — не находка: модель сверяет его с узлом ink и пишет в qa-six.md папки прогона строкой формата
или «проверено, нет».`;

const LISTS = {
  chronology: { title: 'хронология и факты', checks: ['C-49'] },
  voice: { title: 'голос', checks: ['C-44', 'C-46'] },
  logic: { title: 'логика', checks: ['C-51', 'C-50'] },
  missing: { title: 'пропущенные реплики', checks: ['C-10', 'C-11', 'C-45'] },
  names: { title: 'имена', checks: ['C-48'] },
  spelling: { title: 'орфография', checks: [] },
};

const EMOJI = /\p{Extended_Pictographic}/gu;

/** Все строки истории по порядку узлов: кто, текст, узел, глава, кнопка ли. */
function lines(tree) {
  const out = [];
  for (const k of tree.knots) {
    walk(k.items, (it) => {
      if (!it.text || it.type === 'code' || it.type === 'sys') return;
      out.push({ node: k.id, chapter: k.chapter ?? null, who: it.who ?? null, kind: it.type, text: it.text });
    });
  }
  return out;
}

function chronology(all) {
  const win = T().value('C-49.anchor_window');
  const NUM = /(\d{1,2}:\d{2}|\d+(?:[.,]\d+)?)/g;
  const facts = [];
  for (const l of all) {
    const words = l.text.split(/\s+/);
    words.forEach((w, i) => {
      for (const m of w.matchAll(NUM)) {
        const near = words.slice(Math.max(0, i - win), i + win + 1).filter((x, j) => j !== Math.min(i, win))
          .map((x) => x.toLowerCase().replace(/[^\p{L}]/gu, '')).filter((x) => x.length >= 4);
        facts.push({ value: m[1], anchors: near.map((x) => x.slice(0, 5)), node: l.node, chapter: l.chapter, text: l.text });
      }
    });
  }
  const byAnchor = new Map();
  for (const f of facts) for (const a of f.anchors) {
    if (!byAnchor.has(a)) byAnchor.set(a, []);
    byAnchor.get(a).push(f);
  }
  const clash = [];
  for (const [a, list] of byAnchor) {
    const values = new Set(list.map((f) => f.value));
    const nodes = new Set(list.map((f) => f.node));
    if (values.size > 1 && nodes.size > 1) clash.push({ anchor: a, values: [...values], places: list.map((f) => `${f.node}: «${f.text.slice(0, 60)}»`) });
  }
  return { facts, candidates: clash.map((c) => ({ what: `якорь «${c.anchor}…» с разными числами: ${c.values.join(', ')}`, places: [...new Set(c.places)] })) };
}

function voice(all) {
  const min = T().value('C-44.min_lines');
  const by = new Map();
  for (const l of all) if (l.kind === 'msg' && l.who) { if (!by.has(l.who)) by.set(l.who, []); by.get(l.who).push(l); }
  const profiles = [];
  const candidates = [];
  for (const [who, list] of by) {
    const lower = list.filter((l) => /^\p{Ll}/u.test(l.text)).length;
    const dot = list.filter((l) => /\.$/.test(l.text)).length;
    const emoji = list.reduce((s, l) => s + (l.text.match(EMOJI)?.length ?? 0), 0);
    profiles.push({ who, lines: list.length, median: median(list.map((l) => l.text.length)), lower, dot, emoji });
    if (list.length < min) continue;
    // Против большинства самого контакта: строчные у того, кто пишет с заглавной, и наоборот.
    const majorityLower = lower * 2 > list.length;
    for (const l of list) {
      const isLower = /^\p{Ll}/u.test(l.text);
      if (/^\p{L}/u.test(l.text) && isLower !== majorityLower) candidates.push({ what: `${who}: ${isLower ? 'строчная' : 'заглавная'} первая буква против большинства`, places: [`${l.node}: «${l.text.slice(0, 60)}»`] });
    }
  }
  return { profiles, candidates };
}

function names(all, story) {
  const chars = (story.meta?.characters ?? []).filter((c) => c.id && c.name && !c.service);
  const out = [];
  for (const c of chars) {
    const stem = c.name.toLowerCase().replace(/ё/g, 'е').slice(0, Math.max(3, c.name.length - 2));
    const forms = new Map();
    for (const l of all) {
      for (const w of l.text.split(/[^\p{L}-]+/u)) {
        const n = w.toLowerCase().replace(/ё/g, 'е');
        if (n.length >= 3 && n.startsWith(stem)) {
          if (!forms.has(w)) forms.set(w, new Set());
          forms.get(w).add(l.who ?? 'игрок');
        }
      }
    }
    if (forms.size) out.push({ who: c.id, name: c.name, forms: [...forms].map(([w, s]) => `${w} (${[...s].join(', ')})`) });
  }
  return { forms: out, candidates: out.filter((x) => x.forms.length > 1)
    .map((x) => ({ what: `${x.name}: ${x.forms.length} форм — падеж или разнобой?`, places: x.forms })) };
}

function spelling(all) {
  const rules = [
    [/ {2,}/, 'двойной пробел'],
    [/\s[,.!?:;](?!\.)/, 'пробел перед знаком'],
    [/(?<!\p{L})(\p{L}{2,})\s+\1(?!\p{L})/iu, 'повтор слова'],
    [/(?=\p{L}*\p{Script=Latin})(?=\p{L}*\p{Script=Cyrillic})\p{L}{2,}/u, 'латиница внутри кириллицы'],
  ];
  const out = [];
  for (const l of all) {
    for (const [re, what] of rules) if (re.test(l.text)) out.push({ what, places: [`${l.node}: «${l.text.slice(0, 70)}»`] });
    const open = (l.text.match(/«/g) ?? []).length, close = (l.text.match(/»/g) ?? []).length;
    const po = (l.text.match(/\(/g) ?? []).length, pc = (l.text.match(/\)/g) ?? []).length;
    // «)» без «(» — обычный смайлик, поэтому скобки — только «(» без пары
    if (open !== close || po > pc) out.push({ what: 'непарные кавычки или скобки', places: [`${l.node}: «${l.text.slice(0, 70)}»`] });
  }
  return { candidates: out };
}

await runCli(HELP, async (args) => {
  const ctx = prepare(args);
  const all = lines(ctx.tree);
  const contact = args.get('contact');
  if (contact && contact !== true) {
    const mine = all.filter((l) => l.who === contact && l.kind === 'msg');
    if (!mine.length) throw new Error(`у контакта ${contact} нет реплик (контакты: ${Object.keys(ctx.tree.contacts).join(', ')})`);
    if (args.has('json')) { console.log(JSON.stringify(mine, null, 1)); return 0; }
    console.log(`${contact} · реплик ${mine.length} · по порядку узлов (голос, имена и логика одного контакта подряд — SYS-4)\n`);
    for (const l of mine) console.log(`${l.node.padEnd(22)} ${l.text}`);
    return 0;
  }
  const lint = ctx.lint.findings;
  const res = {
    chronology: chronology(all),
    voice: voice(all),
    logic: { candidates: [] },
    missing: { candidates: [] },
    names: names(all, ctx.story),
    spelling: spelling(all),
  };
  const lists = Object.entries(LISTS).map(([id, l]) => {
    const found = lint.filter((f) => l.checks.includes(f.check));
    return { id, title: l.title, checks: l.checks, lint: found, candidates: res[id].candidates ?? [], extra: res[id] };
  });
  const only = args.get('list');
  if (only && only !== true && !LISTS[only]) throw new Error(`нет такого списка: ${only} (${Object.keys(LISTS).join(', ')})`);
  const shown = only && only !== true ? lists.filter((l) => l.id === only) : lists;
  if (args.has('json')) {
    console.log(JSON.stringify({ story: ctx.id, mode: ctx.mode, lists: shown.map(({ extra, ...l }) => ({ ...l, ...(l.id === 'voice' ? { profiles: extra.profiles } : {}), ...(l.id === 'names' ? { forms: extra.forms } : {}) })) }, null, 1));
    return 0;
  }
  const ex = only && only !== true ? Infinity : T().value('lint.examples');
  console.log(`QA «шесть списков» · ${ctx.id} · режим ${ctx.mode} — кандидаты; решает модель по узлам (references/qa-six.md)\n`);
  console.log(table(lists.map((l) => [l.title, l.checks.join(', ') || '—', l.lint.length, l.candidates.length]), ['список', 'проверки', 'story:lint', 'кандидатов']));
  for (const l of shown) {
    console.log(`\n## ${l.title}`);
    if (!l.lint.length && !l.candidates.length) { console.log('  кандидатов нет — модель дочитывает по узлам и пишет «проверено, нет», если не нашла'); continue; }
    for (const f of l.lint.slice(0, ex)) console.log(`  ${f.check} · ${f.node ?? '—'} · ${f.message}`);
    if (l.lint.length > ex) console.log(`  … ещё ${l.lint.length - ex} строк story:lint (--list ${l.id})`);
    for (const c of l.candidates.slice(0, ex)) console.log(`  кандидат · ${c.what} · ${c.places.slice(0, 3).join(' | ')}`);
    if (l.candidates.length > ex) console.log(`  … ещё ${l.candidates.length - ex} кандидатов (--list ${l.id})`);
    if (l.id === 'voice' && (only === 'voice')) {
      console.log('\n' + table(l.extra.profiles.map((p) => [p.who, p.lines, p.median, p.lower, p.dot, p.emoji]), ['контакт', 'реплик', 'медиана знаков', 'со строчной', 'с точкой', 'эмодзи']));
    }
  }
  return 0;
});
