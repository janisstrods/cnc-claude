// 221 Teutoburger Wald P2, 9 AD. Top: Germanic tribes (Arminius); bottom: Romans (Numonius Vala, under Varus).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '221',
  context: {
    war: "Rome's wars in Germany, 12 BC–AD 16: the Varian disaster, AD 9",
    text: [
      "After the ambush of the first day, Varus' army spent the night in a camp on a wooded height. Tacitus, perhaps describing this camp as Germanicus' men found it six years later, says its wide circuit and laid-out headquarters still showed the work of three legions. At dawn the Romans set out to fight their way through to safety.",
      "Where they died is still argued. Since 1987 thousands of Roman finds at Kalkriese, north of Osnabrück, in a narrow passage between a hill and a great bog, have pointed to a battle of this time. Most scholars see it as a stage of the disaster, though some link it to Germanicus' campaigns of AD 15–16. An earthwork there, long read as a German ambush wall, may instead be a Roman entrenchment.",
    ],
  },
  sides: {
    top: {
      name: 'Cherusci and allied Germanic peoples',
      commanders: ['Arminius (Cherusci)', 'Segimer, his father'],
      strength: 'Not recorded; more warriors joined as the Romans weakened (Dio)',
      forces: 'Lightly equipped tribal foot, free to strike and fall back at will in the wet woods.',
    },
    bottom: {
      name: 'Romans and auxiliaries',
      commanders: ['Numonius Vala (legate; led the cavalry away)', 'Publius Quinctilius Varus (wounded; took his own life)', 'Lucius Eggius (camp prefect; fell fighting)', 'Ceionius (camp prefect; surrendered)'],
      strength: 'What was left of three legions, three alae and six cohorts after the first day',
      forces: 'Legionaries, auxiliary archers and cavalry, now without most of their wagons and soaked by the rain.',
    },
  },
  map: {
    terrain: [
      { kind: 'marsh', points: [[-60, -60], [120, -60], [112, 70], [40, 130], [-60, 140]] },
      { kind: 'marsh', points: [[700, -60], [880, -60], [872, 40], [780, 70], [710, 40]] },
      { kind: 'marsh', points: [[-60, 470], [90, 466], [150, 516], [140, 660], [-60, 660]], label: 'Bog' },
      { kind: 'woods', points: [[130, -60], [432, -60], [432, 80], [420, 196], [330, 236], [200, 180], [140, 60]] },
      { kind: 'woods', points: [[468, -60], [670, -60], [700, 84], [740, 196], [690, 280], [600, 270], [500, 200], [468, 110]] },
      { kind: 'woods', points: [[-60, 180], [60, 186], [160, 236], [176, 322], [112, 396], [-60, 412]] },
      { kind: 'woods', points: [[760, 210], [860, 222], [910, 300], [890, 410], [800, 404], [744, 316]] },
      { kind: 'camp', at: [480, 440], size: 150, label: 'Night camp' },
    ],
    units: [
      { id: 'gTL', side: 'top', kind: 'warband', label: 'Arminius', w: 100, h: 28 },
      { id: 'gTR', side: 'top', kind: 'warband', label: 'Germanic warriors', w: 100, h: 28 },
      { id: 'gL', side: 'top', kind: 'warband', w: 100, h: 28 },
      { id: 'gR', side: 'top', kind: 'warband', w: 100, h: 28 },
      { id: 'gNew', side: 'top', kind: 'warband', label: 'Waverers join', w: 100, h: 28 },
      { id: 'vala', side: 'bottom', kind: 'horse', label: "Vala's cavalry", w: 60, h: 20 },
      { id: 'l1', side: 'bottom', kind: 'foot', w: 100, h: 24 },
      { id: 'l2', side: 'bottom', kind: 'foot', label: 'Legions', w: 100, h: 24 },
      { id: 'l3', side: 'bottom', kind: 'foot', w: 100, h: 24 },
      { id: 'arch', side: 'bottom', kind: 'light', label: 'Archers', w: 70, h: 14 },
    ],
    phases: [
      {
        title: 'The night camp',
        caption: 'The survivors dig in for the night and burn or abandon most of their wagons and baggage. The tribes keep watch from the woods all around.',
        at: {
          gTL: [260, 110],
          gTR: [620, 150],
          gL: [80, 290],
          gR: [826, 312],
          l1: [410, 394],
          l2: [550, 394],
          l3: [410, 456],
          vala: [556, 456],
          arch: [480, 506],
        },
      },
      {
        title: 'Into the woods again',
        caption: 'They march out in better order and cross open ground, losing men all the way, then plunge into woods again. Crammed into narrow lanes, horse and foot collide with each other and with the trees. Here the losses are worst.',
        at: {
          vala: [450, 110, 90],
          arch: [450, 182, 90],
          l1: [450, 272, 90],
          l2: [450, 382, 90],
          l3: [450, 492, 90],
          gTL: [340, 150],
          gTR: [570, 210],
          gL: [320, 300],
          gR: [580, 330],
        },
        arrows: [
          { side: 'bottom', points: [[404, 520], [404, 370], [404, 230]] },
          { side: 'top', points: [[100, 310], [190, 318], [254, 304]] },
          { side: 'top', points: [[800, 340], [710, 338], [646, 332]] },
        ],
      },
      {
        title: 'Rain, and Vala rides off',
        caption: 'On the fourth day heavy rain soaks the shields and spoils bows and javelins, and waverers swell the German ranks. Numonius Vala abandons the foot and rides for the Rhine with the cavalry, but dies in flight; Velleius gives no day.',
        at: {
          gNew: [290, 60],
          gTL: [380, 200],
          gTR: [520, 260],
          gR: [630, 322],
          l2: [380, 250],
          l3: [520, 300],
        },
        broken: ['l1', 'l2', 'l3', 'arch'],
        gone: ['vala'],
        arrows: [
          { side: 'bottom', points: [[450, 80], [450, 8]], style: 'retreat' },
          { side: 'top', points: [[-16, 40], [100, 58], [214, 62]] },
        ],
      },
      {
        title: 'The end of three legions',
        caption: 'Wounded, Varus takes his own life, and other senior officers follow. Resistance collapses: Eggius dies fighting, Ceionius surrenders, and a last remnant behind a low rampart and shallow ditch is overrun. The sources give no clear ground; the map is a reconstruction.',
        at: {
          l2: [450, 200],
          l3: [450, 232],
          gNew: [450, 130],
          gTL: [346, 212, 90],
          gTR: [554, 212, -90],
          gL: [400, 278],
          gR: [510, 278],
        },
        gone: ['l1', 'arch'],
        arrows: [
          { side: 'top', points: [[300, 76], [360, 108], [392, 118]] },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: 'Decisive Germanic victory',
    losses: 'Romans: three legions, three alae and six cohorts, perhaps 15,000–20,000 soldiers besides followers; a few escaped or were later ransomed. German losses unknown.',
    text: [
      "The Germans sacrificed captured tribunes and senior centurions at altars in the groves. Varus' half-burned body was beheaded and the head sent to Maroboduus, king of the Marcomanni, who passed it on to Augustus. Suetonius says the emperor went unshaven for months and would cry out for Varus to give him back his legions; their numbers, XVII to XIX, were never used again.",
      "Tiberius secured the Rhine, and from AD 14 Germanicus campaigned beyond it. In AD 15 his men buried the bones of Varus' army, and two of the three lost eagles were recovered by AD 16, the last in AD 41. But Rome gave up its plans for a province reaching the Elbe, and the Rhine became the empire's lasting frontier.",
    ],
  },
  sources: [
    'Cassius Dio, Roman History 56.21–24',
    'Velleius Paterculus, Roman History 2.119–120',
    'Tacitus, Annals 1.61–62',
    'Suetonius, Augustus 23',
    'Peter S. Wells, The Battle That Stopped Rome (2003)',
  ],
};

export default history;
