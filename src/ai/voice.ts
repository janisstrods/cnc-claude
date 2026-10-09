// Battle-log flavour lines in the commander's voice. Lines never reveal hidden information: card lines are spoken
// only after the card is played (it is revealed anyway), and nothing refers to cards still in hand.
import type { ArmyLook, CardKind, EliteId, GameState, Side, UnitType } from '../engine/types';
import type { Personality, Voice } from './personality';
import type { Rng } from './rand';

export type Moment =
  | 'attack' | 'clash' | 'mounted' | 'light' | 'darken' | 'leadership' | 'ambush' | 'rally' | 'counter' | 'spartacus'
  | 'doubleTime' | 'line' | 'advance' | 'regroup' | 'hold' | 'firstStrike' | 'evade' | 'leaderEscape' | 'momentum' | 'gained'
  | 'lost' | 'nearVictory' | 'desperate' | 'exit' | 'camp' | 'stallBreak';

type Lines = Partial<Record<Voice | 'any', string[]>>;

const LINES: Record<Moment, Lines> = {
  attack: {
    any: ['Forward! Strike them now.', 'Sound the advance.', 'At them, {troops}!', 'There is our chance. Take it.'],
    bold: ['Forward the {troops}! Show them steel.', 'No more waiting. We attack!', 'Today the gods favour the brave. Advance!', '{enemy} waver. Push!'],
    methodical: ['Advance in good order, {troops}. No gaps.', 'Steady. Strike only where they are weak.', 'We take what they give us, and no more.', 'Measured steps. Keep the line dressed.'],
    reckless: ['Charge! Leave none standing!', 'Crush them, {troops}! Glory waits!', 'They are nothing. Run them down!', 'Why wait? Attack everywhere!'],
    cunning: ['There. Their flank is bare.', 'Let the {troops} bite where it hurts.', 'They watch our centre. Good.', 'Strike the weak point, then the next.'],
    stoic: ['As planned. {troops}, engage.', 'The moment has come. Advance.', 'Pressure here. Proceed.', 'Hold the line together and press.'],
  },
  clash: {
    any: ['Shields locked! Push them back!', 'All along the line: press!', 'Shoulder to shoulder, drive them!'],
    reckless: ['Every man forward! Break them!'],
    methodical: ['The whole front, one step and strike. Together.'],
    cunning: ['Now the trap closes. All together!'],
  },
  mounted: {
    any: ['Let the {troops} loose!', 'Horsemen, ride!', 'Sound the cavalry trumpets!'],
    cunning: ['Round their flank, {troops}. Into their rear.', 'Let the {troops} find their soft side.'],
    bold: ['The {troops} will decide this. Charge!'],
    reckless: ['Ride them into the dust!'],
  },
  light: {
    any: ['Skirmishers forward. Harass them.', 'Loose at will!', 'Sting them and fall back.'],
    cunning: ['Bleed them before they reach us.', 'Let them chase shadows.'],
    methodical: ['Missiles first. Then we will see.'],
  },
  darken: {
    any: ['Darken the sky!', 'Every missile, loose! Twice over!', 'Let it rain on them.'],
  },
  leadership: {
    any: ['Follow me!', 'To the standard, and forward!', 'Where I ride, you follow.'],
    bold: ['I lead this charge myself!'],
    stoic: ['Officers, with me. We decide it here.'],
    reckless: ['Watch your general and do as I do!'],
  },
  ambush: {
    any: ['Now, Mago! Spring the trap!', 'Out of the ravine, and into their rear!', 'They never saw it coming.'],
  },
  rally: {
    any: ['Re-form the ranks. Bind your wounds.', 'Rally to the standard!', 'Close up, close up. We are not done.'],
    methodical: ['A breath, a drink, and back into line.'],
  },
  counter: {
    any: ['Two can play that game.', 'As you did, so shall we.', 'Answer them in kind!'],
    cunning: ['A fine idea. I will borrow it.'],
  },
  spartacus: {
    any: ['Every man a hero today!', 'Fight as if free men!'],
  },
  doubleTime: {
    any: ['At the double!', 'Quick march! Close the distance!', 'Run, and strike as you arrive!'],
  },
  line: {
    any: ['The whole line, one step forward.', 'Dress the line and advance together.', 'Keep the ranks. Forward as one.'],
  },
  advance: {
    any: ['Close the distance.', 'Forward, in good order.', 'Advance to contact.', 'Move up. Keep together.'],
    bold: ['Forward! We go to meet them.', 'March on them!'],
    methodical: ['Step by step. Keep the line straight.', 'Advance, but slowly.'],
    reckless: ['Faster! They will not wait for us!', 'Forward, at the run!'],
    cunning: ['Edge closer. Let them wonder.', 'Shift the weight of the army. Quietly.'],
    stoic: ['Take up the new positions.', 'Advance to the agreed line.'],
  },
  regroup: {
    any: ['Fall back and re-form.', 'Pull the battered ranks out of the line.', 'Give ground. We will choose the next fight.'],
    methodical: ['Patience. Let them come to us.', 'No needless losses. Re-form.'],
    cunning: ['Let them think we are running.'],
    reckless: ['A small step back. Only to charge harder.'],
  },
  hold: {
    any: ['Hold positions.', 'Watch them. Wait.', 'Not yet.'],
    methodical: ['Steady. Our time will come.', 'Let them tire themselves.'],
    reckless: ['Bah. Wait, then.', 'This waiting is unbearable.'],
    cunning: ['Let them make the first mistake.'],
  },
  firstStrike: {
    any: ['Strike first!', 'They expected us to wait. Strike!', 'Meet them before they reach us!'],
  },
  evade: {
    any: ['Fall back, {troops}! Live to fight on.', 'Scatter and re-form!', 'Not today. Withdraw!'],
  },
  leaderEscape: {
    any: ['To me! Cut a way through!', 'The general lives! Re-form on me.', 'Ride! Ride clear!'],
  },
  momentum: {
    any: ['After them!', 'Press on! Give them no breath!', 'Follow up, {troops}!'],
    reckless: ['Chase them to the sea!'],
    methodical: ['Advance into the gap. Carefully.'],
  },
  gained: {
    any: ['Another standard taken!', 'Their standards fall!', 'Well fought. Keep it up.'],
    bold: ['That is how it is done!'],
    reckless: ['Ha! Who is next?'],
    cunning: ['Exactly as I hoped.'],
  },
  lost: {
    any: ['A setback. Close the gap.', 'Avenge them!', 'We have lost good men. Steady.'],
    methodical: ['Losses are expected. Hold the line.'],
    reckless: ['They will pay for that!'],
  },
  nearVictory: {
    any: ['One more push and the day is ours!', 'Victory is within reach!', 'They are breaking. Finish it!'],
  },
  desperate: {
    any: ['Hold! Hold at all costs!', 'Everything hangs on this.', 'Not one step back!'],
    reckless: ['We are not beaten while I still breathe!'],
  },
  exit: {
    any: ['Through! Break through to safety!', 'Out of the trap, march!'],
  },
  camp: {
    any: ['Their camp is ours!', 'Into their camp!', 'The camp is taken. Plunder later, fight now!'],
  },
  stallBreak: {
    any: ['Enough waiting!', 'We have stood here long enough. Forward!', 'Time favours them, not us. Attack!'],
    bold: ['Enough of this. At them!'],
    methodical: ['Patience has its limits. Advance, carefully.'],
    reckless: ['Finally! Charge!'],
    cunning: ['They will not come to us. So we go to them.'],
    stoic: ['The waiting is over. Advance.'],
  },
};

/** Troop names any army falls back on. */
const DEFAULT_TROOPS: Record<UnitType, string> = {
  LI: 'skirmishers', LB: 'archers', LS: 'slingers', AX: 'auxiliaries', WA: 'warriors', MI: 'spearmen', HI: 'heavy infantry',
  LC: 'light horse', MC: 'cavalry', HC: 'heavy cavalry', EL: 'war elephants', HCH: 'chariots', LBC: 'horse archers',
  CAM: 'camel riders', HWM: 'war machines',
};

/** The Greek city armies of the Persian and Theban wars (hoplite phalanx, peltasts, psiloi). */
const GREEK: Partial<Record<UnitType, string>> = {
  LI: 'psiloi', LB: 'archers', LS: 'slingers', AX: 'peltasts', MI: 'hoplites', HI: 'hoplite phalanx', LC: 'light horse',
  MC: 'Greek horse',
};
/** Macedonian-style armies (Philip, Alexander, the Successors, Pyrrhus). */
const MACEDONIAN: Partial<Record<UnitType, string>> = {
  LI: 'skirmishers', LB: 'Cretan archers', LS: 'slingers', AX: 'peltasts', MI: 'hypaspists', HI: 'phalanx', LC: 'prodromoi',
  MC: 'Companion horse', HC: 'heavy horse', EL: 'war elephants', LBC: 'horse archers',
};

/** Troop names by army look (over the defaults). */
const TROOPS: Partial<Record<ArmyLook, Partial<Record<UnitType, string>>>> = {
  roman: {
    LI: 'velites', LB: 'archers', LS: 'slingers', AX: 'auxilia', WA: 'Gallic allies', MI: 'hastati', HI: 'legionaries',
    LC: 'light horse', MC: 'equites', HC: 'heavy horse', EL: 'elephants', HCH: 'chariots', LBC: 'horse archers',
    CAM: 'camel riders', HWM: 'war machines',
  },
  carthaginian: {
    LI: 'skirmishers', LB: 'archers', LS: 'Balearic slingers', AX: 'Iberian foot', WA: 'Gauls', MI: 'Libyan spearmen',
    HI: 'Libyan veterans', LC: 'Numidians', MC: 'Iberian horse', HC: 'Carthaginian horse', EL: 'elephants', HCH: 'war chariots',
    LBC: 'horse archers', CAM: 'camel riders', HWM: 'war machines',
  },
  syracusan: {
    LI: 'peltasts', LB: 'Cretan archers', LS: 'slingers', AX: 'mercenary peltasts', WA: 'Campanians', MI: 'mercenary spearmen',
    HI: 'hoplites', LC: 'light horse', MC: 'Greek horse', HC: 'heavy horse', EL: 'elephants', HCH: 'chariots',
    LBC: 'horse archers', CAM: 'camel riders', HWM: 'war machines',
  },
  athenian: { ...GREEK, HI: 'Athenian hoplites', MI: 'Plataean hoplites' },
  theban: { ...GREEK, HI: 'Theban phalanx', MC: 'Theban horse' },
  spartan: { ...GREEK, HI: 'Spartiates', MI: 'allied hoplites', LI: 'helots', MC: 'Spartan horse' },
  phocian: { ...GREEK, MI: 'mercenary hoplites', HI: 'Phocian hoplites' },
  macedonian: { ...MACEDONIAN, MC: 'Thessalian horse', HWM: 'catapults', AX: 'Agrianians', LBC: 'Dahae horse archers' },
  antigonid: { ...MACEDONIAN, AX: 'Thracians', MI: 'peltasts', MC: 'Macedonian horse' },
  epirote: { ...MACEDONIAN, MI: 'Tarentine hoplites', WA: 'Samnites', LC: 'Tarentine horse', MC: 'Thessalian horse' },
  craterus: { ...MACEDONIAN, HI: 'phalanx veterans' },
  eumenes: { ...MACEDONIAN, MC: 'Cappadocian horse' },
  antigonus: { ...MACEDONIAN, LC: 'Tarentines' },
  seleucid: {
    ...MACEDONIAN, HI: 'Seleucid phalanx', MI: 'thureophoroi', WA: 'Galatians', HC: 'cataphracts', HCH: 'scythed chariots',
    CAM: 'Arab camel riders', LBC: 'Dahae horse archers', LC: 'Tarentines',
  },
  ptolemaic: { ...MACEDONIAN, HI: 'Ptolemaic phalanx', WA: 'Galatians', EL: 'African elephants', HC: 'royal horse' },
  persian: {
    LI: 'skirmishers', LB: 'Persian archers', LS: 'slingers', AX: 'Kardakes', MI: 'sparabara', HI: 'Greek mercenaries',
    LC: 'light horse', MC: 'Persian horse', HC: 'Bactrian horse', HCH: 'scythed chariots', EL: 'war elephants',
    LBC: 'Saka horse archers', CAM: 'camel riders',
  },
  scythian: { LC: 'Scythian riders', LBC: 'Scythian horse archers', MC: 'Scythian nobles' },
  indian: { LB: 'Indian archers', AX: 'Indian foot', MC: 'Indian horse', HCH: 'Indian chariots', EL: 'war elephants' },
  mauryan: { LB: 'Mauryan archers', AX: 'Indian foot', MC: 'Mauryan horse', HCH: 'Mauryan chariots', EL: 'war elephants', HI: 'Mauryan guard' },
};

/** Elite units are called by their own name (§17.1). */
const ELITE_NAMES: Record<EliteId, string> = {
  carthSacredBand: 'Sacred Band', thebanSacredBand: 'Sacred Band', silverShields: 'Silver Shields', companions: 'Companions',
  immortals: 'Immortals', bowAuxilia: 'bowmen',
};

export function troopName(s: GameState, side: Side, t: UnitType | undefined, elite?: EliteId): string {
  if (elite) return ELITE_NAMES[elite];
  if (!t) return 'men';
  return TROOPS[s.players[side].look]?.[t] ?? DEFAULT_TROOPS[t];
}

/** "The Romans", "Craterus' Successors" (an army name already plural keeps its form). */
function armyPlural(army: string): string {
  return /s$/.test(army) ? army : `The ${army}s`;
}

export interface VoiceMemory {
  recent: string[];
  sayTurn: number;
  saysThisTurn: number;
}

/** Card kinds mapped to a commentary moment. */
export function cardMoment(kind: CardKind | null, attacking: boolean, regrouping: boolean, advancing = false): Moment {
  const quiet: Moment = regrouping ? 'regroup' : advancing ? 'advance' : 'hold';
  switch (kind) {
    case 'clash': return 'clash';
    case 'mountedCharge':
    case 'orderMounted': return attacking || advancing ? 'mounted' : quiet;
    case 'orderLight':
    case 'moveFireMove': return attacking ? 'light' : quiet;
    case 'darken': return 'darken';
    case 'inspiredL':
    case 'inspiredC':
    case 'inspiredR':
    case 'leadershipAny': return attacking ? 'leadership' : quiet;
    case 'rally': return 'rally';
    case 'spartacus': return 'spartacus';
    case 'doubleTime': return attacking || advancing ? 'doubleTime' : quiet;
    case 'lineCommand': return attacking || advancing ? 'line' : quiet;
    default: return attacking ? 'attack' : quiet;
  }
}

/**
 * Pick a line for a moment, or nothing (chance scaled by chattiness; at most two lines per turn; no repeats).
 * `force` raises the chance for important moments.
 */
export function speak(
  s: GameState, side: Side, P: Personality, m: Moment, mem: VoiceMemory, rng: Rng,
  opts: { troops?: UnitType; elite?: EliteId; chance?: number } = {},
): string | undefined {
  const turn = s.turn.number;
  if (mem.sayTurn !== turn) {
    mem.sayTurn = turn;
    mem.saysThisTurn = 0;
  }
  if (mem.saysThisTurn >= 2) return undefined;
  const chance = Math.min(1, (opts.chance ?? 0.5) * (0.4 + P.chatter));
  if (!rng.chance(chance)) return undefined;
  const table = LINES[m];
  const pool = [...(table[P.voice] ?? []), ...(table[P.voice] ?? []), ...(table.any ?? [])];
  const fresh = pool.filter((l) => !mem.recent.includes(l));
  const pickFrom = fresh.length ? fresh : pool;
  if (!pickFrom.length) return undefined;
  const raw = rng.pick(pickFrom);
  mem.recent.push(raw);
  if (mem.recent.length > 14) mem.recent.shift();
  mem.saysThisTurn++;
  const opp = side === 'top' ? 'bottom' : 'top';
  const text = raw
    .replace('{troops}', troopName(s, side, opts.troops, opts.elite))
    .replace('{enemy}', armyPlural(s.players[opp].army))
    .replace(/(^|[.!?]\s+)([a-z])/g, (_m, pre: string, c: string) => pre + c.toUpperCase());
  const who = s.players[side].commander || s.players[side].army;
  return `${who}: "${text}"`;
}
