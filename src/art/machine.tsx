// Heavy war machines (HWM): a torsion bolt-thrower (Greek oxybeles, Roman scorpio) on its stand, with two crewmen: one
// winding the windlass at the rear, one laying the engine from behind. Seen from slightly above, so the bow arms of the
// two spring frames show (near arm swept back and down, far arm back and up). Facing right, ground at y = 0.
import { darken, lighten } from './color';
import { crewFigure } from './foot';
import type { Palette } from './palettes';
import { Emblem, Hi, Line2, OL, Paint, Shape, makeFig } from './parts';

/** The claw that holds the bowstring at full draw, on the rear of the slider. */
const CLAW_X = -10.4;
const CLAW_Y = -18.2;

/** A twisted sinew spring between two bronze washers. */
function Spring({ x, top, bottom, p, dark }: { x: number; top: number; bottom: number; p: Palette; dark?: boolean }) {
  const c = dark ? darken('#c9b48a', 0.25) : '#c9b48a';
  const twists: string[] = [];
  for (let y = top + 1.4; y < bottom - 0.8; y += 1.5) twists.push(`M${(x - 1.1).toFixed(2)} ${(y + 0.7).toFixed(2)} L${(x + 1.1).toFixed(2)} ${y.toFixed(2)}`);
  const metal = dark ? p.metalShade : p.metal;
  return (
    <g>
      <Shape d={`M${x - 1.2} ${top} L${x + 1.2} ${top} L${x + 1.2} ${bottom} L${x - 1.2} ${bottom} Z`} f={c} sw={0.55} />
      <path d={twists.join(' ')} stroke={darken(c, 0.35)} strokeWidth={0.4} />
      <ellipse cx={x} cy={top} rx={1.9} ry={0.75} fill={metal} stroke={OL} strokeWidth={0.5} />
      <ellipse cx={x} cy={bottom} rx={1.9} ry={0.75} fill={metal} stroke={OL} strokeWidth={0.5} />
    </g>
  );
}

/** The engine itself (stand, stock, windlass, slider with bolt, spring frame, arms and string). */
function BoltThrower({ p, i }: { p: Palette; i: number }) {
  const roman = p.kit === 'roman';
  const wood = p.wood;
  const woodShade = p.woodShade;
  const frame = roman ? p.shield : wood;
  const iron = p.iron;
  const f = makeFig(p, i);
  // arm tips (the near arm sweeps back and down, the far arm back and up)
  const near: [number, number] = [1.6, -10.6];
  const far: [number, number] = [0.4, -26.4];
  return (
    <g>
      {/* stand: far leg, post, near legs */}
      <Line2 d="M-1.6 -6.4 L-3.4 -1.4" w={1.1} c={darken(wood, 0.3)} ow={0.5} />
      <Line2 d="M-1.6 -14 L-1.6 -2.4" w={1.6} c={wood} ow={0.6} />
      <Line2 d="M-1.6 -6.4 L4.8 -0.6 M-1.6 -6.4 L-8.2 -0.6" w={1.2} c={wood} ow={0.55} />
      <Line2 d="M2.8 -2.4 L-6.2 -2.4" w={0.7} c={woodShade} ow={0.4} />
      <Shape d="M-3.4 -16.2 L0.2 -16.2 L0.2 -13.4 L-3.4 -13.4 Z" f={p.metal} sw={0.55} />
      {/* stock (case) with iron bands, and the windlass at the rear */}
      <Shape d="M-15.4 -17.2 L8.4 -19 L8.6 -16.6 L-15.2 -14.8 Z" f={wood} sw={0.7} />
      <Paint d="M-15.2 -15.6 L8.6 -17.4 L8.6 -16.6 L-15.2 -14.8 Z" f={woodShade} o={0.8} />
      <Hi d="M-15 -16.8 L8.2 -18.6" c={lighten(wood, 0.35)} w={0.45} o={0.8} />
      <path d="M-11.6 -17.5 L-11.4 -15.1 M-4.4 -18 L-4.2 -15.6 M3.4 -18.6 L3.6 -16.2" stroke={iron} strokeWidth={0.8} />
      <circle cx={-13.6} cy={-15.8} r={1.5} fill={p.metal} stroke={OL} strokeWidth={0.5} />
      <Line2 d="M-13.6 -18.6 L-13.6 -13 M-16.4 -15.8 L-10.8 -15.8" w={0.6} c={woodShade} ow={0.4} />
      <circle cx={-13.6} cy={-15.8} r={0.6} fill={OL} />
      {/* far spring and far arm */}
      <Spring x={7} top={-25.2} bottom={-13.4} p={p} dark />
      <Line2 d={`M7 -19.4 L${far[0]} ${far[1]}`} w={1.3} c={darken(wood, 0.2)} ow={0.55} />
      {/* slider with the claw, and the bolt */}
      <Shape d={`M${CLAW_X - 1} -18.4 L6.6 -19.8 L6.6 -18.8 L${CLAW_X - 1} -17.4 Z`} f={lighten(wood, 0.15)} sw={0.5} />
      <Shape d={`M${CLAW_X - 0.6} ${CLAW_Y - 1.6} L${CLAW_X + 1.2} ${CLAW_Y - 0.6} L${CLAW_X + 0.4} ${CLAW_Y + 0.2} L${CLAW_X - 0.8} ${CLAW_Y} Z`} f={iron} sw={0.45} />
      <Line2 d={`M${CLAW_X + 0.6} -19.6 L15 -20.9`} w={0.55} c={p.wood} ow={0.35} />
      <path d="M15 -21.5 L18.2 -21.1 L15.1 -20.3 Z" fill={p.ironLight} stroke={OL} strokeWidth={0.4} strokeLinejoin="round" />
      <path d={`M${CLAW_X + 0.6} -19.6 L${CLAW_X + 2.6} -20.9 L${CLAW_X + 3} -19.9 Z M${CLAW_X + 0.6} -19.6 L${CLAW_X + 2.4} -18.6 L${CLAW_X + 2.9} -19.6 Z`} fill={p.linen} stroke={OL} strokeWidth={0.3} />
      {/* frame (capitulum): stanchions, cross-bars, near spring */}
      <Shape d="M5.2 -26.2 L11.2 -26.6 L11.2 -24.8 L5.2 -24.4 Z" f={frame} sw={0.55} />
      <Shape d="M5.2 -13.4 L11.2 -13.8 L11.2 -12 L5.2 -11.6 Z" f={frame} sw={0.55} />
      <Line2 d="M5.6 -25 L5.6 -11.8 M10.8 -25.4 L10.8 -12.2" w={1.1} c={frame} ow={0.5} />
      <Spring x={8.6} top={-24.4} bottom={-12.6} p={p} />
      {/* bowstring at full draw, near arm */}
      <path d={`M${far[0]} ${far[1]} L${CLAW_X} ${CLAW_Y} L${near[0]} ${near[1]}`} fill="none" stroke={p.linen} strokeWidth={0.45} />
      <path d={`M${far[0]} ${far[1]} L${CLAW_X} ${CLAW_Y} L${near[0]} ${near[1]}`} fill="none" stroke={OL} strokeWidth={0.2} opacity={0.5} />
      <Line2 d={`M8.6 -18.4 L${near[0]} ${near[1]}`} w={1.5} c={wood} ow={0.6} />
      <circle cx={near[0]} cy={near[1]} r={0.55} fill={p.metal} stroke={OL} strokeWidth={0.35} />
      {/* the Roman scorpio's curved front shield with its sighting window */}
      {roman ? (
        <g>
          <Shape d="M11 -27.6 C12.6 -28.4 13.8 -27.6 13.8 -26 L13.6 -10.8 C12.8 -10.4 11.8 -10.4 11 -10.8 Z" f={p.shield} sw={0.6} />
          <Paint d="M11 -27.6 C11.4 -27.8 11.8 -27.9 12.2 -27.9 L12 -10.6 C11.6 -10.6 11.3 -10.7 11 -10.8 Z" f={p.shieldShade} mx={12.4} />
          <Hi d="M11.4 -26.8 C12.6 -27.6 13.4 -26.8 13.4 -25.8 L13.2 -11.4" c={p.shieldRim} w={0.5} o={1} />
          <ellipse cx={12.4} cy={-19.6} rx={0.7} ry={1.2} fill={OL} />
          <Emblem kind="rome" cx={12.4} cy={-15.4} s={0.42} f={f} c={p.shieldEmblem} />
        </g>
      ) : (
        <Hi d="M11.2 -26.6 L11.2 -24.8 M11.2 -13.8 L11.2 -12" c={p.metal} w={0.9} o={1} />
      )}
    </g>
  );
}

/** One war machine with its two crewmen, facing right, feet at (0,0). */
export function MachineFigure({ p, i }: { p: Palette; i: number }) {
  return (
    <g>
      {/* the gunner laying the engine, behind it */}
      <g transform="translate(-0.4 -2.2) scale(0.88)">
        {crewFigure(p, i + 1, { near: [8.6, -23.4], far: [6, -22.4] })}
      </g>
      <g transform="scale(1.15)"><BoltThrower p={p} i={i} /></g>
      {/* the winder at the windlass */}
      <g transform="translate(-22 0)">{crewFigure(p, i, 'crank')}</g>
    </g>
  );
}
