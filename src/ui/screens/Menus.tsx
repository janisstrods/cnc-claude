import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { UNIT_STATS, createGame, leaderUnit, orderDice, type GameOptions, type GameState, type Side, type UnitType } from '../../engine';
import { SCENARIOS, type Expansion, type ScenarioInfo } from '../../scenarios';
import { LEADER_ATTACH_OFFSET, LeaderToken, UnitToken } from '../../art';
import { BoardArt, ObjectiveMarkers } from '../terrain';
import { ALL_DIE_FACES, Button, DieSymbol, Icon, Modal, Panel } from '../kit';
import { BOARD_H, BOARD_W, hexCenterId } from '../geometry';
import type { Difficulty, SavedGame } from '../game/controller';
import { boardArtProps, leaderTokenProps, unitTokenProps } from '../game/boardProps';
import { PERSONALITIES, personalityFor } from '../../ai/personality';
import { RulesReference } from './RulesReference';
import { HistoryButton } from '../history/HistoryDialog';
import {
  OPTIONAL_RULES, PICKER_TABS, battlesOf, chosenOptions, loadOptionChoices, loadPickerTab, offeredOptions, optionValue, randomPick,
  saveOptionChoice, savePickerTab, tabForKey, type OptionId,
} from './picker';
import { BUILD_TIME, RELEASE, buildLabel } from '../../version';
import { storage } from '../storage';
import './screens.css';

const MENU_ARMY_L: UnitType[] = ['HI', 'MI', 'LC'];
const MENU_ARMY_R: UnitType[] = ['EL', 'WA', 'HC'];

export function MainMenu(p: { saved: SavedGame | null; notice?: string | null; onNew: () => void; onContinue: () => void }) {
  const [rules, setRules] = useState(false);
  const [credits, setCredits] = useState(false);
  const savedName = p.saved ? SCENARIOS.find((s) => s.id === p.saved!.config.scenarioId)?.name : null;
  return (
    <div className="menu-root">
      <div className="menu-hero">
        <div className="menu-emblem" aria-hidden>
          <Icon name="laurels" size={150} gradient={['#fbe7a6', '#e0b85a', '#a87c2c']} />
          <div className="menu-emblem-swords">
            <Icon name="crossedSwords" size={58} gradient={['#fbe7a6', '#d8b064', '#8a6226']} />
          </div>
        </div>
        <h1 className="menu-title">Commands &amp; Colors</h1>
        <div className="menu-sub">ANCIENTS</div>
        <p className="menu-tag">From Marathon to the Severn, 490 BC – AD 51 · {SCENARIOS.length} historical battles: the base game and Expansions #1, #2 and #3</p>
        <div className="menu-armies" aria-hidden>
          <svg viewBox="-52 -48 524 96" width="620" height="114">
            {MENU_ARMY_L.map((t, i) => (
              <g key={t} transform={`translate(${i * 80}, ${i % 2 ? 4 : 0})`}>
                <UnitToken type={t} look="roman" blockColor="rom" blocks={UNIT_STATS[t].blocks} maxBlocks={UNIT_STATS[t].blocks} facing="right" />
              </g>
            ))}
            {MENU_ARMY_R.map((t, i) => (
              <g key={t} transform={`translate(${420 - i * 80}, ${i % 2 ? 4 : 0})`}>
                <UnitToken type={t} look="carthaginian" blockColor="car" blocks={UNIT_STATS[t].blocks} maxBlocks={UNIT_STATS[t].blocks} facing="left" />
              </g>
            ))}
          </svg>
        </div>
        {p.notice && <div className="menu-notice">{p.notice}</div>}
        <div className="menu-buttons">
          {p.saved && (
            <Button onClick={p.onContinue}>Continue: {savedName}</Button>
          )}
          <Button variant={p.saved ? 'secondary' : 'primary'} onClick={p.onNew}>New Battle</Button>
          <Button variant="ghost" onClick={() => setRules(true)}>How to Play</Button>
          <Button variant="ghost" onClick={() => setCredits(true)}>Credits</Button>
        </div>
      </div>
      <div className="menu-version">
        <div>v{RELEASE.number} “{RELEASE.name}”</div>
        <div className="menu-build">{buildLabel(BUILD_TIME)}</div>
      </div>
      <Modal open={rules} title="How to Play" onClose={() => setRules(false)} width={880}>
        <RulesReference />
      </Modal>
      <Modal open={credits} title="Credits" onClose={() => setCredits(false)} width={640}>
        <div className="credits">
          <p>An unofficial, fan-made digital edition of <i>Commands &amp; Colors: Ancients</i>, designed by Richard Borg and published by GMT Games. Commands &amp; Colors is a trademark of GMT Games LLC. This edition uses original artwork and paraphrased rules text; it is not affiliated with or endorsed by GMT Games.</p>
          <p>Scenario setups follow the base game's 15 battles as documented by the community at commandsandcolors.net.</p>
          <p><b>Expansion #1</b>, <i>Greece &amp; Eastern Kingdoms</i>: its 24 battles (101–124) were transcribed hex by hex from the official battle maps published at commandsandcolors.net (122–124 from GMT's Bonus Pack #2). Its rules are paraphrased, its battle summaries original, and its armies drawn as original artwork.</p>
          <p><b>Expansion #2</b>, <i>Rome &amp; the Barbarians</i>: its 23 battles (201–223) were transcribed the same way from the battle maps published at commandsandcolors.net. Its rules are paraphrased, its battle summaries original, and its armies drawn as original artwork.</p>
          <p><b>Battle histories:</b> original summaries written from the ancient historians (Herodotus, Xenophon, Polybius, Diodorus, Livy, Plutarch, Arrian and others) and modern scholarship, each with its sources. The maps are schematic reconstructions; ancient numbers and details are often uncertain.</p>
          <p><b>Fonts:</b> Cinzel (Natanael Gama) and EB Garamond (Georg Duffner, Octavio Pardo) — SIL Open Font License 1.1.</p>
          <p><b>Icons:</b> game-icons.net by Lorc and Delapouite — CC BY 3.0 (see CREDITS.md for the full list).</p>
          <p><b>Miniatures, terrain, cards and dice:</b> original SVG artwork made for this edition.</p>
        </div>
      </Modal>
    </div>
  );
}

function SetupPreview({ state, flipped, humanSide }: { state: GameState; flipped: boolean; humanSide: Side }) {
  const blocks = { top: state.players.top.blocks, bottom: state.players.bottom.blocks };
  return (
    <svg className="preview-svg" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}>
      <BoardArt {...boardArtProps(state, flipped)} />
      <ObjectiveMarkers objectives={state.special.objectives} objState={state.special.objState} flipped={flipped} blocks={blocks} units={state.units} />
      {state.units.map((u) => {
        const { x, y } = hexCenterId(u.hex, flipped);
        return (
          <g key={u.id} transform={`translate(${x}, ${y})`}>
            <UnitToken {...unitTokenProps(state, u, humanSide)} />
          </g>
        );
      })}
      {/* leaders still to be placed (117 Asculum) wait off the board */}
      {state.leaders.filter((l) => l.hex >= 0).map((l) => {
        const { x, y } = hexCenterId(l.hex, flipped);
        const att = !!leaderUnit(state, l);
        return (
          <g key={l.id} transform={`translate(${x + (att ? LEADER_ATTACH_OFFSET.x : 0)}, ${y + (att ? LEADER_ATTACH_OFFSET.y : 0)})`}>
            <LeaderToken {...leaderTokenProps(state, l, humanSide, att)} name={l.name} />
          </g>
        );
      })}
    </svg>
  );
}

const DIFFS: { id: Difficulty; name: string; text: string }[] = [
  { id: 'recruit', name: 'Recruit', text: 'A forgiving opponent that makes mistakes.' },
  { id: 'tribune', name: 'Tribune', text: 'A capable general. Recommended.' },
  { id: 'consul', name: 'Consul', text: 'Thinks deeper and punishes errors.' },
];

/**
 * One optional rule of the briefing, as a switch. The checkbox carries the state for assistive technology; the visible
 * on/off word is hidden from it so the state is not read twice.
 */
export function OptionToggle({ sc, id, on, onToggle }: { sc: ScenarioInfo; id: OptionId; on: boolean; onToggle: () => void }) {
  return (
    <label className={`opt-toggle ${on ? 'on' : ''}`}>
      <input type="checkbox" checked={on} onChange={onToggle} />
      <span className="opt-switch" aria-hidden />
      <span className="opt-text">
        <b>{OPTIONAL_RULES[id].name}</b> <i aria-hidden>{on ? 'on' : 'off'}</i> — {OPTIONAL_RULES[id].text(sc)}
      </span>
    </label>
  );
}

export function ScenarioSelect(p: {
  onBack: () => void;
  onStart: (scenarioId: string, side: Side, difficulty: Difficulty, personality?: string, options?: GameOptions) => void;
}) {
  const [tab, setTab] = useState<Expansion>(() => loadPickerTab());
  const battles = useMemo(() => battlesOf(SCENARIOS, tab), [tab]);
  const [sel, setSel] = useState<ScenarioInfo>(() => battles[0] ?? SCENARIOS[0]);
  const [choices, setChoices] = useState<GameOptions>(() => loadOptionChoices());
  const offered = offeredOptions(sel);
  const switchTab = (t: Expansion) => {
    if (t === tab) return;
    setTab(t);
    savePickerTab(t);
    const first = battlesOf(SCENARIOS, t)[0];
    if (first) setSel(first);
  };
  // ARIA tabs: arrow keys (and Home/End) move between the tabs and select them; only the selected tab is in the tab order
  const tabRefs = useRef<Partial<Record<Expansion, HTMLButtonElement | null>>>({});
  const onTabKey = (e: KeyboardEvent) => {
    const t = tabForKey(tab, e.key);
    if (!t) return;
    e.preventDefault();
    switchTab(t);
    tabRefs.current[t]?.focus();
  };
  const [side, setSide] = useState<Side>('bottom');
  const [diff, setDiff] = useState<Difficulty>(() => (storage.get('cca-difficulty') as Difficulty) || 'tribune');
  // Random battle: a battle from any box and a side; the list then scrolls to it (only after a random pick)
  const listRef = useRef<HTMLDivElement>(null);
  const reveal = useRef(false);
  const [rolls, setRolls] = useState(0);
  const pickRandom = () => {
    const pick = randomPick(SCENARIOS, sel.id);
    if (pick.battle.expansion !== tab) {
      setTab(pick.battle.expansion);
      savePickerTab(pick.battle.expansion);
    }
    setSel(pick.battle);
    setSide(pick.side);
    setRolls((n) => n + 1);
    reveal.current = true;
  };
  useEffect(() => {
    if (!reveal.current) return;
    reveal.current = false;
    listRef.current?.querySelector('.scen-item.active')?.scrollIntoView({ block: 'center' });
  }, [sel]);
  const preview = useMemo(() => createGame(sel.setup, 1), [sel]);
  const [persona, setPersona] = useState<string>('');
  const enemy = sel.setup[side === 'top' ? 'bottom' : 'top'];
  const historical = personalityFor(enemy.commander, enemy.army);
  const armies = { top: sel.setup.top, bottom: sel.setup.bottom };
  /**
   * Cards a side holds: its Command, "2→4 cards" for a side whose hand grows to 4 (hand growth, 006 and 313, §18.8), or its
   * order dice when it plays no cards (310, §18.10).
   */
  const cardsText = (sd: Side) => {
    const dice = orderDice(preview, sd);
    if (dice) return `no cards, ${dice} order dice`;
    const growth = preview.special.handGrowth;
    const startCommand = preview.players[sd].command;
    return `${growth?.side === sd && growth.to > startCommand ? `${startCommand}→${growth.to}` : armies[sd].cards} cards`;
  };
  const start = () => {
    storage.set('cca-difficulty', diff);
    p.onStart(sel.id, side, diff, persona || undefined, chosenOptions(sel, choices));
  };
  return (
    <div className="select-root">
      <div className="select-list">
        <div className="select-head">
          <Button variant="ghost" onClick={p.onBack}>← Back</Button>
          <h2>Choose a Battle</h2>
        </div>
        <div className="select-tabs" role="tablist" aria-label="Battles">
          {PICKER_TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              id={`battle-tab-${t.id}`}
              role="tab"
              aria-selected={t.id === tab}
              aria-controls="battle-list"
              tabIndex={t.id === tab ? 0 : -1}
              className={t.id === tab ? 'active' : ''}
              onClick={() => switchTab(t.id)}
              onKeyDown={onTabKey}
            >
              {t.label} <small>{battlesOf(SCENARIOS, t.id).length}</small>
            </button>
          ))}
        </div>
        <div className="select-scroll" key={tab} ref={listRef} id="battle-list" role="tabpanel" aria-labelledby={`battle-tab-${tab}`}>
          {battles.map((s) => (
            <button key={s.id} className={`scen-item ${s.id === sel.id ? 'active' : ''}`} onClick={() => setSel(s)}>
              <span className="scen-num">{Number(s.id)}</span>
              <span className="scen-name">{s.name}</span>
              <span className="scen-year">{s.year}</span>
              <span className="scen-hint">{s.difficultyHint}</span>
            </button>
          ))}
        </div>
        <Button variant="ghost" className="random-btn" onClick={pickRandom} title="Pick a battle from any box, and a side, at random">
          <span key={rolls} className={`random-die ${rolls ? 'is-rolled' : ''}`} aria-hidden>
            <DieSymbol face={ALL_DIE_FACES[(rolls + 5) % ALL_DIE_FACES.length]} />
          </span>
          Random battle
        </Button>
      </div>
      <div className="select-detail">
        <Panel variant="parchment" className="brief">
          <div className="brief-head">
            <div className="brief-title">{sel.name} <span>{sel.year}</span></div>
            <HistoryButton scenario={sel} flipped={side === 'top'} variant="secondary" className="brief-history" />
          </div>
          {/* a long briefing scrolls here, so the map preview and To Battle! stay in view (back at the top for each battle) */}
          <div className="brief-scroll" key={sel.id}>
            <p className="brief-blurb">{sel.blurb}</p>
            <div className="brief-facts">
              <span>{sel.setup.banners} banners to win</span>
              <span>{armies[sel.setup.first].army} move first</span>
              <span>{armies.top.army}: {cardsText('top')} · {armies.bottom.army}: {cardsText('bottom')}</span>
            </div>
            {sel.specialText.length > 0 && (
              <ul className="brief-special">
                {sel.specialText.map((t) => <li key={t}>{t}</li>)}
              </ul>
            )}
            {offered.length > 0 && (
              <div className="brief-options">
                <div className="brief-options-label">Optional rules</div>
                {offered.map((id) => {
                  const on = optionValue(sel, id, choices);
                  return <OptionToggle key={id} sc={sel} id={id} on={on} onToggle={() => setChoices(saveOptionChoice(choices, id, !on))} />;
                })}
              </div>
            )}
          </div>
        </Panel>
        <div className="preview-wrap">
          <SetupPreview state={preview} flipped={side === 'top'} humanSide={side} />
        </div>
        <div className="choose-row">
          <div className="choose-group">
            <div className="choose-label">Command the</div>
            {(['bottom', 'top'] as Side[]).map((sd) => (
              <button key={sd} className={`choice ${side === sd ? 'active' : ''}`} onClick={() => setSide(sd)}>
                <b>{armies[sd].army}</b>
                <small>{armies[sd].commander}</small>
              </button>
            ))}
          </div>
          <div className="choose-group">
            <div className="choose-label">Opponent</div>
            {DIFFS.map((d) => (
              <button key={d.id} className={`choice ${diff === d.id ? 'active' : ''}`} onClick={() => setDiff(d.id)} title={d.text}>
                <b>{d.name}</b>
                <small>{d.text}</small>
              </button>
            ))}
          </div>
          <div className="choose-group persona-group">
            <div className="choose-label">General</div>
            <label className="persona">
              <span className="persona-name">{enemy.commander}</span>
              <select value={persona} onChange={(e) => setPersona(e.target.value)}>
                <option value="">{historical.name} (historical)</option>
                {PERSONALITIES.filter((x) => x.id !== historical.id).map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </select>
              <small>{(persona ? PERSONALITIES.find((x) => x.id === persona)! : historical).epithet}</small>
            </label>
          </div>
          <Button className="start-btn" onClick={start}>To Battle!</Button>
        </div>
      </div>
    </div>
  );
}
