// 309 Ilerda, 49 BC. Top: Pompeians (Afranius); bottom: Caesarians (Julius Caesar).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '309',
  context: {
    war: "Caesar's Civil War, 49–45 BC: the Ilerda campaign in Spain, 49 BC",
    text: [
      "In January 49 BC Caesar crossed the Rubicon, and by mid-March Pompey had left Italy for Greece. Caesar turned first on Pompey's seven legions in Spain. Pompey's legates Lucius Afranius and Marcus Petreius joined five of them at Ilerda (Lleida), a hill town on the river Sicoris, while Marcus Varro held the far south.",
      "Caesar's legate Gaius Fabius camped opposite and bridged the river. When a flood broke one bridge, Lucius Munatius Plancus had to hold off Afranius on a hill until help came. Caesar then arrived with 900 horse. Between Ilerda and the hill of the Pompeian camp lay a low mound; holding it would cut the enemy off from the town, its bridge and the stores inside.",
    ],
  },
  sides: {
    top: {
      name: 'Pompeians and Spanish allies',
      commanders: ['Lucius Afranius (legate)', 'Marcus Petreius (legate)'],
      strength: 'Five legions, c. 80 cohorts of Spanish auxiliaries and c. 5,000 horse (Caesar)',
      forces: 'Legions long used to Spanish warfare, Spanish shield-bearers and light caetrati, and cavalry from both Spanish provinces.',
    },
    bottom: {
      name: 'Caesarians and Gallic allies',
      commanders: ['Gaius Julius Caesar', 'Gaius Fabius (legate)', 'Lucius Munatius Plancus (legate)'],
      strength: 'Six legions, c. 5,000 auxiliary foot and 3,000 horse, perhaps as many again from Gaul (Caesar)',
      forces: 'Veterans of the Gallic War, the Ninth and Fourteenth legions among them, with Gallic and Aquitanian horse and foot.',
    },
  },
  map: {
    terrain: [
      { kind: 'hills', points: [[110, -40], [470, -40], [482, 58], [420, 112], [220, 118], [100, 70]] },
      { kind: 'hills', points: [[640, -40], [835, -40], [832, 112], [796, 150], [768, 180], [712, 240], [656, 304], [596, 306], [560, 268], [616, 196], [662, 140], [646, 90], [636, 30]] },
      { kind: 'hills', points: [[420, 174], [500, 160], [556, 180], [552, 226], [468, 240], [414, 210]] },
      { kind: 'hills', points: [[690, 330], [760, 318], [792, 370], [776, 452], [704, 462], [672, 400]] },
      { kind: 'river', points: [[862, -30], [842, 110], [848, 250], [812, 390], [786, 520], [780, 630]], width: 24, label: 'Sicoris' },
      { kind: 'town', at: [750, 70], size: 28, label: 'Ilerda' },
      { kind: 'camp', at: [290, 60], size: 38, label: 'Pompeian camp' },
      { kind: 'camp', at: [300, 536], size: 36, label: "Caesar's camp" },
      { kind: 'label', at: [404, 262], text: 'The hillock' },
    ],
    units: [
      { id: 'pA', side: 'top', kind: 'foot', label: 'Pompeian legions', w: 100, h: 26 },
      { id: 'pB', side: 'top', kind: 'foot', w: 100, h: 26 },
      { id: 'coh', side: 'top', kind: 'foot', label: 'Afranian cohorts', w: 90, h: 24 },
      { id: 'fresh', side: 'top', kind: 'foot', label: 'Fresh cohorts', w: 72, h: 22 },
      { id: 'L1', side: 'bottom', kind: 'foot', w: 100, h: 28 },
      { id: 'L9', side: 'bottom', kind: 'foot', label: 'Ninth legion', w: 84, h: 28 },
      { id: 'Lw', side: 'bottom', kind: 'foot', label: 'Legion on the wing', w: 100, h: 28 },
      { id: 'ante', side: 'bottom', kind: 'foot', label: 'Forward troops', w: 64, h: 16 },
      { id: 'cav1', side: 'bottom', kind: 'horse', label: 'Caesarian horse' },
      { id: 'cav2', side: 'bottom', kind: 'horse' },
    ],
    phases: [
      {
        title: 'Race for the hillock',
        caption: "Caesar leads three legions out and orders the forward men of one legion to run and seize the mound. Afranian cohorts on guard before their camp take a shorter way and get there first.",
        at: {
          pA: [190, 160],
          pB: [320, 160],
          coh: [420, 140],
          L1: [320, 410],
          L9: [460, 410],
          Lw: [608, 378],
          ante: [574, 318],
          cav1: [180, 440],
          cav2: [690, 520],
        },
        arrows: [
          { side: 'bottom', points: [[566, 304], [540, 276], [516, 258]] },
          { side: 'top', points: [[426, 154], [452, 180], [468, 196]] },
        ],
      },
      {
        title: 'Fighting in the Spanish way',
        caption: 'The Afranians fight as they learned against Spanish tribes, darting forward in loose order and falling back without shame. The forward troops are thrown back, and the legion on that wing gives way to a nearby hill.',
        at: {
          coh: [486, 200],
          ante: [548, 336],
          Lw: [730, 400],
        },
        broken: ['ante'],
        arrows: [
          { side: 'top', points: [[490, 216], [504, 270], [528, 306]] },
          { side: 'bottom', points: [[590, 380], [636, 394], [668, 400]], style: 'retreat' },
        ],
      },
      {
        title: 'The Ninth under the walls',
        caption: 'Caesar brings up the Ninth, which drives the Afranians back to Ilerda but pursues onto a spur below the walls, steep on both sides and only three cohorts wide. Afranius sends fresh cohorts from his camp through the town.',
        at: {
          L9: [630, 252, 45],
          coh: [702, 184, 45],
          fresh: [792, 156],
        },
        gone: ['ante'],
        arrows: [
          { side: 'bottom', points: [[462, 392], [510, 340], [566, 306]] },
          { side: 'top', points: [[520, 196], [584, 178], [644, 170]], style: 'retreat' },
          { side: 'top', points: [[340, 84], [480, 44], [620, 40], [708, 58]] },
        ],
      },
      {
        title: 'Swords drawn',
        caption: "After five hours, their javelins spent, the Ninth's men draw swords, charge uphill and drive the enemy into the town. Caesar's horse climb the slopes on both sides and cover the legion as it withdraws.",
        at: {
          L9: [580, 380],
          cav1: [598, 196],
          cav2: [740, 250],
        },
        gone: ['coh', 'fresh'],
        arrows: [
          { side: 'bottom', points: [[620, 290], [604, 324], [594, 352]], style: 'retreat' },
          { side: 'top', points: [[716, 170], [734, 132], [744, 108]], style: 'retreat' },
          { side: 'bottom', points: [[200, 428], [380, 330], [552, 224]] },
          { side: 'bottom', points: [[690, 506], [648, 430], [666, 340], [718, 282]] },
        ],
      },
    ],
  },
  outcome: {
    winner: 'draw',
    result: 'Indecisive: both sides claimed the day',
    losses: 'Caesarians: c. 70 dead, among them Quintus Fulginius, a senior centurion of the Fourteenth, and over 600 wounded. Afranians: over 200 dead, including the chief centurion Titus Caecilius (Caesar).',
    text: [
      "The Afranians fortified the mound. Within two days a storm and melting snow swept away both of Fabius' bridges, stranding Caesar between the Sicoris and the Cinga, short of food, while the enemy kept the bridge at Ilerda. He had light boats built on the British pattern, carried them 22 miles to cross the river and restored his supplies.",
      'Spanish communities then went over to Caesar. When Afranius and Petreius tried to retreat across the Ebro, his legions waded a ford he had made and outmarched them. Caesar refused battle and cut them off from water until they surrendered. He disbanded their army, Varro gave up Further Spain, and after Massilia fell Caesar turned against Pompey himself.',
    ],
  },
  sources: [
    'Caesar, Civil War 1.37–87',
    'Cassius Dio, Roman History 41.20–23',
    'Appian, Civil Wars 2.42–43',
    'Adrian Goldsworthy, Caesar: Life of a Colossus (2006)',
  ],
};

export default history;
