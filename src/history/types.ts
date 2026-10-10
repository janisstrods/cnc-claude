// The historical context of a battle, shown as three slides: the road to battle and who fought, an abstracted map of
// the fighting in phases, and the outcome and its consequences. One file per battle in ./battles (see the design note
// design/superpowers/specs/2026-10-10-battle-history-design.md).
import type { Side } from '../engine/types';

/** The map field: x runs 0..MAP_W left to right, y runs 0..MAP_H from the scenario's top army to its bottom army. */
export const MAP_W = 1000;
export const MAP_H = 600;

/** A point on the map field. */
export type Pt = [x: number, y: number];

export interface BattleHistory {
  /** The scenario id ('007'). */
  id: string;
  /** The accepted date when it differs from the scenario's year ("255 BC"); the dialog's title shows it. */
  date?: string;
  /** Slide 1: the war and why the armies met here. */
  context: {
    /** The war or campaign, with dates: "Second Punic War, 218–201 BC". */
    war: string;
    /** One or two short paragraphs. */
    text: string[];
  };
  /** Who fought: the scenario's top and bottom armies. */
  sides: Record<Side, SideHistory>;
  /** Slide 2. */
  map: BattleMap;
  /** Slide 3. */
  outcome: {
    /** Who won: a scenario side, or 'draw' for an indecisive battle. */
    winner: Side | 'draw';
    /** One line: "Decisive Carthaginian victory". */
    result: string;
    /** One line on the losses, with their uncertainty. */
    losses?: string;
    /** One or two short paragraphs on what followed. */
    text: string[];
  };
  /** Ancient authors with book and chapter, and modern references. */
  sources: string[];
}

export interface SideHistory {
  /** The army: "Carthaginians and allies". */
  name: string;
  /** Commanders, with their role where useful: "Hasdrubal (left-wing cavalry)". */
  commanders: string[];
  /** Estimated strength, with its uncertainty: "c. 40,000 foot and 10,000 horse". */
  strength: string;
  /** One line on the army's make-up. */
  forces: string;
}

export interface BattleMap {
  /** Direction of north in degrees clockwise from the top of the map; left out when the site or orientation is unknown. */
  north?: number;
  terrain: MapFeature[];
  units: MapUnit[];
  /** One to four phases; each applies its changes to the state left by the phase before. */
  phases: MapPhase[];
}

export type AreaKind = 'sea' | 'lake' | 'hills' | 'woods' | 'marsh' | 'fields';

export type MapFeature =
  /** A river or stream along the points; `width` in map units (default 14). */
  | { kind: 'river'; points: Pt[]; width?: number; label?: string }
  /** A filled area (polygon). */
  | { kind: AreaKind; points: Pt[]; label?: string }
  /** A road or track (dashed line). */
  | { kind: 'road'; points: Pt[]; label?: string }
  /** A walled town; `size` is the half-width in map units (default 26). */
  | { kind: 'town'; at: Pt; size?: number; label?: string }
  /** A fortified camp; `size` is the half-width in map units (default 34). */
  | { kind: 'camp'; at: Pt; size?: number; label?: string }
  /** A free text label: a place name, a hill name. */
  | { kind: 'label'; at: Pt; text: string };

export type UnitKind =
  | 'foot' // formed infantry: phalanx, hoplites, legions
  | 'light' // skirmishers, archers, slingers
  | 'warband' // loose-order tribal foot
  | 'horse' // formed cavalry
  | 'lighthorse' // skirmishing cavalry, horse archers
  | 'elephants'
  | 'chariots'
  | 'camels'
  | 'machines'; // bolt-shooters, stone-throwers

export interface MapUnit {
  id: string;
  side: Side;
  kind: UnitKind;
  /** A short name shown beside the block: "Libyans", "Companions". */
  label?: string;
  /** Block size in map units (defaults depend on the kind). */
  w?: number;
  h?: number;
}

/** A unit's place in a phase: x, y and an optional rotation in degrees (clockwise; 0 = facing the other army). */
export type UnitPos = [x: number, y: number] | [x: number, y: number, rotation: number];

export interface MapPhase {
  /** A few words: "Deployment", "The trap closes". */
  title: string;
  /** One or two sentences on what happens in this phase. */
  caption: string;
  /** Units placed or moved in this phase; the others keep their place from the phase before. Placing a gone unit brings it back. */
  at: Record<string, UnitPos>;
  /** Units broken in this phase (drawn faded from now on). */
  broken?: string[];
  /** Units that leave the field in this phase (destroyed, fled, withdrawn, off in pursuit). */
  gone?: string[];
  /** Movement in this phase. */
  arrows?: MapArrow[];
}

export interface MapArrow {
  side: Side;
  /** The path, from its start to the arrowhead; drawn as a smooth curve through the points. */
  points: Pt[];
  /** advance (default): solid; retreat and rout: dashed. */
  style?: 'advance' | 'retreat' | 'rout';
}

/** A unit as drawn in one phase. */
export interface PlacedUnit {
  unit: MapUnit;
  pos: UnitPos;
  broken: boolean;
}
