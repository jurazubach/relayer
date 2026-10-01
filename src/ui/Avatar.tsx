import type { Contact } from '../engine/engine';

export function Avatar({ contact, size = 44 }: { contact: Contact; size?: number }) {
  const letter = contact.name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.42, background: contact.color }}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}
