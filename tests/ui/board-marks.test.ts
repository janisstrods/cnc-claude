// The board's marks (uiModel `boardMarks`) follow the selection alone: the hovered hex changes only the path preview, which
// `pathAt` gives as `boardUi` does with that hex hovered. The game screen relies on it to keep the marks (and the unit
// layer they feed) while the pointer moves over the board.
import { describe, expect, it } from 'vitest';
import { ALL_HEXES, createGame, hexId, type Decision, type GameState, type HexId, type RetreatOption, type Side } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { boardMarks, boardUi, selectionDeps, type UiSel } from '../../src/ui/game/uiModel';
import { H, build, play, toBattle, type Pos } from '../rules/helpers';

const SEL: UiSel = { selCard: null, hoverCard: null, orderSel: [], selPiece: null, hoverHex: null };

/**
 * `boardMarks` against `boardUi` with no hex and then every hex hovered: the same marks each time, and `pathAt` the same
 * path preview. Returns how many hovers preview a path, so a case can check that it previews any.
 */
function agreesForEveryHover(s: GameState, d: Decision | null, ui: UiSel, human: Side): number {
  const { pathAt, ...marks } = boardMarks(s, d, ui, human);
  let previews = 0;
  for (const hover of [null, ...ALL_HEXES] as (HexId | null)[]) {
    const { pathPreview, ...rest } = boardUi(s, d, { ...ui, hoverHex: hover }, human);
    expect(rest, `hover ${hover}`).toEqual(marks);
    expect(pathAt(hover), `hover ${hover}`).toEqual(pathPreview);
    if (pathPreview) previews++;
  }
  return previews;
}

describe('board marks and the hovered hex', () => {
  it('a move: the path to each hex the selected unit may reach', () => {
    const pos: Pos = { first: 'top', units: [{ side: 'top', type: 'MI', at: [2, 6] }, { side: 'bottom', type: 'MI', at: [6, 5] }] };
    const d = play(build(pos), 'order3C', ['u1']);
    expect(d.pending).toMatchObject({ kind: 'move', side: 'top' });
    expect(agreesForEveryHover(d.state, d.pending, { ...SEL, selPiece: 'u1' }, 'top')).toBeGreaterThan(0);
    expect(agreesForEveryHover(d.state, d.pending, SEL, 'top')).toBe(0);
  });

  it('Rolling Fire (210): the path so far, on to a hovered hex the logs may roll on to', () => {
    const pos: Pos = {
      rollingFire: 'top', first: 'top', topArmy: 'Slave', bottomArmy: 'Roman',
      terrain: [{ at: [2, 6], t: 'hill' }],
      units: [{ side: 'top', type: 'MI', at: [2, 6] }, { side: 'bottom', type: 'MI', at: [4, 5] }],
    };
    const d = toBattle(build(pos), 'order3C', ['u1']);
    expect(agreesForEveryHover(d.state, d.pending, { ...SEL, selPiece: 'u1', rollPath: [H(3, 5)] }, 'top')).toBe(ALL_HEXES.length + 1);
  });

  it('a retreat: the path of the option ending on the hovered hex', () => {
    const s = createGame(scenarioById('214').setup, 1);
    const slave = s.units.find((u) => u.side === 'top')!;
    const opt = (path: HexId[], losses = 0): RetreatOption => ({ path, end: path[path.length - 1], losses, attachLeader: null });
    const dec: Decision = {
      kind: 'retreat', side: 'top', unit: slave.id, reason: 'retreat',
      options: [opt([hexId(1, 4), hexId(0, 4)], 1), opt([hexId(1, 5)])],
    };
    expect(agreesForEveryHover(s, dec, SEL, 'top')).toBe(2);
  });

  it('the selection the marks depend on is every field but the hovered hex', () => {
    const full: Required<UiSel> = { selCard: 1, hoverCard: 2, orderSel: ['u1'], selPiece: 'u1', hoverHex: 3, rollPath: [4], diceIds: ['u2'], diceActive: 0 };
    expect(selectionDeps({ ...full, hoverHex: 9 })).toEqual(selectionDeps(full));
    for (const k of Object.keys(full) as (keyof UiSel)[]) {
      if (k !== 'hoverHex') expect(selectionDeps({ ...full, [k]: null }), k).not.toEqual(selectionDeps(full));
    }
  });
});
