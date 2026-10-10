// 122 Cronium, 376 BC. Top: Carthaginians (Himilco, Mago's son); bottom: Syracusans (Dionysius I).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '122',
  context: {
    war: "Sicilian Wars: Dionysius I's third war with Carthage, c. 383–375 BC",
    text: [
      'Dionysius I, tyrant of Syracuse since 405 BC, had already fought Carthage twice for mastery of Sicily. He renewed the war by welcoming Carthage\'s subject cities when they offered to defect. At Cabala he crushed a Carthaginian army, killing its general Mago and more than 10,000 men, then demanded that Carthage withdraw from the cities of Sicily and pay the costs of the war.',
      "The Carthaginian commanders asked for a truce to consult their government. Carthage meanwhile gave the command to Mago's young son, who used the respite to drill his troops. When the truce ran out the armies met again at Cronium, whose site is unknown. The date is uncertain too: Diodorus files the whole war under 383 BC, but many historians put Cronium about 376–375 BC.",
    ],
  },
  sides: {
    top: {
      name: 'Carthaginians and mercenaries',
      commanders: ["Mago's son (unnamed by Diodorus; sometimes called Himilco)"],
      strength: 'Not recorded',
      forces: 'Carthaginian citizen levies and hired mercenaries, beaten at Cabala and retrained during the truce.',
    },
    bottom: {
      name: 'Syracusans and allies',
      commanders: ['Dionysius I, tyrant of Syracuse', 'Leptines, his brother (one wing; killed)'],
      strength: 'Not recorded; more than 14,000 of them fell',
      forces: 'Syracusan citizens and mercenaries, including a picked corps under Dionysius himself.',
    },
  },
  map: {
    terrain: [{ kind: 'camp', at: [500, 540], size: 32, label: 'Syracusan camp' }],
    units: [
      { id: 'tA', side: 'top', kind: 'foot', w: 120, h: 30 },
      { id: 'tB', side: 'top', kind: 'foot', label: 'Carthaginians', w: 120, h: 30 },
      { id: 'tC', side: 'top', kind: 'foot', w: 120, h: 30 },
      { id: 'tD', side: 'top', kind: 'foot', w: 120, h: 30 },
      { id: 'dio', side: 'bottom', kind: 'foot', label: "Dionysius' corps", w: 120, h: 30 },
      { id: 'b2', side: 'bottom', kind: 'foot', w: 120, h: 30 },
      { id: 'b3', side: 'bottom', kind: 'foot', w: 120, h: 30 },
      { id: 'lep', side: 'bottom', kind: 'foot', label: "Leptines' wing", w: 120, h: 30 },
    ],
    phases: [
      {
        title: 'Battle at Cronium',
        caption: 'The armies meet in a pitched battle. Leptines commands one Syracusan wing (shown here on the right) and Dionysius leads his picked troops on the other. Diodorus gives no numbers or formations; the map is a reconstruction.',
        at: {
          tA: [290, 210],
          tB: [430, 210],
          tC: [570, 210],
          tD: [710, 210],
          dio: [290, 430],
          b2: [430, 430],
          b3: [570, 430],
          lep: [710, 430],
        },
      },
      {
        title: 'Leptines falls',
        caption: "Dionysius' picked men drive back the enemy facing them. On the other wing Leptines fights brilliantly and kills many before he is cut down, and the heartened Carthaginians rout his men.",
        at: {
          tA: [290, 172],
          tB: [430, 262],
          tC: [570, 262],
          tD: [725, 318],
          dio: [290, 232],
          b2: [430, 322],
          b3: [570, 322],
          lep: [745, 400],
        },
        broken: ['lep'],
        arrows: [
          { side: 'bottom', points: [[290, 412], [290, 284]] },
          { side: 'top', points: [[712, 232], [722, 284]] },
          { side: 'bottom', points: [[760, 420], [800, 500], [830, 560]], style: 'rout' },
        ],
      },
      {
        title: 'The Syracusan collapse',
        caption: "As word of Leptines' death spreads, Dionysius' men lose heart and flee too. The Carthaginians pursue, taking no prisoners, until nightfall lets the survivors reach their camp.",
        at: {
          tA: [290, 330],
          tB: [430, 350],
          tC: [570, 350],
          tD: [740, 392],
          dio: [290, 450],
          b2: [430, 466],
          b3: [570, 462],
        },
        broken: ['dio', 'b2', 'b3'],
        gone: ['lep'],
        arrows: [
          { side: 'top', points: [[290, 190], [290, 308]] },
          { side: 'top', points: [[430, 256], [430, 305]] },
          { side: 'top', points: [[570, 256], [570, 326]] },
          { side: 'bottom', points: [[330, 494], [396, 524], [452, 536]], style: 'rout' },
          { side: 'bottom', points: [[600, 482], [582, 514], [550, 532]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: 'Decisive Carthaginian victory',
    losses: 'Syracusans and allies: more than 14,000 dead (Diodorus), Leptines among them. Carthaginian losses unrecorded.',
    text: [
      'Cronium undid the victory at Cabala. Rather than press on, the Carthaginians withdrew to Panormus and offered terms, which Dionysius accepted. Each side kept what it held, except that Carthage gained Selinus and the territory of Akragas west of the river Halycus, and Dionysius paid 1,000 talents.',
      'The Halycus remained the frontier between Greek and Punic Sicily for much of the next century. Dionysius tried once more to drive Carthage from the island in 368 BC, but died the following year with the west still in Carthaginian hands.',
    ],
  },
  sources: [
    'Diodorus Siculus, Library of History 15.15–17',
    'Brian Caven, Dionysius I: War-Lord of Sicily (1990)',
  ],
};

export default history;
