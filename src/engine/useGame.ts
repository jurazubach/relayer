import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Engine, compileInk, type Msg, type View } from './engine';
import { FLAGS } from './flags';
import type { Story } from './story';

export interface Game {
  engine: Engine | null;
  /** Ошибки компиляции сценария: показываем вместо игры. */
  errors: string[];
  view: View | null;
  /** Открытый чат или null — тогда виден список чатов. */
  open: string | null;
  openChat: (thread: string | null) => void;
  /** Сообщение, пришедшее не в тот чат, который открыт: показываем плашкой. */
  notice: Msg | null;
  openNotice: () => void;
  hideNotice: () => void;
}

/**
 * Одна игровая сессия: компиляция сценария, восстановление прогресса,
 * тиканье времени и уведомления о сообщениях в других чатах.
 */
export function useGame(story: Story): Game {
  const loaded = useMemo(() => {
    const result = compileInk(story.ink);
    if ('errors' in result) return { engine: null as Engine | null, errors: result.errors };
    const engine = new Engine(story.id, result.json);
    engine.restore();
    if (FLAGS.fast) {
      engine.speed = Infinity;
      engine.fastTyping = true;
    }
    return { engine, errors: [] as string[] };
  }, [story.id, story.ink]);

  const [open, setOpen] = useState<string | null>(null);
  const [notice, setNotice] = useState<Msg | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    setOpen(null);
    const engine = loaded.engine;
    if (!engine) return;
    const timer = window.setInterval(() => {
      const fresh = engine.tick();
      const incoming = fresh.filter((m) => m.kind !== 'out' && m.thread !== openRef.current);
      if (incoming.length) setNotice(incoming[incoming.length - 1]);
    }, 250);
    return () => window.clearInterval(timer);
  }, [loaded]);

  // открыли чат, о котором было уведомление: уведомление больше не нужно
  useEffect(() => {
    if (open) setNotice((n) => (n && n.thread === open ? null : n));
  }, [open]);

  const version = useSyncExternalStore(
    useCallback((fn: () => void) => loaded.engine?.subscribe(fn) ?? (() => {}), [loaded]),
    () => loaded.engine?.version ?? 0,
  );
  const view = useMemo(() => loaded.engine?.view() ?? null, [loaded, version]);

  return {
    engine: loaded.engine,
    errors: loaded.errors,
    view,
    open,
    openChat: setOpen,
    notice,
    openNotice: useCallback(() => {
      setNotice((n) => {
        if (n) setOpen(n.thread);
        return null;
      });
    }, []),
    hideNotice: useCallback(() => setNotice(null), []),
  };
}
