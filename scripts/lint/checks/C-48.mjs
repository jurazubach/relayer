// C-48. Имена: разные формы одного имени, слово с заглавной, которого нет ни среди контактов, ни в белом
// списке карточки (заодно страховка «всё вымышлено»), #rename без прозвучавшего имени.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { walk } from '../../lib/ink.mjs';
import { heroNames, short } from '../text.mjs';

// заглавная посреди фразы: перед пробелом буква, цифра или запятая
const CAP = /(?<=[\p{L}\p{N},;]\s)(\p{Lu}\p{Ll}{2,})/gu;

/** Основа слова без падежного окончания и конечных «й», «ь»: «Дине» и «Дина» → «дин», «Рэю» и «Рэй» → «рэ». */
export function nameStem(word, T) {
  const low = word.toLowerCase().replace(/ё/g, 'е');
  const s = low.replace(T.re('dict.case_endings'), '').replace(/[йь]$/u, '');
  return s.length >= 2 ? s : low;
}

export default {
  id: 'C-48',
  title: 'Имена',
  plan: false,
  partial: true,
  model: true,
  run(ctx, find) {
    const { st, T, tree, meta, story } = ctx;
    const names = heroNames(ctx);
    // белый список: имена собственные карточки, глав и facts.md
    const facts = join('docs/stories', story.id ?? '', 'facts.md');
    const card = [meta.title, meta.series, meta.tagline, meta.synopsis, ...(meta.features ?? []), ...(meta.chapters ?? []).flatMap((c) => [c.title, c.about]), ...(meta.characters ?? []).flatMap((c) => [c.name, c.role, c.about]), existsSync(facts) ? readFileSync(facts, 'utf8') : ''].join(' ');
    // белый список двух видов: первые 4 буквы («Лили» и «Лилиан» — одна основа для (б)) и основа без окончания —
    // имя из characters в любом падеже не новое слово («Дине» — это Дина, «Рэю» — Рэй)
    const known = [...(card.match(/\p{Lu}\p{Ll}{2,}/gu) ?? [])];
    for (const n of names.keys()) known.push(...n.split(/\s+/).filter(Boolean));
    const white = new Set(known.map((w) => w.toLowerCase().slice(0, 4)));
    const stems = new Set(known.map((w) => nameStem(w, T)));
    const renames = new Set();
    for (const k of tree.knots) walk(k.items, (it) => { if (it.tags?.rename) { const nm = it.tags.rename.split(',').slice(1).join(',').trim(); if (nm) for (const w of nm.split(/\s+/)) { renames.add(w.toLowerCase().slice(0, 4)); stems.add(nameStem(w, T)); } } });

    const forms = new Map(); // говорящий|имя → формы
    const unknown = new Map(); // глава → слова
    for (const k of tree.knots) {
      const ch = st.chapterOf(k.id);
      walk(k.items, (it) => {
        if (it.type !== 'msg' && it.type !== 'me' && it.type !== 'choice') return;
        for (const m of it.text.matchAll(CAP)) {
          const w = m[1];
          const low = w.toLowerCase();
          if (T.re('dict.player_role').test(low)) continue; // «Вас», «Вам» — вежливое «вы», а не имя
          // (а) форма имени: начинается с основы имени и длиннее него на C-48.form_extra букв и больше
          for (const name of names.keys()) {
            const first = name.split(/\s+/)[0];
            const stem = first.replace(/[аяеиоуыэюь]$/u, '');
            const base = low.replace(T.re('dict.case_endings'), '');
            const inflected = base === first || base === stem || low.replace(T.re('dict.case_endings'), '') === first.replace(T.re('dict.case_endings'), '');
            if (stem.length >= 3 && low.startsWith(stem) && !inflected && low.length - first.length >= T.value('C-48.form_extra')) {
              const key = `${it.who ?? 'игрок'}|${first}`;
              if (!forms.has(key)) forms.set(key, { node: k.id, set: new Set() });
              forms.get(key).set.add(w);
            }
          }
          // (б) не контакт и не из белого списка
          const r = low.slice(0, 4);
          if (!white.has(r) && !renames.has(r) && !stems.has(nameStem(w, T))) {
            if (!unknown.has(ch)) unknown.set(ch, new Map());
            if (!unknown.get(ch).has(r)) unknown.get(ch).set(r, { w, node: k.id });
          }
        }
      });
    }
    for (const [key, f] of forms) {
      const [who, first] = key.split('|');
      find('C-48.forms', { node: f.node, chapter: st.chapterOf(f.node), message: `${who} зовёт ${first[0].toUpperCase() + first.slice(1)} и «${[...f.set].join('», «')}»` });
    }
    for (const [ch, m] of unknown) {
      const list = [...m.values()];
      find('C-48.unknown', { node: list[0].node, chapter: ch, message: `глава ${ch}: ${list.slice(0, 8).map((x) => `«${x.w}»`).join(', ')}${list.length > 8 ? ` и ещё ${list.length - 8}` : ''} — не контакты и не известные места; проверь, что они вымышленные`, data: { words: list.map((x) => x.w) } });
    }
    // (в) #rename без прозвучавшего имени в строках до него
    const win = T.value('C-48.rename_window');
    const seen = new Set();
    for (const run of ctx.runs) {
      run.lines.forEach((l, i) => {
        const rn = l.tags.rename;
        if (!rn || seen.has(`${l.knot}|${rn}`)) return;
        seen.add(`${l.knot}|${rn}`);
        const [id, ...rest] = rn.split(',');
        const nm = rest.join(',').trim();
        const first = nm.split(/\s+/)[0]?.toLowerCase().slice(0, 4);
        if (first && !run.lines.slice(Math.max(0, i - win), i + 1).some((x) => x.text.toLowerCase().includes(first))) {
          find('C-48.rename', { node: l.knot, chapter: l.chapter, message: `${id.trim()} переименован в «${nm}», но имя не прозвучало («${short(l.text, 30)}»)` });
        }
      });
    }
  },
};
