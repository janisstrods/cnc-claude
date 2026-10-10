# C&C: Ancients Expansion 3 (The Roman Civil Wars, scenarios 301–319): rulings research

Compiled 2026-10-10. The 4 Epic battles are out of scope. All rule and FAQ text below is paraphrased.
Hex coordinates are engine `(row, col)` (row 0 at the top, odd rows shifted right, `design/rules-reference.md` §1),
read from the site's map images (`CCA_maps/3xx.jpg`); the scenario transcriber should re-check them.

## Sources consulted (ranked)

**Official (GMT)**
- **[LR]** GMT living rules, 3rd edition, 2009. https://gmtwebsiteassets.s3.us-west-2.amazonaws.com/living_rules/CC_Rules_2009.pdf
  (local text: `scratchpad/exp3-src/pdf/rules2009.txt`). It already contains the Expansion 3 material:
  p.20–21 Scalable City Walls and Fortified City Walls; p.21 "Marian/Imperial Legions" and "Julian Legions" rules;
  p.22–24 card texts (Darken the Sky, Double Time, First Strike, Line Command, Order Light Troops).
  It is the only rules download on GMT's Expansion 2 & 3 Combo page (p-730), whose only errata note is that the
  2nd printing corrects "any known errata" (no list). No separate Expansion 3 rulebook, errata or FAQ PDF was found.
- **[X3]** Expansion 3 rulebook text as transcribed by GMT on the site (written by "GMT Games"):
  - New Special Rules (Marius, Julian, Julius Caesar): https://www.commandsandcolors.net/ancients/the-game/game-boxes/expansion-3/new-special-rules-expansion-3.html
  - New Terrain Hexes (Scalable and Fortified City Walls): https://www.commandsandcolors.net/ancients/the-game/game-boxes/expansion-3/new-terrain-hexes-expansion-3.html
  - The same Marius and Caesar text is on the Expansion 2 page; the Tenth Legion is on Expansion 2's Special Block Mechanic page.
- **[X4]** Expansion 4 New Special Rules (GMT text on the site): restates Marian and Julian legions and adds the Double Time note.
  https://www.commandsandcolors.net/ancients/the-game/game-boxes/expansion-4/new-special-rules-expansion-4.html
- **[X6]** Expansion 6 New Terrain Hexes (GMT text on the site, 2012): the latest wording of Scalable City Walls
  (adds "with the enemy unit they are attacking" and "a mounted unit cannot momentum advance onto a wall hex").
  https://www.commandsandcolors.net/ancients/the-game/game-boxes/expansion-6/new-terrain-hexes-expansion-6.html
- The site terrain pages (scalable city walls, fortified city walls, city gate, fortified camp, hill, rampart, seacoast).

**Designer (Richard Borg)**
- **[RB-FAQ]** "FAQ – Commands & Colors: Ancients" (updated 1/24/08), archived at
  http://web.archive.org/web/20150701025439/http://www.thewargamer.com:80/ccancients/modules/Official_Ancients_FAQ.pdf
  (local text from the Expansion 1 session). Expansion 3 shipped in December 2007, so this FAQ postdates it.
  Relevant item: the Marius Legions question (MI **and** HI).
- **[X3-FAQ]** Site FAQ "Expansion #3" (compiled by alecrespi, 13 Oct 2008): three scenario Q&As, two of them signed by Richard Borg
  (Gergovia line of sight, Ilerda hillock) and one also signed (Dyrrhachium exit).
  https://www.commandsandcolors.net/ancients/the-game/main/faqs/expansion-3.html
- Borg answers relayed by others: Caesar ruling via Bill Bennett (BGG 392108, 2009); Gergovia reinforcement fire via GeekMail
  (BGG 2420019, 2020); Valentia commands posted by Borg himself (BGG 2615073, 2021).

**Site (commandsandcolors.net)**
- **[SITE-FAQ]** FAQ pages: Units (Marius; full-strength Warrior in a camp on a hill), Leader (Caesar), Command Cards,
  Battle, Retreat, Evasion, Momentum, Terrain clarifications, Scenarios. https://www.commandsandcolors.net/ancients/the-game/main/faqs/
- The comments under each scenario page 301–319 (82 comments read; few are rules questions).
- The site's own forum could not be searched: `/ancients/forum/...` now returns 404.

**Community**
- BGG, read through the geekdo JSON API (`api.geekdo.com/api/forums/threads?forumid=…&objectid=…&objecttype=thing`,
  `/api/articles?threadid=…`).
  - Expansion 3 is thing **29853** (all 9 Rules threads, 35 General, 7 Sessions, 4 Variants read or scanned).
  - Expansion 2 is thing 24089 (14 Rules threads); the 2+3 combo is thing 169521 (3 Rules threads).
  - Base game 14105: all 622 Rules thread titles scanned; 24 relevant threads read.
- "kduke" (BGG 22608) is Kevin Duke, credited as RULES EDITOR in [LR]: informed opinion, not a ruling.

---

## Q1. Marius and Julian legions: who gets them, and how the pilum works

**Answer.**
- **Marius covers MI and HI.** The Expansion 2 page (and the site's copy on the Expansion 3 page) names only Roman medium
  infantry, but the printed Expansion 3 rulebook, [LR] p.21 and [X4] all give the pilum to Roman medium **and** heavy
  infantry, and the designer FAQ rules that both are pilum-armed whenever the Marius rule is in effect. (The Expansion 2
  battles simply had no ordinary Roman HI.) In 301–305 this matters for the Sertorian HI (302, 303, 305).
- **Pilum (both rules):** a missile-capable unit with range 2. It rolls **1 die** whether it held or moved 1 hex (never 2).
  It follows all ranged-combat rules (line of sight; not at an adjacent enemy; not while adjacent to any enemy), and it
  may not fire and close combat in the same turn. Movement, close-combat dice (MI 4, HI 5), retreat (1 hex) and class
  (medium / heavy) are unchanged.
- **Julian adds:** the unit either moves 1 hex and may battle as normal, or moves 2 hexes and may not battle at all
  (no close combat, no fire). An HI under Julian keeps 5 dice and retreats 1 hex (the Tenth Legion text, which Julian
  reproduces for every Roman MI and HI, says so explicitly).
- **Cards:**
  - Darken the Sky: pilum units are "ranged weapon units", so they are ordered and fire twice (1 die each). [LR] card note;
    kduke and franchi on BGG; franchi reports it happening in play at Pharsalus.
  - Move-Fire-Move and Order Light Troops: no. They order light units only; MI/HI are not light (kduke: "firm no").
  - Line Command: each unit moves at most 1 hex (card limit), so no 2-hex Julian move; a pilum unit that moved 0–1 may fire.
  - Double Time: a Julian MI/HI moves 2 **and may close combat**, but not 3 hexes ([X4] note on the Julian rule). No ranged
    combat under Double Time (card).
  - First Strike, Clash of Shields, Mounted Charge: no pilum effect (close combat only, or not foot).
  - I Am Spartacus: its +1 die applies to pilum fire like any ranged fire (engine §12), so 2 dice.
- **Pilum from a fortified camp:** 1 die − 1 camp die = 0, so the unit cannot fire from a camp (kduke, BGG 417856, 2009;
  one more BGG opinion 2025). Relevant to 308 (Legio X in the Roman camp) and 309 (Pompeian MI in their camps).
- **Scope ("for both armies" with non-Roman troops).** No ruling was found. The pages use three forms:
  - "for both armies / both camps": 301–305 (Marius), 309, 311–315, 318, 319 (Julian);
  - "for the Romans": 316 (the Pontic army has MI 4 and HI 2) and 317;
  - "in effect" with no qualifier: 306–308, where the barbarian armies have no MI or HI, so the scope is moot;
  - 310 lists no legion rule at all.
  GMT clearly chose "for the Romans" when it wanted one side only. So "for both armies" means every MI and HI of both
  armies, whatever the troops or block colour: the Samnite MI (301), the Numidian MI and HI under Saburra (312) and Juba's
  HI (318) all get it. This fits the Marius text (Marius merged Roman and allied Italian soldiers) and history (Juba's
  Roman-style legions).

**Confidence.** Official (rule texts) and Designer (MI+HI). Community for Darken the Sky, Move-Fire-Move and the camp.
None (plain reading) for the scope.

**Sources.** [X3] New Special Rules; [LR] p.21 and p.22–24; [X4] Julian note on Double Time; [RB-FAQ] Units/Marius
(mirrored on the site Units FAQ); BGG 280952 (2008, the Exp 2 vs Exp 3 wording), 391865 (Move-Fire-Move, 2009),
362968 (franchi, Darken the Sky in play, 2008), 417856 (1 die always; 0 in a camp), 3579967 (2025), 844102 (Double Time
moves 2 not 3), 1124962 and 1424214 (Julian = Tenth Legion abilities); Expansion 2 Special Block Mechanic (Tenth Legion).

**Recommended implementation.** Scenario rule `legions: { kind: 'marius' | 'julian', sides: 'both' | <side> }`, applying
to every MI and HI of the named sides. Pilum = ranged, range 2, always 1 die before modifiers; a missile unit for
Darken the Sky, Line Command and the adjacency/LOS rules; never light. Julian: a unit that moves 2 hexes gets
`canBattle = false`, except under Double Time (move ≤ 2, may close combat, no fire) and with Caesar (Q2). Line Command
keeps its 1-hex limit. A ranged roll computed as 0 dice is not offered.

## Q2. Julius Caesar

**Answer.**
- **+1 die.** The unit he is attached to battles with one extra die in close combat, explicitly also into or out of terrain
  that reduces dice. The site's Gergovia FAQ works an example: an HI with Caesar on a hill attacking hill-to-hill rolls
  3 (cap) + 1 = **4**. So the +1 is added after the caps, exactly like Alexander (§17.2). The wall rule says a leader that
  adds dice also raises the wall cap.
- **Battle back, bonus combat, First Strike:** no ruling. The text says the unit "will battle with" one more die in close
  combat, with no exceptions; battle back is part of the close-combat sequence ([LR]; site Units FAQ). Same reading as
  Alexander: every close combat of that unit (attack, bonus, battle back, First Strike, also the wall First Strike of Q3,
  against an evading unit and against a lone leader). He must be attached when the dice are rolled.
- **Not normal dice:** an elephant (318 Thapsus) rolls the attacker's normal dice and ignores bonus dice (designer FAQ),
  so it does not mirror Caesar's die. A leader escaping through the unit faces its normal dice (site Leader FAQ).
- **Move 2 and close combat:** when attached to a foot unit (not a war machine) of his army, that unit may move 2 hexes
  and still close combat.
  - Matters for AX, MI and HI (Julian or not). LI/LB/LS and WA already move 2 and battle.
  - **He must be attached at the start of the unit's move** (Borg via Bill Bennett, 2009; site Leader FAQ: joining a unit
    that already moved 2 does not let it fight). Since a detach happens before the unit moves and a leader who joins a
    unit stops it (§6), this means: attached when the unit starts moving, and still attached.
  - With a Julian MI/HI: yes, move 2 **and** close combat. It still may not **fire** after a 2-hex move (the Julian and
    auxilia rules forbid fire after 2 hexes; Caesar grants close combat only).
  - A Warrior with Caesar that moves 2 need not battle (Borg via Bennett).
  - Double Time adds nothing: no third hex (community, BGG 513284 and 844102; consistent with the [X4] Julian note).
  - Terrain restrictions still apply (Borg on Double Time: the card does not let units ignore terrain battle or movement
    restrictions; same logic here).

**Confidence.** Official text and Site FAQ for the +1 after caps. Designer (relayed) for "attached at the start of the
move". None for battle back etc. (plain reading, engine convention).

**Sources.** [X3]/Expansion 2 Julius Caesar rule; [X3-FAQ] Gergovia Q1; site Leader FAQ "Caesar"; BGG 392108 (Borg via
Bennett, 2009), 340337 (2008), 1361751 (franchi: bonus dice after terrain caps), 513284, 844102; [RB-FAQ] elephants
and bonus dice; [LR] p.11.

**Recommended implementation.** Reuse the Alexander trait (`ccBonus`) for Caesar. Add a trait `moveTwoAndBattle`: an
ordered foot unit (not HWM) that has Caesar attached when it starts moving may move up to 2 hexes and keep
`canBattle` for close combat only (no ranged fire after a 2-hex move). No extra hex under Double Time.

## Q3. Scalable city walls (308 Gergovia, 309 Ilerda)

**Answer.** The rule is official and identical in [X3], [LR] p.20–21 and [X6] (which adds two clarifications).
- **Movement, foot units (not war machines) and leaders:**
  - May enter a wall hex only if the move **starts** adjacent to it, and must stop there.
  - A unit or leader that moves off a wall hex may move only 1 hex that turn.
  - Retreating or evading foot units and leaders pass through or onto wall hexes without stopping.
  - Moving along the wall is no easier: each wall-to-wall step is a full move (Brent, BGG 850345; rules give no exception).
- **Mounted units and war machines:** a wall hex is impassable (no move, retreat or evade onto it; [X6]: no momentum
  advance onto it either). They may close combat a unit on a wall hex only if they **began the turn adjacent** to that wall
  hex ([X6]: adjacent "with the enemy unit they are attacking").
- **Close combat:** a unit attacking a unit on a wall, or a unit on a wall attacking out, rolls at most 2 dice; card and
  leader bonus dice go above the cap. A unit **defending** on a wall ignores 1 sword and may ignore 1 flag against an attack
  from any adjacent hex.
- **Defender strikes first:** a defending unit on a wall that does not (or cannot) evade battles first, as if it held a
  First Strike card, and the combat is treated as a First Strike combat, unless the attacker is itself on an adjacent
  wall hex. Procedure (the First Strike card in [LR] p.23 and the FAQ):
  1. The wall defender rolls its battle-back dice (cap 2, plus leader/Caesar bonus; helmets count with a leader).
  2. If the attacker is **eliminated or retreats out of its hex**, the attack is over: the attacker does not roll.
  3. If the attacker survives in its hex, including when it could not complete its retreat and lost blocks instead (kduke,
     BGG 311516: the mirror of the battle-back rule; this is what the engine already does for First Strike), it attacks
     normally (cap 2 + bonuses).
  4. The wall defender never battles back after that. The attacker keeps momentum advance and bonus combat if its roll
     vacates the hex ([LR] p.13); the first-striking defender cannot advance.
  - This applies to every close-combat attack on the wall unit (initial and bonus), and there is no reason to also play a
    First Strike card.
- **Ranged:** a unit on a wall may ignore 1 flag. Normal LOS; adjacent enemies prevent fire as usual. No dice cap.
- **Line of sight:** a wall hex blocks LOS to units behind it and vice versa, except between units on the same wall looking
  along the wall hexes.
- **Not stated, so not applied:** no rule stops a foot unit from battling on the turn it climbs onto a wall (unlike forest);
  no –1 die (unlike a camp); the wall's sword/flag ignores protect only a defender (as for ramparts).
- **308: wall on a hill.** Every combat involving a wall hex is capped at 2, which is never above a hill cap, so the hill
  changes no dice. Movement follows the wall rule. For LOS the wall blocks anyway, and Borg rules that walls and camps on
  the Gergovia plateau block LOS even between units on the same hill mass (Q6). The only real effect of the hill is the
  steep-slope rule of Q5.

**Confidence.** Official (rule text). Community for "attacker that cannot retreat still attacks" and for movement along
the wall. None for the unstated points.

**Sources.** [X3] New Terrain Hexes; [LR] p.20–21, p.13 (momentum after First Strike), p.23 (First Strike card); [X6];
site terrain page; [SITE-FAQ] Command Cards (First Strike); BGG 850345, 311516, 1363286.

**Recommended implementation.** Terrain `wall` (art: rampart/wall tiles) with:
- move: foot/leader may enter only as the first step of a move, then stop; leaving allows 1 hex only; retreat/evade pass
  freely; impassable to mounted and HWM for move, retreat, evade, momentum;
- attack legality: a mounted unit or HWM may close combat a unit on a wall hex only if its hex at the start of the turn was
  adjacent to that wall hex;
- dice: cap 2 for either hex being a wall (bonuses after caps);
- defence: when attacked, ignore 1 sword and +1 ignorable flag (close combat), +1 ignorable flag (ranged);
- automatic First Strike for the defender unless the attacker stands on a wall hex (use the existing First Strike flow;
  do not consume or offer a First Strike card);
- LOS: blocks as an intermediate hex, except when firer and target both stand on wall hexes of the same connected wall
  and the intermediate hex is a wall hex of that wall.

## Q4. Fortified walls and impassable towns (301 walls of Rome, 303 Lauron, 304 Valentia): line of sight

**Answer.** The scenario pages only say "impassable". The map art is wall/rampart tiles (301: a line of wall hexes with a
2-hex gap; 303 and 304: four corner wall tiles in a ring). These are GMT's Fortified City Walls: impassable for all units,
no battle, and they **block line of sight** to units behind them ([X3], [LR] p.21, site terrain page). Nothing can stand
on them, so there is no "along the wall" case.

**Confidence.** Official for the terrain rule; the identification with Fortified City Walls is our reading of the art.

**Sources.** [X3] Fortified City Walls; [LR] p.21; site fortified-city-walls page; 301/303/304 pages and maps.

**Recommended implementation.** Use `steep` behaviour (impassable, blocks LOS) with wall/town art.

## Q5. Hill–forest steep slopes (308)

**Answer.** Scenario text: hill hexes adjacent to forest hexes are too steep to climb and are impassable for units in the
adjacent forest hexes; units on such hill hexes may still move or retreat down into the forest; and no close combat is
possible between a unit on such a hill and an enemy in an adjacent forest, in either direction. No FAQ or thread exists.
- Applies to **every hexside between a hill hex and a forest hex** on the 308 map. The Gallic camp hexes and wall hexes
  are "considered to be on a hill", so they count as hill hexes here. On the map this matters at least for wall corner
  (0,9) next to forest (0,10) and Gallic camp (2,9) next to forest (2,10); the left-hand forests touch hills at (0,4), (1,4),
  (2,4) and (3,3).
- Forest → hill across such a hexside: forbidden for movement, momentum advance, retreat and evade (a retreat step onto it
  is an unfulfilled retreat hex, 1 block lost). Hill → forest: allowed (move, retreat; evade too).
- No close combat across it either way (no attack, battle back, bonus combat or First Strike), so a unit adjacent only
  across such a hexside cannot be attacked from there. Ranged fire across it is not forbidden (normal LOS).
- Leaders: treated like units [Interp] (the text says "units", but a leader climbing a cliff that blocks units makes no sense).

**Confidence.** Scenario text (official) for the core; [Interp] for camps/walls counting, leaders and evade.

**Sources.** 308 page special rules; 308 map.

**Recommended implementation.** Scenario flag `steepHillForestEdges`: derive the edges automatically (one side hill-like:
hill, Gallic camp, Gergovia wall; other side forest) and apply them in movement, retreat/evade path checks and
close-combat target legality.

## Q6. 308 Gergovia details

**Answer.**
- **Camp + hill (Gallic camps).** Both terrains apply: camp (–1 die when the unit battles; a foot unit ignores 1 sword and
  1 flag when defending; blocks LOS) and hill (caps, LOS). Site FAQs answer the example of a full-strength Gallic WA in a
  camp on a hill vs a Roman HI with Caesar on a hill: the HI rolls **4** (3 + Caesar), the WA **3** (4 – 1 camp = 3,
  within the hill-to-hill cap of 3). The WA figure contradicts the engine's dice order: see Q19. Borg: the camp hexes (and
  the wall hexes) on the plateau **block LOS** between units on the same hill mass.
- **Gallic reinforcements** (4 units + Vercingetorix off board):
  - Released by playing **any** Leadership card (any of the 6; a Counter Attack copying one counts, as for Trebbia, §12).
    No section match is required: the entry hexes are fixed. Releasing is optional, and allowed from the Gauls' first turn
    (no delay is stated, unlike Trebbia).
  - The card is used for the entry and gives no other orders [Interp] (the Trebbia convention; "ordered to enter" says the
    card orders these units).
  - Placement on the 5 marked hexes G1–G5 = (3,0), (4,0), (5,0), (6,0), (7,0), one unit per free hex, Vercingetorix attached
    to one placed unit. If fewer hexes are free than units, the extra units stay off board and may enter with a later
    Leadership card (engine `returnUnplacedReserves`) [Interp]; Romans may block the hexes (BGG 287922, community).
  - They may not move that turn but may battle. Placement is not movement: ranged fire uses **2 dice** (Borg via GeekMail:
    "we have played that they roll 2 dice", BGG 2420019, 2020). They may momentum advance and bonus combat [Interp]: the
    rule forbids moving, and GMT names "advance" separately when it means it (306).
- **Roman reinforcement:** before the next Roman turn after the Gauls entered (in practice at the start of that Roman turn,
  before the card), the Roman **must** place his off-board MI on an empty baseline hex of his left section: row 8,
  columns 0–4 (column 4 is on the dotted line and counts, §1). It is then a normal unit and may be ordered by that turn's
  card. If every such hex is occupied, place it at the start of the first later Roman turn when one is free [Interp].
  Triggered once, by the first Gallic entry.
- **Gallic camps (Roman objective):** a Roman unit on a Gallic camp hex at the start of the Roman turn removes the tile
  (the hex stays a hill). 1st removal: no banner; 2nd and 3rd: 1 permanent banner **each** (2 at most). A site commenter
  wondered whether only one banner is meant; the text gives one "for the second or third" removed, which we read as each.
- **Roman objectives for the Gauls:**
  - Roman camp hex: one, at (7,5) (camp outline, Legio X starts in it). A Gallic unit on it at the start of the Gallic turn
    removes the tile and scores 1 permanent banner (so at most 1).
  - Roman large-camp rampart hexes: the 3 rampart hexes (6,12), (7,11), (8,11) (HWM, LI, HWM at the start; wall art on their
    upper-left sides, so they protect the NW and W edges [Interp from the art]). Each one occupied by a Gallic unit is worth
    1 banner while the unit stays; lost when it leaves or is eliminated.
- **City wall hexes (Roman objective):** the 5 Gergovia wall hexes (0,5)–(0,9). Each one occupied by a Roman unit is worth
  1 banner while it stays.

**Confidence.** Site FAQ and Designer for dice and LOS; Designer (relayed) for reinforcement fire; scenario text plus
[Interp] for the rest.

**Sources.** 308 page and map; [X3-FAQ] Gergovia (both Q&As); site Units FAQ (Warrior in a camp on a hill); BGG 2420019,
287922; 308 page comments (camp-banner question, reinforcement-fire question).

**Recommended implementation.** Terrain stacking for 308 only: a `hill` flag on the camp and wall hexes (camp/wall rules
plus hill caps and hill LOS, with camp/wall still blocking LOS on the plateau). Reserve force with `entryHexes`, any
Leadership card, `noMoveAfterEntry`, 2-dice fire. Forced placement hook at Roman turn start. Objectives per Q7.

## Q7. Start-of-turn occupation scoring (301, 306, 308, 309, 316; 313 ships)

**Answer.** The texts say a unit must occupy the enemy camp **at the start of** its side's turn; the tile is removed and
the banner collected **before a Command card is played**; the banner can never be lost.
- Timing: at the start of the scoring side's turn, before the card. The unit must have survived the opponent's turn there,
  so a unit that only passes through, or ends a move there and is removed or pushed off before its next turn, scores
  nothing. This differs from 011/114 (end of move); both mechanisms are needed.
- Only units score; a lone leader does not [Interp] (the texts say "unit").
- Tile removed: the hex becomes plain (308 Gallic camps: hill). Until removal the occupier is on a camp and has the camp's
  –1 die and protection.
- Sides: 301 Sulla's (bottom) army only; 306 and 316 both sides, each on enemy camps at the start of its own turn; 308
  Romans on Gallic camps (count rule, Q6) and Gauls on the Roman camp; 309 both sides (count rule, Q8).
- Each occupied enemy camp hex is handled separately. A banner that reaches the victory total wins at once.
- 313 ship markers work the same way (Q11).

**Confidence.** Scenario text (official) for timing and permanence; [Interp] for leaders.

**Sources.** 301, 306, 308, 309, 313, 316 pages; [RB-FAQ]/site Scenarios FAQ on Baecula (passing through never scores).

**Recommended implementation.** A `startOfTurnCapture` objective list: `{ capturer, hexes, banner: 'each' | 'count', marker:
'camp' | 'ship' }`, evaluated in the turn flow before `playCard`; removes the tile/marker and calls `gainBanner`.

## Q8. 309 Ilerda: hillock and camps

**Answer.**
- **Hillock** = the 3 hills in a row in the centre section, (3,4), (3,5), (3,6) (the 3 hills by the river are not part of it).
  While the Caesarian side has **more units** on those hexes than the Pompeians (1–0 is enough), it holds 1 banner; when
  that stops being true the banner is **lost** (Borg, site FAQ). Only the Caesarian side can score it. Units only, not
  leaders [Interp]. Evaluate continuously (after every move, retreat, advance or elimination), and a held banner that
  brings the side to 7 wins at once [Interp; consistent with the other temporary banners].
- **Camps:** each side removes enemy camp tiles by occupation at the start of its turn (Q7); no banner per camp; when **both**
  enemy camps are removed, 1 banner, permanent (removed tiles never return) [Interp]. Pompeian camps (0,3), (0,4); Caesarian
  camps (8,3), (8,4).
- Walls of Ilerda: (0,10), (1,9), (2,10), scalable (Q3); (1,10) "Ilerda" is a plain hex.

**Confidence.** Designer for losability. [Interp] for timing.

**Sources.** [X3-FAQ] Ilerda (Richard Borg); BGG 1500787 (2016, repeats the FAQ); 309 page and map.

**Recommended implementation.** `majorityBanner: { side: Caesarian, hexes: [...] }` recomputed with the other temporary
banners; `allCampsRemovedBanner` per side.

## Q9. 310 Utica P1: dice orders in a 2-player or AI game

**Answer.** No ruling exists; the page frames the battle as solo play, with "the Roman player" choosing which unit each die
affects. The only BGG thread (381385, 2009) has no official reply. Our reading for a 2-side game:
- **Who chooses:** the **Numidian** side chooses the unit for each green/blue/red/helmet result (these help the Numidians);
  the **Caesarian** side chooses the unit for each flag and crossed-swords result (the text gives the flag choice to the
  Roman explicitly, including a unit that cannot retreat).
- **Order of resolution:** roll 2 dice at the start of the Numidian turn (instead of a card). Apply swords and flags first
  (Caesarian choices), then the Numidian picks the ordered units among the survivors; then move and battle as usual.
- **Class results:** each die orders one unit of that class (any section) to move and battle normally (no card modifiers).
  Two equal dice order two different units. A die with no eligible unit is lost (no "1 unit of your choice" fallback).
- **Helmet:** orders Saburra and his attached unit, or Saburra alone. A second helmet is lost (one leader).
- **Flag:** the chosen unit retreats as for **one flag** (its normal retreat distance, §10 — the rule's "full move" is the
  old wording for a flag retreat) toward the Numidian edge. It cannot be ignored. Each hex it cannot complete costs 1 block
  (so a blocked unit or one on the edge loses blocks); the normal leader casualty check applies.
- **Swords:** the chosen unit loses 1 block (leader casualty check as usual).
- Units eliminated this way, and a leader killed, give the Caesarians banners as usual.
- **Cards:** the Numidians hold no cards, never draw, and cannot play First Strike. A Caesarian Counter Attack has no
  card to copy and has no effect (the engine's existing behaviour when the opponent has no last card).
- No legion rule (Q1).

**Confidence.** None (no ruling); all [Interp].

**Sources.** 310 page; BGG 381385 (questions and three suggested handlings of Counter Attack, none official).

**Recommended implementation.** A side flag `orderByDice: 2` for the Numidians, replacing play/draw; choice prompts
routed to the side that benefits (orders) or suffers (flag, swords).

## Q10. 311 Utica P2

**Answer.**
- **Cavalry** = LC, MC, HC (the cavalry types of §2; chariots and elephants are not cavalry). The Pompeians have LC 2, MC 1.
- **Exit hexes:** the two hexes labelled "Exit" at the left edge, (4,0) and (5,0), i.e. the far end of the valley between the
  two ridges. A Pompeian cavalry unit scores by moving off the board **from one of these hexes** (off the left edge) as part
  of an ordered move. It need not stop there first, and its route to them does not matter: "moves down the valley" is
  flavour (community, BGG 1226910 and 2217002).
- **Banners:** 1 per exiting cavalry unit, removed from play [Interp]. Castulo convention (010, per unit), and Borg ruled
  that "a camp" meant each camp in Silarus. One BGG poster (2019) guessed only the first counts.
- **Temporary camp banner:** the Pompeian camp is the one hex at (0,5). While a Caesarian unit stands on it, the Caesarians
  hold 1 banner; it is lost when that unit leaves or is eliminated. Evaluate continuously. Any way of getting there counts
  (move, advance, retreat) [Interp]. P1 and P2 are independent battles.

**Confidence.** Scenario text plus Community for the exit hexes. [Interp] for per-unit banners and continuous evaluation.

**Sources.** 311 page and map; BGG 1226910 (2014), 2217002 (2019), 287922 (Borg on Silarus via CSW).

**Recommended implementation.** Generalise the Castulo exit into `exits: [{ side, hexes, edge, unitFilter, banner: 1 }]`
(exit costs 1 hex of movement from the listed hex, as in 010).

## Q11. 313 Brindisi Raid

**Answer.**
- **Hand growth:** the Caesarians start with 2 cards and draw 2 instead of 1 after each of their first three turns
  (2 → 3 → 4 → 5), then 1 per turn, as in 006. "Equal to command" cards use the cards currently held, including the one
  being played (site Command Cards FAQ).
- **Seacoast as fordable river** for movement and combat: use the engine's existing fordable-river rules unchanged (stop on
  entry; close combat max 2 into or out of it; ranged max 1 from it; momentum out per §9.6). Retreat and evade may cross it.
  LOS: neither seacoast nor fordable river blocks LOS, so nothing changes.
- **Ship markers** (spare blocks, not units: they do not block anything):
  - Red (Caesarian transports) on the 4 seacoast hexes inside Brindisi, (0,8)–(0,11). A Pompeian unit on one at the start
    of the Pompeian turn: 1 permanent banner, marker removed, before the card.
  - Grey (Pompeian marine landing hexes) on the 4 seacoast hexes outside Brindisi, (0,0)–(0,3). A Caesarian unit on one at
    the start of the Caesarian turn: same.
- **Brindisi garrison:** the 4 Caesarian units on the ramparts retreat toward the Caesarian (bottom) edge, which is the
  normal rule (Q17). Ramparts: (0,6), (1,6), (2,7)–(2,12) (8 hexes); the protected edges face the Pompeian approach and must
  be read from the art (suggestion: W + SW for (0,6) and (1,6), W + SW + SE for the corner (2,7), SW + SE for the rest).
- **Camps:** the 4 camp hexes (6,3), (6,5), (6,7), (6,9) are ordinary fortified camps with no objective. Antony (6,3) and
  Fufius (6,9) start alone in theirs: legal lone leaders (as 102 Himera); a camp gives a lone leader nothing.

**Confidence.** Scenario text (official); Site FAQ for Command; [Interp] for markers not blocking and the rampart edges.

**Sources.** 313 page and map; site Command Cards FAQ ("Equal to Command"); [LR] p.19–20 (seacoast, fordable river).

## Q12. 314 Dyrrhachium

**Answer.**
- **Exit (designer erratum):** the page's "Roman left section" means the **Caesarian left section baseline**; exiting off the
  side edge does not count (Borg, site FAQ). So: a Pompeian unit leaving the board from a bottom-row hex in the Caesarian
  left section, (8,0)–(8,4), scores 1 banner and is removed from play. Castulo mechanics: exit costs 1 hex of movement; it
  need not stop on the baseline first (community, BGG 2217002). 1 banner per unit [Interp] (same as Q10). An attached
  leader leaves with it, scoring nothing and not counting as eliminated (the 010 rule).
- **Pompeian LI/LB:** the table has LI 1 / LB 2, the map LI 2 / LB 1 (two "L" blocks at (1,6) and (2,1), one "LB" at (1,4)).
  No source settles it. Use the **map** [Interp]: unit positions can only come from it, and both types are light, 4-block
  missile foot.

**Confidence.** Designer for the exit edge; [Interp] for the rest.

**Sources.** [X3-FAQ] Dyrrhachium (Richard Borg); BGG 2217002; 314 page and map.

## Q13. 315 Pharsalus: Caesarian leaders, 4 (table) or 3 (map)

**Answer.** The map shows Caesar, Antony and Calvinus. One site comment says a leader seems to be missing from the map
(historically Publius Sulla commanded Caesar's right), but no source gives a hex for a fourth leader. Use **3 leaders as
drawn** [Interp]; a fourth would need an invented position.

**Confidence.** None.

**Sources.** 315 page (table, comment), 315 map.

## Q14. 317 Ruspina: exits

**Answer.** "A Roman unit or leader that exits off the Numidian side ... **each** counts as one Victory Banner": the exit edge
is the Numidian (top) baseline, any section. A unit and its attached leader exiting together score **2** (one each)
[Interp, plain reading of "each"]. A lone leader may exit as part of his move (up to 3 hexes, the exit step counting as one).
Exits happen only by ordered movement (retreats and evades go toward the Caesarian edge). Exiting pieces are removed from
play; an exited leader is not "eliminated" and gives the Numidians nothing.

**Confidence.** Scenario text plus [Interp].

**Sources.** 317 page.

## Q15. 306 Bibracte: immobile recruits

**Answer.** The two AX in the Roman camp hexes may not move or momentum advance, but may fire, close combat and battle
back. Retreat is not mentioned. GMT's Expansion 3 texts treat moving and retreating as different things (the wall rules
list them separately), and this very rule names "advance" separately from "move". So the recruits **retreat normally**
when flags force them (losing blocks for blocked hexes as usual) [Interp]. Simplest consistent model: the two units keep
the immobile property wherever they end up (no ordered movement, no momentum advance) [Interp]. AX never evade anyway.

**Confidence.** None (plain reading).

**Sources.** 306 page.

**Recommended implementation.** Unit flag `immobile` (move targets empty, no momentum advance); everything else unchanged.

## Q16. 304 Valentia: separate commands

**Answer.** Borg (posting on BGG, 2021): when the Sertorian player plays a card he **chooses one command** for it; if that
command has no unit of the type the card names, the card's "order 1 unit of your choice" alternative applies **within that
command**. Following from that [Interp]:
- Section cards: only units/leaders of the chosen command in that section. Troop and tactic cards (Order Light/Medium/
  Heavy/Mounted, Line Command, Double Time, Clash of Shields, Darken the Sky, Mounted Charge, Move-Fire-Move, Rally,
  I Am Spartacus results): only units of the chosen command are ordered or rallied.
- Leaders belong to their command (Herennius: right/centre, with MC, LS 2, LB, AX 3, MI 3; Perpenna: left, with LC and MI 4).
  A Leadership card must name a leader of the chosen command, and its chain may include only that command's units.
  A leader may be ordered on his own only for his command. Leader effects (helmets, flag ignore, support, Rally adjacency)
  are not restricted.
- First Strike is not an order: any Sertorian unit may use it. A Counter Attack is also played for one chosen command.
- Units never change command (scenario text). The Romans are unaffected.

**Confidence.** Designer for the core; [Interp] for the details.

**Sources.** BGG 2615073 (Richard Borg, 2021-06-01); 304 page comment on Rally (same question).

**Recommended implementation.** Unit and leader field `command: 'A' | 'B'`; after `playCard` the Sertorian chooses a
command; every order validator filters by it. Visual marker for the second command (the map uses light-blue blocks).

## Q17. 303 and 313: units that start in the enemy half

**Answer.** Both pages only confirm the normal rule: these units retreat toward their own edge (303 Herennius' ambush force
toward the Sertorian/top edge; 313 garrison toward the Caesarian/bottom edge), and evade toward it too. 303's ambush force
may be ordered from turn 1. Nothing new is needed.

**Confidence.** Official (base rules) and scenario text.

**Sources.** 303 and 313 pages; [LR] retreat rules.

## Q18. Errata for the Expansion 3 scenarios

**Answer.**
- **Designer errata:** 314 exit edge (Q12).
- **Rules errata:** the Marius rule covers HI as well as MI (Q1); the site's Expansion 3 page still shows the MI-only text.
- **Reference card:** the Expansion 3 (and 2/3 reprint) reference card lists ordinary HI with fire dice "1*" and no range,
  a leftover (community, BGG 1281289); ordinary HI has no fire. The Light Chariot range printed as 2 on the Expansion 2 and 3
  cards should be 3 (designer FAQ; not used in these battles).
- **Components:** Expansion 3 supplies 1 red MC but several battles need 2; the blocks are meant to add to the Expansion 2
  and core armies (BGG 321696). 316 may use other blocks than Eastern ones (box page).
- **Unresolved data mismatches:** 314 LI/LB (Q12), 315 leaders (Q13).
- **Searched with nothing found:** no errata on banners, hand sizes or who moves first. All Expansion 3 BGG Rules and
  General threads, the Exp 2 and combo Rules threads, the relevant base-game Rules threads, the site FAQ pages and the 301–319
  page comments were checked. The site forum could not be reached.

**Sources.** As cited in each item.

## Q19. Fortified camp –1 die versus terrain caps (308 camp on a hill; any camp)

**Answer.** The site Units FAQ works the Gergovia case (full-strength WA in a Gallic camp on a hill, battling a unit on
another hill): 4 dice – 1 for the camp = **3**, which is within the hill-to-hill cap of 3, so it rolls **3**. That applies
the camp penalty to the usual dice **before** the terrain maximum. The engine does the opposite (§4: caps first, then –1,
marked [Interp]) and would give 2. The rules text supports the FAQ: the camp unit rolls one die fewer "than usual", and caps
are maxima. BGG opinion (thread 1554473, 2016: camp unit attacking into broken ground) is split but mostly the same
(penalty first, then cap). No designer ruling.
- Under the FAQ order, an HI in a camp attacking into a forest rolls 2 (5 – 1 = 4, capped at 2), not 1. Ranged fire is
  unaffected in practice (2 – 1 = 1 either way; pilum 1 – 1 = 0 either way).
- Base-game impact: 011 Baecula has camps, so changing the order can change base-game dice in rare cases (a camp unit in
  close combat with a capped hex). Check the `rnd-*` golden fixtures before adopting it globally.

**Confidence.** Site FAQ (worked example) plus Community.

**Sources.** Site Units FAQ, "Full Strength Gallic Warrior in a Camp on a Hill"; [LR] p.20 Fortified Camp; BGG 1554473,
388468.

**Recommended implementation.** Change §4 to `dice = min(base - campPenalty, caps) + bonuses` (all battles), if the golden
fixtures allow; otherwise at least for the Expansion 3 battles, and record the choice in rules-reference §4.

## Q20. "Legio X" labels (306, 307, 308)

**Answer.** The maps label both Roman HI "Legio X", but no Expansion 3 page gives a Tenth Legion rule or a special-unit
block. Under the Julian rule every Roman HI already has exactly the Tenth Legion's abilities (pilum, 5 dice, move 2 without
battle, retreat 1), and the Expansion 3 rulebook says Julian can be retrofitted to replace them. The labels are cosmetic.

**Confidence.** Official text plus Community.

**Sources.** Expansion 2 Special Block Mechanic; [X3] Julian retrofit note; BGG 1124962, 1424214; 306/307 page comments.

## Q21. Other terrain from the survey's §4

**Answer.**
- 315 "all hills impassable": `steep` (impassable, blocks LOS), as for 101/113 (Expansion 1 Q19).
- 315 marsh (1 hex) and 318 marsh (about 9): the standard Expansion 2 marsh rules; 318 sea down the right edge: impassable
  `sea` (does not block LOS); 313's sea is the exception (fordable, Q11).
- 309 and 310 rivers impassable; 302 Baetis fordable (existing).
- 312 "Bagradas River" has no river: no terrain rule.

**Confidence.** Official (terrain rules); scenario text.

---

## Decisions table

| # | Question | Decision for the engine | Basis |
|---|---|---|---|
| 1 | Marius/Julian scope and pilum | Marius = MI **and** HI pilum; Julian = pilum + "move 2, no battle". "For both armies" = every MI/HI of both armies (incl. Samnite 301, Numidian 312, Juba's HI 318); "for the Romans" (316, 317) = Caesar's army only; 310 none. Pilum: range 2, always 1 die, no fire after 2 hexes, never fire and close combat in one turn; HI keeps 5 dice, retreat 1. Darken the Sky yes (fires twice); Move-Fire-Move / Order Light no; Line Command ≤1 hex then may fire; Double Time: move 2 and close combat, never 3; 0 dice from a camp = no fire | Official + Designer (MI+HI); Community (cards, camp); **[Interp]** (scope) |
| 2 | Caesar | +1 die in every close combat of his unit (attack, bonus, battle back, First Strike, wall first strike), after caps; not mirrored by elephants, not for leader escape. Foot unit (not HWM) with Caesar attached when it starts moving may move 2 and close combat (AX, MI, HI; Julian MI/HI included), no fire after 2 hexes, no 3rd hex with Double Time; terrain still applies | Official + Site FAQ (+1 after caps); Designer relayed (attached at move start); **[Interp]** (battle back etc.) |
| 3 | Scalable walls | Implement the official rule fully: enter only from adjacent and stop; leave 1 hex; retreat/evade pass; mounted/HWM barred (also no advance) and may attack only if adjacent at turn start; cap 2 (+bonuses); defender ignores 1 sword + 1 flag (CC), 1 flag (ranged); automatic First Strike unless attacker on a wall: attacker eliminated or retreated = no attack, blocked-retreat survivor still attacks, no battle back; LOS blocked except along the same wall. Hill under 308 walls changes no dice | Official; Community (blocked retreat, wall-walking) |
| 4 | Fortified walls / towns (301, 303, 304) | Impassable **and block LOS** (`steep` behaviour, wall art) | Official terrain rule; **[Interp]** identification |
| 5 | Hill–forest steep slopes (308) | Every hill/forest hexside (camp and wall hexes count as hill): no move/advance/retreat/evade forest→hill; hill→forest allowed; no close combat across either way; fire allowed; leaders as units | Scenario text; **[Interp]** (camps/walls, leaders) |
| 6 | 308 Gergovia | Camp+hill both apply, block LOS on the plateau; reinforcements on any Leadership card (incl. copied), first turn allowed, card used only for entry, placed on (3..7,0) one per free hex, leftovers wait, Vercingetorix attached, no move, may battle with 2-dice fire, may advance; Roman MI placed on (8,0–4) at next Roman turn start, delayed if all blocked; Gallic camps: 0/1/1 banners; Roman camp (7,5) 1 permanent; rampart hexes (6,12), (7,11), (8,11) and wall hexes (0,5–9): 1 temporary banner per occupied hex | Site FAQ + Designer (dice, LOS, fire); **[Interp]** (rest) |
| 7 | Start-of-turn capture | At the start of the scoring side's turn, before the card: each enemy camp hex occupied by an own **unit** → tile removed (plain; 308 hill), permanent banner (or count rule); passing through never counts; each side checks its own turn | Scenario text; **[Interp]** (units only) |
| 8 | 309 Ilerda | Hillock (3,4–6): Caesarians hold 1 banner while they have more units there, lost otherwise, evaluated continuously; both enemy camps removed → 1 permanent banner, both sides | Designer (losable); **[Interp]** (timing) |
| 9 | 310 Utica P1 | Numidians roll 2 dice instead of a card; Caesarian picks flag/swords victims (applied first), Numidian picks ordered units; flag = one-flag retreat, unignorable, blocks lost if blocked; swords = 1 block; extra dice lost; no hand, no First Strike; Caesarian Counter Attack has no effect | **[Interp]** |
| 10 | 311 Utica P2 | Cavalry = LC/MC/HC; exit off the left edge from (4,0) or (5,0), route free, 1 banner per unit, removed; Pompeian camp (0,5): temporary banner while a Caesarian unit stands there | Scenario + Community (route); **[Interp]** (per unit) |
| 11 | 313 Brindisi | Caesarian draws 2 after turns 1–3 (2→5); seacoast = fordable river (LOS unchanged); markers (0,8–11) for Pompeians, (0,0–3) for Caesarians, start-of-turn, permanent, removed, not blocking; garrison retreats down; camps ordinary; lone leaders legal | Scenario text; Site FAQ (Command); **[Interp]** (markers, rampart edges) |
| 12 | 314 Dyrrhachium | Exit off the Caesarian left-section **baseline** (8,0–4), 1 banner per unit, removed; Pompeian LI 2 / LB 1 (map) | Designer (exit); **[Interp]** (count) |
| 13 | 315 leaders | 3 Caesarian leaders as drawn | **[Interp]** |
| 14 | 317 Ruspina | Exit off the top baseline; each unit and each leader scores 1 (unit + attached leader = 2); removed, leader not "eliminated" | Scenario text; **[Interp]** |
| 15 | 306 recruits | Never move or momentum advance; may fire, battle, battle back; retreat normally (losses if blocked); stay immobile after a retreat | **[Interp]** |
| 16 | 304 commands | Each card is played for one chosen command; "1 unit of choice" fallback within it; Leadership needs that command's leader and units; First Strike unrestricted; leader effects unrestricted | Designer (core); **[Interp]** (details) |
| 17 | Units in the enemy half | Normal retreat/evade toward own edge; nothing new | Official |
| 18 | Errata | 314 exit edge; Marius MI+HI; reference-card HI fire is a misprint; 314 and 315 mismatches as above; nothing else found | Designer / Community |
| 19 | Camp –1 vs caps | Apply the camp –1 to the base dice **before** terrain caps (FAQ: WA in camp on hill = 3); check golden fixtures (011 has camps) before changing globally | Site FAQ + Community |
| 20 | Legio X labels | Cosmetic; no special unit | Official text + Community |
| 21 | Other terrain | 315 hills `steep`; marsh standard; 318 sea impassable; rivers as stated | Official |
