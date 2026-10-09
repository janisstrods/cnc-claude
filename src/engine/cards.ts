// The 60-card Command deck. Texts are paraphrased summaries of each card's effect.
import type { CardDef, CardKind, OrderMods, SectionName } from './types';

const sec = (n: number, s: SectionName, word: string): string =>
  `Issue an order to ${n} units or leaders in the ${word} section.`;

export const CARD_DEFS: Record<CardKind, CardDef> = {
  order2L: { kind: 'order2L', title: 'Order Two Units Left', group: 'section', count: 3, text: sec(2, 'left', 'left'), sections: ['left'], detach: true },
  order2C: { kind: 'order2C', title: 'Order Two Units Center', group: 'section', count: 4, text: sec(2, 'center', 'center'), sections: ['center'], detach: true },
  order2R: { kind: 'order2R', title: 'Order Two Units Right', group: 'section', count: 3, text: sec(2, 'right', 'right'), sections: ['right'], detach: true },
  order3L: { kind: 'order3L', title: 'Order Three Units Left', group: 'section', count: 3, text: sec(3, 'left', 'left'), sections: ['left'], detach: true },
  order3C: { kind: 'order3C', title: 'Order Three Units Center', group: 'section', count: 4, text: sec(3, 'center', 'center'), sections: ['center'], detach: true },
  order3R: { kind: 'order3R', title: 'Order Three Units Right', group: 'section', count: 3, text: sec(3, 'right', 'right'), sections: ['right'], detach: true },
  order4L: { kind: 'order4L', title: 'Order Four Units Left', group: 'section', count: 1, text: sec(4, 'left', 'left'), sections: ['left'], detach: true },
  order4C: { kind: 'order4C', title: 'Order Four Units Center', group: 'section', count: 1, text: sec(4, 'center', 'center'), sections: ['center'], detach: true },
  order4R: { kind: 'order4R', title: 'Order Four Units Right', group: 'section', count: 1, text: sec(4, 'right', 'right'), sections: ['right'], detach: true },
  outFlanked: {
    kind: 'outFlanked', title: 'Out Flanked', group: 'section', count: 2,
    text: 'Issue an order to 2 units or leaders in the left section and 2 in the right section.',
    sections: ['left', 'right'], detach: true,
  },
  coordinated: {
    kind: 'coordinated', title: 'Coordinated Attack', group: 'section', count: 2,
    text: 'Issue an order to 1 unit or leader in each section.',
    sections: ['left', 'center', 'right'], detach: true,
  },
  orderLight: {
    kind: 'orderLight', title: 'Order Light Troops', group: 'troop', count: 4,
    text: 'Order light foot and light mounted units, up to your Command. Light foot may move through friendly units. No light units? Order 1 unit of your choice.',
    sections: [], detach: false,
  },
  orderMedium: {
    kind: 'orderMedium', title: 'Order Medium Troops', group: 'troop', count: 3,
    text: 'Order medium foot and medium mounted units, up to your Command. No medium units? Order 1 unit of your choice.',
    sections: [], detach: false,
  },
  orderHeavy: {
    kind: 'orderHeavy', title: 'Order Heavy Troops', group: 'troop', count: 2,
    text: 'Order heavy foot and heavy mounted units, up to your Command. No heavy units? Order 1 unit of your choice.',
    sections: [], detach: false,
  },
  orderMounted: {
    kind: 'orderMounted', title: 'Order Mounted', group: 'troop', count: 1,
    text: 'Order mounted units and/or leaders, up to your Command. No mounted units? Order 1 unit of your choice.',
    sections: [], detach: true,
  },
  inspiredL: {
    kind: 'inspiredL', title: 'Inspired Left Leadership', group: 'leadership', count: 1,
    text: "Order a leader in the left section, his unit, and up to 4 more units in a linked chain of adjacent hexes. Or order 1 unit of your choice in the left section.",
    sections: ['left'], detach: false,
  },
  inspiredC: {
    kind: 'inspiredC', title: 'Inspired Center Leadership', group: 'leadership', count: 1,
    text: "Order a leader in the center section, his unit, and up to 4 more units in a linked chain of adjacent hexes. Or order 1 unit of your choice in the center section.",
    sections: ['center'], detach: false,
  },
  inspiredR: {
    kind: 'inspiredR', title: 'Inspired Right Leadership', group: 'leadership', count: 1,
    text: "Order a leader in the right section, his unit, and up to 4 more units in a linked chain of adjacent hexes. Or order 1 unit of your choice in the right section.",
    sections: ['right'], detach: false,
  },
  leadershipAny: {
    kind: 'leadershipAny', title: 'Leadership Any Section', group: 'leadership', count: 3,
    text: 'Order a leader anywhere, his unit, and up to 3 more units in a linked chain of adjacent hexes. Or order 1 unit of your choice.',
    sections: ['left', 'center', 'right'], detach: false,
  },
  clash: {
    kind: 'clash', title: 'Clash of Shields', group: 'tactic', count: 1,
    text: 'Every unit adjacent to the enemy is ordered. No movement before combat. +2 dice in close combat. May momentum advance (bonus combat at normal dice). No ranged combat.',
    sections: [], detach: false,
  },
  counterAttack: {
    kind: 'counterAttack', title: 'Counter Attack', group: 'tactic', count: 2,
    text: "Issue the same order your opponent just played. Section and Inspired cards swap left and right.",
    sections: [], detach: false,
  },
  darken: {
    kind: 'darken', title: 'Darken the Sky', group: 'tactic', count: 1,
    text: 'Every unit with missile weapons is ordered and may fire twice. No movement. No missile units? Order 1 unit of your choice.',
    sections: [], detach: false,
  },
  doubleTime: {
    kind: 'doubleTime', title: 'Double Time', group: 'tactic', count: 2,
    text: 'Order up to 4 foot units in a linked group. Each may move 2 hexes and still close combat; warriors may move 2-3 but must close combat. No ranged combat.',
    sections: [], detach: false,
  },
  firstStrike: {
    kind: 'firstStrike', title: 'First Strike', group: 'tactic', count: 1,
    text: "Play when the opponent declares a close combat against you, before dice are rolled. Your unit battles first; if the attacker survives in place it then attacks normally. No battle back.",
    sections: [], detach: false,
  },
  spartacus: {
    kind: 'spartacus', title: 'I Am Spartacus', group: 'tactic', count: 1,
    text: 'Roll dice equal to your Command. Each unit symbol orders one unit of that type; each helmet orders any unit or leader. Ordered units roll 1 extra die. Then reshuffle deck and discards.',
    sections: [], detach: true,
  },
  lineCommand: {
    kind: 'lineCommand', title: 'Line Command', group: 'tactic', count: 4,
    text: 'Order a group of foot units in linked adjacent hexes. Each may move up to 1 hex and battle. No foot units? Order 1 unit of your choice.',
    sections: [], detach: false,
  },
  mountedCharge: {
    kind: 'mountedCharge', title: 'Mounted Charge', group: 'tactic', count: 2,
    text: 'Order mounted units up to your Command. +1 die in close combat. Heavy mounted units may move 3 hexes and battle. No ranged combat.',
    sections: [], detach: false,
  },
  moveFireMove: {
    kind: 'moveFireMove', title: 'Move-Fire-Move', group: 'tactic', count: 2,
    text: 'Order light units up to your Command. All move, then all fire, then all may move again. No close combat. Light foot may move through friendly units.',
    sections: [], detach: false,
  },
  rally: {
    kind: 'rally', title: 'Rally', group: 'tactic', count: 1,
    text: "Roll dice equal to your Command. Each unit symbol restores 1 block to a unit of that type in or next to a leader's hex; a helmet restores any type. Rallied units are ordered.",
    sections: [], detach: false,
  },
};

/** Deterministic list of the 60 card instances: index = card id. */
export const CARD_LIST: CardKind[] = (() => {
  const list: CardKind[] = [];
  for (const def of Object.values(CARD_DEFS)) for (let i = 0; i < def.count; i++) list.push(def.kind);
  return list;
})();

export function cardKind(id: number): CardKind {
  return CARD_LIST[id];
}

/** Section cards: number of orders per section (from the player's own point of view). */
export function sectionOrders(kind: CardKind): Partial<Record<SectionName, number>> | null {
  switch (kind) {
    case 'order2L': return { left: 2 };
    case 'order2C': return { center: 2 };
    case 'order2R': return { right: 2 };
    case 'order3L': return { left: 3 };
    case 'order3C': return { center: 3 };
    case 'order3R': return { right: 3 };
    case 'order4L': return { left: 4 };
    case 'order4C': return { center: 4 };
    case 'order4R': return { right: 4 };
    case 'outFlanked': return { left: 2, right: 2 };
    case 'coordinated': return { left: 1, center: 1, right: 1 };
    default: return null;
  }
}

/** Mirror a card for Counter Attack (left <-> right). */
export function mirrorKind(kind: CardKind): CardKind {
  const swap: Partial<Record<CardKind, CardKind>> = {
    order2L: 'order2R', order2R: 'order2L', order3L: 'order3R', order3R: 'order3L',
    order4L: 'order4R', order4R: 'order4L', inspiredL: 'inspiredR', inspiredR: 'inspiredL',
  };
  return swap[kind] ?? kind;
}

export function defaultMods(): OrderMods {
  return {
    ccBonus: 0, ccBonusOnBonusCombat: false, rangedBonus: 0, noRanged: false, noClose: false, noMove: false,
    passThrough: false, maxMove: null, doubleTime: false, mountedCharge: false, shots: 1, moveFireMove: false,
  };
}

export function modsFor(kind: CardKind): OrderMods {
  const m = defaultMods();
  switch (kind) {
    case 'orderLight': m.passThrough = true; break;
    case 'clash': m.ccBonus = 2; m.noMove = true; m.noRanged = true; break;
    case 'darken': m.noMove = true; m.noClose = true; m.shots = 2; break;
    case 'doubleTime': m.doubleTime = true; m.noRanged = true; break;
    case 'spartacus': m.ccBonus = 1; m.ccBonusOnBonusCombat = true; m.rangedBonus = 1; break;
    case 'lineCommand': m.maxMove = 1; break;
    case 'mountedCharge': m.ccBonus = 1; m.ccBonusOnBonusCombat = true; m.mountedCharge = true; m.noRanged = true; break;
    case 'moveFireMove': m.moveFireMove = true; m.noClose = true; m.passThrough = true; break;
    default: break;
  }
  return m;
}
