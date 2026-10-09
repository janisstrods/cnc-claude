// Pure helpers that turn (state, pending decision, local UI selection) into board highlights and badges.
import {
  ALL_HEXES, CARD_DEFS, OFF_BOARD, UNIT_STATS, battleReady, battleTargets, cardKind, closeCombatDice, closeHitChance, eligiblePieces,
  eliteDef, eliteHas, inSection, isLeaderId, leaderAt, leaderById, leaderUnit, mirrorKind, movablePieces, other, pieceMoves, rangedDice, unitAt, unitById,
  type CardKind, type Decision, type GameState, type HexId, type SectionName, type Side, type Unit,
} from '../../engine';
import type { Highlight } from './Board';

export interface UiSel {
  selCard: number | null;
  hoverCard: number | null;
  orderSel: string[];
  selPiece: string | null;
  hoverHex: HexId | null;
}

export interface BoardUi {
  highlights: Map<HexId, Highlight>;
  leaderHighlights: Map<string, Highlight>;
  badges: Map<HexId, string>;
  sectionShade: Set<HexId>;
  pathPreview: HexId[] | null;
}

/** The card kind a played card would actually execute (Counter Attack copies the opponent's last card). */
export function effectiveKind(s: GameState, side: Side, cardId: number): { kind: CardKind | null; mirrored: boolean } {
  const k = cardKind(cardId);
  if (k !== 'counterAttack') return { kind: k, mirrored: false };
  const last = s.lastCard[other(side)];
  if (!last) return { kind: null, mirrored: false };
  const m = mirrorKind(last);
  return { kind: m, mirrored: m !== last };
}

export function pieceHexOf(s: GameState, id: string): HexId {
  return (isLeaderId(id) ? leaderById(s, id)?.hex : unitById(s, id)?.hex) ?? -1;
}

function shadeSections(side: Side, secs: SectionName[]): Set<HexId> {
  const out = new Set<HexId>();
  if (!secs.length || secs.length === 3) return out;
  for (const h of ALL_HEXES) if (secs.some((x) => inSection(h, side, x))) out.add(h);
  return out;
}

export function attackDice(s: GameState, attacker: Unit, hex: HexId, kind: 'close' | 'ranged', role: 'attack' | 'bonus' = 'attack'): number {
  const op = s.turn.ordered[attacker.id];
  if (kind === 'ranged') return rangedDice(s, attacker, hex, op?.moved ?? 0, true);
  const t = unitAt(s, hex) ?? leaderAt(s, hex);
  if (!t) return 0;
  return closeCombatDice(s, attacker, t, { role, fullAtStart: attacker.blocks === attacker.maxBlocks, ordered: true });
}

export function expectedHits(s: GameState, attacker: Unit, hex: HexId, kind: 'close' | 'ranged'): number {
  const dice = attackDice(s, attacker, hex, kind);
  const t = unitAt(s, hex);
  if (!t) return dice / 6;
  const p = kind === 'ranged' ? 1 / 6 : closeHitChance(s, attacker, t);
  return dice * p;
}

export function boardUi(s: GameState, d: Decision | null, ui: UiSel, human: Side): BoardUi {
  const highlights = new Map<HexId, Highlight>();
  const leaderHighlights = new Map<string, Highlight>();
  const badges = new Map<HexId, string>();
  let sectionShade = new Set<HexId>();
  let pathPreview: HexId[] | null = null;
  const markPiece = (id: string, h: Highlight) => {
    if (isLeaderId(id)) {
      const l = leaderById(s, id);
      if (!l || l.hex < 0) return;
      if (leaderUnit(s, l)) leaderHighlights.set(id, h);
      else highlights.set(l.hex, h);
    } else {
      const u = unitById(s, id);
      if (u && u.hex >= 0) highlights.set(u.hex, h);
    }
  };

  if (!d || d.side !== human) {
    return { highlights, leaderHighlights, badges, sectionShade, pathPreview };
  }

  switch (d.kind) {
    case 'playCard': {
      const card = ui.hoverCard ?? ui.selCard;
      if (card !== null) {
        const { kind } = effectiveKind(s, human, card);
        if (kind) {
          sectionShade = shadeSections(human, CARD_DEFS[kind].sections);
          for (const id of eligiblePieces(s, human, kind)) markPiece(id, 'eligible');
        }
      }
      break;
    }
    case 'orders': {
      sectionShade = shadeSections(human, CARD_DEFS[d.card].sections);
      for (const id of eligiblePieces(s, human, d.card)) markPiece(id, 'eligible');
      for (const id of ui.orderSel) markPiece(id, 'selected');
      break;
    }
    case 'move': {
      for (const id of movablePieces(s, d.stage)) {
        markPiece(id, 'mover');
        if (pieceMoves(s, id, d.stage).some((m) => m.hex === OFF_BOARD)) {
          const h = pieceHexOf(s, id);
          if (h >= 0) badges.set(h, 'Exit');
        }
      }
      if (ui.selPiece) {
        markPiece(ui.selPiece, 'selected');
        const moves = pieceMoves(s, ui.selPiece, d.stage);
        for (const m of moves) {
          if (m.hex < 0) {
            const last = m.path[m.path.length - 2];
            if (last !== undefined && last >= 0) badges.set(last, 'Exit ↑');
            continue;
          }
          const isLeader = isLeaderId(ui.selPiece);
          highlights.set(m.hex, isLeader || d.stage === 2 ? 'move' : m.mustBattle ? 'moveMustBattle' : m.canBattle ? 'move' : 'moveNoBattle');
          if (ui.hoverHex === m.hex) pathPreview = m.path;
        }
      }
      break;
    }
    case 'battle': {
      for (const id of battleReady(s)) {
        const op = s.turn.ordered[id];
        markPiece(id, op?.mustBattle ? 'moveMustBattle' : 'attacker');
      }
      if (ui.selPiece) {
        markPiece(ui.selPiece, 'selected');
        const u = unitById(s, ui.selPiece);
        if (u) {
          for (const t of battleTargets(s, ui.selPiece)) {
            highlights.set(t.hex, t.kind === 'close' ? 'targetClose' : 'targetRanged');
            const n = attackDice(s, u, t.hex, t.kind);
            badges.set(t.hex, `${n} ${n === 1 ? 'die' : 'dice'}`);
          }
        }
      }
      break;
    }
    case 'retreat':
    case 'leaderEvade': {
      const id = d.kind === 'retreat' ? d.unit : d.leader;
      const h = pieceHexOf(s, id);
      if (h >= 0) highlights.set(h, 'focus');
      for (const o of d.options) if (!o.offBoard && o.end >= 0) highlights.set(o.end, 'option');
      if (ui.hoverHex !== null) {
        const o = d.options.find((x) => x.end === ui.hoverHex);
        if (o && h >= 0) pathPreview = [h, ...o.path];
      }
      break;
    }
    case 'momentum':
      highlights.set(d.hex, 'option');
      highlights.set(pieceHexOf(s, d.unit), 'focus');
      break;
    case 'cavalryExtra':
      highlights.set(pieceHexOf(s, d.unit), 'focus');
      for (const h of d.options) highlights.set(h, 'option');
      break;
    case 'bonusCombat': {
      const u = unitById(s, d.unit);
      if (u) highlights.set(u.hex, 'focus');
      for (const h of d.targets) {
        highlights.set(h, 'targetClose');
        if (u) {
          const n = attackDice(s, u, h, 'close', 'bonus');
          badges.set(h, `${n} ${n === 1 ? 'die' : 'dice'}`);
        }
      }
      break;
    }
    case 'defend':
    case 'ignoreFlags': {
      const target = d.kind === 'defend' ? d.target : d.unit;
      const th = pieceHexOf(s, target);
      if (th >= 0) highlights.set(th, 'focus');
      if (d.kind === 'defend') {
        const ah = pieceHexOf(s, d.attacker);
        if (ah >= 0) highlights.set(ah, 'targetClose');
      }
      break;
    }
    default:
      break;
  }
  return { highlights, leaderHighlights, badges, sectionShade, pathPreview };
}

/** Stats line for tooltips. */
export function unitSummary(u: Unit): string[] {
  const st = UNIT_STATS[u.type];
  const lines: string[] = [];
  const mv = u.type === 'WA' ? '1 (2 to charge)' : u.type === 'AX' ? '1, or 2 without battle' : String(st.move);
  lines.push(`Move ${mv} · Retreat ${st.retreat}/flag`);
  if (u.type === 'EL') lines.push('Close combat: same dice as the enemy unit (3 vs elephants, warriors, chariots)');
  else lines.push(`Close combat ${st.cc}${st.ccBack !== st.cc ? ` (${st.ccBack} battling back)` : ''} dice${u.type === 'WA' ? ' (+1 at full strength)' : ''}${st.swordHits ? '' : ', swords miss'}`);
  if (st.range) lines.push(`Missiles: range ${st.range}, 2 dice (1 after moving)`);
  const ev = st.evade === 'always' ? 'Can evade' : st.evade === 'never' ? 'Cannot evade' : st.evade === 'vsFootElephant' ? 'Can evade foot & elephants' : 'Can evade foot & heavy mounted';
  lines.push(ev);
  if (u.type === 'EL') lines.push('Ignores sword hits · rampages when it retreats');
  if (u.type === 'HCH') lines.push('Ignores 1 sword hit');
  const elite = eliteDef(u);
  if (elite) {
    const perks = [eliteHas(u, 'helmetHits') && 'helmets always hit', eliteHas(u, 'ignoreFlag') && 'ignores 1 flag'].filter(Boolean);
    if (perks.length) lines.push(`${elite.name}: ${perks.join(', ')}`);
  }
  return lines;
}
