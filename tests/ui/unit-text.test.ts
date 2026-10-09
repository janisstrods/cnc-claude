// Unit tooltip and rules-reference lines: generated from the unit table, identical to the hand-written base-game text.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ELITES, UNIT_STATS, UNIT_TYPES, type Unit, type UnitStats, type UnitType } from '../../src/engine';
import { unitCardLines, unitSummary } from '../../src/ui/game/uiModel';
import { Units } from '../../src/ui/screens/RulesReference';

const unit = (t: UnitType, extra: Partial<Unit> = {}): Unit =>
  ({ id: 'u1', side: 'top', type: t, hex: 0, blocks: UNIT_STATS[t].blocks, maxBlocks: UNIT_STATS[t].blocks, ...extra }) as Unit;

/** Base-game tooltip lines, captured from the hand-written text before it was generated from the table. */
const TOOLTIP: Record<UnitType, string[]> = {
  LI: ['Move 2 · Retreat 2/flag', 'Close combat 2 dice, swords miss', 'Missiles: range 2, 2 dice (1 after moving)', 'Can evade'],
  LB: ['Move 2 · Retreat 2/flag', 'Close combat 2 dice, swords miss', 'Missiles: range 3, 2 dice (1 after moving)', 'Can evade'],
  LS: ['Move 2 · Retreat 2/flag', 'Close combat 2 dice, swords miss', 'Missiles: range 3, 2 dice (1 after moving)', 'Can evade'],
  AX: ['Move 1, or 2 without battle · Retreat 1/flag', 'Close combat 3 dice', 'Missiles: range 2, 2 dice (1 after moving)', 'Cannot evade'],
  WA: ['Move 1 (2 to charge) · Retreat 2/flag', 'Close combat 3 dice (+1 at full strength)', 'Cannot evade'],
  MI: ['Move 1 · Retreat 1/flag', 'Close combat 4 dice', 'Cannot evade'],
  HI: ['Move 1 · Retreat 1/flag', 'Close combat 5 dice', 'Cannot evade'],
  LC: ['Move 4 · Retreat 4/flag', 'Close combat 2 dice, swords miss', 'Missiles: range 2, 2 dice (1 after moving)', 'Can evade'],
  MC: ['Move 3 · Retreat 3/flag', 'Close combat 3 dice', 'Can evade foot & heavy mounted'],
  HC: ['Move 2 · Retreat 2/flag', 'Close combat 4 dice', 'Can evade foot & elephants'],
  EL: [
    'Move 2 · Retreat 1/flag',
    'Close combat: same dice as the enemy unit (3 vs elephants, warriors, chariots)',
    'Cannot evade',
    'Ignores sword hits · rampages when it retreats',
  ],
  HCH: ['Move 2 · Retreat 2/flag', 'Close combat 4 (3 battling back) dice', 'Can evade foot & elephants', 'Ignores 1 sword hit'],
};

/** Base-game rules-reference unit cards (stats line, notes line), captured the same way. */
const REFERENCE: Record<UnitType, [string, string]> = {
  LI: ['4 blocks · move 2 · close combat 2 · range 2 · retreat 2', 'Evades any attack. Swords do not score hits.'],
  LB: ['4 blocks · move 2 · close combat 2 · range 3 · retreat 2', 'Evades any attack. Swords do not score hits.'],
  LS: ['4 blocks · move 2 · close combat 2 · range 3 · retreat 2', 'Evades any attack. Swords do not score hits.'],
  AX: ['4 blocks · move 1 (2 without battle) · close combat 3 · range 2 · retreat 1', 'Cannot evade.'],
  WA: ['4 blocks · move 1 (2 to charge) · close combat 3 · retreat 2', 'Cannot evade. +1 die and ignores a flag at full strength.'],
  MI: ['4 blocks · move 1 · close combat 4 · retreat 1', 'Cannot evade.'],
  HI: ['4 blocks · move 1 · close combat 5 · retreat 1', 'Cannot evade.'],
  LC: ['3 blocks · move 4 · close combat 2 · range 2 · retreat 4', 'Evades any attack. Swords do not score hits.'],
  MC: ['3 blocks · move 3 · close combat 3 · retreat 3', 'Evades foot and heavy mounted.'],
  HC: ['3 blocks · move 2 · close combat 4 · retreat 2', 'Evades foot and elephants.'],
  EL: [
    '2 blocks · move 2 · close combat as enemy · retreat 1',
    'Cannot evade. Ignores swords, re-rolls its own swords, frightens horses, rampages on retreat.',
  ],
  HCH: ['2 blocks · move 2 · close combat 4/3 back · retreat 2', 'Evades foot and elephants. Ignores one sword hit.'],
};

describe('unit tooltip (unitSummary)', () => {
  it('base-game types keep their hand-written lines', () => {
    for (const t of UNIT_TYPES) expect(unitSummary(unit(t)), t).toEqual(TOOLTIP[t]);
  });

  it('the Sacred Band lists its elite abilities', () => {
    expect(unitSummary(unit('HI', { elite: 'carthSacredBand' }))).toEqual([
      'Move 1 · Retreat 1/flag',
      'Close combat 5 dice',
      'Cannot evade',
      'Sacred Band: helmets always hit, ignores 1 flag',
    ]);
  });

  it('words every elite ability generically, and shows the elite range', () => {
    const saved = ELITES.bowAuxilia;
    ELITES.bowAuxilia = { id: 'bowAuxilia', name: 'Test Elite', abilities: ['ignoreSword', 'ranged'], range: 3, types: ['AX'] };
    try {
      expect(unitSummary(unit('AX', { elite: 'bowAuxilia' }))).toEqual([
        'Move 1, or 2 without battle · Retreat 1/flag',
        'Close combat 3 dice',
        'Missiles: range 3, 2 dice (1 after moving)',
        'Cannot evade',
        'Test Elite: ignores 1 sword hit, missile fire (range 3)',
      ]);
    } finally {
      if (saved) ELITES.bowAuxilia = saved;
      else delete ELITES.bowAuxilia;
    }
  });
});

/** Run `fn` with the stats row of `t` temporarily replaced by a patched copy (no extra row stays in UNIT_STATS). */
function withStats<T>(t: UnitType, patch: Partial<UnitStats>, fn: () => T): T {
  const saved = UNIT_STATS[t];
  UNIT_STATS[t] = { ...saved, ...patch };
  try {
    return fn();
  } finally {
    UNIT_STATS[t] = saved;
  }
}

describe('generated missile and move text for rows the base game lacks', () => {
  // A synthetic heavy war machine: move 1 but no battle after moving, range 6, no fire after moving.
  const HWM: Partial<UnitStats> = { move: 1, moveBattle: 0, range: 6, noFireAfterMove: 1 };

  it('a unit that cannot fire after moving says so, and a no-battle move is spelled out', () => {
    withStats('LB', HWM, () => {
      expect(unitSummary(unit('LB'))).toEqual([
        'Move 1, no battle after moving · Retreat 2/flag',
        'Close combat 2 dice, swords miss',
        'Missiles: range 6, 2 dice (not after moving)',
        'Can evade',
      ]);
      expect(unitCardLines('LB')[0]).toBe('4 blocks · move 1 (no battle after moving) · close combat 2 · range 6 · retreat 2');
    });
  });

  it('either field alone selects the wording, and the base-game rows are unchanged afterwards', () => {
    withStats('LB', { noFireAfterMove: 1 }, () => expect(unitSummary(unit('LB'))[2]).toBe('Missiles: range 3, 2 dice (not after moving)'));
    withStats('LB', { moveBattle: 0 }, () => expect(unitSummary(unit('LB'))[2]).toBe('Missiles: range 3, 2 dice (not after moving)'));
    withStats('LB', { noFireAfterMove: 2 }, () => expect(unitSummary(unit('LB'))[2]).toBe('Missiles: range 3, 2 dice (1 after moving)'));
    expect(unitSummary(unit('LB'))).toEqual(TOOLTIP.LB);
  });
});

describe('rules reference unit cards', () => {
  it('base-game types keep their hand-written lines', () => {
    const html = renderToStaticMarkup(createElement(Units));
    const lines = [...html.matchAll(/<div class="unit-card-line(?: muted)?">([\s\S]*?)<\/div>/g)].map((m) => m[1].replace(/<[^>]*>/g, ''));
    const cards = UNIT_TYPES.map((t, i) => [t, lines[2 * i], lines[2 * i + 1]]);
    expect(lines).toHaveLength(2 * UNIT_TYPES.length);
    expect(cards).toEqual(UNIT_TYPES.map((t) => [t, ...REFERENCE[t]]));
  });
});
