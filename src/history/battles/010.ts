// 010 Castulo, 211 BC. Top: Carthaginians (Hasdrubal Gisgo); bottom: Romans (Publius Scipio).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '010',
  context: {
    war: 'Second Punic War, 218–201 BC: the war in Spain',
    text: [
      'Since 218 BC Gnaeus Scipio, joined by his brother Publius in 217, had kept Hasdrubal Barca from reinforcing Hannibal. Over the winter they hired 20,000 Celtiberian mercenaries and resolved to end the war in Spain at one stroke.',
      "Three Carthaginian armies faced them. Gnaeus, with a third of the Roman troops and the Celtiberians, stayed near Amtorgis to watch Hasdrubal Barca. Publius took the rest against Mago and Hasdrubal son of Gisgo, but Masinissa's Numidian horse soon had him penned in his camp. Hearing that the Spanish chief Indibilis was coming with reinforcements, he marched out to stop him. The site is unknown; Appian places Publius near Castulo on the upper Baetis.",
    ],
  },
  sides: {
    top: {
      name: 'Carthaginians, Numidians and Spaniards',
      commanders: ['Hasdrubal son of Gisgo', 'Mago Barca', 'Masinissa (Numidian horse)', 'Indibilis (Spanish allies)'],
      strength: 'Unknown; Indibilis alone brought 7,500 Suessetani (Livy)',
      forces: "Two Carthaginian field armies, Masinissa's Numidian light horse, Spanish foot and fast light infantry.",
    },
    bottom: {
      name: 'Romans and Italian allies',
      commanders: ['Publius Cornelius Scipio (proconsul)', 'Tiberius Fonteius (legate, left in camp)'],
      strength: 'Two-thirds of the Roman and allied troops in Spain; numbers not recorded',
      forces: 'Roman and allied legionaries, caught on the march rather than in battle order.',
    },
  },
  map: {
    terrain: [
      { kind: 'woods', points: [[222, 76], [292, 68], [350, 128], [344, 192], [280, 202], [232, 150]] },
      { kind: 'woods', points: [[146, 276], [212, 284], [222, 326], [172, 344], [132, 318]] },
      { kind: 'woods', points: [[64, 346], [134, 344], [146, 392], [86, 414], [44, 388]] },
      { kind: 'woods', points: [[-30, 476], [56, 468], [80, 516], [30, 546], [-30, 536]] },
      { kind: 'woods', points: [[786, 276], [852, 270], [866, 318], [820, 340], [780, 316]] },
      { kind: 'woods', points: [[858, 408], [930, 402], [944, 452], [894, 474], [852, 450]] },
      { kind: 'camp', at: [856, 544], size: 28, label: 'Roman camp' },
    ],
    units: [
      { id: 'indib', side: 'top', kind: 'warband', label: "Indibilis' Spaniards", w: 150, h: 30 },
      { id: 'numL', side: 'top', kind: 'lighthorse', w: 56, h: 16 },
      { id: 'numR', side: 'top', kind: 'lighthorse', label: "Masinissa's Numidians", w: 56, h: 16 },
      { id: 'carthF', side: 'top', kind: 'foot', label: 'Hasdrubal & Mago', w: 130, h: 34 },
      { id: 'carthH', side: 'top', kind: 'horse', w: 64, h: 22 },
      { id: 'c1', side: 'bottom', kind: 'foot', w: 50, h: 90 },
      { id: 'c2', side: 'bottom', kind: 'foot', label: 'Roman column', w: 50, h: 90 },
      { id: 'c3', side: 'bottom', kind: 'foot', w: 50, h: 90 },
      { id: 'scipio', side: 'bottom', kind: 'horse', label: 'Publius Scipio', w: 46, h: 18 },
    ],
    phases: [
      {
        title: 'Night march',
        caption: "Penned in by Masinissa's raids, Scipio leaves Fonteius with a small guard and marches out at midnight to catch Indibilis and his 7,500 Suessetani before they can join the Carthaginians.",
        at: {
          indib: [500, 110],
          c1: [500, 322],
          c2: [500, 422],
          c3: [500, 522],
          scipio: [450, 335],
        },
      },
      {
        title: 'Numidians on both flanks',
        caption: 'The armies meet in marching order rather than battle line, and at first the Romans have the better of it. Then the Numidians, whom Scipio thought he had shaken off, appear on both his flanks.',
        at: {
          indib: [500, 140],
          c1: [500, 215],
          c2: [500, 315],
          c3: [500, 415],
          scipio: [450, 228],
          numL: [400, 300],
          numR: [600, 345],
        },
        arrows: [
          { side: 'bottom', points: [[500, 568], [500, 474]] },
          { side: 'top', points: [[10, 170], [200, 226], [362, 290]] },
          { side: 'top', points: [[990, 170], [800, 250], [640, 334]] },
        ],
      },
      {
        title: 'Attack from the rear',
        caption: 'The Carthaginian generals come up and fall on the rear. Beset on three sides, the Romans cannot tell where to strike. Scipio, fighting where the press is thickest, is run through by a lance.',
        at: {
          carthF: [500, 512],
          carthH: [380, 474],
          numL: [416, 310],
          numR: [590, 352],
        },
        broken: ['scipio'],
        arrows: [
          { side: 'top', points: [[240, 614], [350, 572], [420, 540]] },
          { side: 'top', points: [[130, 612], [250, 546], [336, 496]] },
        ],
      },
      {
        title: 'Rout and pursuit',
        caption: 'The cry that the general has fallen breaks the army. Few outrun the horsemen and fleet light infantry; Livy says almost more died in flight than in battle. Only nightfall ends the killing. The map is a reconstruction.',
        at: {
          c1: [560, 200],
          c2: [600, 320],
          c3: [640, 440],
          numR: [800, 330],
          numL: [540, 400],
          indib: [560, 120],
        },
        broken: ['c1', 'c2', 'c3'],
        gone: ['scipio'],
        arrows: [
          { side: 'bottom', points: [[666, 446], [760, 500], [818, 522]], style: 'rout' },
          { side: 'bottom', points: [[588, 190], [700, 150], [810, 104]], style: 'rout' },
          { side: 'top', points: [[628, 352], [700, 342], [764, 334]] },
          { side: 'top', points: [[430, 314], [478, 360], [504, 388]] },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: 'Decisive Carthaginian victory',
    losses: 'Not recorded. Publius Scipio fell with much of his army.',
    text: [
      'The victors marched at once to join Hasdrubal Barca against Gnaeus, whose Celtiberians had already been bribed to go home. Gnaeus retreated, made a last stand on a bare hill and was killed twenty-nine days after his brother.',
      'Survivors rallied under a Roman knight, Lucius Marcius, and held on north of the Ebro, but Rome had all but lost Spain. In 210 BC it sent Publius’ son, the future Scipio Africanus, to take up his father’s command. He took New Carthage the next year and turned the war in Spain around.',
    ],
  },
  sources: [
    'Livy, History of Rome 25.32–37',
    'Appian, Wars in Spain 16',
    "J. F. Lazenby, Hannibal's War (1978)",
  ],
};

export default history;
