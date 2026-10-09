# Commands & Colors: Ancients — Digital Edition (Design Spec)

Date: 2026-10-09
Status: Approved by user (design), building autonomously.

## Goal

A fully playable, visually appealing browser version of the board game *Commands & Colors: Ancients*
(base game), human vs. a robust, fun AI opponent. All 15 base-game battles. Original "illustrated
miniatures" art (no GMT artwork).

## User decisions

| Question | Answer |
|---|---|
| Platform | Browser app — TypeScript + Vite (`npm run dev`) |
| Scenarios | All 15 base-game battles, full base-game unit roster |
| Play modes | Human vs AI (choose either side), multiple difficulties |
| Art style | Illustrated miniatures (soldier figures, one figure per block) |
| Build approach | Core engine by lead; parallel agents for art / UI / AI / tests; review workflow at the end |

## Architecture

```
src/
  engine/     Pure TS rules engine (no DOM). Deterministic, seeded RNG.
    hex.ts        offset<->cube coords, neighbours, distance, line of sight
    units.ts      unit type table (stats, classes, evade rules, retreat distance)
    terrain.ts    terrain table (movement stops, impassable, dice caps, LOS)
    cards.ts      the 60-card deck definition + texts
    state.ts      GameState types, setup from scenario, clone
    rules/*.ts    movement, ordering, ranged/close combat, retreat, evade, leaders, momentum
    flow.ts       turn generator: yields Decision requests, consumes Answers
    driver.ts     runs the generator; records answers for replay/undo/autosave
  ai/          AI (runs inside a Web Worker)
    evaluate.ts   static position evaluation
    plan.ts       candidate order/move plans per card
    search.ts     Monte-Carlo plan scoring (sampled dice), card choice
    react.ts      reactive policies (evade, flags, retreat, First Strike, momentum, rally...)
    personality.ts difficulty + general personalities + battle-log flavour lines
    worker.ts     worker entry
  scenarios/   15 battles as data + special-rule hooks
  art/         SVG miniature figure library (per unit type, faction palettes), terrain art
  ui/          React components: menus, board, hand, dice tray, log, prompts, tooltips, reference
```

### Engine contract

* `GameState` is plain serialisable data (units, leaders, terrain, hands, deck, discard, banners, rng state, turn info).
* The turn is a generator `function* turn(state)` that mutates a working state and `yield`s
  `Decision` objects (`{ kind, player, ...options }`). The driver answers with `Answer` objects.
  Decisions can belong to the inactive player (evade, First Strike, ignore flags, retreat path, leader evade...).
* Events (`move`, `dice`, `hit`, `retreat`, `eliminate`, `banner`, `log`...) are emitted to a queue the UI animates.
* Replay: initial state + answer list reproduces the game exactly (seeded RNG) -> undo of movement, autosave/resume.
* Helper queries used by UI and AI: `legalOrderTargets`, `reachableHexes`, `battleTargets`, `diceFor`, `hitProbabilities`.

### AI

* Card choice + order/move plan chosen by sampling: for each card in hand generate candidate plans
  (greedy + randomised variants), simulate the turn N times with random dice (battle phase played by a
  greedy battle policy), evaluate resulting states, subtract card-retention value, pick the best.
* Evaluation: banners (non-linear near victory), unit strength weighted by type, weakened units at risk,
  support/formation, leader safety, threats in/out (expected damage), terrain, scenario objectives.
* Reactive decisions by heuristics + quick expected-value checks.
* Difficulty: Recruit (fewer samples, noise, greedy), Tribune (default), Consul (more plans/samples,
  1-ply threat lookahead). Personalities per commander (aggressive / cautious / cunning) tune weights
  and produce battle-log flavour lines.
* Never reads the human's hand, the deck order, or the real RNG (simulations reseed).

### UI / Art

* SVG board (13x9 hexes), rotated so the human's army is always at the bottom.
* Painted terrain: hills, forests, rivers (connected flowing channels; fords marked), lake, camps, marsh.
* Units: one illustrated miniature per remaining block on a faction-coloured base, with a class badge
  (green circle / blue triangle / red square) and block count. Leaders: mounted general with banner + name.
* Cards rendered as illustrated parchment cards with section mini-map; hover highlights sections.
* Dice tray with roll animation and symbol highlighting; hits/retreats animated; banner tracker; battle log.
* Prompts for every decision with sensible defaults; hover tooltips with unit stats and attack odds.
* Title screen, scenario picker (original historical summaries), side + difficulty selection, rules reference,
  credits (font / icon licences).
* Assets: Cinzel + EB Garamond (OFL, via @fontsource), game-icons.net SVGs (CC BY 3.0, credited), original SVG art.

## Rules scope

Full base game: units LI, LB, LS, AX, WA, MI, HI, LC, MC, HC, EL, HCH, leaders; all 60 command cards;
terrain needed by the 15 scenarios; all scenario special rules (Sacred Band, Mago's ambush, Trasimenus hand
growth, Beneventum hand growth, Castulo exit banners + Scipio sudden death, Baecula camp banners, fordable
rivers per scenario). The authoritative condensed rules are in `docs/rules-reference.md`.

## Testing

* Vitest unit tests: hex math, LOS, movement/terrain, dice counts & caps, hit scoring per symbol, flags &
  bolster morale, retreat/evade/rampage, leader checks/escape, momentum & bonus combat, every card.
* Headless AI-vs-AI soak test across all 15 scenarios (no crashes/stalls, games terminate).
* Browser verification of the UI flows; scenario setups visually compared with the reference maps.

## Error handling

* Engine validates every Answer; invalid answers throw (UI only offers legal options, AI is tested).
* AI worker failure -> fallback to in-thread greedy policy so the game never stalls.
* Autosave in localStorage wrapped in try/catch.
