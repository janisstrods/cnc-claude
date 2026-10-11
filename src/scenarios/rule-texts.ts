// Rule paragraphs that the briefings of more than one expansion repeat word for word (exp2-texts.ts, exp3-texts.ts): one
// wording per rule, so a change reaches every battle. Repeats within one expansion are at the top of its own texts module.
// A battle that adds sentences of its own builds them around the shared paragraph (`${RAMPARTS} The eight ...`); a
// variant that differs by a word stays inline in its battle. Plain-language paraphrases of design/rules-reference.md.

/** Fortified camps (rules-reference §4). */
export const FORTIFIED_CAMPS = 'Fortified camps: a unit in one rolls 1 fewer die when it battles, and a foot unit there ignores 1 sword and may ignore 1 flag.';

/** Ramparts (§16). */
export const RAMPARTS = "Ramparts shelter foot units: one standing on a rampart ignores the first sword and may ignore 1 extra flag when attacked from across the rampart's front edge, and may ignore 1 flag from missile fire across it. Mounted units gain nothing.";

/** Caesar's leader abilities (§18.3). */
export const CAESAR = 'Caesar: the unit he is attached to rolls 1 extra die in close combat, and an infantry unit that starts its move with him may move 2 hexes and still battle.';
