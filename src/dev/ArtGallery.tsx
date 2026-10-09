// Dev gallery for the miniature art: http://localhost:5173/#/gallery/art
// Close-up route: #/gallery/art/detail/<look|rome|carthage|syracuse>[/TYPE,TYPE..]
import type { ReactNode } from 'react';
import type { ArmyLook, Blocks, EliteId, UnitType } from '../engine/types';
import { hexPoints, HEX_W, HEX_R } from '../ui/geometry';
import { BLOCK_COLORS, LEADER_ATTACH_OFFSET, LOOKS, LeaderToken, UnitIcon, UnitToken, paletteFor, unitTypeName } from '../art';
import { EliteCtx, crewFigure } from '../art/foot';
import { FacingRightCtx } from '../art/parts';
import { BasePlate } from '../art/token';
import { SCENARIOS } from '../scenarios';

const TYPES: UnitType[] = ['LI', 'LB', 'LS', 'AX', 'WA', 'MI', 'HI', 'LC', 'LBC', 'MC', 'HC', 'CAM', 'EL', 'HCH', 'HWM'];
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
  LI: 4, LB: 4, LS: 4, AX: 4, WA: 4, MI: 4, HI: 4, LC: 3, MC: 3, HC: 3, EL: 2, HCH: 2, LBC: 3, CAM: 3, HWM: 2,
};
const ARMY_LABEL: Record<ArmyName, string> = { rome: 'Rome', carthage: 'Carthage', syracuse: 'Syracuse' };

/** Gallery order of the looks: base game, Greek cities, Macedon and the Successors, the Eastern kingdoms. */
const LOOK_ORDER: ArmyLook[] = [
  'roman', 'carthaginian', 'syracusan',
  'athenian', 'theban', 'spartan', 'phocian',
  'macedonian', 'antigonid', 'epirote', 'craterus', 'eumenes', 'antigonus', 'seleucid', 'ptolemaic',
  'persian', 'scythian', 'indian', 'mauryan',
];
const LOOK_LABEL: Record<ArmyLook, string> = {
  roman: 'Rome', carthaginian: 'Carthage', syracusan: 'Syracuse', athenian: 'Athens', theban: 'Thebes', spartan: 'Sparta',
  phocian: 'Phocis', macedonian: 'Macedon (Philip II, Alexander)', antigonid: 'Antigonid Macedon (Philip V, Perseus)',
  epirote: 'Epirus (Pyrrhus)', craterus: "Craterus' Successors", eumenes: "Eumenes' Successors", antigonus: "Antigonus' Successors",
  seleucid: 'Seleucids', ptolemaic: 'Ptolemies', persian: 'Persia', scythian: 'Scythians', indian: 'India (Porus)', mauryan: 'Mauryan India',
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

/** A unit token, with its elite applied to the figures too (UnitToken itself only draws the elite standard). */
function Token({ type, look, blockColor, blocks, facing = 'right', elite, dimmed }: {
  type: UnitType; look: ArmyLook; blockColor: Blocks; blocks?: number; facing?: 'left' | 'right'; elite?: EliteId; dimmed?: boolean;
}) {
  const tok = <UnitToken type={type} look={look} blockColor={blockColor} blocks={blocks ?? MAX[type]} maxBlocks={MAX[type]} facing={facing} elite={elite} dimmed={dimmed} />;
  return elite ? <EliteCtx.Provider value={elite}>{tok}</EliteCtx.Provider> : tok;
}

interface BoardUnit { r: number; c: number; type: UnitType; look: ArmyLook; blocks: number; facing: 'left' | 'right'; leader?: boolean; dimmed?: boolean; elite?: EliteId }

/** A small battle line at true board scale (1 SVG unit = 1 px) to judge readability. */
function BoardSample({ units, lone }: { units: BoardUnit[]; lone?: { r: number; c: number; look: ArmyLook; name: string; facing: 'left' | 'right' } }) {
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
        const art = { look: u.look, blockColor: blocksOf(u.look) };
        return (
          <g key={k} transform={`translate(${x} ${y})`}>
            <Token type={u.type} {...art} blocks={u.blocks} facing={u.facing} dimmed={u.dimmed} elite={u.elite} />
            {u.leader && (
              <g transform={`translate(${LEADER_ATTACH_OFFSET.x} ${LEADER_ATTACH_OFFSET.y})`}>
                <LeaderToken {...art} facing={u.facing} attached />
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

/** Block colours: the side-coloured base edge on the board, a standard and the captured-banner cloth. */
function BlockSwatches() {
  const sets: { blocks: Blocks; look: ArmyLook; name: string }[] = [
    { blocks: 'rom', look: 'roman', name: 'rom (Roman red)' },
    { blocks: 'car', look: 'carthaginian', name: 'car (Carthaginian purple)' },
    { blocks: 'grk', look: 'syracusan', name: 'grk (Greek blue)' },
    { blocks: 'eas', look: 'persian', name: 'eas (Eastern ochre-tan)' },
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
      <svg width={4 * HEX_W + 20} height={2 * HEX_R + 20} viewBox={`0 0 ${4 * HEX_W + 20} ${2 * HEX_R + 20}`} style={{ background: '#7d9052', borderRadius: 6 }}>
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

/** War-machine crewmen per kit (the HWM figure of the war-machine art puts them beside the engine). */
function CrewRow() {
  const looks: ArmyLook[] = ['roman', 'carthaginian', 'syracusan', 'macedonian', 'persian', 'scythian', 'indian'];
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

export default function ArtGallery() {
  if (window.location.hash.startsWith('#/gallery/art/detail')) return <Detail />;
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
        Illustrated painted-miniature unit art · hexes shown at 2× board scale unless noted · close-ups: #/gallery/art/detail/&lt;look&gt;
      </p>

      <Row title="At board scale (1×)">
        <BoardSample units={BASE_BOARD} lone={{ r: 1, c: 6, look: 'roman', name: 'Scipio', facing: 'left' }} />
        <BoardSample units={EXP_BOARD} lone={{ r: 1, c: 6, look: 'macedonian', name: 'Alexander', facing: 'left' }} />
        <BoardSample units={GREEK_BOARD} lone={{ r: 1, c: 6, look: 'theban', name: 'Epaminondas', facing: 'left' }} />
      </Row>

      <Row title="Block colours" note="Base edge, standard and captured-banner cloth of each block set, and on the board.">
        <BlockSwatches />
      </Row>

      {LOOK_ORDER.map((look) => {
        const use = USES[look];
        const art = { look, blockColor: blocksOf(look) };
        const fielded = TYPES.filter((t) => use?.types.has(t));
        return (
          <Row key={look} title={`${LOOK_LABEL[look]} — ${LOOKS[look].kit} kit, ${art.blockColor} blocks`} note={`The unit types this army fields in its battles${use?.elites.length ? '; elites at the end' : ''}.`}>
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
      })}

      <Row title="Elites" note="Each elite next to its army's ordinary unit (Companions are mounted: drawn with the cavalry art).">
        {ELITES.flatMap(({ elite, look, type, label }) => {
          const art = { look, blockColor: blocksOf(look) };
          return [
            <Hex key={`${elite}-n`} label={`${LOOK_LABEL[look]} ${type}`}><Token type={type} {...art} /></Hex>,
            <Hex key={elite} label={label}><Token type={type} {...art} elite={elite} /></Hex>,
          ];
        })}
      </Row>

      <Row title="Every kit, every type" note="One look per kit with all fifteen unit types (also the types its armies never field).">
        {(['syracusan', 'macedonian', 'persian', 'scythian', 'indian'] as ArmyLook[]).map((look) => (
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
        {(['roman', 'carthaginian', 'syracusan', 'macedonian', 'persian', 'scythian', 'indian'] as ArmyLook[]).map((look) => (
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
      </Row>
    </div>
  );
}
