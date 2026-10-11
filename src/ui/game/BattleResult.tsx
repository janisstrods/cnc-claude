import { bannerTotal, other, type GameState, type Side } from '../../engine';
import { BannerIcon, Button } from '../kit';
import { legResult, type LegResult } from './controller';
import type { Medal as MedalKind } from '../record';
import { MEDAL_LEVEL, Medal } from '../screens/Medal';

/** An empty banner slot, drawn for parchment (the kit's empty slot is made for dark leather). */
function EmptyBanner() {
  return (
    <svg className="victory-banner is-empty" viewBox="0 0 40 66" width={18} height={30} aria-hidden="true">
      <path d="M7 10 H33 V55 L20 46 L7 55 Z" fill="rgba(154,111,44,.08)" stroke="#a88248" strokeWidth="1.6" strokeDasharray="3 2.4" strokeLinejoin="round" />
      <rect x="4" y="7.4" width="32" height="3.2" rx="1.6" fill="#b89458" />
    </svg>
  );
}

const OUTCOME = { won: 'Victory', lost: 'Defeat', draw: 'Draw' } as const;

/**
 * After the second battle of a both-sides match: each battle as the human fought it, the banner totals of the human and
 * the computer, and who takes the match.
 */
function MatchSummary({ state: s, legs }: { state: GameState; legs: LegResult[] }) {
  const sum = (mine: boolean) => legs.reduce((n, l) => n + l.banners[mine ? l.humanSide : other(l.humanSide)], 0);
  const you = sum(true);
  const ai = sum(false);
  const verdict = you > ai ? `You take the match, ${you} banners to ${ai}`
    : ai > you ? `The computer takes the match, ${ai} banners to ${you}`
    : `The match is drawn, ${you} banners each`;
  return (
    <section className="match" aria-label="Both sides">
      <h3 className="match-title">Both sides</h3>
      <table className="match-table">
        <thead>
          <tr><td /><td /><th scope="col">You</th><th scope="col">Computer</th></tr>
        </thead>
        <tbody>
          {legs.map((l, i) => {
            const outcome = l.winner === 'draw' ? 'draw' : l.winner === l.humanSide ? 'won' : 'lost';
            return (
              <tr key={i}>
                <th scope="row">{i === 0 ? '1st' : '2nd'} battle <small>as {s.players[l.humanSide].army}</small></th>
                <td className={`match-outcome is-${outcome}`}>{OUTCOME[outcome]}</td>
                <td className="match-n">{l.banners[l.humanSide]}</td>
                <td className="match-n">{l.banners[other(l.humanSide)]}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td />
            <td className={`match-n${you > ai ? ' is-ahead' : ''}`}>{you}</td>
            <td className={`match-n${ai > you ? ' is-ahead' : ''}`}>{ai}</td>
          </tr>
        </tfoot>
      </table>
      <p className="match-verdict">{verdict}.</p>
    </section>
  );
}

/**
 * The end-of-battle dialog's body: why it ended, a banner scoreboard (the human's army first, the winner marked), the
 * turns played, a medal the battle earned for the human's side (Triumphs), after the second battle of a both-sides match the two summed up, and Play again / Switch sides /
 * Return to menu.
 */
export function BattleResult(p: {
  state: GameState;
  human: Side;
  over: { winner: Side | 'draw'; reason: string; newMedal?: MedalKind };
  onExit: () => void;
  /** After the battle: play it again, with the same or switched sides. */
  onRematch?: (switchSides: boolean) => void;
  /** This was the second battle of a both-sides match: how the first one ended. */
  firstLeg?: LegResult;
}) {
  const { state: s, human, over, onRematch, firstLeg } = p;
  const me = s.players[human];
  const them = s.players[other(human)];
  const turns = s.turn.number;
  return (
    <div className="victory">
      <p className="victory-reason">{over.reason}.</p>
      <div className="victory-score">
        {[human, other(human)].map((side) => {
          const pl = s.players[side];
          const won = Math.max(0, bannerTotal(s, side)); // banners held through objectives count too (§18.4)
          const empty = Math.max(0, s.bannersToWin - won);
          return (
            <div
              key={side}
              className={`victory-row${over.winner === side ? ' is-winner' : ''}`}
              role="group"
              aria-label={`${pl.army}: ${won} of ${s.bannersToWin} banners`}
            >
              <span className="victory-army">
                {pl.army}
                {side === human && <small> (you)</small>}
              </span>
              <span className="victory-banners">
                {Array.from({ length: won }, (_, i) => (
                  <BannerIcon key={i} className="victory-banner is-won" blockColor={s.players[other(side)].blocks} size={18} />
                ))}
                {Array.from({ length: empty }, (_, i) => <EmptyBanner key={`e${i}`} />)}
              </span>
              <span className="victory-count">{won}</span>
            </div>
          );
        })}
      </div>
      <p className="victory-turns">{turns} {turns === 1 ? 'turn' : 'turns'} played</p>
      {over.newMedal && (
        <p className="victory-medal">
          <Medal standing={over.newMedal} size={32} />
          <span>New medal: <b>{over.newMedal}</b>, for beating the {MEDAL_LEVEL[over.newMedal]} as {me.army}</span>
        </p>
      )}
      {firstLeg && firstLeg.humanSide !== human && <MatchSummary state={s} legs={[firstLeg, legResult(s, human, over.winner)]} />}
      <div className="victory-actions">
        {onRematch && (
          <>
            <Button onClick={() => onRematch(false)}>Play again<small className="victory-as">as {me.army}</small></Button>
            <Button onClick={() => onRematch(true)}>Switch sides<small className="victory-as">as {them.army}</small></Button>
          </>
        )}
        <Button variant={onRematch ? 'secondary' : 'primary'} className="victory-menu" onClick={p.onExit}>Return to menu</Button>
      </div>
    </div>
  );
}
