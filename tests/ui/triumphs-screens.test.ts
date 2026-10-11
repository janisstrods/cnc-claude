// Triumphs on screen: medals in the battle picker (rows, tabs, the side and opponent buttons), opening the picker on a
// battle, the main menu's tally and button, the record dialog, and a new medal in the end-of-battle dialog.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/engine';
import { SCENARIOS, scenarioById } from '../../src/scenarios';
import { BattleResult } from '../../src/ui/game/BattleResult';
import { addResult, saveRecord, type BattleRecord } from '../../src/ui/record';
import { MainMenu, ScenarioSelect } from '../../src/ui/screens/Menus';
import { TriumphsDialog } from '../../src/ui/screens/Triumphs';
import { stubStorage, useStubStorageCleanup } from '../support/storage';

useStubStorageCleanup();

const akragas = scenarioById('001');
const [bottomArmy, topArmy] = [akragas.setup.bottom.army, akragas.setup.top.army];

/** Akragas won against the Consul from the bottom side and lost against the Recruit from the top. */
function seedRecord(): BattleRecord {
  stubStorage();
  const rec = addResult(addResult({}, '001', 'bottom', 'consul', 'won'), '001', 'top', 'recruit', 'lost');
  saveRecord(rec);
  return rec;
}

const picker = (initialBattle?: string) =>
  renderToStaticMarkup(createElement(ScenarioSelect, { onBack: () => {}, onStart: () => {}, initialBattle }));
/** The element (opening tag to its closing tag) of the first `<tag ...>` whose opening tag matches `attrs`. */
const element = (html: string, tag: string, attrs: RegExp) => {
  const m = new RegExp(`<${tag}[^>]*${attrs.source}[^>]*>[\\s\\S]*?</${tag}>`).exec(html);
  return m?.[0] ?? '';
};

describe('Triumphs in the battle picker', () => {
  it('each battle row shows its two medals, bottom army first', () => {
    seedRecord();
    const row = element(picker(), 'button', /class="scen-item active"/);
    expect(row).toContain('Akragas');
    expect(row).toContain(`aria-label="${bottomArmy}: gold (beat the Consul) · ${topArmy}: not won yet"`);
    expect(row.indexOf('medal is-gold')).toBeLessThan(row.indexOf('medal is-fought'));
    const next = element(picker(), 'button', /class="scen-item "/);
    expect(next).toContain('medal is-none');
    expect(next).not.toContain('is-gold');
  });

  it('a tab counts the medals won in its box', () => {
    seedRecord();
    const html = picker();
    expect(element(html, 'button', /id="battle-tab-base"/)).toContain('aria-label="1 of 30 medals won"');
    expect(element(html, 'button', /id="battle-tab-exp1"/)).not.toContain('medals won');
  });

  it('the side buttons show their medal and record; the opponent buttons their metal, bright once beaten from the chosen side', () => {
    seedRecord();
    const html = picker();
    const mine = element(html, 'button', new RegExp(`title="Your record as ${bottomArmy}: 1 won, 0 lost"`));
    expect(mine).toContain('medal is-gold choice-medal');
    const theirs = element(html, 'button', new RegExp(`title="Your record as ${topArmy}: 0 won, 1 lost"`));
    expect(theirs).toContain('medal is-fought choice-medal');
    expect(element(html, 'button', /title="Thinks deeper[^"]*"/)).toContain('medal is-gold choice-medal');
    expect(element(html, 'button', /title="Thinks deeper[^"]*"/)).toContain(`Beaten as ${bottomArmy}: gold won.`);
    expect(element(html, 'button', /title="A forgiving[^"]*"/)).toContain('medal is-bronze is-faint choice-medal');
    expect(element(html, 'button', /title="A capable[^"]*"/)).toContain('medal is-silver is-faint choice-medal');
  });

  it('without a record nothing is won: no tab counts, no side medals, every metal faint', () => {
    const html = picker();
    expect(html).not.toContain('medals won');
    expect(html).not.toContain('Your record as');
    expect(html).toContain(`title="Not fought yet as ${bottomArmy}"`);
    expect(html.split('is-faint choice-medal').length - 1).toBe(3);
  });

  it('opens on the battle picked in the Triumphs record, in its box', () => {
    const html = picker('109');
    expect(html).toMatch(/<div class="brief-title">Gaugamela/);
    expect(element(html, 'button', /id="battle-tab-exp1"/)).toContain('aria-selected="true"');
    expect(element(html, 'button', /class="scen-item active"/)).toContain('Gaugamela');
  });
});

describe('Triumphs on the main menu', () => {
  const menu = () => renderToStaticMarkup(createElement(MainMenu, { saved: null, onNew: () => {}, onContinue: () => {} }));

  it('offers the record between How to Play and Credits', () => {
    const html = menu();
    const at = (label: string) => html.indexOf(`>${label}</span>`);
    expect(at('Triumphs')).toBeGreaterThan(at('How to Play'));
    expect(at('Triumphs')).toBeLessThan(at('Credits'));
  });

  it('shows the tally once a battle is recorded', () => {
    expect(menu()).not.toContain('menu-tally');
    seedRecord();
    const html = menu();
    expect(html).toContain(`aria-label="1 gold, 0 silver, 0 bronze of ${2 * SCENARIOS.length} medals; 1 of ${SCENARIOS.length} battles fought"`);
    expect(html).toContain(`1 of ${SCENARIOS.length} battles fought`);
  });

  it('the dialog lists every battle of every box with its medals, and saves and loads the record', () => {
    const rec = seedRecord();
    const html = renderToStaticMarkup(createElement(TriumphsDialog, {
      open: true, record: rec, onClose: () => {}, onRecord: () => {}, onPick: () => {},
    }));
    expect(html.split('class="tri-cell"').length - 1).toBe(SCENARIOS.length);
    expect(html.split('class="medal-pair"').length - 1).toBe(SCENARIOS.length);
    for (const box of ['Punic Wars', 'Greece', 'Barbarians', 'Civil Wars']) expect(html).toMatch(new RegExp(`<h3>[^<]*${box}`));
    expect(html).toContain('title="Akragas: ');
    expect(html).toContain('>Save record<');
    expect(html).toContain('>Load record<');
    expect(html).toContain('type="file"');
  });
});

describe('a new medal at the end of a battle', () => {
  const result = (newMedal?: 'gold' | 'silver' | 'bronze') => renderToStaticMarkup(createElement(BattleResult, {
    state: createGame(akragas.setup, 1), human: 'top', onExit: () => {},
    over: { winner: 'top', reason: `${topArmy} captured 5 banners`, newMedal },
  }));

  it('is announced with its metal and the level beaten', () => {
    const html = result('silver');
    expect(html).toContain('class="victory-medal"');
    expect(html).toContain('medal is-silver');
    expect(html.replace(/<[^>]+>/g, '')).toContain(`New medal: silver, for beating the Tribune as ${topArmy}`);
  });

  it('is not mentioned when the battle earned none', () => {
    expect(result()).not.toContain('victory-medal');
  });
});
