// Board art for Expansion #2 (rules-reference §18.4, §18.6): the ditch, a coast played as a ford, very steep hills,
// terrain removed during play, and the objective markers layer. The new BoardArt props are optional: left out (or at
// their defaults) the boards draw exactly as before.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BLOCK_COLORS } from '../../src/art';
import { COLS, createGame, ROWS, type ObjectiveDef, type ObjectiveState, type Side, type TerrainType } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { BOARD_W, hexCenter, isOnBoard } from '../../src/ui/geometry';
import { BoardArt, boardArtPropsEqual, ObjectiveMarkers, terrainArtOf, terrainName, TerrainIcon, type BoardArtProps } from '../../src/ui/terrain';

const svg = (el: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement('svg', null, el));
const art = (p: BoardArtProps) => svg(createElement(BoardArt, p));
const hx = (r: number, c: number) => r * COLS + c;

/** An open board with the given terrain. */
function board(cells: [number, number, TerrainType, boolean?][]): { terrain: TerrainType[]; fords: boolean[] } {
  const terrain: TerrainType[] = [];
  const fords: boolean[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) terrain.push(isOnBoard(r, c) ? 'plain' : 'void'), fords.push(false);
  for (const [r, c, t, f] of cells) {
    terrain[hx(r, c)] = t;
    fords[hx(r, c)] = !!f;
  }
  return { terrain, fords };
}

/** The points of the first path in `html` drawn with `attrs` (e.g. its stroke and width). */
function pathPoints(html: string, attrs: string): { x: number; y: number }[][] {
  const m = new RegExp(`<path d="([^"]+)"[^>]*${attrs}`).exec(html);
  expect(m).not.toBeNull();
  return m![1].split('M').filter(Boolean).map((sub) => [...sub.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((q) => ({ x: Number(q[1]), y: Number(q[2]) })));
}

describe('defaults draw the boards as before', () => {
  it.each(['002', '010', '102', '108', '118'])('%s: no hex art and ordinary hills give the same markup as leaving the props out', (id) => {
    const st = createGame(scenarioById(id).setup, 1);
    for (const flipped of [false, true]) {
      const base = { terrain: st.terrain, fords: st.fords, rampart: st.rampart, flipped, topLabel: 'A', bottomLabel: 'B' };
      const html = art(base);
      expect(art({ ...base, art: terrainArtOf(scenarioById(id).setup), steepHills: false })).toBe(html);
      for (const cls of ['ditches', 'coast-fords', 'very-steep']) expect(html).not.toContain(cls);
    }
  });
});

describe('ditch', () => {
  // 212 Bruttium: nine ditch hexes across the centre and right, running off the right edge
  const row = Array.from({ length: 9 }, (_, k): [number, number, TerrainType] => [4, 4 + k, 'ditch']);

  it.each([false, true])('a row of ditch hexes is one trench through every ditch hex centre (flipped %s)', (flipped) => {
    const { terrain, fords } = board(row);
    const html = art({ terrain, fords, flipped });
    expect(html).toContain('class="ditches"');
    // the trench's bottom line (the darkest stroke)
    const lines = pathPoints(html, 'stroke="#3e301b"');
    expect(lines).toHaveLength(1);
    const pts = lines[0];
    for (const [r, c] of row) {
      const p = hexCenter(r, c, flipped);
      expect(Math.min(...pts.map((q) => Math.hypot(q.x - p.x, q.y - p.y)))).toBeLessThan(4);
    }
    // it runs on under the frame at the right edge, and ends inside the board at the left (flipped: mirrored)
    const xs = pts.map((q) => q.x);
    const end = hexCenter(4, 12, flipped).x;
    const start = hexCenter(4, 4, flipped).x;
    if (!flipped) {
      expect(Math.max(...xs)).toBeGreaterThan(BOARD_W);
      expect(Math.min(...xs)).toBeGreaterThan(start - 43);
    } else {
      expect(Math.min(...xs)).toBeLessThan(0);
      expect(Math.max(...xs)).toBeLessThan(start + 43);
    }
    expect(Math.abs(end - start)).toBeGreaterThan(600);
  });

  it('a clump of three ditch hexes digs no closed loop; a lone ditch hex is drawn too', () => {
    const { terrain, fords } = board([
      [1, 5, 'ditch'],
      [1, 6, 'ditch'],
      [2, 6, 'ditch'],
      [7, 8, 'ditch'],
    ]);
    const html = art({ terrain, fords, flipped: false });
    const lines = pathPoints(html, 'stroke="#3e301b"');
    for (const l of lines) {
      const a = l[0];
      const b = l[l.length - 1];
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(10);
    }
    const lone = hexCenter(7, 8, false);
    expect(lines.some((l) => l.some((q) => Math.hypot(q.x - lone.x, q.y - lone.y) < 4))).toBe(true);
  });

  it('has a name and a swatch', () => {
    expect(terrainName('ditch', false)).toBe('Ditch');
    expect(renderToStaticMarkup(createElement(TerrainIcon, { t: 'ditch', size: 44 }))).toContain('class="ditches"');
  });
});

describe('coast played as a ford (217)', () => {
  const coast = Array.from({ length: 11 }, (_, k): [number, number, TerrainType, boolean] => [8, 1 + k, 'river', true]);
  const setup = { terrain: coast.map(([r, c]) => ({ r, c, t: 'sea', ford: true })) };

  it('terrainArtOf marks the hexes of entries with art, and sea hexes played as a ford, as coast', () => {
    const a = terrainArtOf({ terrain: [{ r: 0, c: 0, t: 'river', ford: true, art: 'coast' }, { r: 1, c: 1, t: 'sea', ford: true }, { r: 2, c: 2, t: 'sea' }, { r: 3, c: 3, t: 'river', ford: true }] });
    expect(a).toHaveLength(ROWS * COLS);
    expect(a.flatMap((v, i) => (v ? [[i, v]] : []))).toEqual([[hx(0, 0), 'coast'], [hx(1, 1), 'coast']]);
  });

  it.each([false, true])('the fordable river hexes with coast art are drawn as sea with ford stones (flipped %s)', (flipped) => {
    const { terrain, fords } = board(coast);
    const plain = art({ terrain, fords, flipped });
    expect(plain).toContain('class="rivers"');
    expect(plain).not.toContain('class="sea"');
    const html = art({ terrain, fords, flipped, art: terrainArtOf(setup) });
    expect(html).toContain('class="sea"');
    expect(html).toContain('class="coast-fords"');
    expect(html).not.toContain('class="rivers"');
  });

  it('has a name and a swatch', () => {
    expect(terrainName('river', true, false, 'coast')).toBe('Coastal Ford');
    expect(terrainName('river', true)).toBe('Fordable River');
    const icon = renderToStaticMarkup(createElement(TerrainIcon, { t: 'river', ford: true, art: 'coast', size: 44 }));
    expect(icon).toContain('class="coast-fords"');
    expect(icon).toContain('class="sea"');
  });
});

describe('very steep hills (223)', () => {
  it.each([false, true])('steepHills draws the hills rockier (flipped %s)', (flipped) => {
    const p = { ...board([[1, 1, 'hill'], [1, 4, 'hill'], [2, 3, 'hill'], [3, 3, 'hill']]), flipped };
    const html = art({ ...p, steepHills: true });
    expect(html).toContain('class="hills very-steep"');
    expect(art(p)).not.toContain('very-steep');
  });
});

describe('terrain changed during play', () => {
  it('a removed camp is open ground at once, and the memo compares the arrays by content', () => {
    const { terrain, fords } = board([[0, 6, 'camp']]);
    const before = art({ terrain, fords, flipped: false });
    expect(before).toContain('class="camps"');
    const after = terrain.slice();
    after[hx(0, 6)] = 'plain';
    expect(art({ terrain: after, fords, flipped: false })).not.toContain('class="camps"');

    const a: BoardArtProps = { terrain, fords, flipped: false };
    expect(boardArtPropsEqual(a, { ...a, terrain: terrain.slice(), fords: fords.slice() })).toBe(true);
    expect(boardArtPropsEqual(a, { ...a, terrain: after })).toBe(false);
    const ramp = new Array(ROWS * COLS).fill(0);
    expect(boardArtPropsEqual({ ...a, rampart: ramp }, { ...a, rampart: ramp.map((v, i) => (i === 5 ? 6 : v)) })).toBe(false);
    expect(boardArtPropsEqual(a, { ...a, art: terrainArtOf({ terrain: [{ r: 8, c: 1, t: 'sea', ford: true }] }) })).toBe(false);
    expect(boardArtPropsEqual(a, { ...a, steepHills: true })).toBe(false);
    expect(boardArtPropsEqual(a, { ...a, steepHills: false })).toBe(true);
  });
});

describe('objective markers', () => {
  const blocks: Record<Side, 'bar' | 'rom'> = { top: 'bar', bottom: 'rom' };
  const st0 = (): ObjectiveState => ({ taken: [], held: { top: 0, bottom: 0 }, sections: [] });
  const markers = (objectives: ObjectiveDef[], objState: ObjectiveState[], flipped = false, units?: { side: Side; hex: number }[]) =>
    svg(createElement(ObjectiveMarkers, { objectives, objState, flipped, blocks, units }));

  it('draws nothing for a battle without objectives', () => {
    expect(markers([], [])).toBe('<svg></svg>');
  });

  it('capture: a pennant in the capturing side\'s colour on every listed hex, struck once taken', () => {
    const o: ObjectiveDef = { kind: 'capture', side: 'bottom', hexes: [hx(0, 2), hx(0, 3), hx(1, 9)], when: 'turnStart', banners: [0, 0, 1], together: 0, remove: true, text: '' };
    const html = markers([o], [{ ...st0(), taken: [hx(0, 3)] }]);
    expect(html.match(/class="pennant"/g)).toHaveLength(2);
    expect(html.match(/class="pennant taken"/g)).toHaveLength(1);
    expect(html).toContain(`fill="${BLOCK_COLORS.rom.banner}"`);
    expect(html).not.toContain(BLOCK_COLORS.bar.banner);
  });

  it('a real battle: the Baecula camps (011) and the Castulo exits (010)', () => {
    const baecula = createGame(scenarioById('011').setup, 1);
    const camps = baecula.terrain.filter((t) => t === 'camp').length;
    const b = svg(createElement(ObjectiveMarkers, { objectives: baecula.special.objectives, objState: baecula.special.objState, flipped: false, blocks: { top: baecula.players.top.blocks, bottom: baecula.players.bottom.blocks } }));
    expect(b.match(/class="pennant"/g)).toHaveLength(camps);
    const castulo = createGame(scenarioById('010').setup, 1);
    const exits = castulo.special.objectives.flatMap((o) => (o.kind === 'exit' ? o.hexes : []));
    const c = svg(createElement(ObjectiveMarkers, { objectives: castulo.special.objectives, objState: castulo.special.objState, flipped: true, blocks: { top: castulo.players.top.blocks, bottom: castulo.players.bottom.blocks } }));
    expect(c.match(/class="exit"/g)).toHaveLength(exits.length);
  });

  it('hold: an outline on every listed hex, the standard raised where a unit of the side stands', () => {
    const o: ObjectiveDef = { kind: 'hold', side: 'top', hexes: [hx(7, 9), hx(8, 11)], max: 1, text: '' };
    const html = markers([o], [st0()], false, [{ side: 'top', hex: hx(7, 9) }, { side: 'bottom', hex: hx(8, 11) }]);
    expect(html.match(/class="hold"/g)).toHaveLength(2);
    expect(html.match(/class="standard held"/g)).toHaveLength(1);
    expect(html.match(/class="standard"/g)).toHaveLength(1);
    expect(html).toContain(`stroke="${BLOCK_COLORS.bar.edge}"`);
  });

  /** The tip (first point) of every exit arrow. */
  const tips = (html: string) =>
    [...html.matchAll(/<path d="M(-?[\d.]+),(-?[\d.]+)L[^"]*Z" fill="#/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));

  it.each([false, true])('exit: arrows point off the board across the outer edge of each hex (flipped %s)', (flipped) => {
    const bottomRow = [0, 1, 6, 12].map((c) => hx(8, c));
    const right = [hx(4, 12), hx(5, 11)];
    const left = [hx(3, 0)];
    const o: ObjectiveDef = { kind: 'exit', side: 'top', hexes: [...bottomRow, ...right, ...left], units: 'any', leadersScore: false, text: '' };
    const html = markers([o], [st0()], flipped);
    const arrows = tips(html);
    expect(arrows).toHaveLength(7);
    const s = flipped ? -1 : 1;
    const near = (h: number) => {
      const p = hexCenter(Math.floor(h / COLS), h % COLS, flipped);
      return { p, t: arrows.reduce((a, b) => (Math.hypot(a.x - p.x, a.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y) ? a : b)) };
    };
    for (const h of bottomRow) {
      const { p, t } = near(h);
      expect((t.y - p.y) * s).toBeGreaterThan(40);
      expect(Math.abs(t.x - p.x)).toBeLessThan(1);
    }
    for (const h of right) {
      const { p, t } = near(h);
      expect((t.x - p.x) * s).toBeGreaterThan(40);
    }
    for (const h of left) {
      const { p, t } = near(h);
      expect((t.x - p.x) * s).toBeLessThan(-40);
    }
  });

  it('majority: a dashed outline in both sides\' colours, in the holder\'s colour while held', () => {
    const o: ObjectiveDef = { kind: 'majority', sides: ['top', 'bottom'], hexes: [hx(3, 5), hx(3, 6), hx(4, 6), hx(4, 1)], banners: 2, when: 'turnEnd', text: '' };
    const open = markers([o], [st0()]);
    expect(open).toContain('class="majority"');
    expect(open).toContain(`stroke="${BLOCK_COLORS.bar.edge}"`);
    expect(open).toContain(`stroke="${BLOCK_COLORS.rom.edge}"`);
    // two separate areas: two loops in the outline
    const d = /class="majority"[^>]*><path d="([^"]+)"/.exec(open)![1];
    expect(d.match(/M/g)).toHaveLength(2);
    const held = markers([o], [{ ...st0(), held: { top: 0, bottom: 2 } }]);
    expect(held).toContain('class="majority held-bottom"');
    expect(held).not.toContain(BLOCK_COLORS.bar.edge);
  });

  it.each([false, true])('section clear: a tint over each section the side scores, mirrored on a flipped board (flipped %s)', (flipped) => {
    const o: ObjectiveDef = { kind: 'sectionClear', side: 'top', text: '' };
    const none = markers([o], [st0()], flipped);
    expect(none).not.toContain('section-tint');
    expect(none).not.toContain('<clipPath'); // the field clip only comes with tints to clip
    const html = markers([o], [{ ...st0(), sections: ['left'] }], flipped);
    expect(html.match(/<clipPath/g)).toHaveLength(1);
    const rects = [...html.matchAll(/<rect class="section-tint section-left" x="([\d.]+)" y="0" width="([\d.]+)"/g)];
    expect(rects).toHaveLength(1);
    // the top side's left is the right of the board as the bottom player sees it (the left of a flipped board)
    const x0 = Number(rects[0][1]);
    const x1 = x0 + Number(rects[0][2]);
    if (flipped) expect(x0).toBe(0);
    else expect(x1).toBeCloseTo(BOARD_W, 0);
  });
});
