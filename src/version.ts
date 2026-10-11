/**
 * Published releases, newest first; the first is shown on the main menu. Each is named after a battle of the game that
 * suits what it brought (no fixed order, never reused). Bump for every publish, together with package.json's version.
 */
export const RELEASES = [
  { number: '1.6.2', name: 'Dyrrhachium', notes: 'Undo card: take back the command card you just played, and the orders it gave, until a unit moves or battles' },
  { number: '1.6.1', name: 'Cefn Carnedd', notes: 'Camps, ramparts and city walls protect only the defender: a unit that attacks out of one gets no help against the battle back; the terrain tooltips say so' },
  { number: '1.6.0', name: 'Pydna', notes: 'Triumphs: bronze, silver and gold medals for each side of each battle won against the Recruit, Tribune and Consul, shown in the battle picker and in a record of every battle on the main menu, which can be saved and loaded' },
  { number: '1.5.1', name: 'Ilerda', notes: 'Under the hood: a leaner engine, rules kept in one place, and a computer opponent that thinks about twice as fast and starts planning while the board still moves' },
  { number: '1.5.0', name: 'Pharsalus', notes: 'Expansion #3, The Roman Civil Wars (battles 301–319): Sulla, Sertorius, Caesar and Pompey, with city walls, dice orders and the history of every battle' },
  { number: '1.4.4', name: 'Cynoscephalae', notes: 'Random battle in the battle picker: a battle from any box, and a side, picked at random' },
  { number: '1.4.3', name: 'Gabiene', notes: 'Play again after a battle; switch sides and the second battle sums up both, the banner totals deciding the match' },
  { number: '1.4.2', name: 'Lake Trasimenus', notes: 'Hover any hex to see what its terrain does to movement, combat and line of sight' },
  { number: '1.4.1', name: 'Clastidium', notes: 'History of every Expansion #2 battle: the road to battle, an animated battle map and the outcome' },
  { number: '1.4.0', name: 'Vercellae', notes: 'Expansion #2, Rome & the Barbarians (battles 201–223): Gauls, Germans, Spartacus and the Britons against the legions' },
  { number: '1.3.0', name: 'Marathon', notes: 'History of every battle: the road to battle, an animated battle map and the outcome, in three slides' },
  { number: '1.2.1', name: 'Ilipa', notes: 'End-of-battle dialog redrawn: banner scoreboard, tidy rematch buttons' },
  { number: '1.2.0', name: '2nd Beneventum', notes: 'Rematch after a battle, same or switched sides; release shown on the main menu' },
  { number: '1.1.0', name: 'Gaugamela', notes: 'Expansion #1, Greece & Eastern Kingdoms (battles 101–124)' },
  { number: '1.0.0', name: 'Cannae', notes: 'The base game (battles 001–015)' },
] as const;

export const RELEASE = RELEASES[0];

declare const __BUILD_TIME__: string;

/** When this bundle was built (ISO, UTC), or null in the dev server. */
export const BUILD_TIME: string | null = import.meta.env.DEV ? null : __BUILD_TIME__;

/** "build 2026-10-10 14:05 UTC", or "dev build". */
export function buildLabel(iso: string | null): string {
  return iso ? `build ${iso.slice(0, 16).replace('T', ' ')} UTC` : 'dev build';
}
