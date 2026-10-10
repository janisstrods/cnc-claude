import { other, type GameState, type Side } from '../../engine';
import { BannerIcon, Button } from '../kit';

/** An empty banner slot, drawn for parchment (the kit's empty slot is made for dark leather). */
function EmptyBanner() {
  return (
    <svg className="victory-banner is-empty" viewBox="0 0 40 66" width={18} height={30} aria-hidden="true">
      <path d="M7 10 H33 V55 L20 46 L7 55 Z" fill="rgba(154,111,44,.08)" stroke="#a88248" strokeWidth="1.6" strokeDasharray="3 2.4" strokeLinejoin="round" />
      <rect x="4" y="7.4" width="32" height="3.2" rx="1.6" fill="#b89458" />
    </svg>
  );
}

/**
 * The end-of-battle dialog's body: why it ended, a banner scoreboard (the human's army first, the winner marked), the
 * turns played, and Rematch / Switch sides / Return to menu.
 */
export function BattleResult(p: {
  state: GameState;
  human: Side;
  over: { winner: Side | 'draw'; reason: string };
  onExit: () => void;
  /** After the battle: play it again, with the same or switched sides. */
  onRematch?: (switchSides: boolean) => void;
}) {
  const { state: s, human, over, onRematch } = p;
  const me = s.players[human];
  const them = s.players[other(human)];
  const turns = s.turn.number;
  return (
    <div className="victory">
      <p className="victory-reason">{over.reason}.</p>
      <div className="victory-score">
        {[human, other(human)].map((side) => {
          const pl = s.players[side];
          const won = Math.max(0, pl.banners);
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
      <div className="victory-actions">
        {onRematch && (
          <>
            <Button onClick={() => onRematch(false)}>Rematch<small className="victory-as">as {me.army}</small></Button>
            <Button onClick={() => onRematch(true)}>Switch sides<small className="victory-as">as {them.army}</small></Button>
          </>
        )}
        <Button variant={onRematch ? 'secondary' : 'primary'} className="victory-menu" onClick={p.onExit}>Return to menu</Button>
      </div>
    </div>
  );
}
