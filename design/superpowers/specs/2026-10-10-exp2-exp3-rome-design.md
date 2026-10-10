# Expansions #2 and #3 — Rome & the Barbarians, The Roman Civil Wars (Design Spec)

Date: 2026-10-10
Status: Design approved by the user (approach 1; asked to continue autonomously).

## Goal

Add the official battles of *Commands & Colors: Ancients* Expansion #2 (*Rome & the Barbarians*, 23 battles, 201–223)
and Expansion #3 (*The Roman Civil Wars*, 19 standard battles, 301–319) to the browser game: the new unit type, terrain,
leader abilities, legion rules and battle objectives they need, per-army miniature art and AI support. Base-game and
Expansion #1 play must not change.

## User decisions

| Question | Answer |
|---|---|
| Release | One shared design; build, verify and publish Expansion #2 first, then Expansion #3 on top of it |
| Army art | Per-army detail (new kits, a palette per army, distinct elite looks; the two Roman armies of a civil-war battle differ by palette as well as block colour) |
| Epic battles (Expansion #3 EPIC01–04) | Out of scope: a separate two-board mode with its own card system, for a later cycle |
| 310 Utica P1 (solo dice-order battle) | Included: the Numidian side, human or AI, rolls its order dice and makes **every** choice for its own units |
| Approach | 1 — battle objectives, unit and leader abilities as data, read by engine, AI and UI alike |

## Sources

* Scenario surveys (every battle: sides, blocks, cards, banners, special rules, unit tables cross-checked against the
  maps, terrain, new needs): `design/exp2-survey.md`, `design/exp3-survey.md`.
* Rulings research (GMT living rules 2009, GMT Expansion 2/3/4 rule texts as transcribed on commandsandcolors.net,
  Richard Borg's FAQ and quoted rulings, the site FAQ and scenario comments, BGG Expansion 2 and 3 forums):
  `design/exp2-rulings.md`, `design/exp3-rulings.md`. Their decisions tables are binding for this spec unless a row
  below says otherwise; every guess is marked **[Interp]** in `design/rules-reference.md`.

## Rulings that differ from the research or need a word

| Point | Decision | Why |
|---|---|---|
| 310 dice orders | The Numidian player chooses everything, including the units hit by its own flag and swords faces (applied first) | User decision (the research suggested the Caesarian chooses the victims) |
| Camp −1 vs terrain caps | Keep the engine's order (caps first, then −1) for every battle; record the site FAQ's opposite order as an alternative in §4 | Changing it would alter base battle 011; the only case it matters in the new battles is 308's camp-on-hill |
| 201–205 Roman blocks | Red `rom` with the base-game `roman` look, no colour toggle | In this app the base-game Romans are already red; the official grey/red choice is cosmetic |
| 222 first player | Romans move first (page text over the map star) | Rulings Exp2 Q11 |
| 203 / 218 banners | 4 / 6 | Rulings Exp2 Q11 |
| 314 / 315 counts | Pompeian LI 2 / LB 1; 3 Caesarian leaders (maps) | Rulings Exp3 Q12–13 |

## Scope at a glance

| Need | Expansion #2 | Expansion #3 |
|---|---|---|
| Barbarian light chariot (BCH) | 201, 202, 217–219 | — |
| Legions: Marius (MI/HI pilum) / Julian (pilum + 2-hex march) | Marius 206–223 | Marius 301–305; Julian 306–309, 311–319 |
| Tenth Legion elite (HI, pilum + march) | 215 (×2), 217 | — (the 306–308 "Legio X" labels are cosmetic) |
| Caesar (+1 CC die; attached foot moves 2 and battles) | 215, 217, 218 | 306–309, 314–319 |
| Spartacus (+2 dice on I Am Spartacus) | 208, 210–214 | — |
| Rolling Fire | 210 | — |
| Separate commands (one command per card) | 210 | 304 |
| Dice orders instead of cards | — | 310 |
| Reserves / reinforcements (generalised Trebbia) | 206 | 308 (+ forced Roman placement) |
| Objectives: capture (end of move / start of turn; tile removal; banner sequences) | 201, 208, 211, 215, 221 | 301, 306, 308, 309, 313, 316 |
| Objectives: hold (temporary banners) | 204, 213, 214, 222 | 308, 311 |
| Objectives: majority / section clear | 202 / 219 | 309 / — |
| Objectives: exit | 210, 212, 221 | 311, 314, 317 |
| Last-row retreat eliminates | 214 | — |
| Immobile units | — | 306 |
| Hand growth (generalised Trasimenus) | — | 313 (2 → 5) |
| Terrain: ditch, very steep hills, sea as ford, rampart destruction | 212, 223, 217, 223 | sea as ford 313 |
| Terrain: scalable city walls, impassable walls/towns, hill under camp/wall, steep hill–forest edges | — | 308–309, 301/303/304, 308, 308 |
| Blocks: Barbarian green `bar` | all | 306–308 |
| Blocks: grey Roman `gry` (the second Roman army) | — | 301–305, 309–315, 317–319 |

Each expansion's release contains only what its battles need; Expansion #3-only mechanisms are built in its cycle.
No new command cards. No Epic mode.

## 1. Engine

### 1.1 Rework first (no behaviour change)

Gate, as in Expansion #1: all tests green, golden games identical, Expansion #1 tests identical.

* **Objectives replace the ad-hoc banner rules.** A scenario carries `objectives: ObjectiveDef[]` (1.3). Baecula (011)
  and Gabiene (114) camp capture and the Castulo (010) exit move onto it; `campCapture` and the exit branch of `castulo`
  disappear (Castulo keeps its sudden-death leader rule).
* **Reserves generalised.** Trebbia's `magoAmbush` becomes a `reserves` entry (1.4) with Trebbia's current trigger and
  entry settings.
* **Hand growth generalised.** `trasimenusHand` becomes `handGrowth: { side, to }`: while that side's Command is below
  `to`, it draws 2 at the end of its turn and its Command rises by 1 (Trasimenus `to: 4`).
* **Banner totals.** `PlayerState.banners` stays the permanent count; held (temporary) objective banners are kept per
  objective in `special` and a helper `bannerTotal(s, side)` = permanent + held is used for victory, the UI and the AI.

### 1.2 Units, legions, leaders

**Barbarian light chariot `BCH`** (rulings Exp2 Q1): light, mounted, chariot, 3 blocks; moves 3 and may battle; never
fires; close combat 2 dice, +1 die and +1 ignorable flag while at full strength (judged per combat, like warriors);
swords hit (it is not a "green without white border" unit) and it ignores 1 sword hit in close combat (like HCH);
evades always; momentum: advance + bonus combat, no extra hex; retreats 3 (+1 per elephant/camel flag); in the light
and mounted troop-card lists (Move-Fire-Move: moves only); leader escape dice 3 at full strength, 2 after a loss;
elephants roll 2 against it; cannot be rallied.

**Pilum** (ranged ability): range 2, always 1 die, only if the unit moved 0–1 hexes; a missile unit for every ranged rule
(no fire when adjacent to an enemy, never fire and close combat in one turn, Darken the Sky fires twice; not light, so no
Order Light Troops or Move-Fire-Move); from a camp it rolls 0 dice and so cannot fire.

**March** (movement ability): may move 2 hexes if it does not battle that turn (it may still move 1 and battle).

**Legion rules** (scenario data `legions: { top?: 'marius' | 'julian'; bottom?: … }`; setup stamps `Unit.legion` on every
MI and HI of that side): `marius` = pilum; `julian` = pilum + march. Double Time with march: 2 hexes and battle, never
3. "For both armies" in the source text means both sides' MI/HI (rulings Exp3 Q1).

**Elite `tenthLegion`** (HI): pilum + march (rulings Exp2 Q3). `EliteAbility` gains `pilum` and `march`; the helpers
`hasPilum(u)` and `canMarch(u)` merge type, elite and legion.

**Leader traits** (`LeaderTrait` additions):
* `forcedMarch` (Caesar, with `ccBonus`): a foot unit (not a war machine) with him attached when it begins its move may
  move 2 hexes and still battle; terrain stops and card limits still apply; no fire after a 2-hex move; Double Time stays
  2. Caesar's `ccBonus` works exactly like Alexander's (every close combat, after caps, not mirrored by elephants).
* `spartacusDice` (Spartacus): while he is on the board, his side's I Am Spartacus order roll uses Command + 2 dice
  (also when a Counter Attack copies the card). The card's other effects are unchanged.

**Unit flags from scenario data:** `Unit.immobile` (306: never moves or momentum-advances; fires, battles, battles back,
retreats normally and stays immobile); `Unit.command` / `Leader.command` (1.5).

### 1.3 Objectives

```ts
type ObjectiveDef =
  | { kind: 'capture'; side: Side; hexes: HexId[]; when: 'stop' | 'turnStart';
      banners?: number[];   // banners for the 1st, 2nd, … capture; the last value repeats (default [1])
      together?: number;    // turnStart only: needs this many hexes occupied at once; scores once, consumes all
      remove?: boolean;     // the camp/rampart tile is removed (hex becomes plain, or hill if it has a hill under it)
      text: string }
  | { kind: 'hold'; side: Side; hexes: HexId[]; max?: number; text: string }          // 1 per occupied hex
  | { kind: 'majority'; sides: Side[]; hexes: HexId[]; banners: number; when: 'turnEnd' | 'always'; text: string }
  | { kind: 'sectionClear'; side: Side; text: string }                                 // 1 per clear section
  | { kind: 'exit'; side: Side; hexes: HexId[]; units?: 'any' | 'foot' | 'cavalry'; leadersScore?: boolean; text: string };
```

* Only **units** count for capture, hold, majority and section clear (never lone leaders). Passing through never counts.
* `capture` `stop`: a unit of `side` ending a move (or momentum advance) on an uncaptured hex (011, 114).
  `turnStart`: at the start of `side`'s turn, before the card is played, every uncaptured hex holding a unit of `side`
  is captured (201 `[0,0,1]`, 208, 211 `together: 2`, 215 both sides, 221 `[2]`, 301, 306, 308 Romans `[0,1,1]` and Gauls,
  309 `[0,1]` both sides, 313 ship markers). Banners are permanent; removed tiles emit `terrainChanged`.
* `hold`: continuous — 1 banner per listed hex a unit of `side` stands on, up to `max`; recomputed after every change of
  position or removal; lost when the hex is vacated; regainable (204 `max 1`, 213, 214 `max 1`, 222 `max 2`, 308 walls
  and large-camp ramparts, 311).
* `majority`: the side (of `sides`) with more units on `hexes` holds `banners`; a tie holds none. `turnEnd` (202):
  evaluated at the end of every player turn; `always` (309): continuous.
* `sectionClear` (219): at the end of `side`'s turn, each section without an enemy unit scores 1 held banner; it is
  lost the moment an enemy unit stands in that section; units on boundary hexes count for both sections.
* `exit`: a unit of `side` on one of `hexes` may move off the board as one hex of movement (across the board edge next to
  that hex); it scores 1 banner and is removed (not eliminated: no banner for the enemy); an attached leader leaves with
  it and scores 1 more only if `leadersScore` (317; a lone leader may then exit too). `units: 'cavalry'` = LC, MC, HC,
  LBC; `'foot'` = foot units.
* Victory is checked whenever a side's total rises; losing a held banner never undoes a win already reached.
* Events: `objective` (gain/loss with reason), `terrainChanged`.

### 1.4 Reserves, placement and orders

* **Reserves** (`reserves: ReserveDef[]`): off-board units and leaders of a side; `trigger` = card kinds (Leadership
  cards, Order Light Troops for 206) and `afterOwnTurns` (Trebbia 1, others 0); `entry` = the enemy baseline hexes of the
  card's section (Any Section / Order Light Troops: chosen) or fixed `hexes` (308 G1–G5); `cardOrders` = whether the card
  also orders other units (Trebbia, 206: as today; 308: no); `move` = whether entering units then move normally (placement
  = first hex; 308: they may not move but may battle and fire with 2 dice); `attachLeader` (308 Vercingetorix joins a
  unit); units that cannot be placed wait for a later trigger. Retreats of entered units go toward their own side.
* **Forced placement** (308): after the Gallic reserve enters, at the start of the next Roman turn the Roman must place
  his off-board MI on an empty listed hex (delayed while all are occupied). New decision `placeUnit` (like
  `placeLeader`).
* **Commands** (210, 304): `commands: [{ id, name, side, blocks? }]`; units (and, in 304, leaders) carry `command`.
  Every unit ordered by one card belongs to one command (the first ordered unit fixes it). A Leadership card on a leader
  with a command orders only that command; leaders without one are unrestricted (210). `blocks` optionally recolours
  that command's base edges (art only: 210 Lentulus grey, 304 Perpenna blue) so the official maps' distinction shows.
* **Dice orders** (310): `SideSetup.orders: 'dice'` with `orderDice: 2`: that side holds no cards and never draws. Its
  turn: roll 2 dice; first resolve flag faces (it picks one of its units, which retreats one unignorable flag; blocks
  lost if it cannot) and swords faces (it picks a unit that loses 1 block); then each symbol face orders one unit of
  that class of its choice, a helmet orders a leader with his attached unit; unusable faces are lost. Then the normal
  move and battle phases. The opponent may still play First Strike; its Counter Attack orders nothing.
* **Rolling Fire** (210; rulings Exp2 Q6): a Slave foot unit on a hill, ordered by a non-Tactic card (or Counter Attack
  copying one), that has not moved may use its battle for Rolling Fire: the player picks a path of 1–3 hexes, each one
  row nearer the Roman edge (diagonal-forward neighbours), never entering a hill and stopping after the first non-plain
  hex; 2 dice against every unit in the path, friend or foe, nearest first; only the unit's own class symbol hits; no flag
  may be ignored; no battle back; lone leaders in the path evade at once (Romans toward the Roman edge, Slaves toward their
  own side); then the firing unit loses 1 block (leader check; Roman banner if eliminated). New decision
  `rollingFirePath`.
* **Last-row retreat** (214, `lastRowRetreat: Side`): a unit of that side that must retreat from its own baseline row,
  or reaches it with retreat hexes left, is eliminated (enemy banner); not for evades or a retreat ended by attaching a
  leader.

### 1.5 Terrain

* `ditch` (212): every unit and lone leader stops on entering; no other effect (no caps, battle allowed, war machines
  may enter, advance in and out allowed, no line-of-sight block).
* **Very steep hills** (223, rule `veryHills`): entering a hill from lower ground stops the unit, which may not battle
  that turn; advancing up gives no bonus combat; close-combat caps uphill 1, downhill 2, hill to hill min(3, dice),
  replacing the hill caps; card and leader bonuses add on top; ranged and line of sight unchanged.
* **Sea as ford** (217, 313): data `{ t: 'sea', ford: true }` is stored as a fordable river with a `coast` art variant:
  exactly the fordable-river rules.
* **Removable tiles:** capture objectives with `remove`; 223 `rampartBreakers: 'bottom'` — a rampart hex a Roman unit
  enters or passes through becomes plain. `GameState.terrain` (and the rampart mask) may change during play; every
  change emits `terrainChanged`; replays reproduce it.
* **Scalable city wall `wall`** (308, 309; rulings Exp3 Q3): foot units (not war machines) and leaders may enter only by
  a move that starts adjacent, and stop; a unit leaving it moves at most 1 hex and stops; retreating/evading foot pass
  normally; mounted units and war machines may not enter, retreat or evade onto it, and may close combat a unit on it only
  if they began the turn adjacent; close combat into or out of it max 2 dice (bonuses add); the defender on a wall ignores
  1 sword and may ignore 1 flag in close combat, 1 flag against ranged fire; the defender on a wall automatically strikes
  first unless the attacker is also on a wall hex (if that strike eliminates the attacker or makes it retreat, the
  attack is cancelled; there is no battle back after a wall first strike); blocks line of sight except along a line of
  connected wall hexes.
* **Impassable walls and towns** (301, 303, 304): the `steep` rules (impassable, block line of sight) with an art variant
  `wall` or `town`.
* **Hill under** (308, data `hill: true` on a camp or wall hex): the hex also counts as a hill for movement, caps and
  line of sight; camp + hill both apply.
* **Steep slopes** (308, rule `steepSlopes`): across a hexside between a hill (incl. hill-under hexes) and a forest no
  move, advance, retreat or evade from the forest up to the hill, and no close combat either way; downhill movement and
  ranged fire are allowed.

### 1.6 Blocks and sides

* `BLOCKS` gains `bar` (Barbarian green) and `gry` (grey Roman: the second Roman army of a civil-war battle and the
  non-Roman armies on grey Roman blocks — Samnites, Sertorians, Numidians in 310/312/317). `rom` stays red.
* Rules that say "Roman" in a civil-war battle are written per side in the data (legions, objectives, Caesar), never via
  `army === 'Roman'`.

## 2. Battle data and verification

* Files `src/scenarios/data/201.json`–`223.json`, `301.json`–`319.json` in the current format plus: `legions`,
  `objectives`, `reserves`, `placeUnits`, `commands`, unit `command`/`immobile`, leader `command` and the new traits,
  terrain `ditch`, `wall`, `steep` with `art`, `sea` with `ford`, `hill` under camps/walls, rules `veryHills`,
  `steepSlopes`, `rampartBreakers`, `lastRowRetreat`, `handGrowth`; side `orders: 'dice'`; `expansion: 'exp2' | 'exp3'`.
* Transcription hex by hex from the official map images, two transcribers per pack in parallel, then independent
  verifiers who redraw the grid over fresh downloads and compare every hex, edge, unit, leader and objective; header
  checks (sides, blocks, cards, first player, banners). Decisions go to `design/exp2-scenario-notes.md` and
  `design/exp3-scenario-notes.md`. Briefing texts (original blurb, paraphrased special rules, hint) go to
  `src/scenarios/exp2-texts.ts` / `exp3-texts.ts`.
* `tests/scenarios/manifest.ts` gains every battle (counts from the unit tables; map counts where the notes say so);
  `tests/scenarios/exp2.test.ts` / `exp3.test.ts` assert setups, objectives on valid hexes, reserves, commands, elites,
  and position checksums like Expansion #1.

## 3. Art and UI

### 3.1 Art

* **Rework first:** the kit literals in the figure code (`kit === …`, `look === …` in foot, mounted, chariot, elephant,
  leader, machine) become a `KITS` table of per-kit choices (crew dress, chariot and elephant style, leader helmet and
  beard, horse style, cavalry builder). The art hash pins in `tests/art` must stay identical.
* **Block colours:** Barbarian green and grey Roman, checked for contrast against red, purple, light blue, tan and the
  board.
* **Kits:** `celtic` (Gauls, Belgae, Helvetii, Britons — mail and bare-chested warriors, long oval shields, carnyx;
  Britons with woad and the light chariot), `germanic` (Suebian knots, framea spears, clubs, hide cloaks, few helmets),
  `lateRoman` (Marian/late-Republic legionaries: mail, Montefortino/Coolus helmets, curved oval scutum, pilum; aquila
  standard), `iberian` (Celtiberian/Lusitanian warriors: caetra, falcata, sinew caps).
* **Looks:** Expansion #2 `gallic`, `germanic`, `slave` (mixed Gallic/Germanic/Thracian figure variants via look
  overrides), `belgic`, `briton`, `marian`; Expansion #3 `sullan`, `samnite`, `sertorian`, `pompeian`, `caesarian`,
  `helvetii`, `numidian` (on the punic kit: unarmoured javelinmen, Juba's Roman-style heavy foot, African elephants),
  `pontic` (macedonian kit: phalanx, scythed chariots); 201–205 keep `roman`. Pompeian and Caesarian palettes must read
  apart even without the block colour.
* **Figures and elites:** BCH light chariot (celtic/briton), Barbarian LB/LS/MI, Roman warriors (222), red/grey Roman
  war machines and LS, grey elephants (318), Tenth Legion (distinct shields, eagle standard, gold marker), a distinct
  Caesar figure (laurel wreath, red cloak) and Spartacus figure.
* **Terrain art:** ditch, scalable city wall and impassable wall/town variants, coastline ford (sea art with ford
  stones), camp/wall on a hill, steep slope edges, objective markers drawn on the board (capture, hold, exit edge, ship
  markers, majority area outline).
* Dev galleries cover every new look × unit type, elites and terrain.

### 3.2 Screens

* **Picker tabs:** "Rome & the Barbarians" (201–223), "Roman Civil Wars" (301–319).
* **Banner track** shows held banners distinctly (they can be lost); tooltips on objective hexes explain them.
* **Prompts:** Rolling Fire path choice (paths highlighted), dice-order turn (rolled faces, then victims, then units),
  reserve entry, forced placement; command badges on tokens and in tooltips; "only one command per card" feedback.
* **Tooltips** read the ability fields: BCH, pilum, march, Tenth Legion, Caesar, Spartacus, immobile, walls, ditch,
  very steep hills, steep slopes.
* **Rules reference** screen: Expansion #2 and #3 sections.

## 4. AI

* Estimators and the evaluation read the same helpers (BCH, pilum, march, Caesar, walls, very steep hills, slopes,
  ditch). Objectives: the evaluation adds `bannerTotal` and potential (units near capturable/holdable hexes, majority
  margins, eligible units' distance to exit hexes); exits are generated as moves.
* Policies: pilum fire vs close combat; Caesar's march; Rolling Fire (expected hits vs the 1-block cost); the dice-order
  turn (choose the least costly flag/swords victims, then orders); command limits come from the legal-move generator;
  reserve entry and forced placement scored by evaluation.
* Personalities `BY_NAME` for the new commanders; voice troop names per kit (e.g. "the Gallic warband", "the Tenth
  Legion", "British chariots").
* Calibration: `scripts/ai-match.ts` / `scripts/ai-balance.ts` per new battle; results in
  `design/exp2-ai-balance.md` / `design/exp3-ai-balance.md`; regress tests for each new policy.

## 5. Testing and delivery

* Order per expansion: rework (gate) → rules TDD from `design/rules-reference.md` §18 (shared Expansion #2/#3 rules)
  and §19/§20 (battles) → data and verification → art → UI → AI → soak and balance → browser check → release.
* Tests: `tests/rules/exp2-*.test.ts`, `tests/rules/exp3-*.test.ts`, scenario setup tests, AI legality over every
  battle's first decisions, soak over all battles within the test-time budget, golden games unchanged, art pins.
* Expansion #2 is built on branch `exp2-rome-barbarians` in `.claude/worktrees/exp2`; Expansion #3 on
  `exp3-roman-civil-wars` branched from it after #2 is published. `main` is merged in regularly. Release per expansion:
  full tests, typecheck, `npm run build`, check the built site under `/cnc-claude/`, merge to `main`, commit the
  regenerated `docs/`, push. README and CLAUDE.md are updated each time.

## Error handling

* Scenario data is validated at load: unknown terrain, trait, elite, legion, objective kind, command id; objective and
  reserve hexes on the board; exits on edge hexes; every error names the scenario.
* The new decisions (`placeUnit`, `rollingFirePath`, dice-order choices) are handled by engine validation, the UI, the
  AI and the random bot (`randomAnswer`).
* Old saves keep working; terrain changes are reproduced by replay because they are driven by answers and the seeded RNG.
