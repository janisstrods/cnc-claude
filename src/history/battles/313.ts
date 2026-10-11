// 313 Brindisi Raid, 48 BC. Top: Pompeians (Libo); bottom: Caesarians (Antony).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '313',
  context: {
    war: "Caesar's Civil War, 49–45 BC: the crossing to Greece, 48 BC",
    text: [
      "In January 49 BC Caesar crossed the Rubicon, and by March Pompey had shipped his army from Brundisium to Greece, where he gathered legions, eastern allies and a great fleet. Early in January 48 BC Caesar slipped across the Adriatic with seven under-strength legions, as many as his ships could carry. Pompey's admiral Bibulus caught some 30 of the empty transports on their way back and burnt them.",
      "Mark Antony and Quintus Fufius Calenus waited at Brundisium with the rest of the army. After Bibulus died that winter, Lucius Scribonius Libo sailed from Oricum with fifty ships to keep them there. The game's Brindisi Raid is his descent on the port, known almost only from a short passage in Caesar.",
    ],
  },
  sides: {
    top: {
      name: 'Pompeian fleet',
      commanders: ['Lucius Scribonius Libo (admiral)'],
      strength: 'Fifty ships (Caesar); the size of the landing party is not recorded',
      forces: "Warships of Pompey's Adriatic fleet, carrying soldiers and archers for raids ashore.",
    },
    bottom: {
      name: 'Caesarians',
      commanders: ['Mark Antony', 'Quintus Fufius Calenus (legate)'],
      strength: 'Four legions and 800 horse (Caesar); Plutarch says 20,000 foot',
      forces: 'Three veteran legions and one of recruits waiting to cross, with cavalry, ships\' boats and two newly built triremes.',
    },
  },
  map: {
    terrain: [
      {
        kind: 'sea',
        points: [
          [-60, -60], [676, -60], [680, 6], [712, 30], [760, 36], [808, 28], [834, 4], [840, -60], [1060, -60],
          [1060, 52], [976, 58], [944, 84], [936, 160], [890, 204], [760, 214], [640, 204], [596, 164], [584, 80],
          [552, 46], [480, 40], [436, 56], [360, 72], [220, 80], [100, 76], [-60, 80],
        ],
      },
      { kind: 'hills', points: [[414, -60], [426, 60], [440, 124], [498, 218], [700, 226], [1060, 224], [1060, 236], [700, 238], [490, 230], [428, 130], [414, 62], [402, -60]] },
      { kind: 'hills', points: [[-60, 346], [200, 338], [450, 348], [700, 340], [850, 350], [862, 384], [700, 392], [450, 384], [200, 392], [-60, 386]] },
      { kind: 'town', at: [515, 122], size: 22, label: 'Brundisium' },
      { kind: 'camp', at: [253, 448], size: 40 },
      { kind: 'camp', at: [395, 448], size: 40 },
      { kind: 'camp', at: [537, 448], size: 40 },
      { kind: 'camp', at: [679, 448], size: 40 },
      { kind: 'label', at: [756, 18], text: 'Island' },
      { kind: 'label', at: [66, 34], text: 'Adriatic' },
      { kind: 'label', at: [780, 266], text: 'Town walls' },
    ],
    units: [
      { id: 'fleet', side: 'top', kind: 'machines', label: "Libo's fleet", w: 96, h: 18 },
      { id: 'mar', side: 'top', kind: 'foot', label: 'Soldiers', w: 90, h: 24 },
      { id: 'arch', side: 'top', kind: 'light', label: 'Archers', w: 70, h: 14 },
      { id: 'quad', side: 'top', kind: 'machines', label: 'Five quadriremes', w: 72, h: 16 },
      { id: 'cav', side: 'bottom', kind: 'horse', label: 'Cavalry post', w: 64, h: 22 },
      { id: 'leg1', side: 'bottom', kind: 'foot', w: 72, h: 22 },
      { id: 'leg2', side: 'bottom', kind: 'foot', label: "Antony's legions", w: 72, h: 22 },
      { id: 'leg3', side: 'bottom', kind: 'foot', w: 72, h: 22 },
      { id: 'leg4', side: 'bottom', kind: 'foot', w: 72, h: 22 },
      { id: 'trir', side: 'bottom', kind: 'machines', label: 'Two triremes', w: 60, h: 16 },
      { id: 'b1', side: 'bottom', kind: 'light', label: "Antony's boats", w: 46, h: 12 },
      { id: 'b2', side: 'bottom', kind: 'light', w: 46, h: 12 },
      { id: 'pat1', side: 'bottom', kind: 'horse', label: 'Cavalry patrols', w: 64, h: 22 },
      { id: 'pat2', side: 'bottom', kind: 'horse', w: 64, h: 22 },
    ],
    phases: [
      {
        title: 'Libo seals the harbour',
        caption: "Libo's fifty ships seize the island off the harbour mouth, the one way out to sea. He burns some merchant ships and carries off another laden with grain.",
        at: {
          fleet: [560, 20],
          cav: [180, 118],
          leg1: [253, 448],
          leg2: [395, 448],
          leg3: [537, 448],
          leg4: [679, 448],
        },
        arrows: [{ side: 'top', points: [[612, 32], [662, 76], [704, 118]] }],
      },
      {
        title: 'A night landing',
        caption: "By night Libo lands soldiers and archers, who drive off the Caesarian cavalry post on the shore. He writes to Pompey that his squadron alone can keep Caesar's reinforcements from crossing.",
        at: {
          mar: [240, 158],
          arch: [120, 150],
        },
        gone: ['cav'],
        arrows: [
          { side: 'top', points: [[512, 30], [390, 64], [282, 136]] },
          { side: 'top', points: [[506, 22], [290, 52], [150, 136]] },
          { side: 'bottom', points: [[180, 140], [176, 240], [168, 322]], style: 'rout' },
        ],
      },
      {
        title: "Antony's trap",
        caption: "Antony hides picked men in some sixty screened ships' boats along the shore and sends two triremes out as bait. Libo's five quadriremes chase them into the harbour, where the boats dash out, capture one and rout the rest.",
        at: {
          trir: [882, 182],
          quad: [722, 150],
          b1: [646, 180],
          b2: [806, 166],
        },
        broken: ['quad'],
        arrows: [
          { side: 'top', points: [[612, 32], [652, 78], [688, 116]] },
          { side: 'bottom', points: [[764, 46], [850, 100], [874, 164]], style: 'retreat' },
          { side: 'bottom', points: [[592, 132], [604, 156], [622, 172]] },
          { side: 'bottom', points: [[812, 214], [808, 190], [807, 176]] },
        ],
      },
      {
        title: 'No water',
        caption: 'Antony posts cavalry along the coast so that the enemy cannot land for water. Short of water and shamed by the defeat, Libo gives up the blockade and sails away.',
        at: {
          pat1: [292, 128],
          pat2: [380, 102],
        },
        gone: ['fleet', 'quad', 'mar', 'arch'],
        arrows: [
          { side: 'bottom', points: [[300, 318], [296, 224], [293, 152]] },
          { side: 'bottom', points: [[396, 318], [386, 214], [381, 126]] },
          { side: 'top', points: [[712, 136], [650, 60], [630, -14]], style: 'rout' },
          { side: 'top', points: [[600, 36], [560, 2], [530, -14]], style: 'retreat' },
          { side: 'top', points: [[180, 150], [164, 96], [150, 44]], style: 'retreat' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Caesarian success: the blockade lifted',
    losses: 'Pompeians: one quadrireme captured with its rowers and marines. Caesarians: some merchant ships burnt and a grain ship taken.',
    text: [
      "Cassius Dio tells it differently: Antony beat off Libo's attack and then denied him every anchorage on that coast, so that Libo had to sail off in search of water.",
      'With Libo gone, Antony and Calenus sailed on a south wind and, chased by a Pompeian squadron, ran into the harbour of Nymphaeum near Lissus, while a storm wrecked sixteen of the pursuing Rhodian ships. Antony landed three veteran legions, one of recruits and 800 horse and joined Caesar. Pompey fell back, and the armies were soon locked in the siege lines at Dyrrhachium.',
    ],
  },
  sources: [
    'Caesar, Civil War 3.23–29',
    'Cassius Dio, Roman History 41.48',
    'Plutarch, Life of Antony 7',
    'T. Rice Holmes, The Roman Republic and the Founder of the Empire, vol. 3 (1923)',
  ],
};

export default history;
