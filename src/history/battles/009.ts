// 009 2nd Beneventum, 214 BC. Top: Carthaginians (Hanno); bottom: Romans (Gracchus).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '009',
  context: {
    war: 'Second Punic War, 218–201 BC',
    text: [
      'After Cannae Rome was so short of soldiers that the state bought some 8,000 young slaves and armed them. These volones, as they were called, served under Tiberius Sempronius Gracchus, who had led them well in Campania in 215 BC.',
      "In 214 BC Hannibal returned to Campania, and his officer Hanno marched north from Bruttium with an army, probably to join him. Gracchus, ordered from Luceria to Beneventum, reached the town first. Hanno camped by the river Calor about three miles from the town, and Gracchus pitched camp a mile away. With the senate's leave, he promised the slaves their freedom: any man who brought back an enemy's head would be freed on the spot.",
    ],
  },
  sides: {
    top: {
      name: 'Carthaginians, Bruttians and Lucanians',
      commanders: ['Hanno'],
      strength: '17,000 foot and 1,200 horse (Livy)',
      forces: 'Mostly Bruttian and Lucanian foot; the horse nearly all Numidians and Moors, with very few Italians.',
    },
    bottom: {
      name: 'Romans and their slave volunteers',
      commanders: ['Tiberius Sempronius Gracchus (proconsul)'],
      strength: 'Two legions, chiefly of volones; numbers not given',
      forces: 'Armed slaves serving for their freedom, with some veteran soldiers and cavalry.',
    },
  },
  map: {
    terrain: [
      { kind: 'river', points: [[72, -30], [96, 90], [62, 200], [90, 320], [64, 440], [94, 560], [76, 640]], width: 22, label: 'Calor' },
      { kind: 'hills', points: [[770, 520], [850, 486], [950, 496], [1030, 540], [1030, 640], [780, 640]] },
      { kind: 'road', points: [[574, 548], [440, 552], [300, 560], [160, 576], [40, 596]], label: 'to Beneventum' },
      { kind: 'camp', at: [212, 40], size: 28, label: "Hanno's camp" },
      { kind: 'camp', at: [600, 546], size: 26, label: 'Roman camp' },
    ],
    units: [
      { id: 'hcavL', side: 'top', kind: 'lighthorse', w: 60, h: 18 },
      { id: 'b1', side: 'top', kind: 'foot', w: 112, h: 34 },
      { id: 'b2', side: 'top', kind: 'foot', label: 'Bruttians & Lucanians', w: 112, h: 34 },
      { id: 'b3', side: 'top', kind: 'foot', w: 112, h: 34 },
      { id: 'hcavR', side: 'top', kind: 'lighthorse', label: 'Numidians & Moors', w: 60, h: 18 },
      { id: 'hanno', side: 'top', kind: 'horse', label: 'Hanno', w: 50, h: 18 },
      { id: 'rcavL', side: 'bottom', kind: 'horse', w: 60, h: 22 },
      { id: 'v1', side: 'bottom', kind: 'foot', w: 112, h: 40 },
      { id: 'v2', side: 'bottom', kind: 'foot', label: 'Slave volunteers', w: 112, h: 40 },
      { id: 'v3', side: 'bottom', kind: 'foot', w: 112, h: 40 },
      { id: 'v4', side: 'bottom', kind: 'foot', w: 112, h: 28 },
      { id: 'rcavR', side: 'bottom', kind: 'horse', label: 'Roman horse', w: 60, h: 22 },
    ],
    phases: [
      {
        title: 'Battle at sunrise',
        caption: 'At dawn the volones are the first to form up, eager for freedom. Gracchus leads them onto open ground and Hanno accepts battle at once. Livy gives no deployment; the map is a reconstruction.',
        at: {
          hcavL: [262, 200],
          b1: [404, 210],
          b2: [536, 210],
          b3: [668, 210],
          hcavR: [808, 200],
          hanno: [536, 118],
          rcavL: [262, 420],
          v1: [404, 416],
          v2: [536, 416],
          v3: [668, 416],
          v4: [536, 476],
          rcavR: [808, 420],
        },
      },
      {
        title: 'Heads for freedom',
        caption: 'For four hours neither side gives way. Men stop to cut off heads, until Gracchus orders the heads thrown down. He sends in his cavalry, but the Numidians meet it just as fiercely.',
        at: {
          hcavL: [262, 262],
          b1: [404, 256],
          b2: [536, 256],
          b3: [668, 256],
          hcavR: [808, 262],
          rcavL: [262, 300],
          v1: [404, 300],
          v2: [536, 300],
          v3: [668, 300],
          v4: [536, 362],
          rcavR: [808, 300],
        },
        arrows: [
          { side: 'bottom', points: [[262, 400], [262, 334]] },
          { side: 'bottom', points: [[808, 400], [808, 334]] },
          { side: 'top', points: [[262, 186], [262, 236]] },
          { side: 'top', points: [[808, 186], [808, 236]] },
        ],
      },
      {
        title: 'Freedom only in victory',
        caption: "Gracchus proclaims that no one will be freed unless the enemy is routed. The volones surge forward and break Hanno's line, first the front ranks, then the whole army.",
        at: {
          b1: [396, 168],
          b2: [536, 162],
          b3: [676, 168],
          v1: [404, 224],
          v2: [536, 218],
          v3: [668, 224],
        },
        broken: ['b1', 'b2', 'b3'],
        arrows: [
          { side: 'bottom', points: [[404, 330], [404, 262]] },
          { side: 'bottom', points: [[536, 330], [536, 256]] },
          { side: 'bottom', points: [[668, 330], [668, 262]] },
        ],
      },
      {
        title: 'The camp is stormed',
        caption: "The fugitives crowd into their camp without defending it. The Romans fight their way in, and prisoners held there seize swords and attack from behind. Hanno escapes with most of his horse. Some 4,000 volones who held back later withdraw to a hill.",
        at: {
          b2: [232, 138],
          v1: [348, 188],
          v2: [484, 194],
          v3: [622, 202],
          v4: [890, 540],
        },
        gone: ['b1', 'b3', 'hanno', 'hcavL', 'hcavR'],
        arrows: [
          { side: 'top', points: [[566, 142], [440, 112], [312, 118]], style: 'rout' },
          { side: 'bottom', points: [[404, 272], [378, 224]] },
          { side: 'top', points: [[566, 100], [650, 56], [730, 12]], style: 'rout' },
          { side: 'top', points: [[808, 244], [880, 140], [950, 12]], style: 'rout' },
          { side: 'bottom', points: [[590, 378], [720, 440], [818, 512]], style: 'retreat' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Decisive Roman victory',
    losses: 'Hanno: fewer than 2,000 of c. 18,000 escaped, mostly horsemen, and 38 standards were taken. Romans: barely 2,000 dead (Livy).',
    text: [
      'Gracchus kept his word and freed the volones. The 4,000 or so who had hung back were made to take their meals standing for the rest of their service. Beneventum feasted the army in the streets, the freedmen wearing caps of liberty, and Gracchus had the scene painted in the temple of Liberty in Rome.',
      'Hanno got away with his cavalry. Hannibal, failing once more to take Nola, turned south towards Tarentum. The freedmen served Gracchus loyally until he was killed in an ambush in Lucania in 212 BC; then many of them left the ranks.',
    ],
  },
  sources: [
    'Livy, History of Rome 24.14–16',
    'Livy, History of Rome 22.57, 24.17, 25.20',
    "J. F. Lazenby, Hannibal's War (1978)",
  ],
};

export default history;
