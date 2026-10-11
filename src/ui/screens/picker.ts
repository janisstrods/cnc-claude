// Battle picker logic: the boxes as tabs, and the optional rules a battle offers (with the player's remembered
// choices). Pure apart from the tab and the choices remembered in storage.
import { EXPANSIONS, type Expansion, type GameOptions, type Side } from '../../engine';
import type { ScenarioInfo } from '../../scenarios';
import { storage } from '../storage';

export interface PickerTab {
  id: Expansion;
  label: string;
}

/**
 * Picker tabs in display order, one per box (`EXPANSIONS`): the base game (001–015), Expansion #1 (101–124), Expansion #2
 * (201–223), then Expansion #3 (301–319).
 */
export const PICKER_TABS: readonly PickerTab[] = EXPANSIONS.map((e) => ({ id: e.id, label: e.pickerLabel }));

/** The battles of one tab, in the order given (the scenario list is sorted by id). */
export function battlesOf(all: readonly ScenarioInfo[], tab: Expansion): ScenarioInfo[] {
  return all.filter((s) => s.expansion === tab);
}

/** The tab a key press on the tab list selects: Left/Right step (wrapping around), Home/End the first/last; else none. */
export function tabForKey(current: Expansion, key: string): Expansion | undefined {
  const n = PICKER_TABS.length;
  const i = PICKER_TABS.findIndex((t) => t.id === current);
  const j = key === 'ArrowRight' ? (i + 1) % n : key === 'ArrowLeft' ? (i + n - 1) % n : key === 'Home' ? 0 : key === 'End' ? n - 1 : -1;
  return j < 0 ? undefined : PICKER_TABS[j].id;
}

/**
 * Random battle: any battle of `all` except the one shown (`currentId`), so a press always changes it, and a side to
 * command, each equally likely. `rand` returns numbers in [0, 1), like Math.random.
 */
export function randomPick(
  all: readonly ScenarioInfo[],
  currentId: string,
  rand: () => number = Math.random,
): { battle: ScenarioInfo; side: Side } {
  const others = all.filter((s) => s.id !== currentId);
  const pool = others.length ? others : all;
  const battle = pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
  return { battle, side: rand() < 0.5 ? 'bottom' : 'top' };
}

const TAB_KEY = 'cca-battle-tab';

/** The tab shown last time (the base game when none is stored or the value is unknown). */
export function loadPickerTab(): Expansion {
  const v = storage.get(TAB_KEY);
  return PICKER_TABS.find((t) => t.id === v)?.id ?? 'base';
}

export function savePickerTab(tab: Expansion) {
  storage.set(TAB_KEY, tab);
}

// ---------------------------------------------------------------------------------------------
// optional rules (§17.3)

export type OptionId = keyof GameOptions;

export interface OptionalRule {
  name: string;
  /** One-line explanation for the briefing of `sc`. */
  text: (sc: ScenarioInfo) => string;
}

/** The army of a battle that is not Roman (the side Tactical Flexibility weakens), or a generic word. */
function nonRomanArmy(sc: ScenarioInfo): string {
  const { top, bottom } = sc.setup;
  if (top.army === 'Roman') return bottom.army;
  if (bottom.army === 'Roman') return top.army;
  return 'non-Roman';
}

export const OPTIONAL_RULES: Record<OptionId, OptionalRule> = {
  tacticalFlexibility: {
    name: 'Roman Tactical Flexibility',
    text: (sc) =>
      `${nonRomanArmy(sc)} heavy infantry with fewer than two friendly neighbours, and not on broken ground, battle back ` +
      'against Roman medium or heavy infantry with only 3 dice.',
  },
};

/** Optional rules the battle offers (its `setup.options`), in a fixed order. */
export function offeredOptions(sc: ScenarioInfo): OptionId[] {
  const o = sc.setup.options ?? {};
  return (Object.keys(OPTIONAL_RULES) as OptionId[]).filter((id) => o[id] !== undefined);
}

const OPTIONS_KEY = 'cca-options';

/** The player's last choice per optional rule (only known rules with a boolean value survive). */
export function loadOptionChoices(): GameOptions {
  const raw = storage.get(OPTIONS_KEY);
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    const out: GameOptions = {};
    if (parsed && typeof parsed === 'object') {
      for (const id of Object.keys(OPTIONAL_RULES) as OptionId[]) {
        const v = (parsed as Record<string, unknown>)[id];
        if (typeof v === 'boolean') out[id] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Remember one choice (merged into the stored choices); returns the new set. */
export function saveOptionChoice(choices: GameOptions, id: OptionId, value: boolean): GameOptions {
  const next: GameOptions = { ...choices, [id]: value };
  storage.set(OPTIONS_KEY, JSON.stringify(next));
  return next;
}

/** Whether an optional rule is on for this battle: the remembered choice, else the scenario's default. */
export function optionValue(sc: ScenarioInfo, id: OptionId, choices: GameOptions): boolean {
  return choices[id] ?? sc.setup.options?.[id] ?? false;
}

/** The options to start `sc` with (every rule it offers, set), or undefined when it offers none. */
export function chosenOptions(sc: ScenarioInfo, choices: GameOptions): GameOptions | undefined {
  const ids = offeredOptions(sc);
  if (!ids.length) return undefined;
  const out: GameOptions = {};
  for (const id of ids) out[id] = optionValue(sc, id, choices);
  return out;
}
