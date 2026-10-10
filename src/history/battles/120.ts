// 120 Cynoscephalae, 197 BC. Top: Macedonians (Philip V); bottom: Romans (Flamininus).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '120',
  context: {
    war: 'Second Macedonian War, 200–197 BC',
    text: [
      "Rome declared war on Philip V of Macedon in 200 BC, answering appeals from Pergamum, Rhodes and Athens against his expansion in the Aegean. Two years of campaigning achieved little until the young consul Titus Quinctius Flamininus forced the Aous gorge in 198 BC, demanded that Philip leave Greece altogether, and won over the Achaean League.",
      "In 197 BC, his command extended, Flamininus marched into Thessaly with his Aetolian allies, and Philip came south to meet him. After a skirmish near Pherae both armies moved west towards Scotussa on opposite sides of a line of rugged hills called Cynoscephalae, the Dog's Heads, each unsure where the other was. At dawn thick mist covered the ridges.",
    ],
  },
  sides: {
    top: {
      name: 'Macedonians and allies',
      commanders: ['Philip V (right wing)', "Nicanor 'the Elephant' (left wing)", 'Athenagoras (mercenaries)', 'Heraclides and Leon (cavalry)'],
      strength: 'c. 23,500 foot and 2,000 horse (Livy)',
      forces: '16,000 phalangites and 2,000 peltasts, with Thracians, Illyrian Trallians, Greek mercenaries and Macedonian and Thessalian horse.',
    },
    bottom: {
      name: 'Romans and Greek allies',
      commanders: ['Titus Quinctius Flamininus (proconsul)', 'Phaeneas (Aetolian general)', 'Archedamus and Eupolemus (Aetolian horse)', 'Amynander, king of Athamania'],
      strength: "About equal to Philip's, perhaps 25,000, but stronger in cavalry (Livy)",
      forces: 'Two legions with Italian allies, Aetolian horse and foot, Athamanians, Cretan and Apollonian archers, and a few war elephants.',
    },
  },
  map: {
    north: 0,
    terrain: [
      { kind: 'hills', points: [[-40, 190], [120, 182], [230, 215], [300, 290], [245, 360], [190, 410], [100, 400], [-40, 385]] },
      { kind: 'hills', points: [[350, 205], [470, 196], [530, 128], [592, 150], [585, 222], [655, 280], [622, 342], [472, 348], [420, 405], [352, 382], [338, 285]] },
      { kind: 'hills', points: [[700, 202], [800, 190], [872, 222], [882, 320], [792, 346], [702, 332], [690, 262]] },
      { kind: 'label', at: [505, 322], text: 'Cynoscephalae ridges' },
      { kind: 'camp', at: [890, 55], size: 30, label: 'Macedonian camp' },
    ],
    units: [
      { id: 'mPelt', side: 'top', kind: 'foot', label: 'Peltasts', w: 70, h: 28 },
      { id: 'mPhR', side: 'top', kind: 'foot', label: "Philip's phalanx", w: 120, h: 44 },
      { id: 'mCover', side: 'top', kind: 'light', label: 'Covering force', w: 80, h: 14 },
      { id: 'mCav', side: 'top', kind: 'horse', label: 'Macedonian horse', w: 64, h: 22 },
      { id: 'mPhL', side: 'top', kind: 'foot', label: "Nicanor's phalanx", w: 46, h: 120 },
      { id: 'rLight', side: 'bottom', kind: 'light', label: 'Light troops', w: 80, h: 14 },
      { id: 'rAet', side: 'bottom', kind: 'horse', label: 'Aetolian horse', w: 64, h: 22 },
      { id: 'rL1', side: 'bottom', kind: 'foot', label: 'Roman left', w: 110, h: 30 },
      { id: 'rL2', side: 'bottom', kind: 'foot', w: 110, h: 30 },
      { id: 'rEle', side: 'bottom', kind: 'elephants', label: 'Elephants', w: 80, h: 24 },
      { id: 'rR1', side: 'bottom', kind: 'foot', label: 'Roman right', w: 110, h: 30 },
      { id: 'rR2', side: 'bottom', kind: 'foot', w: 110, h: 30 },
      { id: 'rTrib', side: 'bottom', kind: 'foot', label: '20 maniples', w: 90, h: 26 },
    ],
    phases: [
      {
        title: 'Mist on the ridges',
        caption: "In thick mist Philip's covering force on the ridges beats off Roman scouts. Both sides feed in troops, and Philip, told the Romans are fleeing, marches out. Flamininus leads his left wing forward; his right waits behind its elephants.",
        at: {
          mPelt: [95, 115],
          mPhR: [215, 110],
          mCover: [235, 292],
          mCav: [372, 300],
          mPhL: [745, 92],
          rLight: [235, 372],
          rAet: [372, 378],
          rL1: [200, 445],
          rL2: [330, 445],
          rEle: [705, 420],
          rR1: [640, 485],
          rR2: [770, 485],
          rTrib: [705, 545],
        },
        arrows: [
          { side: 'top', points: [[215, 136], [222, 200], [228, 268]] },
          { side: 'top', points: [[745, 156], [745, 230]] },
          { side: 'bottom', points: [[200, 550], [200, 472]] },
          { side: 'bottom', points: [[330, 550], [330, 472]] },
        ],
      },
      {
        title: 'Philip charges downhill',
        caption: "Philip forms the right half of his phalanx on the crest, doubles its depth and charges downhill with levelled pikes, driving the Roman left back. Nicanor's half is still climbing the ridge in marching column.",
        at: {
          mPhR: [215, 392],
          mPelt: [85, 395],
          mCover: [335, 305],
          mPhL: [745, 178],
          rL1: [200, 525],
          rL2: [330, 525],
          rAet: [70, 498],
        },
        gone: ['rLight', 'mCav'],
        arrows: [
          { side: 'top', points: [[215, 150], [215, 362]] },
          { side: 'top', points: [[90, 150], [86, 374]] },
          { side: 'bottom', points: [[200, 436], [200, 504]], style: 'retreat' },
          { side: 'bottom', points: [[330, 436], [330, 504]], style: 'retreat' },
          { side: 'top', points: [[745, 38], [745, 108]] },
        ],
      },
      {
        title: 'Elephants on the right',
        caption: "Seeing his left giving way, Flamininus rides to his right wing and leads it, elephants in front, against Nicanor's men. Caught on broken ground before they can form, they break at the first shock.",
        at: {
          rEle: [722, 298],
          rR1: [650, 368],
          rR2: [790, 368],
          rTrib: [722, 432],
          mPhL: [748, 150],
          mPhR: [215, 428],
          mPelt: [85, 432],
          rL1: [200, 548],
          rL2: [330, 548],
        },
        broken: ['mPhL'],
        arrows: [
          { side: 'bottom', points: [[705, 405], [718, 326]] },
          { side: 'bottom', points: [[640, 468], [647, 396]] },
          { side: 'bottom', points: [[792, 474], [792, 396]] },
          { side: 'top', points: [[770, 88], [800, 16]], style: 'rout' },
        ],
      },
      {
        title: 'Struck from behind',
        caption: "An unnamed tribune wheels about twenty maniples from the victorious right onto the rear of Philip's phalanx, which cannot turn to meet them. It breaks and Philip flees; on the ridge, Macedonians raising their pikes in surrender are cut down.",
        at: {
          rTrib: [225, 366],
          rL1: [200, 505],
          rL2: [330, 505],
        },
        broken: ['mPhR', 'mPelt'],
        gone: ['mPhL', 'mCover'],
        arrows: [
          { side: 'bottom', points: [[692, 440], [560, 424], [420, 386], [298, 368]] },
          { side: 'top', points: [[60, 420], [40, 300], [24, 150]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Decisive Roman victory',
    losses: 'Macedonians: c. 8,000 killed and 5,000 captured (Polybius; Roman annalists claimed far more). Romans: c. 700 killed.',
    text: [
      'Philip escaped through the vale of Tempe and asked for terms. In the peace of 196 BC he gave up all his possessions outside Macedonia, surrendered most of his fleet, paid an indemnity and sent his son Demetrius to Rome as a hostage. At the Isthmian Games that year Flamininus proclaimed the Greeks free, and the Roman army left Greece in 194 BC.',
      'The Aetolians, who felt their part in the victory had been slighted, soon invited Antiochus III into Greece, opening the next war. Polybius made the battle his case study of why the legion beat the phalanx once the phalanx lost its formation.',
    ],
  },
  sources: [
    'Polybius, Histories 18.18–27',
    'Livy, History of Rome 33.3–11',
    'Plutarch, Life of Flamininus 7–8',
    'N. G. L. Hammond, "The Campaign and the Battle of Cynoscephalae in 197 BC", Journal of Hellenic Studies 108 (1988)',
  ],
};

export default history;
