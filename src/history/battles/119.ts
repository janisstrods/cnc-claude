// 119 Raphia, 217 BC. Top: Ptolemaic army (Ptolemy IV); bottom: Seleucid army (Antiochus III).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '119',
  context: {
    war: 'Fourth Syrian War, 219–217 BC',
    text: [
      "Since 301 BC the Ptolemies of Egypt and the Seleucids of Syria had disputed Coele-Syria, the land between them. In 219–218 BC the young Antiochus III overran much of it, helped by the defection of Ptolemy's governor Theodotus. Ptolemy IV's ministers Sosibius and Agathocles stalled him with talks while they hired mercenaries and retrained the army at Alexandria, even drilling some 20,000 native Egyptians as pikemen.",
      'In spring 217 BC Ptolemy marched across the desert from Pelusium. Antiochus came south past Gaza and camped near Raphia, the first Syrian town on the road from Egypt. After five days of skirmishing, and a failed attempt by Theodotus to kill Ptolemy in his camp, the two kings gave battle on 22 June.',
    ],
  },
  sides: {
    top: {
      name: 'Ptolemaic army',
      commanders: ['Ptolemy IV Philopator (left wing)', 'Echecrates (right-wing cavalry)', 'Andromachus and Sosibius (phalanx)', 'Phoxidas (Greek mercenaries)'],
      strength: '70,000 foot, 5,000 horse and 73 elephants (Polybius)',
      forces: 'A Macedonian-style phalanx of 25,000 and 20,000 Egyptians, Greek mercenaries, Libyans, Cretans, Gauls and Thracians, and smaller African elephants.',
    },
    bottom: {
      name: 'Seleucid army',
      commanders: ['Antiochus III (right wing)', 'Themison (left-wing cavalry)', 'Nicarchus and Theodotus Hemiolius (phalanx)', 'Theodotus the Aetolian (Silver Shields)'],
      strength: '62,000 foot, 6,000 horse and 102 elephants (Polybius)',
      forces: 'A phalanx of 20,000, 10,000 picked Silver Shields, Greek mercenaries, Cretans, Arabs, Medes and other eastern levies, and Indian elephants.',
    },
  },
  map: {
    terrain: [
      { kind: 'camp', at: [500, 52], size: 30, label: "Ptolemy's camp" },
      { kind: 'camp', at: [700, 545], size: 26, label: "Antiochus' camp" },
    ],
    units: [
      { id: 'pEch', side: 'top', kind: 'horse', label: 'Echecrates', w: 76, h: 24 },
      { id: 'pGT', side: 'top', kind: 'warband', label: 'Gauls & Thracians', w: 80, h: 26 },
      { id: 'pMerc', side: 'top', kind: 'foot', label: 'Mercenaries', w: 90, h: 28 },
      { id: 'pEgy', side: 'top', kind: 'foot', label: 'Egyptian phalanx', w: 140, h: 38 },
      { id: 'pMac', side: 'top', kind: 'foot', label: 'Macedonian phalanx', w: 150, h: 38 },
      { id: 'pGuard', side: 'top', kind: 'foot', label: 'Guard & Libyans', w: 110, h: 28 },
      { id: 'pPol', side: 'top', kind: 'horse', label: "Polycrates' horse", w: 80, h: 24 },
      { id: 'pEl33', side: 'top', kind: 'elephants', label: '33 elephants', w: 70, h: 24 },
      { id: 'pEl40', side: 'top', kind: 'elephants', label: '40 elephants', w: 80, h: 24 },
      { id: 'sThem', side: 'bottom', kind: 'horse', label: "Themison's horse", w: 76, h: 24 },
      { id: 'sLight', side: 'bottom', kind: 'light', label: 'Light troops', w: 80, h: 14 },
      { id: 'sArab', side: 'bottom', kind: 'warband', label: 'Arabs & Medes', w: 110, h: 28 },
      { id: 'sPhal', side: 'bottom', kind: 'foot', label: "Nicarchus' phalanx", w: 150, h: 38 },
      { id: 'sSilv', side: 'bottom', kind: 'foot', label: 'Silver Shields', w: 110, h: 32 },
      { id: 'sMerc', side: 'bottom', kind: 'foot', label: 'Greek mercenaries', w: 90, h: 28 },
      { id: 'sAnt', side: 'bottom', kind: 'horse', label: "Antiochus' horse", w: 100, h: 28 },
      { id: 'sEl42', side: 'bottom', kind: 'elephants', label: '42 elephants', w: 80, h: 24 },
      { id: 'sEl60', side: 'bottom', kind: 'elephants', label: '60 elephants', w: 90, h: 24 },
    ],
    phases: [
      {
        title: 'Deployment',
        caption: 'Both kings mass their phalanxes in the centre and screen their wings with elephants. Ptolemy takes post on his left and Antiochus on his right, so the two kings face each other on the same flank.',
        at: {
          pEch: [75, 175],
          pGT: [175, 175],
          pMerc: [275, 175],
          pEgy: [410, 175],
          pMac: [568, 175],
          pGuard: [715, 175],
          pPol: [865, 175],
          pEl33: [100, 245],
          pEl40: [850, 245],
          sThem: [75, 425],
          sLight: [170, 425],
          sArab: [285, 425],
          sPhal: [430, 425],
          sSilv: [585, 425],
          sMerc: [705, 425],
          sAnt: [870, 430],
          sEl42: [100, 355],
          sEl60: [860, 355],
        },
      },
      {
        title: 'The royal wing breaks',
        caption: "Most of Ptolemy's African elephants shy from the larger Indian beasts and stampede back into his guard. Antiochus rides round them and routs Polycrates' horse, while his Greek mercenaries drive back the disordered Ptolemaic left.",
        at: {
          pEl40: [785, 118],
          pGuard: [712, 155],
          pPol: [905, 110],
          sEl60: [852, 270],
          sAnt: [918, 232],
          sMerc: [712, 238],
        },
        broken: ['pEl40', 'pGuard', 'pPol'],
        arrows: [
          { side: 'top', points: [[848, 232], [805, 140]], style: 'rout' },
          { side: 'bottom', points: [[880, 412], [950, 340], [930, 260]] },
          { side: 'bottom', points: [[705, 408], [710, 266]] },
          { side: 'bottom', points: [[860, 340], [854, 296]] },
        ],
      },
      {
        title: 'Echecrates strikes back',
        caption: "On the other flank Echecrates rides round the elephants and charges Themison's horse in flank and rear, while Phoxidas' mercenaries rout the Arabs and Medes. Antiochus, chasing the beaten wing, rides out of sight.",
        at: {
          pEch: [115, 488],
          pMerc: [285, 395],
          sArab: [292, 478],
        },
        broken: ['sThem', 'sArab'],
        gone: ['pPol', 'sAnt'],
        arrows: [
          { side: 'top', points: [[42, 190], [22, 330], [50, 470], [70, 486]] },
          { side: 'top', points: [[275, 192], [282, 368]] },
          { side: 'bottom', points: [[918, 216], [955, 120], [975, 14]] },
          { side: 'top', points: [[905, 96], [945, 10]], style: 'rout' },
        ],
      },
      {
        title: 'The phalanxes decide',
        caption: 'Ptolemy escapes to his phalanx and leads it forward with levelled pikes. After a brief resistance the Seleucid phalanx breaks and the whole line flees. Antiochus returns too late and falls back to Raphia.',
        at: {
          pEgy: [410, 330],
          pMac: [568, 330],
          sPhal: [432, 470],
          sSilv: [590, 462],
          sLight: [228, 462],
        },
        broken: ['sPhal', 'sSilv', 'sLight'],
        gone: ['sThem', 'sArab'],
        arrows: [
          { side: 'top', points: [[410, 196], [410, 304]] },
          { side: 'top', points: [[568, 196], [568, 304]] },
          { side: 'bottom', points: [[400, 492], [380, 560], [360, 612]], style: 'rout' },
          { side: 'bottom', points: [[600, 482], [606, 560], [610, 612]], style: 'rout' },
          { side: 'bottom', points: [[58, 446], [44, 540], [30, 612]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: 'Decisive Ptolemaic victory',
    losses: 'Seleucids: nearly 10,000 foot and over 300 horse killed, over 4,000 captured. Ptolemaic army: c. 1,500 foot and 700 horse, and 16 elephants; most of the rest were captured (Polybius).',
    text: [
      'Antiochus withdrew to Gaza and then Antioch and asked for peace. Ptolemy recovered Coele-Syria, where the towns welcomed him, and granted a truce on easy terms. The Egyptian priests honoured his victory in the trilingual Raphia Decree.',
      'Polybius believed that arming the Egyptians had taught them their own strength. Native revolts followed, and Upper Egypt broke away from about 205 to 186 BC. Antiochus rebuilt his power in a long eastern campaign and took Coele-Syria for good at Panium in 200 BC.',
    ],
  },
  sources: [
    'Polybius, Histories 5.63–65, 5.79–87, 5.107',
    'The Raphia Decree (Memphis, 217 BC)',
    'Bezalel Bar-Kochva, The Seleucid Army (1976)',
  ],
};

export default history;
