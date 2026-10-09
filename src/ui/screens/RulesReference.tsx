import { useState } from 'react';
import { CARD_DEFS, UNIT_STATS, UNIT_TYPES, type CardKind } from '../../engine';
import { UnitIcon } from '../../art';
import { CardView, DieView } from '../kit';
import './screens.css';

type Tab = 'basics' | 'units' | 'combat' | 'terrain' | 'cards';

export function RulesReference() {
  const [tab, setTab] = useState<Tab>('basics');
  const tabs: [Tab, string][] = [
    ['basics', 'How to play'],
    ['units', 'Units'],
    ['combat', 'Combat'],
    ['terrain', 'Terrain'],
    ['cards', 'Command cards'],
  ];
  return (
    <div className="rules">
      <nav className="rules-tabs">
        {tabs.map(([t, label]) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{label}</button>
        ))}
      </nav>
      <div className="rules-body">
        {tab === 'basics' && <Basics />}
        {tab === 'units' && <Units />}
        {tab === 'combat' && <Combat />}
        {tab === 'terrain' && <Terrain />}
        {tab === 'cards' && <Cards />}
      </div>
    </div>
  );
}

function Basics() {
  return (
    <div className="rules-text">
      <h3>Goal</h3>
      <p>Be the first to capture the number of <b>Victory Banners</b> the battle requires. You win a banner for every enemy unit you destroy and every enemy leader you kill (some battles add objectives).</p>
      <h3>Your turn</h3>
      <ol>
        <li><b>Play a command card.</b> It tells you where (left, center or right section) and how many units you may order. The two dotted lines split the battlefield; hexes on a line belong to both sections.</li>
        <li><b>Order units</b> — click them on the board, then confirm.</li>
        <li><b>Move</b> the ordered units one at a time.</li>
        <li><b>Battle</b> with the ordered units: close combat against an adjacent enemy, or ranged fire with missile troops.</li>
        <li>You automatically <b>draw</b> a new card.</li>
      </ol>
      <h3>Leaders</h3>
      <p>A leader in a unit's hex is attached: the unit may ignore one retreat flag and scores a hit on every helmet it rolls in close combat (units next to a leader also score helmets). A foot unit with a leader may make a bonus attack after a winning charge. When a unit with a leader loses blocks, the leader may be killed (two helmets on two dice).</p>
      <h3>Tips</h3>
      <ul>
        <li>Units with <b>two friendly neighbours</b> are <i>supported</i> and ignore one flag — keep your lines together.</li>
        <li>A unit that cannot retreat loses a block for every hex it cannot fall back — beware your own baseline.</li>
        <li>Light troops should skirmish and evade; heavy infantry wins close fights but moves only one hex.</li>
        <li>Save strong cards (Clash of Shields, Mounted Charge, Double Time) for the moment many units are in contact.</li>
      </ul>
      <h3>Controls</h3>
      <p>Click to select; hover a unit for its stats and a card to preview it. Keys: <b>1–6</b> pick a card, <b>Enter</b> confirms the highlighted action, <b>Esc</b> clears a selection. Click the board while the enemy moves to speed up the animation.</p>
    </div>
  );
}

function Units() {
  return (
    <div className="rules-units">
      {UNIT_TYPES.map((t) => {
        const st = UNIT_STATS[t];
        return (
          <div key={t} className="unit-card">
            <svg width={64} height={64} viewBox="-30 -34 60 60">
              <UnitIcon type={t} look="roman" blockColor="rom" size={54} />
            </svg>
            <div>
              <div className="unit-card-title">{st.name} <span className={`cls cls-${st.cls}`}>{st.cls}</span></div>
              <div className="unit-card-line">
                {st.blocks} blocks · move {t === 'WA' ? '1 (2 to charge)' : t === 'AX' ? '1 (2 without battle)' : st.move}
                {' · '}close combat {t === 'EL' ? 'as enemy' : st.cc}{st.ccBack !== st.cc && t !== 'EL' ? `/${st.ccBack} back` : ''}
                {st.range ? ` · range ${st.range}` : ''} · retreat {st.retreat}
              </div>
              <div className="unit-card-line muted">
                {st.evade === 'always' ? 'Evades any attack.' : st.evade === 'never' ? 'Cannot evade.' : st.evade === 'vsFootElephant' ? 'Evades foot and elephants.' : 'Evades foot and heavy mounted.'}
                {!st.swordHits ? ' Swords do not score hits.' : ''}
                {t === 'WA' ? ' +1 die and ignores a flag at full strength.' : ''}
                {t === 'EL' ? ' Ignores swords, re-rolls its own swords, frightens horses, rampages on retreat.' : ''}
                {t === 'HCH' ? ' Ignores one sword hit.' : ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Combat() {
  return (
    <div className="rules-text">
      <h3>The battle dice</h3>
      <div className="dice-legend">
        <span><DieView face="light" size={30} /> hits light units</span>
        <span><DieView face="medium" size={30} /> hits medium units</span>
        <span><DieView face="heavy" size={30} /> hits heavy units</span>
        <span><DieView face="swords" size={30} /> hits in close combat (not for light troops)</span>
        <span><DieView face="leader" size={30} /> hits if a leader is with or next to the attacker</span>
        <span><DieView face="flag" size={30} /> forces a retreat</span>
      </div>
      <h3>Close combat</h3>
      <p>Attack an adjacent enemy. Light units and some cavalry may <b>evade</b> instead (only their own symbol can hit them). If the defender survives in place, it <b>battles back</b>. If you destroy it or drive it off, you may <b>advance</b> into its hex; cavalry may move one more hex, and cavalry, chariots, elephants, warriors and foot units with a leader may then make one <b>bonus attack</b>.</p>
      <h3>Ranged combat</h3>
      <p>Missile troops fire at enemies 2-3 hexes away with 2 dice (1 if they moved). Only the target's own unit symbol hits; flags still cause retreats. Units, forests, hills and camps block line of sight. A unit next to an enemy cannot fire.</p>
      <h3>Retreats</h3>
      <p>Each flag pushes a unit back toward its own baseline by its retreat distance. Flags can be ignored with an attached leader, two supporting neighbours, a camp, or full-strength warriors. Every hex a unit cannot retreat costs a block.</p>
    </div>
  );
}

function Terrain() {
  const rows: [string, string][] = [
    ['Hill', 'Attacking uphill: at most 2 dice. Attacking downhill or across a hill: foot 3, mounted 2. Blocks line of sight beyond it.'],
    ['Forest', 'Stops movement. Only light foot, auxilia and warriors may battle after entering. Close combat in or out: max 2 dice. Ranged fire into it: max 1 die. Blocks line of sight.'],
    ['River', 'Impassable unless the battle says it is fordable.'],
    ['Fordable river', 'Stops movement. Close combat in or out: max 2 dice; firing out: max 1 die.'],
    ['Marsh', 'Stops movement; roll a die for a lost block on entry. Max 2 dice in close combat.'],
    ['Broken ground', 'Mounted units stop and may not battle that turn. Max 2 dice in close combat.'],
    ['Fortified camp', 'Foot defending ignore one sword and one flag. Units in a camp roll one die fewer. Blocks line of sight.'],
    ['Lake / steep hills', 'Impassable.'],
  ];
  return (
    <table className="terrain-table">
      <tbody>
        {rows.map(([a, b]) => (
          <tr key={a}><th>{a}</th><td>{b}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

function Cards() {
  const kinds = Object.keys(CARD_DEFS) as CardKind[];
  return (
    <div className="rules-cards">
      {kinds.map((k) => (
        <div key={k} className="rules-card">
          <CardView kind={k} size="sm" />
          <div>
            <div className="unit-card-title">{CARD_DEFS[k].title} <span className="muted">×{CARD_DEFS[k].count}</span></div>
            <div className="unit-card-line">{CARD_DEFS[k].text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
