import { useEffect, useRef } from 'react';
import type { Engine, View } from '../engine/engine';
import { formatDuration, formatTime } from '../engine/engine';
import { Avatar } from './Avatar';
import { BackIcon, CameraIcon, GearIcon } from './Icons';

export function ChatScreen({
  engine,
  view,
  thread,
  onBack,
  onDebug,
}: {
  engine: Engine;
  view: View;
  thread: string;
  onBack: () => void;
  onDebug: () => void;
}) {
  const contact = engine.contact(thread);
  const msgs = view.messages.filter((m) => m.thread === thread);
  const st = view.status?.thread === thread ? view.status : null;
  const typing = !!st?.typing;
  const away = !!st && !st.typing;
  const choicesHere = view.choiceThread === thread ? view.choices : [];
  const waitingElsewhere = view.choices.length > 0 && view.choiceThread !== thread;
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    engine.markRead(thread);
  }, [engine, thread, msgs.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs.length, typing, choicesHere.length]);

  const statusText = typing ? 'печатает…' : away && st && st.remainingMs > 60_000 ? 'не в сети' : 'в сети';

  return (
    <div className="screen chat">
      <header className="chat-header">
        <button className="icon-btn" onClick={onBack} aria-label="Назад к сообщениям">
          <BackIcon />
        </button>
        <Avatar contact={contact} size={36} />
        <span className="chat-title">
          <span className="chat-name">{contact.name}</span>
          <span className={typing ? 'chat-status typing' : 'chat-status'}>{statusText}</span>
        </span>
        <button className="icon-btn" onClick={onDebug} aria-label="Панель отладки">
          <GearIcon />
        </button>
      </header>

      <div className="messages">
        {msgs.map((m, i) => {
          const prev = msgs[i - 1];
          const grouped = prev && prev.kind === m.kind && m.kind !== 'sys';
          if (m.kind === 'sys') {
            return (
              <div key={m.id} className="sys">
                {m.text}
              </div>
            );
          }
          if (m.kind === 'photo') {
            return (
              <div key={m.id} className="row in">
                <figure className="photo">
                  <span className="photo-img">
                    <CameraIcon />
                  </span>
                  <figcaption>{m.text}</figcaption>
                </figure>
              </div>
            );
          }
          return (
            <div key={m.id} className={`row ${m.kind}${grouped ? ' grouped' : ''}`}>
              <span className="bubble">
                {m.text}
                <span className="time">{formatTime(m.at)}</span>
              </span>
            </div>
          );
        })}
        {typing && (
          <div className="row in">
            <span className="bubble dots" aria-label="печатает">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <footer className="composer">
        {choicesHere.length > 0 ? (
          <div className="choices">
            {choicesHere.map((c) => (
              <button key={c.index} className="choice" onClick={() => engine.choose(c.index)}>
                {c.text}
              </button>
            ))}
          </div>
        ) : view.ended ? (
          <p className="hint">Конец сцены. Начать заново можно в панели отладки.</p>
        ) : waitingElsewhere ? (
          <p className="hint">Тебя ждут в другом чате.</p>
        ) : away && st ? (
          <p className="hint">
            {contact.name} ответит через {formatDuration(st.remainingMs)}
            {view.speed > 1 && view.speed !== Infinity ? ` · реально ${formatDuration(st.remainingMs / view.speed)}` : ''}
          </p>
        ) : (
          <p className="hint">…</p>
        )}
      </footer>
    </div>
  );
}
