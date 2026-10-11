// Unit tooltip and rules-reference lines: generated from the unit table, identical to the hand-written base-game text.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ELITES, UNIT_STATS, UNIT_TYPES, type Leader, type LeaderTrait, type Unit, type UnitStats, type UnitType } from '../../src/engine';
import { leaderTraitLines, unitCardLines, unitSummary } from '../../src/ui/game/unitText';
import { Expansion, Expansion2, RulesReference, Units, elitesOf, unitTypesOf } from '../../src/ui/screens/RulesReference';

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
  // Expansion #1 (§15): generated from the same table.
  LBC: ['Move 4 · Retreat 4/flag', 'Close combat 2 dice, swords miss', 'Missiles: range 3, 2 dice (1 after moving)', 'Can evade'],
  CAM: [
    'Move 3 · Retreat 3/flag',
    'Close combat 3 (2 battling back) dice',
    'Can evade foot & heavy mounted',
    'Ignores 1 blue-triangle hit when cavalry or chariots roll against it · frightens horses (+1 retreat hex per flag)',
  ],
  HWM: [
    'Move 1, no battle after moving · Retreat 1/flag',
    'Close combat 2 dice, swords miss',
    'Missiles: range 6, 2 dice (not after moving)',
    'Can evade',
    'Abandoned after evading (no banner) · no momentum advance · cannot enter broken ground or marsh',
  ],
  // Expansion #2 (§18)
  BCH: ['Move 3 · Retreat 3/flag', 'Close combat 2 dice (+1 at full strength)', 'Can evade', 'Ignores 1 sword hit'],
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
  LBC: ['3 blocks · move 4 · close combat 2 · range 3 · retreat 4', 'Evades any attack. Swords do not score hits.'],
  CAM: [
    '3 blocks · move 3 · close combat 3/2 back · retreat 3',
    'Evades foot and heavy mounted. Ignores 1 blue-triangle hit when cavalry or chariots roll against it, frightens horses.',
  ],
  HWM: [
    '2 blocks · move 1 (no battle after moving) · close combat 2 · range 6 · retreat 1',
    'Evades any attack. Swords do not score hits. Abandoned after evading (no banner), no momentum advance, cannot enter broken ground or marsh.',
  ],
  BCH: ['3 blocks · move 3 · close combat 2 · retreat 3', 'Evades any attack. +1 die and ignores a flag at full strength. Ignores one sword hit.'],
};

describe('unit tooltip (unitSummary)', () => {
  it('base-game types keep their hand-written lines; Expansion #1 types are generated the same way', () => {
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
    ELITES.bowAuxilia = { ...saved, name: 'Test Elite', abilities: ['ignoreSword', 'ranged'] };
    try {
      expect(unitSummary(unit('AX', { elite: 'bowAuxilia' }))).toEqual([
        'Move 1, or 2 without battle · Retreat 1/flag',
        'Close combat 3 dice',
        'Missiles: range 3, 2 dice (1 after moving)',
        'Cannot evade',
        'Test Elite: ignores 1 sword hit, missile fire (range 3)',
      ]);
    } finally {
      ELITES.bowAuxilia = saved;
    }
  });

  it('names every Expansion #1 elite preset and its abilities', () => {
    expect(unitSummary(unit('MI', { elite: 'thebanSacredBand' })).at(-1)).toBe('Theban Sacred Band: helmets always hit, ignores 1 flag');
    expect(unitSummary(unit('HI', { elite: 'silverShields' })).at(-1)).toBe('Silver Shields: helmets always hit, ignores 1 flag');
    expect(unitSummary(unit('MC', { elite: 'companions' })).at(-1)).toBe('Companions: ignores 1 sword hit, ignores 1 flag');
    expect(unitSummary(unit('MI', { elite: 'immortals' }))).toEqual([
      'Move 1 · Retreat 1/flag',
      'Close combat 4 dice',
      'Missiles: range 3, 2 dice (1 after moving)',
      'Cannot evade',
      'Immortals: missile fire (range 3)',
    ]);
    expect(unitSummary(unit('AX', { elite: 'bowAuxilia' }))).toEqual([
      'Move 1, or 2 without battle · Retreat 1/flag',
      'Close combat 3 dice',
      'Missiles: range 3, 2 dice (1 after moving)',
      'Cannot evade',
      'Bow-armed auxilia: missile fire (range 3)',
    ]);
  });
});

describe('leader tooltip (leaderTraitLines)', () => {
  const leader = (traits?: LeaderTrait[]): Leader => ({ id: 'L1', side: 'top', name: 'X', hex: 0, ...(traits ? { traits } : {}) });
  it('lists the leader traits; an ordinary leader has none', () => {
    expect(leaderTraitLines(leader())).toEqual([]);
    expect(leaderTraitLines(leader(['ccBonus']))).toEqual(['+1 close combat die to his unit']);
    expect(leaderTraitLines(leader(['attachedOnly']))).toEqual(['Satrap: commands only his own unit; his helmets help only that unit']);
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

describe('generated hit/flag-ignore text versus cavalry and chariots', () => {
  it('words any hit and the flag ignore; elephants keep their base-game wording', () => {
    withStats('MC', { vsMountedIgnoreHit: 'any', vsMountedIgnoreFlag: true }, () => {
      expect(unitSummary(unit('MC')).at(-1)).toBe('Ignores 1 hit and 1 flag when cavalry or chariots roll against it');
    });
    withStats('MC', { vsMountedIgnoreFlag: true }, () => {
      expect(unitSummary(unit('MC')).at(-1)).toBe('Ignores 1 flag when cavalry or chariots roll against it');
    });
    expect(unitSummary(unit('EL'))).toEqual(TOOLTIP.EL);
  });
});

describe('rules reference unit cards', () => {
  /** [stats, notes] pairs of the unit cards a component renders. */
  const cardsOf = (c: () => JSX.Element) => {
    const html = renderToStaticMarkup(createElement(c));
    const lines = [...html.matchAll(/<div class="unit-card-line(?: muted)?">([\s\S]*?)<\/div>/g)].map((m) => m[1].replace(/<[^>]*>/g, ''));
    return Array.from({ length: lines.length / 2 }, (_, i) => [lines[2 * i], lines[2 * i + 1]]);
  };

  it('the tabs: the general ones, then one per expansion of the box table, under its name; the first is open', () => {
    const html = renderToStaticMarkup(createElement(RulesReference));
    const tabs = [...html.matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map((m) => m[1]);
    expect(tabs).toEqual(['How to play', 'Units', 'Combat', 'Terrain', 'Command cards', 'Expansion #1', 'Expansion #2', 'Expansion #3']);
    expect(html).toContain('<button class="active">How to play</button>');
  });

  it('the Units tab keeps the base-game types and their hand-written lines', () => {
    const base = unitTypesOf(0);
    expect(base).toEqual(['LI', 'LB', 'LS', 'AX', 'WA', 'MI', 'HI', 'LC', 'MC', 'HC', 'EL', 'HCH']);
    expect(cardsOf(Units)).toEqual(base.map((t) => REFERENCE[t]));
  });

  it('the Expansion #1 tab shows the three new types, generated the same way', () => {
    expect(unitTypesOf(1)).toEqual(['LBC', 'CAM', 'HWM']);
    expect(cardsOf(Expansion)).toEqual(unitTypesOf(1).map((t) => REFERENCE[t]));
  });

  it('Expansion #2 types (the Barbarian light chariot) have generated cards in the Expansion #2 tab, not in the base Units tab', () => {
    expect(unitTypesOf(2)).toEqual(['BCH']);
    for (const t of unitTypesOf(2)) expect(unitCardLines(t), t).toEqual(REFERENCE[t]);
    expect(cardsOf(Expansion2)).toEqual(unitTypesOf(2).map((t) => REFERENCE[t]));
    // Expansion #3 brings no unit type (its tab has no unit cards)
    expect([...unitTypesOf(0), ...unitTypesOf(1), ...unitTypesOf(2)]).toEqual(UNIT_TYPES);
  });

  it('the Expansion #1 tab lists every Expansion #1 elite preset and both leader traits; the Tenth Legion is in the Expansion #2 tab', () => {
    const text = renderToStaticMarkup(createElement(Expansion)).replace(/<[^>]*>/g, ' ');
    expect(elitesOf(1)).toEqual(['carthSacredBand', 'thebanSacredBand', 'silverShields', 'companions', 'immortals', 'bowAuxilia']);
    expect(elitesOf(2)).toEqual(['tenthLegion']);
    // every preset is listed in exactly one expansion tab (Expansion #3's has no elite table)
    expect([...elitesOf(1), ...elitesOf(2)].sort()).toEqual(Object.keys(ELITES).sort());
    for (const e of Object.values(ELITES)) {
      if (elitesOf(2).includes(e.id)) expect(text, e.id).not.toContain(e.name);
      else expect(text, e.id).toContain(e.name);
    }
    // the battles that field each preset, from the scenario data
    const battles = ['Heavy Infantry · 002 (base game)', 'Medium Infantry · 104', 'Heavy Infantry · 113, 114', 'Medium Cavalry · 107–111', 'Medium Infantry · 108', 'Auxilia · 123'];
    for (const b of battles) expect(text).toContain(b);
    const exp2 = renderToStaticMarkup(createElement(Expansion2)).replace(/<[^>]*>/g, ' ');
    for (const id of elitesOf(2)) expect(exp2, id).toContain(ELITES[id].name);
    expect(exp2).toContain('Heavy Infantry · 215, 217');
    expect(text).toContain('Alexander');
    expect(text).toContain('satrap');
    for (const t of ['Sea', 'Rampart', 'Ford, no dice limit', 'Tactical Flexibility', 'Hellespont', 'Asculum']) expect(text).toContain(t);
  });
});

describe('pilum and march wording (§18.2)', () => {
  it('a unit of a Marius legion has a 1-die missile line that stops after 2 hexes of movement', () => {
    expect(unitSummary(unit('MI', { legion: 'marius' }))).toEqual([
      'Move 1 · Retreat 1/flag',
      'Close combat 4 dice',
      'Missiles: range 2, 1 die (not after moving 2 hexes)',
      'Cannot evade',
    ]);
  });
  it('a Julian legion unit also marches: 1 hex and battle, or 2 without battle', () => {
    expect(unitSummary(unit('HI', { legion: 'julian' }))[0]).toBe('Move 1, or 2 without battle · Retreat 1/flag');
  });
  it('the Tenth Legion lists its pilum and its march', () => {
    expect(unitSummary(unit('HI', { elite: 'tenthLegion' }))).toEqual([
      'Move 1, or 2 without battle · Retreat 1/flag',
      'Close combat 5 dice',
      'Missiles: range 2, 1 die (not after moving 2 hexes)',
      'Cannot evade',
      'Tenth Legion: throws the pilum, marches 2 hexes without battle',
    ]);
  });
  it('units outside a legion keep their lines (the Immortals still roll 2, 1 after moving)', () => {
    expect(unitSummary(unit('MI'))).toEqual(TOOLTIP.MI);
    expect(unitSummary(unit('MI', { elite: 'immortals' }))[2]).toBe('Missiles: range 3, 2 dice (1 after moving)');
    expect(unitSummary(unit('MI', { elite: 'immortals', legion: 'marius' }))[2]).toBe('Missiles: range 3, 2 dice (1 after moving)');
  });
});

describe('Caesar and Spartacus wording (§18.3)', () => {
  const leader = (traits: LeaderTrait[]): Leader => ({ id: 'L1', side: 'bottom', name: 'X', hex: 0, traits });
  it('lists the forced march and the extra Spartacus dice next to the +1 die', () => {
    expect(leaderTraitLines(leader(['ccBonus', 'forcedMarch']))).toEqual(['+1 close combat die to his unit', 'his infantry unit may move 2 hexes and still battle']);
    expect(leaderTraitLines(leader(['spartacusDice']))).toEqual(['I Am Spartacus rolls 2 more dice']);
  });
});
