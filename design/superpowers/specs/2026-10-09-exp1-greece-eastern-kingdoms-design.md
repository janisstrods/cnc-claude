# Expansion #1 — Greece & Eastern Kingdoms (Design Spec)

Date: 2026-10-09
Status: Design approved by user (sections 1–2 reviewed explicitly; asked to continue autonomously).

## Goal

Add all 24 official battles of *Commands & Colors: Ancients* Expansion #1 (scenarios 101–124, Marathon to Pydna) to the
browser game: the new unit types, terrain, elite units, leader abilities and scenario rules they need, per-army miniature
art, and AI support. Base-game play must not change.

## User decisions

| Question | Answer |
|---|---|
| Scope of this round | Expansion #1 only (later packs are separate spec → plan → build cycles) |
| Army art | Per-army detail: new culture kits, per-army palettes, distinct elite-unit looks |
| Release | All 24 battles at once, built on a branch, published when done and verified |
| Engine approach | A — unit, elite and leader abilities as data, read by engine, AI and UI alike |
| Rules interpretations | Checked against GMT errata/living rules, designer rulings, the official site and BGG (see Rulings) |

## Sources

* Scenario pages and map images on commandsandcolors.net (`/ancients/maps/...`, `CCA_maps/1xx.jpg`).
* Expansion #1 box pages (New Unit Types, New Game Mechanic, Official Scenarios), the site's unit and terrain pages.
* Survey of all 24 scenarios (counts, leaders, terrain, special rules, conflicts): summarised in the scenario table below;
  every setup decision is recorded in `design/exp1-scenario-notes.md`.

## Scope at a glance

| Need | Scenarios |
|---|---|
| Light bow cavalry (LBC) | 109, 110, 111, 113, 114, 121 |
| Heavy war machine (HWM) | 110, 118 |
| Camel (CAM) | 121 |
| Rampart terrain | 102, 118 |
| Seacoast terrain (rules = lake) | 101, 102, 108 |
| Alexander (+1 CC die) and Companion Cavalry | 107–111 |
| Elite: Immortals (MI with bows) | 108 |
| Elite: bow-armed Indian auxilia | 123 |
| Elite: Theban Sacred Band (MI), Silver Shields (HI) — Sacred Band rules | 104, 113, 114 |
| Poor Persian leadership (satraps help their own unit only) | 107 |
| Leader loss costs a card; killing all enemy leaders wins | 112 |
| Fright at First Sight (Roman foot cannot ignore elephant flags) | 116 |
| Leaders placed after the deal (Romans first) | 117 |
| Roman Tactical Flexibility (optional) | 120, 121, 124 |
| Camp capture banner for a named side | 114 |
| Ford without dice caps | 108 |
| Greek (light blue) and Eastern Kingdom (tan) blocks | most |
| Roman elephants, heavy cavalry, war machines (art) | 118, 120, 121, 124 |

No new command cards (the base 60 are used). No reserves, hand growth or exit banners in this pack.

## 1. Engine

### 1.1 Rework first (no behaviour change)

* **Unit abilities as data.** `UNIT_STATS` gains explicit ability fields and every type literal check
  (`type === 'EL' | 'HCH' | 'WA' | 'AX' | 'LC' ...`) in `src/engine`, `src/ai` and `src/ui` is replaced by a read of the
  table or a shared helper in `src/engine/units.ts`. Fields (names indicative):
  * `ccBack` (already), `elephantDice` (rolls by the elephant table), `elephantDiceAgainst` (dice an elephant rolls
    against this type; replaces `elephantDiceVs`), `ignoreAllSwords` (EL), `ignoreSwordHits: n` (HCH 1),
    `frightensMounted` (EL: cavalry/chariots retreat +1 hex per flag; also CAM, see 1.2),
    `ignoreFlagVsMounted` (EL ignores 1 flag when cavalry/chariots roll), `ignoreHitVsMounted` (CAM),
    `momentumExtraHex` (LC, MC, HC, LBC), `fullStrengthBonus` (WA: +1 die, ignore 1 flag),
    `chargeMove` (WA: 2 if it then close combats), `noFireAfterMove: n` (AX 2), `lightFoot` (pass-through),
    `forestFighter`, `noRally` (EL, HCH), `noLeaderBenefit` (EL), `warMachine` (HWM rules, 1.2), `cardClass`
    (light/medium/heavy/mounted membership for troop cards).
* **Elite units.** `Unit.sacredBand?: boolean` becomes `Unit.elite?: EliteId`, with a table `ELITES` of
  `{ name, abilities }`, abilities ∈ `helmetHits` (helmets always hit in CC), `ignoreFlag` (+1 ignorable flag),
  `ignoreSword` (ignore 1 sword hit in CC), `ranged: { range }` (may fire as a bow unit). The base Crimissos Sacred Band
  becomes the preset `carthSacredBand`. The elite name is shown on the token and in tooltips.
* **Leader traits.** `Leader.traits?: LeaderTrait[]` with `ccBonus` (+1 CC die for the attached unit) and
  `attachedOnly` (helmet hits and Leadership-card orders reach only the attached unit).
* **Blocks vs look.** `Faction` (`rome | carthage | syracuse`) is replaced by two fields per side:
  `blocks: 'rom' | 'car' | 'grk' | 'eas'` — base edge and banner colour, i.e. which side a piece belongs to — and
  `look: ArmyLook` — the figure kit and palette (see 3.1). Base scenarios keep their current colours and appearance.
* **Gate before any expansion content:** all existing tests green; a new **golden-game test** records ~10 seeded
  AI-vs-AI games (several scenarios, all three difficulties' fast settings) *before* the rework and asserts identical event
  logs after it; saved games from the current build still resume (fixture test).

### 1.2 New rules (all recorded in `design/rules-reference.md` §15–§17; guesses marked **[Interp]**)

**Units**

| | LBC Light bow cavalry | HWM Heavy war machine | CAM Camel |
|---|---|---|---|
| Class / kind | light, mounted, cavalry | heavy, foot-like for cards and hits | medium, mounted (not cavalry) |
| Blocks | 3 | 2 | 3 |
| Move | 4, may battle | 1, may not battle after moving | 3, may battle |
| Ranged | range 3, 2 dice still / 1 moved | range 6, 2 dice, not after moving | — |
| Close combat | 2, swords miss | 2, only if it did not move, swords miss | 3 attacking, 2 battling back |
| Evade | always | yes; if it survives it is removed, no banner | vs foot and heavy mounted |
| Momentum | advance + 1 extra hex (not after bonus CC) | none | advance + bonus CC |
| Retreat / flag | 4 (+1 per elephant/camel flag) | 1 | 3 |
| Special | — | may not enter broken ground or marsh | ignores 1 hit when cavalry/chariots roll against it; frightens cavalry and chariots like elephants |

Elephants roll 2 against LBC, 2 against HWM, 3 against camels **[Interp]** (elephant table: "what the target would
roll", camels listed with 3 by the official summary).

**Terrain**

* `sea` — exactly the rules of `lake` (impassable, does not block line of sight); coastal art (beach, surf).
* `rampart` — a hex terrain with a facing (`faces: 'top' | 'bottom'`, the direction the defenders look). Protects across
  its two forward hexsides: a foot unit attacked in close combat across them ignores 1 sword hit and may ignore 1 flag;
  against ranged fire through them it may ignore 1 flag. No effect on movement or line of sight; mounted units gain
  nothing. (Source: the site's rampart terrain page; neither scenario states rampart rules.)
* Ford without caps: river hexes may carry `ford: 'nocap'` (Issus Pinarus): fordable, stop on entry **[Interp]**, no
  close-combat or ranged dice caps.
* Impassable hills (101, 113) use `steep`.

**Elite presets** (`ELITES`)

| Id | Unit | Abilities | Scenarios |
|---|---|---|---|
| `carthSacredBand` | HI | helmetHits, ignoreFlag | 002 |
| `thebanSacredBand` | MI | helmetHits, ignoreFlag | 104 |
| `silverShields` | HI | helmetHits, ignoreFlag | 113, 114 |
| `companions` | MC | ignoreSword, ignoreFlag | 107–111 |
| `immortals` | MI | ranged range 3 (2 dice still / 1 moved) | 108 |
| `bowAuxilia` | AX | ranged range 3 (AX "not after moving 2" kept) | 123 |

**Leader traits:** Alexander `ccBonus` (+1 die in all close combat of the unit he is attached to — attacking, bonus,
battle back and First Strike — added after terrain caps like a card bonus **[Interp]**). Granicus satraps
`attachedOnly`: their helmets count only for the attached unit; a Leadership card played on such a leader orders him and
his unit only; he still gives his unit the leader flag-ignore.

**Scenario rules** (`SpecialRuleId` additions)

* `leaderLossCostsCard` (112): a side that loses a leader permanently loses 1 Command. Lost on its own turn: it does not
  draw at the end of that turn. Lost on the opponent's turn: one card is taken at random from its hand and discarded
  (seeded RNG; event `cardLost`).
* `allLeadersSuddenDeath` (112): eliminating every enemy leader wins at once (generalises Castulo's single named leader).
* `frightAtFirstSight` (116): a Roman foot unit in close combat with an elephant may not ignore any flags rolled by the
  elephant (no leader, support or other exceptions) **[Interp: attacking or battling back]**.
* `leaderPlacement` (117): before the first turn and after the deal, the Roman side places its 2 leaders, then the
  Epirote side places its 2. New decision `{ kind: 'placeLeader' }`, answered with a hex; legal = a hex with an own unit
  and no leader **[Interp]**.
* `tacticalFlexibility` (120, 121, 124; optional): an unsupported HI of the non-Roman army battling back against a Roman
  MI or HI rolls 3 dice; "unsupported" = fewer than 2 adjacent friendly units/lone leaders as for flag support
  **[Interp]**. Exposed as a scenario option (default **on**), stored in the game config.
* `campCapture` generalised: data names the capturing side and the camp hexes (Baecula's Roman/Carthaginian camps,
  Gabiene's Eumenes camp) instead of `army === 'Roman'`.
* Lone leaders at setup (102 Hamilcar) are supported.

## 2. Battle data and verification

* **Files:** `src/scenarios/data/101.json` … `124.json`, current format plus: per side `blocks` and `look`; per unit
  optional `elite`; per leader optional `traits`; terrain `sea`, `rampart` (+ `faces`), `ford: true | 'nocap'`;
  per scenario `expansion: 'base' | 'exp1'`, `options` (e.g. `tacticalFlexibility`), `campCapture`.
  Base files gain `blocks`/`look` with their current appearance; their setups do not change.
* **Transcription:** hex by hex from each official map image; War Council for cards, banners, first player, leader
  names; unit tables for counts. `index.ts` gets an original blurb, paraphrased special rules and a hint per battle.
* **Conflicts:** the map wins for setup; every decision with its reason goes in `design/exp1-scenario-notes.md`
  (known: Granicus Persian MI 4 / MC 1 per map; Magnesia Greek-blue Seleucids with a camel per map; Beneventum's Roman
  leader Dentatus per map; Asculum banners per the rulings research).
* **Verification:**
  1. Dev-only route `#/gallery/scenario/<id>` renders our board beside the official map image (loaded from
     commandsandcolors.net in dev only; never bundled or published). A reviewer agent other than the transcriber compares
     every battle hex by hex until there are no differences.
  2. `tests/scenarios/exp1.test.ts`: each battle builds; per-side/per-type counts equal a manifest taken from the unit
     tables (map counts where the notes say so); leaders, banners, cards, first player; units only on passable hexes;
     one piece per hex; elites on the right unit types; ramparts face the enemy.
  3. AI-vs-AI soak over all 24 battles from both sides: no crashes/stalls, games end; win rates logged and lopsided
     results flagged for a second look at the setup.

## 3. Art and UI

### 3.1 Looks, blocks and figures

* **Blocks:** two new base-edge/banner colours — Greek light blue and Eastern ochre-tan — chosen to read clearly against
  each other, the existing Roman red and Carthaginian purple, and the green board.
* **Kits** (figure shapes, in `src/art`): existing `roman`, `punic`, `greek` (the Syracusan look) plus new `macedonian`
  (sarissa phalanx, Boeotian/Thracian helmets, linothorax), `persian` (soft tiaras, wicker *spara*, scale), `scythian`
  (pointed caps, gorytos, trousers), `indian` (turbans, longbows, howdahs).
* **Looks** (kit + palette), one per army: athenian (Greek allies), theban, spartan, phocian, syracusan, macedonian
  (Philip II/Alexander), antigonid (Philip V/Perseus), epirote, craterus, eumenes, antigonus, seleucid, ptolemaic,
  persian, scythian, indian (Porus), mauryan, roman, carthaginian. Successor armies share the macedonian kit with distinct
  palettes so mirror battles stay readable even beside the block colour.
* **Elite looks:** Companions, Immortals, Silver Shields, Theban Sacred Band, bow-armed Indian auxilia, Carthaginian
  Sacred Band — distinct kit details plus a gold standard marker (as the Sacred Band has today).
* **New figures:** LBC horse archers (scythian, persian, macedonian/successor, seleucid kits), camel archer, HWM
  bolt-thrower with crew (macedonian, roman), elephants with crews for indian, seleucid, ptolemaic, epirote,
  macedonian/successor and roman; chariots for persian, indian, seleucid; Roman heavy cavalry.
* **Terrain art:** `sea` coastline (beach edge following the land, surf), `rampart` (earth bank and stakes along the two
  forward hexsides). Existing camp art covers Himera/Beneventum/Pydna/Gabiene camps.
* Dev galleries: `#/gallery/art` shows every look × unit type and the elites; `#/gallery/terrain` shows sea and rampart.

### 3.2 Screens

* **Battle picker:** two tabs, "Punic Wars" (base, 1–15) and "Greece & the East" (101–124); the list shows the official
  number; briefing unchanged plus an **Optional rules** row with toggles (Tactical Flexibility).
* **Leader placement phase** (Asculum): prompt "Place your leaders", legal hexes highlighted, one click each; the AI
  places its own.
* **Hellespont card loss:** log line and toast when a card is lost; the human sees which of their cards went.
* **Tooltips** read the ability fields (no type literals): elite name and abilities, leader traits ("Alexander: +1 close
  combat die"), war machine and camel rules, rampart/sea terrain.
* **Rules reference** screen: new units, terrain, elite units and leader traits sections.

## 4. AI

* The AI's estimators (`estimate.ts`, `board.ts`, `evaluate.ts`, `policies.ts`) read the same ability fields and engine
  helpers as the rules, so new units and elites are priced and simulated consistently.
* **Values:** `TYPE_WEIGHT` gains LBC, HWM, CAM (initial 0.6 / 0.55 / 0.72, tuned with `scripts/ai-stats.ts`); elite
  weight multipliers by ability replace the Sacred Band's flat 1.25; leaders with `ccBonus` are worth more; under
  `leaderLossCostsCard`/`allLeadersSuddenDeath` leaders are priced like Castulo's Scipio when few remain.
* **Policies:** war machines hold position and fire, and evade when standing would likely lose blocks (evading costs no
  banner); LBC skirmish at range 3; camels are steered towards enemy cavalry; ramparts count as defensive terrain in the
  evaluation; satraps' `attachedOnly`, Alexander's bonus, Fright at First Sight and Tactical Flexibility flow through
  the shared dice/flag helpers.
* **Leader placement:** the AI scores a handful of candidate placements (strong units, sections its hand can order,
  not exposed) with its evaluation and picks the best.
* **Personalities:** `BY_NAME` maps the ~35 new commanders to the existing six temperaments (e.g. Alexander, Pyrrhus →
  lion; Epaminondas, Seleucus → strategist; Eumenes, Philip II → fox; Darius, Ptolemy → shield; Porus, Mardonius → bull).
* **Voice:** troop names per kit for the battle log (e.g. "the phalanx", "the Companions", "the Immortals",
  "Scythian horse archers").
* **Calibration:** `scripts/ai-match.ts` runs per new battle; regress tests for HWM evade/fire choices, LBC skirmishing,
  leader placement and Hellespont leader safety.

## 5. Testing and delivery

* Order: golden-game test → rework (gate) → new rules with TDD from the rules reference → data and verification →
  art → UI → AI → soak/calibration → browser verification.
* Tests: `tests/rules/exp1-*.test.ts` (units, terrain, elites, traits, scenario rules, written from
  `design/rules-reference.md`), `tests/scenarios/exp1.test.ts`, extended soak (one game per battle per side within the
  test-time budget), AI regress additions, golden games, save-compatibility fixture.
* Browser verification via the dev server: picker tabs, every battle's setup, army looks, placement phase, Hellespont
  card loss, tooltips, rules reference; screenshots of each new look.
* Work happens on branch `exp1-greece-eastern-kingdoms` in a separate worktree (other sessions are changing `main`);
  `main` is merged in regularly. When everything is done and verified: merge `main` once more, full tests, typecheck,
  `npm run build`, check the built site under `/cnc-claude/` with `pages-preview`, merge into `main`, commit the
  regenerated `docs/`, push.

## Error handling

* Scenario data is validated at load (unknown unit/terrain/elite/trait ids, off-board or doubled hexes throw with the
  scenario id) and covered by the setup tests.
* Old saves keep working (fixture test); a save referencing an unknown scenario is discarded with the existing error path.
* The new decision kind (`placeLeader`) is handled by the engine validation, UI prompt, AI policy and random bot.
