import { useState } from 'react';
import { CARD_DEFS, ELITES, UNIT_STATS, UNIT_TYPES, type ArmyLook, type Blocks, type CardKind, type EliteId, type UnitType } from '../../engine';
import { UnitIcon } from '../../art';
import { CardView, DieView } from '../kit';
import { unitCardLines } from '../game/uiModel';
import './screens.css';

type Tab = 'basics' | 'units' | 'combat' | 'terrain' | 'cards' | 'exp1';

/** Unit types new in Expansion #1 (§15): described in the Expansion #1 tab, not in the base Units list. */
export const EXP1_UNIT_TYPES: readonly UnitType[] = ['LBC', 'CAM', 'HWM'];
const BASE_UNIT_TYPES = UNIT_TYPES.filter((t) => !EXP1_UNIT_TYPES.includes(t));
/** Figure look of each Expansion #1 unit card (an army that fields it). */
const EXP1_LOOK: Partial<Record<UnitType, [ArmyLook, Blocks]>> = { LBC: ['scythian', 'eas'], CAM: ['seleucid', 'grk'], HWM: ['macedonian', 'grk'] };

export function RulesReference() {
  const [tab, setTab] = useState<Tab>('basics');
  const tabs: [Tab, string][] = [
    ['basics', 'How to play'],
    ['units', 'Units'],
    ['combat', 'Combat'],
    ['terrain', 'Terrain'],
    ['cards', 'Command cards'],
    ['exp1', 'Expansion #1'],
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
        {tab === 'exp1' && <Expansion />}
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

/** One card per unit type: icon, stats line, notes line (exported for the unit-text test). */
export function UnitCards({ types }: { types: readonly UnitType[] }) {
  return (
    <div className="rules-units">
      {types.map((t) => {
        const st = UNIT_STATS[t];
        const [statsLine, notesLine] = unitCardLines(t);
        const [look, blocks] = EXP1_LOOK[t] ?? ['roman', 'rom'];
        return (
          <div key={t} className="unit-card">
            <svg width={64} height={64} viewBox="-30 -34 60 60">
              <UnitIcon type={t} look={look} blockColor={blocks} size={54} />
            </svg>
            <div>
              <div className="unit-card-title">{st.name} <span className={`cls cls-${st.cls}`}>{st.cls}</span></div>
              <div className="unit-card-line">{statsLine}</div>
              <div className="unit-card-line muted">{notesLine}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Units tab: the base-game unit types (Expansion #1 types are in their own tab). */
export function Units() {
  return (
    <>
      <UnitCards types={BASE_UNIT_TYPES} />
      <p className="rules-note">Light bow cavalry, camels and heavy war machines come with Expansion #1: see the Expansion #1 tab.</p>
    </>
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
        <span><DieView face="swords" size={30} /> hits in close combat (not for light troops or war machines)</span>
        <span><DieView face="leader" size={30} /> hits if a leader is with or next to the attacker</span>
        <span><DieView face="flag" size={30} /> forces a retreat</span>
      </div>
      <h3>Close combat</h3>
      <p>Attack an adjacent enemy. Light units, some cavalry, camels and war machines may <b>evade</b> instead (only their own symbol can hit them). If the defender survives in place, it <b>battles back</b>. If you destroy it or drive it off, you may <b>advance</b> into its hex; cavalry may move one more hex, and mounted units (cavalry, chariots, elephants, camels), warriors and foot units with a leader may then make one <b>bonus attack</b>. War machines never advance or make bonus attacks.</p>
      <h3>Ranged combat</h3>
      <p>Missile troops fire at enemies within range (2–3 hexes; heavy war machines 6) with 2 dice, or 1 if they moved; a heavy war machine cannot fire at all after moving. Only the target's own unit symbol hits; flags still cause retreats. Units, forests, hills and camps block line of sight. A unit next to an enemy cannot fire.</p>
      <h3>Retreats</h3>
      <p>Each flag pushes a unit back toward its own baseline by its retreat distance. Flags can be ignored with an attached leader, two supporting neighbours, a camp, a rampart (only against attacks across a walled side), full-strength warriors, or an elite unit's ability. Every hex a unit cannot retreat costs a block.</p>
    </div>
  );
}

function Terrain() {
  const rows: [string, string][] = [
    ['Hill', 'Attacking uphill: at most 2 dice. Attacking downhill or across a hill: foot 3, mounted 2. Blocks line of sight beyond it.'],
    ['Forest', 'Stops movement. Only light foot, auxilia and warriors may battle after entering. Close combat in or out: max 2 dice. Ranged fire into it: max 1 die. Blocks line of sight.'],
    ['River', 'Impassable unless the battle says it is fordable.'],
    ['Fordable river', 'Stops movement. Close combat in or out: max 2 dice; firing out: max 1 die (not at the Pinarus, Expansion #1 battle 108).'],
    ['Marsh', 'Stops movement; roll a die for a lost block on entry. Max 2 dice in close combat. Heavy war machines may not enter.'],
    ['Broken ground', 'Mounted units stop and may not battle that turn. Max 2 dice in close combat. Heavy war machines may not enter.'],
    ['Fortified camp', 'Foot defending ignore one sword and one flag. Units in a camp roll one die fewer. Blocks line of sight.'],
    ['Lake / steep hills', 'Impassable.'],
  ];
  return (
    <>
      <TerrainTable rows={rows} />
      <p className="rules-note">Sea, ramparts and the ford without dice limits come with Expansion #1: see the Expansion #1 tab.</p>
    </>
  );
}

function TerrainTable({ rows }: { rows: [string, string][] }) {
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

/** Reference wording of each elite preset's abilities, and the battles that field it (§17.1). */
const ELITE_REF: Record<EliteId, [string, string]> = {
  carthSacredBand: ['Every helmet it rolls in close combat hits, leader or not; may ignore 1 flag.', '002 (base game)'],
  thebanSacredBand: ['Every helmet it rolls in close combat hits, leader or not; may ignore 1 flag.', '104'],
  silverShields: ['Every helmet it rolls in close combat hits, leader or not; may ignore 1 flag.', '113, 114'],
  companions: ['Ignores the first sword rolled against it in close combat; may ignore 1 flag.', '107–111'],
  immortals: ['Fires like a missile unit, range 3 (1 die after moving); never fires and fights in the same turn. Not light.', '108'],
  bowAuxilia: ['Fires at range 3 instead of 2; as auxilia it cannot fire after moving 2 hexes.', '123'],
};

/** Expansion #1 tab: new units, elites, leader traits, terrain and the battles' special rules (§15–§17). */
export function Expansion() {
  const terrain: [string, string][] = [
    ['Sea', 'Impassable, like a lake, for every move, retreat and evade. Does not block line of sight.'],
    ['Steep hills', 'Impassable and block line of sight (101 Marathon, 113 Paraitacene).'],
    ['Rampart', 'A wall along some sides of the hex (hover the hex to see which). A foot unit on it, attacked from across a walled side, ignores 1 sword and may ignore 1 flag; fired at through a walled side, it may ignore 1 flag. It helps only the defender; mounted units and lone leaders gain nothing. No effect on movement, line of sight or dice.'],
    ['Ford, no dice limit', 'The Pinarus (108 Issus): a fordable river without the 2-dice close-combat and 1-die firing limits. Units entering it still stop.'],
  ];
  return (
    <div className="rules-text">
      <p><i>Greece &amp; Eastern Kingdoms</i> adds 24 battles (101–124), from Marathon to Pydna, with three new unit types, elite units, leader traits and new terrain. Everything in the other tabs still applies unless a rule here says otherwise.</p>
      <h3>New units</h3>
      <UnitCards types={EXP1_UNIT_TYPES} />
      <ul>
        <li><b>Light bow cavalry</b> are light and mounted for the cards (Order Light Troops, Move-Fire-Move, Order Mounted, Mounted Charge), but cannot pass through friendly units.</li>
        <li><b>Camels</b> are medium and mounted, but not cavalry: they take no extra hex after an advance. Cavalry and chariots fighting a camel lose one blue-triangle hit from each roll, and every flag a camel rolls drives them back one extra hex, as an elephant's does.</li>
        <li><b>Heavy war machines</b> are heavy foot for the cards. After moving they may neither fire nor fight that turn. When one evades, only red squares hit it, and it is then removed from the board without a banner.</li>
        <li>An elephant rolls 2 dice against light bow cavalry and war machines, 3 against camels.</li>
      </ul>
      <h3>Elite units</h3>
      <p>An elite is an ordinary unit carrying a special marker (a standard on its figures). It keeps its abilities until its last block is lost, and they add to leaders and support.</p>
      <table className="terrain-table">
        <tbody>
          {(Object.keys(ELITES) as EliteId[]).map((id) => (
            <tr key={id}>
              <th>{ELITES[id].name}<div className="muted rules-sub">{ELITES[id].types.map((t) => UNIT_STATS[t].name).join(', ')} · {ELITE_REF[id][1]}</div></th>
              <td>{ELITE_REF[id][0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Leader traits</h3>
      <ul>
        <li><b>Alexander</b> (107–111): the unit he is attached to rolls one extra die in every close combat, on top of any terrain limit. Nothing in ranged combat, and nothing for units he is only next to.</li>
        <li><b>Persian satraps</b> (107 Granicus): a Leadership card played through a satrap orders only him and his own unit (the card may still order 1 unit of your choice instead). His helmets score only for his own unit. He still bolsters that unit against flags and still counts as support.</li>
      </ul>
      <h3>Terrain</h3>
      <TerrainTable rows={terrain} />
      <h3>Battle rules</h3>
      <p>Each battle's special rules are listed in its briefing when you choose it. The ones that change how a battle is played:</p>
      <ul>
        <li><b>112 Hellespont:</b> every leader killed costs his side a command card for the rest of the battle: killed on your own turn, you skip your next draw; killed on the enemy's turn, a random card from your hand is discarded at once. A side whose leaders have all been killed loses at once.</li>
        <li><b>114 Gabiene:</b> Antigonus' army gains a banner the first time one of its units ends a move on Eumenes' camp.</li>
        <li><b>116 Heraclea:</b> Roman infantry may not ignore flags rolled by elephants.</li>
        <li><b>117 Asculum:</b> before the first turn both sides place their leaders, the Romans first: on a unit of their own, or alone on an empty hex.</li>
        <li><b>120, 121, 124 — Roman Tactical Flexibility</b> (optional, switch it in the briefing): enemy heavy infantry with fewer than two friendly neighbours, and not on broken ground, battle back against Roman medium or heavy infantry with only 3 dice.</li>
      </ul>
    </div>
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
