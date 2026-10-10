// Dev gallery for the miniature art: http://localhost:5173/#/gallery/art
// Close-up routes: #/gallery/art/detail/<look|rome|carthage|syracuse>[/TYPE,TYPE..] (tokens),
// #/gallery/art/figures/<look>[/TYPE,TYPE..[/<elite>]] (single figures, much enlarged),
// #/gallery/art/boxes/<look,look..>/<TYPE,TYPE..> (measured icon boxes of figure i = 2, for KitDef.iconBox)
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ArmyLook, Blocks, EliteId, UnitType } from '../engine/types';
import { hexPoints, HEX_W, HEX_R } from '../ui/geometry';
import { BLOCK_COLORS, LEADER_ATTACH_OFFSET, LOOKS, LeaderToken, UnitIcon, UnitToken, paletteFor, unitTypeName } from '../art';
import { crewFigure } from '../art/foot';
import { FacingRightCtx } from '../art/parts';
import { BasePlate, Miniature, figureKind } from '../art/token';
import { SCENARIOS } from '../scenarios';

const TYPES: UnitType[] = ['LI', 'LB', 'LS', 'AX', 'WA', 'MI', 'HI', 'LC', 'LBC', 'MC', 'HC', 'CAM', 'EL', 'HCH', 'HWM', 'BCH'];
const BASE_TYPES: UnitType[] = ['LI', 'LB', 'LS', 'AX', 'WA', 'MI', 'HI', 'LC', 'MC', 'HC', 'EL', 'HCH'];
const FOOT_TYPES: UnitType[] = ['LI', 'LB', 'LS', 'AX', 'WA', 'MI', 'HI'];
/** The gallery's three base armies (these names are also accepted by the `detail` route). */
type ArmyName = 'rome' | 'carthage' | 'syracuse';
const ARMY_NAMES: ArmyName[] = ['rome', 'carthage', 'syracuse'];
const ART: Record<ArmyName, { look: ArmyLook; blockColor: Blocks }> = {
  rome: { look: 'roman', blockColor: 'rom' },
  carthage: { look: 'carthaginian', blockColor: 'car' },
  syracuse: { look: 'syracusan', blockColor: 'grk' },
};
const MAX: Record<UnitType, number> = {
  LI: 4, LB: 4, LS: 4, AX: 4, WA: 4, MI: 4, HI: 4, LC: 3, MC: 3, HC: 3, EL: 2, HCH: 2, LBC: 3, CAM: 3, HWM: 2, BCH: 3,
};
const ARMY_LABEL: Record<ArmyName, string> = { rome: 'Rome', carthage: 'Carthage', syracuse: 'Syracuse' };

/** Gallery order of the looks: base game, Greek cities, Macedon and the Successors, the Eastern kingdoms, Expansion #2. */
const LOOK_ORDER: ArmyLook[] = [
  'roman', 'carthaginian', 'syracusan',
  'athenian', 'theban', 'spartan', 'phocian',
  'macedonian', 'antigonid', 'epirote', 'craterus', 'eumenes', 'antigonus', 'seleucid', 'ptolemaic',
  'persian', 'scythian', 'indian', 'mauryan',
  'gallic', 'germanic', 'slave', 'belgic', 'briton', 'marian',
];
const LOOK_LABEL: Record<ArmyLook, string> = {
  roman: 'Rome', carthaginian: 'Carthage', syracusan: 'Syracuse', athenian: 'Athens', theban: 'Thebes', spartan: 'Sparta',
  phocian: 'Phocis', macedonian: 'Macedon (Philip II, Alexander)', antigonid: 'Antigonid Macedon (Philip V, Perseus)',
  epirote: 'Epirus (Pyrrhus)', craterus: "Craterus' Successors", eumenes: "Eumenes' Successors", antigonus: "Antigonus' Successors",
  seleucid: 'Seleucids', ptolemaic: 'Ptolemies', persian: 'Persia', scythian: 'Scythians', indian: 'India (Porus)', mauryan: 'Mauryan India',
  gallic: 'Gauls', germanic: 'Germans', slave: 'Slave army (Spartacus)', belgic: 'Belgae', briton: 'Britons', marian: 'Marian Romans',
  sullan: 'Sullan Romans', samnite: 'Samnites', sertorian: 'Sertorian army (Spain)', pompeian: 'Pompeians', caesarian: 'Caesarians',
  helvetii: 'Helvetii', numidian: 'Numidians', pontic: 'Pontic army (Mithridates)',
};

interface LookUse {
  blocks: Blocks;
  types: Set<UnitType>;
  commander: string;
  elites: { type: UnitType; elite: EliteId }[];
}

/** What each look fields across all scenarios: its block set, unit types, a commander's name and its elites. */
function lookUses(): Record<string, LookUse> {
  const out: Record<string, LookUse> = {};
  for (const sc of SCENARIOS) {
    for (const side of ['top', 'bottom'] as const) {
      const s = sc.setup[side];
      const u = (out[s.look] ??= { blocks: s.blocks, types: new Set(), commander: s.commander, elites: [] });
      for (const unit of sc.setup.units) {
        if (unit.side !== side) continue;
        u.types.add(unit.type);
        if (unit.elite && !u.elites.some((e) => e.elite === unit.elite)) u.elites.push({ type: unit.type, elite: unit.elite });
      }
    }
  }
  return out;
}
const USES = lookUses();
const blocksOf = (look: ArmyLook): Blocks => USES[look]?.blocks ?? 'grk';

/** Every elite preset with the look and unit type it belongs to. */
const ELITES: { elite: EliteId; look: ArmyLook; type: UnitType; label: string }[] = [
  { elite: 'carthSacredBand', look: 'carthaginian', type: 'HI', label: 'Carthaginian Sacred Band' },
  { elite: 'thebanSacredBand', look: 'theban', type: 'MI', label: 'Theban Sacred Band' },
  { elite: 'silverShields', look: 'eumenes', type: 'HI', label: 'Silver Shields' },
  { elite: 'immortals', look: 'persian', type: 'MI', label: 'Immortals' },
  { elite: 'bowAuxilia', look: 'mauryan', type: 'AX', label: 'Bow Auxilia' },
  { elite: 'companions', look: 'macedonian', type: 'MC', label: 'Companions' },
  { elite: 'tenthLegion', look: 'marian', type: 'HI', label: 'Tenth Legion' },
];

/** The leaders with their own figures (LEADER_LOOKS), next to their look's ordinary general. */
const NAMED_LEADERS: { name: string; look: ArmyLook; other: string }[] = [
  { name: 'Caesar', look: 'marian', other: 'Labienus' },
  { name: 'Spartacus', look: 'slave', other: 'Crixus' },
];

const GRASS = '#8fa25e';
const GRASS_EDGE = '#6f8446';

function Hex({ children, scale = 2, label, fill = GRASS }: { children: ReactNode; scale?: number; label?: string; fill?: string }) {
  const w = 92;
  const h = 104;
  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={w * scale} height={h * scale} viewBox={`${-w / 2} ${-h / 2} ${w} ${h}`} style={{ display: 'block' }}>
        <polygon points={hexPoints(0, 0, HEX_R)} fill={fill} stroke={GRASS_EDGE} strokeWidth={1.2} />
        <polygon points={hexPoints(0, 0, HEX_R - 3)} fill="none" stroke="#ffffff" strokeOpacity={0.12} strokeWidth={2} />
        {children}
      </svg>
      {label && <figcaption style={{ font: '600 13px "EB Garamond", Georgia, serif', color: '#3b2d1c', marginTop: 2, textAlign: 'center', maxWidth: w * scale }}>{label}</figcaption>}
    </figure>
  );
}

function Row({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <h2 style={{ font: '700 20px Cinzel, Georgia, serif', color: '#3b2a16', margin: '0 0 2px', letterSpacing: 1 }}>{title}</h2>
      {note && <p style={{ margin: '0 0 6px', fontSize: 15, color: '#5a4630' }}>{note}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 4px', alignItems: 'flex-end' }}>{children}</div>
    </section>
  );
}

/** A unit token at full strength unless `blocks` is given (UnitToken draws the elite's own figures and its standard). */
function Token({ type, look, blockColor, blocks, facing = 'right', elite, dimmed, edgeBlocks }: {
  type: UnitType; look: ArmyLook; blockColor: Blocks; blocks?: number; facing?: 'left' | 'right'; elite?: EliteId; dimmed?: boolean; edgeBlocks?: Blocks;
}) {
  return <UnitToken type={type} look={look} blockColor={blockColor} edgeBlocks={edgeBlocks} blocks={blocks ?? MAX[type]} maxBlocks={MAX[type]} facing={facing} elite={elite} dimmed={dimmed} />;
}

interface BoardUnit {
  r: number; c: number; type: UnitType; look: ArmyLook; blocks: number; facing: 'left' | 'right'; leader?: boolean; dimmed?: boolean;
  elite?: EliteId; edge?: Blocks; name?: string;
}

/** A small battle line at true board scale (1 SVG unit = 1 px) to judge readability. */
function BoardSample({ units, lone }: { units: BoardUnit[]; lone?: { r: number; c: number; look: ArmyLook; name: string; facing: 'left' | 'right' } }) {
  const art = (u: BoardUnit) => ({ look: u.look, blockColor: blocksOf(u.look) });
  const W = 7.5 * HEX_W + 20;
  const H = 2 * HEX_R * 1.5 + 2 * HEX_R + 20;
  const pos = (r: number, c: number) => ({ x: 10 + HEX_W / 2 + c * HEX_W + (r % 2 ? HEX_W / 2 : 0), y: 10 + HEX_R + r * HEX_R * 1.5 });
  const hexes: JSX.Element[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) {
    const { x, y } = pos(r, c);
    hexes.push(<polygon key={`${r}-${c}`} points={hexPoints(x, y)} fill={GRASS} stroke={GRASS_EDGE} strokeWidth={1} />);
  }
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ background: '#7d9052', borderRadius: 6 }}>
      {hexes}
      {units.map((u, k) => {
        const { x, y } = pos(u.r, u.c);
        return (
          <g key={k} transform={`translate(${x} ${y})`}>
            <Token type={u.type} {...art(u)} blocks={u.blocks} facing={u.facing} dimmed={u.dimmed} elite={u.elite} edgeBlocks={u.edge} />
            {u.leader && (
              <g transform={`translate(${LEADER_ATTACH_OFFSET.x} ${LEADER_ATTACH_OFFSET.y})`}>
                <LeaderToken {...art(u)} facing={u.facing} attached name={u.name} />
              </g>
            )}
          </g>
        );
      })}
      {lone && (
        <g transform={`translate(${pos(lone.r, lone.c).x} ${pos(lone.r, lone.c).y})`}>
          <LeaderToken look={lone.look} blockColor={blocksOf(lone.look)} facing={lone.facing} attached={false} name={lone.name} showName />
        </g>
      )}
    </svg>
  );
}

const BASE_BOARD: BoardUnit[] = [
  { r: 0, c: 0, type: 'LC', look: 'carthaginian', blocks: 3, facing: 'right' },
  { r: 0, c: 1, type: 'WA', look: 'carthaginian', blocks: 4, facing: 'right' },
  { r: 0, c: 2, type: 'HI', look: 'carthaginian', blocks: 4, facing: 'right', leader: true },
  { r: 0, c: 3, type: 'EL', look: 'carthaginian', blocks: 2, facing: 'right' },
  { r: 0, c: 4, type: 'MI', look: 'carthaginian', blocks: 3, facing: 'right', dimmed: true },
  { r: 0, c: 5, type: 'LS', look: 'carthaginian', blocks: 4, facing: 'right' },
  { r: 0, c: 6, type: 'HC', look: 'carthaginian', blocks: 2, facing: 'right' },
  { r: 1, c: 0, type: 'MC', look: 'roman', blocks: 3, facing: 'left' },
  { r: 1, c: 1, type: 'HI', look: 'roman', blocks: 4, facing: 'left', leader: true },
  { r: 1, c: 2, type: 'HI', look: 'roman', blocks: 2, facing: 'left' },
  { r: 1, c: 3, type: 'LI', look: 'roman', blocks: 4, facing: 'left' },
  { r: 1, c: 4, type: 'AX', look: 'roman', blocks: 4, facing: 'left' },
  { r: 1, c: 5, type: 'LB', look: 'roman', blocks: 1, facing: 'left' },
  { r: 2, c: 0, type: 'HI', look: 'syracusan', blocks: 4, facing: 'right' },
  { r: 2, c: 1, type: 'MI', look: 'syracusan', blocks: 4, facing: 'right' },
  { r: 2, c: 2, type: 'LC', look: 'syracusan', blocks: 3, facing: 'right', leader: true },
  { r: 2, c: 3, type: 'HCH', look: 'syracusan', blocks: 2, facing: 'right' },
  { r: 2, c: 4, type: 'WA', look: 'syracusan', blocks: 3, facing: 'right' },
  { r: 2, c: 5, type: 'LB', look: 'syracusan', blocks: 4, facing: 'right' },
  { r: 2, c: 6, type: 'AX', look: 'syracusan', blocks: 4, facing: 'right' },
];

/** Gaugamela-style line: Macedonians against Persians, and a Successor mirror battle (Paraitacene). */
const EXP_BOARD: BoardUnit[] = [
  { r: 0, c: 0, type: 'LB', look: 'persian', blocks: 4, facing: 'right' },
  { r: 0, c: 1, type: 'MI', look: 'persian', blocks: 4, facing: 'right', leader: true },
  { r: 0, c: 2, type: 'MI', look: 'persian', blocks: 4, facing: 'right', elite: 'immortals' },
  { r: 0, c: 3, type: 'AX', look: 'persian', blocks: 3, facing: 'right' },
  { r: 0, c: 4, type: 'LI', look: 'persian', blocks: 4, facing: 'right' },
  { r: 0, c: 5, type: 'LS', look: 'persian', blocks: 4, facing: 'right', dimmed: true },
  { r: 0, c: 6, type: 'LB', look: 'scythian', blocks: 4, facing: 'right' },
  { r: 1, c: 0, type: 'AX', look: 'macedonian', blocks: 4, facing: 'left' },
  { r: 1, c: 1, type: 'HI', look: 'macedonian', blocks: 4, facing: 'left', leader: true },
  { r: 1, c: 2, type: 'HI', look: 'macedonian', blocks: 3, facing: 'left' },
  { r: 1, c: 3, type: 'MI', look: 'macedonian', blocks: 4, facing: 'left' },
  { r: 1, c: 4, type: 'LI', look: 'macedonian', blocks: 4, facing: 'left' },
  { r: 1, c: 5, type: 'LB', look: 'macedonian', blocks: 2, facing: 'left' },
  { r: 2, c: 0, type: 'HI', look: 'eumenes', blocks: 4, facing: 'right', elite: 'silverShields' },
  { r: 2, c: 1, type: 'HI', look: 'eumenes', blocks: 4, facing: 'right' },
  { r: 2, c: 2, type: 'AX', look: 'eumenes', blocks: 4, facing: 'right' },
  { r: 2, c: 3, type: 'HI', look: 'antigonus', blocks: 4, facing: 'left', leader: true },
  { r: 2, c: 4, type: 'MI', look: 'antigonus', blocks: 4, facing: 'left' },
  { r: 2, c: 5, type: 'LB', look: 'indian', blocks: 4, facing: 'left' },
  { r: 2, c: 6, type: 'AX', look: 'mauryan', blocks: 4, facing: 'left', elite: 'bowAuxilia' },
];

/** Greek cities: Thebes against Sparta (Leuctra), Athens and Phocis. */
const GREEK_BOARD: BoardUnit[] = [
  { r: 0, c: 0, type: 'MC', look: 'spartan', blocks: 3, facing: 'right' },
  { r: 0, c: 1, type: 'HI', look: 'spartan', blocks: 4, facing: 'right', leader: true },
  { r: 0, c: 2, type: 'HI', look: 'spartan', blocks: 4, facing: 'right' },
  { r: 0, c: 3, type: 'MI', look: 'spartan', blocks: 4, facing: 'right' },
  { r: 0, c: 4, type: 'AX', look: 'spartan', blocks: 4, facing: 'right' },
  { r: 0, c: 5, type: 'LI', look: 'spartan', blocks: 4, facing: 'right' },
  { r: 0, c: 6, type: 'MI', look: 'phocian', blocks: 4, facing: 'right' },
  { r: 1, c: 0, type: 'MI', look: 'theban', blocks: 4, facing: 'left', elite: 'thebanSacredBand', leader: true },
  { r: 1, c: 1, type: 'HI', look: 'theban', blocks: 4, facing: 'left' },
  { r: 1, c: 2, type: 'MI', look: 'theban', blocks: 4, facing: 'left' },
  { r: 1, c: 3, type: 'AX', look: 'theban', blocks: 4, facing: 'left' },
  { r: 1, c: 4, type: 'LI', look: 'theban', blocks: 3, facing: 'left' },
  { r: 1, c: 5, type: 'HI', look: 'athenian', blocks: 4, facing: 'left' },
  { r: 2, c: 0, type: 'LB', look: 'athenian', blocks: 4, facing: 'right' },
  { r: 2, c: 1, type: 'HI', look: 'athenian', blocks: 4, facing: 'right', leader: true },
  { r: 2, c: 2, type: 'AX', look: 'athenian', blocks: 4, facing: 'right' },
  { r: 2, c: 3, type: 'MI', look: 'athenian', blocks: 4, facing: 'right' },
  { r: 2, c: 4, type: 'HI', look: 'phocian', blocks: 4, facing: 'right' },
  { r: 2, c: 5, type: 'AX', look: 'phocian', blocks: 4, facing: 'right' },
  { r: 2, c: 6, type: 'LI', look: 'phocian', blocks: 4, facing: 'right' },
];

/** Mounted and big units of Expansion #1: Gaugamela (Persians, Scythians, Macedonians), Magnesia (Seleucids), Hydaspes. */
const BIG_BOARD: BoardUnit[] = [
  { r: 0, c: 0, type: 'HCH', look: 'persian', blocks: 2, facing: 'right' },
  { r: 0, c: 1, type: 'LBC', look: 'persian', blocks: 3, facing: 'right' },
  { r: 0, c: 2, type: 'HC', look: 'persian', blocks: 3, facing: 'right', leader: true },
  { r: 0, c: 3, type: 'EL', look: 'persian', blocks: 2, facing: 'right' },
  { r: 0, c: 4, type: 'MC', look: 'persian', blocks: 3, facing: 'right' },
  { r: 0, c: 5, type: 'LBC', look: 'scythian', blocks: 3, facing: 'right' },
  { r: 0, c: 6, type: 'LC', look: 'persian', blocks: 2, facing: 'right' },
  { r: 1, c: 0, type: 'LC', look: 'macedonian', blocks: 3, facing: 'left' },
  { r: 1, c: 1, type: 'MC', look: 'macedonian', blocks: 3, facing: 'left', elite: 'companions', leader: true },
  { r: 1, c: 2, type: 'MC', look: 'macedonian', blocks: 3, facing: 'left' },
  { r: 1, c: 3, type: 'HC', look: 'macedonian', blocks: 3, facing: 'left' },
  { r: 1, c: 4, type: 'LBC', look: 'macedonian', blocks: 3, facing: 'left' },
  { r: 1, c: 5, type: 'HWM', look: 'macedonian', blocks: 2, facing: 'left' },
  { r: 2, c: 0, type: 'CAM', look: 'seleucid', blocks: 3, facing: 'right' },
  { r: 2, c: 1, type: 'HC', look: 'seleucid', blocks: 3, facing: 'right' },
  { r: 2, c: 2, type: 'EL', look: 'seleucid', blocks: 2, facing: 'right', leader: true },
  { r: 2, c: 3, type: 'HCH', look: 'seleucid', blocks: 1, facing: 'right' },
  { r: 2, c: 4, type: 'HWM', look: 'roman', blocks: 2, facing: 'left' },
  { r: 2, c: 5, type: 'EL', look: 'indian', blocks: 2, facing: 'left' },
  { r: 2, c: 6, type: 'HCH', look: 'indian', blocks: 2, facing: 'left' },
];

/** Expansion #2: Gauls, Germans and the Slave army against the Marian legions (Vercellae, Silarus, the Sabis). */
const EXP2_BOARD: BoardUnit[] = [
  { r: 0, c: 0, type: 'LC', look: 'gallic', blocks: 3, facing: 'right' },
  { r: 0, c: 1, type: 'WA', look: 'gallic', blocks: 4, facing: 'right', leader: true },
  { r: 0, c: 2, type: 'WA', look: 'germanic', blocks: 4, facing: 'right' },
  { r: 0, c: 3, type: 'AX', look: 'belgic', blocks: 3, facing: 'right' },
  { r: 0, c: 4, type: 'WA', look: 'briton', blocks: 4, facing: 'right' },
  { r: 0, c: 5, type: 'LI', look: 'gallic', blocks: 4, facing: 'right', dimmed: true },
  { r: 0, c: 6, type: 'MC', look: 'germanic', blocks: 3, facing: 'right' },
  { r: 1, c: 0, type: 'MC', look: 'marian', blocks: 3, facing: 'left' },
  { r: 1, c: 1, type: 'HI', look: 'marian', blocks: 4, facing: 'left', elite: 'tenthLegion', leader: true, name: 'Caesar' },
  { r: 1, c: 2, type: 'MI', look: 'marian', blocks: 4, facing: 'left' },
  { r: 1, c: 3, type: 'MI', look: 'marian', blocks: 2, facing: 'left' },
  { r: 1, c: 4, type: 'AX', look: 'marian', blocks: 4, facing: 'left' },
  { r: 1, c: 5, type: 'LB', look: 'marian', blocks: 3, facing: 'left' },
  { r: 2, c: 0, type: 'WA', look: 'slave', blocks: 4, facing: 'right', leader: true, name: 'Spartacus' },
  { r: 2, c: 1, type: 'MI', look: 'slave', blocks: 4, facing: 'right' },
  { r: 2, c: 2, type: 'AX', look: 'slave', blocks: 4, facing: 'right' },
  { r: 2, c: 3, type: 'LS', look: 'slave', blocks: 4, facing: 'right' },
  { r: 2, c: 4, type: 'MI', look: 'marian', blocks: 4, facing: 'left', edge: 'gry' },
  { r: 2, c: 5, type: 'LI', look: 'germanic', blocks: 4, facing: 'right' },
  { r: 2, c: 6, type: 'WA', look: 'marian', blocks: 4, facing: 'left' },
];

/** Expansion #2 horse, chariots and engines: Celtic and British chariots, the Barbarian and Marian cavalry, the ballista. */
const EXP2_MOUNTED_BOARD: BoardUnit[] = [
  { r: 0, c: 0, type: 'BCH', look: 'gallic', blocks: 3, facing: 'right' },
  { r: 0, c: 1, type: 'LC', look: 'gallic', blocks: 3, facing: 'right' },
  { r: 0, c: 2, type: 'MC', look: 'gallic', blocks: 3, facing: 'right', leader: true },
  { r: 0, c: 3, type: 'MC', look: 'belgic', blocks: 3, facing: 'right' },
  { r: 0, c: 4, type: 'BCH', look: 'briton', blocks: 3, facing: 'right' },
  { r: 0, c: 5, type: 'LC', look: 'briton', blocks: 3, facing: 'right' },
  { r: 0, c: 6, type: 'BCH', look: 'briton', blocks: 2, facing: 'right' },
  { r: 1, c: 0, type: 'LC', look: 'marian', blocks: 3, facing: 'left' },
  { r: 1, c: 1, type: 'MC', look: 'marian', blocks: 3, facing: 'left', leader: true, name: 'Caesar' },
  { r: 1, c: 2, type: 'HWM', look: 'marian', blocks: 2, facing: 'left' },
  { r: 1, c: 3, type: 'MC', look: 'roman', blocks: 3, facing: 'left' },
  { r: 1, c: 4, type: 'LC', look: 'roman', blocks: 3, facing: 'left' },
  { r: 1, c: 5, type: 'HWM', look: 'roman', blocks: 2, facing: 'left' },
  { r: 2, c: 0, type: 'LC', look: 'germanic', blocks: 3, facing: 'right' },
  { r: 2, c: 1, type: 'MC', look: 'germanic', blocks: 3, facing: 'right' },
  { r: 2, c: 2, type: 'LC', look: 'slave', blocks: 3, facing: 'right', leader: true, name: 'Spartacus' },
  { r: 2, c: 3, type: 'MC', look: 'slave', blocks: 3, facing: 'right' },
  { r: 2, c: 4, type: 'BCH', look: 'gallic', blocks: 1, facing: 'right' },
  { r: 2, c: 5, type: 'MC', look: 'marian', blocks: 2, facing: 'left' },
  { r: 2, c: 6, type: 'HWM', look: 'marian', blocks: 1, facing: 'left' },
];

/** Looks that field a type in their battles (gallery order). */
const fielding = (t: UnitType) => LOOK_ORDER.filter((look) => USES[look]?.types.has(t));

/** Block colours: the side-coloured base edge on the board, a standard and the captured-banner cloth. */
function BlockSwatches() {
  const sets: { blocks: Blocks; look: ArmyLook; name: string }[] = [
    { blocks: 'rom', look: 'roman', name: 'rom (Roman red)' },
    { blocks: 'car', look: 'carthaginian', name: 'car (Carthaginian purple)' },
    { blocks: 'grk', look: 'syracusan', name: 'grk (Greek blue)' },
    { blocks: 'eas', look: 'persian', name: 'eas (Eastern ochre-tan)' },
    { blocks: 'bar', look: 'gallic', name: 'bar (Barbarian green)' },
    { blocks: 'gry', look: 'marian', name: 'gry (grey Roman command)' },
  ];
  return (
    <>
      {sets.map(({ blocks, look, name }) => {
        const c = BLOCK_COLORS[blocks];
        const p = paletteFor(look, blocks);
        return (
          <figure key={blocks} style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg width={184} height={130} viewBox="-46 -26 92 65" style={{ display: 'block', background: GRASS, borderRadius: 4 }}>
              <BasePlate p={p} />
              <rect x={-40} y={-22} width={20} height={14} fill={c.banner} stroke="#1d140e" strokeWidth={0.7} />
              <rect x={-40} y={-22} width={5} height={14} fill={c.bannerShade} />
              <rect x={-14} y={-22} width={9} height={14} fill={c.cloth.main} stroke="#1d140e" strokeWidth={0.5} />
              <rect x={-5} y={-22} width={9} height={14} fill={c.cloth.light} stroke="#1d140e" strokeWidth={0.5} />
              <rect x={4} y={-22} width={9} height={14} fill={c.cloth.dark} stroke="#1d140e" strokeWidth={0.5} />
              <rect x={20} y={-22} width={6} height={14} fill={c.edgeShade} />
              <rect x={26} y={-22} width={7} height={14} fill={c.edge} />
              <rect x={33} y={-22} width={6} height={14} fill={c.edgeLight} />
            </svg>
            <figcaption style={{ font: '600 13px "EB Garamond", Georgia, serif', color: '#3b2d1c' }}>{name}</figcaption>
          </figure>
        );
      })}
      <svg width={(sets.length + 1) * HEX_W + 20} height={2 * HEX_R + 20} viewBox={`0 0 ${(sets.length + 1) * HEX_W + 20} ${2 * HEX_R + 20}`} style={{ background: '#7d9052', borderRadius: 6 }}>
        {sets.map(({ blocks, look }, k) => {
          const x = 10 + HEX_W / 2 + k * HEX_W;
          const y = 10 + HEX_R;
          return (
            <g key={blocks}>
              <polygon points={hexPoints(x, y)} fill={GRASS} stroke={GRASS_EDGE} strokeWidth={1} />
              <g transform={`translate(${x} ${y})`}>
                <Token type={k % 2 ? 'MI' : 'HI'} look={look} blockColor={blocks} facing={k % 2 ? 'left' : 'right'} />
              </g>
            </g>
          );
        })}
        {/* 210: one of Lentulus' legions (grey command) in the red Roman army */}
        <g>
          <polygon points={hexPoints(10 + HEX_W / 2 + sets.length * HEX_W, 10 + HEX_R)} fill={GRASS} stroke={GRASS_EDGE} strokeWidth={1} />
          <g transform={`translate(${10 + HEX_W / 2 + sets.length * HEX_W} ${10 + HEX_R})`}>
            <UnitToken type="MI" look="marian" blockColor="rom" edgeBlocks="gry" blocks={4} maxBlocks={4} facing="left" />
          </g>
        </g>
      </svg>
    </>
  );
}

/** Close-up view for inspecting individual figures. */
function Detail() {
  const parts = window.location.hash.split('/');
  const list = (parts[5] ?? 'HI,MI,AX,WA,LB,LS,LI,LC,MC,HC,EL,HCH').split(',') as UnitType[];
  const name = parts[4] || 'rome';
  const art = (ART as Record<string, { look: ArmyLook; blockColor: Blocks }>)[name]
    ?? (name in LOOKS ? { look: name as ArmyLook, blockColor: blocksOf(name as ArmyLook) } : ART.rome);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 10, background: '#e3d3ad' }}>
      {list.map((t) => (
        <Hex key={t} scale={4.2} label={t}>
          <Token type={t} {...art} />
          {t === 'HI' && (
            <g transform={`translate(${LEADER_ATTACH_OFFSET.x} ${LEADER_ATTACH_OFFSET.y})`}>
              <LeaderToken {...art} facing="right" attached />
            </g>
          )}
        </Hex>
      ))}
      <Hex scale={4.2} label="leader">
        <LeaderToken {...art} facing="right" attached={false} name={USES[art.look]?.commander ?? 'Scipio'} showName />
      </Hex>
      {ARMY_NAMES.map((lf) => (
        <svg key={lf} width={220} height={220} viewBox="-14 -14 28 28" style={{ background: GRASS }}>
          <LeaderToken {...ART[lf]} facing={lf === 'carthage' ? 'left' : 'right'} attached />
        </svg>
      ))}
    </div>
  );
}

/** Width and viewBox of a single figure by kind: foot, mounted, and the wider chariots and war machines. */
const FIGURE_VIEW: Record<ReturnType<typeof figureKind>, [number, string]> = {
  foot: [220, '-16 -46 34 47'], horse: [330, '-26 -50 52 52'], camel: [330, '-26 -50 52 52'], elephant: [330, '-26 -50 52 52'],
  chariot: [370, '-30 -50 62 52'], machine: [370, '-34 -46 62 47'],
};

/** Single figures (i = 0..3) much enlarged: #/gallery/art/figures/<look>/<TYPE,TYPE..>[/<elite>]. */
function Figures() {
  const parts = window.location.hash.split('/');
  const look = (parts[4] && parts[4] in LOOKS ? parts[4] : 'roman') as ArmyLook;
  const list = (parts[5] ?? 'WA,AX,MI,HI').split(',') as UnitType[];
  const elite = (parts[6] || undefined) as EliteId | undefined;
  const p = paletteFor(look, blocksOf(look));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, background: '#e3d3ad' }}>
      {list.map((t) => (
        <div key={t} style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          <span style={{ font: '700 18px Cinzel, serif', width: 50 }}>{t}</span>
          {[0, 1, 2, 3].map((i) => (
            <svg key={i} width={FIGURE_VIEW[figureKind(t)][0]} height={300} viewBox={FIGURE_VIEW[figureKind(t)][1]} style={{ background: GRASS, borderRadius: 4 }}>
              <FacingRightCtx.Provider value>
                <Miniature type={t} p={p} i={i} elite={elite} />
              </FacingRightCtx.Provider>
            </svg>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Measured extents of figure i = 2 (as UnitIcon draws it) per type: the union over the looks named in the route and each
 * look's own, as `[top, bottom, left, right]` (getBBox, so without stroke widths; icon boxes add about 1 unit of margin).
 */
function Boxes() {
  const parts = window.location.hash.split('/');
  const looks = (parts[4] ?? 'roman').split(',').filter((l) => l in LOOKS) as ArmyLook[];
  const types = (parts[5] ?? 'HCH,BCH,HWM').split(',') as UnitType[];
  const ref = useRef<HTMLDivElement>(null);
  const [out, setOut] = useState('measuring');
  useEffect(() => {
    const r1 = (n: number) => Math.round(n * 10) / 10;
    const res: Record<string, Record<string, number[]>> = {};
    ref.current?.querySelectorAll<SVGGElement>('g[data-box]').forEach((g) => {
      const [look, type] = (g.dataset.box ?? '').split('/');
      const b = g.getBBox();
      const box = [b.y, b.y + b.height, b.x, b.x + b.width];
      const u = (res[type] ??= { union: box });
      u[look] = box.map(r1);
      u.union = [Math.min(u.union[0], box[0]), Math.max(u.union[1], box[1]), Math.min(u.union[2], box[2]), Math.max(u.union[3], box[3])];
    });
    for (const t of Object.keys(res)) res[t].union = res[t].union.map(r1);
    setOut(JSON.stringify(res));
  }, []);
  return (
    <div ref={ref}>
      <pre id="boxes">{out}</pre>
      {looks.flatMap((look) => types.map((t) => (
        <svg key={`${look}${t}`} width={200} height={200} viewBox="-50 -60 100 70">
          <FacingRightCtx.Provider value>
            <g data-box={`${look}/${t}`}><Miniature type={t} p={paletteFor(look, blocksOf(look))} i={2} /></g>
          </FacingRightCtx.Provider>
        </svg>
      )))}
    </div>
  );
}

/** War-machine crewmen per kit (the HWM figure of the war-machine art puts them beside the engine). */
function CrewRow() {
  const looks: ArmyLook[] = ['roman', 'carthaginian', 'syracusan', 'macedonian', 'persian', 'scythian', 'indian', 'marian', 'gallic', 'germanic'];
  return (
    <>
      {looks.map((look) => {
        const p = paletteFor(look, blocksOf(look));
        return (
          <Hex key={look} scale={1.6} label={`${LOOK_LABEL[look]} crew`}>
            <BasePlate p={p} />
            <FacingRightCtx.Provider value>
              {(['crank', 'load', 'aim'] as const).map((pose, k) => (
                <g key={pose} transform={`translate(${-20 + k * 18} ${12 + (k % 2) * 4}) scale(1.2)`}>{crewFigure(p, k, pose)}</g>
              ))}
            </FacingRightCtx.Provider>
          </Hex>
        );
      })}
    </>
  );
}

const EXP2_LOOKS: ArmyLook[] = ['gallic', 'belgic', 'briton', 'germanic', 'slave', 'marian'];

/** A look's row: every type it fields, its elites, its leader alone and attached. */
function LookRow({ look }: { look: ArmyLook }) {
  const use = USES[look];
  const art = { look, blockColor: blocksOf(look) };
  const fielded = TYPES.filter((t) => use?.types.has(t));
  return (
    <Row title={`${LOOK_LABEL[look]} — ${LOOKS[look].kit} kit, ${art.blockColor} blocks`} note={`The unit types this army fields in its battles${use?.elites.length ? '; elites at the end' : ''}.`}>
      {fielded.map((t) => (
        <Hex key={t} scale={1.5} label={unitTypeName(t)}>
          <Token type={t} {...art} />
        </Hex>
      ))}
      {use?.elites.map((e) => (
        <Hex key={e.elite} scale={1.5} label={`${e.elite} (${e.type})`}>
          <Token type={e.type} {...art} elite={e.elite} />
        </Hex>
      ))}
      <Hex scale={1.5} label="Leader">
        <LeaderToken {...art} facing="right" attached={false} name={use?.commander ?? 'General'} showName />
      </Hex>
      <Hex scale={1.5} label="Attached">
        <Token type={fielded.includes('HI') ? 'HI' : fielded[0] ?? 'HI'} {...art} />
        <g transform={`translate(${LEADER_ATTACH_OFFSET.x} ${LEADER_ATTACH_OFFSET.y})`}>
          <LeaderToken {...art} facing="right" attached />
        </g>
      </Hex>
    </Row>
  );
}

/** Units of every Expansion #2 look as icons (UnitIcon at 64 and 32). */
function IconRows({ looks }: { looks: ArmyLook[] }) {
  return (
    <>
      {looks.map((look) => (
        <div key={look} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, width: '100%' }}>
          {TYPES.map((t) => (
            <div key={t} style={{ background: '#2a2016', borderRadius: 8, padding: 4, textAlign: 'center' }}>
              <svg width={72} height={72} viewBox="-36 -36 72 72" style={{ display: 'block' }}>
                <circle r={34} fill="#f1e4c4" />
                <UnitIcon type={t} look={look} blockColor={blocksOf(look)} size={64} />
              </svg>
              <svg width={36} height={36} viewBox="-18 -18 36 36" style={{ display: 'block', margin: '2px auto 0' }}>
                <UnitIcon type={t} look={look} blockColor={blocksOf(look)} size={32} />
              </svg>
              <div style={{ color: '#f1e4c4', font: '700 11px Cinzel, serif' }}>{t}</div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

/** The leaders with their own figure (LEADER_LOOKS, matched by name) next to an ordinary general of their look, alone and attached. */
function NamedLeaders({ scale }: { scale: number }) {
  return (
    <Row title="Named leaders" note="Caesar (laurel wreath, scarlet cloak, white horse) and Spartacus (Thracian helmet, sica), each beside an ordinary general of his look.">
      {NAMED_LEADERS.flatMap(({ name, look, other }) => {
        const art = { look, blockColor: blocksOf(look) };
        return [name, other].map((n) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Hex scale={scale} label={`${n} (${LOOK_LABEL[look]})`}>
              <LeaderToken {...art} facing="right" attached={false} name={n} showName />
            </Hex>
            <svg width={scale * 60} height={scale * 60} viewBox="-14 -14 28 28" style={{ background: GRASS, borderRadius: 4 }}>
              <LeaderToken {...art} facing="right" attached name={n} />
            </svg>
          </div>
        ));
      })}
    </Row>
  );
}

/** The Expansion #2 art only: #/gallery/art/exp2. */
function Exp2Gallery() {
  return (
    <div style={{ minHeight: '100vh', padding: '22px 26px 60px', background: '#e3d3ad', fontFamily: '"EB Garamond", Georgia, serif', color: '#2b2014' }}>
      <h1 style={{ font: '700 30px Cinzel, Georgia, serif', margin: '0 0 12px', letterSpacing: 2 }}>Rome &amp; the Barbarians</h1>
      <Row title="At board scale (1×)" note="Second board: chariots, cavalry and war machines (the base-game Roman LC, MC and HWM in the middle row for comparison).">
        <BoardSample units={EXP2_BOARD} lone={{ r: 1, c: 6, look: 'marian', name: 'Caesar', facing: 'left' }} />
        <BoardSample units={EXP2_MOUNTED_BOARD} lone={{ r: 1, c: 6, look: 'gallic', name: 'Vercingetorix', facing: 'left' }} />
      </Row>
      <Row title="Block colours" note="The Barbarian green and the grey Roman command (edgeBlocks) beside the other sets.">
        <BlockSwatches />
      </Row>
      {EXP2_LOOKS.map((look) => <LookRow key={look} look={look} />)}
      <Row title="Tenth Legion" note="Marian HI and the Tenth Legion elite (crimson gold-rimmed scuta with the bull, white plumes, greaves, the eagle marker).">
        <Hex label="Marian HI"><Token type="HI" look="marian" blockColor="rom" /></Hex>
        <Hex label="Tenth Legion"><Token type="HI" look="marian" blockColor="rom" elite="tenthLegion" /></Hex>
        <Hex label="Tenth Legion 2/4, left"><Token type="HI" look="marian" blockColor="rom" elite="tenthLegion" blocks={2} facing="left" /></Hex>
      </Row>
      <NamedLeaders scale={2} />
      <Row title="Unit icons (UnitIcon, size 64 and 32)">
        <IconRows looks={EXP2_LOOKS} />
      </Row>
    </div>
  );
}

export default function ArtGallery() {
  if (window.location.hash.startsWith('#/gallery/art/detail')) return <Detail />;
  if (window.location.hash.startsWith('#/gallery/art/figures')) return <Figures />;
  if (window.location.hash.startsWith('#/gallery/art/boxes')) return <Boxes />;
  if (window.location.hash.startsWith('#/gallery/art/exp2')) return <Exp2Gallery />;
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '22px 26px 60px',
        background: 'radial-gradient(ellipse at 30% 0%, #efe3c4 0%, #e3d3ad 55%, #d4c095 100%)',
        fontFamily: '"EB Garamond", Georgia, serif',
        color: '#2b2014',
      }}
    >
      <h1 style={{ font: '700 30px Cinzel, Georgia, serif', margin: '0 0 4px', letterSpacing: 2 }}>Miniatures</h1>
      <p style={{ margin: '0 0 20px', fontSize: 17 }}>
        Illustrated painted-miniature unit art · hexes shown at 2× board scale unless noted · close-ups: #/gallery/art/detail/&lt;look&gt;,
        #/gallery/art/figures/&lt;look&gt; · Expansion #2 only: #/gallery/art/exp2
      </p>

      <Row title="At board scale (1×)">
        <BoardSample units={BASE_BOARD} lone={{ r: 1, c: 6, look: 'roman', name: 'Scipio', facing: 'left' }} />
        <BoardSample units={EXP_BOARD} lone={{ r: 1, c: 6, look: 'macedonian', name: 'Alexander', facing: 'left' }} />
        <BoardSample units={GREEK_BOARD} lone={{ r: 1, c: 6, look: 'theban', name: 'Epaminondas', facing: 'left' }} />
        <BoardSample units={BIG_BOARD} lone={{ r: 1, c: 6, look: 'macedonian', name: 'Alexander', facing: 'left' }} />
        <BoardSample units={EXP2_BOARD} lone={{ r: 1, c: 6, look: 'marian', name: 'Caesar', facing: 'left' }} />
        <BoardSample units={EXP2_MOUNTED_BOARD} lone={{ r: 1, c: 6, look: 'gallic', name: 'Vercingetorix', facing: 'left' }} />
      </Row>

      <Row title="Block colours" note="Base edge, standard and captured-banner cloth of each block set, and on the board; last: a unit of a grey command in a red army (edgeBlocks, 210 Lentulus).">
        <BlockSwatches />
      </Row>

      {LOOK_ORDER.map((look) => <LookRow key={look} look={look} />)}

      <Row title="Elites" note="Each elite next to its army's ordinary unit.">
        {ELITES.flatMap(({ elite, look, type, label }) => {
          const art = { look, blockColor: blocksOf(look) };
          return [
            <Hex key={`${elite}-n`} label={`${LOOK_LABEL[look]} ${type}`}><Token type={type} {...art} /></Hex>,
            <Hex key={elite} label={label}><Token type={type} {...art} elite={elite} /></Hex>,
          ];
        })}
      </Row>

      <Row title="Cavalry by kit" note="LC (javelins), LBC (drawn bow and gorytos), MC and HC of each Expansion #1 kit; the Companions next to an ordinary Macedonian MC; Seleucid cataphracts; Roman HC (Pydna).">
        {(['macedonian', 'persian', 'scythian', 'indian'] as ArmyLook[]).flatMap((look) =>
          (['LC', 'LBC', 'MC', 'HC'] as UnitType[]).map((t) => (
            <Hex key={`${look}${t}`} scale={1.5} label={`${LOOK_LABEL[look]} ${t}`}><Token type={t} look={look} blockColor={blocksOf(look)} /></Hex>
          )))}
        <Hex scale={1.5} label="Macedon MC"><Token type="MC" look="macedonian" blockColor="grk" /></Hex>
        <Hex scale={1.5} label="Companions (MC)"><Token type="MC" look="macedonian" blockColor="grk" elite="companions" /></Hex>
        <Hex scale={1.5} label="Seleucid HC (cataphracts)"><Token type="HC" look="seleucid" blockColor="eas" /></Hex>
        <Hex scale={1.5} label="Seleucid LBC"><Token type="LBC" look="seleucid" blockColor="eas" /></Hex>
        <Hex scale={1.5} label="Seleucid LC"><Token type="LC" look="seleucid" blockColor="eas" /></Hex>
        <Hex scale={1.5} label="Roman HC"><Token type="HC" look="roman" blockColor="rom" /></Hex>
      </Row>

      <Row title="Elephants" note="Every army that fields elephants: Indian howdahs, Successor towers (Seleucid armoured headpiece, Ptolemaic forest elephants), Rome's captured elephants, Carthage.">
        {fielding('EL').map((look) => (
          <Hex key={look} scale={1.5} label={LOOK_LABEL[look]}><Token type="EL" look={look} blockColor={blocksOf(look)} /></Hex>
        ))}
      </Row>

      <Row title="Chariots, camels, war machines" note="Scythed four-horse chariots (Persia, Seleucids), the big Indian chariot, the base-game chariot; the Celtic and British light chariots (BCH); Arab camel archers (Magnesia); bolt-throwers (Jaxartes, Beneventum) and the Marian ballista.">
        {fielding('HCH').map((look) => (
          <Hex key={look} scale={1.5} label={`${LOOK_LABEL[look]} HCH`}><Token type="HCH" look={look} blockColor={blocksOf(look)} /></Hex>
        ))}
        {fielding('BCH').map((look) => (
          <Hex key={`b${look}`} scale={1.5} label={`${LOOK_LABEL[look]} BCH`}><Token type="BCH" look={look} blockColor={blocksOf(look)} /></Hex>
        ))}
        <Hex scale={1.5} label="BCH 2/3, left"><Token type="BCH" look="briton" blockColor="bar" blocks={2} facing="left" /></Hex>
        <Hex scale={1.5} label="BCH 1/3"><Token type="BCH" look="gallic" blockColor="bar" blocks={1} /></Hex>
        {fielding('CAM').map((look) => (
          <Hex key={`c${look}`} scale={1.5} label={`${LOOK_LABEL[look]} CAM`}><Token type="CAM" look={look} blockColor={blocksOf(look)} /></Hex>
        ))}
        {fielding('HWM').map((look) => (
          <Hex key={`w${look}`} scale={1.5} label={`${LOOK_LABEL[look]} HWM`}><Token type="HWM" look={look} blockColor={blocksOf(look)} /></Hex>
        ))}
        <Hex scale={1.5} label="CAM 1/3"><Token type="CAM" look="seleucid" blockColor="eas" blocks={1} /></Hex>
        <Hex scale={1.5} label="HWM 1/2, left"><Token type="HWM" look="roman" blockColor="rom" blocks={1} facing="left" /></Hex>
      </Row>

      <Row title="Every kit, every type" note="One look per kit with all sixteen unit types (also the types its armies never field: a kit without its own light chariot mans the BCH with its light infantryman and a crewman).">
        {(['syracusan', 'macedonian', 'persian', 'scythian', 'indian', 'gallic', 'germanic', 'marian'] as ArmyLook[]).map((look) => (
          <div key={look} style={{ display: 'flex', flexWrap: 'wrap', gap: 4, width: '100%' }}>
            {TYPES.map((t) => (
              <Hex key={t} scale={1.2} label={`${look} ${t}`}>
                <Token type={t} look={look} blockColor={blocksOf(look)} />
              </Hex>
            ))}
          </div>
        ))}
      </Row>

      <Row title="War-machine crews" note="crewFigure(palette, i, pose) per kit: crank, load, aim.">
        <CrewRow />
      </Row>

      <NamedLeaders scale={1.6} />

      <Row title="Leaders of every look" note="Alone (mounted general with the army's standard) and attached (portrait medallion).">
        {LOOK_ORDER.map((look) => {
          const art = { look, blockColor: blocksOf(look) };
          return (
            <div key={look} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Hex scale={1.3} label={LOOK_LABEL[look]}>
                <LeaderToken {...art} facing={look === 'carthaginian' ? 'left' : 'right'} attached={false} name={USES[look]?.commander ?? 'General'} showName />
              </Hex>
              <svg width={70} height={70} viewBox="-14 -14 28 28" style={{ background: GRASS, borderRadius: 4 }}>
                <LeaderToken {...art} facing="right" attached />
              </svg>
            </div>
          );
        })}
      </Row>

      {ARMY_NAMES.map((fac) => (
        <Row key={fac} title={`${ARMY_LABEL[fac]} — full strength (base game)`}>
          {BASE_TYPES.map((t) => (
            <Hex key={t} label={unitTypeName(t)}>
              <Token type={t} {...ART[fac]} />
            </Hex>
          ))}
        </Row>
      ))}

      <Row title="Depleted units">
        {(['HI', 'WA', 'LB'] as UnitType[]).flatMap((t) =>
          [3, 2, 1].map((b) => (
            <Hex key={`${t}${b}`} label={`${t} ${b}/4`}>
              <Token type={t} {...ART[t === 'HI' ? 'rome' : t === 'WA' ? 'carthage' : 'syracuse']} blocks={b} />
            </Hex>
          )),
        )}
        {(['HI', 'MI'] as UnitType[]).flatMap((t) =>
          [3, 1].map((b) => (
            <Hex key={`m${t}${b}`} label={`Macedonian ${t} ${b}/4`}>
              <Token type={t} look="macedonian" blockColor="grk" blocks={b} />
            </Hex>
          )),
        )}
        {(['MC', 'HC'] as UnitType[]).flatMap((t) =>
          [2, 1].map((b) => (
            <Hex key={`${t}${b}`} label={`${t} ${b}/3`}>
              <Token type={t} {...ART[t === 'MC' ? 'rome' : 'syracuse']} blocks={b} />
            </Hex>
          )),
        )}
        <Hex label="EL 1/2"><Token type="EL" {...ART.carthage} blocks={1} /></Hex>
        <Hex label="HCH 1/2"><Token type="HCH" {...ART.carthage} blocks={1} /></Hex>
      </Row>

      <Row title="Facing left">
        {BASE_TYPES.map((t, k) => (
          <Hex key={t} label={`${t} (${ARMY_LABEL[ARMY_NAMES[k % 3]]})`}>
            <Token type={t} {...ART[ARMY_NAMES[k % 3]]} facing="left" />
          </Hex>
        ))}
        {FOOT_TYPES.map((t, k) => {
          const look = (['macedonian', 'persian', 'scythian', 'indian'] as ArmyLook[])[k % 4];
          return (
            <Hex key={`n${t}`} label={`${t} (${look})`}>
              <Token type={t} look={look} blockColor={blocksOf(look)} facing="left" />
            </Hex>
          );
        })}
      </Row>

      <Row title="Base-game leaders, Sacred Band, dimmed">
        {ARMY_NAMES.map((fac) => (
          <Hex key={`a${fac}`} label={`${ARMY_LABEL[fac]} leader attached`}>
            <Token type={fac === 'syracuse' ? 'HI' : fac === 'rome' ? 'MI' : 'MC'} {...ART[fac]} blocks={fac === 'carthage' ? 3 : 4} />
            <g transform={`translate(${LEADER_ATTACH_OFFSET.x} ${LEADER_ATTACH_OFFSET.y})`}>
              <LeaderToken {...ART[fac]} facing="right" attached name="Hannibal" />
            </g>
          </Hex>
        ))}
        {ARMY_NAMES.map((fac) => (
          <Hex key={`l${fac}`} label={`${ARMY_LABEL[fac]} leader alone`}>
            <LeaderToken {...ART[fac]} facing={fac === 'carthage' ? 'left' : 'right'} attached={false} name={fac === 'rome' ? 'Scipio' : fac === 'carthage' ? 'Hannibal' : 'Timoleon'} showName />
          </Hex>
        ))}
        <Hex label="Sacred Band 2/4, left">
          <Token type="HI" {...ART.carthage} blocks={2} facing="left" elite="carthSacredBand" />
        </Hex>
        <Hex label="Dimmed (acted)">
          <Token type="HI" {...ART.rome} dimmed />
        </Hex>
        <Hex label="Dimmed MC">
          <Token type="MC" {...ART.syracuse} dimmed />
        </Hex>
      </Row>

      <Row title="Unit icons (UnitIcon, size 64 and 32)">
        <IconRows looks={['roman', 'carthaginian', 'syracusan', 'macedonian', 'persian', 'scythian', 'indian', ...EXP2_LOOKS]} />
      </Row>
    </div>
  );
}
