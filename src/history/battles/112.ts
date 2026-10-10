// 112 Hellespont, 323 BC. Top: Craterus' Macedonians (Craterus); bottom: Eumenes' army (Eumenes).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '112',
  date: '321/320 BC',
  context: {
    war: 'First War of the Successors, 322–320 BC',
    text: [
      "Alexander died at Babylon in June 323 BC. Perdiccas became regent for the new kings, and Eumenes of Cardia, Alexander's Greek secretary, was given Cappadocia, which Perdiccas conquered for him. Perdiccas' ambitions soon united Antipater, Craterus, Antigonus and Ptolemy against him. Marching on Ptolemy in Egypt, he left Eumenes to hold Asia Minor.",
      "Antipater and Craterus crossed the Hellespont into Asia. Perdiccas' brother Alcetas refused to serve under Eumenes, and Neoptolemus, who held a command in Armenia, plotted to desert; Eumenes beat him, and he fled to Craterus with a few hundred horse. Craterus, the most popular of Alexander's generals, turned on Eumenes, trusting that the Macedonians would not fight him. The armies met some ten days later, in 321 or 320 BC (the chronology is disputed), at a site that is unknown; Diodorus puts it near Cappadocia.",
    ],
  },
  sides: {
    top: {
      name: 'Macedonians of Craterus and Antipater',
      commanders: ['Craterus (right wing)', 'Neoptolemus (left wing)'],
      strength: 'c. 20,000 foot, mostly Macedonians, and over 2,000 horse (Diodorus)',
      forces: 'A veteran Macedonian phalanx, the core of the army, with only a small force of cavalry on the wings.',
    },
    bottom: {
      name: 'Eumenes and the Perdiccan army',
      commanders: ['Eumenes of Cardia (right wing)', 'Pharnabazus (left-wing horse)', 'Phoenix of Tenedos (left-wing horse)'],
      strength: 'c. 20,000 foot of many peoples and 5,000 horse (Diodorus)',
      forces: 'Mixed foot, including Macedonians lately taken over from Neoptolemus; a strong cavalry force that Eumenes had raised in Cappadocia.',
    },
  },
  map: {
    terrain: [],
    units: [
      { id: 'crat', side: 'top', kind: 'horse', label: "Craterus' horse", w: 76, h: 22 },
      { id: 'ph1', side: 'top', kind: 'foot', w: 110, h: 40 },
      { id: 'ph2', side: 'top', kind: 'foot', label: 'Macedonian phalanx', w: 110, h: 40 },
      { id: 'ph3', side: 'top', kind: 'foot', w: 110, h: 40 },
      { id: 'neo', side: 'top', kind: 'horse', label: "Neoptolemus' horse", w: 76, h: 22 },
      { id: 'phar', side: 'bottom', kind: 'horse', label: 'Pharnabazus', w: 72, h: 22 },
      { id: 'phoe', side: 'bottom', kind: 'horse', label: 'Phoenix', w: 72, h: 22 },
      { id: 'f1', side: 'bottom', kind: 'foot', w: 110, h: 30 },
      { id: 'f2', side: 'bottom', kind: 'foot', label: "Eumenes' foot", w: 110, h: 30 },
      { id: 'f3', side: 'bottom', kind: 'foot', w: 110, h: 30 },
      { id: 'eum', side: 'bottom', kind: 'horse', label: 'Eumenes', w: 60, h: 22 },
      { id: 'rcav', side: 'bottom', kind: 'horse', w: 76, h: 22 },
    ],
    phases: [
      {
        title: 'Deployment',
        caption: 'Eumenes keeps the enemy\'s identity from his men and sets no Macedonians against Craterus: two squadrons of foreign horse under Pharnabazus and Phoenix face him. Eumenes takes the right with his best horse, against Neoptolemus.',
        at: {
          crat: [175, 200],
          ph1: [385, 192],
          ph2: [500, 192],
          ph3: [615, 192],
          neo: [825, 200],
          phar: [130, 425],
          phoe: [215, 425],
          f1: [385, 432],
          f2: [500, 432],
          f3: [615, 432],
          eum: [790, 425],
          rcav: [878, 425],
        },
      },
      {
        title: 'Craterus falls',
        caption: 'The cavalry clash on both wings; the sources say little of the foot. Charged at once by the foreign horse, Craterus fights hard but is unhorsed, wounded and trampled unrecognised. His leaderless horsemen break.',
        at: {
          crat: [182, 282],
          phar: [136, 348],
          phoe: [224, 348],
          neo: [818, 282],
          eum: [790, 348],
          rcav: [878, 348],
        },
        broken: ['crat'],
        arrows: [
          { side: 'bottom', points: [[130, 410], [134, 372]] },
          { side: 'bottom', points: [[215, 410], [221, 372]] },
          { side: 'top', points: [[175, 218], [179, 260]] },
          { side: 'bottom', points: [[790, 410], [790, 372]] },
          { side: 'top', points: [[825, 218], [820, 260]] },
        ],
      },
      {
        title: 'Eumenes kills Neoptolemus',
        caption: 'Eumenes and Neoptolemus, old enemies, seek each other out, grapple and fall from their horses; Eumenes kills him on the ground. Both enemy wings flee to their phalanx, which is still intact.',
        at: {
          crat: [262, 112],
          neo: [740, 112],
          phar: [262, 256],
          phoe: [322, 292],
          eum: [690, 290],
          rcav: [762, 248],
        },
        broken: ['neo'],
        arrows: [
          { side: 'top', points: [[176, 268], [206, 190], [240, 132]], style: 'rout' },
          { side: 'top', points: [[846, 268], [806, 190], [764, 132]], style: 'rout' },
          { side: 'bottom', points: [[148, 334], [190, 300], [224, 272]] },
          { side: 'bottom', points: [[232, 336], [270, 312], [290, 302]] },
          { side: 'bottom', points: [[792, 334], [740, 312], [722, 302]] },
          { side: 'bottom', points: [[878, 334], [830, 286], [800, 262]] },
        ],
      },
      {
        title: 'The phalanx slips away',
        caption: "The unbeaten phalanx accepts Eumenes' terms on oath. Allowed to fetch food from nearby villages, it slips away by night to Antipater; Eumenes, badly wounded, cannot pursue.",
        at: {},
        gone: ['ph1', 'ph2', 'ph3', 'crat', 'neo'],
        arrows: [
          { side: 'top', points: [[385, 168], [380, 70], [372, -10]], style: 'retreat' },
          { side: 'top', points: [[500, 168], [500, 70], [500, -10]], style: 'retreat' },
          { side: 'top', points: [[615, 168], [620, 70], [628, -10]], style: 'retreat' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Victory for Eumenes',
    losses: 'Not recorded; Diodorus speaks only of heavy slaughter. Craterus and Neoptolemus were both killed.',
    text: [
      'Eumenes mourned Craterus, his friend under Alexander; by Nepos\' account he gave him a splendid funeral and sent his ashes to his family in Macedonia. Killing the Macedonians\' favourite general did not make him loved.',
      "The victory also came too late. Two days before the news reached Egypt, Perdiccas had been murdered by his own officers after a failed crossing of the Nile. The army there condemned Eumenes to death, and at Triparadisus Antipater, the new regent, gave Antigonus the war against him. Eumenes fought on in Asia for five more years.",
    ],
  },
  sources: [
    'Diodorus Siculus, Library 18.29–32',
    'Plutarch, Life of Eumenes 5–8',
    'Cornelius Nepos, Eumenes 3–4',
    'Edward M. Anson, Eumenes of Cardia (2004)',
  ],
};

export default history;
