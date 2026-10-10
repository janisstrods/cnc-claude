
# Expansion #2 scenario notes (201–223)

How the 23 Rome & the Barbarians battles in `src/scenarios/data/201.json`–`223.json` were made, and the decisions
behind them. Rules sources and rulings are in `design/exp2-survey.md` and `design/exp2-rulings.md`; the briefing texts
are in `src/scenarios/exp2-texts.ts`; `tests/scenarios/manifest.ts` and `tests/scenarios/exp2.test.ts` check the setups.

## Method

- **Transcription.** Two transcribers (T1: 201–212, T2: 213–223) read each battle hex by hex from the official map image on
  commandsandcolors.net (`CCA_maps/<id>.jpg`), using the scenario page for the War Council header and unit table. The
  odd-r grid was calibrated on the base maps 002 and 007 against their JSON (every unit, leader, river and hill hex fell in
  its hex). Each battle was redrawn from the JSON over the map and compared hex by hex; a block-colour scan confirmed the
  side of every unit. Per-side unit counts were checked against the page's unit table: all 23 agree.
- **Verification.** Two independent verifiers (V1: 201–212, V2: 213–223) built their own grid and tools from fresh
  downloads, redrew every unit, leader, terrain hex, ford and rampart edge, and re-checked the header (sides, blocks, cards,
  first player, banners, year). V1 found **one discrepancy**: the hill at 7,9 under the Roman cavalry in 206 was missing
  (fixed; 206 has 11 hills). V2 found **none** in 213–223. Both confirmed every flagged judgement call.
  V2 noted that the shared T2 grid sat up to 14 px left of the printed grid near the left edge, under a third of a hex, so
  no hex changed.
- **Import (Task 12).** The verified files were copied with the transcribers' `notes` field removed, and the counts were
  cross-checked once more against the survey's unit tables (they agree). The manifest in `tests/scenarios/manifest.ts` was
  generated from the imported files.
- **Names.** Leaders that the maps leave unnamed got plausible period names. These are cosmetic picks, not attestations; no
  rule depends on a leader's name (Caesar's and Spartacus' traits are data on the leader, not on the name).
- **Counts above the survey's estimates.** The survey gives "about N" for terrain. The map counts are higher in places (hills
  in 214, 215, 223; forest in 201, 211, 212, 219, 221; sea in 202); the counts were each checked against the art by both
  the transcriber and the verifier, and the files follow the maps.

## Conventions

- **Headers.** `expansion: "exp2"`. Every top army uses `bar` blocks. Romans of 201–205 are `rom` / `roman` with no legions;
  Romans of 206–223 are `rom` / `marian` with `legions: { bottom: "marius" }`. `rules: []` is written even when empty, as in
  Expansion #1; other optional fields are left out when unused. Impassable rivers carry `ford: false`.
- **Water.** Coast and lake tiles are `sea` / `lake`, and partial end pieces of a coast or lake count as water (as in
  Expansion #1). Impassable hills are `steep`; 223 also uses the rule `veryHills`.
- **Ramparts.** The protected side is the side with the light ragged earth and the crenellations; the dark olive base band is
  the defender's side (checked against Expansion #1's 102 and 118). A straight wall parallel to the board edge is `faces`; a
  60° wall lists two `edges` on its battlement side; a bent corner piece lists three.
- **Camps and objectives.** Captures that remove the camp (rulings 9d) are `capture` with `when: "turnStart"` and
  `remove: true`; camp-holding battles (rulings 9a, Q10) are `hold`. Objective texts are original short log lines.
- **Cosmetic leaders.** The commander is the first leader the page names; leader names are the map captions.

## 201 Clusium (225 BC)

- Three palisade camps at 3,5, 4,4 and 4,5, each with a Gallic MC. Objective: Romans `capture`, `turnStart`,
  `banners [0, 0, 1]`, `remove`, over the three hexes (rulings 9d).
- Forests: 7 (survey "about 6"), zoom-checked. Hills: 4,7 4,8 4,9 5,7. The barbarian chariot (BCH) is at 0,4 and needs no
  data beyond its type.
- The page names the Roman leader only as "A Roman Praetor"; the map caption "Praetor" is used for the leader at MI 6,7 and
  for the commander. The uncaptioned MI 6,5 leader is Manlius. The Gallic commander is Aneroestes (WA 0,5); Concolitanus is on
  WA 1,10.
- Romans use `rom` blocks (the site draws grey) per the lead's decision.
- Verified: match.

## 202 Telamon (225 BC)

- Sea: 13 hexes down the left edge (survey "about 10"). 0,0 0,1 1,0 2,0 are full sea tiles; 0,2 1,1 2,1 3,0 4,0 5,0 6,0 7,0
  8,0 are coast tiles (water fractions 0.25–0.6, counted as water as in Expansion #1; 0,2 5,0 and 7,0 were the thinnest
  calls, both verifiers confirmed them).
- Hills: 9 (1,11 2,8 2,9 2,11 3,9 3,10 3,11 4,12 5,11). Objective: `majority` for both sides over the nine, 2 banners,
  `turnEnd`.
- Regulus' wing starts on rows 0–1 (the survey's split); Papus' wing on rows 7–8. The commander is Atilius Regulus; the
  uncaptioned MC 8,8 leader is Fabius. Gauls: Aneroestes (WA 4,3), Concolitanus (MC 4,9).
- Verified: match.

## 203 Clastidium (222 BC)

- 4 banners (rulings Q11; the page tag says 8). Hills: 3,0 6,0 7,0 2,12 4,12 5,11.
- Marcellus rides the MC at 6,6; uncaptioned MC 6,3 and 6,9 are Flaminius and Furius (the consuls of 223 BC). Britomartus is
  on MC 3,5.
- Verified: match.

## 204 Arausio (105 BC)

- The Rhone: 7 impassable river hexes at 2,12 3,11 4,12 5,11 6,11 7,11 8,11; 6,12 and 8,12 lie beyond it and are plain.
- Two empty tent camps 8,8 and 8,9. Objective: Germans `hold` over both, `max 1` (rulings 9a).
- The page's "Servillius Caepio" is written Servilius (historical spelling); the leader is Caepio (MI 7,6). The uncaptioned
  MC 7,9 leader is Mallius. German captions Boiorix (MC 0,3) and Teutobod (MC 1,9) are kept.
- Verified: match.

## 205 Scirthaea (103 BC)

- All plain. Slave leaders Athenion (MC 2,1) and Salvius (MI 2,7, commander). Lucullus is on MI 8,6; the uncaptioned Roman
  leaders MI 7,4 and 7,7 are Servilius and Clodius.
- Verified: match.

## 206 Aquae Sextiae (102 BC)

- Ambush force off the board (drawn above the top-left edge): Roman LI, AX, AX, LC in `reserves` and Marcellus in
  `reserveLeaders`; `rules: ["magoAmbush"]`. `ambush`: triggers inspiredL, inspiredC, inspiredR, leadershipAny, orderLight,
  `afterOwnTurns: 0` (decision 8), with a text using a `{section}` placeholder.
- Hills: the ridge 6,2–6,9 (8 hexes; 6,2 empty) plus 7,1 and 7,10, and **7,9 under the Roman MC (added at import, the single
  V1 discrepancy)**: 11 hills. Forests: 0,3 0,7 0,10.
- Marius is on MI 6,8; the uncaptioned MI 6,4 leader is Aquillius. Teutobodus (page and map spelling) is on MC 1,5.
- Verified: match after the 7,9 hill.

## 207 Vercellae (101 BC)

- All plain. The page and map spell the king "Beorix"; he is written Boiorix, the name already used in 204 (rulings Q17: the
  same king), as commander and as the leader on WA 1,6. The uncaptioned German leader on MC 2,2 is Lugius.
- Romans: Marius (MI 7,2), Catulus (MI 7,5), Sulla (MI 7,10).
- Verified: match.

## 208 Mt Vesuvius (73 BC)

- Impassable hills (`steep`): 18 hexes (0,0 0,1 0,7 0,8 0,9; 1,0 1,9; 2,0 2,1 2,2 2,9; 3,1 3,9 3,10; 4,2 4,3 4,10; 5,2).
  Forests: 1,11 6,1 6,6 6,10 6,11 7,1.
- Four camps: 3,4 (MI) and 3,8 (AX), plus 3,7 and 4,6, which hold only the lone Roman leaders Glaber and Varinius.
  Objective: Slaves `capture`, `turnStart`, `remove`, one banner per camp (rulings 9d).
- Ramparts: straight walls on 2,5 2,6 2,7 2,8 (`faces: top`); the angled wall in 3,3 is `edges [W, NW]`. 2,4 is a corner piece,
  `edges [W, NW, NE]` (the wall bends inside the hex; both verifiers read it the same way; the alternative `faces: top`
  would leave the W side open).
- Slaves: row 0 (WA 0,2, MI 0,3, LI 0,4, WA 0,5, AX 0,6) and behind the Romans (AX 6,3, WA 6,8, WA 6,9, MI 7,4 with Spartacus,
  WA 7,5, MI 7,8). Spartacus has `spartacusDice`. Commander "Claudius Glaber", leaders Glaber and Varinius (captions).
- Verified: match.

## 209 Mt Garganus (72 BC)

- Impassable hills: 13 `steep` at 0,3–0,9 and 1,3–1,8 ("Mount Garganus").
- Crixus (WA 2,8) has no trait: Spartacus is not here. Roman HWM at 6,6; Gellius on MI 7,9; the uncaptioned MI 7,2 leader is
  Arrius.
- Verified: match.

## 210 Picenum (72 BC)

- Hills: 22. All 12 hexes of row 1 (the survey's "13" cannot be: an odd row has 12; 11 Slave units stand on them and 1,4 is an
  empty hill) and a central chain of 10 (2,5 2,6 3,5 4,6 5,5 5,6 6,6 7,5 7,6 8,6).
- `commands`: `lentulus` (`blocks: "gry"`) and `gellius`. Lentulus (grey, left of the chain): LI 5,1 5,4; HWM 5,2; MI 6,1 6,2
  6,4 7,3; MC 8,2 with Lentulus. Gellius (red, right): LI 4,8 4,11; MI 5,7 6,8 6,10 6,11 7,8 with Gellius; HWM 5,9; MC 8,7
  8,12. Leaders carry no `command` and are unrestricted (decision 7).
- Objective: Slaves `exit` over all 13 row-8 hexes (the hill 8,6 included), any unit. `rollingFire: "top"`.
- Spartacus is on MI 1,6 (`spartacusDice`); uncaptioned Slave leaders WA 0,8 Castus and MI 1,3 Gannicus. The commander is
  Gellius.
- Verified: match.

## 211 Mummius' Defeat (72 BC)

- Forests: 12 (survey "about 8"; left 0,4 2,3 3,0 3,2 4,1 4,2, right 2,9 3,9 3,11 4,9 4,10 4,11), zoom-checked by both.
  Hills: 4,3 and 5,2.
- Camps 2,5 (LS), 2,6 (AX), 2,7 (LS). Objective: Romans `capture`, `turnStart`, `together: 2`, `remove` (rulings 9d: one
  banner for the three, all three tiles removed).
- Spartacus is on MI 3,2. Mummius is on MI 6,7; uncaptioned Roman leaders MI 6,5 and MC 7,10 are Quinctius and Scrofa.
- Verified: match.

## 212 Bruttium (71 BC)

- Ditch: 4,4–4,12 (9 hexes), drawn with broken-ground tiles, written as `ditch`. Ramparts 5,3–5,11 (9 hexes), `faces: top`
  (5,2 is plain); two LB, two AX stand on them.
- Camps 7,4 7,6 7,8 7,10, each with an MI. Forests: 10 (survey "about 9"); the three Slave LC stand on forest.
- Objective: Slaves `exit`, `units: "foot"`, over all 13 row-8 hexes (the LC at 8,2 starts on that row but cannot exit).
- Crassus is the MI at 7,6 in the centre camp (neither Roman leader is captioned); the MC at 8,12 is Quinctius. Spartacus is on
  MI 2,5; the Slave WA 1,8 leader is Gannicus.
- Verified: match.

## 213 Camalatrum (71 BC)

- Slaves (Spartacus) move first, 5 cards; Romans (Crassus) 5 cards; 6 banners.
- Lucanian Lake: 5 hexes (0,12 1,11 2,12 3,11 4,12), the shore pieces counted as water. Hills: 8 (2,8 2,9 2,10 3,2 3,3 3,8 3,9
  4,3); forest 5,10 6,2 7,2 8,3. Palisade camp 3,4 under Cannicus' MI, with no hill.
- Two groups start behind the enemy lines, as drawn: Marcius' Roman group in the top-left corner (MI 0,0, MI 0,2 with Marcius,
  MI 1,0, AX 1,1) and Castus' Slave group in the bottom-left (MI 6,1 with Castus, WA 7,1, LC 8,0). No data beyond the positions.
- Objective: Romans `hold` the camp 3,4, `max 1` (rulings 9a). Spartacus (MI 3,8) has `spartacusDice`. "Cannicus" keeps the map
  spelling; Pomptinus (MI 7,9) is cosmetic.
- Verified: match.

## 214 Silarus (71 BC)

- Slaves (Spartacus) move first, 5 cards; Romans (Crassus) 6 cards; 6 banners; `lastRowRetreat: "top"`.
- Hills: 16 (survey "about 10": 9 are empty, 7 under blocks, all with rays). Camps: palisade 6,9 (Roman LI) and tent camp 8,10
  (empty). Ramparts 6,10 (AX) and 6,11 (LI), `faces: top`.
- Objective: Slaves `hold` either camp, `max 1` (rulings Q10).
- Spartacus is on MI 2,4 (`spartacusDice`); Publipor (WA 0,6) and Bithus (WA 0,8) are cosmetic; Romans Scrofa (MI 6,3) and
  Quinctius (MI 6,7) too.
- Verified: match.

## 215 River Sabis (57 BC)

- Belgae (Boduognatus) move first, 4 cards; Romans (Caesar) 6 cards; 8 banners.
- The Sabis: 15 fordable river hexes (8,1 7,1 6,2 5,2 4,3 3,3 3,4 3,5 3,6 3,7 3,8 3,9 3,10 2,11 1,11); a Roman MC stands in the
  ford at 6,2. Forests: 9. Hills: 5 (survey "3": 1,3 5,4 5,5 carry units). Belgic palisade camp at 1,0.
- The Roman "unfinished camp" is a single rampart at 7,4, `faces: top`. Objectives (rulings 9d, both `turnStart`, `remove`, 1
  banner): Romans capture [1,0]; Belgae capture [7,4], the rampart that counts as the Roman camp.
- Tenth Legion: HI 6,3 (Labienus) and HI 6,4, both `elite: "tenthLegion"`. Caesar (MI 5,6) has `["ccBonus", "forcedMarch"]`.
  Cosmetic: Pedius, Vertico, Correus.
- Verified: match.

## 216 Sotium (56 BC)

- Gauls (Adiatuanos) move first, 5 cards; Romans (Publius Crassus) 6 cards; 6 banners.
- Hills: 14, forest: 5, all empty; no unit stands on either. Crassus is the MI at 7,3 (caption "Crassus"); Adiatuanos is on MC 2,6.
  Cosmetic: Teutomatus, Ollovico, Valerius, Considius.
- Verified: match.

## 217 Invasion of Britain (55 BC)

- Britons move first, 5 cards; Romans (Caesar) 6 cards; 7 banners.
- The seacoast 8,1–8,11 (11 hexes; 8,1 and 8,11 are partial corner pieces) is `{ "t": "sea", "ford": true }` (lead's override):
  a fordable river whose art is sea. Eight Roman units start on it; 8,6 is an empty coast hex.
- Hills: 8, all empty (the WA at 4,6 is on plain ground). Tenth Legion HI at 6,6 (`tenthLegion`). Caesar (MI 7,6) has both
  traits.
- The page names no Briton leader; the cosmetic Segovax (WA 4,6) is the leader and the commander (V2 accepted this; a neutral
  string such as "Briton chieftain" would do). Cosmetic Romans: Volusenus, Sulpicius.
- Verified: match.

## 218 River Stour (54 BC)

- Britons move first, 5 cards; Romans (Caesar) 6 cards; **6 banners** (War Council; the page has no tag, rulings Q11).
- The Stour is the whole of row 0 (13 fordable hexes). Forests: 9. The Briton line is row 2 (LC, MC, seven BCH, MC, LC).
- The page says the Briton leader is "Unknown"; the cosmetic Carvilius (BCH 2,6) is the leader and the commander. Caesar
  (MI 6,6) has both traits; cosmetic Romans Quintus Cicero and Laberius.
- Verified: match.

## 219 Foraging Party (54 BC)

- Britons (Cassivellaunus) move first, 5 cards; Romans (Gaius Trebonius) 6 cards; 6 banners.
- Hills: 6 (0,3 under Cassivellaunus' WA, 1,9, 2,5, 2,9, 3,1, 7,2). Forests: 11 (survey "about 10"). Flanks: BCH at 4,0 4,1 4,11
  4,12, LC at 3,0 and 3,11.
- Objective: Romans `sectionClear` (rulings 9c). Trebonius (MI 4,6) is the leader; Cingetorix, Volusenus and Quintus Cicero are
  cosmetic.
- Verified: match.

## 220 Teutoburger Wald P1 (9 AD)

- Germans (Arminius) move first, 5 cards; Romans (Varus) 5 cards; 6 banners.
- Marsh: 8,2–8,10. Broken ground: 3,0 and 4,11. Hills: 4,3–4,8, all under the German front row. Forests: 10. The Roman line is
  row 7, LI 7,1 to LI 7,11. Arminius (WA 2,6) and Varus (MC 7,5); cosmetic Segimer, Inguiomer, Eggius, Ceionius.
- Verified: match.

## 221 Teutoburger Wald P2 (9 AD)

- Germans (Arminius) move first, 5 cards; Romans (Vala) 4 cards; 6 banners.
- The Roman marching camp has 12 ramparts. Front row 5,4–5,7: `faces: top`. Corners 5,3 `edges [W, NW, NE]` and 5,8
  `edges [NW, NE, E]`. Left side 6,3 7,2 8,2: `edges [NW, W]`; right side 6,9 7,9 8,10: `edges [NE, E]`. The corners are the main
  judgement call; both verifiers read the chords vertex to vertex and agreed. A palisade camp at 7,6 (MI) is inside.
- Marsh: 8 (0,0 1,0 0,10 0,11 7,0 7,1 8,0 8,1; the survey's "two in each corner" is wrong: the bottom right is dry). Forests:
  14 (survey "about 8"); every German unit stands in forest.
- Objectives: Germans `capture` [7,6], `turnStart`, `banners [2]`, `remove`; Romans `exit` over all 13 row-0 hexes (rulings 9d,
  Q14; ramparts are not camps).
- Vala (MC 6,6) and Arminius (MC 1,3); cosmetic Segimer and Inguiomer.
- Verified: match.

## 222 Angrivarii Rampart (16 AD)

- Germans (Arminius) 5 cards; Romans (Germanicus) 6 cards and **move first** (War Council and rulings Q11; the map's star
  disagrees and is overridden); 6 banners.
- Ramparts 2,4–2,10 (7 hexes), `faces: bottom`, all held by German units. An impassable river (`ford: false`) on 0,12 1,11 2,11
  3,11 4,11 5,11 6,12 7,11 8,12; 2,12 and 4,12 are dry. Forests: 14 (0,11 is on the right, next to the river).
- Objective: Romans `hold` the seven rampart hexes, `max 2` (rulings 9a). A Roman WA with a leader stands at 8,2. Arminius (MC
  2,2) and Germanicus (MI 7,4); cosmetic Inguiomer, Seius Tubero, Stertinius.
- Verified: match.

## 223 Cefn Carnedd (51 AD)

- Britons (Caratacus) 5 cards; Romans (Publius Ostorius Scapula) 6 cards and move first (star bottom-left); 6 banners.
  `rules: ["veryHills"]` and `rampartBreakers: "bottom"` (lead's override).
- The Severn: 15 fordable hexes (5,0 5,1 5,2 5,3 4,4 4,5 4,6 5,6 5,7 5,8 5,9 5,10 4,11 3,11 2,12).
- Hills: 16 (survey "about 12"): 14 in the Briton half and 2 in the Roman rear (7,7 under Scapula's MI, 8,8). The ramparts have
  no hill of their own.
- Ramparts: 2,4 2,5 3,1 3,7 3,8 `faces: bottom`; 2,10 is a diagonal piece, `edges [E, SE]` (facing the river crossing on the
  Briton right, both verifiers agreed). Each holds a Briton unit.
- Caratacus (WA 2,5) and Scapula (MI 7,7); cosmetic Arviragus, Venutius, Marcus Ostorius, Manlius Valens.
- Verified: match.
