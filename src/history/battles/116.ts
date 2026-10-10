// 116 Heraclea, 280 BC. Top: Epirotes (Pyrrhus); bottom: Romans (Valerius Laevinus).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '116',
  context: {
    war: 'Pyrrhic War, 280–275 BC',
    text: [
      'In 282 BC a Roman squadron sailed into the Gulf of Tarentum, against an old treaty, and the Tarentines sank several of its ships. When Rome went to war, Tarentum called in Pyrrhus, king of Epirus, a kinsman of Alexander the Great and one of the foremost generals of the age. He crossed in spring 280 BC with a professional Hellenistic army and twenty elephants, though a storm scattered his fleet on the way.',
      "The consul Publius Valerius Laevinus marched into Lucania to fight before Pyrrhus' Italian allies could join him. Pyrrhus camped on the plain between Pandosia and Heraclea, with the Romans across the river Siris. Impressed by the order of their camp, he chose to wait for the Lucanians and Samnites and posted guards on the bank, but Laevinus forced the crossing.",
    ],
  },
  sides: {
    top: {
      name: 'Epirotes, Greek allies and Tarentines',
      commanders: ['Pyrrhus, king of Epirus', "Megacles (wore the king's armour)", 'Leonnatus the Macedonian'],
      strength: 'Expedition of c. 20,000 foot, 3,000 horse, 2,500 archers and slingers, 20 elephants (Plutarch), plus Tarentines',
      forces: 'Pike phalanx, Thessalian and other Greek horse, archers, slingers and elephants, with Tarentine levies; his Italian allies had not yet arrived.',
    },
    bottom: {
      name: 'Romans and Italian allies',
      commanders: ['Publius Valerius Laevinus (consul)'],
      strength: 'Not recorded; modern estimates range widely, from c. 20,000 to over 40,000',
      forces: 'Citizen legions fighting in maniples, allied Italian contingents and cavalry; none had yet faced a pike phalanx or elephants.',
    },
  },
  map: {
    terrain: [
      { kind: 'river', points: [[-40, 556], [90, 570], [190, 564], [320, 590], [500, 602], [680, 590], [815, 564], [915, 570], [1040, 556]], width: 22, label: 'Siris' },
      { kind: 'hills', points: [[690, -40], [900, -40], [915, 30], [860, 80], [760, 84], [700, 44]] },
      { kind: 'town', at: [948, 44], size: 18, label: 'Heraclea' },
    ],
    units: [
      { id: 'guard', side: 'top', kind: 'light', label: 'River guards', w: 90, h: 14 },
      { id: 'pcav', side: 'top', kind: 'horse', label: 'Pyrrhus & 3,000 horse', w: 80, h: 24 },
      { id: 'ph1', side: 'top', kind: 'foot', w: 120, h: 32 },
      { id: 'ph2', side: 'top', kind: 'foot', label: 'Phalanx', w: 120, h: 32 },
      { id: 'ph3', side: 'top', kind: 'foot', w: 120, h: 32 },
      { id: 'thess', side: 'top', kind: 'horse', label: 'Thessalian horse', w: 72, h: 22 },
      { id: 'el', side: 'top', kind: 'elephants', label: 'Elephants', w: 70, h: 26 },
      { id: 'rcav1', side: 'bottom', kind: 'horse', label: 'Roman horse', w: 70, h: 22 },
      { id: 'inf1', side: 'bottom', kind: 'foot', w: 120, h: 40 },
      { id: 'inf2', side: 'bottom', kind: 'foot', label: 'Legions & allies', w: 120, h: 40 },
      { id: 'inf3', side: 'bottom', kind: 'foot', w: 120, h: 40 },
      { id: 'rcav2', side: 'bottom', kind: 'horse', w: 70, h: 22 },
    ],
    phases: [
      {
        title: 'The Romans cross',
        caption: "The Roman foot fords the Siris while their horse splashes over in several places, and Pyrrhus' guards fall back. Pyrrhus forms his phalanx and rides out with 3,000 horse to catch the Romans in disorder.",
        at: {
          guard: [500, 400],
          pcav: [250, 236],
          ph1: [370, 180],
          ph2: [500, 180],
          ph3: [630, 180],
          thess: [800, 182],
          el: [500, 88],
          rcav1: [160, 486],
          inf1: [370, 522],
          inf2: [500, 526],
          inf3: [630, 522],
          rcav2: [840, 500],
        },
        arrows: [
          { side: 'top', points: [[500, 486], [500, 416]], style: 'retreat' },
          { side: 'bottom', points: [[110, 612], [136, 560], [152, 512]] },
          { side: 'bottom', points: [[500, 618], [500, 562]] },
          { side: 'bottom', points: [[880, 612], [858, 560], [846, 526]] },
        ],
      },
      {
        title: 'Seven turns of fortune',
        caption: "Pyrrhus' horse meets the Roman cavalry, and an Italian officer kills the king's horse under him. He swaps armour with Megacles. Phalanx and legions meet, and the fight sways back and forth seven times (Plutarch).",
        at: {
          pcav: [228, 366],
          rcav1: [200, 420],
          ph1: [370, 272],
          ph2: [500, 272],
          ph3: [630, 272],
          inf1: [370, 334],
          inf2: [500, 334],
          inf3: [630, 334],
          rcav2: [835, 420],
        },
        gone: ['guard'],
        arrows: [
          { side: 'top', points: [[250, 250], [242, 300], [234, 342]] },
          { side: 'bottom', points: [[165, 500], [180, 462], [192, 440]] },
          { side: 'top', points: [[500, 198], [500, 250]] },
          { side: 'bottom', points: [[500, 504], [500, 362]] },
        ],
      },
      {
        title: 'The elephants',
        caption: "Megacles falls in the king's armour, and the Romans cheer until Pyrrhus rides bareheaded along his line. As hidden Roman horse falls on his rear (Zonaras), he sends in the elephants; the Roman horses bolt in terror.",
        at: {
          el: [800, 262],
          rcav2: [905, 228],
        },
        broken: ['rcav2'],
        arrows: [
          { side: 'bottom', points: [[845, 410], [918, 330], [908, 254]] },
          { side: 'top', points: [[540, 92], [680, 130], [760, 200], [784, 240]] },
        ],
      },
      {
        title: 'Back over the Siris',
        caption: 'Pyrrhus sends his Thessalian horse into the disorder and the legions break, fleeing back across the river. A wounded elephant runs amok and checks the pursuit (Zonaras), and night covers the Roman escape.',
        at: {
          thess: [756, 372],
          el: [852, 300],
          pcav: [236, 432],
          ph1: [370, 312],
          ph2: [500, 312],
          ph3: [630, 312],
          inf1: [370, 470],
          inf2: [500, 478],
          inf3: [630, 470],
          rcav1: [160, 520],
        },
        broken: ['inf1', 'inf2', 'inf3', 'rcav1'],
        gone: ['rcav2'],
        arrows: [
          { side: 'top', points: [[796, 196], [772, 280], [760, 350]] },
          { side: 'bottom', points: [[370, 494], [362, 545], [354, 590]], style: 'rout' },
          { side: 'bottom', points: [[500, 502], [500, 592]], style: 'rout' },
          { side: 'bottom', points: [[630, 494], [638, 545], [646, 590]], style: 'rout' },
          { side: 'bottom', points: [[160, 534], [146, 565], [134, 592]], style: 'rout' },
          { side: 'bottom', points: [[918, 250], [950, 420], [960, 588]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: 'Costly Epirote victory',
    losses: 'Romans: c. 7,000 (Hieronymus) to 15,000 (Dionysius) dead; Eutropius gives 1,800 prisoners. Pyrrhus: under 4,000 (Hieronymus) to 13,000 (Dionysius), among them many of his best officers.',
    text: [
      'Pyrrhus took the abandoned Roman camp, and the Lucanians, Samnites and several Greek cities joined him. He marched on Rome and came within about 55 km of the city (Plutarch), but the Latin allies stayed loyal and fresh Roman armies barred his way, so he withdrew south.',
      "Rome kept Laevinus in command and raised new legions. When Pyrrhus' envoy Cineas offered peace, the aged, blind Appius Claudius Caecus persuaded the Senate not to treat while an invader stood on Italian soil. The war went on, and the next year brought Asculum.",
    ],
  },
  sources: [
    'Plutarch, Life of Pyrrhus 13–19',
    'Zonaras, Epitome 8.3 (after Cassius Dio)',
    'Orosius, Histories against the Pagans 4.1',
    'Eutropius, Breviarium 2.11–12',
    'Jeff Champion, Pyrrhus of Epirus (2009)',
  ],
};

export default history;
