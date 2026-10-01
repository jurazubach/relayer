import type { Engine, View } from '../engine/engine';
import { formatTime } from '../engine/engine';
import { Avatar } from './Avatar';
import { GearIcon } from './Icons';

export function ContactsScreen({
  engine,
  view,
  onOpen,
  onDebug,
}: {
  engine: Engine;
  view: View;
  onOpen: (id: string) => void;
  onDebug: () => void;
}) {
  return (
    <div className="screen">
      <header className="list-header">
        <h1>Сообщения</h1>
        <button className="icon-btn" onClick={onDebug} aria-label="Панель отладки">
          <GearIcon />
        </button>
      </header>
      <ul className="threads">
        {view.threads.length === 0 && <li className="empty">Пока тихо. Кто-то скоро напишет.</li>}
        {view.threads.map((id) => {
          const contact = engine.contact(id);
          const msgs = view.messages.filter((m) => m.thread === id);
          const last = msgs[msgs.length - 1];
          const unread = msgs.filter((m) => m.id > (view.read[id] ?? 0) && m.kind !== 'out').length;
          const typing = view.status?.thread === id && view.status.typing;
          const waiting = view.choiceThreads.includes(id);
          return (
            <li key={id}>
              <button className="thread" onClick={() => onOpen(id)}>
                <Avatar contact={contact} />
                <span className="thread-body">
                  <span className="thread-top">
                    <span className="thread-name">{contact.name}</span>
                    {last && <span className="thread-time">{formatTime(last.at)}</span>}
                  </span>
                  <span className="thread-bottom">
                    <span className={typing ? 'thread-preview typing' : 'thread-preview'}>
                      {typing ? 'печатает…' : last ? (last.kind === 'out' ? 'Вы: ' : '') + last.text : ''}
                    </span>
                    {waiting && <span className="badge wait">ждёт ответа</span>}
                    {!waiting && unread > 0 && <span className="badge">{unread}</span>}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <footer className="list-footer">
        {engine.title}
        {view.chapter ? ` · ${view.chapter}` : ''}
      </footer>
    </div>
  );
}
