// 201 Clusium, 225 BC. Top: Gauls (Aneroestes); bottom: Etruscan and Sabine levies (an unnamed Roman praetor).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '201',
  context: {
    war: "Rome's war with the Cisalpine Gauls, 225–222 BC",
    text: [
      'In 232 BC Rome had shared out among its citizens the Adriatic coastland south of Ariminum, taken from the Gallic Senones half a century before. Fearing for their own lands, the Insubres and Boii of the Po valley hired the Gaesatae, warriors from beyond the Alps, under their kings Concolitanus and Aneroestes. In 225 BC the host crossed the Apennines into Etruria, while one consul guarded Ariminum and the other was away in Sardinia.',
      'Plundering unopposed, the Gauls reached Clusium, three days\' march from Rome. There they learned that the praetor commanding the army on the Etruscan frontier was close behind them, and turned back to fight. Polybius, the main source, does not name the praetor. He sets the battle near Faesulae, but that town lay some 100 km further north; Orosius speaks of a defeat near Arretium. The true site is unknown.',
    ],
  },
  sides: {
    top: {
      name: 'Gauls: Insubres, Boii, Taurisci and Gaesatae',
      commanders: ['Aneroestes, king of the Gaesatae', 'Concolitanus, king of the Gaesatae'],
      strength: 'c. 50,000 foot and 20,000 horse and chariots (Polybius); Diodorus says 200,000',
      forces: 'Insubres and Boii of the Po valley, Taurisci of the Alpine foothills, Gaesatae from beyond the Alps, many horsemen and chariots.',
    },
    bottom: {
      name: 'Etruscan and Sabine levies under Roman command',
      commanders: ['A Roman praetor, unnamed by Polybius'],
      strength: 'Polybius puts over 50,000 foot and 4,000 horse on the Etruscan frontier; how many fought here is unknown',
      forces: 'Etruscan and Sabine contingents raised for the emergency and posted to guard Etruria.',
    },
  },
  map: {
    terrain: [
      { kind: 'woods', points: [[128, 138], [196, 120], [236, 158], [218, 206], [156, 214], [122, 180]] },
      { kind: 'woods', points: [[40, 262], [118, 252], [144, 300], [104, 336], [36, 318]] },
      { kind: 'woods', points: [[808, 128], [876, 118], [912, 166], [880, 212], [818, 208], [794, 170]] },
      { kind: 'woods', points: [[870, 400], [934, 388], [960, 436], [922, 472], [866, 458]] },
      { kind: 'hills', points: [[590, 322], [680, 292], [790, 302], [842, 352], [814, 420], [712, 442], [616, 428], [572, 372]] },
      { kind: 'label', at: [800, 326], text: 'Hill' },
      { kind: 'camp', at: [250, 300], size: 55, label: 'Gallic camp' },
      { kind: 'camp', at: [510, 545], size: 34, label: 'Roman camp' },
    ],
    units: [
      { id: 'g1', side: 'top', kind: 'warband', w: 110, h: 30 },
      { id: 'g2', side: 'top', kind: 'warband', label: 'Gallic foot', w: 110, h: 30 },
      { id: 'g3', side: 'top', kind: 'warband', w: 110, h: 30 },
      { id: 'g4', side: 'top', kind: 'warband', w: 110, h: 30 },
      { id: 'gc1', side: 'top', kind: 'horse', label: 'Gallic cavalry', w: 64, h: 22 },
      { id: 'gc2', side: 'top', kind: 'horse', w: 64, h: 22 },
      { id: 'rc1', side: 'bottom', kind: 'horse', w: 64, h: 22 },
      { id: 'r1', side: 'bottom', kind: 'foot', w: 100, h: 26 },
      { id: 'r2', side: 'bottom', kind: 'foot', label: "Praetor's army", w: 100, h: 26 },
      { id: 'r3', side: 'bottom', kind: 'foot', w: 100, h: 26 },
      { id: 'rl', side: 'bottom', kind: 'light', w: 80, h: 14 },
      { id: 'rc2', side: 'bottom', kind: 'horse', w: 64, h: 22 },
    ],
    phases: [
      {
        title: 'Fires in the night',
        caption: 'Turning back from Clusium, the Gauls camp close to the pursuing Romans at nightfall. They leave their fires burning and their cavalry in place, and march the foot away in the dark to wait for them.',
        at: {
          g1: [330, 80],
          g2: [450, 80],
          g3: [570, 80],
          g4: [690, 80],
          gc1: [250, 288],
          gc2: [250, 314],
          rc1: [265, 470],
          r1: [390, 470],
          r2: [510, 470],
          r3: [630, 470],
          rl: [510, 428],
          rc2: [755, 470],
        },
        arrows: [
          { side: 'top', points: [[262, 262], [290, 180], [326, 112]] },
          { side: 'top', points: [[282, 268], [420, 190], [530, 112]] },
        ],
      },
      {
        title: 'The pursuit',
        caption: 'At dawn the Romans see only horsemen, who ride off as ordered. Thinking the whole Gallic army has fled, the praetor gives chase along its track.',
        at: {
          gc1: [170, 90],
          gc2: [800, 90],
          rc1: [175, 250],
          r1: [400, 250],
          r2: [520, 250],
          r3: [640, 250],
          rl: [520, 205],
          rc2: [760, 250],
        },
        arrows: [
          { side: 'top', points: [[230, 264], [220, 180], [180, 116]] },
          { side: 'top', points: [[300, 282], [360, 200], [560, 130], [768, 108]] },
          { side: 'bottom', points: [[390, 452], [398, 284]] },
          { side: 'bottom', points: [[630, 452], [638, 284]] },
        ],
      },
      {
        title: 'The Gauls turn',
        caption: 'As the Romans draw near, the Gallic foot, rejoined by its cavalry, leaves its position and falls on them. A hard fight follows, and the Gauls gain the upper hand.',
        at: {
          g1: [380, 186],
          g2: [500, 186],
          g3: [620, 186],
          g4: [740, 186],
          rl: [520, 222],
          gc1: [200, 204],
          gc2: [850, 232],
        },
        arrows: [
          { side: 'top', points: [[330, 100], [362, 158]] },
          { side: 'top', points: [[690, 100], [724, 158]] },
          { side: 'top', points: [[172, 106], [190, 180]] },
          { side: 'top', points: [[806, 106], [842, 206]] },
        ],
      },
      {
        title: 'Refuge on the hill',
        caption: "The Romans break. At least 6,000 fall, and most of the rest escape to a steep hill. The Gauls, worn out by the night's march, rest and leave their cavalry to watch the hill. The map is a reconstruction.",
        at: {
          r2: [680, 330],
          r3: [722, 368],
          rl: [702, 404],
          rc2: [790, 400],
          gc1: [545, 460],
          gc2: [884, 258],
        },
        broken: ['r2', 'r3', 'rl', 'rc2'],
        gone: ['r1', 'rc1'],
        arrows: [
          { side: 'bottom', points: [[500, 272], [560, 300], [612, 318]], style: 'rout' },
          { side: 'bottom', points: [[160, 270], [120, 420], [90, 560]], style: 'rout' },
          { side: 'top', points: [[236, 208], [320, 232], [430, 370], [508, 450]] },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: 'Gallic victory',
    losses: 'Romans: at least 6,000 dead by Polybius, 3,000 by Orosius. Gallic losses unrecorded.',
    text: [
      'The survivors were saved by the consul Lucius Aemilius Papus, hurrying across from Ariminum. Seeing his campfires, they sent messengers to him through the woods by night. The Gallic leaders held a council, and Aneroestes urged them not to risk their plunder in another battle but to take it home and return later.',
      'Before dawn the Gauls broke camp and set off for home along the Etruscan coast. Aemilius took the survivors into his army and followed, harrying the rear but avoiding a pitched battle, until another consular army barred the road ahead at Telamon.',
    ],
  },
  sources: [
    'Polybius, Histories 2.21–26',
    'Diodorus Siculus, Library of History 25.13',
    'Orosius, Histories against the Pagans 4.13',
    'F. W. Walbank, A Historical Commentary on Polybius, vol. 1 (1957)',
  ],
};

export default history;
