# Expansion #3 transcription notes, T1 (301–310)

Files: `exp3-data/301.json` … `310.json`. Tools: `exp3-tools-T1/` (`grid.py` overlay/crops, `classify.py` per-hex terrain
hint, `render.py` JSON-over-map, `check.py` structural/count checks, `blocks.py` block-colour side scan, `missing.py`
unlisted-block scan, `build.py` generates the JSON from the readings). Maps: fresh downloads in `exp3-src-maps-T1/`
(all 1100×733). Work images: `exp3-work-T1/`.

## Method and checks

- **Grid.** Odd-r, row 0 at the top, centre of r0 c0 at (69.5, 87.5), hex width 80.65, row pitch 70.5. Checked by drawing
  `src/scenarios/data/002.json` and `007.json` over fresh downloads of maps 002 and 007: every unit, leader, river and hill
  hex fell in its hex. The verifier's grid is confirmed; no adjustment needed.
- **Reading.** Every battle was read from a labelled overlay plus 1.2–2.2× zoom crops (with and without the grid) for
  unit letters, river paths, wall/town tiles and rampart art. Terrain under blocks was checked with `classify.py`, which
  reads the ring of each hex outside the block area (hill: dark-olive ray pixels; forest: green; water: blue); every
  hill/forest/water call was also checked by eye.
- **Checks (all pass for 301–310).** `check.py`: per-side unit counts by type (board + `reserves` + `placeUnits`) and
  leaders equal the survey's tables; every piece on the board; at most 1 unit and 1 leader per hex; no leader on an enemy
  unit; no piece on impassable terrain; no mounted unit or HWM on a wall; capture hexes are camps/ramparts; objective,
  entry and placement hexes on the board; every piece of a side with `commands` names a valid command; Caesar carries
  `["ccBonus","forcedMarch"]`. `render.py` redraws each JSON over its map: every unit, leader, terrain hex and objective
  hex was compared (images `exp3-work-T1/rd<id>.png`). `blocks.py`: the block-edge colour at every unit's hex matches its
  side (grey/green top, red bottom; 304 Perpenna's 5 units light blue, Herennius' 10 grey). `missing.py`: no block on the
  board is missing from the JSON.
- **Format.** As the Expansion #2 files (key order id, name, year, expansion, top, bottom, first, banners, rules, legions,
  objectives, commands, ambush, terrain, units, leaders, placeUnits, reserves, reserveLeaders), plus the Expansion #3
  fields from the plan (`wall`, `hill` on camp/wall, `art`, `immobile`, unit/leader `command`, `entryHexes` etc.,
  `placeUnits`, side `orders`/`orderDice`). `rules: []` always written; other optional fields left out when unused.
  Impassable rivers carry `ford: false`. No `notes` field in the JSON (notes are here).
- **Names.** Commander = the leader the page's War Council names (page spelling); leader names = map captions, with the
  historical spelling where the caption is a known misprint (listed per battle). Names given to uncaptioned leaders are
  cosmetic picks, not attestations: 302 Hirtuleius, Domitius; 306 Divico, Nammeius, Labienus, Sabinus; 309 Vibullius,
  Plancus; 310 Marcius Rufus.
- **Texts.** Objective and ambush texts are my own short sentences.
- **Survey row numbers.** The survey counts rows from 1 in places ("Roman row 8", "row 6"); the files use 0-based rows.

## 301 Colline Gate (82 BC)

- Header: Samnite `gry`/`samnite`, commander Pontius, 5 cards, first; Roman `rom`/`sullan`, Sulla, 6 cards. 5 banners.
  `legions` both `marius` (rulings D1: the Samnite MI get it too).
- Wall of Rome: 10 hexes on row 7 (survey's "row 8" is 1-based): 7,0 7,1 7,2 7,3 7,6 7,7 7,8 7,9 7,10 7,11, all
  `steep` + `art: "wall"` (rulings D4: impassable, blocks LOS). 7,3 and 7,6 are the angled corner pieces flanking the
  2-hex gap 7,4 (Roman MI) / 7,5 (Roman AX). Sulla's MC at 8,5 behind the wall.
- Camps: 0,4 and 0,8 (tent tiles). Objective: `capture`, bottom only, `turnStart`, `remove`, default 1 banner each.
- Leaders: Pontius on MC 1,3; Sulla on MC 8,5; Crassus on MC 5,8.
- Counts match the table (Samnite LS1 AX6 MI2 MC2; Roman LS2 AX1 MI6 MC2).

## 302 Baetis River (80 BC)

- Header: Sertorian `gry`/`sertorian`, commander Quintus Sertorius, 5 cards, first; Roman `rom`/`sullan`, Lucius
  Fufidius, 4 cards. 6 banners. `legions` both `marius` (the Sertorian HI get the pilum, rulings Q1).
- Baetis: 11 fordable `river` hexes (`ford: true`): 0,6 1,5 2,5 2,4 2,3 3,2 4,2 5,2 6,2 7,1 7,0. Read tile by tile: 2,5
  is the bend from 1,5, 2,4 the straight piece under an LI, 2,3 the bend down to 3,2; the river leaves the board at the left
  edge on row 7. LI on river hexes 2,4 and 2,5 (survey: two LI start in the river).
- Forest: 1,4 4,3 6,1 7,2.
- Red Roman WA at 5,8 and 6,8 (plain `WA`; art is a later concern).
- Leaders: Sertorius on HI 1,7; Herennius on AX 1,9; uncaptioned on MC 0,3 named **Hirtuleius** (Sertorius' quaestor in
  Spain; cosmetic). Fufidius on MI 6,4; uncaptioned on MI 5,7 named **Domitius** (cosmetic, a Sullan officer in Spain).

## 303 Lauron (76 BC)

- Header: Sertorian `gry`/`sertorian`, Quintus Sertorius, 6 cards, first; Roman `rom`/`pompeian`, Pompey, 5 cards.
  7 banners. `legions` both `marius`.
- Lauron: 2,3 2,4 3,2 3,3, `steep` + `art: "town"` (four corner wall tiles in a ring around the "Lauron" label). Zoomed:
  the tiles sit at the centres of exactly these four hexes.
- Hills: 3,6 (under the Sertorian LS) and the bottom-right block 6,10 6,11 6,12 7,9 7,10 7,11 8,9 8,10 8,11 (10 hills,
  survey "about 10"). 8,12 is plain.
- Herennius' ambush force is ordinary on-board units (plan table): WA 7,10, WA 7,11, LI 8,9, AX 8,10 (with Herennius),
  AX 8,11, all on hills, in the Sertorian left section (board right). Nothing else in the data (rulings Q17).
- Roman forward right wing in the top half: MI 3,9, LB 3,10, MI 4,9 (Afranius), MC 4,10 — as drawn.
- Leaders: Perpenna MC 1,2; Sertorius HI 1,5; Herennius AX 8,10; Pompey MI 7,5; Afranius MI 4,9; Petreius MC 7,0.

## 304 Valentia (75 BC)

- Header: Sertorian `gry`/`sertorian`, commander **"Herennius & Perpenna"** (the page names both; written like the
  existing "Gnaeus & Publius Scipio"), 4 cards; Roman `rom`/`pompeian`, Pompey, 5 cards, **first** (star bottom-left).
  6 banners. `legions` both `marius`.
- Valentia: 3,7 3,8 4,7 4,8, `steep` + `art: "town"`.
- Commands: `herennius` (no `blocks`: the side's grey) and `perpenna` (`blocks: "grk"`, the map's light-blue blocks),
  listed in that order as in 210. Every Sertorian unit and both leaders carry `command`.
  - Perpenna (left = board right, light blue on the map): LC 0,9, MI 0,10, MI 0,11, MI 1,9, MI 1,10 + Perpenna.
  - Herennius (right/centre = board left, grey): MC 1,2, AX 2,1, MI 2,2, AX 2,3, AX 2,4, MI 2,5 + Herennius, MI 2,6,
    LS 3,1, LB 3,3, LS 3,5. Matches the survey split (LS2 LB1 AX3 MI3 MC1 / LC1 MI4); the colour scan agrees.
- Romans: Memmius MC 7,1; Pompey MI 7,5; Afranius MI 7,10.

## 305 Sucro (75 BC)

- Header: Sertorian `gry`/`sertorian`, Quintus Sertorius, 6 cards; Roman `rom`/`pompeian`, Pompey, 5 cards, first.
  6 banners. `legions` both `marius`.
- Hills: 7 top-left (0,2 0,3 1,0 1,1 2,0 2,1 2,2) and 4 top-right (0,11 0,12 1,11 2,12) = 11, as the survey. All empty.
- Leaders: Sertorius MC 1,4; Perpenna MI 1,9; Manlius MI 2,3; Pompey MI 6,9; Afranius MI 6,5; Memmius MC 7,1.

## 306 Bibracte (58 BC)

- Header: army **"Helvetian"** (adjective, like Gallic/Germanic; the page and banner say "Helvetii", and the default
  objective texts read "The <army> army …"), `bar`/`helvetii`, 4 cards, first; Roman `rom`/`caesarian`, Julius Caesar,
  6 cards. 7 banners. `legions: { bottom: julian }`.
- Commander: the page gives only "Various Tribal Chiefs"; used **Divico** (the Helvetian war leader of 58 BC), cosmetic.
  Helvetian leaders: Divico on MC 0,5, **Nammeius** on MC 1,10 (a Helvetian envoy named by Caesar; cosmetic).
- Roman leaders: Caesar on HI 7,6 (`traits ["ccBonus","forcedMarch"]`); uncaptioned on MI 6,4 **Labienus** and MI 6,9
  **Sabinus** (Caesar's legates in Gaul; cosmetic).
- "Legio X" labels on HI 6,6 and 7,6: cosmetic, no elite (plan, rulings Q20).
- Camps: Helvetian 0,4 (holding a WA) and 0,6 (empty tents); Roman 8,4 and 8,5, each holding an AX with
  `immobile: true` (the recruits). Objectives: two `capture` (`turnStart`, `remove`, 1 banner each): bottom on 0,4/0,6,
  top on 8,4/8,5.
- Hills (21): 6,2 6,3 6,4 6,6 6,7 6,8 6,9 6,10; 7,2–7,9; 8,2 8,6 8,9 8,11 8,12. 6,5, 8,3, 8,7, 8,8 and 8,10 are plain
  (ring scan 0.00 and by eye). Most Roman units stand on hills (MI 6,3/6,4/6,7/6,9, HI 6,6/7,6, HWM 6,8, AX 7,2/7,9); the
  LI/LB/MC on row 5 and the recruits are not.
- Forest: 2,0 3,0 (left edge) and 2,10 3,10 4,11 (right).
- Red Roman HWM at 6,8.

## 307 Plain of Alsace (58 BC)

- Header: Germanic `bar`/`germanic`, Ariovistus, 4 cards; Roman `rom`/`caesarian`, Julius Caesar, 6 cards, first.
  7 banners. `legions: { bottom: julian }`. All plain (`terrain: []`).
- Leaders: Ariovistus on WA 1,3; Caesar on HI 6,10; Crassus (Publius Crassus) on MC 8,1.
- "Legio X" on HI 6,10 and 6,11: cosmetic.

## 308 Gergovia (52 BC)

- Header: Gallic `bar`/`gallic`, Vercingetorix, 5 cards; Roman `rom`/`caesarian`, Julius Caesar, 5 cards, first.
  8 banners. `rules: ["magoAmbush", "steepSlopes"]` (plan example). `legions: { bottom: julian }`.
- City walls: 0,5 0,6 0,7 0,8 0,9, `wall` + `hill: true` (page: the wall hexes count as hills; the hill art shows
  around them). 0,5 and 0,9 are corner pieces, 0,6–0,8 straight; Gallic LB on 0,6 and 0,8. No edges (not a rampart).
- Gallic camps: 2,5 2,7 2,9, `camp` + `hill: true`, each with a WA (palisade outlines on the hill mass).
- Roman camp: 7,5 (camp outline, HI "Legio X" in it), plain `camp`.
- Hills (20 plain hills): 0,4; 1,4–1,9; 2,4 2,6 2,8; 3,3–3,9; and the entry hexes G2–G4 = 4,0 5,0 6,0. The hill mass is
  17 hills + 3 camps + 5 walls = 25 hexes, the survey's "about 25".
- Forest (10): 0,3 1,3 2,0 2,1 2,3 (left) and 0,10 1,10 2,10 2,12 3,11 (right). 0,1/0,2/1,0–1,2 (Gallic units), 2,2,
  0,12, 1,11, 2,11, 3,10 are plain (the ring scan's green on 0,1/0,11 is block bleed from the green blocks and the
  off-board row, checked by eye).
- Broken ground: 5,3 5,4 5,5 5,6 5,7 (the stone wall at the foot of the hill, per the background text).
- Steep slopes: the engine derives them (rulings D5). On this map the hill-like/forest hexsides are 12:
  0,3–0,4; 1,3–0,4, 1,3–1,4, 1,3–2,4; 2,3–2,4, 2,3–3,3; 0,10–0,9 (wall), 0,10–1,9; 1,10–1,9; 2,10–1,9, 2,10–2,9 (camp),
  2,10–3,9.
- Large Roman camp ramparts: 6,12 (HWM), 7,11 (LI), 8,11 (HWM), `rampart` with `edges: ["W", "NW"]`. Read from the art:
  each tile's wall runs from the hex's top vertex to its lower-left vertex (hidden mostly under the blocks), dark band on
  the right/inside, light ragged earth on the left/outside, so the NW and W hexsides are protected (matches rulings Q6).
- Reinforcements: Gallic AX 2, WA 2 and Vercingetorix drawn above the top-left edge → `reserves` (AX, AX, WA, WA) and
  `reserveLeaders` (Vercingetorix). `ambush`: triggers the four Leadership kinds (inspiredL/C/R, leadershipAny = all six
  Leadership cards), `afterOwnTurns: 0` (no delay stated), `entryHexes` G1–G5 = 3,0 4,0 5,0 6,0 7,0 (labels at those
  hexes; G1 and G5 plain, G2–G4 hills), `noMove`, `attachLeader`, own text without `{section}` (fixed hexes). All five
  entry hexes are empty at the start.
- Roman reinforcement: one MI drawn below the bottom-left edge → `placeUnits` bottom MI on 8,0–8,4 (left section
  baseline; 8,4 lies on the dotted section line and counts, rulings Q6), `after: "ambush"`. It is **not** in `reserves`, so
  the Gallic ambush cannot bring it in; `check.py` counts it with the Romans (MI 7 on board + 1 = 8).
- Objectives (plan table / rulings D6):
  - `capture` bottom, Gallic camps 2,5 2,7 2,9, `turnStart`, `banners [0, 1, 1]`, `remove` (the hex stays a hill).
  - `capture` top, Roman camp 7,5, `turnStart`, `banners [1]`, `remove`.
  - `hold` bottom, wall hexes 0,5–0,9, `max 5` (1 temporary banner per occupied hex).
  - `hold` top, rampart hexes 6,12 7,11 8,11, `max 3`.
- Leaders: Caesar on HI 8,6 (Legio X, traits); Sextus (map caption; historically the legate T. Sextius) on MI 7,3;
  Manucius (map caption kept; I could not tie it to a known legate with confidence) on MC 8,9. Gauls: **Critognatus**
  (map "Critignatus", historical spelling) on WA 0,1; Vercassivellaunus on MC 0,11; Vercingetorix off board.
- Red Roman WA 8,7 8,8 and HWM 6,12 8,11.

## 309 Ilerda (49 BC)

- Header: Pompeian `gry`/`pompeian`, Afranius, 5 cards, first; Caesarian `rom`/`caesarian`, Julius Caesar (page "Caesar";
  full name as 215 and T2's files), 6 cards. 7 banners. `legions` both `julian`.
- Walls of Ilerda: 0,10 (diagonal tile), 1,9 (Pompeian LB) and 2,10 (Pompeian AX), `wall` (scalable, no hill). 1,10 (the
  "Ilerda" label) is plain, as the rulings say.
- River (impassable, `ford: false`), 9 hexes: 0,11 1,11 2,11 3,11 4,11 5,10 6,10 7,10 8,10. The hexes east of it (0,12,
  2,12, 4,12, 5,11, 6,11, 6,12, 7,11, 8,11, 8,12) are plain and empty.
- Hills: hillock 3,4 3,5 3,6; plus 3,10 4,10 5,9 by the river.
- Camps: Pompeian 0,3 and 0,4 (each with an MI); Caesarian 8,3 and 8,4 (tents, empty).
- Objectives: `capture` bottom on 0,3/0,4 and `capture` top on 8,3/8,4, both `turnStart`, `banners [0, 1]`, `remove`
  (1 banner when both are gone); `majority` sides `["bottom"]` on 3,4 3,5 3,6, `banners 1`, `when "always"`.
- Leaders: Afranius HI 0,8; Petreius HI 1,4 (caption under it); uncaptioned HI 1,3 **Vibullius** (L. Vibullius Rufus,
  Pompey's officer in Spain; cosmetic). Caesar HI 8,7 (traits); Fabius HI 7,3; uncaptioned MI 6,8 **Plancus** (L.
  Munatius Plancus, Caesar's legate at Ilerda; cosmetic).

## 310 Utica P1 Delaying Action (49 BC)

- Name "Utica P1 Delaying Action", matching T2's "Utica P2 The Valley".
- Header: top `{ army "Numidian", blocks "gry", look "numidian", commander "Saburra", cards 0, orders "dice",
  orderDice 2 }` (plan). Saburra = page spelling (map "Suburra"). Bottom Caesarian `rom`/`caesarian`, 6 cards, first.
  4 banners. No `legions` (rulings D1), `rules: []`.
- Caesarian commander: the page says only "Curio's cavalry lieutenant" and the map leader (on MC 8,8) has no caption;
  named **Marcius Rufus** (Curio's quaestor in Africa) for both commander and leader. Cosmetic.
- River (impassable, `ford: false`), **8 hexes**: 0,9 1,9 2,10 2,11 3,11 4,11 5,11 6,12; it leaves the right edge on row 6.
  The survey says "about 9"; tile by tile there are 8 (0,8, 1,8, 1,10 and 3,10 are dry).
- Hills: 2,2 3,2 5,1.
- Leaders: Saburra on HI 0,3.

## Open points for the lead/verifiers

- 304 commander string "Herennius & Perpenna" and 306 army name "Helvetian" / commander "Divico" are presentation choices.
- 308 Roman reinforcement is only in `placeUnits` (not `reserves`); if the engine wants it in `reserves` too, the loader
  must keep the ambush from releasing it.
- 308 leader captions "Sextus" and "Manucius" kept as printed.
- 310 river has 8 hexes (survey "about 9").

## Lead edits after verification
- 308: leader Sextus -> Sextius (T. Sextius, Caesar's legate at Gergovia).
- 306: leader Sabinus -> Considius (Sabinus served from 57 BC; P. Considius is named at Bibracte). Cosmetic.
# Expansion #3 transcription notes, T2 (311–319)

Transcriber T2. Files: `311.json` … `319.json` in this folder.

## Method

- **Sources.** Fresh map downloads `CCA_maps/<id>.jpg` (1100×733) in `scratchpad/exp3-src-maps-T2/` (also base 002 and
  007 for calibration). Headers, unit tables and special rules come from `design/exp3-survey.md` §1/§4; rule choices from
  the Decisions table of `design/exp3-rulings.md`; format and per-battle conventions from the plan's Task A1 and
  `design/exp2-scenario-notes.md`.
- **Grid.** The previous verifier's grid fits as given: centre of r0 c0 at (69.5, 87.5), hex width 80.65 px, row pitch
  70.5 px, odd rows shifted right by half a hex. Checked on 002 and 007 against their JSON: every unit, leader, river and
  hill hex falls inside its hex, and the printed hex outlines coincide with the drawn grid at both far corners (zoomed).
  The same template is used by all nine maps.
- **Tools** (`scratchpad/exp3-tools-T2/`, all run with `python3 -I`, image paths passed as arguments):
  - `overlay.py`: labelled grid over a map, or the JSON redrawn over the map (terrain labels, rampart protected edges as
    thick red hexsides, units by side colour, leaders, objective hexes). Every battle was compared overlay against art.
  - `quads.sh`, `zoom.py`, `raw.py`: quadrant crops, hex-range zooms and raw pixel zooms (hill rays under blocks,
    rampart battlements, coast pieces).
  - `water.py`: blue-pixel share per hex (sea pieces; block skies give 0.10–0.20 false hits, so only a screening aid).
  - `sides.py`: block-colour scan. Red-block share is ≥ 0.19 for every bottom unit and ≤ 0.04 for every top unit in all
    nine battles, so every unit's side agrees with its block colour.
  - `missed.py`: flags hexes that look like they hold a block but have no piece in the JSON (and the reverse). Only the
    313 ship markers and the 318 sea strip are flagged, as expected.
  - `build.py` holds the per-battle specs and writes the files; `check.py` checks them.
- **Checks** (`check.py`, all OK): per-side counts by type, leaders included, equal the survey tables (with the two fixed
  decisions: 314 Pompeian LI 2 / LB 1, 315 three Caesarian leaders); every piece and terrain hex on the board; at most one
  unit and one leader per hex; no leader on an enemy unit; no piece on impassable terrain; one terrain entry per hex;
  rampart entries have edges and nothing else does; objective hexes on the board, exit hexes on a board edge, capture
  hexes on camps (ship markers on sea), the hold hex on a camp; headers (blocks, looks, cards, first player, banners,
  legions, `rules: []`); Caesar present exactly in 314–319 with `["ccBonus", "forcedMarch"]`; 313 `handGrowth`.
- **Format.** Key order as the Expansion #2 files: header, `legions`, then `handGrowth` / `objectives`, `terrain`,
  `units`, `leaders`, empty `reserves` / `reserveLeaders`. `rules` is `[]` everywhere. No `notes` field in the JSON.
- **Common header values.** `expansion: "exp3"`. Top blocks `gry` (Pompeian and Numidian armies) or `eas` (316); bottom
  always `Caesarian` / `rom` / `caesarian`. Legions: both sides `julian` except 316 and 317 (`bottom` only). Caesar is
  `commander: "Julius Caesar"` and the leader `"Julius Caesar"` (as in 215/217), traits `["ccBonus", "forcedMarch"]`.
- **Names.** Commanders are the names the page gives; leaders are the map captions. Leaders the map leaves unnamed got
  plausible period names; these are **cosmetic** picks, not attestations (marked below). Two captions were normalised
  (314 Pulio, 316 Dromichaetes) and one expanded (319 Gnaeus Pompeius); see those sections.
- **Row numbers.** The survey's prose row numbers for terrain are 1-based (its "row 4" ridge in 311 is row 3 here, the
  314 "row 5" line is row 4, and so on); its hex lists in the rulings are 0-based and agree with these files.
- **Objective texts** are original short log lines.

## 311 Utica P2 The Valley (49 BC)

- `name` is the page title "Utica P2 The Valley" (no colon). The T1/lead may want to harmonise it with 310's.
- Pompeians (Varus) move first, 5 cards; Caesarians (Curio) 5 cards; 5 banners; Julian legions both sides.
- Hills: 24. Pompeian ridge 3,0–3,6 (7; 3,0 empty, the others under LB, AX, MI, HI+Varus, MI, MI, rays zoom-checked);
  Caesarian ridge 6,0–6,10 (11; 6,0 and 6,7 empty); scattered 1,8 1,11 2,7 (under the AX) 2,8 2,11 5,10. 3,7–3,10, 2,10
  and the row-7/8 Caesarian units are on plain ground (zoom-checked). This matches the survey's 7 + 11 + about 6.
- Pompeian camp (tents) at 0,5, `camp`.
- Objectives (decision 10): `exit` top, hexes (4,0) and (5,0) (the two map "Exit" labels, confirmed on the grid),
  `units: "cavalry"`; `hold` bottom on (0,5), `max: 1` (temporary banner while a Caesarian unit stands there).
- Leaders: Varus (HI 3,4), Curio (HI 6,3). Cosmetic: **Quintilius** on the Pompeian MC 3,9 (Sextus Quintilius Varus was
  in Varus' camp in 49 BC; the short form avoids two "Varus" labels) and **Rebilus** on the Caesarian MC 7,7 (Caninius
  Rebilus, Curio's legate).
- Counts match the table.

## 312 Bagradas River (49 BC)

- Numidians (Saburra) move first, 5 cards; Caesarians (Curio) 5 cards; 5 banners; Julian legions both sides (decision 1:
  the Numidian MI 0,4 and HI 0,3 get them too).
- Terrain: only the hills 2,11 3,10 3,11, all empty; no river on the map (survey).
- Leaders: Saburra (MC 1,6), Curio (HI 6,6). Cosmetic: **Juba** on the Numidian HI 0,3 (the king was present at the
  Bagradas) and **Domitius** on the Caesarian MC 8,3 (Gnaeus Domitius, Curio's cavalry officer).
- Counts match the table.

## 313 Brindisi Raid (48 BC)

- Pompeians (Libo) move first, 5 cards; Caesarians (Antony) `cards: 2` with `handGrowth: { side: "bottom", to: 5 }`;
  6 banners; Julian legions both sides.
- Coast: 8 hexes `{ "t": "sea", "ford": true }` (decision 11): 0,0–0,3 (grey ship markers) and 0,8–0,11 (red ship
  markers, inside Brindisi). These are coast pieces (sea at the top, sand at the bottom); 0,4–0,5, 0,7 and 0,12 are
  plain. The ship blocks are markers, not units.
- Objectives: `capture` top on (0,8)–(0,11) and `capture` bottom on (0,0)–(0,3), both `when: "turnStart"`,
  `marker: "ship"`, no `remove` (only the marker goes; banners default 1 each).
- Brindisi ramparts, 8 hexes (as the rulings list them). Read from raw zooms of the art: the light ragged earth and the
  crenellations face the Pompeian approach, the dark olive band faces the town.
  - 0,6 and 1,6: the wall is a chord from the upper-left vertex to the bottom vertex, battlements on the left:
    `edges ["W", "SW"]`.
  - 2,7 (under the AX): a corner piece; the visible parts run down from the upper-left vertex (earth to the left) and
    leave through the lower-right vertex toward 2,8 (earth below): `edges ["W", "SW", "SE"]`. Most of it is hidden by
    the block, so this is the main judgement call; it agrees with the rulings' suggestion.
  - 2,8–2,12: straight walls in the lower half of the hex, battlements at the bottom: `faces: "bottom"`.
  - The garrison LI 0,6, AX 2,7, LI 2,9, LI 2,11 stands on them; 2,8, 2,10 and 2,12 are empty wall hexes.
- Hills: the full row 5,0–5,11 (12; the survey's "row 6" is 1-based).
- Camps: 6,3 (Antony alone), 6,5 (MI), 6,7 (MI), 6,9 (Fufius alone). Two lone leaders at setup, as drawn (decision 11).
- Leaders: Libo (MI 2,2), Antony and Fufius (captions; Fufius is Quintus Fufius Calenus). No cosmetic names needed.
- Counts match the table (Caesarian MI 8: 6,0 6,1 6,2 6,5 6,7 6,10 6,11 6,12).

## 314 Dyrrhachium (48 BC)

- Pompeians (Pompey) move first, 5 cards; Caesarians (Julius Caesar) 5 cards; 6 banners; Julian legions both sides.
- **Fixed decision applied:** Pompeian LI 2 (1,6 and 2,1, drawn "L") and LB 1 (1,4), as on the map. The page table's
  LI 1 / LB 2 is not used. Totals are unchanged.
- Caesar's line: 10 ramparts in row 4 (the survey's "row 5"): 4,1 4,3 4,5–4,12, gaps at 4,0 4,2 4,4. Straight walls in
  the upper half of the hex, ragged earth and crenellations on top: `faces: "top"`. HI 4,1, HI 4,3, LS 4,5,
  HI 4,7 (Marcellinus), LB 4,9, LS 4,11 stand on them.
- Hills: 9 (survey "about 8"): 7,8 (under the LI) 7,9 7,10 7,11 8,8 8,9 (HI) 8,10 (HI + Caesar) 8,11 (MC) 8,12, all
  zoom-checked; no other terrain.
- Objective: `exit` top over (8,0)–(8,4) (decision 12: the Caesarian left-section baseline; 8,4 sits on the dashed
  section line, so it is in both sections). 8,4 starts with a Caesarian MI on it; that does not matter for the data.
- Leaders: Pompey (HI 0,7), Caesar (HI 8,10), Antony (MI 8,6), Marcellinus (HI 4,7). The map caption "Titus Pulieo"
  (MI 1,1) is written **Titus Pulio**, the spelling of the centurion in Caesar's own account of Dyrrhachium (a
  normalisation like 204's Servilius); revert to the caption if the lead prefers.

## 315 Pharsalus (48 BC)

- Pompeians (Pompey) move first, 4 cards; Caesarians (Julius Caesar) 6 cards; 7 banners; Julian legions both sides.
- **Fixed decision applied:** 3 Caesarian leaders as drawn (Caesar HI 7,8, Antony HI 6,2, Calvinus MI 6,5); the table's
  4th leader is left out.
- Impassable hills, `steep`: 7 (0,6 0,9 0,10 0,11 0,12 1,10 1,11). 0,6 is an isolated hill in the top-centre, not in the
  corner, but the count matches the survey's 7. No unit stands on them.
- Marsh: 4,0 (the survey's "row 5"), standard marsh (decision 21).
- The red WA stands alone at 8,9 behind Caesar, as the survey notes.
- Leaders: Pompey (MI 1,7), Lentulus (MI 1,2), Labienus (MC 2,11). No cosmetic names needed.
- Counts match the table apart from the leader decision.

## 316 Zela (47 BC)

- Pontic army (Pharnaces) moves first, 4 cards, `eas` blocks, look `pontic`; Caesarians (Julius Caesar) 6 cards;
  7 banners; Julian legions for the Romans only (`legions: { "bottom": "julian" }`; the Pontic MI/HI get nothing).
- Camps: Pontic 0,5 0,6 0,8 (tents, empty); Caesarian 8,5 (with an AX). Otherwise plain.
- Objectives (camp capture both sides): `capture` bottom on (0,5) (0,6) (0,8) and `capture` top on (8,5), both
  `when: "turnStart"`, `remove: true`, 1 banner per camp hex.
- Leaders: Pharnaces (HI 1,6), Aristion (MI 1,9), and the map's "Drmchtes" (MI 1,2), written **Dromichaetes** (the survey
  reads the caption that way; normalised spelling). Caesar is on HI 8,7. Cosmetic: **Calvinus** on MI 7,2 (Domitius
  Calvinus joined Caesar for the Zela campaign) and **Vinicianus** on HI 7,8 (Caelius Vinicianus, left in Pontus after
  the battle).
- Counts match the table.

## 317 Ruspina (46 BC)

- Numidians (Titus Labienus) move first, 5 cards; Caesarians (Julius Caesar) 6 cards; 5 banners; Julian legions for the
  Romans only.
- All plain: `terrain: []`.
- Objective (decision 14): `exit` bottom over all 13 row-0 hexes, `leadersScore: true`, units any.
- Leaders: Labienus (MC 1,7; the commander is "Titus Labienus" as on the page), Petreius (MC 1,1), Caesar (HI 6,8).
  Cosmetic: **Saserna** on HI 6,4 (the Saserna brothers served Caesar around Ruspina).
- Counts match the table.

## 318 Thapsus (46 BC)

- Pompeians (Scipio) move first, 5 cards; Caesarians (Julius Caesar) 6 cards; 7 banners; Julian legions both sides
  (Juba's HI 2,4 included, decision 1).
- Marsh: 9 (1,1 2,0 2,1 3,1 4,1 4,2 5,1 6,0 6,1), all full marsh tiles, all empty.
- Sea, impassable (decision 21): 7 hexes down the right edge, 2,12 3,11 4,12 5,11 6,12 7,11 8,12. The coast is one
  wavy strip; measured water share is 0.51–0.67 for the even-row column-12 hexes and 0.29 for the odd-row column-11
  hexes. The odd-row ones are partial pieces and count as water by the Expansion #1/#2 convention; this is the thinnest
  call in the battle (1,11 and the rest of column 11/12 above row 2 are dry). The count matches the survey's "about 7".
- Elephants: EL 2,2 and EL 3,9 (grey blocks).
- Leaders: Scipio (MI 2,8), Juba (HI 2,4), Petreius (LC 0,1); Caesar (HI 7,8), Domitius (MI 7,3), Rebilus (MI 7,6). All
  captioned; no cosmetic names.
- Counts match the table.

## 319 Munda (45 BC)

- Caesarians (Julius Caesar) **move first** (star bottom-left), 6 cards; Pompeians (Gnaeus Pompey) 4 cards; 8 banners;
  Julian legions both sides.
- Hills: 19 (survey "about 20"): row 1 1,1–1,10 (1,2 MI+Labienus, 1,6 MI+Pompeius, 1,10 AX on hill) and row 2 2,1 2,2
  2,4–2,10 (under LB, HI, five AX, MI, HI). Zoom-checked plain: 1,0, 1,11 (MC), 2,0, 2,3 (empty gap), 2,11 (LB), 2,12.
  No hills in the Caesarian half.
- Leaders: Labienus (MI 1,2); the caption "Pompeius" (MI 1,6) is written **Gnaeus Pompeius** to tell Pompey's son from
  his father in 314/315 (the commander is "Gnaeus Pompey" as on the page). Caesar (MI 8,8), Pedius (MC 7,0), Maximus
  (MI 7,5). No cosmetic names.
- Counts match the table.

## Open points for the verifier / lead

- 313 corner rampart 2,7 `[W, SW, SE]` (mostly hidden under the AX block).
- 318 odd-row coast pieces 3,11 5,11 7,11 (water share 0.29) counted as sea.
- Name normalisations: 314 Titus Pulio (caption "Titus Pulieo"), 316 Dromichaetes ("Drmchtes"), 319 Gnaeus Pompeius
  ("Pompeius"); 311 name without a colon.
