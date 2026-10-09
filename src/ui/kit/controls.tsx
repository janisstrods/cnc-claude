import { useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Ornament } from './CardView';

/** Cinzel button. primary = crimson & gold, secondary = parchment & bronze, ghost = outlined. */
export function Button(p: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  const { variant = 'primary', className, type, children, ...rest } = p;
  return (
    <button {...rest} type={type ?? 'button'} className={`kit-btn kit-btn--${variant} ${className ?? ''}`}>
      <span className="kit-btn__label">{children}</span>
    </button>
  );
}

/** A framed panel: dark tooled leather (default) or parchment, with an optional engraved title. */
export function Panel(p: {
  title?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  variant?: 'leather' | 'parchment';
}) {
  const variant = p.variant ?? 'leather';
  return (
    <section className={`kit-panel kit-panel--${variant} ${p.className ?? ''}`} style={p.style}>
      <div className={`kit-panel__inner ${variant === 'leather' ? 'kit-leather' : 'kit-parchment'}`}>
        <span className="kit-panel__stud kit-panel__stud--tl" />
        <span className="kit-panel__stud kit-panel__stud--tr" />
        <span className="kit-panel__stud kit-panel__stud--bl" />
        <span className="kit-panel__stud kit-panel__stud--br" />
        {p.title ? (
          <header className="kit-panel__head">
            <Ornament className="kit-panel__orn" />
            <h3 className="kit-panel__title">{p.title}</h3>
            <Ornament className="kit-panel__orn" />
          </header>
        ) : null}
        <div className="kit-panel__body">{p.children}</div>
      </div>
    </section>
  );
}

/** A centred parchment dialog over a dimmed table. Escape / backdrop click call onClose. */
export function Modal(p: { open: boolean; title?: string; children: ReactNode; onClose?: () => void; width?: number | string }) {
  const { open, onClose } = p;
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const node = (
    <div
      className="kit-modal"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="kit-modal__box" role="dialog" aria-modal="true" aria-label={p.title} style={{ width: p.width }}>
        <div className="kit-modal__inner kit-parchment">
          {onClose ? (
            <button type="button" className="kit-modal__close" onClick={onClose} aria-label="Close">
              &times;
            </button>
          ) : null}
          {p.title ? (
            <header className="kit-modal__head">
              <h2 className="kit-modal__title">{p.title}</h2>
              <Ornament className="kit-modal__orn" />
            </header>
          ) : null}
          <div className="kit-modal__body">{p.children}</div>
        </div>
      </div>
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(node, document.body) : node;
}

/**
 * A floating tooltip card near (x, y). With position 'fixed' (default) x/y are viewport (client)
 * coordinates and the tooltip flips to stay on screen; with 'absolute' they are relative to the
 * nearest positioned ancestor.
 */
export function Tooltip(p: {
  x: number;
  y: number;
  children: ReactNode;
  position?: 'fixed' | 'absolute';
  offset?: number;
  /** 'bare' drops the dark backing (e.g. to float a CardView). */
  variant?: 'dark' | 'bare';
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const position = p.position ?? 'fixed';
  const off = p.offset ?? 16;
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: p.x + off, top: p.y + off });
  useLayoutEffect(() => {
    let left = p.x + off;
    let top = p.y + off;
    const el = ref.current;
    if (el && position === 'fixed' && typeof window !== 'undefined') {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (left + w > window.innerWidth - 8) left = Math.max(8, p.x - off - w);
      if (top + h > window.innerHeight - 8) top = Math.max(8, p.y - off - h);
    }
    setPos((cur) => (cur.left === left && cur.top === top ? cur : { left, top }));
  }, [p.x, p.y, off, position]);
  return (
    <div ref={ref} className={`kit-tooltip ${p.variant === 'bare' ? 'kit-tooltip--bare' : ''} ${p.className ?? ''}`} role="tooltip" style={{ position, left: pos.left, top: pos.top, ...p.style }}>
      {p.children}
    </div>
  );
}

/** Full-bleed tabletop background (dark wood). */
export function Tabletop(p: { children?: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`kit-table ${p.className ?? ''}`} style={p.style}>
      {p.children}
    </div>
  );
}
