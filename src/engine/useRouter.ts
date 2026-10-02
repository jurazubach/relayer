import { useCallback, useState } from 'react';
import { FLAGS, readLocal, writeLocal } from './flags';
import { BUILTIN } from './library';
import { clearProgress } from './progress';

/**
 * Три экрана: витрина → описание истории → игра. Назад всегда на уровень выше.
 * В игре помним и открытый чат: перезагрузка возвращает ровно туда, где были.
 */
export type Route =
  | { screen: 'home' }
  | { screen: 'story'; id: string }
  | { screen: 'game'; id: string; thread?: string | null };

const ROUTE_KEY = 'relay:route';

function initialRoute(): Route {
  if (FLAGS.fresh) (FLAGS.story ? [FLAGS.story] : BUILTIN.map((s) => s.id)).forEach(clearProgress);
  if (FLAGS.story) return { screen: FLAGS.screen === 'story' ? 'story' : 'game', id: FLAGS.story };
  if (FLAGS.screen === 'home') return { screen: 'home' };
  try {
    const saved = JSON.parse(readLocal(ROUTE_KEY) ?? 'null') as Route | null;
    if (saved && (saved.screen === 'home' || saved.id)) return saved;
  } catch {
    /* сохранённого маршрута нет */
  }
  return { screen: 'home' };
}

export interface Router {
  route: Route;
  goHome: () => void;
  openStory: (id: string) => void;
  play: (id: string) => void;
  /** Запомнить, какой чат открыт внутри истории (null — список чатов). */
  rememberChat: (id: string, thread: string | null) => void;
}

export function useRouter(): Router {
  const [route, setRouteState] = useState<Route>(initialRoute);

  const setRoute = useCallback((next: Route) => {
    writeLocal(ROUTE_KEY, JSON.stringify(next));
    setRouteState(next);
  }, []);

  return {
    route,
    goHome: useCallback(() => setRoute({ screen: 'home' }), [setRoute]),
    openStory: useCallback((id: string) => setRoute({ screen: 'story', id }), [setRoute]),
    play: useCallback((id: string) => setRoute({ screen: 'game', id }), [setRoute]),
    // чат меняется часто, поэтому пишем в хранилище, но не дёргаем перерисовку маршрута
    rememberChat: useCallback((id: string, thread: string | null) => {
      writeLocal(ROUTE_KEY, JSON.stringify({ screen: 'game', id, thread }));
    }, []),
  };
}
