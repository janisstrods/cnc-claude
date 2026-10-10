// Checks a battle history: references, bounds, phase counts and the word limits that keep each slide short.
import { MAP_H, MAP_W, type BattleHistory, type Pt } from './types';

/** Word limits of the concise slides (about 100–160 words of prose a slide). */
export const LIMITS = {
  /** Slide 1 paragraphs, together. */
  contextWords: 170,
  /** Slide 3 paragraphs and the losses line, together. */
  outcomeWords: 170,
  captionWords: 50,
  phaseTitleWords: 5,
  strengthWords: 22,
  forcesWords: 30,
  unitLabelChars: 22,
  maxUnits: 32,
  maxPhases: 4,
} as const;

/** How far terrain may reach past the field's edge (areas are clipped to the field). */
const TERRAIN_MARGIN = 60;
/** How far an arrow may reach past the field's edge (flight off the map). */
const ARROW_MARGIN = 20;

export const words = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;

/** Problems with a history, as readable lines; empty when it is valid. */
export function validateHistory(h: BattleHistory): string[] {
  const out: string[] = [];
  const bad = (msg: string) => out.push(`${h.id}: ${msg}`);
  const inField = ([x, y]: Pt, m: number) => x >= -m && x <= MAP_W + m && y >= -m && y <= MAP_H + m;
  const isPt = (p: unknown): p is Pt => Array.isArray(p) && p.length === 2 && p.every((v) => typeof v === 'number' && Number.isFinite(v));

  if (h.date !== undefined && !/^(c\. )?\d{1,4}(\/\d{1,4})? BC$/.test(h.date)) bad(`date "${h.date}" should look like "255 BC", "c. 305 BC" or "353/352 BC"`);

  // slide 1
  if (!h.context.war.trim()) bad('context.war is empty');
  if (h.context.text.length < 1 || h.context.text.length > 3) bad('context.text needs 1–3 paragraphs');
  const cw = h.context.text.reduce((n, p) => n + words(p), 0);
  if (cw > LIMITS.contextWords) bad(`context.text has ${cw} words (max ${LIMITS.contextWords})`);
  for (const side of ['top', 'bottom'] as const) {
    const s = h.sides[side];
    if (!s) {
      bad(`sides.${side} is missing`);
      continue;
    }
    if (!s.name.trim()) bad(`sides.${side}.name is empty`);
    if (s.commanders.length < 1 || s.commanders.length > 4) bad(`sides.${side}.commanders needs 1–4 names`);
    if (words(s.strength) > LIMITS.strengthWords) bad(`sides.${side}.strength has ${words(s.strength)} words (max ${LIMITS.strengthWords})`);
    if (!s.forces.trim() || words(s.forces) > LIMITS.forcesWords) bad(`sides.${side}.forces needs 1–${LIMITS.forcesWords} words`);
  }

  // slide 2
  const m = h.map;
  if (m.north !== undefined && !(m.north >= 0 && m.north < 360)) bad('map.north must be 0–359');
  m.terrain.forEach((t, i) => {
    const where = `terrain[${i}] (${t.kind})`;
    if (t.kind === 'town' || t.kind === 'camp' || t.kind === 'label') {
      if (!isPt(t.at) || !inField(t.at, 0)) bad(`${where} must be on the field`);
      if (t.kind === 'label' && !t.text.trim()) bad(`${where} has no text`);
      return;
    }
    const min = t.kind === 'river' || t.kind === 'road' ? 2 : 3;
    if (t.points.length < min) bad(`${where} needs ${min}+ points`);
    if (!t.points.every((p) => isPt(p) && inField(p, TERRAIN_MARGIN))) bad(`${where} has a point off the field`);
  });

  const ids = new Set<string>();
  for (const u of m.units) {
    if (ids.has(u.id)) bad(`unit id ${u.id} is used twice`);
    ids.add(u.id);
    if (u.side !== 'top' && u.side !== 'bottom') bad(`unit ${u.id} has side ${String(u.side)}`);
    if (u.label && u.label.length > LIMITS.unitLabelChars) bad(`unit ${u.id} label is over ${LIMITS.unitLabelChars} characters`);
    if ((u.w !== undefined && !(u.w > 0)) || (u.h !== undefined && !(u.h > 0))) bad(`unit ${u.id} has a bad size`);
  }
  if (m.units.length > LIMITS.maxUnits) bad(`${m.units.length} units (max ${LIMITS.maxUnits})`);
  for (const side of ['top', 'bottom'] as const) {
    if (!m.units.some((u) => u.side === side)) bad(`no ${side} units on the map`);
  }

  if (m.phases.length < 1 || m.phases.length > LIMITS.maxPhases) bad(`map needs 1–${LIMITS.maxPhases} phases`);
  const placed = new Set<string>();
  m.phases.forEach((ph, i) => {
    const where = `phase ${i + 1}`;
    if (!ph.title.trim() || words(ph.title) > LIMITS.phaseTitleWords) bad(`${where} title needs 1–${LIMITS.phaseTitleWords} words`);
    if (!ph.caption.trim() || words(ph.caption) > LIMITS.captionWords) bad(`${where} caption needs 1–${LIMITS.captionWords} words`);
    for (const [id, p] of Object.entries(ph.at)) {
      if (!ids.has(id)) bad(`${where} places unknown unit ${id}`);
      const ok = Array.isArray(p) && (p.length === 2 || p.length === 3) && p.every((v) => typeof v === 'number' && Number.isFinite(v));
      if (!ok) bad(`${where} has a bad position for ${id}`);
      else if (!inField([p[0], p[1]], 0)) bad(`${where} puts ${id} off the field`);
      placed.add(id);
    }
    for (const id of [...(ph.broken ?? []), ...(ph.gone ?? [])]) {
      if (!ids.has(id)) bad(`${where} breaks or removes unknown unit ${id}`);
      else if (!placed.has(id)) bad(`${where} breaks or removes ${id} before it is placed`);
    }
    (ph.arrows ?? []).forEach((a, j) => {
      if (a.side !== 'top' && a.side !== 'bottom') bad(`${where} arrow ${j + 1} has side ${String(a.side)}`);
      if (a.points.length < 2) bad(`${where} arrow ${j + 1} needs 2+ points`);
      if (!a.points.every((p) => isPt(p) && inField(p, ARROW_MARGIN))) bad(`${where} arrow ${j + 1} has a point off the field`);
    });
  });
  if (m.phases.length && Object.keys(m.phases[0].at).length === 0) bad('phase 1 places no units');
  for (const id of ids) if (!placed.has(id)) bad(`unit ${id} is never placed`);

  // slide 3
  const o = h.outcome;
  if (o.winner !== 'top' && o.winner !== 'bottom' && o.winner !== 'draw') bad(`outcome.winner is ${String(o.winner)}`);
  if (!o.result.trim()) bad('outcome.result is empty');
  if (o.text.length < 1 || o.text.length > 3) bad('outcome.text needs 1–3 paragraphs');
  const ow = o.text.reduce((n, p) => n + words(p), 0) + (o.losses ? words(o.losses) : 0);
  if (ow > LIMITS.outcomeWords) bad(`outcome text and losses have ${ow} words (max ${LIMITS.outcomeWords})`);
  if (h.sources.length < 1 || h.sources.some((s) => !s.trim())) bad('sources needs at least one entry');
  return out;
}
