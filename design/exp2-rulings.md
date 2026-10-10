# C&C: Ancients Expansion 2 (scenarios 201–223): rulings research

Compiled 2026-10-10. Rules, FAQ and forum text below is paraphrased. Question numbers 1–16 follow the brief; 17 collects other findings. "Survey" = `scratchpad/exp2-survey.md`; "§n" = `design/rules-reference.md`.

## Sources consulted (ranked)

**Official (GMT)**
- **[LR]** GMT living rules, 3rd edition, 2009: https://gmtwebsiteassets.s3.us-west-2.amazonaws.com/living_rules/CC_Rules_2009.pdf (local copy `scratchpad/exp2-src/CC_Rules_2009.pdf/.txt`).
  - It already contains the barbarian chariot (pp.2, 3, 7, 9, 10, 13, 16, 17, 22–24).
  - p.21 has the "Marian/Imperial Legions Rule" (medium **and heavy** Roman infantry) and the Julian Legions Rule.
  - Rolling Fire appears in the leader-casualty list (p.18).
- **[X2]** The Expansion 2 rule-book pages as transcribed on commandsandcolors.net, credited "Written by: GMT Games": New Special Rules (Marius, I Am Spartacus, Rolling Fire, Caesar), New Unit Type (barbarian light chariot, page edited 2026-09-05), Special Block Mechanic (Tenth Legion), New Terrain Hex (marsh). URLs in the survey. Local copies are in `exp2-src/box-*.html`.
- **[SCN]** The 23 scenario pages (GMT text). Local copies are in `exp2-src/pages/`.
- **[X3]** Expansion 3 New Special Rules (GMT text on the site): https://www.commandsandcolors.net/ancients/the-game/game-boxes/expansion-3/new-special-rules-expansion-3.html
  - The Julian Legions rule says a legion that moved 2 hexes may not use ranged fire.
  - It may optionally be retrofitted to Expansion 2's 215–219, 222 and 223.
- **[X4]** GMT Expansion 4 rulebook PDF (2014): https://s3-us-west-2.amazonaws.com/gmtwebsiteassets/cca/CCA-4_Imperial_Rules.pdf (local `exp2-rul-src/gmt/`).
  - Marian rule: MI and HI. A missile-capable legion may not both fire and close combat in one turn.
  - Julian rule: under Double Time a legion still moves only 2 hexes, but may then close combat.
- **No Expansion 2 rulebook PDF and no errata exist online.**
  - GMT's Expansion 2 & 3 combo page (p-730) links only [LR]. The old Expansion 2 page (p-34) and Expansion 3 page (p-147) link nothing.
  - The ConsimWorld archive links cited by the site (WebX …/6517, …/6206) need a login. Their texts were used through the copies relayed on the site.

**Designer**
- **[RB-FAQ]** Richard Borg's FAQ, updated 1/24/08: http://web.archive.org/web/20150701025439/http://www.thewargamer.com:80/ccancients/modules/Official_Ancients_FAQ.pdf (local copy from the Expansion 1 session).
  - It has an Expansion 2 section and the Marius Q&A: medium and heavy infantry.
- **Borg rulings relayed verbatim by others:**
  - **222 held banners:** ConsimWorld post quoted in the 222 page comment #3814 (Mark-McG).
  - **Caesar:** answers to Bill Bennett, quoted on BGG thread 392108 (franchi, 2009).
  - **Expansion 2 forest erratum:** BGG 316624 (franchi quoting RB at CSW, 2008).
  - **Expansion 3 FAQ:** Ilerda hill banner, Dyrrhachium exit, Gergovia Caesar die. https://www.commandsandcolors.net/ancients/the-game/main/faqs/expansion-3.html
- **GMT staff:** Tony Curtis (GMT), relayed on BGG 455005 (2009). He confirmed the missing heavy-chariot sword ignore on the chart is a typo, and gave no ruling on the barbarian chariot.

**Site (commandsandcolors.net)**
- **[SITE-FAQ]** FAQ pages under `/ancients/the-game/main/faqs/`: units, leader, battle, command cards, retreat, evasion, momentum, scenarios, terrain, Expansion 2, Expansion 3. Local copies are in `exp2-src/faq-*.html` and `exp2-rul-src/site/`.
- The site's LBCH unit summary (alecrespi, 2023).
- **[CMT]** The comments under every 201–223 page (extracted to `scratchpad/exp2-comments.txt`).
- **[SITE-F n]** Site forum, Rules category (catid 11): all 97 topic titles were scanned, and topics 255, 1537, 1265, 1336, 1022 and others were read.

**Community**
- BGG via the geekdo JSON API (`api.geekdo.com/api/forums/threads?objectid=…&objecttype=thing`, `/api/articles?threadid=`):
  - Expansion 2 is **thing 24089**: all 100 threads listed, and every Rules thread plus about 35 others read.
  - The Expansion 2 & 3 combo is thing 169521: 15 threads, titles checked.
  - The base game is thing 14105: 2,659 titles searched, and about 38 relevant threads read.
- Downloads are in `exp2-rul-src/` (`exp2-rules.txt`, `base-rules.txt`, `misc.txt`).
- kduke (Kevin Duke, credited rules editor of [LR]), franchi, BradyLS and alecrespi (the site admin) are informed voices, not official ones.

---

## Q1. Barbarian Light Chariot (BCH)

**Answer.**
- **Sword ignore: yes.** The unit ignores 1 sword rolled against it in each close combat.
  - [LR] p.10 lists "chariot units ignore one sword hit in Close Combat" among the general exceptions.
  - The original Expansion 2 book (p.4) and its reference card both said so, per BradyLS's 2009 transcription of the book.
  - Other confirmations: franchi (with the chart), alecrespi (BGG 678649) and the site's LBCH summary ("1 sword hit").
  - The current site Expansion 2 page dropped that line when it was rewritten on 2026-09-05 to follow [LR]. A 2019 site-forum post (Max Bogatov, topic 1537) quotes the earlier page text that had it.
- **Full strength (3 blocks):**
  - It rolls 3 dice instead of 2 in close combat ([LR], [X2], book).
  - **[LR] p.10 and the current [X2] page also give "may ignore one flag" at full strength.**
    - The original book and reference card did not have it. BradyLS and goshublue suspected a copy-paste from the warrior paragraph, and GMT never ruled.
    - [LR] is the highest-ranked text and the site now follows it, so it stands.
  - Timing is the warrior rule ([LR] wording is identical):
    - The bonuses are judged at the start of each combat.
    - A full-strength chariot that loses blocks keeps 3 dice and the flag ignore for the rest of that combat (the flags of that same roll, and its battle back).
    - From the next combat it rolls 2 and has no flag ignore. A bonus close combat counts as a new combat (site Units FAQ, warriors).
- **Leader escape:** a leader escaping through its hex meets 3 dice at full strength and 2 after a loss. This is the site Leader FAQ's explicit table for the barbarian chariot.
- **Evade:** always (light) ([LR] p.16, [X2]).
- **Momentum:** advance plus bonus close combat. As a chariot, not cavalry, it gets no extra hex ([LR] p.17).
- **Card lists** ([LR] p.22–24):
  - It is in the light list (Order Light Troops, Move-Fire-Move) and the mounted list (Order Mounted, Mounted Charge).
  - Order Light Troops' pass-through privilege is for light **foot** only.
  - Under Move-Fire-Move it may make both moves but never fires (no ruling; kentreuber raised it on BGG 455005; plain card text).
  - Mounted Charge gives +1 die but no extra move (the 3-hex move is for heavy units).
  - It is not foot, so Line Command and Double Time do not apply.
- **Rally:** [LR]'s card text says "elephant and chariot units may not be rallied". Applied consistently with the sword ignore, which comes from the same "chariot units" wording, the BCH cannot be rallied. No ruling either way.
- **Hits, retreat, support:** it is hit by green circles. It scores hits on its target's symbol and on swords. It retreats 3 hexes per flag, +1 per elephant or camel flag ([X2]). It gives and receives support normally.
- **Elephants and camels:** none appear in Expansion 2.
  - It counts as a "chariot" for the elephant's red-square and flag ignores and for the camel's blue-triangle ignore ([LR] p.10, p.13).
  - An elephant rolls the target's base dice: **2**. The full-strength +1 is excluded, as the engine already excludes the warrior +1.
- **No ranged combat ever** ([LR] p.9). The FAQ item "Light Chariot fire range 3" is about the never-published 2-block *light chariot*, not the BCH (franchi, BGG 455005 and 571663).

**Confidence.**
- Official for the sword ignore, 3 dice, evade, momentum and card lists.
- Official text but disputed (community) for the full-strength flag ignore.
- Site FAQ for the escape dice.
- [Interp] for Rally, Move-Fire-Move and the elephant value.

**Sources.** [LR] pp.3, 7, 9, 10, 13, 16, 17, 22–24; [X2] New Unit Type; site LBCH summary; [SITE-FAQ] Leader (Leader Escape Q2); BGG 455005, 263303, 263374, 678649, 433421; [SITE-F 1537].

**Recommended implementation.**
- Add unit `BCH`: light, mounted, chariot (not cavalry). 3 blocks. Moves 3 and may battle. No ranged combat. 2 close-combat dice, sword hits score.
- Full-strength trait as for warriors: +1 close-combat die and +1 ignorable flag.
- `ignoreSword` 1 in every close combat.
- Evades always. Retreats 3 hexes per flag, +1 per elephant or camel flag. Advance plus bonus combat, no extra hex.
- Escape dice 3 or 2. Elephant rolls 2 against it.
- In the light and mounted card lists. Excluded from Rally.

## Q2. Marius Legions rule (206–223)

**Answer.**
- **Who:** Roman **MI and HI** of the Roman army ([LR] p.21, [RB-FAQ], [X4]; [X2] says MI only, but the designer FAQ settles it).
  - In Expansion 2 the only Roman HI under the rule are the Tenth Legion units, which have the pilum anyway.
  - "Roman" is the army, not the block colour: Lentulus' army in 210 (drawn grey) has it, as do the Roman units behind the lines in 213.
  - Barbarian MI never get it. The Roman WA in 222 does not (WA is neither MI nor HI).
- **Fire:** range 2. **Always 1 die**, whether the unit held or moved 1 hex (BGG 417856). It may not fire after moving 2 hexes, by the rule's own wording; [X3]'s Julian text says so explicitly.
  - With Caesar the unit may move 2 and close combat, but cannot then fire.
  - Double Time forbids ranged combat anyway.
- **It is a missile unit for every ranged rule:**
  - No fire at an adjacent enemy, and none at all while adjacent to any enemy unit.
  - Line of sight applies. The target cannot battle back or evade. Leader casualty checks apply.
  - **Never both fire and close combat in one turn** ([LR] p.21, [X4]). An MI ordered by any card that allows battle chooses one or the other.
- **Dice modifiers:**
  - A unit on a fortified camp rolls 1 − 1 = **0** and cannot fire (kduke, BGG 417856; Robin, BGG 3579967; this is the engine's §4 order).
  - A firer in a fordable river or marsh stays at 1.
  - The I Am Spartacus card's +1 battle die does apply to its fire ("battle" covers both kinds of combat: franchi and sduke, BGG 626159 and 610713). Only the Romans could use it, with the plain card.
- **Cards:**
  - Darken the Sky: yes, it fires twice at 1 die each (kduke, BGG 391865; [LR] "all ranged weapon units").
  - Move-Fire-Move: **no** (light units only; kduke and Wulf, BGG 391865).
  - Line Command: it may move 1 hex and fire.
  - Clash of Shields and Double Time: no fire.

**Confidence.** Designer/Official for MI+HI, 1 die and no fire plus close combat in one turn. Official text ([X3]) for no fire after 2 hexes. Community for the camp 0 dice, Darken the Sky and Move-Fire-Move.

**Sources.** [X2] Marius; [LR] p.21; [RB-FAQ] Units; [SITE-FAQ] Units; [X3]; [X4] p.6–7; BGG 280952, 417856, 391865, 3579967, 626159.

**Recommended implementation.**
- Scenario rule `mariusLegions`: every MI and HI of the Roman side gets ranged fire at range 2, always 1 die, only if it moved 0–1 hexes.
- It is a "missile unit" for Darken the Sky. It is not light (no Move-Fire-Move).
- Keep the §4 dice order, so a camp gives 0 dice and the unit cannot fire.

## Q3. Tenth Legion (215 ×2, 217 ×1)

**Answer.**
- An HI (red square) with a special-unit block that works as in Expansion 1.
- Pilum as in Q2: range 2, 1 die if it held or moved 1.
- It may move 1 and close combat with 5 dice, **or move 2 and not battle** (no fire, no close combat).
- It retreats 1 hex per flag.
- No other abilities: no flag ignore, no helmet hits ([X2] Special Block Mechanic).
- **Double Time:** it still moves only 2 hexes, but may then close combat. There is no 3-hex move.
  - This is GMT's own wording for the identical Julian ability ([X4]). Community agrees (toddrew and Brigz, BGG 844102). kduke alone suggested 3 hexes without battle.
- **With Caesar attached:** it may move 2 and close combat (Q4), but not fire after moving 2.
- Line Command caps it at 1 hex. It is ordered as heavy (Order Heavy Troops).
- In 215 the two units keep their abilities wherever they are and are ordered separately ([SCN] 215).

**Confidence.** Official ([X2], [X4] analogue). Community for Double Time.

**Sources.** [X2] Special Block Mechanic; [SCN] 215, 217; [X4] Julian rule; BGG 844102, 1424214.

**Recommended implementation.**
- Elite preset `tenthLegion` (HI only): pilum ranged (range 2, 1 die, not after moving 2) and a 2-hex move with no battle.
- Under Double Time: 2 hexes and battle.

## Q4. Julius Caesar (215, 217, 218)

**Answer.**
- **+1 close-combat die** for the unit he is attached to, added after terrain caps ([X2] text). The designer analogue is the Gergovia ruling in the site's Expansion 3 FAQ: hill cap 3 plus Caesar = 4. franchi agrees (BGG 1361751).
  - Battle back, bonus close combat, First Strike and rolls against an evading unit or a lone leader are not ruled. The plain reading and the engine's Alexander convention (§17.2) apply it to every close combat. Community play applied it to battle back (218 page comment #814).
  - It is not used for leader-escape dice (normal dice, site FAQ). Elephants do not mirror it.
- **Move 2 and close combat:** applies to any Roman foot unit except war machines.
  - In Expansion 2 that means LI, LB, LS (no change), AX (can now battle after 2), MI and HI (including the Tenth).
  - **Caesar must be attached when the unit begins its movement.** A unit he joins after it moved 2 may not battle (RB via Bill Bennett, BGG 392108; site Leader FAQ).
  - RB: a warrior with Caesar may move 2 and choose not to battle. There is no Roman WA in the Caesar battles.
- **Terrain still applies:** stopping in forest, river or marsh, and the forest no-battle rule for MI and HI. This is RB's Double Time principle that cards do not override terrain (site Command Cards FAQ).
- **Cards:**
  - Double Time with Caesar: 2 hexes and battle, not 3 (BGG 844102; [X4] Julian wording).
  - Line Command keeps its 1-hex limit, and Clash of Shields its no-move rule. Tactic card text takes precedence ([LR] p.23).
- No fire after a 2-hex move (Q2).

**Confidence.** Official for the caps. Designer for attachment at the start of the move. Community and [Interp] for battle back, bonus combat and First Strike.

**Sources.** [X2]; [X3]; [SITE-FAQ] Leader (Caesar) and Expansion 3 (Gergovia); BGG 392108, 340337, 844102, 1361751; [CMT] 218.

**Recommended implementation.**
- Leader trait `caesar` = existing `ccBonus` plus a new `move2Battle`.
- `move2Battle`: an attached foot unit that is not a war machine may move up to 2 and close combat, but only if Caesar was attached when it started moving.
- Card movement caps (Line Command 1, Clash 0) still apply.

## Q5. "I Am Spartacus" Slave rule (208, 210–214)

**Answer.**
- **The base card** ([LR] p.23, §12):
  - Roll dice equal to Command. Each class symbol orders one unit of that class. A helmet orders any unit or leader. Flags and swords order nothing.
  - Ordered units battle with +1 die this turn, close combat **and** ranged.
  - Detaching is allowed.
  - Afterwards, reshuffle the deck and discards.
- **The Slave rule only changes the roll:** Command + 2 dice when the Slave player plays the card. Everything else is unchanged. The Roman player gets no bonus ([X2]). With a 6-card hand that is 8 dice; with 5 cards (213, 214) it is 7.
- **"Spartacus is present":** no ruling.
  - The scenarios switch the rule on only where he is on the map; 209, without him, omits it.
  - [Interp]: the +2 applies only while the Spartacus leader is on the board. It ends when he is eliminated, or when he evades off the board.
- **Counter Attack:**
  - A Slave Counter Attack copying a Roman I Am Spartacus counts as playing that card, by the engine's convention that a Counter Attack copying a card counts as that card (§12). So it gets +2 if Spartacus is present. Each player always rolls his own Command (site Command Cards FAQ).
  - A Roman Counter Attack copying a Slave card rolls Roman Command only.

**Confidence.** Official for the card and the +2. [Interp] for "present" and Counter Attack.

**Sources.** [X2]; [LR] p.23; [SITE-FAQ] Command Cards (Counter Attack); BGG 626159, 610713, 1776624 (Minedog3: the +2 needs Spartacus as general).

**Recommended implementation.**
- Scenario rule `spartacusDice`, side = Slave, leader id = Spartacus.
- The I Am Spartacus order roll uses Command + 2 while that leader is on the board. A Counter Attack copying the card qualifies.

## Q6. Rolling Fire (210)

**Answer.** These are [X2]'s stated points; [Interp] marks the gaps filled.
- **Who:**
  - Any Slave **foot** unit (LS, AX, MI, WA in 210), missile-capable or not.
  - It must be on a hill hex when ordered, and stays there: no movement that turn.
  - It is its battle for the turn. It may not also fire, close combat or momentum-advance.
- **Card:** any **non-Tactic** card that could order it to move or battle: Section, Troop or Leadership cards.
  - Tactic cards cannot: Line Command, Double Time, Clash, Darken, Move-Fire-Move, I Am Spartacus, Rally, Mounted Charge.
  - [Interp] A Counter Attack copying a non-Tactic card counts as that card (§12 convention).
- **Adjacency:** allowed even while adjacent to enemy units, and an adjacent enemy can be in the path. The text says the adjacent defender may not battle back, so the §8 adjacency bans do not apply.
- **Path:** up to 3 connected hexes.
  - Each step goes to one of the two neighbours one row nearer the Roman baseline (SW or SE; the row increases by 1), like a retreat step. The Slave player picks the route.
  - It passes through units and leaders.
  - It may not enter a hill hex. If both forward options are hills or off the board, the path ends. If neither first hex can be entered, Rolling Fire is impossible from that hill.
  - It may enter any other non-clear terrain but stops there; that hex is still a target.
  - [Interp] Otherwise it always runs the full 3 hexes. No line-of-sight check: the path rules replace it.
- **Targets:**
  - [Interp] Every unit in the path hexes, **friend or foe**. The text says "each unit". The engine precedent is the elephant rampage (§10).
  - [Interp] Targets are fixed when the path is declared and resolved nearest first, each completely (blocks, leader check, retreat) before the next. A target that has left its hex is skipped. A unit that retreats into a later path hex is not attacked.
- **Dice:**
  - **2 dice per target, fixed.** [Interp] No terrain caps, no camp penalty. No card bonus can arise, since Tactic cards cannot order it.
  - Hits on the target's own symbol only. Swords and helmets do nothing.
  - **No flag may be ignored for any reason** (leader, support, rampart, camp, warrior, BCH). Retreats are normal, including block loss for blocked retreats.
  - No battle back. No evade, since it is ranged combat ([LR] p.8).
  - Leader casualty checks for attached leaders are normal.
- **Lone leader in a path hex:** not attacked, but must evade 1–3 hexes at once, with normal escape rules.
  - A Roman leader evades toward the Roman edge, as written.
  - [Interp] A Slave lone leader evades toward his own side. The text was written for Roman leaders, and this reuses §11 unchanged.
- **Cost:** after all targets are resolved, the rolling unit loses 1 block. That triggers a leader casualty check ([LR] p.18). If it eliminates the unit, the Roman player scores the banner as for any eliminated unit [Interp, general rule].

**Confidence.** Official for the stated points. [Interp] for friendly targets, order, fixed dice, Slave leaders and full length. The only community discussion (BGG 372124, kduke and franchi) defends the Roman-edge-only direction. SkookumPete's AAR (BGG 264671) shows the 3-hex down-slope use.

**Sources.** [X2] Rolling Fire; [LR] p.18; [SCN] 210; BGG 372124, 264671.

**Recommended implementation.**
- New order option `rollingFire`, only in 210 for Slave foot units on hills ordered by a non-Tactic card.
- Path choice as described. Multi-target 2-die ranged rolls with `noFlagIgnore`.
- Lone-leader forced evade. Self-loss of 1 block afterwards.

## Q7. 210 separate Roman armies

**Answer.**
- Each Roman **unit** has an army tag fixed at setup: left of the central hills = Lentulus, right = Gellius ("Gellus" in the text). Units never change army.
- **Every card the Roman plays orders units of only one army.** This holds even when a section holds units of both armies ([SCN] 210: "elements of a Command card cannot be shared").
- **Leaders:** the text limits **units** only.
  - [Interp, plain reading] Leaders are not restricted.
  - A Leadership card on any Roman leader orders him plus a chain of units that must all be one army, including his attached unit.
  - A section card may order leaders plus units of one army.
  - Leader benefits work for both armies: helmets, flag ignore, support, Rally source.
- **Every card type** is constrained the same way [Interp]:
  - Clash of Shields: choose an army; only its units adjacent to the enemy are ordered.
  - Darken the Sky: that army's missile units only.
  - I Am Spartacus and Rally: choose the army before rolling; results apply only to its units.
  - Counter Attack: choose the army.
  - The "if you have none, order 1 unit" test counts both armies.
- The map's grey colour for Lentulus is cosmetic (the page suggests standing versus flat blocks).

**Confidence.** Official for the unit limit. [Interp] for leaders and card-by-card details. No community ruling: SkookumPete and Valvorik only note that it weakens Line Command and Coordinated Attack.

**Sources.** [SCN] 210; BGG 264671; [CMT] 210.

**Recommended implementation.**
- Scenario rule `separateArmies`: `army` tags on Roman units.
- Order validation: all units ordered by one card share a tag, and leaders are free. The AI and UI choose the army per card.

## Q8. 206 Marcellus' ambush

**Answer.**
- **Trigger cards:** any Leadership card (Inspired L/C/R, Leadership Any Section) or Order Light Troops. [Interp] A Counter Attack copying one of these also counts (§12 convention).
- **No first-turn restriction:** Trebbia states one, 206 does not.
- **Section:** an Inspired card's own section, from the **Roman** player's view (franchi, BGG 315440). Any Section and Order Light Troops let the Roman choose.
- **Entry hexes:** empty, passable hexes of the **German (top) baseline** in that section.
  - The map draws the force above the top edge.
  - This matches the official Trebbia answer that Mago enters on the enemy baseline ([SITE-FAQ] Scenarios) and the engine's `ambushEntryHexes`.
- **How many per card:** "the force enters". All four units are light (LI, AX, AX, LC), and every trigger card can order all of them:
  - Any Section: the leader's hex plus 3 linked.
  - Inspired: the leader's hex plus 4.
  - Order Light Troops: Command 6.
- [Interp, as Trebbia is implemented] The whole force enters on one card, which then orders nothing else. Units that cannot be placed stay off the board for a later trigger. Marcellus is placed with any one of them.
- **Movement and battle:** placement is the first hex of movement. The units then move and battle normally:
  - LI: 1 more hex and battle.
  - AX: battle without moving further, or 1 more hex without battle.
  - LC: up to 3 more hexes and battle.
  - Light foot may pass through friends under Order Light Troops.
- **Retreat:** toward the Roman side, i.e. their own side as usual.

**Confidence.** Official text for the triggers and placement. Site FAQ (Trebbia) for the edge. Community for the section view. [Interp] for whole-force entry; The-Admiral, [SITE-F 1265], reads it the same way.

**Sources.** [SCN] 206; [SITE-FAQ] Scenarios (Trebbia); BGG 315440; [SITE-F 1265]; [CMT] 206.

**Recommended implementation.**
- Generalise `magoAmbush`: trigger card set = Leadership ∪ {Order Light Troops}; `notFirstTurn: false`; entry on the enemy baseline (reuse).

## Q9. Objective banners: timing, loss, leaders

### 9a. Held banners (204, 213, 214, 222)

**Answer.**
- **Borg's 222 ruling** (ConsimWorld, quoted in [CMT] 222 #3814): the banner is gained **the moment** a Roman unit moves onto the hex. It is kept while the unit stays, and lost when the unit moves off or is eliminated. The maximum stays 2.
- **204, 213 and 214** use the same "captures (occupies) … if it moves off or is eliminated, it no longer counts" wording, so the same model applies.
- **The model:** a side holds the banner while any of its **units** stands on a qualifying hex. It can be lost and regained any number of times.
- **Caps:**
  - 204: either Roman camp, at most 1 for both.
  - 213: the single Slave camp.
  - 214: see Q10.
  - 222: 1 per rampart hex held by a Roman unit, at most 2.
- **Occupation:** [Interp] state-based. A unit counts on any hex where it stands after a move, momentum advance, retreat or evade. A hex merely passed through does not count.

### 9b. Hill control (202)

**Answer.** The page text is explicit:
- **When:** checked at the end of **every** player turn, after battles.
- **Who gains:** if one side has more **units** on hill hexes, it gains 2 banners. If the other side already held them, they transfer.
- **Ties:** a tie (including 0–0) removes them from the holder, and nobody gets them.
- **What counts:** only occupied hills.
- Designer analogue: Expansion 3's Ilerda ruling (RB), where hill control and its banner change hands and the banner is lost with control.
- The inactive side can gain at the end of its opponent's turn.

### 9c. Section clear (219)

**Answer.**
- **When:** at the end of each Roman turn.
- **Gain:** +1 Roman banner per section with no **Briton unit**, unless that section's banner is already held.
- **Loss:** the banner is lost at once when a Briton unit enters that section by any means (move, retreat, evade or advance) [Interp, "moves back into"].
- **Regain:** it can be regained at a later end of a Roman turn.
- **Boundaries:** a hex on a dotted line belongs to both sections (§1), so a Briton there denies both [Interp].

### 9d. Camp capture at the start of the turn (201, 208, 211, 215, 221)

**Answer.** All checks happen at the **start of the capturing side's turn, before a card is played**. All these banners are **permanent**. A captured camp tile is removed and the hex becomes clear terrain.
- **201:** each Gallic camp with a Roman unit on it is removed. When the third is removed, the Romans gain +1 banner.
- **208:** +1 for **each** Roman camp held by a Slave unit, so up to 4.
  - Community reading: beckerdo and athos, BGG 290046.
  - Lone Roman leaders start in two camps and must be driven out first (normal lone-leader rules).
- **211:** Roman units on **2 or more** of the 3 Slave camps give +1 once. **All three** tiles are then removed (ColtsFan76, BGG 2884575; plain "the camp hex terrain tiles").
- **215:** both sides, at the start of their own turn.
  - The Romans score for a unit on the Belgic camp hex.
  - The Belgae score for a unit on the Roman "unfinished camp", which is the rampart hex. That rampart is removed, losing its protection.
  - 1 banner each at most.
- **221:** +2 for a German unit on the Roman camp hex: the single fortified-camp hex inside the ramparts. The rampart hexes are not camps.

### 9e. Common points

**Answer.**
- **Lone leaders never count** for any occupation, hill or section objective. Every text says "unit".
- **Victory:** objective banners count like any other. Victory is checked whenever a side's total **rises**, including at a start-of-turn check (before the card) and an end-of-turn check. Losing a held banner only lowers the total; it can never undo a win already reached.

**Confidence.**
- 9a: Designer (222), extended to the identical wordings.
- 9b: Official text plus the designer analogue.
- 9c: Official text, [Interp] for boundaries and the "moves" reading.
- 9d: Official text, Community for 208 per camp and 211 all three.
- 9e: [Interp], consistent with §13.

**Sources.** [SCN] 201–222; [CMT] 222 (RB), 208, 213; [SITE-F 255] (alecrespi, same reading); [SITE-FAQ] Expansion 3 (Ilerda); BGG 290046, 2884575.

**Recommended implementation.**
- An objective framework with `held` (continuous, cap), `hillControl`, `sectionClear` and `campCapture { when: 'startOfTurn', threshold, value, removeTile, perCamp }` kinds.
- Re-check after every position change and at turn start and end.

## Q10. 214 Silarus: last-row retreat and "the camp hex"

**Answer.**
- **Last row:** the Slave baseline (row 0, top).
  - A Slave unit on row 0 that must take an accepted retreat move is **eliminated**, and the Romans score the banner.
  - So is a Slave unit that reaches row 0 with retreat hexes left.
  - Ignored flags cause no retreat, so they never trigger it.
  - [Interp] A retreat that ends by attaching to a lone friendly leader on row 0 has no hexes left, so it does not trigger it.
  - It applies to retreats only, not evades.
  - An attached leader takes the normal 1-die check, then evades (off his own baseline if he must).
- **Camp:**
  - The map has two camp tiles on the Roman right: a palisade camp holding a Roman LI (beside two ramparts), and a tent camp on the Roman baseline. 204 uses that same tent tile for its Roman camps.
  - The 214 text ("the camp hex") is a copy of 213's single-camp wording.
  - **[Interp] Either camp hex counts; a Slave unit on either holds the banner; at most 1 banner** (the 204 formula). The text promises only one banner, and this cannot misplace it.
  - One AAR ([CMT] 214, Elitesim) "occupied both Roman camps to end the game", i.e. counted 2 banners. That is a single unofficial report, so it is not followed.

**Confidence.** Official text for the last row. [Interp] for the camp.

**Sources.** [SCN] 214; map `CCA_maps/214.jpg`; [CMT] 214.

**Recommended implementation.**
- Scenario rule `lastRowRetreatKills` for the Slave side.
- Held objective on both camp hexes, cap 1.

## Q11. 222 first player; 203 and 218 banners

**Answer.**
- **222: the Romans move first**, per the War Council text. The map star at the top left is the only conflict; every other map agrees with its page.
  - This follows the Expansion 1 practice (Q11 there) of trusting the scenario text over site artefacts.
  - Romans assaulting a rampart with the 6-card hand also fits the usual pattern.
  - No errata or comment was found.
- **203: 4 banners.** The War Council text says 4, and the page comments report games ending 4–1, 4–0 and "the Romans reached their 4 banners" (Valvorik, Novak, RobS). The "8 banners" tag is metadata.
- **218: 6 banners** (War Council). There is no tag.

**Confidence.** Site text plus community play for 203. [Interp] for 222 (no corroboration either way).

**Sources.** [SCN] 203, 218, 222; [CMT] 203; maps 222 and 203.

**Recommended implementation.** Scenario data: 222 bottom first; 203 victory 4; 218 victory 6.

## Q12. 223 very steep hills and removable ramparts

**Answer.**
- **Moving onto a hill from lower ground:** the unit stops and may not **battle** (close combat or ranged) that turn.
  - Moving hill to hill is unaffected.
  - Retreats and evades are not "moves".
  - Lone leaders are unaffected [Interp].
- **Momentum advance:** allowed. If it goes from lower ground onto a hill, there is no bonus combat.
- **Close-combat dice:**
  - Uphill: 1. Down from a hill: 2. Hill to hill: min(3, the unit's dice).
  - These **replace** the normal hill caps and apply to both sides, including battle back judged from the battling-back unit's side, as in §4. There are no mounted units in 223.
  - [Interp] They are treated as caps: card bonuses add on top, since [LR]'s terrain rule is that cards modify the maximum.
  - Combine with the other caps (fordable Severn, 2) by taking the minimum.
- **Ranged combat and line of sight:** normal hill rules. The text covers close combat only.
- **Ramparts:** removed at once when a **Roman unit** occupies one or passes through it.
  - [Interp] Any entry counts: move, advance or retreat.
  - The hex becomes clear.
  - Briton units and lone leaders never remove them.

**Confidence.** Official text. [Interp] for card bonuses, leaders and the cleared terrain. One AAR (BGG 419639) confirms the steep hills slowed the Romans; there is no ruling.

**Sources.** [SCN] 223; [LR] p.19 (Hill), p.20; BGG 419639.

**Recommended implementation.**
- Scenario flag `verySteepHills`: a cap table override plus a stop-and-no-battle effect on entering a hill from lower ground.
- Rampart removal by a Roman unit (dynamic terrain).

## Q13. 212 ditch; 217 seacoast as a fordable river

**Answer.**
- **Ditch (212):**
  - Every unit stops on entering and moves no further that turn.
  - [Interp] Lone leaders stop too, as in [LR]'s other stop terrain (forest and ford say "all units and leaders").
  - Nothing else changes: no dice cap, battling right after entering is allowed (mounted units too), war machines may enter, and line of sight is not blocked.
  - [Interp] Momentum advance into a ditch is allowed, but ends a cavalry extra hex. Advancing **out** is unrestricted ("no other battle effects"), unlike the ford and marsh rule of §9.6. One BGG group played it as no advance out (earache, BGG 279761); that is minority play.
  - Retreats and evades pass through.
  - It is drawn with broken-ground tiles but has **none** of the broken-ground rules.
- **Seacoast (217):** every seacoast hex **is a fordable river** for movement and combat.
  - Units and leaders stop on entry.
  - Close combat into or out of it is capped at 2. Ranged fire out of it is capped at 1. Card bonuses add on top.
  - A unit in it may momentum-advance out only if it did not move this turn (§9.6).
  - Retreat, evade and leader evade may enter it. Line of sight is not blocked.
  - The 8 Roman units that start there are in a ford.
  - Board-edge rules are unchanged.

**Confidence.** Official text. [Interp] for leaders and momentum.

**Sources.** [SCN] 212, 217; [LR] p.19–20; BGG 279761.

**Recommended implementation.**
- New terrain `ditch`.
- In 217, the scenario maps `sea` to a capped fordable `river` (sea art).

## Q14. Exit banners (210, 212, 221)

**Answer.**
- **Who may exit:**
  - 210: any Slave unit, off the Roman (bottom) edge.
  - 212: Slave **foot** only, off the Roman edge. Slave cavalry may not exit at all ([SCN]; beckerdo and earache, BGG 279761).
  - 221: any Roman unit, off the German (top) edge.
- **Banner and removal:** 1 banner per unit, and the **unit is removed from play** (stated in 212 and 221).
  - 210: [Interp] removed too. Exited units cannot stay off the board, and Expansion 3's Dyrrhachium ruling (RB) says an exiting unit is removed and may not re-enter.
- **How:** as the engine's Castulo rule (§14). A unit on a baseline hex of that edge, in any section, spends 1 more hex of movement to leave.
  - It cannot exit if it stopped on stop terrain this turn, unless it started its move there.
  - Exiting is only possible through ordered movement: no retreat, evade or momentum advance.
- **Leaders:** an attached leader leaves and is removed with the unit, with no extra banner and no enemy banner. A lone leader cannot exit for a banner.

**Confidence.** Official text for 212 and 221. Designer analogue for 210. [Interp] for the mechanics, which reuse Castulo.

**Sources.** [SCN] 210, 212, 221; [SITE-FAQ] Expansion 3 (Dyrrhachium); BGG 279761.

**Recommended implementation.** Generalise `castulo` exits with per-scenario {side, edge, sections, unit filter (all / foot)}.

## Q15. 201–205 block colour and the Marius rule

**Answer.**
- **Block colour is cosmetic** (franchi, BGG 867439; Brian_Asklev, BGG 1321149).
  - The book's default is the Roman blocks of the box (red), with grey optional.
  - The site draws all five battles in grey.
- **The Marius rule is off in 201–205.** It starts "with Aquae Sextiae and all later battles" ([X2]), and 201–205 do not list it.

**Confidence.** Official text plus community.

**Sources.** [SCN] 201–205; [X2]; BGG 867439, 1321149.

**Recommended implementation.** Default **grey** for 201–205, matching the site maps used as the source, with an optional red art toggle. No Marius rule there.

## Q16. Units set up behind enemy lines (202, 208, 212, 213)

**Answer.**
- Every unit, and every leader's evade, always goes toward **its own side**, wherever it starts ([LR] p.13; [SCN] 202 and 213 notes).
- Community confirms it for 208 (g1ul10 and kduke, BGG 2372526) and 202 (Wulf Corbett and kduke, BGG 304540). beckerdo flags it as a 208 gotcha (BGG 290046).
- Concretely:
  - 202 Regulus' army retreats down through the Gauls; units on row 0 or 1 often lose blocks.
  - 208 Slave units behind the Romans retreat up through them.
  - 212 Slave LC retreat toward the top.
  - 213 Marcius retreats down, Castus up.
  - 206's ambush force retreats down (its own side).
- A leader may evade off the board only across his own baseline.

**Confidence.** Official, confirmed by the community.

**Sources.** [LR] p.13, p.16; [SCN] 202, 213; BGG 2372526, 304540, 290046.

**Recommended implementation.** No change. The AI should value these retreat traps.

## Q17. Other findings

- **Expansion 2 rulebook forest erratum (RB, 2008, BGG 316624):** MI and HI with an attached leader do **not** get a bonus combat after advancing into a forest. Only LI, LS, LB, AX (with leader) and WA can. The engine's §9.6 already matches.
- **215:** one Belgic MC is printed with Carthaginian art. Use Barbarian art ([SITE-FAQ] Expansion 2, also in [RB-FAQ]).
- **Julian Legions retrofit:** [X3] (GMT) lets players apply the Julian rule to 215–219, 222 and 223 (not 220 or 221).
  - Under it, all Roman MI and HI may move 2 without battle, and the Tenth's move ability becomes redundant (BGG 1424214).
  - It is an optional variant; it is not part of the Expansion 2 defaults.
- **Marsh (220, 221):** the Expansion 2 FAQ rulings already match the engine: leader checks after marsh loss, and the lone-leader marsh roll on move and evade.
- **Leader names (cosmetic):** "Beorix" and "Boiorix" are the same king, as are "Teutobodus" and "Teutobod". 210's text spells Gellius as "Gellus". The 212 map does not name Crassus.
- **Searched with nothing found:**
  - No official ruling on Rolling Fire details, the 210 leaders, the 214 camp, the 222 first player, 223 card bonuses or ditch momentum.
  - No GMT errata file.
  - ConsimWorld needs a login.
  - All 14 BGG Expansion 2 Rules threads, all 97 site Rules topics and all 23 scenario comment threads were read.

---

## Decisions table

| # | Question | Decision for the engine | Basis |
|---|---|---|---|
| 1 | Barbarian chariot | Light mounted chariot, 3 blocks, moves 3 and battles, no fire, 2 dice. Ignores 1 sword in every close combat. At full strength (judged per combat, as warriors): +1 die and +1 ignorable flag. Escape 3/2. Evades always. Advance + bonus combat, no extra hex. Retreats 3 (+1 per elephant/camel flag). In the light and mounted card lists (Move-Fire-Move moves only). Elephant rolls 2 against it. No Rally | Official ([LR]); flag ignore disputed; escape: Site FAQ; Rally, Move-Fire-Move, elephant: [Interp] |
| 2 | Marius rule | Roman MI **and** HI (the army, not the block colour). Range 2, always 1 die, only after moving 0–1. Full missile-unit rules; never fire and close combat in one turn. Camp gives 0 dice. Darken the Sky yes; Move-Fire-Move no | Designer/Official; Community (camp, cards) |
| 3 | Tenth Legion | HI with pilum. Move 1 and battle (5 dice) or move 2 without battle. Retreat 1. Double Time: 2 hexes and battle (no 3). Ordered separately in 215 | Official (+[X4] analogue) |
| 4 | Caesar | +1 close-combat die in every close combat, after caps (as Alexander). Attached foot (not war machines) may move 2 and battle if Caesar was attached when it began moving. Terrain stops and card limits still apply. Double Time stays at 2. No fire after 2 hexes | Official text; Designer (attachment); [Interp] (battle back etc.) |
| 5 | I Am Spartacus | Base card unchanged. Slave order roll = Command + 2 while the Spartacus leader is on the board. A Slave Counter Attack copying the card qualifies. Romans: no bonus | Official; [Interp] (presence, Counter Attack) |
| 6 | Rolling Fire | Slave foot on a hill, ordered by a non-Tactic card (or a Counter Attack copying one); no move; replaces its battle; allowed when adjacent. Path of up to 3 hexes, each one row nearer the Roman edge, chosen by the player; no hills; stops in other terrain; no line of sight. Fixed 2 dice vs every unit in the path (friend or foe, nearest first); symbol hits only; no flag ignores; no battle back or evade. Lone leaders evade (Romans toward the Roman edge, Slaves toward their own side). Firer then loses 1 block (leader check; Roman banner if eliminated) | Official text + [Interp] |
| 7 | 210 armies | Units tagged Lentulus (left of hills) or Gellius (right). Each card orders units of one army only, for every card type. Leaders unrestricted; benefits work for both armies | Official (units); [Interp] (leaders, card details) |
| 8 | 206 ambush | Triggers: any Leadership card or Order Light Troops (or a Counter Attack copying one); no first-turn limit. Section from the Roman view (Any Section / Order Light Troops: chosen). Whole force enters on empty German-baseline hexes; placement = 1st hex; then normal move and battle. Unplaced units wait. Retreat toward the Roman side | Official text; Site FAQ (edge); Community; [Interp] (whole force) |
| 9a | Held banners 204/213/214/222 | Continuous: banner while a unit stands on the hex; lost when it leaves or dies; regainable. 204 cap 1; 222 one per rampart, cap 2 | Designer (RB 222 ruling) |
| 9b | 202 hill control | End of every player turn: the side with more units on hills holds 2 banners (they transfer); a tie or 0–0 removes them | Official text (+RB Ilerda analogue) |
| 9c | 219 section clear | End of Roman turn: +1 per section with no Briton unit. Lost at once when a Briton unit enters; regainable. Dotted hexes belong to both sections | Official text; [Interp] (boundaries) |
| 9d | Camp capture 201/208/211/215/221 | Start of the capturing side's turn, before the card; permanent; tile removed (clear). 201: each occupied camp removed, +1 after the 3rd. 208: +1 per camp. 211: ≥2 of 3 → +1, all 3 removed. 215: both sides, 1 each (rampart = Roman camp). 221: +2 for the single camp hex | Official text; Community (208 per camp, 211 all) |
| 9e | Common | Units only (lone leaders never count). Victory checked whenever a total rises; losing a held banner never undoes a win | [Interp] |
| 10 | 214 | Slave unit retreating from, or into, row 0 with hexes left is eliminated (Roman banner); not when stopped by attaching a leader; not evades. Camp: either camp hex, cap 1 banner | Official text; [Interp] (camp) |
| 11 | 222 / 203 / 218 | 222: Romans move first. 203: 4 banners. 218: 6 banners | Site text (+Community play for 203); [Interp] for 222 |
| 12 | 223 steep hills | Entering a hill from lower ground: stop, no battle (close combat or ranged). Advance up: no bonus combat. Close-combat caps up 1 / down 2 / hill-to-hill min(3, dice), replacing hill caps, both sides; cards add on top. Ranged and line of sight normal. Rampart removed when a Roman unit enters or passes through | Official text; [Interp] (card bonus, ramparts) |
| 13 | 212 ditch / 217 coast | Ditch: units and lone leaders stop; no other effect (no caps, battle allowed, war machines enter, advance in and out allowed, no line-of-sight block). 217 seacoast = capped fordable river in every respect | Official text; [Interp] (leaders, momentum) |
| 14 | Exits 210/212/221 | Castulo mechanics on the whole enemy baseline: 1 banner, unit removed (210 too). 212 foot only. Attached leader leaves with it, no extra banner | Official (212, 221); Designer analogue (210) |
| 15 | 201–205 | Grey blocks by default (cosmetic red option). No Marius rule | Official text + Community |
| 16 | Behind enemy lines | Retreat and evade always toward own side; no special cases | Official + Community |
| 17 | Other | Forest bonus combat after advance: no MI/HI (already in the engine). 215 MC Barbarian art. Julian retrofit is an optional variant only | Designer / Site FAQ / Official |
