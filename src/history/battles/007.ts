// 007 Cannae, 216 BC. Top: Carthaginians (Hannibal); bottom: Romans (Varro).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '007',
  context: {
    war: 'Second Punic War, 218–201 BC',
    text: [
      "Hannibal had crossed the Alps in 218 BC and destroyed Roman armies at the Trebbia and Lake Trasimene. The dictator Fabius Maximus then shadowed him and refused battle, a cautious strategy that cost Fabius his popularity. For 216 BC Rome raised the largest army in its history, eight reinforced legions with as many allied troops, under the consuls Lucius Aemilius Paullus and Gaius Terentius Varro.",
      "In early summer Hannibal seized the Roman supply depot at Cannae in Apulia. The consuls followed him there, and on 2 August, Varro's turn of command, the Romans formed for battle on the open plain beside the river Aufidus.",
    ],
  },
  sides: {
    top: {
      name: 'Carthaginians and allies',
      commanders: ['Hannibal Barca', 'Mago (centre)', 'Hasdrubal (left-wing cavalry)', 'Hanno or Maharbal (Numidians)'],
      strength: 'c. 40,000 foot and 10,000 horse (Polybius)',
      forces: 'African veterans, Gallic and Spanish foot and heavy horse, Numidian light horse, Balearic slingers.',
    },
    bottom: {
      name: 'Romans and Italian allies',
      commanders: ['Gaius Terentius Varro (consul)', 'Lucius Aemilius Paullus (consul)', 'Gnaeus Servilius Geminus (centre)'],
      strength: 'c. 80,000 foot and 6,000 horse (Polybius); modern estimates are often lower',
      forces: 'Eight Roman legions and as many allied troops, many newly raised; outnumbered in cavalry.',
    },
  },
  map: {
    north: 180,
    terrain: [
      { kind: 'river', points: [[935, -30], [962, 140], [925, 330], [968, 470], [945, 640]], width: 20, label: 'Aufidus' },
      { kind: 'town', at: [860, 52], size: 18, label: 'Cannae' },
    ],
    units: [
      { id: 'numid', side: 'top', kind: 'lighthorse', label: 'Numidians', w: 76, h: 18 },
      { id: 'libL', side: 'top', kind: 'foot', label: 'Libyans', w: 90, h: 44 },
      { id: 'gs1', side: 'top', kind: 'warband', w: 100, h: 28 },
      { id: 'gs2', side: 'top', kind: 'warband', label: 'Gauls & Spaniards', w: 100, h: 28 },
      { id: 'gs3', side: 'top', kind: 'warband', w: 100, h: 28 },
      { id: 'libR', side: 'top', kind: 'foot', label: 'Libyans', w: 90, h: 44 },
      { id: 'hasd', side: 'top', kind: 'horse', label: "Hasdrubal's horse", w: 84, h: 24 },
      { id: 'allcav', side: 'bottom', kind: 'horse', label: 'Allied horse', w: 80, h: 22 },
      { id: 'inf1', side: 'bottom', kind: 'foot', w: 96, h: 56 },
      { id: 'inf2', side: 'bottom', kind: 'foot', label: 'Roman & allied foot', w: 96, h: 56 },
      { id: 'inf3', side: 'bottom', kind: 'foot', w: 96, h: 56 },
      { id: 'rcav', side: 'bottom', kind: 'horse', label: 'Roman horse', w: 72, h: 22 },
    ],
    phases: [
      {
        title: 'Deployment',
        caption: 'Varro packs the legions deep and narrow to smash the centre. Hannibal pushes his Gauls and Spaniards forward in a crescent, with African veterans held back on each flank and cavalry on both wings.',
        at: {
          numid: [140, 200],
          libL: [285, 178],
          gs1: [398, 224, 14],
          gs2: [500, 252],
          gs3: [602, 224, -14],
          libR: [715, 178],
          hasd: [858, 200],
          allcav: [150, 440],
          inf1: [392, 452],
          inf2: [500, 452],
          inf3: [608, 452],
          rcav: [840, 440],
        },
      },
      {
        title: 'The centre gives way',
        caption: "Hasdrubal's heavy horse routs the Roman cavalry by the river. In the centre the legions drive the crescent back until it bends inward, drawing them deeper between the waiting Africans.",
        at: {
          gs1: [400, 250, -12],
          gs2: [500, 232],
          gs3: [600, 250, 12],
          inf1: [392, 296],
          inf2: [500, 280],
          inf3: [608, 296],
          hasd: [838, 400],
          rcav: [880, 530],
        },
        broken: ['rcav'],
        arrows: [
          { side: 'bottom', points: [[392, 420], [392, 336]] },
          { side: 'bottom', points: [[500, 420], [500, 320]] },
          { side: 'bottom', points: [[608, 420], [608, 336]] },
          { side: 'top', points: [[858, 226], [852, 300], [842, 378]] },
          { side: 'bottom', points: [[860, 552], [905, 610]], style: 'rout' },
        ],
      },
      {
        title: 'Hasdrubal rides round',
        caption: 'Hasdrubal rides behind the Roman army to fall on the allied cavalry, which breaks and flees. The African phalanxes turn inward against both flanks of the crowded legions.',
        at: {
          hasd: [290, 520],
          numid: [150, 380],
          allcav: [120, 470],
          libL: [298, 300, 90],
          libR: [702, 300, -90],
          gs1: [402, 236, -14],
          gs2: [500, 216],
          gs3: [598, 236, 14],
          inf1: [394, 286],
          inf2: [500, 264],
          inf3: [606, 286],
        },
        broken: ['allcav'],
        gone: ['rcav'],
        arrows: [
          { side: 'top', points: [[830, 425], [720, 545], [520, 580], [330, 538]] },
          { side: 'top', points: [[270, 204], [276, 262], [312, 300], [338, 302]] },
          { side: 'top', points: [[730, 204], [724, 262], [688, 300], [662, 302]] },
        ],
      },
      {
        title: 'The trap closes',
        caption: 'Hasdrubal leaves the Numidians to pursue the fleeing allies and strikes the Roman rear. Surrounded and too tightly packed to fight, the legions are cut down until evening.',
        at: {
          hasd: [500, 352],
          libL: [318, 288, 90],
          libR: [682, 288, -90],
          inf1: [398, 284],
          inf2: [500, 268],
          inf3: [602, 284],
        },
        broken: ['inf1', 'inf2', 'inf3'],
        gone: ['allcav', 'numid'],
        arrows: [
          { side: 'top', points: [[290, 525], [420, 470], [488, 384]] },
          { side: 'top', points: [[150, 400], [90, 520], [40, 610]] },
          { side: 'bottom', points: [[120, 490], [60, 570], [10, 612]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: 'Decisive Carthaginian victory',
    losses: 'Romans: c. 70,000 dead by Polybius, c. 50,000 dead and 19,000 captured by Livy; Paullus fell. Carthaginians: c. 5,700–8,000, mostly Gauls.',
    text: [
      'Cannae was one of the bloodiest single days in the history of war, and some eighty senators were among the dead. Capua and much of southern Italy went over to Hannibal, and Philip V of Macedon allied with him in 215 BC.',
      "Yet Rome did not ask for terms. It refused to ransom the prisoners, raised new legions, even arming slaves, and returned to Fabius' strategy of avoiding pitched battle. Hannibal, without siege engines or steady reinforcement, did not march on Rome, and the war dragged on for fourteen more years until Zama.",
    ],
  },
  sources: [
    'Polybius, Histories 3.107–118',
    'Livy, History of Rome 22.38–61',
    'Plutarch, Life of Fabius Maximus 14–18',
    'Adrian Goldsworthy, Cannae (2001)',
  ],
};

export default history;
