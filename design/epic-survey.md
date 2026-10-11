# C&C: Ancients Epic battles with role-based (4v4) play: scoping survey

Compiled 2026-10-11 from commandsandcolors.net and a read of the code at v1.5.0 "Pharsalus" (291c18c). The user asked how
big the project would be and whether a 4v4-style game with the player in one or more roles makes sense. **Status:
deferred, not being built.** Everything outside the rule pages is marked where it is used, and all rule text is paraphrased.
File:line references are to 291c18c and will drift.

The four Expansion #3 Epic battles (EPIC01–04) are already surveyed in `design/exp3-survey.md` §1b and §3.5 (map-read
unit counts, leaders, hand sizes, banners). This file adds the Epic II rules, the other 12 battles, the code coupling
and a staged plan.

## 1. Verdict

- **About three expansions' worth of work.** For scale: Expansions #1–#3 each took about 10–17 hours of agent work and
  added about 23–30k lines, including data and tests.
- **The battles are the cheap part.** Every Epic battle has a standard counterpart already in the game, so every army,
  army look and history exists (§3).
- **The cost is in the core.** Epic changes three things no expansion has touched: the board size, the one-card turn and
  the AI's whole-turn planner.
- **The role-based 4v4 layer adds roughly 20–25%**, provided decisions are given owners from the start.
- **Biggest risks:**
  - AI speed and quality.
  - Screen space for a 3:1 board.
  - Downtime when the human holds only one role.

## 2. Epic rules (summary)

### 2.1 Common to both versions
- **Board.** 26 hexes wide and 9 deep: two mounted boards joined, divided into left, centre and right sections. The exact
  dotted-line columns must be read off the Epic map images (not yet done).
- **Roles.** Each side has an **Overall Commander (OC)** and three **Field Generals (FGs)**, one per section.
  - The OC holds the hand. FGs carry out orders in their own section.
  - 8 players is the recommended count. With 6, the centre FG is also the OC. With 4, one player per side plays both
    flanks, and the other is centre FG and OC. Two-player Epic is common.
  - Most Epic II battles give each side three leaders, one per section.
- **Talking.** The OC may talk strategy privately with one FG. The other FGs get their cards "by courier", without
  discussion. FGs need not follow the OC's advice, and FGs may talk freely among themselves.
- **Turn sequence.**
  1. **Card play.** The OC plays **either up to 3 Field cards** (normally one per FG, each FG ordering units only in
     his section) **or 1 Army card**. The OC must play at least one card, and a unit takes only one order per turn.
  2. **Field General's Initiative.** If at least one Field card was played, an FG who received none may roll one die:
     - green, blue or red: order one light, medium or heavy unit;
     - helmet: order any unit or a leader;
     - flag: one unit retreats its full move and may not battle; each hex it cannot retreat costs a block;
     - swords: one unit loses a block and may not battle;
     - a symbol with no matching unit has no effect.
  3. **Move.** All movement finishes before any battle. A unit may cross into another section, but it cannot be ordered
     again.
  4. **Battle.** Each FG resolves his ordered units one at a time. Coordinate when two sections attack the same enemy.
  5. **Draw.** The OC draws 2 cards, or only 1 if 2 would take the hand above its starting size.
- **Army card.** It orders N units allocated by the OC across any sections, where **N = cards in the OC's hand,
  including the card played**. No Field cards and no Initiative are allowed that turn.
- **Cards that count as several Field cards:**
  - **Coordinated Attack** counts as 3: one unit per section, and no Initiative that turn.
  - **Out Flanked** counts as 2: left and right; the centre may still get a card.
  - **Leadership, Double Time and Line Command** count as 1 for one section, 2 for two adjacent sections (a third card
    is still allowed) and 3 for all three sections.
  - Only one Line Command may order any one section.
  - **Inspired FG play:** two identical section cards may go to one FG, who orders up to double. This counts as 2, so
    it is impossible once two Field cards have been issued.
- **Victory.** First to the scenario's banner count (12–14 in the Epic battles).

### 2.2 Epic I (Expansion #3 box; EPIC01–04)
- Uses the normal 60-card deck, with section cards (Order 2/3/4, Clash of Shields, Darken the Sky) applying to one
  section only.
- First Strike gives +2 dice. Counter Attack counters a Field card given to an FG, or an Army card.
- Army cards: Order Light/Medium/Heavy/Mounted Troops, I Am Spartacus, Move-Fire-Move, Mounted Charge, Rally.

### 2.3 Epic II (Expansion #5 box; EPIC05–16)
- **Deck.** A separate **100-card Epic deck** with instructions printed on each card. Army and Field cards share one
  draw pile.

| Card | Count | Type | Effect (paraphrased) |
|---|---|---|---|
| Order One Unit L / C / R | 2 / 2 / 2 | Field | 1 unit or leader in that section. When drawing: draw 3, keep 2, discard 1. |
| Order Two Units L / C / R | 5 / 7 / 5 | Field | 2 units or leaders in that section. |
| Order Three Units L / C / R | 4 / 6 / 4 | Field | 3 in that section. |
| Order Four Units L / C / R | 2 / 3 / 2 | Field | 4 in that section. |
| Clash of Shields +2 | 2 | Field | One section's units adjacent to the enemy; +2 close-combat dice; no move first; momentum allowed; no ranged fire. |
| Darken the Sky | 2 | Field | Missile units in one section fire twice without moving; with none, 1 unit. |
| Move-Fire-Move | 3 | Field | Up to 4 light units in one section move, fire, move; no close combat. |
| Mounted Charge | 4 | Field | Up to 4 mounted in one section; +1 close-combat die; heavy may move 3; no ranged fire. |
| Part Ranks and Pass Through | 1 | Field | Up to 3 units in one section move 2 and still battle, through friends; a passed-through unit may not be ordered. |
| Retire and Reform | 1 | Field | Up to 3 units in one section retreat 2 toward their baseline, regain 1 block if under strength, no battle; not EL/HCH. |
| Out Flanked | 2 | Field (2) | 2 units in the left and 2 in the right section. |
| Coordinated Attack | 2 | Field (3) | 1 unit or leader in each section. |
| Coordinated Advance | 2 | Field (3) | 2 units or leaders in each section. |
| Leadership Any Section | 5 | Field | Leader chain at +3, or 1 unit of choice. |
| Inspired Leadership L / C / R | 1 / 1 / 1 | Field | Leader chain at +4 in that section, or 1 unit of choice. |
| Double Time | 4 | Field | Up to 4 foot units in a linked group move 2 and still close combat (WA 3 and must fight); no ranged fire. |
| Line Command | 6 | Field | Linked group of foot units move 1 then fire or fight; momentum and bonus combat allowed. |
| I Am Spartacus +1 | 2 | Army | Roll Command dice to order matching units (helmet = any); +1 die; reshuffle the deck and discards. |
| Rally | 1 | Army | Roll Command dice to rally (1 block per symbol, any section); rallied units are ordered; not EL/HCH. |
| Order Light / Medium / Heavy / Mounted Troops | 4 / 3 / 2 / 2 | Army or Field | Army: up to Command units of that type. Field: up to 3 in one section. |
| Counter Attack | 3 | Army or Field | Repeat a Field order the enemy played in your section, or counter an enemy Army card. |
| First Strike +1 | 2 | Reaction | Played by the OC after an enemy declares close combat, before any dice: the defender fights first with +1 die, and the battle goes on if the attacker survives. Draw a replacement at turn end. |

- **Hand size moves.** Playing 3 Field cards lowers next turn's level by 1. Playing 1 card or an Army card raises it by
  1, up to the original number.
- **Open question:** whether EPIC01–04 are meant to be played with the Epic II deck. Expansion #5 says only that the
  rules "have undergone a slight modification". The full Epic II rule book (GMT living rules) was not read.

## 3. The 16 official Epic battles

None of the scenario pages has a unit table, so counts must be read off the 1920×652 maps
(`/ancients/images/stories/CCA_maps/EPICnn.jpg`). Every one has a standard version in the game, so the armies, looks
and history slides exist.

| Code | Battle | Box | Standard version in the game |
|---|---|---|---|
| EPIC01 | Cannae (216 BC) | Exp #3 | 007 |
| EPIC02 | Ilipa (206 BC) | Exp #3 | 013 |
| EPIC03 | Raphia (217 BC) | Exp #3 | 119 |
| EPIC04 | Zama (202 BC) | Exp #3 | 015 |
| EPIC05 | Arausio (105 BC) | Exp #5 | 204 |
| EPIC06 | Dertosa (215 BC) | Exp #5 | 008 |
| EPIC07 | Lake Trasimenus (217 BC) | Exp #5 | 006 |
| EPIC08 | Clusium (225 BC) | Exp #5 | 201 |
| EPIC09 | Bagradas (253 BC) | Exp #5 | 003 |
| EPIC10 | Beneventum (275 BC) | Exp #5 | 118 |
| EPIC11 | Paraitacene (317 BC) | Exp #5 | 113 |
| EPIC12 | Hydaspes (326 BC) | Exp #5 | 111 |
| EPIC13 | Gaugamela (331 BC) | Exp #5 | 109 |
| EPIC14 | Crimissos River (341 BC) | Exp #5 | 002 |
| EPIC15 | Plataea (479 BC) | Exp #5 | 103 |
| EPIC16 | Marathon (490 BC) | Exp #5 | 101 |

- Example: EPIC13 Gaugamela has Macedonians with 9 cards (move first) against Persians with 6, and 12 banners.
  - Alexander attached gives +1 close-combat die.
  - The Companions ignore 1 sword and may ignore 1 flag (existing elite mechanics).
- More Epic battles exist outside these boxes (C3i magazine: Epic Asculum; others such as Thapsus, Munda and
  Dyrrhachium circulate as Epic scenarios). Not surveyed.

## 4. What carries over

- **Engine rules, reusable as they are:**
  - `combat.ts` and `movement.ts`, apart from where they read card modifiers;
  - `retreat.ts`, apart from `atBaseline`;
  - `terrain.ts`, `units.ts`, `elites.ts`, `banners.ts`, `held.ts`, `objectives.ts`, `rng.ts`, `driver.ts` and
    `query.ts`.
- **Art:**
  - all unit, leader and terrain art; it is procedural SVG and size-free;
  - the terrain painters work at any width once `boardCtx` takes dimensions;
  - the History `BattleMap` uses its own 1000×600 field, with no hex dependence.
- **Scenario JSON:** a 26-wide map is just more `[r, c]` entries. It needs a board flag read before the `onBoard`
  checks, an Epic deck flag and an `'epic'` expansion.
- **Field General's Initiative ≈ 310 Utica's dice orders:**
  - engine: `diceOrdersStep` (`flow.ts:1363-1398`), the `diceVictim`/`diceOrders` decisions and
    `orderDice`/`validateDiceOrders` (`orders.ts:487-541`);
  - AI: `diceVictimIndex` and `diceAssignments` (`policies.ts:634, 689`), and `planDiceTurn` (`planner.ts:698-748`);
  - needs one die per section without a card, filtered to that section, and a new `RollPurpose`.
- **Restricting a card to one FG's section ≈ 210/304 separate commands:** `CommandDef` (`types.ts:311-316`), and
  `chooseCommand`, `inCommand` and `commandModes` (`orders.ts:87-198`).
- **Movement before battle** is mostly true already: one `movePhase` covers all ordered pieces, then one `battlePhase`.

## 5. Coupling that must change

### 5.1 Board geometry (riskiest)
- **Board size is a compile-time constant.** `ROWS = 9`, `COLS = 13` (`types.ts:59-60`) and `hexId = r*13+c`
  (`hex.ts:4-47`). `ALL_HEXES`, `NEIGHBOURS` and `lineCache` (keyed `a*1000+b`) are precomputed at module level.
- **Changing COLS would renumber every base hex.** Answers in saves, `tests/golden/save-fixture.json` and the golden
  digests store raw hex ids.
- **Hard-coded 13/8/section spots:**
  - section thresholds `hex.ts:164-166` (half-column 8 and 16);
  - `movement.ts:286-289` (`ambushEntryHexes`) and `retreat.ts:191-194` (`atBaseline`);
  - `setup.ts:526, 557-570`;
  - AI: `ai/board.ts:13-27` (`NHEX`, the `DIST` table of 117², `REAR`) and `evaluate.ts:614-630`;
  - `scenarios/index.ts:92-95`;
  - UI: `ui/geometry.ts:14-23`, `terrain/hexmath.ts:46,136-166`, `terrain/sea.tsx:52-58` and `terrain/index.ts:26-29`;
  - section dividers fixed at columns 4 and 8 (`BoardArt.tsx:118-121`, `objectives.tsx:249-256`);
  - `GameScreen.tsx:1007-1008` (`h / 13`, `8 - r`).
- **Proposal (not tried):** give Epic hexes their own id range starting above the base range (e.g. `117 + r*26 + c`).
  - Every hex helper picks its precomputed tables from the id itself.
  - Base ids, base tables and golden replays stay byte-identical.
  - No global "current board" switch is needed.
  - Only the boundaries need the board kind: scenario parsing, `hexId(r, c)` and UI pixel↔hex.
  - The alternative is threading a geometry object through about 180 call sites (≈49 `neighbours`, 35 `hexDist`,
    22 `inSection`, 13 `rowOf`).

### 5.2 One card per turn
- **The turn holds a single card.** `TurnState.card/effective/mirrored/mods` (`types.ts:171-183`) and
  `lastCard: Record<Side, …>` (`types.ts:414`). The `orders` decision carries one card.
- **The flow plays and discards one card.**
  - `cardStep` asks one `playCard` (`flow.ts:1328-1352`), and `ordersStep` makes one selection (`flow.ts:1003-1036`).
  - `endOfTurn` discards one card and draws 1 (`flow.ts:1274-1297`).
- **Card modifiers are read globally**, so they must move onto each ordered piece:
  - engine: `movement.ts:80`, `combat.ts:80,93` and `flow.ts` around 861, 890, 1045, 1319, 1427;
  - AI: `estimate.ts:128,418,448`, `policies.ts:343-345,427`, `evaluate.ts:88`, `ordering.ts:52`, `planner.ts:156`
    and `sim.ts:148-171`.
- **New decisions:**
  - choose Field cards with their target sections, or one Army card;
  - orders per FG;
  - Initiative per section;
  - Army-card allocation.
- **A unit may be ordered only once across cards.** `validateSelection` (`orders.ts:355-413`) checks only within one
  selection, and dotted-line hexes belong to two sections.
- **Army mode is easy:** a `troop`-like `OrderMode` with `max = hand size` (`orders.ts:30-61`; `max` comes from
  `players[side].command` at `orders.ts:34`).
- **The capped draw is trivial:** `min(2, command - hand)` at `flow.ts:1286-1294`. The First Strike replacement draw
  (`flow.ts:1285`) needs checking against the Epic rules.

### 5.3 Epic deck
- **Card ids are indexes into the global list.** `CARD_LIST` (`cards.ts:121-129`), with `CardKind` a closed union and
  `CARD_DEFS: Record<CardKind, CardDef>`.
- **Adding kinds to that list would renumber the base deck** and break the golden replays. The Epic deck needs its own
  list, with a deck id or offset card ids, plus the deck shuffle in `setup.ts:629-630`.
- **Existing hooks that fit:**
  - Order One–Four per section → `section` mode;
  - Part Ranks → the `passThrough` mod;
  - Inspired Leadership per section → `leadership` mode;
  - Counter Attack → `mirrorKind`.
- **New behaviour:**
  - Retire and Reform;
  - Coordinated Advance;
  - multi-section counting;
  - draw 3, keep 2;
  - hand-size ±1;
  - First Strike +1 (fights first, then the battle goes on).
- **New card kinds also touch** `ai/cardsense.ts`, `ai/voice.ts` and the UI card views.

### 5.4 AI
- **Today it plans a whole turn for one side around one card.**
  - `planTurn` (`planner.ts:514-661`): per card in hand, `inspectCard` → `orderCandidates` (`ordering.ts:148-307`) →
    greedy moves (`moves.ts`).
  - Candidates are scored by determinised rollouts (`sim.ts`), with staged search A → B → B2 → C → topUp.
  - Budgets (`planner.ts:65-80`): recruit 150 ms / 90 sims, tribune 800 ms / 1200, consul 2000 ms / 5000.
  - Timeouts: 20 s in the worker (`client.ts:22`), 90 s in the UI guard (`controller.ts:421`).
- **Scaling (estimated, not benchmarked):**
  - `evaluate` grows with own × enemy units (`evaluate.ts:269,447,496`), so it is about 4× slower with twice the units.
  - Greedy move planning is about 10–12× slower.
  - Card choice goes from about 6 options to hundreds (3 of 6–9 cards × section assignment, plus Army cards).
  - Calibrations assume one card per turn: `orderingPower` (`evaluate.ts:170-182`) and `cardRetention`.
- **Plan:**
  - plan each section with its own units, reusing `pieceBenefits`/`orderCandidates` and the per-section scoring
    already in `cardsense`;
  - solve the card-to-section assignment at OC level against card retention;
  - verify the combined turn with a few full-turn rollouts;
  - optionally run sections in parallel workers.
- **`sim.resumeTurn`** (`sim.ts:123-177`) restarts a turn by replaying one First Strike card and one `mods`. Use the
  `exactResume`/`continueTurn` path for Epic.
- **Expect slower turns and recalibration.** Balance runs (`scripts/ai-balance.ts`) take 2–3× longer per game, with
  12–14 banners and about 30–35 units a side.

### 5.5 UI
- **Board fit.** The board is one SVG with a fixed viewBox (`Board.tsx:210`). At 1440×900 the board cell is about
  1110×760 px.

| Board | Hex width on screen | Notes |
|---|---|---|
| Standard | ≈ 80 px | |
| Epic, current layout | ≈ 41 px | Leader names ≈ 3.7 px and unreadable |
| Epic, no side column | ≈ 53 px | |

- **No pan/zoom or phone layout exists.** Epic needs:
  - a viewBox camera ("section camera": one section at about standard scale);
  - a minimap (the `SetupPreview` renderer, `Menus.tsx:86-119`, is reusable);
  - a camera that follows off-screen AI actions;
  - pan/zoom that doesn't conflict with click-to-hurry (`GameScreen.tsx:661`).
- **OC panel.**
  - A hand of up to 9 cards (≈ 808 px at the current overlap) shares the footer with the prompt bar, so it needs a
    tighter fan or a moved prompt.
  - Selection is a single card (`uiModel.ts:17`); the OC needs multi-select with a section per card, or one Army card.
- **A section rail** in the vertical space a 3:1 board leaves free. Per section: FG name, seat (You/AI), the card,
  and status (waiting / initiative / ordering / moving / battling / done). `view.cardShow` must become per-section.
- **Banner tracks** for 12–14 banners: the row doesn't wrap (`kit/controls.css:40-44`), so use `bannerSize` or wrap.
- **Picker** needs an Epic tab. `tests/ui/exp3-screens.test.ts:44-45` pins `PICKER_TABS`, and random battle should
  skip Epic or handle seats.
- **Size estimate:**
  - about 1.2–1.6k lines of `src/ui` changed (mostly `GameScreen`, `controller`, `Board`, geometry and menus);
  - about 2.5–3.5k new lines;
  - 0.5–1k lines of tests.

### 5.6 Golden safety
The base path must keep identical:
- hex ids;
- `CARD_LIST` order and length;
- RNG call order (for example, no extra shuffle in `createGame`);
- event JSON (only optional new fields);
- `randomAnswer` draws;
- the AI's private RNG draws and the `resumeTurn` path.

Pinned hashes that also constrain changes:
- `tests/terrain/base-boards.test.ts` (BoardArt markup, which prints raw `BOARD_W` floats);
- `tests/art/looks.test.ts` (token renders);
- the exp2/exp3 terrain tests (new props must be optional).

## 6. Role-based play (4v4)

- **Seats.**
  - Side × {OC, Left FG, Centre FG, Right FG} gives 8 seats, each `human | ai` (later `remote`).
  - Presets: **whole army** (classic two-player Epic), **commander only**, **one wing** (L/C/R) and custom.
  - Seats on the human's own side only, unless hot-seat is added.
- **Decision owners.** Every engine decision gets an owner: the OC for card play, Army allocation and First Strike, or
  a section FG for orders, moves, battles and Initiative.
  - Reactive decisions in the enemy turn (`defend`, `ignoreFlags`, `retreat`, `leaderEvade`, `momentum`,
    `cavalryExtra`, `bonusCombat`) go to the FG owning the unit's section.
  - Dotted-line units need an ownership rule, e.g. the FG who ordered it this turn, else a fixed side of the line
    **[to decide]**.
  - Splitting side-wide decisions inside the controller would be much messier than tagging them in the engine.
- **Controller.**
  - `SessionConfig.humanSide` (`controller.ts:17`) becomes a seat map, plus a viewer side for flip and facing.
  - `pump()` (`controller.ts:383-466`) routes by seat. The `Opponent` interface becomes a per-seat handler, which also
    covers hot-seat and network seats later.
  - Undo must be seat-aware: `driver.canUndo` compares sides only (`driver.ts:77-89`).
  - Bump the save format for seats.
  - "Not the human" animation checks become "not a local human seat".
- **AI.** One AI brain per side, with human seats overriding parts of its turn.
  - **Human OC, AI FGs:** each AI FG plans within the card it was handed, which is what the AI already does. Easy.
  - **AI OC, human FG:** the AI OC plans the whole turn, including the human's section, and hands over the card. Its
    plan for that section can be shown as the OC's private "courier" message, which the rules allow and the FG may
    ignore. Moderate.
  - **Human FG between AI FGs:** the AI must drop and redo its stored plan (`ai/index.ts:56-77`) after the human acts.
  - The worker keys memory by `gameId:side` (`worker.ts:40`); a friendly AI needs a second client.
- **Experience risks.**
  - **Downtime.** One-wing play means 1–4 orders per turn, then watching up to 5 AI generals. It needs
    fast-forward-to-my-decision, faster AI animation for other sections, simultaneous section animation and camera
    follow.
  - **Commander-only is the most original mode:** choose and hand out cards while AI generals execute.
- **Later extensions.**
  - Hot-seat is cheap once seats exist, except for hidden hands (hand-over screens).
  - Online 4v4 is a separate project. GitHub Pages is static, so it would need a relay or peer-to-peer service. The
    deterministic answer log suits syncing.

## 7. Staged plan

| Stage | Contents | Relative size |
|---|---|---|
| 1. Epic, whole army | Geometry (id range), Epic II deck, multi-card turn, Army cards, Initiative, hand-size rules, AI per side (section planner + OC assignment), section camera + minimap, OC panel + section rail, Epic rules chapter, about 4 battles | ≈ 2 expansions |
| 2. Seats | Engine decision owners, seat-aware controller, undo and save, AI teammates and plan invalidation, seat picker, courier message | ≈ 0.5–0.7 expansion |
| 3. Remaining battles | 12 maps transcribed from images (no unit tables), AI balance runs, histories mostly reused | ≈ 0.5 expansion |
| 4. Hot-seat (optional) | Hand-over screens, per-seat hidden information | small |

**Recommended starting decisions:**
- Epic II rules and deck for all 16 battles (confirm for EPIC01–04 first).
- Desktop only at first.
- Seats on the human's own side.

**Research still to do:**
- The full Epic II rule book (GMT living rules).
- The section-line columns on the Epic maps.
- The battle-order ruling when two sections attack the same enemy.
- First Strike timing with the OC as a reacting player.

## 8. Sources

- Epic Ancients (Expansion #3): https://www.commandsandcolors.net/ancients/the-game/game-boxes/expansion-3/epic-ancients.html
- Epic Ancients II rules: https://www.commandsandcolors.net/ancients/the-game/game-boxes/expansion-5/epic-ancients-2.html
- Epic Ancients II Command cards: https://www.commandsandcolors.net/ancients/the-game/game-boxes/expansion-5/epic-ancients-ii-command-cards.html
- Expansion #5 official scenarios (EPIC05–16): https://www.commandsandcolors.net/ancients/the-game/game-boxes/expansion-5/expansion-5-official-scenarios.html
- Expansion #5 overview: https://www.commandsandcolors.net/ancients/the-game/game-boxes/expansion-5.html
- EPIC13 Gaugamela page: https://www.commandsandcolors.net/ancients/maps/alexander-the-great-338-323-bc/epic13-guagamela-331-bc.html
- Epic Ancients II review (The Players' Aid, 2018): https://theplayersaid.com/2018/08/17/guest-blog-not-just-a-convention-game-for-8-players-a-look-at-commands-colors-ancients-epic-ancients-ii-from-gmt-games-by-tom-knight/
- EPIC01–04 details: `design/exp3-survey.md` §1b, §3.5.
