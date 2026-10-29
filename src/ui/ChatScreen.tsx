import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Engine, Msg, View } from '../engine';
import { formatTime } from '../engine';
import { Avatar } from './Avatar';
import { BackIcon, CameraIcon, GearIcon } from './Icons';
import { PhotoViewer } from './PhotoViewer';

/** Переписка: сообщения и варианты ответа вместо поля ввода. */
export function ChatScreen({
  engine,
  view,
  thread,
  onBack,
  onDebug,
  onOpen,
  paywall,
  images,
}: {
  engine: Engine;
  view: View;
  thread: string;
  onBack: () => void;
  onDebug: () => void;
  onOpen: (thread: string) => void;
  /** Картинки истории по имени (#photo:имя → адрес). Нет файла — пузырь-заглушка с описанием. */
  images?: Record<string, string>;
  /** Плашка платной границы: история стоит, пока продолжение закрыто. */
  paywall?: ReactNode;
}) {
  const contact = engine.contact(thread);
  const msgs = view.messages.filter((m) => m.thread === thread);
  const st = view.status?.thread === thread ? view.status : null;
  const typing = !!st?.typing;
  const away = st?.phase === 'pause';
  const choicesHere = view.choices.filter((c) => c.thread === thread);
  const waitingElsewhere = view.choices.length > 0 && choicesHere.length === 0;
  const otherThreads = view.choiceThreads.filter((t) => t !== thread);
  const endRef = useRef<HTMLDivElement>(null);
  // переписка прижата к низу: картинка догружается позже пузыря и не должна уводить последнюю реплику вверх
  const atEnd = useRef(true);
  const [viewing, setViewing] = useState<Msg | null>(null);
  const srcOf = (m: Msg) => (m.image ? images?.[m.image] : undefined);

  useEffect(() => {
    engine.markRead(thread);
  }, [engine, thread, msgs.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs.length, typing, choicesHere.length]);

  const elsewhere = otherThreads.length > 0 && (
    <div className="elsewhere">
      <span>{choicesHere.length ? 'Можно ответить и в другом чате:' : 'Тебя ждут в другом чате:'}</span>
      {otherThreads.map((t) => (
        <button key={t} className="chip" onClick={() => onOpen(t)}>
          {engine.contact(t).name} →
        </button>
      ))}
    </div>
  );

  const statusText = typing ? 'печатает…' : away && st && st.pauseMs > 60_000 ? 'не в сети' : 'в сети';

  return (
    <div className="screen" data-testid="chat">
      <header className="chat__header">
        <button className="btn btn--icon" onClick={onBack} aria-label="Назад к сообщениям">
          <BackIcon />
        </button>
        <Avatar contact={contact} size={36} />
        <span className="chat__title">
          <span className="chat__name">{contact.name}</span>
          <span className={typing ? 'chat__status chat__status--typing' : 'chat__status'}>{statusText}</span>
        </span>
        <button className="btn btn--icon" onClick={onDebug} aria-label="Панель отладки">
          <GearIcon />
        </button>
      </header>

      <div
        className="chat__messages"
        onScroll={(e) => {
          const el = e.currentTarget;
          atEnd.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {msgs.map((m, i) => {
          const prev = msgs[i - 1];
          const grouped = prev && prev.kind === m.kind && m.kind !== 'sys';

          if (m.kind === 'sys') {
            return (
              <div key={m.id} className="system-line is-rising">
                {m.text}
              </div>
            );
          }
          const src = m.kind === 'photo' ? srcOf(m) : undefined;
          if (src) {
            return (
              <div key={m.id} className="message message--in is-rising">
                <button className="photo-message photo-message--real" onClick={() => setViewing(m)} aria-label={`Открыть фото: ${m.text}`} data-testid="photo">
                  <img
                    className="photo-message__picture"
                    src={src}
                    alt={m.text}
                    onLoad={() => atEnd.current && endRef.current?.scrollIntoView({ block: 'end' })}
                  />
                  <span className="photo-message__time">{formatTime(m.at)}</span>
                </button>
              </div>
            );
          }
          if (m.kind === 'photo') {
            return (
              <div key={m.id} className="message message--in is-rising">
                <figure className="photo-message">
                  <span className="photo-message__img">
                    <CameraIcon />
                  </span>
                  <figcaption className="photo-message__caption">{m.text}</figcaption>
                </figure>
              </div>
            );
          }
          return (
            <div
              key={m.id}
              className={`message message--${m.kind}${grouped ? ' message--grouped' : ''} is-rising`}
            >
              <span className="message__bubble">
                {m.text}
                <span className="message__time">{formatTime(m.at)}</span>
              </span>
            </div>
          );
        })}

        {typing && (
          <div className="message message--in">
            <span className="message__bubble typing-dots" aria-label="печатает">
              <i className="typing-dots__dot" />
              <i className="typing-dots__dot" />
              <i className="typing-dots__dot" />
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {viewing && srcOf(viewing) && (
        <PhotoViewer
          src={srcOf(viewing)!}
          alt={viewing.text}
          sender={contact.name}
          time={formatTime(viewing.at)}
          onClose={() => setViewing(null)}
        />
      )}

      <footer className="chat__composer">
        {choicesHere.length > 0 ? (
          <div className="choices is-rising">
            {choicesHere.map((c) => (
              <button key={c.index} className="choice" onClick={() => engine.choose(c.index)}>
                {c.label ? (
                  <>
                    <span className="choice__label">{c.label}</span>
                    <span className="choice__say">{c.silent ? '' : c.text}</span>
                  </>
                ) : (
                  c.text
                )}
              </button>
            ))}
            {elsewhere}
          </div>
        ) : paywall ? (
          paywall
        ) : view.ended ? (
          <p className="chat__hint">Конец сцены. Начать заново можно в панели отладки.</p>
        ) : waitingElsewhere ? (
          elsewhere
        ) : statusText === 'не в сети' ? (
          // срок паузы игроку не называем (A-01): точное время — в панели отладки
          <p className="chat__hint">{contact.name} не в сети</p>
        ) : (
          <p className="chat__hint">…</p>
        )}
      </footer>
    </div>
  );
}
