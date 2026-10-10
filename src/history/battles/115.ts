// 115 Ipsus, 301 BC. Top: Antigonus' army (Antigonus); bottom: Seleucus and Lysimachus (Seleucus).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '115',
  context: {
    war: 'Fourth War of the Successors, 307–301 BC',
    text: [
      "After Gabiene Antigonus was the strongest of Alexander's successors, and his rivals repeatedly combined against him. In 306 BC, after his son Demetrius destroyed Ptolemy's fleet off Salamis in Cyprus, Antigonus took the title of king, and the other dynasts soon did the same.",
      "In 302 Cassander, Lysimachus, Seleucus and Ptolemy allied once more. Lysimachus crossed into Asia Minor, and Seleucus marched west from Iran with some 400–480 war elephants, many of them from the Indian king Chandragupta. Antigonus recalled Demetrius from Greece. In 301 Seleucus and Lysimachus joined forces in Phrygia and met the Antigonids near the small town of Ipsus. Ptolemy, misled by a false report of an Antigonid victory, had pulled back to Egypt.",
    ],
  },
  sides: {
    top: {
      name: 'Antigonus and Demetrius',
      commanders: ['Antigonus the One-Eyed, over 80 (phalanx)', 'Demetrius, his son (cavalry)', 'Pyrrhus of Epirus (a young officer)'],
      strength: 'Over 70,000 foot, 10,000 horse and 75 elephants (Plutarch)',
      forces: 'A large phalanx of Macedonians, mercenaries and Asian troops; the best cavalry under Demetrius; elephants.',
    },
    bottom: {
      name: 'Seleucus, Lysimachus and allies',
      commanders: ['Seleucus I', 'Lysimachus', 'Antiochus, son of Seleucus (cavalry)'],
      strength: '64,000 foot, 10,500 horse, 400 elephants and 120 chariots (Plutarch)',
      forces: "Lysimachus' army and Cassander's troops; Seleucus' eastern army with horse archers and a great herd of elephants.",
    },
  },
  map: {
    terrain: [],
    units: [
      { id: 'dem', side: 'top', kind: 'horse', label: 'Demetrius', w: 110, h: 26 },
      { id: 'tel1', side: 'top', kind: 'elephants', label: 'Elephants', w: 70, h: 22 },
      { id: 'tel2', side: 'top', kind: 'elephants', w: 70, h: 22 },
      { id: 'tph1', side: 'top', kind: 'foot', w: 116, h: 34 },
      { id: 'tph2', side: 'top', kind: 'foot', label: "Antigonus' phalanx", w: 116, h: 34 },
      { id: 'tph3', side: 'top', kind: 'foot', w: 116, h: 34 },
      { id: 'ant', side: 'top', kind: 'horse', label: 'Antigonus', w: 54, h: 18 },
      { id: 'tlw', side: 'top', kind: 'horse', w: 90, h: 22 },
      { id: 'antio', side: 'bottom', kind: 'horse', label: 'Antiochus', w: 110, h: 26 },
      { id: 'bel1', side: 'bottom', kind: 'elephants', label: 'Elephants', w: 70, h: 22 },
      { id: 'bel2', side: 'bottom', kind: 'elephants', w: 70, h: 22 },
      { id: 'bph1', side: 'bottom', kind: 'foot', w: 116, h: 30 },
      { id: 'bph2', side: 'bottom', kind: 'foot', label: 'Allied phalanx', w: 116, h: 30 },
      { id: 'bph3', side: 'bottom', kind: 'foot', w: 116, h: 30 },
      { id: 'sel', side: 'bottom', kind: 'lighthorse', label: "Seleucus' horse", w: 70, h: 18 },
      { id: 'res1', side: 'bottom', kind: 'elephants', label: "Seleucus' elephants", w: 90, h: 24 },
      { id: 'res2', side: 'bottom', kind: 'elephants', w: 90, h: 24 },
      { id: 'rcav', side: 'bottom', kind: 'horse', w: 90, h: 22 },
    ],
    phases: [
      {
        title: 'Deployment',
        caption: 'Antigonus takes his place with the phalanx, elephants in front, while Demetrius leads the best cavalry against Antiochus, son of Seleucus. Seleucus probably holds most of his elephants back behind the allied line. The exact deployment is a modern reconstruction.',
        at: {
          dem: [150, 205],
          tel1: [390, 268],
          tel2: [610, 268],
          tph1: [380, 200],
          tph2: [500, 200],
          tph3: [620, 200],
          ant: [500, 138],
          tlw: [850, 205],
          antio: [150, 440],
          bel1: [390, 372],
          bel2: [610, 372],
          bph1: [380, 445],
          bph2: [500, 445],
          bph3: [620, 445],
          sel: [235, 520],
          res1: [440, 535],
          res2: [565, 535],
          rcav: [850, 440],
        },
      },
      {
        title: "Demetrius' charge",
        caption: "Demetrius routs Antiochus' cavalry and, too eager, pursues it far from the field. In the centre the elephants meet; by Diodorus' account Antigonus' and Lysimachus' beasts are evenly matched.",
        at: {
          tel1: [390, 300],
          tel2: [610, 300],
          bel1: [390, 338],
          bel2: [610, 338],
        },
        gone: ['antio', 'dem'],
        arrows: [
          { side: 'top', points: [[160, 222], [168, 380], [126, 520], [84, 614]] },
          { side: 'bottom', points: [[110, 456], [50, 502], [-14, 540]], style: 'rout' },
        ],
      },
      {
        title: 'The elephant wall',
        caption: "Seleucus moves his elephants across Demetrius' way back. Rather than charge the phalanx, now bare of cavalry on its flank, Seleucus' horse rides round it, threatening an attack and inviting its men to change sides.",
        at: {
          res1: [168, 430, 37],
          res2: [250, 492, 37],
          sel: [255, 268],
          dem: [100, 556],
        },
        arrows: [
          { side: 'bottom', points: [[420, 522], [300, 500], [214, 462]] },
          { side: 'bottom', points: [[230, 506], [196, 400], [236, 296]] },
          { side: 'top', points: [[150, 542], [158, 510], [164, 490]] },
        ],
      },
      {
        title: 'Antigonus falls',
        caption: "Many of Antigonus' foot go over to Seleucus and the rest flee. Antigonus, still watching for his son, falls under a shower of javelins. Demetrius escapes with some 5,000 foot and 4,000 horse.",
        at: {
          sel: [330, 128],
        },
        gone: ['tph1', 'tph2', 'tph3', 'tel1', 'tel2', 'ant', 'dem', 'tlw'],
        arrows: [
          { side: 'top', points: [[360, 222], [326, 300], [306, 352]], style: 'retreat' },
          { side: 'top', points: [[520, 180], [530, 80], [536, -10]], style: 'rout' },
          { side: 'top', points: [[640, 180], [670, 80], [690, -10]], style: 'rout' },
          { side: 'top', points: [[850, 190], [880, 80], [900, -10]], style: 'rout' },
          { side: 'top', points: [[90, 572], [50, 600], [10, 615]], style: 'retreat' },
          { side: 'bottom', points: [[255, 252], [280, 180], [312, 140]] },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Decisive victory for Seleucus and Lysimachus',
    losses: 'Not recorded. Antigonus was killed; Demetrius escaped with about 9,000 men (Plutarch).',
    text: [
      "Antigonus' death ended the last real attempt to hold Alexander's empire together. The victors shared out his lands: Lysimachus took most of Asia Minor, Seleucus Syria and parts of inner Anatolia, while Ptolemy, who had stayed away, kept the southern Syria he had occupied, a quarrel that led to a century of Syrian Wars.",
      'Demetrius fled to Ephesus. Athens shut its gates to him, but he still had a fleet and coastal cities, and in 294 BC he seized the throne of Macedon. The Hellenistic world settled into rival kingdoms: Ptolemaic Egypt, the Seleucid empire and Macedon.',
    ],
  },
  sources: [
    'Plutarch, Life of Demetrius 28–30',
    'Diodorus Siculus, Library 20.106–113 and 21.1',
    'Appian, Syrian Wars 55',
    'Plutarch, Life of Pyrrhus 4',
    'Robin Waterfield, Dividing the Spoils (2011)',
  ],
};

export default history;
