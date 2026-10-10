// Battle objectives (rules-reference §18.4): scenario data resolved into `ObjectiveDef`s, and scoring (banner totals and
// victory live in banners.ts).
// Implemented: capture by stopping on a hex (011 Baecula, 114 Gabiene) and exits off the board (010 Castulo). The other
// objective kinds and options of `ObjectiveDef` are typed but rejected by `resolveObjectives` until they are played.
import { gainBanner } from './banners';
import { hexId, onBoard } from './hex';
import { attachedLeader, other } from './query';
import type { ObjectiveSetup, ScenarioSetup } from './setup';
import { UNIT_STATS } from './units';
import {
  ROWS,
  type FlowCtx, type GameState, type HexId, type ObjectiveDef, type ObjectiveOf, type ObjectiveState, type Side,
  type TerrainType, type Unit,
} from './types';

// ---------------------------------------------------------------------------
// setup
// ---------------------------------------------------------------------------

/** Scenario data the engine does not play yet. */
function unsupported(what: string): never {
  throw new Error(`${what} is not supported yet`);
}

function checkSide(kind: string, side: unknown): Side {
  if (side !== 'top' && side !== 'bottom') throw new Error(`${kind} objective: unknown side ${String(side)}`);
  return side;
}

/** Listed `[r, c]` hexes as ids, ascending and without repeats; `bad` names what is wrong with a hex (or null). */
function listedHexes(kind: string, list: [number, number][], bad: (r: number, c: number, h: HexId) => string | null): HexId[] {
  const out = list.map(([r, c]) => {
    if (!onBoard(r, c)) throw new Error(`${kind} objective: ${r},${c} is off the board`);
    const h = hexId(r, c);
    const why = bad(r, c, h);
    if (why) throw new Error(`${kind} objective: ${r},${c} ${why}`);
    return h;
  });
  return [...new Set(out)].sort((a, b) => a - b);
}

function needHexes(kind: string, hexes: HexId[]): HexId[] {
  if (!hexes.length) throw new Error(`${kind} objective needs at least one hex`);
  return hexes;
}

function resolveCapture(o: Extract<ObjectiveSetup, { kind: 'capture' }>, terrain: TerrainType[], players: GameState['players']): ObjectiveOf<'capture'> {
  const side = checkSide('capture', o.side);
  const when = o.when ?? 'stop';
  if (when !== 'stop') unsupported(`capture objective: when '${String(when)}'`);
  if (o.together) unsupported('capture objective: together');
  if (o.remove) unsupported('capture objective: remove');
  const banners = o.banners ?? [1];
  if (!Array.isArray(banners) || !banners.length || banners.some((b) => !Number.isInteger(b) || b < 0)) {
    throw new Error('capture objective: banners must be a list of whole numbers (0 or more)');
  }
  const camps = o.hexes
    ? listedHexes('capture', o.hexes, (_r, _c, h) => (terrain[h] === 'camp' ? null : 'is not a camp'))
    : terrain.flatMap((t, h) => (t === 'camp' ? [h] : []));
  return {
    kind: 'capture', side, hexes: needHexes('capture', camps), when, banners: [...banners], together: 0, remove: false,
    text: o.text ?? `The ${players[side].army} army captures a ${players[other(side)].army} camp!`,
  };
}

function resolveExit(o: Extract<ObjectiveSetup, { kind: 'exit' }>, players: GameState['players']): ObjectiveOf<'exit'> {
  const side = checkSide('exit', o.side);
  const units = o.units ?? 'any';
  if (units !== 'any') unsupported(`exit objective: units '${String(units)}'`);
  if (o.leadersScore) unsupported('exit objective: leadersScore');
  const edge = (r: number, c: number) => r === 0 || r === ROWS - 1 || !onBoard(r, c - 1) || !onBoard(r, c + 1);
  const hexes = listedHexes('exit', o.hexes ?? [], (r, c) => (edge(r, c) ? null : 'is not an edge hex'));
  return {
    kind: 'exit', side, hexes: needHexes('exit', hexes), units, leadersScore: false,
    text: o.text ?? `${players[side].army} {unit} breaks through and exits the battlefield!`,
  };
}

/** Resolve and validate a scenario's objectives against its terrain and armies, filling in every default. */
export function resolveObjectives(setup: ScenarioSetup, terrain: TerrainType[], players: GameState['players']): ObjectiveDef[] {
  const list: unknown = setup.objectives ?? [];
  if (!Array.isArray(list)) throw new Error('objectives must be a list');
  return (list as ObjectiveSetup[]).map((o): ObjectiveDef => {
    switch (o.kind) {
      case 'capture': return resolveCapture(o, terrain, players);
      case 'exit': return resolveExit(o, players);
      case 'hold':
      case 'majority':
      case 'sectionClear':
        return unsupported(`${o.kind} objective`);
      default:
        throw new Error(`unknown objective kind ${String((o as { kind?: unknown }).kind)}`);
    }
  });
}

/** The state of an objective before play. */
export function newObjectiveState(): ObjectiveState {
  return { taken: [], held: { top: 0, bottom: 0 }, sections: [] };
}

// ---------------------------------------------------------------------------
// capture
// ---------------------------------------------------------------------------

/** Index of the 'stop' capture objective that would take hex `h` for a unit of `side` stopping there now, or -1. */
export function stopCaptureAt(s: GameState, side: Side, h: HexId): number {
  const { objectives, objState } = s.special;
  for (let i = 0; i < objectives.length; i++) {
    const o = objectives[i];
    if (o.kind === 'capture' && o.when === 'stop' && o.side === side && o.hexes.includes(h) && !objState[i].taken.includes(h)) return i;
  }
  return -1;
}

/** Would a unit of `side` ending its move on hex `h` capture it now (a 'stop' capture objective, hex not yet taken)? */
export function capturableAt(s: GameState, side: Side, h: HexId): boolean {
  return stopCaptureAt(s, side, h) >= 0;
}

/** Banners the next capture for capture objective `i` scores (`banners` in order, the last value repeating). */
export function nextCaptureBanners(s: GameState, i: number): number {
  const o = s.special.objectives[i] as ObjectiveOf<'capture'>;
  return o.banners[Math.min(s.special.objState[i].taken.length, o.banners.length - 1)];
}

/**
 * Unit `u` has ended its move, or its close-combat sequence, on its hex: a 'stop' capture objective of its side takes the
 * hex (logged with the objective's text) and scores its banners. Passing through, retreating or evading never captures.
 */
export function captureOnStop(s: GameState, ctx: FlowCtx, u: Unit) {
  const i = stopCaptureAt(s, u.side, u.hex);
  if (i < 0) return;
  const o = s.special.objectives[i] as ObjectiveOf<'capture'>;
  const n = nextCaptureBanners(s, i);
  s.special.objState[i].taken.push(u.hex);
  ctx.emit({ t: 'log', text: o.text, side: u.side });
  for (let k = 0; k < n; k++) gainBanner(s, ctx, u.side, 'camp captured');
}

// ---------------------------------------------------------------------------
// exits
// ---------------------------------------------------------------------------

/** Does exit objective `o` let unit `u` leave? (Its side; every exit lets any unit type leave, `units: 'any'`.) */
export function exitAllows(o: ObjectiveOf<'exit'>, u: Unit): boolean {
  return o.side === u.side;
}

/** Hexes unit `u` may step off the board from (those of the exit objectives that let it leave; usually none). */
export function exitHexes(s: GameState, u: Unit): HexId[] {
  const out: HexId[] = [];
  for (const o of s.special.objectives) if (o.kind === 'exit' && exitAllows(o, u)) out.push(...o.hexes);
  return out;
}

/**
 * Unit `u`, standing on an exit hex of its side, steps off the board (the caller emits the `move` event). It and its
 * attached leader are removed, not eliminated (no banner for the enemy), and its side scores 1 banner.
 */
export function exitUnit(s: GameState, ctx: FlowCtx, u: Unit) {
  const o = s.special.objectives.find((x): x is ObjectiveOf<'exit'> => x.kind === 'exit' && exitAllows(x, u) && x.hexes.includes(u.hex));
  if (!o) throw new Error(`${u.id} cannot exit from hex ${u.hex}`);
  const l = attachedLeader(s, u);
  s.units = s.units.filter((x) => x.id !== u.id);
  if (l) s.leaders = s.leaders.filter((x) => x.id !== l.id);
  ctx.emit({ t: 'log', text: o.text.replaceAll('{unit}', UNIT_STATS[u.type].name), side: u.side });
  gainBanner(s, ctx, u.side, 'unit exited');
}
