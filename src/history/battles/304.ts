// 304 Valentia, 75 BC. Top: Sertorians (Herennius and Perperna); bottom: Romans (Pompey).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '304',
  context: {
    war: 'Sertorian War, 80–72 BC',
    text: [
      "Quintus Sertorius, a follower of Marius outlawed by Sulla, had made himself master of much of Spain with an army of Roman exiles and Spanish warriors trained in Roman ways. In 77 BC Marcus Perperna brought him what was left of Lepidus' failed rising in Italy, and the Senate sent the young Pompey to help the proconsul Metellus Pius against him. In 76 BC Sertorius humiliated Pompey at Lauron.",
      'In spring 75 BC Pompey advanced down the east coast, while Metellus fought Sertorius\' quaestor Hirtuleius. Sertorius himself was elsewhere. Near Valentia (modern Valencia), a Roman foundation of 138 BC that held for him, Pompey found two of his lieutenants, Gaius Herennius and Perperna, both exiles whom Plutarch calls experienced soldiers.',
    ],
  },
  sides: {
    top: {
      name: 'Sertorians',
      commanders: ['Gaius Herennius (killed)', "Marcus Perperna Veiento (the game's Perpenna)"],
      strength: 'Not recorded; more than 10,000 of them fell (Plutarch)',
      forces: "Roman and Italian exiles, many probably from Lepidus' old army, with Spanish foot and horse; the game gives each general his own command.",
    },
    bottom: {
      name: "Pompey's army: Romans and allies",
      commanders: ['Gnaeus Pompeius Magnus (proconsul)'],
      strength: 'Not recorded; Galba, cited by Orosius, gave Pompey 30,000 foot and 1,000 horse at Lauron in 76 BC',
      forces: 'Legions raised in Italy in 77 BC, many of them new recruits by his own account, with allied horse and auxiliaries.',
    },
  },
  map: {
    terrain: [
      { kind: 'river', points: [[205, -30], [182, 130], [198, 290], [158, 440], [172, 640]], width: 22, label: 'River Turia' },
      { kind: 'town', at: [585, 262], size: 40, label: 'Valentia' },
    ],
    units: [
      { id: 'her1', side: 'top', kind: 'foot', label: 'Herennius', w: 100, h: 26 },
      { id: 'her2', side: 'top', kind: 'foot', w: 100, h: 26 },
      { id: 'per1', side: 'top', kind: 'foot', label: 'Perperna', w: 100, h: 26 },
      { id: 'per2', side: 'top', kind: 'foot', w: 100, h: 26 },
      { id: 'perH', side: 'top', kind: 'horse', w: 60, h: 20 },
      { id: 'pL1', side: 'bottom', kind: 'foot', w: 104, h: 26 },
      { id: 'pL2', side: 'bottom', kind: 'foot', label: "Pompey's legions", w: 104, h: 26 },
      { id: 'pL3', side: 'bottom', kind: 'foot', w: 104, h: 26 },
      { id: 'pL4', side: 'bottom', kind: 'foot', w: 104, h: 26 },
      { id: 'pH', side: 'bottom', kind: 'horse', label: 'Horse', w: 64, h: 22 },
    ],
    phases: [
      {
        title: 'Between walls and river',
        caption: 'Herennius and Perperna, each with his own troops, wait for Pompey near Valentia. A fragment of Sallust seems to place the fighting between the town walls and the river Turia, which flows close by.',
        at: {
          her1: [300, 200],
          her2: [420, 200],
          per1: [720, 165],
          per2: [840, 165],
          perH: [935, 165],
          pL1: [300, 440],
          pL2: [425, 440],
          pL3: [690, 440],
          pL4: [815, 440],
          pH: [920, 440],
        },
        arrows: [
          { side: 'bottom', points: [[362, 418], [362, 345]] },
          { side: 'bottom', points: [[752, 418], [752, 345]] },
        ],
      },
      {
        title: 'Pompey attacks',
        caption: "Pompey's legions close with both Sertorian forces, and Herennius' line gives way. The sources say almost nothing about the fighting itself, or about how the two generals stood; the map is a reconstruction.",
        at: {
          her1: [300, 212],
          her2: [420, 212],
          pL1: [300, 258],
          pL2: [425, 258],
          per1: [720, 180],
          per2: [840, 180],
          pL3: [690, 226],
          pL4: [815, 226],
          pH: [930, 250],
        },
        broken: ['her1', 'her2'],
        arrows: [
          { side: 'bottom', points: [[300, 420], [300, 290]] },
          { side: 'bottom', points: [[425, 420], [425, 290]] },
          { side: 'bottom', points: [[690, 420], [690, 258]] },
          { side: 'bottom', points: [[815, 420], [815, 258]] },
        ],
      },
      {
        title: 'Rout and sack',
        caption: 'Herennius is killed and, Plutarch says, more than 10,000 Sertorians fall. Survivors flee towards the town and Perperna gets away. Pompey storms Valentia and destroys it.',
        at: {
          pL1: [300, 150],
          pL2: [450, 300],
          pL3: [705, 196],
          pL4: [830, 196],
          pH: [945, 150],
          per1: [720, 52],
          per2: [845, 52],
          perH: [950, 60],
        },
        broken: ['per1', 'per2'],
        gone: ['her1', 'her2'],
        arrows: [
          { side: 'top', points: [[290, 190], [270, 90], [262, 10]], style: 'rout' },
          { side: 'top', points: [[440, 200], [500, 210], [532, 236]], style: 'rout' },
          { side: 'top', points: [[722, 166], [721, 120], [720, 78]], style: 'retreat' },
          { side: 'top', points: [[847, 166], [846, 120], [845, 78]], style: 'retreat' },
          { side: 'bottom', points: [[300, 240], [300, 172]] },
          { side: 'bottom', points: [[440, 270], [500, 280], [528, 274]] },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Decisive Pompeian victory',
    losses: 'Sertorians: more than 10,000 dead (Plutarch), Herennius among them. Pompeian losses unrecorded.',
    text: [
      "Pompey took Valentia and destroyed it. In his letter to the Senate, as Sallust gives it, he boasted that Herennius had been wiped out together with his army and the town. Excavations under modern Valencia have found the destruction layer of 75 BC and the remains of soldiers put to death in the forum, and the town seems to have lain largely empty for decades.",
      'After two years of setbacks Pompey had won a battle in Spain at last. Elated, he pressed south to bring Sertorius himself to battle before Metellus could arrive and share the credit, and met him on the Sucro soon afterwards.',
    ],
  },
  sources: [
    'Plutarch, Life of Pompey 17–18',
    "Sallust, Histories 2.46–47 and Pompey's letter, 2.82 (McGushin's numbering)",
    'Orosius, Histories against the Pagans 5.23.9',
    'Philip O. Spann, Quintus Sertorius and the Legacy of Sulla (1987)',
  ],
};

export default history;
