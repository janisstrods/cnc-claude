import { useState, type JSX } from 'react';
import {
  CARD_DEFS, ELITES, EXPANSIONS, SIDES, UNIT_STATS, UNIT_TYPES,
  type ArmyLook, type Blocks, type CardKind, type EliteId, type Expansion as Box, type ExpansionNumber, type UnitType,
} from '../../engine';
import { SCENARIOS, type ScenarioInfo } from '../../scenarios';
import { UnitIcon } from '../../art';
import { CardView, DieView } from '../kit';
import { unitCardLines } from '../game/unitText';
import './screens.css';

/** The general tabs (the base game's rules), then one per expansion. */
type Tab = 'basics' | 'units' | 'combat' | 'terrain' | 'cards' | Exclude<Box, 'base'>;

/**
 * The unit types a box brings (`UnitStats.expansion`), in table order: the base game's in the Units tab, an expansion's in
 * its own tab.
 */
export function unitTypesOf(box: ExpansionNumber): UnitType[] {
  return UNIT_TYPES.filter((t) => UNIT_STATS[t].expansion === box);
}

/**
 * The elite presets an expansion's tab lists (`EliteDef.expansion`), in table order. Elite presets come with Expansion #1,
 * whose tab also lists the base game's Sacred Band.
 */
export function elitesOf(box: ExpansionNumber): EliteId[] {
  return (Object.keys(ELITES) as EliteId[]).filter((id) => Math.max(ELITES[id].expansion, 1) === box);
}

/**
 * Figure look of a unit card: the base types are drawn Roman, an expansion type as the army that fields most of them in
 * one battle (the earliest such battle on a tie).
 */
function cardLook(t: UnitType): [ArmyLook, Blocks] {
  let look: [ArmyLook, Blocks] = ['roman', 'rom'];
  if (UNIT_STATS[t].expansion === 0) return look;
  let most = 0;
  for (const sc of SCENARIOS) {
    for (const side of SIDES) {
      const n = sc.setup.units.filter((u) => u.side === side && u.type === t).length;
      if (n > most) [most, look] = [n, [sc.setup[side].look, sc.setup[side].blocks]];
    }
  }
  return look;
}

/** The tabs in order, with their labels: the general tabs, then each expansion under its name (`EXPANSIONS`). */
const TABS: readonly [Tab, string][] = [
  ['basics', 'How to play'],
  ['units', 'Units'],
  ['combat', 'Combat'],
  ['terrain', 'Terrain'],
  ['cards', 'Command cards'],
  ...EXPANSIONS.flatMap((e): [Tab, string][] => (e.id === 'base' ? [] : [[e.id, e.name]])),
];

/** The body of each tab. */
const TAB_BODY: Record<Tab, () => JSX.Element> = {
  basics: Basics, units: Units, combat: Combat, terrain: Terrain, cards: Cards, exp1: Expansion, exp2: Expansion2, exp3: Expansion3,
};

/** In a battle, pass its scenario to show that battle's special rules above the tabs. */
export function RulesReference({ scenario }: { scenario?: ScenarioInfo } = {}) {
  const [tab, setTab] = useState<Tab>('basics');
  const Body = TAB_BODY[tab];
  return (
    <div className="rules">
      {scenario && scenario.specialText.length > 0 && (
        <section className="rules-battle">
          <h3>Special rules: {scenario.name}</h3>
          <ul>
            {scenario.specialText.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>
      )}
      <nav className="rules-tabs">
        {TABS.map(([t, label]) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{label}</button>
        ))}
      </nav>
      <div className="rules-body">
        <Body />
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
      <p>Click to select; hover a unit for its stats, any hex for what its terrain does, and a card to preview it. Keys: <b>1–6</b> pick a card, <b>Enter</b> confirms the highlighted action, <b>Esc</b> clears a selection. Click the board while the enemy moves to speed up the animation.</p>
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
        const [look, blocks] = cardLook(t);
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
      <UnitCards types={unitTypesOf(0)} />
      <p className="rules-note">Light bow cavalry, camels and heavy war machines come with Expansion #1, Barbarian light chariots with Expansion #2: see their tabs.</p>
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
    ['Marsh', 'Stops movement; a unit leaving it moves only 1 hex. Roll a die for a lost block on entry. Close combat in or out: max 2 dice; firing out: max 1 die. Heavy war machines may not enter.'],
    ['Broken ground', 'Mounted units stop and may not battle that turn. Max 2 dice in close combat. Heavy war machines may not enter.'],
    ['Fortified camp', 'Foot defending ignore one sword and one flag (a unit that attacked out of the camp gets neither against the battle back). Units in a camp roll one die fewer. Blocks line of sight.'],
    ['Lake / steep hills', 'Impassable.'],
  ];
  return (
    <>
      <TerrainTable rows={rows} />
      <p className="rules-note">Sea, ramparts and the ford without dice limits come with Expansion #1; ditches, very steep hills and the coast played as a ford with Expansion #2; city walls, walled towns and steep slopes with Expansion #3: see their tabs.</p>
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

/** Reference wording of each elite preset's abilities (§17.1, §18.2). */
const ELITE_REF: Record<EliteId, string> = {
  carthSacredBand: 'Every helmet it rolls in close combat hits, leader or not; may ignore 1 flag.',
  thebanSacredBand: 'Every helmet it rolls in close combat hits, leader or not; may ignore 1 flag.',
  silverShields: 'Every helmet it rolls in close combat hits, leader or not; may ignore 1 flag.',
  companions: 'Ignores the first sword rolled against it in close combat; may ignore 1 flag.',
  immortals: 'Fires like a missile unit, range 3 (1 die after moving); never fires and fights in the same turn. Not light.',
  bowAuxilia: 'Fires at range 3 instead of 2; as auxilia it cannot fire after moving 2 hexes.',
  tenthLegion:
    "Caesar's favourite legion: throws the pilum and may march; otherwise an ordinary heavy infantry unit (5 dice, retreat 1, no flag or helmet ability). The two units at the Sabis are ordered and fight separately.",
};

/**
 * The battles that field an elite preset, from the scenario data: "104", "113, 114", "107–111" (three or more in a row),
 * "002 (base game)".
 */
function eliteBattles(id: EliteId): string {
  const runs: ScenarioInfo[][] = [];
  for (const sc of SCENARIOS) {
    if (!sc.setup.units.some((u) => u.elite === id)) continue;
    const run = runs[runs.length - 1];
    if (run && Number(sc.id) === Number(run[run.length - 1].id) + 1) run.push(sc);
    else runs.push([sc]);
  }
  const ids = runs.flatMap((r) => (r.length >= 3 ? [`${r[0].id}–${r[r.length - 1].id}`] : r.map((sc) => sc.id))).join(', ');
  return runs.every((r) => r.every((sc) => sc.expansion === 'base')) ? `${ids} (base game)` : ids;
}

/** The elite presets of an expansion: name, unit types, battles and abilities. */
function EliteTable({ ids }: { ids: readonly EliteId[] }) {
  return (
    <table className="terrain-table">
      <tbody>
        {ids.map((id) => (
          <tr key={id}>
            <th>{ELITES[id].name}<div className="muted rules-sub">{ELITES[id].types.map((t) => UNIT_STATS[t].name).join(', ')} · {eliteBattles(id)}</div></th>
            <td>{ELITE_REF[id]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Expansion #1 tab: new units, elites, leader traits, terrain and the battles' special rules (§15–§17). */
export function Expansion() {
  const terrain: [string, string][] = [
    ['Sea', 'Impassable, like a lake, for every move, retreat and evade. Does not block line of sight.'],
    ['Steep hills', 'Impassable and block line of sight (101 Marathon, 113 Paraitacene).'],
    ['Rampart', 'A wall along some sides of the hex (hover the hex to see which). A foot unit on it, attacked from across a walled side, ignores 1 sword and may ignore 1 flag; fired at through a walled side, it may ignore 1 flag. It helps only the defender, never a unit that attacked out of it (so not against the battle back); mounted units and lone leaders gain nothing. No effect on movement, line of sight or dice.'],
    ['Ford, no dice limit', 'The Pinarus (108 Issus): a fordable river without the 2-dice close-combat and 1-die firing limits. Units entering it still stop.'],
  ];
  return (
    <div className="rules-text">
      <p><i>Greece &amp; Eastern Kingdoms</i> adds 24 battles (101–124), from Marathon to Pydna, with three new unit types, elite units, leader traits and new terrain. Everything in the other tabs still applies unless a rule here says otherwise.</p>
      <h3>New units</h3>
      <UnitCards types={unitTypesOf(1)} />
      <ul>
        <li><b>Light bow cavalry</b> are light and mounted for the cards (Order Light Troops, Move-Fire-Move, Order Mounted, Mounted Charge), but cannot pass through friendly units.</li>
        <li><b>Camels</b> are medium and mounted, but not cavalry: they take no extra hex after an advance. Cavalry and chariots fighting a camel lose one blue-triangle hit from each roll, and every flag a camel rolls drives them back one extra hex, as an elephant's does.</li>
        <li><b>Heavy war machines</b> are heavy foot for the cards. After moving they may neither fire nor fight that turn. When one evades, only red squares hit it, and it is then removed from the board without a banner.</li>
        <li>An elephant rolls 2 dice against light bow cavalry and war machines, 3 against camels.</li>
      </ul>
      <h3>Elite units</h3>
      <p>An elite is an ordinary unit carrying a special marker (a standard on its figures). It keeps its abilities until its last block is lost, and they add to leaders and support.</p>
      <EliteTable ids={elitesOf(1)} />
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

/** Expansion #2 tab: the new unit, the legions, Caesar and Spartacus, battle objectives, battle rules and terrain (§18–§19). */
export function Expansion2() {
  const terrain: [string, string][] = [
    ['Ditch', 'Every unit and lone leader stops on entering (212 Bruttium). No other effect: no dice limits, battle allowed, no line-of-sight block.'],
    ['Very steep hills', 'At Cefn Carnedd (223) every hill: a unit climbing onto one from lower ground stops and may not battle that turn, and an advance up one gives no bonus combat. Close combat: uphill at most 1 die, downhill 2, hill to hill 3; card and leader bonuses add on top. Ranged combat and line of sight as usual.'],
    ['Coast played as a ford', 'The British shore (217): drawn as sea, played as a fordable river. Units entering it stop; close combat in or out at most 2 dice, firing out at most 1 die.'],
    ['Rampart breakers', 'At Cefn Carnedd the Briton ramparts are torn down (open ground) as soon as a Roman unit enters or passes through one, moving, advancing, retreating or evading.'],
    ['Removed camps', 'A camp the battle removes once captured becomes open ground.'],
  ];
  return (
    <div className="rules-text">
      <p><i>Rome &amp; the Barbarians</i> adds 23 battles (201–223), from the Gallic invasion of 225 BC to the war in Britain in AD 51: Gauls, Germans, Spartacus' slaves, Belgae and Britons against the legions. Everything in the other tabs still applies unless a rule here says otherwise.</p>
      <h3>New unit</h3>
      <UnitCards types={unitTypesOf(2)} />
      <ul>
        <li><b>Barbarian light chariots</b> count as light troops and as mounted units for the cards. At full strength they roll 3 dice and may ignore 1 flag. They ignore one sword hit in every close combat and can always evade. After a winning combat they may advance and make a bonus attack, but never take the cavalry's extra hex. They cannot be rallied.</li>
        <li>An elephant rolls 2 dice against Barbarian light chariots.</li>
      </ul>
      <h3>The legions</h3>
      <ul>
        <li><b>Marian legions</b> (206–223): every Roman medium and heavy infantry unit throws the pilum. In 201–205, before Marius' reforms, the Romans have no pilum.</li>
        <li><b>Pilum:</b> range 2, always 1 die, whether the unit stood or moved 1 hex; not after moving 2 hexes. It is ranged combat in every other way: not while next to an enemy, never in the same turn as close combat, twice with Darken the Sky. The unit is not light troops, and from a fortified camp it cannot throw (1 die − 1 = none).</li>
        <li><b>March:</b> the unit may move 2 hexes if it does not battle that turn, or 1 hex and battle. With Double Time: 2 hexes and battle, never 3.</li>
      </ul>
      <EliteTable ids={elitesOf(2)} />
      <h3>Leaders</h3>
      <ul>
        <li><b>Julius Caesar</b> (215, 217, 218): the unit he is attached to rolls one extra die in every close combat, as Alexander's. <b>Forced march:</b> an infantry unit that has Caesar with it when it begins its move may move 2 hexes and still battle (terrain still stops it, Line Command still allows 1 hex, and a pilum unit still cannot throw after 2 hexes).</li>
        <li><b>Spartacus</b> (208, 210–214): while he is on the board, his side's I Am Spartacus rolls 2 more dice, also when a Counter Attack copies it.</li>
      </ul>
      <h3>Battle objectives</h3>
      <p>Some battles add objectives that score banners on top of eliminated units and leaders. They are marked on the board; hover a marked hex to see what it scores. Only units count, never lone leaders, and a unit merely passing through counts for nothing.</p>
      <ul>
        <li><b>Capture</b> (pennants): a camp is taken once, by a unit standing on it at the start of its side's turn (in 011 and 114: ending its move there). Its banners are kept; some camps are then removed.</li>
        <li><b>Hold</b> (204, 213, 214, 222): 1 banner for each marked hex a unit of that side stands on, up to a limit.</li>
        <li><b>Hill control</b> (202 Telamon): at the end of every turn, the side with more units on the hills holds 2 banners; a tie gives them to nobody.</li>
        <li><b>Section clear</b> (219): at the end of each Roman turn every section without a Briton unit scores 1 banner, lost as soon as a Briton unit enters it.</li>
        <li><b>Exit</b> (arrows; 010, 210, 212, 221): a unit on a marked edge hex may leave the battlefield as one more hex of movement. It scores 1 banner and is removed, with its leader; the enemy scores nothing.</li>
      </ul>
      <p><b>Held banners</b> (hold, hill control, section clear) are drawn hatched on the banner track: they count toward victory, but are lost the moment the position lapses and can be regained later. A side wins as soon as its permanent and held banners together reach the target; losing a held banner afterwards does not undo the win.</p>
      <h3>Battle rules</h3>
      <ul>
        <li><b>Ambush</b> (206 Aquae Sextiae): Marcellus' force waits off the board. When the Romans play a Leadership card or Order Light Troops, even on the first turn, they may spring it instead of ordering units: it enters on empty hexes of the German baseline in the card's section (any section for Leadership Any Section and Order Light Troops), then moves and battles.</li>
        <li><b>Separate commands</b> (210 Picenum): the Roman army is two commands, Lentulus' (grey bases) and Gellius'; each unit shows its commander's initial. One card orders one army only, whatever the card: for Clash of Shields, Darken the Sky, Rally and I Am Spartacus you name the command first. Leaders belong to no command.</li>
        <li><b>Rolling Fire</b> (210): a Slave infantry unit on a hill that has not moved, ordered by a card that is not a Tactic card, may use its battle to roll burning logs downhill, even next to an enemy. Select it, click <i>Rolling Fire</i>, then click the path hex by hex. Each step goes one row down toward the Roman edge, never onto a hill; the path runs 3 hexes or ends at the first hex that is not open ground. Every unit in the path, friend or foe, is rolled 2 dice: only its own symbol hits, no flag may be ignored and nobody battles back. Then the rolling unit loses 1 block.</li>
        <li><b>Last-row retreat</b> (214 Silarus): a Slave unit whose retreat ends on its own baseline row with hexes it could not take is eliminated instead of losing blocks. Evades, and a retreat that ends by joining a leader, are not affected.</li>
      </ul>
      <h3>Terrain</h3>
      <TerrainTable rows={terrain} />
    </div>
  );
}

/**
 * Expansion #3 tab: the legions of the civil wars, Caesar, city walls and towns, hills under camps and walls, steep slopes,
 * the new objectives and the battle rules (dice orders, reinforcements, immobile units, hand growth, commands; §18.2–§18.11,
 * §20). Paraphrased; no new unit types.
 */
export function Expansion3() {
  const terrain: [string, string][] = [
    ['City wall', 'The walls of Gergovia (308) and Ilerda (309). Only foot units (not war machines) and lone leaders may climb onto one, and only by a move that begins on a hex next to it; that move ends there, and a unit that starts its move on a wall moves at most 1 hex. Mounted units and war machines never enter a wall, not even by a retreat or an advance, and may attack a unit on one only if they began the turn next to it.'],
    ['Fighting on a wall', 'Any close combat in which either unit stands on a wall: at most 2 dice, card and leader bonuses (Caesar\'s die too) added on top. A foot unit defending on a wall ignores 1 sword, may ignore 1 flag (also 1 flag from missiles) and strikes first: it battles back before the attacker rolls, unless the attacker stands on a wall as well. An attacker that survives in its hex then attacks normally, and the defender does not battle back again.'],
    ['Wall and sight', 'A wall blocks line of sight, except between units standing on the same stretch of wall.'],
    ['Impassable walls and towns', 'The Wall of Rome (301) and the towns of Lauron (303) and Valentia (304): nothing may enter them, and they block line of sight.'],
    ['Camp or wall on a hill', 'At Gergovia the Gallic camps and the walls stand on the heights. The hex is both: the hill limits apply in close combat (a camp\'s −1 die comes after them), and it blocks line of sight even between units on the same hill. A camp removed there leaves the hill.'],
    ['Steep slopes', 'At Gergovia, where a hill (or a camp or wall on one) meets a forest: nothing climbs from the forest up onto the hill (no move, advance, retreat or evade), and no close combat crosses the hexside either way. Going down into the forest is allowed. Hover a hex to see its slopes.'],
  ];
  return (
    <div className="rules-text">
      <p><i>The Roman Civil Wars</i> adds 19 battles (301–319), from Sulla at the Colline Gate in 82 BC to Caesar at Munda in 45 BC: Romans against Samnites, Sertorius in Spain, Caesar in Gaul and the war between Caesar and Pompey&apos;s party. Often both armies are Roman: grey blocks against red. There are no new unit types. Everything in the other tabs still applies unless a rule here says otherwise.</p>
      <h3>The legions</h3>
      <ul>
        <li><b>Marian legions</b> (301–305, both armies): every medium and heavy infantry unit of the side throws the pilum (range 2, always 1 die, not after moving 2 hexes), Samnites and Sertorians included.</li>
        <li><b>Julian legions</b> (306–319 except 310, the sides each battle names): the pilum and the march. A unit may move 2 hexes if it does not battle at all that turn, or 1 hex and battle. Line Command still allows 1 hex; Double Time gives 2 hexes and close combat, never 3.</li>
        <li><b>Julius Caesar</b> (306–309, 314–319): +1 close combat die for his unit, also in its first strike from a wall. An infantry unit that has him with it when its move begins may move 2 hexes and still close combat, but a pilum unit never throws after 2 hexes.</li>
      </ul>
      <h3>Terrain</h3>
      <TerrainTable rows={terrain} />
      <h3>Battle objectives</h3>
      <p>As in Expansion #2, hover a marked hex to see what it scores. New here:</p>
      <ul>
        <li><b>Ship markers</b> (313 Brindisi Raid, ships on the coast): a side with a unit on an enemy ship marker at the start of its turn takes it for 1 banner. The marker blocks nothing and the hex does not change.</li>
        <li><b>Leaders score at the exit</b> (317 Ruspina, arrows with a gold medallion): every Caesarian unit and every leader that leaves by the Numidian baseline scores 1 banner, so a unit leaving with its leader scores 2, and a lone leader may leave too.</li>
        <li><b>The hillock</b> (309 Ilerda): only the Caesarians can hold it: 1 banner while they have more units on its three hills than the Pompeians, lost the moment they do not.</li>
        <li><b>Camps in order</b> (308, 309): some battles score only from the second camp taken; the hover text says which.</li>
      </ul>
      <h3>Battle rules</h3>
      <ul>
        <li><b>Dice orders</b> (310 Utica): the Numidians hold no cards. At the start of each of their turns they roll 2 order dice. Each flag makes one of their own units, their choice, fall back as for one flag that cannot be ignored; each crossed swords costs one of their units a block. Then each green, blue or red die orders one unit of that class anywhere on the board, and a helmet orders Saburra with his unit; a die with nothing to order is lost. The Numidian player, human or computer, makes every choice. A Caesarian Counter Attack has no card to copy and orders nothing.</li>
        <li><b>Reinforcements</b> (308 Gergovia): Vercingetorix and four Gallic units wait off the board. When the Gauls play a Leadership card, from the first turn, they may bring them in instead of ordering units: they enter on the empty marked Entry hexes, Vercingetorix with one of them, and may battle but not move that turn. At the start of the next Roman turn, before the card, the Roman player must place an extra medium infantry unit on an empty hex of his left baseline.</li>
        <li><b>Immobile recruits</b> (306 Bibracte, marked with an anchor): the two Roman auxiliaries in the camps never move or advance, but are ordered, fire, fight and battle back, and retreat when flags force them.</li>
        <li><b>A growing hand</b> (313): the Caesarians start with 2 cards and draw 2 after each turn, gaining 1 Command each time, until they hold 5.</li>
        <li><b>Two commands</b> (304 Valentia): the Sertorian army is Herennius&apos; command and Perpenna&apos;s (light-blue blocks); each unit shows its commander&apos;s initial. Every card orders units of one command only, and here each leader belongs to his own command, so a Leadership card must use a leader of the command it orders. If that command has none of the troops a card names, the card orders 1 unit of it instead.</li>
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
