import { useEffect, useState, type ReactNode } from 'react';
import { CARD_DEFS } from '../engine/cards';
import type { CardGroup, CardKind, DieFace, Faction } from '../engine/types';
import {
  ALL_DIE_FACES,
  BannerTrack,
  Button,
  CardBack,
  CardView,
  DiceTray,
  DieView,
  FACTION_COLORS,
  Modal,
  Panel,
  SectionMiniMap,
  Tabletop,
  Tooltip,
} from '../ui/kit';

const GROUPS: { group: CardGroup; title: string; blurb: string }[] = [
  { group: 'section', title: 'Section cards', blurb: 'Bronze — order units in one or more battlefield sections.' },
  { group: 'troop', title: 'Troop cards', blurb: 'Crimson — order units of one class, up to your Command.' },
  { group: 'leadership', title: 'Leadership cards', blurb: 'Royal blue — a leader inspires a linked chain of units.' },
  { group: 'tactic', title: 'Tactic cards', blurb: 'Tyrian purple — special manoeuvres and gambits.' },
];

const KINDS = Object.keys(CARD_DEFS) as CardKind[];

function rollFaces(n: number): DieFace[] {
  return Array.from({ length: n }, () => ALL_DIE_FACES[Math.floor(Math.random() * 6)]);
}

function Heading({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div style={{ margin: '44px 0 18px' }}>
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--kit-font-title)',
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: '.14em',
          textTransform: 'uppercase',
          color: '#f0d690',
          textShadow: '0 2px 3px rgba(0,0,0,.7)',
        }}
      >
        {children}
      </h2>
      {sub ? <div style={{ fontStyle: 'italic', color: '#cdb98d', fontSize: 16, marginTop: 2 }}>{sub}</div> : null}
      <div style={{ height: 1, marginTop: 10, background: 'linear-gradient(90deg, rgba(226,189,114,.6), rgba(226,189,114,0) 70%)' }} />
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'var(--kit-font-title)',
        fontSize: 11,
        letterSpacing: '.16em',
        textTransform: 'uppercase',
        color: '#bfa776',
        textAlign: 'center',
        marginTop: 10,
      }}
    >
      {children}
    </div>
  );
}

export default function KitGallery() {
  const [selected, setSelected] = useState<CardKind | null>('order3C');
  const [hover, setHover] = useState<{ kind: CardKind; x: number; y: number } | null>(null);
  const [modal, setModal] = useState(() => window.location.hash.includes('modal'));
  const [rolling, setRolling] = useState(true);
  const [faces, setFaces] = useState<DieFace[]>(['heavy', 'swords', 'flag', 'light', 'heavy']);
  const [banners, setBanners] = useState(3);
  const [hand, setHand] = useState<number | null>(2);

  useEffect(() => {
    if (!rolling) return;
    const t = window.setTimeout(() => {
      setFaces(rollFaces(5));
      setRolling(false);
    }, 1400);
    return () => window.clearTimeout(t);
  }, [rolling]);

  const scoring = faces.map((f) => f === 'heavy' || f === 'swords');
  const handKinds: CardKind[] = ['order2L', 'orderHeavy', 'inspiredC', 'clash', 'coordinated', 'darken'];

  return (
    <Tabletop style={{ position: 'fixed', inset: 0, overflow: 'auto', padding: '36px 48px 80px', boxSizing: 'border-box' }}>
      <header style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontFamily: 'var(--kit-font-title)', fontSize: 13, letterSpacing: '.4em', color: '#bfa776', textTransform: 'uppercase' }}>
          Commands &amp; Colors · Ancients
        </div>
        <h1
          style={{
            margin: '6px 0 4px',
            fontFamily: 'var(--kit-font-title)',
            fontWeight: 700,
            fontSize: 40,
            letterSpacing: '.08em',
            color: '#f3d98f',
            textShadow: '0 3px 6px rgba(0,0,0,.8)',
          }}
        >
          UI Kit
        </h1>
        <div style={{ fontStyle: 'italic', fontSize: 18, color: '#d8c49a' }}>Cards, dice, banners and furniture for the war table</div>
      </header>

      {GROUPS.map(({ group, title, blurb }) => (
        <div key={group}>
          <Heading sub={blurb}>{title}</Heading>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
            {KINDS.filter((k) => CARD_DEFS[k].group === group).map((k) => (
              <CardView
                key={k}
                kind={k}
                selected={selected === k}
                onClick={() => setSelected(selected === k ? null : k)}
              />
            ))}
          </div>
        </div>
      ))}

      <Heading sub="sm (hand) · md · lg (tooltip / detail) · card back">Sizes</Heading>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 26, flexWrap: 'wrap' }}>
        <div>
          <CardView kind="orderMounted" size="sm" />
          <Label>sm</Label>
        </div>
        <div>
          <CardView kind="outFlanked" size="sm" />
          <Label>sm</Label>
        </div>
        <div>
          <CardView kind="inspiredL" size="sm" />
          <Label>sm</Label>
        </div>
        <div>
          <CardView kind="mountedCharge" size="sm" />
          <Label>sm</Label>
        </div>
        <div>
          <CardBack size="sm" />
          <Label>back sm</Label>
        </div>
        <div>
          <CardView kind="spartacus" size="md" />
          <Label>md</Label>
        </div>
        <div>
          <CardBack size="md" />
          <Label>back md</Label>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 26, flexWrap: 'wrap', marginTop: 26 }}>
        <div>
          <CardView kind="firstStrike" size="lg" />
          <Label>lg</Label>
        </div>
        <div>
          <CardView kind="order4R" size="lg" />
          <Label>lg</Label>
        </div>
        <div>
          <CardView kind="inspiredC" size="lg" />
          <Label>lg</Label>
        </div>
        <div>
          <CardView kind="rally" size="lg" />
          <Label>lg</Label>
        </div>
        <div>
          <CardBack size="lg" />
          <Label>back lg</Label>
        </div>
      </div>

      <Heading sub="selected · disabled · highlight · mirrored (Counter Attack view) · hover lifts">States</Heading>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 26, flexWrap: 'wrap', paddingTop: 16 }}>
        <div>
          <CardView kind="order3L" />
          <Label>normal</Label>
        </div>
        <div>
          <CardView kind="order3L" selected />
          <Label>selected</Label>
        </div>
        <div>
          <CardView kind="order3L" disabled />
          <Label>disabled</Label>
        </div>
        <div>
          <CardView kind="order3L" highlight />
          <Label>highlight</Label>
        </div>
        <div>
          <CardView kind="order3L" mirrored />
          <Label>mirrored</Label>
        </div>
        <div>
          <CardView kind="inspiredL" mirrored />
          <Label>mirrored</Label>
        </div>
        <div style={{ marginLeft: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: 196, padding: '0 30px 34px' }}>
            {handKinds.map((k, i) => {
              const n = handKinds.length;
              const a = (i - (n - 1) / 2) * 6;
              return (
                <div
                  key={k}
                  onMouseMove={(e) => setHover({ kind: k, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    marginLeft: i === 0 ? 0 : -38,
                    transform: `rotate(${a}deg) translateY(${Math.abs(a) * 1.4}px)`,
                    transformOrigin: '50% 120%',
                    zIndex: hand === i ? 10 : i,
                  }}
                >
                  <CardView
                    kind={k}
                    size="sm"
                    selected={hand === i}
                    disabled={k === 'darken'}
                    onClick={() => setHand(hand === i ? null : i)}
                  />
                </div>
              );
            })}
          </div>
          <Label>a hand of sm cards (click to select, hover for detail)</Label>
        </div>
      </div>

      <Heading sub="ivory battle dice — plain · hit · flag · miss · rolling">Dice</Heading>
      <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(6, 64px)', gap: '14px 10px', alignItems: 'center' }}>
          <div />
          {ALL_DIE_FACES.map((f) => (
            <Label key={f}>{f}</Label>
          ))}
          {([null, 'hit', 'flag', 'miss', 'rolling'] as const).map((st) => (
            <RowDice key={String(st)} st={st} />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <DiceTray
            title="Heavy Infantry attacks — 5 dice"
            faces={faces}
            scoring={rolling ? undefined : scoring}
            rolling={rolling}
            style={{ width: 430 }}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <Button onClick={() => setRolling(true)} disabled={rolling}>
              Roll the dice
            </Button>
          </div>
          <DiceTray
            title="Light Bowmen fire — 2 dice"
            subtitle="1 hit — the Auxilia lose a block"
            faces={['light', 'flag']}
            scoring={[true, false]}
            dieSize={40}
            style={{ width: 430 }}
          />
          <DiceTray title="Rally — roll Command (4)" faces={['leader', 'medium', 'swords', 'heavy']} rolling style={{ width: 430 }} />
        </div>
      </div>

      <Heading sub="captured banners in the opponent's colours; slots up to the scenario target">Banner tracks</Heading>
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <BannerTrack label="Rome" count={banners} target={6} faction="carthage" />
        <BannerTrack label="Carthage" count={2} target={6} faction="rome" />
        <BannerTrack label="Syracuse" count={4} target={5} faction="rome" />
        <BannerTrack label="Rome" count={5} target={5} faction="syracuse" />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Button variant="secondary" onClick={() => setBanners((b) => Math.min(6, b + 1))}>
            Capture
          </Button>
          <Button variant="ghost" onClick={() => setBanners(0)}>
            Reset
          </Button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 22, marginTop: 18 }}>
        {(Object.keys(FACTION_COLORS) as Faction[]).map((f) => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(['light', 'main', 'dark'] as const).map((t) => (
              <span
                key={t}
                style={{ width: 22, height: 22, borderRadius: 4, background: FACTION_COLORS[f][t], boxShadow: '0 0 0 1px rgba(0,0,0,.5)' }}
              />
            ))}
            <span style={{ fontFamily: 'var(--kit-font-title)', fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: '#d8c49a' }}>{f}</span>
          </div>
        ))}
      </div>

      <Heading sub="buttons · panels · modal · tooltip · section mini-map">Furniture</Heading>
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 14 }}>
            <Button>Play card</Button>
            <Button variant="secondary">End movement</Button>
            <Button variant="ghost">Undo</Button>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <Button disabled>Battle</Button>
            <Button variant="secondary" disabled>
              Retreat
            </Button>
            <Button variant="ghost" disabled>
              Skip
            </Button>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <Button onClick={() => setModal(true)}>Open modal</Button>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 6 }}>
            <SectionMiniMap sections={['left']} size={60} onDark />
            <SectionMiniMap sections={['center']} size={60} onDark />
            <SectionMiniMap sections={['left', 'right']} size={60} onDark />
            <SectionMiniMap sections={['left', 'center', 'right']} counts={{ left: 1, center: 1, right: 1 }} size={90} onDark />
          </div>
        </div>
        <Panel title="Battle Log" style={{ width: 340 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div>
              <b style={{ color: '#f0c46a' }}>Rome</b> plays <i>Order Three Units Center</i>.
            </div>
            <div>Heavy Infantry close combat — 5 dice: 2 hits, 1 flag.</div>
            <div>Carthaginian Medium Infantry retreats 1 hex.</div>
            <div style={{ color: '#f0c46a' }}>Rome captures a banner (3 / 6).</div>
          </div>
        </Panel>
        <Panel title="Orders" variant="parchment" style={{ width: 300 }}>
          Select up to <b>3 units</b> in the <b>center</b> section. Leaders may be ordered separately.
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <Button>Confirm</Button>
            <Button variant="ghost" style={{ color: '#6a1512', boxShadow: 'inset 0 0 0 1px rgba(106,21,18,.4)' }}>
              Clear
            </Button>
          </div>
        </Panel>
        <div style={{ position: 'relative', width: 380, height: 170, borderRadius: 10, background: 'rgba(0,0,0,.2)', boxShadow: 'inset 0 0 0 1px rgba(226,189,114,.2)' }}>
          <div style={{ position: 'absolute', left: 28, top: 30, width: 14, height: 14, borderRadius: '50%', background: '#f0c46a' }} />
          <Tooltip x={35} y={37} position="absolute" offset={14}>
            <div className="kit-tooltip__title">Heavy Infantry</div>
            4 blocks · close combat 5 dice
            <br />
            <i style={{ color: '#d8c49a' }}>vs Medium Infantry: 1.7 expected hits</i>
          </Tooltip>
        </div>
      </div>

      {hover ? (
        <Tooltip x={hover.x} y={hover.y} variant="bare">
          <CardView kind={hover.kind} size="lg" />
        </Tooltip>
      ) : null}

      <Modal open={modal} title="Counter Attack" onClose={() => setModal(false)}>
        <p style={{ marginTop: 0 }}>
          Your opponent played <b>Order Two Units Left</b>. Counter Attack issues the same order from your side of the field, with left and right swapped.
        </p>
        <div style={{ display: 'flex', gap: 18, justifyContent: 'center', margin: '14px 0 18px' }}>
          <CardView kind="counterAttack" size="sm" />
          <CardView kind="order2L" size="sm" mirrored />
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Button onClick={() => setModal(false)}>Play it</Button>
          <Button variant="secondary" onClick={() => setModal(false)}>
            Keep in hand
          </Button>
        </div>
      </Modal>
    </Tabletop>
  );
}

function RowDice({ st }: { st: null | 'hit' | 'flag' | 'miss' | 'rolling' }) {
  return (
    <>
      <Label>{st ?? 'plain'}</Label>
      {ALL_DIE_FACES.map((f, i) => (
        <div key={f} style={{ display: 'grid', placeItems: 'center' }}>
          <DieView face={f} size={48} rolling={st === 'rolling'} delay={-i * 0.13} state={st === 'rolling' ? null : st} />
        </div>
      ))}
    </>
  );
}
