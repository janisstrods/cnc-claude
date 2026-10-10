// Camels (CAM): a one-humped dromedary with Arab archers (Livy's camel-riding archers at Magnesia, with their long thin
// swords). Odd figures carry two riders back to back, the rear one shooting backwards. Facing right, feet at y = 0.
import { darken, lighten } from './color';
import type { Palette } from './palettes';
import { Hi, Line2, OL, Paint, Shape, dots, makeFig } from './parts';
import type { CrewDress } from './foot';
import { HalfFigure, SeatedLeg } from './mounted';

const BODY =
  'M-13.6 -22.4 C-12.6 -26.6 -9 -31.6 -4 -32.4 C0.4 -33.2 3.8 -30.4 5.6 -26.6 C7.4 -24.2 10 -22.6 12.4 -22.8 ' +
  'C14.6 -23.2 15.4 -26.8 16.4 -29.2 C17 -30.8 18.2 -31.8 19.8 -31.6 C21.4 -31.4 23.4 -30.6 24.4 -29.4 ' +
  'C25.2 -28.4 24.8 -27.2 23.6 -27 C22.4 -26.8 21.2 -26.6 20.4 -25.8 C19.4 -24.6 18.6 -22.4 17.6 -20.8 ' +
  'C16.2 -18.6 13.6 -17.4 10.6 -17.2 C9.2 -17 8.2 -16.4 7.2 -15.8 C4.8 -15.2 1.4 -16 -2 -16.2 ' +
  'C-5.6 -16.4 -9 -15.8 -11.2 -16.8 C-13.4 -17.8 -14.4 -20 -13.6 -22.4 Z';
/** Shadow under the belly and the thigh. */
const BELLY =
  'M7.2 -15.8 C4.8 -15.2 1.4 -16 -2 -16.2 C-5.6 -16.4 -9 -15.8 -11.2 -16.8 C-13.4 -17.8 -14.4 -20 -13.6 -22.4 ' +
  'C-12.8 -20.2 -11 -18.6 -8 -18.2 C-4 -17.8 2 -18 6.4 -17.6 C7.6 -17.4 8.4 -17 9 -16.6 C8.4 -16.4 7.8 -16.1 7.2 -15.8 Z';
/** The hump's light side and the neck's crease. */
const HUMP_HI = 'M-10.4 -27.6 C-8.6 -30.2 -6.4 -31.6 -3.8 -31.8 C-1.4 -32 0.8 -30.8 2.4 -29';

interface Leg { d: string; w: number }
const LEGS: Leg[][] = [
  // far hind, far fore, near hind, near fore (two gaits)
  [
    { d: 'M-8.6 -17.8 L-10.6 -9.2 L-9.4 -1.2', w: 1.9 },
    { d: 'M5 -17.2 L6.4 -9 L5.6 -1.2', w: 1.8 },
    { d: 'M-11.2 -18.4 L-13 -9.4 L-12.4 -1.2', w: 2.2 },
    { d: 'M7.6 -17 L8.4 -9.2 L8 -1.2', w: 2.1 },
  ],
  [
    { d: 'M-8.6 -17.8 L-11.8 -9.8 L-12.2 -1.4', w: 1.9 },
    { d: 'M5 -17.2 L8.4 -9.6 L9.6 -1.6', w: 1.8 },
    { d: 'M-11.2 -18.4 L-11.2 -9.4 L-9.6 -1.2', w: 2.2 },
    { d: 'M7.6 -17 L7 -9.2 L5.8 -1.2', w: 2.1 },
  ],
];

/** Last point of a leg path: where the foot pad goes. */
function footAt(d: string): [number, number] {
  const n = d.replace(/[ML]/g, ' ').trim().split(/\s+/).map(Number);
  return [n[n.length - 2], n[n.length - 1]];
}
/** The knee joint (middle point). */
function kneeAt(d: string): [number, number] {
  const n = d.replace(/[ML]/g, ' ').trim().split(/\s+/).map(Number);
  return [n[2], n[3]];
}

const ARAB_SKIN = ['#b8835a', '#a8714a', '#c48c60', '#9c6a44'];
const ARAB_HAIR = ['#1a120c', '#24170f', '#140d08', '#2e1d12'];

const riderPalettes = new WeakMap<Palette, Palette[]>();
/** Arab riders: undyed robes with a sash in the army colour, headcloths (white, or in the army colour). */
function arabPalette(p: Palette, k: number): Palette {
  let list = riderPalettes.get(p);
  if (!list) {
    const robe = '#e6dcc2';
    const base = {
      ...p,
      tunic: robe, tunicShade: darken(robe, 0.26), tunicLight: lighten(robe, 0.4), trim: p.tunic,
      trousers: p.trousers, trousersShade: p.trousersShade,
    };
    list = [
      { ...base, cap: '#efe8d4', capShade: '#bdb39c', pattern: p.tunic },
      { ...base, cap: p.tunic, capShade: p.tunicShade, pattern: lighten(p.tunic, 0.5) },
    ];
    riderPalettes.set(p, list);
  }
  return list[k % 2];
}

const ARAB: CrewDress = { torso: 'tunic', helmet: 'nemes', crest: 'none', beard: true };

/** The long thin sword at an Arab rider's hip, hanging along the camel's flank (rider frame). */
function LongSword({ p }: { p: Palette }) {
  return (
    <g>
      <Line2 d="M-1.4 -0.6 L-12.6 5.8" w={0.85} c={p.leatherShade} ow={0.45} />
      <Line2 d="M-0.6 -1.1 L0.6 -1.8" w={0.7} c={p.metal} ow={0.4} />
    </g>
  );
}

/** One camel with its rider(s), facing right, feet at (0,0). */
export function CamelFigure({ p, i }: { p: Palette; i: number }) {
  const coat = ['#c9a06a', '#b88c58', '#d4b07c', '#a8804e'][i % 4];
  const shade = darken(coat, 0.28);
  const far = darken(coat, 0.2);
  const legs = LEGS[i % 2];
  const two = i % 2 === 1;
  const front = makeFig(arabPalette(p, i), i, ARAB_SKIN, ARAB_HAIR);
  const rear = makeFig(arabPalette(p, i + 1), i + 1, ARAB_SKIN, ARAB_HAIR);
  const cloth = p.saddle;
  const trim = p.trim;
  const pads = (k: number, c: string) => {
    const [x, y] = footAt(legs[k].d);
    return <Line2 d={`M${(x - 1.2).toFixed(2)} ${(y + 0.4).toFixed(2)} L${(x + 1.5).toFixed(2)} ${(y + 0.4).toFixed(2)}`} w={1.5} c={c} ow={0.5} />;
  };
  // knobbly knees: a short thicker stretch of the leg around the joint
  const knee = (k: number, c: string) => {
    const [x, y] = kneeAt(legs[k].d);
    return <Line2 d={`M${x.toFixed(2)} ${(y - 0.7).toFixed(2)} L${x.toFixed(2)} ${(y + 0.7).toFixed(2)}`} w={legs[k].w + 0.8} c={c} ow={0.55} />;
  };
  return (
    <g transform="scale(0.94)">
      {/* tail */}
      <Line2 d="M-13.4 -21.6 C-14.8 -19.6 -15.2 -17.4 -15 -14.6" w={0.8} c={shade} ow={0.4} />
      <path d="M-15 -14.6 L-15.8 -12.4 L-14.2 -12.8 Z" fill={OL} />
      {/* far legs */}
      <Line2 d={legs[0].d} w={legs[0].w} c={far} ow={0.7} />
      <Line2 d={legs[1].d} w={legs[1].w} c={far} ow={0.7} />
      {knee(0, far)}
      {knee(1, far)}
      {pads(0, darken(far, 0.3))}
      {pads(1, darken(far, 0.3))}
      {/* near legs */}
      <Line2 d={legs[2].d} w={legs[2].w} c={coat} ow={0.75} />
      <Line2 d={legs[3].d} w={legs[3].w} c={coat} ow={0.75} />
      {knee(2, coat)}
      {knee(3, coat)}
      {pads(2, darken(coat, 0.35))}
      {pads(3, darken(coat, 0.35))}
      {/* body, neck and head */}
      <Shape d={BODY} f={coat} sw={0.85} />
      <Paint d={BELLY} f={shade} o={0.8} />
      <Hi d={HUMP_HI} c={lighten(coat, 0.35)} w={0.8} o={0.75} />
      <Hi d="M9.4 -21 C11.6 -20.2 13.6 -20.6 15.4 -22.4 M17.8 -24 C18.6 -25.6 19.4 -26.6 20.6 -27" c={shade} w={0.5} o={0.85} />
      {/* thick throat wool */}
      <Hi d="M12.4 -18.2 L12.8 -16.8 M14.2 -18.8 L14.8 -17.6 M15.8 -20 L16.6 -19" c={shade} w={0.5} o={0.9} />
      {/* ear, eye, nostril and drooping lip */}
      <Shape d="M18 -31.2 C17.6 -32.6 18 -33.4 18.8 -33.4 C19 -32.6 18.9 -31.8 18.6 -31.2 Z" f={coat} sw={0.45} />
      <circle cx={20.4} cy={-29.8} r={0.5} fill={OL} />
      <Hi d="M19.6 -30.6 C20.2 -31 20.9 -31 21.4 -30.6" c={shade} w={0.4} o={1} />
      <circle cx={23.7} cy={-29.2} r={0.3} fill={OL} />
      <Hi d="M24.1 -27.8 C23.2 -27.6 22.4 -27.6 21.8 -27.2" c={shade} w={0.45} o={1} />
      {/* halter */}
      <g fill="none" stroke="#3a2416" strokeWidth={0.5} strokeLinecap="round">
        <path d="M18.6 -31 L19.6 -27 M19.8 -28.6 L23.6 -28.6" />
      </g>
      {/* saddle pad behind the hump, with tassels */}
      <path d="M-12.6 -21.6 L-12.8 -20 M-10 -21.2 L-10.1 -19.6 M-7.4 -21.2 L-7.4 -19.6 M-4.8 -21.6 L-4.7 -20" stroke={trim} strokeWidth={0.6} strokeLinecap="round" />
      <Shape d="M-13.4 -25.4 C-12 -28.4 -9.4 -30.6 -6.6 -31.4 C-5.4 -29.6 -4.6 -27 -4.4 -24.8 L-4.4 -22 C-7.6 -21 -10.6 -21.2 -13.2 -22.2 Z" f={cloth} sw={0.65} />
      <Paint d="M-13.4 -25.4 C-12.8 -26.6 -12 -27.8 -11 -28.8 L-10.8 -21.4 C-11.6 -21.6 -12.4 -21.9 -13.2 -22.2 Z" f={p.saddleShade} mx={-8.8} />
      <Hi d="M-4.6 -22.8 C-7.6 -21.8 -10.6 -22 -13 -23" c={trim} w={1} o={1} />
      <path d={dots([[-10.6, -26], [-7.8, -27.4], [-8.8, -24.4], [-6, -24.6]], 0.45)} fill={trim} />
      <Line2 d="M-5.2 -22.4 L-4.6 -16.4" w={0.8} c={p.leatherShade} ow={0.4} />
      {/* saddle frame: front and rear pommels */}
      <Line2 d="M-5.2 -29.4 L-4.6 -32.8 M-12.8 -24.8 L-14.2 -27.6" w={0.9} c={p.wood} ow={0.5} />
      {two ? (
        <>
          {/* rear rider, turned, shooting back */}
          <g transform="translate(-12 -27.4) scale(0.9)">
            <g transform="matrix(-1 0 0 1 0 0)"><SeatedLeg f={rear} /></g>
            <HalfFigure dress={ARAB} action="bow" f={rear} turned aim={-12} />
          </g>
          {/* front rider driving with the camel stick */}
          <g transform="translate(-7.6 -30.2) scale(0.92)">
            <SeatedLeg f={front} />
            <LongSword p={front.p} />
            <HalfFigure dress={ARAB} action="goad" f={front} />
          </g>
        </>
      ) : (
        <g transform="translate(-8.4 -29.8) scale(0.94)">
          <SeatedLeg f={front} />
          <LongSword p={front.p} />
          <HalfFigure dress={ARAB} action="bow" f={front} aim={-6} />
        </g>
      )}
      {/* lead rope to the rider's hand */}
      <path d={two ? 'M23.4 -28.4 Q14 -29 -0.6 -35.6' : 'M23.4 -28.4 Q12 -26 2.4 -33.4'} fill="none" stroke="#3a2416" strokeWidth={0.4} opacity={0.85} />
    </g>
  );
}

