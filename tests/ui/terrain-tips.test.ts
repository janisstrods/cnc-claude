// Terrain tooltips (rules-reference §4, §7–§10, §16, §18.6): every terrain says what it does to movement, combat and
// line of sight; the variants of single battles (no-cap ford, coastal ford, very steep hills, ramparts) are worded for them.
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
  it('every terrain hex has a name, a Move and a Sight line, in kind order; open ground and off-board have no tip', () => {
    const seen = new Set<TerrainType>();
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
        expect(tip!.name, where).not.toBe('');
        const kinds = tip!.lines.map((x) => rank.indexOf(x.kind));
        expect(kinds, where).toContain(0);
        expect(kinds, where).toContain(2);
        expect(kinds, where).toEqual([...kinds].sort((a, b) => a - b));
      });
    }
    expect([...seen].sort()).toEqual(['broken', 'camp', 'ditch', 'forest', 'hill', 'lake', 'marsh', 'rampart', 'river', 'sea', 'steep']);
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
