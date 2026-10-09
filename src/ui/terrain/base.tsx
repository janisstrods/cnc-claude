// Grassland base, hex grid, section dividers and the wooden frame with army plaques.
import { BOARD_H, BOARD_MARGIN, BOARD_W } from '../geometry';
import { blobPath } from './field';
import { corner, DIRS, edgeCorners, fmt, neighborRC, screenDir, type PaintCtx } from './hexmath';
import { rng } from './noise';
import { P } from './palette';

/** <defs> content shared by the grass base: gradients and tuft patterns. */
export function grassDefs(id: (s: string) => string): JSX.Element {
  const R = rng(17);
  const tufts = (n: number, size: number, color: string, op: number, seed: number) => {
    const Q = rng(seed);
    let d = '';
    for (let k = 0; k < n; k++) {
      const x = Q() * size;
      const y = Q() * size;
      const h = 3 + Q() * 3;
      d += `M${fmt(x)},${fmt(y)}l${fmt(-1.6 - Q())},${fmt(-h * 0.8)}M${fmt(x)},${fmt(y)}l${fmt((Q() - 0.5) * 0.8)},${fmt(-h)}M${fmt(x)},${fmt(y)}l${fmt(1.6 + Q())},${fmt(-h * 0.75)}`;
    }
    return <path d={d} fill="none" stroke={color} strokeWidth={0.8} strokeLinecap="round" opacity={op} />;
  };
  const dots = (n: number, size: number, color: string, seed: number) => {
    const Q = rng(seed);
    let d = '';
    for (let k = 0; k < n; k++) {
      const x = Q() * size;
      const y = Q() * size;
      d += `M${fmt(x)},${fmt(y)}h1.2`;
    }
    return <path d={d} fill="none" stroke={color} strokeWidth={1.2} strokeLinecap="round" opacity={0.55} />;
  };
  void R;
  return (
    <>
      <linearGradient id={id('grass')} x1="0" y1="0" x2="0.25" y2="1">
        <stop offset="0" stopColor={P.grassTop} />
        <stop offset="0.5" stopColor={P.grass} />
        <stop offset="1" stopColor={P.grassBottom} />
      </linearGradient>
      {(
        [
          ['blotL', P.grassLight, 0.5],
          ['blotD', P.grassDark, 0.3],
          ['blotO', P.grassOchre, 0.5],
        ] as const
      ).map(([k, c, o]) => (
        <radialGradient key={k} id={id(k)}>
          <stop offset="0" stopColor={c} stopOpacity={o} />
          <stop offset="0.55" stopColor={c} stopOpacity={o * 0.55} />
          <stop offset="1" stopColor={c} stopOpacity={0} />
        </radialGradient>
      ))}
      <pattern id={id('tuftA')} width={137} height={137} patternUnits="userSpaceOnUse">
        {tufts(16, 137, P.tuftDark, 0.5, 3)}
        {dots(10, 137, P.tuftDark, 5)}
      </pattern>
      <pattern id={id('tuftB')} width={89} height={89} patternUnits="userSpaceOnUse" patternTransform="rotate(17)">
        {tufts(7, 89, P.tuftLight, 0.55, 8)}
        {dots(5, 89, '#e9dfa6', 9)}
      </pattern>
      <linearGradient id={id('wood')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={P.woodLight} />
        <stop offset="0.05" stopColor={P.wood} />
        <stop offset="0.95" stopColor={P.wood} />
        <stop offset="1" stopColor={P.woodDark} />
      </linearGradient>
      <linearGradient id={id('plaque')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f1e4bd" />
        <stop offset="1" stopColor={P.plaqueDark} />
      </linearGradient>
    </>
  );
}

export function GrassBase({ id }: { id: (s: string) => string }) {
  const R = rng(2024);
  const blots: JSX.Element[] = [];
  const kinds = ['blotL', 'blotD', 'blotO', 'blotL', 'blotD'];
  for (let k = 0; k < 46; k++) {
    const x = BOARD_MARGIN + R() * (BOARD_W - 2 * BOARD_MARGIN);
    const y = BOARD_MARGIN + R() * (BOARD_H - 2 * BOARD_MARGIN);
    const rx = 60 + R() * 140;
    const ry = rx * (0.35 + R() * 0.4);
    const rot = (R() - 0.5) * 50;
    blots.push(
      <ellipse
        key={k}
        cx={fmt(x)}
        cy={fmt(y)}
        rx={fmt(rx)}
        ry={fmt(ry)}
        transform={`rotate(${fmt(rot)} ${fmt(x)} ${fmt(y)})`}
        fill={`url(#${id(kinds[k % kinds.length])})`}
      />,
    );
  }
  // painted brush dabs: small soft strokes of light/dark grass
  let dabL = '';
  let dabD = '';
  for (let k = 0; k < 140; k++) {
    const x = BOARD_MARGIN + R() * (BOARD_W - 2 * BOARD_MARGIN);
    const y = BOARD_MARGIN + R() * (BOARD_H - 2 * BOARD_MARGIN);
    const s = 5 + R() * 9;
    const b = blobPath(x, y, s, s * 0.45, R, 6, 0.3, (R() - 0.5) * 0.8);
    if (k % 2) dabL += b;
    else dabD += b;
  }
  const r = { x: 0, y: 0, width: BOARD_W, height: BOARD_H };
  return (
    <g className="grass">
      <rect {...r} fill={`url(#${id('grass')})`} />
      {blots}
      <path d={dabL} fill={P.grassLight} opacity={0.16} />
      <path d={dabD} fill={P.grassDark} opacity={0.14} />
      <rect {...r} fill={`url(#${id('tuftA')})`} />
      <rect {...r} fill={`url(#${id('tuftB')})`} />
    </g>
  );
}

/** Hex outlines: every shared edge drawn once. */
export function HexGrid({ ctx }: { ctx: PaintCtx }) {
  let d = '';
  for (const h of ctx.hexes) {
    for (const dir of DIRS) {
      const [nr, nc] = neighborRC(h.r, h.c, dir);
      const n = ctx.get(nr, nc);
      if (n && n.id < h.id) continue;
      const [i, j] = edgeCorners(screenDir(dir, ctx.flipped));
      const a = corner(h, i);
      const b = corner(h, j);
      d += `M${fmt(a.x)},${fmt(a.y)}L${fmt(b.x)},${fmt(b.y)}`;
    }
  }
  return (
    <g className="hexgrid" fill="none" strokeLinecap="round">
      <path d={d} stroke="rgba(255,246,214,0.16)" strokeWidth={1.1} transform="translate(0.9 1)" />
      <path d={d} stroke="rgba(42,36,16,0.36)" strokeWidth={1.1} />
    </g>
  );
}

export function SectionDividers({ x1, x2 }: { x1: number; x2: number }) {
  const y0 = BOARD_MARGIN;
  const y1 = BOARD_H - BOARD_MARGIN;
  return (
    <g className="dividers" fill="none" strokeLinecap="round">
      {[x1, x2].map((x, i) => (
        <g key={i}>
          <line x1={x} y1={y0} x2={x} y2={y1} stroke="rgba(38,30,12,0.4)" strokeWidth={3.6} strokeDasharray="5 6" />
          <line x1={x} y1={y0} x2={x} y2={y1} stroke="rgba(255,249,226,0.85)" strokeWidth={1.8} strokeDasharray="5 6" />
        </g>
      ))}
    </g>
  );
}

export function Frame({
  id,
  outline,
  x1,
  x2,
  topLabel,
  bottomLabel,
}: {
  id: (s: string) => string;
  outline: string;
  x1: number;
  x2: number;
  topLabel?: string;
  bottomLabel?: string;
}) {
  const W = BOARD_W;
  const H = BOARD_H;
  const m = BOARD_MARGIN;
  const R = rng(55);
  // wood grain inside the four bands
  let grain = '';
  let grainDark = '';
  const hband = (y0: number) => {
    for (let k = 0; k < 9; k++) {
      const y = y0 + 3 + R() * (m - 6);
      const amp = 0.6 + R() * 1.4;
      let d = `M0,${fmt(y)}`;
      for (let x = 0; x <= W; x += 60) d += `Q${fmt(x + 30)},${fmt(y + (R() - 0.5) * 2 * amp)} ${fmt(x + 60)},${fmt(y + (R() - 0.5) * amp)}`;
      if (k % 3 === 0) grainDark += d;
      else grain += d;
    }
  };
  const vband = (x0: number) => {
    for (let k = 0; k < 9; k++) {
      const x = x0 + 3 + R() * (m - 6);
      const amp = 0.6 + R() * 1.4;
      let d = `M${fmt(x)},0`;
      for (let y = 0; y <= H; y += 60) d += `Q${fmt(x + (R() - 0.5) * 2 * amp)},${fmt(y + 30)} ${fmt(x + (R() - 0.5) * amp)},${fmt(y + 60)}`;
      if (k % 3 === 0) grainDark += d;
      else grain += d;
    }
  };
  hband(0);
  hband(H - m);
  vband(0);
  vband(W - m);
  const frameD = `M0,0H${fmt(W)}V${fmt(H)}H0Z${outline}`;
  const left = (m + x1) / 2;
  const right = (x2 + W - m) / 2;
  const capStyle = { fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 4, fontWeight: 700 } as const;
  const caption = (txt: string, x: number, y: number, rot: boolean) => (
    <text
      x={fmt(x)}
      y={fmt(y)}
      textAnchor="middle"
      dominantBaseline="central"
      fill="rgba(231,208,160,0.62)"
      transform={rot ? `rotate(180 ${fmt(x)} ${fmt(y)})` : undefined}
      style={capStyle}
    >
      {txt}
    </text>
  );
  const plaque = (label: string, cy: number) => {
    const fs = 16;
    const w = Math.max(120, label.length * fs * 0.78 + 46);
    const h = 25;
    const x = W / 2 - w / 2;
    return (
      <g>
        <rect x={fmt(x + 1.5)} y={fmt(cy - h / 2 + 2)} width={fmt(w)} height={h} rx={3} fill="rgba(0,0,0,0.45)" />
        <rect x={fmt(x)} y={fmt(cy - h / 2)} width={fmt(w)} height={h} rx={3} fill={`url(#${id('plaque')})`} stroke="#6b4f2c" strokeWidth={1.4} />
        <rect x={fmt(x + 3)} y={fmt(cy - h / 2 + 3)} width={fmt(w - 6)} height={h - 6} rx={2} fill="none" stroke="rgba(107,79,44,0.55)" strokeWidth={0.8} />
        {[x + 7.5, x + w - 7.5].map((sx, i) => (
          <circle key={i} cx={fmt(sx)} cy={fmt(cy)} r={1.9} fill="#8a6a3a" stroke="#4a3520" strokeWidth={0.6} />
        ))}
        <text
          x={fmt(W / 2)}
          y={fmt(cy + 0.5)}
          textAnchor="middle"
          dominantBaseline="central"
          fill={P.ink}
          style={{ fontFamily: 'Cinzel, serif', fontSize: fs, fontWeight: 700, letterSpacing: 2.5 }}
        >
          {label.toUpperCase()}
        </text>
      </g>
    );
  };
  const markers = [x1, x2].flatMap((x, i) => [
    <path key={`t${i}`} d={`M${fmt(x)},${fmt(m - 12)}l4,6l-4,6l-4,-6z`} fill="rgba(231,208,160,0.55)" />,
    <path key={`b${i}`} d={`M${fmt(x)},${fmt(H - m + 0)}l4,6l-4,6l-4,-6z`} fill="rgba(231,208,160,0.55)" />,
  ]);
  return (
    <g className="frame">
      {/* soft shadow the frame casts onto the field */}
      <path d={outline} fill="none" stroke="rgba(30,22,8,0.22)" strokeWidth={16} />
      <path d={outline} fill="none" stroke="rgba(30,22,8,0.25)" strokeWidth={7} />
      <path d={frameD} fillRule="evenodd" fill={`url(#${id('wood')})`} />
      <path d={grain} fill="none" stroke="rgba(255,214,160,0.07)" strokeWidth={1.4} />
      <path d={grainDark} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth={1} />
      <path d={outline} fill="none" stroke="#1d140c" strokeWidth={2.2} />
      <path d={outline} fill="none" stroke="rgba(214,180,120,0.35)" strokeWidth={1} transform="translate(-0.8 -1)" />
      <rect x={1} y={1} width={W - 2} height={H - 2} fill="none" stroke="#150e08" strokeWidth={2} />
      <rect x={5.5} y={5.5} width={W - 11} height={H - 11} rx={2} fill="none" stroke={P.trim} strokeWidth={1} opacity={0.55} />
      {[
        [11, 11],
        [W - 11, 11],
        [11, H - 11],
        [W - 11, H - 11],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={3.6} fill="#8d6c3a" stroke="#3a2814" strokeWidth={0.8} />
          <circle cx={x - 0.9} cy={y - 0.9} r={1.2} fill="#e3c88e" opacity={0.8} />
        </g>
      ))}
      {markers}
      {caption('LEFT', left, H - m / 2, false)}
      {caption('RIGHT', right, H - m / 2, false)}
      {caption('LEFT', right, m / 2, true)}
      {caption('RIGHT', left, m / 2, true)}
      {topLabel && plaque(topLabel, m / 2)}
      {bottomLabel && plaque(bottomLabel, H - m / 2)}
    </g>
  );
}
