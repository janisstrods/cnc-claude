// 004 Ticinus River, 218 BC. Top: Carthaginians (Hannibal); bottom: Romans (Publius Scipio).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '004',
  context: {
    war: 'Second Punic War, 218–201 BC',
    text: [
      'In 218 BC Hannibal marched from Spain to carry the war into Italy. The consul Publius Cornelius Scipio, sent by sea to stop him, missed him on the Rhône; he sent his army on to Spain under his brother Gnaeus and went back to Italy to take over the legions in the Po valley. Hannibal crossed the Alps that autumn, losing perhaps half his men, and stormed the chief town of the Taurini.',
      'Scipio crossed the Po and bridged the Ticinus, moving fast while the Gauls of the plain were still wavering between the two sides. Late in 218 BC the two armies advanced towards each other along the north bank of the Po, and each commander rode ahead with his cavalry to scout. They met on the open plain west of the Ticinus.',
    ],
  },
  sides: {
    top: {
      name: 'Carthaginians',
      commanders: ['Hannibal Barca'],
      strength: 'Perhaps up to 6,000 horse, his whole cavalry; no figure survives for the battle',
      forces: 'Spanish and African heavy cavalry riding with bridles, and Numidian light horse riding without them.',
    },
    bottom: {
      name: 'Romans and allies',
      commanders: ['Publius Cornelius Scipio (consul)', 'Publius Scipio the younger, his son, aged 17'],
      strength: "Unknown: Scipio's whole cavalry and some light infantry; probably fewer horse than Hannibal's",
      forces: 'Roman and allied cavalry, Gallic horsemen and velites (light javelinmen).',
    },
  },
  map: {
    terrain: [
      { kind: 'river', points: [[18, -40], [10, 150], [22, 300], [8, 450], [18, 640]], width: 26, label: 'Po' },
      { kind: 'river', points: [[1060, 120], [930, 160], [872, 250], [885, 360], [862, 460], [835, 545], [820, 640]], width: 22, label: 'Ticinus' },
      { kind: 'camp', at: [500, 556], size: 26, label: 'Roman camp' },
    ],
    units: [
      { id: 'numL1', side: 'top', kind: 'lighthorse', label: 'Numidians', w: 60, h: 18 },
      { id: 'numL2', side: 'top', kind: 'lighthorse', w: 60, h: 18 },
      { id: 'hv1', side: 'top', kind: 'horse', w: 84, h: 26 },
      { id: 'hv2', side: 'top', kind: 'horse', label: 'Heavy horse', w: 84, h: 26 },
      { id: 'hv3', side: 'top', kind: 'horse', w: 84, h: 26 },
      { id: 'numR2', side: 'top', kind: 'lighthorse', w: 60, h: 18 },
      { id: 'numR1', side: 'top', kind: 'lighthorse', label: 'Numidians', w: 60, h: 18 },
      { id: 'gal1', side: 'bottom', kind: 'horse', label: 'Gallic horse', w: 70, h: 22 },
      { id: 'jav1', side: 'bottom', kind: 'light', label: 'Javelinmen', w: 90, h: 14 },
      { id: 'jav2', side: 'bottom', kind: 'light', w: 90, h: 14 },
      { id: 'gal2', side: 'bottom', kind: 'horse', w: 70, h: 22 },
      { id: 'rh1', side: 'bottom', kind: 'horse', w: 80, h: 24 },
      { id: 'rh2', side: 'bottom', kind: 'horse', label: 'Roman & allied horse', w: 80, h: 24 },
      { id: 'rh3', side: 'bottom', kind: 'horse', w: 80, h: 24 },
    ],
    phases: [
      {
        title: 'Scouting in force',
        caption: 'The two cavalry forces find each other by their dust. Scipio puts javelinmen and Gallic horse in front of his Roman cavalry; Hannibal masses his heavy horse in the centre, with Numidians on both wings.',
        at: {
          numL1: [130, 178],
          numL2: [215, 226],
          hv1: [390, 205],
          hv2: [500, 205],
          hv3: [610, 205],
          numR2: [720, 226],
          numR1: [800, 178],
          gal1: [300, 385],
          jav1: [425, 385],
          jav2: [575, 385],
          gal2: [700, 385],
          rh1: [390, 462],
          rh2: [500, 462],
          rh3: [610, 462],
        },
      },
      {
        title: 'Head-on clash',
        caption: "Hannibal's heavy horse charges at once. The javelinmen barely throw before fleeing back through the gaps in their own cavalry, and a hard, even fight follows in which many riders dismount to fight on foot.",
        at: {
          hv1: [400, 335],
          hv2: [500, 335],
          hv3: [600, 335],
          rh1: [400, 385],
          rh2: [500, 385],
          rh3: [600, 385],
          jav1: [370, 502],
          jav2: [630, 502],
        },
        arrows: [
          { side: 'top', points: [[390, 226], [397, 310]] },
          { side: 'top', points: [[500, 226], [500, 310]] },
          { side: 'top', points: [[610, 226], [603, 310]] },
          { side: 'bottom', points: [[420, 398], [350, 432], [362, 480]], style: 'retreat' },
          { side: 'bottom', points: [[580, 398], [650, 432], [638, 480]], style: 'retreat' },
        ],
      },
      {
        title: 'The Numidians close in',
        caption: 'Numidians ride round both flanks, cut down the javelinmen and strike the Roman rear. The cavalry breaks. Scipio, badly wounded, is brought off by a few riders; Polybius credits his seventeen-year-old son, the future Africanus.',
        at: {
          numL1: [250, 480],
          numL2: [380, 526],
          numR1: [750, 480],
          numR2: [620, 526],
        },
        broken: ['gal1', 'rh1', 'rh2', 'rh3', 'gal2'],
        gone: ['jav1', 'jav2'],
        arrows: [
          { side: 'top', points: [[130, 196], [125, 330], [150, 450], [190, 478]] },
          { side: 'top', points: [[800, 196], [805, 330], [835, 440], [810, 478]] },
          { side: 'top', points: [[215, 242], [260, 420], [350, 512]] },
          { side: 'top', points: [[720, 242], [700, 420], [650, 512]] },
          { side: 'bottom', points: [[500, 426], [500, 518]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: 'Carthaginian victory',
    losses: 'Unknown. The Roman javelinmen and cavalry suffered heavily and the consul was badly wounded; some 600 of his rearguard were caught at the river afterwards.',
    text: [
      "Scipio fell back across the Po to the colony of Placentia (Piacenza), breaking the bridge behind him. The clash showed that Hannibal's cavalry outclassed Rome's on open ground, and the wounded consul chose to wait in a strong position for his colleague, Tiberius Sempronius Longus, recalled from Sicily.",
      'The defeat swung the Gauls of the Po valley towards Hannibal. Soon afterwards some 2,000 Gallic foot and nearly 200 horse serving with the Romans attacked their camp and deserted to him, and the Boii made an alliance with him. About a month later the two consular armies, united, met him in battle at the Trebbia.',
    ],
  },
  sources: [
    'Polybius, Histories 3.60–67; 10.3 (the rescue)',
    'Livy, History of Rome 21.39–47',
    "J. F. Lazenby, Hannibal's War (1978)",
  ],
};

export default history;
