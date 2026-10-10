// 216 Sotium, 56 BC. Top: Sotiates (Adiatuanos); bottom: Romans (Publius Crassus).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '216',
  context: {
    war: "Caesar's Gallic War, 58–50 BC: Crassus in Aquitania, 56 BC",
    text: [
      'In 56 BC the Veneti and their neighbours in Armorica rose against Rome. While Caesar dealt with them, he sent his young legate Publius Crassus, son of the triumvir Marcus Crassus, to Aquitania, between the Garonne and the Pyrenees, with twelve legionary cohorts and a large force of cavalry. His task was to stop the Aquitanians sending help to the rebels in Gaul.',
      'Aquitanians had once killed a Roman legate and sent a proconsul fleeing without his baggage, so Crassus prepared carefully. He laid in grain, raised auxiliaries and cavalry, and summoned proven fighters by name from Tolosa, Carcaso and Narbo in the Province. Then he marched into the land of the Sotiates, whose town was probably at modern Sos. Where they met him is unknown.',
    ],
  },
  sides: {
    top: {
      name: 'Sotiates',
      commanders: ['Adiatuanus (Adiatunnus in Caesar), supreme commander'],
      strength: 'Not recorded; Caesar speaks of a large force, strongest in cavalry',
      forces: 'Aquitanian horse and foot, confident in their past victories; the infantry lay in ambush in a valley.',
    },
    bottom: {
      name: 'Romans and provincial allies',
      commanders: ['Publius Licinius Crassus (legate)'],
      strength: 'Twelve legionary cohorts, a little over a legion, with many cavalry and auxiliaries; total unknown',
      forces: 'Legionaries, a large cavalry force, auxiliaries and picked men summoned from the Province, eager to show what they could do without Caesar.',
    },
  },
  map: {
    terrain: [
      { kind: 'hills', points: [[-40, -40], [240, -40], [280, 40], [230, 120], [90, 140], [-40, 128]] },
      { kind: 'hills', points: [[-40, 286], [100, 268], [240, 276], [292, 324], [230, 378], [70, 392], [-40, 380]] },
      { kind: 'hills', points: [[690, 30], [850, 20], [900, 90], [850, 150], [720, 146]] },
      { kind: 'hills', points: [[470, 480], [590, 470], [630, 560], [610, 640], [460, 640]] },
      { kind: 'woods', points: [[340, 500], [430, 490], [452, 540], [380, 566], [336, 532]] },
      { kind: 'woods', points: [[640, 420], [720, 410], [742, 460], [680, 482], [630, 456]] },
      { kind: 'road', points: [[-20, 600], [120, 538], [250, 480], [520, 380], [760, 300], [1020, 214]] },
      { kind: 'label', at: [130, 166], text: 'Valley' },
      { kind: 'label', at: [880, 214], text: 'to the Sotiate town' },
    ],
    units: [
      { id: 'sh1', side: 'top', kind: 'horse', label: 'Sotiate horse', w: 64, h: 22 },
      { id: 'sh2', side: 'top', kind: 'horse', w: 64, h: 22 },
      { id: 'sf1', side: 'top', kind: 'warband', label: 'Sotiate foot', w: 104, h: 30 },
      { id: 'sf2', side: 'top', kind: 'warband', w: 104, h: 30 },
      { id: 'rc1', side: 'bottom', kind: 'horse', label: 'Roman cavalry', w: 60, h: 20 },
      { id: 'rc2', side: 'bottom', kind: 'horse', w: 60, h: 20 },
      { id: 'co1', side: 'bottom', kind: 'foot', w: 90, h: 24 },
      { id: 'co2', side: 'bottom', kind: 'foot', label: 'Legionary cohorts', w: 90, h: 24 },
      { id: 'co3', side: 'bottom', kind: 'foot', w: 90, h: 24 },
      { id: 'aux', side: 'bottom', kind: 'light', label: 'Auxiliaries', w: 76, h: 14 },
    ],
    phases: [
      {
        title: 'Attack on the column',
        caption: 'Crassus marches into the land of the Sotiates. Their horsemen, the strength of their army, fall on the Roman column on the march, and the Roman cavalry rides out to meet them. Their foot waits hidden in a valley.',
        at: {
          sh1: [560, 170],
          sh2: [670, 150],
          sf1: [80, 210],
          sf2: [196, 214],
          aux: [150, 524, -24],
          co1: [270, 472, -21],
          co2: [380, 432, -20],
          co3: [490, 391, -20],
          rc1: [596, 354, -19],
          rc2: [680, 326, -18],
        },
        arrows: [
          { side: 'top', points: [[560, 186], [568, 250], [580, 310]] },
          { side: 'top', points: [[670, 166], [676, 230], [682, 286]] },
        ],
      },
      {
        title: 'The horse beaten',
        caption: 'The Roman cavalry beats the Sotiate horse and chases it, the troopers spreading out as they ride after the fugitives.',
        at: {
          sh1: [390, 62],
          sh2: [500, 50],
          rc1: [430, 150],
          rc2: [530, 130],
        },
        broken: ['sh1', 'sh2'],
        arrows: [
          { side: 'top', points: [[560, 160], [490, 110], [430, 78]], style: 'rout' },
          { side: 'top', points: [[670, 140], [600, 90], [540, 64]], style: 'rout' },
          { side: 'bottom', points: [[596, 340], [520, 260], [458, 206]] },
          { side: 'bottom', points: [[680, 312], [620, 230], [558, 168]] },
        ],
      },
      {
        title: 'Ambush from the valley',
        caption: 'Suddenly the Sotiate foot breaks out of its hiding place in the valley and falls on the scattered horsemen, renewing the battle. The legionary cohorts hurry up to join the fight.',
        at: {
          sf1: [330, 196],
          sf2: [420, 236],
          co1: [290, 344],
          co2: [420, 330],
          co3: [550, 314],
        },
        gone: ['sh1', 'sh2'],
        arrows: [
          { side: 'top', points: [[130, 206], [200, 202], [262, 200]] },
          { side: 'top', points: [[196, 232], [280, 252], [352, 244]] },
          { side: 'bottom', points: [[272, 456], [280, 410], [286, 374]] },
          { side: 'bottom', points: [[372, 444], [390, 412], [406, 384]] },
          { side: 'bottom', points: [[494, 376], [520, 362], [540, 344]] },
        ],
      },
      {
        title: 'The Sotiates break',
        caption: 'The fight is long and hard: the Sotiates trust in their past victories, the Romans want to prove themselves without Caesar. At last the Sotiates flee with heavy losses. Caesar gives no more detail; the map is a reconstruction.',
        at: {
          co1: [320, 262],
          co2: [440, 276],
          co3: [560, 260],
        },
        gone: ['sf1', 'sf2'],
        arrows: [
          { side: 'top', points: [[300, 196], [160, 192], [10, 186]], style: 'rout' },
          { side: 'top', points: [[380, 238], [220, 234], [30, 230]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Roman victory',
    losses: 'Not recorded; Caesar says only that many Sotiates were killed.',
    text: [
      'Crassus marched straight on to the Sotiate town and besieged it with mantlets and towers. The defenders, practised miners in a land of copper mines, tunnelled towards the siege works in vain and asked for terms. As they handed over their arms, Adiatuanus burst out with 600 soldurii, companions sworn to share his fate. Driven back, he was still granted the same terms.',
      "The swift fall of so strong a town alarmed the Vocates and Tarusates, who brought in commanders who had served under Sertorius in Spain. Crassus stormed their camp; Caesar says barely a quarter of 50,000 escaped, and most of Aquitania submitted. Crassus himself was killed in 53 BC at Carrhae, in his father's disastrous war against Parthia.",
    ],
  },
  sources: [
    'Caesar, Gallic War 3.11, 3.20–27',
    'Cassius Dio, Roman History 39.46',
    'Orosius, Histories against the Pagans 6.8.19–22',
  ],
};

export default history;
