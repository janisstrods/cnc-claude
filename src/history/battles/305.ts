// 305 Sucro, 75 BC. Top: Sertorians (Quintus Sertorius); bottom: Romans (Pompey).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '305',
  context: {
    war: 'Sertorian War, 80–72 BC',
    text: [
      "After his victory near Valentia, Pompey marched south towards the river Sucro (the modern Júcar). Metellus Pius, who had beaten Sertorius' quaestor Hirtuleius, was on his way to join him. Sertorius came to meet Pompey, determined to fight him before the two Roman armies could unite, and Pompey was just as eager to win alone and keep the glory for himself.",
      'They met near the town of Sucro, whose exact site is unknown. Sertorius brought on the battle late in the day: Plutarch says he reckoned that darkness would hamper an enemy who did not know the country, whether in flight or in pursuit.',
    ],
  },
  sides: {
    top: {
      name: 'Sertorians',
      commanders: ['Quintus Sertorius (right wing, then left)', "Marcus Perperna Veiento (the game's Perpenna; named by Appian, post uncertain)"],
      strength: 'Not recorded; Galba, cited by Orosius, gave Sertorius 60,000 foot and 8,000 horse in 76 BC',
      forces: 'Roman exiles and Spanish foot armed and drilled in Roman fashion, with horse and a body of Libyans (Africans).',
    },
    bottom: {
      name: "Pompey's army: Romans and allies",
      commanders: ['Gnaeus Pompeius Magnus (right wing; wounded)', 'Lucius Afranius (left wing)'],
      strength: 'Not recorded',
      forces: "Legions and allied troops fresh from the victory at Valentia; Metellus Pius' army was still on its way.",
    },
  },
  map: {
    terrain: [
      { kind: 'hills', points: [[140, -40], [300, -40], [296, 62], [220, 96], [226, 200], [-60, 212], [-60, 60], [130, 58]] },
      { kind: 'hills', points: [[782, -40], [1060, -40], [1060, 208], [858, 206], [850, 140], [782, 132]] },
      { kind: 'camp', at: [410, 62], size: 52 },
      { kind: 'label', at: [288, 30], text: 'Sertorian camp' },
    ],
    units: [
      { id: 'sert', side: 'top', kind: 'horse', label: 'Sertorius', w: 60, h: 20 },
      { id: 'sR1', side: 'top', kind: 'foot', label: 'Sertorian right', w: 100, h: 26 },
      { id: 'sR2', side: 'top', kind: 'foot', w: 100, h: 26 },
      { id: 'sC', side: 'top', kind: 'foot', w: 100, h: 26 },
      { id: 'sL1', side: 'top', kind: 'foot', w: 100, h: 26 },
      { id: 'sL2', side: 'top', kind: 'foot', label: 'Sertorian left', w: 100, h: 26 },
      { id: 'afr1', side: 'bottom', kind: 'foot', w: 100, h: 26 },
      { id: 'afr2', side: 'bottom', kind: 'foot', label: 'Afranius', w: 100, h: 26 },
      { id: 'pC', side: 'bottom', kind: 'foot', w: 100, h: 26 },
      { id: 'pom1', side: 'bottom', kind: 'foot', w: 100, h: 26 },
      { id: 'pom2', side: 'bottom', kind: 'foot', label: 'Pompey', w: 100, h: 26 },
      { id: 'met', side: 'bottom', kind: 'foot', label: 'Metellus (next day)', w: 110, h: 26 },
    ],
    phases: [
      {
        title: 'Battle at dusk',
        caption: "Late in the day the armies meet near the Sucro; the exact site is unknown. Sertorius, on his own right, engages Afranius, who leads Pompey's left. Pompey commands his right wing in person.",
        at: {
          sert: [300, 165],
          sR1: [245, 220],
          sR2: [360, 220],
          sC: [500, 220],
          sL1: [640, 220],
          sL2: [755, 220],
          afr1: [245, 400],
          afr2: [360, 400],
          pC: [500, 400],
          pom1: [640, 400],
          pom2: [755, 400],
        },
        arrows: [
          { side: 'top', points: [[302, 242], [302, 300]] },
          { side: 'bottom', points: [[698, 378], [698, 300]] },
        ],
      },
      {
        title: 'Sertorius changes wings',
        caption: "Pompey's wing drives back the Sertorian left. Told that it is giving way, Sertorius hands his own wing to other officers and hurries across to rally it.",
        at: {
          sR1: [245, 268],
          sR2: [360, 268],
          afr1: [245, 312],
          afr2: [360, 312],
          sL1: [640, 160],
          sL2: [755, 155],
          pom1: [640, 205],
          pom2: [755, 205],
          sert: [700, 108],
        },
        arrows: [
          { side: 'bottom', points: [[640, 380], [640, 232]] },
          { side: 'bottom', points: [[755, 380], [755, 232]] },
          { side: 'bottom', points: [[302, 380], [302, 340]] },
          { side: 'top', points: [[330, 160], [480, 138], [664, 112]] },
        ],
      },
      {
        title: 'A wing each',
        caption: 'Sertorius rallies the left and routs Pompey, who is wounded and escapes by abandoning his richly decked horse to squabbling Libyans. On the other wing Afranius breaks the Sertorian right, follows it into its camp and starts plundering in the dark.',
        at: {
          sert: [698, 252],
          sL1: [640, 300],
          sL2: [755, 300],
          pom1: [630, 455],
          pom2: [765, 465],
          afr1: [410, 48],
          afr2: [280, 150],
        },
        broken: ['pom1', 'pom2'],
        gone: ['sR1', 'sR2'],
        arrows: [
          { side: 'top', points: [[640, 176], [640, 270]] },
          { side: 'top', points: [[755, 172], [755, 270]] },
          { side: 'bottom', points: [[630, 480], [618, 545], [606, 612]], style: 'rout' },
          { side: 'bottom', points: [[765, 490], [790, 550], [812, 612]], style: 'rout' },
          { side: 'top', points: [[250, 255], [300, 165], [352, 108]], style: 'rout' },
          { side: 'bottom', points: [[360, 300], [392, 190], [408, 82]] },
        ],
      },
      {
        title: 'Sertorius returns, Metellus nears',
        caption: "Sertorius comes back and falls on Afranius' scattered plunderers, killing many. At dawn both armies form up again, but Metellus is approaching, and Sertorius breaks off and withdraws.",
        at: {
          sert: [470, 170],
          sL1: [545, 125],
          sL2: [545, 62],
          met: [880, 545],
        },
        broken: ['afr1', 'afr2'],
        gone: ['pom1', 'pom2'],
        arrows: [
          { side: 'top', points: [[755, 285], [700, 160], [606, 94]] },
          { side: 'top', points: [[640, 285], [590, 205], [512, 174]] },
          { side: 'bottom', points: [[372, 72], [352, 200], [335, 330]], style: 'rout' },
          { side: 'bottom', points: [[262, 168], [222, 270], [196, 370]], style: 'rout' },
          { side: 'bottom', points: [[1018, 585], [985, 560], [950, 548]] },
        ],
      },
    ],
  },
  outcome: {
    winner: 'draw',
    result: 'Indecisive: each side won on one wing',
    losses: 'Not reliably recorded. Orosius, probably describing this battle, says Pompey lost 10,000 and Sertorius nearly as many; Appian speaks of heavy slaughter on both sides.',
    text: [
      'Sertorius won the greater honour, though Pompey later counted the captured camp among his successes. Next morning Sertorius formed up again but withdrew on learning that Metellus was near, saying, Plutarch reports, that but for that old woman he would have thrashed the boy and sent him back to Rome. His army scattered, as it often did, to gather again later.',
      "Appian tells the battle differently, with Metellus beating Perperna on the field, but Plutarch's fuller account is usually preferred. The united Roman armies fought Sertorius again soon afterwards near Saguntum (Appian's Seguntia), and the war dragged on until Perperna and other officers murdered him in 73 or 72 BC.",
    ],
  },
  sources: [
    'Plutarch, Life of Sertorius 19',
    'Plutarch, Life of Pompey 19',
    'Appian, Civil Wars 1.110',
    "Sallust, Histories 2.51–54 and Pompey's letter, 2.82 (McGushin's numbering)",
    'Orosius, Histories against the Pagans 5.23.9–11',
  ],
};

export default history;
