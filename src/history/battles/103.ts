// 103 Plataea, 479 BC. Top: allied Greeks (Pausanias); bottom: Persians and allies (Mardonius).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '103',
  context: {
    war: 'Greco-Persian Wars: invasion of Xerxes, 480–479 BC',
    text: [
      'Xerxes invaded Greece in 480 BC, forced the pass at Thermopylae and burned Athens, but after his fleet was beaten at Salamis he went back to Asia. He left his general Mardonius with a picked army, which wintered in Thessaly. In 479 BC Mardonius reoccupied Athens, but the Athenians again refused his terms.',
      'Pressed by Athens, Sparta at last sent out a large army under the regent Pausanias, and Mardonius fell back into Boeotia, where Thebes was his ally and the plain suited his cavalry. In late summer the allied Greeks crossed Mount Cithaeron and faced the Persians across the river Asopus near Plataea. For more than a week neither side would attack across the river. Persian horsemen harried the Greeks, cut off their supplies and choked their spring, until Pausanias ordered a night withdrawal to better ground.',
    ],
  },
  sides: {
    top: {
      name: 'Spartans, Athenians and allied Greeks',
      commanders: ['Pausanias (Spartan regent, right wing)', 'Euryanax (Spartan, his colleague)', 'Aristides (Athenians, left wing)', 'Amompharetus (Spartan company commander)'],
      strength: '38,700 hoplites and c. 70,000 light troops by Herodotus; modern estimates are usually lower',
      forces: 'Hoplites from many cities, led by 5,000 Spartiates, 8,000 Athenians and 1,500 Tegeans, with helots and other light troops; almost no cavalry.',
    },
    bottom: {
      name: 'Persians, subject peoples and Greek allies',
      commanders: ['Mardonius (commander)', 'Artabazus (corps commander)', 'Masistius (cavalry, killed in an early skirmish)', 'Asopodorus (Theban cavalry)'],
      strength: '300,000, plus perhaps 50,000 Greeks, by Herodotus; modern estimates often 70,000–120,000',
      forces: 'Persian, Median, Bactrian, Indian and Saka foot and strong cavalry, with Boeotian, Thessalian, Macedonian and other Greek allies.',
    },
  },
  map: {
    north: 180,
    terrain: [
      { kind: 'hills', points: [[-60, -60], [1060, -60], [1060, 55], [820, 62], [620, 55], [440, 78], [320, 138], [170, 160], [-60, 165]] },
      { kind: 'label', at: [560, 26], text: 'Foothills of Cithaeron' },
      { kind: 'river', points: [[-40, 352], [220, 338], [780, 344], [900, 336], [970, 340], [1040, 336]], width: 16, label: 'Asopus' },
      { kind: 'town', at: [872, 74], size: 22, label: 'Plataea' },
      { kind: 'label', at: [90, 60], text: 'Temple of Demeter' },
      { kind: 'camp', at: [300, 545], size: 34, label: 'Persian stockade' },
    ],
    units: [
      { id: 'spart', side: 'top', kind: 'foot', label: 'Spartans', w: 130, h: 38 },
      { id: 'teg', side: 'top', kind: 'foot', label: 'Tegeans', w: 72, h: 30 },
      { id: 'cen1', side: 'top', kind: 'foot', label: 'Allied centre', w: 120, h: 26 },
      { id: 'cen2', side: 'top', kind: 'foot', w: 120, h: 26 },
      { id: 'ath', side: 'top', kind: 'foot', label: 'Athenians', w: 120, h: 34 },
      { id: 'pers', side: 'bottom', kind: 'foot', label: 'Persians', w: 150, h: 34 },
      { id: 'mard', side: 'bottom', kind: 'foot', label: 'Mardonius & guard', w: 70, h: 26 },
      { id: 'pcav', side: 'bottom', kind: 'horse', label: 'Persian cavalry', w: 70, h: 22 },
      { id: 'med', side: 'bottom', kind: 'foot', label: 'Medes, Bactrians etc.', w: 190, h: 30 },
      { id: 'boe', side: 'bottom', kind: 'foot', label: 'Boeotians & Greeks', w: 140, h: 30 },
      { id: 'arta', side: 'bottom', kind: 'foot', label: 'Artabazus', w: 120, h: 30 },
    ],
    phases: [
      {
        title: 'Across the Asopus',
        caption: 'The armies face each other across the Asopus for more than a week. Mardonius sets his Persians opposite the Spartans and his Greek allies opposite the Athenians, while his cavalry harries the Greek line.',
        at: {
          spart: [170, 215],
          teg: [290, 215],
          cen1: [420, 215],
          cen2: [550, 215],
          ath: [720, 215],
          pers: [180, 410],
          mard: [180, 462],
          pcav: [330, 282],
          med: [430, 410],
          boe: [710, 410],
          arta: [820, 505],
        },
      },
      {
        title: 'The night withdrawal',
        caption: "Pausanias orders a night move to new ground nearer Plataea. The centre goes too far, to the temple of Hera by the town. The Spartans, held up by Amompharetus' refusal to retreat, keep to the foothills; the Athenians take the plain.",
        at: {
          spart: [160, 112],
          teg: [290, 118],
          cen1: [690, 100],
          cen2: [790, 152],
          ath: [720, 262],
        },
        arrows: [
          { side: 'top', points: [[165, 192], [160, 138]] },
          { side: 'top', points: [[290, 198], [290, 140]] },
          { side: 'top', points: [[480, 200], [570, 140], [660, 116]] },
        ],
      },
      {
        title: 'Mardonius attacks',
        caption: 'Thinking the Greeks are in flight, Mardonius leads his army across the river. The Persians plant their wicker shields and shower the Spartans and Tegeans with arrows, while his Boeotian allies fall on the Athenians.',
        at: {
          pers: [190, 232],
          mard: [190, 280],
          pcav: [330, 205],
          med: [440, 290],
          boe: [620, 296],
          ath: [600, 220],
        },
        arrows: [
          { side: 'bottom', points: [[148, 395], [148, 165]] },
          { side: 'bottom', points: [[440, 395], [440, 250]] },
          { side: 'bottom', points: [[710, 395], [650, 340], [618, 264]] },
          { side: 'top', points: [[720, 262], [640, 230], [522, 220]] },
        ],
      },
      {
        title: 'The Spartans charge',
        caption: 'The Tegeans and then the Spartans charge. Mardonius falls among his guards and the Persians flee to their stockade, which the Greeks later storm. The Athenians beat the Thebans, and Artabazus leads his corps away.',
        at: {
          spart: [170, 300],
          teg: [300, 300],
          ath: [620, 300],
        },
        broken: ['pers', 'boe'],
        gone: ['mard', 'pcav', 'med', 'arta', 'pers', 'boe'],
        arrows: [
          { side: 'bottom', points: [[200, 250], [250, 400], [290, 500]], style: 'rout' },
          { side: 'bottom', points: [[440, 300], [400, 420], [345, 520]], style: 'rout' },
          { side: 'bottom', points: [[610, 322], [590, 450], [550, 612]], style: 'rout' },
          { side: 'bottom', points: [[830, 530], [880, 575], [910, 615]], style: 'retreat' },
          { side: 'top', points: [[170, 135], [170, 255]] },
          { side: 'top', points: [[300, 140], [300, 260]] },
        ],
      },
    ],
  },
  outcome: {
    winner: 'top',
    result: 'Decisive Greek victory',
    losses: "Greeks: 91 Spartiates and 52 Athenians by Herodotus, besides some 600 Megarians and Phliasians caught by Theban horse; Plutarch gives 1,360 dead. Persians: very heavy; Herodotus' claim that fewer than 3,000 survived, besides Artabazus' men, is not credible.",
    text: [
      'Artabazus marched perhaps 40,000 men back towards Asia, and no Persian army entered mainland Greece again. Tradition holds that on the same day a Greek fleet destroyed the Persian ships and camp at Mycale in Ionia. The Greeks then besieged Thebes until it gave up the leaders who had sided with Persia.',
      'The Greeks now took the offensive. The Ionian cities rose again, and in 478–477 BC Athens took the lead of a new alliance, the Delian League, to carry on the fight, the beginning of its maritime empire. Pausanias, the victor, fell under suspicion of intriguing with Persia and died in disgrace.',
    ],
  },
  sources: [
    'Herodotus, Histories 9.12–89',
    'Plutarch, Life of Aristides 11–21',
    'Diodorus Siculus, Library 11.28–33',
    'J. F. Lazenby, The Defence of Greece, 490–479 BC (1993)',
  ],
};

export default history;
