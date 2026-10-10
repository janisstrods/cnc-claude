// Battle objectives (rules-reference §18.4): scenario data resolved into `ObjectiveDef`s, and their play. Captures (by
// stopping on a hex: 011 Baecula, 114 Gabiene; at the start of the side's turn: Expansion #2), held banners (hold,
// majority, section clear) and exits off the board (010 Castulo, Expansion #2). Banner totals and victory live in
// banners.ts. Only `exit.leadersScore` (Expansion #3) is typed but still rejected by `resolveObjectives`.
//
// Hooks (flow.ts): `turnStartObjectives` before the card is played, `turnEndObjectives` before the draw, `captureOnStop`
// where a unit ends its move or its close-combat sequence, and `updateHeld` after every change of unit positions (moves,
// momentum advances, retreats, evades, eliminations, removals, exits) and after every battle action.
import { bannerTotal, bannerVictory, gainBanner, heldBanners } from './banners';
import { hexId, onBoard, sectionsOf } from './hex';
import { attachedLeader, other, unitAt } from './query';
import type { ObjectiveSetup, ScenarioSetup } from './setup';
import { setTerrain } from './terrain';
import { UNIT_STATS } from './units';
import {
  ROWS,
  type FlowCtx, type GameState, type HexId, type ObjectiveDef, type ObjectiveOf, type ObjectiveState, type SectionName,
  type Side, type TerrainType, type Unit,
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
  if (!Array.isArray(list)) throw new Error(`${kind} objective: hexes must be a list of [r, c]`);
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

const anyHex = () => null;
const atLeast = (v: unknown, min: number): v is number => Number.isInteger(v) && (v as number) >= min;

function resolveCapture(o: ObjectiveSetupOf<'capture'>, terrain: TerrainType[], players: GameState['players']): ObjectiveOf<'capture'> {
  const side = checkSide('capture', o.side);
  const when = o.when ?? 'stop';
  if (when !== 'stop' && when !== 'turnStart') throw new Error(`capture objective: unknown when ${String(when)}`);
  const banners = o.banners ?? [1];
  if (!Array.isArray(banners) || !banners.length || banners.some((b) => !atLeast(b, 0))) {
    throw new Error('capture objective: banners must be a list of whole numbers (0 or more)');
  }
  // a camp, or a rampart standing in for one (215 Belgae: the Roman "unfinished camp")
  const camps = o.hexes
    ? listedHexes('capture', o.hexes, (_r, _c, h) => (terrain[h] === 'camp' || terrain[h] === 'rampart' ? null : 'is not a camp or rampart'))
    : terrain.flatMap((t, h) => (t === 'camp' ? [h] : []));
  const hexes = needHexes('capture', camps);
  const together = o.together ?? 0;
  if (together !== 0) {
    if (when !== 'turnStart') throw new Error("capture objective: together needs when 'turnStart'");
    if (!atLeast(together, 1) || together > hexes.length) {
      throw new Error(`capture objective: together must be a whole number from 1 to the number of hexes (${hexes.length})`);
    }
  }
  const remove = o.remove ?? false;
  if (typeof remove !== 'boolean') throw new Error('capture objective: remove must be true or false');
  return {
    kind: 'capture', side, hexes, when, banners: [...banners], together, remove,
    text: o.text ?? `The ${players[side].army} army captures a ${players[other(side)].army} camp!`,
  };
}

function resolveHold(o: ObjectiveSetupOf<'hold'>, players: GameState['players']): ObjectiveOf<'hold'> {
  const side = checkSide('hold', o.side);
  const hexes = needHexes('hold', listedHexes('hold', o.hexes ?? [], anyHex));
  const max = o.max ?? hexes.length;
  if (!atLeast(max, 1)) throw new Error('hold objective: max must be a whole number, 1 or more');
  return { kind: 'hold', side, hexes, max, text: o.text ?? `The ${players[side].army} army holds an objective.` };
}

function resolveMajority(o: ObjectiveSetupOf<'majority'>): ObjectiveOf<'majority'> {
  const sides: unknown = o.sides;
  if (!Array.isArray(sides) || !sides.length || new Set(sides).size !== sides.length) {
    throw new Error('majority objective: sides must list top and/or bottom, once each');
  }
  for (const side of sides) checkSide('majority', side);
  const hexes = needHexes('majority', listedHexes('majority', o.hexes ?? [], anyHex));
  if (!atLeast(o.banners, 1)) throw new Error('majority objective: banners must be a whole number, 1 or more');
  if (o.when !== 'turnEnd' && o.when !== 'always') throw new Error(`majority objective: unknown when ${String(o.when)}`);
  return {
    kind: 'majority', sides: [...(sides as Side[])], hexes, banners: o.banners, when: o.when,
    text: o.text ?? 'Control of the objective hexes.',
  };
}

function resolveSectionClear(o: ObjectiveSetupOf<'sectionClear'>, players: GameState['players']): ObjectiveOf<'sectionClear'> {
  const side = checkSide('sectionClear', o.side);
  return { kind: 'sectionClear', side, text: o.text ?? `The ${players[side].army} army has cleared a section of the enemy.` };
}

function resolveExit(o: ObjectiveSetupOf<'exit'>, players: GameState['players']): ObjectiveOf<'exit'> {
  const side = checkSide('exit', o.side);
  const units = o.units ?? 'any';
  if (units !== 'any' && units !== 'foot' && units !== 'cavalry') throw new Error(`exit objective: unknown units ${String(units)}`);
  if (o.leadersScore) unsupported('exit objective: leadersScore'); // Expansion #3 (317)
  const edge = (r: number, c: number) => r === 0 || r === ROWS - 1 || !onBoard(r, c - 1) || !onBoard(r, c + 1);
  const hexes = listedHexes('exit', o.hexes ?? [], (r, c) => (edge(r, c) ? null : 'is not an edge hex'));
  return {
    kind: 'exit', side, hexes: needHexes('exit', hexes), units, leadersScore: false,
    text: o.text ?? `${players[side].army} {unit} breaks through and exits the battlefield!`,
  };
}

type ObjectiveSetupOf<K extends ObjectiveSetup['kind']> = Extract<ObjectiveSetup, { kind: K }>;

/** Resolve and validate a scenario's objectives against its terrain and armies, filling in every default. */
export function resolveObjectives(setup: ScenarioSetup, terrain: TerrainType[], players: GameState['players']): ObjectiveDef[] {
  const list: unknown = setup.objectives ?? [];
  if (!Array.isArray(list)) throw new Error('objectives must be a list');
  return (list as ObjectiveSetup[]).map((o): ObjectiveDef => {
    switch (o.kind) {
      case 'capture': return resolveCapture(o, terrain, players);
      case 'hold': return resolveHold(o, players);
      case 'majority': return resolveMajority(o);
      case 'sectionClear': return resolveSectionClear(o, players);
      case 'exit': return resolveExit(o, players);
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
// board queries (only units count, never lone leaders)
// ---------------------------------------------------------------------------

const SIDES: readonly Side[] = ['top', 'bottom'];
const SECTIONS: readonly SectionName[] = ['left', 'center', 'right'];

function unitOfSide(s: GameState, h: HexId, side: Side): boolean {
  return unitAt(s, h)?.side === side;
}

function unitsOn(s: GameState, hexes: HexId[], side: Side): number {
  let n = 0;
  for (const h of hexes) if (unitOfSide(s, h, side)) n++;
  return n;
}

/** Is there a unit of `side`'s enemy in section `sec` (from `side`'s point of view; a boundary hex is in both)? */
function enemyIn(s: GameState, side: Side, sec: SectionName): boolean {
  return s.units.some((u) => u.side !== side && u.hex >= 0 && sectionsOf(u.hex, side).includes(sec));
}

/** The side of `o.sides` with strictly more units on the hexes, or null (a tie, or the leader is not in `sides`). */
function majorityHolder(s: GameState, o: ObjectiveOf<'majority'>): Side | null {
  const top = unitsOn(s, o.hexes, 'top');
  const bottom = unitsOn(s, o.hexes, 'bottom');
  const lead: Side | null = top > bottom ? 'top' : bottom > top ? 'bottom' : null;
  return lead && o.sides.includes(lead) ? lead : null;
}

function setMajority(st: ObjectiveState, o: ObjectiveOf<'majority'>, holder: Side | null) {
  for (const side of SIDES) st.held[side] = side === holder ? o.banners : 0;
}

// ---------------------------------------------------------------------------
// capture
// ---------------------------------------------------------------------------

/** Capture objective `i` (an error for any other kind). */
function captureObjective(s: GameState, i: number): ObjectiveOf<'capture'> {
  const o = s.special.objectives[i];
  if (o?.kind !== 'capture') throw new Error(`objective ${i} is not a capture objective`);
  return o;
}

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
  const o = captureObjective(s, i);
  return o.banners[Math.min(s.special.objState[i].taken.length, o.banners.length - 1)];
}

/**
 * One capture for capture objective `i`: `hexes` are taken (logged with the objective's text), removed when the
 * objective says so (open ground, `terrainChanged`), then the capture's banners are scored (permanent banners).
 */
function capture(s: GameState, ctx: FlowCtx, i: number, hexes: HexId[]) {
  const o = captureObjective(s, i);
  const n = nextCaptureBanners(s, i);
  s.special.objState[i].taken.push(...hexes);
  ctx.emit({ t: 'log', text: o.text, side: o.side });
  if (o.remove) for (const h of hexes) setTerrain(s, ctx, h, 'plain');
  for (let k = 0; k < n; k++) gainBanner(s, ctx, o.side, 'camp captured');
}

/**
 * Unit `u` has ended its move, or its close-combat sequence, on its hex: a 'stop' capture objective of its side takes the
 * hex (logged with the objective's text) and scores its banners. Passing through, retreating or evading never captures.
 */
export function captureOnStop(s: GameState, ctx: FlowCtx, u: Unit) {
  const i = stopCaptureAt(s, u.side, u.hex);
  if (i >= 0) capture(s, ctx, i, [u.hex]);
}

/**
 * The start of `side`'s turn, before its card (X2 Q9d): each 'turnStart' capture objective of `side` takes every untaken
 * listed hex holding one of its units, one capture per hex in hex order. With `together: n` nothing happens until n
 * untaken listed hexes are occupied at once; then one capture (`banners[0]`) takes every untaken listed hex. Then the
 * held banners are brought up to date. The battle may end here.
 */
export function turnStartObjectives(s: GameState, ctx: FlowCtx, side: Side): void {
  const { objectives, objState } = s.special;
  for (let i = 0; i < objectives.length; i++) {
    const o = objectives[i];
    if (o.kind !== 'capture' || o.when !== 'turnStart' || o.side !== side) continue;
    const open = o.hexes.filter((h) => !objState[i].taken.includes(h));
    const occupied = open.filter((h) => unitOfSide(s, h, side));
    if (o.together) {
      if (occupied.length >= o.together && !s.winner) capture(s, ctx, i, open);
    } else {
      for (const h of occupied) if (!s.winner) capture(s, ctx, i, [h]);
    }
  }
  updateHeld(s, ctx);
}

// ---------------------------------------------------------------------------
// held banners
// ---------------------------------------------------------------------------

/** Held banners of every objective, per side (to compare after a change). */
function heldSnapshot(s: GameState): Record<Side, number>[] {
  return s.special.objState.map((st) => ({ ...st.held }));
}

/** The objectives decided by positions alone: hold, majority 'always', and the loss of cleared sections. */
function refreshHeld(s: GameState) {
  const { objectives, objState } = s.special;
  for (let i = 0; i < objectives.length; i++) {
    const o = objectives[i];
    const st = objState[i];
    if (o.kind === 'hold') st.held[o.side] = Math.min(o.max, unitsOn(s, o.hexes, o.side));
    else if (o.kind === 'majority' && o.when === 'always') setMajority(st, o, majorityHolder(s, o));
    else if (o.kind === 'sectionClear') {
      st.sections = st.sections.filter((sec) => !enemyIn(s, o.side, sec));
      st.held[o.side] = st.sections.length;
    }
  }
}

/**
 * Emit a `held` event for each side whose held banners differ from `before` (losses first, then the active side; reason
 * = the text of the first objective that changed for it), then the victory check for each side whose total rose.
 */
function settleHeld(s: GameState, ctx: FlowCtx, before: Record<Side, number>[]) {
  const { objectives, objState } = s.special;
  const delta = (side: Side) => objState.reduce((n, st, i) => n + st.held[side] - before[i][side], 0);
  const sides = [s.active, other(s.active)].filter((side) => delta(side) !== 0)
    .sort((a, b) => Math.sign(delta(a)) - Math.sign(delta(b)));
  for (const side of sides) {
    const i = objState.findIndex((st, k) => st.held[side] !== before[k][side]);
    ctx.emit({ t: 'held', side, held: heldBanners(s, side), total: bannerTotal(s, side), reason: objectives[i].text });
  }
  for (const side of sides) if (delta(side) > 0 && bannerVictory(s, ctx, side)) return;
}

/**
 * Bring the held banners up to date after units moved, left the board or were eliminated (X2 Q9a–c): `hold` (1 per
 * listed hex a unit of the side stands on, at most `max`), `majority` 'always', and `sectionClear` sections lost to an
 * enemy unit. Emits `held` for each side whose held banners changed and checks victory for each side whose total rose.
 * Emits nothing when nothing changed (always in battles without such objectives) or once the battle is over.
 */
export function updateHeld(s: GameState, ctx: FlowCtx): void {
  if (!s.special.objectives.length || s.winner) return;
  const before = heldSnapshot(s);
  refreshHeld(s);
  settleHeld(s, ctx, before);
}

/**
 * The end of `side`'s turn, before the draw (X2 Q9b–c): every `majority` 'turnEnd' objective goes to the side with more
 * units on its hexes (a tie: nobody), and each `sectionClear` objective of `side` scores every section without an enemy
 * unit. Then `held` events and the victory check, as `updateHeld`.
 */
export function turnEndObjectives(s: GameState, ctx: FlowCtx, side: Side): void {
  if (!s.special.objectives.length || s.winner) return;
  const { objectives, objState } = s.special;
  const before = heldSnapshot(s);
  for (let i = 0; i < objectives.length; i++) {
    const o = objectives[i];
    if (o.kind === 'majority' && o.when === 'turnEnd') setMajority(objState[i], o, majorityHolder(s, o));
    else if (o.kind === 'sectionClear' && o.side === side) objState[i].sections = SECTIONS.filter((sec) => !enemyIn(s, side, sec));
  }
  refreshHeld(s);
  settleHeld(s, ctx, before);
}

// ---------------------------------------------------------------------------
// exits
// ---------------------------------------------------------------------------

/** Does exit objective `o` let unit `u` leave? Its side, and its `units` filter: foot units or cavalry only (212). */
export function exitAllows(o: ObjectiveOf<'exit'>, u: Unit): boolean {
  if (o.side !== u.side) return false;
  if (o.units === 'foot') return UNIT_STATS[u.type].foot;
  if (o.units === 'cavalry') return UNIT_STATS[u.type].cavalry;
  return true;
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
  updateHeld(s, ctx); // the unit is gone before its banner counts
  gainBanner(s, ctx, u.side, 'unit exited');
}
