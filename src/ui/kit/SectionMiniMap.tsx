import { useId } from 'react';
import type { SectionName } from '../../engine/types';
import { GROUP_COLORS } from './theme';

const ORDER: SectionName[] = ['left', 'center', 'right'];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

export function toRoman(n: number): string {
  return ROMAN[n] ?? String(n);
}

/**
 * Three boxes Left / Center / Right (from the viewer's own point of view); highlighted ones are filled.
 * Optional `counts` prints the number of orders (Roman numerals) inside the highlighted boxes.
 */
export function SectionMiniMap(p: {
  sections: SectionName[];
  size?: number;
  counts?: Partial<Record<SectionName, number>>;
  color?: string;
  /** Use light outlines (for dark backgrounds). */
  onDark?: boolean;
  /** Box height relative to a total width of 120 (default 66; lower = flatter boxes). */
  boxHeight?: number;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const size = p.size ?? 60;
  const w = 120;
  const h = p.boxHeight ?? 66;
  const gap = 4;
  const widths = [36, 40, 36];
  const color = p.color ?? GROUP_COLORS.section.main;
  const outline = p.onDark ? 'rgba(240, 220, 170, .62)' : 'rgba(60, 40, 20, .38)';
  const showHex = size >= 70;
  let x = 0;
  const boxes = ORDER.map((s, i) => {
    const bx = x;
    x += widths[i] + gap;
    return { s, x: bx, w: widths[i] };
  });
  return (
    <svg
      className={p.className}
      viewBox={`-2 -2 ${w + 4} ${h + 4}`}
      width={size}
      height={(size * (h + 4)) / (w + 4)}
      role="img"
      aria-label={`Sections: ${p.sections.length ? p.sections.join(', ') : 'none'}`}
    >
      <defs>
        <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={0.78} />
          <stop offset="1" stopColor={color} stopOpacity={1} />
        </linearGradient>
        <linearGradient id={`${uid}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.35} />
          <stop offset="0.45" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        {showHex ? (
          <pattern id={`${uid}h`} width="12" height="10.4" patternUnits="userSpaceOnUse">
            <path d="M3 0 L9 0 L12 5.2 L9 10.4 L3 10.4 L0 5.2 Z" fill="none" stroke="#000" strokeOpacity={0.12} strokeWidth={0.7} />
          </pattern>
        ) : null}
      </defs>
      {boxes.map((b) => {
        const on = p.sections.includes(b.s);
        const n = p.counts?.[b.s];
        return (
          <g key={b.s}>
            {on ? (
              <>
                <rect x={b.x} y={0} width={b.w} height={h} rx={5} fill={`url(#${uid}f)`} />
                {showHex ? <rect x={b.x} y={0} width={b.w} height={h} rx={5} fill={`url(#${uid}h)`} /> : null}
                <rect x={b.x} y={0} width={b.w} height={h} rx={5} fill={`url(#${uid}s)`} />
                <rect x={b.x + 0.75} y={0.75} width={b.w - 1.5} height={h - 1.5} rx={4.5} fill="none" stroke="rgba(0,0,0,.45)" strokeWidth={1.5} />
                <rect x={b.x + 2.5} y={2.5} width={b.w - 5} height={h - 5} rx={3} fill="none" stroke="rgba(255,240,200,.35)" strokeWidth={0.8} />
                {n ? (
                  <text
                    x={b.x + b.w / 2}
                    y={h / 2 + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontFamily="Cinzel, serif"
                    fontWeight={700}
                    fontSize={toRoman(n).length > 2 ? 19 : 23}
                    fill="#fbf1d6"
                    stroke="rgba(30,15,5,.55)"
                    strokeWidth={0.8}
                    paintOrder="stroke"
                    letterSpacing={-0.5}
                  >
                    {toRoman(n)}
                  </text>
                ) : null}
              </>
            ) : (
              <>
                {showHex ? <rect x={b.x} y={0} width={b.w} height={h} rx={5} fill={`url(#${uid}h)`} opacity={0.6} /> : null}
                <rect
                  x={b.x + 0.75}
                  y={0.75}
                  width={b.w - 1.5}
                  height={h - 1.5}
                  rx={4.5}
                  fill={p.onDark ? 'rgba(255,240,200,.06)' : 'rgba(0,0,0,.04)'}
                  stroke={outline}
                  strokeWidth={1.5}
                  strokeDasharray="3.5 2.5"
                />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
