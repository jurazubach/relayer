// Образцы стиля прямо перед письмом: положение ST-NN, образцы SG-NN и антиобразцы AS-NN из docs/style.md по теме
// или по положению. Модель пишет лучше по образцу, чем по правилу, а антиобразец рядом показывает, куда
// не съезжать (docs/style.md §14.3 — тот же разбор блоков, что у style-diff в story-voice).
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { thresholds } from '../../../../scripts/lib/thresholds.mjs';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const TOPICS = {
  format: { title: 'формат и ритм', sg: '12.1', as: '13.1' },
  voice: { title: 'голос и различие персонажей', sg: '12.2', as: '13.2' },
  buttons: { title: 'кнопки', sg: '12.3', as: '13.3' },
  ask: { title: 'как герой переспрашивает', sg: '12.4', as: '13.4' },
  pauses: { title: 'паузы, время мира, напоминания', sg: '12.5', as: '13.5' },
  humor: { title: 'юмор и напряжение', sg: '12.6', as: '13.6' },
  loss: { title: 'ошибка, потеря, финал', sg: '12.7', as: '13.6' },
};
const HELP = `node \${CLAUDE_SKILL_DIR}/scripts/style-sample.mjs [--topic <тема> | --st ST-NN] [--all] [--author <имя>] [--json]

Образцы стиля перед письмом главы (скилл chapter-write; docs/style.md §12–13):
  --topic <тема>  образцы SG и антиобразцы AS раздела: ${Object.entries(TOPICS).map(([k, v]) => `${k} (${v.title})`).join(', ')}
  --st ST-NN      текст положения и все образцы и антиобразцы, которые на него ссылаются
  --all           все образцы темы, а не skill.chapter.style_samples первых
  --author <имя>  сначала docs/authors/<имя>/style.md, если есть (стиль автора поверх общего)
  --json          всё данными
  --help          эта справка
Без флагов — список тем с числом образцов.`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

/** Разделы §12–13: образцы до пустой строки, антиобразцы до «// так:» включительно. */
export function samples(text) {
  const out = [];
  const sections = text.split(/^### /m).slice(1);
  for (const sec of sections) {
    const num = sec.match(/^(\d+\.\d+)\./)?.[1];
    if (!num || !/^1[23]\./.test(num)) continue;
    for (const block of sec.matchAll(/```ink\n([\s\S]*?)```/g)) {
      const lines = block[1].split('\n');
      for (let i = 0; i < lines.length; i++) {
        const head = lines[i].match(/^\/\/ (SG|AS)-(\d+) · (.*)$/);
        if (!head) continue;
        const body = [];
        let j = i + 1;
        for (; j < lines.length; j++) {
          if (head[1] === 'SG' && (!lines[j].trim() || /^\/\/ (SG|AS)-/.test(lines[j]))) break;
          if (head[1] === 'AS' && /^\/\/ (SG|AS)-/.test(lines[j])) break;
          body.push(lines[j]);
          if (head[1] === 'AS' && /^\/\/ так:/.test(lines[j])) { j++; break; }
        }
        const id = `${head[1]}-${head[2]}`;
        out.push({ id, kind: head[1], section: num, about: head[3], st: [...head[3].matchAll(/ST-\d+/g)].map((m) => m[0]), text: [lines[i], ...body].join('\n').trim() });
        i = j - 1;
      }
    }
  }
  return out;
}

export function stText(text, id) {
  const m = text.match(new RegExp(`^\\*\\*${id}\\.[\\s\\S]*?(?=\\n\\n\\*\\*ST-|\\n\\n---|\\n\\n##)`, 'm'));
  return m ? m[0].trim() : null;
}

function main() {
  const style = readFileSync(new URL('../../../../docs/style.md', import.meta.url), 'utf8');
  const all = samples(style);
  const K = thresholds().value('skill.chapter.style_samples');
  const res = { author: null, topic: null, st: null, samples: [] };
  const author = opt('--author');
  if (author) {
    const f = `${ROOT}docs/authors/${author}/style.md`;
    res.author = existsSync(f) ? readFileSync(f, 'utf8') : `нет данных: docs/authors/${author}/style.md нет — действует общий docs/style.md`;
  }
  if (opt('--st')) {
    const id = opt('--st').toUpperCase();
    res.st = { id, text: stText(style, id) ?? `нет положения ${id} в docs/style.md` };
    res.samples = all.filter((s) => s.st.includes(id));
  } else if (opt('--topic')) {
    const t = TOPICS[opt('--topic')];
    if (!t) throw new Error(`тема «${opt('--topic')}» неизвестна: ${Object.keys(TOPICS).join(', ')}`);
    res.topic = { name: opt('--topic'), ...t };
    const sg = all.filter((s) => s.kind === 'SG' && s.section === t.sg);
    const as = all.filter((s) => s.kind === 'AS' && s.section === t.as);
    res.samples = args.includes('--all') ? [...sg, ...as] : [...sg.slice(0, K), ...as.slice(0, K)];
    res.more = { sg: sg.length, as: as.length };
  }
  if (args.includes('--json')) { console.log(JSON.stringify(args.includes('--topic') || args.includes('--st') ? res : { topics: TOPICS, samples: all.map(({ text, ...s }) => s) }, null, 2)); return; }
  const L = [];
  if (res.author) L.push('# стиль автора', res.author, '');
  if (!res.topic && !res.st) {
    L.push('Темы docs/style.md §12–13 (образцы SG / антиобразцы AS):');
    for (const [k, t] of Object.entries(TOPICS)) L.push(`  ${k.padEnd(8)} ${t.title}: SG ${all.filter((s) => s.kind === 'SG' && s.section === t.sg).length}, AS ${all.filter((s) => s.kind === 'AS' && s.section === t.as).length}`);
    L.push('', 'Пример: node ${CLAUDE_SKILL_DIR}/scripts/style-sample.mjs --topic pauses');
  }
  if (res.st) L.push(res.st.text, '');
  if (res.topic) L.push(`# ${res.topic.title}: образцы §${res.topic.sg}, антиобразцы §${res.topic.as}${args.includes('--all') ? '' : ` (по ${K}; все — --all: SG ${res.more.sg}, AS ${res.more.as})`}`, '');
  for (const s of res.samples) L.push('```ink', s.text, '```');
  console.log(L.join('\n'));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try { main(); } catch (e) { console.error(`style-sample: ${e.message}`); process.exit(1); }
}
