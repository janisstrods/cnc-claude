// Board art for Expansion #3 (rules-reference §18.4, §18.7): scalable city walls, the impassable wall of Rome and walled
// towns (`steep` hexes with art 'wall' or 'town'), hills under camps and walls, the steep slopes of 308 and the ship
// markers of 313. The new BoardArt props are optional: left out (or at their defaults) the boards draw exactly as before.
// The battles are read from their scenario files (src/scenarios/data/3xx.json).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BLOCK_COLORS } from '../../src/art';
import { COLS, createGame, ROWS, type ObjectiveDef, type ObjectiveState, type Side, type TerrainType } from '../../src/engine';
import { boardFromTerrain, type TerrainSetup } from '../../src/engine/setup';
import { scenarioById } from '../../src/scenarios';
import { hexCenter } from '../../src/ui/geometry';
import { BoardArt, boardArtPropsEqual, ObjectiveMarkers, terrainArtOf, terrainName, TerrainIcon, type BoardArtProps } from '../../src/ui/terrain';

const svg = (el: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement('svg', null, el));
const art = (p: BoardArtProps) => svg(createElement(BoardArt, p));
const hx = (r: number, c: number) => r * COLS + c;
const count = (html: string, re: RegExp) => html.match(re)?.length ?? 0;

type Entry = { r: number; c: number; t: string; ford?: boolean; art?: string; hill?: boolean; faces?: 'top' | 'bottom'; edges?: string[] };
interface Battle { id: string; rules?: string[]; terrain: Entry[]; objectives?: Record<string, unknown>[] }
const BATTLES = Object.values(import.meta.glob('../../src/scenarios/data/3*.json', { eager: true, import: 'default' }) as Record<string, Battle>);
const battle = (id: string) => BATTLES.find((b) => b.id === id)!;

/** A board from a terrain list (the scenario format, with the Expansion #3 `hill` and `art`). */
function boardOf(terrainList: Entry[]) {
  const { terrain, fords, rampart, hillUnder } = boardFromTerrain(terrainList as TerrainSetup[]);
  return { terrain, fords, rampart, hillUnder, art: terrainArtOf({ terrain: terrainList }) };
}

describe('defaults draw the boards as before', () => {
  it.each(['002', '010', '102', '108', '212', '217', '223'])('%s: no hills under and no steep slopes give the same markup as leaving the props out', (id) => {
    const st = createGame(scenarioById(id).setup, 1);
    for (const flipped of [false, true]) {
      const base = { terrain: st.terrain, fords: st.fords, rampart: st.rampart, art: terrainArtOf(scenarioById(id).setup), flipped, topLabel: 'A', bottomLabel: 'B' };
      const html = art(base);
      expect(art({ ...base, hillUnder: new Array(ROWS * COLS).fill(false), steepSlopes: false }), `${id} ${flipped}`).toBe(html);
      // and the steep slopes add nothing to a battle without hills against woods
      for (const cls of ['city-walls', 'impassable-walls', 'towns']) expect(html).not.toContain(cls);
    }
  });
});

describe('the scalable city wall', () => {
  const towers = (html: string) => count(html, /class="tower"/g);

  it('a run of wall hexes is one wall with a tower on every join and at each free end, and a gate in its middle hex', () => {
    const { terrain, fords } = boardOf([0, 1, 2, 3, 4].map((k) => ({ r: 3, c: 4 + k, t: 'wall' })));
    for (const flipped of [false, true]) {
      const html = art({ terrain, fords, flipped });
      expect(html).toContain('class="city-walls"');
      // 4 joins and 2 free ends
      expect(towers(html), `flipped ${flipped}`).toBe(6);
      expect(count(html, /class="gate"/g), `flipped ${flipped}`).toBe(1);
      // no longer drawn as the steep plateau
      expect(html).not.toContain('class="steep"');
    }
  });

  it('a wall reaching the board edge runs on under the frame there (no tower); a lone wall hex has a tower at each end', () => {
    const edge = boardOf([{ r: 4, c: 0, t: 'wall' }, { r: 4, c: 1, t: 'wall' }]);
    expect(towers(art({ ...edge, flipped: false }))).toBe(2); // the join and the inner end
    const lone = boardOf([{ r: 4, c: 6, t: 'wall' }]);
    expect(towers(art({ ...lone, flipped: false }))).toBe(2);
  });

  it('a wall with a hill under it stands on a hill, painted under the wall', () => {
    const b = boardOf([{ r: 3, c: 5, t: 'wall', hill: true }, { r: 3, c: 6, t: 'wall', hill: true }]);
    for (const flipped of [false, true]) {
      const html = art({ ...b, flipped });
      expect(html).toContain('class="hills"');
      expect(html.indexOf('class="city-walls"')).toBeGreaterThan(html.indexOf('class="hills"'));
      expect(art({ ...b, hillUnder: undefined, flipped })).not.toContain('class="hills"');
    }
  });

  it('308 Gergovia: the walls and three camps have hills under them, and the hills change with them', () => {
    const b = boardOf(battle('308').terrain);
    expect(b.hillUnder.filter(Boolean)).toHaveLength(8);
    for (const flipped of [false, true]) {
      const withHills = art({ ...b, flipped });
      expect(withHills).toContain('class="city-walls"');
      expect(withHills).not.toMatch(/NaN|undefined/);
      const hills = (html: string) => /<g class="hills">.*?<\/g>/s.exec(html)?.[0];
      expect(hills(withHills)).not.toBe(hills(art({ ...b, hillUnder: undefined, flipped })));
    }
  });

  it('309 Ilerda: the three walls round the town are one wall, on open ground', () => {
    const b = boardOf(battle('309').terrain);
    const html = art({ ...b, flipped: false });
    expect(count(html, /class="city-walls"/g)).toBe(1);
    // two joins, the free end inside the board ((2,10)); (0,10) runs off the top edge; a gate in the middle hex
    expect(towers(html)).toBe(3);
    expect(count(html, /class="gate"/g)).toBe(1);
  });
});

describe('a hill under a camp', () => {
  it('a camp with a hill under it is painted on the hill; without it there is no hill', () => {
    const b = boardOf([{ r: 4, c: 6, t: 'camp', hill: true }]);
    const html = art({ ...b, flipped: false });
    expect(html).toContain('class="hills"');
    expect(html).toContain('class="camps"');
    // the camp is painted over the hill
    expect(html.indexOf('class="camps"')).toBeGreaterThan(html.indexOf('class="hills"'));
    expect(art({ ...b, hillUnder: undefined, flipped: false })).not.toContain('class="hills"');
  });
});

describe('impassable walls and towns', () => {
  it('301 Colline Gate: the Wall of Rome, two runs with a tower on every hex and a round gate tower on either side of the gap', () => {
    const b = boardOf(battle('301').terrain);
    expect(b.art.filter((a) => a === 'wall')).toHaveLength(10);
    for (const flipped of [false, true]) {
      const html = art({ ...b, flipped });
      expect(html).toContain('class="impassable-walls"');
      expect(html).not.toContain('class="steep"');
      // a round tower at each end beside the gap (the other ends run off the board), a square one on every other hex
      expect(count(html, /class="tower round"/g), `flipped ${flipped}`).toBe(2);
      expect(count(html, /class="tower"/g), `flipped ${flipped}`).toBe(8);
      expect(html).not.toMatch(/NaN|undefined/);
    }
  });

  it('303 Lauron and 304 Valentia: a walled town of four hexes, its houses inside the circuit', () => {
    for (const id of ['303', '304']) {
      const b = boardOf(battle(id).terrain);
      expect(b.art.filter((a) => a === 'town'), id).toHaveLength(4);
      const html = art({ ...b, flipped: false });
      expect(count(html, /class="towns"/g), id).toBe(1);
      expect(html, id).not.toContain('class="steep"');
      expect(count(html, new RegExp('fill="#b8643a"', 'g')), id).toBeGreaterThan(20);
    }
  });

  it('a steep hex without wall or town art is still the rocky plateau', () => {
    const b = boardOf([{ r: 4, c: 6, t: 'steep' }, { r: 4, c: 8, t: 'steep', art: 'town' }]);
    const html = art({ ...b, flipped: false });
    expect(html).toContain('class="steep"');
    expect(html).toContain('class="towns"');
  });
});

describe('steep slopes (308)', () => {
  const faces = (html: string) => count(html, /class="scarp"/g);

  it('a scarp on every hexside between a hill (or a hill under a camp or wall) and a forest, only with the rule', () => {
    const b = boardOf([
      { r: 4, c: 6, t: 'hill' }, { r: 4, c: 7, t: 'forest' }, { r: 5, c: 6, t: 'forest' },
      { r: 1, c: 3, t: 'camp', hill: true }, { r: 1, c: 4, t: 'forest' },
      { r: 7, c: 2, t: 'hill' }, { r: 7, c: 3, t: 'hill' },
    ]);
    for (const flipped of [false, true]) {
      const html = art({ ...b, steepSlopes: true, flipped });
      expect(html).toContain('class="steep-slopes"');
      expect(faces(html), `flipped ${flipped}`).toBe(3);
      expect(art({ ...b, flipped })).not.toContain('steep-slopes');
    }
  });

  it('308 Gergovia: twelve hill-forest hexsides', () => {
    const b = boardOf(battle('308').terrain);
    expect(battle('308').rules).toContain('steepSlopes');
    expect(faces(art({ ...b, steepSlopes: true, flipped: false }))).toBe(12);
  });
});

describe('names, swatches and the memo', () => {
  it('names the new terrain and draws its swatches', () => {
    expect(terrainName('wall', false)).toBe('City Wall');
    expect(terrainName('wall', false, false, undefined, true)).toBe('City Wall on a Hill');
    expect(terrainName('camp', false, false, undefined, true)).toBe('Fortified Camp on a Hill');
    expect(terrainName('steep', false, false, 'wall')).toBe('City Wall (impassable)');
    expect(terrainName('steep', false, false, 'town')).toBe('Town (impassable)');
    expect(terrainName('steep', false)).toBe('Steep Hill');
    const icon = (t: TerrainType, a?: string, hill?: boolean) => svg(createElement(TerrainIcon, { t, art: a, hill, size: 40 }));
    const swatches = [icon('wall'), icon('wall', undefined, true), icon('camp', undefined, true), icon('steep', 'wall'), icon('steep', 'town'), icon('steep'), icon('camp')];
    expect(new Set(swatches).size).toBe(swatches.length);
    for (const s of swatches) expect(s).not.toMatch(/NaN|undefined/);
    expect(icon('wall')).toContain('class="city-walls"');
  });

  it('the memo compares hills under and steep slopes by content', () => {
    const b = boardOf(battle('308').terrain);
    const p: BoardArtProps = { ...b, flipped: false, steepSlopes: true };
    expect(boardArtPropsEqual(p, { ...p, hillUnder: [...b.hillUnder] })).toBe(true);
    expect(boardArtPropsEqual(p, { ...p, hillUnder: b.hillUnder.map(() => false) })).toBe(false);
    expect(boardArtPropsEqual(p, { ...p, steepSlopes: false })).toBe(false);
  });
});

describe('ship markers (313)', () => {
  const blocks: Record<Side, 'gry' | 'rom'> = { top: 'gry', bottom: 'rom' };
  const st0 = (): ObjectiveState => ({ taken: [], held: { top: 0, bottom: 0 }, sections: [] });
  const ships = (side: Side, cols: number[]): ObjectiveDef =>
    ({ kind: 'capture', side, hexes: cols.map((c) => hx(0, c)), when: 'turnStart', banners: [1], together: 0, remove: false, text: '', marker: 'ship' }) as ObjectiveDef;

  it("a ship on every listed hex instead of a pennant: the enemy's vessel, its sail in his colour, the capturer's pennant at the masthead", () => {
    const html = svg(createElement(ObjectiveMarkers, { objectives: [ships('top', [8, 9, 10, 11])], objState: [{ ...st0(), taken: [hx(0, 9)] }], flipped: false, blocks }));
    expect(count(html, /class="ship"/g)).toBe(3);
    expect(count(html, /class="ship taken"/g)).toBe(1);
    expect(html).not.toContain('pennant');
    // the Caesarian transports (bottom, red) are taken by the Pompeians (top, grey)
    expect(html).toContain(`fill="${BLOCK_COLORS.rom.banner}"`);
    expect(html).toContain(`fill="${BLOCK_COLORS.gry.banner}"`);
    expect(html).not.toMatch(/NaN|undefined/);
  });

  it('313 Brindisi: both sides\' ships, on a flipped board too; other captures keep their pennants', () => {
    const defs = (battle('313').objectives ?? []).map((o) => {
      const hexes = (o.hexes as [number, number][]).map(([r, c]) => hx(r, c));
      return { ...o, hexes, banners: [1], together: 0, remove: false } as unknown as ObjectiveDef;
    });
    expect(defs.map((o) => (o as { marker?: string }).marker)).toEqual(['ship', 'ship']);
    for (const flipped of [false, true]) {
      const html = svg(createElement(ObjectiveMarkers, { objectives: defs, objState: defs.map(st0), flipped, blocks }));
      expect(count(html, /class="ship"/g), `flipped ${flipped}`).toBe(8);
      // each ship sits on its hex
      const xs = [...html.matchAll(/<g class="ship"><ellipse cx="([-\d.]+)" cy="([-\d.]+)"/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
      for (const c of [0, 1, 2, 3, 8, 9, 10, 11]) {
        const p = hexCenter(0, c, flipped);
        expect(Math.min(...xs.map((q) => Math.hypot(q.x - p.x, q.y - p.y))), `${c}`).toBeLessThan(15);
      }
    }
    const camp: ObjectiveDef = { kind: 'capture', side: 'bottom', hexes: [hx(0, 4)], when: 'turnStart', banners: [1], together: 0, remove: true, text: '' };
    expect(svg(createElement(ObjectiveMarkers, { objectives: [camp], objState: [st0()], flipped: false, blocks }))).toContain('class="pennant"');
  });
});

describe('every Expansion #3 battle board', () => {
  it('draws in both orientations without NaN, with the walls, towns and slopes its terrain asks for', () => {
    for (const b of BATTLES) {
      const board = boardOf(b.terrain);
      for (const flipped of [false, true]) {
        const html = art({ ...board, steepSlopes: !!b.rules?.includes('steepSlopes'), flipped });
        expect(html, `${b.id} ${flipped}`).not.toMatch(/NaN|undefined|Infinity/);
        expect(html.includes('city-walls'), b.id).toBe(b.terrain.some((t) => t.t === 'wall'));
        expect(html.includes('impassable-walls'), b.id).toBe(b.terrain.some((t) => t.art === 'wall'));
        expect(html.includes('class="towns"'), b.id).toBe(b.terrain.some((t) => t.art === 'town'));
      }
    }
  });
});
