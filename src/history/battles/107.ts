// 107 Granicus, 334 BC. Top: Macedonians (Alexander); bottom: Persians (Mithridates).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '107',
  context: {
    war: "Alexander's conquest of the Persian Empire, 334–330 BC",
    text: [
      'Philip II had planned a war on Persia and sent an advance force into Asia, but he was murdered in 336 BC. His son Alexander, aged twenty-one, crossed the Hellespont in the spring of 334 BC with some 32,000 foot and 5,000 horse, leaving Antipater to hold Macedonia and Greece.',
      'The satraps of western Asia Minor gathered their cavalry and Greek mercenaries at Zeleia. Memnon of Rhodes, a Greek general in Persian service, urged them to retreat and burn the land, but they chose to fight behind the river Granicus. Alexander reached it in May, late in the day. Arrian and Plutarch say he attacked at once; Diodorus has him cross unopposed at dawn. The map follows Arrian.',
    ],
  },
  sides: {
    top: {
      name: 'Macedonians and Greek allies',
      commanders: ['Alexander III (right wing)', 'Parmenio (left wing)', 'Philotas (Companion cavalry)', 'Amyntas son of Arrhabaeus (advance guard)'],
      strength: 'c. 30,000–32,000 foot and 4,500–5,000 horse crossed to Asia (Arrian, Diodorus); perhaps fewer at the river',
      forces: 'Companion cavalry, hypaspists and phalanx, Thessalian and allied Greek horse, Paeonian and Thracian light horse, Agrianian javelin-men and archers.',
    },
    bottom: {
      name: 'Persians and Greek mercenaries',
      commanders: ['Arsites and Spithridates (satraps)', "Mithridates (Darius' son-in-law)", 'Memnon of Rhodes', 'Omares (mercenaries)'],
      strength: 'Arrian: 20,000 horse and nearly 20,000 mercenary foot; Diodorus: 10,000 horse, 100,000 foot. Modern estimates are lower.',
      forces: "Cavalry of the western satrapies and the satraps' households, with a body of Greek mercenary hoplites; no single supreme commander.",
    },
  },
  map: {
    north: 90,
    terrain: [
      { kind: 'river', points: [[-30, 226], [170, 244], [380, 230], [600, 246], [800, 232], [1030, 244]], width: 26, label: 'Granicus' },
      { kind: 'hills', points: [[230, 470], [500, 452], [780, 470], [840, 560], [800, 650], [200, 650], [170, 560]] },
    ],
    units: [
      { id: 'agr', side: 'top', kind: 'light', label: 'Agrianians', w: 70, h: 14 },
      { id: 'comp', side: 'top', kind: 'horse', label: 'Companions', w: 90, h: 26 },
      { id: 'van', side: 'top', kind: 'lighthorse', label: 'Advance guard', w: 80, h: 18 },
      { id: 'hyp', side: 'top', kind: 'foot', label: 'Hypaspists', w: 90, h: 30 },
      { id: 'ph1', side: 'top', kind: 'foot', label: 'Phalanx', w: 100, h: 34 },
      { id: 'ph2', side: 'top', kind: 'foot', w: 100, h: 34 },
      { id: 'ph3', side: 'top', kind: 'foot', w: 100, h: 34 },
      { id: 'ally', side: 'top', kind: 'horse', label: 'Allied horse', w: 64, h: 22 },
      { id: 'thess', side: 'top', kind: 'horse', label: 'Thessalians', w: 90, h: 26 },
      { id: 'pc1', side: 'bottom', kind: 'horse', label: 'Persian horse', w: 90, h: 34 },
      { id: 'pc2', side: 'bottom', kind: 'horse', w: 90, h: 34 },
      { id: 'pc3', side: 'bottom', kind: 'horse', w: 110, h: 24 },
      { id: 'pc4', side: 'bottom', kind: 'horse', w: 110, h: 24 },
      { id: 'pc5', side: 'bottom', kind: 'horse', w: 110, h: 24 },
      { id: 'merc', side: 'bottom', kind: 'foot', label: 'Greek mercenaries', w: 280, h: 40 },
    ],
    phases: [
      {
        title: 'Deployment',
        caption: 'On the west bank Alexander leads the right with the Companions, Parmenio the left. The satraps line the steep far bank with cavalry, massed opposite Alexander, and keep their Greek mercenary foot back on higher ground.',
        at: {
          agr: [70, 140],
          comp: [160, 160],
          van: [265, 172],
          hyp: [370, 165],
          ph1: [480, 165],
          ph2: [590, 165],
          ph3: [700, 165],
          ally: [800, 160],
          thess: [910, 160],
          pc1: [140, 304],
          pc2: [250, 304],
          pc3: [430, 300],
          pc4: [610, 300],
          pc5: [820, 300],
          merc: [500, 510],
        },
      },
      {
        title: 'Into the river',
        caption: "Amyntas' advance guard, led by Socrates' squadron, plunges in first and is mauled from the bank. Alexander follows with the Companions, slanting downstream so that his men come out of the water in line.",
        at: {
          van: [330, 258],
          comp: [210, 248],
          agr: [90, 236],
        },
        broken: ['van'],
        arrows: [
          { side: 'top', points: [[262, 186], [290, 210], [312, 228]] },
          { side: 'top', points: [[140, 176], [150, 196], [176, 216]] },
        ],
      },
      {
        title: 'Fight on the bank',
        caption: "A savage cavalry fight on the bank. Alexander kills Mithridates and Cleitus saves him from a satrap's blow. The Persian centre breaks, then the wings, while the phalanx and the Thessalians cross.",
        at: {
          comp: [215, 318],
          agr: [80, 300],
          pc1: [110, 410],
          pc2: [245, 414],
          pc3: [430, 336],
          pc4: [610, 336],
          hyp: [370, 292],
          ph1: [480, 292],
          ph2: [590, 292],
          ph3: [700, 292],
          ally: [800, 254],
          thess: [925, 292],
        },
        broken: ['pc1', 'pc2', 'pc3'],
        gone: ['van'],
        arrows: [
          { side: 'top', points: [[370, 184], [370, 250]] },
          { side: 'top', points: [[590, 184], [590, 250]] },
          { side: 'top', points: [[910, 175], [918, 250]] },
          { side: 'bottom', points: [[140, 322], [126, 356], [116, 384]], style: 'retreat' },
          { side: 'bottom', points: [[250, 322], [248, 360], [246, 388]], style: 'retreat' },
        ],
      },
      {
        title: "The mercenaries' end",
        caption: 'The Persian horse flees. The Greek mercenaries, who have not moved from their rise, are attacked by the phalanx in front and cavalry on every side; most are cut down and about 2,000 are captured.',
        at: {
          comp: [300, 556],
          thess: [700, 556],
          hyp: [330, 430],
          ph1: [440, 430],
          ph2: [550, 430],
          ph3: [660, 430],
        },
        broken: ['merc'],
        gone: ['pc1', 'pc2', 'pc3', 'pc4', 'pc5'],
        arrows: [
          { side: 'top', points: [[215, 334], [190, 440], [228, 522], [255, 546]] },
          { side: 'top', points: [[925, 308], [870, 430], [800, 520], [752, 548]] },
          { side: 'bottom', points: [[110, 430], [50, 485], [-15, 525]], style: 'rout' },
          { side: 'bottom', points: [[820, 314], [920, 420], [990, 520]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: 'Decisive Macedonian victory',
    losses: 'Persians: c. 1,000 horse by Arrian, far more by Diodorus; the mercenaries were nearly wiped out, 2,000 captured. Macedonians: c. 115 dead (Arrian), 34 (Aristobulus).',
    text: [
      'Many Persian nobles fell, Mithridates and Spithridates among them, and Arsites killed himself after the defeat. Alexander sent the captured mercenaries to forced labour in Macedonia as traitors to the Greek cause, and dedicated 300 Persian panoplies to Athena at Athens in the name of the Greeks, pointedly excepting the Spartans.',
      'No Persian field army was left in Asia Minor. Sardis surrendered without a fight, though Miletus and Halicarnassus had to be besieged. Memnon, now commanding the Persian fleet, carried the war into the Aegean until his death in 333 BC, and Darius III gathered the royal army to meet Alexander himself.',
    ],
  },
  sources: [
    'Arrian, Anabasis of Alexander 1.12–16',
    'Plutarch, Life of Alexander 16',
    'Diodorus Siculus, Library 17.18–21',
    'A. B. Bosworth, Conquest and Empire (1988)',
  ],
};

export default history;
