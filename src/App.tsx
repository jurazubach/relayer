import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Engine, compileInk, type Msg } from './engine/engine';
import { STORIES } from './stories';
import { ContactsScreen } from './ui/ContactsScreen';
import { ChatScreen } from './ui/ChatScreen';
import { DebugSheet } from './ui/DebugSheet';
import { Toast } from './ui/Toast';

const CUSTOM_KEY = 'relay:custom-source';
const ACTIVE_KEY = 'relay:active-story';

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeLocal(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* без хранилища */
  }
}

interface Loaded {
  engine: Engine | null;
  errors: string[];
}

function loadStory(id: string, customSource: string | null): Loaded {
  const entry = STORIES.find((s) => s.id === id);
  const source = entry ? entry.source : id === 'custom' ? customSource : null;
  if (!source) return loadStory(STORIES[0].id, null);
  const result = compileInk(source);
  if ('errors' in result) return { engine: null, errors: result.errors };
  const engine = new Engine(id, result.json);
  engine.restore();
  return { engine, errors: [] };
}

export function App() {
  const [storyId, setStoryId] = useState(() => readLocal(ACTIVE_KEY) ?? STORIES[0].id);
  const [customSource, setCustomSource] = useState(() => readLocal(CUSTOM_KEY));
  const loaded = useMemo(() => loadStory(storyId, customSource), [storyId, customSource]);
  const [open, setOpen] = useState<string | null>(null);
  const [debug, setDebug] = useState(false);
  const [toast, setToast] = useState<Msg | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    setOpen(null);
    const engine = loaded.engine;
    if (!engine) return;
    const timer = window.setInterval(() => {
      const fresh = engine.tick();
      const incoming = fresh.filter((m) => m.kind !== 'out' && m.thread !== openRef.current);
      if (incoming.length) setToast(incoming[incoming.length - 1]);
    }, 250);
    return () => window.clearInterval(timer);
  }, [loaded]);

  const selectStory = useCallback((id: string) => {
    writeLocal(ACTIVE_KEY, id);
    setStoryId(id);
  }, []);

  const uploadStory = useCallback((source: string) => {
    writeLocal(CUSTOM_KEY, source);
    writeLocal('relay:custom', null);
    setCustomSource(source);
    writeLocal(ACTIVE_KEY, 'custom');
    setStoryId('custom');
  }, []);

  return (
    <div className="phone">
      {loaded.engine ? (
        <Game
          engine={loaded.engine}
          open={open}
          setOpen={setOpen}
          onDebug={() => setDebug(true)}
        />
      ) : (
        <div className="compile-error">
          <h1>Сценарий не собрался</h1>
          <ul>
            {loaded.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <button className="btn" onClick={() => selectStory(STORIES[0].id)}>
            Вернуться к «{STORIES[0].title}»
          </button>
        </div>
      )}
      {toast && loaded.engine && (
        <Toast
          msg={toast}
          contact={loaded.engine.contact(toast.thread)}
          onOpen={() => {
            setOpen(toast.thread);
            setToast(null);
          }}
          onDone={() => setToast(null)}
        />
      )}
      {debug && (
        <DebugSheet
          engine={loaded.engine}
          storyId={storyId}
          hasCustom={!!customSource}
          onSelectStory={selectStory}
          onUpload={uploadStory}
          onClose={() => setDebug(false)}
        />
      )}
    </div>
  );
}

function Game({
  engine,
  open,
  setOpen,
  onDebug,
}: {
  engine: Engine;
  open: string | null;
  setOpen: (id: string | null) => void;
  onDebug: () => void;
}) {
  const version = useSyncExternalStore(
    useCallback((fn: () => void) => engine.subscribe(fn), [engine]),
    () => engine.version,
  );
  const view = useMemo(() => engine.view(), [engine, version]);

  return open ? (
    <ChatScreen engine={engine} view={view} thread={open} onBack={() => setOpen(null)} onDebug={onDebug} />
  ) : (
    <ContactsScreen engine={engine} view={view} onOpen={setOpen} onDebug={onDebug} />
  );
}
