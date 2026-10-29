import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { Contact, Msg } from '../engine';
import { previewText } from '../engine';
import { Avatar } from './Avatar';

const SHOW_MS = 4000;
/** Сколько показывать после того, как игрок потянул и отпустил: таймер начинается заново, но короче. */
const AFTER_DRAG_MS = 2500;
const LEAVE_MS = 250;
/** Дальше этого палец уже тянет, а не нажимает. */
const TAP_SLOP = 6;
const DISMISS_PX = 24;
/** px/мс: быстрый взмах вверх убирает уведомление и на коротком пути. */
const DISMISS_SPEED = 0.3;

/**
 * Уведомление о сообщении в другом чате — как баннер в телефоне: выезжает поверх экрана, ничего не сдвигает.
 * Нажатие открывает чат, взмах вверх убирает, само уходит через 4 секунды.
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
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;
  const timer = useRef(0);
  const drag = useRef<{ y: number; t: number; lastY: number; lastT: number; moved: boolean } | null>(null);
  const moved = useRef(false);

  const leave = () => {
    window.clearTimeout(timer.current);
    setLeaving(true);
    timer.current = window.setTimeout(() => done.current(), LEAVE_MS);
  };
  const schedule = (ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(leave, ms);
  };

  useEffect(() => {
    setLeaving(false);
    setDy(0);
    schedule(SHOW_MS);
    return () => window.clearTimeout(timer.current);
  }, [msg]);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (leaving) return;
    // пока палец на уведомлении, оно не уходит само
    window.clearTimeout(timer.current);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, t: e.timeStamp, lastY: e.clientY, lastT: e.timeStamp, moved: false };
    moved.current = false;
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const raw = e.clientY - d.y;
    if (Math.abs(raw) > TAP_SLOP) d.moved = true;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    // вниз тянется туго, как у системного баннера
    setDy(raw < 0 ? raw : raw * 0.2);
  };

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    moved.current = d.moved;
    const dist = e.clientY - d.y;
    const speed = dist / Math.max(1, e.timeStamp - d.t);
    if (d.moved && (dist < -DISMISS_PX || speed < -DISMISS_SPEED)) {
      leave();
      return;
    }
    setDy(0);
    schedule(d.moved ? AFTER_DRAG_MS : SHOW_MS);
  };

  return (
    <div className={leaving ? 'notice notice--leaving' : 'notice'}>
      <button
        className={dragging ? 'notice__card notice__card--dragging' : 'notice__card'}
        style={dy ? { transform: `translateY(${dy}px)` } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => {
          // палец тянул, а не нажимал: чат не открываем
          if (moved.current) {
            moved.current = false;
            return;
          }
          window.clearTimeout(timer.current);
          onOpen();
        }}
        data-testid="notice"
      >
        <Avatar contact={contact} size={36} />
        <span className="notice__body">
          <span className="notice__name">{contact.name}</span>
          <span className="notice__text">{previewText(msg)}</span>
        </span>
      </button>
    </div>
  );
}
