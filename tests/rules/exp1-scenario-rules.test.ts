// Expansion #1 scenario rules (rules-reference §17.3 Tactical Flexibility; §17.4 112 Hellespont, 114 Gabiene, 116
// Heraclea, 120/121/124) and the base rules they touch: §5 (draw), §10 (flags), §11 (leaders, evading off the baseline),
// §13 (victory), §14 (011 Baecula camps).
import { beforeEach, describe, expect, it } from 'vitest';
import {
  GameDriver, UNIT_STATS, UNIT_TYPES, baseSwordIgnores, closeCombatDice, createGame, frightAtFirstSight, ignorableFlags,
  pieceMoves, randomAnswer, swordIgnores, tacticalFlexibility,
  type GameEvent, type GameState, type ScenarioSetup, type Side, type Unit, type UnitType,
} from '../../src/engine';
import { Occ, ignorableOcc } from '../../src/ai/board';
import { campBanner } from '../../src/ai/policies';
import { chooseAnswer, isLegal, newMemory, personalityFor, type AiOptions } from '../../src/ai';
import { SCENARIOS, scenarioById } from '../../src/scenarios';
import {
  H, build, combatDice, ev, forceDice, giveCard, must, n, noFirstStrike, passTurn, play, setupOf, toBattle, u, type Pos,
} from './helpers';

beforeEach(() => forceDice([]));

const ofKind = <K extends GameEvent['t']>(e: GameEvent[], t: K) => e.filter((x): x is Extract<GameEvent, { t: K }> => x.t === t);
const miss = (k: number) => n('light', k); // misses heavy and medium targets (no swords, no helmets)
/** Attack faces that score exactly 1 hit on a heavy target, then the 2-die leader casualty check that kills. */
const hitAndKill = ['heavy', ...miss(4), 'leader', 'leader'] as const;

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('infantry (unit table, used by Fright at First Sight)', () => {
  it('every foot type is infantry except the war machine; no mounted type is', () => {
    const inf = UNIT_TYPES.filter((t) => UNIT_STATS[t].infantry).sort();
    expect(inf).toEqual(['AX', 'HI', 'LB', 'LI', 'LS', 'MI', 'WA']);
    expect(UNIT_STATS.HWM.foot && !UNIT_STATS.HWM.infantry).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// 112 Hellespont: leaderLossCostsCard + allLeadersSuddenDeath
// ---------------------------------------------------------------------------------------------------------------------

const HELL: Pos = { rules: ['leaderLossCostsCard', 'allLeadersSuddenDeath'] };

describe('leaderLossCostsCard (112 Hellespont)', () => {
  it('a leader killed on his own side\'s turn: Command -1 and no draw at the end of that turn', () => {
    // bottom HI with its leader attacks; the top HI battles back, 1 hit, and the leader casualty check kills him
    const s = build({
      ...HELL,
      units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }],
      leaders: [{ side: 'bottom', at: [5, 6] }, { side: 'bottom', at: [8, 0] }, { side: 'top', at: [0, 0] }, { side: 'top', at: [0, 12] }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    expect(d.state.players.bottom.hand).toHaveLength(4); // 5 dealt, 1 played
    forceDice([...miss(5), ...hitAndKill]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    const e = ev(d);
    expect(ofKind(e, 'leaderKilled')).toHaveLength(1);
    expect(ofKind(e, 'command')).toEqual([{ t: 'command', side: 'bottom', command: 4 }]);
    expect(ofKind(e, 'cardLost')).toHaveLength(0);
    expect(ofKind(e, 'draw')).toHaveLength(0); // the turn ended without the bottom draw
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    expect(d.state.players.bottom.command).toBe(4);
    expect(d.state.players.bottom.hand).toHaveLength(4);
    expect(d.state.players.top.hand).toHaveLength(5);
    expect(d.state.players.top.banners).toBe(1);
    expect(d.state.special.leadersEliminated).toEqual({ top: 0, bottom: 1 });
    expect(d.state.special.cardDebt).toEqual({ top: 0, bottom: 0 });
    expect(d.state.winner).toBeNull();
  });

  it('a leader killed on the opponent\'s turn: Command -1 and one random card goes from the hand to the discard', () => {
    const run = () => {
      const s = build({
        ...HELL,
        units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }],
        leaders: [{ side: 'top', at: [4, 6] }, { side: 'top', at: [0, 0] }, { side: 'bottom', at: [8, 0] }, { side: 'bottom', at: [8, 12] }],
      });
      const d = toBattle(s, 'order4C', ['u1']);
      ev(d);
      const before = [...d.state.players.top.hand];
      forceDice([...hitAndKill, ...miss(5)]);
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      return { d, e: ev(d), before };
    };
    const { d, e, before } = run();
    const lost = ofKind(e, 'cardLost');
    expect(lost).toHaveLength(1);
    expect(lost[0].side).toBe('top');
    expect(before).toContain(lost[0].card);
    expect(d.state.players.top.hand).not.toContain(lost[0].card);
    expect(d.state.discard).toContain(lost[0].card);
    expect(d.state.players.top.hand).toHaveLength(4);
    expect(d.state.players.top.command).toBe(4);
    expect(ofKind(e, 'command')).toEqual([{ t: 'command', side: 'top', command: 4 }]);
    // the banner comes first, then the card penalty
    const kinds = e.map((x) => x.t);
    expect(kinds.indexOf('banner')).toBeLessThan(kinds.indexOf('command'));
    expect(kinds.indexOf('command')).toBeLessThan(kinds.indexOf('cardLost'));
    // the turn ends normally for the active side (1 draw), the top side draws nothing
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    expect(d.state.players.bottom.hand).toHaveLength(5);
    expect(d.state.players.top.hand).toHaveLength(4);
    // seeded: the same game discards the same card
    expect(run().e.find((x) => x.t === 'cardLost')).toEqual(lost[0]);
  });

  it('two leaders lost on the opponent\'s turn: Command -2 and two random discards, one after the other', () => {
    const s = build({
      ...HELL,
      units: [
        { side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'bottom', type: 'HI', at: [5, 9] },
        { side: 'top', type: 'HI', at: [4, 6] }, { side: 'top', type: 'HI', at: [4, 9] },
      ],
      leaders: [{ side: 'top', at: [4, 6] }, { side: 'top', at: [4, 9] }, { side: 'top', at: [0, 0] }, { side: 'bottom', at: [8, 0] }],
    });
    const d = toBattle(s, 'orderHeavy', ['u1', 'u2']);
    ev(d);
    forceDice([...hitAndKill, ...miss(5), ...hitAndKill, ...miss(5)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'attack', unit: 'u2', target: H(4, 9) });
    const e = ev(d);
    const lost = ofKind(e, 'cardLost');
    expect(lost).toHaveLength(2);
    expect(lost[0].card).not.toBe(lost[1].card);
    expect(ofKind(e, 'command').map((x) => x.command)).toEqual([4, 3]);
    expect(d.state.players.top.command).toBe(3);
    expect(d.state.players.top.hand).toHaveLength(3);
    expect(d.state.special.leadersEliminated.top).toBe(2);
    expect(d.state.winner).toBeNull(); // 3 top leaders at the start: one is left
  });

  it('two leaders lost on the own turn: each skips one draw (the end of this turn, then the next draw)', () => {
    // two lone bottom leaders step into marshes and are lost there (helmet)
    const s = build({
      ...HELL,
      terrain: [{ at: [5, 5], t: 'marsh' }, { at: [5, 7], t: 'marsh' }],
      leaders: [{ side: 'bottom', at: [6, 5] }, { side: 'bottom', at: [6, 7] }, { side: 'bottom', at: [8, 6] }],
    });
    const [l1, l2] = [s.leaders[0].id, s.leaders[1].id];
    const d = play(s, 'order2C', [l1, l2]);
    forceDice(['leader', 'leader']);
    must(d, { kind: 'move', piece: l1, to: H(5, 5) });
    expect(d.state.players.bottom.command).toBe(4);
    expect(d.state.special.cardDebt.bottom).toBe(1);
    must(d, { kind: 'move', piece: l2, to: H(5, 7) }); // nothing left to move or battle: the turn ends
    expect(d.state.special.leadersEliminated.bottom).toBe(2);
    expect(d.state.players.bottom.command).toBe(3);
    // end of turn: the draw is skipped, one card is still owed
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    expect(d.state.players.bottom.hand).toHaveLength(4);
    expect(d.state.special.cardDebt.bottom).toBe(1);
    passTurn(d); // top
    passTurn(d); // bottom: plays 1, the second skipped draw
    expect(d.state.players.bottom.hand).toHaveLength(3);
    expect(d.state.special.cardDebt.bottom).toBe(0);
    passTurn(d); // top
    passTurn(d); // bottom: normal again
    expect(d.state.players.bottom.hand).toHaveLength(3);
    expect(d.state.winner).toBeNull();
  });

  it('a card lost while the hand is empty: nothing to discard, the next draw is skipped instead', () => {
    const s = build({
      ...HELL,
      units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }],
      leaders: [{ side: 'top', at: [4, 6] }, { side: 'top', at: [0, 0] }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    d.state.deck.push(...d.state.players.top.hand.splice(0)); // constructed: the top hand is empty
    forceDice([...hitAndKill, ...miss(5)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    const e = ev(d);
    expect(ofKind(e, 'cardLost')).toHaveLength(0);
    expect(d.state.players.top.command).toBe(4);
    expect(d.state.special.cardDebt.top).toBe(1);
    // give top one card to play: its end-of-turn draw pays the debt
    d.state.players.top.hand.push(d.state.deck.pop()!);
    passTurn(d);
    expect(ofKind(ev(d), 'draw').filter((x) => x.side === 'top')).toHaveLength(0);
    expect(d.state.players.top.hand).toHaveLength(0);
    expect(d.state.special.cardDebt.top).toBe(0);
  });

  it('a leader evading off his own baseline is not eliminated: no Command loss, no discard, no banner', () => {
    const s = build({
      ...HELL,
      units: [{ side: 'bottom', type: 'HI', at: [1, 6] }],
      leaders: [{ side: 'top', at: [0, 6] }, { side: 'top', at: [0, 0] }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice(miss(5));
    must(d, { kind: 'attack', unit: 'u1', target: H(0, 6) });
    if (d.pending?.kind === 'leaderEvade') must(d, { kind: 'choose', index: d.pending.options.findIndex((o) => o.offBoard) });
    const e = ev(d);
    expect(ofKind(e, 'leaderEvade')[0].offBoard).toBe(true);
    expect(d.state.leaders.map((l) => l.hex)).toEqual([H(0, 0)]);
    expect(d.state.special.leadersEliminated.top).toBe(0);
    expect(d.state.players.top.command).toBe(5);
    expect(d.state.players.top.hand).toHaveLength(5);
    expect(d.state.players.bottom.banners).toBe(0);
    expect(ofKind(e, 'cardLost')).toHaveLength(0);
  });

  it('an elephant crushing a lone leader in its blocked retreat applies the leader-loss rules (own turn: no draw)', () => {
    // §10 elephant retreat: top EL retreats 2, its second step blocked by a lone bottom leader and a top MI
    const s = build({
      ...HELL,
      units: [
        { side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'EL', at: [4, 6] },
        { side: 'top', type: 'MI', at: [3, 6] }, { side: 'top', type: 'MI', at: [2, 6] },
      ],
      leaders: [{ side: 'bottom', at: [2, 5] }, { side: 'bottom', at: [8, 0] }, { side: 'top', at: [0, 0] }, { side: 'top', at: [0, 12] }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice(['flag', 'flag', ...n('light', 3), ...n('light', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: d.pending.options.findIndex((o) => o.end === H(3, 5)) });
    expect(d.state.leaders.filter((l) => l.side === 'bottom')).toHaveLength(1);
    expect(d.state.special.leadersEliminated.bottom).toBe(1);
    expect(d.state.players.top.banners).toBe(1);
    expect(d.state.players.bottom.command).toBe(4);
    expect(d.state.special.cardDebt.bottom).toBe(1);
    if (d.pending?.kind === 'momentum') must(d, { kind: 'yesno', yes: false });
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    expect(d.state.players.bottom.hand).toHaveLength(4); // no draw
    expect(d.state.winner).toBeNull();
  });

  it('a lone leader lost on the opponent\'s turn to a crushing elephant: the owner discards at random', () => {
    // the bottom EL attacks; the top MI battles back with 2 flags; the EL retreats to (6,6), where its second step is
    // blocked by a lone top leader at (7,5) and a bottom MI at (7,6) (the other way, (6,7), is blocked at once)
    const s = build({
      ...HELL,
      units: [
        { side: 'bottom', type: 'EL', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] },
        { side: 'bottom', type: 'MI', at: [6, 7] }, { side: 'bottom', type: 'MI', at: [7, 6] },
      ],
      leaders: [{ side: 'top', at: [7, 5] }, { side: 'top', at: [0, 0] }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    // EL attack vs MI: 4 dice, all miss; MI battles back with 4: 2 flags; rampage (MI 2 dice, MI 2 dice): misses
    forceDice([...n('light', 4), 'flag', 'flag', ...n('light', 2), ...n('light', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    const e = ev(d);
    expect(u(d, 'u1')!.hex).toBe(H(6, 6));
    expect(ofKind(e, 'leaderKilled')).toHaveLength(1);
    expect(d.state.special.leadersEliminated.top).toBe(1);
    expect(d.state.players.bottom.banners).toBe(1);
    expect(d.state.players.top.command).toBe(4);
    expect(ofKind(e, 'cardLost').map((x) => x.side)).toEqual(['top']);
    expect(d.state.players.top.hand).toHaveLength(4);
  });

  it('First Strike: the striker\'s own draw still comes at the end of the turn', () => {
    // a) the First Strike kills the attacker's leader (attacker's own turn): attacker no draw, defender draws for First Strike
    const s = build({
      ...HELL,
      units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }],
      leaders: [{ side: 'bottom', at: [5, 6] }, { side: 'bottom', at: [8, 0] }, { side: 'top', at: [0, 0] }],
    });
    noFirstStrike(s);
    giveCard(s, 'top', 'firstStrike');
    const d = play(s, 'order4C', ['u1'], { keepFS: true });
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    forceDice([...hitAndKill, ...miss(5)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'defend', choice: 'firstStrike' });
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    expect(d.state.players.bottom.command).toBe(4);
    expect(d.state.players.bottom.hand).toHaveLength(4);
    expect(d.state.players.top.hand).toHaveLength(5);

    // b) the First Strike player's leader dies afterwards (opponent's turn): random discard now, First Strike draw later
    const s2 = build({
      ...HELL,
      units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }],
      leaders: [{ side: 'top', at: [4, 6] }, { side: 'top', at: [0, 0] }, { side: 'bottom', at: [8, 0] }],
    });
    noFirstStrike(s2);
    const fs = giveCard(s2, 'top', 'firstStrike');
    const d2 = play(s2, 'order4C', ['u1'], { keepFS: true });
    if (d2.pending?.kind === 'move') must(d2, { kind: 'endMove' });
    ev(d2);
    forceDice([...miss(5), ...hitAndKill]);
    must(d2, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d2, { kind: 'defend', choice: 'firstStrike' });
    const e2 = ev(d2);
    const lost = ofKind(e2, 'cardLost');
    expect(lost).toHaveLength(1);
    expect(lost[0].card).not.toBe(fs);
    expect(d2.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    expect(d2.state.players.top.command).toBe(4);
    expect(d2.state.players.top.hand).toHaveLength(4); // 5 - First Strike - lost card + First Strike draw
  });

  it('without the rule a lost leader changes neither Command nor the hand', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }],
      leaders: [{ side: 'top', at: [4, 6] }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice([...hitAndKill, ...miss(5)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.state.players.top.command).toBe(5);
    expect(d.state.players.top.hand).toHaveLength(5);
    expect(d.state.special.leadersEliminated.top).toBe(1); // counted in every battle
    expect(d.state.winner).toBeNull();
  });

  it('random games: at every card play each hand holds Command cards plus any draws still owed', () => {
    const base = scenarioById('007').setup;
    const setup: ScenarioSetup = { ...base, rules: [...base.rules, 'leaderLossCostsCard'] };
    let losses = 0;
    for (const seed of [1, 2, 3]) {
      const d = new GameDriver(createGame(setup, seed));
      const rnd = mulberry(seed);
      let steps = 0;
      while (!d.over && steps++ < 6000) {
        const p = d.pending!;
        if (p.kind === 'playCard') {
          for (const side of ['top', 'bottom'] as Side[]) {
            const pl = d.state.players[side];
            expect(pl.hand.length, `${seed} ${side}`).toBe(pl.command + d.state.special.cardDebt[side]);
          }
        }
        d.answer(randomAnswer(d.state, p, rnd));
      }
      losses += d.state.special.leadersEliminated.top + d.state.special.leadersEliminated.bottom;
    }
    expect(losses).toBeGreaterThan(0);
  });
});

describe('allLeadersSuddenDeath (112 Hellespont)', () => {
  /** Both top HI carry a top leader; the bottom HI kill both leaders in one turn. */
  function killBoth(p: Pos = {}, commander?: string) {
    const setup = setupOf({
      ...HELL, ...p,
      units: [
        { side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'bottom', type: 'HI', at: [5, 9] },
        { side: 'top', type: 'HI', at: [4, 6] }, { side: 'top', type: 'HI', at: [4, 9] },
      ],
      leaders: [{ side: 'top', at: [4, 6] }, { side: 'top', at: [4, 9] }, ...(p.leaders ?? [])],
    });
    if (commander) setup.top.commander = commander;
    const s = createGame(setup, 4242);
    const d = toBattle(s, 'orderHeavy', ['u1', 'u2']);
    ev(d);
    forceDice([...hitAndKill, ...miss(5), ...hitAndKill, ...miss(5)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    const first = ev(d);
    must(d, { kind: 'attack', unit: 'u2', target: H(4, 9) });
    return { d, first, second: ev(d) };
  }

  it('when every leader a side started with has been eliminated, the other side wins at once', () => {
    const { d, first, second } = killBoth();
    expect(ofKind(first, 'victory')).toHaveLength(0);
    expect(d.state.special.leadersAtStart).toEqual({ top: 2, bottom: 0 });
    expect(d.state.special.leadersEliminated.top).toBe(2);
    expect(d.state.winner).toBe('bottom');
    expect(d.state.winReason).toBe("All of T's leaders have fallen");
    expect(d.over).toBe(true);
    // banner first, then the instant win; no card penalty after the battle is over
    expect(second.map((x) => x.t).filter((t) => t === 'banner' || t === 'victory' || t === 'command' || t === 'cardLost'))
      .toEqual(['banner', 'victory']);
    expect(ofKind(second, 'victory')).toEqual([{ t: 'victory', winner: 'bottom', reason: "All of T's leaders have fallen" }]);
    expect(d.state.players.bottom.banners).toBe(2);
  });

  it('the reason names the commander (Craterus -> "Craterus\'")', () => {
    expect(killBoth({}, 'Craterus').d.state.winReason).toBe("All of Craterus' leaders have fallen");
  });

  it('a banner victory on the same kill comes first', () => {
    const { d, second } = killBoth({ banners: 2 });
    expect(d.state.winner).toBe('bottom');
    expect(d.state.winReason).toMatch(/2 banners/);
    expect(ofKind(second, 'victory')).toHaveLength(1);
  });

  it('a side with a leader left does not lose; without the rule nobody wins', () => {
    expect(killBoth({ leaders: [{ side: 'top', at: [0, 0] }] }).d.state.winner).toBeNull();
    expect(killBoth({ rules: ['leaderLossCostsCard'] }).d.state.winner).toBeNull();
  });

  it('a leader who evaded off the board means the side can no longer lose this way', () => {
    const s = build({
      ...HELL,
      units: [
        { side: 'bottom', type: 'HI', at: [1, 6] }, { side: 'bottom', type: 'HI', at: [5, 6] },
        { side: 'top', type: 'HI', at: [4, 6] },
      ],
      leaders: [{ side: 'top', at: [0, 6] }, { side: 'top', at: [4, 6] }],
    });
    const d = toBattle(s, 'orderHeavy', ['u1', 'u2']);
    forceDice(miss(5));
    must(d, { kind: 'attack', unit: 'u1', target: H(0, 6) });
    if (d.pending?.kind === 'leaderEvade') must(d, { kind: 'choose', index: d.pending.options.findIndex((o) => o.offBoard) });
    forceDice([...hitAndKill, ...miss(5)]);
    must(d, { kind: 'attack', unit: 'u2', target: H(4, 6) });
    expect(d.state.leaders.filter((l) => l.side === 'top')).toHaveLength(0);
    expect(d.state.special.leadersEliminated.top).toBe(1);
    expect(d.state.players.top.command).toBe(4); // only the killed leader costs a card
    expect(d.state.winner).toBeNull();
  });

  it('the crushed leader of an elephant\'s blocked retreat counts: the last one ends the battle', () => {
    const s = build({
      ...HELL,
      units: [
        { side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'EL', at: [4, 6] },
        { side: 'top', type: 'MI', at: [3, 6] }, { side: 'top', type: 'MI', at: [2, 6] },
      ],
      leaders: [{ side: 'bottom', at: [2, 5] }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['flag', 'flag', ...n('light', 3), ...n('light', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: d.pending.options.findIndex((o) => o.end === H(3, 5)) });
    expect(d.state.players.top.banners).toBe(1);
    expect(d.state.winner).toBe('top');
    expect(d.state.winReason).toBe("All of B's leaders have fallen");
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// 116 Heraclea: Fright at First Sight
// ---------------------------------------------------------------------------------------------------------------------

const FRIGHT: Pos = { rules: ['frightAtFirstSight'] };

/**
 * The Roman (bottom) `target` at (5,6) with an attached leader and two supporting MI at (5,5) and (5,7); the
 * Carthaginian (top) `striker` at (4,6) attacks it. Units: u1 striker, u2 target, u3/u4 supports.
 */
function romanLine(striker: UnitType, target: UnitType, p: Pos = FRIGHT) {
  return build({
    ...p, first: 'top',
    units: [
      { side: 'top', type: striker, at: [4, 6] }, { side: 'bottom', type: target, at: [5, 6] },
      { side: 'bottom', type: 'MI', at: [5, 5] }, { side: 'bottom', type: 'MI', at: [5, 7] },
    ],
    leaders: [{ side: 'bottom', at: [5, 6] }],
  });
}

/** The top striker attacks the Roman unit; the first die is a flag, the rest miss. Returns the driver after the roll. */
function attackRoman(striker: UnitType, target: UnitType, p: Pos = FRIGHT) {
  const d = toBattle(romanLine(striker, target, p), 'order4C', ['u1']);
  ev(d);
  forceDice(['flag', ...n('light', 6)]);
  must(d, { kind: 'attack', unit: 'u1', target: H(5, 6) });
  if (d.pending?.kind === 'defend') must(d, { kind: 'defend', choice: 'stand' });
  return d;
}

describe('frightAtFirstSight (116 Heraclea)', () => {
  it('a Roman MI with an attached leader and 2 supports may not ignore an elephant\'s flag: it must retreat', () => {
    const d = attackRoman('EL', 'MI');
    expect(d.pending?.kind).not.toBe('ignoreFlags');
    const e = ev(d);
    expect(ofKind(e, 'flags')).toEqual([{ t: 'flags', id: 'u2', flags: 1, ignored: 0 }]);
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(u(d, 'u2')!.hex).not.toBe(H(5, 6));
    expect(d.state.leaders[0].hex).toBe(u(d, 'u2')!.hex); // the leader went with it
  });

  it('control: the same unit may ignore the elephant\'s flag without the rule, and a heavy infantry flag with it', () => {
    expect(attackRoman('EL', 'MI', {}).pending).toMatchObject({ kind: 'ignoreFlags', unit: 'u2', max: 1 });
    expect(attackRoman('HI', 'MI').pending).toMatchObject({ kind: 'ignoreFlags', unit: 'u2', max: 1 });
  });

  it('every Roman infantry type is affected; war machines and cavalry are not', () => {
    for (const t of ['LI', 'AX', 'MI', 'HI'] as UnitType[]) {
      const s = romanLine('EL', t);
      const ctx = { kind: 'close' as const, striker: s.units[0], leaderAlive: true, fullAtStart: true, role: 'attack' as const };
      expect([t, ignorableFlags(s, s.units[1], ctx)]).toEqual([t, 0]);
    }
    // not infantry: the HWM and the MC keep their leader and support
    expect(attackRoman('EL', 'HWM').pending).toMatchObject({ kind: 'ignoreFlags', unit: 'u2', max: 1 });
    expect(attackRoman('EL', 'MC').pending).toMatchObject({ kind: 'ignoreFlags', unit: 'u2', max: 1 });
  });

  it('only Roman units: a Carthaginian MI attacked by a Roman elephant keeps its ignores', () => {
    const s = romanLine('EL', 'MI', { ...FRIGHT, topArmy: 'Roman', bottomArmy: 'Carthaginian' });
    const ctx = { kind: 'close' as const, striker: s.units[0], leaderAlive: true, fullAtStart: true, role: 'attack' as const };
    expect(ignorableFlags(s, s.units[1], ctx)).toBe(2);
    expect(frightAtFirstSight(s, s.units[1], s.units[0], 'close')).toBe(false);
  });

  it('the elephant battling back: the attacking Roman MI must retreat on its flag', () => {
    const s = build({
      ...FRIGHT,
      units: [
        { side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'bottom', type: 'MI', at: [5, 5] }, { side: 'bottom', type: 'MI', at: [5, 7] },
        { side: 'top', type: 'EL', at: [4, 6] },
      ],
      leaders: [{ side: 'bottom', at: [5, 6] }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice([...n('light', 4), 'flag', ...n('light', 3)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.pending?.kind).not.toBe('ignoreFlags');
    expect(ofKind(ev(d), 'flags')).toEqual([{ t: 'flags', id: 'u1', flags: 1, ignored: 0 }]);
  });

  it('the elephant\'s bonus close combat counts', () => {
    const s = build({
      ...FRIGHT, first: 'top',
      units: [
        { side: 'top', type: 'EL', at: [3, 6] }, { side: 'bottom', type: 'AX', at: [4, 6], blocks: 1 },
        { side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'bottom', type: 'MI', at: [5, 5] }, { side: 'bottom', type: 'MI', at: [5, 7] },
      ],
      leaders: [{ side: 'bottom', at: [5, 6] }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['light', 'heavy', 'heavy']); // EL vs AX: 3 dice, 1 hit eliminates it
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'yesno', yes: true });
    expect(d.pending).toMatchObject({ kind: 'bonusCombat' });
    ev(d);
    forceDice(['flag', ...n('light', 3)]);
    must(d, { kind: 'hex', hex: H(5, 6) });
    expect(d.pending?.kind).not.toBe('ignoreFlags');
    expect(ofKind(ev(d), 'flags')).toEqual([{ t: 'flags', id: 'u3', flags: 1, ignored: 0 }]);
  });

  it('the elephant\'s First Strike counts', () => {
    const s = build({
      ...FRIGHT,
      units: [
        { side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'bottom', type: 'MI', at: [5, 5] }, { side: 'bottom', type: 'MI', at: [5, 7] },
        { side: 'top', type: 'EL', at: [4, 6] },
      ],
      leaders: [{ side: 'bottom', at: [5, 6] }],
    });
    noFirstStrike(s);
    giveCard(s, 'top', 'firstStrike');
    const d = play(s, 'order4C', ['u1'], { keepFS: true });
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    ev(d);
    forceDice(['flag', ...n('light', 3)]);
    must(d, { kind: 'defend', choice: 'firstStrike' });
    expect(d.pending?.kind).not.toBe('ignoreFlags');
    expect(ofKind(ev(d), 'flags')).toEqual([{ t: 'flags', id: 'u1', flags: 1, ignored: 0 }]);
  });

  it('the AI flag-ignore mirror follows the rule', () => {
    const s = romanLine('EL', 'MI');
    expect(ignorableOcc(s, new Occ(s), s.units[1], 'close', s.units[0], 'attack')).toBe(0);
    const t = romanLine('EL', 'MI', {});
    expect(ignorableOcc(t, new Occ(t), t.units[1], 'close', t.units[0], 'attack')).toBe(2);
    const h = romanLine('HI', 'MI');
    expect(ignorableOcc(h, new Occ(h), h.units[1], 'close', h.units[0], 'attack')).toBe(2);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// 120/121/124: optional Roman Tactical Flexibility (§17.3)
// ---------------------------------------------------------------------------------------------------------------------

const TF: Pos = { rules: ['tacticalFlexibility'], topArmy: 'Macedonian' };

/**
 * The Roman (bottom) `atk` at (5,6) attacks the Macedonian HI at (4,6); every die misses. Returns the battle-back dice
 * (and the attack dice). Units: u1 attacker, u2 HI, then `p.units`.
 */
function tfDuel(atk: UnitType, p: Pos = TF, card: Parameters<typeof toBattle>[1] = 'order4C') {
  const s = build({ ...p, units: [{ side: 'bottom', type: atk, at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }, ...(p.units ?? [])] });
  const d = card === 'clash' ? play(s, 'clash') : toBattle(s, card, ['u1']);
  ev(d);
  forceDice(n('light', 30));
  must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
  if (d.pending?.kind === 'defend') must(d, { kind: 'defend', choice: 'stand' });
  const e = ev(d);
  return { back: combatDice(e, 'battleBack'), attack: combatDice(e, 'close') };
}

describe('tacticalFlexibility (§17.3)', () => {
  it('an unsupported non-Roman HI battling back against a Roman MI or HI rolls 3 dice', () => {
    expect(tfDuel('MI').back).toBe(3);
    expect(tfDuel('HI').back).toBe(3);
  });

  it('supported (2 adjacent friendly units, or a unit and a lone leader): 5', () => {
    expect(tfDuel('MI', { ...TF, units: [{ side: 'top', type: 'LI', at: [3, 5] }, { side: 'top', type: 'LI', at: [3, 6] }] }).back).toBe(5);
    expect(tfDuel('MI', { ...TF, units: [{ side: 'top', type: 'LI', at: [3, 5] }], leaders: [{ side: 'top', at: [3, 6] }] }).back).toBe(5);
    // one supporting unit, or an attached leader, is not enough
    expect(tfDuel('MI', { ...TF, units: [{ side: 'top', type: 'LI', at: [3, 5] }] }).back).toBe(3);
    expect(tfDuel('MI', { ...TF, leaders: [{ side: 'top', at: [4, 6] }] }).back).toBe(3);
  });

  it('on broken ground the rule does not apply (normal dice, capped at 2)', () => {
    const p: Pos = { ...TF, terrain: [{ at: [4, 6], t: 'broken' }] };
    expect(tfDuel('MI', p).back).toBe(2);
    const s = build({ ...p, units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }] });
    expect(tacticalFlexibility(s, s.units[1], s.units[0], 'back')).toBe(false);
    const plain = build({ ...TF, units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }] });
    expect(tacticalFlexibility(plain, plain.units[1], plain.units[0], 'back')).toBe(true);
  });

  it('[Interp] the 3 replaces the base dice: terrain caps still apply, the leader die is added after', () => {
    // a capped ford limits it to 2; a no-cap ford (§16) leaves 3
    expect(tfDuel('MI', { ...TF, terrain: [{ at: [4, 6], t: 'river', ford: true }] }).back).toBe(2);
    expect(tfDuel('MI', { ...TF, terrain: [{ at: [4, 6], t: 'river', ford: 'nocap' }] }).back).toBe(3);
    // on a camp: 3 - 1
    expect(tfDuel('MI', { ...TF, terrain: [{ at: [4, 6], t: 'camp' }] }).back).toBe(2);
    // Alexander-style leader attached (+1 at the card-bonus step, §17.2): 3 + 1
    expect(tfDuel('MI', { ...TF, leaders: [{ side: 'top', at: [4, 6], traits: ['ccBonus'] }] }).back).toBe(4);
  });

  it('the Roman card bonus raises only the Roman attack (Clash of Shields: 6 dice), not the battle back', () => {
    const r = tfDuel('MI', TF, 'clash');
    expect(r.attack).toBe(6);
    expect(r.back).toBe(3);
  });

  it('against Roman AX, LI or cavalry: normal dice; a Carthaginian attacker or no rule: normal dice', () => {
    expect(tfDuel('AX').back).toBe(5);
    expect(tfDuel('LI').back).toBe(5);
    expect(tfDuel('HC').back).toBe(5);
    expect(tfDuel('MI', { ...TF, bottomArmy: 'Carthaginian' }).back).toBe(5);
    expect(tfDuel('MI', { topArmy: 'Macedonian' }).back).toBe(5);
  });

  it('only HI of the non-Roman army: a Macedonian MI battles back with its 4', () => {
    const s = build({ ...TF, units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] }] });
    expect(closeCombatDice(s, s.units[1], s.units[0], { role: 'back', fullAtStart: true, ordered: false })).toBe(4);
  });

  it('First Strike is not a battle back: 5 dice', () => {
    const s = build({ ...TF, units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }] });
    noFirstStrike(s);
    giveCard(s, 'top', 'firstStrike');
    const d = play(s, 'order4C', ['u1'], { keepFS: true });
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    ev(d);
    forceDice(n('light', 30));
    must(d, { kind: 'defend', choice: 'firstStrike' });
    expect(combatDice(ev(d), 'firstStrike')).toBe(5);
  });

  it('also against the Roman unit\'s bonus close combat', () => {
    const s = build({
      ...TF,
      units: [
        { side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'AX', at: [4, 6], blocks: 1 }, { side: 'top', type: 'HI', at: [3, 6] },
      ],
      leaders: [{ side: 'bottom', at: [5, 6] }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['light', ...n('medium', 4)]); // 1 hit eliminates the AX
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'yesno', yes: true });
    expect(d.pending).toMatchObject({ kind: 'bonusCombat' });
    ev(d);
    forceDice([...n('medium', 5), ...n('light', 3)]);
    must(d, { kind: 'hex', hex: H(3, 6) });
    const e = ev(d);
    expect(combatDice(e, 'bonus')).toBe(5);
    expect(combatDice(e, 'battleBack')).toBe(3);
  });

  it('scenario option: on by default where the scenario offers it, off on request, ignored where it is not offered', () => {
    const offered: ScenarioSetup = { ...setupOf({ topArmy: 'Macedonian' }), options: { tacticalFlexibility: true } };
    expect(createGame(offered, 1).special.rules).toContain('tacticalFlexibility');
    expect(createGame(offered, 1, { tacticalFlexibility: true }).special.rules).toContain('tacticalFlexibility');
    expect(createGame(offered, 1, { tacticalFlexibility: false }).special.rules).not.toContain('tacticalFlexibility');
    const offOffered: ScenarioSetup = { ...offered, options: { tacticalFlexibility: false } };
    expect(createGame(offOffered, 1).special.rules).not.toContain('tacticalFlexibility');
    expect(createGame(offOffered, 1, { tacticalFlexibility: true }).special.rules).toContain('tacticalFlexibility');
    // a base battle never gets it from a stray option
    expect(createGame(scenarioById('007').setup, 1, { tacticalFlexibility: true }).special.rules).not.toContain('tacticalFlexibility');
    // option off: the HI battles back with 5
    const s = createGame({
      ...setupOf({ topArmy: 'Macedonian', units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }] }),
      options: { tacticalFlexibility: true },
    }, 1, { tacticalFlexibility: false });
    expect(closeCombatDice(s, s.units[1], s.units[0], { role: 'back', fullAtStart: true, ordered: false })).toBe(5);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Camp capture (011 Baecula, 114 Gabiene)
// ---------------------------------------------------------------------------------------------------------------------

/** Gabiene-style: the top side captures the listed camp at (7,11); (7,1) is a camp that is not listed. */
const GABIENE: Pos = {
  rules: ['campCapture'], campCapture: { side: 'top', hexes: [[7, 11]] }, first: 'top', topArmy: 'Antigonid', bottomArmy: 'Eumenid',
  terrain: [{ at: [7, 11], t: 'camp' }, { at: [7, 1], t: 'camp' }],
};

describe('campCapture (114 Gabiene, 011 Baecula)', () => {
  it('a unit of the capturing side ending its move on the listed camp gains 1 banner, once', () => {
    const s = build({ ...GABIENE, units: [{ side: 'top', type: 'MI', at: [6, 11] }, { side: 'top', type: 'MI', at: [6, 12] }] });
    const d = play(s, 'orderMedium', ['u1']);
    must(d, { kind: 'move', piece: 'u1', to: H(7, 11) });
    expect(d.state.players.top.banners).toBe(1);
    expect(d.state.special.campsCaptured).toEqual([H(7, 11)]);
    while (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    passTurn(d); // bottom
    const card = giveCard(d.state, 'top', 'orderMedium');
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1', 'u2'] });
    must(d, { kind: 'move', piece: 'u1', to: H(8, 11) });
    must(d, { kind: 'move', piece: 'u2', to: H(7, 11) });
    expect(d.state.players.top.banners).toBe(1);
  });

  it('passing through does not capture; an unlisted camp gives nothing; the other side never captures', () => {
    // (7,10) is blocked so the light cavalry's short way to (8,11) runs through the camp
    const s1 = build({ ...GABIENE, units: [{ side: 'top', type: 'LC', at: [6, 11] }, { side: 'top', type: 'MI', at: [7, 10] }] });
    const d1 = play(s1, 'orderLight', ['u1']);
    const through = pieceMoves(d1.state, 'u1').find((m) => m.hex === H(8, 11) && m.path.includes(H(7, 11)));
    expect(through).toBeTruthy();
    must(d1, { kind: 'move', piece: 'u1', to: H(8, 11) });
    expect(d1.state.players.top.banners).toBe(0);
    const s2 = build({ ...GABIENE, units: [{ side: 'top', type: 'MI', at: [6, 1] }] });
    const d2 = play(s2, 'orderMedium', ['u1']);
    must(d2, { kind: 'move', piece: 'u1', to: H(7, 1) });
    expect(d2.state.players.top.banners).toBe(0);
    const s3 = build({ ...GABIENE, first: 'bottom', units: [{ side: 'bottom', type: 'MI', at: [8, 11] }] });
    const d3 = play(s3, 'orderMedium', ['u1']);
    must(d3, { kind: 'move', piece: 'u1', to: H(7, 11) });
    expect(d3.state.players.bottom.banners).toBe(0);
  });

  it('ending a close-combat sequence on it captures; a retreat onto it does not', () => {
    const s = build({ ...GABIENE, units: [{ side: 'top', type: 'MI', at: [6, 11] }, { side: 'bottom', type: 'MI', at: [7, 11], blocks: 1 }] });
    const d = toBattle(s, 'orderMedium', ['u1']);
    forceDice(['medium', ...n('light', 3)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(7, 11) });
    must(d, { kind: 'yesno', yes: true });
    expect(u(d, 'u1')!.hex).toBe(H(7, 11));
    expect(d.state.players.top.banners).toBe(2); // the unit and the camp

    const r = build({ ...GABIENE, first: 'bottom', units: [{ side: 'bottom', type: 'MI', at: [8, 10] }, { side: 'top', type: 'MI', at: [8, 11] }] });
    const dr = toBattle(r, 'orderMedium', ['u1']);
    forceDice(['flag', ...n('light', 3), ...n('light', 4)]);
    must(dr, { kind: 'attack', unit: 'u1', target: H(8, 11) });
    if (dr.pending?.kind === 'retreat') must(dr, { kind: 'choose', index: dr.pending.options.findIndex((o) => o.end === H(7, 11)) });
    expect(u(dr, 'u2')!.hex).toBe(H(7, 11));
    expect(dr.state.players.top.banners).toBe(0);
  });

  it('setup: hexes default to every camp on the board; the hexes must be camps; rule and data go together', () => {
    const all = createGame(setupOf({ ...GABIENE, campCapture: { side: 'bottom' } }), 1);
    expect(all.special.campCapture).toMatchObject({ side: 'bottom', hexes: [H(7, 1), H(7, 11)] });
    expect(() => createGame(setupOf({ ...GABIENE, campCapture: { side: 'top', hexes: [[6, 6]] } }), 1)).toThrow(/camp/);
    expect(() => createGame(setupOf({ ...GABIENE, campCapture: undefined }), 1)).toThrow(/campCapture/);
    expect(() => createGame(setupOf({ ...GABIENE, rules: [] }), 1)).toThrow(/campCapture/);
    expect(createGame(setupOf({}), 1).special.campCapture).toBeNull();
  });

  it('011 Baecula: the Romans (bottom) capture any of the three Carthaginian camps; the setup is otherwise unchanged', () => {
    const sc = scenarioById('011');
    expect(sc.setup.rules).toEqual(['campCapture']);
    expect(sc.setup.campCapture?.side).toBe('bottom');
    const s = createGame(sc.setup, 1);
    expect(s.players.bottom.army).toBe('Roman');
    expect(s.special.campCapture).toEqual({ side: 'bottom', hexes: [H(1, 4), H(1, 6), H(1, 8)], text: 'The Romans storm a Carthaginian camp!' });
    expect(s.terrain.flatMap((t, h) => (t === 'camp' ? [h] : []))).toEqual([H(1, 4), H(1, 6), H(1, 8)]);
    expect(s.units).toHaveLength(sc.setup.units.length);
    // no other scenario has a camp objective
    for (const x of SCENARIOS) if (x.id !== '011') expect([x.id, x.setup.campCapture]).toEqual([x.id, undefined]);
  });

  it('the AI values the camp for the capturing side only', () => {
    const s = build({ ...GABIENE, units: [{ side: 'top', type: 'MI', at: [6, 11] }, { side: 'bottom', type: 'MI', at: [8, 11] }] });
    expect(campBanner(s, s.units[0], H(7, 11))).toBeGreaterThan(0);
    expect(campBanner(s, s.units[0], H(7, 1))).toBe(0);
    expect(campBanner(s, s.units[1], H(7, 11))).toBe(0);
    s.special.campsCaptured.push(H(7, 11));
    expect(campBanner(s, s.units[0], H(7, 11))).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Hardening (review follow-ups)
// ---------------------------------------------------------------------------------------------------------------------

describe('hardening', () => {
  it('setup rejects a ford on a hex that is not a river', () => {
    expect(() => createGame(setupOf({ terrain: [{ at: [4, 6], t: 'plain', ford: true }] }), 1)).toThrow(/ford/);
    expect(() => createGame(setupOf({ terrain: [{ at: [4, 6], t: 'hill', ford: 'nocap' }] }), 1)).toThrow(/ford/);
    expect(() => createGame(setupOf({ terrain: [{ at: [4, 6], t: 'plain', ford: false }] }), 1)).not.toThrow();
    expect(() => createGame(setupOf({ terrain: [{ at: [4, 6], t: 'river', ford: true }] }), 1)).not.toThrow();
  });

  it('swordIgnores needs the striker and its role; baseSwordIgnores is the position-independent part (no rampart)', () => {
    const s = build({
      terrain: [{ at: [5, 6], t: 'rampart', faces: 'top' }],
      units: [{ side: 'top', type: 'HI', at: [4, 6] }, { side: 'bottom', type: 'MI', at: [5, 6] }],
    });
    const [hi, mi] = s.units;
    expect(swordIgnores(s, mi, hi, 'attack')).toBe(1);
    expect(swordIgnores(s, mi, hi, 'back')).toBe(0);
    expect(baseSwordIgnores(s, mi)).toBe(0);
    const typeCheck = (g: GameState, t: Unit) => {
      // @ts-expect-error the striker and role are required, so the rampart cannot be left out by accident
      swordIgnores(g, t);
    };
    expect(typeCheck).toBeTypeOf('function');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The AI stays legal with every new rule on
// ---------------------------------------------------------------------------------------------------------------------

describe('AI vs AI with the Expansion #1 scenario rules', () => {
  it('003 Bagradas with Hellespont, Fright at First Sight and Tactical Flexibility: legal answers to the end', () => {
    const base = scenarioById('003').setup;
    const setup: ScenarioSetup = {
      ...base, rules: [...base.rules, 'leaderLossCostsCard', 'allLeadersSuddenDeath', 'frightAtFirstSight', 'tacticalFlexibility'],
    };
    const d = new GameDriver(createGame(setup, 4245));
    const opts: Record<Side, AiOptions> = {
      top: { side: 'top', difficulty: 'recruit', personality: personalityFor(base.top.commander, base.top.army), seed: 11, budgetScale: 0.3 },
      bottom: { side: 'bottom', difficulty: 'recruit', personality: personalityFor(base.bottom.commander, base.bottom.army), seed: 22, budgetScale: 0.3 },
    };
    const mems = { top: newMemory(), bottom: newMemory() };
    let steps = 0;
    while (!d.over && steps++ < 20000) {
      const dec = d.pending!;
      const r = chooseAnswer(d.state, dec, opts[dec.side], mems[dec.side]);
      expect(isLegal(d.state, dec, r.answer), `${dec.kind}: ${JSON.stringify(r.answer)}`).toBe(true);
      if (!d.answer(r.answer)) throw new Error(`answer rejected: ${d.lastError}`);
    }
    expect(d.state.winner).not.toBeNull();
  });
});
