import type { CSSProperties, KeyboardEvent } from 'react';
import { CARD_DEFS, mirrorKind, sectionOrders } from '../../engine/cards';
import type { CardKind, SectionName, UnitClass } from '../../engine/types';
import { DieSymbol } from './Dice';
import { Icon, type IconName } from './Icon';
import { SectionMiniMap } from './SectionMiniMap';
import { GROUP_COLORS } from './theme';

export type CardSize = 'sm' | 'md' | 'lg';

/** Illustration of each non-section card (game-icons.net, CC BY 3.0). */
export const CARD_ICONS: Partial<Record<CardKind, IconName>> = {
  orderLight: 'sling',
  orderMedium: 'spartan',
  orderHeavy: 'romanShield',
  orderMounted: 'horseHead',
  inspiredL: 'caesar',
  inspiredC: 'caesar',
  inspiredR: 'caesar',
  leadershipAny: 'laurelCrown',
  clash: 'shieldEchoes',
  counterAttack: 'shieldReflect',
  darken: 'strikingArrows',
  doubleTime: 'run',
  firstStrike: 'swordWound',
  spartacus: 'swordsPower',
  lineCommand: 'spears',
  mountedCharge: 'cavalry',
  moveFireMove: 'bowman',
  rally: 'trumpetFlag',
};

/** Cards that order one troop class carry that class's die symbol. */
export const CARD_CLASS: Partial<Record<CardKind, UnitClass>> = {
  orderLight: 'light',
  orderMedium: 'medium',
  orderHeavy: 'heavy',
  moveFireMove: 'light',
};

const GOLD = ['#fff0bf', '#e6c06a', '#b38532', '#8a6020'];

const SWAP: Record<SectionName, SectionName> = { left: 'right', center: 'center', right: 'left' };

function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  return (
    <svg className={`kit-card__corner kit-card__corner--${pos}`} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M2 17 V7 Q2 2 7 2 H17" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M5.5 13 V8.5 Q5.5 5.5 8.5 5.5 H13" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity=".7" />
      <circle cx="2" cy="17.5" r="1.3" fill="currentColor" />
      <circle cx="17.5" cy="2" r="1.3" fill="currentColor" />
      <path d="M8 8 l2.2 -1 l-1 2.2 z" fill="currentColor" />
    </svg>
  );
}

export function Ornament({ className }: { className?: string }) {
  return (
    <div className={`kit-ornament ${className ?? ''}`} aria-hidden="true">
      <span className="kit-ornament__line" />
      <svg viewBox="0 0 40 10" className="kit-ornament__mark">
        <path d="M20 1 L24 5 L20 9 L16 5 Z" fill="currentColor" />
        <circle cx="11" cy="5" r="1.4" fill="currentColor" />
        <circle cx="29" cy="5" r="1.4" fill="currentColor" />
      </svg>
      <span className="kit-ornament__line kit-ornament__line--r" />
    </div>
  );
}

function HelmetBadge() {
  return (
    <div className="kit-card__helmet" title="Leaders may detach from their units">
      <Icon name="helmet" size="100%" />
    </div>
  );
}

/** A Command card face. Section cards show a mini-map with the number of orders per section. */
export function CardView(p: {
  kind: CardKind;
  size?: CardSize;
  selected?: boolean;
  disabled?: boolean;
  highlight?: boolean;
  /** Show the card from the opposite point of view (left and right swapped), e.g. for Counter Attack. */
  mirrored?: boolean;
  onClick?: () => void;
  onHover?: (h: boolean) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const size = p.size ?? 'md';
  const shownKind = p.mirrored ? mirrorKind(p.kind) : p.kind;
  const def = CARD_DEFS[shownKind];
  const g = GROUP_COLORS[def.group];
  const swapped = p.mirrored && shownKind === p.kind && def.sections.length > 0 && def.sections.length < 3;
  const sections = swapped ? def.sections.map((s) => SWAP[s]) : def.sections;
  const rawCounts = sectionOrders(shownKind);
  const counts: Partial<Record<SectionName, number>> | undefined = rawCounts
    ? Object.fromEntries(Object.entries(rawCounts).map(([s, n]) => [swapped ? SWAP[s as SectionName] : s, n]))
    : undefined;
  const icon = CARD_ICONS[shownKind];
  const troopClass = CARD_CLASS[shownKind];
  const clickable = !!p.onClick && !p.disabled;
  const textLen = def.text.length;
  const textClass = textLen > 172 ? 'kit-card__text--xlong' : textLen > 140 ? 'kit-card__text--long' : textLen < 90 ? 'kit-card__text--short' : '';

  const cls = [
    'kit-card',
    `kit-card--${size}`,
    `kit-card--${def.group}`,
    p.selected ? 'is-selected' : '',
    p.disabled ? 'is-disabled' : '',
    p.highlight ? 'is-highlight' : '',
    clickable ? 'is-clickable' : '',
    p.className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const style = {
    '--g-main': g.main,
    '--g-light': g.light,
    '--g-dark': g.dark,
    ...p.style,
  } as CSSProperties;

  const onKey = (e: KeyboardEvent) => {
    if (!clickable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      p.onClick?.();
    }
  };

  return (
    <div
      className={cls}
      style={style}
      role={p.onClick ? 'button' : 'img'}
      tabIndex={clickable ? 0 : undefined}
      aria-pressed={p.onClick ? !!p.selected : undefined}
      aria-disabled={p.disabled || undefined}
      aria-label={`${def.title}. ${def.text}`}
      onClick={clickable ? p.onClick : undefined}
      onKeyDown={onKey}
      onMouseEnter={p.onHover ? () => p.onHover!(true) : undefined}
      onMouseLeave={p.onHover ? () => p.onHover!(false) : undefined}
    >
      <div className="kit-card__face">
        <div className="kit-card__frame" />
        <Corner pos="bl" />
        <Corner pos="br" />
        <header className="kit-card__header">
          <span className="kit-card__title">{def.title}</span>
          {def.detach ? <HelmetBadge /> : null}
          {troopClass ? (
            <div className="kit-card__class" title={`Orders ${troopClass} units`}>
              <DieSymbol face={troopClass} />
            </div>
          ) : null}
          {p.mirrored ? (
            <div className="kit-card__mirror" title="Left and right swapped">
              &#8644;
            </div>
          ) : null}
        </header>
        <div className={`kit-card__art ${def.group === 'section' ? 'kit-card__art--map' : ''}`}>
          {def.group === 'section' ? (
            <div className="kit-card__map">
              <SectionMiniMap sections={sections} counts={counts} color={g.main} size={100} className="kit-card__minimap" />
              <div className="kit-card__maplabels" aria-hidden="true">
                {(['left', 'center', 'right'] as const).map((s) => (
                  <span key={s} className={sections.includes(s) ? 'is-on' : undefined}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="kit-card__rays" />
              <div className="kit-card__medallion">
                {icon ? <Icon name={icon} size="100%" gradient={[g.light, g.main, g.dark]} className="kit-card__icon" /> : null}
              </div>
              {def.group === 'leadership' ? (
                <div className="kit-card__leadmap">
                  <SectionMiniMap sections={sections} color={g.main} size={100} boxHeight={52} />
                </div>
              ) : null}
            </>
          )}
        </div>
        <Ornament className="kit-card__rule" />
        <p className={`kit-card__text ${textClass}`}>{def.text}</p>
        <footer className="kit-card__footer">
          <span>{g.label}</span>
        </footer>
      </div>
    </div>
  );
}

/** The back of a Command card. */
export function CardBack(p: { size?: CardSize; className?: string; style?: CSSProperties }) {
  const size = p.size ?? 'md';
  return (
    <div className={`kit-card kit-card--${size} kit-cardback ${p.className ?? ''}`} style={p.style} role="img" aria-label="Command card (face down)">
      <div className="kit-cardback__face">
        <div className="kit-cardback__frame" />
        <div className="kit-cardback__emblem">
          <Icon name="laurels" size="100%" gradient={GOLD} className="kit-cardback__laurels" />
          <Icon name="crossedSwords" size="100%" gradient={GOLD} className="kit-cardback__swords" />
        </div>
        <div className="kit-cardback__caption kit-cardback__caption--top">Command</div>
        <div className="kit-cardback__caption kit-cardback__caption--bottom">Ancients</div>
      </div>
    </div>
  );
}
