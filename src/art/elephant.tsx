// War elephant with mahout and javelin-armed rider (no tower). Facing right, feet at y = 0.
import { darken, lighten } from './color';
import type { Palette } from './palettes';
import { Arm, Body, Head, Hi, Line2, OL, Paint, Shape, Shield, Spear, makeFig } from './parts';

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

export function ElephantFigure({ p, i }: { p: Palette; i: number }) {
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

