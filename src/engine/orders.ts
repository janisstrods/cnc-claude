// Which units/leaders a card may order (rules-reference §6, §12).
import { sectionOrders } from './cards';
import { areAdjacent, inSection, sectionsOf } from './hex';
import { attachedLeader, isLeaderId, isLoneLeader, leaderById, leaderUnit, leadersOf, unitById, unitsOf, enemyUnitAdjacent } from './query';
import { canShoot } from './elites';
import { UNIT_STATS } from './units';
import type { CardKind, DieFace, GameState, SectionName, Side, Unit, UnitClass } from './types';

export type OrderMode =
  | { mode: 'section'; counts: Partial<Record<SectionName, number>> }
  | { mode: 'troop'; filter: (u: Unit) => boolean; max: number; leaders: boolean }
  | { mode: 'leadership'; section: SectionName | null; chain: number }
  | { mode: 'group'; max: number | null } // Line Command / Double Time: linked foot units
  | { mode: 'one' } // order 1 unit of your choice
  | { mode: 'auto' } // Clash of Shields, Darken the Sky
  | { mode: 'none' } // First Strike played on own turn, Counter Attack with nothing to copy
  | { mode: 'dice' }; // Rally / I Am Spartacus

const isFoot = (u: Unit) => UNIT_STATS[u.type].foot;
const isMounted = (u: Unit) => UNIT_STATS[u.type].mounted;
const ofClass = (c: UnitClass) => (u: Unit) => UNIT_STATS[u.type].cls === c;

/** Determine how a card orders pieces in the current position. */
export function orderMode(s: GameState, side: Side, kind: CardKind | null): OrderMode {
  if (!kind) return { mode: 'none' };
  const units = unitsOf(s, side);
  const command = s.players[side].command;
  const sec = sectionOrders(kind);
  if (sec) return { mode: 'section', counts: sec };
  const troop = (filter: (u: Unit) => boolean, leaders = false): OrderMode =>
    units.some(filter) ? { mode: 'troop', filter, max: command, leaders } : { mode: 'one' };
  switch (kind) {
    case 'orderLight': return troop(ofClass('light'));
    case 'orderMedium': return troop(ofClass('medium'));
    case 'orderHeavy': return troop(ofClass('heavy'));
    case 'orderMounted': return troop(isMounted, true);
    case 'mountedCharge': return troop(isMounted);
    case 'moveFireMove': return troop(ofClass('light'));
    case 'inspiredL': return { mode: 'leadership', section: 'left', chain: 4 };
    case 'inspiredC': return { mode: 'leadership', section: 'center', chain: 4 };
    case 'inspiredR': return { mode: 'leadership', section: 'right', chain: 4 };
    case 'leadershipAny': return { mode: 'leadership', section: null, chain: 3 };
    case 'lineCommand': return units.some(isFoot) ? { mode: 'group', max: null } : { mode: 'one' };
    case 'doubleTime': return units.some(isFoot) ? { mode: 'group', max: 4 } : { mode: 'one' };
    case 'clash': return { mode: 'auto' };
    case 'darken': return units.some(canShoot) ? { mode: 'auto' } : { mode: 'one' };
    case 'rally': return leadersOf(s, side).length ? { mode: 'dice' } : { mode: 'one' };
    case 'spartacus': return { mode: 'dice' };
    case 'firstStrike': return { mode: 'none' };
    case 'counterAttack': return { mode: 'none' }; // resolved to a copy before ordering
    default: return { mode: 'none' };
  }
}

/** Pieces ordered automatically by Clash of Shields / Darken the Sky. */
export function autoOrders(s: GameState, side: Side, kind: CardKind): string[] {
  const units = unitsOf(s, side);
  if (kind === 'clash') return units.filter((u) => enemyUnitAdjacent(s, u.hex, side)).map((u) => u.id);
  if (kind === 'darken') return units.filter(canShoot).map((u) => u.id);
  return [];
}

/** Pieces that could take part in some valid order with this card (for UI highlighting). */
export function eligiblePieces(s: GameState, side: Side, kind: CardKind | null): string[] {
  const m = orderMode(s, side, kind);
  const units = unitsOf(s, side);
  const leaders = leadersOf(s, side);
  switch (m.mode) {
    case 'section': {
      const secs = Object.keys(m.counts) as SectionName[];
      const inAny = (h: number) => secs.some((x) => inSection(h, side, x));
      return [...units.filter((u) => inAny(u.hex)).map((u) => u.id), ...leaders.filter((l) => inAny(l.hex)).map((l) => l.id)];
    }
    case 'troop':
      return [...units.filter(m.filter).map((u) => u.id), ...(m.leaders ? leaders.map((l) => l.id) : [])];
    case 'leadership': {
      const sec = m.section;
      const out = new Set<string>();
      for (const u of units) if (!sec || inSection(u.hex, side, sec)) out.add(u.id); // single-unit fallback
      for (const l of leaders) {
        if (sec && !inSection(l.hex, side, sec)) continue;
        out.add(l.id);
        // anything within chain distance could be linked
        for (const u of units) out.add(u.id);
        for (const l2 of leaders) if (isLoneLeader(s, l2)) out.add(l2.id);
      }
      return [...out];
    }
    case 'group':
      return units.filter(isFoot).map((u) => u.id);
    case 'one':
      return units.map((u) => u.id);
    default:
      return [];
  }
}

function connected(hexes: number[], extraRoot?: number): boolean {
  if (hexes.length === 0) return true;
  const all = extraRoot !== undefined ? [extraRoot, ...hexes] : hexes;
  const seen = new Set<number>([all[0]]);
  const stack = [all[0]];
  while (stack.length) {
    const h = stack.pop()!;
    for (const k of all) if (!seen.has(k) && areAdjacent(h, k)) { seen.add(k); stack.push(k); }
  }
  return all.every((h) => seen.has(h));
}

function assignSections(hexSecs: SectionName[][], counts: Partial<Record<SectionName, number>>): boolean {
  const left = { ...counts };
  const go = (i: number): boolean => {
    if (i === hexSecs.length) return true;
    for (const sec of hexSecs[i]) {
      if ((left[sec] ?? 0) > 0) {
        left[sec]! -= 1;
        if (go(i + 1)) return true;
        left[sec]! += 1;
      }
    }
    return false;
  };
  return go(0);
}

/** Validate an order selection. Returns an error message, or null when legal. */
export function validateOrders(s: GameState, side: Side, kind: CardKind | null, pieces: string[]): string | null {
  const m = orderMode(s, side, kind);
  if (new Set(pieces).size !== pieces.length) return 'A piece may only be ordered once.';
  for (const id of pieces) {
    const p = isLeaderId(id) ? leaderById(s, id) : unitById(s, id);
    if (!p || p.side !== side || p.hex < 0) return 'Not one of your pieces on the battlefield.';
  }
  const units = pieces.filter((id) => !isLeaderId(id)).map((id) => unitById(s, id)!);
  const leaders = pieces.filter(isLeaderId).map((id) => leaderById(s, id)!);
  switch (m.mode) {
    case 'none':
    case 'auto':
    case 'dice':
      return pieces.length === 0 ? null : 'This card does not take a manual selection.';
    case 'one':
      if (pieces.length > 1 || leaders.length) return 'Order a single unit of your choice.';
      return null;
    case 'section': {
      const hexSecs = [...units.map((u) => u.hex), ...leaders.map((l) => l.hex)].map((h) =>
        sectionsOf(h, side).filter((x) => (m.counts[x] ?? 0) > 0),
      );
      if (hexSecs.some((x) => x.length === 0)) return 'That piece is not in a section named on the card.';
      if (!assignSections(hexSecs, m.counts)) return 'Too many orders for the section(s) on this card.';
      return null;
    }
    case 'troop': {
      if (pieces.length > m.max) return `You may order at most ${m.max} (your Command).`;
      if (units.some((u) => !m.filter(u))) return 'That unit is not of the type named on the card.';
      if (leaders.length && !m.leaders) return 'This card does not order leaders.';
      return null;
    }
    case 'group': {
      if (m.max !== null && pieces.length > m.max) return `At most ${m.max} units.`;
      if (leaders.length) return 'Only foot units.';
      if (units.some((u) => !isFoot(u))) return 'Only foot units.';
      if (!connected(units.map((u) => u.hex))) return 'The units must form one linked group.';
      return null;
    }
    case 'leadership': {
      if (pieces.length === 0) return null;
      if (leaders.length === 0) {
        if (units.length !== 1) return 'Without a leader, order exactly one unit.';
        if (m.section && !inSection(units[0].hex, side, m.section)) return 'That unit is not in the named section.';
        return null;
      }
      // Try each selected leader as the commander.
      for (const cmd of leaders) {
        if (m.section && !inSection(cmd.hex, side, m.section)) continue;
        const ownUnit = leaderUnit(s, cmd);
        if (ownUnit && !units.includes(ownUnit)) continue; // leaders may not detach on Leadership cards
        const otherHexes = new Set<number>();
        let ok = true;
        for (const u of units) if (u.hex !== cmd.hex) otherHexes.add(u.hex);
        for (const l of leaders) {
          if (l === cmd) continue;
          if (!isLoneLeader(s, l)) { ok = false; break; } // attached leaders follow their unit
          otherHexes.add(l.hex);
        }
        if (!ok) continue;
        if (otherHexes.size > m.chain) continue;
        if (!connected([...otherHexes], cmd.hex)) continue;
        return null;
      }
      return m.section
        ? `Choose a leader in the ${m.section} section and up to ${m.chain} linked units.`
        : `Choose a leader and up to ${m.chain} linked units.`;
    }
  }
}

/** Units that the Rally card may restore: damaged, not `noRally` (EL/HCH), in or adjacent to a friendly leader's hex. */
export function rallyCandidates(s: GameState, side: Side): Unit[] {
  const leaders = leadersOf(s, side);
  return unitsOf(s, side).filter(
    (u) => u.blocks < u.maxBlocks && !UNIT_STATS[u.type].noRally &&
      leaders.some((l) => l.hex === u.hex || areAdjacent(l.hex, u.hex)),
  );
}

function faceMatches(face: DieFace, u: Unit): boolean {
  if (face === 'leader') return true;
  return face === UNIT_STATS[u.type].cls;
}

export function validateRally(s: GameState, side: Side, faces: DieFace[], ids: (string | null)[]): string | null {
  if (ids.length !== faces.length) return 'One entry per die.';
  const cands = rallyCandidates(s, side);
  const used = new Map<string, number>();
  for (let i = 0; i < faces.length; i++) {
    const id = ids[i];
    if (id === null) continue;
    const u = cands.find((x) => x.id === id);
    if (!u) return 'That unit cannot be rallied.';
    if (!faceMatches(faces[i], u)) return 'That die does not match the unit type.';
    used.set(id, (used.get(id) ?? 0) + 1);
    if (used.get(id)! > u.maxBlocks - u.blocks) return 'A unit may not exceed its starting strength.';
  }
  return null;
}

export function validateSpartacus(s: GameState, side: Side, faces: DieFace[], ids: (string | null)[]): string | null {
  if (ids.length !== faces.length) return 'One entry per die.';
  const seen = new Set<string>();
  for (let i = 0; i < faces.length; i++) {
    const id = ids[i];
    if (id === null) continue;
    if (seen.has(id)) return 'Each piece may be ordered only once.';
    seen.add(id);
    const f = faces[i];
    if (isLeaderId(id)) {
      const l = leaderById(s, id);
      if (!l || l.side !== side || l.hex < 0) return 'Not your leader.';
      if (f !== 'leader') return 'Only a helmet may order a leader.';
      continue;
    }
    const u = unitById(s, id);
    if (!u || u.side !== side || u.hex < 0) return 'Not your unit.';
    if (f === 'flag' || f === 'swords') return 'Flags and swords order nothing.';
    if (!faceMatches(f, u)) return 'That die does not match the unit type.';
  }
  return null;
}

/** Leader attached to the unit, re-exported for flow convenience. */
export { attachedLeader };
