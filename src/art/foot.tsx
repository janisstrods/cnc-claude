// Foot soldier miniatures (LI, LB, LS, AX, WA, MI, HI). Drawn facing right, feet at (0,0), ~30 units tall.
import type { Faction, UnitType } from '../engine/types';
import { TRIBAL_HAIR, TRIBAL_SKIN, type Palette } from './palettes';
import {
  Arm, Body, Head, Hi, Line2, LegsEl, OL, Shape, Shield, Spear, makeFig,
  type Crest, type Fig, type Hair, type Helmet, type Legs, type ShieldKind, type Torso,
} from './parts';

export type FootWeapon = 'spear' | 'longSpear' | 'pilum' | 'javelin' | 'sword' | 'bow' | 'sling';

export interface FootKit {
  torso: Torso;
  skirt: boolean;
  pteruges?: boolean;
  legs: Legs;
  helmet: Helmet;
  crest: Crest;
  hair: Hair;
  beard?: boolean;
  moustache?: boolean;
  torc?: boolean;
  shield: ShieldKind;
  shieldScale?: number;
  /** Vertical shield offset (long tribal shields are carried lower so the face shows). */
  shieldDy?: number;
  /** Painted (light-troop) shield colours. */
  painted?: boolean;
  weapon: FootWeapon;
  /** Extra weapons carried in the shield hand. */
  spare?: 'javelins' | 'spear';
  sleeve?: boolean;
  tribal?: boolean;
  falcata?: boolean;
}

export function footKit(type: UnitType, faction: Faction, i: number): FootKit {
  const greek = faction === 'syracuse';
  const punic = faction === 'carthage';
  switch (type) {
    case 'LI':
      return {
        torso: 'tunic', skirt: true, legs: 'bare', helmet: 'none', crest: 'none',
        hair: i % 2 ? 'long' : 'short', shield: 'round', weapon: 'javelin', spare: 'javelins', sleeve: true, beard: punic && i % 2 === 1,
      };
    case 'LB':
      return {
        torso: 'tunic', skirt: true, legs: 'bare', helmet: punic ? 'cap' : 'none', crest: 'none', hair: 'short',
        shield: 'none', weapon: 'bow', sleeve: true, beard: greek && i % 2 === 0,
      };
    case 'LS':
      return {
        torso: 'tunic', skirt: true, legs: 'bare', helmet: 'none', crest: 'none', hair: i % 2 ? 'long' : 'short',
        shield: 'none', weapon: 'sling', sleeve: true, beard: i % 3 === 1,
      };
    case 'AX':
      return {
        torso: 'leather', skirt: true, legs: 'bare', helmet: greek ? 'pilos' : punic ? 'conical' : 'montefortino',
        crest: 'knob', hair: 'short', shield: 'oval', shieldScale: 0.84, painted: true, weapon: 'javelin', spare: 'spear', sleeve: true,
      };
    case 'WA': {
      const iberian = punic && i % 2 === 1;
      if (iberian) {
        return {
          torso: 'tunic', skirt: true, legs: 'bare', helmet: 'cap', crest: 'none', hair: 'short', shield: 'longOval', shieldScale: 0.94, shieldDy: 2.4,
          weapon: 'sword', falcata: true, tribal: true, sleeve: true, moustache: true,
        };
      }
      return {
        torso: 'bare', skirt: false, legs: 'trousers', helmet: 'none', crest: 'none', hair: i % 2 ? 'wild' : 'long',
        shield: 'longOval', shieldScale: 0.94, shieldDy: 2.4, weapon: 'sword', tribal: true, moustache: true, torc: true,
      };
    }
    case 'MI':
      return {
        torso: 'tunic', skirt: true, legs: greek ? 'greaves' : 'bare', helmet: greek ? 'pilos' : punic ? 'attic' : 'montefortino',
        crest: 'knob', hair: 'short', shield: greek ? 'aspis' : 'oval', shieldScale: greek ? 0.92 : 1, weapon: 'spear', sleeve: true,
      };
    case 'HI':
    default:
      if (greek) {
        return {
          torso: 'linen', skirt: true, pteruges: true, legs: 'greaves', helmet: 'corinthian', crest: 'tall', hair: 'short',
          shield: 'aspis', weapon: 'longSpear',
        };
      }
      if (punic) {
        return {
          torso: 'linen', skirt: true, pteruges: true, legs: 'greaves', helmet: 'attic', crest: 'horsehair', hair: 'short',
          shield: 'aspis', weapon: 'longSpear', beard: i % 2 === 0,
        };
      }
      return {
        torso: 'mail', skirt: true, legs: 'bare', helmet: 'montefortino', crest: 'plumes', hair: 'short', shield: 'scutum',
        weapon: 'pilum', sleeve: false,
      };
  }
}

const LEANS = [0, 1.4, -1, 0.7];

/** One foot miniature. */
export function FootFigure({ kit, p, i }: { kit: FootKit; p: Palette; i: number }) {
  const f: Fig = kit.tribal ? makeFig(p, i, TRIBAL_SKIN, TRIBAL_HAIR) : makeFig(p, i);
  const lean = LEANS[i % 4];
  const sleeve = kit.sleeve ? (kit.torso === 'leather' || kit.torso === 'linen' ? p.tunic : p.tunic) : kit.torso === 'mail' ? p.iron : undefined;
  const farShoulder: [number, number] = [-1.6, -20.4];
  const nearShoulder: [number, number] = [2.2, -20.6];
  const w = kit.weapon;

  // --- far side weapon (behind the body)
  let behind: JSX.Element | null = null;
  let farArm: JSX.Element | null = null;
  let front: JSX.Element | null = null;
  if (w === 'spear' || w === 'longSpear' || w === 'pilum') {
    const long = w === 'longSpear';
    const x1 = long ? -4.4 : -3.6;
    const y1 = long ? 0.2 : 0.8;
    const x2 = (long ? 8.4 : 6.6) + lean;
    const y2 = long ? -42.5 : w === 'pilum' ? -41.5 : -39;
    const t = (y1 + 15) / (y1 - y2);
    const hx = x1 + (x2 - x1) * t;
    behind = (
      <Spear x1={x1} y1={y1} x2={x2} y2={y2} f={f} w={long ? 1.0 : 0.95} blade={w === 'pilum' ? 2.2 : long ? 4.2 : 3.8}
        bladeW={w === 'pilum' ? 1.1 : 1.6} shank={w === 'pilum' ? 10 : 0} butt={long} />
    );
    farArm = <Arm s={farShoulder} e={[-3.6, -16.4]} h={[hx, -15]} f={f} sleeve={sleeve} />;
  } else if (w === 'javelin') {
    behind = <Spear x1={-11 - lean * 0.3} y1={-27 + lean * 0.4} x2={11.2} y2={-34.6 - lean * 0.6} f={f} w={0.75} blade={2.6} bladeW={1.2} />;
    farArm = <Arm s={farShoulder} e={[-5.2, -24]} h={[-3.4, -29.6]} f={f} sleeve={sleeve} />;
  } else if (w === 'sword') {
    const fwd = i % 2 === 0;
    const hx = fwd ? 0.2 : -2.2;
    const hy = -30.4;
    const tx = fwd ? 7.8 : -7.2;
    const ty = fwd ? -39.8 : -40.6;
    const len = Math.hypot(tx - hx, ty - hy);
    const ux = (tx - hx) / len;
    const uy = (ty - hy) / len;
    const nx = -uy;
    const ny = ux;
    const bw = kit.falcata ? 1.1 : 0.85;
    const r = (n: number) => n.toFixed(2);
    const gx = hx + ux * 1.2;
    const gy = hy + uy * 1.2;
    const blade = kit.falcata
      ? `M${r(gx + nx * bw)} ${r(gy + ny * bw)} Q${r(gx + ux * 6 + nx * 2.2)} ${r(gy + uy * 6 + ny * 2.2)} ${r(tx)} ${r(ty)} Q${r(gx + ux * 5)} ${r(gy + uy * 5)} ${r(gx - nx * bw)} ${r(gy - ny * bw)} Z`
      : `M${r(gx + nx * bw)} ${r(gy + ny * bw)} L${r(tx + nx * 0.35 - ux * 1.2)} ${r(ty + ny * 0.35 - uy * 1.2)} L${r(tx)} ${r(ty)} L${r(tx - nx * 0.35 - ux * 1.2)} ${r(ty - ny * 0.35 - uy * 1.2)} L${r(gx - nx * bw)} ${r(gy - ny * bw)} Z`;
    behind = (
      <g>
        <path d={blade} fill={p.ironLight} stroke={OL} strokeWidth={0.6} strokeLinejoin="round" />
        <Hi d={`M${r(gx + ux * 1.5)} ${r(gy + uy * 1.5)} L${r(tx - ux * 2)} ${r(ty - uy * 2)}`} c={p.iron} w={0.35} />
        <Line2 d={`M${r(gx + nx * 1.7)} ${r(gy + ny * 1.7)} L${r(gx - nx * 1.7)} ${r(gy - ny * 1.7)}`} w={0.7} c={p.metal} ow={0.45} />
      </g>
    );
    farArm = <Arm s={farShoulder} e={fwd ? [-4.4, -25.2] : [-5.2, -24.6]} h={[hx, hy]} f={f} sleeve={sleeve} />;
  } else if (w === 'bow') {
    behind = (
      <g>
        <Shape d="M-6.6 -23.4 L-4.1 -24.3 L-1.6 -11.6 L-4.1 -10.8 Z" f={p.leather} sw={0.6} />
        <Hi d="M-5.6 -23.4 L-3 -11.2" c={p.leatherShade} w={0.6} />
        <g stroke={p.linen} strokeWidth={0.9} strokeLinecap="round">
          <path d="M-5.9 -24.2 L-7.4 -27.4 M-4.9 -24.6 L-5.7 -28 M-6.6 -23.8 L-8.6 -26.4" />
        </g>
      </g>
    );
    farArm = <Arm s={farShoulder} e={[-6, -21.6]} h={[-0.2, -22.6]} f={f} sleeve={sleeve} />;
    front = (
      <g>
        <path d="M8.2 -32.4 L-0.2 -22.6 L8.2 -10.8" fill="none" stroke={p.linen} strokeWidth={0.4} />
        <Line2 d="M-0.6 -22.6 L13.6 -21.6" w={0.5} c={p.wood} ow={0.35} />
        <path d="M13.6 -21.6 L12.2 -22.5 L12.3 -20.7 Z" fill={p.ironLight} stroke={OL} strokeWidth={0.35} />
        <Arm s={nearShoulder} e={[6.4, -21]} h={[10.4, -21.5]} f={f} near sleeve={sleeve} />
        <Line2 d="M8.2 -32.4 Q13.8 -21.6 8.2 -10.8" w={1.0} c={p.wood} ow={0.55} />
        <circle cx={10.6} cy={-21.5} r={1.15} fill={f.skin} stroke={OL} strokeWidth={0.55} />
      </g>
    );
  } else if (w === 'sling') {
    behind = (
      <g>
        <Line2 d="M-3.4 -13.2 L2.6 -21.8" w={0.6} c={p.leatherShade} ow={0.35} />
      </g>
    );
    farArm = <Arm s={farShoulder} e={[-3.8, -25.8]} h={[-1.2, -31]} f={f} sleeve={sleeve} />;
    const rot = [0, 1, 2, 3][i % 4];
    const sx = [6.4, 5.6, 7, 6][rot];
    const sy = [-35.8, -36.6, -35, -36][rot];
    front = (
      <g>
        <path d="M-6.6 -32.4 A7.4 2.6 0 1 1 5.4 -32.2" fill="none" stroke="#fff6dc" strokeWidth={0.7} opacity={0.55} strokeLinecap="round" />
        <path d={`M${sx - 7} ${sy + 0.6} A7.4 2.6 0 0 1 ${sx} ${sy}`} fill="none" stroke="#fff6dc" strokeWidth={1.3} opacity={0.8} strokeLinecap="round" />
        <path d={`M-1.2 -31 Q2.4 -34.4 ${sx} ${sy}`} fill="none" stroke={OL} strokeWidth={0.5} />
        <circle cx={sx} cy={sy} r={1.05} fill={p.leather} stroke={OL} strokeWidth={0.45} />
        <Arm s={nearShoulder} e={[4.6, -16.6]} h={[7.2, -15.2]} f={f} near sleeve={sleeve} />
        <Shape d="M-5.4 -13 C-6.4 -11.2 -5.8 -9.2 -4.2 -9 C-2.8 -9.2 -2.4 -11 -3.2 -12.8 Z" f={p.leather} sw={0.55} />
      </g>
    );
  }

  // --- shield-hand extras
  let spare: JSX.Element | null = null;
  let nearArm: JSX.Element | null = null;
  if (kit.spare === 'javelins') {
    spare = (
      <g>
        <Spear x1={2.6} y1={-6.4} x2={9.2} y2={-31.4} f={f} w={0.65} blade={2.2} bladeW={1.0} />
        <Spear x1={3.8} y1={-6.2} x2={11.2} y2={-30} f={f} w={0.65} blade={2.2} bladeW={1.0} />
      </g>
    );
  } else if (kit.spare === 'spear') {
    spare = <Spear x1={1.4} y1={-1.8} x2={9.8 + lean} y2={-38} f={f} w={0.85} blade={3.4} bladeW={1.4} />;
  }
  if (kit.shield === 'round') {
    nearArm = <Arm s={nearShoulder} e={[4.4, -16.8]} h={[5.6, -15]} f={f} near sleeve={sleeve} />;
  }

  const hips = !kit.skirt && kit.legs === 'trousers' ? p.trousers : undefined;
  const sScale = kit.shieldScale ?? 1;

  return (
    <>
      {behind}
      {farArm}
      <LegsEl f={f} legs={kit.legs} />
      <Body f={f} torso={kit.torso} skirt={kit.skirt} pteruges={kit.pteruges} hips={hips} />
      <Head f={f} helmet={kit.helmet} crest={kit.crest} hair={kit.hair} beard={kit.beard} moustache={kit.moustache} torc={kit.torc} />
      {spare}
      {nearArm}
      {kit.shield !== 'none' && (
        <Shield kind={kit.shield} f={f} s={sScale} painted={kit.painted} dx={sScale !== 1 ? 4.2 * (1 - sScale) : 0} dy={(sScale !== 1 ? -13.6 * (1 - sScale) : 0) + (kit.shieldDy ?? 0)} />
      )}
      {front}
    </>
  );
}
