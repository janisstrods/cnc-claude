# Terrain effects in the hover tooltip — design

Date: 2026-10-10. Status: approved (all recommended options chosen in one question round).

## Goal

Hovering a hex tells the player what its terrain does: movement, combat and line of sight. Before this change the base
terrain only showed its name ("Terrain: Forest"); a few expansion terrains (rampart, ditch, very steep hills, the
no-cap ford, the coastal ford) already had effect lines.

## Decisions

* **Placement:** the existing hex hover tooltip (`HoverTip` in `GameScreen.tsx`). No side panel, no separate legend.
* **Empty hex:** the tooltip is a terrain card: a painted swatch (`TerrainIcon`), the terrain name, and the effect lines.
* **Occupied hex:** the same terrain block (small swatch + name + every effect line) sits under the unit's and leader's
  lines, above the objective lines. Nothing is shortened.
* **Open ground and off-board hexes:** no terrain block (an empty open hex shows no tooltip, as before).
* **Ship:** a release with a battle name, published to the live site once tests and a browser check pass.

## Content

Each effect line has a kind, shown as a small label: **Move**, **Combat**, **Sight**, or **Battle** (a rule of this
battle only, e.g. ramparts the Romans tear down). Every terrain has a Move and a Sight line, so "no effect" is said
explicitly (hills and camps do not slow movement; rivers and lakes do not block sight). Wording follows
`design/rules-reference.md` §4, §7–§10, §16 and §18.6:

| Terrain | Move | Combat | Sight |
|---|---|---|---|
| Hill | No effect | Attacking up onto it: max 2 dice. Attacking down from it, or hill to hill: foot max 3, mounted max 2 | Blocks line of sight, unless firer and target stand on the same hill |
| Very steep hill (223) | A unit climbing onto it from lower ground stops and may not battle this turn | Uphill max 1 die, downhill 2, hill to hill 3. Advancing up onto it gives no bonus combat | as Hill |
| Forest | Stops every unit and lone leader. After entering, only light foot, auxilia and warriors may battle | Close combat in or out: max 2 dice. Firing into it: max 1 die | Blocks |
| Marsh | Stops every unit and lone leader; leaving it, a unit moves only 1 hex. Entering (also by retreat or advance) rolls 1 die: the unit's symbol costs a block, a helmet kills a lone leader. Heavy war machines may not enter | Close combat in or out: max 2 dice. Firing out: max 1 die. May advance out after combat only if it did not move this turn | Does not block |
| Broken ground | Stops mounted units and lone leaders; a mounted unit that enters may not battle this turn. Heavy war machines may not enter | Close combat in or out: max 2 dice | Does not block |
| Fordable river (also the coastal ford, 217) | Stops every unit and lone leader | Close combat in or out: max 2 dice. Firing out: max 1 die. May advance out after combat only if it did not move this turn | Does not block |
| Ford without dice limit (108) | as fordable river | No dice limits in or out. May advance out only if it did not move this turn | Does not block |
| River, lake, sea | Impassable | — | Does not block |
| Steep hill | Impassable | — | Blocks |
| Fortified camp | No effect | A unit here rolls 1 die fewer when it battles. Foot here ignore 1 sword and may ignore 1 flag | Blocks |
| Rampart | No effect | Protects its (viewer-relative) hexsides: foot here ignore 1 sword and 1 flag from close combat across them, 1 flag from fire | Does not block |
| Ditch | Stops every unit and lone leader | No effect | Does not block |

Battle lines: the coastal ford says it is a coast played as a fordable river; ramparts in 223 say which army tears them
down. "Heavy war machines may not enter" (marsh, broken ground) appears only in battles that field one. The table gives
the meaning; the exact strings are pinned in the plan and the tests.

## Architecture

* `src/ui/game/terrainTips.ts` (new, pure): `terrainTip(s, h, flipped, art?) → TerrainTip | null` with
  `{ name, t, ford, art, lines: { kind, text }[] }`. The per-terrain text is a `Record<TerrainType, …>` table, so a new
  terrain type (Expansion #3's city wall) does not compile until it is described. Battle variants (no-cap ford, coastal
  ford, very steep hills, rampart sides and breakers) are computed from the state like today. `rampartSidesText` moves
  here from `uiModel.ts`; `terrainTipLines` is replaced.
* `GameScreen.tsx`: `hoverInfo.terr` becomes the `TerrainTip`; a small `TerrainTipBlock` component renders the header
  (large swatch on an empty hex, small inline swatch under a unit) and the labelled lines. `game.css` gets the label and
  divider styles.
* Tests (`tests/ui/terrain-tips.test.ts`): every terrain type of every shipped battle gets a non-empty tip with Move and
  Sight lines; exact lines for the battle variants (moved from the exp1/exp2 screen tests); open ground and off-board give
  null; a rampart names its sides for both viewers.
