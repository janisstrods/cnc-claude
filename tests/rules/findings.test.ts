// QA findings: tests that document engine behaviour deviating from the rules.
// Every test here is EXPECTED TO FAIL against the current engine (each one is a reported finding).
import { beforeEach, describe, expect, it } from 'vitest';
import { pieceMoves } from '../../src/engine';
import { H, build, forceDice, forcedDiceLeft, must, n, play, toBattle, u } from './helpers';

beforeEach(() => forceDice([]));

describe('F1 pass-through ignores stopping terrain', () => {
  // §7: "forest, marsh, fordable river: stop on entry (all units ...)"; light foot may pass through (not end on)
  // friendly units. Passing through a friendly unit standing in a forest means entering the forest -> must stop,
  // but it may not stop on a friendly unit, so it cannot pass.
  it('light infantry cannot pass through a friendly unit that stands in a forest', () => {
    const s = build({
      units: [
        { side: 'bottom', type: 'LI', at: [6, 6] }, { side: 'bottom', type: 'MI', at: [5, 5] }, { side: 'bottom', type: 'MI', at: [5, 6] },
      ],
      terrain: [{ at: [5, 5], t: 'forest' }, { at: [5, 6], t: 'forest' }],
    });
    const d = play(s, 'orderLight', ['u1']);
    expect(pieceMoves(d.state, 'u1').map((m) => m.hex)).not.toContain(H(4, 6));
  });
  it('light infantry cannot pass through a friendly unit in a marsh without stopping (Move-Fire-Move)', () => {
    const s = build({
      units: [
        { side: 'bottom', type: 'LS', at: [6, 6] }, { side: 'bottom', type: 'MI', at: [5, 5] }, { side: 'bottom', type: 'MI', at: [5, 6] },
      ],
      terrain: [{ at: [5, 5], t: 'marsh' }, { at: [5, 6], t: 'marsh' }],
    });
    const d = play(s, 'moveFireMove', ['u1']);
    expect(pieceMoves(d.state, 'u1').map((m) => m.hex)).not.toContain(H(4, 6));
  });
});

describe('F2 second leader casualty check in the same combat sequence', () => {
  // §11: "Casualty check when the attached unit loses blocks but survives: 2 dice ... Only once per combat sequence."
  // Official FAQ (Leader, case 7): hits -> 2-dice check survived; the unit then cannot complete its retreat and is
  // eliminated -> "the leader must evade ... Another leader casualty check is not required".
  it('blocked retreat eliminates the unit after a survived check: the leader just evades (no 1-die check)', () => {
    const s = build({
      units: [
        { side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 2 },
        { side: 'bottom', type: 'MI', at: [3, 5] }, { side: 'bottom', type: 'MI', at: [3, 6] },
      ],
      leaders: [{ side: 'top', at: [4, 6] }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    // attack: 1 hit + 1 flag; leader check: no helmets; then a helmet that must NOT be used as a 2nd check
    forceDice(['medium', 'flag', 'light', 'light', 'light', 'light', 'light', 'leader']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'ignoreFlags', count: 0 });
    expect(u(d, 'u2')).toBeUndefined();
    expect(d.state.leaders).toHaveLength(1);
    expect(forcedDiceLeft()).toBe(1);
    expect(d.pending?.kind).toBe('leaderEvade');
  });
  it('same after a marsh check during the retreat eliminates the unit', () => {
    const s = build({
      units: [
        { side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 2 },
        { side: 'bottom', type: 'MI', at: [3, 6] },
      ],
      leaders: [{ side: 'top', at: [4, 6] }],
      terrain: [{ at: [3, 5], t: 'marsh' }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['medium', 'flag', 'light', 'light', 'light', 'light', 'light', 'medium', 'leader']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'ignoreFlags', count: 0 });
    expect(u(d, 'u2')).toBeUndefined();
    expect(d.state.leaders).toHaveLength(1);
    expect(forcedDiceLeft()).toBe(1);
  });
});

describe('F3 momentum out of a ford/marsh the unit only entered by momentum advance', () => {
  // §9.6: "A unit in a fordable river or marsh may advance out only if it did not move this turn."
  // Official (fordable river): "A unit that starts the turn on a fordable river hex and makes a successful Close Combat,
  // may make a Momentum Advance out". Official (marsh): "A unit on a marsh hex that has not already moved this turn".
  it('cavalry that advanced into a ford and wins its bonus combat may not advance out of the ford', () => {
    const s = build({
      units: [
        { side: 'bottom', type: 'HC', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 },
        { side: 'top', type: 'MI', at: [3, 6], blocks: 1 },
      ],
      terrain: [{ at: [4, 6], t: 'river', ford: true }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['medium', 'light']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'yesno', yes: true });
    expect(d.pending).toMatchObject({ kind: 'bonusCombat' });
    forceDice(['medium', 'light']);
    must(d, { kind: 'hex', hex: H(3, 6) });
    expect(u(d, 'u3')).toBeUndefined();
    expect(d.pending?.kind).not.toBe('momentum');
  });
  it('cavalry that advanced into a marsh and wins its bonus combat may not advance out of the marsh', () => {
    const s = build({
      units: [
        { side: 'bottom', type: 'HC', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 },
        { side: 'top', type: 'MI', at: [3, 6], blocks: 1 },
      ],
      terrain: [{ at: [4, 6], t: 'marsh' }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['medium', 'light', 'light']); // attack (2) + marsh check
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'yesno', yes: true });
    expect(d.pending).toMatchObject({ kind: 'bonusCombat' });
    forceDice(['medium', 'light']);
    must(d, { kind: 'hex', hex: H(3, 6) });
    expect(u(d, 'u3')).toBeUndefined();
    expect(d.pending?.kind).not.toBe('momentum');
  });
});

describe('F4 elephant retreat losses on both sides at once cannot produce a draw', () => {
  // Official (Retreat, play note): "When an elephant's retreat path is blocked by units from both sides, remove all
  // retreat losses at the same time ... If both sides gain a final Victory Banner as a result of these losses, the battle
  // ends in a draw." (rules-reference is silent; GameState.winner allows 'draw').
  it('both blockers eliminated, both sides reach the banner count -> draw', () => {
    const s = build({
      banners: 1,
      units: [
        { side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'EL', at: [4, 6] },
        { side: 'top', type: 'MI', at: [3, 5], blocks: 1 }, { side: 'bottom', type: 'MI', at: [3, 6], blocks: 1 },
      ],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['flag', ...n('light', 4), ...n('light', 6), ...n('light', 5)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    // engine: the first blocker processed gives 'top' the win and the second loss is never applied
    expect({ winner: d.state.winner, topBlocker: !!u(d, 'u3'), bottomBlocker: !!u(d, 'u4') })
      .toEqual({ winner: 'draw', topBlocker: false, bottomBlocker: false });
  });
});

describe('F5 elephant retreat onto a lone friendly leader while it already has an attached leader', () => {
  // §10: "Lone friendly leader hex: the unit stops there and the leader attaches (only if the unit has no attached
  // leader)." Official (Leader Movement): "Only one leader may occupy a hex".
  it('never leaves two leaders in one hex', () => {
    const s = build({
      units: [
        { side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'EL', at: [4, 6] },
        { side: 'top', type: 'MI', at: [3, 6] }, { side: 'top', type: 'MI', at: [2, 6] },
      ],
      leaders: [{ side: 'top', at: [4, 6] }, { side: 'top', at: [2, 5] }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['flag', 'flag', ...n('light', 3), ...n('light', 4), ...n('light', 5)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    const hexes = d.state.leaders.map((l) => l.hex).filter((h) => h >= 0);
    expect(new Set(hexes).size).toBe(hexes.length);
  });
});

describe('F6 Baecula camp banner when a unit only passes through the camp by momentum', () => {
  // §14: "a Roman unit ending its move on a Carthaginian camp hex gains 1 banner". Official FAQ (Baecula): "Move onto
  // camp hex and stop in the hex will gain Roman player a banner. You don't gain a victory banner if your Roman unit moves
  // through the hex."
  it('cavalry advancing into a camp and taking its extra hex out of it gains no camp banner', () => {
    const s = build({
      rules: ['campCapture'], campCapture: { side: 'bottom' }, terrain: [{ at: [4, 6], t: 'camp' }],
      units: [{ side: 'bottom', type: 'HC', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['medium', 'light', 'light', 'light']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'yesno', yes: true });
    must(d, { kind: 'hex', hex: H(3, 6) });
    expect(u(d, 'u1')!.hex).toBe(H(3, 6));
    expect(d.state.players.bottom.banners).toBe(1); // only the eliminated unit
  });
});

describe('F7 a zero-dice attack still forces a lone leader to evade', () => {
  // §4: dice = min(base, caps) - campPenalty + cardBonus; a unit with 0 dice rolls nothing. §11: "Lone leader attacked
  // (ranged or CC): attacker's normal dice; 1 helmet kills; else he must evade." With 0 dice there is no attack roll.
  it('ranged: a bow unit that moved onto a camp (1-1 = 0 dice) does not make a lone leader evade', () => {
    const s = build({
      terrain: [{ at: [4, 3], t: 'camp' }],
      units: [{ side: 'bottom', type: 'LB', at: [4, 2] }],
      leaders: [{ side: 'top', at: [4, 5] }],
    });
    const d = play(s, 'orderLight', ['u1']);
    must(d, { kind: 'move', piece: 'u1', to: H(4, 3) });
    if (d.pending?.kind === 'battle' && d.answer({ kind: 'attack', unit: 'u1', target: H(4, 5) })) {
      expect(d.pending?.kind).not.toBe('leaderEvade');
      expect(d.state.leaders[0].hex).toBe(H(4, 5));
    }
  });
  it('close: an elephant on a camp (1-1 = 0 dice) kills a trapped lone leader without rolling', () => {
    const s = build({
      terrain: [{ at: [5, 6], t: 'camp' }, { at: [3, 5], t: 'lake' }, { at: [3, 6], t: 'lake' }],
      units: [{ side: 'bottom', type: 'EL', at: [5, 6] }],
      leaders: [{ side: 'top', at: [4, 6] }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['leader', 'leader']);
    if (d.answer({ kind: 'attack', unit: 'u1', target: H(4, 6) })) {
      expect(d.state.leaders).toHaveLength(1);
      expect(d.state.players.bottom.banners).toBe(0);
    }
  });
});
