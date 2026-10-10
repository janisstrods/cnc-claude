// The abstracted battle map of a history: terrain, unit blocks in each army's colours and the movement arrows of one
// phase. Units glide between phases (CSS transitions on their transforms). A flipped map is turned 180° so that the
// army the player commands is at the bottom, as on the flipped game board; labels stay upright.
import { useId } from 'react';
import type { Side } from '../../engine';
import { MAP_H, MAP_W, unitFrames, type BattleMap as MapData, type MapFeature, type MapUnit, type Pt, type UnitFrame, type UnitKind } from '../../history';

/** The colours of one army on the map. */
export interface MapColors {
  fill: string;
  dark: string;
}

const SIZES: Record<UnitKind, [number, number]> = {
  foot: [110, 26],
  light: [80, 14],
  warband: [110, 30],
  horse: [64, 22],
  lighthorse: [56, 16],
  elephants: [54, 22],
  chariots: [54, 20],
  camels: [54, 20],
  machines: [36, 16],
};

/** A unit's block size in map units. */
export function unitSize(u: MapUnit): [number, number] {
  const [w, h] = SIZES[u.kind];
  return [u.w ?? w, u.h ?? h];
}

/** Names of the unit kinds, for the legend. */
export const KIND_NAMES: Record<UnitKind, string> = {
  foot: 'Formed foot',
  light: 'Light troops',
  warband: 'Warband',
  horse: 'Cavalry',
  lighthorse: 'Light cavalry',
  elephants: 'Elephants',
  chariots: 'Chariots',
  camels: 'Camels',
  machines: 'War machines',
};

const f1 = (v: number) => Math.round(v * 10) / 10;
const fp = (p: Pt) => `${f1(p[0])},${f1(p[1])}`;

/** A smooth curve through the points (Catmull–Rom as cubic Béziers); closed for areas. */
export function smoothPath(pts: Pt[], closed = false): string {
  if (pts.length < 2) return '';
  if (pts.length === 2 && !closed) return `M${fp(pts[0])} L${fp(pts[1])}`;
  const n = pts.length;
  const P = closed ? [pts[n - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[n - 1]];
  let d = `M${fp(P[1])}`;
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${fp(c1)} ${fp(c2)} ${fp(p2)}`;
  }
  return closed ? `${d} Z` : d;
}

function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return 0;
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The symbol inside a unit block, centred on 0,0 in a w × h block. */
export function UnitGlyph({ kind, w, h, color }: { kind: UnitKind; w: number; h: number; color: string }) {
  const x = w / 2 - 1;
  const y = h / 2 - 1;
  const s = { stroke: color, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const };
  switch (kind) {
    case 'foot':
    case 'warband':
      return <path d={`M${-x},${-y} L${x},${y} M${-x},${y} L${x},${-y}`} {...s} />;
    case 'light': {
      const n = Math.max(2, Math.round(w / 18));
      return (
        <g fill={color}>
          {Array.from({ length: n }, (_, i) => <circle key={i} cx={-w / 2 + (w / n) * (i + 0.5)} cy={0} r={Math.min(3, h / 4)} />)}
        </g>
      );
    }
    case 'horse':
      return <path d={`M${-x},${y} L${x},${-y}`} {...s} />;
    case 'lighthorse':
      return (
        <g>
          <path d={`M${-x},${y} L${x},${-y}`} {...s} />
          <circle cx={-w / 4} cy={-h / 6} r={2.2} fill={color} />
          <circle cx={w / 4} cy={h / 6} r={2.2} fill={color} />
        </g>
      );
    case 'elephants':
      // an elephant in profile: body, head, trunk, legs
      return (
        <g fill={color} transform={`scale(${Math.min(w / 54, h / 22)})`}>
          <ellipse cx={-4} cy={-1} rx={11} ry={6} />
          <circle cx={9} cy={-3} r={4.6} />
          <path d="M12.5 -1.5 Q16 3 13.5 8" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          <path d="M-11 3 V8 M-6 4 V8 M-1 4 V8 M3 3 V8" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
        </g>
      );
    case 'chariots':
      return (
        <g {...s} transform={`scale(${Math.min(w / 54, h / 20)})`}>
          <circle cx={-6} cy={0} r={6.5} />
          <path d="M-6 -6.5 V6.5 M-12.5 0 H0.5 M0.5 0 H17" />
        </g>
      );
    case 'camels':
      return (
        <g {...s} transform={`scale(${Math.min(w / 54, h / 20)})`}>
          <path d="M-15 6 Q-14 -4 -6 -3 Q-2 -10 3 -3 L9 -3 L12 -8 L15 -7" />
          <path d="M-11 6 V2 M7 6 V0" />
        </g>
      );
    case 'machines':
      return <path d={`M${-x + 2},${y} L0,${-y} L${x - 2},${y} Z`} fill={color} />;
  }
}

function Feature({ t, uid, tp }: { t: MapFeature; uid: string; tp: (p: Pt) => Pt }) {
  switch (t.kind) {
    case 'river': {
      const pts = t.points.map(tp);
      const w = t.width ?? 14;
      const d = smoothPath(pts);
      return (
        <g className="hm-river">
          <path d={d} stroke="#6f95b2" strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d={d} stroke="#a9c6d8" strokeWidth={w * 0.42} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    }
    case 'road':
      return <path className="hm-road" d={smoothPath(t.points.map(tp))} />;
    case 'town':
    case 'camp': {
      const [x, y] = tp(t.at);
      const s = t.size ?? (t.kind === 'town' ? 26 : 34);
      if (t.kind === 'camp') return <rect className="hm-camp" x={x - s} y={y - s * 0.65} width={s * 2} height={s * 1.3} rx={4} />;
      const tw = 7;
      return (
        <g className="hm-town">
          <rect x={x - s} y={y - s * 0.8} width={s * 2} height={s * 1.6} />
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy]) => (
            <rect key={`${dx}${dy}`} className="hm-tower" x={x + dx * s - tw / 2} y={y + dy * s * 0.8 - tw / 2} width={tw} height={tw} />
          ))}
        </g>
      );
    }
    case 'label':
      return null;
    default: {
      const d = smoothPath(t.points.map(tp), true);
      return (
        <g className={`hm-area hm-${t.kind}`}>
          <path d={d} className="hm-area-fill" />
          <path d={d} fill={`url(#${uid}-${t.kind})`} />
        </g>
      );
    }
  }
}

/** Where a feature's name goes: beside a river's middle (along it), under a town or camp, at an area's centre. */
function featureLabel(t: MapFeature, tp: (p: Pt) => Pt): { x: number; y: number; angle: number; text: string; cls: string } | null {
  if (t.kind === 'label') {
    const [x, y] = tp(t.at);
    return { x, y, angle: 0, text: t.text, cls: 'hm-label' };
  }
  if (!t.label) return null;
  if (t.kind === 'town' || t.kind === 'camp') {
    const [x, y] = tp(t.at);
    const s = t.size ?? (t.kind === 'town' ? 26 : 34);
    return { x, y: y + s * 0.8 + 17, angle: 0, text: t.label, cls: 'hm-label hm-label-place' };
  }
  const pts = t.points.map(tp);
  if (t.kind === 'river' || t.kind === 'road') {
    const i = Math.max(1, Math.floor(pts.length / 2));
    const [a, b] = [pts[i - 1], pts[i]];
    let angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    if (angle > 90) angle -= 180;
    if (angle <= -90) angle += 180;
    const rad = (angle * Math.PI) / 180;
    const off = (t.kind === 'river' ? (t.width ?? 14) / 2 : 3) + 9;
    const mx = (a[0] + b[0]) / 2 + Math.sin(rad) * off;
    const my = (a[1] + b[1]) / 2 - Math.cos(rad) * off;
    return { x: mx, y: my, angle, text: t.label, cls: `hm-label ${t.kind === 'river' ? 'hm-label-water' : ''}` };
  }
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const water = t.kind === 'sea' || t.kind === 'lake';
  return { x: Math.min(MAP_W - 60, Math.max(60, cx)), y: Math.min(MAP_H - 14, Math.max(24, cy)), angle: 0, text: t.label, cls: `hm-label ${water ? 'hm-label-water' : ''}` };
}

const AREA_ORDER: MapFeature['kind'][] = ['fields', 'marsh', 'woods', 'hills', 'lake', 'sea', 'river', 'road', 'camp', 'town', 'label'];

/** A unit's block on screen: centre, rotation and axis-aligned half-extents. */
interface Placed {
  f: UnitFrame;
  x: number;
  y: number;
  r: number;
  ex: number;
  ey: number;
}

function placeUnit(f: UnitFrame, flipped: boolean): Placed {
  const x = flipped ? MAP_W - f.pos[0] : f.pos[0];
  const y = flipped ? MAP_H - f.pos[1] : f.pos[1];
  const r = (f.pos[2] ?? 0) + (flipped ? 180 : 0);
  const [w, h] = unitSize(f.unit);
  const rad = (r * Math.PI) / 180;
  const [c, s] = [Math.abs(Math.cos(rad)), Math.abs(Math.sin(rad))];
  return { f, x, y, r, ex: (w * c + h * s) / 2, ey: (w * s + h * c) / 2 };
}

/** Estimated size of a unit label (18-unit EB Garamond semibold). */
const LABEL_H = 18;
const labelW = (text: string) => text.length * 8.6 + 6;

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/**
 * Where each unit's label goes (the centre of its box): on the side away from the enemy if that is free, else below or
 * above, right, left, and on the block itself as a last resort. Free = clear of every other visible block, of the labels
 * already placed and of the field's edge.
 */
export function placeLabels(units: Placed[], displayedTop: Side): Map<string, Pt> {
  const out = new Map<string, Pt>();
  const blocks = units.filter((u) => u.f.visible).map((u) => ({ id: u.f.unit.id, box: { x0: u.x - u.ex - 2, y0: u.y - u.ey - 2, x1: u.x + u.ex + 2, y1: u.y + u.ey + 2 } }));
  const taken: Box[] = [];
  for (const u of units) {
    const text = u.f.unit.label;
    if (!text) continue;
    const lw = labelW(text);
    const above: Pt = [u.x, u.y - u.ey - 4 - LABEL_H / 2];
    const below: Pt = [u.x, u.y + u.ey + 4 + LABEL_H / 2];
    const tries: Pt[] = [
      ...(u.f.unit.side === displayedTop ? [above, below] : [below, above]),
      [u.x + u.ex + 6 + lw / 2, u.y],
      [u.x - u.ex - 6 - lw / 2, u.y],
    ];
    const boxOf = ([cx, cy]: Pt): Box => ({ x0: cx - lw / 2, y0: cy - LABEL_H / 2, x1: cx + lw / 2, y1: cy + LABEL_H / 2 });
    const free = (b: Box) =>
      b.x0 >= 2 && b.x1 <= MAP_W - 2 && b.y0 >= 2 && b.y1 <= MAP_H - 2 &&
      !blocks.some((o) => o.id !== u.f.unit.id && overlaps(b, o.box)) &&
      !taken.some((t) => overlaps(b, t));
    const at = !u.f.visible ? tries[0] : tries.find((p) => free(boxOf(p))) ?? [u.x, u.y];
    if (u.f.visible) taken.push(boxOf(at));
    out.set(u.f.unit.id, at);
  }
  return out;
}

function UnitBlock({ p, colors, uid }: { p: Placed; colors: Record<Side, MapColors>; uid: string }) {
  const { unit, broken, visible } = p.f;
  const [w, h] = unitSize(unit);
  const c = colors[unit.side];
  const glyph = luminance(c.fill) > 0.42 ? '#2b1d12' : '#f6ecd2';
  const loose = unit.kind === 'warband' || unit.kind === 'lighthorse';
  return (
    <g className={`hm-unit${broken ? ' is-broken' : ''}${visible ? '' : ' is-hidden'}`} style={{ transform: `translate(${f1(p.x)}px, ${f1(p.y)}px)` }} data-unit={unit.id}>
      <g className="hm-unit-body" style={{ transform: `rotate(${p.r}deg)` }}>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={loose ? h / 2.4 : 2} fill={c.fill} stroke={c.dark} strokeWidth={2} />
        <UnitGlyph kind={unit.kind} w={w} h={h} color={glyph} />
        {broken && <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={loose ? h / 2.4 : 2} fill={`url(#${uid}-broken)`} stroke="none" />}
      </g>
    </g>
  );
}

function Arrow({ pts, color, dark, dashed }: { pts: Pt[]; color: string; dark: string; dashed: boolean }) {
  const n = pts.length;
  const tip = pts[n - 1];
  const prev = pts[n - 2];
  const len = Math.hypot(tip[0] - prev[0], tip[1] - prev[1]) || 1;
  const dir: Pt = [(tip[0] - prev[0]) / len, (tip[1] - prev[1]) / len];
  const head = 24;
  const half = 13;
  const base: Pt = [tip[0] - dir[0] * head, tip[1] - dir[1] * head];
  const shaft = [...pts.slice(0, -1), [tip[0] - dir[0] * head * 0.8, tip[1] - dir[1] * head * 0.8] as Pt];
  const d = smoothPath(shaft);
  const headPts: Pt[] = [tip, [base[0] - dir[1] * half, base[1] + dir[0] * half], [base[0] + dir[1] * half, base[1] - dir[0] * half]];
  return (
    <g className="hm-arrow">
      <path d={d} stroke="#f3e8cb" strokeWidth={12} fill="none" strokeLinecap="round" opacity={0.75} />
      <path d={d} stroke={color} strokeWidth={7} fill="none" strokeLinecap={dashed ? 'butt' : 'round'} strokeDasharray={dashed ? '14 9' : undefined} />
      <polygon points={headPts.map(fp).join(' ')} fill={color} stroke={dark} strokeWidth={1.5} strokeLinejoin="round" />
    </g>
  );
}

/** The map of a history in one phase. */
export function BattleMap({ map, phase, colors, flipped = false, label }: { map: MapData; phase: number; colors: Record<Side, MapColors>; flipped?: boolean; label?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const tp = (p: Pt): Pt => (flipped ? [MAP_W - p[0], MAP_H - p[1]] : p);
  const displayedTop: Side = flipped ? 'bottom' : 'top';
  const terrain = [...map.terrain].sort((a, b) => AREA_ORDER.indexOf(a.kind) - AREA_ORDER.indexOf(b.kind));
  const ph = map.phases[Math.min(phase, map.phases.length - 1)];
  const placed = unitFrames(map, phase).map((f) => placeUnit(f, flipped));
  const labelAt = placeLabels(placed, displayedTop);
  const labels = terrain.map((t) => featureLabel(t, tp)).filter((l) => l !== null);
  const north = map.north === undefined ? undefined : (map.north + (flipped ? 180 : 0)) % 360;
  return (
    <svg className="hm-map" viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label={label ?? `Battle map: ${ph?.title ?? ''}`}>
      <defs>
        <clipPath id={`${uid}-field`}><rect width={MAP_W} height={MAP_H} /></clipPath>
        <radialGradient id={`${uid}-vignette`} cx="50%" cy="50%" r="75%">
          <stop offset="60%" stopColor="#7a5520" stopOpacity={0} />
          <stop offset="100%" stopColor="#7a5520" stopOpacity={0.28} />
        </radialGradient>
        <pattern id={`${uid}-hills`} width={16} height={16} patternUnits="userSpaceOnUse">
          <path d="M3 12 l5 -7 M11 15 l4 -6" stroke="#7d6232" strokeWidth={1.4} opacity={0.55} />
        </pattern>
        <pattern id={`${uid}-woods`} width={24} height={24} patternUnits="userSpaceOnUse">
          <circle cx={6} cy={7} r={5} fill="#5f7038" opacity={0.75} />
          <circle cx={18} cy={18} r={5} fill="#5f7038" opacity={0.75} />
        </pattern>
        <pattern id={`${uid}-marsh`} width={26} height={18} patternUnits="userSpaceOnUse">
          <path d="M4 13 l2 -6 M7 13 v-7 M10 13 l-2 -6 M17 6 l2 -5 M20 6 v-6 M23 6 l-2 -5" stroke="#5e6d3c" strokeWidth={1.2} opacity={0.7} />
        </pattern>
        <pattern id={`${uid}-fields`} width={14} height={14} patternUnits="userSpaceOnUse">
          <circle cx={4} cy={4} r={1.3} fill="#8c7a3a" opacity={0.6} />
          <circle cx={11} cy={11} r={1.3} fill="#8c7a3a" opacity={0.6} />
        </pattern>
        {(['sea', 'lake'] as const).map((k) => (
          <pattern key={k} id={`${uid}-${k}`} width={44} height={22} patternUnits="userSpaceOnUse">
            <path d="M2 11 q5 -5 10 0 t10 0" stroke="#4f7896" strokeWidth={1.3} fill="none" opacity={0.5} />
            <path d="M24 20 q5 -5 10 0 t10 0" stroke="#4f7896" strokeWidth={1.3} fill="none" opacity={0.35} />
          </pattern>
        ))}
        <pattern id={`${uid}-broken`} width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={7} height={7} fill="#f0e3c2" opacity={0.35} />
          <path d="M0 0 V7" stroke="#2b1d12" strokeWidth={2.4} opacity={0.55} />
        </pattern>
      </defs>
      <rect className="hm-ground" width={MAP_W} height={MAP_H} />
      <g clipPath={`url(#${uid}-field)`}>
        {terrain.map((t, i) => <Feature key={i} t={t} uid={uid} tp={tp} />)}
      </g>
      <rect width={MAP_W} height={MAP_H} fill={`url(#${uid}-vignette)`} pointerEvents="none" />
      <g className="hm-labels">
        {labels.map((l, i) => (
          <text key={i} className={l.cls} x={f1(l.x)} y={f1(l.y)} textAnchor="middle" transform={l.angle ? `rotate(${f1(l.angle)} ${f1(l.x)} ${f1(l.y)})` : undefined}>{l.text}</text>
        ))}
      </g>
      <g className="hm-arrows" key={`arrows-${phase}`}>
        {(ph?.arrows ?? []).map((a, i) => (
          <Arrow key={i} pts={a.points.map(tp)} color={colors[a.side].fill} dark={colors[a.side].dark} dashed={a.style === 'retreat' || a.style === 'rout'} />
        ))}
      </g>
      <g className="hm-units">
        {placed.map((p) => <UnitBlock key={p.f.unit.id} p={p} colors={colors} uid={uid} />)}
      </g>
      <g className="hm-unit-labels">
        {placed.map((p) => {
          const at = labelAt.get(p.f.unit.id);
          if (!at) return null;
          return (
            <g key={p.f.unit.id} className={`hm-ulabel${p.f.broken ? ' is-broken' : ''}${p.f.visible ? '' : ' is-hidden'}`} style={{ transform: `translate(${f1(at[0])}px, ${f1(at[1])}px)` }}>
              <text className="hm-unit-label" y={6} textAnchor="middle">{p.f.unit.label}</text>
            </g>
          );
        })}
      </g>
      {north !== undefined && (
        <g className="hm-compass" transform={`translate(${MAP_W - 44}, 44)`}>
          <circle r={24} />
          <g transform={`rotate(${north})`}>
            <polygon points="0,-19 6,4 0,0 -6,4" className="hm-compass-n" />
            <polygon points="0,19 6,4 0,0 -6,4" className="hm-compass-s" />
            <text y={-24} textAnchor="middle" transform={`rotate(${-north} 0 -29)`}>N</text>
          </g>
        </g>
      )}
    </svg>
  );
}
