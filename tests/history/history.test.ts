// Battle histories: every base and Expansion #1 battle has one, each passes the validator (references, bounds, word
// limits), the phase rules hold, and the dialog's slides, map and button render.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { SCENARIOS, scenarioById } from '../../src/scenarios';
import { MAP_H, MAP_W, hasHistory, historyIds, loadHistory, unitFrames, unitsAtPhase, type BattleHistory, type BattleMap as MapData } from '../../src/history';
import { validateHistory, words } from '../../src/history/validate';
import { BattleMap } from '../../src/ui/history/BattleMap';
import { HistoryButton, HistorySlides, SLIDE_TITLES, nextPos, prevPos, sideColors } from '../../src/ui/history/HistoryDialog';

const histories = new Map<string, BattleHistory>();
beforeAll(async () => {
  for (const id of historyIds()) histories.set(id, await loadHistory(id));
});

describe('coverage', () => {
  it('every base and Expansion #1 battle has a history', () => {
    const missing = SCENARIOS.filter((s) => (s.expansion === 'base' || s.expansion === 'exp1') && !hasHistory(s.id)).map((s) => s.id);
    expect(missing).toEqual([]);
  });

  it('every history belongs to a battle and carries its own id', () => {
    for (const [id, h] of histories) {
      expect(scenarioById(id), id).toBeDefined();
      expect(h.id, `battles/${id}.ts`).toBe(id);
    }
  });

  it('a battle without a history is reported as such', async () => {
    expect(hasHistory('999')).toBe(false);
    await expect(loadHistory('999')).rejects.toThrow(/No history/);
  });
});

describe('content', () => {
  it('every history passes the validator', () => {
    const problems = [...histories.values()].flatMap(validateHistory);
    expect(problems).toEqual([]);
  });

  it('the winner and the sides are the battle’s own', () => {
    for (const [id, h] of histories) {
      expect(['top', 'bottom', 'draw'], id).toContain(h.outcome.winner);
      expect(Object.keys(h.sides).sort(), id).toEqual(['bottom', 'top']);
    }
  });

  it('the validator catches broken references, bounds and long text', () => {
    const h = histories.get('007')!;
    const bad: BattleHistory = structuredClone(h);
    bad.map.phases[1].at.ghost = [10, 10];
    bad.map.phases[0].at.numid = [MAP_W + 5, 10];
    bad.map.phases[2].gone = ['nobody'];
    bad.context.text = [Array(200).fill('word').join(' ')];
    bad.map.units.push({ id: 'idle', side: 'top', kind: 'foot' });
    bad.date = '216';
    const problems = validateHistory(bad).join('\n');
    expect(problems).toMatch(/unknown unit ghost/);
    expect(problems).toMatch(/numid off the field/);
    expect(problems).toMatch(/unknown unit nobody/);
    expect(problems).toMatch(/context.text has 200 words/);
    expect(problems).toMatch(/idle is never placed/);
    expect(problems).toMatch(/date "216"/);
  });

  it('counts words', () => {
    expect(words('  a  b\nc ')).toBe(3);
  });
});

describe('phases', () => {
  const map: MapData = {
    terrain: [],
    units: [
      { id: 'a', side: 'top', kind: 'foot' },
      { id: 'b', side: 'bottom', kind: 'horse' },
      { id: 'late', side: 'bottom', kind: 'light' },
    ],
    phases: [
      { title: 'One', caption: 'x', at: { a: [100, 100], b: [100, 500] } },
      { title: 'Two', caption: 'x', at: { b: [120, 300], late: [600, 500] }, broken: ['a'] },
      { title: 'Three', caption: 'x', at: {}, gone: ['b'] },
      { title: 'Four', caption: 'x', at: { b: [130, 320] } },
    ],
  };
  const ids = (p: number) => unitsAtPhase(map, p).map((f) => `${f.unit.id}@${f.pos.join(',')}${f.broken ? '!' : ''}`);

  it('apply placements, breaks and departures cumulatively', () => {
    expect(ids(0)).toEqual(['a@100,100', 'b@100,500']);
    expect(ids(1)).toEqual(['a@100,100!', 'b@120,300', 'late@600,500']);
    expect(ids(2)).toEqual(['a@100,100!', 'late@600,500']);
  });

  it('bring a gone unit back when a later phase places it', () => {
    expect(ids(3)).toEqual(['a@100,100!', 'b@130,320', 'late@600,500']);
  });

  it('keep hidden units where they will appear or where they left', () => {
    const f0 = unitFrames(map, 0).find((f) => f.unit.id === 'late')!;
    expect(f0).toMatchObject({ visible: false, pos: [600, 500] });
    const f2 = unitFrames(map, 2).find((f) => f.unit.id === 'b')!;
    expect(f2).toMatchObject({ visible: false, pos: [120, 300] });
  });
});

describe('navigation', () => {
  it('steps through the map phases before moving on, and back', () => {
    let p = { slide: 0, phase: 0 };
    const seen: string[] = [];
    for (let n: typeof p | null = p; n; n = nextPos(n, 3)) seen.push(`${n.slide}.${n.phase}`);
    expect(seen).toEqual(['0.0', '1.0', '1.1', '1.2', '2.0']);
    p = { slide: 2, phase: 0 };
    const back: string[] = [];
    for (let n: typeof p | null = p; n; n = prevPos(n, 3)) back.push(`${n.slide}.${n.phase}`);
    expect(back).toEqual(['2.0', '1.2', '1.1', '1.0', '0.0']);
  });
});

describe('rendering', () => {
  const sc = scenarioById('007')!;

  it('shows each slide with its text', () => {
    const h = histories.get('007')!;
    const html = (slide: number, phase = 0) =>
      renderToStaticMarkup(createElement(HistorySlides, { h, scenario: sc, pos: { slide, phase }, onPos: () => {} }));
    const s1 = html(0);
    for (const t of SLIDE_TITLES) expect(s1).toContain(t.replace('&', '&amp;'));
    expect(s1).toContain(h.context.war);
    expect(s1).toContain(h.sides.top.name);
    expect(s1).toContain(h.sides.bottom.strength);
    const s2 = html(1, 2);
    expect(s2).toContain(h.map.phases[2].caption);
    expect(s2).toContain('phase 3 of 4');
    const s3 = html(2);
    expect(s3).toContain(h.outcome.result);
    expect(s3).toContain(h.sources[0]);
    expect(s3).toContain('Done');
  });

  it('draws every visible unit of a phase, and mirrors a flipped map', () => {
    for (const [id, h] of histories) {
      const colors = sideColors(scenarioById(id)!);
      h.map.phases.forEach((_, i) => {
        const html = renderToStaticMarkup(createElement(BattleMap, { map: h.map, phase: i, colors }));
        const drawn = (html.match(/data-unit="/g) ?? []).length;
        const hidden = (html.match(/hm-unit[^"]*is-hidden/g) ?? []).length;
        expect(drawn - hidden, `${id} phase ${i + 1}`).toBe(unitsAtPhase(h.map, i).length);
      });
    }
    const h = histories.get('007')!;
    const colors = sideColors(sc);
    const [x, y] = h.map.phases[0].at.numid;
    const plain = renderToStaticMarkup(createElement(BattleMap, { map: h.map, phase: 0, colors }));
    const flipped = renderToStaticMarkup(createElement(BattleMap, { map: h.map, phase: 0, colors, flipped: true }));
    expect(plain).toContain(`translate(${x}px, ${y}px)`);
    expect(flipped).toContain(`translate(${MAP_W - x}px, ${MAP_H - y}px)`);
  });

  it('offers the History button only for a battle with a history', () => {
    expect(renderToStaticMarkup(createElement(HistoryButton, { scenario: sc }))).toContain('History');
    const none = { ...sc, id: '999' };
    expect(renderToStaticMarkup(createElement(HistoryButton, { scenario: none }))).toBe('');
  });
});
