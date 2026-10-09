import { useId, type CSSProperties } from 'react';
import type { DieFace } from '../../engine/types';
import { ICON_PATHS } from './icons/paths';
import { theme } from './theme';

export type DieState = 'hit' | 'flag' | 'miss' | null;

const FACES: DieFace[] = ['light', 'medium', 'heavy', 'leader', 'flag', 'swords'];

const FACE_LABEL: Record<DieFace, string> = {
  light: 'Light (green circle)',
  medium: 'Medium (blue triangle)',
  heavy: 'Heavy (red square)',
  leader: 'Leader (helmet)',
  flag: 'Flag',
  swords: 'Crossed swords',
};

/** Symbol layer of a die, drawn into a 100x100 box. `uid` scopes the gradient ids. */
function Symbol({ face, uid }: { face: DieFace; uid: string }) {
  switch (face) {
    case 'light':
      return (
        <g>
          <circle cx="50" cy="52" r="24" fill="rgba(0,0,0,.18)" />
          <circle cx="50" cy="50" r="24" fill={`url(#${uid}gl)`} stroke="#14501d" strokeWidth="2.2" />
          <ellipse cx="44" cy="40" rx="11" ry="6" fill="#fff" opacity=".28" />
        </g>
      );
    case 'medium':
      return (
        <g>
          <path d="M50 24 L78 72 L22 72 Z" fill="rgba(0,0,0,.18)" stroke="rgba(0,0,0,.18)" strokeWidth="6" strokeLinejoin="round" transform="translate(0 2)" />
          <path d="M50 24 L78 72 L22 72 Z" fill={`url(#${uid}gm)`} stroke="#123a80" strokeWidth="6" strokeLinejoin="round" />
          <path d="M50 24 L78 72 L22 72 Z" fill="none" stroke={`url(#${uid}gm)`} strokeWidth="3.4" strokeLinejoin="round" />
          <path d="M50 34 L58 48 L42 48 Z" fill="#fff" opacity=".2" />
        </g>
      );
    case 'heavy':
      return (
        <g>
          <rect x="27" y="29" width="46" height="46" rx="4" fill="rgba(0,0,0,.18)" />
          <rect x="27" y="27" width="46" height="46" rx="4" fill={`url(#${uid}gh)`} stroke="#6e130e" strokeWidth="2.2" />
          <rect x="32" y="31" width="36" height="9" rx="3" fill="#fff" opacity=".2" />
        </g>
      );
    case 'leader':
      return <path d={ICON_PATHS.helmet} transform="translate(13 11) scale(.145)" fill={`url(#${uid}gi)`} />;
    case 'flag':
      return (
        <g>
          <path d="M33 22 C45 16 56 27 78 19 L68.5 35.5 L80 51 C59 58 46 45 33 51 Z" fill="#a8201a" stroke="#3b0c08" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M36 26 C46 21 55 30 70 26" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="27.5" y="17" width="5.5" height="69" rx="2.7" fill={`url(#${uid}gi)`} />
          <circle cx="30.2" cy="15" r="5.2" fill={`url(#${uid}gi)`} />
        </g>
      );
    case 'swords':
      return <path d={ICON_PATHS.crossedSwords} transform="translate(13 13) scale(.144)" fill={`url(#${uid}gi)`} />;
  }
}

function SymbolDefs({ uid }: { uid: string }) {
  return (
    <defs>
      <radialGradient id={`${uid}gl`} cx=".4" cy=".35" r=".75">
        <stop offset="0" stopColor="#5cc067" />
        <stop offset=".55" stopColor={theme.dice.light} />
        <stop offset="1" stopColor="#1b5e24" />
      </radialGradient>
      <linearGradient id={`${uid}gm`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4f80d6" />
        <stop offset=".6" stopColor={theme.dice.medium} />
        <stop offset="1" stopColor="#163b80" />
      </linearGradient>
      <linearGradient id={`${uid}gh`} x1="0" y1="0" x2=".3" y2="1">
        <stop offset="0" stopColor="#e05244" />
        <stop offset=".55" stopColor={theme.dice.heavy} />
        <stop offset="1" stopColor="#7d140f" />
      </linearGradient>
      <linearGradient id={`${uid}gi`} x1="0" y1="0" x2=".2" y2="1">
        <stop offset="0" stopColor="#5a4128" />
        <stop offset=".5" stopColor="#2c1d10" />
        <stop offset="1" stopColor="#140b04" />
      </linearGradient>
    </defs>
  );
}

/** A die face's symbol on its own, without the die body (e.g. the troop-class badge on cards). */
export function DieSymbol({ face, className }: { face: DieFace; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <SymbolDefs uid={uid} />
      <Symbol face={face} uid={uid} />
    </svg>
  );
}

/** An ivory battle die. `rolling` tumbles and cycles faces; `state` marks the resolved result. */
export function DieView(p: {
  face: DieFace;
  size?: number;
  rolling?: boolean;
  state?: DieState;
  /** Animation offset in seconds (desynchronises several rolling dice). */
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const size = p.size ?? 44;
  const state = p.rolling ? null : (p.state ?? null);
  const delay = p.delay ?? 0;
  const cls = ['kit-die', p.rolling ? 'is-rolling' : '', state ? `is-${state}` : '', p.className ?? ''].filter(Boolean).join(' ');
  const style = {
    '--die-size': `${size}px`,
    '--die-delay': `${delay}s`,
    ...p.style,
  } as CSSProperties;
  return (
    <div className={cls} style={style} role="img" aria-label={p.rolling ? 'Rolling die' : FACE_LABEL[p.face] + (state ? ` (${state})` : '')}>
      <div className="kit-die__shadow" />
      <div className="kit-die__body">
        <svg className="kit-die__sym" viewBox="0 0 100 100" aria-hidden="true">
          <SymbolDefs uid={uid} />
          {p.rolling ? (
            FACES.map((f, i) => (
              <g key={f} className="kit-die__layer" style={{ '--i': i } as CSSProperties}>
                <Symbol face={f} uid={uid} />
              </g>
            ))
          ) : (
            <Symbol face={p.face} uid={uid} />
          )}
        </svg>
      </div>
    </div>
  );
}

function summarise(faces: DieFace[], scoring?: boolean[]): string | null {
  if (!scoring) return null;
  const hits = scoring.filter(Boolean).length;
  const flags = faces.filter((f, i) => f === 'flag' && !scoring[i]).length;
  const parts = [`${hits} ${hits === 1 ? 'hit' : 'hits'}`];
  if (flags) parts.push(`${flags} ${flags === 1 ? 'flag' : 'flags'}`);
  return parts.join(', ');
}

/** The dice tray: a felt-lined wooden box holding the rolled dice, with a caption. */
export function DiceTray(p: {
  faces: DieFace[];
  scoring?: boolean[];
  rolling?: boolean;
  title?: string;
  subtitle?: string;
  dieSize?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const size = p.dieSize ?? 46;
  const subtitle = p.rolling ? (p.subtitle ?? 'Rolling…') : (p.subtitle ?? summarise(p.faces, p.scoring));
  const hits = p.scoring ? p.scoring.filter(Boolean).length : 0;
  return (
    <div className={`kit-tray ${p.className ?? ''}`} style={p.style}>
      {p.title || subtitle ? (
        <header className="kit-tray__head">
          {p.title ? <div className="kit-tray__title">{p.title}</div> : null}
          {subtitle ? (
            <div className={`kit-tray__sub ${!p.rolling && hits > 0 ? 'has-hits' : ''}`} aria-live="polite">
              {subtitle}
            </div>
          ) : null}
        </header>
      ) : null}
      <div className="kit-tray__felt">
        <div className="kit-tray__dice">
          {p.faces.map((f, i) => {
            let state: DieState = null;
            if (p.scoring && !p.rolling) state = p.scoring[i] ? 'hit' : f === 'flag' ? 'flag' : 'miss';
            return <DieView key={i} face={f} size={size} rolling={p.rolling} state={state} delay={-(i * 0.17) - (i % 2) * 0.05} />;
          })}
          {p.faces.length === 0 ? <div className="kit-tray__empty">No dice</div> : null}
        </div>
      </div>
    </div>
  );
}

export const ALL_DIE_FACES: readonly DieFace[] = FACES;
