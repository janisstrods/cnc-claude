# Expansion #3 — AI calibration and balance log

First balance pass after Task F (AI support for Expansion #3, *The Roman Civil Wars*, battles 301–319), 2026-10-11. All
numbers are AI-vs-AI self-play, not human play: they show where the AI's play or the battle setup gives one side a large
edge, and which battles deserve a second look. The samples are small (8 games a battle in the balance table, 4 in the
strength check): treat a single battle's percentage as a hint, not a measurement (with 8 games, 7–1 is still consistent
with a 65% edge).

## How the numbers were made

* Runner: `scripts/ai-balance.ts` (AI vs AI with behaviour counters), summarised with `scripts/ai-balance-report.ts`.
  `--expansion exp3` picks the 19 battles. Their games count the Expansion #2 counters (pilum, march, Caesar, exits,
  captures, held banners, commands, ambush entries) and their own `X3` counters (below); Expansion #1 and #2 runs print
  what they did before. Seeds: `1000 * battle + 17 * game (+7 when side A is the top army)`, as in `scripts/ai-match.ts`;
  each seed is played once with side A as the bottom army and once as the top.
* Banners are banner totals (permanent + held, §18.4). Decision times are the turn plans: the card decisions, and in 310
  the Numidians' order assignment (`diceOrders`), which is where a dice side plans its turn.
* Commanders play their temperament (`personalityFor`, `src/ai/personality.ts`): Caesar, Sulla and Pompey the
  Strategist; Sertorius, Saburra and Vercingetorix the Fox; Labienus, Curio, Pharnaces, Ariovistus and Pontius the Bull;
  Afranius and Attius Varus the Shield; Fufidius, Libo and Metellus Scipio (318) the Veteran; Antony and Gnaeus Pompey
  (319) the Lion; the rest by army (Herennius & Perpenna, Divico and Marcius Rufus the Veteran).
* Wall-clock compute: about 45 minutes on 8 cores shared with other work (load average up to 18). Time-capped decisions
  under heavy load get fewer simulations, which adds noise but treats both sides alike.
* The balance games of 17 battles were played with the AI of commit `d58ced1`; three later changes touch only ship markers
  (313) and dice-order sides (310), so those two battles were played again with the final AI (`ef12015`) and their rows
  below are the final AI's. The strength check was played twice, with `d58ced1` and with `ef12015`.

Reproduce (add `--shard i/4` and run four in parallel):

```
npx vite-node scripts/ai-match.ts -- --a tribune --b recruit --games 2 --scenarios 304,308,310,317
npx vite-node scripts/ai-balance.ts -- --expansion exp3 --games 2 --json bal-a.json
npx vite-node scripts/ai-balance.ts -- --expansion exp3 --games 2 --seedOffset 2 --json bal-b.json
npx vite-node scripts/ai-balance-report.ts -- bal-a.json bal-b.json --flag 0.8
```

## Acceptance: Tribune against Recruit on 304, 308, 310, 317

`scripts/ai-match.ts --a tribune --b recruit --games 2 --scenarios 304,308,310,317` (full time budget), Tribune wins and
losses:

| Battle | First run (`d58ced1`) | Final run (`ef12015`) | Both |
|---|---|---|---|
| 304 Valentia (two Sertorian commands) | 2-2 | 3-1 | 5-3 |
| 308 Gergovia (walls, reinforcements, placement) | 4-0 | 2-2 | 6-2 |
| 310 Utica P1 (dice orders) | 2-2 | 2-2 | 4-4 |
| 317 Ruspina (leader exits) | 3-1 | 2-2 | 5-3 |
| **Total** | **11-5** | **9-7** | **20-12 (63%)** |

The Tribune won every 310 game as the Caesarians and lost every one as the Numidians: the dice side is far the weaker
(see 310 below), whoever plays the cards. Tribune turn plans averaged 272–331 ms per shard in the final run (452–554 ms
in the first, on a busier machine), at most 867 ms (limit 1.5 s). No answer was rejected, no game stalled (longest 36
turns).

## Balance: Tribune against Tribune, all 19 battles

`--scale 0.5`, 8 games a battle (4 seeds × both sides), 152 games:

| Battle | Games | Bottom wins | Top wins | Banners (bottom-top, avg) | Turns (avg, max) | Flag | Expansion #3 counters (totals) |
|---|---|---|---|---|---|---|---|
| 301 Colline Gate | 8 | 3 (Roman) | 5 (Samnite) | 3.4-4.1 | 19, 26 |  | camps 1, pilumShots 29 |
| 302 Baetis River | 8 | 5 (Roman) | 3 (Sertorian) | 5.1-4.1 | 30, 43 |  | pilumShots 45 |
| 303 Lauron | 8 | 2 (Roman) | 6 (Sertorian) | 3.1-6.3 | 29, 44 |  | pilumShots 83 |
| 304 Valentia | 8 | 5 (Roman) | 3 (Sertorian) | 5.3-3.9 | 31, 45 |  | chooseCommand 5, pilumShots 92 |
| 305 Sucro | 8 | 4 (Roman) | 4 (Sertorian) | 4.0-4.4 | 31, 56 |  | pilumShots 116 |
| 306 Bibracte | 8 | 7 (Roman) | 1 (Helvetian) | 6.9-3.0 | 31, 42 | **bottom 88%** | camps 1, caesarMarches 21, marches 36, immobileMoves 0 |
| 307 Plain of Alsace | 8 | 7 (Roman) | 1 (Germanic) | 6.8-3.4 | 25, 33 | **bottom 88%** | caesarMarches 12, marches 12 |
| 308 Gergovia | 8 | 4 (Roman) | 4 (Gallic) | 5.6-6.6 | 29, 39 |  | wallClimbs 9, wallAssaults 2, wallFirstStrikes 2, ambush 19, placements 5 (first hex 0), camps 7, heldTop 34, heldBottom 4, heldWins 4 |
| 309 Ilerda | 8 | 4 (Caesarian) | 4 (Pompeian) | 5.1-4.8 | 38, 45 |  | wallClimbs 3, camps 3, heldBottom 10, heldWins 1, marches 179 |
| 310 Utica P1 Delaying Action | 8 | 8 (Caesarian) | 0 (Numidian) | 4.0-0.5 | 10, 27 | **bottom 100%** | diceTurns 32, diceFaces 64, diceFacesUsable 44, diceFacesUsed 44, victims 26 (blocked 0, last block 0) |
| 311 Utica P2 The Valley | 8 | 7 (Caesarian) | 1 (Pompeian) | 4.9-2.6 | 21, 28 | **bottom 88%** | exits 4, heldBottom 8, heldWins 2 |
| 312 Bagradas River | 8 | 6 (Caesarian) | 2 (Numidian) | 4.4-2.4 | 15, 18 |  | pilumShots 33, marches 40 |
| 313 Brindisi Raid | 8 | 1 (Caesarian) | 7 (Pompeian) | 2.3-5.9 | 21, 30 | **top 88%** | ships 16, marches 94 |
| 314 Dyrrhachium | 8 | 5 (Caesarian) | 3 (Pompeian) | 4.5-4.0 | 24, 38 |  | exits 6, caesarMarches 21, marches 117 |
| 315 Pharsalus | 8 | 8 (Caesarian) | 0 (Pompeian) | 7.0-3.1 | 21, 40 | **bottom 100%** | caesarMarches 21, marches 58 |
| 316 Zela | 8 | 7 (Caesarian) | 1 (Pontic) | 6.5-3.3 | 19, 28 | **bottom 88%** | caesarMarches 8, marches 20 |
| 317 Ruspina | 8 | 8 (Caesarian) | 0 (Numidian) | 5.0-1.6 | 13, 18 | **bottom 100%** | exits 7, leaderExits 3, caesarMarches 22 |
| 318 Thapsus | 8 | 7 (Caesarian) | 1 (Pompeian) | 6.9-4.3 | 35, 51 | **bottom 88%** | caesarMarches 20, marches 71 |
| 319 Munda | 8 | 7 (Caesarian) | 1 (Pompeian) | 7.9-4.5 | 32, 49 | **bottom 88%** | caesarMarches 41, marches 70 |

Bottom 105, top 47. Turn plans averaged 305 ms (max 746 ms) at half budget; the Numidian dice plans 69 ms (max 208 ms).
No game came near the 200-turn cap (longest 56 turns, 305), every game had a winner, no answer was rejected and no AI
answer was replaced by the fallback (`aiFallbacks` 0 in every game).

Counters (Expansion #3 battles only; the Expansion #2 ones are explained in `design/exp2-ai-balance.md`):
`wallClimbs` units climbing onto a city wall hex (move or momentum advance); `wallAssaults` close combats against a unit on
a wall (`wallAssaultsMounted` of them by mounted units: 0); `wallFirstStrikes` first strikes from a wall; `diceTurns`
dice-order turns that ordered something, `diceFaces` faces rolled on them, `diceFacesUsable` the most faces that could
order a piece together, `diceFacesUsed` faces used; `victims` flag and swords victims chosen, with the blocked retreats and
last blocks among them (and the avoidable ones: 0); `placements` forced placements (on the first offered hex: 0);
`reinforcements` (= `ambush`) reserve units entered; `ships` ship markers taken; `leaderExits` leaders who left by an exit;
`immobileMoves` moves of immobile units (0, as it must be).

### Battles outside 20–80 %

Ten battles: one side won 7 or 8 of 8. Each setup was checked against §20 of `design/rules-reference.md` and the data
(`src/scenarios/data/3xx.json`: hands, first player, banners, legions, Caesar, objectives, unit lists against the survey's
tables): **no data doubt was found**; every flagged battle has the hands, first player, banner target, legion rule, leader
traits and units §20 and the survey give. Nine of the ten are Caesarian (or Roman) wins, and seven of those nine are
Caesar's battles.

* **Caesar's battles: 306 Bibracte, 307 Plain of Alsace, 315 Pharsalus, 316 Zela, 318 Thapsus, 319 Munda (7–1 or 8–0
  for Caesar).** In each Caesar has 6 cards against 4 (5 at Thapsus), his +1 die and forced march (193 2-hex infantry
  moves with him in all), Julian legions that throw the pilum and march, and a leader worth fighting under; all six were
  Caesar's victories. Checked: 306 Helvetians 4 cards and first, 21 units against 17 Romans (2 immobile AX, `immobile`
  only on those two), 7 banners, both camp captures `turnStart`/`remove`; 307 all plain, Romans first with 6 cards,
  Germans 4, 7 banners; 315 Pompeians 4 cards and first, 20 units against 13, 3 Caesarian leaders (the spec's decision),
  the seven steep hills and the marsh; 316 the Pontic army on tan blocks with no legion rule, 4 cards, the camp captures
  both ways; 318 two Pompeian elephants, Juba's HI with the Julian rule, the marsh band and the sea; 319 the 19-hex ridge,
  Caesarians first, 8 banners. The same pattern showed in Expansion #2 (215–218: 75–100% Roman). Where Caesar faces a
  balanced setup the AI splits the games: 308 Gergovia 4–4, 309 Ilerda 4–4, 314 Dyrrhachium 5–3. Caesar fell in 5 of 80
  games he played.
* **310 Utica P1: the Caesarians win 8 of 8, in 10 turns on average.** The Numidians roll 2 order dice and use 1.4
  of them a turn (44 faces used in 32 dice turns, every face that could order something used); the Caesarians play 6 cards
  and move first. Their six horse units pick off the forward Numidian light cavalry (2 blocks each) and medium cavalry
  before the dice side can pull them back, and 4 banners come in 2–3 Caesarian turns. The setup matches §20 and §18.10
  (Numidian `cards: 0`, `orders: "dice"`, `orderDice: 2`; 13 Numidian against 6 Caesarian units; 4 banners; no legion
  rule). The page frames the battle as solo play, the human commanding the Caesarians against the dice; between two equal
  players it is not meant to be even. A note for the rules, not the data: the survey reads the flag face as "retreat a full
  move", §18.10 as a retreat for one flag (**[Interp]**); for every unit in 310 but the cavalry the two are the same.
* **313 Brindisi Raid: the Pompeians win 7 of 8.** The Caesarians start with 2 cards (growing to 5 after three turns) and
  move second; the Pompeians hold 5 and move first, and their targets, the transports at (0,8)–(0,11), are guarded by four
  light units, while the Caesarian targets, the beaches at (0,0)–(0,3), lie behind the whole Pompeian army. Two ships a
  game fell (16 in 8). Checked: the hands and hand growth, the first player, 6 banners, the ship-marker hexes and sides
  (`marker: "ship"`, `turnStart`, no removal) and the coast fords are as §20 says. Before the AI valued the markers within
  a move (commit `b696f1c`) the Pompeians won 8 of 8; after it, 13 of 16 over two runs. Worth a look (an interpretation,
  not a data error): the garrison's ramparts (2,8)–(2,12) face the bottom edge (**[Interp]** read from the art), the
  Caesarians' own side, while the raid comes from the left along rows 0–1.
* **311 Utica P2: the Caesarians win 7 of 8.** Checked: 5 cards each, the Pompeians first, 5 banners, the cavalry-only exit
  over (4,0) and (5,0) and the Caesarian hold of the Pompeian camp (0,5). The Pompeian horse took the exit 4 times (a unit
  for a banner) and the Caesarians held the camp for 8 turn-end banners. Curio won this first fight at Utica.
* **317 Ruspina: the Caesarians win 8 of 8.** Checked: the Numidians 5 cards and first, the Caesarians 6, 5 banners, the
  exit over the whole Numidian baseline with `leadersScore`. The Caesarians took 7 unit exits and 3 leader exits in 8
  games and killed the rest of their banners among Labienus' light troops (LI 6, LB 2, LC 2, MC 5 against MI 4, HI 2, MC,
  LB and Caesar). Caesar broke out at Ruspina.

### Not flagged but worth knowing

* **308 Gergovia** (4–4): the Gauls brought their reinforcements in 5 times (19 units; never in some games, for lack of a
  Leadership card), the Romans placed their MI each time on the hex the evaluation liked best (never the first offered).
  The Gauls won mostly through the Roman large camp: they held its ramparts for 34 turn-end banners (`heldTop`); units
  climbed the city walls 9 times, but the Romans held walls at only 4 turn-ends; a defended wall was assaulted twice (each
  time the defender struck first). Gergovia was Caesar's defeat.
* **309 Ilerda** (4–4): the Caesarians held the hillock for 10 turn-end banners (single-side majority) and the walls were
  climbed 3 times; three camp captures (the first enemy camp scores nothing, both camps 1).
* **304 Valentia** (5–3 Roman): no order mixed the two Sertorian commands (also checked in `tests/ai/exp3.test.ts`);
  `chooseCommand` came up 5 times. In the strength check the Tribune won 5 of 8 here, 1 of 4 as the Sertorians.
* **303 Lauron** (6–2 Sertorian) and **312 Bagradas River** (6–2 Caesarian) are just inside the line.

## New units and rules in play

* **Dice orders (310):** the dice side judges its order assignment as a whole (every valid assignment, by the summed
  benefits the card orders use) and plans its turn like a card turn (the best assignments in the movement styles, played
  out from the `diceOrders` decision); every face that could order something did (44 of 44). Of 26 flag and swords victims,
  none took a blocked retreat or lost a last block. In 55 sampled 310 positions the evaluation alone (the rule switched
  off) never preferred a blocked retreat, so the rule (no blocked retreat while a free one exists) only bites in constructed positions, such as a
  unit holding an objective hex being the only one free to fall back.
* **City walls (308, 309):** assaults on a defended wall are rare (2 in 16 games), as they should be: the estimate now
  includes the defender's first strike, the cap of 2 and its sword and flag ignores, and mounted units never planned one
  (`wallAssaultsMounted` 0). Foot on a wall stays there. Walls were climbed 12 times (9 in 308, where the Romans hold them
  for banners).
* **Reinforcements and forced placement (308):** one ambush candidate per Leadership card (the section is irrelevant); 19
  units entered in 8 games; 5 placements, none on the first offered hex.
* **Ship markers (313):** 16 taken; a free marker within a move of a raider counts for a quarter of its capture, and a
  marker the defender stands on is blocked.
* **Leader exits (317):** 3 leaders left by the exit (each a banner), 7 units; a unit leaving with its leader scores 2.
* **Immobile units (306):** never moved (`immobileMoves` 0).
* **Julian legions and Caesar:** 817 2-hex moves of Julian units (marches, Double Time) and 193 2-hex infantry moves ending
  on Caesar's hex; 1054 pilum throws in the 19 battles.

## Base game, Expansion #1 and #2 unchanged

Every Expansion #3 behaviour is gated on the battle's data (city walls, rule `steepSlopes`, immobile units, a dice side,
fixed ambush entry hexes, forced placements, ship markers, leader-scoring exits, single-side majorities, the new
commanders). Checks: `tests/golden` unchanged (including the deterministic AI games of 002, 007 and 010), and
deterministic Tribune AI-vs-AI games (`budgetScale 0.1`, 8 turns, battle rollouts included) of all 62 base, Expansion #1
and #2 battles give the same 4526 answers and commentary before (`2389fd1`) and after (`ef12015`) Task F.

## Next steps

* A second look at the Caesar battles (more seeds; whether the Pompeian AI should concentrate on Caesar's unit).
* 310: a defensive style for a dice side (keep units out of reach until they can be ordered together) if the battle is to
  be played two-handed against the AI.
* 313: whether the garrison's ramparts face the right way (the [Interp] above), with the scenario's author's intent.
* Shared improvements left out to keep the earlier battles unchanged: a reach term for turn-start camp captures like the
  ship markers' (the threat of a unit stepping onto an undefended camp next turn).
