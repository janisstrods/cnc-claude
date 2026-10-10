/**
 * Published releases, newest first; the first is shown on the main menu. Each is named after a battle of the game that
 * suits what it brought (no fixed order, never reused). Bump for every publish, together with package.json's version.
 */
export const RELEASES = [
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
