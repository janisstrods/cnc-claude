// Heavy chariot: two-horse team, spoked wheel, driver and warrior. Facing right, ground at y = 0.
import { darken, lighten } from './color';
import type { Palette } from './palettes';
import { Arm, Body, Head, Hi, Line2, OL, Paint, Shape, Shield, Spear, makeFig } from './parts';
import { Horse } from './mounted';

export function ChariotFigure({ p, i }: { p: Palette; i: number }) {
  const h1 = p.horses[(i + 1) % p.horses.length];
  const h2 = p.horses[(i + 2) % p.horses.length];
  const driver = makeFig(p, i + 1);
  const warrior = makeFig(p, i + 2);
  const helmet = p.faction === 'syracuse' ? 'corinthian' : p.faction === 'carthage' ? 'attic' : 'montefortino';
  const crest = p.faction === 'rome' ? 'plumes' : p.faction === 'syracuse' ? 'tall' : 'horsehair';
  const wx = -13;
  const wy = -6.8;
  const wr = 6.6;
  const spokes = [0, 30, 60, 90, 120, 150].map((a) => {
    const r = (a * Math.PI) / 180;
    const dx = Math.cos(r) * wr;
    const dy = Math.sin(r) * wr;
    return `M${(wx - dx).toFixed(2)} ${(wy - dy).toFixed(2)} L${(wx + dx).toFixed(2)} ${(wy + dy).toFixed(2)}`;
  });
  return (
    <>
      {/* far horse */}
      <g transform="translate(13.6 -2.6) scale(0.92)">
        <Horse coat={darken(h2.coat, 0.15)} shade={darken(h2.shade, 0.15)} mane={h2.mane} pose={1} bridle />
      </g>
      {/* far wheel hint */}
      <ellipse cx={wx + 3.2} cy={wy - 1.6} rx={2} ry={wr * 0.95} fill="none" stroke={p.woodShade} strokeWidth={1.2} opacity={0.8} />
      {/* warrior (behind driver) */}
      <g transform="translate(-14.4 -17.8)">
        <Spear x1={-12.4} y1={-12.4} x2={11} y2={-20.6} f={warrior} w={0.8} blade={2.8} bladeW={1.3} />
        <Arm s={[-2.2, -7]} e={[-5.6, -10.6]} h={[-4, -15.6]} f={warrior} sleeve={p.tunic} />
        <g transform="translate(-0.6 13.4)">
          <Body f={warrior} torso={p.faction === 'rome' ? 'mail' : p.faction === 'syracuse' ? 'muscle' : 'linen'} skirt={false} />
          <Head f={warrior} helmet={helmet} crest={crest} beard={i % 2 === 0} />
        </g>
      </g>
      {/* near horse */}
      <g transform="translate(9.6 0) scale(0.95)">
        <Horse coat={h1.coat} shade={h1.shade} mane={h1.mane} pose={1} light={lighten(h1.coat, 0.35)} />
      </g>
      {/* pole & reins */}
      <Line2 d="M-3.8 -9.6 L13.6 -14.2" w={1.0} c={p.woodShade} ow={0.5} />
      <path d="M-5 -19.6 Q6 -22 22.4 -18.6" fill="none" stroke="#3a2416" strokeWidth={0.5} />
      {/* driver */}
      <g transform="translate(-6.8 -17.2) scale(0.95)">
        <g transform="translate(-0.6 13.4)">
          <Body f={driver} torso="tunic" skirt={false} />
          <Head f={driver} helmet={p.faction === 'syracuse' ? 'pilos' : 'cap'} crest="none" />
        </g>
        <Arm s={[1.6, -7.2]} e={[4.4, -4.8]} h={[6.8, -3.2]} f={driver} near sleeve={p.tunic} />
      </g>
      {/* chariot box */}
      <Shape d="M-21 -19 C-14 -19.8 -8 -19.8 -4.4 -18.6 C-3.4 -15.6 -3.2 -11.6 -4 -8.4 L-20.6 -8.4 C-21.6 -11.8 -21.6 -15.6 -21 -19 Z" f={p.saddle} />
      <Paint d="M-21 -19 C-19.8 -19.2 -18.4 -19.3 -17.2 -19.4 C-17.6 -15.6 -17.6 -11.8 -17 -8.4 L-20.6 -8.4 C-21.6 -11.8 -21.6 -15.6 -21 -19 Z" f={p.saddleShade} mx={-12.7} />
      <Hi d="M-20.6 -18.2 C-14 -19 -8.4 -19 -4.8 -17.9" c={p.gold} w={1.0} o={1} />
      <Hi d="M-20.4 -9.4 L-4.4 -9.4" c={p.gold} w={0.8} o={1} />
      <Shield kind="round" f={warrior} dx={-17.6} dy={1.8} s={0.95} />
      {/* wheel */}
      <circle cx={wx} cy={wy} r={wr} fill="none" stroke={OL} strokeWidth={2.4} />
      <circle cx={wx} cy={wy} r={wr} fill="none" stroke={p.wood} strokeWidth={1.2} />
      <path d={spokes.join(' ')} stroke={p.woodShade} strokeWidth={0.6} />
      <circle cx={wx} cy={wy} r={1.4} fill={p.metal} stroke={OL} strokeWidth={0.5} />
      <Hi d={`M${wx - 4.4} ${wy - 4.6} A ${wr - 0.2} ${wr - 0.2} 0 0 1 ${wx + 3} ${wy - 5.8}`} c={lighten(p.wood, 0.4)} w={0.5} />
      {/* scythe hub */}
      <Line2 d={`M${wx + 1.4} ${wy} L${wx + 6.2} ${wy + 1}`} w={0.8} c={p.ironLight} ow={0.4} />
    </>
  );
}

