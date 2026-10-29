import { Compiler, CompilerOptions, JsonFileHandler, Story } from 'inkjs/full';

export type Kind = 'in' | 'out' | 'sys' | 'photo';

export interface Msg {
  id: number;
  thread: string;
  kind: Kind;
  text: string;
  at: number;
  /**
   * Картинка фото-сообщения: имя файла из папки images/ истории без расширения (#photo:имя).
   * Текст строки тогда — описание картинки: подпись-заглушка, пока файла нет, и alt.
   */
  image?: string;
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
  image?: string;
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

/**
 * Запись журнала выборов (E-03): что игрок сделал у развилки. Журнал выгружается тестером из отладки
 * и воспроизводится ботом (story:trace --from-save), поэтому номер кнопки считается как у бота:
 * среди показанных кнопок, с нуля; «не ответил» — −1.
 */
export interface LogEntry {
  /** choice — нажал кнопку; noanswer — молчал, история пошла веткой «не ответил»; remind — персонаж напомнил;
   *  jump и set — вмешательство из отладки: после них маршрут воспроизводится уже не точно. */
  kind: 'choice' | 'noanswer' | 'remind' | 'jump' | 'set';
  at: number;
  /** Узел развилки (knot или knot.stitch); null — кнопки стоят до первого узла. */
  knot: string | null;
  chapter: string;
  /** Чат, где стояли кнопки. */
  thread: string;
  /** Номер нажатой кнопки среди показанных; −1 — «не ответил»; null — не выбор. */
  picked: number | null;
  /** Текст кнопки, реплики напоминания, узла перехода или «имя = значение». */
  text: string;
  options: string[];
  /** Сколько кнопки ждали игрока, мс настоящего времени: с первого появления развилки, напоминания не сбрасывают. */
  waitMs: number;
  /** Сколько напоминаний было у развилки до этой записи. */
  reminders: number;
  /** Переменные в момент решения, до последствий выбора. */
  vars: Record<string, string | number | boolean>;
}

/** Развилка, у которой стоит игрок: для журнала. */
interface Fork {
  at: number;
  knot: string | null;
  reminders: number;
}

/**
 * Кнопки развилки, пока персонаж печатает напоминание: ink уже ушёл в ветку напоминания,
 * а игрок может ответить, не дожидаясь его. Нажатие возвращает ink к развилке.
 */
interface Held {
  state: string;
  choices: ChoiceView[];
  choiceThread: string | null;
  speaker: string;
  lastThread: string;
  fork: Fork | null;
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
  /** Заголовок главы прошёл, а сообщения после него ещё нет (кнопки сразу за заголовком). */
  carryChapter?: string;
  savedAt: number;
  chapter?: string;
  renamed?: Record<string, string>;
  /** Сохранения до режимов его не знают: они шли в реальном времени. */
  mode?: Mode;
  /** Сохранения до напоминаний их не знают: кнопка там ждала. */
  silence?: Silence | null;
  waitDone?: number;
  lastRemind?: { ms: number; key: string } | null;
  /** Сохранения до журнала выборов его не знают: журнал начинается с места, где игрок сейчас. */
  log?: LogEntry[];
  fork?: Fork | null;
  held?: Held | null;
  startedAt?: number;
  /** Ревизия сценария, под которую записано состояние. Сохранения до ревизий её не знают: это 1. */
  revision?: number;
  /** Сколько глав уже началось. Сохранения до границы глав его не знают: считаем по текущей главе. */
  chapterNo?: number;
  /** Игрок стоит на платной границе: для карточки и экрана истории, движок пересчитывает сам. */
  locked?: boolean;
}

/** Сохранение от другой ревизии сценария: продолжить его нельзя, история началась заново. */
export interface Outdated {
  from: number;
  to: number;
  /** Режим сброшенной игры: игрок его уже выбирал, новая игра идёт в нём же. */
  mode: Mode;
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
/** Сообщение одной строкой для списка чатов и уведомления: у фото с картинкой — «Фото», как в мессенджере. */
export const previewText = (m: Pick<Msg, 'text' | 'image'>) => (m.image ? '📷 Фото' : m.text);

/** #photo:ch01-note.webp и #photo:ch01-note — одна картинка: в истории она ищется по имени без расширения. */
export const imageName = (value: string) => value.trim().replace(/\.(webp|png|jpe?g|gif|avif)$/i, '');

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
  readonly revision: number;
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
  private carryChapter: string | undefined;
  /** Следующее входящее идёт сразу после ответа игрока: собеседнику нужно время прочитать. */
  private afterPlayer = false;
  private chapter = '';
  private renamed: Record<string, string> = {};
  private silence: Silence | null = null;
  /** Сколько игрок молчит у текущих кнопок, мс игрового времени: с появления кнопок или с напоминания. */
  private waitDone = 0;
  /** Последнее напоминание: столько же ждём перед веткой «не ответил» той же развилки, если сценарий не сказал иначе. */
  private lastRemind: { ms: number; key: string } | null = null;
  private log: LogEntry[] = [];
  private fork: Fork | null = null;
  private held: Held | null = null;
  /** Когда началась игра: в выгрузке журнала. */
  startedAt = Date.now();
  mode: Mode = DEFAULT_MODE;
  /** Отладка: набор текста в 4 раза быстрее. */
  fastTyping = false;
  private listeners = new Set<() => void>();
  private lastTick = Date.now();
  /** Отладка: ускорение пауз сюжета. Не сохраняется: реальное время — это ×1. */
  speed: number = 1;
  /** Растёт при каждом изменении: удобно для React useSyncExternalStore. */
  version = 0;
  /** restore() нашёл сохранение от другой ревизии и не стал его загружать. */
  outdated: Outdated | null = null;
  /** Сколько первых глав бесплатно; null — бесплатно всё (paywall.ts). */
  readonly freeChapters: number | null;
  /** Продолжение открыто: пока из отладки, потом покупкой. Не сохраняется в прогрессе — его помнит paywall.ts. */
  chaptersOpen = false;
  /** Сколько строк #chapter уже пришло. */
  private chapterNo = 0;

  constructor(storyId: string, json: string, revision = 1, freeChapters: number | null = null) {
    this.storyId = storyId;
    this.revision = revision;
    this.freeChapters = freeChapters;
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
    this.carryChapter = undefined;
    this.chapter = '';
    this.chapterNo = 0;
    this.silence = null;
    this.waitDone = 0;
    this.lastRemind = null;
    this.log = [];
    this.fork = null;
    this.held = null;
    this.startedAt = Date.now();
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
      let image: string | undefined;
      const renames: [string, string][] = [];
      for (const raw of tags) {
        const [k, ...rest] = raw.split(':');
        const key = k.trim();
        const value = rest.join(':').trim();
        if (key === 'from') this.speaker = value;
        else if (key === 'me') { kind = 'out'; thread = value; }
        else if (key === 'sys') { kind = 'sys'; if (value) thread = value; }
        else if (key === 'photo') { kind = 'photo'; if (value) image = imageName(value); }
        else if (key === 'delay') delay += parseDelay(value);
        else if (key === 'unlock') unlock.push(value);
        else if (key === 'chapter') chapter = value || text;
        else if (key === 'rename') {
          const [id, ...name] = value.split(',');
          renames.push([id.trim(), name.join(',').trim()]);
        }
      }
      renames.forEach(([id, name]) => this.rename(id, name));
      // заголовок главы (A-08) игрок не видит: стык для него — просто пауза персонажа.
      // Глава начинается со следующего сообщения, оно же несёт паузу и стоит на платной границе
      if (chapter && kind === 'sys') {
        this.carryDelay += delay;
        this.carryChapter = chapter;
        unlock.forEach((id) => this.unlock(id));
        continue;
      }
      if (!chapter && this.carryChapter) chapter = this.carryChapter;
      if (!text) {
        // строка без текста: только теги, переносим паузу и открытия на следующую строку
        this.carryDelay += delay;
        if (chapter) this.carryChapter = chapter;
        unlock.forEach((id) => this.unlock(id));
        continue;
      }
      if (kind === 'sys' && !thread) thread = this.lastThread || this.speaker;
      if (!thread) thread = this.speaker || 'unknown';
      this.pending = {
        thread,
        kind,
        text,
        ...(image ? { image } : {}),
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
      this.carryChapter = undefined;
      this.afterPlayer = false;
    }
    if (!this.pending && !this.story.canContinue) {
      const fallback = this.lastThread || this.speaker || 'unknown';
      const silence: Silence = { reminders: [], target: null, key: '' };
      const sources: string[] = [];
      let silentIndex = -1;
      this.held = null;
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
      // напоминание вернуло к той же развилке: игрок всё ещё думает над ней
      const same = this.fork && this.lastRemind?.key === silence.key;
      this.fork = this.choices.length
        ? { at: same ? this.fork!.at : Date.now(), knot: this.knotOf(sources[0]), reminders: same ? this.fork!.reminders : 0 }
        : null;
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
    const hidden = this.story.currentChoices.find((c) => c.index === step.index);
    this.record(step.remind ? 'remind' : 'noanswer', step.remind ? null : -1, hidden?.text ?? '');
    if (step.remind && this.fork) this.fork.reminders++;
    // собеседник пишет напоминание, а клавиатуру у игрока не отнимают: кнопки остаются до конца напоминания
    this.held = step.remind
      ? {
          state: this.story.state.toJson(),
          choices: this.choices,
          choiceThread: this.choiceThread,
          speaker: this.speaker,
          lastThread: this.lastThread,
          fork: this.fork,
        }
      : null;
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
    if (p.chapter) {
      this.chapter = p.chapter;
      this.chapterNo++;
    }
    this.messages.push({ id: this.nextId++, thread: p.thread, kind: p.kind, text: p.text, at, ...(p.image ? { image: p.image } : {}) });
    this.lastThread = p.thread;
    // поднять чат наверх списка
    this.unlocked = [p.thread, ...this.unlocked.filter((t) => t !== p.thread)];
  }

  /**
   * Следующая строка открывает главу за бесплатной границей, а продолжение закрыто: история стоит.
   * Стоит до паузы этой строки, а не после: игрок видит границу сразу, как кончилась бесплатная глава,
   * и пауза между главами идёт уже после открытия.
   */
  private atPaywall(): boolean {
    return (
      !!this.pending?.chapter &&
      this.freeChapters !== null &&
      !this.chaptersOpen &&
      this.chapterNo >= this.freeChapters
    );
  }

  /** Открыть или снова закрыть продолжение. История, стоявшая на границе, идёт дальше. */
  setChaptersOpen(open: boolean) {
    this.tick();
    this.chaptersOpen = open;
    this.emit();
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
        // игрок молчит у кнопок: напоминания и ветка «не ответил» догоняются офлайн, как паузы,
        // но отладочное ускорение их не торопит: при ×60 пять минут на раздумье стали бы пятью секундами.
        // «Без пауз» (∞) кнопку тоже не торопит: только «пропустить»
        const step = this.speed === Infinity ? null : this.nextSilence();
        if (!step) break;
        const k = 1 / (this.fastTyping ? 4 : 1);
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
      if (this.atPaywall()) break;
      const p = this.pending;
      // по клику пауз нет, но скачок времени мира игрок должен увидеть
      if (this.mode === 'click' && !p.jumpShown && p.delayMs >= TIME_JUMP_LABEL_H * 3_600_000) {
        p.jumpShown = true;
        const label: Pending = { ...p, kind: 'sys', text: jumpLabel(p.delayMs), image: undefined, unlock: [], chapter: undefined };
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
    else if ((this.pending && !this.atPaywall()) || this.silence) this.notify();
    return fresh;
  }

  choose(index: number) {
    if (this.held?.choices.some((c) => c.index === index)) this.resumeFork();
    if (this.pending || !this.choices.length) return;
    const choice = this.choices.find((c) => c.index === index);
    if (!choice) return;
    const thread = choice.thread ?? this.choiceThread ?? this.speaker;
    this.record('choice', this.choices.indexOf(choice), choice.text);
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

  /** Игрок ответил, пока печаталось напоминание: недописанное напоминание отменяется, ink снова у развилки. */
  private resumeFork() {
    const h = this.held!;
    this.held = null;
    this.story.state.LoadJson(h.state);
    this.pending = null;
    this.carryDelay = 0;
    this.carryChapter = undefined;
    this.choices = h.choices;
    this.choiceThread = h.choiceThread;
    this.speaker = h.speaker;
    this.lastThread = h.lastThread;
    this.fork = h.fork;
  }

  /** Отладка: следующее сообщение приходит сразу — без паузы, раздумья и набора; у кнопок — следующее напоминание. */
  skipNext() {
    if (this.atPaywall()) return;
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
    this.record('jump', null, knot);
    this.story.ChoosePathString(knot);
    // переход к главе chN из отладки: граница считает её N-й, а не следующей по счёту
    const no = knot.match(/^ch(\d+)$/);
    if (no) this.chapterNo = Number(no[1]) - 1;
    this.pending = null;
    this.choices = [];
    this.choiceThread = null;
    this.ended = false;
    this.carryDelay = 0;
    this.carryChapter = undefined;
    this.silence = null;
    this.waitDone = 0;
    this.lastRemind = null;
    this.fork = null;
    this.held = null;
    this.messages.push({ id: this.nextId++, thread: this.lastThread || this.speaker || 'unknown', kind: 'sys', text: `переход к «${knot}»`, at: Date.now() });
    this.advance();
    this.emit();
  }

  /** Развилка, у которой стоит игрок; null — кнопок нет. */
  currentKnot(): string | null {
    return this.fork?.knot ?? null;
  }

  /** Журнал выборов с начала игры, по порядку. */
  journal(): readonly LogEntry[] {
    return this.log;
  }

  private record(kind: LogEntry['kind'], picked: number | null, text: string) {
    const at = Date.now();
    const vars: LogEntry['vars'] = {};
    for (const name of this.varNames) {
      const v = this.getVar(name);
      // списки ink — объекты: в журнал идёт их текст, иначе файл не прочитать без inkjs
      vars[name] = typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string' ? v : String(v);
    }
    const fork = this.fork;
    this.log.push({
      kind,
      at,
      knot: fork?.knot ?? null,
      chapter: this.chapter,
      thread: this.choiceThread ?? this.lastThread,
      picked,
      text,
      options: this.choices.map((c) => c.text),
      waitMs: fork ? Math.max(0, at - fork.at) : 0,
      reminders: fork?.reminders ?? 0,
      vars,
    });
  }

  /** Узел развилки по пути варианта в ink («shore.0.c-1», «ch2.night.0.3»): как узлы бота — knot или knot.stitch. */
  private knotOf(path: string | undefined): string | null {
    if (!path) return null;
    const [knot, sub] = path.split('.');
    const named = (this.story.mainContentContainer as unknown as { namedContent: Map<string, { namedContent: Map<string, unknown> }> }).namedContent;
    const container = named.get(knot);
    if (!container || !this.knots.includes(knot)) return null;
    return sub && container.namedContent.has(sub) ? `${knot}.${sub}` : knot;
  }

  getVar(name: string): unknown {
    return this.story.variablesState[name];
  }

  setVar(name: string, value: unknown) {
    this.record('set', null, `${name} = ${String(value)}`);
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
    const paywall = this.atPaywall();
    let status: { thread: string; phase: Phase; typing: boolean; pauseMs: number; realMs: number } | null = null;
    if (p && !paywall) {
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
          /** «Без пауз»: молчание не кончается само, только «пропустить до следующего». */
          manual: this.speed === Infinity,
        }
      : null;
    return {
      messages: this.messages,
      threads: this.unlocked,
      choices: this.held?.choices ?? this.choices,
      choiceThreads: [...new Set((this.held?.choices ?? this.choices).map((c) => c.thread))],
      ended: this.ended,
      chapter: this.chapter,
      /** История стоит на платной границе: номер закрытой главы, с 1. */
      locked: paywall ? { chapter: this.chapterNo + 1, free: this.freeChapters! } : null,
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
      carryChapter: this.carryChapter,
      savedAt: this.lastTick,
      chapter: this.chapter,
      renamed: this.renamed,
      mode: this.mode,
      silence: this.silence,
      waitDone: this.waitDone,
      lastRemind: this.lastRemind,
      log: this.log,
      fork: this.fork,
      held: this.held,
      startedAt: this.startedAt,
      revision: this.revision,
      chapterNo: this.chapterNo,
      locked: this.atPaywall(),
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
      // состояние ink ссылается на узлы и счётчики своей ревизии: на другой оно молча собьётся
      const saved = d.revision ?? 1;
      if (saved !== this.revision) {
        this.outdated = { from: saved, to: this.revision, mode: d.mode ?? DEFAULT_MODE };
        return false;
      }
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
      this.carryChapter = d.carryChapter;
      this.chapter = d.chapter ?? '';
      this.chapterNo = d.chapterNo ?? (this.chapter ? 1 : 0);
      this.renamed = d.renamed ?? {};
      this.mode = d.mode ?? DEFAULT_MODE;
      this.silence = d.silence ?? null;
      this.waitDone = d.waitDone ?? 0;
      this.lastRemind = d.lastRemind ?? null;
      this.log = d.log ?? [];
      this.fork = d.fork ?? null;
      this.held = d.held ?? null;
      this.startedAt = d.startedAt ?? this.startedAt;
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
