# Commands & Colors: Ancients — Rules Reference (as implemented)

Condensed from the official rules (commandsandcolors.net, 5th+ edition wording). This file is the
authoritative spec for the engine, tests and AI. Where the official text is ambiguous the chosen
interpretation is marked **[Interp]**.

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

## 3. Dice

6 faces, equal chance: light (green circle), medium (blue triangle), heavy (red square), helmet (leader), flag, swords.

**Ranged combat** hits: matching class symbol only. Versus a lone leader: a helmet eliminates him.
**Close combat** hits: matching class symbol; each sword (attacker not LI/LB/LS/LC, i.e. green without white border);
each helmet if a friendly leader is attached to or adjacent to the battling unit (not for elephants; Sacred Band always).
**Evade**: only matching class symbols hit.
Flags never hit; they cause retreats (except against lone leaders and eliminated units).

## 4. Dice count

`dice = min(base, caps) - campPenalty + cardBonus` **[Interp]** order: caps first, then -1 camp, then card bonus.
* Ranged base: 2 if the unit did not move this turn, 1 if it moved. AX that moved 2 cannot fire.
* CC base: table above.
* Caps in close combat (either unit's hex, attacker's or defender's): forest 2, marsh 2, fordable river 2, broken ground 2.
  Hills (CC only): attacking a unit that is on a hill from a non-hill hex: max 2 (any unit). Attacking from a hill to a
  non-hill hex, or hill to hill: foot max 3, mounted max 2. Battle back uses the same logic from the battling-back unit's side.
* Caps in ranged combat: target in forest: max 1; firer in marsh or fordable river: max 1.
* Fortified camp: a unit on a camp hex rolls 1 fewer die when it battles.
* Card bonus (only for ordered units, on the active turn): Clash of Shields +2 CC, Mounted Charge +1 CC (incl. bonus CC),
  I Am Spartacus +1 (CC and ranged). Bonuses are added after caps (cards "modify the maximum").

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
  leaders stop. Leaving a marsh hex: the move may only be 1 hex. Impassable: river (non-fordable), lake, steep hill.
* Battling after moving: per unit table; plus: a unit that entered a forest this turn cannot battle unless LI/LB/LS/AX/WA;
  a mounted unit that entered broken ground cannot battle.
* Leaders alone: move up to 3, may pass through friendly units/leaders, may not end on another friendly leader, may not
  enter enemy-occupied hexes. A lone leader entering marsh rolls 1 die: helmet = eliminated (banner), else stops.
  A unit entering marsh rolls 1 die: its class symbol = lose 1 block.
* No exiting the board (scenario exceptions: Castulo).

## 8. Ranged combat

* Units with missiles: LI, LB, LS, AX, LC. Range (hexes, counting target hex): LI/AX/LC 2, LB/LS 3.
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
   (optional) into the vacated hex. Cavalry (LC, MC, HC) may then move 1 more hex (initial combat only). Then
   **bonus close combat** (optional) for: WA, foot with attached leader, any mounted unit — against any adjacent enemy.
   After a successful bonus combat the unit may advance into the vacated hex but not battle again.
   Terrain: advancing into forest: only LI/LB/LS/AX/WA may bonus combat; mounted advancing into broken ground cannot bonus;
   entering forest/marsh/ford/broken (mounted) ends the cavalry extra hex; advancing into marsh rolls the marsh check.
   A unit in a fordable river or marsh may advance out only if it did not move this turn.
7. Otherwise, if the defender survived and did not retreat (or could not complete its retreat) it may **battle back**
   (always taken by default) against the attacker, with its own dice/caps; leader helmets count; attacker may need to
   retreat (attacker can ignore flags as usual). No battle back after an evade, a First Strike, or vs a lone leader.

## 10. Flags & retreat

* Ignorable flags (cumulative): attached leader (+1; if the unit lost blocks, only if the leader survived the check);
  supported by 2+ adjacent friendly units/lone leaders (+1; elephants never receive support); foot unit on camp (+1);
  full-strength WA (+1); Sacred Band (+1); elephant vs cavalry/chariot roller (+1). Ignoring is optional per flag.
* Each accepted flag: retreat its retreat distance (table). Cavalry/chariot vs elephant: +1 hex per flag.
* Each retreat step must move to one of the two hexes adjacent toward its own side. Cannot enter units, lone enemy
  leaders, impassable terrain or leave the board. Lone friendly leader hex: the unit stops there and the leader attaches
  (only if the unit has no attached leader). Terrain otherwise ignored, except marsh: roll the marsh check per marsh hex.
* Each hex of retreat that cannot be completed = 1 block lost. If a full retreat is possible it must be taken.
* Attached leaders retreat with their unit.
* **Elephant rampage**: before an elephant retreats, roll 2 dice against every adjacent hex with a unit or lone leader
  (friend or foe; owner's opponent rolls for each side). Matching class symbol = 1 hit; helmet eliminates a lone leader,
  otherwise the lone leader must evade. Then the elephant retreats; if its path is blocked by units or a lone enemy leader
  it does not lose blocks: instead every unit/enemy leader in the blocked rear hexes loses 1 block per unfulfilled hex (a lone
  enemy leader is removed, banner). Blocked by board edge/impassable: elephant loses blocks normally.

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

Leadership (6): Inspired Left/Centre/Right Leadership x1 each — choose a leader in that section; order him, his unit,
and up to 4 more units/leaders in adjacent linked hexes (a chain: each ordered piece adjacent to another ordered piece,
chain starts adjacent to the leader; may cross sections). Leadership Any Section x3 — same with up to 3. Leaders may not
detach. Alternatively order 1 unit of choice (Inspired: in that section **[Interp]**; Any Section: anywhere).

Tactic (17):
* Clash of Shields x1 — every unit adjacent to an enemy unit is ordered; no movement; +2 CC dice; may momentum advance
  (bonus CC at normal dice); no ranged.
* Counter Attack x2 — repeat the opponent's last turn card (Left/Right swapped for Section and Inspired cards; Any Section
  stays). Cannot copy First Strike. Bound by the same "if you have none, 1 unit" rule.
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
