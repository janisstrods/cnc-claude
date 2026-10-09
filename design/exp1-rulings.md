# C&C: Ancients Expansion 1 (scenarios 101–124): rulings research

Compiled 2026-10-09. Rules and FAQ text below is paraphrased; the only verbatim quote is the one-line FAQ answer in Q1.

## Sources consulted (ranked)

**Official (GMT)**
- **[LR]** GMT living rules, 3rd edition, 2009. https://gmtwebsiteassets.s3.us-west-2.amazonaws.com/living_rules/CC_Rules_2009.pdf
  - Linked as "Living Rules" from GMT's Expansion 1 product page: https://www.gmtgames.com/p-628-commands-colors-ancients-expansion-1-greece-eastern-kingdoms-3rd-printing.aspx
  - Covers LBC, camel, HWM, ramparts, special units and the troop-type lists on the cards.
  - Local copy: `(scratchpad) rules-src/gmtpdf/CC_Rules_2009.pdf`.
- **[BP2]** GMT Bonus Pack #2 (© 2006): Cronium, Indus, Pydna. These are scenarios 122–124. https://s3-us-west-2.amazonaws.com/gmtwebsiteassets/cca/CCBonusPack-2.pdf (linked from the same GMT page).
- **[TW]** GMT "Truceless War" scenarios, which contain the first war-machine stat block. https://s3-us-west-2.amazonaws.com/gmtwebsiteassets/living_rules/CC%20Truceless%20War-2.pdf
- **[EL]** GMT "Elephant Rules Consolidated V3". https://s3-us-west-2.amazonaws.com/gmtwebsiteassets/cca/Elephant_Rules_Consolidated_V3.pdf
- **[X6]** Expansion 6 rulebook (GMT), as transcribed on commandsandcolors.net:
  - New unit types: https://www.commandsandcolors.net/ancients/the-game/game-boxes/expansion-6/new-unit-types-expansion-6.html
  - Retrofitting notes: https://www.commandsandcolors.net/ancients/the-game/game-boxes/expansion-6/retrofitting-expansion6-blocks-into-expansion1.html
  - New terrain: https://www.commandsandcolors.net/ancients/the-game/game-boxes/expansion-6/new-terrain-hexes-expansion-6.html
- **[X4]** Expansion 4 new unit types (GMT text on the site): https://www.commandsandcolors.net/ancients/the-game/game-boxes/expansion-4/new-unit-type-expansion-4.html
- **[X2/3]** The Julius Caesar rule (GMT text on the site), used as an analogue for Alexander: https://www.commandsandcolors.net/ancients/the-game/game-boxes/expansion-2/new-special-rules-expansion-2.html

**Designer**
- **[RB-FAQ]** "FAQ – Commands & Colors: Ancients © 2008 Richard Borg", updated 1/24/08. It has an Expansion #1 section.
  - Archived copy: http://web.archive.org/web/20150701025439/http://www.thewargamer.com:80/ccancients/modules/Official_Ancients_FAQ.pdf
  - Local copy: `(scratchpad) rules-src/wayback/Official_Ancients_FAQ.pdf`.
  - The same text is mirrored at https://www.commandsandcolors.net/ancients/the-game/main/faqs/expansion-1-greeks-and-eastern-kingdoms.html (published 24 Apr 2008, updated 6 Sep 2015).

**Site (commandsandcolors.net)**
- **[SITE-FAQ]** The FAQ pages under https://www.commandsandcolors.net/ancients/the-game/main/faqs/ (units, battle, leader, retreat, terrain clarifications, scenarios).
- The unit pages (LBC, camel, HWM, HC, EL) and terrain pages (rampart, fortified camp, hill).
- The comments under each scenario page.

**Community**
- BGG forums, read through the geekdo JSON API (`api.geekdo.com/api/forums/threads`, `/api/articles?threadid=`). The XML API now returns 401 without a token.
  - Expansion 1 is thing 22605. The base game is thing 14105.
- The commandsandcolors.net forum, Rules category (catid 11).
- "kduke" on BGG is Kevin Duke, credited as RULES EDITOR in [LR]. His posts are an informed opinion, not official rulings.

---

## Q1. Alexander's +1 close-combat die

**Answer.**
- **Terrain caps (designer FAQ):** the +1 is added on top of the terrain dice limits, exactly like a command-card bonus. Work out the normal dice after the terrain caps, then add 1.
- **Battle back, bonus close combat, First Strike:** no ruling was found for any of these. The scenario text gives one extra die in close combat, with no exceptions.
  - In [LR], Battle Back is a step of the Close Combat procedure.
  - The leader rules say leaders inspire units that are attacking or battling back.
  - The FAQ also says battle back was meant to be part of the attacker's combat sequence.
  - So the plain reading is that the +1 applies in every close combat: attack, battle back, bonus close combat and First Strike.
- **Elephants:** an elephant's dice mirror the "normal" dice of its opponent. [LR]/[EL] say the elephant does not use any bonus die the other unit receives. kduke on BGG (2010) reads Alexander's die as such a bonus.
- **Leader escape:** this uses "normal" close-combat dice. The site FAQ rules that command-card bonuses do not apply there.

**Confidence.** Designer for the caps. None for battle back and the other cases (inference from the rule text; community opinion agrees).

**Sources.**
- [RB-FAQ], Expansion #1 section. The question is whether the bonus adds on top of terrain limits like a card bonus. The answer is: "Yes, Alexander is one tough dude."
- Mirrored on [SITE-FAQ]. Cited again on BGG thread 2327345 (kentreuber, 2019-12-09) and on the site forum, topic 840 (2010).
- [X2/3] Caesar rule, a close analogue: +1 close-combat die, explicitly including combat into or out of dice-reducing terrain.
- [LR] p.11 (Close Combat procedure step 8, Battle Back) and p.12 (leaders inspire units attacking or battling back).
- Site FAQ "Units/Warrior": battle back is part of the attacker's sequence.
- [LR] p.10 elephants. BGG thread 561217 (kduke, 2010-09-05): Alexander's die is a bonus, so elephants do not mirror it.

**Recommended implementation.**
- Keep ours: +1 die in all close combat (attack, battle back, bonus close combat, First Strike), added after the terrain caps.
- Exclude it from the "normal dice" that elephants mirror.
- Exclude it from leader-escape rolls.

## Q2. Companion Cavalry: ignore 1 sword, may ignore 1 flag

**Answer.**
- The ignored sword is a sword rolled against the Companions in close combat (any close combat, attacking or defending). It works the same way as the heavy-chariot and cataphract "ignore one sword hit" rules. [X6] restates the Companion ability with identical wording.
- The flag-ignore stacks with leader and support flag-ignores. Bolster Morale in [LR] says multiple sources are cumulative.
- **Elephants:** against an elephant, the first sword is ignored and not re-rolled. Later swords hit and are re-rolled. This is the official rule for any unit that can ignore sword hits.

**Confidence.** Official for the stacking (general rule). Community for "swords rolled against them", which is uncontested.

**Sources.**
- [LR] p.14, Bolster Morale: several flag-ignore situations combine.
- [LR] p.11: an elephant does not re-roll swords that its target ignores through terrain or its own ability.
- BGG thread 290769 (franchi, 2008-02-09): Companions plus Alexander plus support can ignore 3 flags and 1 sword. He also notes they still take blue-triangle and helmet hits, and swords beyond the first.
- BGG 809381 (earache, 2012): with a leader they ignore two flags, and a third if supported.
- BGG 634300 (2011): against an elephant, ignore the first sword, apply the second and re-roll only the swords that hit.
- [X6] Greek Companion Cavalry entry.

**Recommended implementation.** Keep ours.

## Q3. Persian Immortals (108 Issus)

**Answer.**
- Range 3.
- 2 dice if the unit did not move, 1 die if it moved. As an MI it moves 1 hex, so it may move 1 hex and then fire 1 die.
- It may not use both ranged and close combat in the same turn.
- Otherwise it is a normal MI (4 dice in close combat, medium for hits and orders).
- No errata.

**Confidence.** Official (Expansion 6 rulebook, retro-defining the Immortals).

**Sources.**
- [X6] New Unit Types, "Persian Immortals": they are both close-combat and missile units, range three hexes, 2 dice when holding and 1 when moving, and no ranged and close combat in the same turn.
- BGG thread 1349077 (2015) quotes the same text.
- BGG 177729 (2007): community already assumed light-bow stats, and a 2014 post points to the Expansion 6 text.
- [SITE-FAQ] Battle: bow and sling units have range 3. Medium foot armed with bows is noted in the scenario's War Council.

**Recommended implementation.** Keep ours. The unit is also a "ranged weapon unit" for Darken the Sky.

## Q4. Bow-armed Indian Auxilia (123 Indus)

**Answer.**
- Range 3.
- 2 dice if it did not move, 1 die after a 1-hex move.
- The normal auxilia restriction still applies: no fire after moving 2 hexes.
- In every other respect it is a normal AX: 3 close-combat dice, hits on swords, light for orders and hits, retreats 1 hex.
- The official bonus-pack text also makes these 3 units special units (special-unit block), with no other special ability.

**Confidence.** Official for the bow and range 3 (bonus-pack text plus the range rule in [LR] and the FAQ). Community for "otherwise unchanged AX".

**Sources.**
- [BP2] Indus special rules: the three Indian Auxilia are special units, armed with bows, and follow the bow-weapon ranged rules. The web page paraphrases this as "as for regular Bow Infantry".
- [LR] p.8 range table: light bow 3 hexes. Exception: an auxilia that moves two hexes cannot use ranged combat.
- [SITE-FAQ] Battle: bow and sling units have range 3.
- Site comment on 123 (Mark-McG, 2018): treat them as auxilia in every respect except range 3.

**Recommended implementation.** Keep ours.

## Q5. Sacred Band (104) and Silver Shields (113, 114)

**Answer.**
- **Sacred Band:** helmets always score hits for this unit, with no leader needed.
- **Silver Shields:** the wording omits the "no leader needed" clause, but it should be played identically. Two reasons:
  - Read literally, the ability would do nothing. Any unit with an attached or adjacent leader already scores helmets.
  - GMT used the same short wording for the Praetorian Guard [X4 mechanics page] and for the base Sacred Band summary.
- No errata.
- [X6] says it supplies a silver block so the Silver Shields can be retrofitted into Expansion 1, which treats it as a standard special unit.

**Confidence.** Official for the Sacred Band. None (inference) for the Silver Shields wording.

**Sources.**
- 104 page; [X6] Theban Sacred Band (explicitly no leader needed).
- [LR] p.21 Carthaginian Sacred Band: a leader does not have to be attached or adjacent.
- Expansion 4 Praetorian Guard: scores a hit per helmet, worded without the clause.
- [X6] retrofitting page.

**Recommended implementation.** Keep ours: the same mechanism for both.

## Q6. Poor Persian Leadership (107 Granicus)

**Answer.**
- **Leadership cards:** a Leadership card orders the leader plus the unit he is attached to, and nothing adjacent. In [LR], a Leadership card orders the leader, his attached unit, and units in adjacent linked hexes. The scenario rule removes only the linked units.
  - A leader cannot detach on a Leadership card ([LR] p.7, p.22).
  - The card's alternative, "or order one unit of your choice", still exists.
- **Lone satrap:** RAW, a Leadership card can order a satrap who is alone (he is "the leader", and there is no attached unit to add). He may move. Per [LR] p.7, a unit he joins is not ordered by that.
- **Support:** there is no official ruling on whether a lone satrap counts as support.
  - RAW yes: a lone leader can act as a support unit, and the scenario rule does not remove this.
  - BGG is split. 2007: elirlandes and athos say yes. 2020: cannoneer says no. Minedog3 points out there is still no errata after 13 years, so play RAW.
- **Rally card:** the rule does not restrict it (units in or adjacent to a leader's hex can rally). RAW, satraps still enable Rally for adjacent units. This was not discussed anywhere.

**Confidence.** Site/scenario text for orders. Community (split) for support.

**Sources.**
- 107 scenario page.
- [LR] p.22, Leadership cards.
- [LR] p.14, a lone leader acts as an adjacent support unit.
- BGG threads 156464 (2007/2020) and 2492238 (2020).

**Recommended implementation.**
- Keep ours: leader plus attached unit only, and the "1 unit of choice" option is kept.
- Allow ordering a lone satrap.
- Keep satraps as support providers (RAW).
- Leave Rally unrestricted.

## Q7. Hellespont (112): leader loss and the instant win

**Answer.**
- No official clarification was found. Play it as written.
- Command (troop and Line card counts) is defined as the current maximum hand size. [LR] p.5 says Command rises or falls with the hand limit at the moment a card is played, so a leader loss also reduces Command.
- **Lost on the opponent's turn:** pick one card uniformly at random from the owner's hand and discard it, immediately.
- **Lost on the owner's turn:** skip that player's end-of-turn draw.
- **"Both opponent leaders":** each side starts with exactly 2 leaders (Craterus and Neoptolemus; Eumenes and Alcetus), so "both" means all of that side's leaders.
- **"Eliminated":** a leader killed for a banner. A leader who evades off his own baseline is removed without a banner ([LR] p.16) and is not "eliminated". Inference: he neither shrinks the hand nor counts toward the instant win.

**Confidence.** None (scenario text only). The Command point is Official (general rule).

**Sources.**
- 112 scenario page.
- [LR] p.5 (Command definition) and p.16 (evading off the battlefield gives no banner).
- Site comment by clavain (2021) describes play as written.

**Recommended implementation.**
- As ours.
- Also lower Command along with the hand limit.
- Do not count leaders who evade off the board.

## Q8. Heraclea (116): the River Siris "passable only at the bends"

**Answer.** No ruling was found. Treat the bend hexes as fordable river: stop on entry, close combat max 2, ranged out max 1, and card bonuses lift the caps.
- [LR] p.19: river hexes are impassable unless the scenario makes them fordable. "Fordable" is the only passable-river state in the rules.
- The base-game Crimissos uses the same bend-hex art, and its text makes the river fordable only at its five bends.

**Confidence.** None (inference from rules structure and precedent).

**Sources.**
- 116 page.
- Base 002 Crimissos page (special rules).
- [LR] p.19 River and Fordable River.

**Recommended implementation.** Keep ours (fordable river at the bends).

## Q9. Heraclea "Fright at First Sight"

**Answer.**
- "Infantry" in CCA names every foot type: light, light bow, light sling, auxilia, warrior, medium and heavy infantry; war machines are not infantry. The Roman army in 116 has LI, AX, MI and HI only, so this means all Roman foot.
- The rule covers any flag that an elephant rolls against a Roman infantry unit in close combat: the elephant attacking, battling back, in bonus close combat, or via First Strike. The text keys on flags rolled by the elephant while the two units are in close combat.
- No leader, support or other flag-ignore applies.
- Not found discussed anywhere.

**Confidence.** None (plain reading).

**Sources.** 116 page; [LR] p.6 foot unit list.

**Recommended implementation.** Keep ours.

## Q10. Issus (108): the Pinarus "fordable with no battle dice reductions"

**Answer.**
- Only the dice caps are removed: no close-combat max of 2 and no ranged-out max of 1.
- Movement rules for a fordable river still apply: stop on entry, plus whatever momentum restriction the engine uses for fordable rivers.
- No official ruling.
- BGG 2772763 (2021) discusses only the dice. franchi notes the river was nearly dry, which is the reason for the no-reduction rule.

**Confidence.** None (inference: movement effects are not "battle dice reductions").

**Sources.** 108 page; [LR] p.19; BGG thread 2772763.

**Recommended implementation.** Keep ours: stop on entry, no caps.

## Q11. Asculum (117): banners and leader placement

**Answer.**
- **Banners: 6.**
  - The War Council text (the scenario text) says 6.
  - "7 banners" appears only in the site's metadata tag, on both the map page and the scenario-list page.
  - The site's recorded results on the stats page end 3–6.
  - Some AARs (ozzie, 2016) played to 7, probably following the tag.
- **Leader placement:** no restriction is stated, in 117 or in the official C3i Epic Asculum (3 leaders each, same wording).
  - RAW only the general rules apply: at most one leader per hex, and a leader may stand alone ([LR] p.7).
  - Placement "on the battlefield" therefore permits any hex not holding an enemy unit or another leader.
  - The map draws the 4 leaders in the corner hexes, off the lines, which indicates "to be placed".
  - No community discussion was found.

**Confidence.** Site (scenario text) for 6. None for the placement limits.

**Sources.**
- 117 page and https://www.commandsandcolors.net/ancients/scenario-list/pyrrhic-war-280-270-bc/117-asculum-279-bc.html
- C3i16 Epic Asculum page.
- [LR] p.7 leader rules.

**Recommended implementation.**
- 6 banners.
- Our "own unit hex without a leader, Roman first" is a house restriction and is reasonable (it is simple for the AI and UI). Document it as such.
- The RAW-faithful alternative: also allow empty hexes, perhaps limited to the player's own half.

## Q12. Roman Tactical Flexibility (120, 121, 124; optional)

**Answer.**
- **The official GMT text** is in [BP2] (Pydna, scenario 124). It is more specific than the web pages:
  - The Greek HI must be unsupported and in non-broken-ground terrain.
  - It must be attacked by a Roman MI or HI.
  - If able to battle back, it uses only 3 dice.
- **"Unsupported":** the standard bolster-morale sense, i.e. not supported by two friendly units in adjacent hexes.
  - A lone friendly leader counts as one supporting unit.
  - An attached leader is not "support".
- **"Greek heavy infantry":** all HI of the non-Roman army.
  - 121's block-colour issue is moot: the official errata says the Seleucids use Greek blocks (Q18).
- **Scope:** the rule affects battle back only.
  - First Strike is not a battle back ([LR] First Strike note), so it is unaffected.
  - Bonus close-combat attacks by Roman MI or HI do trigger it, because the HI is still "attacked".
- **Broken ground:** 120 and 121 contain none, so applying the clause everywhere changes nothing there. It matters only in 124.

**Confidence.** Official ([BP2] text). Official/general rules for "supported".

**Sources.**
- [BP2] p.4, Pydna special rules: the unsupported Greek HI must be in non-broken-ground terrain.
- 120, 121 and 124 web pages (no terrain clause).
- [LR] p.14 Bolster Morale (two friendly units; a lone leader counts).
- [LR] p.23 First Strike note.

**Recommended implementation.**
- **Changed:** add the "defender not on broken ground" condition. Use the bonus-pack wording for all three scenarios.
- The rest stays as ours.

## Q13. Camel (121 Magnesia)

**Answer.**
- **Ignored hit:** a camel ignores one blue-triangle hit, in close combat only, when the enemy rolling against it (attacking or battling back) is cavalry or chariot. The Expansion 1 page's "one symbol hit" means this.
- **Extra retreat:** every cavalry or chariot unit retreats 1 extra hex per flag rolled by a camel in close combat.
  - That covers LC, LBC, MC, **HC**, cataphract cavalry, heavy chariots and barbarian chariots.
  - [X4] says heavy cataphract cavalry (identical to HC otherwise) retreats extra against elephants or camels.
- **No flag-ignore:** a camel does **not** ignore a flag from cavalry. Only elephants have that, and the camel rules contain no such clause.
- **Elephants vs camels:** an elephant rolls 3 dice against a camel.
- **Camel dice:**
  - 3 dice attacking.
  - 2 dice when battling back **and when using First Strike**.
  - 3 dice when a leader escapes through its hex (FAQ).
- **Other camel rules:** ignores 1 flag if supported. Evades foot and heavy mounted. Momentum advance plus bonus close combat, but no extra cavalry hex. Retreats 3. Medium for orders and hits.

**Confidence.** Official.

**Sources.**
- [LR] p.10, Camel Unit Combat (blue-triangle ignore, extra retreat, 2 dice in battle back and First Strike); p.10 elephant special situations (3 dice vs camel); p.13 score-hits exceptions; p.17 camels are not cavalry for the extra hex.
- [EL] the same.
- BGG thread 302002 (2008): "symbol hit" means a blue triangle.
- Site forum topic 1098 (2011): the elephant red-hit ignore applies in close combat only. The same logic applies to camels.
- [SITE-FAQ] Leader page: escape vs camel = 3.

**Recommended implementation.**
- **Changed:** extend the extra retreat to HC and all cavalry and chariot types.
- No flag-ignore for camels.
- Camels use 2 dice on First Strike as well as on battle back.
- The rest stays as ours.

## Q14. Heavy War Machine (110 Jaxartes, 118 Beneventum)

**Answer.** Consolidated from official sources:

| Item | Rule | Source |
|---|---|---|
| Blocks / class | 2 small blocks. Red (heavy). Classed as heavy foot for being ordered and taking hits, so red squares and swords hit it. | [LR] p.2, p.6 |
| Move | 1 hex. It may not battle (fire or close combat) after moving. | [LR] p.6, p.8; [TW] |
| Ranged | Range 6. 2 dice if it held. Cannot fire if it moved. Normal ranged rules: no fire at an adjacent unit, so effective minimum range is 2. No ranged fire while adjacent to an enemy. | [LR] p.8; [TW]; site HWM page (Hold 2 / Move 0) |
| Line of sight | Normal LOS rules. No indirect fire, and no shooting over units or terrain. | [LR] p.8; BGG 378489 (2009) and 799760 (2012), kduke: no other LOS rules exist |
| Close combat | Only from where it stands, 2 dice. Swords do not score hits. It can battle back normally (2 dice). Never momentum advance or bonus close combat, even with a leader attached. | [LR] p.10, p.13, p.17 |
| Evade | May evade like a light unit, but needs a legal 1–2 hex evade path ("almost always"). Attacker rolls normal dice; only red squares hit, per the general evade rule. Eliminated by the roll: banner. Otherwise it makes the evade move and is then **removed, with no banner**. | [LR] p.16 (War Machine Evade); BGG 1343627 (2015); [TW] |
| Retreat | 1 hex per flag (its movement allowance). Normal block loss when blocked. | [LR] p.13 (retreat = movement); [TW] "Retreat: 1 hex"; site page |
| Support | Gives and receives support like any unit (ignore 1 flag if supported). | Site page; general rules |
| Terrain | May not enter broken ground. May not move, evade or retreat onto marsh. Scalable city walls and buildings are impassable. Forest and fordable river are allowed with normal effects. Neither broken ground nor marsh appears in 110 or 118. | [LR] p.19–21; [X6] |
| Orders | Order Heavy Troops: yes (listed among heavy types). Line Command: yes (foot), but a moved HWM cannot then battle. Double Time: may be in the group, but is excluded from the 2-hex move, and Double Time forbids ranged fire anyway; [TW] says it may not double time. Mounted Charge and Move-Fire-Move: no. Darken the Sky: fires twice. Clash of Shields: yes if adjacent (+2 dice). I Am Spartacus: red square. Rally: allowed. | [LR] p.22–24; [TW] |
| Elephant vs HWM | 2 dice (the elephant mirrors the 2 dice the HWM normally rolls against it). | [LR] p.10 |
| Fortified camp | –1 die if it fires from a camp hex. In 118 the HWMs stand on rampart hexes, which have no dice penalty. | [LR] p.20 |

**Confidence.** Official, plus Community for "only red squares hit an evading HWM" and the explicit LOS confirmation.

**Recommended implementation.** As in the table. This confirms our survey entries and adds: battle back allowed, evade needs a path, normal LOS, minimum range 2 by adjacency, elephants roll 2, and Order Heavy and Line Command eligible.

## Q15. Light Bow Cavalry

**Answer.**
- **Classification:**
  - Light (green circle), so Order Light Troops and Move-Fire-Move ("light mounted units") apply.
  - Mounted, so Order Mounted Troops and Mounted Charge apply (LBC is in both mounted-type lists).
  - Cavalry, so it gets the cavalry special momentum: advance plus 1 extra hex, but not after a bonus combat.
  - Order Light Troops lets light **foot** move through friendly units; this does not apply to LBC.
- **Elephants vs LBC:** 2 dice, mirroring the 2 dice LBC rolls in close combat.
- **Retreat:** 4 hexes per flag, plus 1 per flag rolled by an elephant or camel (LBC is cavalry).
- **Other:** may always evade. Fire range 3: 2 dice if it held, 1 if it moved. 2 close-combat dice, swords don't hit.

**Confidence.** Official.

**Sources.**
- [LR] p.4 (symbols), p.6 (movement), p.8 (range 3), p.10, p.16 (evade), p.17 (cavalry momentum includes light bow), p.22–24 (card type lists).
- Expansion 1 New Unit Types page.
- Site LBC page.
- BGG 3721562 (2026, site admin): the only difference from LC is range 3.

**Recommended implementation.** Keep ours.

## Q16. Ramparts (102 Himera, 118 Beneventum)

**Answer.** The official rule is in the core living rules [LR] p.20, repeated in [X6]:
- **Movement:** no restriction for any unit, including cavalry (BGG 900591).
- **Facing:** protects the 2 (or 3) forward-facing hexsides. The site FAQ says a "corner rampart" tile protects 3 edges.
- **Close combat:** a defender attacked across a protected hexside ignores 1 sword and may ignore 1 flag.
- **Ranged:** a target fired at through a forward rampart hexside may ignore 1 flag.
- **Mounted units:** get no benefit. Foot units, including the HWM, benefit.
- **Defender only:** a unit on the rampart attacking out gets no benefit and suffers no penalty.
  - Unlike a fortified camp, there is no –1 die.
  - Reported answer by Tony Curtis (GMT) on ConsimWorld, quoted on BGG 287001 (2008): ramparts benefit only the unit defending behind them.
  - kduke: it works like a fortified camp limited to certain hexsides.
- **Line of sight:** a rampart does not block LOS.
- **Units beyond it:** a unit behind or beyond the rampart hex gets nothing (BGG 3419895, 2024).
- **Elephants:** the ignored sword is not re-rolled by elephants.
- **Fortified camps:** rampart and camp are different hexes on these maps and never stack.
- **Scenario books:** neither page states rampart or camp special rules, and nothing indicates the books had any (see Q20 and Q21). Camps and ramparts are terrain only, with no banner objective.
- **Orientation:**
  - 118: the 4 Roman rampart pieces face the Epirote (top) edge, so the protected hexsides are the two upper ones.
  - 102: the 7 Carthaginian pieces face the Syracusan (bottom) edge, except the diagonal piece near the top centre-right, whose two walled edges must be read from the art.

**Confidence.** Official (with Community/GMT-staff confirmation of the direction).

**Sources.**
- [LR] p.20 Ramparts.
- [X6] Rampart.
- [SITE-FAQ] Terrain clarifications (corner rampart = 3 edges).
- BGG 287001, 1532799 (2016, kduke), 3419895, 900591.

**Recommended implementation.**
- Keep ours (the site rampart page = the official text; foot only).
- Model protection per hexside from the tile orientation, with an optional 3-edge corner variant.

## Q17. Granicus (107): Persian MI 2 / MC 3 (table) vs MI 4 / MC 1 (map)

**Answer.** The **table is right: MI 2, MC 3.** The units with Rhoesaces and Spithridates are **MC (3 blocks)**, not MI. Evidence:
1. GMT's Expansion 6 retrofit note (official) puts the Persian medium-infantry units on the Persian baseline. It names "two Persian (M) units", which are the Greek mercenaries.
2. A site comment by clavain (2021) compared the site map with the Expansion 1 booklet. The MI with the two satraps should be MC, and the Vassal module has the same error.
3. The historical text on the page puts the Persian cavalry along the bank and the infantry some distance behind.

The same comment reports that **four hill hexes are missing** from the Persian side, near the two baseline MI. An earlier AAR (capadotia, 2010) moved the Persian medium foot "up to the hills", which supports this. The exact hexes were not found.

**Confidence.** Official plus Community.

**Sources.**
- [X6] retrofitting page, item 2.
- 107 page comments: clavain #3963 (2021) and capadotia #1096 (2010).
- 107 historical background.

**Recommended implementation.**
- **Changed:** use MC (3 blocks) for the Rhoesaces and Spithridates units, giving Persian MI 2 / MC 3.
- Flag the 4 missing Persian-rear hills as unresolved. Add them only if the booklet map can be checked, probably around the two baseline MI.

## Q18. Magnesia (121): blocks and the camel

**Answer.**
- **Blocks:** the Seleucids use **Greek blocks**. This is official errata: the War Council's "(Use Persian blocks)" is a mistake.
- **Camel:** it **is** in the scenario.
  - Expansion 1's New Unit Types page says the camel belongs to the Greek army, and Magnesia is the only scenario that uses it.
  - The map shows it: a blue "C", 3 blocks, next to Seleucus.
  - The page's unit table omitting it is a site error.

**Confidence.** Designer/official FAQ for blocks. Site plus Community for the camel.

**Sources.**
- [RB-FAQ] / [SITE-FAQ] Expansion #1: the Magnesia War Council should read "(Use Greek blocks)".
- Expansion 1 New Unit Types (the Greek army has a camel unit).
- BGG 302002 (franchi, 2008: "Magnesia has one Greek Camel").
- 121 page comment #2450 (2018): the only scenario with camels.

**Recommended implementation.** **Changed:** Greek blocks for the Seleucids. Include 1 camel (3 blocks) as on the map.

## Q19. Impassable hills (101 Marathon, 113 Paraitacene)

**Answer.**
- No ruling. These are hill tiles declared impassable, so the normal hill LOS rule applies:
  - A hill blocks LOS to units behind it.
  - A lower unit can see onto the first hill hex.
  - The plateau exception applies to units on the same hill.
- No unit or leader can ever stand on an impassable hill, so the "see onto the first hill hex" and plateau cases never arise. The result is identical to "always blocks LOS through the hex".
- Both scenarios make every hill hex impassable, so there is no passable hill next to them.

**Confidence.** None (logical equivalence).

**Sources.** [LR] p.19 Hill (LOS); 101 and 113 pages.

**Recommended implementation.** Keep ours (`steep`).

## Q20. Beneventum (118)

**Answer.**
- **Leader name:** no errata found. The War Council's "Consuls Decius and Sulpicius" is copied from 117. The page's own historical background names Consul Manius Curius Dentatus, as does the map. Name the Roman leader Dentatus; there are no named-leader rules in 118, so this is cosmetic.
- **Special rules:** none on the page.
- **Booklet layout:** BGG 1458403 (2015) refers to the booklet map (p.27 of the Expansion 1 booklet). The Roman line is 7 pieces: fortified camps at both ends and in the centre, ramparts between.
- **Camps:** there is no camp-capture banner rule. Camps and ramparts are terrain only.

**Confidence.** Site (page text). None for the absence of booklet-only rules, though there is no evidence of any.

**Sources.** 118 page (historical text vs War Council); 118 map; BGG 1458403.

**Recommended implementation.** As ours, with the leader named Dentatus.

## Q21. Himera (102)

**Answer.**
- **Errata (official FAQ):** the original book map drew the medium cavalry with the Syracusan leader Eumachus using the Carthaginian cavalry image. The FAQ marks that image as wrong.
  - GMT (Anthony Curtis): Eumachus is Syracusan, and his force starts inside the Carthaginian camp (the historical surprise attack). The set-up is otherwise correct.
  - So the MC is a **Syracusan (Greek-block) unit** deep in the Carthaginian position. The current site map already shows it in Greek blue.
- **Special rules:** none, and no evidence the book had any (BGG 176523 discusses only the Eumachus image).
- **Hamilcar** starting alone is legal; a lone leader is allowed.
- **Seacoast:** impassable per [LR] p.19.
- **Camps and ramparts:** terrain only, no banner objective.

**Confidence.** Official/GMT staff.

**Sources.**
- [RB-FAQ] / [SITE-FAQ] Expansion #1.
- 102 page comment #846 (alecrespi, 2009) relaying Anthony Curtis.
- BGG 176523 (2007).

**Recommended implementation.**
- Eumachus's MC uses Greek blocks.
- No special rules.
- Seacoast as `lake`.

## Q22. Other errata and rulings for Expansion 1

**Official errata (designer FAQ):**
- Himera: the Eumachus MC image (Q21).
- Magnesia: Greek blocks (Q18).
- Gaugamela: the correct date is 331 BC.
- Alexander's +1 stacks above terrain caps (Q1).

**Scenarios 122–124:**
- These are from GMT Bonus Pack #2 (originally a P500 extra, now a free PDF), not from the 21-scenario book.
- The PDF confirms:
  - Cronium: Carthage 6 cards; Syracusans Greek blocks, 5 cards, move first; 7 banners; no special rules.
  - Indus: Seleucids Greek blocks, 5 cards; Indians Eastern Kingdom blocks, 5 cards, move first; 6 banners; fordable stream; 3 special bow-armed AX.
  - Pydna: Macedonians Greek blocks, 5 cards, move first; Romans 6 cards; 8 banners; only the optional Tactical Flexibility (with the broken-ground clause). **No camp rule.**
- All of these match the survey.

**Granicus:** MC for the satrap units, and possibly 4 missing hills (Q17; community).

**Marathon (101):** the sea tile into which the stream flows is impassable even though the river is fordable.
- Site FAQ: a "river delta" works like a seacoast tile, so it is impassable even when linked to a fordable river.
- BGG 782261 (2012): unanimous.

**Leuctra:** Expansion 6 has a revised Leuctra (#623). That is a separate scenario, not errata for 104.

**Ipsus:** the 4th Seleucid elephant uses a core-game block (component note only).

**Unit FAQ (official or site):**
- **LBC:** no special FAQ beyond the unit rules.
- **Camels:** blue-triangle ignore (Q13).
- **War machines:**
  - Evade needs a path.
  - Only red squares hit an evading machine.
  - Normal LOS.
  - The 2nd-edition rules said war machines may "always" evade; [LR] changed this to "(almost) always" and added the evade-path requirement.
- **Elephants:**
  - Re-rolls: [LR] says keep re-rolling while swords come up. The site Units FAQ contradicts itself here: it says the same, then suggests a "re-roll once" wording for Reference-sheet note 5. This is a base-game issue, outside Expansion 1.
  - Elephants ignore the red hit from cavalry only in close combat, not against LC/LBC ranged fire (site forum topic 1098).

**First Strike:** it lasts for one attacker-versus-defender combat only (site forum topic 594).

**Searched with nothing found:** no further official errata on setups, banners, card counts or who moves first. BGG Expansion 1 forums (all 14 Rules threads, all 74 General threads), BGG base-game Rules (622 threads) and General (1218 threads), the site FAQ, the site Rules forum and the scenario-page comments were all searched.

---

## Summary table

| # | Question | Our interpretation | Status |
|---|---|---|---|
| 1 | Alexander +1 | All close combat incl. battle back; added after caps | **Confirmed** for caps (designer FAQ). Battle back etc.: no ruling, keep. Add: elephants don't mirror the +1; not used for leader-escape rolls |
| 2 | Companions | Swords rolled against them; flag-ignores stack | **Confirmed** |
| 3 | Immortals | Range 3, 2/1 dice, otherwise MI | **Confirmed** (official, Expansion 6); no ranged + close combat in the same turn |
| 4 | Bow AX (Indus) | Range 3; AX move/fire limit kept | **Confirmed** |
| 5 | Sacred Band / Silver Shields | Same mechanism | **Confirmed** (inference; wording otherwise a no-op) |
| 6 | Poor Persian Leadership | Leader + attached unit only | **Confirmed**. Lone satrap orderable; still gives support (RAW, community split); Rally unaffected |
| 7 | Hellespont | As written | **Confirmed**. Command shrinks with hand; leaders evading off board don't count |
| 8 | Siris bends | Fordable river rules | **Still uncertain** (no ruling; keep) |
| 9 | Fright at First Sight | All Roman foot; any close combat vs elephant | **Confirmed** (plain reading) |
| 10 | Pinarus | Stop on entry; no caps | **Confirmed** (inference) |
| 11 | Asculum | 6 banners; leaders on own unit hexes, Roman first | 6 **confirmed**; placement limit **still uncertain** (house rule; RAW allows lone placement) |
| 12 | Tactical Flexibility | Unsupported = <2 adjacent friendlies; all non-Roman HI | **Changed**: add "not on broken ground" (official Pydna text); First Strike unaffected |
| 13 | Camel | Ignore 1 triangle hit; LC/MC/LBC/HCH retreat +1; EL 3 dice | **Changed**: HC (all cavalry and chariots) also retreat +1; no camel flag-ignore; 2 dice on First Strike too |
| 14 | HWM | Range 6, 2 dice held, etc. | **Confirmed**, with additions (battle back allowed, evade path required, normal LOS, Order Heavy and Line Command eligible, EL rolls 2) |
| 15 | LBC | Light, mounted, cavalry; EL 2 dice | **Confirmed** |
| 16 | Rampart | Site rampart rules, foot only | **Confirmed** (official [LR]); defender-only, no attack-out penalty, corner = 3 edges |
| 17 | Granicus MI/MC | Undetermined | **Changed**: table right (MI 2 / MC 3, satrap units MC); 4 Persian-rear hills possibly missing (**uncertain**) |
| 18 | Magnesia | Undetermined | **Changed**: Greek blocks (official errata); camel included |
| 19 | Impassable hills | `steep` | **Confirmed** (equivalent) |
| 20 | Beneventum | Copy-paste leader names | **Confirmed**: name Dentatus; no special rules |
| 21 | Himera | No special rules | **Confirmed**, plus errata: Eumachus MC is Syracusan (Greek blocks) |
| 22 | Other errata | — | Gaugamela 331 BC; Marathon sea/delta tile impassable; 122–124 confirmed by the official Bonus Pack #2 PDF |
