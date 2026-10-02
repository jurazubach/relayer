import { useEffect, useRef, useState } from 'react';
import type { Contact, Msg } from '../engine';
import { Avatar } from './Avatar';

/**
 * Уведомление о сообщении в другом чате. Встаёт в поток над экраном и сдвигает его вниз,
 * поэтому не перекрывает шапку и сообщения. Через 4 секунды плавно схлопывается.
 */
export function Notice({
  msg,
  contact,
  onOpen,
  onDone,
}: {
  msg: Msg;
  contact: Contact;
  onOpen: () => void;
  onDone: () => void;
}) {
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
    <div className={leaving ? 'notice notice--leaving' : 'notice'}>
      <button className="notice__card" onClick={onOpen} data-testid="notice">
        <Avatar contact={contact} size={36} />
        <span className="notice__body">
          <span className="notice__name">{contact.name}</span>
          <span className="notice__text">{msg.text}</span>
        </span>
      </button>
    </div>
  );
}
