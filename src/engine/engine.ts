import { Compiler, CompilerOptions, JsonFileHandler, Story } from 'inkjs/full';

export type Kind = 'in' | 'out' | 'sys' | 'photo';

export interface Msg {
  id: number;
  thread: string;
  kind: Kind;
  text: string;
  at: number;
}

/**
 * Режим игры выбирается в начале истории, сменить его можно только перезапуском (INTENT.md, A-04).
 * realtime — паузы сюжета настоящие; click — пауз нет, скачок времени мира закрывает метка «спустя N».
 */
export type Mode = 'realtime' | 'click';

export const MODES: readonly Mode[] = ['realtime', 'click'];

export const DEFAULT_MODE: Mode = 'realtime';

/**
 * Порог метки «спустя N» в режиме «по клику», часы. Копия ключа engine.click.time_jump_label
 * из docs/playbook/thresholds.json: файл весит сотни килобайт и в сборку не грузится,
 * поэтому число здесь, а e2e (e2e/modes.spec.ts) сверяет его с ключом.
 */
export const TIME_JUMP_LABEL_H = 1;

export interface Contact {
  id: string;
  name: string;
  color: string;
}

/**
 * Сообщение в очереди проходит три фазы:
 * 1. pause  — пауза сюжета (#delay). Это «игровое» время, его ускоряет ползунок скорости.
 * 2. gap    — человек прочитал и думает. Реальное время, индикатора нет.
 * 3. typing — «печатает…». Реальное время, зависит от длины сообщения.
 * Фазы 2 и 3 не ускоряются, поэтому переписка всегда идёт в живом темпе.
 */
interface Pending {
  thread: string;
  kind: Kind;
  text: string;
  delayMs: number;
  delayDone: number;
  gapMs: number;
  gapDone: number;
  typingMs: number;
  typingDone: number;
  unlock: string[];
  /** Тег #chapter: с этой строки начинается новая глава. */
  chapter?: string;
  /** Метка «спустя N» перед этим сообщением уже показана (режим «по клику»). */
  jumpShown?: boolean;
}

export type Phase = 'pause' | 'gap' | 'typing';

export interface ChoiceView {
  index: number;
  text: string;
  /** В какой чат уходит ответ (тег #to:id на варианте). */
  thread: string;
  /** Тег #silent: выбор без исходящего сообщения («промолчать»). */
  silent?: boolean;
  /** Тег #label:...: что показать на кнопке, если отправляемый текст сам по себе неочевиден. */
  label?: string;
}

/**
 * Что делает история, если игрок молчит у кнопки (реальное время, E-02). Скрытые варианты сценария:
 * #remind:2h — напоминание через 2 ч тишины; #noanswer[:1h] — ветка «не ответил». Без #noanswer ветка
 * «не ответил» — кнопка #silent. Кнопками они не показываются.
 */
interface Silence {
  /** Напоминания по порядку: ink-индекс варианта и интервал тишины перед ним. */
  reminders: { index: number; ms: number }[];
  /** Куда идёт история после последнего напоминания; ms — сколько ждать, null — как последнее напоминание. */
  target: { index: number; ms: number | null } | null;
  /** Откуда кнопки в сценарии: после напоминания та же развилка возвращается с тем же ключом. */
  key: string;
}

interface SaveData {
  v: 1 | 2;
  storyId: string;
  storyState: string;
  messages: Msg[];
  unlocked: string[];
  speaker: string;
  lastThread: string;
  pending: Pending | null;
  choices: ChoiceView[];
  choiceThread: string | null;
  ended: boolean;
  read: Record<string, number>;
  nextId: number;
  carryDelay: number;
  savedAt: number;
  chapter?: string;
  renamed?: Record<string, string>;
  /** Сохранения до режимов его не знают: они шли в реальном времени. */
  mode?: Mode;
  /** Сохранения до напоминаний их не знают: кнопка там ждала. */
  silence?: Silence | null;
  waitDone?: number;
  lastRemind?: { ms: number; key: string } | null;
}

export const SPEEDS = [1, 10, 60, Infinity] as const;

export const CONTACT_COLORS: Record<string, string> = {
  blue: '#4f8cff',
  amber: '#f0a830',
  red: '#ff5d5d',
  grey: '#8b93a1',
  green: '#3ecf8e',
  purple: '#a78bfa',
  pink: '#f472b6',
  teal: '#2dd4bf',
  orange: '#fb923c',
  lime: '#a3e635',
  cyan: '#22d3ee',
  indigo: '#818cf8',
};

export function compileInk(source: string, includes: Record<string, string> = {}): { json: string } | { errors: string[] } {
  // Главы приходят строками: файловой системы в браузере нет, INCLUDE читает их из словаря.
  const compiler = new Compiler(source, new CompilerOptions(null, [], false, null, new JsonFileHandler(includes)));
  try {
    const story = compiler.Compile();
    return { json: story.ToJson() as string };
  } catch {
    return { errors: compiler.errors.length ? compiler.errors : ['Не удалось скомпилировать сценарий'] };
  }
}

function parseDelay(value: string): number {
  const m = value.trim().match(/^(\d+(?:\.\d+)?)\s*(s|m|h)?$/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const unit = m[2] ?? 's';
  return n * (unit === 'h' ? 3_600_000 : unit === 'm' ? 60_000 : 1000);
}

/** Сколько человек «набирает» сообщение. Примерно 20 знаков в секунду, как на телефоне. */
function typingTime(kind: Kind, text: string): number {
  if (kind === 'sys') return 0;
  if (kind === 'out') return 0;
  if (kind === 'photo') return 2600;
  return Math.min(5000, Math.max(1100, 600 + text.length * 50));
}

/** Пауза перед набором: прочитал, подумал. Детерминированная «случайность» от текста. */
function gapTime(kind: Kind, text: string, afterPlayer: boolean): number {
  if (kind === 'sys') return 700;
  if (kind === 'out') return 900;
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  const jitter = 350 + (h % 600);
  return afterPlayer ? jitter + 1200 : jitter;
}

/** Скрытый вариант не кнопка: напоминание или ветка «не ответил» без #silent. */
function hiddenRole(tags: string[]): 'remind' | 'noanswer' | null {
  for (const raw of tags) {
    const key = raw.split(':')[0].trim();
    if (key === 'remind') return 'remind';
  }
  const keys = tags.map((t) => t.split(':')[0].trim());
  return keys.includes('noanswer') && !keys.includes('silent') ? 'noanswer' : null;
}

export class Engine {
  readonly storyId: string;
  readonly title: string;
  readonly contacts: Map<string, Contact> = new Map();
  readonly knots: string[];
  readonly varNames: string[];
  private originalNames = new Map<string, string>();

  private json: string;
  private story!: Story;
  private messages: Msg[] = [];
  private unlocked: string[] = [];
  private speaker = '';
  private lastThread = '';
  private pending: Pending | null = null;
  private choices: ChoiceView[] = [];
  private choiceThread: string | null = null;
  private ended = false;
  private read: Record<string, number> = {};
  private nextId = 1;
  private carryDelay = 0;
  /** Следующее входящее идёт сразу после ответа игрока: собеседнику нужно время прочитать. */
  private afterPlayer = false;
  private chapter = '';
  private renamed: Record<string, string> = {};
  private silence: Silence | null = null;
  /** Сколько игрок молчит у текущих кнопок, мс игрового времени: с появления кнопок или с напоминания. */
  private waitDone = 0;
  /** Последнее напоминание: столько же ждём перед веткой «не ответил» той же развилки, если сценарий не сказал иначе. */
  private lastRemind: { ms: number; key: string } | null = null;
  mode: Mode = DEFAULT_MODE;
  /** Отладка: набор текста в 4 раза быстрее. */
  fastTyping = false;
  private listeners = new Set<() => void>();
  private lastTick = Date.now();
  /** Отладка: ускорение пауз сюжета. Не сохраняется: реальное время — это ×1. */
  speed: number = 1;
  /** Растёт при каждом изменении: удобно для React useSyncExternalStore. */
  version = 0;

  constructor(storyId: string, json: string) {
    this.storyId = storyId;
    this.json = json;
    const probe = new Story(json);
    let title = storyId;
    for (const tag of probe.globalTags ?? []) {
      const [key, ...rest] = tag.split(':');
      const value = rest.join(':').trim();
      if (key.trim() === 'title') title = value;
      if (key.trim() === 'contact') {
        const [id, name, color] = value.split(',').map((s) => s.trim());
        if (id) this.contacts.set(id, { id, name: name || id, color: CONTACT_COLORS[color] ?? color ?? CONTACT_COLORS.grey });
      }
    }
    this.title = title;
    for (const [id, c] of this.contacts) this.originalNames.set(id, c.name);
    const named = (probe.mainContentContainer as unknown as { namedContent: Map<string, unknown> }).namedContent;
    this.knots = [...named.keys()].filter((k) => k !== 'global decl');
    const globals = (probe.variablesState as unknown as { _globalVariables: Map<string, unknown> })._globalVariables;
    this.varNames = globals ? [...globals.keys()] : [];
    this.init();
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.save();
    this.notify();
  }

  private notify() {
    this.version++;
    for (const fn of this.listeners) fn();
  }

  contact(id: string): Contact {
    let c = this.contacts.get(id);
    if (!c) {
      c = { id, name: id, color: CONTACT_COLORS.grey };
      this.contacts.set(id, c);
    }
    return c;
  }

  reset() {
    this.init();
    this.emit();
  }

  /** Новая игра в выбранном режиме: режим меняется только так. */
  restart(mode: Mode) {
    this.mode = mode;
    this.reset();
  }

  private init() {
    this.story = new Story(this.json);
    this.messages = [];
    this.unlocked = [];
    this.speaker = '';
    this.lastThread = '';
    this.pending = null;
    this.choices = [];
    this.choiceThread = null;
    this.ended = false;
    this.read = {};
    this.nextId = 1;
    this.carryDelay = 0;
    this.chapter = '';
    this.silence = null;
    this.waitDone = 0;
    this.lastRemind = null;
    for (const id of Object.keys(this.renamed)) {
      const original = this.originalNames.get(id);
      if (original) this.contact(id).name = original;
    }
    this.renamed = {};
    this.lastTick = Date.now();
    this.advance();
  }

  /** Контакт получает настоящее имя (тег #rename:watcher, Слоун). Сохраняется в прогрессе. */
  private rename(id: string, name: string) {
    if (!id || !name) return;
    this.renamed[id] = name;
    this.contact(id).name = name;
  }

  private unlock(id: string) {
    if (!this.unlocked.includes(id)) {
      this.contact(id);
      this.unlocked.unshift(id);
    }
  }

  /** Достаёт из сценария следующую строку и ставит её в ожидание. */
  private advance() {
    while (!this.pending && this.story.canContinue) {
      const text = this.story.Continue()?.trim() ?? '';
      const tags = this.story.currentTags ?? [];
      let kind: Kind = 'in';
      let thread = '';
      let delay = 0;
      const unlock: string[] = [];
      let chapter: string | undefined;
      const renames: [string, string][] = [];
      for (const raw of tags) {
        const [k, ...rest] = raw.split(':');
        const key = k.trim();
        const value = rest.join(':').trim();
        if (key === 'from') this.speaker = value;
        else if (key === 'me') { kind = 'out'; thread = value; }
        else if (key === 'sys') { kind = 'sys'; if (value) thread = value; }
        else if (key === 'photo') kind = 'photo';
        else if (key === 'delay') delay += parseDelay(value);
        else if (key === 'unlock') unlock.push(value);
        else if (key === 'chapter') chapter = value || text;
        else if (key === 'rename') {
          const [id, ...name] = value.split(',');
          renames.push([id.trim(), name.join(',').trim()]);
        }
      }
      renames.forEach(([id, name]) => this.rename(id, name));
      if (!text) {
        // строка без текста: только теги, переносим паузу и открытия на следующую строку
        this.carryDelay += delay;
        unlock.forEach((id) => this.unlock(id));
        continue;
      }
      if (kind === 'sys' && !thread) thread = this.lastThread || this.speaker;
      if (!thread) thread = this.speaker || 'unknown';
      this.pending = {
        thread,
        kind,
        text,
        delayMs: this.carryDelay + delay,
        delayDone: 0,
        gapMs: gapTime(kind, text, this.afterPlayer),
        gapDone: 0,
        typingMs: typingTime(kind, text),
        typingDone: 0,
        unlock,
        chapter,
      };
      this.carryDelay = 0;
      this.afterPlayer = false;
    }
    if (!this.pending && !this.story.canContinue) {
      const fallback = this.lastThread || this.speaker || 'unknown';
      const silence: Silence = { reminders: [], target: null, key: '' };
      const sources: string[] = [];
      let silentIndex = -1;
      this.choices = [];
      for (const c of this.story.currentChoices) {
        const tags = c.tags ?? [];
        let thread = fallback;
        let silent = false;
        let label: string | undefined;
        let remind = 0;
        let noanswer: number | null | undefined;
        for (const raw of tags) {
          const [k, ...rest] = raw.split(':');
          const key = k.trim();
          const value = rest.join(':').trim();
          if (key === 'to') thread = value || fallback;
          if (key === 'silent') silent = true;
          if (key === 'label') label = value;
          if (key === 'remind') remind = parseDelay(value);
          if (key === 'noanswer') noanswer = value ? parseDelay(value) : null;
        }
        // первый #noanswer — ветка «не ответил»; #silent — только если #noanswer нет
        if (noanswer !== undefined && !silence.target) silence.target = { index: c.index, ms: noanswer };
        if (silent && silentIndex < 0) silentIndex = c.index;
        const role = hiddenRole(tags);
        if (role === 'remind') {
          if (remind > 0) silence.reminders.push({ index: c.index, ms: remind });
          continue;
        }
        if (role === 'noanswer') continue;
        sources.push(c.sourcePath);
        if (!this.unlocked.includes(thread)) this.unlock(thread);
        this.choices.push({ index: c.index, text: c.text, thread, silent, label });
      }
      if (!silence.target && silentIndex >= 0) silence.target = { index: silentIndex, ms: null };
      silence.key = sources.join('|');
      this.silence = this.choices.length && (silence.reminders.length || silence.target) ? silence : null;
      this.waitDone = 0;
      this.choiceThread = this.choices.length ? fallback : null;
      this.ended = this.choices.length === 0;
    }
  }

  /**
   * Сколько ещё молчать до следующего шага истории (мс игрового времени) и что это за шаг.
   * null — кнопка ждёт: режим «по клику», напоминаний нет или они кончились, а вести некуда.
   */
  private nextSilence(): { ms: number; index: number; remind: boolean } | null {
    const s = this.silence;
    if (!s || this.mode === 'click' || this.pending || !this.choices.length) return null;
    const r = s.reminders[0];
    if (r) return { ms: r.ms, index: r.index, remind: true };
    if (!s.target) return null;
    const ms = s.target.ms ?? (this.lastRemind?.key === s.key ? this.lastRemind.ms : null);
    return ms ? { ms, index: s.target.index, remind: false } : null;
  }

  /** Игрок промолчал до срока: персонаж напоминает или история идёт веткой «не ответил». Исходящего сообщения нет. */
  private fireSilence(step: { index: number; ms: number; remind: boolean }) {
    this.lastRemind = step.remind && this.silence ? { ms: step.ms, key: this.silence.key } : null;
    this.lastThread = this.choiceThread ?? this.lastThread;
    this.afterPlayer = false;
    this.story.ChooseChoiceIndex(step.index);
    this.choices = [];
    this.choiceThread = null;
    this.silence = null;
    this.waitDone = 0;
    this.advance();
  }

  private commit(p: Pending, at = Date.now()) {
    p.unlock.forEach((id) => this.unlock(id));
    this.unlock(p.thread);
    if (p.chapter) this.chapter = p.chapter;
    this.messages.push({ id: this.nextId++, thread: p.thread, kind: p.kind, text: p.text, at });
    this.lastThread = p.thread;
    // поднять чат наверх списка
    this.unlocked = [p.thread, ...this.unlocked.filter((t) => t !== p.thread)];
  }

  /** Вызывается по таймеру. Догоняет и время, прошедшее офлайн. Возвращает новые сообщения. */
  tick(now = Date.now()): Msg[] {
    const start = this.lastTick;
    const dt = Math.max(0, now - start);
    this.lastTick = now;
    const fresh: Msg[] = [];
    let real = dt * (this.fastTyping ? 4 : 1); // реальные миллисекунды на «подумал» и «печатает»
    let guard = 0;
    let fired = false;
    while (guard++ < 1000) {
      if (!this.pending) {
        // игрок молчит у кнопок: напоминания и ветка «не ответил» идут по тому же времени, что и паузы,
        // поэтому офлайн они тоже догоняются. «Без пауз» (∞) кнопку не торопит: только «пропустить»
        const step = this.speed === Infinity ? null : this.nextSilence();
        if (!step) break;
        const k = this.speed / (this.fastTyping ? 4 : 1);
        const left = step.ms - this.waitDone;
        if (real * k < left) {
          this.waitDone += real * k;
          real = 0;
          break;
        }
        real -= left / k;
        this.fireSilence(step);
        fired = true;
        continue;
      }
      const p = this.pending;
      // по клику пауз нет, но скачок времени мира игрок должен увидеть
      if (this.mode === 'click' && !p.jumpShown && p.delayMs >= TIME_JUMP_LABEL_H * 3_600_000) {
        p.jumpShown = true;
        const label: Pending = { ...p, kind: 'sys', text: jumpLabel(p.delayMs), unlock: [], chapter: undefined };
        this.commit(label, Math.round(start + (dt - real / (this.fastTyping ? 4 : 1))));
        fresh.push(this.messages[this.messages.length - 1]);
      }
      // 1. пауза сюжета: ускоряется
      const delayLeft = p.delayMs - p.delayDone;
      if (delayLeft > 0) {
        if (this.speed === Infinity || this.mode === 'click') p.delayDone = p.delayMs;
        else {
          const k = this.speed / (this.fastTyping ? 4 : 1);
          const can = real * k;
          if (can < delayLeft) {
            p.delayDone += can;
            real = 0;
            break;
          }
          p.delayDone = p.delayMs;
          real -= delayLeft / k;
        }
      }
      // 2. подумал. 3. печатает: всегда в реальном времени
      const gapLeft = p.gapMs - p.gapDone;
      if (gapLeft > 0) {
        if (real < gapLeft) {
          p.gapDone += real;
          real = 0;
          break;
        }
        p.gapDone = p.gapMs;
        real -= gapLeft;
      }
      const typeLeft = p.typingMs - p.typingDone;
      if (real < typeLeft) {
        p.typingDone += real;
        real = 0;
        break;
      }
      real -= typeLeft;
      this.pending = null;
      // если догоняем офлайн, ставим сообщению то время, когда оно «пришло бы»
      this.commit(p, Math.round(start + (dt - real / (this.fastTyping ? 4 : 1))));
      fresh.push(this.messages[this.messages.length - 1]);
      this.advance();
    }
    if (fresh.length || fired) this.emit();
    else if (this.pending || this.silence) this.notify();
    return fresh;
  }

  choose(index: number) {
    if (this.pending || !this.choices.length) return;
    const choice = this.choices.find((c) => c.index === index);
    if (!choice) return;
    const thread = choice.thread ?? this.choiceThread ?? this.speaker;
    if (!choice.silent) {
      this.messages.push({ id: this.nextId++, thread, kind: 'out', text: choice.text, at: Date.now() });
      this.unlocked = [thread, ...this.unlocked.filter((t) => t !== thread)];
    }
    this.lastThread = thread;
    this.afterPlayer = !choice.silent;
    this.story.ChooseChoiceIndex(index);
    this.choices = [];
    this.choiceThread = null;
    this.silence = null;
    this.waitDone = 0;
    this.lastRemind = null;
    this.advance();
    this.emit();
  }

  /** Отладка: следующее сообщение приходит сразу — без паузы, раздумья и набора; у кнопок — следующее напоминание. */
  skipNext() {
    const p = this.pending;
    if (!p) {
      this.tick();
      const step = this.nextSilence();
      if (!step) return;
      this.fireSilence(step);
      this.tick();
      this.emit();
      return;
    }
    p.delayDone = p.delayMs;
    p.gapDone = p.gapMs;
    p.typingDone = p.typingMs;
    this.tick();
  }

  setFastTyping(on: boolean) {
    this.tick();
    this.fastTyping = on;
    this.emit();
  }

  setSpeed(speed: number) {
    this.tick();
    this.speed = speed;
    this.emit();
  }

  jump(knot: string) {
    this.story.ChoosePathString(knot);
    this.pending = null;
    this.choices = [];
    this.choiceThread = null;
    this.ended = false;
    this.carryDelay = 0;
    this.silence = null;
    this.waitDone = 0;
    this.lastRemind = null;
    this.messages.push({ id: this.nextId++, thread: this.lastThread || this.speaker || 'unknown', kind: 'sys', text: `переход к «${knot}»`, at: Date.now() });
    this.advance();
    this.emit();
  }

  getVar(name: string): unknown {
    return this.story.variablesState[name];
  }

  setVar(name: string, value: unknown) {
    this.story.variablesState[name] = value;
    this.emit();
  }

  markRead(thread: string) {
    const last = [...this.messages].reverse().find((m) => m.thread === thread);
    if (last && this.read[thread] !== last.id) {
      this.read[thread] = last.id;
      this.emit();
    }
  }

  view() {
    const p = this.pending;
    let status: { thread: string; phase: Phase; typing: boolean; pauseMs: number; realMs: number } | null = null;
    if (p) {
      const pauseMs = Math.max(0, p.delayMs - p.delayDone);
      const liveMs = Math.max(0, p.gapMs - p.gapDone) + Math.max(0, p.typingMs - p.typingDone);
      const phase: Phase = pauseMs > 0 ? 'pause' : p.gapDone < p.gapMs ? 'gap' : 'typing';
      status = {
        thread: p.thread,
        phase,
        typing: phase === 'typing' && p.typingMs > 0,
        pauseMs,
        realMs: (this.speed === Infinity || this.mode === 'click' ? 0 : pauseMs / this.speed) + liveMs,
      };
    }
    const step = this.nextSilence();
    const silence = step
      ? {
          remind: step.remind,
          leftMs: Math.max(0, step.ms - this.waitDone),
          realMs: this.speed === Infinity ? null : Math.max(0, step.ms - this.waitDone) / this.speed,
        }
      : null;
    return {
      messages: this.messages,
      threads: this.unlocked,
      choices: this.choices,
      choiceThreads: [...new Set(this.choices.map((c) => c.thread))],
      ended: this.ended,
      chapter: this.chapter,
      status,
      silence,
      read: this.read,
      speed: this.speed,
      fastTyping: this.fastTyping,
      mode: this.mode,
    };
  }

  private storageKey() {
    return `relay:${this.storyId}`;
  }

  private save() {
    const data: SaveData = {
      v: 2,
      storyId: this.storyId,
      storyState: this.story.state.toJson(),
      messages: this.messages,
      unlocked: this.unlocked,
      speaker: this.speaker,
      lastThread: this.lastThread,
      pending: this.pending,
      choices: this.choices,
      choiceThread: this.choiceThread,
      ended: this.ended,
      read: this.read,
      nextId: this.nextId,
      carryDelay: this.carryDelay,
      savedAt: this.lastTick,
      chapter: this.chapter,
      renamed: this.renamed,
      mode: this.mode,
      silence: this.silence,
      waitDone: this.waitDone,
      lastRemind: this.lastRemind,
    };
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(data));
      localStorage.setItem('relay:fast', this.fastTyping ? '1' : '0');
    } catch {
      /* хранилище недоступно: играем без сохранения */
    }
  }

  /** Восстанавливает прогресс. Время, прошедшее офлайн, догоняется в tick(). */
  restore(): boolean {
    try {
      this.fastTyping = localStorage.getItem('relay:fast') === '1';
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) return false;
      const d = JSON.parse(raw) as SaveData;
      if ((d.v !== 1 && d.v !== 2) || d.storyId !== this.storyId) return false;
      this.story.state.LoadJson(d.storyState);
      this.messages = d.messages;
      this.unlocked = d.unlocked;
      this.speaker = d.speaker;
      this.lastThread = d.lastThread;
      this.pending = d.pending ? normalizePending(d.pending) : null;
      this.choices = d.choices.map((c) => ({ ...c, thread: c.thread ?? d.choiceThread ?? d.lastThread }));
      this.choiceThread = d.choiceThread;
      this.ended = d.ended;
      this.read = d.read;
      this.nextId = d.nextId;
      this.carryDelay = d.carryDelay;
      this.chapter = d.chapter ?? '';
      this.renamed = d.renamed ?? {};
      this.mode = d.mode ?? DEFAULT_MODE;
      this.silence = d.silence ?? null;
      this.waitDone = d.waitDone ?? 0;
      this.lastRemind = d.lastRemind ?? null;
      for (const [id, name] of Object.entries(this.renamed)) this.contact(id).name = name;
      this.lastTick = d.savedAt ?? Date.now();
      return true;
    } catch {
      return false;
    }
  }
}

export type View = ReturnType<Engine['view']>;

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDuration(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s} с`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} мин ${s % 60} с`;
  return `${Math.floor(m / 60)} ч ${m % 60} мин`;
}

/** «спустя 3 часа», «спустя 2 дня» — без минут: метка про скачок мира, а не про точное время. */
export function jumpLabel(ms: number): string {
  const h = Math.max(1, Math.round(ms / 3_600_000));
  if (h < 24) return `спустя ${h} ${plural(h, 'час', 'часа', 'часов')}`;
  const d = Math.round(h / 24);
  return `спустя ${d} ${plural(d, 'день', 'дня', 'дней')}`;
}

/** «1 глава», «2 главы», «5 глав». */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Старые сохранения (v1) хранили один общий прогресс. Приводим к фазам. */
function normalizePending(p: Pending & { progress?: number }): Pending {
  if (p.delayDone !== undefined) return p;
  const progress = p.progress ?? 0;
  return {
    thread: p.thread,
    kind: p.kind,
    text: p.text,
    delayMs: p.delayMs,
    delayDone: Math.min(progress, p.delayMs),
    gapMs: gapTime(p.kind, p.text, false),
    gapDone: 0,
    typingMs: typingTime(p.kind, p.text),
    typingDone: 0,
    unlock: p.unlock ?? [],
  };
}
