// 220 Teutoburger Wald P1, 9 AD. Top: Germanic tribes (Arminius); bottom: Romans (Publius Quinctilius Varus).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '220',
  context: {
    war: "Rome's wars in Germany, 12 BC–AD 16: the Varian disaster, AD 9",
    text: [
      'From 12 BC Roman armies under Drusus and then Tiberius campaigned as far as the Elbe, and Rome began to treat the land beyond the Rhine as a province in the making, with garrisons, markets and new towns. In about AD 7 Augustus sent Publius Quinctilius Varus, once governor of Syria, to finish the work. Velleius says he sat in judgement as if in a peaceful province; Dio adds that he demanded tribute and gave orders like a master.',
      "Arminius, a Cheruscan prince who had served with Roman auxiliaries and won citizenship and equestrian rank, plotted a rising with his father Segimer while dining at Varus' table. Another Cheruscan noble, Segestes, warned Varus and was not believed. Late in the campaigning season of AD 9 word came of a revolt among distant tribes. Varus set out to crush it, and the chiefs rode off, saying they would gather allies.",
    ],
  },
  sides: {
    top: {
      name: 'Cherusci and allied Germanic peoples',
      commanders: ['Arminius (Cherusci)', 'Segimer, his father'],
      strength: 'Not recorded',
      forces: 'Warriors of the Cherusci and their neighbours, probably including Bructeri and Marsi; mostly foot with spears and javelins, who knew the forest paths.',
    },
    bottom: {
      name: 'Romans and auxiliaries',
      commanders: ['Publius Quinctilius Varus (legate of Augustus)', 'Numonius Vala (legate)', 'Lucius Eggius and Ceionius (camp prefects)'],
      strength: 'Three legions, three alae and six cohorts (Velleius), less detachments: perhaps 15,000–20,000 men',
      forces: 'Legions, probably XVII, XVIII and XIX, with auxiliary horse and foot, burdened with wagons, pack animals, women, children and servants (Dio).',
    },
  },
  map: {
    terrain: [
      { kind: 'woods', points: [[-60, -60], [1060, -60], [1060, 150], [900, 176], [760, 150], [620, 186], [480, 158], [340, 190], [200, 162], [80, 186], [-60, 166]] },
      { kind: 'label', at: [320, 64], text: 'Forest' },
      { kind: 'hills', points: [[196, 246], [350, 230], [520, 236], [680, 242], [722, 282], [662, 320], [480, 316], [300, 320], [204, 300]], label: 'Wooded hills' },
      { kind: 'woods', points: [[-60, 300], [70, 290], [160, 326], [150, 396], [60, 414], [-60, 404]] },
      { kind: 'hills', points: [[826, 362], [900, 340], [1060, 346], [1060, 600], [940, 612], [840, 588], [812, 470]] },
      { kind: 'label', at: [930, 362], text: 'Wooded height' },
      { kind: 'marsh', points: [[120, 556], [400, 540], [640, 546], [790, 566], [800, 660], [100, 660]], label: 'Bog' },
      { kind: 'road', points: [[-40, 470], [200, 456], [500, 450], [800, 458], [1040, 444]] },
    ],
    units: [
      { id: 'g1', side: 'top', kind: 'warband', w: 100, h: 28 },
      { id: 'g2', side: 'top', kind: 'warband', label: 'Germanic warriors', w: 100, h: 28 },
      { id: 'g3', side: 'top', kind: 'warband', label: 'Arminius', w: 100, h: 28 },
      { id: 'g4', side: 'top', kind: 'warband', w: 100, h: 28 },
      { id: 'g5', side: 'top', kind: 'warband', w: 100, h: 28 },
      { id: 'gL', side: 'top', kind: 'warband', w: 90, h: 26 },
      { id: 'rear', side: 'bottom', kind: 'foot', label: 'Rearguard', w: 84, h: 18 },
      { id: 'l3', side: 'bottom', kind: 'foot', w: 120, h: 20 },
      { id: 'l2', side: 'bottom', kind: 'foot', label: 'Legions', w: 120, h: 20 },
      { id: 'l1', side: 'bottom', kind: 'foot', w: 120, h: 20 },
      { id: 'aux', side: 'bottom', kind: 'foot', label: 'Auxiliaries', w: 84, h: 18 },
      { id: 'cav', side: 'bottom', kind: 'horse', label: 'Cavalry', w: 56, h: 18 },
    ],
    phases: [
      {
        title: 'On the march',
        caption: 'Rain lashes the long column as it labours along a forest track, felling trees and bridging gullies. Wagons, pack animals, women, children and servants straggle among the troops. Arminius and the chiefs have ridden off, promising to bring allies.',
        at: {
          g1: [130, 120],
          g2: [330, 272],
          g3: [500, 112],
          g4: [640, 276],
          g5: [860, 116],
          gL: [60, 362],
          rear: [90, 462],
          l3: [230, 456],
          l2: [390, 452],
          l1: [550, 454],
          aux: [690, 458],
          cav: [780, 452],
        },
        arrows: [{ side: 'bottom', points: [[812, 452], [884, 448]] }],
      },
      {
        title: 'Ambush from the thickets',
        caption: 'The tribesmen, who know every path, burst from the thickets on all sides at once: first javelins from cover, then hand-to-hand. Tangled up with the wagons and outnumbered wherever they are struck, the Romans cannot form a line.',
        at: {
          g1: [160, 386],
          g2: [320, 390],
          g3: [480, 386],
          g4: [640, 390],
          g5: [800, 388],
          gL: [100, 522],
        },
        broken: ['rear'],
        arrows: [
          { side: 'top', points: [[130, 150], [146, 260], [156, 348]] },
          { side: 'top', points: [[330, 296], [326, 352]] },
          { side: 'top', points: [[500, 140], [492, 260], [484, 348]] },
          { side: 'top', points: [[640, 300], [640, 352]] },
          { side: 'top', points: [[860, 144], [830, 260], [806, 350]] },
          { side: 'top', points: [[30, 394], [22, 462], [40, 504]] },
        ],
      },
      {
        title: 'A camp for the night',
        caption: 'Fighting as they go, the Romans struggle onto a wooded height and entrench a camp as best they can. Their losses are heavy, but the army still holds together. Dio names no places; the map is a reconstruction.',
        at: {
          l1: [915, 392],
          l2: [850, 472, 90],
          l3: [982, 472, 90],
          cav: [915, 462],
          rear: [915, 503],
          aux: [915, 550],
          g1: [400, 410],
          g2: [560, 412],
          g3: [720, 420],
          g4: [820, 300],
          g5: [950, 300],
          gL: [700, 532],
        },
        arrows: [
          { side: 'bottom', points: [[240, 490], [500, 496], [700, 500], [804, 504]] },
          { side: 'top', points: [[190, 410], [336, 410]] },
          { side: 'top', points: [[660, 370], [740, 330], [764, 318]] },
          { side: 'top', points: [[120, 548], [400, 546], [640, 536]] },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: 'Germanic victory: the first day of the Varian disaster',
    losses: 'Not recorded for the first day; Dio says the Romans, outnumbered at every point, suffered greatly.',
    text: [
      "Night ended the first day's fighting with the army mauled but still intact. Over the next three days it tried to fight its way out and was destroyed almost to a man. The Germans had begun by killing the small detachments Varus had sent to guard their villages, and the rising now swept away Rome's posts east of the Rhine.",
      "Only Aliso held out, until its camp prefect Lucius Caedicius broke out with the garrison on a stormy night and reached safety. Varus' nephew Lucius Asprenas marched his two legions to the camps on the lower Rhine and kept the tribes on the west bank loyal. Where the first attack fell is unknown. Velleius, who had served in Germany, wrote within about twenty years; Dio, two centuries later, gives the only day-by-day account.",
    ],
  },
  sources: [
    'Cassius Dio, Roman History 56.18–22',
    'Velleius Paterculus, Roman History 2.117–120',
    'Tacitus, Annals 1.55, 1.60–61',
    'Florus, Epitome 2.30.29–39',
    "Adrian Murdoch, Rome's Greatest Defeat: Massacre in the Teutoburg Forest (2006)",
  ],
};

export default history;
