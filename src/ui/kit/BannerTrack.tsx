import { useId, type CSSProperties } from 'react';
import type { Blocks } from '../../engine/types';
import { bannerCloth } from './theme';

/** A single swallow-tailed standard. `blockColor` (the block set of the army it belongs to) = colour of the cloth; omitted = empty slot. */
export function BannerIcon(p: { blockColor?: Blocks; size?: number; className?: string; style?: CSSProperties }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const w = p.size ?? 28;
  const h = (w * 66) / 40;
  const c = p.blockColor ? bannerCloth(p.blockColor) : null;
  const cloth = 'M7 10 H33 V55 L20 46 L7 55 Z';
  return (
    <svg className={p.className} style={p.style} viewBox="0 0 40 66" width={w} height={h} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7a5320" />
          <stop offset=".35" stopColor="#f3dc9a" />
          <stop offset=".6" stopColor="#b0823a" />
          <stop offset="1" stopColor="#6e4b1c" />
        </linearGradient>
        {c ? (
          <>
            <linearGradient id={`${uid}c`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={c.light} />
              <stop offset=".45" stopColor={c.main} />
              <stop offset="1" stopColor={c.dark} />
            </linearGradient>
            <linearGradient id={`${uid}f`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#000" stopOpacity=".3" />
              <stop offset=".22" stopColor="#fff" stopOpacity=".16" />
              <stop offset=".42" stopColor="#000" stopOpacity=".12" />
              <stop offset=".62" stopColor="#fff" stopOpacity=".1" />
              <stop offset=".85" stopColor="#000" stopOpacity=".18" />
              <stop offset="1" stopColor="#000" stopOpacity=".35" />
            </linearGradient>
          </>
        ) : null}
      </defs>
      {c ? (
        <>
          {/* pole tip + cross bar */}
          <path d="M20 0.5 L23 6.5 L20 8 L17 6.5 Z" fill={`url(#${uid}b)`} stroke="#4a3210" strokeWidth=".6" />
          <path d="M7 10 H33 V55 L20 46 L7 55 Z" fill="rgba(0,0,0,.35)" transform="translate(1 1.6)" />
          <path d={cloth} fill={`url(#${uid}c)`} stroke={c.dark} strokeWidth=".8" strokeLinejoin="round" />
          <path d={cloth} fill={`url(#${uid}f)`} />
          <path d="M9.6 12.6 H30.4 V50.2 L20 43 L9.6 50.2 Z" fill="none" stroke="#e8c45a" strokeWidth=".9" strokeLinejoin="round" opacity=".9" />
          {/* emblem: a small gilded wreath */}
          <circle cx="20" cy="26" r="6.2" fill="none" stroke="#f0cd6a" strokeWidth="1.4" strokeDasharray="2.2 1.1" />
          <circle cx="20" cy="26" r="2.3" fill="#f0cd6a" />
          <rect x="4" y="7.4" width="32" height="3.2" rx="1.6" fill={`url(#${uid}b)`} stroke="#4a3210" strokeWidth=".5" />
          <circle cx="4" cy="9" r="2.1" fill={`url(#${uid}b)`} stroke="#4a3210" strokeWidth=".5" />
          <circle cx="36" cy="9" r="2.1" fill={`url(#${uid}b)`} stroke="#4a3210" strokeWidth=".5" />
          {/* tassels */}
          <path d="M7 55 v4 M33 55 v4" stroke="#e8c45a" strokeWidth="1.3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d={cloth} fill="rgba(226,189,114,.06)" stroke="rgba(226,189,114,.55)" strokeWidth="1.1" strokeDasharray="2.6 2" strokeLinejoin="round" />
          <rect x="4" y="7.4" width="32" height="3.2" rx="1.6" fill="rgba(226,189,114,.35)" />
          <circle cx="20" cy="26" r="5.5" fill="none" stroke="rgba(226,189,114,.25)" strokeWidth="1" />
        </>
      )}
    </svg>
  );
}

/**
 * Victory banner track: `target` slots, the first `count` filled with captured banners.
 * `blockColor` is the block set of the army whose banners were captured (i.e. the opponent's), used for the cloth colour.
 */
export function BannerTrack(p: {
  count: number;
  target: number;
  blockColor: Blocks;
  label: string;
  bannerSize?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const target = Math.max(0, p.target);
  const count = Math.max(0, Math.min(p.count, target));
  const near = target > 0 && target - count === 1;
  return (
    <div
      className={`kit-banners ${near ? 'is-near' : ''} ${count >= target && target > 0 ? 'is-won' : ''} ${p.className ?? ''}`}
      style={p.style}
      role="group"
      aria-label={`${p.label}: ${p.count} of ${p.target} banners`}
    >
      <div className="kit-banners__head">
        <span className="kit-banners__label">{p.label}</span>
        <span className="kit-banners__count">
          {p.count}
          <small> / {p.target}</small>
        </span>
      </div>
      <div className="kit-banners__row">
        {Array.from({ length: target }, (_, i) => (
          <div key={i} className={`kit-banners__slot ${i < count ? 'is-filled' : ''}`}>
            {i < count ? (
              <BannerIcon blockColor={p.blockColor} size={p.bannerSize} className="kit-banner" />
            ) : (
              <BannerIcon size={p.bannerSize} className="kit-banner kit-banner--empty" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
