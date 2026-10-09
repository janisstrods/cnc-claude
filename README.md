# Commands & Colors: Ancients — Digital Edition

A fully playable, unofficial browser edition of Richard Borg's *Commands & Colors: Ancients* (GMT Games):
all 15 battles of the base game, Rome and Carthage (and Syracuse), against a computer general.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Type-check and build a static site into `dist/` |
| `npm test` | Rules-engine, AI and soak tests (Vitest) |
| `npm run typecheck` | TypeScript only |

## Playing

1. **New Battle** → pick one of the 15 battles, the army you command, and the opponent's strength
   (Recruit, Tribune, Consul).
2. Each turn: click a command card in your hand (hover to preview it and see which troops it can order),
   press **Play**, click the units to order, **Confirm**, move them (green hexes = may still battle, amber = no
   battle, red = must charge), then attack (red = close combat, orange = ranged fire). The dice, hits and
   retreats are resolved and animated for you.
3. When the enemy attacks you, you'll be asked whether to evade, stand or play First Strike; when you take flags
   you can choose to hold or fall back; when you win a fight you may advance and attack again.
4. First to the scenario's number of Victory Banners wins. Games are saved automatically — **Continue** from
   the main menu.

**Rules** in the top bar opens a full reference (units, dice, terrain, every card). Hover any unit for its stats.

## Project layout

```
src/engine/     Pure TypeScript rules engine (deterministic, replayable)
src/ai/         Computer opponent (runs in a Web Worker)
src/scenarios/  The 15 battles (data + special rules)
src/art/        Original SVG miniatures
src/ui/         React UI: board, terrain art, cards, dice, menus
docs/           Design spec, rules reference, implementation plan
tests/          Engine, rules and AI tests
```

Dev shortcuts: `#/play/007/bottom/tribune` starts Cannae as the Romans directly;
`#/gallery/art`, `#/gallery/terrain`, `#/gallery/kit` show the art galleries.

## Credits

Unofficial fan implementation; *Commands & Colors* is a trademark of GMT Games LLC. All artwork is original;
rules text is paraphrased. Fonts: Cinzel and EB Garamond (SIL OFL). Icons: game-icons.net (CC BY 3.0).
See `CREDITS.md`.
