// The boxes of the game: the base game and its expansions, in order. Everything keyed by box derives from this table:
// a battle file's `expansion` (src/scenarios), the box of a unit type or elite preset (`UnitStats.expansion`,
// `EliteDef.expansion`, by number), the battle picker's tabs, the rules reference's tabs and the briefing texts by box.
// A new expansion is one row here, then its battles, texts and rules tab (the compiler asks for each table keyed by box).

export interface ExpansionDef {
  /** Id of the box: a battle file's `expansion` (which the base game's files leave out). */
  id: string;
  /** 0 the base game, then 1, 2, ... (`UnitStats.expansion`, `EliteDef.expansion`). */
  number: number;
  /** Its name in the rules reference: the base game's rules are the general tabs, each expansion has a tab of this name. */
  name: string;
  /** Its tab in the battle picker. */
  pickerLabel: string;
}

export const EXPANSIONS = [
  { id: 'base', number: 0, name: 'Base game', pickerLabel: 'Punic Wars' },
  { id: 'exp1', number: 1, name: 'Expansion #1', pickerLabel: 'Greece & the East' },
  { id: 'exp2', number: 2, name: 'Expansion #2', pickerLabel: 'Rome & the Barbarians' },
  { id: 'exp3', number: 3, name: 'Expansion #3', pickerLabel: 'Roman Civil Wars' },
] as const satisfies readonly ExpansionDef[];

/** Which box a battle comes from (`EXPANSIONS` id). */
export type Expansion = (typeof EXPANSIONS)[number]['id'];

/** The box that brings a unit type or an elite preset, by number: 0 the base game, 1–3 Expansion #1–#3. */
export type ExpansionNumber = (typeof EXPANSIONS)[number]['number'];
