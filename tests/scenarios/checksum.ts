// Fingerprints of a built battle, so the manifest notices any change to the verified map data: terrain tallies (what is
// on the board, rivers split by crossing, rampart edges) and two checksums, one over every terrain hex and one over every
// unit and leader position. The tallies explain a failure; the checksums catch moves that leave every count unchanged.
import { colOf, rowOf, type GameState, type TerrainType } from '../../src/engine';

export interface TerrainTally {
  /** Hexes per terrain type; plain and void are not listed. */
  types: Partial<Record<TerrainType, number>>;
  /** River hexes by crossing: fordable with the dice caps, not fordable, fordable without caps ('nocap'). */
  rivers: { ford: number; blocked: number; nocap: number };
  /** Rampart hexes and the number of protected hexsides over all of them. */
  ramparts: { hexes: number; edges: number };
}

export interface Checksums {
  /** Every non-plain terrain hex with its ford flag or rampart edges. */
  terrain: string;
  /** Every unit (side, type, hex, elite) and leader (side, name, hex, traits). */
  pieces: string;
}

/** 32-bit FNV-1a of the UTF-16 code units, as 8 hex digits. */
export function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const popcount = (n: number): number => {
  let c = 0;
  for (let m = n; m; m &= m - 1) c++;
  return c;
};

const at = (h: number): string => `${rowOf(h)},${colOf(h)}`;

export function terrainTally(s: GameState): TerrainTally {
  const tally: TerrainTally = { types: {}, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } };
  s.terrain.forEach((t, h) => {
    if (t === 'plain' || t === 'void') return;
    tally.types[t] = (tally.types[t] ?? 0) + 1;
    if (t === 'river') tally.rivers[s.noCap[h] ? 'nocap' : s.fords[h] ? 'ford' : 'blocked']++;
    if (t === 'rampart') {
      tally.ramparts.hexes++;
      tally.ramparts.edges += popcount(s.rampart[h]);
    }
  });
  return tally;
}

/** The lines the terrain checksum is taken over: `type:r,c` plus the crossing of a river or the edge mask of a rampart. */
export function terrainLines(s: GameState): string[] {
  const lines: string[] = [];
  s.terrain.forEach((t, h) => {
    if (t === 'plain' || t === 'void') return;
    const extra = t === 'river' ? `:${s.noCap[h] ? 'nocap' : s.fords[h] ? 'ford' : 'blocked'}` : t === 'rampart' ? `:m${s.rampart[h]}` : '';
    lines.push(`${t}:${at(h)}${extra}`);
  });
  return lines.sort();
}

/** One line per unit (`side:type:r,c[:elite]`) and leader (`side:name:r,c[:traits]`; `off` = waiting to be placed). */
export function pieceLines(s: GameState): string[] {
  const units = s.units.map((u) => `${u.side}:${u.type}:${at(u.hex)}${u.elite ? `:${u.elite}` : ''}`);
  const leaders = s.leaders.map((l) => `${l.side}:${l.name}:${l.hex >= 0 ? at(l.hex) : 'off'}${l.traits?.length ? `:${[...l.traits].sort().join('+')}` : ''}`);
  return [...units, ...leaders].sort();
}

export function checksums(s: GameState): Checksums {
  return { terrain: fnv1a(terrainLines(s).join('\n')), pieces: fnv1a(pieceLines(s).join('\n')) };
}
