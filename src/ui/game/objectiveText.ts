// Battle objectives on the game screen (rules-reference §18.4): the banner track's counts with the banners held through
// objectives, and the tooltip lines of an objective hex: what it scores, for whom, and its state now.
import {
  bannerTotal, heldBanners, nextCaptureBanners, other, sectionsOf, terrainAt, unitAt,
  type GameState, type HexId, type ObjectiveDef, type Side,
} from '../../engine';

/** A side's banners for the track: `total` (permanent + held, the number that wins) and `held` (of them, can be lost). */
export function bannerCounts(s: GameState, side: Side): { total: number; held: number } {
  return { total: bannerTotal(s, side), held: heldBanners(s, side) };
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
/** "a Roman", "an Antigonus'..." */
const aOrAn = (w: string) => `${/^[AEIOU]/i.test(w) ? 'an' : 'a'} ${w}`;

/** The units an exit objective lets leave: "unit", "foot unit", "cavalry unit". */
const EXIT_UNITS: Record<'any' | 'foot' | 'cavalry', string> = { any: 'unit', foot: 'foot unit', cavalry: 'cavalry unit' };

/**
 * What a hold or majority hex is called in its tooltip: a camp after its owner, a rampart, a city wall (308), a hill, or
 * just an objective.
 */
function placeName(s: GameState, h: HexId, owner: Side | null): string {
  const t = terrainAt(s, h);
  if (t === 'camp') return owner ? `${s.players[owner].army} camp` : 'Camp';
  if (t === 'rampart') return 'Rampart';
  if (t === 'wall') return 'City wall';
  if (t === 'hill') return 'Hill';
  return 'Objective';
}

/** Tooltip lines of one objective for hex `h` (none when the hex plays no part in it). */
function objectiveLines(s: GameState, o: ObjectiveDef, i: number, h: HexId): string[] {
  const st = s.special.objState[i];
  const army = (side: Side) => s.players[side].army;
  switch (o.kind) {
    case 'capture': {
      if (!o.hexes.includes(h)) return [];
      // ship markers (313, §18.4): the enemy's ships off this beach; the marker is taken, the hex does not change
      if (o.marker === 'ship') {
        const ship = `${army(other(o.side))} ship`;
        if (st.taken.includes(h)) return [`${ship}: taken by the ${army(o.side)} army`];
        const n = nextCaptureBanners(s, i);
        return [`${ship}: ${aOrAn(army(o.side))} unit here at the start of its turn takes the marker — ${plural(n, 'banner')} (the hex does not change)`];
      }
      const camp = `${army(other(o.side))} camp`;
      if (st.taken.includes(h)) return [`${camp}: captured by the ${army(o.side)} army`];
      if (o.together) {
        const n = o.banners[0] ?? 1;
        return [`${camp}: ${army(o.side)} units on ${o.together} of these ${o.hexes.length} camps at the start of their turn capture them all — ${plural(n, 'banner')}`];
      }
      const who = o.when === 'stop' ? 'ending its move here' : 'here at the start of its turn';
      const n = nextCaptureBanners(s, i);
      let gain = `${plural(n, 'banner')}`;
      if (n === 0) {
        const k = o.banners.findIndex((b, j) => j >= st.taken.length && b > 0);
        gain = k >= 0 ? `no banner until the ${ORDINAL[k] ?? `${k + 1}th`} camp taken` : 'no banner';
      }
      // a camp on a hill (308, §18.7) leaves the hill when it is removed
      const removed = o.remove ? `; the camp is then removed${s.hillUnder[h] ? ' (the hill remains)' : ''}` : '';
      return [`${camp}: ${aOrAn(army(o.side))} unit ${who} captures it — ${gain}${removed}`];
    }
    case 'hold': {
      if (!o.hexes.includes(h)) return [];
      const cap = o.max < o.hexes.length ? ` (at most ${o.max} for all ${o.hexes.length} hexes)` : '';
      const now = unitAt(s, h)?.side === o.side ? ' Held now.' : '';
      return [`${placeName(s, h, other(o.side))}: the ${army(o.side)} army holds 1 banner while one of its units stands here${cap} — held while occupied, can be lost.${now}`];
    }
    case 'majority': {
      if (!o.hexes.includes(h)) return [];
      const holder = o.sides.find((side) => st.held[side] > 0);
      if (o.sides.length === 1) {
        // one side only (309's hillock, §18.4): it holds the banners while it has strictly more units there than the enemy
        const side = o.sides[0];
        return [
          `${placeName(s, h, null)} objective: ${o.when === 'turnEnd' ? 'at the end of every turn ' : ''}the ${army(side)} army holds ${plural(o.banners, 'banner')} while it has more units on the ${o.hexes.length} marked hexes than the ${army(other(side))} army; the ${army(other(side))} army cannot hold it`,
          holder ? `Held now by the ${army(holder)} army` : 'Not held now',
        ];
      }
      const when = o.when === 'turnEnd' ? 'at the end of every turn the side with' : 'the side with';
      return [
        `${placeName(s, h, null)} objective: ${when} more units on the ${o.hexes.length} marked hexes holds ${plural(o.banners, 'banner')} (a tie: nobody)`,
        holder ? `Held now by the ${army(holder)} army` : 'Held by nobody now',
      ];
    }
    case 'sectionClear': {
      const scored = st.sections.filter((sec) => sectionsOf(h, o.side).includes(sec));
      if (!scored.length) return [];
      return [`Section cleared: the ${army(o.side)} army holds 1 banner while no ${army(other(o.side))} unit enters this section`];
    }
    case 'exit':
      if (!o.hexes.includes(h)) return [];
      // leaders score too (317, §18.4): a lone leader may leave, and a unit leaving with its leader scores 2
      if (o.leadersScore) {
        return [`Exit: ${aOrAn(army(o.side))} ${EXIT_UNITS[o.units]} or lone leader here may leave the battlefield — 1 banner each, 2 for a unit with its leader (they are removed)`];
      }
      return [`Exit: ${aOrAn(army(o.side))} ${EXIT_UNITS[o.units]} here may leave the battlefield — 1 banner (the unit is removed)`];
  }
}

/** Tooltip lines of the battle objectives on hex `h` (§18.4): what the hex scores, for whom, and its state now. */
export function objectiveTipLines(s: GameState, h: HexId): string[] {
  return s.scenario.objectives.flatMap((o, i) => objectiveLines(s, o, i, h));
}
