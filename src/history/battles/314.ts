// 314 Dyrrhachium, 48 BC. Top: Pompeians (Pompey); bottom: Caesarians (Julius Caesar).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '314',
  context: {
    war: "Caesar's Civil War, 49–45 BC: the Dyrrhachium campaign, 48 BC",
    text: [
      "Once Antony had crossed, Caesar marched on Dyrrhachium, Pompey's main depot, and reached it first. Pompey dug in on the coast at Petra, supplied by sea, and Caesar set about walling him in with a chain of hilltop forts and earthworks some 17 miles long, while Pompey built an inner ring of 24 forts. For weeks the outnumbered besiegers lived on bread made from roots, while the besieged ran short of fodder and water and their pack animals died.",
      "Then two Allobrogian brothers from Caesar's cavalry, Roucillus and Egus, rebuked for cheating their men of pay and booty, deserted to Pompey. They told him that the southern end of Caesar's lines, down by the sea, was still unfinished.",
    ],
  },
  sides: {
    top: {
      name: 'Pompeians',
      commanders: ['Pompey the Great', 'Titus Pulio (defending the old camp)'],
      strength: 'Nine legions, 7,000 horse and many archers and slingers (Caesar); 60 cohorts led the attack',
      forces: 'Roman legions with Greek and eastern auxiliaries; archers, slingers and light troops carried round by sea in boats.',
    },
    bottom: {
      name: 'Caesarians',
      commanders: ['Gaius Julius Caesar', 'Mark Antony (12 cohorts)', 'Lentulus Marcellinus (quaestor, southern sector)', 'Fulvius Postumus (his deputy)'],
      strength: 'Under-strength legions spread along 17 miles of works; 33 cohorts in the counter-attack',
      forces: 'Veteran legions, the Ninth already worn down by earlier fighting, with Gallic and German cavalry.',
    },
  },
  map: {
    north: 0,
    terrain: [
      { kind: 'sea', points: [[-60, -60], [92, -60], [88, 60], [100, 180], [90, 300], [104, 420], [92, 540], [98, 660], [-60, 660]] },
      { kind: 'hills', points: [[630, 436], [740, 414], [900, 424], [1060, 412], [1060, 660], [600, 660], [586, 540]] },
      { kind: 'woods', points: [[270, 428], [352, 422], [380, 470], [364, 528], [290, 534], [256, 480]] },
      { kind: 'hills', points: [[90, 194], [400, 194], [700, 194], [1060, 194], [1060, 205], [700, 205], [400, 205], [90, 205]] },
      { kind: 'hills', points: [[90, 279], [400, 279], [700, 279], [1060, 279], [1060, 290], [700, 290], [400, 290], [90, 290]] },
      { kind: 'river', points: [[1060, 336], [800, 344], [560, 334], [330, 346], [96, 340]], width: 12, label: 'River' },
      { kind: 'road', points: [[440, 444], [424, 400], [416, 346]] },
      { kind: 'camp', at: [640, 50], size: 30, label: "Pompey's camp" },
      { kind: 'camp', at: [560, 242], size: 30 },
      { kind: 'camp', at: [470, 470], size: 40, label: 'Old camp' },
      { kind: 'camp', at: [150, 450], size: 32, label: "Pompey's new camp" },
      { kind: 'label', at: [840, 184], text: "Caesar's inner line" },
      { kind: 'label', at: [860, 316], text: 'Outer line' },
      { kind: 'label', at: [452, 372], text: 'Wall' },
      { kind: 'label', at: [930, 588], text: 'Higher ground' },
    ],
    units: [
      { id: 'p1', side: 'top', kind: 'foot', w: 110, h: 30 },
      { id: 'p2', side: 'top', kind: 'foot', label: 'Pompey', w: 110, h: 30 },
      { id: 'p3', side: 'top', kind: 'foot', w: 110, h: 30 },
      { id: 'lt1', side: 'top', kind: 'light', label: 'Archers & light troops', w: 80, h: 14 },
      { id: 'lt2', side: 'top', kind: 'light', w: 80, h: 14 },
      { id: 'ol', side: 'top', kind: 'foot', label: 'Pompeian legion', w: 76, h: 24 },
      { id: 'n9', side: 'bottom', kind: 'foot', label: 'Ninth (two cohorts)', w: 90, h: 22 },
      { id: 'mc', side: 'bottom', kind: 'foot', label: 'Marcellinus', w: 70, h: 22 },
      { id: 'ant', side: 'bottom', kind: 'foot', label: 'Antony (12 cohorts)', w: 100, h: 26 },
      { id: 'cae', side: 'bottom', kind: 'foot', label: 'Left column (Caesar)', w: 90, h: 26 },
      { id: 'cr', side: 'bottom', kind: 'foot', label: 'Right column', w: 100, h: 24 },
    ],
    phases: [
      {
        title: 'The unfinished line',
        caption: "Two Gallic deserters have shown Pompey the weak point: by the sea, Caesar's two ramparts stand 600 feet apart, but the cross-wall closing the gap along the beach is unfinished. Two cohorts of the Ninth keep watch. The layout is a reconstruction.",
        at: {
          p1: [190, 125],
          p2: [320, 125],
          p3: [450, 125],
          lt1: [48, 172, 90],
          lt2: [48, 266, 90],
          n9: [170, 242],
          mc: [560, 242],
          ant: [820, 486],
        },
      },
      {
        title: 'Attack by land and sea',
        caption: "At dawn sixty cohorts storm the inner rampart while boats carry archers and light troops round to shower the outer one and land men in the gap. The Ninth's cohorts break, until Antony comes down from the high ground with twelve cohorts and halts the rout.",
        at: {
          p1: [230, 238],
          p2: [390, 240],
          lt1: [140, 266],
          lt2: [150, 312],
          ant: [690, 242],
        },
        broken: ['mc'],
        gone: ['n9'],
        arrows: [
          { side: 'top', points: [[200, 142], [222, 214]] },
          { side: 'top', points: [[330, 142], [372, 218]] },
          { side: 'top', points: [[54, 214], [80, 248], [98, 262]] },
          { side: 'top', points: [[54, 306], [80, 312], [104, 312]] },
          { side: 'bottom', points: [[205, 268], [350, 272], [492, 266]], style: 'rout' },
          { side: 'bottom', points: [[812, 468], [770, 360], [716, 268]] },
        ],
      },
      {
        title: 'The old camp',
        caption: "Pompey entrenches a new camp by the sea and puts a legion into an abandoned camp nearby. Caesar attacks it with 33 cohorts: his left column storms in, but the right follows a wall towards the river, mistaking it for the camp's rampart, and breaks through.",
        at: {
          p2: [150, 450],
          ol: [470, 470],
          cae: [612, 500],
          cr: [350, 390],
        },
        arrows: [
          { side: 'top', points: [[360, 258], [262, 332], [192, 424]] },
          { side: 'top', points: [[236, 478], [304, 556], [420, 494]] },
          { side: 'bottom', points: [[800, 572], [700, 530], [612, 504], [522, 488]] },
          { side: 'bottom', points: [[760, 400], [580, 396], [470, 390], [406, 390]] },
        ],
      },
      {
        title: 'Panic at the old camp',
        caption: "Pompey brings up five legions and his cavalry, and the legion in the camp sallies out. Caesar's cavalry and right column panic, many men crushed in the ditches, and the left column falls back too. Fearing a trap, Pompey does not press the pursuit.",
        at: {
          p1: [180, 392],
          p2: [300, 392],
        },
        gone: ['cr', 'cae'],
        arrows: [
          { side: 'top', points: [[222, 256], [204, 330], [188, 372]] },
          { side: 'top', points: [[196, 432], [240, 406], [262, 398]] },
          { side: 'top', points: [[512, 478], [600, 494]] },
          { side: 'bottom', points: [[410, 392], [560, 404], [700, 430]], style: 'rout' },
          { side: 'bottom', points: [[662, 506], [744, 540], [810, 572]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: "Pompeian victory: Caesar's blockade broken",
    losses: 'Caesarians: 960 men, 32 tribunes and centurions and 32 standards (Caesar); Plutarch says 2,000 dead. Pompeian losses unrecorded.',
    text: [
      "Pompey was hailed imperator, and Labienus had the prisoners paraded, mocked as 'comrades' and killed. Caesar is said to have remarked that the enemy would have won that day had their commander known how to win.",
      'With his blockade broken and food short, Caesar gave up the siege, marched to Apollonia to see to his wounded, then struck inland into Thessaly to join Domitius Calvinus. The Pompeians, sure that the war was won, pressed Pompey to follow and finish it, and a month later the armies met at Pharsalus.',
    ],
  },
  sources: [
    'Caesar, Civil War 3.41–72',
    'Appian, Civil Wars 2.60–63',
    'Plutarch, Life of Caesar 39; Life of Pompey 65–66',
    'Cassius Dio, Roman History 41.49–51',
    'Adrian Goldsworthy, Caesar: Life of a Colossus (2006)',
  ],
};

export default history;
