// 006 Lake Trasimenus, 217 BC. Top: Carthaginians (Hannibal); bottom: Romans (Flaminius).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '006',
  context: {
    war: 'Second Punic War, 218–201 BC',
    text: [
      "In the spring of 217 BC Rome posted its new consuls to bar Hannibal's way south: Gnaeus Servilius Geminus at Ariminum on the Adriatic and Gaius Flaminius at Arretium in Etruria. Hannibal crossed the Apennines by an unexpected route and struggled through flooded marshland, where he lost the sight of one eye. He then ravaged the country around Flaminius to provoke him.",
      'Flaminius, a popular politician eager for a victory, followed without waiting for his colleague. Hannibal turned along the north shore of Lake Trasimenus, where the road passes through a narrow entrance into a valley ringed by hills. That night he hid his army on the slopes above it, and at dawn, in June, the Roman column marched in through a thick mist.',
    ],
  },
  sides: {
    top: {
      name: 'Carthaginians and Gallic allies',
      commanders: ['Hannibal Barca', 'Maharbal (cavalry)'],
      strength: 'Unknown; perhaps c. 50,000, many of them newly joined Gauls (modern estimates)',
      forces: 'African and Spanish heavy foot, Balearic slingers and light infantry, Gallic warriors, and Spanish, Gallic and Numidian cavalry.',
    },
    bottom: {
      name: 'Romans and Italian allies',
      commanders: ['Gaius Flaminius (consul)'],
      strength: 'Perhaps 25,000–30,000 (modern estimates); the ancient loss figures imply more',
      forces: 'A consular army of Roman legions and Italian allies, caught in marching column.',
    },
  },
  map: {
    north: 0,
    terrain: [
      { kind: 'hills', points: [[-60, -60], [1060, -60], [1060, 470], [900, 498], [770, 508], [690, 468], [650, 340], [560, 320], [400, 358], [250, 420], [120, 440], [40, 468], [-60, 480]] },
      { kind: 'lake', points: [[-60, 580], [120, 562], [300, 530], [480, 532], [620, 552], [800, 566], [1060, 560], [1060, 660], [-60, 660]], label: 'Lake Trasimenus' },
      { kind: 'road', points: [[-60, 512], [120, 500], [300, 498], [480, 504], [620, 526], [780, 540], [1060, 536]] },
      { kind: 'label', at: [300, 120], text: 'Hills above the shore' },
      { kind: 'label', at: [860, 120], text: 'Steep hill' },
    ],
    units: [
      { id: 'cav1', side: 'top', kind: 'horse', label: 'Cavalry', w: 70, h: 24 },
      { id: 'cav2', side: 'top', kind: 'horse', w: 70, h: 24 },
      { id: 'g1', side: 'top', kind: 'warband', label: 'Gauls', w: 100, h: 28 },
      { id: 'g2', side: 'top', kind: 'warband', w: 100, h: 28 },
      { id: 'lt1', side: 'top', kind: 'light', label: 'Light troops', w: 80, h: 14 },
      { id: 'lt2', side: 'top', kind: 'light', w: 80, h: 14 },
      { id: 'af1', side: 'top', kind: 'foot', w: 100, h: 30 },
      { id: 'af2', side: 'top', kind: 'foot', label: 'Africans & Spaniards', w: 100, h: 30 },
      { id: 'rear', side: 'bottom', kind: 'foot', label: 'Rearguard', w: 90, h: 22 },
      { id: 'c2', side: 'bottom', kind: 'foot', w: 90, h: 22 },
      { id: 'c3', side: 'bottom', kind: 'foot', label: 'Flaminius & legions', w: 90, h: 22 },
      { id: 'c4', side: 'bottom', kind: 'foot', w: 90, h: 22 },
      { id: 'van', side: 'bottom', kind: 'foot', label: 'Vanguard', w: 90, h: 22 },
    ],
    phases: [
      {
        title: 'The trap is set',
        caption: "Flaminius' army files along the shore road in thick mist. Hannibal's Africans and Spaniards hold the hill at the far end, light troops line the slopes above, and Gauls and cavalry wait behind the hills near the entrance.",
        at: {
          cav1: [70, 330],
          cav2: [150, 262],
          g1: [250, 250],
          g2: [360, 230],
          lt1: [470, 262],
          lt2: [570, 282],
          af1: [760, 270],
          af2: [880, 250],
          rear: [130, 503],
          c2: [220, 493],
          c3: [330, 490],
          c4: [440, 495],
          van: [560, 507],
        },
      },
      {
        title: 'Attack from all sides',
        caption: "At Hannibal's signal his army charges down out of the mist. The cavalry closes the entrance behind the column, and the Romans, still in marching order and unable to see, are struck in front, flank and rear at once.",
        at: {
          cav1: [110, 540],
          cav2: [140, 440],
          g1: [240, 425],
          g2: [350, 420],
          lt1: [462, 432],
          lt2: [560, 442],
          af1: [690, 470],
          af2: [790, 440],
        },
        arrows: [
          { side: 'top', points: [[70, 346], [56, 450], [68, 522]] },
          { side: 'top', points: [[150, 278], [143, 415]] },
          { side: 'top', points: [[250, 266], [242, 400]] },
          { side: 'top', points: [[360, 246], [352, 395]] },
          { side: 'top', points: [[470, 272], [462, 412]] },
          { side: 'top', points: [[760, 287], [710, 445]] },
        ],
      },
      {
        title: 'Slaughter by the lake',
        caption: 'Penned between hills and lake, the column is cut to pieces in some three hours; Flaminius is killed and many drown trying to escape. About 6,000 at the head break through onto high ground, only to surrender to Maharbal.',
        at: {
          van: [900, 350],
          c2: [240, 556],
          c4: [450, 550],
          g1: [235, 466],
          g2: [345, 452],
          lt1: [458, 462],
          af1: [600, 478],
        },
        broken: ['rear', 'c2', 'c3', 'c4'],
        arrows: [
          { side: 'bottom', points: [[610, 510], [770, 528], [870, 470], [896, 385]] },
          { side: 'bottom', points: [[224, 490], [236, 540]], style: 'rout' },
          { side: 'bottom', points: [[444, 492], [448, 534]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: 'Decisive Carthaginian victory',
    losses: 'Romans: c. 15,000 killed and over 15,000 captured (Polybius); Livy has 10,000 escaping to Rome. Carthaginians: c. 1,500, mostly Gauls (Polybius); 2,500 in Livy.',
    text: [
      'Flaminius died in the fighting, cut down, Livy says, by an Insubrian horseman. Hannibal kept the Roman prisoners but freed the Italian allies without ransom, declaring that he had come to fight Rome, not the Italians. Days later Maharbal destroyed 4,000 cavalry sent ahead by Servilius under Gaius Centenius.',
      'At Rome a praetor told the crowd simply that a great battle had been lost. Rome made Quintus Fabius Maximus dictator, and he began the cautious strategy of shadowing Hannibal and refusing battle. Hannibal did not march on the city but turned east to the Adriatic coast to rest and re-equip his army.',
    ],
  },
  sources: [
    'Polybius, Histories 3.77–86',
    'Livy, History of Rome 22.3–8',
    'Ovid, Fasti 6.765–768 (the date)',
    "J. F. Lazenby, Hannibal's War (1978)",
  ],
};

export default history;
