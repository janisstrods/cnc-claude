// 013 Ilipa, 206 BC. Top: Carthaginians (Hasdrubal Gisgo); bottom: Romans (Scipio).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '013',
  context: {
    war: 'Second Punic War, 218–201 BC',
    text: [
      "Publius Cornelius Scipio had taken New Carthage in 209 BC and beaten Hasdrubal Barca at Baecula in 208. When Hasdrubal left for Italy, Carthage's other generals in Spain, Hasdrubal son of Gisgo and Hannibal's youngest brother Mago, gathered a last great army in the south, filling out their African core with Spanish levies.",
      "In 206 BC they camped beneath the hills near Ilipa, in the Baetis valley north of modern Seville. Scipio came south with his legions and a large force of Spanish allies whose loyalty he doubted. For several days both armies drew up before their camps without fighting, always late in the day and always in the same order, with their best troops in the centre.",
    ],
  },
  sides: {
    top: {
      name: 'Carthaginians, Africans and Spaniards',
      commanders: ['Hasdrubal son of Gisgo', 'Mago Barca', 'Masinissa (Numidian horse)'],
      strength: 'c. 70,000 foot, 4,000 horse and 32 elephants (Polybius); Livy gives 50,000 foot and 4,500 horse',
      forces: 'Libyan foot in the centre, Spanish levies on the wings, Carthaginian and Numidian horse, elephants.',
    },
    bottom: {
      name: 'Romans, Italian allies and Spaniards',
      commanders: ['Publius Cornelius Scipio (right)', 'Lucius Marcius Septimus (left)', 'Marcus Junius Silanus (left)'],
      strength: 'c. 45,000 foot and 3,000 horse (Polybius), many of them Spanish allies',
      forces: 'Veteran Roman and Italian legions, Spanish allies of doubtful loyalty, cavalry and light-armed velites.',
    },
  },
  map: {
    terrain: [
      { kind: 'hills', points: [[-60, -60], [1060, -60], [1060, 70], [800, 96], [500, 84], [200, 96], [-60, 70]] },
      { kind: 'camp', at: [500, 38], size: 30 },
      { kind: 'label', at: [645, 44], text: 'Carthaginian camp' },
      { kind: 'hills', points: [[-60, 660], [1060, 660], [1060, 545], [760, 520], [500, 528], [240, 520], [-60, 545]] },
      { kind: 'camp', at: [500, 556], size: 26 },
      { kind: 'label', at: [610, 562], text: 'Roman camp' },
    ],
    units: [
      { id: 'hW', side: 'top', kind: 'horse', w: 70 },
      { id: 'spW', side: 'top', kind: 'warband', label: 'Spaniards', w: 140, h: 30 },
      { id: 'elW', side: 'top', kind: 'elephants', label: 'Elephants' },
      { id: 'lib', side: 'top', kind: 'foot', label: 'Libyans', w: 220, h: 40 },
      { id: 'spE', side: 'top', kind: 'warband', label: 'Spaniards', w: 140, h: 30 },
      { id: 'elE', side: 'top', kind: 'elephants' },
      { id: 'hE', side: 'top', kind: 'horse', w: 70 },
      { id: 'cavW', side: 'bottom', kind: 'horse', w: 70 },
      { id: 'velW', side: 'bottom', kind: 'light', label: 'Velites', w: 90 },
      { id: 'legW', side: 'bottom', kind: 'foot', label: 'Legions', w: 140, h: 30 },
      { id: 'allies', side: 'bottom', kind: 'warband', label: 'Spanish allies', w: 220, h: 30 },
      { id: 'legE', side: 'bottom', kind: 'foot', label: 'Legions', w: 140, h: 30 },
      { id: 'velE', side: 'bottom', kind: 'light', w: 90 },
      { id: 'cavE', side: 'bottom', kind: 'horse', w: 70 },
    ],
    phases: [
      {
        title: 'A dawn surprise',
        caption: "Fed at dawn, Scipio's men march out with the legions on the wings and the Spanish allies in the centre, reversing his usual order, while horse and velites strike the outposts. Hasdrubal's men rush out unfed in their usual order.",
        at: {
          hW: [95, 230],
          spW: [250, 200],
          elW: [250, 256],
          lib: [500, 200],
          spE: [750, 200],
          elE: [750, 256],
          hE: [905, 230],
          cavW: [95, 330],
          velW: [300, 338],
          legW: [250, 440],
          allies: [500, 440],
          legE: [750, 440],
          velE: [700, 338],
          cavE: [905, 330],
        },
      },
      {
        title: 'The wings reach out',
        caption: 'Scipio pulls his horse and velites back behind the wings. While the allies in the centre advance slowly, the legions march out obliquely, with horse and velites beyond them, and wheel in on the enemy wings.',
        at: {
          allies: [500, 400],
          legW: [195, 342, 18],
          legE: [805, 342, -18],
          cavW: [55, 292, 30],
          cavE: [945, 292, -30],
          velW: [80, 372, 30],
          velE: [920, 372, -30],
        },
        arrows: [
          { side: 'bottom', points: [[262, 452], [236, 400]] },
          { side: 'bottom', points: [[738, 452], [764, 400]] },
          { side: 'bottom', points: [[500, 462], [500, 425]] },
        ],
      },
      {
        title: 'The wings give way',
        caption: "Stung by missiles, the elephants stampede into their own centre. The legions break the Spaniards while the Libyans stand idle, pinned by the allies in front. By midday Hasdrubal's army is falling back to its camp.",
        at: {
          legW: [235, 252, 10],
          legE: [765, 252, -10],
          cavW: [50, 150, 75],
          cavE: [950, 150, -75],
          velW: [122, 312, 40],
          velE: [878, 312, -40],
          elW: [365, 252, 35],
          elE: [635, 252, -35],
          spW: [255, 190],
          spE: [745, 190],
          allies: [500, 300],
        },
        broken: ['spW', 'spE', 'elW', 'elE', 'hW', 'hE'],
        arrows: [
          { side: 'top', points: [[575, 182], [575, 104]], style: 'retreat' },
          { side: 'bottom', points: [[42, 300], [38, 250], [42, 202]] },
          { side: 'bottom', points: [[958, 300], [962, 250], [958, 202]] },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Decisive Roman victory',
    losses: 'Not recorded. A sudden cloudburst saved the Carthaginian camp, but the army dissolved in the pursuit; Livy says only c. 6,000 escaped with Hasdrubal. Roman losses are not given.',
    text: [
      "Hasdrubal abandoned his camp by night, and Scipio's pursuit turned the retreat into a massacre. His Spanish allies deserted, Hasdrubal escaped by sea, and Mago fell back on Gades, which soon went over to Rome. Carthaginian power in Spain, built by Hamilcar Barca a generation earlier, was at an end.",
      'Masinissa, the Numidian prince who had led Carthage\'s Numidian horse, now made secret terms with the Romans, a change of sides that would matter greatly in Africa. Scipio returned to Rome, was elected consul for 205 BC and pressed for an invasion of Africa.',
    ],
  },
  sources: [
    'Polybius, Histories 11.20–24',
    'Livy, History of Rome 28.12–16',
    "J. F. Lazenby, Hannibal's War (1978)",
  ],
};

export default history;
