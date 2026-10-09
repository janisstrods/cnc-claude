// Board art for Expansion #1 terrain: the sea is painted only where there is sea (and rivers fade into it only at a
// mouth), and rampart walls sit on the protected sides of their hexes on normal and flipped boards.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createGame, HEX_DIRS } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { HEX_R } from '../../src/ui/geometry';
import { BoardArt, TerrainIcon } from '../../src/ui/terrain';
import { boardCtx, neighborRC, type Dir } from '../../src/ui/terrain/hexmath';
import { P } from '../../src/ui/terrain/palette';
import { paintRamparts } from '../../src/ui/terrain/rampart';

const ENGINE_TO_DIR: Dir[] = [0, 5, 4, 3, 2, 1];

function board(id: string, flipped: boolean): string {
  const st = createGame(scenarioById(id).setup, 1);
  return renderToStaticMarkup(
    createElement('svg', null, createElement(BoardArt, { terrain: st.terrain, fords: st.fords, rampart: st.rampart, flipped })),
  );
}

describe('sea and river mouths', () => {
  it.each([
    ['002', false, false], // rivers, no sea
    ['006', false, false], // a lake stays a lake
    ['102', true, false], // sea, no river
    ['108', true, true], // a river runs into the sea
    ['101', true, true],
  ])('%s: sea painted %s, river mouth mask %s', (id, sea, mouth) => {
    for (const flipped of [false, true]) {
      const html = board(id, flipped);
      expect(html.includes('class="sea"')).toBe(sea);
      expect(html.includes('<mask')).toBe(mouth);
    }
  });

  it('keeps the reeds for lakes only', () => {
    expect(board('006', false)).toContain('class="lakes"');
    expect(board('108', false)).not.toContain('class="lakes"');
  });

  it('draws sea and rampart swatches', () => {
    for (const t of ['sea', 'rampart'] as const) {
      const html = renderToStaticMarkup(createElement(TerrainIcon, { t, size: 44 }));
      expect(html.length).toBeGreaterThan(2000);
    }
  });
});

describe('rampart walls', () => {
  /** Every vertex of the breastwork (the palisadeDark 4.4 stroke). */
  function parapetPoints(id: string, flipped: boolean): { x: number; y: number }[] {
    const st = createGame(scenarioById(id).setup, 1);
    const el = paintRamparts(boardCtx(st.terrain, st.fords, flipped), st.rampart);
    expect(el).not.toBeNull();
    const html = renderToStaticMarkup(createElement('svg', null, el));
    const m = new RegExp(`<path d="([^"]+)" fill="none" stroke="${P.palisadeDark}" stroke-width="4.4"`).exec(html);
    expect(m).not.toBeNull();
    return [...m![1].matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((q) => ({ x: Number(q[1]), y: Number(q[2]) }));
  }

  it.each([
    ['102', false],
    ['102', true],
    ['118', false],
    ['118', true],
  ])('%s (flipped %s): the wall lies on the protected side of its hex, near the hexsides', (id, flipped) => {
    const st = createGame(scenarioById(id).setup, 1);
    const ctx = boardCtx(st.terrain, st.fords, flipped);
    const walls = ctx.hexes
      .filter((h) => h.t === 'rampart')
      .map((h) => {
        // mean screen direction of the protected sides
        let fx = 0;
        let fy = 0;
        for (let i = 0; i < HEX_DIRS.length; i++) {
          if (!(st.rampart[h.id] & (1 << i))) continue;
          const [r, c] = neighborRC(h.r, h.c, ENGINE_TO_DIR[i]);
          const n = ctx.center(r, c);
          fx += n.x - h.x;
          fy += n.y - h.y;
        }
        return { h, fx, fy };
      });
    const pts = parapetPoints(id, flipped);
    expect(pts.length).toBeGreaterThan(walls.length * 2);
    for (const p of pts) {
      const w = walls.reduce((a, b) => (Math.hypot(p.x - a.h.x, p.y - a.h.y) <= Math.hypot(p.x - b.h.x, p.y - b.h.y) ? a : b));
      const d = Math.hypot(p.x - w.h.x, p.y - w.h.y);
      expect(d).toBeLessThan(HEX_R + 12); // inside the hex (or just past the board edge, under the frame)
      expect(d).toBeGreaterThan(25); // near the hexsides, clear of the units in the middle
      expect((p.x - w.h.x) * w.fx + (p.y - w.h.y) * w.fy).toBeGreaterThan(0);
    }
  });
});
