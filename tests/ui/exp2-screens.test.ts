// Expansion #2 screens (Rome & the Barbarians): the picker tab, the rules reference, tooltips for the new units, leaders,
// terrain and battle objectives, held banners on the banner track, separate commands (210), Rolling Fire (210), last-row
// retreat (214), the ambush wording (005, 206), the board layers and the controller's log lines.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  UNIT_STATS, cloneState, createGame, eligiblePieces, hexId, rollingFirePaths, validateOrders,
  type Decision, type GameEvent, type GameState, type HexId, type QueuedEvent, type RetreatOption, type Side, type Unit, type UnitType,
} from '../../src/engine';
import { SCENARIOS, scenarioById } from '../../src/scenarios';
import { BannerTrack, HELD_BANNER_TIP } from '../../src/ui/kit/BannerTrack';
import { Board } from '../../src/ui/game/Board';
import { GameController, newSessionConfig } from '../../src/ui/game/controller';
import { RandomOpponent } from '../../src/ui/game/opponent';
import {
  ambushTexts, bannerCounts, boardUi, commandTipLine, edgeBlocksOf, leaderTraitLines, objectiveTipLines, possessive, retreatEliminates,
  rollingFireStep, selectAllUnits, selectionCommand, unitSummary, type UiSel,
} from '../../src/ui/game/uiModel';
import { PICKER_TABS, battlesOf } from '../../src/ui/screens/picker';
import { Expansion2 } from '../../src/ui/screens/RulesReference';
import { H, build, toBattle, type Pos } from '../rules/helpers';

const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i).padStart(3, '0'));
const game = (id: string, seed = 1) => createGame(scenarioById(id).setup, seed);
const SEL: UiSel = { selCard: null, hoverCard: null, orderSel: [], selPiece: null, hoverHex: null };
const unit = (t: UnitType, extra: Partial<Unit> = {}): Unit =>
  ({ id: 'u1', side: 'bottom', type: t, hex: 0, blocks: UNIT_STATS[t].blocks, maxBlocks: UNIT_STATS[t].blocks, ...extra }) as Unit;
const text = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

// ---------------------------------------------------------------------------------------------

describe('battle picker', () => {
  it('the Expansion #2 tab lists the 23 battles 201–223 in order', () => {
    expect(PICKER_TABS.find((t) => t.id === 'exp2')).toEqual({ id: 'exp2', label: 'Rome & the Barbarians' });
    expect(ids(battlesOf(SCENARIOS, 'exp2'))).toEqual(range(201, 223));
    expect(scenarioById('201').name).toBe('Clusium');
    expect(scenarioById('223').name).toBe('Cefn Carnedd');
  });
});

describe('rules reference: the Expansion #2 tab', () => {
  const tab = text(renderToStaticMarkup(createElement(Expansion2)));
  it('covers every new unit, ability, leader, objective, battle rule and terrain', () => {
    for (const t of [
      'Barbarian Chariots', 'An elephant rolls 2 dice against Barbarian light chariots', 'Marian legions', 'Pilum:', 'March:',
      'Tenth Legion', 'Julius Caesar', 'Forced march:', 'Spartacus', 'Capture', 'Hold', 'Hill control', 'Section clear', 'Exit',
      'Held banners', 'Ambush', 'Separate commands', 'One card orders one army only', 'Rolling Fire', 'Last-row retreat', 'Ditch',
      'Very steep hills', 'Coast played as a ford', 'Rampart breakers',
    ]) expect(tab, t).toContain(t);
  });
  it('the Tenth Legion row has its own wording (no placeholder) and names its battles', () => {
    expect(tab).toMatch(/Tenth Legion Heavy Infantry · 215, 217 Caesar's favourite legion: throws the pilum and may march/);
  });
});

describe('tooltips: units and leaders', () => {
  it('a Barbarian light chariot, a Marian legionary, the Tenth Legion, Caesar and Spartacus', () => {
    expect(unitSummary(unit('BCH'))).toEqual(['Move 3 · Retreat 3/flag', 'Close combat 2 dice (+1 at full strength)', 'Can evade', 'Ignores 1 sword hit']);
    expect(unitSummary(unit('MI', { legion: 'marius' }))[2]).toBe('Missiles: range 2, 1 die (not after moving 2 hexes)');
    expect(unitSummary(unit('HI', { elite: 'tenthLegion' })).at(-1)).toBe('Tenth Legion: throws the pilum, marches 2 hexes without battle');
    const s = game('215');
    const caesar = s.leaders.find((l) => l.name === 'Julius Caesar')!;
    expect(leaderTraitLines(caesar)).toEqual(['+1 close combat die to his unit', 'his infantry unit may move 2 hexes and still battle']);
    const spartacus = game('210').leaders.find((l) => l.name === 'Spartacus')!;
    expect(leaderTraitLines(spartacus)).toEqual(['I Am Spartacus rolls 2 more dice']);
  });
});

describe('tooltips: battle objectives', () => {
  it('a camp captured at the start of the turn (215), before and after', () => {
    const s = game('215');
    expect(objectiveTipLines(s, H(7, 4))).toEqual(['Roman camp: a Belgic unit here at the start of its turn captures it — 1 banner; the camp is then removed']);
    expect(objectiveTipLines(s, H(1, 0))).toEqual(['Belgic camp: a Roman unit here at the start of its turn captures it — 1 banner; the camp is then removed']);
    s.special.objState[1].taken.push(H(7, 4));
    expect(objectiveTipLines(s, H(7, 4))).toEqual(['Roman camp: captured by the Belgic army']);
    expect(objectiveTipLines(s, H(4, 4))).toEqual([]);
  });
  it('banners in order (201: only the third camp scores) and all camps at once (211)', () => {
    const clusium = game('201');
    const camps = clusium.special.objectives[0].kind === 'capture' ? clusium.special.objectives[0].hexes : [];
    expect(camps).toHaveLength(3);
    expect(objectiveTipLines(clusium, camps[0])[0]).toMatch(/^Gallic camp: a Roman unit here at the start of its turn captures it — no banner until the third camp taken/);
    clusium.special.objState[0].taken.push(camps[0], camps[1]);
    expect(objectiveTipLines(clusium, camps[2])[0]).toMatch(/captures it — 1 banner/);
    const mummius = game('211');
    const m = mummius.special.objectives[0];
    expect(objectiveTipLines(mummius, m.kind === 'capture' ? m.hexes[0] : -1)).toEqual([
      'Slave camp: Roman units on 2 of these 3 camps at the start of their turn capture them all — 1 banner',
    ]);
  });
  it('a camp captured by stopping on it (011, base game)', () => {
    const s = game('011');
    const camp = s.terrain.indexOf('camp');
    expect(objectiveTipLines(s, camp)).toEqual(['Carthaginian camp: a Roman unit ending its move here captures it — 1 banner']);
  });
  it('hold (204, 222): held while occupied, can be lost; the state now', () => {
    const s = game('204');
    const o = s.special.objectives[0];
    const h = o.kind === 'hold' ? o.hexes[0] : -1;
    expect(objectiveTipLines(s, h)).toEqual([
      'Roman camp: the Germanic army holds 1 banner while one of its units stands here (at most 1 for all 2 hexes) — held while occupied, can be lost.',
    ]);
    const angrivarii = game('222');
    const r = angrivarii.special.objectives[0];
    const rh = r.kind === 'hold' ? r.hexes[0] : -1;
    const line = objectiveTipLines(angrivarii, rh)[0];
    expect(line).toMatch(/^Rampart: the Roman army holds 1 banner while one of its units stands here \(at most 2 for all 7 hexes\)/);
    angrivarii.units.find((u) => u.hex === rh)!.side = 'bottom';
    expect(objectiveTipLines(angrivarii, rh)[0]).toMatch(/Held now\.$/);
  });
  it('hill control (202) names the holder', () => {
    const s = game('202');
    const o = s.special.objectives[0];
    const h = o.kind === 'majority' ? o.hexes[0] : -1;
    expect(objectiveTipLines(s, h)).toEqual([
      'Hill objective: at the end of every turn the side with more units on the 9 marked hexes holds 2 banners (a tie: nobody)',
      'Held by nobody now',
    ]);
    s.special.objState[0].held.bottom = 2;
    expect(objectiveTipLines(s, h)[1]).toBe('Held now by the Roman army');
  });
  it('section clear (219) on the hexes of a scored section only', () => {
    const s = game('219');
    expect(objectiveTipLines(s, H(6, 6))).toEqual([]);
    s.special.objState[0].sections = ['center'];
    s.special.objState[0].held.bottom = 1;
    expect(objectiveTipLines(s, H(6, 6))).toEqual(['Section cleared: the Roman army holds 1 banner while no Briton unit enters this section']);
    expect(objectiveTipLines(s, H(6, 0))).toEqual([]);
  });
  it('exits (210 any unit, 212 foot only, 010 base game)', () => {
    expect(objectiveTipLines(game('210'), H(8, 3))).toEqual(['Exit: a Slave unit here may leave the battlefield — 1 banner (the unit is removed)']);
    const bruttium = game('212');
    const o = bruttium.special.objectives.find((x) => x.kind === 'exit');
    expect(o && objectiveTipLines(bruttium, o.hexes[0])).toEqual(['Exit: a Slave foot unit here may leave the battlefield — 1 banner (the unit is removed)']);
    const castulo = game('010');
    const ex = castulo.special.objectives[0];
    expect(objectiveTipLines(castulo, ex.kind === 'exit' ? ex.hexes[0] : -1)).toEqual(['Exit: a Roman unit here may leave the battlefield — 1 banner (the unit is removed)']);
  });
  it('battles without objectives have no objective lines', () => {
    const s = game('001');
    for (let h = 0; h < 117; h++) expect(objectiveTipLines(s, h)).toEqual([]);
  });
});

describe('banners held through objectives', () => {
  it('the model: the total counts the held banners, which are reported apart', () => {
    const s = game('202');
    expect(bannerCounts(s, 'bottom')).toEqual({ total: 0, held: 0 });
    s.players.bottom.banners = 1;
    s.special.objState[0].held.bottom = 2;
    expect(bannerCounts(s, 'bottom')).toEqual({ total: 3, held: 2 });
    expect(bannerCounts(s, 'top')).toEqual({ total: 0, held: 0 });
  });
  it('the track: held banners fill the last filled slots, hatched, with a tooltip; without them the markup is unchanged', () => {
    const track = (held?: number) => renderToStaticMarkup(createElement(BannerTrack, { count: 3, held, target: 5, blockColor: 'bar', label: 'Banners won' }));
    expect(track(0)).toBe(track(undefined));
    expect(track(undefined)).not.toMatch(/is-held|held/);
    const html = track(2);
    const slots = [...html.matchAll(/<div class="kit-banners__slot([^"]*)"( title="([^"]*)")?>/g)];
    expect(slots.map((m) => m[1].trim())).toEqual(['is-filled', 'is-filled is-held', 'is-filled is-held', '', '']);
    expect(slots.filter((m) => m[3] === HELD_BANNER_TIP)).toHaveLength(2);
    expect(HELD_BANNER_TIP).toBe('Held while occupied — can be lost');
    expect(html).toContain('aria-label="Banners won: 3 of 5 banners (2 held, can be lost)"');
    expect(html).toContain('>2 held</span>');
  });
});

describe('separate commands (210)', () => {
  const s = game('210');
  const lentulus = s.units.find((u) => u.command === 'lentulus')!;
  const gellius = s.units.find((u) => u.command === 'gellius')!;
  it('Lentulus is drawn in grey, Gellius in the army colour; the tooltip names the command', () => {
    expect(edgeBlocksOf(s, lentulus)).toBe('gry');
    expect(edgeBlocksOf(s, gellius)).toBeUndefined();
    expect(edgeBlocksOf(s, s.units.find((u) => u.side === 'top')!)).toBeUndefined();
    expect(commandTipLine(s, lentulus)).toBe("Lentulus' command: one card orders one command only");
    expect(commandTipLine(s, gellius)).toBe("Gellius' command: one card orders one command only");
    expect(commandTipLine(game('001'), game('001').units[0])).toBeNull();
    expect(possessive('Mago')).toBe("Mago's");
  });
  it('once a unit of one command is picked, only that command (and pieces with none) stay marked', () => {
    // an orders decision with Order Mounted: the Roman cavalry of both commands is eligible
    const orders: Decision = { kind: 'orders', side: 'bottom', card: 'orderMounted', mirrored: false };
    const all = boardUi(s, orders, SEL, 'bottom').highlights;
    const mounted = s.units.filter((u) => u.side === 'bottom' && UNIT_STATS[u.type].mounted);
    expect(new Set(mounted.map((u) => u.command))).toEqual(new Set(['lentulus', 'gellius']));
    for (const u of mounted) expect(all.get(u.hex), u.id).toBe('eligible');
    const lc = mounted.find((u) => u.command === 'lentulus')!;
    expect(selectionCommand(s, [lc.id])).toBe('lentulus');
    const narrowed = boardUi(s, orders, { ...SEL, orderSel: [lc.id] }, 'bottom').highlights;
    expect(narrowed.get(lc.hex)).toBe('selected');
    for (const u of mounted) if (u.command === 'gellius') expect(narrowed.has(u.hex), u.id).toBe(false);
    for (const u of mounted) if (u.command === 'lentulus' && u !== lc) expect(narrowed.get(u.hex), u.id).toBe('eligible');
  });
  it('"Select all" is offered only when every eligible unit belongs to one command', () => {
    // the Roman troop cards of 210 all reach units of both commands: selecting them all would be an illegal order
    for (const card of ['orderLight', 'orderHeavy', 'orderMounted', 'mountedCharge', 'moveFireMove'] as const) {
      const units = eligiblePieces(s, 'bottom', card).filter((id) => !id.startsWith('L'));
      expect(units.length, card).toBeLessThanOrEqual(s.players.bottom.command);
      expect(validateOrders(s, 'bottom', card, units), card).toBe('One card orders one army only.');
      expect(selectAllUnits(s, 'bottom', card), card).toBeNull();
    }
    // the Gauls have no commands: their cards offer it as before, and the selection is a legal order
    const light = selectAllUnits(s, 'top', 'orderLight');
    expect(light?.length).toBeGreaterThan(0);
    expect(validateOrders(s, 'top', 'orderLight', light!)).toBeNull();
    // a battle without commands
    const base = game('001');
    const mounted = selectAllUnits(base, 'bottom', 'orderMounted');
    expect(mounted).toEqual(eligiblePieces(base, 'bottom', 'orderMounted').filter((id) => !id.startsWith('L')));
  });
  it('the board draws a command badge on every unit of a command, none elsewhere', () => {
    const board = (st: GameState) => renderToStaticMarkup(createElement(Board, {
      state: st, flipped: false, humanSide: 'bottom', walking: {}, highlights: new Map(), leaderHighlights: new Map(), badges: new Map(),
      sectionShade: new Set<HexId>(), pathPreview: null, combat: null, flashes: [], orderedIds: new Set<string>(), doneIds: new Set<string>(),
    }));
    const html = board(s);
    expect((html.match(/class="command-badge"/g) ?? []).length).toBe(s.units.filter((u) => u.command).length);
    expect(board(game('001'))).not.toContain('command-badge');
    // objective markers are drawn in every battle with objectives, base game included
    for (const id of ['010', '011', '114', '202', '210']) expect(board(game(id)), id).toContain('objective-markers');
    expect(board(game('001'))).not.toContain('objective-markers');
  });
});

describe('Rolling Fire (210)', () => {
  // Slaves (top) on the hill at (2,6), moving first (as tests/rules/exp2-rolling-fire.test.ts)
  const pos: Pos = {
    rollingFire: 'top', first: 'top', topArmy: 'Slave', bottomArmy: 'Roman',
    terrain: [{ at: [2, 6], t: 'hill' }],
    units: [{ side: 'top', type: 'MI', at: [2, 6] }, { side: 'bottom', type: 'MI', at: [4, 5] }],
  };
  const battle = () => toBattle(build(pos), 'order3C', ['u1']);

  it('a unit that can only roll is offered (and badged) in the battle phase', () => {
    const d = battle();
    expect(d.pending).toMatchObject({ kind: 'battle', side: 'top' });
    const ui = boardUi(d.state, d.pending, SEL, 'top');
    expect(ui.badges.get(H(2, 6))).toBe('Logs');
    expect(ui.highlights.get(H(2, 6))).toBe('attacker');
  });
  it('the path is picked hex by hex from the legal paths; it is complete only where it must end', () => {
    const d = battle();
    const s = d.state;
    const paths = rollingFirePaths(s, 'u1');
    expect(rollingFireStep(s, 'u1', [])).toEqual({ next: [H(3, 5), H(3, 6)], complete: false });
    expect(rollingFireStep(s, 'u1', [H(3, 5)])).toEqual({ next: [H(4, 5), H(4, 6)], complete: false });
    expect(rollingFireStep(s, 'u1', [H(3, 5), H(4, 5)])).toEqual({ next: [H(5, 4), H(5, 5)], complete: false });
    expect(rollingFireStep(s, 'u1', [H(3, 5), H(4, 5), H(5, 4)])).toEqual({ next: [], complete: true });
    expect(rollingFireStep(s, 'u1', [H(4, 5)])).toEqual({ next: [], complete: false }); // not a path start
    // every complete path is a legal answer
    for (const p of paths) {
      expect(rollingFireStep(s, 'u1', p).complete).toBe(true);
      const t = battle();
      expect(t.answer({ kind: 'rollingFire', unit: 'u1', path: p }), p.join(',')).toBe(true);
    }
  });
  it('the board marks the path so far, the hexes it may run on to, and the units it would roll', () => {
    const d = battle();
    const ui = boardUi(d.state, d.pending, { ...SEL, selPiece: 'u1', rollPath: [H(3, 5)], hoverHex: H(4, 5) }, 'top');
    expect(ui.highlights.get(H(2, 6))).toBe('selected');
    expect(ui.highlights.get(H(3, 5))).toBe('rollPath');
    expect(ui.highlights.get(H(4, 5))).toBe('rollNext');
    expect(ui.highlights.get(H(4, 6))).toBe('rollNext');
    expect(ui.badges.get(H(4, 5))).toBe('2 dice'); // the Roman MI
    expect(ui.pathPreview).toEqual([H(2, 6), H(3, 5), H(4, 5)]);
  });
  it('nothing changes in a battle without Rolling Fire', () => {
    const s = build({ first: 'top', units: [{ side: 'top', type: 'MI', at: [2, 6] }, { side: 'bottom', type: 'MI', at: [3, 6] }], terrain: [{ at: [2, 6], t: 'hill' }] });
    const d = toBattle(s, 'order3C', ['u1']);
    expect(rollingFireStep(d.state, 'u1', [])).toEqual({ next: [], complete: false });
    expect([...boardUi(d.state, d.pending, SEL, 'top').badges.values()]).not.toContain('Logs');
  });
});

describe('last-row retreat (214)', () => {
  const opt = (end: HexId, losses: number, attachLeader: string | null = null): RetreatOption => ({ path: [end], end, losses, attachLeader });
  it('an option ending on the unit\'s own baseline row short of hexes eliminates it, for the battle\'s side only', () => {
    const s = game('214');
    const slave = s.units.find((u) => u.side === 'top')!;
    const d = (reason: 'retreat' | 'evade', id = slave.id): Extract<Decision, { kind: 'retreat' }> => ({ kind: 'retreat', side: 'top', unit: id, options: [], reason });
    expect(retreatEliminates(s, d('retreat'), opt(hexId(0, 4), 1))).toBe(true);
    expect(retreatEliminates(s, d('retreat'), opt(hexId(0, 4), 0))).toBe(false); // no hexes missing
    expect(retreatEliminates(s, d('retreat'), opt(hexId(1, 4), 1))).toBe(false); // not the baseline row
    expect(retreatEliminates(s, d('retreat'), opt(hexId(0, 4), 1, 'L1'))).toBe(false); // joins a leader
    expect(retreatEliminates(s, d('evade'), opt(hexId(0, 4), 1))).toBe(false); // an evade
    const roman = s.units.find((u) => u.side === 'bottom')!;
    expect(retreatEliminates(s, { ...d('retreat', roman.id), side: 'bottom' }, opt(hexId(8, 4), 1))).toBe(false);
    const other = game('213');
    expect(retreatEliminates(other, d('retreat', other.units.find((u) => u.side === 'top')!.id), opt(hexId(0, 4), 1))).toBe(false);
  });
  it('the board badges such an option "Lost"', () => {
    const s = game('214');
    const slave = s.units.find((u) => u.side === 'top')!;
    const dec: Decision = { kind: 'retreat', side: 'top', unit: slave.id, options: [opt(hexId(0, 4), 1), opt(hexId(1, 4), 1)], reason: 'retreat' };
    const ui = boardUi(s, dec, SEL, 'top');
    expect(ui.badges.get(hexId(0, 4))).toBe('Lost');
    expect(ui.badges.has(hexId(1, 4))).toBe(false);
  });
});

describe('ambush wording', () => {
  it('the Trebbia keeps its words; Aquae Sextiae names Marcellus and the German baseline, never Mago', () => {
    const trebbia = ambushTexts(game('005'), scenarioById('005').setup.reserveLeaders[0]?.name);
    expect(trebbia.button).toBe("Spring Mago's ambush: his force enters on the Roman baseline in this section");
    expect(trebbia.move).toBe("Mago's force enters on the Roman baseline: pick a piece, then a highlighted hex. Pieces left off the board return to the reserve.");
    const aquae = ambushTexts(game('206'), scenarioById('206').setup.reserveLeaders[0]?.name);
    expect(aquae.button).toBe("Spring Marcellus' ambush: his force enters on the Germanic baseline in this section");
    expect(aquae.move).toMatch(/^Marcellus' force enters on the Germanic baseline/);
    expect(JSON.stringify(aquae)).not.toContain('Mago');
    expect(ambushTexts(game('206')).button).toBe('Spring the ambush: the hidden force enters on the Germanic baseline in this section');
  });
});

describe('controller log lines', () => {
  async function settled(id: string, human: Side) {
    const c = new GameController({ ...newSessionConfig(id, human, 'recruit'), seed: 9 }, new RandomOpponent());
    for (let i = 0; i < 400 && !c.view.pending; i++) {
      c.hurry();
      await new Promise((r) => setTimeout(r, 5));
    }
    expect(c.view.pending, id).not.toBeNull();
    c.hurry();
    const animate = (e: GameEvent, state: GameState) => (c as unknown as { animate(q: QueuedEvent): Promise<void> }).animate({ e, state });
    return { c, animate };
  }
  const lastLog = (c: GameController) => c.view.log[c.view.log.length - 1].text;

  it('held banners gained and lost', async () => {
    const { c, animate } = await settled('202', 'bottom');
    try {
      const s0 = c.driver.state;
      const won = cloneState(s0);
      won.special.objState[0].held.bottom = 2;
      await animate({ t: 'held', side: 'bottom', held: 2, total: 2, reason: 'Control of the hills decides the day.' }, won);
      expect(lastLog(c)).toBe(`Control of the hills decides the day. The Roman army holds 2 banners (2/${s0.bannersToWin}) — held, so it can be lost again.`);
      expect(c.view.display).toBe(won);
      const lost = cloneState(won);
      lost.special.objState[0].held.bottom = 0;
      await animate({ t: 'held', side: 'bottom', held: 0, total: 0, reason: 'Control of the hills decides the day.' }, lost);
      expect(lastLog(c)).toBe(`The Roman army loses 2 held banners and now holds 0 banners (0/${s0.bannersToWin}).`);
    } finally {
      c.dispose();
    }
  });

  it('the hills changing hands (202): both held events share one snapshot, and the side gaining them is told so', async () => {
    const { c, animate } = await settled('202', 'bottom');
    try {
      const s0 = c.driver.state;
      const REASON = 'Control of the hills decides the day.';
      const [top, bottom] = [s0.players.top.army, s0.players.bottom.army];
      const topHolds = cloneState(s0);
      topHolds.special.objState[0].held = { top: 2, bottom: 0 };
      await animate({ t: 'held', side: 'top', held: 2, total: 2, reason: REASON }, topHolds);
      // the engine updates both sides before it emits either event: the loss first, then the gain, after the same update
      const swapped = cloneState(topHolds);
      swapped.special.objState[0].held = { top: 0, bottom: 2 };
      await animate({ t: 'held', side: 'top', held: 0, total: 0, reason: REASON }, swapped);
      expect(lastLog(c)).toBe(`The ${top} army loses 2 held banners and now holds 0 banners (0/${s0.bannersToWin}).`);
      await animate({ t: 'held', side: 'bottom', held: 2, total: 2, reason: REASON }, swapped);
      expect(lastLog(c)).toBe(`${REASON} The ${bottom} army holds 2 banners (2/${s0.bannersToWin}) — held, so it can be lost again.`);
    } finally {
      c.dispose();
    }
  });

  it('a rampart torn down (223) is logged, flashed and shown as open ground', async () => {
    const { c, animate } = await settled('223', 'bottom');
    try {
      const s0 = c.driver.state;
      const h = s0.terrain.indexOf('rampart');
      const after = cloneState(s0);
      after.terrain = [...after.terrain];
      after.terrain[h] = 'plain';
      await animate({ t: 'terrainChanged', hex: h, terrain: 'plain' }, after);
      expect(lastLog(c)).toBe('The rampart is torn down: open ground now.');
      expect(c.view.display.terrain[h]).toBe('plain');
      expect(c.view.flashes.some((f) => f.hex === h && f.text === 'Torn down')).toBe(true);
    } finally {
      c.dispose();
    }
  });

  it('a captured camp (215) is razed, also the Roman camp that is drawn as a rampart', async () => {
    const camp = await settled('215', 'bottom');
    try {
      const s0 = camp.c.driver.state;
      expect(s0.terrain[H(1, 0)]).toBe('camp');
      expect(s0.terrain[H(7, 4)]).toBe('rampart'); // the unfinished Roman camp
      for (const hex of [H(1, 0), H(7, 4)]) {
        const after = cloneState(s0);
        after.terrain = [...after.terrain];
        after.terrain[hex] = 'plain';
        await camp.animate({ t: 'terrainChanged', hex, terrain: 'plain' }, after);
        expect(lastLog(camp.c)).toBe('The camp is razed: open ground now.');
        expect(camp.c.view.display.terrain[hex]).toBe('plain');
        expect(camp.c.view.flashes.some((f) => f.hex === hex && f.text === 'Razed'), `${hex} flash`).toBe(true);
        expect(camp.c.view.flashes.some((f) => f.hex === hex && f.text === 'Torn down'), `${hex} not torn down`).toBe(false);
      }
    } finally {
      camp.c.dispose();
    }
  });

  it('a notice (Rolling Fire: a click off the highlighted hexes) shows once, however often it is asked for', async () => {
    const { c } = await settled('210', 'top');
    try {
      const text = 'Choose one of the highlighted hexes.';
      c.notice(text);
      expect(c.view.toast).toMatchObject({ text, kind: 'notice' });
      const id = c.view.toast?.id;
      c.notice(text);
      expect(c.view.toast?.id).toBe(id);
      c.notice('Another notice');
      expect(c.view.toast?.text).toBe(text); // waits for the first to run its time
    } finally {
      c.dispose();
    }
  });
});
