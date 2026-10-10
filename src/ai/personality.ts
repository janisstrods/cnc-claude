// Commander personalities: plain data weights that tune the evaluation and the commentary voice.

export type Voice = 'bold' | 'methodical' | 'reckless' | 'cunning' | 'stoic';

export interface Personality {
  id: string;
  name: string;
  /** One-line description for menus. */
  epithet: string;
  /** 0..1 appetite for attacking, closing the distance and accepting even trades. */
  aggression: number;
  /** 0..1 weight on protecting own units, leaders and weakened troops. */
  caution: number;
  /** 0..1 patience with strong cards, skirmishing, flanking, use of terrain and ambushes. */
  cunning: number;
  /** 0..1 how readily the mounted arm is flung forward. */
  dash: number;
  /** Battle-log voice. */
  voice: Voice;
  /** 0..1 how talkative the commander is. */
  chatter: number;
}

export const PERSONALITIES: Personality[] = [
  {
    id: 'fox', name: 'The Fox', epithet: 'Cunning and daring: baits, outflanks and strikes where it hurts (Hannibal).',
    aggression: 0.7, caution: 0.5, cunning: 0.95, dash: 0.85, voice: 'cunning', chatter: 0.7,
  },
  {
    id: 'lion', name: 'The Lion', epithet: 'Bold and direct: seeks battle and presses every advantage (Marcellus, Nero).',
    aggression: 0.82, caution: 0.4, cunning: 0.5, dash: 0.7, voice: 'bold', chatter: 0.65,
  },
  {
    id: 'shield', name: 'The Shield', epithet: 'Methodical delayer: never gives away a cheap banner (Fabius).',
    aggression: 0.3, caution: 0.88, cunning: 0.65, dash: 0.35, voice: 'methodical', chatter: 0.5,
  },
  {
    id: 'bull', name: 'The Bull', epithet: 'Reckless and proud: charges headlong and trusts in numbers (Varro, Flaminius).',
    aggression: 0.95, caution: 0.15, cunning: 0.2, dash: 0.6, voice: 'reckless', chatter: 0.8,
  },
  {
    id: 'strategist', name: 'The Strategist', epithet: 'Calculating tactician: patient, then decisive (Scipio).',
    aggression: 0.62, caution: 0.62, cunning: 0.85, dash: 0.65, voice: 'stoic', chatter: 0.55,
  },
  {
    id: 'veteran', name: 'The Veteran', epithet: 'Steady professional: balanced and sound.',
    aggression: 0.55, caution: 0.55, cunning: 0.55, dash: 0.5, voice: 'stoic', chatter: 0.5,
  },
];

export function personalityById(id: string): Personality {
  return PERSONALITIES.find((p) => p.id === id) ?? PERSONALITIES[5];
}

const BY_NAME: [RegExp, string][] = [
  // Expansion #1 commanders (first: some names would otherwise match a base-game pattern)
  [/alexander|pyrrhus|craterus|chandragupta|maurya|decius/i, 'lion'],
  [/epaminondas|seleucus|flamininus|paull?us|callimachus/i, 'strategist'],
  [/eumenes|philip ii\b|satraces/i, 'fox'],
  [/ptolemy|perseus|pausanias|dentatus/i, 'shield'],
  [/mardonius|cleombrot|onomarchus|antiochus|philip v\b|laevinus/i, 'bull'],
  // Darius III and Porus play the Veteran: as the Shield and the Bull they lost the Alexander battles almost every time
  // in AI self-play (design/exp1-ai-balance.md)
  [/datis|hamilcar|gelon|agesilaus|antigonus|mithridates|neoptolemus|alcet|darius|porus/i, 'veteran'],
  // base game (Himilco stays the Shield in 122 Cronium too: same name, and the Akragas Himilco is one)
  [/hannibal|xanthippus|maharbal|mago/i, 'fox'],
  [/varro|flaminius|sempronius|minucius|regulus/i, 'bull'],
  [/fabius|himilco|hanno/i, 'shield'],
  [/gnaeus/i, 'lion'],
  [/scipio|laelius/i, 'strategist'],
  [/gisgo/i, 'veteran'],
  [/marcellus|nero|gracchus|timoleon|masinissa/i, 'lion'],
  [/hasdrubal|daphn|dionysius|syphax/i, 'veteran'],
];

/** A fitting default personality for a historical commander. */
export function personalityFor(commander: string, army: string): Personality {
  for (const [re, id] of BY_NAME) if (re.test(commander)) return personalityById(id);
  if (/roman/i.test(army)) return personalityById('lion');
  if (/carthag/i.test(army)) return personalityById('fox');
  return personalityById('veteran');
}
