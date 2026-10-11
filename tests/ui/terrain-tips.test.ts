// Terrain tooltips (rules-reference §4, §7–§10, §16, §18.6, §18.7): every terrain says what it does to movement, combat and
// line of sight; the variants of single battles (no-cap ford, coastal ford, very steep hills, ramparts, Expansion #3's
// city walls, walled towns, camps and walls on hills and steep slopes) are worded for them.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createGame, hexId, type GameState, type HexId, type TerrainType } from '../../src/engine';
import { SCENARIOS, scenarioById } from '../../src/scenarios';
import { TerrainTipBlock } from '../../src/ui/game/TerrainTipBlock';
import { terrainTip, type TerrainTip } from '../../src/ui/game/terrainTips';
import { scenarioArt } from '../../src/ui/terrain';
import { H, build, type Pos } from '../rules/helpers';

const game = (id: string) => createGame(scenarioById(id).setup, 1);
const lines = (tip: TerrainTip | null) => tip!.lines.map((x) => `${x.kind}: ${x.text}`);
/** The tip of a single terrain hex at (4, 6) on an otherwise empty board. */
const tipOf = (t: TerrainType, extra: Partial<Pos> & { ford?: boolean } = {}) => {
  const { ford, ...pos } = extra;
  return terrainTip(build({ terrain: [{ at: [4, 6], t, ford }], ...pos }), H(4, 6), false);
};
/** The first hex of terrain `t` in `s` that passes `pred`. */
function hexOf(s: GameState, t: TerrainType, pred: (h: HexId) => boolean = () => true): HexId {
  const h = s.terrain.findIndex((x, i) => x === t && pred(i));
  expect(h, t).toBeGreaterThanOrEqual(0);
  return h;
}

const STOPS = 'move: Stops every unit and lone leader entering it';
const CLEAR = 'sight: Does not block line of sight';
const BLOCKS = 'sight: Blocks line of sight';
const HILL_SIGHT = 'sight: Blocks line of sight, unless firer and target stand on the same hill';
const ADVANCE_OUT = 'combat: A unit here may advance out after combat only if it did not move this turn';
const FORD = [STOPS, 'combat: Close combat in or out: max 2 dice. Firing out: max 1 die', ADVANCE_OUT, CLEAR];
const NO_HWM = 'move: Heavy war machines may not enter';

describe('terrain tooltips: every battle', () => {
  it('every terrain hex of all 81 battles has a name, a Move and a Sight line, in kind order; open ground and off-board have no tip', () => {
    expect(SCENARIOS).toHaveLength(81);
    const seen = new Set<TerrainType>();
    /** Terrain drawn as something else (`art`), with the name its tip gives it. */
    const variants = new Set<string>();
    const rank = ['move', 'combat', 'sight', 'battle'];
    for (const sc of SCENARIOS) {
      const s = createGame(sc.setup, 1);
      const art = scenarioArt(sc.id);
      s.terrain.forEach((t, h) => {
        const where = `${sc.id} hex ${h}`;
        const tip = terrainTip(s, h, false, art[h]);
        if (t === 'plain' || t === 'void') {
          expect(tip, where).toBeNull();
          return;
        }
        seen.add(t);
        if (art[h]) variants.add(`${t}:${art[h]}: ${tip!.name}`);
        if (s.hillUnder[h]) variants.add(`${t}:hill: ${tip!.name}`);
        expect(tip!.name, where).not.toBe('');
        const kinds = tip!.lines.map((x) => rank.indexOf(x.kind));
        expect(kinds, where).toContain(0);
        expect(kinds, where).toContain(2);
        expect(kinds, where).toEqual([...kinds].sort((a, b) => a - b));
      });
    }
    expect([...seen].sort()).toEqual(['broken', 'camp', 'ditch', 'forest', 'hill', 'lake', 'marsh', 'rampart', 'river', 'sea', 'steep', 'wall']);
    // the coast played as a ford (217, 313), Expansion #3's impassable walls (301) and towns (303, 304), and the camps and
    // walls on the hills of Gergovia (308)
    expect([...variants].sort()).toEqual([
      'camp:hill: Fortified Camp on a Hill', 'river:coast: Coastal Ford', 'steep:town: Town (impassable)', 'steep:wall: City Wall (impassable)',
      'wall:hill: City Wall on a Hill',
    ]);
  });
});

describe('terrain tooltips: each terrain', () => {
  it('hill', () => {
    const tip = tipOf('hill');
    expect(tip!.name).toBe('Hill');
    expect(lines(tip)).toEqual([
      'move: No effect',
      'combat: Battling up onto it from lower ground: max 2 dice',
      'combat: Battling from it: foot max 3 dice, mounted max 2',
      HILL_SIGHT,
    ]);
  });
  it('forest', () => {
    const tip = tipOf('forest');
    expect(tip!.name).toBe('Forest');
    expect(lines(tip)).toEqual([
      STOPS,
      'move: After entering it, only light foot, auxilia and warriors may battle that turn',
      'combat: Close combat in or out: max 2 dice. Firing into it: max 1 die',
      BLOCKS,
    ]);
  });
  it('marsh', () => {
    const tip = tipOf('marsh');
    expect(tip!.name).toBe('Marsh');
    expect(lines(tip)).toEqual([
      `${STOPS}. Leaving it, a unit or lone leader moves only 1 hex`,
      'move: A unit entering it (also by retreat or advance) rolls 1 die and loses a block on its own symbol; a lone leader dies on a helmet',
      'combat: Close combat in or out: max 2 dice. Firing out: max 1 die',
      ADVANCE_OUT,
      CLEAR,
    ]);
  });
  it('broken ground', () => {
    const tip = tipOf('broken');
    expect(tip!.name).toBe('Broken Ground');
    expect(lines(tip)).toEqual([
      'move: Stops mounted units and lone leaders entering it; a mounted unit that enters may not battle that turn',
      'combat: Close combat in or out: max 2 dice',
      CLEAR,
    ]);
  });
  it('heavy war machines are mentioned only where one is on the board', () => {
    const hwm: Partial<Pos> = { units: [{ side: 'bottom', type: 'HWM', at: [7, 6] }] };
    expect(lines(tipOf('marsh', hwm))).toEqual([...lines(tipOf('marsh')).slice(0, 2), NO_HWM, ...lines(tipOf('marsh')).slice(2)]);
    expect(lines(tipOf('broken', hwm))).toEqual([...lines(tipOf('broken')).slice(0, 1), NO_HWM, ...lines(tipOf('broken')).slice(1)]);
    expect(lines(tipOf('forest', hwm))).toEqual(lines(tipOf('forest')));
  });
  it('rivers: a fordable river, and the impassable river, lake, sea and steep hills', () => {
    const ford = tipOf('river', { ford: true });
    expect(ford).toMatchObject({ name: 'Fordable River', t: 'river', ford: true });
    expect(lines(ford)).toEqual(FORD);
    for (const [t, name] of [['river', 'River'], ['lake', 'Lake'], ['sea', 'Sea']] as const) {
      const tip = tipOf(t);
      expect(tip!.name).toBe(name);
      expect(lines(tip), t).toEqual(['move: Impassable', CLEAR]);
    }
    expect(tipOf('steep')!.name).toBe('Steep Hill');
    expect(lines(tipOf('steep'))).toEqual(['move: Impassable', BLOCKS]);
  });
  it('fortified camp and ditch', () => {
    expect(tipOf('camp')!.name).toBe('Fortified Camp');
    expect(lines(tipOf('camp'))).toEqual([
      'move: No effect',
      'combat: A unit here rolls 1 die fewer when it battles',
      'combat: Foot here ignore 1 sword and may ignore 1 flag',
      BLOCKS,
    ]);
    expect(tipOf('ditch')!.name).toBe('Ditch');
    expect(lines(tipOf('ditch'))).toEqual([STOPS, 'combat: No effect', CLEAR]);
  });
  it('open ground and off-board: no tip', () => {
    expect(tipOf('plain')).toBeNull();
    const s = game('001');
    expect(terrainTip(s, s.terrain.indexOf('void'), false)).toBeNull();
  });
});

describe('terrain tooltips: battle variants', () => {
  it('the ford without dice limits (108 Issus)', () => {
    const s = game('108');
    const tip = terrainTip(s, s.noCap.indexOf(true), false);
    expect(tip!.name).toBe('Ford (no dice limit)');
    expect(lines(tip)).toEqual([STOPS, 'combat: No dice limits in or out', ADVANCE_OUT, CLEAR]);
  });
  it('the coast played as a ford (217); an ordinary fordable river (215) has no battle line', () => {
    const s = game('217');
    const art = scenarioArt('217');
    const h = art.indexOf('coast');
    const tip = terrainTip(s, h, false, art[h]);
    expect(tip).toMatchObject({ name: 'Coastal Ford', t: 'river', ford: true, art: 'coast' });
    expect(lines(tip)).toEqual([...FORD, 'battle: A stretch of coast played as a fordable river']);
    const sabis = game('215');
    expect(lines(terrainTip(sabis, sabis.fords.indexOf(true), false))).toEqual(FORD);
  });
  it('very steep hills and the rampart breakers (223); hills elsewhere are ordinary', () => {
    const s = game('223');
    const hill = terrainTip(s, hexOf(s, 'hill'), false);
    expect(hill!.name).toBe('Very Steep Hill');
    expect(lines(hill)).toEqual([
      'move: A unit climbing onto it from lower ground stops and may not battle this turn',
      'combat: Battling up onto it: max 1 die. From it down: max 2. Hill to hill: max 3',
      'combat: A unit advancing up onto it after combat gets no bonus combat',
      HILL_SIGHT,
    ]);
    expect(lines(terrainTip(s, hexOf(s, 'rampart'), false)).at(-1)).toBe('battle: Torn down when a Roman unit enters or passes through it');
    const telamon = game('202');
    expect(terrainTip(telamon, hexOf(telamon, 'hill'), false)!.name).toBe('Hill');
  });
  it('ramparts name their protected hexsides as the viewer sees them (118, 102)', () => {
    const protects = (sides: string) =>
      `combat: Protects ${sides}: foot here ignore 1 sword and may ignore 1 flag when attacked across them, 1 flag when fired at through them`;
    const beneventum = game('118'); // Roman (bottom) ramparts face up the board
    const r = hexId(8, 4);
    expect(lines(terrainTip(beneventum, r, false))).toEqual(['move: No effect', protects('its upper hexsides'), CLEAR]);
    expect(lines(terrainTip(beneventum, r, true))[1]).toBe(protects('its lower hexsides'));
    const himera = game('102');
    expect(lines(terrainTip(himera, hexId(3, 1), false))[1]).toBe(protects('its lower hexsides'));
    expect(lines(terrainTip(himera, hexId(0, 8), false))).toEqual(['move: No effect', protects('its left and lower-left hexsides'), CLEAR]);
  });
});

describe('terrain tooltips: Expansion #3 (§18.7)', () => {
  const WALL_MOVE = [
    'move: Foot (not war machines) and lone leaders only, by a move from a hex next to it; the move ends there',
    'move: Moving off it: at most 1 hex',
    'move: Mounted units and war machines never enter it, not even by retreat or advance',
  ];
  const WALL_COMBAT = [
    'combat: Close combat with a unit here: max 2 dice, card and leader bonuses on top',
    'combat: Foot defending here strike first, ignore 1 sword and may ignore 1 flag (1 flag against missiles)',
    'combat: Mounted units and war machines attack a unit here only if they began the turn next to it',
  ];
  const hwm: Partial<Pos> = { units: [{ side: 'bottom', type: 'HWM', at: [7, 6] }] };

  it('the scalable city wall: who may enter and how, the dice, the defender, mounted attackers, sight', () => {
    const tip = tipOf('wall', hwm);
    expect(tip).toMatchObject({ name: 'City Wall', t: 'wall' });
    expect(tip!.hill).toBeUndefined();
    expect(lines(tip)).toEqual([...WALL_MOVE, ...WALL_COMBAT, 'sight: Blocks line of sight, except between units on the same wall']);
    // where no war machine takes the field (309), they are not mentioned
    expect(lines(tipOf('wall'))).toEqual([
      'move: Foot and lone leaders only, by a move from a hex next to it; the move ends there',
      'move: Moving off it: at most 1 hex',
      'move: Mounted units never enter it, not even by retreat or advance',
      WALL_COMBAT[0],
      WALL_COMBAT[1],
      'combat: Mounted units attack a unit here only if they began the turn next to it',
      'sight: Blocks line of sight, except between units on the same wall',
    ]);
    const ilerda = game('309');
    expect(lines(terrainTip(ilerda, hexId(0, 10), false))).toEqual(lines(tipOf('wall')));
  });

  it('a camp or wall on a hill (308): named and drawn as one, both sets of lines, the camp or wall limit, sight on the hill', () => {
    const camp = tipOf('camp', { terrain: [{ at: [4, 6], t: 'camp', hill: true }] });
    expect(camp).toMatchObject({ name: 'Fortified Camp on a Hill', t: 'camp', hill: true });
    expect(lines(camp)).toEqual([
      'move: No effect',
      'combat: Battling up onto it from lower ground: max 2 dice',
      'combat: Battling from it: foot max 3 dice, mounted max 2',
      'combat: A unit here rolls 1 die fewer when it battles, after the hill limit',
      'combat: Foot here ignore 1 sword and may ignore 1 flag',
      'sight: Blocks line of sight, also between units on the same hill',
    ]);
    const wall = tipOf('wall', { ...hwm, terrain: [{ at: [4, 6], t: 'wall', hill: true }] });
    expect(wall).toMatchObject({ name: 'City Wall on a Hill', t: 'wall', hill: true });
    expect(lines(wall)).toEqual([
      ...WALL_MOVE, ...WALL_COMBAT,
      "combat: A hill too: its limits are never below the wall's 2 dice",
      'sight: Blocks line of sight, also on the same hill, except between units on the same wall',
    ]);
    // in Gergovia itself (a war machine on the field, a slope on the eastern wall)
    const g = game('308');
    expect(terrainTip(g, hexId(0, 6), false)!.name).toBe('City Wall on a Hill');
    expect(lines(terrainTip(g, hexId(0, 6), false))).toEqual(lines(wall));
    expect(lines(terrainTip(g, hexId(2, 7), false))).toEqual(lines(camp));
    // the swatch draws the hill too
    const html = renderToStaticMarkup(createElement(TerrainTipBlock, { tip: camp!, alone: true }));
    const plain = renderToStaticMarkup(createElement(TerrainTipBlock, { tip: { ...camp!, hill: undefined }, alone: true }));
    expect(html).not.toBe(plain);
  });

  it('the impassable Wall of Rome (301) and walled towns (303, 304): impassable, blocking sight', () => {
    const rome = game('301');
    const art = scenarioArt('301');
    const w = terrainTip(rome, hexId(7, 2), false, art[hexId(7, 2)]);
    expect(w).toMatchObject({ name: 'City Wall (impassable)', t: 'steep', art: 'wall' });
    expect(lines(w)).toEqual(['move: Impassable', BLOCKS]);
    for (const [id, h] of [['303', hexId(2, 3)], ['304', hexId(3, 7)]] as const) {
      const tip = terrainTip(game(id), h, false, scenarioArt(id)[h]);
      expect(tip, id).toMatchObject({ name: 'Town (impassable)', t: 'steep', art: 'town' });
      expect(lines(tip), id).toEqual(['move: Impassable', BLOCKS]);
    }
  });

  it('steep slopes (308): the hexsides, from the hill and from the forest, as the viewer sees them; nothing elsewhere', () => {
    const g = game('308');
    const hill = terrainTip(g, hexId(2, 4), false)!;
    expect(lines(hill).at(-1)).toBe('battle: Steep slope down to the forest across its upper-left and left hexsides: no climbing up from there, and no close combat across it either way');
    expect(lines(terrainTip(g, hexId(2, 4), true)).at(-1)).toBe('battle: Steep slope down to the forest across its right and lower-right hexsides: no climbing up from there, and no close combat across it either way');
    expect(lines(terrainTip(g, hexId(1, 3), false)).at(-1)).toBe('battle: Steep slope up to the hill across its upper-right, right and lower-right hexsides: no move, advance, retreat or evade up it, and no close combat across it either way');
    // a camp on a hill with a forest beside it
    expect(lines(terrainTip(g, hexId(2, 9), false)).at(-1)).toMatch(/^battle: Steep slope down to the forest across its right hexside/);
    // a hill or forest with no slope, and the same terrain in a battle without the rule
    expect(lines(terrainTip(g, hexId(3, 5), false)).some((x) => x.startsWith('battle'))).toBe(false);
    const flat = build({ terrain: [{ at: [4, 6], t: 'hill' }, { at: [4, 7], t: 'forest' }] });
    expect(lines(terrainTip(flat, H(4, 6), false)).some((x) => x.startsWith('battle'))).toBe(false);
  });
});

describe('terrain tooltips: the tooltip block', () => {
  it('a swatch, the name and each kind labelled once; a divider under a unit', () => {
    const tip = tipOf('forest')!;
    const html = renderToStaticMarkup(createElement(TerrainTipBlock, { tip, alone: true }));
    expect(html).toContain('<svg');
    expect(html).toContain('>Forest<');
    expect(html.match(/class="tip-kind">Move</g)).toHaveLength(1); // two move lines, one label
    expect(html.match(/class="tip-kind"><\/span>/g)).toHaveLength(1);
    expect(html).not.toContain('tip-divided');
    expect(renderToStaticMarkup(createElement(TerrainTipBlock, { tip, alone: false }))).toContain('tip-divided');
  });
});
