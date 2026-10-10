// 218 River Stour, 54 BC. Top: Britons (no leader named by Caesar); bottom: Romans (Julius Caesar).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '218',
  context: {
    war: "Caesar's Gallic War, 58–50 BC: the second expedition to Britain, 54 BC",
    text: [
      'Only two British states had sent the hostages promised in 55 BC, and over the winter Caesar built a new fleet of lower, broader ships that were easier to beach. In the summer of 54 BC he sailed from Portus Itius with five legions and about 2,000 Gallic horse, leaving Labienus to hold Gaul. More than 800 vessels, counting private ships, landed unopposed where he had come ashore the year before; the sight had frightened the Britons away from the shore to higher ground.',
      'Told by prisoners where they had gathered, Caesar left ten cohorts and 300 horse under Quintus Atrius to guard the ships and marched about 12 miles by night. He found the Britons at a river, probably the Great Stour near Canterbury, with a stronghold in the woods behind, often identified as the hillfort at Bigbury.',
    ],
  },
  sides: {
    top: {
      name: 'Britons',
      commanders: ["No leader named by Caesar (the game's Carvilius was one of four kings in Kent, named later that summer)"],
      strength: 'Not recorded',
      forces: 'Horsemen and chariots at the river; then the defenders of a wooded stronghold whose approaches were blocked with felled trees.',
    },
    bottom: {
      name: 'Romans and Gallic cavalry',
      commanders: ['Gaius Julius Caesar (proconsul)'],
      strength: 'Five legions and c. 2,000 horse landed; ten cohorts and 300 horse stayed with the ships',
      forces: 'Legionaries, the Seventh Legion among them, and Gallic cavalry, which drove the Britons back from the river.',
    },
  },
  map: {
    terrain: [
      { kind: 'woods', points: [[-60, -60], [1060, -60], [1060, 96], [900, 120], [760, 104], [640, 126], [500, 118], [360, 128], [220, 110], [80, 124], [-60, 104]] },
      { kind: 'hills', points: [[-60, 150], [120, 134], [300, 142], [500, 128], [700, 140], [880, 130], [1060, 146], [1060, 228], [880, 220], [700, 232], [500, 222], [300, 236], [120, 226], [-60, 236]] },
      { kind: 'woods', points: [[60, 470], [150, 462], [178, 510], [130, 548], [52, 530]] },
      { kind: 'woods', points: [[700, 420], [790, 410], [812, 470], [790, 530], [712, 524], [690, 470]] },
      { kind: 'woods', points: [[800, 300], [870, 294], [890, 332], [840, 352], [796, 332]] },
      { kind: 'river', points: [[-40, 262], [180, 248], [400, 266], [600, 246], [800, 262], [900, 254], [960, 250], [1040, 244]], width: 22, label: 'Stour' },
      { kind: 'camp', at: [520, 54], size: 46 },
      { kind: 'label', at: [520, 22], text: 'Stronghold' },
      { kind: 'label', at: [90, 192], text: 'Higher ground' },
      { kind: 'label', at: [850, 584], text: 'From the coast, c. 12 miles' },
    ],
    units: [
      { id: 'h1', side: 'top', kind: 'horse', label: 'British horse', w: 64, h: 22 },
      { id: 'ch1', side: 'top', kind: 'chariots', w: 54, h: 20 },
      { id: 'ch2', side: 'top', kind: 'chariots', label: 'Chariots', w: 54, h: 20 },
      { id: 'ch3', side: 'top', kind: 'chariots', w: 54, h: 20 },
      { id: 'ch4', side: 'top', kind: 'chariots', w: 54, h: 20 },
      { id: 'h2', side: 'top', kind: 'horse', w: 64, h: 22 },
      { id: 'cav1', side: 'bottom', kind: 'horse', label: 'Roman cavalry', w: 64, h: 22 },
      { id: 'cav2', side: 'bottom', kind: 'horse', w: 64, h: 22 },
      { id: 'l1', side: 'bottom', kind: 'foot', w: 100, h: 26 },
      { id: 'l2', side: 'bottom', kind: 'foot', w: 100, h: 26 },
      { id: 'l7', side: 'bottom', kind: 'foot', label: 'Seventh Legion', w: 100, h: 26 },
      { id: 'l4', side: 'bottom', kind: 'foot', w: 100, h: 26 },
    ],
    phases: [
      {
        title: 'Chariots at the river',
        caption: 'After the night march the Romans sight the enemy. British horsemen and chariots come down to the river and, from the higher ground, try to bar the way and bring on a fight.',
        at: {
          h1: [220, 196],
          ch1: [340, 200],
          ch2: [450, 204],
          ch3: [560, 200],
          ch4: [670, 204],
          h2: [790, 196],
          cav1: [420, 362],
          cav2: [580, 362],
          l1: [380, 482, 90],
          l2: [460, 482, 90],
          l7: [540, 482, 90],
          l4: [620, 482, 90],
        },
      },
      {
        title: 'The cavalry clears the way',
        caption: 'The Roman cavalry drives them off. They fall back into the woods to a stronghold, apparently built earlier for wars among themselves, its approaches blocked with felled trees, and sally out in small bands to keep the Romans out.',
        at: {
          cav1: [430, 196],
          cav2: [590, 196],
          h1: [230, 80],
          ch1: [340, 70],
          ch2: [420, 92],
          ch3: [620, 92],
          ch4: [700, 70],
          h2: [810, 80],
          l1: [330, 330, 0],
          l2: [440, 330, 0],
          l7: [560, 330, 0],
          l4: [670, 330, 0],
        },
        arrows: [
          { side: 'bottom', points: [[420, 346], [425, 280], [428, 224]] },
          { side: 'bottom', points: [[580, 346], [585, 280], [588, 224]] },
          { side: 'bottom', points: [[620, 428], [640, 390], [664, 358]] },
          { side: 'top', points: [[452, 190], [436, 146], [424, 116]], style: 'retreat' },
          { side: 'top', points: [[790, 182], [800, 136], [808, 104]], style: 'retreat' },
        ],
      },
      {
        title: 'The Seventh storms in',
        caption: 'Locking shields in a testudo, the Seventh Legion heaps up a ramp against the defences, takes the place and drives the Britons from the woods with few wounded. Caesar forbids a long pursuit over unknown ground.',
        at: {
          l7: [520, 118],
        },
        gone: ['h1', 'ch1', 'ch2', 'ch3', 'ch4', 'h2'],
        arrows: [
          { side: 'bottom', points: [[560, 314], [546, 236], [528, 162]] },
          { side: 'top', points: [[230, 66], [200, 20], [180, -14]], style: 'rout' },
          { side: 'top', points: [[400, 50], [390, 10], [384, -16]], style: 'rout' },
          { side: 'top', points: [[640, 50], [650, 10], [656, -16]], style: 'rout' },
          { side: 'top', points: [[810, 66], [840, 20], [860, -14]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Roman victory',
    losses: 'Not recorded. Caesar says only that the Seventh had few wounded.',
    text: [
      'Caesar halted because the day was far gone and he wanted time to fortify his camp. Next morning three columns had set off after the Britons when riders from Atrius brought news that a storm in the night had driven almost all the ships ashore. Caesar recalled the columns. Some 40 ships were lost, and the army spent ten days hauling the rest up into a fortified enclosure.',
      'By the time he marched inland again, the British states had set aside their quarrels and given the supreme command to Cassivellaunus, whose lands lay beyond the Thames, about 80 miles from the sea.',
    ],
  },
  sources: [
    'Caesar, Gallic War 5.8–11',
    'Cassius Dio, Roman History 40.1–2',
    'T. Rice Holmes, Ancient Britain and the Invasions of Julius Caesar (1907)',
  ],
};

export default history;
