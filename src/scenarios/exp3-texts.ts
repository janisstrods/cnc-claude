// Briefing texts of the 19 Expansion #3 battles (The Roman Civil Wars, 301-319): original summaries of the
// historical battles and plain-language paraphrases of their special rules. The setups are in data/301.json-319.json.

import type { ScenarioTexts } from './base-texts';
import { CAESAR, FORTIFIED_CAMPS, RAMPARTS } from './rule-texts';

/** The Marian legions on both sides (rules-reference §18.2). */
const MARIAN_LEGIONS_BOTH = 'Marian legions (both armies): medium and heavy infantry on both sides may throw the pilum: range 2, always 1 die, not after moving 2 hexes.';
/** The Julian legions on both sides (§18.2). */
const JULIAN_LEGIONS_BOTH = 'Julian legions (both armies): medium and heavy infantry on both sides may throw the pilum (range 2, always 1 die, not after moving 2 hexes) and may march: move 2 hexes if they do not battle that turn.';
/** Close combat on a city wall (§18.7). */
const WALLS = "Fighting on walls: any close combat in which either side stands on a wall hex is capped at 2 dice (card and leader bonus dice, Caesar's included, are added on top). A foot unit defending on a wall ignores 1 sword, may ignore 1 flag and may ignore 1 flag from missile fire, and it strikes first: it battles back before the attacker rolls, unless the attacker also stands on a wall.";

export const EXP3_TEXTS: Record<string, ScenarioTexts> = {
  '301': {
    blurb: 'In November 82 BC the civil war between Sulla and the Marian party is nearly won, but the Samnite leader Pontius Telesinus, hoping to draw Sulla away from the siege of Praeneste, marches his army straight at Rome. Sulla races back and meets him outside the Colline Gate late in the afternoon. His own wing is driven back against the city walls, while Crassus on the right routs the enemy in front of him. The fighting goes on into the night; by morning the Samnites are broken and Pontius is dead. Thousands of prisoners were slaughtered afterwards, and Sulla became dictator.',
    specialText: [
      'Marian legions (both armies): medium and heavy infantry on both sides, the Samnites included, may throw the pilum: range 2, always 1 die, not after moving 2 hexes.',
      'The Wall of Rome, ten hexes just in front of the Roman baseline, is impassable and blocks line of sight. The two-hex gate in its middle is open ground; a Roman medium infantry and a Roman auxiliary start in it.',
      'Camp capture: at the start of the Roman turn, before its card, every Samnite camp (the two on the Samnite baseline) with a Roman unit on it is taken: 1 banner each, kept for good, and the camp is removed. The Samnites capture nothing.',
      FORTIFIED_CAMPS,
    ],
    hint: 'Defend Rome; tear down the Samnite camps.',
  },
  '302': {
    blurb: 'In 80 BC the Marian exile Quintus Sertorius returns to Spain and raises the Lusitanians and other local peoples against the regime Sulla has set up in Rome. Sulla\'s governor Lucius Fufidius tries to bar the way at the river Baetis (the Guadalquivir), but Sertorius himself routs him there, and some two thousand of Fufidius\' Romans are killed. The victory gives the rebels most of southern Spain, and a base from which they will defy Rome for the best part of a decade. Sulla\'s answer is to send out Metellus Pius, one of his best generals.',
    specialText: [
      MARIAN_LEGIONS_BOTH,
      'The Baetis, down the left side of the field, is fordable everywhere. Two Sertorian light infantry start standing in it.',
    ],
    hint: 'Sertorians against a Sullan army at a ford.',
  },
  '303': {
    blurb: "In 76 BC Sertorius lays siege to Lauron, a town in eastern Spain, and the young Pompey the Great, newly sent against him, marches to its relief. Sertorius wins the race for a hill commanding the town and keeps a strong force in his old camp, ready to fall on Pompey's rear. When Pompey's foragers venture out to the distant fields, troops hidden nearby burst upon them, and the legion sent to their rescue is cut to pieces with its commander. Pompey, who had thought Sertorius trapped against the walls, dares not risk a battle and can only watch as Lauron surrenders and burns. It is one of the worst days of his career, and Sertorius is said to have promised to teach Sulla's pupil to look behind him.",
    specialText: [
      MARIAN_LEGIONS_BOTH,
      'Lauron, the four hexes of the town at the upper left, is impassable and blocks line of sight.',
      "Herennius' ambush force (two warriors, light infantry, two auxiliaries and Herennius) starts on the nine hills of the bottom-right corner, deep in the Roman half. It is an ordinary part of the Sertorian army: it can be ordered from the first turn, and it retreats towards the Sertorian (top) edge.",
    ],
    hint: 'Pompey relieves a town; a hidden force strikes his rear.',
  },
  '304': {
    blurb: 'In 75 BC Pompey marches against the Sertorian lieutenants Herennius and Perpenna, who have drawn up their army near Valentia on the eastern coast while Sertorius is busy elsewhere. In a hard day\'s fighting Pompey\'s legions win a crushing victory: Herennius is killed, thousands of his men fall, and the city of Valentia is razed. The defeat is a heavy blow to the Sertorian cause. It brings Sertorius hurrying east for a reckoning with Pompey at the Sucro.',
    specialText: [
      MARIAN_LEGIONS_BOTH,
      'Valentia, the four hexes of the town just right of centre, is impassable and blocks line of sight.',
      "Two Sertorian commands: Herennius' (grey blocks) and Perpenna's (light-blue blocks). Every card orders units of one command only, tactic cards such as Clash of Shields, Darken the Sky and Rally included; the player names the command when a card could order either. If that command has none of the troops a card names (no light units for Order Light Troops, say), the card orders 1 unit of that command instead. Each Sertorian leader belongs to his own command, so a Leadership card must use a leader of the command named. The Romans have no commands.",
    ],
    hint: 'Two Sertorian commands against Pompey.',
  },
  '305': {
    blurb: "Soon after Valentia, Sertorius reaches the river Sucro and attacks Pompey, hoping to beat him before Metellus can join him. The two armies each win on one flank: Pompey is wounded and forced to flee, while Afranius storms Sertorius' camp and begins to plunder it. Sertorius returns and drives him out, and the day ends in confusion without a clear winner. Metellus comes up the next morning, and Sertorius pulls back.",
    specialText: [
      MARIAN_LEGIONS_BOTH,
    ],
    hint: 'Hills on the Sertorian flanks; legions on both sides.',
  },
  '306': {
    blurb: 'In 58 BC the Helvetii, a Celtic people from what is now Switzerland, set out on a mass migration towards western Gaul, and the new governor Julius Caesar goes after them. Near Bibracte he draws up his four veteran legions on a hillside and posts two newly raised legions and the auxiliaries on the crest with the baggage. The Helvetii charge uphill and are thrown back, but their Boii and Tulingi allies swing round against the Roman flank and rear, and Caesar\'s third line turns to meet them. The fight lasts until nightfall and ends with the storming of the wagon fort in which the Helvetii make their last stand. The survivors were sent back to their homeland.',
    specialText: [
      'Julian legions (Roman side only): Roman medium and heavy infantry may throw the pilum (range 2, always 1 die, not after moving 2 hexes) and may march: move 2 hexes if they do not battle that turn. The Helvetii have no such units.',
      CAESAR,
      'Immobile recruits: the two Roman auxiliaries standing in the Roman camps (bottom centre) never move or advance. They can still be ordered, fight in close combat and battle back, and retreat if flags force them to.',
      'Camp capture: at the start of its turn, before its card, a side with a unit on an enemy camp takes it: 1 banner, kept for good, and the camp is removed (it becomes open ground). The Romans can take the two Helvetian camps (top centre); the Helvetii can take the two Roman camps, once they have driven the recruits out.',
      FORTIFIED_CAMPS,
    ],
    hint: 'Helvetii storm the ridge; raw recruits hold the camps.',
  },
  '307': {
    blurb: 'Later in 58 BC Caesar turns on Ariovistus, the Suebian king who has settled his warriors in eastern Gaul at the expense of the local tribes. A parley ends when German horsemen attack Caesar\'s escort; Ariovistus then marches past the Roman camp to cut its supply line, but will not fight until Caesar advances on his camp and forces him out onto the plain between the Vosges and the Rhine. Caesar leads the Roman right; the two lines charge so fast that the legionaries have no time to throw their pila, and some leap onto the Germans\' locked shields to stab down from above. The Roman left gives way until the young Publius Crassus, commanding the cavalry, sends in the third line. The Germans break and are hunted for miles to the Rhine, which Ariovistus crosses in a small boat.',
    specialText: [
      'Julian legions (Roman side only): Roman medium and heavy infantry may throw the pilum (range 2, always 1 die, not after moving 2 hexes) and may march: move 2 hexes if they do not battle that turn. The Germans have no such units.',
      CAESAR,
      'The field is bare plain: there is no terrain at all.',
    ],
    hint: 'Open plain; Caesar against the Germans.',
  },
  '308': {
    blurb: 'In 52 BC Gaul is in revolt, and Vercingetorix leads the Arverni and their allies to the hill town of Gergovia, where Caesar besieges them. To draw the defenders away, Caesar stages a feint on the far side of the plateau, then sends his legions up the slope to storm the camps outside the walls. They take three camps, but the order to halt is not heard or not obeyed, and the legionaries push on to the walls just as the Gauls come streaming back. The Romans are driven down the hill with the loss of about seven hundred men, among them forty-six centurions. Caesar\'s one real defeat in Gaul forces him to lift the siege and sets back his campaign.',
    specialText: [
      'Julian legions (Roman side only): Roman medium and heavy infantry may throw the pilum (range 2, always 1 die, not after moving 2 hexes) and may march: move 2 hexes if they do not battle that turn. The Gauls have no such units.',
      CAESAR,
      'City walls: the five wall hexes of Gergovia along the top edge (two Gallic bowmen start on them) can be used only by foot units and lone leaders. A foot unit may step onto a wall only by a move that begins next to it, and that move ends there; a unit that starts on a wall moves at most 1 hex. Cavalry, chariots and war machines cannot enter a wall, and can attack a unit standing on one only if they began the turn next to it.',
      WALLS,
      'Hills under camps and walls: the three Gallic camps and the five wall hexes stand on hills and count as hills for dice limits; a camp that is taken leaves a hill behind. Camps and walls block line of sight, even between units on the same hill.',
      'Steep slopes: across every edge between a hill (a camp or wall on a hill counts as one) and a neighbouring forest, nothing may move, advance, retreat or evade from the forest up onto the hill, and there is no close combat in either direction. Moving from the hill down into the forest is allowed, and the slope does not block line of sight. A unit with an enemy just across a slope can neither attack it nor fire, since a unit next to an enemy never fires.',
      'Gallic reinforcements: Vercingetorix, two auxiliaries and two warriors start off the board. When the Gauls play any Leadership card (Inspired Leadership of any section, Leadership Any Section, or a Counter Attack copying one), even on their first turn, the force enters on the empty hexes among the five left-edge hexes from the fourth to the eighth, one unit per hex, with Vercingetorix attached to one of them. The card is used for the entry alone; the units may not move that turn but may battle (missile units fire with 2 dice). Units that find no empty hex wait for a later Leadership card, and once on the board they retreat towards the Gallic side.',
      'Roman reinforcement: once the Gauls have entered, at the start of the next Roman turn, before his card, the Roman player must place his off-board medium infantry on an empty hex among the five at the left end of the Roman baseline (bottom row); if all are occupied it waits for the first later turn when one is free. It may be ordered that turn.',
      'Camp capture: at the start of its turn, before its card, a side takes every enemy camp with one of its units on it, and the camp is removed. Each Gallic camp starts with a Gallic warrior on it. The Romans take the three Gallic camps on the heights: the first scores nothing, the second and third 1 banner each. The Gauls take the small Roman camp (bottom centre) for 1 banner. Banners from camps are kept for good.',
      'Held banners: the Romans hold 1 banner for each of the five wall hexes with a Roman unit on it, and the Gauls 1 for each of the three ramparts of the great Roman camp (bottom right) with a Gallic unit on it. A held banner is lost when its unit leaves or is eliminated, and can be regained later.',
      RAMPARTS,
      FORTIFIED_CAMPS,
    ],
    hint: 'Storm the heights and walls; reinforcements on both sides.',
  },
  '309': {
    blurb: 'In 49 BC Caesar\'s Spanish campaign begins at Ilerda, where the Pompeian legates Afranius and Petreius hold a strong position beside the river Sicoris. Both sides try to seize a hillock between the town and the Pompeian camp, in fierce fighting with heavy losses. Then floods wash away Caesar\'s bridges and cut his supplies, and for a time he is the one under siege. He restores his communications with boats, bridges the river and uses his cavalry to cut the Pompeians off from food and water as they try to retreat. Afranius and Petreius surrender without a pitched battle, and Caesar lets their men go home after disbanding them.',
    specialText: [
      JULIAN_LEGIONS_BOTH,
      CAESAR,
      'The river down the right edge (nine hexes) is impassable.',
      'City walls: the three wall hexes of Ilerda at the top right (a Pompeian bowman and an auxiliary start on two of them) can be used only by foot units and lone leaders. A foot unit may step onto a wall only by a move that begins next to it, and that move ends there; a unit that starts on a wall moves at most 1 hex. Cavalry, chariots and war machines cannot enter a wall, and can attack a unit standing on one only if they began the turn next to it.',
      WALLS,
      'Camp capture: at the start of its turn, before its card, a side with a unit on an enemy camp takes it and the camp is removed. Taking the first of the two enemy camps scores nothing; taking the second gives 1 banner, kept for good. The Caesarians can take the two Pompeian camps (top), the Pompeians the two Caesarian camps (bottom).',
      'The hillock: the three hills in the centre. The Caesarians hold 1 banner while they have strictly more units on them than the Pompeians, and lose it the moment that stops being true (lone leaders do not count). The Pompeians gain nothing from the hillock.',
      FORTIFIED_CAMPS,
    ],
    hint: 'Walled town, hillock and two camps.',
  },
  '310': {
    blurb: 'In 49 BC Caesar sends the young Gaius Curio to Africa with two legions and five hundred horse to take the province from the Pompeian governor Attius Varus, who is backed by King Juba of Numidia. Curio is still fortifying a camp close to Utica, Varus\' base, when his pickets report a column of Juba\'s horse and foot marching to the town. He sends his cavalry ahead to meet it and hold it up while he brings his legions out of the works and forms them for battle. Caught strung out on the march, the royal troops give way before the legions are even deployed: most of the horsemen escape along the shore into Utica, but many of the foot are cut down. The scenario plays the cavalry\'s delaying action.',
    specialText: [
      'Dice orders: the Numidians have no cards, never draw and cannot play First Strike, and a Caesarian Counter Attack has no card to copy and does nothing. Instead, at the start of every Numidian turn they roll 2 order dice, and the Numidian player (human or computer) makes every choice for its own side.',
      'A flag makes the Numidians pick any one of their own units, which retreats as if hit by one flag (no flag may be ignored, and every hex it cannot take costs a block). Swords make them pick a unit that loses 1 block; units lost this way score banners for the Caesarians as usual.',
      'A green, blue or red face orders one unit of their choice of that class (light, medium or heavy) anywhere on the board; two equal faces order two different units, and a face with no eligible unit is lost. A helmet orders Saburra with his attached unit, or Saburra alone; a second helmet is lost.',
      'The Caesarians have 6 cards. The river from the top edge to the right edge (eight hexes) is impassable. No legion rules apply. Either side may be played by a human or the computer.',
    ],
    hint: 'Numidians roll dice instead of cards.',
  },
  '311': {
    blurb: 'Already hailed as imperator by his men after a first cavalry skirmish, Curio fears that his soldiers, who changed sides once at Corfinium, may be talked into changing back, and offers battle outside Utica. The Pompeian governor Attius Varus draws up facing him across a small, steep-sided valley that neither general will cross first. Varus\' horse and light troops ride down into it; Curio\'s cavalry and two cohorts drive the riders back and cut down the light troops left behind. Curio then leads his legions across the valley and up the far side, and the shaken Pompeians flee for their camp, many dying in the crush at the gates. Varus withdraws into Utica and Curio begins to wall it in; the easy victory leaves him dangerously confident.',
    specialText: [
      JULIAN_LEGIONS_BOTH,
      'Escape of the horse: any Pompeian cavalry unit (light, medium or heavy cavalry, not chariots) on one of the two left-edge hexes at the middle of the field may leave the board as one hex of movement. It scores 1 banner, kept for good, and is removed without scoring for the Caesarians; an attached leader leaves with it.',
      'Camp hold: the Caesarians hold 1 banner while a Caesarian unit stands on the Pompeian camp (top centre). It is lost when the unit leaves or is eliminated, and regained when a Caesarian unit is back on the camp; the camp stays on the board.',
      FORTIFIED_CAMPS,
    ],
    hint: 'Pompeian horse ride out of the valley.',
  },
  '312': {
    blurb: 'Confident after Utica, Curio presses on after Saburra, the Numidian general, who retreats as though he has only a small force. Curio sends his cavalry on a night march to the river Bagradas, where it routs Saburra\'s camp, and follows before dawn with his infantry, pressing on across the plain. Juba\'s main army, hidden behind Saburra, appears with its horsemen and light troops, and the Romans are surrounded on open ground in the heat of the day. Curio refuses to abandon his men and dies fighting; almost his entire army is destroyed. Africa is lost to Caesar for three years.',
    specialText: [
      'Julian legions (both armies): medium and heavy infantry on both sides, the Numidians included, may throw the pilum (range 2, always 1 die, not after moving 2 hexes) and may march: move 2 hexes if they do not battle that turn.',
      'Despite the name, there is no river on the map; the only terrain is three hills at the top right.',
    ],
    hint: 'Numidian horse spring the trap.',
  },
  '313': {
    blurb: 'In January 48 BC Caesar has slipped across the Adriatic with part of his army, leaving Mark Antony and Fufius Calenus at Brundisium to bring over the rest. Pompey\'s admiral Libo arrives with fifty ships, seals the harbour mouth from an island in front of it, burns some of the merchant ships and lands troops to drive off a cavalry post. Antony has to organise the defence with his men scattered, and the garrison gathers slowly behind the town\'s ramparts. The raid is beaten off, and Libo, short of fresh water, gives up the blockade.',
    specialText: [
      JULIAN_LEGIONS_BOTH,
      'Hand growth: the Caesarians start with only 2 cards. At the end of each of their turns, while their hand size is below 5, they draw 2 cards instead of 1 and their hand size rises by 1 (2, 3, 4, 5); after that they draw 1 as usual.',
      'The sea hexes along the top edge are played as a ford: units stop on entering, close combat in or into them is capped at 2 dice and missile fire from them at 1.',
      'Ship markers: the four sea hexes at the top right hold Caesarian transports and the four at the top left Pompeian landing beaches (markers, not units: they block nothing). At the start of its turn, before its card, a side with a unit on an enemy marker takes it: 1 banner, kept for good, and the marker is removed. The Pompeians take the transports; the Caesarians take the beaches.',
      `${RAMPARTS} The eight ramparts of Brindisi lie in the top right; the four Caesarian units that start on them (three light infantry and an auxiliary) retreat towards the bottom edge.`,
      'Four ordinary camps stand in the Caesarian half and score nothing; Antony and Fufius each start alone in one. A row of twelve hills runs across the middle of the field.',
      FORTIFIED_CAMPS,
    ],
    hint: 'Hold the harbour; the Caesarian hand grows to five.',
  },
  '314': {
    blurb: 'In the summer of 48 BC Caesar tries to starve out Pompey by walling in his army on the coast near Dyrrhachium with a vast line of forts and trenches, but Pompey builds a counter-line facing it, and his horses begin to starve. Two Gallic deserters from Caesar\'s cavalry show Pompey where the southern end of the Caesarian line is still unfinished. Pompey strikes there with everything he has, overruns a position held by the Ninth Legion and throws Caesar\'s counter-attack into confusion, costing him about a thousand men. Pompey fails to press the pursuit, and Caesar is said to have remarked that the enemy would have won that day had their general known how to win. Caesar falls back into Thessaly, and the war is decided at Pharsalus.',
    specialText: [
      JULIAN_LEGIONS_BOTH,
      CAESAR,
      `Caesar's siege line is ten rampart hexes across the middle of the field, with three gaps on the left; their protected edge faces the Pompeians (top). ${RAMPARTS}`,
      'Breakout: a Pompeian unit on any of the five left-hand hexes of the Caesarian baseline (bottom row) may leave the board as one hex of movement. It scores 1 banner, kept for good, and is removed without scoring for the Caesarians; an attached leader leaves with it. Leaving over a side edge does not count.',
      'Nine hills fill the bottom-right corner of the field.',
    ],
    hint: "Break out round the end of Caesar's lines.",
  },
  '315': {
    blurb: 'On the plain of Pharsalus in Thessaly, in August 48 BC, Pompey\'s army, roughly twice the size of Caesar\'s and with far more cavalry, offers battle at last. Pompey masses his horse on his left to ride round Caesar\'s right and take the line in the rear. Caesar, guessing the plan, has placed a hidden fourth line of picked cohorts behind his cavalry, and when the Pompeian horse drive the Caesarian riders back, these cohorts meet and rout them. They swing round onto the exposed Pompeian left while Caesar sends in his fresh third line; the camp is stormed and the army disintegrates. Pompey flees to Egypt, where he is murdered, and the war goes on without its leader.',
    specialText: [
      JULIAN_LEGIONS_BOTH,
      CAESAR,
      'The seven hills along the top edge (six in the right corner and one near the centre) are impassable. The single marsh hex on the left edge follows the usual marsh rules.',
    ],
    hint: "Pompey's horse against Caesar's veterans.",
  },
  '316': {
    blurb: 'In 47 BC, with Egypt settled, Caesar hurries across Asia Minor to deal with Pharnaces of Pontus, son of the great Mithridates, who has overrun Rome\'s allies in the region and beaten one of Caesar\'s lieutenants. Pharnaces holds a ridge near Zela, and Caesar fortifies a hill facing it. While the Romans are still digging, the Pontic army suddenly advances down into the valley and up the slope. Caesar\'s veterans form up in time, beat off the scythed chariots and storm the ridge, and the Pontic army is scattered in a matter of hours. Caesar\'s report to Rome is supposed to have run to just three words: "veni, vidi, vici".',
    specialText: [
      "Julian legions (Caesar's side only): Caesar's medium and heavy infantry may throw the pilum (range 2, always 1 die, not after moving 2 hexes) and may march: move 2 hexes if they do not battle that turn. The Pontic infantry has neither.",
      CAESAR,
      'Camp capture: at the start of its turn, before its card, a side with a unit on an enemy camp takes it: 1 banner, kept for good, and the camp is removed (it becomes open ground). The Caesarians can take the three Pontic camps (top); the Pontic army can take the Caesarian camp (bottom centre).',
      FORTIFIED_CAMPS,
    ],
    hint: 'Caesar storms the Pontic camps.',
  },
  '317': {
    blurb: 'In January 46 BC Caesar lands in Africa to face the Pompeian army of Scipio and King Juba, and soon marches out of Ruspina with a small column to forage. On open ground he is met by Titus Labienus, his former lieutenant in Gaul, with thousands of Numidian horsemen and light infantry, who ring the column in. Caesar\'s veterans form a thin line facing both ways and make short charges to push the riders back while the missiles fall around them. After a long, hard day, with Petreius arriving to add to the pressure, Caesar works his men out of the ring and back to camp. It was a narrow escape, and it taught him to respect the African cavalry.',
    specialText: [
      "Julian legions (Caesar's side only): Caesar's medium and heavy infantry may throw the pilum (range 2, always 1 die, not after moving 2 hexes) and may march: move 2 hexes if they do not battle that turn.",
      CAESAR,
      'Breakout: any Caesarian unit on a hex of the Numidian baseline (top row) may leave the board as one hex of movement. It scores 1 banner, kept for good, and is removed without scoring for the Numidians. Leaders count too: a leader who leaves scores 1 banner as well, so a unit that leaves with its attached leader scores 2, and a lone leader on the top row may leave on his own as part of his move.',
      'The Caesarians start in a compact block in the centre, ringed by the Numidians. The field is bare plain.',
    ],
    hint: 'Break out of the Numidian ring.',
  },
  '318': {
    blurb: 'In April 46 BC Caesar is besieging the port of Thapsus when Metellus Scipio and King Juba come to relieve it, and Scipio draws up his army on a narrow strip of ground between the sea and a salt lake, with elephants on his wings. Caesar\'s veterans, impatient to fight, force a trumpeter to sound the charge before the general has given the order, and Caesar goes forward with them. Missiles frighten the elephants, which turn and stampede through their own lines, and the Pompeian army collapses. Thousands are cut down in the rout. Scipio and Juba soon take their own lives, and the war in Africa is over within weeks.',
    specialText: [
      "Julian legions (both armies): medium and heavy infantry on both sides, Juba's heavy infantry included, may throw the pilum (range 2, always 1 die, not after moving 2 hexes) and may march: move 2 hexes if they do not battle that turn.",
      CAESAR,
      'The seven sea hexes down the right edge are impassable, but do not block line of sight. The nine marsh hexes in a band down the left side follow the usual marsh rules.',
      'The Pompeians field two elephants.',
    ],
    hint: 'Elephants against veterans by the sea.',
  },
  '319': {
    blurb: 'In March 45 BC, in southern Spain, Caesar fights the last great battle of the civil war against Gnaeus Pompeius and Titus Labienus, who have drawn up their army on high ground near Munda. Caesar\'s veterans have to attack uphill on a narrow front, and the fight is so close that he is said to have remarked that he had often fought for victory but this time for his life. The turning point comes when King Bogud\'s cavalry threatens the Pompeian camp and Labienus draws troops from the line to meet it; the Pompeians take it for a retreat, and their line gives way. Labienus is among the dead, Gnaeus is hunted down within weeks, and Caesar returns to Rome as master of the Roman world, less than a year before his murder.',
    specialText: [
      JULIAN_LEGIONS_BOTH,
      CAESAR,
      'The Pompeians hold a two-row ridge of nineteen hills across their side of the field.',
    ],
    hint: 'Veterans storm the Pompeian ridge.',
  },
};
