# Expansion #2 — AI calibration and balance log

First balance pass after Task 19 (AI support for Expansion #2, *Rome & the Barbarians*, battles 201–223), 2026-10-10.
All numbers are AI-vs-AI self-play, not human play: they show where the AI's play or the battle setup gives one side a
large edge, and which battles deserve a second look. The samples are small (8 games a battle in the balance table, 2 in
the strength check): treat a single battle's percentage as a hint, not a measurement (with 8 games, 7–1 is still
consistent with a 65% edge).

## How the numbers were made

* Runner: `scripts/ai-balance.ts` (AI vs AI with behaviour counters), summarised with `scripts/ai-balance-report.ts`.
  `--expansion exp2` picks the 23 battles; the Expansion #2 counters (below) are added to the games of those battles
  only, so Expansion #1 runs print exactly what they did before. Seeds: `1000 * battle + 17 * game (+7 when side A is the
  top army)`, as in `scripts/ai-match.ts`; each seed is played once with side A as the bottom army and once as the top.
* Banners are **banner totals** (permanent + held, §18.4) in both scripts; outside Expansion #2 that is the permanent
  count, as before.
* Commanders play their historical temperament (`personalityFor`, `src/ai/personality.ts`): Caesar, Marius, Crassus,
  Germanicus and Scapula the Strategist; Spartacus the Lion; Crixus, Boiorix, Teutobod, Aneroestes, Britomartus, Caepio,
  Mummius and Boduognatus the Bull; Arminius, Cassivellaunus and Caratacus the Fox; Glaber and Trebonius the Shield; the
  rest by army (Romans the Lion, the others the Veteran).
* Wall-clock compute: about an hour on 8 cores shared with other work. Time-capped decisions under heavy load get fewer
  simulations, which adds noise but treats both sides alike.

Reproduce (add `--shard i/6` and run six in parallel):

```
npx vite-node scripts/ai-match.ts -- --a tribune --b recruit --games 2 --scenarios 202,210,215,219
npx vite-node scripts/ai-balance.ts -- --expansion exp2 --a tribune --b recruit --scale 1 --games 1 --seedOffset 7 --json tvr.json
npx vite-node scripts/ai-balance.ts -- --expansion exp2 --a tribune --b tribune --scale 0.5 --games 1 --json bal-a.json
npx vite-node scripts/ai-balance.ts -- --expansion exp2 --a tribune --b tribune --scale 0.5 --games 3 --seedOffset 1 --json bal-b.json
npx vite-node scripts/ai-balance-report.ts -- bal-a.json bal-b.json
```

## Acceptance: Tribune against Recruit on 202, 210, 215, 219

`scripts/ai-match.ts --a tribune --b recruit --games 2 --scenarios 202,210,215,219` (full time budget), the AI before
Task 19 against the AI after it, same seeds:

| Battle | Before (Tribune W-L) | After (Tribune W-L) |
|---|---|---|
| 202 Telamon (hill majority) | 0-4 | 3-1 |
| 210 Picenum (commands, Rolling Fire, exits) | 3-1 | 3-1 |
| 215 River Sabis (Caesar, Tenth Legion, both capture) | 3-1 | 2-2 |
| 219 Foraging Party (section clear) | 3-1 | 3-1 |
| **Total** | **9-7** | **11-5** |

Before Task 19 the Tribune lost all four 202 games: it did not see the two banners the hills give at every turn end
(the Recruit won "6-6" on permanent banners). Tribune card decisions (the whole turn plan) averaged 246 ms and 262 ms in
the two shards, at most 811 ms (limit 1.5 s). No answer was rejected, no game stalled (longest 50 turns).

## Strength: Tribune beats Recruit on every battle

All 23 battles, one seed each, both side assignments (46 games; Tribune at full budget, Recruit at its own):

| | Tribune as bottom (Romans) | Tribune as top | Total |
|---|---|---|---|
| Tribune wins | 16 | 16 | **32 (70%)** |
| Recruit wins | 7 | 7 | 14 |

The Tribune won both sides of 201, 204–207, 212, 213 and 219–221, and lost both sides only of 202 (on these seeds; 3-1
in the acceptance run). Its other losses: as the top army in 209 and 214–218 (four of them on the weaker side of a battle
flagged below or just under the line), and as the Romans in 203, 208, 210, 211, 222 and 223. Card decisions averaged
264 ms, at most 825 ms.
With the acceptance run: **43–19 (69%)**; the Expansion #1 strength check was 75%.

## Balance: Tribune against Tribune, all 23 battles

`--scale 0.5`, 8 games a battle (4 seeds × both sides), 184 games:

| Battle | Games | Bottom wins | Top wins | Banners (bottom-top, avg) | Turns (avg, max) | Flag | Expansion #2 counters (totals) |
|---|---|---|---|---|---|---|---|
| 201 Clusium | 8 | 4 (Roman) | 4 (Gallic) | 5.0-4.8 | 18, 27 |  | camps 20 |
| 202 Telamon | 8 | 5 (Roman) | 3 (Gallic) | 6.5-6.8 | 12, 19 |  | heldTop 60, heldBottom 106, heldWins 8 |
| 203 Clastidium | 8 | 4 (Roman) | 4 (Gallic) | 3.2-2.4 | 10, 18 |  |  |
| 204 Arausio | 8 | 3 (Roman) | 5 (Germanic) | 5.4-5.9 | 27, 42 |  | heldTop 4, heldWins 1 |
| 205 Scirthaea | 8 | 6 (Roman) | 2 (Slave) | 5.6-3.6 | 32, 50 |  |  |
| 206 Aquae Sextiae | 8 | 4 (Roman) | 4 (Germanic) | 4.4-4.2 | 15, 21 |  | pilumShots 32, ambush 24 |
| 207 Vercellae | 8 | 7 (Roman) | 1 (Germanic) | 7.9-6.2 | 37, 52 | **bottom 88%** | pilumShots 71 |
| 208 Mt Vesuvius | 8 | 2 (Roman) | 6 (Slave) | 1.9-4.4 | 8, 10 |  | camps 10, pilumShots 5 |
| 209 Mt Garganus | 8 | 5 (Roman) | 3 (Slave) | 5.0-3.9 | 19, 33 |  | pilumShots 23 |
| 210 Picenum | 8 | 2 (Roman) | 6 (Slave) | 5.5-6.8 | 24, 28 |  | rollingFire 1, rollingFireVsEnemy 2, exits 3, pilumShots 39, chooseCommand 1 |
| 211 Mummius' Defeat | 8 | 5 (Roman) | 3 (Slave) | 3.4-3.8 | 16, 23 |  | camps 9, pilumShots 38 |
| 212 Bruttium | 8 | 0 (Roman) | 8 (Slave) | 2.5-6.0 | 22, 27 | **top 100%** | exits 8, pilumShots 30 |
| 213 Camalatrum | 8 | 5 (Roman) | 3 (Slave) | 4.8-4.9 | 29, 45 |  | heldBottom 10, heldWins 2, pilumShots 80 |
| 214 Silarus | 8 | 3 (Roman) | 5 (Slave) | 3.4-4.6 | 29, 53 |  | heldTop 39, heldWins 4, pilumShots 28, lastRow 3 |
| 215 River Sabis | 8 | 6 (Roman) | 2 (Belgic) | 7.2-6.1 | 38, 47 |  | camps 1, pilumShots 57, caesarMarches 22, marches 12 |
| 216 Sotium | 8 | 7 (Roman) | 1 (Gallic) | 5.6-3.8 | 24, 48 | **bottom 88%** | pilumShots 45 |
| 217 Invasion of Britain | 8 | 8 (Roman) | 0 (Briton) | 7.0-3.5 | 27, 46 | **bottom 100%** | pilumShots 90, caesarMarches 25, marches 10 |
| 218 River Stour | 8 | 7 (Roman) | 1 (Briton) | 5.4-2.8 | 25, 36 | **bottom 88%** | pilumShots 39, caesarMarches 24 |
| 219 Foraging Party | 8 | 3 (Roman) | 5 (Briton) | 5.0-5.0 | 30, 45 |  | pilumShots 16 |
| 220 Teutoburger Wald P1 | 8 | 1 (Roman) | 7 (Germanic) | 2.9-5.5 | 22, 31 | **top 88%** | pilumShots 44 |
| 221 Teutoburger Wald P2 | 8 | 1 (Roman) | 7 (Germanic) | 2.6-5.8 | 20, 29 | **top 88%** | exits 2, camps 2, pilumShots 25 |
| 222 Angrivarii Rampart | 8 | 3 (Roman) | 5 (Germanic) | 4.0-5.4 | 32, 56 |  | heldBottom 44, heldWins 3, pilumShots 52 |
| 223 Cefn Carnedd | 8 | 4 (Roman) | 4 (Briton) | 4.4-4.4 | 36, 57 |  | pilumShots 108, ramparts 11 |

Bottom (Roman) 95, top 89. Card decisions averaged 249 ms (max 549 ms) at half budget. No game came near the 200-turn
cap (longest 57 turns, 223), every game had a winner, and no answer was rejected.

Counters (Expansion #2 battles only): `rollingFire` Rolling Fire uses, with the rolls against enemy and own units;
`exits` units that left the board for a banner; `camps` turn-start (and stop) captures; `heldTop`/`heldBottom` held
banners summed over the turn ends; `heldWins` wins whose total included held banners; `pilumShots` pilum throws;
`caesarMarches` 2-hex moves of infantry carrying Caesar; `marches` 2-hex moves of the Tenth Legion; `chooseCommand`
commands named; `ambush` reserve units entering (206); `lastRow` units lost to last-row retreat (214); `ramparts`
ramparts broken (223).

### Flagged for a second look (one side wins 85% or more)

* **212 Bruttium: the Slaves win 8 of 8** (2.5-6.0). Each game had about one exit (8 in all); the Slaves won mostly on
  kills against Crassus' army (5 cards, 14 units). A traced deterministic game (`budgetScale 0.3`) went the Romans' way
  6-4, with Roman units stepping off the rampart line to fight the Slaves who had crossed the ditch; the Tribune also won
  both sides against a Recruit, so the Roman side is not hopeless. Worth a look at whether the Romans should hold the
  rampart line more firmly (the evaluation gives a rampart only its flag and sword protection, not the value of the
  line) and at the battle's intended balance.
* **217 Invasion of Britain: the Romans win 8 of 8**, **218 River Stour 7 of 8**, **216 Sotium 7 of 8**, **207 Vercellae
  7 of 8**. Caesar's legions with the pilum (90 throws in 217), Caesar's +1 die and forced march (25 marches), the Tenth
  Legion, against warband and chariot armies with 4–5 cards. The Britons' chariots (BCH) evade and skirmish but rarely
  win the decisive combats. Likely partly the battles (the Roman side is stronger on paper in all four) and partly the
  barbarian AI, which, like the Persian AI of Expansion #1, does not concentrate its numbers.
* **220 and 221 Teutoburger Wald: the Germans win 7 of 8 each.** Historically a Roman disaster, and the setups give the
  Germans the forest and the numbers. In 221 the Romans exited only twice in 8 games (the German baseline is behind the
  whole German army) and the Germans took the marching camp twice (2 banners each).
* Just under the line: 205 Scirthaea and 215 River Sabis (Romans 6–2), 208 Mt Vesuvius and 210 Picenum (Slaves 6–2).

### Not flagged but worth knowing

* **202 Telamon** (5–3 Romans): every win included held banners (`heldWins 8`); the Romans held the hills in 106
  turn-end banners against the Gauls' 60. The majority objective decides the battle, as it should.
* **214 Silarus**: the Slaves held a Roman camp for 39 turn-end banners and won 5 of 8; 3 Slave units were lost to
  last-row retreat, and the evaluation keeps Slave units off their baseline when they could be pushed onto it.
* **213 Camalatrum**, **204 Arausio**, **222 Angrivarii Rampart**: the hold objectives were taken and held (Romans on
  the Slave camp 10 turn-end banners, Germans in a Roman camp 4, Romans on the Angrivarian rampart 44).

## New units and rules in play

* **Pilum** (Marius legions, Tenth Legion): 822 throws in 184 games. A legion unit throws when it has a target at range
  2 and nothing adjacent, and closes in when its close combat is worth more; in the threat model its menace at 2 hexes
  is its close combat after a step (the 1-die throw no longer hides it).
* **Rolling Fire** (210): used once in 8 games (2 rolls against Roman units, none against Slave units). The AI rolls
  only along a path that holds an enemy unit and when the expected hits are worth the block it costs: 2 class-only
  dice per unit (about 1/3 hit and 1/3 flag each, no flag ignored) against a full Roman MI are worth about 0.07 banners,
  against a 1-block unit about 0.4, while the block costs about 0.19. So it rolls through battered units or crowded
  paths. Eligible moments are rare in AI play (an unmoved Slave infantry unit on a hill, ordered by a non-Tactic card,
  with Romans within 3 hexes below it): the Slaves come off the hills early. In deterministic 210 traces (3 seeds) such
  moments came up 0–4 times a game, and the AI rolled once in each of the two games where a path was worth it.
* **Separate commands** (210): no order ever mixed the two commands; `chooseCommand` came up once in 8 games (a card
  with automatic or dice orders while both commands had eligible units); the AI names the command whose units the card
  serves best, and its turn plan and the live answer agree.
* **Exits**: 212 one per game on average, 210 three and 221 two in 8 games. Exits trade a unit for a banner; they come
  once a Slave unit reaches the Roman baseline, which the Roman line usually prevents.
* **Turn-start captures**: 201's camps were all taken in most games (20 captures in 8, the third one scoring); 208 10,
  211 9 (the 2-camp `together` capture), 215 and 221 one or two each.
* **Caesar** (215, 217, 218): 71 forced marches; his +1 die makes his unit the spearhead (front-line bonus as for
  Alexander). He fell in 4 of 24 games.
* **Ambush** (206): the Romans brought Marcellus' force in in 6 of 8 games (24 unit entries).
* **Ramparts broken** (223): 11 in 8 games: the Romans enter the empty Briton ramparts when it costs nothing.
* **War machines** (209, 210, 215, 216, 222, an Expansion #1 unit in Roman hands): when ordered with a target they fired
  54–87% of the time (Expansion #1: about 90%). The difference is mostly machines ordered and then moved (out of a
  threatened hex, or forward with the line), after which they may not fire; this is the Expansion #1 logic unchanged.

## Base game and Expansion #1 unchanged

Every Expansion #2 behaviour is gated on the battle's data (objective kinds, `rollingFire`, `lastRowRetreat`,
`rampartBreakers`, `veryHills`, ditch terrain, legions, leader traits, commands). Checks: `tests/golden` unchanged
(including the deterministic AI games of 002, 007 and 010), and deterministic Tribune AI-vs-AI games (`budgetScale 0.1`,
8 turns, battle rollouts included) of all 39 base and Expansion #1 battles give identical answers and commentary before
and after Task 19.

## Next steps

* Second look at the flagged battles, with more seeds (8 games a battle is a first pass).
* 212: the value of keeping a fortified line (ramparts, camps) for the side that defends it.
* The barbarian armies' use of numbers (concentrating warbands on one point) in 207, 216–218.
* Shared improvements left out to keep the base game and Expansion #1 unchanged (see the Task 19 report): stop-aware
  threat reach for forest, marsh and fords; the Immortals' and bow auxilia's threat at range; battle rollouts that keep
  First Strike in the hands of the side that holds it.
