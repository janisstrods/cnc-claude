// 001 Akragas, 406 BC. Top: Carthaginians (Himilco); bottom: Syracusans and allies (Daphnaeus).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '001',
  context: {
    war: 'Sicilian Wars: Carthage against Syracuse, 409–405 BC',
    text: [
      'Seventy years after Himera, Carthage returned to Sicily. In 409 BC Hannibal, grandson of the Hamilcar who had died there, sacked Selinus and Himera. In 406 he came back with a larger army, sharing command with Himilco son of Hanno, and besieged Akragas, the richest city of Greek Sicily. Plague broke out in the besiegers\' camps and carried off Hannibal, leaving Himilco in command.',
      'Syracuse raised a relief army under its general Daphnaeus, with troops from Italy, Messana, Gela, Camarina and the interior, supported by some thirty warships. Himilco sent his Iberian and Campanian mercenaries and many other troops to stop it. According to Diodorus they met just after the Greeks had crossed the river Himeras, east of the city.',
    ],
  },
  sides: {
    top: {
      name: 'Carthaginians and mercenaries',
      commanders: ['Himilco son of Hanno (in overall command)'],
      strength: 'Iberians, Campanians and over 40,000 others (Diodorus), detached from the besieging army',
      forces: 'Iberian and Campanian mercenaries with other troops from the siege; the field commander is not named.',
    },
    bottom: {
      name: 'Syracusans and allies',
      commanders: ['Daphnaeus (Syracusan general)'],
      strength: 'Over 30,000 foot and at least 5,000 horse (Diodorus), with 30 warships offshore',
      forces: 'Syracusan citizens with allies from Italy, Messana, Gela, Camarina and the Sicilian interior.',
    },
  },
  map: {
    terrain: [
      { kind: 'river', points: [[-40, 572], [180, 556], [400, 574], [620, 558], [840, 576], [1040, 562]], width: 18, label: 'Himeras' },
      { kind: 'label', at: [500, 26], text: 'to the camps at Akragas' },
    ],
    units: [
      { id: 'iber', side: 'top', kind: 'warband', label: 'Iberians', w: 110, h: 30 },
      { id: 'oth1', side: 'top', kind: 'foot', label: 'Other troops', w: 110, h: 28 },
      { id: 'oth2', side: 'top', kind: 'foot', w: 110, h: 28 },
      { id: 'camp', side: 'top', kind: 'foot', label: 'Campanians', w: 110, h: 28 },
      { id: 'cavL', side: 'bottom', kind: 'horse', label: 'Greek horse', w: 70, h: 22 },
      { id: 'g1', side: 'bottom', kind: 'foot', w: 110, h: 30 },
      { id: 'g2', side: 'bottom', kind: 'foot', label: 'Syracusans & allies', w: 110, h: 30 },
      { id: 'g3', side: 'bottom', kind: 'foot', w: 110, h: 30 },
      { id: 'g4', side: 'bottom', kind: 'foot', w: 110, h: 30 },
      { id: 'cavR', side: 'bottom', kind: 'horse', w: 70, h: 22 },
    ],
    phases: [
      {
        title: 'Across the Himeras',
        caption: "Daphnaeus' army has just crossed the Himeras when the force sent by Himilco comes up to bar the road to Akragas. Diodorus describes no formations; the map is a reconstruction.",
        at: {
          iber: [300, 210],
          oth1: [430, 210],
          oth2: [560, 210],
          camp: [690, 210],
          cavL: [180, 465],
          g1: [310, 470],
          g2: [440, 470],
          g3: [570, 470],
          g4: [700, 470],
          cavR: [830, 465],
        },
        arrows: [
          { side: 'top', points: [[340, 40], [318, 178]] },
          { side: 'top', points: [[660, 40], [680, 178]] },
        ],
      },
      {
        title: 'A long fight',
        caption: 'The two lines meet and fight for a long time before the Greeks gain the upper hand. The Iberians, Campanians and their comrades give way and begin to break.',
        at: {
          iber: [300, 255],
          oth1: [430, 252],
          oth2: [560, 252],
          camp: [690, 255],
          cavL: [180, 320],
          g1: [310, 318],
          g2: [440, 318],
          g3: [570, 318],
          g4: [700, 318],
          cavR: [830, 320],
        },
        broken: ['iber', 'oth1', 'oth2', 'camp'],
        arrows: [
          { side: 'bottom', points: [[310, 450], [310, 352]] },
          { side: 'bottom', points: [[440, 450], [440, 352]] },
          { side: 'bottom', points: [[570, 450], [570, 352]] },
          { side: 'bottom', points: [[700, 450], [700, 352]] },
          { side: 'bottom', points: [[180, 446], [180, 350]] },
          { side: 'bottom', points: [[830, 446], [830, 350]] },
        ],
      },
      {
        title: 'The pursuit halted',
        caption: "Having killed more than 6,000, the Greeks pursue in disorder until Daphnaeus halts them for fear of Himilco's main army. The fugitives reach their camp, and the troops in Akragas never sally out against them.",
        at: {
          cavL: [175, 250],
          g1: [305, 282, -8],
          g2: [440, 268, 6],
          g3: [575, 278, -6],
          g4: [705, 292, 9],
          cavR: [840, 255],
        },
        gone: ['iber', 'oth1', 'oth2', 'camp'],
        arrows: [
          { side: 'top', points: [[300, 232], [298, 140], [318, 46]], style: 'rout' },
          { side: 'top', points: [[430, 230], [412, 130], [366, 46]], style: 'rout' },
          { side: 'top', points: [[560, 230], [588, 130], [638, 46]], style: 'rout' },
          { side: 'top', points: [[690, 232], [712, 140], [722, 46]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Syracusan victory in the field',
    losses: 'Carthaginians: more than 6,000 dead (Diodorus). Greek losses unrecorded.',
    text: [
      "The victory was not followed up. In Akragas the citizens, furious that their generals had kept them behind the walls, stoned four of them to death. Daphnaeus judged Himilco's fortified camp too strong to storm and cut off its foragers instead, until a Carthaginian squadron captured a Syracusan grain convoy and the Campanians in the city were bought over.",
      'Short of food, the Akragantines abandoned their city by night shortly before midwinter 406 BC, after a siege of eight months, and Himilco sacked it. At Syracuse the young Dionysius blamed the generals, was elected general himself and by 405 had made himself tyrant; he later had Daphnaeus put to death.',
    ],
  },
  sources: [
    'Diodorus Siculus, Library of History 13.80–96',
    'Brian Caven, Dionysius I: War-Lord of Sicily (1990)',
  ],
};

export default history;
