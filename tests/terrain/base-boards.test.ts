// The base-game boards are drawn exactly as before Expansion #1: a SHA-256 pin of the BoardArt render of every base
// battle (001-015), normal and flipped, with the army names on the frame as the battle screens show them. The pinned
// value is the render of the tree before Expansion #1 (main at d5382e0) and of this branch alike.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/engine';
import { SCENARIOS } from '../../src/scenarios';
import { BoardArt } from '../../src/ui/terrain';

const BASELINE = '939ef6810da0f2378512346f9d09d8b3ca99a9798a0603ad9dec2f8aefb95065';

describe('base boards are drawn exactly as before Expansion #1', () => {
  const BASE = SCENARIOS.filter((sc) => sc.expansion === 'base');

  it('covers the 15 base battles', () => {
    expect(BASE.map((sc) => sc.id)).toEqual(['001', '002', '003', '004', '005', '006', '007', '008', '009', '010', '011', '012', '013', '014', '015']);
  });

  it('every base board renders byte-identically, in both orientations', async () => {
    const parts: string[] = [];
    for (const sc of BASE) {
      const st = createGame(sc.setup, 1);
      for (const flipped of [false, true]) {
        const [top, bottom] = flipped ? (['bottom', 'top'] as const) : (['top', 'bottom'] as const);
        parts.push(renderToStaticMarkup(createElement('svg', null, createElement(BoardArt, {
          terrain: st.terrain, fords: st.fords, rampart: st.rampart, flipped, topLabel: st.players[top].army, bottomLabel: st.players[bottom].army,
        }))));
      }
    }
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts.join('')));
    const hex = [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, '0')).join('');
    expect(hex).toBe(BASELINE);
  });
});
