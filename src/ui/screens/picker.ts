// Battle picker logic: the two boxes as tabs, and the optional rules a battle offers (with the player's remembered
// choices). Pure apart from the try/catch-wrapped localStorage helpers.
import type { GameOptions } from '../../engine';
import type { Expansion, ScenarioInfo } from '../../scenarios';

export interface PickerTab {
  id: Expansion;
  label: string;
}

/** Picker tabs in display order: the base game (001–015), then Expansion #1 (101–124). */
export const PICKER_TABS: readonly PickerTab[] = [
  { id: 'base', label: 'Punic Wars' },
  { id: 'exp1', label: 'Greece & the East' },
];

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

const TAB_KEY = 'cca-battle-tab';

/** The tab shown last time (the base game when none is stored or the value is unknown). */
export function loadPickerTab(): Expansion {
  try {
    const v = localStorage.getItem(TAB_KEY);
    return PICKER_TABS.find((t) => t.id === v)?.id ?? 'base';
  } catch {
    return 'base';
  }
}

export function savePickerTab(tab: Expansion) {
  try {
    localStorage.setItem(TAB_KEY, tab);
  } catch {
    /* ignore */
  }
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
  try {
    const raw = localStorage.getItem(OPTIONS_KEY);
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
  try {
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
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
