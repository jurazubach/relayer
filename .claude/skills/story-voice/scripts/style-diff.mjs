// Глава против docs/style.md: форма реплик, кнопок и системных строк главы рядом с теми же метриками образцов SG-NN,
// плюс попадания в словари стиля §14.5 и нарушения порогов style.* — каждое с положением ST-NN и антиобразцом AS-NN
// того же положения. Образцы, антиобразцы и словари читаются из style.md по правилам §14.3, поэтому новый образец
// или словарь в style.md скрипт подхватывает сам. Сообщает отклонения, а не оценку «хорошо / плохо».
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { walk } from '../../../../scripts/lib/ink.mjs';
import { loadStory } from '../../../../scripts/lib/story.mjs';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';
import { analyze } from '../../../../scripts/lint/core.mjs';
import { plural } from '../../../../scripts/lint/text.mjs';

const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/style-diff.mjs --story <id|путь> [--chapter N] [--samples] [--all] [--json]

Глава против образцов docs/style.md (скилл story-voice, author-style.md, style.md §14.2–§14.5):
  форма      реплики #from: медиана знаков, доля длиннее C-34.long_chars и style.line_words, «!», «…», эмодзи;
             кнопки: слов, с заглавной, точка в конце; #sys: слов. Рядом — те же числа по образцам SG-NN
  словари    канцелярит, игровые слова, ярлык финала, громкость, драма прилагательными (style.md §14.5)
  пороги     style.emoji_per_line, style.ellipsis_per_queue, style.sys_words, style.line_words, C-34.long_chars;
             тире «—» в реплике, точка и эмодзи в кнопке, эмоции в заметке (ST-05, ST-06, ST-32, ST-72)
  каждая находка — с ST-NN и антиобразцом AS-NN того же положения; это кандидат, решает модель

  --story     история по id, файл .json / .ink или папка (одна)
  --chapter   только эта глава (по умолчанию все)
  --samples   прогнать сам style.md: сколько антиобразцов AS-NN скрипт узнаёт и что он находит в образцах SG-NN
  --all       все находки, а не первые три каждого вида
  --json      всё данными
  --help      эта справка`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const T = thresholds();
const STYLE = fileURLToPath(new URL('../../../../docs/style.md', import.meta.url));
const style = readFileSync(STYLE, 'utf8');
const version = style.match(/`(версия [^`]+)`/)?.[1] ?? 'версия не указана';

// ───────── style.md: образцы, антиобразцы, словари

const strip = (s) => s.replace(/\s#[\p{L}_]+(:[^#]*)?/gu, '').replace(/^\{[^:{}]+:\s*/u, '').replace(/\}\s*$/u, '').trim();
function parseLine(raw, who) {
  const line = raw.trim();
  if (!line || /^#delay/.test(line) || /^-\s*$/.test(line) || /^->/.test(line)) return null;
  const btn = line.match(/^[*+]+\s*(?:\{[^}]*\}\s*)?\[([^\]]*)\]/u);
  if (btn) return { kind: 'button', text: strip(btn[1]), silent: /#silent/.test(btn[1]), label: /#label/.test(btn[1]) };
  const from = line.match(/#from:([\w-]+)/)?.[1];
  const body = strip(line.replace(/^-\s+/, ''));
  if (!body) return null;
  if (/#sys/.test(line)) return { kind: 'sys', text: body };
  if (/#to:notes/.test(line)) return { kind: 'note', text: body };
  if (/#photo/.test(line)) return { kind: 'photo', text: body, who: from ?? who };
  return { kind: 'from', text: body, who: from ?? who };
}

function parseSamples(text) {
  const out = [];
  for (const block of text.matchAll(/```ink\n([\s\S]*?)```/g)) {
    let cur = null;
    let who = null;
    for (const raw of block[1].split('\n')) {
      const head = raw.match(/^\/\/ (SG|AS)-(\d+) · ([^·]+)·\s*(.*)$/);
      if (head) {
        cur = { id: `${head[1]}-${head[2]}`, kind: head[1], st: head[3].match(/ST-\d+/g) ?? [], check: head[4].match(/^(C-\d+|R-\d+)/)?.[1] ?? null, about: head[4].replace(/^(C-\d+|R-\d+) · /, '').trim(), lines: [] };
        out.push(cur);
        who = null;
        continue;
      }
      if (!cur || /^\/\/ так:/.test(raw)) { if (cur?.kind === 'AS') cur = null; continue; }
      if (!raw.trim()) { if (cur.kind === 'SG') cur = null; continue; }
      if (/^\s*\/\//.test(raw)) continue;
      const l = parseLine(raw, who);
      if (l) { if (l.who) who = l.who; cur.lines.push(l); }
    }
  }
  return out;
}

function parseDicts(text) {
  const sec = text.split(/^### 14\.5\./m)[1]?.split(/^## /m)[0] ?? '';
  const out = [];
  for (const m of sec.matchAll(/^- \*\*([^*]+)\*\* \(([^)]+)\): `([^`]+)`(.*)$/gm)) {
    const caseSensitive = /\[А-Я/.test(m[3]);
    out.push({ name: m[1].trim(), st: m[2].match(/ST-\d+/g) ?? [], re: new RegExp(m[3], caseSensitive ? 'u' : 'iu'), only: /в строке `#from`/.test(m[4]) ? 'from' : null });
  }
  return out;
}

const samples = parseSamples(style);
const dicts = parseDicts(style);
const asBySt = new Map();
for (const s of samples.filter((x) => x.kind === 'AS')) for (const st of s.st) asBySt.set(st, [...(asBySt.get(st) ?? []), s.id]);

// ───────── метрики и находки по строкам

const EMOJI = /\p{Extended_Pictographic}/gu;
const HAS_EMOJI = /\p{Extended_Pictographic}/u;
const words = (t) => t.split(/\s+/).filter(Boolean).length;
const median = (xs) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) / 2)] : 0; };
const share = (xs, f) => (xs.length ? Math.round((xs.filter(f).length / xs.length) * 100) : 0);

function metrics(lines) {
  const from = lines.filter((l) => l.kind === 'from').map((l) => l.text);
  const btn = lines.filter((l) => l.kind === 'button' && !l.silent).map((l) => l.text);
  const sys = lines.filter((l) => l.kind === 'sys').map((l) => l.text);
  return {
    from: from.length,
    median_chars: median(from.map((t) => t.length)),
    long_chars: share(from, (t) => t.length > T.value('C-34.long_chars')),
    long_words: share(from, (t) => words(t) > T.value('style.line_words')),
    excl: share(from, (t) => t.includes('!')),
    ellipsis: share(from, (t) => /…|\.\.\./.test(t)),
    emoji: share(from, (t) => HAS_EMOJI.test(t)),
    buttons: btn.length,
    button_words: median(btn.map(words)),
    button_capital: share(btn, (t) => /^\P{Ll}/u.test(t)),
    button_period: share(btn, (t) => /[^.]\.$/.test(t)),
    sys: sys.length,
    sys_words: median(sys.map(words)),
  };
}

/** Находки по строкам; queue — подряд идущие реплики одного контакта (для многоточий на очередь). */
function findings(lines) {
  const out = [];
  const add = (st, what, l) => out.push({ st, what, text: l.text, node: l.node ?? null, as: (asBySt.get(st) ?? []).slice(0, 2) });
  let queue = [];
  const flushQueue = () => {
    const n = queue.reduce((s, l) => s + (l.text.match(/…|\.\.\./g) ?? []).length, 0);
    if (n > T.value('style.ellipsis_per_queue')) add('ST-05', `многоточий в очереди ${n} > style.ellipsis_per_queue`, queue[0]);
    queue = [];
  };
  for (const l of lines) {
    if (l.kind !== 'from' || (queue.length && queue[0].who !== l.who)) flushQueue();
    for (const d of dicts) if ((!d.only || l.kind === d.only) && ['from', 'button', 'sys', 'note', 'photo'].includes(l.kind) && d.re.test(l.text)) add(d.st[0], `словарь «${d.name}»`, l);
    if (l.kind === 'from') {
      queue.push(l);
      if (l.text.length > T.value('C-34.long_chars')) add('ST-01', `${l.text.length} знаков > C-34.long_chars`, l);
      else if (words(l.text) > T.value('style.line_words')) add('ST-01', `${words(l.text)} слов > style.line_words`, l);
      const e = (l.text.match(EMOJI) ?? []).length;
      if (e > T.value('style.emoji_per_line')) add('ST-06', `эмодзи ${e} > style.emoji_per_line`, l);
      if (/ — /.test(l.text)) add('ST-05', 'длинное тире в реплике: в мессенджере его не набирают', l);
    }
    if (l.kind === 'button' && !l.silent) {
      if (/[^.]\.$/.test(l.text)) add('ST-32', 'точка в конце кнопки', l);
      if (HAS_EMOJI.test(l.text)) add('ST-32', 'эмодзи в кнопке', l);
      if (/^\p{Ll}/u.test(l.text)) add('ST-32', 'кнопка со строчной', l);
    }
    if (l.kind === 'sys' && !/^Глава|^Эпизод/u.test(l.text)) {
      if (words(l.text) > T.value('style.sys_words')) add('ST-70', `#sys ${words(l.text)} слов > style.sys_words`, l);
      else if (/[?!]|(^|[^\p{L}])(я|ты)([^\p{L}]|$)/iu.test(l.text)) add('ST-70', '#sys с «я / ты / ? / !»', l);
    }
    if (l.kind === 'note' && (/!/.test(l.text) || (HAS_EMOJI.test(l.text)))) add('ST-72', 'эмоции в заметке («!» или эмодзи)', l);
  }
  flushQueue();
  return out;
}

const sampleLines = samples.filter((s) => s.kind === 'SG').flatMap((s) => s.lines.map((l) => ({ ...l, node: s.id })));
const base = metrics(sampleLines);

if (args.includes('--samples')) {
  const as = samples.filter((s) => s.kind === 'AS').map((s) => ({ id: s.id, st: s.st, check: s.check, about: s.about, found: findings(s.lines.map((l) => ({ ...l, node: s.id }))) }));
  const sg = findings(sampleLines);
  if (args.includes('--json')) { console.log(JSON.stringify({ version, samples: samples.length, dicts: dicts.map((d) => d.name), as, sg, base }, null, 1)); process.exit(0); }
  const seen = as.filter((a) => a.found.length);
  console.log(`docs/style.md · ${version} · образцов SG ${samples.filter((s) => s.kind === 'SG').length}, антиобразцов AS ${as.length}, словарей ${dicts.length}`);
  console.log(`   скрипт узнаёт ${seen.length} антиобразцов из ${as.length}: ${seen.map((a) => a.id).join(', ')}`);
  console.log(`   остальные — дело проверок story:lint (по полю проверки) или модели: ${as.filter((a) => !a.found.length).map((a) => `${a.id}${a.check ? ` (${a.check})` : ''}`).join(', ')}`);
  console.log(`   в образцах SG находок: ${sg.length}${sg.length ? ` — ${sg.map((f) => `${f.node} ${f.what}`).join('; ')}` : ''}`);
  process.exit(0);
}

// ───────── история

const ref = opt('--story');
if (!ref) { console.error('нужна --story <id> (или --samples)'); process.exit(2); }
const story = loadStory(ref);
const ctx = analyze(story, T, { runs: 1 });
const chapters = new Map();
for (const k of ctx.tree.knots) {
  const ch = ctx.st.chapterOf(k.id) ?? 1;
  if (opt('--chapter') && Number(opt('--chapter')) !== ch) continue;
  if (!chapters.has(ch)) chapters.set(ch, []);
  const list = chapters.get(ch);
  walk(k.items, (it) => {
    const text = (it.text ?? '').replace(/\{[^{}]*\}/g, '').trim();
    if (!text) return;
    if (it.type === 'choice') list.push({ kind: 'button', text, silent: 'silent' in it.tags, node: k.id });
    else if (it.type === 'sys') list.push({ kind: 'sys', text, node: k.id });
    else if (it.type === 'msg' && it.tags?.to === 'notes') list.push({ kind: 'note', text, node: k.id });
    else if (it.type === 'msg' && 'photo' in it.tags) list.push({ kind: 'photo', text, who: it.who, node: k.id });
    else if (it.type === 'msg' && it.who && !ctx.service.has(it.who)) list.push({ kind: 'from', text, who: it.who, node: k.id });
    else if (it.type === 'me' && it.tags?.me === 'notes') list.push({ kind: 'note', text, node: k.id });
  });
}
const rows = [...chapters].sort((a, b) => a[0] - b[0]).map(([ch, lines]) => ({ chapter: ch, metrics: metrics(lines), findings: findings(lines) }));

if (args.includes('--json')) {
  const keys = ['C-34.long_chars', 'style.line_words', 'style.emoji_per_line', 'style.ellipsis_per_queue', 'style.sys_words'];
  console.log(JSON.stringify({ story: story.id, style: version, samples: base, chapters: rows, keys: Object.fromEntries(keys.map((k) => [k, T.value(k)])) }, null, 1));
  process.exit(0);
}
const fmt = (m) => `реплик ${m.from}: медиана ${m.median_chars} зн. · длиннее C-34.long_chars ${m.long_chars}% · длиннее style.line_words ${m.long_words}% · «!» ${m.excl}% · «…» ${m.ellipsis}% · эмодзи ${m.emoji}%` +
  ` | кнопок ${m.buttons}: медиана ${m.button_words} сл. · с заглавной ${m.button_capital}% · с точкой ${m.button_period}% | #sys ${m.sys}: медиана ${m.sys_words} сл.`;
console.log(`${story.path} · против docs/style.md (${version})`);
console.log(`   образцы SG: ${fmt(base)}`);
for (const r of rows) {
  console.log(`   глава ${r.chapter}: ${fmt(r.metrics)}`);
  const groups = new Map();
  for (const f of r.findings) { const k = `${f.st} · ${f.what.replace(/\d+/g, 'N')}`; groups.set(k, [...(groups.get(k) ?? []), f]); }
  for (const [k, list] of groups) {
    const show = args.includes('--all') ? list : list.slice(0, 3);
    console.log(`      ${k.split(' · ')[0]} · ${list[0].what.replace(/^\d+ /, '')}${list.length > 1 ? ` · ${plural(list.length, 'раз', 'раза', 'раз')}` : ''}${list[0].as.length ? ` · антиобразец ${list[0].as.join(', ')}` : ''}`);
    for (const f of show) console.log(`         ${f.node}: «${f.text.length > 60 ? `${f.text.slice(0, 60)}…` : f.text}»`);
  }
}
