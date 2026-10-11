// Briefing texts of the 23 Expansion #2 battles (Rome & the Barbarians, 201-223): original summaries of the
// historical battles and plain-language paraphrases of their special rules. The setups are in data/201.json-223.json.

import type { ScenarioTexts } from './exp1-texts';
import { CAESAR, FORTIFIED_CAMPS, RAMPARTS } from './rule-texts';

/** The Marian legions of the Roman side (rules-reference §18.2). */
const MARIAN_LEGIONS = 'Marian legions: Roman medium and heavy infantry may throw the pilum: range 2, always 1 die, not after moving 2 hexes.';
/** Spartacus' leader ability (§18.3). */
const SPARTACUS = 'Spartacus: while he is on the board, the Slaves roll Command + 2 dice when they play I Am Spartacus (also when a Counter Attack copies it).';

export const EXTRA_EXP2: Record<string, ScenarioTexts> = {
  '201': {
    blurb: 'In 225 BC a great Gallic host of Insubres, Boii and mercenary Gaesatae, led by the kings Aneroestes and Concolitanus, crosses the Apennines and floods into Etruria. A Roman army under a praetor, shadowing them, is drawn into a battle on bad terms and badly beaten; the survivors cling to a hillside. The Gauls, heavy with plunder, then turn for home along the coast, straight towards the consular armies gathering to cut them off.',
    specialText: [
      'Gallic camps: the three fortified camps in the Gallic centre each hold a Gallic cavalry unit. At the start of the Roman turn, before its card, every camp with a Roman unit on it is taken and removed (it becomes open ground). The first two camps score nothing; taking the third gives the Romans 1 banner, which they keep. The Gauls capture nothing.',
      FORTIFIED_CAMPS,
      'Barbarian light chariots (one Gallic): move up to 3 hexes and may still battle; they roll 2 dice in close combat (3 at full strength, when they may also ignore 1 flag), ignore the first sword rolled against them and can always evade.',
    ],
    hint: 'Tear down three Gallic camps.',
  },
  '202': {
    blurb: 'Laden with plunder, the Gauls follow the Tyrrhenian coast near Telamon and find the consul Atilius Regulus, just back from Sardinia, marching to meet them, while a second consul, Aemilius Papus, closes in from behind. Regulus is killed in the first scramble for a hill beside the road, but his cavalry holds it. Forced to fight facing both ways, the Gauls are worn down by Roman missiles and discipline; tens of thousands die, and Rome soon goes on to conquer the Po valley.',
    specialText: [
      'The sea down the left edge is impassable.',
      'Hill control: at the end of every player turn, the side with more units on the nine hills holds 2 banners (lone leaders do not count). If both sides have the same number, including none, nobody holds them. Control can change hands every turn.',
      "Regulus' wing starts on the top rows, on the Gallic baseline. Like every Roman unit it retreats and evades down the board, through the Gauls.",
      'Barbarian light chariots (two Gallic): move up to 3 hexes and may still battle; they roll 2 dice in close combat (3 at full strength, when they may also ignore 1 flag), ignore the first sword rolled against them and can always evade.',
    ],
    hint: 'Romans front and rear; fight for the hills.',
  },
  '203': {
    blurb: "Three years later the Insubres, with Gaesatae allies, besiege Clastidium, a Roman ally on the Po. The consul Marcus Claudius Marcellus hurries up with cavalry and a few foot soldiers. Their king Britomartus (Viridomarus) rides out in front, and Marcellus charges and kills him in single combat; the Gauls break. Marcellus dedicated the king's armour to Jupiter, the third and last time a Roman general took the spolia opima.",
    hint: 'Roman horse hunt a Gallic king; first to 4.',
  },
  '204': {
    blurb: "In 105 BC the Cimbri, Teutones and their allies sit on the Rhone beside Arausio, with two Roman armies in front of them. The consul Mallius Maximus and the proconsul Caepio cannot stand each other: Caepio will neither share a camp nor follow a common plan. He attacks alone and is overwhelmed, and the consul's army is swept away with it. Some 80,000 Romans may have died, the worst defeat since Cannae, and the panic carries Gaius Marius to the consulship and the reform of the legions.",
    specialText: [
      'The Rhone down the right edge is impassable.',
      'Camp occupation: the Germans hold 1 banner while one of their units stands on either Roman camp (bottom right). Holding both is still just 1 banner. It is lost when the unit leaves or is eliminated, and regained when a German unit is back on a camp. The camps stay on the board.',
      FORTIFIED_CAMPS,
    ],
    hint: 'Roman disaster; take a camp on the Rhone.',
  },
  '205': {
    blurb: "In 103 BC the second slave revolt in Sicily is in its third year. The rebel kings Salvius, who calls himself Tryphon, and Athenion, a Cilician herdsman and prophet, face the praetor Lucius Lucullus and a fresh army near Scirthaea. The slaves have the numbers, but the legionaries' discipline carries the field; by one ancient account Athenion, badly wounded, saves himself by lying among the dead until night. Lucullus fails to end the war, which drags on until Manius Aquillius finishes it two years later.",
    hint: 'Legions against a slave army.',
  },
  '206': {
    blurb: "Marius waits at the foot of the Alps near Aquae Sextiae (Aix) and lets the Ambrones and Teutones march past his hillside camp for days. The Ambrones attack across a stream and are thrown back by Ligurian auxiliaries and then by the legions charging down the slope. Two days later, as the Teutones close on the Roman line, Marcellus bursts from the wooded hills behind them with a hidden force at Marius' signal. The Teutones are destroyed, and their king Teutobod is taken in flight.",
    specialText: [
      MARIAN_LEGIONS,
      "Ambush: Marcellus' force (light infantry, two auxilia, light cavalry and Marcellus) starts off the board. When the Romans play any Leadership card or Order Light Troops (or a Counter Attack copying one), even on the first turn, the force enters on empty hexes of the German baseline; the card is used for the entry alone.",
      'An Inspired Leadership card fixes the section of the board; Leadership Any Section and Order Light Troops let the Roman player choose. Placing a unit counts as its first hex of movement, after which it moves and battles normally. Units that cannot be placed wait for a later trigger. The force retreats towards the Roman side.',
    ],
    hint: "Ambush in the Germans' rear.",
  },
  '207': {
    blurb: "In July 101 BC the Cimbri, having crossed the Alps into the Po valley, meet Marius and Catulus on the Raudine plain near Vercellae. By Roman accounts the Cimbri, drawn up in a huge square, are blinded by sun and dust and wilt in the heat, while Marius' own wing loses its way in the morning mist and misses much of the fighting. The Cimbri are cut down, and the survivors, women and children among them, take their own lives. The war ends; the credit is long disputed between Marius, Catulus and the young Sulla.",
    specialText: [
      MARIAN_LEGIONS,
    ],
    hint: 'Open plain; legions against the Cimbri.',
  },
  '208': {
    blurb: 'In 73 BC Spartacus and a few dozen gladiators break out of a training school at Capua and gather runaways on the slopes of Vesuvius. The praetor Claudius Glaber, with about 3,000 hastily raised men, camps across the one easy path up and waits for them to starve. The rebels plait ropes from wild vines, climb down the cliffs on the far side and fall on the Roman camp from behind. The easy victory brings thousands of slaves to the rebels and starts the Third Servile War.',
    specialText: [
      MARIAN_LEGIONS,
      SPARTACUS,
      'The steep hills of the mountain are impassable.',
      'Camp capture: at the start of the Slave turn, before its card, every Roman camp with a Slave unit on it is taken: 1 banner each, kept, and the camp is removed. Two of the four camps hold only a lone Roman leader (Glaber and Varinius), who must be driven out first.',
      'The Slave units that start below the Roman camp retreat and evade up the board, towards their own edge.',
      'Roman fortified camps and ramparts keep their usual rules: a unit in a camp rolls 1 fewer die, and a foot unit in a camp ignores 1 sword and may ignore 1 flag; a foot unit on a rampart ignores the first sword and may ignore 1 extra flag against attacks across its front edge.',
    ],
    hint: 'Slaves descend on the Roman camps.',
  },
  '209': {
    blurb: "Spartacus' rebel army has split: the Gauls and Germans under Crixus have broken away to plunder on their own. Near Mount Garganus in Apulia the consul Gellius and the praetor Arrius catch them with their legions. Crixus is killed, and perhaps two thirds of his men with him, a blow that Spartacus would later avenge on Roman prisoners.",
    specialText: [
      MARIAN_LEGIONS,
      'The thirteen steep hills of Mount Garganus across the top centre are impassable.',
      'Crixus leads the Slaves. Spartacus is not present, so there is no I Am Spartacus bonus.',
    ],
    hint: 'Legions against Crixus under Mount Garganus.',
  },
  '210': {
    blurb: 'In 72 BC both consuls, Gellius and Lentulus, march against the rebels as they move north through the Apennine hills of Picenum, hoping to catch Spartacus between two armies. Instead he turns on each consul in turn among the hills and defeats them separately. To honour the fallen Crixus he makes 300 Roman prisoners fight as gladiators at his funeral, then marches on towards the Alps.',
    specialText: [
      MARIAN_LEGIONS,
      SPARTACUS,
      'Two Roman commands: Lentulus (left of the hill chain, grey blocks) and Gellius (right). Every card orders units of one command only, tactic cards such as Clash of Shields, Darken the Sky and Rally included; the player names the command when a card could order either. Leaders belong to no command and support everyone.',
      'Rolling Fire: a Slave infantry unit on a hill that was ordered by a card (not a Tactic card, though a Counter Attack copying a section or troop card counts) and has not moved may use its battle to roll burning logs down the slope instead, even when adjacent to an enemy.',
      'The logs start at its hex and run up to 3 hexes towards the Roman edge, each step to one of the two hexes one row nearer; the player picks the path, which may not enter a hill and ends early on the first hex that is not open ground. Every unit in the path, friend or foe, nearest first, is attacked with 2 dice: only its class symbol hits, no flag may be ignored, and there is no battle back. A lone leader in the path evades at once. Then the rolling unit loses 1 block; the Romans score a banner if that eliminates it.',
      'Exit: any Slave unit on a hex of the Roman baseline (bottom row) may leave the board as one hex of movement. It scores 1 banner for the Slaves, kept for good, and is removed without scoring for the Romans; an attached leader leaves with it.',
    ],
    hint: 'Burning logs; two Roman commands; break out.',
  },
  '211': {
    blurb: 'Marcus Crassus takes over the war in 72 BC with six new legions and strict orders to his lieutenant Mummius: follow Spartacus, but do not fight him. Mummius, with two legions, ignores the order and offers battle. Spartacus beats him; many Romans throw away their weapons and run. Crassus restores discipline the old way, by decimation: 500 of the runaways are divided into groups of ten, and one man in each group is put to death.',
    specialText: [
      MARIAN_LEGIONS,
      SPARTACUS,
      'Camp storm: at the start of the Roman turn, before its card, if Roman units stand on at least 2 of the 3 Slave camps at once, the Romans score 1 banner, kept for good, and all three camps are removed. One camp alone scores nothing. The Slaves capture nothing.',
      FORTIFIED_CAMPS,
    ],
    hint: 'Storm two Slave camps at once.',
  },
  '212': {
    blurb: 'Early in 71 BC Spartacus is hemmed into the toe of Italy, and the pirates he hired to ferry his army to Sicily sail away without him. Crassus builds a ditch and wall across the narrow neck of land, tens of kilometres long, to starve him out. On a snowy night Spartacus fills part of the ditch with earth, brush and the bodies of prisoners and breaks through with much of his army. It is a rare reverse for Crassus, but the rebels only run on towards their final battle.',
    specialText: [
      MARIAN_LEGIONS,
      SPARTACUS,
      'The ditch (nine hexes across the centre and right): any unit or lone leader entering it stops. It has no other effect: no dice limits, fighting from and into it is allowed, and it does not block sight.',
      'Exit: a Slave foot unit (not the cavalry) on a hex of the Roman baseline may leave the board as one hex of movement. It scores 1 banner, kept for good, and is removed without scoring for the Romans; an attached leader leaves with it.',
      'The three Slave light cavalry start beside and behind the Roman line and retreat and evade towards the top.',
      'The Roman ramparts and four camps keep their usual rules: a unit in a camp rolls 1 fewer die, and a foot unit in a camp ignores 1 sword and may ignore 1 flag; a foot unit on a rampart ignores the first sword and may ignore 1 extra flag against attacks across its front edge.',
    ],
    hint: 'Slip past the ditch and escape.',
  },
  '213': {
    blurb: 'After the breakout, a band of Gauls and Germans under Castus and Cannicus camps apart from Spartacus beside a lake in Lucania. Crassus brings several columns against the camp and falls on it. The rebels fight with stubborn courage, but about 12,000 are killed; Plutarch claims that only two of them were found wounded in the back. Spartacus pulls back towards the mountains.',
    specialText: [
      MARIAN_LEGIONS,
      SPARTACUS,
      'The Lucanian Lake on the right edge is impassable.',
      "Camp hold: the Romans hold 1 banner while a Roman unit stands on the Slave camp (Cannicus' infantry starts on it). It is lost when the unit leaves or is eliminated, and regained when a Roman unit is back on the camp.",
      'Two detached groups start behind the enemy line: the Romans of Marcius (top left) and the Slaves of Castus (bottom left). Each retreats and evades towards its own side.',
      FORTIFIED_CAMPS,
    ],
    hint: 'Hold the Slave camp; split armies.',
  },
  '214': {
    blurb: 'In 71 BC Crassus finally corners Spartacus in Lucania on the river Silarus. Spartacus, it is said, stabs his own horse to show that he will win or die on foot. He hews his way towards Crassus himself, cutting down two centurions on the way, but is surrounded and killed. Some 6,000 survivors are crucified along the Appian Way from Capua to Rome, and Pompey, arriving from Spain, claims the credit for mopping up the fugitives.',
    specialText: [
      MARIAN_LEGIONS,
      SPARTACUS,
      'Camp hold: the Slaves hold 1 banner while one of their units stands on either Roman camp on the Roman right (a palisade camp with ramparts, and a tent camp on the baseline). Holding both is still just 1 banner. It is lost when the unit leaves or is eliminated, and regained later.',
      'No room to retreat: a Slave unit whose retreat ends on its own baseline row (the top row) with retreat hexes it could not take is eliminated instead of losing blocks, and the Romans score a banner. Evades, and a retreat that ends by joining a leader, are not affected.',
      'The Roman camps and ramparts keep their usual rules: a unit in a camp rolls 1 fewer die, and a foot unit in a camp ignores 1 sword and may ignore 1 flag; a foot unit on a rampart ignores the first sword and may ignore 1 extra flag against attacks across its front edge.',
    ],
    hint: "Spartacus' last stand; no room to retreat.",
  },
  '215': {
    blurb: "In 57 BC the Belgic Nervii, hidden in the woods beyond the Sabis, burst across the river just as Caesar's legions start to pitch camp. With helmets and shields still in the baggage train, whole legions are nearly overrun. Caesar snatches a shield, runs to the front line and rallies the men, and Labienus, who has stormed the Belgic camp on the left, sends the Tenth Legion back to the rescue. The Nervii are almost annihilated; Caesar writes that their senate shrank from 600 men to three.",
    specialText: [
      MARIAN_LEGIONS,
      CAESAR,
      'The two Tenth Legion units (the marked heavy infantry) have the pilum like the other legions and may march: move 2 hexes if they do not battle. They are ordered and fight as separate units.',
      'The Sabis is fordable everywhere.',
      'Camps: at the start of its turn, before its card, a side with a unit on an enemy camp takes it: 1 banner, kept for good, and the tile becomes open ground. The Romans can take the Belgic camp (fortified, top left); the Belgae can take the unfinished Roman camp (a single rampart hex at the bottom left).',
      FORTIFIED_CAMPS,
    ],
    hint: 'Caesar rallies the legions; two camps.',
  },
  '216': {
    blurb: 'In 56 BC the young Publius Crassus, sent by Caesar to subdue Aquitania, marches on the town of the Sotiates. Their king Adiatuanus attacks the column with cavalry and is beaten off, but as the Romans follow, the Sotiate infantry spring an ambush from a valley. After a long fight the Romans prevail, and siege works soon threaten the town. Adiatuanus breaks out with 600 sworn companions, is driven back, and the Sotiates surrender.',
    specialText: [
      MARIAN_LEGIONS,
    ],
    hint: 'Gallic horse, then an ambush.',
  },
  '217': {
    blurb: 'In late summer 55 BC Caesar sails to Britain to punish Britons who have helped his enemies in Gaul. The Britons line the beach with infantry, horse and chariots, while the cavalry transports lie weather-bound in port. Laden legionaries hesitate to leap into deep water until the eagle-bearer of the Tenth Legion jumps in with the standard and the rest follow him. After a confused fight in the surf the Romans form up on the beach and push the Britons back.',
    specialText: [
      MARIAN_LEGIONS,
      CAESAR,
      'The Tenth Legion (the marked heavy infantry) has the pilum like the other legions and may march: move 2 hexes if it does not battle.',
      'Barbarian light chariots (two British): move up to 3 hexes and may still battle; they roll 2 dice in close combat (3 at full strength, when they may also ignore 1 flag), ignore the first sword rolled against them and can always evade.',
      'The sea hexes along the Roman baseline are played as a ford: units stop on entering, close combat in or into them is capped at 2 dice and missile fire from them at 1. Eight Roman units start standing in it.',
    ],
    hint: 'Landing through the surf.',
  },
  '218': {
    blurb: 'In 54 BC Caesar returns with five legions and 2,000 horse. The Britons fall back from the beach and make a stand at a river crossing, probably the Great Stour near Canterbury. Their chariots and horse harass the Roman column, but the Roman cavalry drives them off, and the Seventh Legion storms the fort in the woods behind. A storm that wrecks much of the fleet cuts the pursuit short, and the Britons rally under Cassivellaunus.',
    specialText: [
      MARIAN_LEGIONS,
      CAESAR,
      'Barbarian light chariots (seven British): move up to 3 hexes and may still battle; they roll 2 dice in close combat (3 at full strength, when they may also ignore 1 flag), ignore the first sword rolled against them and can always evade.',
      'The Britons field only chariots and cavalry: no infantry at all.',
      'The Stour is fordable everywhere.',
    ],
    hint: 'Chariots against Caesar at a ford.',
  },
  '219': {
    blurb: "Cassivellaunus has given up set-piece battles and harries Caesar's marching columns with chariots and swift raids. While three legions and all the cavalry under Gaius Trebonius are out foraging, the Britons charge in from every side at once, even at the standards. They are beaten off with heavy loss. Caesar notes that the Britons never again gathered in full strength to fight him in the open.",
    specialText: [
      MARIAN_LEGIONS,
      'Barbarian light chariots (four British): move up to 3 hexes and may still battle; they roll 2 dice in close combat (3 at full strength, when they may also ignore 1 flag), ignore the first sword rolled against them and can always evade.',
      'Section clear: at the end of each Roman turn, every section of the board (left, centre, right) with no Briton unit in it scores 1 banner for the Romans. It is held only while the section stays clear: the moment a Briton unit stands in it, by any means, it is lost, and it can be regained later. A unit on a boundary hex is in both sections; lone leaders never count.',
    ],
    hint: 'Clear the Britons out of whole sections.',
  },
  '220': {
    blurb: 'In September AD 9 Publius Quinctilius Varus leads three legions and their auxiliaries back towards the Rhine. His trusted guide Arminius, a Cheruscan prince with Roman citizenship, reports a local revolt and leads the column off the road into a region of forest and marsh, then slips away to join the tribes lying in wait. Rain, narrow trails and the baggage train string the Romans out over miles. Unable to form a battle line, they are struck from the trees again and again.',
    specialText: [
      MARIAN_LEGIONS,
      'The nine marsh hexes behind the Roman line and the two broken-ground hexes on the flanks follow the usual rules.',
    ],
    hint: 'Ambushed legions in forest and marsh.',
  },
  '221': {
    blurb: "After the first day's slaughter, the Roman survivors burn their wagons, build a hasty marching camp and try to fight their way out at dawn. The Germans are all around them, storms spoil the Roman archery, and the cavalry under Vala abandons the infantry. By the third day the army is destroyed and Varus has taken his own life. Rome never again tried to hold a province east of the Rhine.",
    specialText: [
      MARIAN_LEGIONS,
      'The Roman marching camp is a ring of ramparts around one fortified camp hex.',
      'Camp capture: at the start of the German turn, before its card, if a German unit stands on the camp hex in the middle, the Germans score 2 banners, kept for good, and the camp is removed. The surrounding ramparts are not camps and stay.',
      'Exit: any Roman unit on a hex of the German baseline (top row) may leave the board as one hex of movement. It scores 1 banner, kept for good, and is removed without scoring for the Germans; an attached leader leaves with it.',
      RAMPARTS,
      FORTIFIED_CAMPS,
    ],
    hint: 'Break out of the camp or die in it.',
  },
  '222': {
    blurb: 'In AD 16 Germanicus, nephew of the emperor, invades Germany by river and sea. After the clash at Idistaviso, Arminius and his allies fall back to a long earthwork built by the Angrivarii, squeezed between the Weser and a wooded hillside. Germanicus clears the defenders with slingers and artillery, then storms the wall himself. Packed between the Romans and the river, the Germans suffer terribly, though the emperor soon recalls Germanicus, and Rome withdraws.',
    specialText: [
      MARIAN_LEGIONS,
      'The Romans move first.',
      'The river down the right edge is impassable.',
      'Rampart hold: the seven ramparts of the Angrivarian wall start in German hands, with their protected edge towards the Romans. The Romans hold 1 banner for each rampart hex with a Roman unit on it, at most 2. A banner is lost when its unit leaves or is eliminated, and regained later. The ramparts stay.',
      RAMPARTS,
    ],
    hint: 'Storm the German rampart.',
  },
  '223': {
    blurb: "In AD 51, after nine years of guerrilla war, Caratacus makes a stand in the Welsh hills, on a steep height above a river, with stone ramparts across the easy approaches. Governor Ostorius Scapula's army fights across the river and up the slope under a hail of missiles, then locks shields and tears down the first wall. The Britons, with little armour, are driven back from rampart to rampart. Caratacus escapes, but is handed over by Queen Cartimandua of the Brigantes and taken to Rome (the site of the battle is uncertain).",
    specialText: [
      MARIAN_LEGIONS,
      'Very steep hills: a unit moving from lower ground onto a hill stops and may not battle that turn, and a momentum advance up onto a hill gives no bonus combat. In close combat, a unit fighting uphill rolls at most 1 die, downhill at most 2 and from hill to hill at most 3 (card and leader bonuses add on top). Ranged combat and line of sight are normal.',
      'The Severn is fordable everywhere (where river and hill both apply, the lower dice limit wins).',
      'Rampart breakers: the six Briton-held ramparts become open ground the moment a Roman unit enters or passes through one (move, advance, retreat or evade). The Britons never remove them.',
      RAMPARTS,
    ],
    hint: 'Storm the steep hill and break the ramparts.',
  },
};
