// 110 Jaxartes River, 328 BC. Top: Macedonians (Alexander); bottom: Scythians (Satraces).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '110',
  date: '329 BC',
  context: {
    war: "Alexander's campaigns in Bactria and Sogdiana, 329–327 BC",
    text: [
      'After Darius III was murdered in 330 BC, Bessus, satrap of Bactria, claimed the Persian throne. Alexander followed him over the Hindu Kush in spring 329 BC; Bessus was handed over, and the Macedonians pushed on through Sogdiana to the Jaxartes (Syr Darya), the old north-eastern frontier of the Persian empire.',
      "There, in the summer of 329 BC, Alexander began a city, Alexandria Eschate, 'the Farthest'. The Sogdians and Bactrians rose behind him, Spitamenes besieged Maracanda, and Saka nomads, whom the Greeks called Scythians, gathered on the far bank. Alexander stormed the rebel towns, taking a blow to the neck at Cyropolis, and walled his city in twenty days. When the nomads jeered at him across the river, he resolved to cross, though the omens were bad.",
    ],
  },
  sides: {
    top: {
      name: 'Macedonians and allies',
      commanders: ['Alexander III', 'Balacrus (light troops)'],
      strength: 'Not recorded; cavalry and light troops, with phalanx infantry',
      forces: 'Companion cavalry, mercenary horse, lancers and mounted javelin-men, archers, slingers and Agrianians, phalanx infantry, and bolt-shooting catapults.',
    },
    bottom: {
      name: 'Saka (Scythian) nomads',
      commanders: ['Satraces (killed)', "Carthasis, the Saka king's brother (Curtius)"],
      strength: 'Unknown; a large host of mounted archers',
      forces: 'Horse archers of the steppe, who fought in loose swarms, rode round an enemy shooting, and avoided close combat.',
    },
  },
  map: {
    north: 180,
    terrain: [
      { kind: 'river', points: [[-40, 236], [200, 254], [450, 240], [820, 254], [1000, 246], [1015, 247], [1030, 248], [1045, 250]], width: 44, label: 'Jaxartes (Tanais)' },
      { kind: 'town', at: [860, 58], size: 22, label: 'Alexandria Eschate' },
      { kind: 'hills', points: [[-60, 660], [-60, 480], [60, 455], [190, 470], [250, 540], [230, 660]] },
      { kind: 'hills', points: [[470, 660], [500, 540], [580, 520], [640, 560], [650, 660]] },
      { kind: 'hills', points: [[760, 660], [790, 520], [880, 470], [1060, 480], [1060, 660]] },
    ],
    units: [
      { id: 'merc', side: 'top', kind: 'horse', label: 'Mercenary horse', w: 70, h: 22 },
      { id: 'lanc', side: 'top', kind: 'lighthorse', label: 'Lancers', w: 70, h: 18 },
      { id: 'cat1', side: 'top', kind: 'machines', label: 'Catapults', w: 40, h: 18 },
      { id: 'arch', side: 'top', kind: 'light', label: 'Archers & slingers', w: 120, h: 14 },
      { id: 'phal', side: 'top', kind: 'foot', label: 'Phalanx', w: 170, h: 30 },
      { id: 'cat2', side: 'top', kind: 'machines', w: 40, h: 18 },
      { id: 'agr', side: 'top', kind: 'light', label: 'Agrianians', w: 70, h: 14 },
      { id: 'comp', side: 'top', kind: 'horse', label: 'Companions', w: 64, h: 40 },
      { id: 'jav', side: 'top', kind: 'lighthorse', label: 'Javelin horse', w: 70, h: 18 },
      { id: 'sc1', side: 'bottom', kind: 'lighthorse', w: 64, h: 18 },
      { id: 'sc2', side: 'bottom', kind: 'lighthorse', w: 64, h: 18 },
      { id: 'sc3', side: 'bottom', kind: 'lighthorse', label: 'Satraces', w: 64, h: 18 },
      { id: 'sc6', side: 'bottom', kind: 'lighthorse', w: 64, h: 18 },
      { id: 'sc4', side: 'bottom', kind: 'lighthorse', w: 64, h: 18 },
      { id: 'sc5', side: 'bottom', kind: 'lighthorse', label: 'Saka horse archers', w: 64, h: 18 },
    ],
    phases: [
      {
        title: 'Catapults clear the bank',
        caption: "Saka horse archers ride along the far bank, shooting and jeering. Alexander's catapults reply: their bolts strike riders across the river, one through shield and breastplate, and the nomads pull back.",
        at: {
          merc: [200, 140],
          lanc: [200, 182],
          cat1: [330, 205],
          arch: [500, 200],
          phal: [500, 140],
          cat2: [670, 205],
          agr: [660, 112],
          comp: [770, 140],
          jav: [770, 190],
          sc1: [130, 455],
          sc2: [290, 470],
          sc3: [470, 455],
          sc6: [380, 545],
          sc4: [640, 470],
          sc5: [830, 455],
        },
        arrows: [
          { side: 'bottom', points: [[300, 292], [294, 448]], style: 'retreat' },
          { side: 'bottom', points: [[470, 290], [470, 434]], style: 'retreat' },
          { side: 'bottom', points: [[640, 292], [640, 448]], style: 'retreat' },
        ],
      },
      {
        title: 'The crossing',
        caption: 'Archers and slingers land first to keep the nomads off the phalanx as it comes ashore from rafts and stuffed skins. Then all the cavalry crosses.',
        at: {
          arch: [500, 352],
          phal: [500, 306],
          merc: [320, 320],
          lanc: [320, 358],
          comp: [680, 322],
          jav: [780, 340],
          agr: [780, 302],
        },
        arrows: [
          { side: 'top', points: [[210, 200], [260, 250], [300, 290]] },
          { side: 'top', points: [[500, 168], [500, 270]] },
          { side: 'top', points: [[760, 210], [720, 255], [698, 288]] },
        ],
      },
      {
        title: 'The horse archers circle',
        caption: 'Alexander sends a regiment of mercenary horse and four squadrons of lancers ahead. Badly outnumbered, they are ringed by riders who wheel round them shooting and easily slip away.',
        at: {
          merc: [370, 432],
          lanc: [370, 468],
          sc1: [255, 450, 90],
          sc3: [490, 450, -90],
          sc2: [310, 548, 25],
          sc6: [440, 552, -25],
        },
        arrows: [
          { side: 'top', points: [[330, 375], [352, 405]] },
          { side: 'bottom', points: [[305, 398], [222, 410], [200, 500], [235, 572], [330, 594]] },
          { side: 'bottom', points: [[430, 594], [528, 566], [548, 470], [522, 404], [440, 392]] },
        ],
      },
      {
        title: 'The combined charge',
        caption: 'Alexander mixes archers, Agrianians and other light foot among his horse, then charges with three Companion regiments and the javelin horse. Pinned, the nomads cannot wheel; they break, and Satraces falls.',
        at: {
          arch: [400, 380],
          agr: [470, 420],
          comp: [560, 466],
          jav: [680, 450],
          sc1: [170, 505],
          sc2: [290, 525],
          sc6: [410, 540],
          sc4: [700, 520],
          sc5: [850, 505],
        },
        broken: ['sc1', 'sc2', 'sc6', 'sc4', 'sc5'],
        gone: ['sc3'],
        arrows: [
          { side: 'top', points: [[680, 350], [630, 400], [585, 438]] },
          { side: 'top', points: [[780, 360], [720, 400], [688, 428]] },
          { side: 'bottom', points: [[170, 515], [140, 592]], style: 'rout' },
          { side: 'bottom', points: [[410, 550], [420, 594]], style: 'rout' },
          { side: 'bottom', points: [[700, 530], [735, 592]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: 'Macedonian victory',
    losses: 'Saka: c. 1,000 dead, Satraces among them, and 150 captured (Arrian). Curtius adds 1,800 horses taken, and Macedonian losses of 60 horse and c. 100 foot dead and 1,000 wounded.',
    text: [
      'The pursuit ended in the heat: Alexander drank foul water, fell violently ill and was carried back to camp, as the seer Aristander had foretold. The Saka king soon sent envoys to disown the attack as the work of raiders and to promise obedience, and Curtius says Alexander freed the prisoners without ransom.',
      'The revolt behind him was harder. Spitamenes destroyed a relief column of over 2,000 men on the Polytimetus, and it took over a year of raids and sieges before he was killed in the winter of 328/327 BC and the Sogdian Rock fell. Alexander then married Roxane, daughter of the Bactrian noble Oxyartes.',
    ],
  },
  sources: [
    'Arrian, Anabasis 4.1–6',
    'Curtius Rufus, Histories of Alexander 7.6–9',
    'Frank L. Holt, Into the Land of Bones: Alexander the Great in Afghanistan (2005)',
  ],
};

export default history;
