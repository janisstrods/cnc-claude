// 014 Great Plains, 203 BC. Top: Carthaginians (Hasdrubal Gisgo); bottom: Romans (Scipio).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '014',
  context: {
    war: 'Second Punic War, 218–201 BC',
    text: [
      'Scipio landed near Utica in 204 BC and laid siege to the town. Carthage had won over Syphax, king of the western Numidians, who married Sophonisba, daughter of the Carthaginian general Hasdrubal son of Gisgo. Their two large armies camped near Utica through the winter, until one night early in 203 BC Scipio set both camps on fire and slaughtered the fleeing men.',
      'Within a month Hasdrubal and Syphax had raised a new army of some 30,000, stiffened by 4,000 newly hired Celtiberian mercenaries from Spain. They camped on the Great Plains, probably in the middle valley of the Bagradas. Scipio left part of his army before Utica and reached them in five days. After two days of skirmishing, both sides drew up for battle on the fourth.',
    ],
  },
  sides: {
    top: {
      name: 'Carthaginians, Numidians and Celtiberians',
      commanders: ['Hasdrubal son of Gisgo', 'Syphax (king of the Masaesylian Numidians)'],
      strength: 'c. 30,000, including 4,000 Celtiberians (Polybius)',
      forces: "Carthaginian troops and new levies, Syphax's Numidian horse, and Celtiberian mercenaries; morale shaken by the burning of the camps.",
    },
    bottom: {
      name: 'Romans, Italian allies and Numidians',
      commanders: ['Publius Cornelius Scipio', 'Masinissa (Numidian horse, left)', 'Gaius Laelius'],
      strength: 'Not recorded; a lightly equipped part of the army in Africa',
      forces: "Veteran legions in the usual three lines of hastati, principes and triarii, Italian cavalry and Masinissa's Numidian horse.",
    },
  },
  map: {
    terrain: [
      { kind: 'label', at: [500, 562], text: 'The Great Plains' },
    ],
    units: [
      { id: 'carth', side: 'top', kind: 'horse', label: 'Carthaginians', w: 150, h: 26 },
      { id: 'celt', side: 'top', kind: 'foot', label: 'Celtiberians', w: 190, h: 44 },
      { id: 'num', side: 'top', kind: 'lighthorse', label: "Syphax's Numidians", w: 150, h: 22 },
      { id: 'mas', side: 'bottom', kind: 'lighthorse', label: "Masinissa's Numidians", w: 140, h: 22 },
      { id: 'hast', side: 'bottom', kind: 'foot', label: 'Hastati', w: 210, h: 24 },
      { id: 'prW', side: 'bottom', kind: 'foot', label: 'Principes', w: 100, h: 20 },
      { id: 'prE', side: 'bottom', kind: 'foot', w: 100, h: 20 },
      { id: 'trW', side: 'bottom', kind: 'foot', label: 'Triarii', w: 100, h: 20 },
      { id: 'trE', side: 'bottom', kind: 'foot', w: 100, h: 20 },
      { id: 'ital', side: 'bottom', kind: 'horse', label: 'Italian horse', w: 130, h: 24 },
    ],
    phases: [
      {
        title: 'Deployment',
        caption: 'Scipio draws up his legions in their usual three lines, with the Italian horse on the right and Masinissa on the left. The Celtiberians face the legions; Syphax holds the left wing and the Carthaginians the right.',
        at: {
          carth: [210, 205],
          celt: [500, 205],
          num: [790, 205],
          mas: [210, 410],
          hast: [500, 395],
          prW: [444, 433],
          prE: [556, 433],
          trW: [444, 469],
          trE: [556, 469],
          ital: [790, 410],
        },
      },
      {
        title: 'Both wings break',
        caption: 'At the first charge the Italian horse routs the Numidians and Masinissa routs the Carthaginians, both shaken by the disaster of the camps. Only the Celtiberians stand, locked in combat with the hastati.',
        at: {
          ital: [790, 262],
          mas: [210, 262],
          hast: [500, 256],
          prW: [444, 300],
          prE: [556, 300],
          trW: [444, 336],
          trE: [556, 336],
        },
        broken: ['carth', 'num'],
        arrows: [
          { side: 'bottom', points: [[790, 392], [790, 290]] },
          { side: 'bottom', points: [[210, 392], [210, 290]] },
          { side: 'bottom', points: [[500, 380], [500, 284]] },
        ],
      },
      {
        title: 'The Celtiberians surrounded',
        caption: 'The principes and triarii march out round both flanks and envelop the Celtiberians, who, far from home and expecting no mercy, die almost to a man. Their stand lets Hasdrubal and Syphax escape.',
        at: {
          prW: [372, 212, 90],
          prE: [628, 212, -90],
          trW: [412, 138, 150],
          trE: [588, 138, -150],
        },
        broken: ['celt'],
        gone: ['carth', 'num'],
        arrows: [
          { side: 'bottom', points: [[444, 312], [380, 282]] },
          { side: 'bottom', points: [[556, 312], [620, 282]] },
          { side: 'bottom', points: [[444, 350], [318, 330], [300, 214], [346, 164]] },
          { side: 'bottom', points: [[556, 350], [682, 330], [700, 214], [654, 164]] },
          { side: 'top', points: [[210, 192], [170, 100], [120, 10]], style: 'rout' },
          { side: 'top', points: [[790, 192], [830, 100], [880, 10]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Decisive Roman victory',
    losses: 'Not recorded. The Celtiberians were cut down almost to a man, while Syphax and Hasdrubal got away with the routed wings. Roman losses are not given.',
    text: [
      'Hasdrubal fled to Carthage and Syphax to Numidia, where Laelius and Masinissa pursued him and took him prisoner later that year. Masinissa recovered his own kingdom, seized Syphax\'s capital, Cirta, and married Sophonisba, who took poison rather than be sent to Rome. Scipio occupied Tunis, within sight of Carthage.',
      'The Carthaginians now asked for terms, and a truce was agreed. But they also recalled Hannibal from Italy and his brother Mago from Liguria. When Hannibal landed in Africa late in 203 BC, the war was heading for its final battle at Zama.',
    ],
  },
  sources: [
    'Polybius, Histories 14.1–10',
    'Livy, History of Rome 30.3–15',
    "J. F. Lazenby, Hannibal's War (1978)",
  ],
};

export default history;
