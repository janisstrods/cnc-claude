// Small single-hex terrain swatch for tooltips and the legend (same painters as the board).
import { useId, useMemo } from 'react';
import type { TerrainType } from '../../engine/types';
import { HEX_R } from '../geometry';
import { paintDitches } from './ditch';
import { paintBroken, paintCamps } from './ground';
import { corner, iconCtx } from './hexmath';
import { paintHills, paintSteep } from './hills';
import { paintRamparts } from './rampart';
import { P } from './palette';
import { paintCoastFords, paintSea } from './sea';
import { paintForests, paintMarsh } from './vegetation';
import { paintCityWalls, paintRomeWalls, paintTowns } from './walls';
import { paintLakes, paintRivers } from './water';

const cache = new Map<string, JSX.Element | null>();

/** The swatch shows a rampart protecting its two upper sides (NE + NW, the bits of a `faces: 'top'` piece). */
const ICON_RAMPART = (1 << 1) | (1 << 2);

/** The sea swatch is a stretch of coast: land across the hex's W and SW sides, open water everywhere else. */
const iconSeaCell = (r: number, c: number) => !(c === -1 && (r === 0 || r === 1));
/** On the coast-ford swatch the stones wade in from that beach (towards the W and SW sides). */
const ICON_TO_LAND = { x: -Math.sqrt(3) / 2, y: 0.5 };

function iconArt(t: TerrainType, ford: boolean, hexArt?: string, hill = false): JSX.Element | null {
  // a coast played as a ford (217): a fordable river in the rules, drawn as sea shallows
  if (hexArt === 'coast' && t === 'river') t = 'sea';
  // Expansion #3: an impassable city wall or town (`steep` with art 'wall' or 'town'); a hill under a camp or wall
  const city = t === 'steep' && (hexArt === 'wall' || hexArt === 'town') ? hexArt : undefined;
  const under = hill && (t === 'camp' || t === 'wall');
  const key = `${t}:${ford ? 1 : 0}${city ? `:${city}` : ''}${under ? ':hill' : ''}`;
  if (cache.has(key)) return cache.get(key)!;
  const ctx = iconCtx(t, ford, under, city);
  let el: JSX.Element | null = null;
  const hillUnder = under ? <g transform="scale(0.82)">{paintHills(ctx, undefined, 1.9)}</g> : null;
  switch (t) {
    case 'hill':
      el = <g transform="scale(0.82)">{paintHills(ctx, undefined, 1.9)}</g>;
      break;
    case 'forest':
      el = paintForests(ctx);
      break;
    case 'river':
      el = paintRivers(ctx);
      break;
    case 'lake':
      el = paintLakes(ctx);
      break;
    case 'sea':
      // pull the coast into the hex so the beach shows inside the swatch; a fordable coast is shallow, with ford stones
      el = ford ? (
        <>
          {paintSea(ctx, { seaCell: iconSeaCell, shift: 15, fordCell: () => true })}
          {paintCoastFords(ctx, ICON_TO_LAND)}
        </>
      ) : (
        paintSea(ctx, { seaCell: iconSeaCell, shift: 15 })
      );
      break;
    case 'ditch':
      el = paintDitches(ctx);
      break;
    case 'rampart':
      // shrunk a little so the ditch outside the hexsides stays inside the swatch
      el = <g transform="scale(0.86)">{paintRamparts(ctx, [ICON_RAMPART], { openEdges: false })}</g>;
      break;
    case 'steep':
      if (city === 'town') el = <g transform="scale(0.92)">{paintTowns(ctx)}</g>;
      else if (city === 'wall') el = <g transform="scale(0.86)">{paintRomeWalls(ctx, false)}</g>;
      else el = paintSteep(ctx);
      break;
    case 'camp':
      el = <>{hillUnder}{paintCamps(ctx)}</>;
      break;
    case 'wall':
      el = <>{hillUnder}<g transform="scale(0.9)">{paintCityWalls(ctx, false)}</g></>;
      break;
    case 'broken':
      el = paintBroken(ctx);
      break;
    case 'marsh':
      el = paintMarsh(ctx);
      break;
    case 'plain':
      el = (
        <path
          d="M-22,-14l-2,-5M-22,-14l0,-6M-22,-14l2,-5M14,-22l-2,-5M14,-22l0,-6M14,-22l2,-5M-6,8l-2,-5M-6,8l0,-6M-6,8l2,-5M24,14l-2,-5M24,14l0,-6M24,14l2,-5M-18,26l-2,-5M-18,26l0,-6M-18,26l2,-5M6,32l-2,-5M6,32l0,-6M6,32l2,-5"
          fill="none"
          stroke={P.tuftDark}
          strokeWidth={1.4}
          strokeLinecap="round"
          opacity={0.7}
        />
      );
      break;
    default:
      el = null;
  }
  cache.set(key, el);
  return el;
}

const HEX_PTS = Array.from({ length: 6 }, (_, i) => corner({ x: 0, y: 0 }, i, HEX_R))
  .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
  .join(' ');

/**
 * A painted hex swatch of terrain `t`, `size` pixels square. `art`: the hex's art where it differs from its terrain
 * (`terrainArtOf`): `'coast'` on a fordable river draws a coast played as a ford (217); `'wall'` or `'town'` on a `steep`
 * hex an impassable city wall (301) or a walled town (303, 304). `hill`: a hill under a camp or a wall (308,
 * `GameState.hillUnder`).
 */
export function TerrainIcon({ t, ford = false, art: hexArt, hill = false, size }: { t: TerrainType; ford?: boolean; art?: string; hill?: boolean; size: number }): JSX.Element {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const art = useMemo(() => iconArt(t, ford, hexArt, hill), [t, ford, hexArt, hill]);
  const clip = `ti${uid}`;
  return (
    <svg width={size} height={size} viewBox="-52 -52 104 104" style={{ display: 'inline-block', verticalAlign: 'middle' }} aria-hidden>
      <defs>
        <clipPath id={clip}>
          <polygon points={HEX_PTS} />
        </clipPath>
      </defs>
      {t === 'void' ? (
        <polygon points={HEX_PTS} fill="#3d2b1d" opacity={0.6} />
      ) : (
        <>
          <polygon points={HEX_PTS} fill={P.grass} />
          <g clipPath={`url(#${clip})`}>{art}</g>
        </>
      )}
      <polygon points={HEX_PTS} fill="none" stroke="rgba(42,36,16,0.65)" strokeWidth={2.5} />
    </svg>
  );
}
