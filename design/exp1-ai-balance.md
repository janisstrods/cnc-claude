# Expansion #1 — AI calibration and balance log

Results of the Task 19 calibration runs (AI support for the Expansion #1 units, rules and commanders), 2026-10-10,
and of the review follow-up ("Fix 1", same day: Persian/Indian temperaments, war-machine orders; see the sections marked
Fix 1).
All numbers are AI-vs-AI self-play, not human play: they show where the AI's play or the battle setup gives one side a
large edge, and which battles deserve a second look. The samples are small (8–24 games a battle): treat a single
battle's percentage as a hint, not a measurement (with 12 games, 10–2 is still consistent with a 65% edge).

## How the numbers were made

* Runner: `scripts/ai-balance.ts` (AI vs AI with behaviour counters for the new units and rules), summarised with
  `scripts/ai-balance-report.ts`. Seeds: `1000 * battle + 17 * game (+7 when side A is the top army)`, as in
  `scripts/ai-match.ts`; each seed is played once with side A as the bottom army and once as the top army.
* Commanders play their historical temperament (`personalityFor`, see `src/ai/personality.ts`). Since Fix 1 Darius III
  (108, 109) and Porus (111) play the Veteran; the 24-battle table below was run before that (Darius the Shield, Porus
  the Bull).
* Strength check: Tribune (`--scale 1`, the real time budget) against Recruit, 10 battles, both sides.
* Balance: Tribune against Tribune at `--scale 0.5` (half the time budget, to afford more games), all 24 battles,
  12 games each (24 for 110 and 118, which got an extra war-machine batch; 8 for 117, whose first batch ran before the
  final placement policy).
* Wall-clock compute for everything here: about 40 minutes on 8 cores shared with other work (Fix 1: about 20 more).
  Time-capped decisions under heavy load get fewer simulations, which adds noise but treats both sides alike.

Reproduce (each line splits into shards; add `--shard i/4` and run four in parallel):

```
npx vite-node scripts/ai-balance.ts -- --a tribune --b recruit --scale 1 --scenarios 101,107,108,110,112,116,117,118,121,123 --games 2 --json tvr.json
npx vite-node scripts/ai-balance.ts -- --a tribune --b tribune --scale 0.5 --games 6 --json bal.json
npx vite-node scripts/ai-balance-report.ts -- bal.json
```

## Strength: Tribune beats Recruit

60 games with the final code (Tribune at full budget, Recruit at its own):

| Battle | Tribune as bottom (W-L) | Tribune as top (W-L) | Tribune total |
|---|---|---|---|
| 101 Marathon | 0-3 | 2-1 | 2-4 |
| 107 Granicus | 1-2 | 3-0 | 4-2 |
| 108 Issus | 1-2 | 3-0 | 4-2 |
| 110 Jaxartes River | 2-1 | 3-0 | 5-1 |
| 112 Hellespont | 3-0 | 2-1 | 5-1 |
| 116 Heraclea | 1-2 | 3-0 | 4-2 |
| 117 Asculum | 2-1 | 3-0 | 5-1 |
| 118 Beneventum | 3-0 | 2-1 | 5-1 |
| 121 Magnesia | 3-0 | 3-0 | 6-0 |
| 123 Indus | 2-1 | 3-0 | 5-1 |

**Tribune 45, Recruit 15 (75%).** Tribune's card decision (the whole turn plan) averaged 352 ms, at most 908 ms (limit
1.5 s). No stalls: the longest game took 44 turns; no answer was ever rejected by the engine. Tribune's losses
cluster on the weaker side of a lopsided battle (the Persians in 101, 107 and 108, the Romans in 116), where a Recruit
holding the stronger army can still win.

117 Asculum: the four games played before the final placement policy (leaders followed the cards in hand onto a
cavalry wing and an auxilia) went 1-3; the same seeds went 4-0 after it (leaders on medium/heavy units). Those four
games are not in the table.

## Balance: Tribune against Tribune, all 24 battles

| Battle | Games | Bottom wins | Top wins | Banners (bottom-top, avg) | Turns (avg, max) | Flag |
|---|---|---|---|---|---|---|
| 101 Marathon | 12 | 3 (Persian) | 9 (Greek) | 3.8-5.3 | 33, 42 |  |
| 102 Himera | 12 | 10 (Syracusan) | 2 (Carthaginian) | 5.6-3.0 | 31, 89 | (83%) |
| 103 Plataea | 12 | 5 (Persian) | 7 (Greek) | 3.4-3.8 | 28, 42 |  |
| 104 Leuctra | 12 | 4 (Spartan) | 8 (Theban) | 2.4-3.2 | 20, 29 |  |
| 105 Mantinea | 12 | 9 (Spartan) | 3 (Theban) | 5.4-3.7 | 46, 72 |  |
| 106 Crocus Plain | 12 | 2 (Phocian) | 10 (Macedonian) | 3.2-5.3 | 21, 31 | (83%) |
| 107 Granicus | 12 | 1 (Persian) | 11 (Macedonian) | 1.9-5.9 | 19, 32 | **top 92%** |
| 108 Issus | 12 | 1 (Persian) | 11 (Macedonian) | 3.7-7.5 | 31, 42 | **top 92%** |
| 109 Gaugamela | 12 | 0 (Persian) | 12 (Macedonian) | 2.8-7.0 | 18, 31 | **top 100%** |
| 110 Jaxartes River | 24 | 1 (Scythian) | 23 (Macedonian) | 1.8-4.8 | 20, 33 | **top 96%** |
| 111 Hydaspes | 12 | 1 (Indian) | 11 (Macedonian) | 2.6-6.7 | 18, 27 | **top 92%** |
| 112 Hellespont | 12 | 7 (Eumenes' Successors) | 5 (Craterus' Successors) | 4.8-4.4 | 27, 39 |  |
| 113 Paraitacene | 12 | 8 (Eumenes' Successors) | 4 (Antigonus' Successors) | 6.1-4.6 | 32, 46 |  |
| 114 Gabiene | 12 | 4 (Eumenes' Successors) | 8 (Antigonus' Successors) | 4.4-6.3 | 22, 35 |  |
| 115 Ipsus | 12 | 5 (Seleucus' Successors) | 7 (Antigonus' Successors) | 6.4-6.6 | 33, 57 |  |
| 116 Heraclea | 12 | 2 (Roman) | 10 (Epirote) | 3.8-6.7 | 25, 38 | (83%) |
| 117 Asculum | 8 | 3 (Roman) | 5 (Epirote) | 3.5-5.1 | 30, 57 |  |
| 118 Beneventum | 24 | 15 (Roman) | 9 (Epirote) | 5.7-5.0 | 39, 67 |  |
| 119 Raphia | 12 | 8 (Seleucid) | 4 (Ptolemaic) | 7.3-5.8 | 29, 42 |  |
| 120 Cynoscephalae | 12 | 5 (Roman) | 7 (Macedonian) | 4.0-4.6 | 30, 44 |  |
| 121 Magnesia | 12 | 6 (Roman) | 6 (Seleucid) | 5.6-5.3 | 24, 30 |  |
| 122 Cronium | 12 | 3 (Syracusan) | 9 (Carthaginian) | 5.3-6.3 | 44, 63 |  |
| 123 Indus | 12 | 5 (Indian) | 7 (Seleucid) | 3.2-4.5 | 21, 29 |  |
| 124 Pydna | 12 | 6 (Roman) | 6 (Macedonian) | 6.2-6.0 | 41, 49 |  |

308 games; card decisions averaged 248 ms (max 584 ms) at half budget. No game came near the 200-turn cap (longest
89 turns, 102 Himera, 6-4).

### Flagged for a second look (one side wins 85% or more)

* **107–111, the Alexander battles: the Macedonians win 92–100%.** Part of this is the battles (Alexander's +1 die,
  the Companions), and part is temperament: Alexander plays the Lion, Darius (then) the Shield, Porus the Bull. On the same 16
  seeds of 107, 108, 109 and 111 the Macedonians won 16 with the historical temperaments, 12 when both sides play the
  Veteran with the new code, and 13 with the old AI (where every commander here was a Veteran). Alexander was killed in
  5 of 72 games: he leads from the front without being thrown away. A human facing the AI Persians meets a cautious
  opponent; a second look should check whether the Shield is too passive for an army that must attack (Granicus,
  Issus) and whether the Persian/Indian AI uses its numbers (it mostly skirmishes with single-die shots after moving).
* **Fix 1: Darius III and Porus now play the Veteran** (Alexander stays the Lion, Satraces the Fox, Mithridates the
  Veteran). Tribune against Tribune, `--scale 0.5`, 24 games a battle (seeds `--games 6` plus `--games 6 --seedOffset 6`):

  | Battle | Macedonian wins | Persian/Indian wins | Banners (bottom-top, avg) | Turns (avg, max) | Before (Shield/Bull, first 12 seeds) | Veteran, first 12 seeds |
  |---|---|---|---|---|---|---|
  | 108 Issus | 21 (88%) | 3 | 3.6-7.7 | 33, 54 | 11-1 | 10-2 |
  | 109 Gaugamela | 23 (96%) | 1 | 2.2-6.9 | 14, 29 | 12-0 | 11-1 |
  | 111 Hydaspes | 21 (88%) | 3 | 3.5-6.7 | 23, 37 | 11-1 | 11-1 |

  65 of 72 (90%) for the Macedonians, against 34 of 36 (94%) before on the same first 12 seeds: the Veteran helps a
  little but does not bring these battles under 85%. For comparison, human players on the official Commands & Colors
  site record **107 Granicus: Macedonian (top) wins 74% of 96 plays, 109 Gaugamela 75% of 132, 110 Jaxartes 85% of 71**.
  The battles do favour Alexander, but by less than the AI self-play shows: the Persian/Indian AI still cannot use its
  numbers well (it skirmishes and attacks piecemeal while the Companions and Alexander's +1 die win the decisive
  combats). Alexander fell in 7 of the 72 games.
* **110 Jaxartes River: the Macedonians win 23 of 24** (the old AI: 11 of 12). The all-cavalry Scythian army (4 LC, 4
  LBC, 1 MC, 5 banners to lose) skirmishes, but Macedonian missiles (two war machines with range 6, slingers, archers)
  and the Companions wear it down; the Scythians averaged 1.8 banners. Likely a battle where the AI cannot play the
  horse-archer side's hit-and-run well enough; worth a look at the scenario's intended balance too. In the Fix 1
  war-machine runs below (final code, 20 games) the Macedonians won 17 (85%), the rate human players record on the
  official site.
* Just under the line (83%): 102 Himera (Syracusans), 106 Crocus Plain (Philip's Macedonians), 116 Heraclea
  (Pyrrhus' Epirotes; Fright at First Sight hurts the Roman infantry, as intended).

## New units and rules in play

**Heavy war machines** (110 Macedonians, 118 Romans). Old AI vs new AI on the same 24 seeds (12 games each battle):

| | 110 old | 110 new | 118 old | 118 new |
|---|---|---|---|---|
| Machines evaded and abandoned | 2 | 3 | 3 | 2 |
| Machines eliminated (banner) | 2 | 0 | 3 | 2 |
| Moves per machine-turn | 5.4% | 1.8% | 8.6% | 4.2% |
| Shots per turn with a target in range and sight | 33% | 20% | 19% | 31% |
| Machine-turns on the board | 240 | 217 | 337 | 479 |

The new AI no longer evades with a sound machine against light infantry or warriors (the old AI did); its evades were
against a cavalry or infantry attack likely to destroy the machine anyway (MC, MI, or LC against a 1-block machine).
Machines rarely move and, when ordered with a target, fire about 90% of the time; whether they are ordered at all is
left to the turn search (a machine competes with the card's other uses; an extra "order the machines" candidate set
was tried and changed nothing measurable, so it was dropped). The lower 110 fire rate comes with Alexander's Lion
temperament, which spends the Macedonian orders on the cavalry. Over all 308 balance games: 11 machines abandoned,
11 eliminated, 263 shots in 1256 machine-turns. (These fire rates missed each game's last turn; see Fix 1.)

**Fix 1: machine orders.** `pieceBenefits` already counted a machine's shot (through `attackNowValue`, discounted by
`attackNow` = 0.85 like any planned attack); a machine that can shoot from where it stands now counts its best shot in
full (`shotValue`, guarded by `isWarMachine`, so base-game units are unchanged). The balance runner now also counts the
last turn of each game (it used to stop before closing it) and records the AI's value of the best shot each machine had
(`hwmCouldEV`) and of the ones it fired (`hwmFiredEV`). Tribune against Tribune, `--scale 0.5`, `--games 6` (12 games a
battle), same seeds, with and without the change (both with the other Fix 1 changes):

| Machine turns with a target | 110 without | 110 with | 118 without | 118 with |
|---|---|---|---|---|
| Turns with a target in range and sight | 174 | 169 | 189 | 231 |
| Fired | 29% | 27% | 35% | 35% |
| Share of the shot value fired | 38% | 27% | 40% | 40% |
| Ordered / fired when ordered | 33% / 88% | 28% / 94% | 39% / 92% | 41% / 87% |
| Average value of the best shot (banners) | 0.21 | 0.17 | 0.10 | 0.11 |

No measurable change (an earlier 8-game pair: 110 37% to 24%, 118 30% to 32%; pooled over 20 games 110 32% to 26%,
118 33% to 34%: within the noise of time-capped play, and no mechanism makes the change fire less). Where the turns go
(categorised on 4 seeds of each battle, deterministic search): in 110, 59% of the machine turns with a target the card
played could not order the machine at all (they stand on the wings; Alexander's orders go to the centre and the
cavalry); in 118, 37%. When the card could order it, it was ordered 74% (110) and 58% (118) of the time; the rest were
mostly low-value shots (the AI's value of a 1-2 die shot at range 5-6 is about 0.05-0.2 banners) that lost to the card's
other uses, or the search preferred an order set without the machine. The low rate comes from the card choice and the
low value of most shots, not from the order sets.

**Light bow cavalry:** 453 shots against 46 close combats (4 of them against heavy units) over 308 games.
**Camels** (one, 121 Magnesia): 12 close combats, 3 against cavalry (the Romans field only two MC there).
**Hellespont (112):** 9 leaders killed in 12 games (Craterus, who starts in the front of the left wing, 8 times);
no game was decided by the all-leaders rule. Balanced (7-5).
**Asculum (117):** leaders go on medium/heavy units behind the light screen, in the sections the opening hand favours.
