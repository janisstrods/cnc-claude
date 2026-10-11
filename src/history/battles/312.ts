// 312 Bagradas River, 49 BC. Top: Numidians (Saburra); bottom: Caesarians (Curio).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '312',
  context: {
    war: "Caesar's Civil War, 49–45 BC: Curio's campaign in Africa, 49 BC",
    text: [
      'After his victory outside Utica, Curio heard that King Juba was coming with a great army. He gave up the siege, fell back to the Castra Cornelia, a ridge running out into the sea, and sent to Sicily for his other two legions. Then deserters reported that Juba had turned home to deal with a border war, leaving his general Saburra to advance with a small force.',
      'Curio believed them. At nightfall he sent all his cavalry against Saburra\'s camp on the river Bagradas; they caught the Numidians asleep and killed many. Before dawn Curio followed with the legions, leaving five cohorts to guard his camp. But Juba was only six miles behind Saburra and, told of the raid, sent him his bodyguard horse and his best foot.',
    ],
  },
  sides: {
    top: {
      name: 'Numidians and royal guard',
      commanders: ["Saburra (Juba's general)", 'King Juba I (following behind, says Caesar; Appian and Dio put him on the field)'],
      strength: "Not recorded; Saburra's force, reinforced by 2,000 Spanish and Gallic horse and picked foot (Caesar)",
      forces: "Numidian light horse and foot, Juba's Spanish and Gallic bodyguard cavalry and his best infantry; sixty elephants followed with Juba.",
    },
    bottom: {
      name: "Curio's Caesarians",
      commanders: ['Gaius Scribonius Curio (propraetor; killed)', 'Gnaeus Domitius (prefect of cavalry)'],
      strength: 'Two legions less five cohorts left in camp; only about 200 horse reached the fight (Caesar)',
      forces: 'Legionaries worn out by a long march begun before dawn, with cavalry exhausted by its night raid.',
    },
  },
  map: {
    terrain: [
      { kind: 'hills', points: [[832, 132], [922, 118], [972, 168], [962, 248], [882, 262], [826, 214]] },
      { kind: 'label', at: [500, 24], text: 'Towards the Bagradas' },
      { kind: 'label', at: [104, 586], text: "To Curio's camp" },
      { kind: 'label', at: [904, 290], text: 'Hills' },
    ],
    units: [
      { id: 'nf1', side: 'top', kind: 'foot', label: 'Numidian foot', w: 100, h: 24 },
      { id: 'nf2', side: 'top', kind: 'foot', w: 100, h: 24 },
      { id: 'guard', side: 'top', kind: 'horse', label: "Juba's guard horse", w: 70, h: 22 },
      { id: 'nL1', side: 'top', kind: 'lighthorse', label: 'Numidian horse', w: 60, h: 18 },
      { id: 'nL2', side: 'top', kind: 'lighthorse', w: 60, h: 18 },
      { id: 'nR1', side: 'top', kind: 'lighthorse', w: 60, h: 18 },
      { id: 'nR2', side: 'top', kind: 'lighthorse', w: 60, h: 18 },
      { id: 'L1', side: 'bottom', kind: 'foot', w: 100, h: 26 },
      { id: 'L2', side: 'bottom', kind: 'foot', label: "Curio's legions", w: 100, h: 26 },
      { id: 'L3', side: 'bottom', kind: 'foot', w: 100, h: 26 },
      { id: 'cav', side: 'bottom', kind: 'horse', label: "Curio's horse", w: 50, h: 18 },
    ],
    phases: [
      {
        title: 'Saburra gives ground',
        caption: 'Saburra falls back as if in flight. Sure that the enemy is beaten, Curio leads his tired legions down from the higher ground onto the plain and presses on, his worn-out cavalry falling behind.',
        at: {
          nf1: [440, 172],
          nf2: [560, 172],
          guard: [500, 110],
          nL1: [260, 168],
          nL2: [190, 210],
          nR1: [700, 168],
          nR2: [780, 112],
          L1: [390, 470],
          L2: [500, 480],
          L3: [610, 470],
          cav: [500, 548],
        },
        arrows: [
          { side: 'top', points: [[440, 262], [440, 230], [440, 200]], style: 'retreat' },
          { side: 'top', points: [[560, 262], [560, 230], [560, 200]], style: 'retreat' },
          { side: 'bottom', points: [[380, 600], [384, 540], [388, 498]] },
          { side: 'bottom', points: [[620, 600], [616, 540], [612, 498]] },
        ],
      },
      {
        title: 'The trap springs',
        caption: 'After a march of some 12 to 16 miles the Romans halt, exhausted. Saburra gives the signal and forms line. He keeps his foot back, mostly for show, and sends his horsemen round both Roman wings.',
        at: {
          L1: [390, 350],
          L2: [500, 360],
          L3: [610, 350],
          cav: [500, 420],
          nL1: [250, 334],
          nL2: [300, 452],
          nR1: [750, 334],
          nR2: [700, 452],
        },
        arrows: [
          { side: 'bottom', points: [[390, 456], [390, 416], [390, 380]] },
          { side: 'bottom', points: [[610, 456], [610, 416], [610, 380]] },
          { side: 'top', points: [[256, 182], [236, 250], [246, 310]] },
          { side: 'top', points: [[186, 224], [200, 360], [268, 434]] },
          { side: 'top', points: [[704, 182], [764, 250], [754, 310]] },
          { side: 'top', points: [[790, 126], [816, 280], [770, 400], [732, 436]] },
        ],
      },
      {
        title: 'Cut off on the plain',
        caption: 'Cohorts that charge out find the horsemen slipping away, then closing in behind to cut them off. Curio orders the army to make for the nearby hills, but Saburra has sent horsemen to seize them first.',
        at: {
          L1: [300, 292],
          nL1: [180, 248],
          nL2: [380, 400],
          nR1: [866, 232],
        },
        arrows: [
          { side: 'bottom', points: [[384, 336], [348, 318], [328, 308]] },
          { side: 'top', points: [[240, 326], [210, 290], [196, 266]], style: 'retreat' },
          { side: 'top', points: [[300, 444], [340, 428], [356, 416]] },
          { side: 'bottom', points: [[650, 336], [710, 300], [796, 256]] },
          { side: 'top', points: [[764, 322], [800, 282], [832, 254]] },
        ],
      },
      {
        title: "Curio's last stand",
        caption: "Surrounded and spent, the Romans are cut down where they stand. Curio refuses Gnaeus Domitius' plea to ride for the camp, saying he cannot face Caesar after losing his army, and dies fighting. Only a few horsemen escape.",
        at: {
          L1: [380, 320],
          L2: [500, 340],
          L3: [620, 322],
          nL1: [270, 276],
          nL2: [400, 416],
          nR2: [620, 420],
          guard: [700, 236],
          nf1: [450, 260],
          nf2: [570, 264],
        },
        broken: ['L1', 'L2', 'L3'],
        gone: ['cav'],
        arrows: [
          { side: 'top', points: [[440, 186], [445, 216], [449, 236]] },
          { side: 'top', points: [[560, 186], [566, 218], [569, 240]] },
          { side: 'bottom', points: [[476, 436], [380, 500], [270, 552], [196, 572]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: 'Decisive Numidian victory; Curio killed',
    losses: 'Caesarians: the field army was wiped out with Curio; only a few horsemen escaped (Caesar). Numidian losses are unrecorded.',
    text: [
      'At the camp the quaestor Marcius Rufus tried to ship the survivors to Sicily, but panic swamped the boats and few got away. The rest surrendered to Varus. Next day Juba had most of them killed; Varus protested but dared not stop him. Appian tells a different story, of a march in the summer heat with Juba himself on the field.',
      'Caesar had lost two legions and the province of Africa, which became the chief Pompeian stronghold. Survivors of Pharsalus gathered there under Metellus Scipio, with Juba as their ally, and Caesar did not win it back until Thapsus in 46 BC.',
    ],
  },
  sources: [
    'Caesar, Civil War 2.37–44',
    'Appian, Civil Wars 2.45–46',
    'Cassius Dio, Roman History 41.41–42',
    'Adrian Goldsworthy, Caesar: Life of a Colossus (2006)',
  ],
};

export default history;
