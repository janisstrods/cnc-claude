// Random battle in the battle picker: a battle from any box (never the one already shown) and a side, both at random.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../../src/scenarios';
import { PICKER_TABS, randomPick } from '../../src/ui/screens/picker';
import { ScenarioSelect } from '../../src/ui/screens/Menus';

/** A random source that returns the given values in turn. */
function seq(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('random battle', () => {
  it('never picks the battle already selected', () => {
    for (const cur of SCENARIOS) {
      for (const r of [0, 0.25, 0.5, 0.75, 0.999999]) {
        expect(randomPick(SCENARIOS, cur.id, seq(r, 0)).battle.id).not.toBe(cur.id);
      }
    }
  });

  it('can pick every other battle, from every box', () => {
    const cur = SCENARIOS[0].id;
    const n = SCENARIOS.length - 1;
    const picked = new Set<string>();
    for (let i = 0; i < n; i++) picked.add(randomPick(SCENARIOS, cur, seq((i + 0.5) / n, 0)).battle.id);
    expect(picked.size).toBe(n);
    const boxes = new Set(SCENARIOS.filter((s) => picked.has(s.id)).map((s) => s.expansion));
    expect([...boxes].sort()).toEqual(PICKER_TABS.map((t) => t.id).sort());
  });

  it('picks the side at random too', () => {
    expect(randomPick(SCENARIOS, '001', seq(0, 0.2)).side).toBe('bottom');
    expect(randomPick(SCENARIOS, '001', seq(0, 0.7)).side).toBe('top');
  });

  it('a list of one battle gives that battle', () => {
    expect(randomPick(SCENARIOS.slice(0, 1), SCENARIOS[0].id, seq(0.5, 0.5)).battle.id).toBe(SCENARIOS[0].id);
  });

  it('the picker offers it under the battle list', () => {
    const html = renderToStaticMarkup(createElement(ScenarioSelect, { onBack: () => {}, onStart: () => {} }));
    const list = html.indexOf('id="battle-list"');
    const btn = /<button[^>]*class="kit-btn kit-btn--ghost random-btn"[\s\S]*?<\/button>/.exec(html);
    expect(list).toBeGreaterThan(0);
    expect(btn?.index).toBeGreaterThan(list);
    expect(btn?.[0].replace(/<[^>]*>/g, '')).toBe('Random battle');
  });
});
