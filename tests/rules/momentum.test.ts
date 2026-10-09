// Momentum advance & bonus close combat (rules-reference §9.6).
import { beforeEach, describe, expect, it } from 'vitest';
import type { CardKind, DieFace, UnitType } from '../../src/engine';
import { H, build, combatDice, ev, forceDice, must, n, play, toBattle, u, type Pos } from './helpers';

beforeEach(() => forceDice([]));

/**
 * Bottom attacker u1 at (5,6) (optionally with attached leader) eliminates a 1-block top MI (u2) at (4,6).
 * A second top MI (u3) stands at (3,6), adjacent to (4,6), as a bonus target.
 */
function win(atk: UnitType, opts: { leader?: boolean; extra?: Pos['units']; terrain?: Pos['terrain']; card?: CardKind; hit?: DieFace[] } = {}) {
  const s = build({
    units: [
      { side: 'bottom', type: atk, at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 },
      { side: 'top', type: 'MI', at: [3, 6] }, ...(opts.extra ?? []),
    ],
    leaders: opts.leader ? [{ side: 'bottom', at: [5, 6] }] : [],
    terrain: opts.terrain,
  });
  const d = play(s, opts.card ?? 'order4C', opts.card === 'clash' ? undefined : ['u1']);
  if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
  ev(d);
  forceDice(opts.hit ?? ['medium', ...n('light', 5)]);
  must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
  expect(u(d, 'u2')).toBeUndefined();
  return d;
}

describe('momentum advance', () => {
  it('after eliminating the defender the attacker may advance into the vacated hex', () => {
    const d = win('HI');
    expect(d.pending).toMatchObject({ kind: 'momentum', hex: H(4, 6) });
    must(d, { kind: 'yesno', yes: true });
    expect(u(d, 'u1')!.hex).toBe(H(4, 6));
  });
  it('after the defender retreats the attacker may advance', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['flag', ...n('light', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(d.pending).toMatchObject({ kind: 'momentum', hex: H(4, 6) });
  });
  it('foot unit without a leader: advance but no bonus combat', () => {
    const d = win('HI');
    must(d, { kind: 'yesno', yes: true });
    expect(d.pending?.kind).toBe('playCard');
  });
  it('declining the advance forfeits the bonus combat', () => {
    const d = win('HC');
    must(d, { kind: 'yesno', yes: false });
    expect(d.pending?.kind).toBe('playCard');
    expect(u(d, 'u1')!.hex).toBe(H(5, 6));
  });
  it('foot unit with an attached leader: bonus combat against any adjacent enemy', () => {
    const d = win('HI', { leader: true, extra: [{ side: 'top', type: 'MI', at: [4, 7] }] });
    must(d, { kind: 'yesno', yes: true });
    expect(d.state.leaders[0].hex).toBe(H(4, 6));
    expect(d.pending?.kind).toBe('bonusCombat');
    if (d.pending?.kind === 'bonusCombat') expect([...d.pending.targets].sort()).toEqual([H(3, 6), H(4, 7)].sort());
  });
  it('warriors: bonus combat without a leader', () => {
    const d = win('WA');
    must(d, { kind: 'yesno', yes: true });
    expect(d.pending).toMatchObject({ kind: 'bonusCombat', targets: [H(3, 6)] });
  });
  it('elephants and heavy chariots: bonus combat, but no cavalry extra hex', () => {
    for (const t of ['EL', 'HCH'] as UnitType[]) {
      const d = win(t, { hit: ['medium', ...n('light', 8)] });
      must(d, { kind: 'yesno', yes: true });
      expect([t, d.pending?.kind]).toEqual([t, 'bonusCombat']);
    }
  });
  it('cavalry (LC, MC, HC) may move 1 extra hex after the initial advance', () => {
    for (const t of ['LC', 'MC', 'HC'] as UnitType[]) {
      const d = win(t);
      must(d, { kind: 'yesno', yes: true });
      expect([t, d.pending?.kind]).toEqual([t, 'cavalryExtra']);
    }
  });
  it('the cavalry extra hex is optional; the bonus combat may follow from the advance hex', () => {
    const d = win('HC');
    must(d, { kind: 'yesno', yes: true });
    must(d, { kind: 'hex', hex: null });
    expect(d.pending).toMatchObject({ kind: 'bonusCombat', targets: [H(3, 6)] });
  });
  it('cavalry extra hex, bonus combat, then only an advance into the vacated hex (no extra hex, no 3rd battle)', () => {
    const d = win('HC', { extra: [{ side: 'top', type: 'MI', at: [2, 5], blocks: 1 }] });
    // move the u3 target out of the way: use the extra hex to (3,5), adjacent to (2,5) and (3,6)
    must(d, { kind: 'yesno', yes: true });
    must(d, { kind: 'hex', hex: H(3, 5) });
    expect(u(d, 'u1')!.hex).toBe(H(3, 5));
    expect(d.pending?.kind).toBe('bonusCombat');
    forceDice(['medium', ...n('light', 3)]);
    must(d, { kind: 'hex', hex: H(2, 5) });
    expect(u(d, 'u4')).toBeUndefined();
    expect(d.pending).toMatchObject({ kind: 'momentum', hex: H(2, 5) });
    must(d, { kind: 'yesno', yes: true });
    expect(u(d, 'u1')!.hex).toBe(H(2, 5));
    expect(d.pending?.kind).toBe('playCard');
  });
  it('the unit that battles back never advances', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice([...n('light', 5), 'flag', ...n('light', 3)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(d.pending?.kind).toBe('playCard');
    expect(u(d, 'u2')!.hex).toBe(H(4, 6));
  });
});

describe('terrain and momentum', () => {
  it('advancing into a forest: foot with leader may not bonus combat (HI), but LI with leader and WA may', () => {
    const forest: Pos['terrain'] = [{ at: [4, 6], t: 'forest' }];
    const hi = win('HI', { leader: true, terrain: forest, hit: ['medium', 'light'] });
    must(hi, { kind: 'yesno', yes: true });
    expect(hi.pending?.kind).toBe('playCard');
    const li = win('LI', { leader: true, terrain: forest, hit: ['medium', 'light'] });
    must(li, { kind: 'yesno', yes: true });
    expect(li.pending?.kind).toBe('bonusCombat');
    const wa = win('WA', { terrain: forest, hit: ['medium', 'light'] });
    must(wa, { kind: 'yesno', yes: true });
    expect(wa.pending?.kind).toBe('bonusCombat');
  });
  it('mounted unit advancing into a forest: no extra hex and no bonus combat', () => {
    const d = win('HC', { terrain: [{ at: [4, 6], t: 'forest' }], hit: ['medium', 'light'] });
    must(d, { kind: 'yesno', yes: true });
    expect(d.pending?.kind).toBe('playCard');
  });
  it('mounted unit advancing into broken ground: no extra hex and no bonus combat', () => {
    const d = win('HC', { terrain: [{ at: [4, 6], t: 'broken' }], hit: ['medium', 'light'] });
    must(d, { kind: 'yesno', yes: true });
    expect(d.pending?.kind).toBe('playCard');
  });
  it('foot advancing into broken ground keeps its bonus combat (warriors)', () => {
    const d = win('WA', { terrain: [{ at: [4, 6], t: 'broken' }], hit: ['medium', 'light'] });
    must(d, { kind: 'yesno', yes: true });
    expect(d.pending?.kind).toBe('bonusCombat');
  });
  it('cavalry advancing into a marsh or fordable river: the extra hex is lost (bonus still possible)', () => {
    const marsh = win('HC', { terrain: [{ at: [4, 6], t: 'marsh' }], hit: ['medium', 'light', 'light'] });
    must(marsh, { kind: 'yesno', yes: true });
    expect(marsh.pending?.kind).toBe('bonusCombat');
    const ford = win('HC', { terrain: [{ at: [4, 6], t: 'river', ford: true }], hit: ['medium', 'light'] });
    must(ford, { kind: 'yesno', yes: true });
    expect(ford.pending?.kind).toBe('bonusCombat');
  });
  it('the cavalry extra hex into a forest ends the possibility of bonus combat', () => {
    const d = win('HC', { terrain: [{ at: [3, 5], t: 'forest' }] });
    must(d, { kind: 'yesno', yes: true });
    must(d, { kind: 'hex', hex: H(3, 5) });
    expect(d.pending?.kind).toBe('playCard');
  });
  it('advancing into a marsh rolls the marsh check', () => {
    const d = win('HI', { terrain: [{ at: [4, 6], t: 'marsh' }], hit: ['medium', 'light', 'heavy'] });
    must(d, { kind: 'yesno', yes: true });
    expect(u(d, 'u1')!.blocks).toBe(3);
  });
  it('a unit that moved into a fordable river or marsh this turn may not advance out of it', () => {
    for (const t of [{ t: 'river' as const, ford: true }, { t: 'marsh' as const }]) {
      const s = build({
        units: [{ side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 }],
        terrain: [{ at: [5, 6], ...t }],
      });
      const d = play(s, 'order4C', ['u1']);
      forceDice(['light']); // marsh check (if any)
      must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
      if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
      forceDice(['medium', 'light']);
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      expect(u(d, 'u2')).toBeUndefined();
      expect([t.t, d.pending?.kind]).toEqual([t.t, 'playCard']);
    }
  });
  it('a unit that started the turn in a fordable river or marsh may advance out of it', () => {
    for (const t of [{ t: 'river' as const, ford: true }, { t: 'marsh' as const }]) {
      const d = win('MI', { terrain: [{ at: [5, 6], ...t }], hit: ['medium', 'light'] });
      expect([t.t, d.pending?.kind]).toEqual([t.t, 'momentum']);
    }
  });
  it('cavalry advancing out of a marsh gets no extra hex', () => {
    const d = win('HC', { terrain: [{ at: [5, 6], t: 'marsh' }], hit: ['medium', 'light'] });
    must(d, { kind: 'yesno', yes: true });
    expect(d.pending?.kind).toBe('bonusCombat');
  });
});

describe('bonus combat dice and card effects', () => {
  it('Mounted Charge +1 also applies to the bonus combat', () => {
    const d = win('HC', { card: 'mountedCharge', hit: ['medium', ...n('light', 4)] });
    must(d, { kind: 'yesno', yes: true });
    must(d, { kind: 'hex', hex: null });
    ev(d);
    forceDice(n('light', 10));
    must(d, { kind: 'hex', hex: H(3, 6) });
    expect(combatDice(ev(d), 'bonus')).toBe(5);
  });
  it('Clash of Shields: momentum allowed, bonus combat at normal dice (no +2)', () => {
    const d = win('HI', { card: 'clash', leader: true, hit: ['medium', ...n('light', 6)] });
    must(d, { kind: 'yesno', yes: true });
    ev(d);
    forceDice(n('light', 10));
    must(d, { kind: 'hex', hex: H(3, 6) });
    expect(combatDice(ev(d), 'bonus')).toBe(5);
  });
  it('the bonus combat target may evade; no momentum after an evade', () => {
    const d = win('HC', { extra: [{ side: 'top', type: 'LI', at: [4, 7] }] });
    must(d, { kind: 'yesno', yes: true });
    must(d, { kind: 'hex', hex: null });
    must(d, { kind: 'hex', hex: H(4, 7) });
    expect(d.pending).toMatchObject({ kind: 'defend', canEvade: true });
    forceDice(n('light', 4));
    must(d, { kind: 'defend', choice: 'evade' });
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(u(d, 'u4')).toBeUndefined();
    expect(d.pending?.kind).toBe('playCard');
  });
});
