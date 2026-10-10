# C&C: Ancients Expansion 2 (Rome & the Barbarians): scenario survey

Compiled 2026-10-10 from commandsandcolors.net. Sources: the 23 scenario pages and their map images (`CCA_maps/2xx.jpg`), the Expansion 2 box pages (Contents, Official Scenarios, New Special Rules, New Terrain Hex, New Unit Type, Special Block Mechanic), the site's FAQ pages (Expansion 2, Units, Leader, Battle, Command Cards) and its Light Barbarian Chariot unit summary, plus the GMT living rules 2009 ("LR"). GMT's product page for the Expansion 2 & 3 combo pack links only the LR; there is no separate Expansion 2 rulebook PDF or errata file online. Everything outside the scenario pages is marked where it is used. Local copies are in `scratchpad/exp2-src/` (pages, maps, LR PDF and text).

## How to read this

- **Blocks:** no Expansion 2 War Council has a "Use … blocks" line, so blocks come from the page CSS class of each army box and the unit-table icons:
  - `ban2_bar` = **Barbarian (green)**, icons `bar_*`. Every non-Roman army in the expansion uses it.
  - `ban2_rom` = **Marian Roman (red)**, icons `rom2_*`. Used by 206–223.
  - `ban0_rom` = **base-game Roman (grey)**, icons `rom_*`. Used by 201–205, whose text says the Roman player *may* use the grey base-game blocks (see section 4).
  - Map block colours were checked against these.
- **Top/bottom** comes from the map. In all 23 battles the Barbarian army's banner is at the top and the Roman army's at the bottom. A star in the top-left or bottom-left corner marks the side that moves first (detected on every map; one mismatch, 222). The first row of every unit table is the top (Barbarian) army.
- **Unit counts** are the numbers in the page's unit table (icon + count). All 23 pages have a table. Every map was counted unit by unit and **all 23 match their tables**. Off-board units shown on the map (206) are included.
- **Codes:** LI, LB (light bow), LS (light sling), AX, WA, MI, HI, LC, MC, HC, EL, HCH, HWM, LDR. One new code: **BCH** = Barbarian light chariot (the site's code is LBCH; the maps label it "BCH"). HC, EL, HCH, LBC and CAM do not appear in any Expansion 2 battle.
- **Marian MI / pilum:** where the Marius Legions Rule is in effect (206–223), every Roman MI can make ranged attacks (section 3.1). Counts below still say "MI".
- "Not stated" means the page does not say.
- **Numbering and book vs web:** the official list is **201–223 (23 battles)**. The Contents page says the box has a rule and scenario book with 23 battle scenarios. All 23 pages are tagged "Expansion 2", written by "GMT Games", and were published 9–13 May 2008. The site's Expansion 2 tag search lists exactly these 23. **There are no later web or bonus additions** numbered in the 2xx range. GMT's pre-publication blurb (repeated on its product page) says the battles start at Allia River (390 BC), but no Allia River scenario exists in the final list (section 4). "EPIC08 Clusium" on the site is a separate EPIC-format scenario, not part of Expansion 2.
- **Command cards:** the Contents list no new cards (only 2 reference cards), so the 60 base cards are enough. Hand sizes are 4, 5 or 6. The base "I Am Spartacus" card gets a Slave-side bonus (section 3.3).
- **Page and map URLs:** every scenario page is at `https://www.commandsandcolors.net/ancients/maps/<war>/<slug>.html` (the site also serves it under `/ancients/scenario-list/...`). Every map is at `https://www.commandsandcolors.net/ancients/images/stories/CCA_maps/<nnn>.jpg` (1100×733).

---

## 1. Scenarios

### 201 Clusium (225 BC)
Page: `/ancients/maps/celtic-war-225-222-bc/201-clusium-225-bc.html`. Map: `CCA_maps/201.jpg`.
- **Top:** Gallic Army ("Gauls"), Barbarian blocks. Leaders (page): Kings Aneroestes and Concolitanus. Map leaders: the same two. **5 cards. Moves first.**
- **Bottom:** Roman Army, grey Roman blocks on the site (`ban0_rom`). Leader (page): "A Roman Praetor". Map leaders: Praetor, one unnamed. **5 cards.**
- **Victory:** 6 banners.
- **Special rules:**
  - **Gallic camps:** when a Roman unit stands on a Gallic camp hex, that camp is taken off the board at the start of the Roman turn. Once all three camps are gone, the Roman player gains one Victory Banner.
  - Barbarian Chariot rules are in effect.
  - *Optional:* the army is still pre-Marian, so the Roman player may use the grey base-game blocks.
- **Units:**
  - Gallic: LI 3, AX 3, WA 5, **BCH 1**, MC 3, LDR 2.
  - Roman: LI 3, AX 2, MI 4, HI 1, MC 2, LDR 2.
- **Terrain:**
  - **3 fortified camps** (palisade circles) in the Gallic centre-left, each holding a Gallic MC.
  - About 6 forest hexes, some under Gallic units.
  - 4 hills in the centre-right.
- **New needs:**
  - **BCH.**
  - A cumulative camp objective: camps are removed one by one at the start of the Roman turn, and 1 banner is paid once all 3 are gone.
  - Barbarian blocks.

### 202 Telamon (225 BC)
Page: `/ancients/maps/celtic-war-225-222-bc/202-telamon-225-bc.html`. Map: `CCA_maps/202.jpg`.
- **Top:** Gallic Army, Barbarian blocks. Leaders: Kings Aneroestes and Concolitanus. **5 cards.**
- **Bottom:** Roman Army, grey Roman blocks (`ban0_rom`). Leaders (page): Atilius Regulus and Aemilius Papus. Map leaders: Regulus, Papus, one unnamed. **6 cards. Moves first.**
- **Victory:** 8 banners.
- **Special rules:**
  - **Hill control.** Check at the end of every player turn:
    - If one side has more units on hill hexes than the other, it gains **two** Victory Banners and keeps them until the other side has more (the banners then pass to the other side) or the counts are equal (including zero on both sides), in which case the holder loses them and nobody gets them.
    - Only occupied hill hexes count. A hex left empty for any reason does not count.
    - Control can change hands many times.
  - The "river" on the left of the board is sea and is impassable.
  - **Note:** each army retreats and evades toward its own side. The Gauls and Regulus' Roman army can block each other's retreat and evade paths.
  - Barbarian Chariot rules are in effect.
  - *Optional* grey Roman blocks, as 201.
- **Units:**
  - Gallic: LI 3, AX 3, WA 4, **BCH 2**, MC 3, LDR 2.
  - Roman: LI 5, AX 4, MI 5, HI 2, MC 4, LDR 3.
  - **Map:** the Romans are split.
    - Regulus' army stands on the **top two rows** (the Gallic baseline): LI 3, AX 1, MI 3, HI 1, MC 2, Regulus.
    - Papus' army is on the bottom rows: LI 2, AX 3, MI 2, HI 1, MC 2, Papus and one unnamed leader.
    - The Gauls are in the middle rows. Totals match the table.
- **Terrain:**
  - Sea along the left edge, about 10 hexes, two hexes wide at the top.
  - About 9 hills in the top-right quarter.
  - Otherwise plain.
- **New needs:**
  - **Hill-control banners** (2 banners that pass between the sides).
  - A Roman force set up on the enemy baseline that retreats toward the bottom edge, through the Gauls.
  - **BCH.**
  - The sea maps onto the existing `sea`/`lake`.

### 203 Clastidium (222 BC)
Page: `/ancients/maps/celtic-war-225-222-bc/203-clastidium-222-bc.html`. Map: `CCA_maps/203.jpg`.
- **Top:** Gallic Army, Barbarian blocks. Leader: King Britomartus. **4 cards.**
- **Bottom:** Roman Army, grey Roman blocks (`ban0_rom`). Leader (page): Marcus Claudius Marcellus. Map leaders: Marcellus, two unnamed. **6 cards. Moves first.**
- **Victory:** 4 banners per the War Council. **The page tag says "8 banners".**
- **Special rules:** only the *optional* grey Roman blocks.
- **Units:**
  - Gallic: LI 2, AX 6, WA 2, MC 2, LDR 1.
  - Roman: LI 3, MC 5, LDR 3.
- **Terrain:** 6 hills, 3 on each side edge. Otherwise plain.
- **New needs:** blocks and art only.

### 204 Arausio (105 BC)
Page: `/ancients/maps/cimbrian-war-113-101-bc/204-arausio-105-bc.html`. Map: `CCA_maps/204.jpg`.
- **Top:** Germanic Tribes, Barbarian blocks. Leaders: Kings Boiorix and Teutobod. **5 cards.**
- **Bottom:** Roman Army, grey Roman blocks (`ban0_rom`). Leader (page): Quintus Servillius Caepio. Map leaders: Caepio, one unnamed (on an MC). **4 cards. Moves first.**
- **Victory:** 7 banners.
- **Special rules:**
  - The Rhone is impassable.
  - **Camp occupation:** a Germanic unit that occupies either Roman camp hex is worth one Victory Banner.
    - The banner is lost again if the unit moves off or is eliminated.
    - Holding both camps still counts as only one banner.
  - *Optional* grey Roman blocks.
- **Units:**
  - Germanic: LI 4, AX 4, WA 6, LC 3, MC 2, LDR 2.
  - Roman: LI 4, AX 2, MI 4, HI 2, LC 1, MC 1, LDR 2.
- **Terrain:**
  - The Rhone (river) winds down the right edge, about 7 hexes, impassable.
  - **2 fortified camps** (tents) on the Roman baseline at the bottom right.
- **New needs:**
  - **A "held" banner** that is counted only while a unit stands on the hex (capped at 1 banner for the 2 camps).

### 205 Scirthaea (103 BC)
Page: `/ancients/maps/cimbrian-war-113-101-bc/205-scirthaea-103-bc.html`. Map: `CCA_maps/205.jpg`.
- **Top:** Slave Army, Barbarian blocks. Leader (page): Salvius. Map leaders: Athenion, Salvius. **4 cards. Moves first.**
- **Bottom:** Roman Army, grey Roman blocks (`ban0_rom`). Leader (page): Lucullus. Map leaders: Lucullus, two unnamed. **6 cards.**
- **Victory:** 6 banners.
- **Special rules:** only the *optional* grey Roman blocks.
- **Units:**
  - Slave: AX 5, MI 2, WA 4, MC 2, LDR 2.
  - Roman: LI 3, AX 2, MI 7, MC 2, LDR 3.
- **Terrain:** all plain.
- **New needs:** blocks and art only (Barbarian MI and MC).

### 206 Aquae Sextiae (102 BC)
Page: `/ancients/maps/cimbrian-war-113-101-bc/206-aquae-sextiae-102-bc.html`. Map: `CCA_maps/206.jpg`.
- **Top:** Germanic Tribes, Barbarian blocks. Leader: Teutobodus. **5 cards. Moves first.**
- **Bottom:** Roman Army, **red Marian blocks** (`ban2_rom`). Leader (page): Marius. Map leaders: Marius, one unnamed, and **Marcellus off the board**. **6 cards.**
- **Victory:** 6 banners.
- **Special rules:**
  - **Marcellus' ambush** (an off-board force):
    - The Roman player brings it in by playing a "Leadership" card or "Order Light Troops".
    - With an Inspired (Left/Center/Right) Leadership card, it enters in that card's section. With Leadership Any Section or Order Light Troops, the Roman player picks the section.
    - Ordered units are placed on a baseline hex, and placement counts as one hex of their move. Marcellus may come in with any of them.
    - If these units must retreat, they retreat toward the Roman side.
  - **Marius Legions Rule** is in effect.
- **Units:**
  - Germanic: LI 2, AX 5, WA 4, LC 2, MC 3, LDR 1.
  - Roman: LI 2, LB 2, AX 4, MI 5, LC 1, MC 2, LDR 3.
  - **Map:** the ambush force (LI 1, AX 2, LC 1, Marcellus) is drawn **above the top-left board edge**, on the German side. On the board: LI 1, LB 2, AX 2, MI 5, MC 2, two leaders. Totals match the table.
- **Terrain:**
  - 3 forest hexes on the German baseline.
  - About 10 hills: the Roman line stands on a ridge of 8 hill hexes, plus 2 more on the flanks behind it.
- **New needs:**
  - **A generalised off-board reserve.** Unlike Trebbia, it is triggered by Leadership *or* Order Light Troops, and no "not on the first turn" limit is stated. It presumably enters on the German (top) baseline, as the map shows.
  - **Marian pilum.**
  - Red Roman blocks.

### 207 Vercellae (101 BC)
Page: `/ancients/maps/cimbrian-war-113-101-bc/207-vercellae-101-bc.html`. Map: `CCA_maps/207.jpg`.
- **Top:** Germanic Tribes, Barbarian blocks. Leader (page): "Beorix". Map leaders: Beorix, one unnamed (on an MC). **4 cards. Moves first.**
- **Bottom:** Roman Army, red blocks. Leader (page): Marius. Map leaders: Marius, Catulus, Sulla. **6 cards.**
- **Victory:** 8 banners.
- **Special rules:** Marius Legions Rule.
- **Units:**
  - Germanic: LI 4, LB 2, AX 6, WA 5, MC 4, LDR 2.
  - Roman: LI 2, LB 2, AX 2, MI 8, MC 2, LDR 3.
- **Terrain:** all plain.
- **New needs:** Marian pilum. Barbarian LB art.

### 208 Mt Vesuvius (73 BC)
Page: `/ancients/maps/third-servile-war-73-71-bc/208-mt-vesuvius-73-bc.html`. Map: `CCA_maps/208.jpg`.
- **Top:** Slave Army, Barbarian blocks. Leader: Spartacus. **6 cards. Moves first.**
- **Bottom:** Roman Army, red blocks. Leaders: Claudius Glaber and Publius Varinius. On the map **both stand alone in camp hexes**. **4 cards.**
- **Victory:** 5 banners.
- **Special rules:**
  - All hills are impassable.
  - **Camp capture:** if a Slave unit is on a Roman camp hex at the start of the Slave turn, the Slave player gains one Victory Banner that cannot be lost. The camp tile is removed and the banner taken before a card is played.
  - Marius Legions Rule.
  - "I Am Spartacus" Slave player rule.
- **Units:**
  - Slave: LI 1, AX 2, MI 3, WA 5, LDR 1.
  - Roman: LI 1, AX 5, MI 3, LDR 2.
  - **Map:**
    - The Slaves are split. 5 units are on the top row, and 6 (including Spartacus) are in the bottom third, **behind the Roman position**, on the Roman side of the board.
    - The Romans are in the centre.
- **Terrain:**
  - **4 fortified camps** (palisade circles with tents): one holds an MI, one an AX, and two hold only a leader.
  - About **6 rampart hexes** in front of the camps, facing the top; one on the left is angled.
  - About 18 **impassable hills**, mostly along the left side and the edges.
  - 6 forest hexes in the bottom third.
- **New needs:**
  - **Camp capture at the start of the turn, with the camp tile removed.** Presumably 1 banner per camp, so up to 4 (not stated).
  - Lone leaders on camp hexes at setup.
  - The **Spartacus order bonus.**
  - Slave units that start behind the Roman line but must retreat toward the top edge.
  - Impassable hills (`steep`).
  - Rampart (existing).

### 209 Mt Garganus (72 BC)
Page: `/ancients/maps/third-servile-war-73-71-bc/209-mt-garganus-72-bc.html`. Map: `CCA_maps/209.jpg`.
- **Top:** Slave Army, Barbarian blocks. Leader: Crixus. **5 cards.**
- **Bottom:** Roman Army, red blocks. Leader (page): Gellius. Map leaders: Gellius, one unnamed. **6 cards. Moves first.**
- **Victory:** 6 banners.
- **Special rules:**
  - The hill hexes are impassable.
  - Marius Legions Rule.
  - Spartacus is not present, and there is no Spartacus rule.
- **Units:**
  - Slave: LI 2, AX 2, WA 5, LC 2, LDR 1.
  - Roman: LI 4, AX 2, MI 6, MC 2, **HWM 1**, LDR 2.
- **Terrain:** 13 hills labelled "Mount Garganus" in two rows across the top centre, all impassable. Otherwise plain.
- **New needs:**
  - Marian pilum.
  - Red Roman HWM art.
  - Impassable hills (`steep`).

### 210 Picenum (72 BC)
Page: `/ancients/maps/third-servile-war-73-71-bc/210-picenum-72-bc.html`. Map: `CCA_maps/210.jpg`.
- **Top:** Slave Army, Barbarian blocks. Leader (page): Spartacus. Map leaders: Spartacus, two unnamed. **6 cards.**
- **Bottom:** Roman Army, red blocks (`ban2_rom`). Leaders: Gellius and Lentulus. **5 cards. Moves first.**
- **Victory:** 8 banners.
- **Special rules:**
  - **Two separate Roman armies:**
    - Every Command card the Roman plays may activate units of only one army, Lentulus' or Gellius'.
    - A card's orders cannot be split between the armies, and units never change army.
    - The page suggests laying one army's blocks flat to tell them apart.
    - At setup, the Romans left of the hills are Lentulus' army and those right of the hills are Gellius' (the rule text spells it "Gellus").
  - **Exit:** a Slave unit that leaves the board over the Roman edge counts as one Victory Banner for the Slave player. Whether the unit is removed is not stated.
  - Marius Legions Rule.
  - "I Am Spartacus" Slave rule.
  - **Rolling Fire** rules are in effect.
- **Units:**
  - Slave: LS 2, AX 2, MI 4, WA 5, LC 2, LDR 3.
  - Roman: LI 4, MI 9, MC 3, HWM 2, LDR 2.
  - **Map:** the map draws **Lentulus' army in grey blocks** and Gellius' in red.
    - Lentulus: LI 2, HWM 1, MI 4, MC 1, Lentulus.
    - Gellius: LI 2, HWM 1, MI 5, MC 2, Gellius.
- **Terrain:**
  - **A full row of 13 hill hexes** across the Slave second row. 12 Slave units stand on them, ready for Rolling Fire.
  - A chain of about 10 hills down the centre, splitting the two Roman armies.
- **New needs:**
  - **Rolling Fire.**
  - **Separate armies with a one-army-per-card limit.**
  - **Exit banners** for the Slave side.
  - Spartacus bonus.
  - Marian pilum.
  - Two Roman colours on one side (cosmetic).

### 211 Mummius' Defeat (72 BC)
Page: `/ancients/maps/third-servile-war-73-71-bc/211-mummius-defeat-72-bc.html`. Map: `CCA_maps/211.jpg`.
- **Top:** Slave Army, Barbarian blocks. Leader: Spartacus. **6 cards.**
- **Bottom:** Roman Army, red blocks. Leader (page): Mummius. Map leaders: Mummius, two unnamed. **4 cards. Moves first.**
- **Victory:** 5 banners.
- **Special rules:**
  - **Camp capture:** if Roman units occupy **two or more** Slave camp hexes at the start of the Roman turn, the Roman player gains one Victory Banner that cannot be lost. The camp tiles are removed and the banner taken before a card is played.
  - Marius Legions Rule.
  - "I Am Spartacus" Slave rule.
- **Units:**
  - Slave: LS 2, AX 3, MI 2, WA 4, LC 2, LDR 1.
  - Roman: LI 1, AX 1, MI 6, LC 2, MC 1, LDR 3.
- **Terrain:**
  - **3 fortified camps** (palisade circles) in the Slave centre, holding LS, AX and LS.
  - About 8 forest hexes on both flanks, several under Slave units.
  - 2 hills on the left.
- **New needs:**
  - **A threshold camp objective** (2 of 3 camps held at once, start of the Roman turn), with tile removal.
  - Spartacus bonus.
  - Marian pilum.

### 212 Bruttium (71 BC)
Page: `/ancients/maps/third-servile-war-73-71-bc/212-bruttium-71-bc.html`. Map: `CCA_maps/212.jpg`.
- **Top:** Slave Army, Barbarian blocks. Leader (page): Spartacus. Map leaders: Spartacus, one unnamed. **6 cards. Moves first.**
- **Bottom:** Roman Army, red blocks. Leader (page): Crassus. Map leaders: **two unnamed** (no "Crassus" label). **5 cards.**
- **Victory:** 6 banners.
- **Special rules:**
  - **Exit:** a Slave **foot** unit that leaves the board over the Roman edge counts at once as one Victory Banner and is removed from play.
  - **Ditch** (shown with broken-ground tiles):
    - A unit must stop on entering and move no further that turn.
    - It has no other battle effect. Units battle into and out of it normally.
    - It does not block line of sight.
  - Marius Legions Rule.
  - "I Am Spartacus" Slave rule.
- **Units:**
  - Slave: LS 2, AX 2, MI 3, WA 6, LC 3, LDR 2.
  - Roman: LB 2, AX 2, MI 6, LC 2, MC 2, LDR 2.
- **Terrain:** Crassus' line.
  - A row of **9 ditch hexes** across the centre and right.
  - Directly behind it, a row of **9 rampart hexes** facing the top. Roman LB, AX, AX and LB stand on them.
  - **4 fortified camps** on the Roman second-to-last row, each holding an MI.
  - About 9 forest hexes on the left. The 3 Slave LC start among them, **beside and behind the Roman line**.
- **New needs:**
  - **Ditch**, a new terrain variant: all units stop, with no broken-ground dice cap and no ban on war machines.
  - **Exit banner, foot only.**
  - Spartacus bonus.
  - Marian pilum.

### 213 Camalatrum (71 BC)
Page: `/ancients/maps/third-servile-war-73-71-bc/213-camalatrum-71-bc.html`. Map: `CCA_maps/213.jpg`.
- **Top:** Slave Army, Barbarian blocks. Leader (page): Spartacus. Map leaders: Cannicus, Spartacus, Castus. **5 cards. Moves first.**
- **Bottom:** Roman Army, red blocks. Leader (page): Crassus. Map leaders: Marcius, Crassus, one unnamed. **5 cards.**
- **Victory:** 6 banners.
- **Special rules:**
  - **Camp occupation:** a Roman unit on the camp hex counts as a Victory Banner while it stays. It stops counting if the unit moves off or is eliminated.
  - The Lucanian Lake is impassable.
  - Marius Legions Rule.
  - "I Am Spartacus" Slave rule.
  - **Reminder:** units always retreat toward their own side, wherever they start. The page notes this matters for Marcius and Castus.
- **Units:**
  - Slave: LI 2, AX 2, MI 3, WA 5, LC 2, LDR 3.
  - Roman: LI 2, AX 1, MI 9, MC 1, LDR 3.
  - **Map:**
    - Marcius' Roman group (MI 3, AX 1, Marcius) starts in the **top-left corner**, on the Slave side.
    - Castus' Slave group (MI, WA, LC, Castus) starts in the **bottom-left**, on the Roman side.
- **Terrain:**
  - **1 fortified camp** (palisade) under Cannicus' MI.
  - About 8 hills, most under Slave units.
  - 4 forest hexes.
  - The Lucanian Lake along the right edge, about 5 hexes, in coast/lake art.
- **New needs:**
  - **Held-camp banner.**
  - Units starting behind enemy lines.
  - Spartacus bonus.
  - Marian pilum.
  - The lake is the existing `lake`.

### 214 Silarus (71 BC)
Page: `/ancients/maps/third-servile-war-73-71-bc/214-silarus-71-bc.html`. Map: `CCA_maps/214.jpg`.
- **Top:** Slave Army, Barbarian blocks. Leader (page): Spartacus. Map leaders: Spartacus, two unnamed. **5 cards. Moves first.**
- **Bottom:** Roman Army, red blocks. Leader (page): Crassus. Map leaders: Crassus, two unnamed. **6 cards.**
- **Victory:** 6 banners.
- **Special rules:**
  - **Camp occupation:** a Slave unit on the camp hex counts as a Victory Banner while it stays.
  - **Pompey in the rear:** a Slave unit forced to retreat from the last row of the board loses the **whole unit** instead of one block per missing retreat hex. This applies whether it starts the retreat on that row or reaches it with retreat hexes left. The unit is eliminated at once and the Roman player gains the banner.
  - Marius Legions Rule.
  - "I Am Spartacus" Slave rule.
- **Units:**
  - Slave: LI 4, AX 4, MI 3, WA 4, LC 3, LDR 3.
  - Roman: LI 4, AX 2, MI 9, LC 3, MC 2, LDR 3.
- **Terrain:**
  - About 10 hills in the Slave second and third rows.
  - On the Roman right flank: **1 fortified camp** (palisade) holding an LI, and **2 rampart hexes** facing the top.
  - **1 tent camp** on the Roman baseline at the bottom right. This is presumably "the camp hex" (see section 4).
- **New needs:**
  - **Held-camp banner.**
  - **Last-row retreat eliminates the unit.**
  - Spartacus bonus.
  - Marian pilum.

### 215 River Sabis (57 BC)
Page: `/ancients/maps/gallic-wars-59-51-bc/215-river-sabis-57-bc.html`. Map: `CCA_maps/215.jpg`.
- **Top:** Belgic tribes, Barbarian blocks. Leader (page): Boduognatus. Map leaders: Boduognatus, two unnamed. **4 cards. Moves first.**
- **Bottom:** Roman Army, red blocks. Leader (page): Julius Caesar. Map leaders: Caesar, Labienus, one unnamed. **6 cards.**
- **Victory:** 8 banners.
- **Special rules:**
  - **Camp capture (both sides):** at the start of either player's turn, if one of his units occupies the enemy camp hex, he gains a Victory Banner that cannot be lost. The rampart hex counts as the Roman camp. The enemy camp hex is removed and the banner taken before a card is played.
  - The River Sabis is fordable.
  - Julius Caesar Rule.
  - **Tenth Legion:**
    - It is two heavy foot (HI) units, each with a Special Unit block, and both have the Tenth Legion abilities.
    - They need not stay adjacent to keep them, and the Roman player may order them separately.
  - Marius Legions Rule.
- **Units:**
  - Belgic: LI 3, AX 4, WA 8, MC 2, LDR 3.
  - Roman: LI 2, LB 2, AX 2, MI 7, **HI 2 (both Tenth Legion, labelled "Legio X")**, MC 3, HWM 1, LDR 3.
  - FAQ note: one Belgic MC is printed with Carthaginian cavalry art (cosmetic).
- **Terrain:**
  - The **fordable Sabis**, about 14 hexes, winds from the bottom-left up to the centre and across to the top-right.
  - The **Belgic camp** is a fortified-camp hex at the top-left, holding a WA.
  - The **Roman "unfinished camp"** is a single rampart hex in the Roman rear-left.
  - About 9 forest hexes in the Belgic half.
  - 3 hills.
- **New needs:**
  - **Camp capture for both sides, with removal.**
  - **A rampart hex that counts as a camp.**
  - **Caesar.**
  - **Tenth Legion ×2.**
  - Marian pilum.

### 216 Sotium (56 BC)
Page: `/ancients/maps/gallic-wars-59-51-bc/216-sotium-56-bc.html`. Map: `CCA_maps/216.jpg`.
- **Top:** Gauls, Barbarian blocks. Leader (page): Adiatuanos. Map leaders: Adiatuanos, two unnamed. **5 cards. Moves first.**
- **Bottom:** Roman Army, red blocks. Leader (page): Publius Crassus. Map leaders: "Crassus", two unnamed. **6 cards.**
- **Victory:** 6 banners.
- **Special rules:** Marius Legions Rule.
- **Units:**
  - Gallic: AX 7, WA 4, LC 3, MC 2, LDR 3.
  - Roman: LI 2, LS 1, AX 3, MI 6, MC 3, HWM 1, LDR 3.
- **Terrain:**
  - About 15 hills and 5 forest hexes scattered over the board.
  - The Roman line runs diagonally from the bottom-left to the centre-right.
- **New needs:**
  - Marian pilum.
  - Red Roman LS and HWM art.

### 217 Invasion of Britain (55 BC)
Page: `/ancients/maps/gallic-wars-59-51-bc/217-invasion-of-britain-55-bc.html`. Map: `CCA_maps/217.jpg`.
- **Top:** Britons, Barbarian blocks. Leader (page): "No one of name". Map leaders: one unnamed. **5 cards. Moves first.**
- **Bottom:** Roman Army, red blocks. Leader (page): Caesar. Map leaders: Caesar, two unnamed. **6 cards.**
- **Victory:** 7 banners.
- **Special rules:**
  - **Seacoast as a ford:** every seacoast hex is treated as a fordable river hex for movement and combat.
  - Barbarian Chariot Rule.
  - Julius Caesar Rule.
  - **Tenth Legion:** a Special Unit block is placed with the Tenth Legion unit, which has all the Tenth Legion abilities.
  - Marius Legions Rule.
- **Units:**
  - Britons: AX 6, WA 3, LC 2, **BCH 2**, MC 2, LDR 1.
  - Roman: LB 2, AX 2, MI 8, **HI 1 (Tenth Legion, "Legio X")**, LDR 3.
- **Terrain:**
  - **Seacoast along the whole Roman baseline**, about 11 hexes. **8 Roman units start on it.**
  - About 8 hills in the Briton half.
- **New needs:**
  - **A seacoast hex that behaves as a fordable river** (passable and occupiable, with ford dice caps).
  - **BCH.**
  - **Caesar.**
  - **Tenth Legion.**
  - Marian pilum.

### 218 River Stour (54 BC)
Page: `/ancients/maps/gallic-wars-59-51-bc/218-river-stour-54-bc.html`. Map: `CCA_maps/218.jpg`.
- **Top:** Britons, Barbarian blocks. Leader (page): "Unknown". Map leaders: one unnamed. **5 cards. Moves first.**
- **Bottom:** Roman Army, red blocks. Leader (page): Caesar. Map leaders: Caesar, two unnamed. **6 cards.**
- **Victory:** 6 banners. The page has no banner tag.
- **Special rules:**
  - The whole River Stour is fordable.
  - Barbarian Chariot Rule.
  - Julius Caesar Rule.
  - Marius Legions Rule.
- **Units:**
  - Britons: LC 2, **BCH 7**, MC 2, LDR 1.
  - Roman: LB 2, AX 2, MI 5, MC 2, LDR 3.
- **Terrain:**
  - The Stour runs the full width of the top row (the Briton baseline), about 13 hexes, all fordable.
  - About 9 forest hexes.
- **New needs:**
  - **BCH (×7).**
  - **Caesar.**
  - Marian pilum.

### 219 Foraging Party (54 BC)
Page: `/ancients/maps/gallic-wars-59-51-bc/219-foraging-party-54-bc.html`. Map: `CCA_maps/219.jpg`.
- **Top:** Britons, Barbarian blocks. Leader (page): Cassivellaunus. Map leaders: Cassivellaunus, one unnamed. **5 cards. Moves first.**
- **Bottom:** Roman Army, red blocks. Leader (page): Gaius Trebonius. Map leaders: Trebonius, two unnamed. **6 cards.**
- **Victory:** 6 banners.
- **Special rules:**
  - **Section clear:** at the end of the Roman turn, the Roman player gains one Victory Banner for each section that contains no Briton unit. If a Briton unit later moves back into that section, the banner is lost.
  - Barbarian Chariot Rule.
  - Marius Legions Rule.
- **Units:**
  - Britons: AX 6, WA 4, LC 2, **BCH 4**, LDR 2.
  - Roman: LB 2, AX 3, MI 3, MC 4, LDR 3.
- **Terrain:**
  - About 6 hills and 10 forest hexes.
  - The Romans start in the centre. The Britons hold the top rows and both flanks (2 BCH on each flank).
- **New needs:**
  - **Section-clear banners** that can be lost again.
  - **BCH.**
  - Marian pilum.

### 220 Teutoburger Wald P1 (9 AD)
Page: `/ancients/maps/germanic-wars-augustus-to-nero-27-bc-68-ad/220-teutoburger-wald-p1-9-ad.html`. Map: `CCA_maps/220.jpg`.
- **Top:** Germanic Tribes, Barbarian blocks. Leader (page): Arminius. Map leaders: Arminius, two unnamed. **5 cards. Moves first.**
- **Bottom:** Roman Army, red blocks. Leader (page): Varus. Map leaders: Varus, two unnamed. **5 cards.**
- **Victory:** 6 banners.
- **Special rules:** Marius Legions Rule.
- **Units:**
  - Germanic: LI 4, AX 4, WA 7, MC 2, LDR 3.
  - Roman: LI 3, AX 1, MI 5, MC 2, LDR 3.
- **Terrain:**
  - **9 marsh hexes** along the Roman baseline, directly behind the Roman line. The page gives no rule; marsh rules come from the expansion's terrain page.
  - About 10 forest hexes.
  - About 6 hills under the German front row.
  - 2 broken-ground hexes on the flanks.
- **New needs:**
  - None for terrain: marsh already exists. Retreats into marsh will be frequent here.
  - Marian pilum.

### 221 Teutoburger Wald P2 (9 AD)
Page: `/ancients/maps/germanic-wars-augustus-to-nero-27-bc-68-ad/221-teutoburger-wald-p2-9-ad.html`. Map: `CCA_maps/221.jpg`.
- **Top:** Germanic Tribes, Barbarian blocks. Leader (page): Arminius. Map leaders: Arminius, two unnamed. **5 cards. Moves first.**
- **Bottom:** Roman Army, red blocks. Leader: Vala. **4 cards.**
- **Victory:** 6 banners.
- **Special rules:**
  - **Camp capture:** a German unit that captures (occupies) a Roman camp hex gains **two** Victory Banners. The camp hex is removed at the start of the German turn and the banners are taken then.
  - **Exit:** a Roman unit that leaves the board over the German edge counts as one Victory Banner and is removed from play.
  - Marius Legions Rule.
- **Units:**
  - Germanic: LI 1, AX 3, MI 1, WA 6, MC 1, LDR 3.
  - Roman: LI 2, AX 1, MI 4, MC 2, LDR 1.
- **Terrain:**
  - **The Roman marching camp:**
    - About 10–12 rampart hexes in a trapezoid. The front row faces the top, and the two slanted sides face outward (left side W/NW, right side E/NE). The exact corner hexes are hard to read.
    - **1 fortified camp hex** inside it, holding an MI.
  - **8 marsh hexes**, two in each board corner.
  - About 8 forest hexes.
- **New needs:**
  - **A camp capture worth 2 banners, with removal.**
  - **Exit banner (Roman side).**
  - Ramparts facing sideways (new facings only).
  - Marsh (existing).
  - Marian pilum.

### 222 Angrivarii Rampart (16 AD)
Page: `/ancients/maps/germanic-wars-augustus-to-nero-27-bc-68-ad/222-angrivarii-rampart-16-ad.html`. Map: `CCA_maps/222.jpg`.
- **Top:** Germanic Tribes, Barbarian blocks. Leader (page): Arminius. Map leaders: Arminius, one unnamed. **5 cards.**
- **Bottom:** Roman Army, red blocks. Leader (page): Germanicus. Map leaders: Germanicus, two unnamed (one with the Roman WA). **6 cards. Moves first** per the War Council. **The map star is top-left, which gives the Germans the first move.**
- **Victory:** 6 banners.
- **Special rules:**
  - **Rampart objective:** the Roman player gains one Victory Banner for each rampart hex a Roman unit occupies and holds, up to two banners.
  - The river is impassable.
  - Marius Legions Rule.
- **Units:**
  - Germanic: LI 2, AX 4, MI 1, WA 6, MC 2, LDR 2.
  - Roman: LI 3, LB 1, AX 3, MI 7, **WA 1 (Roman)**, LC 1, MC 2, HWM 1, LDR 3.
- **Terrain:**
  - **A row of 7 rampart hexes** across the German half, facing the bottom. All 7 are held by German units at setup.
  - About 14 forest hexes on the left.
  - An impassable river down the right edge, about 9 hexes.
- **New needs:**
  - **Held-rampart banners** (capped at 2; presumably lost again when the hex is vacated).
  - Red Roman WA and HWM art.
  - Marian pilum.

### 223 Cefn Carnedd (51 AD)
Page: `/ancients/maps/conquest-of-britain-43-60-ad/223-cefn-carnedd-51-ad.html`. Map: `CCA_maps/223.jpg`.
- **Top:** Britons, Barbarian blocks. Leader (page): Caratacus. Map leaders: Caratacus, two unnamed. **5 cards.**
- **Bottom:** Roman Army, red blocks. Leader (page): Publius Ostorius Scapula. Map leaders: Scapula, two unnamed. **6 cards. Moves first.**
- **Victory:** 6 banners.
- **Special rules:**
  - The whole Severn is fordable.
  - **Very steep hills:**
    - A unit moving onto a hill from lower ground must stop and may not battle that turn.
    - A unit that momentum-advances from lower ground onto a hill gets no bonus close combat.
    - In close combat, a unit attacking uphill rolls 1 die, and one attacking downhill from a hill rolls 2. From hill to hill it rolls 3 dice or its normal close-combat dice, whichever is fewer.
  - **Ramparts:** a rampart is removed when a Roman unit occupies it or moves through it.
  - Marius Legions Rule.
- **Units:**
  - Britons: LI 1, LB 2, AX 4, WA 5, LDR 3.
  - Roman: LI 3, AX 5, MI 7, LDR 3.
- **Terrain:**
  - The fordable Severn, about 14 hexes, winds across the middle.
  - About 12 hills, most in the Briton half and 2 in the Roman rear.
  - About **6 rampart hexes** facing the bottom, all held by Briton units at setup.
- **New needs:**
  - **A "very steep" hill variant.**
  - **Ramparts that Roman units destroy.**
  - Marian pilum.
  - Barbarian LB art.

---

## 2. Summary table

| # | Scenario | New units / special units | New terrain | Special rules needing new engine support |
|---|---|---|---|---|
| 201 | Clusium | **BCH** | — (3 camps) | Remove Gallic camps one by one; 1 banner when all 3 are gone; optional grey/red Roman blocks |
| 202 | Telamon | **BCH** | (sea = existing) | **Hill control** (2 banners that change hands); Roman army set up on the enemy baseline |
| 203 | Clastidium | — | — | — |
| 204 | Arausio | — | (impassable river, 2 camps) | **Held camp banner** (max 1) |
| 205 | Scirthaea | — | — | — |
| 206 | Aquae Sextiae | Marian pilum | — | **Off-board ambush** (Leadership or Order Light Troops) |
| 207 | Vercellae | Marian pilum | — | — |
| 208 | Mt Vesuvius | Marian pilum | (steep hills, ramparts, 4 camps) | **Camp capture at start of turn + tile removal**; lone leaders in camps; Spartacus bonus |
| 209 | Mt Garganus | Marian pilum; HWM (red) | (steep hills) | — |
| 210 | Picenum | Marian pilum; HWM ×2 | — | **Rolling Fire**; **two Roman armies, one per card**; **Slave exit banner**; Spartacus bonus |
| 211 | Mummius' Defeat | Marian pilum | (3 camps) | **2-of-3 camps held at start of turn → 1 banner, tiles removed**; Spartacus bonus |
| 212 | Bruttium | Marian pilum | **Ditch**; (ramparts, camps) | **Slave foot exit banner**; Spartacus bonus |
| 213 | Camalatrum | Marian pilum | (lake) | **Held camp banner**; Spartacus bonus |
| 214 | Silarus | Marian pilum | (camps, ramparts) | **Held camp banner**; **last-row retreat eliminates the unit**; Spartacus bonus |
| 215 | River Sabis | Marian pilum; **Tenth Legion ×2**; HWM | (fordable river, camp, rampart) | **Camp capture for both sides + removal; rampart counts as camp**; **Caesar** |
| 216 | Sotium | Marian pilum; HWM; red LS | — | — |
| 217 | Invasion of Britain | **BCH**; Marian pilum; **Tenth Legion** | **Seacoast as fordable river** | **Caesar** |
| 218 | River Stour | **BCH ×7**; Marian pilum | (fordable river) | **Caesar** |
| 219 | Foraging Party | **BCH**; Marian pilum | — | **Section-clear banners** (can be lost) |
| 220 | Teutoburger Wald P1 | Marian pilum | (marsh = existing) | — |
| 221 | Teutoburger Wald P2 | Marian pilum | (marsh, ramparts facing sideways, camp) | **Camp capture worth 2 banners + removal**; **Roman exit banner** |
| 222 | Angrivarii Rampart | Marian pilum; **Roman WA**; HWM | (ramparts, impassable river) | **Held-rampart banners** (max 2) |
| 223 | Cefn Carnedd | Marian pilum | **Very steep hills**; **removable ramparts** | — |

Every battle needs Barbarian (green) blocks. 206–223 need the red Marian Roman blocks, and 201–205 the grey ones as drawn on the site (section 3.4).

---

## 3. Consolidated engine gaps

### 3.1 New unit types

**Barbarian Light Chariot (BCH; site code LBCH; map label "BCH").** Needed by 201 (×1), 202 (×2), 217 (×2), 218 (×7) and 219 (×4); always Barbarian (Gallic or Briton). Sources: the Expansion 2 "New Unit Type" page, LR pp.2, 7, 9, 10, 15, 17, and the site's LBCH summary.

| Property | Rule |
|---|---|
| Class | Light mounted (green circle **with white border**). Ordered and hit as a light mounted unit (LR). 3 blocks (rectangular chariot blocks). |
| Move | 1–3 hexes, and may battle. |
| Ranged combat | None, ever. |
| Close combat | May stay or move 1–3 hexes, then fight an adjacent enemy with **2 dice, or 3 at full strength**. Scores hits on its unit symbol and on **swords** (white border). |
| Full-strength bonus | While at full strength it rolls 1 extra die **and may ignore one flag**. Both bonuses go after its first block loss, but only from the next time it is attacked or ordered to battle. So a full-strength chariot hit in a close combat still battles back with 3 dice. |
| Sword ignore | LR (and the site summary) say all chariot units ignore 1 sword hit in close combat. **The Expansion 2 unit page does not repeat this** (section 4). |
| Support | Ignores 1 flag if supported, as normal. |
| Evade | May always evade (light unit). |
| Momentum | Momentum advance and bonus close combat. It is a chariot, not cavalry, so it gets no extra hex (LR). |
| Retreat | 3 hexes per flag, plus 1 extra hex per flag rolled by an elephant or camel (neither appears in Expansion 2). |

Engine side effects:
- Add BCH to "light units" for Order Light Troops and to the mounted units for Order Mounted. It is a light unit for evade and for Move-Fire-Move, but it cannot fire.
- Treat it as a chariot for any "chariot" clauses (camel blue-triangle ignore, elephant interactions).
- LR's escape rule rolls 3 dice for a full-strength BCH and 2 after a loss (site Leader FAQ).

**Marian pilum (scenario rule "Marius Legions", 206–223).** Not a new type but a type-wide ranged ability for Roman MI:
- Range **2 hexes** and **1 die**, whether the unit stayed still or moved 1 hex. It never rolls 2 dice.
- The unit becomes a missile unit and follows all ranged-combat rules: it may not fire when adjacent to an enemy, and it may not both fire and close combat in one turn (general rule).
- The site's Units FAQ says that, when the rule is in effect, **Roman HI** are pilum-armed too (this is Expansion 3's wording). In the Expansion 2 battles the only HI under the rule are the Tenth Legion units, which have the pilum anyway.
- The rule should apply to **every MI on the Roman side**, including the grey-drawn Lentulus army in 210. Barbarian MI never get it.
- The existing elite `ranged` ability (Immortals: range 3, 2/1 dice) needs a range and dice parameter, or a scenario-wide toggle per side and type.

**Tenth Legion (special unit; 215 ×2 HI, 217 ×1 HI).** From the Expansion 2 "Special Block Mechanic" page. It has a Special Unit block, which works as in Expansion 1 (moves with the unit, cannot be transferred, is not a loss, and is removed with the last block).
- A heavy infantry unit armed with pilum: ranged combat at range 2 with 1 die when it stays still or moves 1 hex (Marius rule).
- It may move 1 hex and close combat with 5 dice, as normal HI. It may also **move 2 hexes without battling**. It still retreats only 1 hex per flag.
- No flag-ignore or helmet abilities.
- New elite preset: `tenthLegion` = pilum ranged (2/1) + 2-hex move without battle.

**Roman WA (222)** and **Barbarian LB, LS and MI** are existing types that need new art only (section 3.4).

### 3.2 New terrain

- **Very steep hills (223 Cefn Carnedd):** a variant of `hill` for the whole scenario.
  - Moving onto a hill from lower ground: the unit stops and may not battle that turn.
  - A momentum advance up onto a hill: no bonus close combat.
  - Close combat uphill: 1 die. Downhill from a hill: 2 dice. Hill to hill: at most 3, or the unit's normal dice if fewer.
  - These replace the normal hill caps. Card bonuses presumably still add on top (not stated).
  - Line of sight and ranged combat are not mentioned, so presumably they use the normal hill rules.
- **Ditch (212 Bruttium):** drawn with broken-ground tiles, but with its own rules:
  - **Every** unit stops on entering.
  - No dice cap and no other battle effect. Units battle into and out of it normally.
  - It does not block line of sight.
  - It differs from `broken`, where only mounted units and lone leaders stop, the dice cap is 2, mounted units cannot battle after entering, and HWM may not enter. Either a `ditch` terrain or a per-scenario override is needed.
- **Seacoast that acts as a fordable river (217):** normally sea is impassable. Here every seacoast hex is a fordable river for movement and combat (units stop on entering, close combat is capped at 2 dice, and ranged fire from it is capped at 1 die). 8 Roman units start on these hexes. This needs a per-scenario flag on `sea`, or the coast drawn as a `river` ford with sea art.
- **Removable terrain:**
  - Camp tiles are removed when captured: 201 (Roman occupation removes each Gallic camp at the start of the Roman turn), 208, 211, 215 and 221.
  - Ramparts are destroyed by Roman units entering or passing through them: 223.
  - **The engine needs terrain that can change during play** (with replay and golden-test implications).
- **A rampart that counts as a camp for an objective (215):** the single "unfinished camp" rampart hex is the Roman camp for the capture rule.
- **Ramparts facing sideways (221):** the slanted sides of the Roman camp face W/NW and E/NE. The existing per-edge `edges` data covers this, but the facings must be read from the art.
- **Existing terrain (no new rules):**
  - Marsh (220, 221). Its rules are on the Expansion 2 "New Terrain Hex" page and already in the engine.
  - Rampart (208, 212, 214, 215, 221, 222, 223).
  - Fortified camp, in both palisade and tent art (201, 204, 208, 211, 212, 213, 214, 215, 221).
  - Impassable hills = `steep` (208, 209).
  - Sea (202). Lake (213).
  - Impassable river (204, 222). Fordable river (215, 218, 223).
  - Forest, broken ground (220) and normal hills.

### 3.3 New special-rule mechanisms

1. **Marius Legions** (206–223): Roman MI get pilum ranged fire (range 2, always 1 die). See 3.1.
2. **Julius Caesar** (215, 217, 218):
   - When Caesar is attached to any Roman unit, it rolls +1 die in close combat, **including when battling into or out of terrain that reduces dice**. This is the existing `ccBonus` trait, added after the caps.
   - **New:** when he is attached to a Roman foot unit (not a war machine), that unit may **move 2 hexes and still close combat**.
   - Per the site FAQ, he must be attached when the unit is ordered. A unit that moved 2 hexes without him cannot battle after he joins it. (Double Time already gives a 2-hex move with battle.)
3. **Tenth Legion** (215 ×2, 217 ×1): a new elite preset (3.1). In 215 the two units keep their abilities without staying adjacent and are ordered separately.
4. **"I Am Spartacus" Slave rule** (208, 210, 211, 212, 213, 214):
   - In any battle where Spartacus is on the board, the Slave player rolls **Command + 2** dice when he plays the base "I Am Spartacus" card to order units.
   - The Roman player gets no bonus from the card.
   - This needs a side and leader-presence modifier on the card's order roll.
5. **Rolling Fire** (210 only). New combat procedure:
   - **Who:** any Slave foot unit standing on a hill hex. It need not be a missile unit.
   - **When:** it must be ordered by a **non-Tactic** card that would let it move and/or battle normally. Instead of moving and/or battling, it stays on the hill and rolls fire downhill. It cannot do both in one turn.
   - **Path:** a ranged attack along 3 connected hexes running from the hill toward the **Roman board edge**. Each hex entered must be closer to that edge.
     - The fire passes through units and leaders.
     - It cannot enter hill hexes.
     - It may enter any other terrain, but stops in the first such hex.
   - **Dice:** roll 2 dice against **every unit** in the target hexes.
     - Only the unit's own symbol scores a hit. Swords and helmets do nothing.
     - **No flag may be ignored**, for any reason: not for leaders, support, ramparts, camps or warriors.
     - The target cannot battle back, even when adjacent.
   - **Lone leaders:** a leader alone in a target hex is not attacked, but must evade 1–3 hexes at once toward the Roman edge.
   - **Cost:** after the attack is resolved, the Slave unit that rolled the fire loses 1 block.
   - LR adds that block loss from Rolling Fire triggers a leader casualty check.
   - The engine needs a path choice, a multi-target roll, a "no flag ignores" mode, and a tactic/non-tactic card test (cards.ts already has `group: 'tactic'`).
6. **Separate armies** (210):
   - Each Roman unit and leader carries an army tag (Lentulus or Gellius).
   - Each Roman card may order units of only one army. Its orders cannot be split, and units never change army.
   - This affects card legality, the AI and the UI. It probably also affects leader orders (Leadership cards order units near a leader of the same army).
7. **Off-board ambush reserve** (206). This generalises the Trebbia `magoAmbush`:
   - The trigger cards are configurable: any Leadership card *or* **Order Light Troops**.
   - Section choice: an Inspired card's own section, or the player's choice for Leadership Any Section and Order Light Troops.
   - The entry baseline is presumably the enemy's (top) edge, as the map shows.
   - Placement costs 1 hex of movement, and the units retreat toward the Roman side.
   - No first-turn restriction is stated.
8. **Banners that are held, not banked (new):**
   - **Held camp:** 204 (either of 2 camps, at most 1 banner, Germans), 213 (Roman), 214 (Slave). The banner counts only while a friendly unit stands on the hex.
   - **Held rampart:** 222. 1 banner per rampart hex a Roman unit holds, at most 2.
   - **Hill control:** 202. 2 banners go to whichever side has more units on hill hexes at the end of each player turn. On a tie, the holder loses them.
   - **Section clear:** 219. At the end of the Roman turn, 1 Roman banner per section with no Briton unit. The banner is lost when a Briton unit re-enters the section.
   - The engine needs banners that can be **taken back**, with victory checked after each change, and a check point at "end of player turn".
9. **Camp capture variants.** The existing `campCapture` is "stop on a camp, once per camp, permanent". Expansion 2 adds:
   - The **check at the start of the capturing side's turn**, before the card is played (208, 211, 215, 221; 201 removes camps at the start of the Roman turn).
   - **Tile removal** on capture (201, 208, 211, 215, 221).
   - **A threshold:** 2+ camps held at once gives 1 banner (211). All 3 camps removed gives 1 banner (201).
   - **Banner value 2** (221).
   - **Both sides capturing** (215), with a rampart hex as the Roman camp.
10. **Exit banners.** This generalises Castulo's exit:
    - 210: any Slave unit leaving over the Roman edge. Removal is not stated.
    - 212: Slave **foot** units only. The unit is removed.
    - 221: Roman units leaving over the German edge. The unit is removed.
    - The engine needs "may exit off edge X" movement for named units of a side, plus a banner.
11. **Last-row retreat eliminates the unit (214):** a Slave unit that cannot complete a retreat on or into the top row is eliminated outright, and the Roman player gains the banner.
12. **Optional grey or red Roman blocks** (201–205): cosmetic only, with no rules effect. The pages say the default army is pre-Marian, so the Marius rule is off there.
13. **Setup oddities that already work under the existing rules but need care in setup data, AI and retreat paths:**
    - Units start on the enemy's side: 202 (Regulus' army on the Gallic baseline), 208 (half the Slaves behind the Romans), 212 (Slave LC behind the Roman left) and 213 (Marcius and Castus groups).
    - Lone leaders on camp hexes at setup: 208.
    - Retreat is always toward the unit's own side (202 and 213 remind players of this).
14. **Not needed:**
    - No elephants, camels, LBC, HC or HCH anywhere in Expansion 2, so no elephant or camel interactions with BCH.
    - No new command cards.
    - No hand growth or hand loss.
    - No leader placement phase.
    - No sudden-death leader rules.
    - No optional rules other than the block colour.

### 3.4 New block colours and armies

- **Barbarian blocks (green, `ban2_bar`, icons `bar_*`):** used by every top army.
  - Gauls: 201–203, 216.
  - Germanic Tribes: 204, 206, 207, 220–222.
  - Slave Army: 205, 208–214.
  - Belgic tribes: 215.
  - Britons: 217–219, 223.
  - Unit art needed: LI, LB (207, 223), LS (210–212), AX, MI (Slaves; Germans in 221–222), WA, LC, MC, **BCH**, leader.
- **Marian Roman blocks (red, `ban2_rom`, icons `rom2_*`):** used by 206–223, and the Contents implies they are the default for 201–205 too (section 4).
  - Unit art needed: LI, LB, LS (216), AX, MI, HI (Tenth Legion, 215 and 217), **WA** (222), LC, MC, HWM, leader.
  - Caesar has a portrait leader icon on the site (`rom2_caesar.jpg`), so a distinct Caesar leader art is optional.
- **Grey Roman blocks (`ban0_rom`, icons `rom_*`)** are what the site shows for 201–205 (LI, AX, MI, HI, LC, MC, leader, all existing). The 210 map also draws Lentulus' army grey, including a grey **HWM**, which exists from Expansion 1.
- **Special Unit block (black):** the Tenth Legion marker in 215 and 217. The Contents list 2 of them.
- **Engine:**
  - `BLOCKS` (`rom | car | grk | eas`) needs a green Barbarian set and a red Roman set (for example `bar` and `rmr`).
  - Army names, already free text, need: gallic, germanic, slave, belgic, briton, and Roman variants (pre-Marian and Marian).
  - The 210 split by colour is optional. The page itself only suggests laying blocks flat versus standing.

### 3.5 Command cards

- No new cards. The base 60-card deck with hand sizes 4–6 is enough.
- Card-related additions:
  - The Slave "I Am Spartacus" modifier (+2 order dice).
  - The Rolling Fire "non-Tactic card" test.
  - The 210 one-army-per-card limit.
  - The 206 ambush triggers (all Leadership cards and Order Light Troops).

---

## 4. Ambiguities, conflicts and things not determined

1. **222 Angrivarii Rampart: who moves first.** The War Council gives "Move First" to the Romans (6 cards), but the map's star is top-left, which gives the first move to the Germans. Every other map's star agrees with its page.
2. **203 Clastidium: victory.** 4 banners per the War Council (an 11-against-11 battle) but **8** per the page tag.
3. **201–205 Roman block colour.** The pages say the Roman player "may" use the grey base-game blocks because the army is pre-Marian, which implies the red blocks are the default. The site nevertheless draws all five with grey blocks (`ban0_rom`, `rom_*` icons, grey maps). The Marius rule is not in effect there either way.
4. **210 Picenum:**
   - The map's grey/red split of the two Roman armies is the site's own convention; the rule only suggests flat versus standing blocks.
   - Not stated whether a Slave unit that exits is removed (212 and 221 say it is).
   - Not stated whether Leadership cards may order units of the other army near a leader.
   - The rule text spells the leader "Gellus".
5. **Rolling Fire (210):** several points are not stated:
   - Whether friendly Slave units in the path are also hit. The text says "each unit".
   - Whether line of sight is needed.
   - Whether forest or other terrain changes the 2 dice. The text says only that the fire stops there.
   - Whether the firer may be adjacent to an enemy. The text implies yes, since an adjacent defender may not battle back.
   - Who gets the banner if the 1-block loss eliminates the rolling unit.
   - Which way a *Slave* lone leader in the path evades. The text says toward the Roman edge, which was presumably written with Roman leaders in mind.
   - Whether the rule applies to Slave units on a hill when the first downhill hex is also a hill.
6. **Barbarian Light Chariot sword-ignore.** LR (all "chariot units") and the site's LBCH summary give it "ignore 1 sword hit in close combat". The Expansion 2 unit page does not mention it. LR is taken as authoritative here (3.1).
7. **Marius rule scope.** The Expansion 2 text arms Roman MI only. The site FAQ (and Expansion 3) say MI and HI. In Expansion 2 this makes no difference, because the only HI under the rule are Tenth Legion units.
8. **Pilum and 2-hex moves.** The pilum fires only "when it holds or moves only one hex". So an MI that moved 2 hexes, with Caesar attached or under Double Time, presumably cannot fire, and a Tenth Legion unit that moved 2 hexes cannot fire. Not stated explicitly.
9. **Caesar:**
   - Not stated whether his +1 die applies when battling back. Alexander's equivalent in the engine is applied to all close combats.
   - Not stated whether the 2-hex move-and-battle applies to an MI moving into terrain that would stop it. Normal terrain stops presumably still apply.
10. **"I Am Spartacus" Slave rule:**
    - "Spartacus is present" presumably ends when he is eliminated.
    - Not stated whether a Slave Counter Attack of a Roman "I Am Spartacus" card gets the +2.
11. **201 Clusium:** the camp sentence says "it is removed", which grammatically could mean the unit. It must mean the camp, since 3 removed camps give the banner.
12. **208 Mt Vesuvius:**
    - Not stated whether each of the 4 camps gives a banner. "A Roman camp hex" suggests one banner per camp.
    - Two camps hold only a leader at setup. A Slave unit cannot enter them until the leader has gone (the normal lone-leader rules apply).
13. **211 Mummius' Defeat:** "remove the camp hex terrain tiles" does not say whether all three camps or only the occupied ones are removed. Either way the result is one banner.
14. **213 / 214 "the camp hex":** 213 has exactly one camp. 214 shows **two** camp-style tiles: a palisade camp with a Roman LI on the right flank, and a tent camp on the Roman baseline. The rule names one camp. The tent camp is the likely one, but this was not determined.
15. **214 last-row rule:** "the last row of the battlefield" is read as the Slave baseline, the top row, where a unit normally loses blocks for retreat hexes it cannot take.
16. **215 River Sabis:** banners are presumably one per enemy camp (each side has exactly one). The page tells Belgic players to remove the rampart ("camp") hex when they take it.
17. **221 Teutoburger Wald P2:** "a Roman camp hex". The map has one fortified-camp hex inside the rampart ring. The ramparts are presumably not camp hexes here, unlike 215.
18. **222:** "occupies and holds" is read as a held banner, lost when the hex is vacated. Not stated outright.
19. **206 Aquae Sextiae:**
    - The ambush text says only "the baseline hex". The map puts the force above the German (top) edge.
    - No first-turn restriction is stated, unlike the engine's Trebbia rule.
    - Not stated whether the card's order count limits how many of the 4 units enter at once.
20. **212 ditch:** it uses broken-ground *tiles* but must not use the broken-ground rules (3.2).
21. **217 seacoast as ford:** it presumably also means stop-on-entry and the ford's dice caps for the Roman units starting there. The page says only "for purposes of movement and combat".
22. **219 section clear:** units on dotted section-boundary hexes belong to both sections, so a Briton there probably denies both sections. Not stated.
23. **202 Telamon:**
    - Hill control counts "units", so lone leaders presumably do not count.
    - The two Roman armies share one hand: unlike 210 there is no separate-army rule.
24. **Leader names:**
    - 207 spells the German king "Beorix" (204 has "Boiorix").
    - 206 has "Teutobodus" and 204 "Teutobod".
    - The 212 map gives no name to either Roman leader (the page says Crassus).
    - 216's page says "Publius Crassus" and the map "Crassus".
25. **218** has no "N banners" tag. Its War Council says 6.
26. **Scenario count vs GMT blurb:** GMT's product text says the battles run from Allia River (390 BC) to Teutoburger Wald. The published book and site have 23 battles from Clusium (225 BC) to Cefn Carnedd (51 AD), with no Allia River. The blurb predates publication.
27. **Rules sources:** there is no online Expansion 2 rulebook or errata. The GMT living rules 2009 already include the Barbarian chariot, marsh and ramparts, and list Rolling Fire among the causes of a leader casualty check. The Marius, Caesar, Spartacus and Rolling Fire rules exist only as the site's transcriptions of the Expansion 2 book.
28. **Hex counts** for terrain ("about N") are readings of the map images. Exact hex coordinates and rampart facings were not extracted.

---

## 5. Scope at a glance

"NEW" means beyond what the engine already supports from the base game and Expansion 1.

| Need | NEW? | Scenarios |
|---|---|---|
| Barbarian Light Chariot (BCH) unit type | **NEW** | 201, 202, 217, 218, 219 |
| Marian pilum (Roman MI ranged, range 2, 1 die) | **NEW** (needs a parameterised ranged ability) | 206–223 (18 battles) |
| Tenth Legion special unit (pilum + 2-hex move without battle) | **NEW** elite preset | 215 (×2), 217 |
| Caesar: +1 CC die | existing (`ccBonus`) | 215, 217, 218 |
| Caesar: attached foot moves 2 hexes and battles | **NEW** leader trait | 215, 217, 218 |
| "I Am Spartacus" +2 order dice for the Slave side | **NEW** card modifier | 208, 210, 211, 212, 213, 214 |
| Rolling Fire | **NEW** combat procedure | 210 |
| Separate armies, one army per card | **NEW** | 210 |
| Off-board ambush (Leadership / Order Light Troops trigger) | extend existing (Trebbia) | 206 |
| Exit-the-board banners | extend existing (Castulo) | 210, 212 (foot only), 221 |
| Held banners (lost when vacated or retaken) | **NEW** | 204, 213, 214 (camps); 222 (ramparts, max 2) |
| Hill-control banners (2, change hands) | **NEW** | 202 |
| Section-clear banners | **NEW** | 219 |
| Camp capture at start of turn, tile removed | extend existing (`campCapture`) | 201 (all 3 → 1), 208, 211 (2+ at once → 1), 215 (both sides; rampart = camp), 221 (2 banners) |
| Removable terrain during play (camps, ramparts) | **NEW** | 201, 208, 211, 215, 221 (camps); 223 (ramparts) |
| Last-row retreat eliminates the unit | **NEW** | 214 |
| Very steep hills | **NEW** terrain variant | 223 |
| Ditch (all units stop; no other effect) | **NEW** terrain variant | 212 |
| Seacoast treated as fordable river | **NEW** scenario override | 217 |
| Sea / lake impassable | existing | 202, 213 |
| Impassable hills (`steep`) | existing | 208, 209 |
| Marsh | existing | 220, 221 |
| Rampart (per-edge facing) | existing (new sideways facings in 221) | 208, 212, 214, 215, 221, 222, 223 |
| Fortified camp | existing | 201, 204, 208, 211, 212, 213, 214, 215, 221 |
| Fordable / impassable river | existing | 215, 218, 223 (fordable); 204, 222 (impassable) |
| HWM (red Roman, and grey in 210) | existing type, new art | 209, 210, 215, 216, 222 |
| Lone leader at setup | existing (since 102) | 208 |
| Units set up behind enemy lines (retreat toward own side) | existing rule; setup and AI care | 202, 208, 212, 213 |
| Barbarian green block set + art | **NEW** | all 201–223 |
| Marian red Roman block set + art (incl. Roman WA, LS, HI, HWM) | **NEW** | 206–223 (default for 201–205 per the text) |
| Grey Roman blocks | existing | 201–205 (as on the site); 210 Lentulus (map only) |
| Optional grey/red block toggle | **NEW** (cosmetic) | 201–205 |
| New command cards | none | — |

## Sources

- Scenario pages 201–223 on commandsandcolors.net (URLs in each section) and their maps at https://www.commandsandcolors.net/ancients/images/stories/CCA_maps/201.jpg … 223.jpg.
- Expansion 2 box pages: https://www.commandsandcolors.net/ancients/the-game/game-boxes/expansion-2.html, with Contents, Official Scenarios, New Special Rules (`new-special-rules-expansion-2.html`), New Terrain Hex (marsh), New Unit Type (Barbarian Light Chariot) and Special Block Mechanic (Tenth Legion).
- Site tag search `/ancients/maps/tag-search/expansion-2.html`, which lists exactly the 23 battles.
- Site unit summary `/ancients/the-game/main/units/light-barbarian-chariot-lbch.html`, and FAQs at `/ancients/the-game/main/faqs/` (expansion-2-rome-and-the-barbarians, units, leader, battle, command-cards).
- GMT living rules 2009: https://gmtwebsiteassets.s3.us-west-2.amazonaws.com/living_rules/CC_Rules_2009.pdf (Barbarian chariot pp.2, 7, 9, 10; sword-ignore for chariots in close combat; retreat; broken ground, rampart and fortified camp terrain; Rolling Fire in the leader-casualty list; I Am Spartacus reshuffle).
- GMT product page for the Expansion 2 & 3 combo pack: https://www.gmtgames.com/p-730-commands-colors-ancients-expansion-2-3-combo-pack-2nd-printing.aspx (no Expansion 2 rulebook or errata download; includes the "Allia River" blurb).
