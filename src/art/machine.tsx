// Heavy war machines (HWM): a torsion bolt-thrower (Greek oxybeles, Roman scorpio) on its stand, with two crewmen: one
// winding the windlass at the rear, one laying the engine from behind. Seen from slightly above, so the bow arms of the
// two spring frames show (near arm swept back and down, far arm back and up). Facing right, ground at y = 0.
// Expansion #2: the legions' stone-throwing ballista on a braced trestle, a winder and a man carrying a stone.
import { darken, lighten } from './color';
import { crewFigure } from './foot';
import { KITS } from './kits';
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
  // the Roman scorpio: frame in the shield colour and a curved front shield
  const scorpio = warMachineOf(p) === 'scorpio';
  const wood = p.wood;
  const woodShade = p.woodShade;
  const frame = scorpio ? p.shield : wood;
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
      {scorpio ? (
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

// ---------------------------------------------------------------------------------------------
// Expansion #2: the stone-throwing ballista

/** Colours of the stone shot. */
const STONE = '#b8ae98';
const STONE_SHADE = '#7f7765';

/** A round stone with its shade and a highlight. */
function Stone({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={STONE} stroke={OL} strokeWidth={0.5} />
      <Paint d={`M${x - r * 0.75} ${y + r * 0.1} A${r * 0.8} ${r * 0.8} 0 0 0 ${x + r * 0.55} ${y + r * 0.7} A${r} ${r} 0 0 1 ${x - r * 0.75} ${y + r * 0.1} Z`} f={STONE_SHADE} o={0.7} />
      <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.28} fill={lighten(STONE, 0.45)} />
    </g>
  );
}

/** Height of the ballista's stock (its top edge) at `x`: it rises gently towards the front. */
const stockY = (x: number) => -15.6 - (x + 17) * 0.15;
const f2 = (n: number) => n.toFixed(2);

/**
 * The stone-thrower: a stock on a braced trestle, a tall frame in the shield colour round the twisted springs, heavy arms,
 * the string drawn back to the claw with a stone loaded before it, the windlass at the rear and a pile of shot in front.
 */
function Ballista({ p }: { p: Palette }) {
  const wood = p.wood;
  const woodShade = p.woodShade;
  const frame = p.shield;
  const claw: [number, number] = [-11.6, stockY(-11.6) - 0.6];
  const near: [number, number] = [0.6, -11.4];
  const far: [number, number] = [-0.8, -28.8];
  const stock = `M-17.4 ${f2(stockY(-17.4))} L12.4 ${f2(stockY(12.4))} L12.5 ${f2(stockY(12.4) + 2.6)} L-17.3 ${f2(stockY(-17.4) + 2.6)} Z`;
  return (
    <g>
      {/* the trestle: sill on the ground, two posts and their braces */}
      <Line2 d="M-13.6 -1 L9.6 -1" w={1.4} c={woodShade} ow={0.55} />
      <Line2 d={`M-8.6 -1.4 L-8.6 ${f2(stockY(-8.6) + 2)} M3.4 -1.4 L3.4 ${f2(stockY(3.4) + 2)}`} w={1.5} c={wood} ow={0.55} />
      <Line2 d="M-13 -1.2 L-8.6 -8.6 M9.2 -1.2 L3.4 -9.4 M-8.6 -6 L3.4 -6" w={1} c={wood} ow={0.5} />
      {/* far spring, far arm */}
      <Spring x={6.6} top={-31.2} bottom={-9.2} p={p} dark />
      <Line2 d={`M6.6 -20.2 L${far[0]} ${far[1]}`} w={1.6} c={darken(wood, 0.2)} ow={0.55} />
      {/* the stock with its iron bands and the trough on top */}
      <Shape d={stock} f={wood} sw={0.7} />
      <Paint d={`M-17.3 ${f2(stockY(-17.4) + 1.6)} L12.5 ${f2(stockY(12.4) + 1.6)} L12.5 ${f2(stockY(12.4) + 2.6)} L-17.3 ${f2(stockY(-17.4) + 2.6)} Z`} f={woodShade} o={0.8} />
      <Hi d={`M-17 ${f2(stockY(-17) + 0.4)} L12 ${f2(stockY(12) + 0.4)}`} c={lighten(wood, 0.35)} w={0.45} o={0.8} />
      <path d={[-12.4, -4.4, 4.2].map((x) => `M${x} ${f2(stockY(x))} L${x + 0.2} ${f2(stockY(x) + 2.6)}`).join(' ')} stroke={p.iron} strokeWidth={0.8} />
      {/* the windlass: a drum with four handspikes */}
      <circle cx={-15} cy={stockY(-15) + 2.6} r={2.1} fill={wood} stroke={OL} strokeWidth={0.55} />
      <Line2 d={`M-15 ${f2(stockY(-15) - 1.4)} L-15 ${f2(stockY(-15) + 6.6)} M-19 ${f2(stockY(-15) + 2.6)} L-11 ${f2(stockY(-15) + 2.6)}`} w={0.7} c={woodShade} ow={0.4} />
      <circle cx={-15} cy={stockY(-15) + 2.6} r={0.7} fill={p.iron} stroke={OL} strokeWidth={0.35} />
      {/* the claw holding the string, the stone before it */}
      <Shape d={`M${claw[0] - 0.8} ${f2(claw[1] - 1.4)} L${claw[0] + 1.2} ${f2(claw[1] - 0.4)} L${claw[0] + 0.4} ${f2(claw[1] + 0.6)} L${claw[0] - 1} ${f2(claw[1] + 0.4)} Z`} f={p.iron} sw={0.45} />
      {/* the frame: cross-beams and stanchions in the shield colour, round the near spring */}
      <Shape d="M4.4 -32.6 L12 -33 L12 -30.6 L4.4 -30.2 Z" f={frame} sw={0.6} />
      <Shape d="M4.4 -9.8 L12 -10.2 L12 -7.8 L4.4 -7.4 Z" f={frame} sw={0.6} />
      <Line2 d="M5 -30.4 L5 -7.8 M11.4 -30.8 L11.4 -8.2" w={1.4} c={frame} ow={0.55} />
      <Hi d="M11.8 -32.6 L11.8 -30.8 M11.8 -9.8 L11.8 -8" c={p.metal} w={0.9} o={1} />
      <Paint d="M4.4 -32.6 L5.4 -32.65 L5.4 -30.25 L4.4 -30.2 Z" f={p.shieldShade} />
      <Spring x={8.2} top={-30.4} bottom={-8.2} p={p} />
      {/* the string drawn back, the near arm, the stone on the trough */}
      <path d={`M${far[0]} ${far[1]} L${claw[0]} ${f2(claw[1])} L${near[0]} ${near[1]}`} fill="none" stroke={p.linen} strokeWidth={0.55} />
      <Line2 d={`M8.2 -18.6 L${near[0]} ${near[1]}`} w={1.8} c={wood} ow={0.6} />
      <circle cx={near[0]} cy={near[1]} r={0.6} fill={p.metal} stroke={OL} strokeWidth={0.35} />
      <Stone x={-9} y={stockY(-9) - 1.7} r={1.8} />
      {/* shot piled in front */}
      <Stone x={14.4} y={-1.7} r={1.7} />
      <Stone x={17.6} y={-1.6} r={1.6} />
      <Stone x={16} y={-4.3} r={1.6} />
    </g>
  );
}

/** The ballista with its crew: a man behind it carrying a stone up to the trough, a winder at the windlass. */
function BallistaFigure({ p, i }: { p: Palette; i: number }) {
  const hands = { near: [7.4, -21.4] as [number, number], far: [5.4, -21.8] as [number, number] };
  return (
    <g>
      <g transform="translate(-4.6 -2.6) scale(0.86)">
        {crewFigure(p, i + 1, hands)}
        <Stone x={6.6} y={-23.4} r={2.1} />
      </g>
      <g transform="scale(1.15)"><Ballista p={p} /></g>
      <g transform="translate(-23.4 0)">{crewFigure(p, i, 'crank')}</g>
    </g>
  );
}

/** The war machine a look draws: its own (`LookStyle.warMachine`), else its kit's (`KITS[kit].warMachine`). */
export const warMachineOf = (p: Palette) => p.style.warMachine ?? KITS[p.kit].warMachine;

/** One war machine with its two crewmen, facing right, feet at (0,0): the look's or kit's machine (`warMachineOf`). */
export function MachineFigure({ p, i }: { p: Palette; i: number }) {
  if (warMachineOf(p) === 'ballista') return <BallistaFigure p={p} i={i} />;
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
