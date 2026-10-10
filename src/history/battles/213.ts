// 213 Camalatrum, 71 BC. Top: Slaves (Spartacus); bottom: Romans (Crassus).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '213',
  context: {
    war: 'Third Servile War (the war of Spartacus), 73–71 BC',
    text: [
      'Spartacus, a Thracian gladiator, had broken out of a training school at Capua in 73 BC and beaten several Roman armies. Late in 72 BC the senate gave the war to the praetor Marcus Licinius Crassus, who penned the rebels into the toe of Italy behind a ditch and wall. On a snowy night that winter Spartacus broke through the lines in Bruttium.',
      'The rebel host then split. A band of Gauls and Germans under Castus and Gannicus camped on its own. Plutarch says Crassus first drove them from a Lucanian lake, but Spartacus came up and saved them. Crassus had asked the senate to recall Pompey from Spain; now he wanted to end the war before Pompey arrived, and turned on the breakaway band first.',
    ],
  },
  sides: {
    top: {
      name: 'Gauls and Germans of the slave army',
      commanders: ['Castus (killed)', "Gannicus, Plutarch's Cannicius (killed)", 'Spartacus (main army, nearby)'],
      strength: 'Unknown; Plutarch counts 12,300 dead, Livy 35,000',
      forces: 'Runaway slaves and gladiators, mostly Gauls and Germans, who had split from Spartacus; his own army camped not far off.',
    },
    bottom: {
      name: 'Romans',
      commanders: ['Marcus Licinius Crassus (praetor)', 'Gaius Pomptinus (legate)', 'Quintus Marcius Rufus (legate)', 'Lucius Quinctius (cavalry)'],
      strength: 'Not recorded; Crassus had eight legions in all (Appian), with cavalry and auxiliaries',
      forces: 'Legions newly raised by Crassus and hardened by his harsh discipline, with cavalry.',
    },
  },
  map: {
    terrain: [
      { kind: 'lake', points: [[860, -60], [1060, -60], [1060, 360], [950, 350], [880, 300], [855, 210], [875, 120], [850, 40]], label: 'Lucanian lake' },
      { kind: 'hills', points: [[590, 140], [680, 115], [780, 125], [815, 180], [790, 255], [700, 275], [610, 260], [575, 200]] },
      { kind: 'hills', points: [[150, 195], [240, 175], [320, 205], [338, 290], [305, 365], [210, 385], [140, 335], [125, 255]] },
      { kind: 'label', at: [222, 292], text: 'Mount Cantenna' },
      { kind: 'woods', points: [[150, 450], [235, 440], [285, 500], [265, 585], [180, 600], [130, 530]] },
      { kind: 'woods', points: [[750, 340], [815, 335], [840, 380], [800, 410], [745, 395]] },
      { kind: 'camp', at: [455, 140], size: 34, label: 'Rebel camp' },
      { kind: 'camp', at: [450, 545], size: 30, label: "Crassus' camps" },
      { kind: 'camp', at: [560, 548], size: 24 },
    ],
    units: [
      { id: 'gA', side: 'top', kind: 'warband', w: 110, h: 30 },
      { id: 'gB', side: 'top', kind: 'warband', label: 'Castus & Gannicus', w: 110, h: 30 },
      { id: 'spA', side: 'top', kind: 'warband', label: "Spartacus' main army", w: 110, h: 28 },
      { id: 'spB', side: 'top', kind: 'warband', w: 110, h: 28 },
      { id: 'L1', side: 'bottom', kind: 'foot', w: 110, h: 26 },
      { id: 'L2', side: 'bottom', kind: 'foot', label: "Crassus' legions", w: 110, h: 26 },
      { id: 'L3', side: 'bottom', kind: 'foot', w: 110, h: 26 },
      { id: 'cavA', side: 'bottom', kind: 'horse', label: "Quinctius' horse", w: 64, h: 22 },
      { id: 'cavB', side: 'bottom', kind: 'horse', w: 64, h: 22 },
      { id: 'coh', side: 'bottom', kind: 'foot', label: 'Twelve cohorts', w: 90, h: 24 },
    ],
    phases: [
      {
        title: 'Night march',
        caption: 'Crassus camps close to the rebels below a mountain that Frontinus calls Cantenna or Camalatrum; its site is unknown. At night he leads the legions out to its foot and sends twelve cohorts round behind it.',
        at: {
          gA: [395, 222],
          gB: [515, 222],
          spA: [705, 180],
          spB: [705, 220],
          L1: [300, 425],
          L2: [420, 425],
          L3: [540, 425],
          cavA: [440, 335],
          cavB: [600, 360],
          coh: [185, 100],
        },
        arrows: [
          { side: 'bottom', points: [[500, 522], [468, 476], [440, 452]] },
          { side: 'bottom', points: [[405, 532], [250, 505], [112, 452], [72, 340], [82, 215], [126, 128]] },
        ],
      },
      {
        title: 'The feigned flight',
        caption: 'Lucius Quinctius sends half the cavalry to hold Spartacus off with a mock fight. The other half provokes the Gauls and Germans and flees towards the hidden legions; the rebels give chase, and the horsemen draw aside to the wings.',
        at: {
          cavB: [700, 292],
          cavA: [195, 425],
          gA: [395, 322],
          gB: [515, 322],
        },
        arrows: [
          { side: 'bottom', points: [[615, 345], [655, 312], [668, 304]] },
          { side: 'bottom', points: [[452, 322], [340, 362], [236, 402]], style: 'retreat' },
          { side: 'top', points: [[395, 236], [395, 302]] },
        ],
      },
      {
        title: 'Trapped front and rear',
        caption: "The legions charge with a shout as the cohorts fall on the rebels' rear. Plutarch, whose 6,000 men sent to seize a hill are probably the same force, calls it the hardest fight of the war.",
        at: {
          L1: [300, 382],
          L2: [420, 380],
          L3: [540, 382],
          coh: [395, 265],
        },
        arrows: [
          { side: 'bottom', points: [[202, 118], [270, 190], [338, 252]] },
          { side: 'bottom', points: [[300, 458], [300, 402]] },
          { side: 'bottom', points: [[540, 458], [540, 402]] },
        ],
      },
      {
        title: 'The breakaways destroyed',
        caption: 'Frontinus has the rebels scattering, but Plutarch says only two of the dead were wounded in the back. Castus and Gannicus fall, and Spartacus pulls back towards the mountains of Petelia. The map is a reconstruction.',
        at: {
          coh: [420, 270],
        },
        broken: ['gA', 'gB'],
        gone: ['spA', 'spB'],
        arrows: [
          { side: 'top', points: [[705, 162], [735, 90], [752, 10]], style: 'retreat' },
          { side: 'top', points: [[765, 220], [805, 130], [822, 30]], style: 'retreat' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Decisive Roman victory',
    losses: 'Rebels: 12,300 dead by Plutarch, 30,000–35,000 by Orosius and Livy, Castus and Gannicus among them. Roman losses unrecorded.',
    text: [
      'The breakaway band was wiped out. According to Frontinus, the victors also recovered five Roman eagles, twenty-six standards and five sets of rods and axes, the spoils of earlier rebel victories.',
      "Spartacus retreated towards the mountains of Petelia. When Crassus' officer Quinctius and the quaestor Scrofa pressed him too closely, he turned and routed them. Emboldened, his men now demanded a battle and made their leaders turn back through Lucania against Crassus, who wanted a decision before Pompey arrived. The last battle of the war followed at the Silarus.",
    ],
  },
  sources: [
    'Plutarch, Life of Crassus 11',
    'Frontinus, Stratagems 2.4.7 and 2.5.34',
    'Livy, Periochae 97',
    'Orosius, Histories against the Pagans 5.24.6',
    'Barry Strauss, The Spartacus War (2009)',
  ],
};

export default history;
