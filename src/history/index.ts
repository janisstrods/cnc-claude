// Battle histories: one data file per battle in ./battles, each its own chunk loaded when the History dialog opens.
import type { BattleHistory, BattleMap, PlacedUnit, UnitPos } from './types';

export * from './types';

const loaders = import.meta.glob<BattleHistory>('./battles/*.ts', { import: 'default' });

const pathOf = (id: string) => `./battles/${id}.ts`;

/** Whether a battle has a history (no loading needed). */
export function hasHistory(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(loaders, pathOf(id));
}

/** The ids of every battle with a history, in order. */
export function historyIds(): string[] {
  return Object.keys(loaders)
    .map((p) => p.slice('./battles/'.length, -'.ts'.length))
    .sort();
}

/** Loads a battle's history; rejects when it has none. */
export function loadHistory(id: string): Promise<BattleHistory> {
  const load = hasHistory(id) ? loaders[pathOf(id)] : undefined;
  return load ? load() : Promise.reject(new Error(`No history for battle ${id}`));
}

/**
 * The units on the map in a phase: each phase applies its placements, then its breaks and departures, to the state left
 * by the phases before it. Units not yet placed (late arrivals) and units gone are left out; a unit gone in an earlier
 * phase comes back when a later phase places it again (cavalry returning from a pursuit).
 */
export function unitsAtPhase(map: BattleMap, phase: number): PlacedUnit[] {
  return unitFrames(map, phase).filter((f) => f.visible);
}

/** A unit as the map draws it in a phase, visible or not (hidden units fade out where they were, or in where they will be). */
export interface UnitFrame extends PlacedUnit {
  visible: boolean;
}

/** Every unit of the map in a phase; see `unitsAtPhase` for the rules. */
export function unitFrames(map: BattleMap, phase: number): UnitFrame[] {
  const pos = new Map<string, UnitPos>();
  const broken = new Set<string>();
  const gone = new Set<string>();
  for (let i = 0; i <= phase && i < map.phases.length; i++) {
    const ph = map.phases[i];
    for (const [id, p] of Object.entries(ph.at)) {
      pos.set(id, p);
      gone.delete(id);
    }
    for (const id of ph.broken ?? []) broken.add(id);
    for (const id of ph.gone ?? []) gone.add(id);
  }
  const out: UnitFrame[] = [];
  for (const unit of map.units) {
    const p = pos.get(unit.id);
    if (p) {
      out.push({ unit, pos: p, broken: broken.has(unit.id), visible: !gone.has(unit.id) });
      continue;
    }
    // not placed yet: wait, hidden, where it first appears
    const later = map.phases.slice(phase + 1).find((ph) => ph.at[unit.id]);
    if (later) out.push({ unit, pos: later.at[unit.id], broken: false, visible: false });
  }
  return out;
}
