// 008 Dertosa (Ebro), 215 BC. Top: Carthaginians (Hasdrubal); bottom: Romans (Gnaeus & Publius Scipio).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '008',
  context: {
    war: 'Second Punic War, 218–201 BC: the war in Spain',
    text: [
      'When Hannibal marched on Italy in 218 BC he left his brother Hasdrubal to hold Spain. Rome sent Gnaeus Cornelius Scipio there with an army, and his brother Publius joined him in 217 BC. Their task was to stop reinforcements from reaching Hannibal.',
      'After Cannae, Carthage ordered Hasdrubal to march to Italy. He raised money and led his army towards the Ebro. To delay his march, the Scipios crossed the Ebro and besieged Ibera, the richest town of the district, and when Hasdrubal attacked a town allied to Rome they marched against him. For several days the camps lay about five miles apart, with skirmishing between them, until both armies came down to the plain.',
    ],
  },
  sides: {
    top: {
      name: 'Carthaginians, Africans and Spaniards',
      commanders: ['Hasdrubal Barca'],
      strength: 'No figures survive; Livy judged the two armies about equal',
      forces: 'Spanish foot in the centre, Carthaginian and African foot with mercenaries on the wings, Numidian and Moorish horse, some elephants.',
    },
    bottom: {
      name: 'Romans and Italian allies',
      commanders: ['Gnaeus Cornelius Scipio Calvus', 'Publius Cornelius Scipio'],
      strength: 'Unknown: most of a consular army sent in 218 BC and 8,000 men brought in 217 BC',
      forces: 'Legions in three lines, with light infantry among the ranks and cavalry on both wings.',
    },
  },
  map: {
    terrain: [
      { kind: 'camp', at: [440, 46], size: 30, label: "Hasdrubal's camp" },
      { kind: 'camp', at: [500, 548], size: 24, label: 'Roman camp' },
    ],
    units: [
      { id: 'numid', side: 'top', kind: 'lighthorse', label: 'Numidians', w: 70, h: 18 },
      { id: 'eleL', side: 'top', kind: 'elephants' },
      { id: 'poeni', side: 'top', kind: 'foot', label: 'Carthaginians', w: 100, h: 36 },
      { id: 'sp1', side: 'top', kind: 'warband', w: 106, h: 30 },
      { id: 'sp2', side: 'top', kind: 'warband', label: 'Spaniards', w: 106, h: 30 },
      { id: 'sp3', side: 'top', kind: 'warband', w: 106, h: 30 },
      { id: 'afr', side: 'top', kind: 'foot', label: 'Africans & mercenaries', w: 100, h: 36 },
      { id: 'cav', side: 'top', kind: 'horse', label: 'Cavalry', w: 66, h: 22 },
      { id: 'eleR', side: 'top', kind: 'elephants', label: 'Elephants' },
      { id: 'hasd', side: 'top', kind: 'horse', label: 'Hasdrubal', w: 50, h: 18 },
      { id: 'rcavL', side: 'bottom', kind: 'horse', label: 'Roman horse', w: 66, h: 22 },
      { id: 'leg1', side: 'bottom', kind: 'foot', w: 110, h: 60 },
      { id: 'leg2', side: 'bottom', kind: 'foot', label: 'Legions (three lines)', w: 110, h: 60 },
      { id: 'leg3', side: 'bottom', kind: 'foot', w: 110, h: 60 },
      { id: 'rcavR', side: 'bottom', kind: 'horse', w: 66, h: 22 },
    ],
    phases: [
      {
        title: 'Deployment',
        caption: 'Hasdrubal puts his Spaniards in the centre, Carthaginian foot and Numidians on his right, Africans, mercenaries and the other horse on his left. Livy does not place the elephants. The Romans form three lines.',
        at: {
          numid: [95, 196],
          eleL: [110, 242],
          poeni: [228, 206],
          sp1: [362, 214],
          sp2: [500, 214],
          sp3: [638, 214],
          afr: [772, 206],
          cav: [905, 196],
          eleR: [895, 242],
          hasd: [600, 116],
          rcavL: [110, 420],
          leg1: [362, 425],
          leg2: [500, 425],
          leg3: [638, 425],
          rcavR: [890, 420],
        },
      },
      {
        title: 'The Spaniards run',
        caption: 'The Spaniards in the centre, unwilling to be led off to Italy, give way as soon as the javelins fly and flee when the legions charge. The Roman centre pushes into the gap.',
        at: {
          leg1: [362, 330],
          leg2: [500, 286],
          leg3: [638, 330],
        },
        gone: ['sp1', 'sp2', 'sp3'],
        arrows: [
          { side: 'bottom', points: [[362, 456], [362, 372]] },
          { side: 'bottom', points: [[500, 456], [500, 328]] },
          { side: 'bottom', points: [[638, 456], [638, 372]] },
          { side: 'top', points: [[362, 196], [332, 112], [300, 22]], style: 'rout' },
          { side: 'top', points: [[500, 196], [516, 110], [536, 22]], style: 'rout' },
          { side: 'top', points: [[638, 196], [696, 118], [740, 22]], style: 'rout' },
        ],
      },
      {
        title: 'Fighting on two fronts',
        caption: 'The Carthaginian and African wings wheel in against both Roman flanks, and the legions turn outward to meet them. With the centre gone, the Numidian and Moorish horse flee, driving the elephants before them.',
        at: {
          poeni: [276, 330, 90],
          afr: [724, 330, -90],
          leg1: [372, 330, -90],
          leg3: [628, 330, 90],
          leg2: [500, 240],
        },
        gone: ['numid', 'eleL', 'cav', 'eleR'],
        arrows: [
          { side: 'top', points: [[226, 232], [236, 290], [252, 318]] },
          { side: 'top', points: [[774, 232], [764, 290], [748, 318]] },
          { side: 'top', points: [[95, 178], [70, 92], [44, 12]], style: 'rout' },
          { side: 'top', points: [[905, 178], [930, 92], [956, 12]], style: 'rout' },
        ],
      },
      {
        title: 'Both wings beaten',
        caption: 'The Romans win both fights. Hasdrubal, who has watched to the end, escapes with a few followers, and the legions storm and plunder his camp.',
        at: {
          poeni: [200, 250, 60],
          afr: [800, 250, -60],
          leg1: [330, 318, -70],
          leg3: [670, 318, 70],
          leg2: [470, 130],
        },
        broken: ['poeni', 'afr'],
        gone: ['hasd'],
        arrows: [
          { side: 'bottom', points: [[500, 280], [486, 220], [474, 172]] },
          { side: 'top', points: [[176, 222], [130, 130], [96, 30]], style: 'rout' },
          { side: 'top', points: [[824, 222], [870, 130], [904, 30]], style: 'rout' },
          { side: 'top', points: [[622, 104], [680, 62], [732, 12]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Decisive Roman victory',
    losses: 'No figures survive. Livy says very many of Hasdrubal’s men fell, and few would have escaped had the Spaniards not fled so early.',
    text: [
      'The battle mattered more for what it prevented than for what it won. Hasdrubal could neither march to Italy nor feel safe in Spain, and wavering Spanish peoples went over to Rome. Carthage sent to Spain the army that Mago, Hannibal’s brother, had been gathering for Italy: some 12,000 foot, 1,500 horse and 20 elephants.',
      'Rome had kept the war in Spain from feeding the war in Italy. Hasdrubal finally slipped away after Baecula in 208 BC, only to be destroyed at the Metaurus the next year.',
    ],
  },
  sources: [
    'Livy, History of Rome 23.26–29, 23.32',
    'Polybius, Histories 3.76, 3.97 (the Scipios in Spain)',
    "J. F. Lazenby, Hannibal's War (1978)",
  ],
};

export default history;
