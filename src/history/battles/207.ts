// 207 Vercellae, 101 BC. Top: Cimbri (Boiorix); bottom: Romans (Gaius Marius, Quintus Lutatius Catulus).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '207',
  context: {
    war: 'Cimbrian War, 113–101 BC',
    text: [
      'In 102 BC, while Marius fought the Teutones at Aquae Sextiae, the Cimbri came down from the Alps by Tridentum (Trento). The consul Quintus Lutatius Catulus tried to hold the river Atiso (Adige), but his men panicked and fell back, leaving the Cimbri the plain north of the Po. Florus says bread, wine and a mild climate softened them.',
      'In 101 BC Marius, consul for the fifth time, joined Catulus. When the Cimbri demanded land for themselves and their kinsmen the Teutones, Marius showed them the Teutonic kings in chains. King Boiorix then asked him to name a day and place for battle. Marius chose the plain near Vercellae, the Raudine Plain of Velleius and Florus; by Plutarch\'s date they fought on 30 July. The site is disputed: traditionally near Vercelli in Piedmont, though some scholars place it near the Po delta.',
    ],
  },
  sides: {
    top: {
      name: 'Cimbri',
      commanders: ['Boiorix, king of the Cimbri (killed)', 'Lugius, king (killed)', 'Claodicus and Caesorix (captured)'],
      strength: 'Unknown; Plutarch gives 15,000 horse and a foot formation some 30 stades (5.5 km) a side',
      forces: 'Germanic warriors on foot, the front ranks chained together by Plutarch\'s account, and horsemen with iron breastplates and white shields; their families followed in wagons.',
    },
    bottom: {
      name: 'Romans and Italian allies',
      commanders: ['Gaius Marius (consul; both wings)', 'Quintus Lutatius Catulus (proconsul; centre)', 'Lucius Cornelius Sulla (legate under Catulus)'],
      strength: 'c. 52,300: Marius 32,000 and Catulus 20,300 (Plutarch, from Sulla)',
      forces: "Marius' veterans of Aquae Sextiae, called back from Gaul, and Catulus' army, which had retreated from the Adige; legions and allied foot with some cavalry.",
    },
  },
  map: {
    terrain: [
      { kind: 'camp', at: [500, 70], size: 48, label: 'Cimbrian wagons' },
      { kind: 'label', at: [866, 578], text: 'Raudine Plain' },
    ],
    units: [
      { id: 'ch', side: 'top', kind: 'horse', label: 'Cimbrian horse', w: 90, h: 24 },
      { id: 'r1', side: 'top', kind: 'warband', w: 104, h: 36 },
      { id: 'r2', side: 'top', kind: 'warband', label: 'Cimbrian foot', w: 104, h: 36 },
      { id: 'r3', side: 'top', kind: 'warband', w: 104, h: 36 },
      { id: 'f1', side: 'top', kind: 'warband', w: 104, h: 36 },
      { id: 'f2', side: 'top', kind: 'warband', w: 104, h: 36 },
      { id: 'f3', side: 'top', kind: 'warband', w: 104, h: 36 },
      { id: 'mL', side: 'bottom', kind: 'foot', label: "Marius' left wing", w: 190, h: 30 },
      { id: 'cat', side: 'bottom', kind: 'foot', label: 'Catulus and Sulla', w: 230, h: 30 },
      { id: 'mR', side: 'bottom', kind: 'foot', label: "Marius' right wing", w: 190, h: 30 },
    ],
    phases: [
      {
        title: 'Battle on the open plain',
        caption: 'By Sulla\'s account Marius splits his own army between the two wings and puts Catulus in the centre. The Cimbrian foot comes on slowly in a mass as deep as it is wide, with 15,000 horse on its right.',
        at: {
          ch: [222, 252],
          r1: [392, 186],
          r2: [500, 186],
          r3: [608, 186],
          f1: [392, 230],
          f2: [500, 230],
          f3: [608, 230],
          mL: [150, 440],
          cat: [500, 446],
          mR: [850, 440],
        },
      },
      {
        title: 'The horse swerves',
        caption: 'The Cimbrian horse swerves to its right to lure the Romans in between itself and the foot. A Roman shouts that the enemy is fleeing, and the line surges after it. Orosius says the riders were driven back onto their own foot.',
        at: {
          ch: [80, 300],
          r1: [392, 220],
          r2: [500, 220],
          r3: [608, 220],
          f1: [392, 264],
          f2: [500, 264],
          f3: [608, 264],
          mL: [176, 376],
          cat: [500, 404],
          mR: [846, 390],
        },
        arrows: [
          { side: 'top', points: [[218, 266], [170, 296], [138, 302]] },
          { side: 'bottom', points: [[80, 466], [84, 404]] },
          { side: 'bottom', points: [[600, 476], [600, 432]] },
          { side: 'bottom', points: [[942, 468], [940, 418]] },
        ],
      },
      {
        title: 'Lost in the dust',
        caption: "A vast cloud of dust hides the armies. In Sulla's telling, Marius' wings miss the enemy and wander the plain, so the Cimbri fall on Catulus' centre, where Sulla fought. The sun in the Cimbri's faces and the July heat wear them down.",
        at: {
          mL: [214, 168],
          mR: [800, 168],
          r1: [392, 306],
          r2: [500, 306],
          r3: [608, 306],
          f1: [392, 350],
          f2: [500, 350],
          f3: [608, 350],
          cat: [500, 404],
        },
        arrows: [
          { side: 'bottom', points: [[180, 360], [210, 280], [214, 196]] },
          { side: 'bottom', points: [[846, 374], [812, 280], [802, 196]] },
          { side: 'top', points: [[392, 190], [392, 272]] },
          { side: 'top', points: [[500, 190], [500, 272]] },
          { side: 'top', points: [[608, 190], [608, 272]] },
        ],
      },
      {
        title: 'Slaughter at the wagons',
        caption: "The chained front ranks are cut down where they stand, and Boiorix falls fighting. The rest flee to the wagons, where women in black kill the fugitives, their children and themselves. Marius' men take the spoil of the camp.",
        at: {
          mL: [320, 100],
          mR: [690, 100],
          cat: [500, 396],
        },
        broken: ['f1', 'f2', 'f3'],
        gone: ['r1', 'r2', 'r3', 'ch'],
        arrows: [
          { side: 'bottom', points: [[120, 186], [150, 132], [198, 104]] },
          { side: 'bottom', points: [[894, 186], [864, 132], [812, 104]] },
          { side: 'top', points: [[392, 288], [424, 210], [446, 150]] },
          { side: 'top', points: [[608, 288], [576, 210], [554, 150]] },
          { side: 'top', points: [[80, 290], [56, 210], [24, 136]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Decisive Roman victory',
    losses: "Cimbri: c. 120,000 dead and over 60,000 captured (Plutarch), 140,000 and 60,000 (Livy's summary, Orosius), 65,000 dead (Florus); the kings Boiorix and Lugius fell. Romans: fewer than 300 dead (Florus).",
    text: [
      'The migrating host of the Cimbri was annihilated, and the Tigurini, waiting in the Alps, scattered (Florus). After twelve years, the danger that had cost Rome so dearly at Arausio was over.',
      "The credit was bitterly disputed. Catulus and Sulla wrote that the centre had won the day: the enemy standards were carried to Catulus' camp, and his men showed envoys from Parma enemy dead pierced by javelins marked with his name. But the people hailed Marius as the third founder of Rome, and he shared a triumph with Catulus. His rivalry with Sulla would later tear Rome apart in civil war.",
    ],
  },
  sources: [
    'Plutarch, Life of Marius 23–27',
    'Florus, Epitome 1.38.11–18',
    'Orosius, Histories against the Pagans 5.16.14–20',
    'Livy, Periochae 68',
    'Velleius Paterculus, Roman History 2.12.5',
  ],
};

export default history;
