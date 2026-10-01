import { useEffect, useRef, useState } from 'react';
import type { Contact, Msg } from '../engine/engine';
import { Avatar } from './Avatar';

/**
 * Уведомление о сообщении в другом чате. Встаёт в поток над экраном и сдвигает его вниз,
 * поэтому не перекрывает шапку и сообщения. Через 4 секунды плавно схлопывается.
 */
export function Toast({ msg, contact, onOpen, onDone }: { msg: Msg; contact: Contact; onOpen: () => void; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    setLeaving(false);
    const hide = window.setTimeout(() => setLeaving(true), 4000);
    const remove = window.setTimeout(() => done.current(), 4250);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(remove);
    };
  }, [msg]);

  return (
    <div className={leaving ? 'toast-slot leaving' : 'toast-slot'}>
      <button className="toast" onClick={onOpen}>
        <Avatar contact={contact} size={36} />
        <span className="toast-body">
          <span className="toast-name">{contact.name}</span>
          <span className="toast-text">{msg.text}</span>
        </span>
      </button>
    </div>
  );
}
