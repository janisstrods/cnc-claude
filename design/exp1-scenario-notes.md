# Expansion #1 scenario notes (101–124)

How the 24 Greece & Eastern Kingdoms battles in `src/scenarios/data/101.json`–`124.json` were made, and the decisions
behind them. Rules sources and errata are in `design/exp1-survey.md` and `design/exp1-rulings.md`; the briefing texts
are in `src/scenarios/exp1-texts.ts`; `tests/scenarios/manifest.ts` and `tests/scenarios/exp1.test.ts` check the setups.

## Method

- **Transcription.** Each battle was transcribed hex by hex from the official map image on commandsandcolors.net
  (`CCA_maps/<code>.jpg`; 102 uses the smaller `102-Himera.jpg` redraw). For 122–124, which have no unit table on the
  site, GMT's Bonus Pack #2 PDF was the primary source; it matches the site maps hex for hex. The grid was calibrated
  on the base maps 002 and 007 against their JSON. Per-side unit counts were checked against the page's unit table.
- **Verification.** Two independent verifiers (v1: 101–112, v2: 113–124) redrew the hex grid over fresh downloads of the
  maps, compared every unit, leader, terrain hex, ford and rampart edge with the JSON, and re-checked the header
  (sides, blocks, cards, first player, banners, year). Result: **no hex-level discrepancy in any of the 24 battles**;
  every judgement call held up against the art.
- **Import (Task 13).** The verified files were copied with the transcribers' `notes` field removed, and with the fixes
  listed under each battle. Counts were cross-checked once more against the survey's unit tables: all agree except
  121's camel (errata, see below).
- **Names.** Leaders that the maps leave unnamed got plausible historical names. These are cosmetic picks, not
  attestations; no rule in these battles depends on a leader's name.
- **Conventions.** Coast and sea tiles are `sea` (impassable, like a lake). A river-mouth (delta) tile is `sea` too: per
  the official FAQ a delta works like seacoast even where a fordable river runs into it. Impassable hills are `steep`.
  Partial end pieces of a coast or gulf count as water hexes, as in base 006. Fortified camps carry no banner rule
  unless the battle says so (only 114).

## 101 Marathon (490 BC)

- Sea down the left edge on 0,0 1,0 2,0 3,0 4,0 6,0 8,0; 5,0 is plain sand (the coast art skips it). The delta tile 7,0,
  where the stream meets the sea, is `sea`.
- The stream runs 7,1–7,8, bends, and leaves the bottom edge through 8,9; fordable everywhere.
- "Hills Impassable" on the right edge: 9 `steep` hexes (2,12 3,11 4,11 4,12 5,10 5,11 6,10 6,11 6,12).
- The map prints "Miltades"; the historical spelling Miltiades is used.
- Verified: match (the delta call confirmed).

## 102 Himera (480 BC)

- No move-first star on the redrawn map; the page has the Syracusans moving first.
- Sea on the right edge at 0,12 1,11 2,12 3,11 4,12. Camps: palisade rings 1,3 and 1,4 (each with a Carthaginian MI)
  and the tent camp 1,9 (empty). Camps and ramparts are terrain only; the page gives no special rules.
- Ramparts: straight walls across the lower part of 3,1 3,2 3,3 3,9 3,10, battlements toward the Syracusans
  (`faces: bottom`). One continuous diagonal wall runs from the upper-left corner of 0,8 to the bottom corner of 1,8,
  battlements on its left side; each of those two pieces protects W and SW (`edges: [W, SW]`), flanking the tent camp.
- Hamilcar stands alone at 2,10, without a unit (the only lone leader at setup in Expansion #1).
- Errata: the MC with Eumachus at 2,8, inside the Carthaginian position, is a Syracusan (Greek-block) unit.
- The page's commander "Hamilcar Gisgo" is written Hamilcar, as on the map.
- Verified: match (the 0,8/1,8 diagonal confirmed as straight pieces, not corner pieces).

## 103 Plataea (479 BC)

- Six hills: 0,4 4,6 (under the board logo) 5,7 6,12 7,5 7,6.
- The map's "Pausanius" is written Pausanias (page spelling). The uncaptioned Greek leader with the MI at 1,11 is named
  Myronides.
- Verified: match.

## 104 Leuctra (371 BC)

- All plain. The Theban Sacred Band is the MI at 2,11 captioned "Sacred Band" (elite `thebanSacredBand`).
- The Spartans use Eastern Kingdom blocks.
- Verified: match.

## 105 Mantinea (362 BC)

- Ten hills (survey: "about 11"): 5,0 6,0 6,1 7,0 on the left, 3,11 4,12 5,11 6,11 6,12 7,11 on the right. Forests
  8,4 8,5 8,7 behind the Spartan centre.
- Uncaptioned leaders: the Theban with HI 1,6 is named Daiphantus, the Spartan with HI 7,9 Archidamus. "Hegesilios" keeps
  the map spelling.
- Verified: match.

## 106 Crocus Plain (352 BC)

- The Pagasaean Gulf is `lake` on 8,1–8,11, in the same lake-shore style as base 006; the curved end pieces 8,1 and 8,11
  are included, 8,0 and 8,12 are dry.
- The uncaptioned Macedonian leader with the HC at 1,1 is named Parmenio.
- Verified: match.

## 107 Granicus (334 BC)

- The Granicus fills row 3 (3,0–3,11), fordable everywhere. No other terrain on the web map.
- Errata: the units with Rhoesaces (4,5) and Spithridates (4,6), drawn as 4-block MI, are 3-block MC, giving Persian
  MI 2 / MC 3 as in the page table.
- Alexander (MC 1,2, with the Companions) has `ccBonus`; all three satraps have `attachedOnly` (Poor Persian
  Leadership). The commander is Mithridates, the first satrap the page lists.
- Not added: a community report of four hills near the Persian baseline in the printed booklet; the web map shows none
  and their hexes are unknown.
- Verified: match.

## 108 Issus (333 BC)

- The Amanus mountains are 13 ordinary hills down the left edge; the Persian AX at 5,0 and 6,0 stand on them.
- The Pinarus is 5,1–5,10, fordable without dice caps (`ford: nocap`); Persian units start on eight of its hexes. It
  runs into the sea at 5,11, a delta tile, so 5,11 is `sea`.
- Sea on the right edge: 2,12 3,11 4,12 5,11 6,12 7,11 8,12 (3,11, 7,11 and 8,12 are partial coast pieces).
- Companions: the MC with Alexander at 0,4. Immortals: the MI with Darius at 6,6 (captioned).
- The map's "Narbarzanes" is written Nabarzanes; the uncaptioned leader with MI 5,6 (Darius' Greek mercenaries) is
  named Thymondas.
- Verified: match (the 5,11 delta call confirmed).

## 109 Gaugamela (331 BC)

- All plain. Year 331 BC per errata. The two Persian chariots are plain HCH (no scythed-chariot rule).
- Companions: the MC with Alexander at 2,5 only. The commander keeps the War Council's "Darius III"; the leader is
  Darius.
- Verified: match.

## 110 Jaxartes River (328 BC)

- The Jaxartes fills row 3 (all 12 hexes), fordable. Seven hills in the Scythian half: 6,1 6,2 6,5 6,9 6,12 7,7 7,11.
- The two Macedonian HWM (1,3 and 1,8) have 2 blocks. Companions: the MC with Alexander at 1,2.
- Verified: match.

## 111 Hydaspes (326 BC)

- The impassable river winds down the left edge, one hex per row: 0,0 1,0 2,0 3,0 4,0 5,0 6,1 7,0 8,0 (it bulges into
  6,1; the half hexes at the left of odd rows are not board hexes). Forests 4,1 6,0 8,1; 6,0 lies left of the river.
- Two Companion units: the MC with Alexander (1,1) and the MC with Coenus (1,4). The two Macedonian LBC are Greek-block.
- The unnamed Indian leaders with the AX at 7,5 and 7,8 are named Spitaces and Hages.
- Verified: match.

## 112 Hellespont (323 BC)

- All plain. Craterus' army uses Carthaginian blocks; Eumenes' army Greek blocks. The page's year 323 BC is kept (the
  battle is usually dated 321/320 BC).
- Rules: `leaderLossCostsCard` and `allLeadersSuddenDeath`; each side has exactly two leaders.
- **Fix at import:** the map caption "Alcetus" is written Alcetas (the historical name).
- Verified: match.

## 113 Paraitacene (317 BC)

- Six `steep` hexes down the left edge: 0,0 1,0 2,0 4,0 5,0 7,0 (survey: "about 7"; 3,0 6,0 8,0 are plain).
- Eumenes moves first. Silver Shields: the Eumenes HI at 7,8 (captioned), with no leader on it.
- Unnamed leaders: Demetrius (Antigonus' HI 1,5), Eudamus (Eumenes' MC 7,2).
- **Fix at import:** the leader on Eumenes' HI 7,6 was named Antigenes, who historically commanded the Silver Shields
  (a different unit, 7,8); he is renamed Peucestas, another of Eumenes' allied commanders at Paraitacene.
- Verified: match.

## 114 Gabiene (316 BC)

- The only camp is the tent hex 8,12 in the bottom-right corner: Eumenes' baggage camp, empty at start.
- Rule `campCapture`: an Antigonus (top) unit that ends its move on 8,12 gains 1 banner, once, never lost.
  **Added at import:** the log line "Antigonus' troops seize Eumenes' baggage camp!".
- Silver Shields: the Eumenes HI at 7,4 (captioned). The unnamed Eumenes leader on the MC at 7,10 is named Philip.
- Verified: match.

## 115 Ipsus (301 BC)

- All plain. Antigonus' army uses Greek blocks here (unlike 113/114). The War Council names "Seleucus and Lysimachus";
  the commander is Seleucus.
- Seleucus has 4 EL; the page asks for the 4th to be a core-game block (a component note only; the map draws all four
  alike, so no hex is singled out).
- Seleucus stands on the AX at 7,4, not the EL at 8,4 (the portrait sits lower-left of its block on every map).
- Verified: match.

## 116 Heraclea (280 BC)

- The Siris runs along the Roman baseline: straight 8,0 8,1 (impassable), bend 8,2 (fordable; the river turns off the
  board), bend 8,11 (fordable; it re-enters), straight 8,12 (impassable). Bends are fordable river, after the base 002
  Crimissos precedent. A Roman MC starts on each bend.
- Two hills at the top right: 0,10 0,11. Rule `frightAtFirstSight`.
- The Roman commander keeps the War Council's "Valerius Laevinus"; the leader is Laevinus.
- Verified: match.

## 117 Asculum (279 BC)

- All plain. 6 banners (War Council and errata; the site tag says 7). The Romans move first.
- The four leader figures are drawn off the battle lines as "to be placed" markers, so `leaders` is empty. Rule
  `leaderPlacement` with `placeLeaders`: Decius and Sulpicius (the consuls, from the War Council) first, then Pyrrhus and
  a second Epirote leader, named Leonatus (Pyrrhus' officer on the 116 map).
- Verified: match.

## 118 Beneventum (275 BC)

- Nine forests (survey: "about 14"): 0,2 0,3 1,2 2,2 2,4 0,9 1,9 1,10 3,10.
- On the Roman baseline: palisade camps 8,3 (MI), 8,6 (HI), 8,9 (MI with a leader), and four ramparts 8,4 (HWM),
  8,5 (empty), 8,7 (HI with Dentatus), 8,8 (HWM), all with the wall along the upper side, facing the Epirotes
  (`faces: top`). Camps and ramparts are terrain only.
- The Roman leader is Dentatus (map and errata). Unnamed leaders: Lentulus (MI 7,3) and Fabricius (MI 8,9) for Rome,
  Leonatus (MC 2,9) for Epirus.
- Verified: match.

## 119 Raphia (217 BC)

- All plain. The Seleucids move first. Echecrates' caption is cut off on the map ("Echecratu").
- **Fix at import:** the map's "Nicharchus" is written Nicarchus (the historical name).
- Verified: match.

## 120 Cynoscephalae (197 BC)

- Eighteen hills across the middle (survey: "about 16"); under units, 2,7 3,1 3,2 3,6 3,10 3,11 are hills and 3,3 is
  plain.
- The second Roman leader (HI 7,8) is unnamed; named Villius. Option: Tactical Flexibility, on by default.
- **Fix at import:** the map's "Flaminius" is written Flamininus (Titus Quinctius Flamininus), as commander and leader.
- Verified: match.

## 121 Magnesia (190 BC)

- Errata: the Seleucids use Greek blocks (the War Council's "Persian blocks" is wrong), and the camel the map shows at
  2,11, next to Seleucus' HCH, is real although the page table omits it.
- The Phrygios is 7 impassable river hexes down the left edge: 2,0 3,0 4,1 5,0 6,1 7,1 8,2.
- Eumenes of Pergamum leads the Roman MC at 7,8. Option: Tactical Flexibility, on by default.
- Verified: match.

## 122 Cronium (376 BC)

- From the Bonus Pack #2 map (the site map agrees). All plain. 6/5 cards, the Syracusans on Greek blocks move first,
  7 banners, no special rules.
- Unnamed leaders: Hanno (HI 1,1) and Bomilcar (MI 1,9) for Carthage, Thearides (HI 8,3) for Syracuse. The PDF's
  "Himilco Mago" is written Himilco.
- Verified: match.

## 123 Indus (306 BC)

- From the Bonus Pack #2 map. The three Indian AX at 8,1 8,2 8,3 are the bow-armed auxilia (elite `bowAuxilia`).
- Terrain: 5 forests (1,2 1,3 2,2 2,3 3,2; survey: "about 11"), 5 hills (1,11 3,10 3,11 4,12 6,12; an AX stands on
  3,10), and a fordable stream 4,0 5,0 6,1 6,2 6,3 6,4 7,4 8,4.
- "Maurya" keeps the map's name (Chandragupta Maurya). Unnamed leaders: Antiochus (MC 0,1) and Chanakya (HCH 7,5). The
  army is "Indian", after the PDF and the map banner.
- Verified: match.

## 124 Pydna (168 BC)

- From the Bonus Pack #2 map. Seven broken-ground hexes: 3,5 3,7 3,8 4,3 4,4 4,7 5,5 (4,7 is half under the site map's
  logo but clear on the PDF).
- Two empty tent camps 8,7 and 8,8 with no camp rule.
- Paullus follows the PDF (the site map misprints "Paulius"). Option: Tactical Flexibility, on by default (it does not
  apply to a Macedonian HI on broken ground).
- Verified: match.
