# Expansion #3 — The Roman Civil Wars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Same conventions as the Expansion #2 plan (`2026-10-10-exp2-rome-barbarians.md`): engine tasks are TDD with exact
> interfaces; delegated tasks are specified by file ownership, interfaces and acceptance criteria.

**Goal:** Add the 19 standard Expansion #3 battles (301–319; no Epic) on top of the released Expansion #2: Julian
legions, scalable city walls, impassable walls and towns, hills under camps and walls, steep hill–forest slopes,
reinforcements with a forced placement, dice orders for 310, immobile units, hand growth, leader exits, ship-marker
objectives, per-army art for the civil-war armies, UI and AI — without changing base, Expansion #1 or #2 play.

**Architecture:** Reuse the Expansion #2 systems (objectives, legions/pilum/march, Caesar, commands, configurable
ambush, removable tiles). New engine pieces are data-driven extensions of them plus the wall terrain and the
dice-order turn.

**Spec:** `design/superpowers/specs/2026-10-10-exp2-exp3-rome-design.md`. Research: `design/exp3-survey.md`,
`design/exp3-rulings.md` (Decisions table binding unless the spec overrides it; spec: 310's Numidian player makes all
its own choices, incl. flag/swords victims).

## Global Constraints

- Branch `exp3-roman-civil-wars` from the released Expansion #2 (`main` after its release), worktree
  `.claude/worktrees/exp3`; art track in `.claude/worktrees/exp3-art` (branch `exp3-art`); AI track in
  `.claude/worktrees/exp3-ai`. Path-limited commits only; never touch the main checkout.
- Golden fixtures unchanged; Expansion #1 and #2 tests keep their expectations; base, Exp1 and Exp2 art pins unchanged.
- Engine pure and deterministic; the AI never reads hidden information.
- Commits authored `Janis Strods <jstrods@gmail.com>`, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Hex coordinates as in the Expansion #2 plan (odd-r, row 0 top, even rows 13 hexes, odd rows 12).

---

## Phase A — Battle data (starts immediately, scratchpad only, in parallel with the Expansion #2 finish)

### Task A1: Transcription (two agents) and verification (two agents)

**T1 owns** `<scratchpad>/exp3-data/301.json`–`310.json` + `notes-T1.md`; **T2** `311.json`–`319.json` + `notes-T2.md`;
**V1/V2** `verify-V1.md` / `verify-V2.md`. Method exactly as Expansion #2 Task 11 (fresh map downloads
`https://www.commandsandcolors.net/ancients/images/stories/CCA_maps/<id>.jpg`, grid calibrated on base 002/007 — the
Expansion #2 verifier's fitted grid: r0 c0 at (69.5, 87.5), hex width 80.65, row pitch 70.5 on 1100-px maps; overlay
checks; counts equal the page tables in `design/exp3-survey.md`, except 314 Pompeian LI 2 / LB 1 and 315 three
Caesarian leaders (maps)).

Format = the Expansion #2 format (see any `src/scenarios/data/2xx.json` in the exp2 worktree) plus:

```jsonc
{ "id": "308", "name": "Gergovia", "year": "52 BC", "expansion": "exp3",
  "top":    { "army": "Gallic", "blocks": "bar", "look": "gallic", "commander": "Vercingetorix", "cards": 5 },
  "bottom": { "army": "Roman", "blocks": "rom", "look": "caesarian", "commander": "Julius Caesar", "cards": 5 },
  "legions": { "bottom": "julian" },                       // 301–305 { top/bottom: "marius" }; see table below
  "rules": ["magoAmbush", "steepSlopes"],
  "terrain": [
    { "r": 0, "c": 6, "t": "wall", "hill": true },          // scalable city wall (308, 309); "hill": a hill under it (308)
    { "r": 1, "c": 3, "t": "camp", "hill": true },          // a camp on a hill (308)
    { "r": 8, "c": 5, "t": "steep", "art": "wall" },        // impassable wall of Rome (301) — "town" for 303/304
    { "r": 0, "c": 9, "t": "sea", "ford": true }            // 313 coast played as a ford
  ],
  "units": [ { "side": "bottom", "type": "AX", "r": 8, "c": 2, "immobile": true } ],   // 306 recruits
  "leaders": [ { "side": "top", "name": "Perpenna", "r": 1, "c": 9, "command": "perpenna" } ], // 304 leaders carry commands
  "commands": [ { "id": "perpenna", "name": "Perpenna", "side": "top", "blocks": "grk" } ],  // 304
  "reserves": [ { "side": "top", "type": "WA" } ], "reserveLeaders": [ { "side": "top", "name": "Vercingetorix" } ],
  "ambush": { "trigger": ["inspiredL","inspiredC","inspiredR","leadershipAny"], "afterOwnTurns": 0,
              "entryHexes": [[3,0],[4,0],[5,0],[6,0],[7,0]], "noMove": true, "attachLeader": true,
              "text": "…" },                                // 308 reinforcements
  "placeUnits": [ { "side": "bottom", "type": "MI", "hexes": [[8,0],[8,1],[8,2],[8,3],[8,4]], "after": "ambush" } ], // 308
  "handGrowth": { "side": "bottom", "to": 5 },             // 313 (bottom.cards = 2)
  "objectives": [
    { "kind": "capture", "side": "bottom", "hexes": [[..]], "when": "turnStart", "banners": [0,1,1], "remove": true, "text": "…" },
    { "kind": "capture", "side": "top", "hexes": [[0,8],[0,9],[0,10],[0,11]], "when": "turnStart", "marker": "ship", "text": "…" }, // 313
    { "kind": "hold", "side": "bottom", "hexes": [[0,5],[0,6],[0,7],[0,8],[0,9]], "text": "…" },
    { "kind": "majority", "sides": ["bottom"], "hexes": [[3,4],[3,5],[3,6]], "banners": 1, "when": "always", "text": "…" }, // 309
    { "kind": "exit", "side": "top", "hexes": [[4,0],[5,0]], "units": "cavalry", "text": "…" },        // 311
    { "kind": "exit", "side": "bottom", "hexes": [[0,0],…,[0,12]], "leadersScore": true, "text": "…" } // 317
  ] }
```

Side `orders` for 310: `"top": { "army": "Numidian", "blocks": "gry", "look": "numidian", "commander": "Saburra",
"cards": 0, "orders": "dice", "orderDice": 2 }`.

Per-battle conventions (from the survey and rulings Decisions table):

| Battle | Blocks top / bottom | Looks top / bottom | Legions | Notes |
|---|---|---|---|---|
| 301 | gry / rom | samnite / sullan | both marius | wall of Rome `steep`+`art:'wall'`; capture bottom turnStart remove on the 2 Samnite camps |
| 302 | gry / rom | sertorian / sullan | both marius | Baetis fordable |
| 303 | gry / rom | sertorian / pompeian | both marius | Lauron `steep`+`art:'town'`; the ambush force is ordinary on-board units |
| 304 | gry / rom | sertorian / pompeian | both marius | Valentia town; commands herennius / perpenna (`blocks: "grk"`), leaders carry `command` |
| 305 | gry / rom | sertorian / pompeian | both marius | — |
| 306 | bar / rom | helvetii / caesarian | bottom julian | Caesar; 2 Roman AX in the Roman camps `immobile`; capture both sides turnStart remove |
| 307 | bar / rom | germanic / caesarian | bottom julian | Caesar |
| 308 | bar / rom | gallic / caesarian | bottom julian | Caesar; walls (`wall`,`hill`), camps on hills, `steepSlopes`; ambush reinforcements + Roman `placeUnits`; objectives: capture bottom turnStart [0,1,1] remove (3 Gallic camps), capture top turnStart [1] remove (Roman camp), hold bottom (wall hexes), hold top (the 3 large-camp rampart hexes) |
| 309 | gry / rom | pompeian / caesarian | both julian | Caesar; walls; capture both sides turnStart [0,1] remove (both enemy camps); majority bottom hillock always |
| 310 | gry / rom | numidian / caesarian | none | top `orders: "dice"`, `cards: 0`; impassable river |
| 311 | gry / rom | pompeian / caesarian | both julian | exit top cavalry (4,0)/(5,0); hold bottom on the Pompeian camp (0,5) |
| 312 | gry / rom | numidian / caesarian | both julian | (Saburra's MI/HI get the rule too) |
| 313 | gry / rom | pompeian / caesarian | both julian | coast `sea`+`ford`; `handGrowth` bottom to 5 (bottom cards 2); ship markers: capture top (0,8–11), capture bottom (0,0–3), turnStart, `marker: "ship"`; lone leaders in camps |
| 314 | gry / rom | pompeian / caesarian | both julian | Caesar; exit top off (8,0–4) |
| 315 | gry / rom | pompeian / caesarian | both julian | Caesar; steep hills, marsh |
| 316 | eas / rom | pontic / caesarian | bottom julian | Caesar; capture both sides turnStart remove |
| 317 | gry / rom | numidian / caesarian | bottom julian | Caesar; exit bottom row 0, `leadersScore` |
| 318 | gry / rom | pompeian / caesarian | both julian | Caesar; marsh, sea (impassable) |
| 319 | gry / rom | pompeian / caesarian | both julian | Caesar |

Caesar's traits `["ccBonus","forcedMarch"]` wherever he leads (306–309, 314–319). The 306–308 "Legio X" labels are
cosmetic: no elite.

---

## Phase B — Engine (after the Expansion #2 release; branch `exp3-roman-civil-wars`)

- **B1 Types scaffold + rules reference §20:** looks `sullan`, `samnite`, `sertorian`, `pompeian`, `caesarian`,
  `helvetii`, `numidian`, `pontic` (temporary art fallbacks); TerrainType `wall`; §18 additions (Julian legions details,
  walls, hill under, steep slopes, reinforcements, forced placement, dice orders, immobile, hand growth, leader exits,
  ship markers) and §20 battles 301–319.
- **B2 Julian legions with Caesar** (already supported by `canMarch` + `forcedMarch`): tests only — Julian MI moves 2
  without battle; with Caesar 2 and battle; pilum after 1 hex, not after 2; "both armies" stamps both sides.
- **B3 Hand growth:** `handGrowth: { side, to }` replaces `trasimenusHand` (golden 006 unchanged) and covers 313.
- **B4 Objectives for Expansion #3:** capture `marker` (any terrain, nothing removed but the marker), majority with a
  single side (309), exit `leadersScore` (lone leaders may exit from the listed hexes; a unit with its leader scores
  2), side-edge exits (311), camp removal leaving a hill when `hill` is set (308).
- **B5 Walls and hills:** terrain `wall` (§ rulings Exp3 Q3: entry only from adjacent and stop; leaving moves 1 and
  stops; mounted/HWM barred, may attack only if adjacent at turn start; cap 2 both ways (+bonuses); defender ignores 1
  sword and may ignore 1 flag (ranged: 1 flag); defender strikes first unless the attacker is on a wall; blocks LOS
  except along connected wall hexes); impassable walls/towns = `steep` (+art); `GameState.hillUnder: boolean[]` (hill
  rules apply too); rule `steepSlopes` (no move/advance/retreat/evade forest→hill, no close combat across).
- **B6 Reinforcements and forced placement:** `ambush.entryHexes`, `noMove` (may battle, fires with 2 dice),
  `attachLeader`; `placeUnits` with a `placeUnit` decision at the start of the next Roman turn (delayed while blocked).
- **B7 Dice orders (310):** side `orders: 'dice'`: no hand, no draw; turn = roll `orderDice`; resolve flag faces
  (own unit retreats one unignorable flag) and swords faces (own unit loses a block) first, then symbol/helmet orders;
  then move and battle; opponent may First Strike; Counter Attack copying nothing orders nothing. Decisions for the
  victim and order choices (the Numidian player makes all of them).
- **B8 Immobile units and leader commands (304):** `Unit.immobile`; Leadership card on a commanded leader (verify
  Task 8 behaviour, add tests).

## Phase C — Data import (B1–B8 done): loader `'exp3'`, copy verified data, `exp3-texts.ts`, manifest, `exp3.test.ts`.

## Phase D — Art (track `exp3-art`)
- Looks: `sullan`, `pompeian`, `caesarian` (lateRoman kit; Pompeian vs Caesarian palettes readable apart without
  the block colour), `samnite` (Italic: Attic helmets with feathers, broad belts, triple-disc cuirass, oval scutum),
  `sertorian` (new `iberian` kit: caetra, falcata, sinew caps, plus Roman-style legionaries), `helvetii` (celtic),
  `numidian` (punic kit: javelinmen, Juba's Roman-style heavy foot, African elephants), `pontic` (macedonian kit:
  phalanx, scythed chariots); red/grey Roman WA, HWM, EL; distinct Pompey figure optional.
- Terrain: scalable city wall (stone wall + gate towers, readable on a hill), impassable city wall and town art for
  `steep` variants, camps and walls on hills, steep-slope edges between hill and forest, ship markers (objective layer).

## Phase E — UI: picker tab "Roman Civil Wars"; dice-order turn panel (rolled faces → victims → orders); forced
placement prompt; wall/slope tooltips; immobile badge; rules reference section; browser check of every new mechanic.

## Phase F — AI: dice-order policy (least costly victims, best orders), walls (assault vs bypass), reinforcement entry,
forced placement, ship markers, exits with leaders, Julian march; personalities (Pompey, Sertorius, Labienus, Juba,
Pharnaces …); balance log `design/exp3-ai-balance.md`.

## Phase G — Soak, balance, browser pass, release (as Expansion #2 Tasks 20–21).
