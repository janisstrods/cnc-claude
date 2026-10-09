// Turn structure, victory and scenario special rules (rules-reference §5, §13, §14).
import { beforeEach, describe, expect, it } from 'vitest';
import { GameDriver, OFF_BOARD, createGame, distance, inSection, pieceMoves, rowOf } from '../../src/engine';
import { SCENARIOS, scenarioById } from '../../src/scenarios';
import { H, build, forceDice, giveCard, must, n, noFirstStrike, passTurn, play, toBattle, u } from './helpers';

beforeEach(() => forceDice([]));

describe('turn structure', () => {
  it('play 1 card, discard it, draw 1: hand back to Command, deck one smaller', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [6, 6] }] });
    noFirstStrike(s);
    const deck = s.deck.length;
    const d = new GameDriver(s);
    passTurn(d);
    expect(d.state.players.bottom.hand).toHaveLength(5);
    expect(d.state.deck).toHaveLength(deck - 1);
    expect(d.state.discard).toHaveLength(1);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
  });
  it('an empty deck is rebuilt by shuffling the discards', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [6, 6] }] });
    noFirstStrike(s);
    const card = giveCard(s, 'bottom', 'order2L');
    s.discard = s.deck.splice(0, s.deck.length);
    const d = new GameDriver(s);
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: [] });
    expect(d.state.players.bottom.hand).toHaveLength(5);
    expect(d.state.deck).toHaveLength(50);
    expect(d.state.discard).toHaveLength(0);
  });
  it('turns alternate', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'top', type: 'MI', at: [2, 6] }] });
    const d = new GameDriver(s);
    passTurn(d);
    expect(d.state.active).toBe('top');
    passTurn(d);
    expect(d.state.active).toBe('bottom');
  });
  it('all movement happens before any battle', () => {
    const s = build({ units: [
      { side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'bottom', type: 'MI', at: [6, 2] }, { side: 'top', type: 'MI', at: [4, 6] },
    ] });
    const d = play(s, 'order4C', ['u1']);
    must(d, { kind: 'endMove' });
    must(d, { kind: 'endBattle' });
    expect(d.pending?.kind).toBe('playCard');
    const s2 = build({ units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] }] });
    const d2 = toBattle(s2, 'order4C', ['u1']);
    expect(d2.answer({ kind: 'move', piece: 'u1', to: H(5, 5) })).toBe(false);
  });
  it('unordered units may not battle', () => {
    const s = build({ units: [
      { side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'bottom', type: 'MI', at: [5, 4] }, { side: 'top', type: 'MI', at: [4, 6] },
      { side: 'top', type: 'MI', at: [4, 4] },
    ] });
    const d = toBattle(s, 'order4C', ['u1']);
    expect(d.answer({ kind: 'attack', unit: 'u2', target: H(4, 4) })).toBe(false);
  });
});

describe('victory', () => {
  it('the first player to reach the banner count wins immediately', () => {
    const s = build({ banners: 1, units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 }] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['medium', ...n('light', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.state.winner).toBe('bottom');
    expect(d.pending).toBeNull();
  });
  it('an eliminated leader is a banner', () => {
    const s = build({ banners: 1, units: [{ side: 'bottom', type: 'HI', at: [5, 6] }], leaders: [{ side: 'top', at: [4, 6] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['leader', ...n('light', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.state.winner).toBe('bottom');
  });
});

describe('scenario data', () => {
  it('15 scenarios are available', () => {
    expect(SCENARIOS.map((x) => x.id)).toEqual(['001', '002', '003', '004', '005', '006', '007', '008', '009', '010', '011', '012', '013', '014', '015']);
  });
  it('special rules are attached to the right scenarios', () => {
    expect(scenarioById('002').setup.rules).toContain('sacredBand');
    expect(scenarioById('005').setup.rules).toContain('magoAmbush');
    expect(scenarioById('006').setup.rules).toContain('trasimenusHand');
    expect(scenarioById('009').setup.rules).toContain('beneventumHand');
    expect(scenarioById('010').setup.rules).toContain('castulo');
    expect(scenarioById('011').setup.rules).toContain('baeculaCamps');
  });
  it('river fordability: Ticinus and Beneventum not fordable, Trebbia and Metaurus fordable', () => {
    const fordable = (id: string) => {
      const st = scenarioById(id).setup;
      return st.terrain.filter((t) => t.t === 'river').map((t) => !!t.ford);
    };
    expect(fordable('004').every((f) => !f)).toBe(true);
    expect(fordable('009').every((f) => !f)).toBe(true);
    expect(fordable('005').every((f) => f)).toBe(true);
    expect(fordable('012').every((f) => f)).toBe(true);
  });
  it('Crimissos: exactly one Carthaginian Sacred Band (heavy infantry) unit', () => {
    const s = createGame(scenarioById('002').setup, 1);
    const sb = s.units.filter((x) => x.elite === 'carthSacredBand');
    expect(sb).toHaveLength(1);
    expect(sb[0].type).toBe('HI');
    expect(s.players[sb[0].side].army).toBe('Carthaginian');
  });
  it('Lake Trasimenus: lake and steep hills are impassable', () => {
    const s = createGame(scenarioById('006').setup, 1);
    for (let h = 0; h < s.terrain.length; h++) if (s.terrain[h] === 'steep' || s.terrain[h] === 'lake') {
      expect(s.units.some((x) => x.hex === h)).toBe(false);
    }
  });
});

describe('Lake Trasimenus: Roman hand 2 -> 3 -> 4', () => {
  it('Romans start with 2 cards and draw 2 after each of their first two turns', () => {
    const s = createGame(scenarioById('006').setup, 7);
    const roman = s.players.top.army === 'Roman' ? 'top' : 'bottom';
    expect(s.players[roman].hand).toHaveLength(2);
    expect(s.players[roman].command).toBe(2);
    noFirstStrike(s);
    const d = new GameDriver(s);
    const sizes: number[] = [];
    for (let t = 0; t < 8; t++) {
      const side = d.state.active;
      passTurn(d);
      if (side === roman) sizes.push(d.state.players[roman].hand.length);
    }
    expect(sizes).toEqual([3, 4, 4, 4]);
    expect(d.state.players[roman].command).toBe(4);
  });
});

describe('2nd Beneventum: Roman hand grows to 6 at the 3rd banner', () => {
  it('on the 3rd Roman banner Command becomes 6 and 2 cards are drawn at once', () => {
    const s = build({
      rules: ['beneventumHand'], cards: 4, bottomArmy: 'Roman',
      units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 }, { side: 'top', type: 'MI', at: [2, 2] }],
    });
    s.players.bottom.banners = 2;
    const d = toBattle(s, 'order4C', ['u1']);
    expect(d.state.players.bottom.hand).toHaveLength(3);
    forceDice(['medium', ...n('light', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.state.players.bottom.banners).toBe(3);
    expect(d.state.players.bottom.command).toBe(6);
    expect(d.state.players.bottom.hand).toHaveLength(5);
    if (d.pending?.kind === 'momentum') must(d, { kind: 'yesno', yes: false });
    expect(d.state.players.bottom.hand).toHaveLength(6);
  });
  it('the Carthaginians do not gain the bonus', () => {
    const s = build({
      rules: ['beneventumHand'], cards: 4, bottomArmy: 'Roman', first: 'top',
      units: [{ side: 'top', type: 'HI', at: [4, 6] }, { side: 'bottom', type: 'MI', at: [5, 6], blocks: 1 }, { side: 'bottom', type: 'MI', at: [7, 2] }],
    });
    s.players.top.banners = 2;
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['medium', ...n('light', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(5, 6) });
    expect(d.state.players.top.banners).toBe(3);
    expect(d.state.players.top.command).toBe(4);
  });
});

describe('Castulo', () => {
  const castulo = {
    rules: ['castulo' as const], sacredLeader: { side: 'bottom' as const, name: 'Scipio' },
  };
  it('if Publius Scipio is eliminated Carthage wins at once', () => {
    const s = build({
      ...castulo, first: 'top',
      units: [{ side: 'top', type: 'HI', at: [4, 6] }],
      leaders: [{ side: 'bottom', name: 'Scipio', at: [5, 6] }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['leader', ...n('light', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(5, 6) });
    expect(d.state.winner).toBe('top');
  });
  it('a Roman unit may exit over the Carthaginian baseline from a centre or Roman-right hex: 1 banner, removed', () => {
    const s = build({ ...castulo, units: [{ side: 'bottom', type: 'MI', at: [0, 6] }, { side: 'bottom', type: 'MI', at: [0, 10] }, { side: 'bottom', type: 'MI', at: [0, 2] }] });
    const d = play(s, 'order3C', ['u1']);
    expect(pieceMoves(d.state, 'u1').map((m) => m.hex)).toContain(OFF_BOARD);
    must(d, { kind: 'move', piece: 'u1', to: OFF_BOARD });
    expect(u(d, 'u1')).toBeUndefined();
    expect(d.state.players.bottom.banners).toBe(1);
    const s2 = build({ ...castulo, units: [{ side: 'bottom', type: 'MI', at: [0, 10] }, { side: 'bottom', type: 'MI', at: [0, 2] }] });
    const d2 = play(s2, 'order2R', ['u1']);
    expect(pieceMoves(d2.state, 'u1').map((m) => m.hex)).toContain(OFF_BOARD);
    const s3 = build({ ...castulo, units: [{ side: 'bottom', type: 'MI', at: [0, 2] }] });
    const d3 = play(s3, 'order2L', ['u1']);
    expect(pieceMoves(d3.state, 'u1').map((m) => m.hex)).not.toContain(OFF_BOARD);
  });
  it('exiting counts as a hex of movement (light cavalry 3 hexes from the baseline row + 1 exit)', () => {
    const s = build({ ...castulo, units: [{ side: 'bottom', type: 'LC', at: [3, 6] }] });
    const d = play(s, 'order2C', ['u1']);
    const exit = pieceMoves(d.state, 'u1').find((m) => m.hex === OFF_BOARD);
    expect(exit?.dist).toBe(4);
    const s2 = build({ ...castulo, units: [{ side: 'bottom', type: 'LC', at: [4, 6] }] });
    const d2 = play(s2, 'order2C', ['u1']);
    expect(pieceMoves(d2.state, 'u1').map((m) => m.hex)).not.toContain(OFF_BOARD);
  });
  it('Carthaginian units cannot exit', () => {
    const s = build({ ...castulo, first: 'top', units: [{ side: 'top', type: 'MI', at: [8, 6] }] });
    const d = play(s, 'order2C', ['u1']);
    expect(pieceMoves(d.state, 'u1').map((m) => m.hex)).not.toContain(OFF_BOARD);
  });
});

describe('Baecula camps', () => {
  const baecula = { rules: ['baeculaCamps' as const], terrain: [{ at: [2, 6] as [number, number], t: 'camp' as const }] };
  it('a Roman unit ending its move on a camp hex gains 1 banner, once per camp', () => {
    const s = build({ ...baecula, units: [{ side: 'bottom', type: 'MI', at: [3, 6] }, { side: 'bottom', type: 'MI', at: [3, 5] }] });
    const d = play(s, 'order2C', ['u1']);
    must(d, { kind: 'move', piece: 'u1', to: H(2, 6) });
    expect(d.state.players.bottom.banners).toBe(1);
  });
  it('the same camp gives no second banner', () => {
    const s = build({ ...baecula, units: [{ side: 'bottom', type: 'MI', at: [3, 6] }, { side: 'bottom', type: 'MI', at: [3, 5] }] });
    const d = play(s, 'order2C', ['u1']);
    must(d, { kind: 'move', piece: 'u1', to: H(2, 6) });
    while (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    while (d.pending?.kind === 'battle') must(d, { kind: 'endBattle' });
    expect(d.state.players.bottom.banners).toBe(1);
    passTurn(d); // top
    const card = giveCard(d.state, 'bottom', 'order2C');
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1', 'u2'] });
    must(d, { kind: 'move', piece: 'u1', to: H(2, 7) });
    must(d, { kind: 'move', piece: 'u2', to: H(2, 6) });
    expect(d.state.players.bottom.banners).toBe(1);
  });
  it('moving through a camp hex gives no banner', () => {
    const s = build({ ...baecula, units: [{ side: 'bottom', type: 'LC', at: [3, 6] }, { side: 'bottom', type: 'MI', at: [2, 7] }] });
    const d = play(s, 'order2C', ['u1']);
    const m = pieceMoves(d.state, 'u1').find((x) => x.hex === H(1, 6) && x.path.includes(H(2, 6)));
    expect(m).toBeTruthy();
    must(d, { kind: 'move', piece: 'u1', to: H(1, 6) });
    expect(d.state.players.bottom.banners).toBe(0);
  });
});

describe('Trebbia: Mago ambush', () => {
  function trebbia() {
    const s = createGame(scenarioById('005').setup, 11);
    noFirstStrike(s);
    return new GameDriver(s);
  }
  it('Mago is off board with 1 MC, 2 WA', () => {
    const d = trebbia();
    expect(d.state.special.reserveUnits.map((x) => x.type).sort()).toEqual(['MC', 'WA', 'WA']);
    expect(d.state.special.reserveLeaders.map((x) => x.name)).toEqual(['Mago']);
    expect(d.state.special.reserveSide).toBe('top');
  });
  it('not available on the Carthaginian first turn', () => {
    const d = trebbia();
    passTurn(d); // Roman turn 1
    const card = giveCard(d.state, 'top', 'leadershipAny');
    must(d, { kind: 'playCard', card });
    expect(d.pending?.kind).toBe('orders');
    expect(d.answer({ kind: 'orders', pieces: [], ambushSection: 'left' })).toBe(false);
  });
  it('only a Leadership card brings the ambush in; Inspired cards fix the section', () => {
    const d = trebbia();
    passTurn(d);
    passTurn(d);
    passTurn(d);
    const sec = giveCard(d.state, 'top', 'order3L');
    must(d, { kind: 'playCard', card: sec });
    expect(d.answer({ kind: 'orders', pieces: [], ambushSection: 'left' })).toBe(false);
    must(d, { kind: 'orders', pieces: [] });
    while (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    while (d.pending?.kind === 'battle') must(d, { kind: 'endBattle' });
    passTurn(d);
    const ins = giveCard(d.state, 'top', 'inspiredL');
    must(d, { kind: 'playCard', card: ins });
    expect(d.answer({ kind: 'orders', pieces: [], ambushSection: 'center' })).toBe(false);
    must(d, { kind: 'orders', pieces: [], ambushSection: 'left' });
    expect(d.pending?.kind).toBe('move');
  });
  it('the force enters on Roman baseline hexes of the card section (Carthaginian view); entry counts as 1 hex', () => {
    const d = trebbia();
    passTurn(d);
    passTurn(d);
    passTurn(d);
    const ins = giveCard(d.state, 'top', 'inspiredL');
    must(d, { kind: 'playCard', card: ins });
    must(d, { kind: 'orders', pieces: [], ambushSection: 'left' });
    const mc = d.state.units.find((x) => x.type === 'MC' && x.hex === OFF_BOARD)!;
    const moves = pieceMoves(d.state, mc.id);
    const entries = moves.filter((m) => m.dist === 1);
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(rowOf(e.hex)).toBe(8);
      expect(inSection(e.hex, 'top', 'left')).toBe(true);
    }
    expect(Math.max(...moves.map((m) => m.dist))).toBe(3);
    // Mago may only be placed with a unit that has entered
    const mago = d.state.leaders.find((l) => l.name === 'Mago')!;
    expect(pieceMoves(d.state, mago.id)).toEqual([]);
    must(d, { kind: 'move', piece: mc.id, to: entries[0].hex });
    expect(pieceMoves(d.state, mago.id).map((m) => m.hex)).toEqual([entries[0].hex]);
  });
  it('ambush units belong to the Carthaginian side (they retreat toward it)', () => {
    const d = trebbia();
    passTurn(d);
    passTurn(d);
    passTurn(d);
    const ins = giveCard(d.state, 'top', 'leadershipAny');
    must(d, { kind: 'playCard', card: ins });
    must(d, { kind: 'orders', pieces: [], ambushSection: 'left' });
    const wa = d.state.units.find((x) => x.type === 'WA' && x.hex === OFF_BOARD)!;
    expect(wa.side).toBe('top');
  });
});

describe('more scenario rules', () => {
  it('Trebbia: an entering warrior may move a 2nd hex only to charge (placement = 1st hex)', () => {
    const s = createGame(scenarioById('005').setup, 11);
    noFirstStrike(s);
    const d = new GameDriver(s);
    passTurn(d);
    passTurn(d);
    passTurn(d);
    const ins = giveCard(d.state, 'top', 'inspiredL');
    must(d, { kind: 'playCard', card: ins });
    must(d, { kind: 'orders', pieces: [], ambushSection: 'left' });
    const wa = d.state.units.find((x) => x.type === 'WA' && x.hex === OFF_BOARD)!;
    const moves = pieceMoves(d.state, wa.id);
    expect(Math.max(...moves.map((m) => m.dist))).toBe(2);
    for (const m of moves.filter((x) => x.dist === 2)) {
      expect(m.mustBattle).toBe(true);
      expect(d.state.units.some((x) => x.side === 'bottom' && x.hex >= 0 && distanceOk(x.hex, m.hex))).toBe(true);
    }
  });
  it('2nd Beneventum: the bonus also triggers when the 3rd Roman banner comes from a battle back', () => {
    const s = build({
      rules: ['beneventumHand'], cards: 4, bottomArmy: 'Roman', first: 'top',
      units: [{ side: 'top', type: 'MI', at: [4, 6], blocks: 1 }, { side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: [1, 1] }],
    });
    s.players.bottom.banners = 2;
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice([...n('light', 4), 'medium', ...n('light', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(5, 6) });
    expect(d.state.players.bottom.banners).toBe(3);
    expect(d.state.players.bottom.command).toBe(6);
    expect(d.state.players.bottom.hand).toHaveLength(6);
  });
});

function distanceOk(a: number, b: number) {
  return distance(a, b) === 1;
}

