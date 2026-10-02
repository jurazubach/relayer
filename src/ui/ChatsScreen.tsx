import type { Engine, View } from '../engine';
import { formatTime } from '../engine';
import { Avatar } from './Avatar';
import { GearIcon } from './Icons';

/** Список чатов внутри истории. Назад ведёт на описание истории. */
export function ChatsScreen({
  engine,
  view,
  onOpen,
  backLabel,
  onBack,
  onDebug,
}: {
  engine: Engine;
  view: View;
  onOpen: (thread: string) => void;
  backLabel: string;
  onBack: () => void;
  onDebug: () => void;
}) {
  return (
    <div className="screen" data-testid="contacts">
      <header className="screen__header">
        <div className="screen__bar">
          <button className="btn btn--back" onClick={onBack} data-testid="back-story">
            ← {backLabel}
          </button>
          <button className="btn btn--icon" onClick={onDebug} aria-label="Панель отладки">
            <GearIcon />
          </button>
        </div>
        <h1 className="screen__title">Сообщения</h1>
      </header>

      <ul className="chat-list">
        {view.threads.length === 0 && <li className="chat-list__empty">Пока тихо. Кто-то скоро напишет.</li>}
        {view.threads.map((id) => {
          const contact = engine.contact(id);
          const msgs = view.messages.filter((m) => m.thread === id);
          const last = msgs[msgs.length - 1];
          const unread = msgs.filter((m) => m.id > (view.read[id] ?? 0) && m.kind !== 'out').length;
          const typing = view.status?.thread === id && view.status.typing;
          const waiting = view.choiceThreads.includes(id);
          return (
            <li key={id}>
              <button className="chat-row" onClick={() => onOpen(id)} data-testid={`thread-${id}`}>
                <Avatar contact={contact} />
                <span className="chat-row__body">
                  <span className="chat-row__top">
                    <span className="chat-row__name">{contact.name}</span>
                    {last && <span className="chat-row__time">{formatTime(last.at)}</span>}
                  </span>
                  <span className="chat-row__bottom">
                    <span className={typing ? 'chat-row__preview chat-row__preview--typing' : 'chat-row__preview'}>
                      {typing ? 'печатает…' : last ? (last.kind === 'out' ? 'Вы: ' : '') + last.text : ''}
                    </span>
                    {waiting && <span className="badge badge--wait">ждёт ответа</span>}
                    {!waiting && unread > 0 && <span className="badge">{unread}</span>}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <footer className="screen__footer">
        {engine.title}
        {view.chapter ? ` · ${view.chapter}` : ''}
      </footer>
    </div>
  );
}
