// 011 Baecula, 208 BC. Top: Carthaginians (Hasdrubal); bottom: Romans (Publius Scipio).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '011',
  context: {
    war: 'Second Punic War, 218–201 BC: the war in Spain',
    text: [
      'After taking New Carthage in 209 BC, the young Publius Cornelius Scipio, son of the general killed in 211 BC, won over Spanish chiefs such as Indibilis and Mandonius. In spring 208 BC he marched against Hasdrubal Barca before Mago and Hasdrubal son of Gisgo could come to his aid.',
      "Hasdrubal was camped near Baecula, in the silver-mining country of Castulo on the upper Baetis. As Scipio approached he moved to a strong position: a plateau with a river at its back and steep slopes in front, below which a lower terrace was held by his light troops. Scipio waited two days, then attacked before the other Carthaginian armies could arrive.",
    ],
  },
  sides: {
    top: {
      name: 'Carthaginians, Africans and Spaniards',
      commanders: ['Hasdrubal Barca'],
      strength: 'Unknown; thinned by Spanish desertions, probably smaller than Scipio\'s army',
      forces: 'African and Spanish foot, Numidian horse, Balearic slingers and African light infantry, some elephants.',
    },
    bottom: {
      name: 'Romans, Italian allies and Spaniards',
      commanders: ['Publius Cornelius Scipio (proconsul)', 'Gaius Laelius'],
      strength: 'c. 25,000 foot and 2,500 horse in 209 BC (Polybius), plus Spanish allies',
      forces: 'Legions and allies with their velites, joined by newly won Spanish allies.',
    },
  },
  map: {
    terrain: [
      { kind: 'hills', points: [[150, 46], [850, 46], [884, 160], [800, 236], [200, 236], [118, 156]] },
      { kind: 'hills', points: [[176, 268], [520, 260], [760, 276], [796, 326], [700, 372], [420, 382], [190, 362], [150, 312]] },
      { kind: 'river', points: [[-30, 16], [200, 28], [420, 12], [640, 26], [860, 10], [1030, 24]], width: 18 },
      { kind: 'camp', at: [500, 92], size: 44, label: "Hasdrubal's camp" },
      { kind: 'camp', at: [500, 548], size: 24, label: 'Roman camp' },
      { kind: 'label', at: [912, 56], text: 'River' },
      { kind: 'label', at: [176, 84], text: 'Plateau' },
      { kind: 'label', at: [292, 404], text: 'Lower terrace' },
    ],
    units: [
      { id: 'numid', side: 'top', kind: 'lighthorse', label: 'Numidians', w: 56, h: 16 },
      { id: 'lt1', side: 'top', kind: 'light', label: 'Slingers & skirmishers', w: 150, h: 14 },
      { id: 'lt2', side: 'top', kind: 'light', w: 130, h: 14 },
      { id: 'm1', side: 'top', kind: 'foot', w: 110, h: 30 },
      { id: 'm2', side: 'top', kind: 'foot', label: "Hasdrubal's main body", w: 110, h: 30 },
      { id: 'm3', side: 'top', kind: 'foot', w: 110, h: 30 },
      { id: 'eleph', side: 'top', kind: 'elephants', label: 'Elephants' },
      { id: 'hasd', side: 'top', kind: 'horse', label: 'Hasdrubal', w: 50, h: 18 },
      { id: 'vel', side: 'bottom', kind: 'light', label: 'Velites', w: 150, h: 14 },
      { id: 'pick', side: 'bottom', kind: 'foot', label: 'Picked foot', w: 90, h: 26 },
      { id: 'lael', side: 'bottom', kind: 'foot', label: 'Laelius', w: 110, h: 40 },
      { id: 'scip', side: 'bottom', kind: 'foot', label: 'Scipio', w: 110, h: 40 },
    ],
    phases: [
      {
        title: 'Hasdrubal on the heights',
        caption: "Hasdrubal's camp sits on the plateau, a river behind it and steep slopes in front. His Numidians and light infantry hold the lower terrace. Scipio keeps most of his army back in camp.",
        at: {
          numid: [300, 300],
          lt1: [470, 318],
          lt2: [640, 320],
          m1: [370, 178],
          m2: [500, 186],
          m3: [630, 178],
          eleph: [640, 96],
          hasd: [370, 104],
          vel: [430, 442],
          pick: [600, 442],
          lael: [250, 498],
          scip: [750, 498],
        },
      },
      {
        title: 'The terrace stormed',
        caption: 'Scipio sends his velites and picked foot up the slope. Climbing under a hail of missiles, they reach level ground and drive the skirmishers back onto the main body, which Hasdrubal is only now leading out of camp.',
        at: {
          numid: [270, 250],
          lt1: [450, 256],
          lt2: [626, 256],
          m1: [336, 204],
          m2: [500, 204],
          m3: [664, 204],
          vel: [440, 328],
          pick: [600, 334],
        },
        broken: ['numid', 'lt1', 'lt2'],
        arrows: [
          { side: 'bottom', points: [[440, 430], [440, 350]] },
          { side: 'bottom', points: [[600, 426], [600, 362]] },
        ],
      },
      {
        title: 'Both flanks turned',
        caption: "Scipio and Laelius lead the legions round both sides of the hill and reach the top before Hasdrubal's wings are formed. Struck in front and on both flanks, the Carthaginians give way. Livy swaps the two commanders' flanks.",
        at: {
          vel: [430, 262],
          pick: [590, 268],
          lael: [212, 200, 90],
          scip: [788, 200, -90],
        },
        broken: ['m1', 'm3'],
        gone: ['numid', 'lt1', 'lt2'],
        arrows: [
          { side: 'bottom', points: [[240, 474], [110, 400], [104, 280], [176, 214]] },
          { side: 'bottom', points: [[760, 474], [890, 400], [896, 280], [824, 214]] },
        ],
      },
      {
        title: 'Hasdrubal slips away',
        caption: 'Hasdrubal, who has already secured his treasure and elephants, escapes with as many fugitives as he can gather and heads for the Tagus. The Romans plunder his camp and take some 12,000 prisoners.',
        at: {
          lael: [330, 150, 60],
          scip: [670, 150, -60],
        },
        broken: ['m2'],
        gone: ['m1', 'm3', 'hasd', 'eleph'],
        arrows: [
          { side: 'top', points: [[640, 80], [780, 54], [930, 30]], style: 'retreat' },
          { side: 'top', points: [[370, 90], [250, 54], [100, 30]], style: 'retreat' },
          { side: 'bottom', points: [[220, 260], [260, 214], [292, 184]] },
          { side: 'bottom', points: [[780, 260], [740, 214], [708, 184]] },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Roman victory, but Hasdrubal escaped',
    losses: 'Carthaginians: 8,000 killed (Livy); some 10,000 foot and 2,000 horse captured (Polybius, Livy). Roman losses not recorded.',
    text: [
      'Scipio, wary of the other Carthaginian armies, did not pursue. He sold the African prisoners, sent the Spaniards home without ransom, and declined the title of king when the Spaniards hailed him. Hasdrubal marched by the Tagus and over the Pyrenees into Gaul, bound for Italy.',
      'Letting him go was held against Scipio by Fabius Maximus in the senate. Hasdrubal crossed the Alps in 207 BC and was destroyed at the Metaurus. In Spain, Scipio broke Carthaginian power at Ilipa in 206 BC.',
    ],
  },
  sources: [
    'Polybius, Histories 10.34–40',
    'Livy, History of Rome 27.17–20, 28.42',
    "J. F. Lazenby, Hannibal's War (1978)",
  ],
};

export default history;
