// 209 Mt Garganus, 72 BC. Top: Slave army (Crixus); bottom: Romans (Lucius Gellius Publicola).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '209',
  context: {
    war: 'Third Servile War (the war of Spartacus), 73–71 BC',
    text: [
      'After the rout of Glaber on Vesuvius the revolt spread fast. By 72 BC the rebels had beaten two praetors and their lieutenants and roamed southern Italy in their tens of thousands, so the senate sent both consuls, Lucius Gellius Publicola and Gnaeus Cornelius Lentulus Clodianus, against them with new legions.',
      'The rebels had already divided. Spartacus kept the main body, while Crixus led off a large band, mostly Gauls and Germans, to plunder on its own. Plutarch blames their arrogance; modern historians add rivalry among the leaders and the need to forage. Gellius, with his lieutenant Quintus Arrius, went after Crixus first and caught him near Mount Garganus, the rugged promontory of northern Apulia. The exact site is unknown.',
    ],
  },
  sides: {
    top: {
      name: 'Rebel slaves under Crixus',
      commanders: ['Crixus (killed)'],
      strength: 'c. 30,000 (Appian); Livy says 20,000 fell; Orosius gives Crixus 10,000 earlier in the war',
      forces: 'Mainly Gallic and German runaway slaves and former gladiators, armed with captured and home-made weapons.',
    },
    bottom: {
      name: 'Romans and Italian allies',
      commanders: ['Lucius Gellius Publicola (consul)', 'Quintus Arrius (propraetor)'],
      strength: 'Not recorded; probably a consular army of two legions with allies',
      forces: 'Newly raised legions and allied troops: the first consular army sent against the rebels.',
    },
  },
  map: {
    terrain: [
      {
        kind: 'hills',
        points: [[200, -60], [780, -60], [760, 40], [700, 116], [600, 140], [440, 142], [300, 130], [230, 80]],
        label: 'Mount Garganus',
      },
      { kind: 'fields', points: [[20, 250], [200, 240], [240, 330], [210, 410], [40, 420], [-20, 340]] },
      { kind: 'fields', points: [[760, 230], [960, 220], [1030, 300], [980, 400], [800, 400], [740, 320]] },
    ],
    units: [
      { id: 'w5', side: 'top', kind: 'warband', w: 100, h: 28 },
      { id: 'ga', side: 'top', kind: 'warband', label: 'Gauls', w: 110, h: 30 },
      { id: 'cx', side: 'top', kind: 'warband', label: 'Crixus', w: 110, h: 30 },
      { id: 'ge', side: 'top', kind: 'warband', label: 'Germans', w: 110, h: 30 },
      { id: 'w4', side: 'top', kind: 'warband', w: 100, h: 28 },
      { id: 'l1', side: 'bottom', kind: 'foot', w: 110, h: 28 },
      { id: 'l2', side: 'bottom', kind: 'foot', label: "Gellius' legions", w: 110, h: 28 },
      { id: 'l3', side: 'bottom', kind: 'foot', w: 110, h: 28 },
      { id: 'l4', side: 'bottom', kind: 'foot', w: 110, h: 28 },
    ],
    phases: [
      {
        title: 'Crixus on his own',
        caption: "Crixus' Gauls and Germans, perhaps 20,000–30,000 strong, have left Spartacus and are living off the farms below Mount Garganus. The consul Gellius and his lieutenant Quintus Arrius march against them with newly raised legions.",
        at: {
          w5: [120, 330],
          ga: [270, 220],
          cx: [450, 200],
          ge: [630, 214],
          w4: [870, 310],
          l1: [300, 500],
          l2: [430, 500],
          l3: [560, 500],
          l4: [690, 500],
        },
        arrows: [
          { side: 'bottom', points: [[360, 580], [366, 530]] },
          { side: 'bottom', points: [[625, 580], [625, 530]] },
        ],
      },
      {
        title: 'Caught by surprise',
        caption: "The Romans fall on the rebels suddenly, as Plutarch tells it, but by Orosius' account Crixus' men fight fiercely. The sources say little more; the map is a reconstruction.",
        at: {
          w5: [170, 268],
          ga: [300, 262],
          cx: [430, 256],
          ge: [560, 262],
          w4: [690, 270],
          l1: [300, 326],
          l2: [430, 322],
          l3: [560, 326],
          l4: [690, 332],
        },
        arrows: [
          { side: 'bottom', points: [[300, 478], [300, 352]] },
          { side: 'bottom', points: [[560, 478], [560, 352]] },
          { side: 'top', points: [[100, 350], [130, 316], [150, 294]] },
          { side: 'top', points: [[880, 318], [820, 296], [762, 282]] },
        ],
      },
      {
        title: 'Crixus falls',
        caption: 'The rebels are overwhelmed. Crixus is killed and, by Appian\'s account, two-thirds of his men die with him; Livy gives the credit to Arrius. The survivors scatter.',
        at: {
          w5: [110, 190],
          ga: [300, 222],
          cx: [430, 210],
          ge: [560, 222],
          w4: [800, 190],
          l1: [300, 274],
          l2: [430, 262],
          l3: [560, 274],
          l4: [700, 280],
        },
        broken: ['w5', 'ga', 'cx', 'ge', 'w4'],
        arrows: [
          { side: 'bottom', points: [[300, 340], [300, 300]] },
          { side: 'bottom', points: [[560, 340], [560, 300]] },
          { side: 'top', points: [[110, 172], [100, 100], [80, 30]], style: 'rout' },
          { side: 'top', points: [[820, 172], [870, 100], [910, 30]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Roman victory',
    losses: 'Rebels: two-thirds of 30,000 by Appian, 20,000 by Livy; Crixus killed. Roman losses not recorded.',
    text: [
      "It was Rome's first real success of the war, and a short-lived one. Spartacus, marching north, beat each consul in turn (see Picenum) and honoured his fallen comrade, by Appian's account sacrificing 300 Roman prisoners to Crixus' shade.",
      'The senate then took the war from the consuls and gave it to Marcus Crassus. The rebels split again, and in 71 BC Crassus destroyed another breakaway band of Gauls and Germans shortly before Spartacus\' last battle.',
    ],
  },
  sources: [
    'Appian, Civil Wars 1.116–117',
    'Livy, Periochae 96',
    'Plutarch, Life of Crassus 9',
    'Orosius, Histories against the Pagans 5.24',
    'Barry Strauss, The Spartacus War (2009)',
  ],
};

export default history;
