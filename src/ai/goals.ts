// Battle objectives of Expansion #2 in the AI's evaluation (rules-reference §18.4, §18.6): held banners projected from
// the positions (hold, majority, section clear), the potential of turn-start captures, approach pulls towards hold and
// majority hexes, section-clear threats, and the rampart breakers' ramparts. Exits and the 'stop' captures of the base
// game keep their pulls in evaluate.ts. Every term here is 0 in a battle without these objectives and rules (the base
// game and Expansion #1), so their evaluation is unchanged.
import { bannerTotal } from '../engine/banners';
import { sectionsOf } from '../engine/hex';
import { other } from '../engine/query';
import type { GameState, HexId, ObjectiveOf, SectionName, Side } from '../engine/types';
import { type Occ, hexDist } from './board';
import { bannerStep, bannersWorth, type Weights } from './values';

/** A held banner can be lost again: it is worth this share of a permanent one. */
export const HELD_SHARE = 0.85;
/** Sections a side would score at the end of its next turn (not yet held): this share of a held banner. */
const SECTION_POTENTIAL = 0.5;
/** A capture that scores nothing itself (201 Clusium's first two camps) is a step towards one that does. */
const CAPTURE_STEP = 0.3;
/** Pull of a side's nearest unit towards a hold hex it still needs, per hex closer (6 hexes out to 0). */
const HOLD_PULL = 0.08;
/** Majority hexes: value per unit of lead (up to 3), and the pull of the nearest units to free hexes. */
const MAJORITY_LEAD = 0.04;
const MAJORITY_PULL = 0.03;
/** A section with a single enemy unit left is close to cleared. */
const SECTION_THREAT = 0.05;
/** Each rampart still standing, for the side that breaks them (223): it shelters the enemy's foot. */
const RAMPART_LEFT = 0.04;

const SECTIONS: readonly SectionName[] = ['left', 'center', 'right'];

/** Does the battle have objectives that give held banners (hold, majority, section clear)? */
export function hasHeldObjectives(s: GameState): boolean {
  for (const o of s.special.objectives) if (o.kind === 'hold' || o.kind === 'majority' || o.kind === 'sectionClear') return true;
  return false;
}

/** Does the battle need goalTerms at all (objectives beyond the base game's exits and 'stop' captures, rampart breakers)? */
function hasGoals(s: GameState): boolean {
  if (s.special.rampartBreakers) return true;
  for (const o of s.special.objectives) {
    if (o.kind === 'exit' || (o.kind === 'capture' && o.when === 'stop')) continue;
    return true;
  }
  return false;
}

function unitsOn(occ: Occ, hexes: readonly HexId[], side: Side): number {
  let n = 0;
  for (const h of hexes) if (occ.unit[h]?.side === side) n++;
  return n;
}

/** The side of `o.sides` with strictly more units on the hexes, or null. */
function majorityHolder(occ: Occ, o: ObjectiveOf<'majority'>): Side | null {
  const top = unitsOn(occ, o.hexes, 'top');
  const bottom = unitsOn(occ, o.hexes, 'bottom');
  const lead: Side | null = top > bottom ? 'top' : bottom > top ? 'bottom' : null;
  return lead && o.sides.includes(lead) ? lead : null;
}

/** Sections (from `side`'s point of view) holding a unit of the other side (a boundary hex is in both). */
function enemySections(s: GameState, side: Side): Set<SectionName> {
  const out = new Set<SectionName>();
  for (const u of s.units) if (u.side !== side && u.hex >= 0) for (const sec of sectionsOf(u.hex, side)) out.add(sec);
  return out;
}

/**
 * Held banners `side` has right now if the engine counted them again (refreshHeld): hold hexes, majority decided at
 * once, section clear sections still free of the enemy; majority decided at turn end stays as last decided. A win
 * through these is immediate (the engine checks after every move).
 */
export function heldNow(s: GameState, occ: Occ, side: Side): number {
  const { objectives, objState } = s.special;
  let n = 0;
  for (let i = 0; i < objectives.length; i++) {
    const o = objectives[i];
    if (o.kind === 'hold') {
      if (o.side === side) n += Math.min(o.max, unitsOn(occ, o.hexes, side));
    } else if (o.kind === 'majority') {
      n += o.when === 'always' ? (majorityHolder(occ, o) === side ? o.banners : 0) : objState[i].held[side];
    } else if (o.kind === 'sectionClear' && o.side === side) {
      const enemy = enemySections(s, side);
      n += objState[i].sections.filter((sec) => !enemy.has(sec)).length;
    }
  }
  return n;
}

/**
 * Held banners `side` will have at the end of the current turn if the pieces stay put, and the section-clear sections
 * it would add at the end of its next turn (`potential`, not yet held: the opponent moves first). Hold and majority
 * follow the positions; section clear scores every enemy-free section at the end of the side's own turn and loses a
 * section at once when an enemy unit stands in it.
 */
function projectedHeld(s: GameState, occ: Occ, side: Side): { held: number; potential: number } {
  const { objectives, objState } = s.special;
  let held = 0;
  let potential = 0;
  for (let i = 0; i < objectives.length; i++) {
    const o = objectives[i];
    if (o.kind === 'hold') {
      if (o.side === side) held += Math.min(o.max, unitsOn(occ, o.hexes, side));
    } else if (o.kind === 'majority') {
      if (majorityHolder(occ, o) === side) held += o.banners;
    } else if (o.kind === 'sectionClear' && o.side === side) {
      const enemy = enemySections(s, side);
      const clear = SECTIONS.filter((sec) => !enemy.has(sec)).length;
      if (s.active === side) held += clear;
      else {
        const kept = objState[i].sections.filter((sec) => !enemy.has(sec)).length;
        held += kept;
        potential += clear - kept;
      }
    }
  }
  return { held, potential };
}

/** Value of `held` held banners (and `potential` sections to come) on top of `perm` permanent ones. */
function heldWorth(perm: number, held: number, potential: number, T: number): number {
  let v = HELD_SHARE * bannersWorth(perm, held, T);
  for (let k = 1; k <= potential; k++) v += SECTION_POTENTIAL * HELD_SHARE * bannerStep(perm + held + k, T);
  return v;
}

/** Chance that a unit standing on a capture hex is still there at the start of its side's next turn (rough). */
function holdsOn(occ: Occ, h: HexId, side: Side): number {
  let adj = 0;
  for (const u of occ.unit) if (u && u.side !== side && hexDist(u.hex, h) === 1) adj++;
  return adj === 0 ? 0.85 : adj === 1 ? 0.65 : 0.5;
}

/** Does a capture after the `k`-th (0-based) of objective `o` still score banners? */
function laterScores(o: ObjectiveOf<'capture'>, k: number): boolean {
  for (let j = k + 1; j < o.hexes.length; j++) if (o.banners[Math.min(j, o.banners.length - 1)] > 0) return true;
  return false;
}

/**
 * Turn-start captures (§18.4) from the capturing side's point of view: its units standing on untaken hexes now are
 * captures at the start of its next turn if they hold out (`holdsOn`); the n-th capture is worth its banners, or a step
 * towards the next scoring capture when it scores none (201); with `together` (211) nothing counts until enough hexes
 * are held at once. Plus the steps already taken towards a scoring capture.
 */
function captureTerm(s: GameState, occ: Occ, o: ObjectiveOf<'capture'>, taken: readonly HexId[]): number {
  const side = o.side;
  const T = s.bannersToWin;
  let total = bannerTotal(s, side);
  let v = 0;
  for (let k = 0; k < taken.length; k++) {
    if (o.banners[Math.min(k, o.banners.length - 1)] === 0 && taken.length < o.hexes.length && laterScores(o, taken.length - 1)) v += CAPTURE_STEP;
  }
  const on: HexId[] = [];
  for (const h of o.hexes) if (!taken.includes(h) && occ.unit[h]?.side === side) on.push(h);
  if (!on.length) return v;
  if (o.together) {
    let p = 0;
    for (const h of on) p += holdsOn(occ, h, side);
    p /= on.length;
    const worth = bannersWorth(total, o.banners[0], T);
    return v + (on.length >= o.together ? p * worth : 0.5 * p * worth * (on.length / o.together));
  }
  let k = taken.length;
  for (const h of on) {
    const b = o.banners[Math.min(k, o.banners.length - 1)];
    const worth = b > 0 ? bannersWorth(total, b, T) : laterScores(o, k) ? CAPTURE_STEP : 0;
    v += holdsOn(occ, h, side) * worth;
    total += b;
    k++;
  }
  return v;
}

/** Nearest unit of `side` (not standing on one of `hexes`) to hex h. */
function nearestFree(s: GameState, h: HexId, side: Side, hexes: readonly HexId[]): number {
  let best = 99;
  for (const u of s.units) {
    if (u.side !== side || u.hex < 0 || hexes.includes(u.hex)) continue;
    const d = hexDist(u.hex, h);
    if (d < best) best = d;
  }
  return best;
}

/** The `n` smallest values (sorts `xs`). */
function smallest(xs: number[], n: number): number[] {
  return xs.sort((a, b) => a - b).slice(0, n);
}

/** Hold objective: the holding side's pull towards the hexes it still needs (up to `max`). */
function holdPull(s: GameState, occ: Occ, o: ObjectiveOf<'hold'>): number {
  const missing = o.max - Math.min(o.max, unitsOn(occ, o.hexes, o.side));
  if (missing <= 0) return 0;
  const ds: number[] = [];
  for (const h of o.hexes) if (occ.unit[h]?.side !== o.side) ds.push(nearestFree(s, h, o.side, o.hexes));
  let v = 0;
  for (const d of smallest(ds, missing)) v += (HOLD_PULL * Math.max(0, 6 - d)) / 6;
  return v;
}

/**
 * Majority objective from `me`'s point of view: the lead on the hexes and the pull of the sides that can hold it to the
 * free ones. With one side listed (309's hillock, §18.4) the lead counts too: the listed side holds the banner only while
 * strictly ahead, so a wider lead is safer for it, and every unit the other side brings onto the hexes counts against it.
 */
function majorityTerm(s: GameState, occ: Occ, o: ObjectiveOf<'majority'>, me: Side): number {
  const lead = unitsOn(occ, o.hexes, me) - unitsOn(occ, o.hexes, other(me));
  let v = MAJORITY_LEAD * Math.max(-3, Math.min(3, lead));
  for (const side of o.sides) {
    const ds: number[] = [];
    for (const h of o.hexes) if (!occ.unit[h]) ds.push(nearestFree(s, h, side, o.hexes));
    let r = 0;
    for (const d of smallest(ds, 2)) r += (MAJORITY_PULL * Math.max(0, 5 - d)) / 5;
    v += side === me ? r : -r;
  }
  return v;
}

/** Section clear objective: sections where the clearing side's enemy has a single unit left. */
function sectionThreat(s: GameState, side: Side): number {
  const count: Record<SectionName, number> = { left: 0, center: 0, right: 0 };
  for (const u of s.units) if (u.side !== side && u.hex >= 0) for (const sec of sectionsOf(u.hex, side)) count[sec]++;
  let v = 0;
  for (const sec of SECTIONS) if (count[sec] === 1) v += SECTION_THREAT;
  return v;
}

/**
 * The objective terms of Expansion #2 for `me` (positive = good for `me`), weighted by `W.objective`: held banners as
 * they will stand at the end of this turn, turn-start captures, hold and majority pulls, section-clear threats and the
 * rampart breakers' ramparts. 0 in battles without them.
 */
export function goalTerms(s: GameState, occ: Occ, me: Side, W: Weights): number {
  if (!hasGoals(s)) return 0;
  const opp = other(me);
  const T = s.bannersToWin;
  const { objectives, objState } = s.special;
  let v = 0;
  if (hasHeldObjectives(s)) {
    const a = projectedHeld(s, occ, me);
    const b = projectedHeld(s, occ, opp);
    v += heldWorth(s.players[me].banners, a.held, a.potential, T) - heldWorth(s.players[opp].banners, b.held, b.potential, T);
  }
  let pulls = 0;
  for (let i = 0; i < objectives.length; i++) {
    const o = objectives[i];
    if (o.kind === 'capture' && o.when === 'turnStart') {
      pulls += (o.side === me ? 1 : -1) * captureTerm(s, occ, o, objState[i].taken);
    } else if (o.kind === 'hold') {
      pulls += (o.side === me ? 1 : -1) * holdPull(s, occ, o);
    } else if (o.kind === 'majority') {
      pulls += majorityTerm(s, occ, o, me);
    } else if (o.kind === 'sectionClear') {
      pulls += (o.side === me ? 1 : -1) * sectionThreat(s, o.side);
    }
  }
  const breaker = s.special.rampartBreakers;
  if (breaker) {
    let n = 0;
    for (const t of s.terrain) if (t === 'rampart') n++;
    pulls += (breaker === me ? -1 : 1) * RAMPART_LEFT * n;
  }
  return v + pulls * W.objective;
}
