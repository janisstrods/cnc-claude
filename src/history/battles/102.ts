// 102 Himera, 480 BC. Top: Carthaginians (Hamilcar); bottom: Syracusans and Akragantines (Gelon).
import type { BattleHistory } from '../types';

const history: BattleHistory = {
  id: '102',
  context: {
    war: "Sicilian Wars: Carthage's invasion of 480 BC",
    text: [
      "Around 483 BC Theron, tyrant of Akragas, drove Terillus out of Himera on Sicily's north coast. Terillus and his son-in-law Anaxilas of Rhegium appealed to Carthage, whose Phoenician kin held the west of the island and which had reason to fear Theron and his ally Gelon, tyrant of Syracuse. Later Greeks claimed that Carthage acted in concert with Xerxes' invasion of Greece; many modern historians doubt it.",
      'In 480 BC Hamilcar landed at Panormus, though a storm had sunk the transports carrying his horses and chariots, and laid siege to Himera, which Theron held. Gelon marched to its relief and camped near the city. His horsemen then caught a courier with a letter from Selinus, a Greek ally of Carthage, promising Hamilcar cavalry on a set day.',
    ],
  },
  sides: {
    top: {
      name: 'Carthaginians and allies',
      commanders: ['Hamilcar son of Hanno'],
      strength: '300,000 by Herodotus and Diodorus; certainly far fewer',
      forces: 'Phoenicians, Libyans, Iberians, Ligurians, Elisyci, Sardinians and Corsicans (Herodotus); its horses and chariots lost at sea.',
    },
    bottom: {
      name: 'Syracusans, Akragantines and allies',
      commanders: ['Gelon, tyrant of Syracuse', 'Theron, tyrant of Akragas (in Himera)'],
      strength: 'c. 50,000 foot and 5,000 horse with Gelon (Diodorus), besides Theron\'s men',
      forces: "Syracusan and allied hoplites, a strong cavalry arm, and Theron's Akragantines holding the city.",
    },
  },
  map: {
    north: 90,
    terrain: [
      { kind: 'sea', points: [[868, -60], [1060, -60], [1060, 420], [1000, 400], [930, 330], [890, 200], [872, 70]], label: 'Sea' },
      { kind: 'hills', points: [[-60, -60], [190, -60], [205, 70], [170, 200], [110, 320], [-60, 350]], label: 'Hills' },
      { kind: 'camp', at: [300, 110], size: 75 },
      { kind: 'camp', at: [460, 110], size: 75 },
      { kind: 'label', at: [380, 44], text: 'Land camp' },
      { kind: 'camp', at: [770, 125], size: 80, label: 'Naval camp' },
      { kind: 'label', at: [770, 98], text: 'beached ships' },
      { kind: 'town', at: [175, 515], size: 36, label: 'Himera' },
    ],
    units: [
      { id: 'c1', side: 'top', kind: 'foot', label: 'Phoenicians', w: 90, h: 26 },
      { id: 'c2', side: 'top', kind: 'warband', label: 'Iberians', w: 90, h: 26 },
      { id: 'c3', side: 'top', kind: 'foot', label: 'Libyans', w: 90, h: 26 },
      { id: 'c4', side: 'top', kind: 'warband', label: 'Ligurians & others', w: 90, h: 26 },
      { id: 'gcav', side: 'bottom', kind: 'horse', label: "Gelon's horsemen", w: 70, h: 22 },
      { id: 'g1', side: 'bottom', kind: 'foot', w: 100, h: 30 },
      { id: 'g2', side: 'bottom', kind: 'foot', label: 'Greek hoplites', w: 100, h: 30 },
      { id: 'g3', side: 'bottom', kind: 'foot', w: 100, h: 30 },
    ],
    phases: [
      {
        title: 'Dawn at Himera',
        caption: 'Hamilcar sacrifices in his naval camp, awaiting the horsemen promised by Selinus. At daybreak Gelon sends his own cavalry in their place, while his army waits near Himera for a signal from scouts on the hills. The horsemen\'s route and the deployment are reconstructions.',
        at: {
          c1: [300, 88],
          c3: [300, 132],
          c2: [460, 88],
          c4: [460, 132],
          gcav: [120, 34],
          g1: [390, 440],
          g2: [510, 440],
          g3: [630, 440],
        },
      },
      {
        title: 'The ships burn',
        caption: 'Let in as friends, the horsemen kill Hamilcar at the altar and set the beached ships alight. The scouts signal, Gelon advances on the camp, and the Carthaginian officers lead their men out to meet him.',
        at: {
          gcav: [770, 138],
          c3: [235, 252],
          c1: [345, 252],
          c2: [455, 252],
          c4: [565, 252],
          g1: [345, 340],
          g2: [455, 340],
          g3: [565, 340],
        },
        arrows: [
          { side: 'bottom', points: [[160, 30], [420, 16], [610, 26], [692, 106]] },
          { side: 'bottom', points: [[390, 420], [360, 372]] },
          { side: 'bottom', points: [[510, 420], [465, 372]] },
          { side: 'bottom', points: [[630, 420], [575, 372]] },
          { side: 'top', points: [[300, 160], [255, 222]] },
          { side: 'top', points: [[460, 160], [458, 222]] },
        ],
      },
      {
        title: 'Rout',
        caption: 'The fight sways back and forth until smoke rises from the ships and word spreads that Hamilcar is dead. The Carthaginians break and are cut down in flight; survivors on a waterless height later surrender.',
        at: {
          c3: [215, 205],
          c1: [335, 195],
          c2: [460, 200],
          c4: [585, 210],
          g1: [345, 292],
          g2: [460, 288],
          g3: [580, 296],
        },
        broken: ['c1', 'c2', 'c3', 'c4'],
        arrows: [
          { side: 'top', points: [[174, 168], [132, 112], [96, 50]], style: 'rout' },
          { side: 'top', points: [[330, 152], [312, 96], [262, 26]], style: 'rout' },
          { side: 'top', points: [[462, 168], [472, 100], [462, 26]], style: 'rout' },
          { side: 'top', points: [[585, 192], [610, 110], [590, 20]], style: 'rout' },
        ],
      },
    ],
  },
  outcome: {
    winner: 'bottom',
    result: 'Decisive Greek victory',
    losses: 'Carthaginians: 150,000 dead by Diodorus, an impossible figure, and many thousands enslaved; Hamilcar killed. Greek losses unrecorded.',
    text: [
      'Diodorus says twenty ships escaped, only to founder in a storm. Herodotus heard a Carthaginian version in which the fighting lasted from dawn to evening and Hamilcar, seeing his army break, threw himself onto the sacrificial fire. Greek tradition set the victory on the same day as Salamis or Thermopylae.',
      "Carthage paid 2,000 talents and built two temples to house copies of the treaty. Prisoners laboured on temples and water channels at Akragas, and Gelon built temples to Demeter and Kore at Syracuse from the spoils. Carthage did not return in force for seventy years; in 409 BC Hamilcar's grandson Hannibal destroyed Himera.",
    ],
  },
  sources: [
    'Herodotus, Histories 7.165–167',
    'Diodorus Siculus, Library of History 11.20–26',
    'Jeff Champion, The Tyrants of Syracuse, vol. I (2010)',
  ],
};

export default history;
