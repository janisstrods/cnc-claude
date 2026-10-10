# Commands & Colors: Ancients — Rules Reference (as implemented)

Condensed from the official rules (commandsandcolors.net, 5th+ edition wording). This file is the
authoritative spec for the engine, tests and AI. Where the official text is ambiguous the chosen
interpretation is marked **[Interp]**. §1–§14 describe the base game; §15–§17 add Expansion #1
(Greece & Eastern Kingdoms) and override §1–§14 where they say so.

## 1. Board

* 9 rows (0 = top) x 13 columns. Even rows have 13 hexes (c 0..12), odd rows 12 hexes (c 0..11),
  odd rows shifted right by half a hex ("odd-r" offset layout).
* Each army has a home edge: the **top** army's baseline is row 0, the **bottom** army's is row 8.
  "Toward own side" = toward own baseline (top army: row decreases, bottom army: row increases).
* Sections are relative to each player. Half-column index `x2 = 2*c + (r odd ? 1 : 0)` (0..24).
  From the **bottom** player's view: Left = `x2 <= 8`, Centre = `8 <= x2 <= 16`, Right = `x2 >= 16`.
  Hexes with x2 = 8 or 16 (even rows, c = 4 and c = 8) lie on a dotted line and belong to both sections.
  The **top** player's Left is the bottom player's Right and vice versa.

## 2. Units

Classes (dice symbol that hits them): **light** = green circle, **medium** = blue triangle, **heavy** = red square.

| Code | Unit | Class | Kind | Blocks | Move | CC dice | Ranged | Retreat/flag | Evade |
|---|---|---|---|---|---|---|---|---|---|
| LI | Light infantry | light | foot | 4 | 2 (battle) | 2, no sword hits | range 2 | 2 | always |
| LB | Light bow | light | foot | 4 | 2 (battle) | 2, no sword hits | range 3 | 2 | always |
| LS | Light sling | light | foot | 4 | 2 (battle) | 2, no sword hits | range 3 | 2 | always |
| AX | Auxilia | light (white border) | foot | 4 | 1 & battle, or 2 no battle | 3 (sword hits) | range 2 (not after moving 2) | **1** | never |
| WA | Warriors | medium (white border) | foot | 4 | 1, or 2 only if it then close combats | 3, +1 at full strength | — | **2** | never |
| MI | Medium infantry | medium | foot | 4 | 1 | 4 | — | 1 | never |
| HI | Heavy infantry | heavy | foot | 4 | 1 | 5 | — | 1 | never |
| LC | Light cavalry | light | mounted, cavalry | 3 | 4 | 2, no sword hits | range 2 | 4 | always |
| MC | Medium cavalry | medium | mounted, cavalry | 3 | 3 | 3 | — | 3 | vs foot & heavy mounted (HC, EL, HCH) |
| HC | Heavy cavalry | heavy | mounted, cavalry | 3 | 2 | 4 | — | 2 | vs foot & EL |
| EL | Elephants | heavy | mounted (not cavalry) | 2 | 2 | special | — | **1** | never |
| HCH | Heavy chariot | heavy | mounted (not cavalry) | 2 | 2 | 4 attacking, 3 battling back / First Strike | — | 2 | vs foot & EL |

* "Light units" for cards = LI, LB, LS, AX, LC. "Medium" = WA, MI, MC. "Heavy" = HI, HC, EL, HCH. Mounted = LC, MC, HC, EL, HCH.
  Expansion #1 adds LBC (light, mounted), CAM (medium, mounted) and HWM (heavy, foot for cards): see §15.
* Number of blocks never changes dice (except WA full-strength bonus).
* **Warriors**: at full strength (start of that combat) +1 CC die and may ignore 1 flag. Losing blocks in a combat
  where it later battles back still gives 4 dice for that battle back. A WA that moved 2 must close combat if any target.
* **Heavy chariot**: ignores 1 sword hit in CC.
* **Elephants**: CC dice = what the target unit would normally roll against it (base dice, no bonuses): LI/LB/LS/LC 2,
  AX 3, MI 4, HI 5, MC 3, HC 4; vs EL, WA, HCH: 3; vs lone leader: 1. Battle back uses the same table vs the attacker.
  Sword rolls score hits and each sword die is re-rolled (repeat while swords) unless the target ignores swords
  (an ignored sword is not re-rolled). Elephants never benefit from leaders (no helmet hits, no bolster, no support received)
  but can give support. Elephants ignore all sword hits. When a cavalry/chariot unit rolls against an elephant in CC,
  the elephant ignores 1 red-square hit and 1 flag. A cavalry/chariot unit forced to retreat by an elephant's flags
  retreats +1 hex per flag.
* **Sacred Band** (scenario 002 only): helmets always score hits in its CC; may ignore 1 flag; keeps these until eliminated.
  Expansion #1 generalises this to a table of elite units (Sacred Band, Silver Shields, Companions, ...): see §17.

## 3. Dice

6 faces, equal chance: light (green circle), medium (blue triangle), heavy (red square), helmet (leader), flag, swords.

**Ranged combat** hits: matching class symbol only. Versus a lone leader: a helmet eliminates him.
**Close combat** hits: matching class symbol; each sword (attacker not LI/LB/LS/LC, i.e. green without white border;
Expansion #1: also not LBC or HWM, §15);
each helmet if a friendly leader is attached to or adjacent to the battling unit (not for elephants; Sacred Band and the
other `helmetHits` elites always, §17).
**Evade**: only matching class symbols hit.
Flags never hit; they cause retreats (except against lone leaders and eliminated units).

## 4. Dice count

`dice = min(base, caps) - campPenalty + cardBonus` **[Interp]** order: caps first, then -1 camp, then card bonus.
The site's Units FAQ applies the camp −1 to the base dice before the caps (a full-strength warrior in a camp on a hill:
4 − 1 = 3, then the cap 3). The engine keeps its order for every battle so base play does not change (`design/exp3-rulings.md` Q19).
* Ranged base: 2 if the unit did not move this turn, 1 if it moved. AX that moved 2 cannot fire. (HWM cannot fire at all
  after moving, §15.)
* CC base: table above.
* Caps in close combat (either unit's hex, attacker's or defender's): forest 2, marsh 2, fordable river 2 (not a no-cap
  ford, §16), broken ground 2.
  Hills (CC only): attacking a unit that is on a hill from a non-hill hex: max 2 (any unit). Attacking from a hill to a
  non-hill hex, or hill to hill: foot max 3, mounted max 2. Battle back uses the same logic from the battling-back unit's side.
* Caps in ranged combat: target in forest: max 1; firer in marsh or fordable river: max 1 (not a no-cap ford, §16).
* Fortified camp: a unit on a camp hex rolls 1 fewer die when it battles. A foot unit on a camp ignores 1 sword hit in
  close combat (and may ignore 1 flag, see §10).
* Card bonus (only for ordered units, on the active turn): Clash of Shields +2 CC, Mounted Charge +1 CC (incl. bonus CC),
  I Am Spartacus +1 (CC and ranged). Bonuses are added after caps (cards "modify the maximum"). Alexander's +1 (§17) is
  added at the same step.

## 5. Turn

1. Play 1 card. 2. Order units/leaders. 3. Move (one unit at a time, all moves before any battle). 4. Battle (one unit
at a time, fully resolved). 5. Discard + draw 1 (a player who used First Strike this turn draws first). Deck empty ->
shuffle discards. Command = scenario hand size (may change during a scenario).

## 6. Ordering

* Only ordered units/leaders may move, battle or act. Each at most one order. Extra orders are lost.
* A leader in a unit's hex is attached; ordering the unit moves the leader with it (no extra cost).
* **Detach** (only on Section cards, Order Mounted, I Am Spartacus): an attached leader may be ordered separately
  (costs 1 order) and move away **before** his unit moves. A leader that attaches to a unit during movement stops; that
  unit may not move afterwards this turn (it may still battle).
* Units on a dotted-line hex may be ordered from either section.

## 7. Movement

* A unit may not enter or pass hexes containing any unit or an enemy leader. It may enter a hex with a lone friendly leader
  only if it has no attached leader; it stops there and the leader attaches.
* Exception: with Order Light Troops or Move-Fire-Move, light foot (LI, LB, LS, AX) may pass through (not end on) friendly units.
* Terrain: forest, marsh, fordable river: stop on entry (all units and lone leaders). Broken ground: mounted units and lone
  leaders stop. Leaving a marsh hex: the move may only be 1 hex. Impassable: river (non-fordable), lake, sea (§16), steep hill.
  Heavy war machines may not enter broken ground or marsh (§15).
* Battling after moving: per unit table; plus: a unit that entered a forest this turn cannot battle unless LI/LB/LS/AX/WA;
  a mounted unit that entered broken ground cannot battle.
* Leaders alone: move up to 3, may pass through friendly units/leaders, may not end on another friendly leader, may not
  enter enemy-occupied hexes. A lone leader entering marsh rolls 1 die: helmet = eliminated (banner), else stops.
  A unit entering marsh rolls 1 die: its class symbol = lose 1 block.
* No exiting the board (scenario exceptions: Castulo).

## 8. Ranged combat

* Units with missiles: LI, LB, LS, AX, LC. Range (hexes, counting target hex): LI/AX/LC 2, LB/LS 3.
  Expansion #1 adds LBC (range 3), HWM (range 6) and the ranged elites Immortals and bow auxilia (range 3): §15, §17.
* Not allowed against an adjacent enemy, and not allowed at all if the firer is adjacent to any enemy unit.
* Line of sight: centre-to-centre line; blocked by any intermediate hex containing a unit or leader (friend or foe) or
  blocking terrain (forest, camp, hill rules below). If the line runs exactly along a hexside, it is blocked only if both
  hexes beside it block. Terrain in the target hex never blocks.
* Hills: an intermediate hill hex blocks LOS, except when firer and target are both on the same (connected) hill.
* Target cannot battle back or evade. Leader casualty checks apply.

## 9. Close combat

Sequence for each attack (attacker = ordered unit adjacent to target unit or lone leader):
1. Declare target.
2. Defender options: **Evade** (if eligible), or play **First Strike** (if held), or stand.
3. Evade: attacker rolls its dice; only matching class symbols hit; then the evader moves 2 hexes toward its own side
   (1 only if that is the only possibility); cannot evade if both rear hexes are blocked (units, lone enemy leader,
   impassable, board edge). Stops if it enters a lone friendly leader's hex (attaches). No battle back, no momentum advance
   (even if eliminated).
4. First Strike: the defender battles first with its battle-back dice. If the attacker is eliminated or retreats the
   attack is over; otherwise the attacker attacks normally and the defender does not battle back.
5. Roll; remove blocks; leader casualty check; apply flags (defender chooses how many ignorable flags to ignore); retreat.
6. If the defender's hex was vacated by elimination or retreat (not by evading, not a lone leader) -> **momentum advance**
   (optional) into the vacated hex. Cavalry (LC, MC, HC; Expansion #1: also LBC) may then move 1 more hex (initial combat
   only). Then **bonus close combat** (optional) for: WA, foot with attached leader, any mounted unit — against any
   adjacent enemy. A HWM never makes a momentum advance or a bonus combat, even with a leader (§15).
   After a successful bonus combat the unit may advance into the vacated hex but not battle again.
   Terrain: advancing into forest: only LI/LB/LS/AX/WA may bonus combat; mounted advancing into broken ground cannot bonus;
   entering forest/marsh/ford/broken (mounted) ends the cavalry extra hex; advancing into marsh rolls the marsh check.
   A unit in a fordable river or marsh may advance out only if it did not move this turn.
7. Otherwise, if the defender survived and did not retreat (or could not complete its retreat) it may **battle back**
   (always taken: it can never hurt the defender **[Interp]**) against the attacker, with its own dice/caps; leader helmets count; attacker may need to
   retreat (attacker can ignore flags as usual). No battle back after an evade, a First Strike, or vs a lone leader.

## 10. Flags & retreat

* Ignorable flags (cumulative): attached leader (+1; if the unit lost blocks, only if the leader survived the check);
  supported by 2+ adjacent friendly units/lone leaders (+1; elephants never receive support); foot unit on camp (+1);
  full-strength WA (+1); Sacred Band (+1); elephant vs cavalry/chariot roller (+1). Ignoring is optional per flag.
  Expansion #1 adds: other elites with `ignoreFlag` (§17) and a foot defender behind a protected rampart edge (§16);
  Fright at First Sight (§17, scenario 116) forbids all ignoring of an elephant's flags by Roman foot.
* Each accepted flag: retreat its retreat distance (table). Cavalry/chariot vs elephant or camel: +1 hex per flag (§15).
* Each retreat step must move to one of the two hexes adjacent toward its own side. Cannot enter units, lone enemy
  leaders, impassable terrain or leave the board. Lone friendly leader hex: the unit stops there and the leader attaches
  (only if the unit has no attached leader). Terrain otherwise ignored, except marsh: roll the marsh check per marsh hex.
* Each hex of retreat that cannot be completed = 1 block lost. If a full retreat is possible it must be taken.
* Only one leader casualty check per combat sequence: if the unit is later eliminated by retreat losses in the same
  sequence, the leader simply evades.
* Attached leaders retreat with their unit.
* **Elephant rampage**: before an elephant retreats, roll 2 dice against every adjacent hex with a unit or lone leader
  (friend or foe; owner's opponent rolls for each side). Matching class symbol = 1 hit; helmet eliminates a lone leader,
  otherwise the lone leader must evade. Then the elephant retreats; if its path is blocked by units or a lone enemy leader
  it does not lose blocks: instead every unit/enemy leader in the blocked rear hexes loses 1 block per unfulfilled hex (a lone
  enemy leader is removed, banner). Blocked by board edge/impassable: elephant loses blocks normally. These losses are
  simultaneous: if both armies reach their final banner at once the battle is a draw.

## 11. Leaders

* Never units; never alone in combat. Benefits: helmets hit in CC for attached/adjacent non-elephant units; attached
  leader = ignore 1 flag; attached leader lets a foot unit bonus combat; lone leader counts as support.
* Casualty check when the attached unit loses blocks but survives: 2 dice, needs 2 helmets. Only once per combat sequence.
* Attached unit eliminated: 1 die, helmet kills; else the leader must evade.
* Lone leader attacked (ranged or CC): attacker's normal dice; 1 helmet kills; else he must evade. No momentum advance.
* Leader evade: 1-3 hexes toward own side; may pass friendly units/leaders; may not end on another friendly leader,
  impassable or enemy; may evade off own baseline (removed, no banner). If no hex at all -> eliminated (banner).
  Passing through an enemy unit = escape: that unit rolls its normal attack dice; any helmet kills. Third escape hex
  onto an enemy unit = eliminated. Ending on a friendly unit attaches him.
* Each eliminated leader = 1 banner for the opponent.

## 12. Command cards (60)

Section (27): Order Two Units Left/Centre/Right (3/4/3), Order Three Units Left/Centre/Right (3/4/3),
Order Four Units Left/Centre/Right (1/1/1), Out Flanked x2 (2 orders left + 2 right), Coordinated Attack x2
(1 order in each section). Section cards may order leaders (and detach them).

Troop (10): Order Light Troops x4 (≤ Command light units; light foot may pass through friendly units),
Order Medium Troops x3, Order Heavy Troops x2, Order Mounted x1 (≤ Command mounted units and/or leaders; may detach).
If the player has no unit of that kind on the board: order 1 unit of choice (not allowed if any exist).
Which Expansion #1 units count as light, medium, heavy, mounted, foot or missile units for the cards: §15.

Leadership (6): Inspired Left/Centre/Right Leadership x1 each — choose a leader in that section; order him, his unit,
and up to 4 more units/leaders in adjacent linked hexes (a chain: each ordered piece adjacent to another ordered piece,
chain starts adjacent to the leader; may cross sections). Leadership Any Section x3 — same with up to 3. Leaders may not
detach. Alternatively order 1 unit of choice (Inspired: in that section **[Interp]**; Any Section: anywhere).

Tactic (17):
* Clash of Shields x1 — every unit adjacent to an enemy unit is ordered; no movement; +2 CC dice; may momentum advance
  (bonus CC at normal dice); no ranged.
* Counter Attack x2 — repeat the opponent's last turn card (Left/Right swapped for Section and Inspired cards; Any Section
  stays and may use any leader **[Interp]**). Cannot copy First Strike. Bound by the same "if you have none, 1 unit" rule.
  A Counter Attack that copies a Leadership card counts as a Leadership order (e.g. for Mago's ambush) **[Interp]**.
* Darken the Sky x1 — every missile unit is ordered and may fire twice (each shot resolved separately, may retarget); no
  movement. None? order 1 unit.
* Double Time x2 — up to 4 foot units in linked hexes; each may move 2 and still close combat; WA may move 2 or 3 but
  must close combat; light foot gain no extra move; no ranged. No foot? order 1 unit.
* First Strike x1 — reactive (see close combat). Playing it on your own turn discards it with no effect **[Interp]**.
* I Am Spartacus x1 — roll Command dice; each class symbol orders one unit of that class, each helmet orders any unit or
  leader (flags/swords nothing); ordered units +1 die this turn; may detach; afterwards reshuffle deck + discards (incl.
  this card) before drawing.
* Line Command x4 — a linked group of foot units (any size); each moves ≤1 hex and may battle (ranged or CC). No foot? 1 unit.
* Mounted Charge x2 — ≤ Command mounted units; +1 CC die (incl. bonus); HC/EL/HCH may move 3 and battle; no ranged.
* Move-Fire-Move x2 — ≤ Command light units: all first moves, then all fire, then all second moves; no close combat;
  light foot may pass through friendly units. Normal ranged dice (1 if moved first).
* Rally x1 — roll Command dice; each class symbol restores 1 block to a damaged unit of that class in or adjacent to a
  friendly leader's hex (helmet = any class); not EL/HCH; never above starting strength. Rallied units are ordered.
  No leaders? order 1 unit.

## 13. Victory

First to the scenario's banner count wins immediately. Banners: each enemy unit eliminated, each enemy leader killed,
plus scenario objectives.

## 14. Scenario special rules

Base-game battles with special rules are listed here. The Expansion #1 battles 101–124 are in §17.

* 002 Crimissos: river fordable only at the bend hexes; Sacred Band unit.
* 004 Ticinus: river not fordable. 009 2nd Beneventum: Calor not fordable; Roman hand 4 -> 6 at their 3rd banner.
* 005 Trebbia: river fordable; Mago's ambush (Carthaginian reserve: 1 MC + 2 WA + Mago) enters when Carthage plays a
  Leadership card after its first turn: units placed on Roman baseline hexes in the card's section (Any Section: chosen),
  placement counts as 1 hex of movement; these units retreat toward the Carthaginian side.
* 006 Lake Trasimenus: lake and the four steep hills impassable; Roman hand 2 -> 3 -> 4 (draws 2 after turns 1 and 2).
* 010 Castulo: if Publius Scipio is eliminated Carthage wins at once; a Roman unit exiting the Carthaginian baseline from
  a centre or Roman-right hex scores 1 banner and is removed.
* 011 Baecula: a Roman unit ending its move on a Carthaginian camp hex gains 1 banner (once per camp).
* 012 Metaurus: both streams fordable.

## 15. Expansion #1 units

Three new unit types, used in the Expansion #1 battles of §17. Paraphrased from the GMT living rules 2009 ("LR") and
the rulings research in `design/exp1-rulings.md` ("Qn" = question n there). Everything in §1–§14 applies unless stated here.

| Code | Unit | Class | Kind | Blocks | Move | CC dice | Ranged | Retreat/flag | Evade |
|---|---|---|---|---|---|---|---|---|---|
| LBC | Light bow cavalry | light | mounted, cavalry | 3 | 4 | 2, no sword hits | range 3 | 4 (+1 per elephant/camel flag) | always |
| HWM | Heavy war machine | heavy | foot (war machine, not infantry) | 2 | 1, **no battle after moving** | 2 only if it did not move, no sword hits; battles back with 2 | range 6, 2 dice, **not after moving** | 1 | only with a legal 1–2 hex path (below) |
| CAM | Camel | medium | mounted, not cavalry | 3 | 3 | 3 attacking; 2 battling back and on First Strike | — | 3 | vs foot & heavy mounted (HC, EL, HCH) |

**Class and card membership** (LR p.22–24; Q13–Q15)
* Light (Order Light Troops, Move-Fire-Move): LI, LB, LS, AX, LC **and LBC**. The pass-through-friendly-units privilege of
  those cards stays with light **foot** (LI, LB, LS, AX); an LBC does not get it.
* Medium (Order Medium Troops): WA, MI, MC **and CAM**. Heavy (Order Heavy Troops): HI, HC, EL, HCH **and HWM**.
* Mounted (Order Mounted, Mounted Charge): LC, MC, HC, EL, HCH **and LBC, CAM**. The 3-hex Mounted Charge move stays
  with HC/EL/HCH.
* Foot (Line Command, Double Time): LI, LB, LS, AX, WA, MI, HI **and HWM**.
* Missile units (Darken the Sky): LI, LB, LS, AX, LC **and LBC, HWM** plus the ranged elites of §17.1 (Immortals, bow auxilia).
* Dice that hit them: LBC green circle, CAM blue triangle, HWM red square. I Am Spartacus orders them by the same
  symbols. Rally restores any of the three (only EL and HCH cannot be rallied). Swords never score for an LBC or HWM (§3).

**Elephants versus the new types** (LR p.10; Q13–Q15): an elephant rolls (attacking and battling back, base dice only, §2)
**2** against an LBC, **2** against a HWM, **3** against a camel.

**Extra retreat hex ("scare")** (LR p.10; Q13): every cavalry or chariot unit — LC, MC, HC, LBC, HCH — that must retreat
because of flags rolled by an **elephant or a camel** in a close combat with it (whoever attacked: initial attack,
battle back, bonus combat or First Strike) retreats **+1 hex per accepted flag**. Per flag that is LC/LBC 5, MC 4, HC 3,
HCH 3. Foot, camels, elephants and war machines are never scared (a camel is not cavalry); flags rolled by other units
never add a hex.

### Light bow cavalry (LBC)
* Moves 1–4 hexes and may battle afterwards (ranged or close combat). Evades always.
* Ranged: range 3; 2 dice if it did not move this turn, 1 if it moved (any distance). The §8 limits apply (not at an
  adjacent enemy, not at all while adjacent to any enemy). It fires like the other light missile units under Move-Fire-Move
  (1 die if it moved first) and Darken the Sky (twice). Mounted Charge adds +1 close-combat die and forbids ranged fire.
* Close combat: 2 dice, swords never hit, battles back with 2. A leader escaping through its hex meets 2 dice (§11).
* Momentum: advance into the vacated hex, then optionally 1 more hex (cavalry extra hex: initial combat only, never after a
  bonus combat, not needed for a bonus combat; ends on entering forest/marsh/ford/broken ground, §9). It may bonus-fight
  as a mounted unit.
* Retreats 4 hexes per flag (+1 per elephant/camel flag, above).

### Camel (CAM)
* Dice: 3 attacking (also in a bonus combat); **2 when battling back and when it plays First Strike**; a leader escaping
  through its hex meets 3 (Q13). Card bonuses add to the attacking dice as usual (§4).
* **Blue-triangle ignore:** whenever a cavalry or chariot unit (LC, MC, HC, LBC, HCH) rolls close-combat dice against a
  camel, the camel ignores 1 blue-triangle hit from that roll — the camel attacked, the camel attacking and the horse
  battling back, bonus combat, First Strike. It also applies to the horse's roll against an evading camel **[Interp]**
  (the evade is part of the close combat; LR p.13 gives no exception). Close combat only: it does not reduce ranged fire.
  It ignores nothing from foot, elephants or other camels, and only blue triangles (not helmets, swords or other dice).
* Flags: **no extra flag-ignore against cavalry** (only elephants have that, §2); a camel ignores flags only by the
  ordinary sources (leader, support, §10). Flags it rolls scare cavalry and chariots (above).
* Evades foot and heavy mounted (HC, EL, HCH) attackers. Momentum: advance and bonus close combat, but no cavalry extra hex.
  Retreats 3 hexes per flag. Medium for hits and orders (Order Medium, Order Mounted, Mounted Charge).

### Heavy war machine (HWM)
* **Movement and battle:** moves 1 hex. A HWM that moved this turn may not battle at all (no ranged, no close combat).
  Forest and fordable river are allowed with their usual effects. It may **not enter broken ground or marsh**: no move
  there, and evade and retreat paths treat both as blocked (a retreat hex it cannot enter is an unfulfilled retreat hex,
  1 block lost, §10). For broken ground the evade/retreat ban is an extension **[Interp]**: LR p.19 says only that it
  "may not enter", LR p.21 spells out move, evade and retreat for marsh only. No battle is possible on those hexes anyway.
* **Ranged:** range 6 (counting the target hex, so the minimum is 2: never at an adjacent enemy, never while adjacent to
  any enemy); 2 dice if it did not move, it cannot fire after moving. Normal line of sight (§8): no indirect fire, units
  and blocking terrain in between block it. On a fortified camp it rolls one die fewer (§4); a rampart hex costs nothing.
* **Close combat:** only if it did not move; 2 dice; swords never hit; it battles back with 2. It **never makes a
  momentum advance or bonus close combat**, even with an attached leader and under any card.
* **Evade:** it may evade like a light unit but only if a legal evade move of 1 or 2 hexes exists (§9.3: towards its own
  side, not through units, lone enemy leaders, impassable terrain, broken ground or marsh); otherwise it cannot evade
  (LR p.16, Q14, Q22). The attacker rolls normally and **only red squares (heavy) hit**. If that eliminates the HWM, the
  attacker gets the banner as usual. Otherwise the HWM makes its evade move and is then **removed from the board with no
  banner** (the crew escaped), even if it still has blocks. No battle back and no momentum advance (§9.3). Any leader
  that was attached stays on the hex where the evade ended, as a lone leader, and no casualty check is made (the unit was
  not eliminated) **[Interp]**.
* **Retreat:** 1 hex per flag. Gives and receives support like any unit; as foot it gets the camp and rampart protection
  (§4, §16).
* **Orders:** Order Heavy Troops; Line Command (moves up to 1 hex but then cannot battle); Darken the Sky (fires twice,
  each shot separate); Clash of Shields (if adjacent to an enemy: ordered, no move, close combat with 2 + 2 = 4 dice);
  I Am Spartacus (red square); Rally. Double Time: it may be in the group but moves at most 1 hex (never 2) and then
  cannot battle; no ranged anyway under that card (LR p.23, Q14). Not ordered by Order Light/Medium/Mounted Troops,
  Mounted Charge or Move-Fire-Move.
* Elephants roll 2 against it; a leader escaping through its hex meets 2 dice.

## 16. Expansion #1 terrain

Forest, hill, marsh, broken ground, camp and impassable river are unchanged (§4, §7, §8).

**Sea** (101, 102, 108): exactly the rules of `lake`: impassable for movement, retreat, evade, leader movement and leader
evade; it does not block line of sight. Only the art differs (beach, surf). The sea hex where a stream ends (a river
delta) is sea even when it touches a fordable river hex (101 Marathon, Q22).

**Impassable hills** (101, 113): terrain `steep`: impassable and blocks line of sight. Nothing can stand on them, so
the normal hill line-of-sight rule gives the same result (Q19).

**Rampart** (102, 118): a hex terrain with **protected hexsides** (edges) — LR p.20, Q16.
* Edges are named by the direction from the rampart hex to the neighbour across the edge, in the board's neighbour order
  E, NE, NW, W, SW, SE (row 0 at the top, so NE/NW point up the board):

  | Dir | Neighbour of an even-row hex (r, c) | Neighbour of an odd-row hex (r, c) |
  |---|---|---|
  | E | (r, c+1) | (r, c+1) |
  | NE | (r-1, c) | (r-1, c+1) |
  | NW | (r-1, c-1) | (r-1, c) |
  | W | (r, c-1) | (r, c-1) |
  | SW | (r+1, c-1) | (r+1, c) |
  | SE | (r+1, c) | (r+1, c+1) |

* Scenario data lists the protected edges (`edges`); shorthand `faces: 'top'` = NW + NE, `faces: 'bottom'` = SW + SE; a
  corner piece lists 3 edges. The protected edges are the forward-facing ones, towards the enemy: the bottom army's
  ramparts protect their upper edges, the top army's their lower edges.
* **Foot units only** (LI, LB, LS, AX, WA, MI, HI, HWM) standing on the rampart hex. Mounted units (including EL, HCH, CAM,
  LBC) gain nothing. A lone leader gains nothing **[Interp]** (LR protects the "defending unit").
* **Close combat:** when an enemy attacks the unit from the neighbouring hex across a protected edge, the defender ignores
  1 sword rolled against it (an elephant does not re-roll that sword; further swords hit and are re-rolled, §2) **and may
  ignore 1 flag** (one more ignorable flag, optional, cumulative, §10). An attacker on an unprotected edge (side or
  rear) is unaffected. This covers the enemy's bonus close combat and its attack roll after the defender's First Strike.
* **Defender only:** a roll made by an enemy that is itself attacking is protected; when the rampart unit attacks out, it gets no
  bonus and no penalty, and the target's battle back against it is not protected **[Interp]** (Q16: ramparts help
  "only the unit defending behind them"; LR p.20 speaks of an attacked defender).
* **Ranged:** a foot target fired at through a protected edge may ignore 1 flag (no sword or dice effect). "Through" is the
  centre-to-centre line of §8 entering the target hex. If that line passes exactly through a corner of the target hex it
  crosses both edges meeting there, and it counts if **either** is protected **[Interp]** (LR is silent).
* No effect on movement (any unit may enter, no stop), none on line of sight, no dice cap for either side and no dice
  penalty (unlike a fortified camp, -1 die). Ramparts and camps never share a hex in the battles, so their ignores
  never stack (Q16).

**Ford without caps** (108 Pinarus): river hexes flagged `ford: 'nocap'` are fordable rivers without the dice caps.
* Close-combat cap 2 does not apply to a unit in the hex or attacking it, and the ranged cap of 1 does not apply to a
  firer in it (§4): an HI attacking out of the Pinarus rolls its full 5 dice. Card bonuses and everything else are as usual.
* Movement is not a "battle dice reduction" (Q10): units that enter still stop on entry **[Interp]**, and a unit in it
  may not momentum-advance out if it moved this turn (§9.6) **[Interp]**.
* Every other fordable river (101, 107, 110, 123, the 116 bends, the 002 bends) keeps all fordable-river rules: stop on
  entry, close combat max 2 for either hex, ranged max 1 for a firer in it.

## 17. Expansion #1 elites, leader traits and scenario rules

### 17.1 Elite units

An elite unit is an ordinary unit of the listed type carrying a special-unit marker (a preset id). The abilities belong to
the unit (not to a leader), last until its last block is lost (block losses never remove them, the marker is not a
block, it cannot be transferred), and add to everything else. A preset may only be given to its listed unit type.

| Id | Unit | Abilities | Scenarios |
|---|---|---|---|
| `carthSacredBand` | HI | helmetHits, ignoreFlag | 002 |
| `thebanSacredBand` | MI | helmetHits, ignoreFlag | 104 |
| `silverShields` | HI | helmetHits, ignoreFlag | 113, 114 |
| `companions` | MC | ignoreSword, ignoreFlag | 107–111 |
| `immortals` | MI | ranged (range 3) | 108 |
| `bowAuxilia` | AX | ranged (range 3) | 123 |

* **helmetHits:** every helmet the unit rolls in close combat (attack, bonus, battle back, First Strike) scores a hit
  whether or not a leader is attached or adjacent, without double counting a leader's helmets. Not in ranged combat.
  Silver Shields: the scenario text omits "even when a leader is not attached or adjacent"; it is played like the Sacred Band
  **[Interp]** (Q5: read literally the ability would do nothing).
* **ignoreFlag:** one more ignorable flag (§10), optional, cumulative.
* **ignoreSword:** the unit ignores 1 sword rolled against it in any close combat (attacked, or attacking and the enemy battles
  back; bonus combat; First Strike). Only the first sword; an elephant does not re-roll the ignored sword, later swords hit
  and are re-rolled (Q2). **Companions** keep it with or without Alexander; flag-ignores stack with leader and support
  (with Alexander and support: 3 flags and 1 sword); they still take blue triangles, helmets and further swords.
* **ranged:** the unit may fire as a missile unit (§8) at the stated range, 2 dice if it did not move, 1 if it moved.
  * **Immortals** (Q3): a medium infantry unit otherwise (moves 1, 4 close-combat dice, medium for hits and orders). After
    a 1-hex move it fires 1 die. It never both fires and close combats in the same turn. It is a missile unit for
    Darken the Sky but is not light (no Order Light Troops, no Move-Fire-Move).
  * **Bow auxilia** (Q4): an AX otherwise (3 close-combat dice, swords hit, light, retreat 1, never evades). The AX limit
    stays: after moving 2 hexes it cannot fire (and cannot battle).

### 17.2 Leader traits

* **Alexander** (`ccBonus`, scenarios 107–111): the unit he is attached to rolls **+1 die in close combat**. Not in
  ranged combat.
  * It is added at the card-bonus step of §4, **after the terrain caps**, and stacks with card bonuses (designer FAQ: his
    die adds on top of the caps, like a card bonus; Q1).
  * It applies to every close combat of that unit — attack, bonus combat, battle back and First Strike **[Interp]**: the
    designer FAQ settles only the terrain caps; for the other cases no ruling exists and this is the plain reading of the
    scenario text (Q1).
  * It also applies to his unit's roll against an evading unit and against a lone leader (both are close combat) **[Interp]**.
  * He must be attached when the dice are rolled; an adjacent Alexander gives no bonus. A battle back after the unit
    lost blocks counts only if he survived the casualty check **[Interp]** (an eliminated leader is not attached).
  * Not mirrored by elephants (an elephant rolls the base dice, §2); an elephant never benefits from him (LR p.13).
  * Not used when a leader escapes through the unit's hex (escape uses normal dice, §11).
* **Satraps** (`attachedOnly`, 107: Mithridates, Rhoesaces, Spithridates; Poor Persian Leadership, Q6):
  * His helmets count only for the unit he is attached to, not for adjacent units (his own attached unit still gets them).
  * A Leadership card played on him orders only **him and his attached unit**, nothing along a chain; a lone satrap
    orders only himself. The card's alternative (order 1 unit of choice) is unchanged.
  * He still gives his unit the leader flag-ignore (§10) and still counts as support for adjacent units, alone or
    attached (no official ruling; read as written, the scenario text removes neither) **[Interp]**. Everything not
    listed is unchanged; in particular Rally is unrestricted: satraps still enable it for units in or adjacent to
    their hex (Q6).

### 17.3 Optional rule: Roman Tactical Flexibility (scenarios 120, 121, 124)

Rule `tacticalFlexibility`, a scenario option stored in the game config (default **on**; when off the scenario has no
special rule). Official text: GMT Bonus Pack #2 (Pydna); the web pages omit the terrain clause (Q12).
* It affects one roll: the battle back of a HI of the **non-Roman army** (Macedonians in 120 and 124, Seleucids in 121;
  decided by army, not block colour) against a Roman **MI or HI** that attacked it, including that Roman unit's bonus
  close combat. If every condition holds the HI rolls **3 dice** (instead of 5), and the caps and penalties of §4 then
  apply as usual.
* Conditions: the HI is **unsupported** — fewer than 2 adjacent friendly units or lone leaders (the §10 flag-support
  test; an attached leader is not support) — and **not on broken ground**.
* No effect on: attacks by Roman AX, LI, cavalry or elephants; the HI's own attacks; First Strike (it is not a battle
  back); a battle with the option off.
* The 3 replaces the HI's base dice, before the §4 caps, the camp -1 and the card-bonus step (a capped ford or a hill
  still limits it, an attached Alexander-style +1 adds on top); so the broken-ground clause never changes the count,
  since broken ground caps the HI at 2 anyway **[Interp]** (the text says only "uses only 3 dice", Q12).
* Of the three battles only 124 has broken ground; in 120 and 121 the broken-ground clause changes nothing.

### 17.4 The battles

Banner targets, hands, first player and unit lists are scenario data (`src/scenarios/data/1xx.json`, decisions in
`design/exp1-scenario-notes.md`); only rules are listed here. "Roman", "Greek" etc. in scenario rules name armies, not
block colours. Fordable rivers use the §4/§7/§9.6 rules, except 108 (§16).

* **101 Marathon (490 BC):** no special rules. The stream is fordable (all its hexes). Sea along the left edge is
  impassable, including the delta hex at the end of the stream (§16). The hills on the right edge are impassable (`steep`).
* **102 Himera (480 BC):** no special rules. Terrain: ramparts in front of the Carthaginian camps (`faces: 'bottom'`, towards
  the Syracusans; the one diagonal piece near the top centre-right takes its two edges from the map art), three
  fortified camps (ordinary camp rules, no banner objective), sea on the right edge. Hamilcar starts alone in his hex: a
  legal lone leader (§11). The MC with Eumachus is Syracusan (Greek blocks), starting inside the Carthaginian position (errata).
* **103 Plataea (479 BC):** no special rules; hills only.
* **104 Leuctra (371 BC):** the Theban MI labelled Sacred Band is `thebanSacredBand` (§17.1). All plain.
* **105 Mantinea (362 BC):** no special rules; hills (Spartan half, both sides) and 3 forest hexes behind the Spartan centre.
* **106 Crocus Plain (352 BC):** no special rules; the Pagasaean Gulf along the bottom row is impassable (`lake`).
* **107 Granicus (334 BC):** the Granicus is fordable. Alexander (`ccBonus`) and the Macedonian MC with him, a `companions`
  unit. All three Persian leaders are `attachedOnly` satraps (§17.2). Errata: the Persian army has MI 2 and MC 3 — the
  units of Rhoesaces and Spithridates are MC, not MI (Q17).
* **108 Issus (333 BC):** the Pinarus is a no-cap ford (§16); the Persians start on river hexes. Alexander and the
  Companions (the MC with him). The Persian MI with Darius is `immortals` (§17.1). The Mediterranean coast on the right
  edge is `sea`. The Amanus hills on the left edge are ordinary, passable hills **[Interp]** (the page does not make them
  impassable; `design/exp1-survey.md` section 4).
* **109 Gaugamela (331 BC):** Alexander and the Companions. One Persian LBC. The Persian chariots are plain HCH (no
  scythed-chariot rule). All plain.
* **110 Jaxartes River (328 BC):** the river is fordable; hills in the Scythian half. Alexander and the Companions. Two
  Macedonian HWM; four Scythian LBC.
* **111 Hydaspes (326 BC):** the Hydaspes (down the left edge) is impassable; 3 forest hexes beside it. Alexander and
  **two** `companions` units (the MC with Alexander and the MC with Coenus). Two Macedonian LBC.
* **112 Hellespont (323 BC):** both armies use `leaderLossCostsCard` and `allLeadersSuddenDeath` (Q7). Each side starts
  with exactly 2 leaders (Craterus, Neoptolemus; Eumenes, Alcetus).
  * A leader is **eliminated** when he is killed (the opponent scores the banner). A leader who evades off his own
    baseline is removed without a banner (§11) and is *not* eliminated: he neither shrinks the hand nor counts for the
    instant win **[Interp]** (LR p.16; Q7). As a result that side can no longer lose to the instant win.
  * Each leader eliminated lowers his side's **Command (hand size) by 1 for the rest of the battle**; every card that
    counts Command (Order Light/Medium/Heavy/Mounted Troops, Move-Fire-Move, Mounted Charge, Rally and Spartacus dice, ...)
    uses the reduced value from then on.
  * Lost on **its own turn**: the owner does not draw at the end of that turn. Lost on the **opponent's turn**: one card
    chosen at random (seeded RNG) from the owner's hand is discarded at once (event `cardLost`). Several leaders lost in
    one turn apply one after the other.
  * **Card debt** **[Interp]** (as implemented): each eliminated leader costs his side exactly one card. Lost on its own
    turn, the side's next draw is skipped; a second own-turn loss also skips the draw after that (RAW names only the
    draw at the end of that turn). Lost on the opponent's turn, a random card is discarded at once; with an empty hand
    the side's next draw is skipped instead. Command never drops below 1, and at 1 no card is owed.
  * **Instant win:** when every leader a side started with has been eliminated, the other side wins at once (generalising
    Castulo's single leader). Ordinary banner victory (6) also applies; the first condition reached ends the battle.
  * **Banners first** **[Interp]**: an elephant's blocked retreat (§10) scores all its banners together, before the
    leader-loss rules. When that step gives a side its winning banner and also eliminates a side's last leader, the
    banners decide and the instant win is checked only if the battle goes on. A side whose own last leader is crushed
    in the step that brings its winning banner therefore still wins. Both sides reaching their last banner at once is
    a draw (§10).
* **113 Paraitacene (317 BC):** the hills down the left edge are impassable (`steep`, §16). The Eumenes HI labelled Silver
  Shields is `silverShields`. One LBC on each side.
* **114 Gabiene (316 BC):** `silverShields` (the Eumenes HI so labelled). One LBC on each side. **Camp capture**
  (`campCapture`, the 011 Baecula rule of §14 generalised so that scenario data names the capturing side and the camp
  hexes): the camp hex in the bottom-right corner is Eumenes' camp; the first time a unit of Antigonus' army (the top
  side) **ends its move on it** its side gains 1 banner. A unit that merely passes through does not capture. Once only,
  and the banner is never lost. Finishing a close-combat sequence (momentum advance, extra hex, bonus combat) standing
  on it counts as ending the move, and a retreat or evade onto it does not **[Interp]** (extends §14's "ending its
  move"; this is how 011 is implemented). Eumenes' units never capture. The camp is otherwise an ordinary fortified camp.
* **115 Ipsus (301 BC):** no special rules; plain. (The fourth Seleucid elephant is a component note only.)
* **116 Heraclea (280 BC):** two rules.
  * **River Siris:** only the bend hexes are passable; every other river hex is impassable. The bend hexes follow the
    fordable-river rules **[Interp]** (the 002 Crimissos precedent; the rules know only "fordable" as passable river, Q8).
  * **Fright at First Sight** (`frightAtFirstSight`): a Roman foot unit may not ignore **any** flag rolled by an
    elephant: not for an attached leader, not for support, not for any other source (§10). "Infantry" is read as every
    foot type — LI, AX, MI and HI in this battle; war machines are not infantry. It applies to every close combat
    between an elephant and a Roman foot unit: the elephant attacking, battling back, in its bonus combat, or rolling on
    First Strike. It concerns only flags the elephant rolls; the Roman unit's own rolls and the elephant's ignores are
    unchanged, and Roman MC are unaffected **[Interp]** (plain reading of the scenario text, Q9).
* **117 Asculum (279 BC):** **6 banners** (War Council text; the site's "7 banners" tag is ignored, Q11). Leaders are placed
  after the deal (`leaderPlacement`): each player has seen his hand, then before the first turn the Roman side places its
  2 leaders one at a time, then the Epirote side its 2; the Romans move first in play. A legal hex holds an own unit that has
  no leader (the leader attaches) or is empty (no unit, no leader) and passable (not lake, sea, steep hill or
  non-fordable river). No other restriction is stated (RAW), so empty hexes anywhere, including next to the enemy, are
  legal; a leader on an empty hex stands alone (§11). Placement is not movement and costs no order.
* **118 Beneventum (275 BC):** no special rules. Terrain: the Roman baseline has 3 fortified camps joined by 4 rampart
  hexes (`faces: 'top'`, towards the Epirotes); the two Roman HWM stand on rampart hexes (no dice penalty, §16); about 14
  forest hexes in the Epirote half. Camps and ramparts carry no banner. The Roman leader is Dentatus (the War Council's
  "Decius and Sulpicius" is a copy of 117, Q20).
* **119 Raphia (217 BC):** no special rules; plain.
* **120 Cynoscephalae (197 BC):** optional Roman Tactical Flexibility (§17.3; the Macedonian HI are affected). About 16
  hills across the middle; no broken ground.
* **121 Magnesia (190 BC):** optional Roman Tactical Flexibility (§17.3; the Seleucid HI are affected). The Phrygios (down
  the left edge) is impassable. Errata: the Seleucids use Greek blocks, and they include **one camel** (3 blocks, beside
  Seleucus) that the page's unit table omits; one Seleucid LBC (Q18).
* **122 Cronium (376 BC):** no special rules; plain. Official GMT Bonus Pack #2 battle; the Syracusans use Greek blocks.
* **123 Indus (306 BC):** the winding river in the bottom-left is fordable. The three Indian AX labelled "Bow Armed" are
  `bowAuxilia` (§17.1). About 11 forest hexes top-left, 5 hills on the right edge. Official Bonus Pack #2 battle.
* **124 Pydna (168 BC):** optional Roman Tactical Flexibility (§17.3); broken ground (about 7 hexes in the centre) exists
  here, so the clause matters. Two fortified camps on the Roman baseline are terrain only (the Bonus Pack has no camp
  rule). Official Bonus Pack #2 battle.

## 18. Expansions #2 and #3: units, abilities, objectives and terrain

Used by the Expansion #2 battles (§19) and, later, Expansion #3. Paraphrased from the GMT living rules 2009 ("LR"), the
Expansion 2/3 rule texts as transcribed on commandsandcolors.net and the rulings research in `design/exp2-rulings.md`
("X2 Qn") and `design/exp3-rulings.md` ("X3 Qn"). Everything in §1–§17 applies unless stated here.

### 18.1 Barbarian light chariot (BCH)

| Code | Unit | Class | Kind | Blocks | Move | CC dice | Ranged | Retreat/flag | Evade |
|---|---|---|---|---|---|---|---|---|---|
| BCH | Barbarian light chariot | light (white border) | mounted, chariot | 3 | 3, may battle | 2; **3 at full strength**; swords hit | — | 3 (+1 per elephant/camel flag) | always |

* **Full strength** (like warriors, judged per combat at its start): +1 die and +1 ignorable flag. A full-strength
  chariot that loses a block in a combat still battles back with 3 (X2 Q1). The flag-ignore is a 2009 LR addition that
  players dispute; LR is followed.
* **Ignores 1 sword hit** in every close combat (all chariots do, LR; the 2026 site page dropped it, X2 Q1).
* Momentum: advance and bonus close combat (mounted), never the cavalry extra hex (it is a chariot, not cavalry).
* Cards: light (Order Light Troops; Move-Fire-Move gives it moves only), mounted (Order Mounted, Mounted Charge without
  the 3-hex move). Not a missile unit. Cannot be rallied **[Interp]** (as the other chariots).
* A leader escaping through its hex meets 3 dice at full strength, 2 after a loss (site FAQ). Elephants roll 2 against
  it **[Interp]** (none in these battles).

### 18.2 Pilum, march and the legion rules

* **Pilum** (a ranged ability): range 2; **always 1 die**, whether the unit stayed or moved 1 hex; it may not fire after
  moving 2 hexes. It is a missile unit for every ranged rule (§8: not at or while adjacent to an enemy; a unit never fires
  and close combats in the same turn; Darken the Sky fires twice). It is not light: no Order Light Troops or
  Move-Fire-Move. From a fortified camp it rolls 1 − 1 = 0 dice, so it cannot fire (X2 Q2). Line Command: moves at most
  1 hex, then may fire.
* **March** (a movement ability): the unit may move 2 hexes if it does not battle that turn; it may still move 1 and
  battle. With Double Time: 2 hexes and battle, never 3 (X2 Q3).
* **Marius legions** (scenario rule, X2 Q2): every MI and HI of the named side has the pilum. 206–223 for the Romans.
* **Julian legions** (Expansion #3): pilum + march for every MI and HI of the named side(s).
* **Tenth Legion** (elite `tenthLegion`, HI; 215 ×2, 217): pilum + march; otherwise an ordinary HI (5 dice, retreat 1, no
  flag-ignore, no helmet hits). The two 215 units are ordered and fight separately (X2 Q3).
* An elite with its own ranged weapon (the Immortals, §17.1) keeps its 2/1 dice; the 1-die rule is the pilum's alone.

### 18.3 Leaders: Caesar and Spartacus

* **Caesar** (`ccBonus` + `forcedMarch`): +1 close-combat die exactly like Alexander (§17.2: every close combat, after the
  caps, not mirrored by elephants, not for leader escape; X2 Q4). **Forced march:** an infantry unit (any foot but a war
  machine) that has Caesar attached when it begins its move may move 2 hexes and still battle. Terrain stops, Line
  Command's 1 hex and the marsh start limit still apply; Double Time stays at 2; a pilum unit still cannot fire after 2
  hexes. A unit that only joins Caesar during its move gets nothing that turn (Designer, X2 Q4).
* **Spartacus** (`spartacusDice`): while he is on the board, his side's I Am Spartacus roll uses Command + 2 dice, also
  when a Counter Attack copies the card. Everything else on the card is unchanged; the other side never gets the bonus
  (X2 Q5).

### 18.4 Battle objectives

Scenario objectives give banners in addition to eliminated units and leaders. **Only units count** (never lone
leaders), and a unit merely passing through a hex never counts (X2 Q9e). A side wins as soon as its **banner total**
(permanent banners + banners currently held) reaches the target; losing a held banner later never undoes a win.

* **Capture** (`capture`): hexes (usually enemy camps) a side can take once each.
  * `stop` (011 Baecula, 114 Gabiene): a unit of that side ending a move or momentum advance on an untaken hex.
  * `turnStart`: at the start of that side's turn, before its card, every untaken hex holding one of its units is taken.
  * Banners per capture in order (default 1 each); e.g. 201 Clusium 0, 0, 1 (the third camp scores). Banners are
    permanent. `together: n` (211): nothing until n listed hexes are occupied at once; then 1 banner and every listed hex
    is taken.
  * `remove`: a taken camp (or rampart standing in for a camp, 215) is removed and the hex becomes open ground.
* **Hold** (`hold`; 204, 213, 214, 222): 1 banner per listed hex a unit of that side stands on (up to a maximum),
  counted continuously: gained the moment a unit enters, lost when it leaves or is eliminated, regained later (Designer,
  X2 Q9a).
* **Majority** (`majority`; 202 hills): at the end of every player turn the side with more units on the listed hexes
  holds the banners; a tie (or none on either side) gives them to nobody (X2 Q9b).
* **Section clear** (`sectionClear`; 219): at the end of that side's turn, each section with no enemy unit scores 1 held
  banner; it is lost the moment an enemy unit stands in that section. A unit on a boundary hex is in both sections
  (X2 Q9c).
* **Exit** (`exit`; 010 Castulo, 210, 212, 221): a unit of that side on a listed edge hex may move off the board as one
  hex of movement (not from or through terrain that stops it, unless it starts there); it scores 1 permanent banner and
  is removed (not eliminated: no banner for the enemy). An attached leader leaves with it and scores nothing more
  (X2 Q14). Some exits allow only foot units (212).

### 18.5 Ambush reserves, separate commands, Rolling Fire, last-row retreat

* **Ambush reserve** (generalised Trebbia, §14): off-board units of one side enter on empty enemy-baseline hexes of the
  card's section when that side plays a trigger card (Trebbia: a Leadership card, not on its first turn; 206: a
  Leadership card or Order Light Troops, from the first turn, X2 Q8). Leadership Any Section and Order Light Troops let
  the player choose the section. The card is used for the entry only; placement counts as the first hex of movement and
  the units then move and battle normally; units that cannot be placed wait for a later trigger. They retreat toward
  their own side.
* **Separate commands** (210): each unit belongs to a command; one card orders units of one command only — every card
  type, including Clash of Shields, Darken the Sky, Rally and I Am Spartacus (the player names the command when the card
  could order units of both). Leaders belong to no command and support everyone (X2 Q7).
* **Rolling Fire** (210, the Slaves; X2 Q6, path length **[Interp]**): a Slave infantry unit on a hill, ordered by a
  card that is not a Tactic card (a Counter Attack copying a section or troop card qualifies), that has not moved, may
  use its battle to roll burning logs downhill, even when adjacent to an enemy.
  * Path: from the unit's hex, each step goes to one of the two neighbouring hexes one row nearer the Roman edge; it may
    not enter a hill (or impassable terrain); it ends in the first hex that is not open ground; otherwise it runs 3 hexes
    (shorter only where no forward hex can be entered). The player chooses the path.
  * Every unit in the path, friend or foe, nearest first, is rolled 2 dice: only its class symbol hits; **no flag may be
    ignored** for any reason; no battle back. An attached leader makes the usual casualty check. A lone leader in the
    path evades at once toward his own side.
  * Then the rolling unit loses 1 block (casualty check for its leader; the Romans score a banner if it is eliminated).
* **Last-row retreat** (214, the Slaves): a unit of that side whose retreat ends on its own baseline row with retreat
  hexes it could not take is eliminated instead of losing blocks (enemy banner). Evades and a retreat that ends by
  joining a leader are not affected (X2 Q10).

### 18.6 Terrain

* **Ditch** (212): every unit and lone leader stops on entering. No other effect: no dice caps, battle allowed, war
  machines may enter, momentum advances in and out allowed, no line-of-sight block (X2 Q13).
* **Very steep hills** (223, rule `veryHills`): a unit moving from lower ground onto a hill stops and may not battle that
  turn; a momentum advance up onto a hill gives no bonus combat. Close-combat caps replace the §4 hill caps: uphill 1,
  downhill 2, hill to hill 3; card and leader bonuses add on top. Ranged combat and line of sight are normal (X2 Q12).
* **Coast played as a ford** (217): those sea hexes are a fordable river in every respect (§4, §7: stop on entry, close
  combat max 2, ranged from it max 1); only the art is sea (X2 Q13).
* **Removable tiles:** captured camps (§18.4) and, in 223, ramparts a Roman unit enters or passes through (move, advance,
  retreat or evade) become open ground at once.
* Rampart (§16), fortified camp, marsh, impassable hills (`steep`), sea, lake and rivers keep their rules.

## 19. Expansion #2 battles (201–223)

Banner targets, hands, first player and unit lists are scenario data (`src/scenarios/data/2xx.json`, decisions in
`design/exp2-scenario-notes.md`); only rules are listed here, using the mechanics of §18. The Barbarian army is the
top side and Rome the bottom; "Roman", "Gallic" etc. in scenario rules name armies, not block colours. In 201–205 the
army is pre-Marian: the Romans use red blocks drawn with the base `roman` look and have **no** Marius rule (X2 Q15).
"Marius legions" below is the §18.2 rule (Roman MI and HI have the pilum), used for the Romans in every battle from
206 on.

* **201 Clusium (225 BC):** one Gallic BCH (§18.1). Objective: `capture` for the Romans, `turnStart`, over the 3
  Gallic fortified camps: at the start of the Roman turn, before its card, every camp with a Roman unit on it is taken
  and removed. Banners per capture 0, 0, 1: the third camp taken gives 1 permanent banner (X2 Q9d). The Gauls capture
  nothing.
* **202 Telamon (225 BC):** two Gallic BCH. Objective: `majority` over the hill hexes, 2 banners, checked at the end
  of every player turn: the side with more units on those hills holds them, a tie (0-0 too) gives them to nobody; lone
  leaders never count (X2 Q9b). The sea down the left edge is impassable (`sea`). Regulus' wing starts on the Gallic
  baseline rows and retreats down through the Gauls (X2 Q16).
* **203 Clastidium (222 BC):** no special rules. **4 banners** (War Council text; the page tag's "8" is ignored, X2
  Q11).
* **204 Arausio (105 BC):** the Rhone down the right edge is an impassable river. Objective: `hold` for the Germans
  over the 2 Roman camps (ordinary fortified camps, bottom right), at most 1 banner: 1 while a German unit stands on
  either camp (holding both is still 1), lost when it leaves or is eliminated, regained later (X2 Q9a). Nothing is
  removed.
* **205 Scirthaea (103 BC):** no special rules; plain.
* **206 Aquae Sextiae (102 BC):** Marius legions. **Ambush** (§18.5, X2 Q8): Marcellus' off-board force (LI, 2 AX, LC
  and Marcellus) enters on empty German-baseline hexes when the Romans play any Leadership card or Order Light Troops
  (or a Counter Attack copying one), from the first turn; an Inspired card fixes the section, Leadership Any Section
  and Order Light Troops let the Roman player choose. The force retreats towards the Roman side.
* **207 Vercellae (101 BC):** Marius legions; plain, no other rules.
* **208 Mt Vesuvius (73 BC):** Marius legions; the Slaves' Spartacus (`spartacusDice`, §18.3). All hills are
  impassable (`steep`). Objective: `capture` for the Slaves, `turnStart`, over the 4 Roman fortified camps, 1
  permanent banner each, each camp removed when taken (X2 Q9d); two start holding only a Roman lone leader (§11), who
  must be driven out first. Slave units behind the Roman line retreat up the board (X2 Q16).
* **209 Mt Garganus (72 BC):** Marius legions. The 13 Mount Garganus hills across the top centre are impassable
  (`steep`). Crixus leads: no Spartacus and no I Am Spartacus bonus.
* **210 Picenum (72 BC):** Marius legions (all Roman MI); the Slaves' Spartacus. **Commands** (§18.5, X2 Q7): Lentulus
  (left of the hill chain) and Gellius (right), one command per card. **Rolling Fire** (§18.5, X2 Q6) for Slave
  infantry on a hill. Objective: `exit` for the Slaves: any Slave unit on a Roman-baseline hex may leave for 1
  permanent banner and is removed (X2 Q14; removal **[Interp]**, from 212/221).
* **211 Mummius' Defeat (72 BC):** Marius legions; the Slaves' Spartacus. Objective: `capture` for the Romans,
  `turnStart`, `together: 2`, over the 3 Slave fortified camps: Roman units on 2 or more of them at the start of the
  Roman turn score 1 permanent banner and **all three** camps are removed (X2 Q9d). The Slaves capture nothing.
* **212 Bruttium (71 BC):** Marius legions; the Slaves' Spartacus. **Ditch** (§18.6, X2 Q13): the row of 9 hexes
  across the centre and right. Objective: `exit` for the Slaves, **foot units only** (not the LC), over the Roman
  baseline: 1 permanent banner, unit removed (X2 Q14). The Roman ramparts and 4 camps are ordinary; the 3 Slave LC
  start beside and behind the Roman line and retreat towards the top (X2 Q16).
* **213 Camalatrum (71 BC):** Marius legions; the Slaves' Spartacus. The Lucanian Lake is impassable (`lake`).
  Objective: `hold` for the Romans over the single Slave fortified camp (Cannicus' MI starts on it): 1 banner while a
  Roman unit stands on it, lost when it leaves or is eliminated, regained later (X2 Q9a). Marcius' group (top left)
  and Castus' group (bottom left) retreat towards their own sides (X2 Q16).
* **214 Silarus (71 BC):** Marius legions; the Slaves' Spartacus. Objective: `hold` for the Slaves over the camp hexes
  on the Roman right (a palisade camp and the tent camp on the baseline), at most 1 banner: either one held scores it
  **[Interp]**, the page names only "the camp hex" (X2 Q10). **Last-row retreat** for the Slaves (§18.5): row 0, the
  top baseline.
* **215 River Sabis (57 BC):** Marius legions; Caesar (§18.3); two `tenthLegion` HI (§18.2), ordered separately, no
  adjacency needed (X2 Q3). The Sabis is fordable. Objective: `capture` for **both** sides, `turnStart`, 1 permanent
  banner each, tile removed: the Romans for a unit on the Belgic camp (fortified camp, top left), the Belgae for a
  unit on the Roman "unfinished camp", a single rampart hex that becomes open ground (X2 Q9d).
* **216 Sotium (56 BC):** Marius legions; no other rules.
* **217 Invasion of Britain (55 BC):** Marius legions; Caesar; one `tenthLegion` HI; two Briton BCH. The coast along
  the Roman baseline is played as a ford (§18.6, X2 Q13): 8 Roman units start standing in it.
* **218 River Stour (54 BC):** Marius legions; Caesar; seven Briton BCH. The Stour (the top-row river) is fordable.
  **6 banners** (War Council text; the page has no banner tag, X2 Q11).
* **219 Foraging Party (54 BC):** Marius legions; four Briton BCH. Objective: `sectionClear` for the Romans: at the
  end of each Roman turn every section with no Briton unit scores 1 held banner, lost the moment a Briton unit enters
  it (by any means) and regained later; a unit on a boundary hex is in both sections (X2 Q9c). Lone leaders never
  count.
* **220 Teutoburger Wald P1 (9 AD):** Marius legions; no other rules. The 9 marsh hexes behind the Roman line and the
  2 flank broken-ground hexes keep their usual rules.
* **221 Teutoburger Wald P2 (9 AD):** Marius legions. The Roman marching camp is a ring of ramparts (front row faces
  the top, the slanted sides outward) round one fortified camp hex. Objective: `capture` for the Germans, `turnStart`,
  over that camp hex only (the ramparts are not camps), **2** permanent banners, camp removed (X2 Q9d). Objective:
  `exit` for the Romans over the German (top) baseline, any unit: 1 permanent banner, unit removed (X2 Q14).
* **222 Angrivarii Rampart (16 AD):** Marius legions. **The Romans move first** (War Council text; the map's star
  would give the Germans the move, X2 Q11, **[Interp]**). The river down the right edge is impassable. Objective:
  `hold` for the Romans over the 7 rampart hexes (`faces: 'bottom'`, German-held at setup), at most 2 banners: 1 per
  rampart hex with a Roman unit on it, lost when it leaves or is eliminated (X2 Q9a). Ramparts stay (§16).
* **223 Cefn Carnedd (51 AD):** Marius legions. The Severn is fordable (ford cap and hill cap: the lower applies).
  **Very steep hills** on every hill hex (§18.6, X2 Q12). **Rampart breakers:** the 6 Briton-held ramparts (facing the
  bottom) become open ground when a Roman unit enters or passes through one (move, advance, retreat or evade); Britons
  never remove them.
