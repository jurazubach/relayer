// C-45. Молчащие контакты: объявлен, но почти не говорит; пишет только в ответ; не описан в characters.
// Служебные контакты (dict.service_contacts, service: true) не считаются.
import { walk } from '../../lib/ink.mjs';
import { plural } from '../text.mjs';

export default {
  id: 'C-45',
  title: 'Молчащие контакты',
  plan: true,
  partial: false,
  run(ctx, find) {
    const { st, T, tree, meta } = ctx;
    const chars = new Map((meta.characters ?? []).filter((c) => c.id).map((c) => [c.id, c]));
    const ids = new Set([...Object.keys(tree.contacts), ...chars.keys()].filter((id) => !ctx.service.has(id)));
    const blocks = new Map();
    const lines = new Map();
    const chapters = new Map();
    const perChapter = new Map(); // глава → Map(id → блоков)
    for (const k of tree.knots) {
      const ch = st.chapterOf(k.id);
      walk(k.items, (it) => {
        if (it.type === 'msg' && it.who) lines.set(it.who, (lines.get(it.who) ?? 0) + 1);
        if (it.tags?.from) {
          const id = it.tags.from;
          blocks.set(id, (blocks.get(id) ?? 0) + 1);
          if (!chapters.has(id)) chapters.set(id, new Set());
          chapters.get(id).add(ch);
          if (!perChapter.has(ch)) perChapter.set(ch, new Map());
          perChapter.get(ch).set(id, (perChapter.get(ch).get(id) ?? 0) + 1);
        }
      });
    }
    const toVars = new Map();
    for (const b of st.buttons.list) if (b.to) toVars.set(b.to, (toVars.get(b.to) ?? 0) + b.writes.length);
    for (const id of ids) {
      const b = blocks.get(id) ?? 0;
      if (b < T.value('C-45.blocks')) find('C-45.blocks', { message: `контакт ${id} объявлен, но говорит ${plural(b, 'раз', 'раза', 'раз')}` });
      else if ((lines.get(id) ?? 0) < T.value('C-45.thin') && !toVars.get(id)) find('C-45.thin', { message: `контакт ${id}: ${lines.get(id) ?? 0} строк и ни одной переменной под кнопками к нему` });
      if (chars.has(id) && st.lastChapter >= T.value('C-45.chapters') && (chapters.get(id)?.size ?? 0) < T.value('C-45.chapters')) {
        find('C-45.chapters', { message: `герой ${id} появляется в ${plural(chapters.get(id)?.size ?? 0, 'главе', 'главах', 'главах')} из ${st.lastChapter}` });
      }
      if (tree.contacts[id] && !chars.has(id)) find('C-45.undescribed', { message: `контакт ${id} не описан в characters` });
    }
    for (const [ch, m] of perChapter) {
      const speakers = [...m].filter(([id, n]) => !ctx.service.has(id) && n >= T.value('C-45.speaker_blocks')).length;
      if (speakers < T.value('C-45.speakers_min') || speakers > T.value('C-45.speakers_max')) {
        find(speakers < T.value('C-45.speakers_min') ? 'C-45.speakers_min' : 'C-45.speakers_max', { chapter: ch, message: `глава ${ch}: ${plural(speakers, 'заметный говорящий', 'заметных говорящих', 'заметных говорящих')}` });
      }
    }
    // пишет только после кнопки #to к нему: никогда не начинает разговор сам
    if (!ctx.runs.length) return;
    const reactive = new Map();
    for (const run of ctx.runs) {
      let lastTo = null;
      const per = new Map();
      for (const item of run.seq) {
        if (item.type === 'choice') { lastTo = item.tos[item.picked]; continue; }
        if (item.kind !== 'in' || !item.who || ctx.service.has(item.who)) continue;
        const key = `${item.who}|${item.chapter}`;
        const p = per.get(key) ?? { n: 0, after: 0 };
        p.n++;
        if (lastTo === item.who) p.after++;
        per.set(key, p);
      }
      for (const [key, p] of per) if (p.n >= T.value('C-45.reactive')) { const r = reactive.get(key) ?? { runs: 0, only: 0 }; r.runs++; if (p.after === p.n) r.only++; reactive.set(key, r); }
    }
    for (const [key, r] of reactive) {
      const [id, ch] = key.split('|');
      if (r.only * 2 > r.runs) find('C-45.reactive', { chapter: Number(ch), message: `${id} в главе ${ch} только отвечает: пишет лишь после кнопки к нему` });
    }
  },
};
