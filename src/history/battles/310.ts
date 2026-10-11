// 310 Utica P1 Delaying Action, 49 BC. Top: Numidians (Saburra); bottom: Caesarians (Marcius Rufus).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '310',
  context: {
    war: "Caesar's Civil War, 49–45 BC: Curio's campaign in Africa, 49 BC",
    text: [
      "When civil war broke out in 49 BC, Caesar sent Gaius Scribonius Curio to take Sicily and then Africa, whose grain helped feed Rome. Africa was held for Pompey by Publius Attius Varus, backed by King Juba I of Numidia. Juba had inherited his father's friendship with Pompey and hated Curio, who as tribune in 50 BC had proposed annexing his kingdom.",
      "Curio landed with 500 horse and two legions of men who had changed sides at Corfinium. Near Utica, Varus' base, his cavalry killed some 120 of Juba's Numidians in a first skirmish, and his army hailed him imperator. Next day he began a camp close to the town. The game's 'Delaying Action' is the clash that followed there: Caesar says Curio sent his horse ahead to hold the enemy up.",
    ],
  },
  sides: {
    top: {
      name: "King Juba's Numidians",
      commanders: ["Not named by Caesar (the game gives Saburra, Juba's general)"],
      strength: 'Not recorded; Caesar calls it a large force of horse and foot',
      forces: 'Numidian horsemen and foot sent by Juba to reinforce Varus at Utica, marching without order and expecting no fight.',
    },
    bottom: {
      name: "Curio's Caesarians",
      commanders: ['Gaius Scribonius Curio (propraetor)', 'Cavalry leader not named (the game gives the quaestor Marcius Rufus)'],
      strength: 'Curio had only 500 horse in Africa; two legions formed up behind',
      forces: "Curio's cavalry did the fighting; the legions, called away from building the camp, never came into action.",
    },
  },
  map: {
    terrain: [
      { kind: 'hills', points: [[140, 138], [222, 128], [262, 196], [250, 262], [178, 272], [146, 210]] },
      { kind: 'hills', points: [[96, 342], [168, 332], [198, 380], [160, 414], [98, 404]] },
      { kind: 'river', points: [[690, -30], [700, 50], [752, 122], [842, 172], [904, 236], [910, 320], [934, 400], [1060, 448]], width: 22 },
      { kind: 'camp', at: [560, 524], size: 44, label: "Curio's camp" },
      { kind: 'label', at: [62, 312], text: 'To Utica' },
    ],
    units: [
      { id: 'nh1', side: 'top', kind: 'lighthorse', label: 'Numidian horse', w: 60, h: 18 },
      { id: 'nh2', side: 'top', kind: 'lighthorse', w: 60, h: 18 },
      { id: 'nf1', side: 'top', kind: 'light', w: 70, h: 16 },
      { id: 'nf2', side: 'top', kind: 'light', label: 'Numidian foot', w: 70, h: 16 },
      { id: 'nf3', side: 'top', kind: 'light', w: 70, h: 16 },
      { id: 'c1', side: 'bottom', kind: 'horse', w: 60, h: 20 },
      { id: 'c2', side: 'bottom', kind: 'horse', label: "Curio's cavalry", w: 60, h: 20 },
      { id: 'c3', side: 'bottom', kind: 'horse', w: 60, h: 20 },
      { id: 'L1', side: 'bottom', kind: 'foot', label: "Curio's legions", w: 100, h: 26 },
      { id: 'L2', side: 'bottom', kind: 'foot', w: 100, h: 26 },
    ],
    phases: [
      {
        title: 'Dust on the road',
        caption: "Curio's men are still fortifying their camp near Utica when cavalry pickets report a large force of Juba's horse and foot coming to the town. A cloud of dust rises, and the head of the column comes into view.",
        at: {
          nh1: [290, 222],
          nh2: [372, 210],
          nf1: [462, 198],
          nf2: [560, 186],
          nf3: [660, 174],
          c1: [330, 452],
          c2: [430, 446],
          c3: [740, 452],
          L1: [450, 500],
          L2: [670, 500],
        },
        arrows: [
          { side: 'top', points: [[720, 146], [540, 150], [400, 170], [300, 192]] },
        ],
      },
      {
        title: 'Cavalry to hold them',
        caption: 'Curio sends his horse ahead to take the first shock and hold the enemy up, while he calls the legions out of the works and draws them up in line.',
        at: {
          c1: [300, 340],
          c2: [450, 330],
          c3: [640, 320],
          L1: [500, 410],
          L2: [620, 410],
        },
        arrows: [
          { side: 'bottom', points: [[326, 436], [312, 400], [304, 366]] },
          { side: 'bottom', points: [[428, 432], [440, 392], [448, 356]] },
          { side: 'bottom', points: [[736, 436], [700, 390], [662, 346]] },
        ],
      },
      {
        title: 'The column breaks',
        caption: 'Caught strung out on the march, the royal troops break before the legions are even deployed. Nearly all the horsemen escape along the shore into Utica, but many of the foot are cut down. Caesar gives no more detail; the map is a reconstruction.',
        at: {
          c1: [360, 230],
          c2: [500, 226],
          c3: [628, 218],
          nf1: [452, 162],
          nf2: [560, 150],
          nf3: [664, 138],
        },
        broken: ['nf1', 'nf2', 'nf3'],
        gone: ['nh1', 'nh2'],
        arrows: [
          { side: 'top', points: [[330, 236], [240, 296], [122, 314]], style: 'rout' },
          { side: 'bottom', points: [[306, 326], [326, 286], [344, 254]] },
          { side: 'bottom', points: [[456, 316], [476, 280], [490, 250]] },
          { side: 'bottom', points: [[640, 306], [636, 272], [632, 242]] },
          { side: 'top', points: [[560, 136], [596, 80], [616, 20]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: "Caesarian victory: Juba's relief column routed",
    losses: 'Not recorded. Caesar says almost all the Numidian horse got away, but a great many of the foot were killed.',
    text: [
      "The success did not settle the loyalty of Curio's men, many of whom had served under Lucius Domitius Ahenobarbus until Corfinium. That night two centurions and 22 soldiers deserted to Attius Varus. Next day, as the armies faced each other, the Pompeian Sextus Quintilius Varus, pardoned at Corfinium himself, urged them to change sides again.",
      "Rumours swept the camp, and Curio's council split between storming Varus' camp and falling back to the Castra Cornelia. Curio rejected both. He won the men over with a speech reminding them of Caesar's successes, and the next day led them out against Varus.",
    ],
  },
  sources: [
    'Caesar, Civil War 2.23–33',
    'Appian, Civil Wars 2.44',
    'Adrian Goldsworthy, Caesar: Life of a Colossus (2006)',
  ],
};

export default history;
