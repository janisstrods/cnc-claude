// 203 Clastidium, 222 BC. Top: Insubres and Gaesatae (Viridomarus, Britomartus in Plutarch); bottom: Romans (Marcellus).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '203',
  context: {
    war: "Rome's war with the Cisalpine Gauls, 225–222 BC",
    text: [
      'After Telamon, Rome carried the war into the Po valley. The Boii submitted in 224 BC, and in 223 the consuls Gaius Flaminius and Publius Furius beat the Insubres. When the Insubres asked for peace, the consuls of 222, Marcus Claudius Marcellus and Gnaeus Cornelius Scipio, urged Rome to refuse, and the Insubres hired some 30,000 Gaesatae from beyond the Alps.',
      'The consuls besieged Acerrae, north of the Po. Unable to relieve it, the Insubres sent part of their army across the river to besiege Clastidium (Casteggio), a town of the Anares, who had lately become Rome\'s friends, hoping to draw the Romans off. Leaving Scipio at Acerrae with the heavy infantry, Marcellus hurried there day and night with most of the cavalry and a few hundred light foot.',
    ],
  },
  sides: {
    top: {
      name: 'Insubres and Gaesatae',
      commanders: ['Viridomarus, king (Britomartus in Plutarch; killed)'],
      strength: '10,000 Gaesatae (Plutarch); Polybius speaks only of part of the Insubrian army',
      forces: 'Gaesatae from beyond the Alps and Insubres, foot and numerous horsemen, who took pride in their cavalry and despised the small Roman force.',
    },
    bottom: {
      name: 'Romans and Italian allies',
      commanders: ['Marcus Claudius Marcellus (consul)'],
      strength: 'Two-thirds of the cavalry at Acerrae and c. 600 lightly equipped foot (Plutarch); numbers unrecorded',
      forces: 'Roman and allied cavalry with a few hundred lightly equipped foot, sent ahead by forced marches without the legions.',
    },
  },
  map: {
    terrain: [
      { kind: 'river', points: [[-40, 150], [100, 104], [240, 64], [380, 24], [520, -20]], width: 22, label: 'River, perhaps the Po' },
      { kind: 'town', at: [660, 52], size: 22, label: 'Clastidium' },
      { kind: 'hills', points: [[-40, 200], [50, 196], [82, 232], [58, 270], [-40, 272]] },
      { kind: 'hills', points: [[-40, 404], [52, 400], [84, 450], [78, 520], [40, 540], [-40, 540]] },
      { kind: 'hills', points: [[1040, 130], [930, 134], [880, 170], [884, 250], [872, 300], [812, 350], [820, 396], [870, 404], [936, 350], [1040, 340]] },
    ],
    units: [
      { id: 'gh1', side: 'top', kind: 'horse', label: 'Gallic horse', w: 84, h: 24 },
      { id: 'gf1', side: 'top', kind: 'warband', w: 110, h: 30 },
      { id: 'gf2', side: 'top', kind: 'warband', label: 'Gaesatae & Insubres', w: 110, h: 30 },
      { id: 'gf3', side: 'top', kind: 'warband', w: 110, h: 30 },
      { id: 'gh2', side: 'top', kind: 'horse', w: 84, h: 24 },
      { id: 'king', side: 'top', kind: 'horse', label: 'Viridomarus', w: 40, h: 16 },
      { id: 'rc1', side: 'bottom', kind: 'horse', w: 84, h: 16 },
      { id: 'rc2', side: 'bottom', kind: 'horse', label: 'Roman & allied horse', w: 84, h: 16 },
      { id: 'rc3', side: 'bottom', kind: 'horse', w: 84, h: 16 },
      { id: 'rc4', side: 'bottom', kind: 'horse', w: 84, h: 16 },
      { id: 'marc', side: 'bottom', kind: 'horse', label: 'Marcellus', w: 40, h: 16 },
      { id: 'lt', side: 'bottom', kind: 'light', label: 'Light foot (c. 600)', w: 80, h: 14 },
    ],
    phases: [
      {
        title: 'Siege abandoned',
        caption: 'The Gauls give up the siege of Clastidium and advance in battle order, their king riding in front. Outnumbered, Marcellus stretches his cavalry into a long, thin line so that it cannot be surrounded.',
        at: {
          gh1: [230, 205],
          gf1: [370, 200],
          gf2: [500, 200],
          gf3: [630, 200],
          gh2: [770, 205],
          king: [500, 248],
          rc1: [190, 440],
          rc2: [360, 440],
          rc3: [640, 440],
          rc4: [810, 440],
          marc: [500, 432],
          lt: [500, 500],
        },
        arrows: [
          { side: 'top', points: [[628, 104], [626, 140], [624, 170]] },
          { side: 'top', points: [[694, 100], [730, 140], [754, 180]] },
          { side: 'bottom', points: [[430, 492], [300, 496], [240, 478]] },
          { side: 'bottom', points: [[570, 492], [700, 496], [760, 478]] },
        ],
      },
      {
        title: "The king's challenge",
        caption: "Marcellus' horse shies; he turns it back as if saluting the sun, and vows the finest enemy armour to Jupiter Feretrius. The king rides out in gleaming armour to challenge him, and Marcellus runs him through. Polybius omits the duel.",
        at: {
          gh1: [230, 232],
          gf1: [370, 228],
          gf2: [500, 228],
          gf3: [630, 228],
          gh2: [770, 232],
          king: [500, 300],
          marc: [500, 336],
        },
        broken: ['king'],
        arrows: [
          { side: 'bottom', points: [[500, 424], [500, 354]] },
        ],
      },
      {
        title: 'Flank and rear',
        caption: "The Roman horse charges the Gallic horse and foot together. The Gauls stand firm at first, but Marcellus' overlapping wings ride round them and strike their flanks and rear.",
        at: {
          rc1: [175, 150],
          rc2: [360, 262],
          rc3: [640, 262],
          rc4: [835, 150],
          marc: [500, 262],
        },
        gone: ['king'],
        arrows: [
          { side: 'bottom', points: [[170, 420], [100, 300], [130, 196], [160, 168]] },
          { side: 'bottom', points: [[830, 420], [905, 300], [880, 196], [850, 168]] },
          { side: 'bottom', points: [[358, 424], [360, 286]] },
          { side: 'bottom', points: [[642, 424], [640, 286]] },
        ],
      },
      {
        title: 'Rout to the river',
        caption: 'The Gauls break. Many throw themselves into a river, perhaps the Po, and are swept away; more are cut down. The site is uncertain and the map is a reconstruction.',
        at: {},
        gone: ['gh1', 'gf1', 'gf2', 'gf3', 'gh2'],
        arrows: [
          { side: 'top', points: [[370, 222], [326, 150], [296, 86]], style: 'rout' },
          { side: 'top', points: [[500, 222], [478, 140], [460, 52]], style: 'rout' },
          { side: 'top', points: [[770, 222], [772, 130], [770, 24]], style: 'rout' },
          { side: 'top', points: [[220, 244], [120, 252], [20, 238]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Decisive Roman victory',
    losses: 'Gauls: heavy, but Polybius gives no figure (Orosius claims 30,000 Gaesatae); the king fell. Romans: unrecorded.',
    text: [
      "Hearing of their king's death, the Gaesatae withdrew (Plutarch). The Romans took Acerrae, and Scipio pursued the Insubres to Mediolanum, their chief town, beat off a sortie and stormed it; the Insubres surrendered. In his triumph Marcellus carried the king's armour fixed to an oak trunk and dedicated it to Jupiter Feretrius: the spolia opima, won before only by Romulus and Aulus Cornelius Cossus, and never again.",
      'In 218 BC Rome planted colonies at Placentia and Cremona, but the Boii and Insubres rose again as Hannibal marched on Italy, and the region was not subdued until the 190s. Marcellus became one of the leading Roman generals against Hannibal, took Syracuse in 212 BC and fell in an ambush in 208.',
    ],
  },
  sources: [
    'Polybius, Histories 2.32–35',
    'Plutarch, Life of Marcellus 6–8',
    'Livy, Periochae 20',
    'Eutropius, Breviarium 3.6',
    'F. W. Walbank, A Historical Commentary on Polybius, vol. 1 (1957)',
  ],
};

export default history;
