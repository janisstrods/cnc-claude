// What a board shows of a game state, as the props of its art: the painted battlefield (`BoardArt`) and the unit and leader
// tokens. Shared by the battle board, the briefing's setup preview and the dev galleries.
import { steepSlopes, veryHills, type GameState, type Leader, type Side, type Unit } from '../../engine';
import type { LeaderTokenProps, UnitTokenProps } from '../../art';
import { scenarioArt, type BoardArtProps } from '../terrain';
import { edgeBlocksOf } from './uiModel';

/**
 * `BoardArt` props of a game state: its terrain, fords and ramparts, the battle's hex art (`scenarioArt`), its hill style
 * (`veryHills`), the hills under camps and walls, its steep slopes, and on the frame the names of the armies drawn at the
 * top and bottom of the screen.
 */
export function boardArtProps(s: GameState, flipped: boolean): BoardArtProps {
  return {
    terrain: s.terrain,
    fords: s.fords,
    rampart: s.rampart,
    art: scenarioArt(s.scenarioId),
    steepHills: veryHills(s),
    hillUnder: s.hillUnder,
    steepSlopes: steepSlopes(s),
    flipped,
    topLabel: s.players[flipped ? 'bottom' : 'top'].army,
    bottomLabel: s.players[flipped ? 'top' : 'bottom'].army,
  };
}

/** The human's pieces face right, the enemy's left. */
export function facingFor(side: Side, humanSide: Side): 'left' | 'right' {
  return side === humanSide ? 'right' : 'left';
}

/** `UnitToken` props of unit `u`: its army's look and block colour, the edge colour of a separate command (210), its strength. */
export function unitTokenProps(s: GameState, u: Unit, humanSide: Side): UnitTokenProps {
  const owner = s.players[u.side];
  return {
    type: u.type, look: owner.look, blockColor: owner.blocks, edgeBlocks: edgeBlocksOf(s, u), blocks: u.blocks, maxBlocks: u.maxBlocks,
    facing: facingFor(u.side, humanSide), elite: u.elite,
  };
}

/** `LeaderToken` props of leader `l`, `attached` to a unit or alone (only a lone leader's name is written; the caller gives it). */
export function leaderTokenProps(s: GameState, l: Leader, humanSide: Side, attached: boolean): LeaderTokenProps {
  const owner = s.players[l.side];
  return { look: owner.look, blockColor: owner.blocks, edgeBlocks: edgeBlocksOf(s, l), facing: facingFor(l.side, humanSide), attached, showName: !attached };
}
