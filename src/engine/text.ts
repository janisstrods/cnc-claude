// Wording shared by the engine's log lines and the UI.

/** "Mago's", "Marcellus'". */
export function possessive(name: string): string {
  return name.endsWith('s') ? `${name}'` : `${name}'s`;
}
