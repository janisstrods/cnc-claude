// Expansion #3 reinforcements (rules-reference §18.9; rulings X3 Q6, 308 Gergovia): the ambush reserve of §18.5 with fixed
// entry hexes, no further move after the entry (fire with 2 dice), the reserve leader attached to an entered unit, and a
// forced placement of an off-board unit at the start of the other side's next turn.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  GameDriver, OFF_BOARD, ambushAvailable, ambushChoices, ambushSections, ambushEntryHexes, ambushSectionAllowed, ambushSectionChoices, battleTargets,
  cloneState, createGame, pieceMoves, randomAnswer,
  type Answer, type CardKind, type Decision, type SectionName, type Side,
} from '../../src/engine';
import { PERSONALITIES, chooseAnswer, isLegal, newMemory } from '../../src/ai';
import { scenarioFromJson, type ScenarioJson } from '../../src/scenarios';
import gergoviaJson from '../../src/scenarios/data/308.json';
import {
  H, build, combatDice, endMoves, ev, forceDice, giveCard, must, n, noFirstStrike, passTurn, setupOf, u, type Pos,
} from './helpers';

beforeEach(() => forceDice([]));

const LEADERSHIP: CardKind[] = ['inspiredL', 'inspiredC', 'inspiredR', 'leadershipAny'];
const SECTIONS: SectionName[] = ['left', 'center', 'right'];
/** The Gergovia entry hexes G1-G5 and the Roman placement hexes (rules-reference §20, 308). */
const ENTRY: [number, number][] = [[3, 0], [4, 0], [5, 0], [6, 0], [7, 0]];
const ROMAN_LEFT: [number, number][] = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4]];
const hexes = (list: [number, number][]) => list.map(([r, c]) => H(r, c));

/** The 308 reinforcement data on a small board: the Gauls (top) move first. */
const GERGOVIA_AMBUSH: NonNullable<Pos['ambush']> = {
  trigger: LEADERSHIP, afterOwnTurns: 0, entryHexes: ENTRY, noMove: true, attachLeader: true, text: 'Vercingetorix returns!',
};
const PLACE_MI: NonNullable<Pos['placeUnits']> = [{ side: 'bottom', type: 'MI', hexes: ROMAN_LEFT, after: 'ambush' }];

/**
 * u1 Gallic MI, u2 and u3 Roman MI and LI far from the entry hexes; reserves u4 AX, u5 AX, u6 WA, u7 WA, L8 Vercingetorix;
 * u9 the Roman MI to place. `extra` adds board units (after u3: the reserve ids move up by one each).
 */
function gergovia(extra: Partial<Pos> = {}): Pos {
  return {
    first: 'top',
    legions: { bottom: 'julian' },
    ambush: GERGOVIA_AMBUSH,
    units: [
      { side: 'top', type: 'MI', at: [1, 6] },
      { side: 'bottom', type: 'MI', at: [7, 8] },
      { side: 'bottom', type: 'LI', at: [7, 10] },
    ],
    reserves: [{ side: 'top', type: 'AX' }, { side: 'top', type: 'AX' }, { side: 'top', type: 'WA' }, { side: 'top', type: 'WA' }],
    reserveLeaders: [{ side: 'top', name: 'Vercingetorix' }],
    placeUnits: PLACE_MI,
    ...extra,
  };
}

function startGame(p: Pos): GameDriver {
  const s = build(p);
  noFirstStrike(s);
  return new GameDriver(s);
}

/** The active side plays `kind`: the driver waits for its orders. */
function playCard(d: GameDriver, kind: CardKind) {
  const card = giveCard(d.state, d.state.active, kind);
  must(d, { kind: 'playCard', card });
  expect(d.pending?.kind).toBe('orders');
}

function springAmbush(d: GameDriver, kind: CardKind, section: SectionName) {
  playCard(d, kind);
  must(d, { kind: 'orders', pieces: [], ambushSection: section });
}

/** `endTurn` that also answers the reserve leader's placement (`attachLeader`, §18.9) with the first hex offered. */
function endTurnPlacingLeaders(d: GameDriver) {
  endMoves(d);
  while (d.pending?.kind === 'placeLeader') must(d, { kind: 'hex', hex: (d.pending as Extract<Decision, { kind: 'placeLeader' }>).options[0] });
  while (d.pending?.kind === 'battle') must(d, { kind: 'endBattle' });
}

/** Pass a turn, answering a pending forced placement first (the first listed hex free). */
function pass(d: GameDriver) {
  if (d.pending?.kind === 'placeUnit') must(d, { kind: 'hex', hex: d.pending.options[0] });
  passTurn(d);
}

const reserveIds = (d: GameDriver, side: Side = 'top') => d.state.units.filter((x) => x.side === side && x.hex === OFF_BOARD).map((x) => x.id);
const accepts = (d: GameDriver, section: SectionName) => d.answer({ kind: 'orders', pieces: [], ambushSection: section });

describe('reinforcements: scenario data (§18.9)', () => {
  it('resolves the entry hexes (data order), noMove and attachLeader; the Trebbia defaults fill the rest', () => {
    const s = build(gergovia({ ambush: { entryHexes: ENTRY, noMove: true, attachLeader: true } }));
    expect(s.scenario.ambush).toEqual({
      trigger: LEADERSHIP, afterOwnTurns: 1, text: "Ambush! Mago's hidden force strikes from the {section}.",
      entryHexes: hexes(ENTRY), noMove: true, attachLeader: true,
    });
  });

  it('an ambush without the new fields has none of them (005, 206 unchanged)', () => {
    const s = build(gergovia({ ambush: { afterOwnTurns: 0 }, placeUnits: undefined }));
    expect(Object.keys(s.scenario.ambush!).sort()).toEqual(['afterOwnTurns', 'text', 'trigger']);
    expect(s.special.placeUnits).toEqual([]);
    expect(s.special.reserveEntered).toBe(false);
  });

  it('rejects bad entry hexes, noMove and attachLeader, naming the scenario', () => {
    const bad = (ambush: unknown, extra: Partial<Pos> = {}) => () =>
      createGame(setupOf(gergovia({ ambush: ambush as Pos['ambush'], placeUnits: undefined, ...extra })), 1);
    expect(bad({ entryHexes: [3, 0] })).toThrow(/^ambush entryHexes must be a list of \[r, c\] hexes \(qa\)$/);
    expect(bad({ entryHexes: [] })).toThrow(/^ambush entryHexes: needs at least one hex \(qa\)$/);
    expect(bad({ entryHexes: [[3, 0], [9, 0]] })).toThrow(/^ambush entry hex 9,0 is off the board \(qa\)$/);
    expect(bad({ entryHexes: [[3, 0], [3, 0]] })).toThrow(/^ambush entry hex 3,0 is listed twice \(qa\)$/);
    expect(bad({ entryHexes: [[3, 0]] }, { terrain: [{ at: [3, 0], t: 'steep' }] })).toThrow(/^ambush entry hex 3,0 is impassable \(qa\)$/);
    // a reserve never begins its move next to a wall, so it could never enter one (§18.7)
    expect(bad({ entryHexes: [[3, 0], [4, 0]] }, { terrain: [{ at: [4, 0], t: 'wall' }] }))
      .toThrow(/^ambush entry hex 4,0 is a city wall, which a reserve cannot enter \(qa\)$/);
    expect(bad({ noMove: 'yes' })).toThrow(/^ambush noMove must be true or false \(qa\)$/);
    expect(bad({ attachLeader: 1 })).toThrow(/^ambush attachLeader must be true or false \(qa\)$/);
    expect(bad({ attachLeader: true }, { reserveLeaders: [] })).toThrow(/^ambush attachLeader needs a reserve leader \(qa\)$/);
  });

  it('places the forced-placement unit off the board, apart from the reserves, with the next id and its legion', () => {
    const s = build(gergovia());
    expect(s.special.reserveUnits.map((x) => x.id)).toEqual(['u4', 'u5', 'u6', 'u7']);
    expect(s.special.reserveLeaders.map((l) => l.id)).toEqual(['L8']);
    expect(s.special.placeUnits).toEqual([{
      unit: { id: 'u9', side: 'bottom', type: 'MI', hex: OFF_BOARD, blocks: 4, maxBlocks: 4, legion: 'julian' },
      hexes: hexes(ROMAN_LEFT), after: 'ambush',
    }]);
    expect(s.units.map((x) => x.id)).toEqual(['u1', 'u2', 'u3']);
    expect(s.special.reserveUnits.some((x) => x.id === 'u9')).toBe(false);
  });

  it('copies the data and survives cloneState (the clone has its own unit)', () => {
    const setup = setupOf(gergovia({ placeUnits: [{ ...PLACE_MI[0], hexes: ROMAN_LEFT.map(([r, c]) => [r, c]) }] }));
    const s = createGame(setup, 1);
    setup.placeUnits![0].hexes[0][1] = 9;
    expect(s.special.placeUnits[0].hexes[0]).toBe(H(8, 0));
    const c = cloneState(s);
    expect(c.special.placeUnits).toEqual(s.special.placeUnits);
    c.special.placeUnits[0].unit.hex = H(8, 1);
    expect(s.special.placeUnits[0].unit.hex).toBe(OFF_BOARD);
    c.special.placeUnits.pop();
    expect(s.special.placeUnits).toHaveLength(1);
  });

  it('rejects bad forced placements, naming the scenario', () => {
    const bad = (pu: unknown, extra: Partial<Pos> = {}) => () =>
      createGame(setupOf(gergovia({ placeUnits: pu as Pos['placeUnits'], ...extra })), 1);
    const ok = PLACE_MI[0];
    expect(bad({ ...ok })).toThrow(/^placeUnits must be a list \(qa\)$/);
    expect(bad([{ ...ok, side: 'left' }])).toThrow(/^placeUnits: unknown side left \(qa\)$/);
    expect(bad([{ ...ok, type: 'XX' }])).toThrow(/^placeUnits: unknown unit type XX \(qa\)$/);
    expect(bad([{ ...ok, after: 'turn3' }])).toThrow(/^placeUnits MI: after must be 'ambush' \(qa\)$/);
    expect(bad([{ ...ok, hexes: [] }])).toThrow(/^placeUnits MI: hexes must be a list of \[r, c\] hexes, at least one \(qa\)$/);
    expect(bad([{ ...ok, hexes: [[8, 0], [9, 9]] }])).toThrow(/^placeUnits MI: hex 9,9 is off the board \(qa\)$/);
    expect(bad([{ ...ok, hexes: [[8, 0]] }], { terrain: [{ at: [8, 0], t: 'lake' }] })).toThrow(/^placeUnits MI: hex 8,0 is impassable \(qa\)$/);
    expect(bad([{ ...ok, type: 'MC', hexes: [[8, 0]] }], { terrain: [{ at: [8, 0], t: 'wall' }] }))
      .toThrow(/^placeUnits MC: hex 8,0 is wall, which it may not enter \(qa\)$/);
    expect(bad([{ ...ok, command: 'x' }])).toThrow(/^unit to place MI: command x is only for pieces on the board \(qa\)$/);
    expect(bad(PLACE_MI, { rules: [], ambush: undefined, reserves: [], reserveLeaders: [] }))
      .toThrow(/^placeUnits after the ambush need ambush data \(qa\)$/);
  });
});

describe('reinforcements: fixed entry hexes (§18.9)', () => {
  it('any Leadership card springs them from the first turn; other cards do not', () => {
    const d = startGame(gergovia());
    for (const k of LEADERSHIP) expect(ambushAvailable(d.state, 'top', k), k).toBe(true);
    for (const k of ['orderLight', 'order3C', 'orderMedium'] as CardKind[]) expect(ambushAvailable(d.state, 'top', k), k).toBe(false);
    playCard(d, 'order3C');
    for (const sec of SECTIONS) expect(accepts(d, sec)).toBe(false);
  });

  it('the section is still asked, and any section is accepted whatever the card names', () => {
    for (const k of LEADERSHIP) for (const sec of SECTIONS) expect(ambushSectionAllowed(build(gergovia()), k, sec), `${k} ${sec}`).toBe(true);
    // without fixed hexes the card's sections only (206)
    const plain = build(gergovia({ ambush: { ...GERGOVIA_AMBUSH, entryHexes: undefined } }));
    expect(SECTIONS.map((sec) => ambushSectionAllowed(plain, 'inspiredL', sec))).toEqual([true, false, false]);
    expect(ambushSectionAllowed(build(gergovia()), 'inspiredL', 'middle' as SectionName)).toBe(false);
    const d = startGame(gergovia());
    playCard(d, 'inspiredR');
    must(d, { kind: 'orders', pieces: [], ambushSection: 'left' });
    expect(d.state.turn.ambushSection).toBe('left');
    expect(d.pending?.kind).toBe('move');
  });

  it('the choices worth offering: one section for any Leadership card, none while every entry hex is occupied', () => {
    const s = build(gergovia());
    for (const k of LEADERSHIP) expect([k, ambushSectionChoices(s, k), ambushChoices(s, 'top', k)]).toEqual([k, [ambushSections(k)[0]], [ambushSections(k)[0]]]);
    expect([ambushChoices(s, 'top', 'order3C'), ambushChoices(s, 'bottom', 'leadershipAny')]).toEqual([[], []]);
    // the entry hexes, whatever the section (or none named)
    expect(ambushEntryHexes(s, 'top')).toEqual(hexes(ENTRY));
    for (const sec of SECTIONS) expect(ambushEntryHexes(s, 'top', sec)).toEqual(hexes(ENTRY));
    // every entry hex held by a unit or a leader: nothing to offer (the card's section is still accepted)
    const full = build(gergovia({
      units: [{ side: 'top', type: 'MI', at: [1, 6] }, { side: 'bottom', type: 'MI', at: [7, 8] }, { side: 'bottom', type: 'LI', at: [7, 10] },
        ...ENTRY.slice(1).map((at) => ({ side: 'bottom' as Side, type: 'LI' as const, at }))],
      leaders: [{ side: 'bottom', name: 'Legate', at: ENTRY[0] }],
    }));
    expect([ambushEntryHexes(full, 'top'), ambushChoices(full, 'top', 'leadershipAny')]).toEqual([[], []]);
    expect([ambushAvailable(full, 'top', 'leadershipAny'), ambushSectionAllowed(full, 'leadershipAny', 'center')]).toEqual([true, true]);
    // a baseline ambush (206): every section the card allows, its baseline hexes by section or all of them
    const plain = build(gergovia({ ambush: { ...GERGOVIA_AMBUSH, entryHexes: undefined } }));
    expect([ambushChoices(plain, 'top', 'inspiredR'), ambushChoices(plain, 'top', 'leadershipAny')]).toEqual([['right'], SECTIONS]);
    const bySection = SECTIONS.flatMap((sec) => ambushEntryHexes(plain, 'top', sec));
    expect(ambushEntryHexes(plain, 'top')).toEqual([...new Set(bySection)].sort((a, b) => a - b));
  });

  it('the units enter only on the listed hexes, wherever the section, and they order nothing else', () => {
    const d = startGame(gergovia());
    springAmbush(d, 'leadershipAny', 'right');
    expect(Object.keys(d.state.turn.ordered).sort()).toEqual(['L8', 'u4', 'u5', 'u6', 'u7']);
    for (const id of ['u4', 'u5', 'u6', 'u7']) {
      expect(pieceMoves(d.state, id).map((m) => m.hex)).toEqual(hexes(ENTRY));
    }
  });

  it('one unit per empty hex: hexes holding a unit or a leader of either side are not offered', () => {
    const d = startGame(gergovia({
      units: [
        { side: 'top', type: 'MI', at: [1, 6] }, { side: 'bottom', type: 'MI', at: [7, 8] }, { side: 'bottom', type: 'LI', at: [7, 10] },
        { side: 'bottom', type: 'LI', at: [5, 0] }, // u4: a Roman blocks G3
      ],
      leaders: [{ side: 'bottom', name: 'Legate', at: [6, 0] }], // L5: a lone Roman leader on G4
    }));
    springAmbush(d, 'leadershipAny', 'center');
    // reserves are u6..u9 now (L5 is a board leader), Vercingetorix L10
    expect(pieceMoves(d.state, 'u6').map((m) => m.hex)).toEqual(hexes([[3, 0], [4, 0], [7, 0]]));
    must(d, { kind: 'move', piece: 'u6', to: H(4, 0) });
    expect(pieceMoves(d.state, 'u7').map((m) => m.hex)).toEqual(hexes([[3, 0], [7, 0]]));
  });

  it('units that find no empty hex stay off the board and may enter with a later Leadership card', () => {
    const d = startGame(gergovia());
    springAmbush(d, 'leadershipAny', 'center');
    for (const [id, at] of [['u4', [3, 0]], ['u5', [4, 0]], ['u6', [5, 0]]] as [string, [number, number]][]) {
      must(d, { kind: 'move', piece: id, to: H(...at) });
    }
    must(d, { kind: 'move', piece: 'L8', to: H(4, 0) });
    endTurnPlacingLeaders(d); // u7 was not placed
    expect(d.state.special.reserveUnits.map((x) => x.id)).toEqual(['u7']);
    expect(d.state.special.reserveLeaders).toEqual([]);
    expect(d.pending?.kind).toBe('placeUnit'); // Romans: the forced placement comes first
    pass(d);
    expect(ambushAvailable(d.state, 'top', 'inspiredC')).toBe(true);
    springAmbush(d, 'inspiredC', 'center');
    expect(pieceMoves(d.state, 'u7').map((m) => m.hex)).toEqual(hexes([[6, 0], [7, 0]]));
  });
});

describe('reinforcements: no further move, 2 dice (§18.9)', () => {
  it('placement is not movement: the entry is the whole move and counts as no hex moved', () => {
    const d = startGame(gergovia());
    springAmbush(d, 'leadershipAny', 'center');
    expect(pieceMoves(d.state, 'u4').every((m) => m.dist === 0 && m.path.length === 1 && m.canBattle)).toBe(true);
    must(d, { kind: 'move', piece: 'u4', to: H(4, 0) });
    expect(d.state.turn.ordered.u4).toMatchObject({ moved: 0, moveDone: true });
    expect(pieceMoves(d.state, 'u4')).toEqual([]);
  });

  it('an entered auxilia fires with 2 dice (as a unit that did not move); a normal ambush entry fires with 1', () => {
    const fire = (noMove: boolean) => {
      // a Roman LI two hexes east of G2 (4,0), out of reach of a close combat
      const d = startGame(gergovia({
        ambush: { ...GERGOVIA_AMBUSH, noMove },
        units: [
          { side: 'top', type: 'MI', at: [1, 6] }, { side: 'bottom', type: 'MI', at: [7, 8] }, { side: 'bottom', type: 'LI', at: [4, 2] },
        ],
      }));
      springAmbush(d, 'leadershipAny', 'center');
      must(d, { kind: 'move', piece: 'u4', to: H(4, 0) });
      endMoves(d);
      if (d.pending?.kind === 'placeLeader') must(d, { kind: 'hex', hex: H(4, 0) });
      expect(battleTargets(d.state, 'u4')).toEqual([{ hex: H(4, 2), kind: 'ranged' }]);
      ev(d);
      forceDice(n('medium', 2));
      must(d, { kind: 'attack', unit: 'u4', target: H(4, 2) });
      return combatDice(ev(d), 'ranged', 'u4');
    };
    expect(fire(true)).toBe(2);
    expect(fire(false)).toBe(1);
  });

  it('an entered unit may close combat, momentum advance and make a bonus combat', () => {
    const d = startGame(gergovia({
      units: [
        { side: 'top', type: 'MI', at: [1, 6] }, { side: 'bottom', type: 'MI', at: [7, 8] }, { side: 'bottom', type: 'LI', at: [7, 10] },
        { side: 'bottom', type: 'MI', at: [5, 1] }, // u4: next to G3 (5,0)
        { side: 'bottom', type: 'LI', at: [5, 2] }, // u5: next to (5,1)
      ],
    }));
    d.state.units[3].blocks = 1;
    springAmbush(d, 'leadershipAny', 'center');
    // reserves u6 AX, u7 AX, u8 WA, u9 WA; Vercingetorix L10
    must(d, { kind: 'move', piece: 'u8', to: H(5, 0) });
    must(d, { kind: 'move', piece: 'L10', to: H(5, 0) });
    endMoves(d);
    expect(battleTargets(d.state, 'u8')).toEqual([{ hex: H(5, 1), kind: 'close' }]);
    forceDice(n('medium', 5));
    must(d, { kind: 'attack', unit: 'u8', target: H(5, 1) });
    expect(u(d, 'u4')).toBeUndefined();
    expect(d.pending).toMatchObject({ kind: 'momentum', unit: 'u8', hex: H(5, 1) });
    must(d, { kind: 'yesno', yes: true });
    expect(u(d, 'u8')!.hex).toBe(H(5, 1));
    expect(d.pending).toMatchObject({ kind: 'bonusCombat', unit: 'u8', targets: [H(5, 2)] });
  });

  it('from the next turn they are ordinary units: they move', () => {
    const d = startGame(gergovia());
    springAmbush(d, 'leadershipAny', 'center');
    must(d, { kind: 'move', piece: 'u4', to: H(4, 0) });
    endTurnPlacingLeaders(d);
    pass(d); // Romans (after their forced placement)
    playCard(d, 'order3R'); // the board's left edge is the Gallic right
    must(d, { kind: 'orders', pieces: ['u4'] });
    expect(Math.max(...pieceMoves(d.state, 'u4').map((m) => m.dist))).toBe(2);
  });
});

describe('reinforcements: the attached leader (§18.9)', () => {
  it('he is placed with an entered unit during the movement, as Mago is', () => {
    const d = startGame(gergovia());
    springAmbush(d, 'leadershipAny', 'center');
    expect(pieceMoves(d.state, 'L8')).toEqual([]); // nobody has entered yet
    must(d, { kind: 'move', piece: 'u4', to: H(3, 0) });
    must(d, { kind: 'move', piece: 'u6', to: H(6, 0) });
    expect(pieceMoves(d.state, 'L8').map((m) => [m.hex, m.attachesTo])).toEqual([[H(3, 0), 'u4'], [H(6, 0), 'u6']]);
    ev(d);
    must(d, { kind: 'move', piece: 'L8', to: H(6, 0) });
    expect(ev(d)).toContainEqual({ t: 'attach', leader: 'L8', unit: 'u6' });
    endMoves(d);
    expect(d.pending?.kind).not.toBe('placeLeader');
    expect(d.state.leaders.find((l) => l.id === 'L8')!.hex).toBe(H(6, 0));
  });

  it('if he was not placed by the end of the movement, the player must place him with an entered unit now', () => {
    const d = startGame(gergovia());
    springAmbush(d, 'leadershipAny', 'center');
    must(d, { kind: 'move', piece: 'u4', to: H(3, 0) });
    must(d, { kind: 'move', piece: 'u6', to: H(6, 0) });
    must(d, { kind: 'endMove' });
    expect(d.pending).toEqual({ kind: 'placeLeader', side: 'top', leader: 'L8', options: [H(3, 0), H(6, 0)] });
    expect(d.answer({ kind: 'hex', hex: null })).toBe(false);
    expect(d.answer({ kind: 'hex', hex: H(4, 0) })).toBe(false);
    ev(d);
    must(d, { kind: 'hex', hex: H(3, 0) });
    const events = ev(d);
    expect(events).toContainEqual({ t: 'leaderPlaced', id: 'L8', hex: H(3, 0) });
    expect(events).toContainEqual({ t: 'attach', leader: 'L8', unit: 'u4' });
    expect(d.state.leaders.find((l) => l.id === 'L8')!.hex).toBe(H(3, 0));
    expect(d.state.special.reserveLeaders).toEqual([]);
    // the unplaced units (u5, u7) go back to the reserve; the leader does not
    expect(d.state.special.reserveUnits.map((x) => x.id)).toEqual(['u5', 'u7']);
  });

  it('with no unit entered nothing is asked: he goes back to the reserve with the force', () => {
    const d = startGame(gergovia());
    springAmbush(d, 'leadershipAny', 'center');
    must(d, { kind: 'endMove' });
    expect(d.pending?.kind).not.toBe('placeLeader');
    expect(d.state.special.reserveLeaders.map((l) => l.id)).toEqual(['L8']);
    expect(d.state.special.reserveUnits).toHaveLength(4);
    expect(d.state.special.reserveReleased).toBe(false);
  });

  it('without attachLeader (005, 206) a leader left off the board goes back to the reserve, as before', () => {
    const d = startGame(gergovia({ ambush: { ...GERGOVIA_AMBUSH, attachLeader: false } }));
    springAmbush(d, 'leadershipAny', 'center');
    must(d, { kind: 'move', piece: 'u4', to: H(3, 0) });
    must(d, { kind: 'endMove' });
    expect(d.pending?.kind).not.toBe('placeLeader');
    expect(d.state.special.reserveLeaders.map((l) => l.id)).toEqual(['L8']);
  });
});

describe('reinforcements: forced placement (§18.9)', () => {
  /** Gauls (top) enter their first reserve unit on G1 with Vercingetorix and end their turn: the Roman turn starts next. */
  function afterEntry(p: Pos = gergovia()): GameDriver {
    const d = startGame(p);
    const [unit, leader] = [d.state.special.reserveUnits[0].id, d.state.special.reserveLeaders[0].id];
    springAmbush(d, 'leadershipAny', 'center');
    must(d, { kind: 'move', piece: unit, to: H(3, 0) });
    must(d, { kind: 'move', piece: leader, to: H(3, 0) });
    endTurnPlacingLeaders(d);
    return d;
  }

  it('waits for the ambush: no placement at the Roman turn starts before any Gallic entry', () => {
    const d = startGame(gergovia());
    passTurn(d); // Gauls, no ambush
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
    passTurn(d);
    // the Gauls spring it but nobody enters: still nothing
    springAmbush(d, 'leadershipAny', 'center');
    endTurnPlacingLeaders(d);
    expect(d.state.special.reserveEntered).toBe(false);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
  });

  it('after the first entry, the next Roman turn starts with the placement, before the card', () => {
    const d = afterEntry();
    expect(d.state.special.reserveEntered).toBe(true);
    expect(d.pending).toEqual({ kind: 'placeUnit', side: 'bottom', unit: 'u9', options: hexes(ROMAN_LEFT) });
    expect(d.state.active).toBe('bottom');
    expect(d.state.turn).toMatchObject({ phase: 'card', card: null });
    expect(d.answer({ kind: 'hex', hex: null })).toBe(false);
    expect(d.answer({ kind: 'hex', hex: H(8, 5) })).toBe(false);
    expect(d.answer({ kind: 'playCard', card: d.state.players.bottom.hand[0] } as Answer)).toBe(false);
    ev(d);
    must(d, { kind: 'hex', hex: H(8, 2) });
    expect(ev(d)).toContainEqual({ t: 'unitPlaced', id: 'u9', hex: H(8, 2) });
    expect(u(d, 'u9')).toMatchObject({ side: 'bottom', type: 'MI', hex: H(8, 2), legion: 'julian' });
    expect(d.state.special.placeUnits).toEqual([]);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
  });

  it('the placed unit is an ordinary unit: that turn\'s card may order it', () => {
    const d = afterEntry();
    must(d, { kind: 'hex', hex: H(8, 2) });
    playCard(d, 'order2L');
    must(d, { kind: 'orders', pieces: ['u9'] });
    expect(pieceMoves(d.state, 'u9').length).toBeGreaterThan(0);
  });

  it('only empty listed hexes are offered; with all occupied it waits for a later turn start', () => {
    const blockers: NonNullable<Pos['units']> = ROMAN_LEFT.map((at) => ({ side: 'bottom' as Side, type: 'LI' as const, at }));
    const p = gergovia({
      units: [{ side: 'top', type: 'MI', at: [1, 6] }, ...blockers], // u2..u6 on (8,0)-(8,4); reserves u7..u10, L11, u12
    });
    const d = startGame(p);
    springAmbush(d, 'leadershipAny', 'center');
    must(d, { kind: 'move', piece: 'u7', to: H(3, 0) });
    must(d, { kind: 'move', piece: 'L11', to: H(3, 0) });
    endTurnPlacingLeaders(d);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' }); // every hex taken: it waits
    // the Romans move the LI on (8,3) away
    playCard(d, 'order2L');
    must(d, { kind: 'orders', pieces: ['u5'] });
    must(d, { kind: 'move', piece: 'u5', to: H(7, 3) });
    endTurnPlacingLeaders(d);
    passTurn(d); // Gauls
    expect(d.pending).toEqual({ kind: 'placeUnit', side: 'bottom', unit: 'u12', options: [H(8, 3)] });
    must(d, { kind: 'hex', hex: H(8, 3) });
    expect(u(d, 'u12')!.hex).toBe(H(8, 3));
  });

  it('it happens once: later Roman turns start with the card', () => {
    const d = afterEntry();
    must(d, { kind: 'hex', hex: H(8, 0) });
    passTurn(d);
    passTurn(d); // Gauls
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
  });

  it('a lone leader on a listed hex blocks it too', () => {
    const d = afterEntry(gergovia({ leaders: [{ side: 'bottom', name: 'Legate', at: [8, 1] }] }));
    expect(d.pending).toMatchObject({ kind: 'placeUnit', options: hexes([[8, 0], [8, 2], [8, 3], [8, 4]]) });
  });

  it('randomAnswer and the AI answer it with a listed hex', () => {
    const d = afterEntry();
    const dec = d.pending as Extract<Decision, { kind: 'placeUnit' }>;
    for (let i = 0; i < 10; i++) {
      const a = randomAnswer(d.state, dec, () => i / 10);
      expect(a.kind === 'hex' && dec.options.includes(a.hex!)).toBe(true);
      expect(isLegal(d.state, dec, a)).toBe(true);
    }
    expect(isLegal(d.state, dec, { kind: 'hex', hex: null })).toBe(false);
    expect(isLegal(d.state, dec, { kind: 'hex', hex: H(7, 0) })).toBe(false);
    const opts = { side: 'bottom' as const, difficulty: 'recruit' as const, personality: PERSONALITIES[5], seed: 3, deterministic: true, budgetScale: 0.1 };
    const ai = chooseAnswer(d.state, dec, opts, newMemory());
    expect(isLegal(d.state, dec, ai.answer)).toBe(true);
    must(d, ai.answer);
  });

  it('random games with the reinforcements never break: every answer is accepted', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const s = build(gergovia({ banners: 5 }), seed);
      const d = new GameDriver(s);
      let rnd = seed * 7919;
      const next = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
      let placed = false;
      for (let step = 0; step < 4000 && d.pending; step++) {
        const dec = d.pending;
        if (dec.kind === 'placeUnit') placed = true;
        expect(d.answer(randomAnswer(d.state, dec, next)), `${seed} ${JSON.stringify(dec)}`).toBe(true);
      }
      if (placed) expect(d.state.special.placeUnits).toEqual([]);
    }
  });
});

describe('308 Gergovia itself (src/scenarios/data/308.json)', () => {
  const setup = () => scenarioFromJson(gergoviaJson as unknown as ScenarioJson).setup;

  it('the Gauls bring their reinforcements onto the western slopes; the Roman MI follows on his left baseline', () => {
    const s = createGame(setup(), 7);
    noFirstStrike(s);
    const d = new GameDriver(s);
    const [ax1, ax2, wa1, wa2] = s.special.reserveUnits.map((x) => x.id);
    const verc = s.special.reserveLeaders[0].id;
    const mi = s.special.placeUnits[0].unit.id;
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' }); // the Romans move first
    pass(d);
    expect(ambushAvailable(d.state, 'top', 'inspiredL')).toBe(true); // the Gauls' first turn
    springAmbush(d, 'inspiredL', 'center');
    for (const id of [ax1, ax2, wa1, wa2]) expect(pieceMoves(d.state, id).map((m) => m.hex)).toEqual(hexes(ENTRY));
    must(d, { kind: 'move', piece: ax1, to: H(3, 0) });
    must(d, { kind: 'move', piece: wa1, to: H(4, 0) }); // a hill
    must(d, { kind: 'move', piece: wa2, to: H(5, 0) });
    must(d, { kind: 'move', piece: ax2, to: H(7, 0) });
    expect(pieceMoves(d.state, wa1)).toEqual([]);
    must(d, { kind: 'endMove' });
    expect(d.pending).toEqual({ kind: 'placeLeader', side: 'top', leader: verc, options: hexes([[3, 0], [4, 0], [5, 0], [7, 0]]) });
    must(d, { kind: 'hex', hex: H(4, 0) });
    endTurnPlacingLeaders(d);
    expect(d.pending).toEqual({ kind: 'placeUnit', side: 'bottom', unit: mi, options: hexes(ROMAN_LEFT) });
    must(d, { kind: 'hex', hex: H(8, 1) });
    expect(u(d, mi)).toMatchObject({ type: 'MI', hex: H(8, 1), legion: 'julian' });
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
  });
});
