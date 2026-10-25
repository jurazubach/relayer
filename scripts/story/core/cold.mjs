// Холодный читатель: переписка в режиме, ключ к ней, протокол и проверка изоляции ответа.
// Отдельно от cold-read.mjs, чтобы самопроверка гоняла всё, кроме самого вызова claude -p.
import { existsSync, readFileSync } from 'node:fs';
import { fmtDuration } from './timeline.mjs';
import { thresholdSeconds } from '../../lib/thresholds.mjs';
import { visibleText } from './visible.mjs';

export const MODES = {
  opening: 'начало: кто пишет, чего хочет, к какому сроку, где отложил бы телефон',
  return: 'возвращение: всё после последней долгой тишины пришло, пока читателя не было',
  click: 'по клику: пауз нет, скачки времени — метка «спустя»',
  guess: 'угадать: что придёт дальше и что на самом деле происходит',
  voices: 'голоса вслепую: имена и чаты заменены буквами, различимы ли собеседники',
};

/** Разделы протокола по заголовкам «## …». */
export function readProtocol(file) {
  if (!existsSync(file)) throw new Error(`нет протокола ${file}`);
  const text = readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const parts = {};
  let name = null;
  for (const line of text.split('\n')) {
    const h = line.match(/^## (.+)$/);
    if (h) { name = h[1].trim(); parts[name] = []; continue; }
    if (name) parts[name].push(line);
  }
  const get = (n) => (parts[n] ? parts[n].join('\n').trim() : null);
  return { role: get('Роль'), control: get('Контроль'), format: get('Формат ответа'), mode: (m) => get(`Режим: ${m}`) };
}

/** Что пришло бы сразу после обрыва: строки до следующей кнопки — ответ для режима «угадать». */
export function nextLines(rest) {
  const stop = rest.findIndex((i) => i.type === 'choice');
  return (stop < 0 ? rest : rest.slice(0, stop)).filter((i) => i.type === 'line');
}

/** Буквы для голосов вслепую. */
const LETTERS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ';

/** Переписка в режиме и ключ к ней. */
export function compose(p, items, mode) {
  const gap = thresholdSeconds('story.pause.session_s');
  const key = {};
  if (mode === 'voices') {
    const letter = new Map();
    const of = (id) => {
      if (!letter.has(id)) letter.set(id, LETTERS[letter.size] ?? `${letter.size + 1}`);
      return letter.get(id);
    };
    const names = Object.entries(p.tree.contacts).map(([id, c]) => [id, c.name]).filter(([, n]) => n);
    // имя выдают системные строки («Анна не в сети») и подпись в начале реплики («Банк: …») —
    // там оно меняется на ту же букву; имена внутри реплик остаются: это содержание, а не подпись
    const masked = items.map((it) => {
      if (it.type !== 'line' || it.kind === 'me') return it;
      let text = it.text;
      for (const [id, n] of names) {
        if (it.kind === 'sys' && text.includes(n)) text = text.split(n).join(`Собеседник ${of(id)}`);
        else if (text.startsWith(`${n}:`)) text = `Собеседник ${of(id)}${text.slice(n.length)}`;
      }
      return { ...it, text };
    });
    const transcript = visibleText(masked, 'realtime', {
      who: (it) => `Собеседник ${of(it.who ?? it.thread)}`,
      chat: (it) => of(it.thread),
    });
    key.voices = Object.fromEntries([...letter].map(([id, l]) => [l, p.tree.contacts[id]?.name ?? id]));
    return { transcript, key };
  }
  if (mode === 'return') {
    let at = -1;
    items.forEach((it, i) => { if (it.type === 'line' && it.delay >= gap) at = i; });
    if (at < 0) {
      key.returnAfter = null;
      return { transcript: `${visibleText(items, 'realtime')}\n(до узла не было тишины от ${fmtDuration(gap)} — возвращаться не к чему)`, key };
    }
    key.returnAfter = { pause: items[at].delay, knot: items[at].knot };
    const before = visibleText(items.slice(0, at), 'realtime');
    const after = visibleText(items.slice(at), 'realtime');
    return { transcript: `${before}\n═══ вы отложили телефон; всё ниже пришло, пока вас не было ═══\n${after}`, key };
  }
  return { transcript: visibleText(items, mode === 'click' ? 'click' : 'realtime'), key };
}

/** Слова, которые читатель может знать, только заглянув за переписку: узлы, финалы, id истории. */
export function secrets(p, transcript) {
  const seen = transcript.toLowerCase();
  const words = new Set([...p.nodes.flatMap((n) => n.split('.')), ...p.endings.endings.map((e) => e.name), p.story.id]);
  return [...words].filter((w) => w && !seen.includes(w.toLowerCase()));
}
export const PROJECT_TRACES = ['relayer', 'CLAUDE.md', 'MEMORY.md', 'src/stories', 'inkjs', 'docs/playbook'];

export function checkIsolation(answer, p, transcript) {
  const low = answer.toLowerCase();
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const leaks = secrets(p, transcript).filter((w) => new RegExp(`(^|[^\\p{L}\\p{N}_])${esc(w.toLowerCase())}($|[^\\p{L}\\p{N}_])`, 'u').test(low));
  const traces = PROJECT_TRACES.filter((t) => low.includes(t.toLowerCase()));
  return { ok: !leaks.length && !traces.length, leaks, traces };
}
