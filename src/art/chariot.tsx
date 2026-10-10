// Heavy chariots. Facing right, ground at y = 0.
// Base kits (Punic, Greek, Roman): two-horse team, spoked wheel, driver and warrior.
// Expansion #1: the four-horse scythed chariots of Persia and the Successors, the large Indian chariot with archers,
// and a light two-horse chariot for the steppe kit.
import { darken, lighten } from './color';
import { crewDress, figurePalette, type CrewDress } from './foot';
import type { Palette } from './palettes';
import { Arm, Body, Emblem, Head, Hi, Line2, OL, Paint, Shape, Shield, Spear, dots, makeFig } from './parts';
import { HalfFigure, Horse, type CrewAction } from './mounted';

function BaseChariot({ p, i }: { p: Palette; i: number }) {
  const h1 = p.horses[(i + 1) % p.horses.length];
  const h2 = p.horses[(i + 2) % p.horses.length];
  const driver = makeFig(p, i + 1);
  const warrior = makeFig(p, i + 2);
  const helmet = p.kit === 'greek' ? 'corinthian' : p.kit === 'punic' ? 'attic' : 'montefortino';
  const crest = p.kit === 'roman' ? 'plumes' : p.kit === 'greek' ? 'tall' : 'horsehair';
  const wx = -13;
  const wy = -6.8;
  const wr = 6.6;
  const spokes = [0, 30, 60, 90, 120, 150].map((a) => {
    const r = (a * Math.PI) / 180;
    const dx = Math.cos(r) * wr;
    const dy = Math.sin(r) * wr;
    return `M${(wx - dx).toFixed(2)} ${(wy - dy).toFixed(2)} L${(wx + dx).toFixed(2)} ${(wy + dy).toFixed(2)}`;
  });
  return (
    <>
      {/* far horse */}
      <g transform="translate(13.6 -2.6) scale(0.92)">
        <Horse coat={darken(h2.coat, 0.15)} shade={darken(h2.shade, 0.15)} mane={h2.mane} pose={1} bridle />
      </g>
      {/* far wheel hint */}
      <ellipse cx={wx + 3.2} cy={wy - 1.6} rx={2} ry={wr * 0.95} fill="none" stroke={p.woodShade} strokeWidth={1.2} opacity={0.8} />
      {/* warrior (behind driver) */}
      <g transform="translate(-14.4 -17.8)">
        <Spear x1={-12.4} y1={-12.4} x2={11} y2={-20.6} f={warrior} w={0.8} blade={2.8} bladeW={1.3} />
        <Arm s={[-2.2, -7]} e={[-5.6, -10.6]} h={[-4, -15.6]} f={warrior} sleeve={p.tunic} />
        <g transform="translate(-0.6 13.4)">
          <Body f={warrior} torso={p.kit === 'roman' ? 'mail' : p.kit === 'greek' ? 'muscle' : 'linen'} skirt={false} />
          <Head f={warrior} helmet={helmet} crest={crest} beard={i % 2 === 0} />
        </g>
      </g>
      {/* near horse */}
      <g transform="translate(9.6 0) scale(0.95)">
        <Horse coat={h1.coat} shade={h1.shade} mane={h1.mane} pose={1} light={lighten(h1.coat, 0.35)} />
      </g>
      {/* pole & reins */}
      <Line2 d="M-3.8 -9.6 L13.6 -14.2" w={1.0} c={p.woodShade} ow={0.5} />
      <path d="M-5 -19.6 Q6 -22 22.4 -18.6" fill="none" stroke="#3a2416" strokeWidth={0.5} />
      {/* driver */}
      <g transform="translate(-6.8 -17.2) scale(0.95)">
        <g transform="translate(-0.6 13.4)">
          <Body f={driver} torso="tunic" skirt={false} />
          <Head f={driver} helmet={p.kit === 'greek' ? 'pilos' : 'cap'} crest="none" />
        </g>
        <Arm s={[1.6, -7.2]} e={[4.4, -4.8]} h={[6.8, -3.2]} f={driver} near sleeve={p.tunic} />
      </g>
      {/* chariot box */}
      <Shape d="M-21 -19 C-14 -19.8 -8 -19.8 -4.4 -18.6 C-3.4 -15.6 -3.2 -11.6 -4 -8.4 L-20.6 -8.4 C-21.6 -11.8 -21.6 -15.6 -21 -19 Z" f={p.saddle} />
      <Paint d="M-21 -19 C-19.8 -19.2 -18.4 -19.3 -17.2 -19.4 C-17.6 -15.6 -17.6 -11.8 -17 -8.4 L-20.6 -8.4 C-21.6 -11.8 -21.6 -15.6 -21 -19 Z" f={p.saddleShade} mx={-12.7} />
      <Hi d="M-20.6 -18.2 C-14 -19 -8.4 -19 -4.8 -17.9" c={p.gold} w={1.0} o={1} />
      <Hi d="M-20.4 -9.4 L-4.4 -9.4" c={p.gold} w={0.8} o={1} />
      <Shield kind="round" f={warrior} dx={-17.6} dy={1.8} s={0.95} />
      {/* wheel */}
      <circle cx={wx} cy={wy} r={wr} fill="none" stroke={OL} strokeWidth={2.4} />
      <circle cx={wx} cy={wy} r={wr} fill="none" stroke={p.wood} strokeWidth={1.2} />
      <path d={spokes.join(' ')} stroke={p.woodShade} strokeWidth={0.6} />
      <circle cx={wx} cy={wy} r={1.4} fill={p.metal} stroke={OL} strokeWidth={0.5} />
      <Hi d={`M${wx - 4.4} ${wy - 4.6} A ${wr - 0.2} ${wr - 0.2} 0 0 1 ${wx + 3} ${wy - 5.8}`} c={lighten(p.wood, 0.4)} w={0.5} />
      {/* scythe hub */}
      <Line2 d={`M${wx + 1.4} ${wy} L${wx + 6.2} ${wy + 1}`} w={0.8} c={p.ironLight} ow={0.4} />
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Expansion #1

interface CrewSpot {
  action: CrewAction;
  dress: CrewDress;
  x: number;
  y: number;
  s: number;
  aim?: number;
  i: number;
}

interface ChariotKit {
  horses: 2 | 4;
  /** Long blades on the wheel hubs and under the axle. */
  scythed: boolean;
  /** Bronze chamfrons and peytrals on the team (Xenophon's armoured chariot horses). */
  barded: boolean;
  /** Box from x0 to x1, top edge `top` (bottom at -8.4); wheel radius. */
  box: { x0: number; x1: number; top: number };
  wheel: number;
  /** Far to near (draw order). */
  crew: CrewSpot[];
  bow: 'self' | 'scythian';
}

function chariotKit(p: Palette, i: number): ChariotKit {
  if (p.kit === 'indian') {
    // Porus' heavy chariots: four horses, six men; drawn with two archers and the driver
    const d = (k: number) => crewDress('indian', k);
    return {
      horses: 4, scythed: false, barded: false, box: { x0: -25, x1: -3.6, top: -20.8 }, wheel: 7.4, bow: 'self',
      crew: [
        { action: 'javelin', dress: d(i + 3), x: -19.8, y: -19.4, s: 0.94, i: i + 3 },
        { action: 'reins', dress: d(i + 1), x: -7.4, y: -18.6, s: 0.94, i: i + 1 },
        { action: 'bow', dress: d(i + 2), x: -14.2, y: -19, s: 0.96, aim: -16, i: i + 2 },
      ],
    };
  }
  if (p.kit === 'scythian') {
    const d = (k: number) => crewDress('scythian', k);
    return {
      horses: 2, scythed: false, barded: false, box: { x0: -20, x1: -4.4, top: -18.6 }, wheel: 6.6, bow: 'scythian',
      crew: [
        { action: 'reins', dress: d(i + 1), x: -6.6, y: -17.2, s: 0.95, i: i + 1 },
        { action: 'bow', dress: d(i + 2), x: -13.6, y: -17.8, s: 1, aim: -14, i: i + 2 },
      ],
    };
  }
  // the scythed chariot: one armoured driver behind high sides (a Persian in his hood, a Successor's in a crested helmet)
  const driver: CrewDress = p.kit === 'persian'
    ? { torso: 'scale', helmet: 'tiara', crest: 'none', longSleeve: true, beard: true }
    : { torso: 'scale', helmet: 'phrygian', crest: 'horsehair', longSleeve: p.look === 'seleucid' };
  return {
    horses: 4, scythed: true, barded: true, box: { x0: -19.6, x1: -4.4, top: -20.4 }, wheel: 6.8, bow: 'scythian',
    crew: [{ action: 'whip', dress: driver, x: -9.4, y: -18.2, s: 1, i: i + 1 }],
  };
}

const r2 = (n: number) => n.toFixed(2);

function KitChariot({ p, i }: { p: Palette; i: number }) {
  const ck = chariotKit(p, i);
  const coats = p.horses;
  const h1 = coats[(i + 1) % coats.length];
  const h2 = coats[(i + 2) % coats.length];
  const { x0, x1, top } = ck.box;
  const wr = ck.wheel;
  const wx = (x0 + x1) / 2 + 0.4;
  const wy = -wr - 0.2;
  const nSpokes = ck.horses === 4 ? 8 : 6;
  const spokes = Array.from({ length: nSpokes }, (_, k) => {
    const a = (k * Math.PI) / nSpokes;
    const dx = Math.cos(a) * wr;
    const dy = Math.sin(a) * wr;
    return `M${r2(wx - dx)} ${r2(wy - dy)} L${r2(wx + dx)} ${r2(wy + dy)}`;
  });
  const metal = p.metal;
  const team = ck.horses === 4
    ? [
      { x: 15.6, y: -5, s: 0.86, h: h2, dk: 0.32 },
      { x: 13.6, y: -3.4, s: 0.89, h: h1, dk: 0.2 },
    ]
    : [{ x: 13.6, y: -2.6, s: 0.92, h: h2, dk: 0.15 }];
  const nearTeam = ck.horses === 4
    ? [
      { x: 11.6, y: -1.6, s: 0.92, h: h2, dk: 0.06 },
      { x: 9.4, y: 0, s: 0.95, h: h1, dk: 0 },
    ]
    : [{ x: 9.6, y: 0, s: 0.95, h: h1, dk: 0 }];
  const bodyPath = `M${x0} ${top} C${x0 + 6} ${top - 0.8} ${x1 - 4} ${top - 0.8} ${x1} ${top + 0.6} C${x1 + 1} ${top + 4} ${x1 + 1.2} ${-12} ${x1 + 0.4} -8.4 L${x0 + 0.4} -8.4 C${x0 - 0.6} -11.8 ${x0 - 0.6} ${top + 4} ${x0} ${top} Z`;
  const pat = p.pattern ?? p.gold;
  const driverX = (ck.crew.find((c) => c.action === 'reins' || c.action === 'whip') ?? ck.crew[0]).x;
  const device = p.style.emblems[0];
  const blade = (dir: 1 | -1) => {
    const a = wx + dir * 1.4;
    return `M${r2(a)} ${r2(wy - 0.5)} C${r2(a + dir * 4)} ${r2(wy - 1.2)} ${r2(a + dir * 8)} ${r2(wy - 0.6)} ${r2(a + dir * 10.6)} ${r2(wy + 1.6)} C${r2(a + dir * 7.6)} ${r2(wy + 0.9)} ${r2(a + dir * 4)} ${r2(wy + 0.9)} ${r2(a)} ${r2(wy + 0.6)} Z`;
  };
  return (
    <>
      {/* far horses */}
      {team.map((t, k) => (
        <g key={`f${k}`} transform={`translate(${t.x} ${t.y}) scale(${t.s})`}>
          <Horse coat={darken(t.h.coat, t.dk)} shade={darken(t.h.shade, t.dk)} mane={t.h.mane} pose={k % 2 ? 1 : 0}
            barding={ck.barded} metal={darken(metal, t.dk)} metalShade={p.metalShade} />
        </g>
      ))}
      {/* far wheel hint */}
      <ellipse cx={wx + 3.2} cy={wy - 1.6} rx={2} ry={wr * 0.95} fill="none" stroke={p.woodShade} strokeWidth={1.2} opacity={0.8} />
      {/* crew, far to near */}
      {ck.crew.map((c, k) => {
        const f = makeFig(figurePalette(p, c.i), c.i);
        return (
          <g key={`c${k}`} transform={`translate(${c.x} ${c.y}) scale(${c.s})`}>
            <HalfFigure dress={c.dress} action={c.action} f={f} bow={ck.bow} aim={c.aim} />
          </g>
        );
      })}
      {/* near horses */}
      {nearTeam.map((t, k) => (
        <g key={`n${k}`} transform={`translate(${t.x} ${t.y}) scale(${t.s})`}>
          <Horse coat={darken(t.h.coat, t.dk)} shade={darken(t.h.shade, t.dk)} mane={t.h.mane} pose={1}
            barding={ck.barded} metal={metal} metalShade={p.metalShade} light={k === nearTeam.length - 1 ? lighten(t.h.coat, 0.35) : undefined} />
        </g>
      ))}
      {/* pole & reins */}
      <Line2 d={`M${x1 + 0.4} -9.6 L13.6 -14.2`} w={1.0} c={p.woodShade} ow={0.5} />
      <path d={`M${driverX + 2} -21 Q6 -23 22.4 -18.6`} fill="none" stroke="#3a2416" strokeWidth={0.5} />
      {/* chariot box */}
      <Shape d={bodyPath} f={p.saddle} />
      <Paint d={`M${x0} ${top} C${x0 + 1.2} ${top - 0.2} ${x0 + 2.6} ${top - 0.3} ${x0 + 3.8} ${top - 0.4} C${x0 + 3.4} ${top + 3.4} ${x0 + 3.4} -11.8 ${x0 + 4} -8.4 L${x0 + 0.4} -8.4 C${x0 - 0.6} -11.8 ${x0 - 0.6} ${top + 4} ${x0} ${top} Z`} f={p.saddleShade} mx={(x0 + x1) / 2} />
      <Hi d={`M${x0 + 0.4} ${top + 0.8} C${x0 + 6} ${top} ${x1 - 4} ${top} ${x1 - 0.4} ${top + 1.1}`} c={p.gold} w={1.0} o={1} />
      <Hi d={`M${x0 + 0.6} -9.4 L${x1} -9.4`} c={p.gold} w={0.8} o={1} />
      {ck.scythed && (device === 'none'
        ? <path d={dots([[x0 + 3.2, top + 3.6], [x0 + 6.6, top + 3.8], [x0 + 10, top + 3.8], [x0 + 13.2, top + 3.6]], 0.62)} fill={pat} />
        : <Emblem kind={device} cx={(x0 + x1) / 2 - 0.6} cy={top + 3.9} s={0.78} f={makeFig(p, 0)} c={p.shieldEmblem} bg={p.saddle} />)}
      {p.kit === 'indian' && (
        <g>
          {/* railing posts of the big Indian car */}
          <Hi d={`M${x0 + 5.4} ${top + 1} L${x0 + 5.4} -9.6 M${x0 + 10.8} ${top + 1} L${x0 + 10.8} -9.6 M${x0 + 16.2} ${top + 1} L${x0 + 16.2} -9.6`} c={p.gold} w={0.7} o={0.95} />
        </g>
      )}
      {/* wheel */}
      <circle cx={wx} cy={wy} r={wr} fill="none" stroke={OL} strokeWidth={2.4} />
      <circle cx={wx} cy={wy} r={wr} fill="none" stroke={p.wood} strokeWidth={1.2} />
      <path d={spokes.join(' ')} stroke={p.woodShade} strokeWidth={0.6} />
      <circle cx={wx} cy={wy} r={1.5} fill={metal} stroke={OL} strokeWidth={0.5} />
      <Hi d={`M${r2(wx - 4.4)} ${r2(wy - 4.6)} A ${wr - 0.2} ${wr - 0.2} 0 0 1 ${r2(wx + 3)} ${r2(wy - 5.8)}`} c={lighten(p.wood, 0.4)} w={0.5} />
      {ck.scythed ? (
        <g>
          {/* scythes on the hub, forward and back, and blades under the axle */}
          <path d={`${blade(1)} ${blade(-1)}`} fill={p.ironLight} stroke={OL} strokeWidth={0.5} strokeLinejoin="round" />
          <Hi d={`M${r2(wx + 2.4)} ${r2(wy - 0.2)} C${r2(wx + 6)} ${r2(wy - 0.6)} ${r2(wx + 9)} ${r2(wy - 0.2)} ${r2(wx + 11.2)} ${r2(wy + 1.2)}`} c={lighten(p.ironLight, 0.5)} w={0.35} o={0.9} />
          <path d={`M${r2(x0 + 2)} -8.4 C${r2(x0 + 1)} -6 ${r2(x0 - 1.2)} -4.8 ${r2(x0 - 3.6)} -4.4 C${r2(x0 - 1.4)} -5.8 ${r2(x0 - 0.2)} -7 ${r2(x0 + 0.4)} -8.4 Z`} fill={p.ironLight} stroke={OL} strokeWidth={0.45} strokeLinejoin="round" />
        </g>
      ) : (
        <Line2 d={`M${r2(wx + 1.4)} ${r2(wy)} L${r2(wx + 3.4)} ${r2(wy + 0.4)}`} w={1.1} c={p.metal} ow={0.4} />
      )}
    </>
  );
}

/** One chariot miniature: the base game's for the Punic, Greek and Roman kits, an Expansion #1 chariot otherwise. */
export function ChariotFigure({ p, i }: { p: Palette; i: number }) {
  if (p.kit === 'roman' || p.kit === 'punic' || p.kit === 'greek') return <BaseChariot p={p} i={i} />;
  return <KitChariot p={p} i={i} />;
}
