# Expansion #3 scenario notes (301–319)

How the 19 Roman Civil Wars battles in `src/scenarios/data/301.json`–`319.json` were made, and the decisions behind them.
Rules sources and rulings are in `design/exp3-survey.md` and `design/exp3-rulings.md` (the "Decisions table", cited as
D*n*); the rules as implemented are `design/rules-reference.md` §18.7–§18.11 and §20. The transcribers' and verifiers'
working notes stay beside the original files in `design/exp3-data/` (`transcription-notes.md`, `verification.md`). The
briefing texts are in `src/scenarios/exp3-texts.ts`; `tests/scenarios/manifest.ts` (`MANIFEST_EXP3`),
`tests/scenarios/exp3.test.ts` and the Expansion #3 part of `tests/scenarios/loader.test.ts` check the setups. The four
Epic battles (EPIC01–04) are not implemented.

## Method

- **Transcription.** Two transcribers (T1: 301–310, T2: 311–319) read each battle hex by hex from the official map image
  (`CCA_maps/<id>.jpg`), with the scenario page for the War Council header and the unit table. The odd-r grid of Expansion #2
  (r0 c0 at 69.5, 87.5; hex width 80.65; row pitch 70.5) fits these maps too and was rechecked on base maps 002 and 007.
  Each battle was redrawn from its JSON over the map and compared hex by hex; a block-colour scan confirmed every unit's
  side, and a missing-block scan that no block was left out.
- **Verification.** Two independent verifiers (V1: 301–310, V2: 311–319) fitted their own grid on fresh downloads, redrew
  every piece, terrain hex, rampart edge and objective hex, and rechecked the headers. **No discrepancy** in any of the 19
  battles; every judgement call the transcribers flagged was confirmed.
- **Import (Phase C).** The 19 verified files were moved unchanged from `design/exp3-data/` to `src/scenarios/data/`
  (`git mv`, no edit). They already carried `"expansion": "exp3"`; the loader learnt the box, and its texts come from
  `EXTRA_EXP3`. The manifest was generated from the imported files (terrain tallies and checksums included), then checked by
  hand against §20 and the survey's unit tables (they agree except for the fixed decisions below).
- **Lead edits after verification** (before the import): 308's leader "Sextus" became **Sextius** (T. Sextius, Caesar's
  legate at Gergovia); 306's uncaptioned leader "Sabinus" became **Considius** (P. Considius served in the Helvetian
  campaign; Sabinus is first attested in 57 BC). Both are names only.

## Conventions

- **Headers.** `expansion: "exp3"`, `rules: []` written even when empty, other optional fields left out when unused,
  impassable rivers `ford: false`. Top armies: grey Roman blocks (`gry`) in the civil-war battles, Barbarian green (`bar`)
  in 306–308, Eastern tan (`eas`) for the Pontic army of 316. Bottom: always red Roman blocks (`rom`), with the looks
  `sullan` (301, 302), `pompeian` (303–305) and `caesarian` (306–319).
- **Army names** follow the War Council: "Roman" for the bottom army of 301–308 and "Caesarian" from 309 on; the top army by
  party or people (Samnite, Sertorian, Helvetian, Germanic, Gallic, Pompeian, Numidian, Pontic). No Expansion #3 battle uses
  a rule keyed on the army name "Roman" (Fright at First Sight, Tactical Flexibility, the Beneventum hand), so the name is
  presentation only. The legion rule is stated per side in `legions` (D1), never derived from a name or a block colour.
- **Legions.** Marius (`marius`) for both armies in 301–305, so the Samnite MI and the Sertorian MI and HI throw the pilum
  too; Julian (`julian`) for the bottom army only in 306–308, 316 and 317, and for both armies in 309, 311–315, 318 and 319
  (the Numidian MI and HI of 312 and Juba's HI in 318 included); none in 310 (D1, §18.2).
- **Caesar** is `commander: "Julius Caesar"` and the leader `"Julius Caesar"` with traits `["ccBonus", "forcedMarch"]`
  wherever he is on the map: 306–309 and 314–319 (D2, §18.3). No other leader has a trait.
- **Camps and objectives.** Start-of-turn captures are `capture` with `when: "turnStart"` and `remove: true` (D7); a camp
  or wall with `hill: true` leaves a hill when removed (308). Held banners are `hold` (308, 311). Objective texts are
  original short log lines.
- **New terrain** (§18.7): scalable city walls are `wall` (308, 309); the impassable Wall of Rome and the towns of Lauron
  and Valentia are `steep` with `art: "wall"` or `art: "town"` (D4: impassable and blocking line of sight; the art hint is
  for drawing only); `hill: true` marks a hill under a camp or wall (308 only).
- **Names.** Commanders are the names the page gives; leaders are the map captions, with the historical spelling where a
  caption is a misprint (308 Critognatus, 314 Titus Pulio, 316 Dromichaetes; 319 "Pompeius" written Gnaeus Pompeius to tell
  him from his father). Leaders the map leaves unnamed got plausible period names; these are cosmetic picks, not attestations:
  302 Hirtuleius, Domitius; 306 Divico (also the commander: the page says only "Various Tribal Chiefs"), Nammeius, Labienus,
  Considius; 309 Vibullius, Plancus; 310 Marcius Rufus (also the commander); 311 Quintilius, Rebilus; 312 Juba, Domitius;
  316 Calvinus, Vinicianus; 317 Saserna.
- **Terrain counts.** The survey gives "about N"; the files follow the maps, which differ in places (308 has 20 plain hills
  besides the walls and camps, 310's river 8 hexes, 314 nine hills, 319 nineteen).

## Decisions from the spec that override the research (§20)

- **310:** the Numidian side makes **every** choice for its own dice orders, the victims of its flag and swords faces
  included (D9 suggested the Caesarian side picks them; overruled).
- **314:** the Pompeians field **LI 2 and LB 1**, as the map draws them (the page table: LI 1, LB 2; D12).
- **315:** the Caesarians have **3 leaders** (Caesar, Antony, Calvinus), as drawn (the table: 4; no source places a fourth;
  D13).
- **Camp −1 against terrain caps:** the engine's order is kept everywhere (the cap first, then the camp's −1; D19 proposed
  the reverse). It matters only for 308's camps on hills.

## 301 Colline Gate (82 BC)

- Wall of Rome: ten `steep` hexes with wall art on row 7 (the survey's 1-based "row 8"): 7,0–7,3 and 7,6–7,11. The angled
  corner pieces on 7,3 and 7,6 flank the two-hex gate 7,4 (Roman MI) / 7,5 (Roman AX). Sulla's MC stands behind it at 8,5.
- Objective: `capture` for the Romans only over the Samnite camps 0,4 and 0,8, `turnStart`, `remove`, 1 banner each (D7).
- Leaders: Pontius (MC 1,3); Sulla (MC 8,5) and Crassus (MC 5,8).

## 302 Baetis River (80 BC)

- The Baetis: eleven fordable `river` hexes (0,6 1,5 2,5 2,4 2,3 3,2 4,2 5,2 6,2 7,1 7,0), read tile by tile; two Sertorian
  LI stand in it (2,4, 2,5). Forest 1,4 4,3 6,1 7,2. The two red Roman WA (5,8, 6,8) are ordinary `WA`.
- No rule beyond the Marian legions (the Sertorian HI have the pilum).

## 303 Lauron (76 BC)

- Lauron: 2,3 2,4 3,2 3,3, `steep` with town art. Ten hills: 3,6 (under a Sertorian LS) and nine in the bottom-right corner.
- Herennius' force (WA 7,10, WA 7,11, LI 8,9, AX 8,10 with Herennius, AX 8,11, all on hills) is ordinary on-board units: no
  data beyond their positions; they retreat toward the Sertorian edge like every top unit (Q17).

## 304 Valentia (75 BC)

- Valentia: 3,7 3,8 4,7 4,8, `steep` with town art. The Romans move first (star bottom left).
- Commands (§18.5, D16): `herennius` (grey, the side's own blocks) and `perpenna` (`blocks: "grk"`, the map's light-blue
  blocks), in that order. Perpenna's: LC 0,9, MI 0,10, 0,11, 1,9, 1,10 and Perpenna (1,10); Herennius': the other ten units
  (MC, LS 2, LB, AX 3, MI 3) and Herennius (2,5). Every Sertorian unit and **both** leaders carry `command`; the Romans none.
- Commander "Herennius & Perpenna" (the page names both, as 008's "Gnaeus & Publius Scipio").

## 305 Sucro (75 BC)

- Eleven empty hills: seven top left (0,2 0,3 1,0 1,1 2,0 2,1 2,2), four top right (0,11 0,12 1,11 2,12). The Romans move
  first. No other rule.

## 306 Bibracte (58 BC)

- Army "Helvetian" (the adjective, as Gallic or Germanic; look `helvetii`).
- Camps: Helvetian 0,4 (with a WA) and 0,6; Roman 8,4 and 8,5, each with a Roman AX marked `immobile: true` (the raw
  recruits, §18.11, D15). Objectives: `capture` for both sides over the enemy camps, `turnStart`, `remove`, 1 banner each.
- Twenty-one hills (rows 6–8; 6,5, 8,3, 8,7, 8,8 and 8,10 are plain) and five forest hexes (2,0 3,0 2,10 3,10 4,11).
- The "Legio X" labels on the two HI are cosmetic (D20): no elite.

## 307 Plain of Alsace (58 BC)

- All plain (`terrain: []`). The Romans move first. Leaders: Ariovistus (WA 1,3); Caesar (HI 6,10), Crassus (MC 8,1).

## 308 Gergovia (52 BC)

- `rules: ["magoAmbush", "steepSlopes"]`. The Romans move first.
- City walls: 0,5–0,9, `wall` with `hill: true` (the page says the walls count as hills); Gallic LB on 0,6 and 0,8. Gallic
  camps 2,5, 2,7, 2,9 are `camp` with `hill: true`, each with a WA. The small Roman camp 7,5 is a plain `camp`.
- Twenty further hills (0,4; 1,4–1,9; 2,4 2,6 2,8; 3,3–3,9; and the entry hexes 4,0 5,0 6,0), ten forest hexes flanking the
  hill mass, broken ground 5,3–5,7. The engine derives the 12 steep hill–forest hexsides from this terrain (D5).
- The large Roman camp: ramparts 6,12 (HWM), 7,11 (LI), 8,11 (HWM) with `edges: ["W", "NW"]` (read from the art, D6).
- Gallic reinforcements (§18.9): AX, AX, WA, WA in `reserves` and Vercingetorix in `reserveLeaders`. `ambush`: the four
  Leadership triggers, `afterOwnTurns: 0`, `entryHexes` 3,0–7,0 (the map's G1–G5, all empty at the start), `noMove`,
  `attachLeader`, and an own log text without `{section}`.
- The Roman MI is **only** in `placeUnits` (bottom MI on 8,0–8,4, `after: "ambush"`), not in `reserves`, so the ambush
  never releases it. It counts with the Romans' MI 8 of the page table.
- Objectives (D6): Romans `capture` the Gallic camps, banners 0, 1, 1, `remove` (each leaves a hill); Gauls `capture` 7,5,
  1 banner, `remove`; Romans `hold` the five walls (`max 5`); Gauls `hold` the three ramparts (`max 3`).
- Leaders: Critognatus (WA 0,1), Vercassivellaunus (MC 0,11), Vercingetorix off board; Sextius (MI 7,3), Caesar (HI 8,6),
  Manucius (MC 8,9; the caption kept).

## 309 Ilerda (49 BC)

- Walls of Ilerda: 0,10, 1,9 (Pompeian LB), 2,10 (Pompeian AX), `wall` without a hill; 1,10, the town label, is plain.
- The river down the right edge, nine impassable hexes (0,11 1,11 2,11 3,11 4,11 5,10 6,10 7,10 8,10); the hexes beyond it
  are plain and empty. Hills: the hillock 3,4 3,5 3,6, and 3,10 4,10 5,9 by the river.
- Objectives (D7, D8): each side `capture`s the two enemy camps (Pompeian 0,3, 0,4, each with an MI; Caesarian 8,3, 8,4),
  `turnStart`, `remove`, banners 0, 1 (1 banner once both are gone); `majority` for the Caesarians alone over the hillock,
  1 banner, `always`.

## 310 Utica P1 Delaying Action (49 BC)

- The Numidian side: `cards: 0`, `orders: "dice"`, `orderDice: 2` (§18.10). The Numidian player makes every choice for its
  side (spec, above). No `legions`. The Caesarians hold 6 cards and move first; 4 banners.
- The river: eight impassable hexes (0,9 1,9 2,10 2,11 3,11 4,11 5,11 6,12), leaving the right edge on row 6 (the survey's
  "about 9" was an estimate). Hills 2,2 3,2 5,1.
- Saburra (the page's spelling) rides the HI 0,3; he is the leader a helmet orders.

## 311 Utica P2 The Valley (49 BC)

- 24 hills: the Pompeian ridge 3,0–3,6, the Caesarian ridge 6,0–6,10, and 1,8 1,11 2,7 2,8 2,11 5,10. Pompeian camp 0,5.
- Objectives (D10): `exit` for the Pompeians, `units: "cavalry"`, over 4,0 and 5,0 (off the left edge; the map's two "Exit"
  labels); `hold` for the Caesarians over the camp 0,5, `max 1`.

## 312 Bagradas River (49 BC)

- Three hills at the top right (2,11 3,10 3,11); no river on the map despite the name. Julian legions for both armies.

## 313 Brindisi Raid (48 BC)

- `cards: 2` for the Caesarians with `handGrowth: { side: "bottom", to: 5 }` (§18.8). The Pompeians move first.
- The coast: eight `{ "t": "sea", "ford": true }` hexes, 0,0–0,3 and 0,8–0,11 (built as fordable river, drawn as sea).
- Objectives (D11): ship markers, `capture` with `marker: "ship"`, `turnStart`, no `remove`: the Pompeians over 0,8–0,11
  (Caesarian transports), the Caesarians over 0,0–0,3 (Pompeian beaches).
- Brindisi ramparts: 0,6 and 1,6 `edges ["W", "SW"]`; the corner 2,7 `["W", "SW", "SE"]` (mostly under the AX; both
  transcriber and verifier agree); 2,8–2,12 `faces: "bottom"`. The garrison LI 0,6, AX 2,7, LI 2,9, LI 2,11 retreats toward
  the bottom edge as Caesarian units do.
- Hills 5,0–5,11. Four ordinary camps 6,3, 6,5, 6,7, 6,9 with no objective; Antony and Fufius start alone in 6,3 and 6,9
  (legal lone leaders).

## 314 Dyrrhachium (48 BC)

- Caesar's line: ten ramparts on row 4 (4,1 4,3 4,5–4,12), `faces: "top"`; the gaps 4,0 4,2 4,4. Nine hills 7,8–7,11 and
  8,8–8,12.
- Objective (D12, Designer erratum): `exit` for the Pompeians over the Caesarian left-section baseline 8,0–8,4, any unit;
  the side edges do not count. Pompeian LI 2 / LB 1 (spec, above).

## 315 Pharsalus (48 BC)

- Seven impassable hills (`steep`, no art): 0,6 and the top-right corner 0,9 0,10 0,11 0,12 1,10 1,11. One standard marsh,
  4,0 (D21).
- Three Caesarian leaders (spec, above); the red WA stands alone at 8,9 behind Caesar (HI 7,8).

## 316 Zela (47 BC)

- The Pontic army on tan blocks (`eas`, look `pontic`); its MI 4 and HI 2 have no legion rule (the Romans only).
- Objectives: `capture` for both sides, `turnStart`, `remove`, 1 banner per camp: the Caesarians over the Pontic camps
  0,5 0,6 0,8 (0,7 is plain), the Pontic army over the Caesarian camp 8,5 (with an AX). Two Pontic HCH.

## 317 Ruspina (46 BC)

- All plain; the Caesarians start in the centre (rows 4–6, columns 3–8), ringed by the Numidians.
- Objective (D14): `exit` for the Caesarians over the whole of row 0, `leadersScore: true`: each unit and each leader that
  leaves scores 1 (a unit with its attached leader 2, a lone leader may leave on his own).
- Commander "Titus Labienus" (the page); the leader is Labienus (MC 1,7).

## 318 Thapsus (46 BC)

- Nine marsh hexes in a band down the left (1,1 2,0 2,1 3,1 4,1 4,2 5,1 6,0 6,1), all empty. Seven sea hexes down the right
  edge (2,12 3,11 4,12 5,11 6,12 7,11 8,12), impassable and not blocking line of sight (D21); the odd-row ones are partial
  coast pieces counted as water, as in Expansions #1 and #2.
- Two Pompeian elephants (2,2, 3,9). Juba rides the HI 2,4, which has the Julian legion rule.

## 319 Munda (45 BC)

- A two-row ridge of 19 hills across the Pompeian position: 1,1–1,10 and 2,1 2,2 2,4–2,10 (2,3 is a gap). The Caesarians
  move first (star bottom left).
