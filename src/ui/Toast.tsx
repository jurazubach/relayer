import { useEffect } from 'react';
import type { Contact, Msg } from '../engine/engine';
import { Avatar } from './Avatar';

export function Toast({ msg, contact, onOpen, onDone }: { msg: Msg; contact: Contact; onOpen: () => void; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 4000);
    return () => window.clearTimeout(t);
  }, [msg, onDone]);
  return (
    <button className="toast" onClick={onOpen}>
      <Avatar contact={contact} size={36} />
      <span className="toast-body">
        <span className="toast-name">{contact.name}</span>
        <span className="toast-text">{msg.text}</span>
      </span>
    </button>
  );
}
