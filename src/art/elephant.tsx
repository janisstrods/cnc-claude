// War elephants. Facing right, feet at y = 0.
// Base kits (Roman, Punic, Greek): an African elephant with mahout and a javelin-armed rider (no tower).
// Expansion #1: Indian elephants with a howdah of archers (India, Persia) or a tower (the Successors, the Seleucids
// with an armoured headpiece), the Ptolemies' smaller African forest elephants with a tower.
import { darken, lighten } from './color';
import type { Kit, LookPalette, Palette } from './palettes';
import { Arm, Body, Head, Hi, Line2, OL, Paint, Shape, Shield, Spear, dots, makeFig, type Fig } from './parts';
import { HalfFigure, type CrewAction } from './mounted';
import { crewDress, figurePalette, type CrewDress } from './foot';

const BODY =
  'M-16.4 -13.6 C-17 -20.4 -12.8 -26.4 -5 -27.4 C1 -28.2 6 -27.4 9.2 -25.6 C11.2 -29.2 15.8 -30 18.6 -27.4 ' +
  'C20.8 -25.4 21.1 -21.8 20.1 -18.6 C19.3 -15.8 17.6 -14.6 15.8 -14.6 C13.8 -13.8 12.4 -11.4 11.8 -9.2 ' +
  'L-12.6 -9.2 C-15.4 -9.8 -16.4 -11.6 -16.4 -13.6 Z';
const BELLY =
  'M11.8 -9.2 L-12.6 -9.2 C-15.4 -9.8 -16.4 -11.6 -16.4 -13.6 C-12 -11.6 -4 -11.2 4 -11.6 C8 -11.8 11 -12.6 13 -13.6 C12.4 -12.4 12 -10.8 11.8 -9.2 Z';
const EAR =
  'M10 -25.8 C6.4 -27.4 2.8 -25.4 2.4 -21.2 C2.2 -17.4 4.4 -13.8 8.2 -13 C9.8 -15.4 10.6 -16.8 11.6 -18 C12.8 -20.8 12.2 -24.6 10 -25.8 Z';
const TRUNK =
  'M20 -19.6 C21.6 -14.8 21.8 -9.2 21.2 -4.8 C21 -3.2 22.4 -2.4 23.8 -3.4 L24.4 -2.1 C22.2 -0.5 18.7 -1 18.9 -4.3 C19.1 -8.7 18.5 -12.7 16.4 -15.8 Z';
const TUSK = 'M16.4 -15.8 C18.6 -14.8 21.6 -14.4 24.6 -16.2 C22.2 -13 18.2 -12.8 15.6 -14.2 Z';

function Leg({ x, w, c, toe }: { x: number; w: number; c: string; toe: string }) {
  return (
    <>
      <Shape d={`M${x} -14 L${x + w} -14 L${x + w - 0.2} -1.2 C${x + w - 0.2} 0.2 ${x + 0.2} 0.2 ${x + 0.2} -1.2 Z`} f={c} />
      <path d={`M${x + 0.8} -0.6 L${x + 1.6} -0.6 M${x + w - 2.2} -0.6 L${x + w - 1.2} -0.6`} stroke={toe} strokeWidth={0.8} strokeLinecap="round" />
    </>
  );
}

/** The base game's elephant (Carthage; also Rome and Syracuse): saddle cloth, mahout and a javelin-armed rider. */
function BaseElephant({ p, i }: { p: Palette; i: number }) {
  const skin = i % 2 ? lighten(p.elephant, 0.06) : p.elephant;
  const shade = p.elephantShade;
  const far = darken(skin, 0.2);
  const mahout = makeFig(p, i + 1);
  const rider = makeFig(p, i + 2);
  return (
    <>
      <Line2 d="M-15.8 -17.6 C-17.8 -15.2 -18 -11.8 -17.2 -9.6" w={0.7} c={shade} ow={0.4} />
      <path d="M-17.2 -9.6 L-17.9 -7.6 L-16.4 -8 Z" fill={OL} />
      <Leg x={-8.2} w={5} c={far} toe={lighten(far, 0.4)} />
      <Leg x={2.8} w={5.2} c={far} toe={lighten(far, 0.4)} />
      <Leg x={-14.2} w={5.8} c={skin} toe={p.ivory} />
      <Leg x={7.8} w={5.8} c={skin} toe={p.ivory} />
      <Shape d={BODY} f={skin} sw={0.9} />
      <Paint d={BELLY} f={shade} o={0.85} />
      <Hi d="M-12 -24.6 C-7 -27 1 -27.4 8 -25.6" c={lighten(skin, 0.35)} w={0.9} o={0.7} />
      <Hi d="M-12 -14 C-11 -12.6 -9 -12 -7.6 -12.4 M-2 -13 C-0.6 -12.4 1.4 -12.4 2.6 -13" c={shade} w={0.5} o={0.8} />
      {/* blanket / saddle cloth in army colours */}
      <Shape d="M-9.6 -26.8 C-4.4 -28 2 -27.8 6.2 -26.6 L5.8 -16.2 C0 -15.4 -5.8 -15.6 -10 -16.6 Z" f={p.saddle} sw={0.7} />
      <Paint d="M-9.6 -26.8 C-8.4 -27.1 -7.2 -27.3 -6 -27.5 L-6.6 -15.9 C-7.8 -16.1 -8.9 -16.3 -10 -16.6 Z" f={p.saddleShade} mx={-1.9} />
      <Hi d="M5.4 -17.2 C0 -16.4 -5.6 -16.6 -9.6 -17.6" c={p.trim} w={1.1} o={1} />
      <g fill={p.trim} stroke={OL} strokeWidth={0.3}>
        <circle cx={-8.2} cy={-15.8} r={0.7} />
        <circle cx={-3.4} cy={-15.2} r={0.7} />
        <circle cx={1.4} cy={-15.2} r={0.7} />
      </g>
      <Line2 d="M-1 -16 L-1.4 -9.6" w={0.9} c={p.leatherShade} ow={0.4} />
      {/* head */}
      <Shape d={TRUNK} f={skin} sw={0.85} />
      <Hi d="M20.2 -13 L21.2 -13.2 M20.4 -10.2 L21.4 -10.4 M20.2 -7.4 L21.2 -7.6" c={shade} w={0.5} />
      <Shape d={EAR} f={darken(skin, 0.1)} sw={0.8} />
      <Hi d="M9.4 -23.8 C6.8 -24.6 4.6 -22.8 4.4 -20 C4.4 -17.8 5.6 -16 7.4 -15.2" c={shade} w={0.6} />
      <Shape d={TUSK} f={p.ivory} sw={0.6} />
      <circle cx={16.6} cy={-22.6} r={0.6} fill={OL} />
      <Hi d="M15.4 -23.8 C16.2 -24.4 17.2 -24.4 17.8 -23.8" c={shade} w={0.45} />
      {/* head cloth */}
      <Shape d="M11.4 -27.4 C13.4 -29 16.4 -29.2 18.2 -27.6 L17.2 -25.6 C15.6 -26.6 13.6 -26.6 12.2 -25.6 Z" f={p.saddle} sw={0.5} />
      {/* rider (javelins + small shield) */}
      <g transform="translate(-3.2 -26.4) scale(0.9)">
        <Spear x1={-12.4} y1={-12.4} x2={10.6} y2={-20.4} f={rider} w={0.75} blade={2.6} bladeW={1.2} />
        <Arm s={[-2.2, -7]} e={[-5.6, -10.6]} h={[-4, -15.6]} f={rider} sleeve={p.tunic} />
        <Line2 d="M-1 -0.6 L3.6 1.8 L3.2 6.4" w={2.5} c={rider.skin} />
        <g transform="translate(-0.6 13.4)">
          <Body f={rider} torso={p.kit === 'greek' ? 'linen' : 'tunic'} skirt={false} />
          <Head f={rider} helmet={p.kit === 'greek' ? 'pilos' : p.kit === 'punic' ? 'conical' : 'montefortino'} crest="knob" />
        </g>
        <Spear x1={1.2} y1={4.4} x2={9.4} y2={-14.6} f={rider} w={0.6} blade={2.1} bladeW={1.0} />
        <Shield kind="round" f={rider} dx={1.2} dy={11.6} />
      </g>
      {/* mahout on the neck */}
      <g transform="translate(8.6 -26.2) scale(0.82)">
        <Line2 d="M-1 -0.6 L3.4 1.6 L3 5.6" w={2.4} c={mahout.skin} />
        <g transform="translate(-0.6 13.4)">
          <Body f={mahout} torso="tunic" skirt={false} belt={false} />
          <Head f={mahout} helmet="cap" crest="none" />
        </g>
        <Arm s={[1.6, -7.2]} e={[4.6, -4.8]} h={[7.4, -5.6]} f={mahout} near sleeve={p.tunic} />
        <Line2 d="M7.4 -5.6 L11.4 -9.2" w={0.6} c={p.wood} ow={0.4} />
      </g>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Expansion #1

/** Indian elephant: domed twin-lobed head held high, arched back, small ears. */
const IND_BODY =
  'M-16 -13.6 C-16.8 -20.8 -12.6 -27.8 -5 -29 C1 -29.8 5.4 -28.6 8.4 -26.8 C9.6 -30.6 12.6 -33.2 16 -32.8 ' +
  'C19.8 -32.4 21.8 -28.8 21.4 -24.6 C21.1 -21.2 19.8 -18.2 17.6 -16.6 C15.4 -15.4 13 -12.4 12 -9.2 ' +
  'L-12.6 -9.2 C-15.2 -9.8 -16 -11.6 -16 -13.6 Z';
const IND_BELLY =
  'M12 -9.2 L-12.6 -9.2 C-15.2 -9.8 -16 -11.6 -16 -13.6 C-12 -11.6 -4 -11.2 4 -11.6 C8 -11.8 11.2 -12.6 13.2 -13.6 C12.6 -12.4 12.2 -10.8 12 -9.2 Z';
const IND_EAR =
  'M13.2 -26.6 C10.6 -27.4 8.8 -25.6 9 -22.6 C9.2 -20 10.8 -18 12.8 -17.6 C13.8 -19.4 14.2 -21.4 14.1 -23.4 C14 -25 13.8 -26 13.2 -26.6 Z';
const IND_TRUNK =
  'M20.6 -20.2 C22 -15.2 22 -9.4 21.4 -4.8 C21.2 -3.2 22.6 -2.4 24 -3.4 L24.6 -2.1 C22.4 -0.5 18.9 -1 19.1 -4.3 C19.3 -8.7 18.8 -12.8 17 -16.2 Z';
const IND_TUSK = 'M17.2 -16.4 C19.2 -15.4 21.4 -15 23.4 -16.2 C21.6 -13.6 18.6 -13.4 16.4 -14.8 Z';
const RICH_FRINGE = 'M-10.6 -16.8 L-10.8 -15 M-8.4 -16.4 L-8.5 -14.6 M-4 -16.4 L-4 -14.6 M0.4 -16.4 L0.5 -14.6 M4.8 -16.6 L5 -14.8';
const RICH_DOTS = dots([[-7.4, -23.6], [-3.6, -24.4], [0.2, -24.2], [3.6, -23.2], [-5.6, -20.6], [-1.6, -20.8], [2.2, -20.6]], 0.55);
/** Depigmented (pinkish) mottling of an Indian elephant's ear and trunk. */
const IND_MOTTLE = dots([[12.6, -20.4], [13.2, -22.4], [11.8, -19], [20.8, -12], [21, -9.6], [20.6, -7.4], [19.6, -18.4]], 0.45);

/** How an Expansion #1 elephant is drawn. */
interface ElephantKit {
  body: 'indian' | 'forest';
  load: 'tower' | 'howdah';
  /** Armoured headpiece with a plume (Seleucid). */
  frontlet?: boolean;
  /** Rich Indian caparison with fringe and bells (else a plain cloth in the army colours). */
  rich?: boolean;
  crew: [CrewAction, CrewAction];
  /** Crew dress (default: the kit's). */
  dress?: (i: number) => CrewDress;
  /** Paint of the crew over the army's (e.g. coloured hoods). */
  crewPaint?: (p: Palette) => Partial<LookPalette>;
  scale: number;
}

const INDIAN_SKIN = ['#a8714a', '#946038', '#b57e52', '#8a5634'];

function elephantKit(p: Palette): ElephantKit {
  const kit: Kit = p.kit;
  if (p.look === 'seleucid') {
    // Indian elephants with towers and an armoured headpiece; eastern crews with javelins and bows
    return {
      body: 'indian', load: 'tower', frontlet: true, crew: ['bow', 'javelin'], dress: (i) => crewDress('persian', i), scale: 0.94,
      crewPaint: (q) => ({ cap: q.cloak, capShade: q.cloakShade }),
    };
  }
  if (p.look === 'ptolemaic') {
    // the smaller African forest elephant with a tower and a Macedonian crew
    return { body: 'forest', load: 'tower', crew: ['pike', 'javelin'], scale: 0.86 };
  }
  // India, Persia (and the Scythian kit): a richly caparisoned elephant with a howdah, javelin-man and archer
  if (kit === 'indian' || kit === 'persian' || kit === 'scythian') return { body: 'indian', load: 'howdah', rich: true, crew: ['javelin', 'bow'], scale: 1 };
  // Macedon and the Successors (Pyrrhus, Antigonus, Eumenes): Indian elephants with a tower and a Macedonian crew
  return { body: 'indian', load: 'tower', crew: ['pike', 'javelin'], scale: 0.94 };
}

const mahoutPalettes = new WeakMap<Palette, Palette>();
/** The mahout is an Indian in a white turban and loincloth, whoever owns the elephant. */
function mahoutPalette(p: Palette): Palette {
  let out = mahoutPalettes.get(p);
  if (!out) mahoutPalettes.set(p, (out = { ...p, cap: '#f2eee2', capShade: '#bdb4a0', tunic: '#efe9d8', tunicShade: '#bdb3a0', tunicLight: '#fffaf0', trim: p.trim }));
  return out;
}

/** Wooden tower with crenellated top, a shield hung on its side and girth ropes (in the elephant's frame). */
function Tower({ p, f, x0, x1, base, top }: { p: Palette; f: Fig; x0: number; x1: number; base: number; top: number }) {
  const w = x1 - x0;
  const merlons: string[] = [];
  const n = 4;
  for (let k = 0; k < n; k++) {
    const a = x0 + (k * w) / n + 0.5;
    merlons.push(`M${a.toFixed(2)} ${top} l0 -1.6 l${(w / n - 1.6).toFixed(2)} 0 l0 1.6`);
  }
  return (
    <g>
      <Shape d={`M${x0} ${top} L${x1} ${top} L${x1} ${base} L${x0} ${base} Z`} f={p.wood} sw={0.75} />
      <Paint d={`M${x0} ${top} L${x0 + 2.4} ${top} L${x0 + 2.4} ${base} L${x0} ${base} Z`} f={p.woodShade} o={0.75} mx={(x0 + x1) / 2} />
      <path d={merlons.join(' ')} fill={p.wood} stroke={OL} strokeWidth={0.6} strokeLinejoin="round" />
      <Hi d={`M${x0 + w / 3} ${top + 0.6} L${x0 + w / 3} ${base - 0.4} M${x0 + (2 * w) / 3} ${top + 0.6} L${x0 + (2 * w) / 3} ${base - 0.4}`} c={p.woodShade} w={0.45} o={0.9} />
      <Hi d={`M${x0 + 0.4} ${top + 1.2} L${x1 - 0.4} ${top + 1.2} M${x0 + 0.4} ${base - 1} L${x1 - 0.4} ${base - 1}`} c={lighten(p.wood, 0.35)} w={0.5} o={0.8} />
      {/* a shield hung on the side */}
      <Shield kind="aspis" f={f} dx={x0 + w / 2 - 4.3 * 0.62} dy={(top + base) / 2 + 14.4 * 0.62} s={0.62} />
    </g>
  );
}

/** Low railed howdah on a cushion (Indian and Persian elephants). */
function Howdah({ p, x0, x1, base, top }: { p: Palette; x0: number; x1: number; base: number; top: number }) {
  const posts: string[] = [];
  for (let k = 0; k <= 4; k++) {
    const x = x0 + ((x1 - x0) * k) / 4;
    posts.push(`M${x.toFixed(2)} ${base} L${x.toFixed(2)} ${top}`);
  }
  const pat = p.pattern ?? p.gold;
  return (
    <g>
      <Shape d={`M${x0 - 0.6} ${base + 1.2} C${x0 + 2} ${base - 0.6} ${x1 - 2} ${base - 0.6} ${x1 + 0.6} ${base + 1.2} L${x1 + 0.4} ${base + 2.4} L${x0 - 0.4} ${base + 2.4} Z`} f={p.cloak} sw={0.6} />
      <Line2 d={posts.join(' ')} w={0.7} c={p.gold} ow={0.45} />
      <Line2 d={`M${x0 - 0.6} ${top} L${x1 + 0.6} ${top}`} w={1.1} c={p.gold} ow={0.5} />
      <Shape d={`M${x0} ${base - 2.6} L${x1} ${base - 2.6} L${x1} ${base} L${x0} ${base} Z`} f={p.saddle} sw={0.55} />
      <Hi d={`M${x0 + 0.4} ${base - 1.3} L${x1 - 0.4} ${base - 1.3}`} c={pat} w={0.6} o={1} />
      <circle cx={x0 - 0.6} cy={top} r={0.7} fill={p.gold} stroke={OL} strokeWidth={0.35} />
      <circle cx={x1 + 0.6} cy={top} r={0.7} fill={p.gold} stroke={OL} strokeWidth={0.35} />
    </g>
  );
}

const crewPalettes = new WeakMap<Palette, Palette>();
function paintCrew(p: Palette, paint?: (p: Palette) => Partial<LookPalette>): Palette {
  if (!paint) return p;
  let out = crewPalettes.get(p);
  if (!out) crewPalettes.set(p, (out = { ...p, ...paint(p) }));
  return out;
}

/** One crewman in a tower / howdah: upper body, arms and weapon, seated at (x, y) in the elephant's frame. */
function Crewman({ p, i, dress, action, x, y, s = 0.84, paint }: {
  p: Palette; i: number; dress: CrewDress; action: CrewAction; x: number; y: number; s?: number; paint?: (p: Palette) => Partial<LookPalette>;
}) {
  const fp = paintCrew(figurePalette(p, i), paint);
  const f = makeFig(fp, i);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <HalfFigure dress={dress} action={action} f={f} bow={p.kit === 'scythian' || p.kit === 'persian' ? 'scythian' : 'self'} aim={action === 'bow' ? -24 : 0} />
    </g>
  );
}

function KitElephant({ p, i }: { p: Palette; i: number }) {
  const ek = elephantKit(p);
  const skin = i % 2 ? lighten(p.elephant, 0.06) : p.elephant;
  const shade = p.elephantShade;
  const far = darken(skin, 0.2);
  const indian = ek.body === 'indian';
  const mp = mahoutPalette(p);
  const mahout = makeFig(mp, i + 1, INDIAN_SKIN);
  const dress = ek.dress ?? ((k: number) => crewDress(p.kit, k));
  const back = indian ? -29 : -27.4;
  const pat = p.pattern && p.pattern !== p.saddle ? p.pattern : p.gold;
  // where the load sits on the back
  const lx0 = indian ? -10.4 : -10.6;
  const lx1 = indian ? 3.6 : 3.4;
  const tower = ek.load === 'tower';
  const top = tower ? back - 9.4 : back - 5.4;
  const seatY = tower ? back - 3.4 : back - 0.8;
  const tf = makeFig(p, i + 3);
  return (
    <g transform={ek.scale !== 1 ? `scale(${ek.scale})` : undefined}>
      {/* tail */}
      <Line2 d="M-15.4 -17.6 C-17.4 -15.2 -17.6 -11.8 -16.8 -9.6" w={0.7} c={shade} ow={0.4} />
      <path d="M-16.8 -9.6 L-17.5 -7.6 L-16 -8 Z" fill={OL} />
      <Leg x={-8.2} w={5} c={far} toe={lighten(far, 0.4)} />
      <Leg x={2.8} w={5.2} c={far} toe={lighten(far, 0.4)} />
      <Leg x={-14.2} w={5.8} c={skin} toe={p.ivory} />
      <Leg x={7.8} w={5.8} c={skin} toe={p.ivory} />
      {ek.rich && (
        // bells and anklets on the near legs
        <g>
          <Line2 d="M-14 -3.4 L-8.6 -3.4 M8 -3.4 L13.4 -3.4" w={0.8} c={p.gold} ow={0.4} />
        </g>
      )}
      <Shape d={indian ? IND_BODY : BODY} f={skin} sw={0.9} />
      <Paint d={indian ? IND_BELLY : BELLY} f={shade} o={0.85} />
      <Hi d={indian ? 'M-12 -25.4 C-7 -28.4 1 -28.8 7.6 -27' : 'M-12 -24.6 C-7 -27 1 -27.4 8 -25.6'} c={lighten(skin, 0.35)} w={0.9} o={0.7} />
      <Hi d="M-12 -14 C-11 -12.6 -9 -12 -7.6 -12.4 M-2 -13 C-0.6 -12.4 1.4 -12.4 2.6 -13" c={shade} w={0.5} o={0.8} />
      {/* caparison */}
      {ek.rich ? (
        <g>
          <path d={RICH_FRINGE} stroke={p.gold} strokeWidth={0.6} strokeLinecap="round" />
          <Shape d={`M-11 ${back + 0.8} C-5 ${back - 0.8} 2.4 ${back - 0.4} 7 ${back + 1.6} L6.8 -17.4 C5.4 -16.2 4 -16.2 2.6 -17 C1.2 -15.8 -0.4 -15.8 -1.8 -16.8 C-3.2 -15.6 -4.8 -15.6 -6.2 -16.8 C-7.6 -15.8 -9.2 -15.8 -11.2 -17.2 Z`} f={p.saddle} sw={0.7} />
          <Paint d={`M-11 ${back + 0.8} C-9.8 ${back + 0.4} -8.6 ${back + 0.2} -7.4 ${back} L-7.6 -16.2 C-8.8 -15.9 -10 -16.4 -11.2 -17.2 Z`} f={p.saddleShade} mx={-2} />
          <Hi d="M6.6 -18.6 C5.4 -17.6 4 -17.6 2.6 -18.4 C1.2 -17.2 -0.4 -17.2 -1.8 -18.2 C-3.2 -17 -4.8 -17 -6.2 -18.2 C-7.6 -17.2 -9.2 -17.2 -10.8 -18.4" c={pat} w={1.1} o={1} />
          <Hi d={`M6.6 ${back + 2.4} L6.5 -18.6`} c={pat} w={0.8} o={1} />
          <path d={RICH_DOTS} fill={pat} />
          <g fill={p.gold} stroke={OL} strokeWidth={0.3}>
            <circle cx={-6.2} cy={-15.4} r={0.65} />
            <circle cx={-1.8} cy={-15.4} r={0.65} />
            <circle cx={2.6} cy={-15.6} r={0.65} />
          </g>
        </g>
      ) : (
        <g>
          <Shape d={`M-10.2 ${back + 0.6} C-4.6 ${back - 0.6} 2 ${back - 0.4} 6.6 ${back + 1.4} L6.2 -16.2 C0.2 -15.4 -5.8 -15.6 -10.4 -16.6 Z`} f={p.saddle} sw={0.7} />
          <Paint d={`M-10.2 ${back + 0.6} C-9 ${back + 0.3} -7.8 ${back + 0.1} -6.6 ${back} L-7 -15.9 C-8.2 -16.1 -9.3 -16.3 -10.4 -16.6 Z`} f={p.saddleShade} mx={-1.9} />
          <Hi d="M5.8 -17.2 C0.2 -16.4 -5.6 -16.6 -10 -17.6" c={p.trim} w={1.1} o={1} />
          <Line2 d="M-1.2 -16 L-1.6 -9.6" w={0.9} c={p.leatherShade} ow={0.4} />
        </g>
      )}
      {/* head */}
      <Shape d={indian ? IND_TRUNK : TRUNK} f={skin} sw={0.85} />
      <Hi d={indian ? 'M20.4 -13 L21.4 -13.2 M20.6 -10.2 L21.6 -10.4 M20.4 -7.4 L21.4 -7.6' : 'M20.2 -13 L21.2 -13.2 M20.4 -10.2 L21.4 -10.4 M20.2 -7.4 L21.2 -7.6'} c={shade} w={0.5} />
      {indian ? (
        <>
          <Shape d={IND_EAR} f={darken(skin, 0.1)} sw={0.8} />
          <Hi d="M12.6 -25.4 C11 -25.6 10 -24 10.2 -22.2 C10.4 -20.6 11.2 -19.4 12.4 -18.8" c={shade} w={0.55} />
          <path d={IND_MOTTLE} fill="#c8a494" opacity={0.8} />
          {/* the cleft between the twin domes */}
          <Hi d="M15.6 -32.6 C16.2 -31.6 16.4 -30.4 16.2 -29.2" c={shade} w={0.55} o={0.9} />
          <Shape d={IND_TUSK} f={p.ivory} sw={0.6} />
          <circle cx={17.8} cy={-24.6} r={0.6} fill={OL} />
          <Hi d="M16.6 -25.8 C17.4 -26.4 18.4 -26.4 19 -25.8" c={shade} w={0.45} />
        </>
      ) : (
        <>
          <Shape d={EAR} f={darken(skin, 0.1)} sw={0.8} />
          <Hi d="M9.4 -23.8 C6.8 -24.6 4.6 -22.8 4.4 -20 C4.4 -17.8 5.6 -16 7.4 -15.2" c={shade} w={0.6} />
          <Shape d={TUSK} f={p.ivory} sw={0.6} />
          <circle cx={16.6} cy={-22.6} r={0.6} fill={OL} />
          <Hi d="M15.4 -23.8 C16.2 -24.4 17.2 -24.4 17.8 -23.8" c={shade} w={0.45} />
        </>
      )}
      {/* head ornament: Seleucid armoured frontlet with a plume, or an embroidered forehead cloth */}
      {ek.frontlet ? (
        <g>
          <Shape d="M16.2 -33.4 C15 -36.4 16 -39 18.6 -39.8 C18 -37.6 18.4 -35.6 19.4 -33.6 Z" f={p.crestAlt} sw={0.5} />
          <Shape d="M14.6 -32.8 C16.4 -33.8 18.8 -33.4 20.1 -31.4 L19.7 -24.4 C18.9 -22.6 18.1 -21.6 17.3 -21.4 C16.7 -24.6 15.7 -28.6 14.6 -32.8 Z" f={p.metal} sw={0.6} />
          <Hi d="M15.6 -32.4 C17 -33 18.6 -32.8 19.6 -31.4" c={p.metalLight} w={0.5} o={0.9} />
          <path d={dots([[17.4, -31], [18.6, -28.4], [18.8, -26]], 0.32)} fill={p.metalLight} />
          <circle cx={17.8} cy={-24.6} r={0.95} fill={p.metalShade} stroke={OL} strokeWidth={0.35} />
          <circle cx={17.8} cy={-24.6} r={0.5} fill={OL} />
        </g>
      ) : indian ? (
        <g>
          <Shape d="M13.6 -31.4 C15.6 -33.2 18.8 -33 20.4 -30.6 L19.8 -27.8 C18 -28.8 15.6 -28.8 14 -28 Z" f={p.saddle} sw={0.5} />
          <Hi d="M14.2 -28.8 C15.8 -29.6 18 -29.6 19.6 -28.6" c={pat} w={0.6} o={1} />
          <circle cx={17} cy={-27.2} r={0.75} fill={p.gold} stroke={OL} strokeWidth={0.35} />
        </g>
      ) : (
        <Shape d="M11.4 -27.4 C13.4 -29 16.4 -29.2 18.2 -27.6 L17.2 -25.6 C15.6 -26.6 13.6 -26.6 12.2 -25.6 Z" f={p.saddle} sw={0.5} />
      )}
      {/* the load and its crew: the far crewman first */}
      {tower ? (
        <>
          <Crewman p={p} i={i + 2} dress={dress(i + 2)} action={ek.crew[1]} x={-6.2} y={seatY} s={0.82} paint={ek.crewPaint} />
          <Crewman p={p} i={i + 1} dress={dress(i + 1)} action={ek.crew[0]} x={-0.8} y={seatY + 0.6} s={0.84} paint={ek.crewPaint} />
          <Tower p={p} f={tf} x0={lx0} x1={lx1} base={back + 1.4} top={top} />
        </>
      ) : (
        <>
          <Crewman p={p} i={i + 2} dress={dress(i + 2)} action={ek.crew[1]} x={-6.8} y={seatY} s={0.84} paint={ek.crewPaint} />
          <Crewman p={p} i={i + 1} dress={dress(i + 1)} action={ek.crew[0]} x={-0.6} y={seatY + 0.4} s={0.86} paint={ek.crewPaint} />
          <Howdah p={p} x0={lx0} x1={lx1} base={back + 0.6} top={top} />
        </>
      )}
      {/* mahout on the neck, with his goad */}
      <g transform={indian ? 'translate(7.8 -27.4) scale(0.74)' : 'translate(8.2 -26) scale(0.76)'}>
        <Line2 d="M-1 -0.6 L3.4 1.6 L3 5.6" w={2.4} c={mahout.skin} />
        <HalfFigure dress={{ torso: 'bare', helmet: 'turban', crest: 'none', beard: i % 2 === 0 }} action="goad" f={mahout} />
      </g>
    </g>
  );
}

/** One elephant miniature: the base game's for the Roman, Punic and Greek kits, an Expansion #1 elephant otherwise. */
export function ElephantFigure({ p, i }: { p: Palette; i: number }) {
  if (p.kit === 'roman' || p.kit === 'punic' || p.kit === 'greek') return <BaseElephant p={p} i={i} />;
  return <KitElephant p={p} i={i} />;
}
