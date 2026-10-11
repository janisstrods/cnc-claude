// The player's battle record (Triumphs): every finished battle, counted per battle, side commanded and opponent level,
// and the medals it earns (bronze, silver, gold for beating the Recruit, Tribune, Consul from a side). Kept in the
// browser's storage and in exported files; pure apart from loading and saving.
import type { Side } from '../engine';
import type { Difficulty } from './game/controller';
import { storage } from './storage';

export type Outcome = 'won' | 'lost' | 'draw';
export type Medal = 'bronze' | 'silver' | 'gold';
/** A side's standing in one battle: its best medal, 'fought' (finished but never won) or 'none' (never finished). */
export type Standing = Medal | 'fought' | 'none';

export interface Tally {
  won: number;
  lost: number;
  draw: number;
}
/** One battle's results, per side commanded and opponent level. */
export type BattleResults = Partial<Record<Side, Partial<Record<Difficulty, Tally>>>>;
/** Every battle's results, by battle id. */
export type BattleRecord = Record<string, BattleResults>;

/** Opponent levels, easiest first. */
export const LEVELS: readonly Difficulty[] = ['recruit', 'tribune', 'consul'];
export const MEDAL_FOR: Record<Difficulty, Medal> = { recruit: 'bronze', tribune: 'silver', consul: 'gold' };
const SIDES: readonly Side[] = ['bottom', 'top'];
const OUTCOMES: readonly Outcome[] = ['won', 'lost', 'draw'];
const NO_RESULTS: Tally = { won: 0, lost: 0, draw: 0 };

export function isMedal(s: Standing): s is Medal {
  return s === 'bronze' || s === 'silver' || s === 'gold';
}

/** How a battle ended for the human. */
export function outcomeFor(humanSide: Side, winner: Side | 'draw'): Outcome {
  return winner === 'draw' ? 'draw' : winner === humanSide ? 'won' : 'lost';
}

/** The record with one more result (a new record; the one given is left as it was). */
export function addResult(rec: BattleRecord, battleId: string, side: Side, level: Difficulty, outcome: Outcome): BattleRecord {
  const battle = rec[battleId] ?? {};
  const levels = battle[side] ?? {};
  const t = levels[level] ?? NO_RESULTS;
  return { ...rec, [battleId]: { ...battle, [side]: { ...levels, [level]: { ...t, [outcome]: t[outcome] + 1 } } } };
}

/** All results of one side of a battle, every level together. */
export function sideTally(rec: BattleRecord, battleId: string, side: Side): Tally {
  const levels = rec[battleId]?.[side] ?? {};
  const sum = { ...NO_RESULTS };
  for (const l of LEVELS) for (const o of OUTCOMES) sum[o] += levels[l]?.[o] ?? 0;
  return sum;
}

/** The levels beaten from one side of a battle, easiest first. */
export function beatenLevels(rec: BattleRecord, battleId: string, side: Side): Difficulty[] {
  return LEVELS.filter((l) => (rec[battleId]?.[side]?.[l]?.won ?? 0) > 0);
}

export function sideStanding(rec: BattleRecord, battleId: string, side: Side): Standing {
  const beaten = beatenLevels(rec, battleId, side);
  if (beaten.length) return MEDAL_FOR[beaten[beaten.length - 1]];
  const t = sideTally(rec, battleId, side);
  return t.won + t.lost + t.draw > 0 ? 'fought' : 'none';
}

export interface Totals {
  /** Sides whose best medal is gold, silver, bronze. */
  gold: number;
  silver: number;
  bronze: number;
  /** Battles with a finished result from either side. */
  fought: number;
  /** The battles counted, and their sides (two each). */
  battles: number;
  sides: number;
}

/** The medals and battles fought among `battleIds`. */
export function recordTotals(rec: BattleRecord, battleIds: readonly string[]): Totals {
  const t: Totals = { gold: 0, silver: 0, bronze: 0, fought: 0, battles: battleIds.length, sides: 2 * battleIds.length };
  for (const id of battleIds) {
    let fought = false;
    for (const side of SIDES) {
      const s = sideStanding(rec, id, side);
      if (isMedal(s)) t[s]++;
      if (s !== 'none') fought = true;
    }
    if (fought) t.fought++;
  }
  return t;
}

/** Both records in one, taking the larger count of each result: merging a record in twice changes nothing. */
export function mergeRecords(a: BattleRecord, b: BattleRecord): BattleRecord {
  let out: BattleRecord = { ...a };
  for (const [id, battle] of Object.entries(b)) {
    for (const side of SIDES) {
      for (const level of LEVELS) {
        const theirs = battle[side]?.[level];
        if (!theirs) continue;
        const ours = out[id]?.[side]?.[level] ?? NO_RESULTS;
        const t: Tally = { won: Math.max(ours.won, theirs.won), lost: Math.max(ours.lost, theirs.lost), draw: Math.max(ours.draw, theirs.draw) };
        const cur = out[id] ?? {};
        out = { ...out, [id]: { ...cur, [side]: { ...cur[side], [level]: t } } };
      }
    }
  }
  return out;
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const count = (v: unknown) => (typeof v === 'number' && Number.isSafeInteger(v) && v > 0 ? v : 0);

/**
 * A record read from storage or a file: battle ids of three digits (ids of later releases are kept), known sides and
 * levels, whole non-negative counts. Anything else is dropped; null when `raw` is not a record at all.
 */
export function parseRecord(raw: unknown): BattleRecord | null {
  if (!isObject(raw)) return null;
  const out: BattleRecord = {};
  for (const [id, battle] of Object.entries(raw)) {
    if (!/^\d{3}$/.test(id) || !isObject(battle)) continue;
    const results: BattleResults = {};
    for (const side of SIDES) {
      const levels = battle[side];
      if (!isObject(levels)) continue;
      for (const level of LEVELS) {
        const t = levels[level];
        if (!isObject(t)) continue;
        const tally: Tally = { won: count(t.won), lost: count(t.lost), draw: count(t.draw) };
        if (tally.won + tally.lost + tally.draw) results[side] = { ...results[side], [level]: tally };
      }
    }
    if (Object.keys(results).length) out[id] = results;
  }
  return out;
}

const KEY = 'cca-record-v1';

/** The stored record (empty when there is none, it cannot be read, or storage is unavailable). */
export function loadRecord(): BattleRecord {
  try {
    const raw: unknown = JSON.parse(storage.get(KEY) ?? 'null');
    return (isObject(raw) && raw.version === 1 && parseRecord(raw.battles)) || {};
  } catch {
    return {};
  }
}

export function saveRecord(rec: BattleRecord) {
  storage.set(KEY, JSON.stringify({ version: 1, battles: rec }));
}

/** Store a finished battle; the medal it earned for the side, when better than the one the side had. */
export function recordFinished(battleId: string, side: Side, level: Difficulty, outcome: Outcome): Medal | null {
  const before = loadRecord();
  const after = addResult(before, battleId, side, level, outcome);
  saveRecord(after);
  const now = sideStanding(after, battleId, side);
  return isMedal(now) && now !== sideStanding(before, battleId, side) ? now : null;
}

const FILE_MARK = 'cca-triumphs';

/** The record as a file to download: its name (dated by the local day) and JSON text. */
export function exportRecord(rec: BattleRecord, now = new Date()): { name: string; text: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const text = JSON.stringify({ game: FILE_MARK, version: 1, savedAt: now.toISOString(), battles: rec }, null, 1);
  return { name: `${FILE_MARK}-${day}.json`, text };
}

/** The record in an exported file's text, or null when the text is not such a file. */
export function importRecord(text: string): BattleRecord | null {
  try {
    const raw: unknown = JSON.parse(text);
    return isObject(raw) && raw.game === FILE_MARK && raw.version === 1 ? parseRecord(raw.battles) : null;
  } catch {
    return null;
  }
}
