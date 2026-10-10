# Expansion #3 verification V1 (battles 301–310)

Verifier V1, 2026-10-10. Files checked: `exp3-data/301.json` … `310.json` and `notes-T1.md`. No JSON file was edited.

**Result: all 10 battles match the maps and the battle data. 0 discrepancies.** The T1 doubts are settled below. The
name suggestions at the end are optional; none of them is a discrepancy.

## Method

- **Maps.** Fresh downloads of `CCA_maps/<id>.jpg` for 002, 007 and 301–310 into `exp3-verify-V1-maps/`. All are
  1100×733 and none was executed.
- **Grid, fitted independently** (`exp3-verify-V1/fitgrid.py`):
  - The script searches x0, y0, hex width and row pitch so that the predicted hex edges fall on the maps' dark hex
    outlines. It fits maps 002 and 007 together.
  - Best fit: r0 c0 at (69.0, 87.0), width **80.65**, pitch **70.5**. This is the previous fit (69.5, 87.5, 80.65, 70.5)
    to within the script's half-pixel rounding.
  - A brightness profile across the vertical hexsides has its minimum exactly on the previous fit's edges.
  - The `002.json` and `007.json` overlays put every unit, leader, river and hill in its hex.
  - Overlays use (69.25, 87.25, 80.65, 70.5).
- **Overlays** (`render.py`): the grid with r,c labels, plus each JSON's terrain (type and flags, `art`, rampart `edges`
  drawn as hexsides), units (side colour, `*` = immobile, command), leaders, objective hexes, `ENTRY` and `PLACE` hexes.
  Each battle was compared hex by hex at full size, then in 1.6–3× crops of every river, hill block, wall, town, camp and
  rampart. Images are in `exp3-verify-V1/out/`.
- **Automatic cross-checks** (scripts in `exp3-verify-V1/`):
  - `scan.py`: for every hex, the hill-ray, forest-green and water-blue fractions outside the block area, compared with the
    JSON. Every flagged hex was looked at by eye. The flags came only from wall/town/camp/rampart art, the "ANCIENTS"
    watermark (4,5–4,7) and leader portraits or block art.
  - `missing.py`: no block on any map is missing from the JSON, and no JSON unit stands on an empty hex.
  - `sides.py`: the block frame colour of every JSON unit matches its side.
    - 301–305, 309, 310: top grey, bottom red.
    - 306–308: top green.
    - 304: Perpenna's 5 units are light blue; Herennius' 10 are grey.
  - `check.py`: at most 1 unit and 1 leader per hex; no leader on an enemy unit; no piece on impassable terrain; no
    mounted unit or HWM on a wall; capture hexes are camps; objective, entry and placement hexes are on the board; entry
    hexes are empty; every 304 Sertorian piece has a valid command; Caesar has `["ccBonus","forcedMarch"]` (306–309).
  - Counts per side (board + `reserves` + `placeUnits`, leaders incl. `reserveLeaders`) equal the survey tables in all
    10 battles.
- **Headers** were checked against the survey's per-battle data and the plan's table: name, year, army, blocks, look,
  commander, cards, first player (the star on the map), banners, legions, rules, `orders`.
- **Objectives and other settings** were checked against rulings D1, D3–D9, D15 and D16: objectives, ambush,
  `placeUnits`, commands and `immobile`.

## 301 Colline Gate — match

- Wall of Rome: 7,0–7,3 and 7,6–7,11, `steep` + `art: "wall"`. The corner tiles are on 7,3 and 7,6; the gap 7,4/7,5
  holds the Roman MI and AX.
- Camps: 0,4 and 0,8.
- Objective: `capture`, bottom, `turnStart`, `remove`, default banners.
- `legions`: both `marius`.
- Header: 5/6 cards, top first, 5 banners.

## 302 Baetis River — match

- River, 11 hexes, `ford: true`: 0,6 1,5 2,5 2,4 2,3 3,2 4,2 5,2 6,2 7,1 7,0. Each hex was checked in a zoomed crop.
  The LI stand in the river on 2,4 and 2,5.
- Forest: 1,4 4,3 6,1 7,2.
- Header: 5/4 cards, top first, 6 banners, both `marius`.

## 303 Lauron — match

- Town: 2,3 2,4 3,2 3,3, `steep` + `town`. The ring's centroid is the "Lauron" label.
- Hills (10): 3,6, 6,10–6,12, 7,9–7,11 and 8,9–8,11. The hill rays were checked under both WA; 8,12 is plain.
- The ambush force is ordinary on-board units.
- Header: 6/5 cards, top first, 7 banners.

## 304 Valentia — match

- Town: 3,7 3,8 4,7 4,8.
- Commands: `herennius` (grey), and `perpenna` (`blocks: "grk"`).
  - Perpenna: LC 0,9 and MI 0,10, 0,11, 1,9, 1,10, plus Perpenna himself.
  - Herennius: LS 2, LB 1, AX 3, MI 3 and MC 1, plus Herennius himself.
  - Both leaders carry `command` (D16).
- Header: 4/5 cards, bottom first (star bottom-left), 6 banners.

## 305 Sucro — match

- Hills (11): 0,2 0,3 1,0 1,1 2,0 2,1 2,2 and 0,11 0,12 1,11 2,12. 2,3 (MI with Manlius) and 2,11 (LS) are plain.
- Header: 6/5 cards, bottom first, 6 banners.

## 306 Bibracte — match

- Hills (21), checked hex by hex in zoomed crops:
  - Row 6: 6,2 6,3 6,4 6,6 6,7 6,8 6,9 6,10.
  - Row 7: 7,2–7,9.
  - Row 8: 8,2 8,6 8,9 8,11 8,12.
  - Plain: 6,5, 8,3, 8,7, 8,8 and 8,10. The camps are not on hills.
- Forest: 2,0 3,0 2,10 3,10 4,11.
- Camps: 0,4 (with WA), 0,6, 8,4 and 8,5. The AX on 8,4 and 8,5 are `immobile`.
- Objectives: two `capture` objectives (`turnStart`, `remove`), one per side.
- `legions`: bottom `julian`. Caesar's traits are set.

## 307 Plain of Alsace — match

- All plain. Every unit and letter was checked.
- Header: 4/6 cards, bottom first, 7 banners, bottom `julian`.

## 308 Gergovia — match

- **Walls:** 0,5–0,9, `wall` + `hill`. The corner pieces are on 0,5 and 0,9.
- **Camps:**
  - Gallic camps 2,5, 2,7 and 2,9 are `camp` + `hill`.
  - The Roman camp 7,5 is a plain `camp`.
- **Hills (20):**
  - The plateau: 0,4, 1,4–1,9, 2,4, 2,6, 2,8 and 3,3–3,9.
  - The entry hexes G2–G4: 4,0, 5,0 and 6,0.
  - G1 (3,0) and G5 (7,0) are plain. Each G label sits on its JSON entry hex.
- **Forest (10):** 0,3 1,3 2,0 2,1 2,3 0,10 1,10 2,10 2,12 3,11.
- **Broken ground:** 5,3–5,7.
- **Large-camp ramparts:** 6,12, 7,11 and 8,11, with `edges ["W","NW"]`.
  - At 3× zoom, each earth wall runs from the hex's top vertex to its lower-left vertex, cutting off the NW and W sides.
  - The same encoding as 221's left-hand diagonal ramparts. Matches rulings Q6.
- **Reserves:** AX, AX, WA, WA and Vercingetorix are drawn off board, top left.
- **`ambush`:** as the plan's example — the 4 Leadership trigger kinds, `afterOwnTurns 0`, `entryHexes` 3,0–7,0,
  `noMove`, `attachLeader`.
- **`placeUnits`:** bottom MI on 8,0–8,4, `after: "ambush"`. 8,4 is on the dotted section line.
- **Objectives:** as D6 and the plan's table.
  - `capture` bottom: 2,5, 2,7 and 2,9, banners [0,1,1], `remove`.
  - `capture` top: 7,5, [1], `remove`.
  - `hold` bottom: 0,5–0,9, `max 5`.
  - `hold` top: the 3 rampart hexes, `max 3`.
- **Header:** `rules ["magoAmbush","steepSlopes"]`, 5/5 cards, bottom first, 8 banners, bottom `julian`.

## 309 Ilerda — match

- Walls: 0,10, 1,9 (LB) and 2,10 (AX), `wall`, no hill. 1,10 ("Ilerda") is plain.
- River, 9 hexes, `ford: false`: 0,11 1,11 2,11 3,11 4,11 5,10 6,10 7,10 8,10.
- Hills: the hillock 3,4–3,6, plus 3,10, 4,10 and 5,9.
- Camps: 0,3 and 0,4 (each with an MI), 8,3 and 8,4.
- Objectives:
  - `capture` for each side, `turnStart`, [0,1], `remove`.
  - `majority`, `sides ["bottom"]`, on 3,4–3,6, 1 banner, `when "always"` (D8).
- The uncaptioned leader is on HI 1,3; Petreius is on 1,4.
- Header: 5/6 cards, top first, 7 banners, both `julian`.

## 310 Utica P1 Delaying Action — match

- River, 8 hexes, `ford: false`: 0,9 1,9 2,10 2,11 3,11 4,11 5,11 6,12. It leaves the right edge on row 6.
- Hills: 2,2 3,2 5,1.
- Top side: `cards 0`, `orders "dice"`, `orderDice 2`. No `legions` (D1), `rules []`.
- Header: bottom first, 6 cards, 4 banners.

## T1 doubts — verdicts

1. **310 river count: 8 is correct.** The survey's "about 9" was an estimate.
   - The water fraction is 0.40–0.48 on exactly the 8 JSON hexes and 0.00 on their dry neighbours: 0,8, 0,10, 1,8, 1,10,
     2,12, 3,10, 4,10, 4,12, 5,10, 6,11 and 7,11.
   - 2,9 shows 0.16 only because of the LC block's sky.
   - A tile-by-tile zoom shows the same path.
2. **308 Roman MI only in `placeUnits`: keep it so.**
   - This is exactly the plan's example and the B6 design.
   - Rulings Q6 make the MI a one-off forced placement, not an ambush unit.
   - `reserves` feed the ambush entry, so listing the MI there would let the Gallic trigger (or a bottom-side reserve
     pool) touch it.
   - The survey count (MI 8) is met through `placeUnits`.
3. **Names and presentation choices: all acceptable, no change required.**
   - **304 "Herennius & Perpenna":** precedent 008 "Gnaeus & Publius Scipio". A commander string that is not a leader
     name has many precedents (004, 010, 108, 202, 223 …).
   - **306 army "Helvetian":** fits the adjective convention ("Gallic", "Germanic", "Belgic", "Briton"). The look stays
     `helvetii` as the plan says.
   - **306 commander "Divico"** (page: "Various Tribal Chiefs"): a cosmetic pick in line with the exp1/exp2
     unnamed-leader convention.
   - **308 "Critognatus":** the historical spelling, right (BG 7.77).
   - **308 "Sextus" and "Manucius":** acceptable as printed.
   - **"Utica P1 Delaying Action":** matches T2's "Utica P2 The Valley".
   - **309 "Julius Caesar" and "Caesarian":** consistent with T2's files.
   - **Saburra:** the page's spelling, and the same as T2's 312.
   - **Cosmetic leader picks** (Hirtuleius, Domitius, Nammeius, Labienus, Sabinus, Vibullius, Plancus, Marcius Rufus):
     plausible and harmless.

Optional polish (not discrepancies; the lead decides):
- 308: `"Sextus"` → `"Sextius"` (the legate T. Sextius at Gergovia, BG 7.49/7.51). This would apply T1's own
  "historical spelling for a misprinted caption" rule, as was done for Critognatus.
- 306: `"Sabinus"` is a year early (Titurius Sabinus is first attested in 57 BC). `"Considius"` (P. Considius, BG 1.21–22,
  the Helvetian campaign) would fit 58 BC; but 216 already uses the name Considius.
- 310: Marcius Rufus was Curio's quaestor commanding the fleet, not his cavalry. Keeping him is fine; T2's 311 uses
  Rebilus as Curio's other leader.
# Expansion #3 verification, V2 (311–319)

Verifier V2. Files checked: `311.json` … `319.json` and `notes-T2.md` in this folder. Result: **no discrepancies in
any of the nine battles.** I agree with all four of T2's open points (below).

## Method

- **Sources.** Fresh downloads of `CCA_maps/<id>.jpg` (all 1100×733, HTTP 200) for 311–319 and base 002/007, saved in
  `scratchpad/exp3-verify-V2-maps/`. Headers, unit tables and special rules come from `design/exp3-survey.md` §1/§4, and the
  rule choices from the `design/exp3-rulings.md` Decisions table (fixed decisions: 314 Pompeian LI 2 / LB 1, 315 three
  Caesarian leaders). I re-read the War Council text and unit-table icon counts from the cached 312–319 scenario pages
  and the 311 page title. Format and per-battle conventions come from Phase A of the Expansion #3 plan, and the Expansion #2
  conventions from `design/exp2-scenario-notes.md`.
- **Grid (fitted independently).** `fitgrid.py` searches over centre (x0, y0), hex width and row pitch to put the
  odd-r template's interior hexsides on the printed dark hex outlines (a high-pass darkness score). Results:
  - Best fit on 002 and 007: about **(68.7, 87.15), width 80.7, pitch 70.5**.
  - All nine 31x maps fit to x0 68.6–69.15, y0 86.9–87.25, width 80.6–80.7 and pitch 70.5, so they share one template.
  - The given grid, (69.5, 87.5), 80.65, 70.5, is within 1 px of this everywhere on the board, so it is **confirmed**.
  - My overlays use (68.8, 87.1), 80.68, 70.5. Drawn over 002 and 007 with their JSON, every unit, leader, river and
    hill falls in its hex.
- **Tools** (`scratchpad/exp3-verify-V2/`, run with `python3 -I`, paths passed as arguments):
  - `ov.py`: grid with r,c labels, or the JSON redrawn over the map. It shows terrain per hex, units by side, leaders,
    objective hexes (with the ship-marker flag), and rampart protected edges as thick red hexsides.
  - `sheet.py`: a contact sheet with every JSON unit's hex crop and its JSON type, side and leader, read block by block.
  - `feat.py`: olive (hill art) and water share per hex compared with the JSON. Every hill hex has olive ≥ 0.11. No
    non-hill hex is flagged except those explained by the "ANCIENTS" watermark (4,5–4,7), rampart pieces, tan
    Eastern blocks and horse art.
  - `blocks.py`: block-colour scan per hex. Every block hex has a JSON unit, every JSON unit has a block, and red
    means bottom, grey top (316's tan blocks are top). The only flags are the 313 ship markers and the 318 sea strip.
  - `water.py`: blue share for the coast hexes. `chk.py`: counts against the survey tables (with the two fixed
    decisions), duplicate hexes, off-board pieces, units on impassable terrain, leaders on enemy units, Caesar's traits
    and objective hexes on the board.
- I compared every battle hex by hex with zoomed crops: hills under blocks (rays), rampart art at 4–8× raw zoom,
  coast pieces, marsh tiles, camps and leader captions.

## 311 Utica P2 The Valley (49 BC)

**Match.**
- **Header:** Varus 5 cards, moves first (star top-left); Curio 5 cards; 5 banners; `gry` / `rom`, `pompeian` /
  `caesarian`; both sides Julian.
- **Hills (24):** 1,8 1,11 2,7 (under the AX) 2,8 2,11, 3,0–3,6, 5,10 and 6,0–6,10. Zoom-checked: 3,7–3,10, 2,10 and
  row 7/8 are plain.
- **Camp:** 0,5.
- **"Exit" labels:** exactly on 4,0 and 5,0.
- **Objectives:** `exit` top (4,0) (5,0), `units: "cavalry"`; `hold` bottom (0,5), `max: 1`.
- **Units and leaders:** all 25 units and 4 leaders agree in type, side and hex.

## 312 Bagradas River (49 BC)

**Match.**
- **Header:** Saburra 5 cards, moves first; Curio 5 cards; 5 banners; `numidian` look; both sides Julian (decision 1).
- **Terrain:** hills 2,11 3,10 3,11 only; no river.
- **Units and leaders:** all 27 units and 4 leaders agree. The page table is LB 2, AX 4, MI 1, WA 2, HI 1, LC 3, MC 4,
  LDR 2 against LS 2, AX 2, MI 4, HI 1, MC 1, LDR 2.

## 313 Brindisi Raid (48 BC)

**Match.**
- **Header:** Libo 5 cards, moves first; Antony `cards: 2` with `handGrowth { bottom, to 5 }` (page "2* (5)"); 6 banners.
- **Coast:** sea at the top of 0,0–0,3 (grey ships) and 0,8–0,11 (red ships). 0,4 0,5 0,6 0,7 0,12 are plain. All eight
  are `sea` + `ford`.
- **Ramparts (8):** see the doubt verdict below.
  - 0,6 and 1,6: the chord runs from near the upper-left vertex to near the bottom vertex, with the ragged earth and
    crenellations on the left, so `[W, SW]`.
  - 2,7: `[W, SW, SE]`.
  - 2,8–2,12: walls in the lower half of the hex. The olive band is on top and the crenellations and earth are at the
    bottom, so `faces: "bottom"`.
- **Hills:** 5,0–5,11 (12).
- **Camps:** 6,3 (Antony alone), 6,5 (MI), 6,7 (MI), 6,9 (Fufius alone).
- **Objectives:** `capture` top (0,8)–(0,11) and `capture` bottom (0,0)–(0,3), both `turnStart`, `marker: "ship"`, no
  `remove`.
- **Units and leaders:** all 25 units and 3 leaders agree. Ship blocks are not units.

## 314 Dyrrhachium (48 BC)

**Match.**
- **Header:** Pompey 5 cards, moves first; Julius Caesar 5 cards; 6 banners; both sides Julian; Caesar has
  `["ccBonus", "forcedMarch"]`.
- **Pompeian lights:** "L" at 1,6 and 2,1, "LB" at 1,4, so LI 2 / LB 1, as fixed.
- **Ramparts (10):** 4,1 4,3 and 4,5–4,12. 4,0 4,2 4,4 are empty. Each wall sits in the upper half of the hex with the
  earth and crenellations on top and the olive band at the bottom, so `faces: "top"`.
- **Hills (9):** 7,8 (under the LI) 7,9 7,10 7,11 8,8 8,9 8,10 8,11 8,12. 8,7 and 7,7 are plain.
- **Objective:** `exit` top over (8,0)–(8,4) (decision 12), any unit.
- **Units and leaders:** all 28 units and 5 leaders agree.

## 315 Pharsalus (48 BC)

**Match.**
- **Header:** Pompey 4 cards, moves first; Caesar 6 cards; 7 banners.
- **Terrain:**
  - `steep` (7): 0,6 0,9 0,10 0,11 0,12 1,10 1,11. No unit stands on them.
  - Marsh 4,0: the same marsh tile art as in 318.
- **Caesarian leaders:** 3 (Antony 6,2, Calvinus 6,5, Caesar 7,8), as fixed. The WA stands alone at 8,9.
- **Units and leaders:** all 33 units and 6 leaders agree.

## 316 Zela (47 BC)

**Match.**
- **Header:** Pharnaces 4 cards, moves first; `eas` / `pontic`; Caesar 6 cards; 7 banners; `legions: { bottom: "julian" }`.
- **Camps:** 0,5 0,6 0,8 (empty; 0,7 is plain) and 8,5 (AX).
- **Objectives:** `capture` bottom (0,5) (0,6) (0,8) and `capture` top (8,5), both `turnStart` with `remove: true`.
  The engine's default `banners [1]` repeats, so each camp hex scores 1.
- **Units and leaders:** all 33 units and 6 leaders agree.

## 317 Ruspina (46 BC)

**Match.**
- **Header:** commander "Titus Labienus" (page), 5 cards, moves first; Caesar 6 cards; 5 banners; Julian for the Romans
  only.
- **Terrain:** all plain.
- **Objective:** `exit` bottom over all 13 row-0 hexes, `leadersScore: true`.
- **Units and leaders:** all 23 units and 4 leaders agree.

## 318 Thapsus (46 BC)

**Match.**
- **Header:** Scipio 5 cards, moves first; Caesar 6 cards; 7 banners; both sides Julian.
- **Marsh (9):** 1,1 2,0 2,1 3,1 4,1 4,2 5,1 6,0 6,1, all empty.
- **Sea (7):** 2,12 3,11 4,12 5,11 6,12 7,11 8,12. Water share is 0.50–0.66 on the column-12 hexes and 0.28 on
  3,11, 5,11 and 7,11. 0,12, 1,11 and every column-11 hex in even rows are dry.
- **Elephants:** grey EL at 2,2 and 3,9.
- **Units and leaders:** all 35 units and 6 leaders agree.

## 319 Munda (45 BC)

**Match.**
- **Header:** Caesar 6 cards, moves first (star bottom-left, page "Move First" under the Caesarians); Gnaeus Pompey 4
  cards; 8 banners; both sides Julian.
- **Hills (19):** 1,1–1,10 and 2,1 2,2 2,4–2,10. Plain: 1,0, 1,11 (MC), 2,0, 2,3, 2,11 (LB) and 2,12.
- **Units and leaders:** all 35 units and 5 leaders agree.

## Verdicts on T2's open points

1. **313 corner rampart 2,7 `[W, SW, SE]`: agree.**
   - At 8× raw zoom, the diagonal wall from 1,6 enters 2,7 at its upper-left vertex and runs down the left side of the
     AX block. Its ragged earth faces left.
   - A second visible piece leaves the block on the right and crosses the lower part of the E side, with earth below,
     joining 2,8's bottom-facing wall.
   - The strip of hex below the block (above the SW and SE sides) is bare sand, so the wall turns under the block. The
     outside is therefore W, SW and SE; NW and E are on the town side.
   - This matches the rulings' suggestion and the "bent corner piece lists three" convention.
2. **318 thin coast hexes 3,11 5,11 7,11 as sea: agree.**
   - My water share is 0.28 each: real water and surf, not block sky.
   - The Expansion #1 notes record exactly this pattern (sea 2,12 3,11 4,12 5,11 6,12 7,11 8,12, with partial pieces
     counted as water), and Expansion #2 counted coast pieces of 0.25–0.6 as water.
   - The 7 hexes match the survey's "about 7".
3. **Name changes: agree. All are cosmetic and none is a discrepancy.**
   - 314 "Titus Pulio" for the caption "Titus Pulieo": Caesar's own spelling in BC 3.67, the same kind of normalisation
     as 204 Servilius.
   - 316 "Dromichaetes" for "Drmchtes": the survey's reading of the abbreviated caption.
   - 319 "Gnaeus Pompeius" for "Pompeius": harmless, and it keeps the son apart from "Pompey" (314/315) if a named leader
     look is ever keyed on "Pompey".
   - If the lead prefers the plain caption rule, "Pompeius" is the alternative. The father was also a Gnaeus Pompeius, so
     the expansion separates them by convention only.
4. **311 name "Utica P2 The Valley" without a colon: agree.**
   - It is the page title.
   - It matches T1's 310 "Utica P1 Delaying Action" and the Expansion #2 "Teutoburger Wald P1/P2" form.

## Other observations (no change needed)

- **Cosmetic names:** Quintilius and Rebilus (311), Juba and Domitius (312), Calvinus and Vinicianus (316) and Saserna
  (317) are plausible period picks and are unique within each battle.
- **312 "Domitius"** (Curio's cavalry prefect) and **318's captioned "Domitius"** (presumably Domitius Calvinus, who is
  "Calvinus" in 315/316) are different label choices in separate battles. This is harmless.
- **Format:**
  - Key order matches the Expansion #2 files (215/217).
  - `rules: []` everywhere.
  - No `notes` field.
  - `reserves` and `reserveLeaders` are empty.
  - Caesar appears exactly in 314–319, with both traits.
