// 311 Utica P2 The Valley, 49 BC. Top: Pompeians (Varus); bottom: Caesarians (Curio).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '311',
  context: {
    war: "Caesar's Civil War, 49–45 BC: Curio's campaign in Africa, 49 BC",
    text: [
      'Publius Attius Varus had fled Italy early in 49 BC and seized the province of Africa for Pompey, raising two legions there. He camped against the walls of Utica, where King Juba of Numidia sent troops to help him. Curio, landing with two legions and 500 horse, routed one Numidian column outside the town, but the Pompeians worked on his soldiers, who had changed sides once already at Corfinium.',
      'Curio chose to fight before their loyalty wavered further. Both generals led out their armies, and between them lay a valley, not large but steep and hard to climb. Neither wished to cross it first and attack uphill. The game names the battle after this valley.',
    ],
  },
  sides: {
    top: {
      name: "Varus' Pompeians",
      commanders: ['Publius Attius Varus (Pompeian governor)', "Sextus Quintilius Varus (in Varus' camp; his part in the battle is not recorded)"],
      strength: 'Not recorded; perhaps the two legions raised in Africa, with cavalry and light troops',
      forces: "Legions levied among the Roman citizens of Africa, Varus' cavalry and light-armed men, perhaps with some of Juba's Numidians.",
    },
    bottom: {
      name: "Curio's Caesarians",
      commanders: ['Gaius Scribonius Curio (propraetor)', 'Gaius Caninius Rebilus (legate)'],
      strength: 'Two legions, probably under strength, and no more than 500 horse (Caesar)',
      forces: 'Legionaries who had changed sides at Corfinium, two cohorts of Marrucini among them, and a small body of cavalry.',
    },
  },
  map: {
    terrain: [
      { kind: 'hills', points: [[-60, 196], [200, 190], [420, 198], [540, 212], [564, 248], [520, 278], [300, 274], [-60, 276]] },
      { kind: 'hills', points: [[-60, 404], [300, 398], [600, 402], [790, 400], [806, 348], [862, 342], [884, 398], [862, 444], [800, 476], [400, 478], [-60, 478]] },
      { kind: 'hills', points: [[624, 92], [702, 84], [746, 130], [722, 186], [644, 192], [610, 146]] },
      { kind: 'hills', points: [[852, 76], [930, 70], [952, 126], [922, 186], [858, 178]] },
      { kind: 'camp', at: [400, 64], size: 40, label: "Varus' camp" },
      { kind: 'town', at: [542, 56], size: 28, label: 'Utica' },
      { kind: 'label', at: [250, 338], text: 'The valley' },
    ],
    units: [
      { id: 'P1', side: 'top', kind: 'foot' },
      { id: 'P2', side: 'top', kind: 'foot', label: "Varus' legions" },
      { id: 'P3', side: 'top', kind: 'foot' },
      { id: 'vh1', side: 'top', kind: 'horse', label: "Varus' horse" },
      { id: 'vl', side: 'top', kind: 'light', label: 'Light troops', w: 56, h: 14 },
      { id: 'vh2', side: 'top', kind: 'horse' },
      { id: 'C1', side: 'bottom', kind: 'foot' },
      { id: 'C2', side: 'bottom', kind: 'foot', label: "Curio's legions" },
      { id: 'C3', side: 'bottom', kind: 'foot' },
      { id: 'mar', side: 'bottom', kind: 'foot', label: 'Marrucini', w: 70, h: 24 },
      { id: 'cc1', side: 'bottom', kind: 'horse', label: "Curio's horse" },
      { id: 'cc2', side: 'bottom', kind: 'horse' },
    ],
    phases: [
      {
        title: 'One valley, two armies',
        caption: 'Varus draws up his legions before his camp by Utica, with his horse on the left wing. Curio forms up opposite. Between them lies a small, steep-sided valley, and neither general will cross it first.',
        at: {
          P1: [150, 232],
          P2: [280, 232],
          P3: [410, 232],
          vh1: [590, 214],
          vl: [670, 236],
          vh2: [750, 214],
          C1: [180, 438],
          C2: [310, 438],
          C3: [440, 438],
          mar: [560, 438],
          cc1: [660, 446],
          cc2: [750, 446],
        },
      },
      {
        title: 'Horse into the valley',
        caption: "Varus' cavalry rides down into the valley from his left wing, with light-armed men mixed in among the horses. Curio sends his own horse and two cohorts of Marrucini to meet them.",
        at: {
          vh1: [598, 314],
          vl: [680, 326],
          vh2: [760, 314],
          cc1: [640, 368],
          cc2: [744, 368],
          mar: [528, 386],
        },
        arrows: [
          { side: 'top', points: [[590, 228], [594, 264], [596, 290]] },
          { side: 'top', points: [[750, 228], [756, 264], [758, 290]] },
          { side: 'bottom', points: [[660, 446], [648, 412], [643, 390]] },
          { side: 'bottom', points: [[750, 446], [747, 412], [745, 390]] },
        ],
      },
      {
        title: 'Cut off in the valley',
        caption: "Varus' horsemen cannot stand the charge and gallop back to their own lines. The light troops who came down with them are left behind, surrounded and cut down.",
        at: {
          vh1: [622, 214],
          vh2: [752, 206],
          cc1: [598, 330],
          cc2: [762, 330],
          mar: [680, 374],
        },
        broken: ['vh1', 'vh2', 'vl'],
        arrows: [
          { side: 'top', points: [[600, 300], [610, 268], [618, 238]], style: 'retreat' },
          { side: 'top', points: [[760, 300], [756, 262], [754, 230]], style: 'retreat' },
          { side: 'bottom', points: [[556, 390], [608, 386], [634, 380]] },
        ],
      },
      {
        title: 'Curio crosses the valley',
        caption: "Urged on by Rebilus, Curio leads the legions down and up the steep far side, the men hauling each other up. Varus' army, already shaken, flees for its camp before they arrive; many die in the crush at the gates.",
        at: {
          C1: [190, 262],
          C2: [320, 258],
          C3: [450, 262],
          P1: [250, 150],
          P2: [390, 156],
          P3: [530, 150],
        },
        broken: ['P1', 'P2', 'P3'],
        gone: ['vh1', 'vh2', 'vl'],
        arrows: [
          { side: 'bottom', points: [[180, 420], [186, 340], [190, 290]] },
          { side: 'bottom', points: [[310, 420], [316, 340], [320, 286]] },
          { side: 'bottom', points: [[440, 420], [446, 340], [450, 290]] },
          { side: 'top', points: [[150, 218], [190, 184], [216, 166]], style: 'rout' },
          { side: 'top', points: [[286, 218], [334, 186], [360, 172]], style: 'rout' },
          { side: 'top', points: [[420, 218], [478, 182], [502, 166]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Caesarian victory',
    losses: "Varus: c. 600 killed and 1,000 wounded (Caesar). Curio: one man, Fabius Paelignus, killed after he chased Varus and struck at him.",
    text: [
      'More of Varus\' men died in the crush at the camp gates than in the fighting. That night he withdrew into Utica, leaving a few tents and a trumpeter as a show. Curio began to wall the town in, and its people, weary of war, talked of surrender.',
      'Then messengers arrived from Juba: the king was coming with large forces and urged Utica to hold out. Curio, young and buoyed by his successes, would soon march out to meet the Numidians at the Bagradas River.',
    ],
  },
  sources: [
    'Caesar, Civil War 2.33–36',
    'Appian, Civil Wars 2.44',
    'Adrian Goldsworthy, Caesar: Life of a Colossus (2006)',
  ],
};

export default history;
