// The release shown on the main menu: number, battle name and build stamp.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import pkg from '../../package.json';
import { SCENARIOS } from '../../src/scenarios';
import { MainMenu } from '../../src/ui/screens/Menus';
import { RELEASE, RELEASES, buildLabel } from '../../src/version';

describe('release', () => {
  it('the current release is the newest one and matches package.json', () => {
    expect(RELEASE).toBe(RELEASES[0]);
    expect(pkg.version).toBe(RELEASE.number);
  });

  it('every release is named after a different battle of the game, numbers newest first', () => {
    const battles = new Set(SCENARIOS.map((s) => s.name));
    for (const r of RELEASES) expect(battles, r.name).toContain(r.name);
    expect(new Set(RELEASES.map((r) => r.name)).size).toBe(RELEASES.length);
    const nums = RELEASES.map((r) => r.number.split('.').map(Number));
    for (let i = 1; i < nums.length; i++) {
      const [a, b] = [nums[i - 1], nums[i]];
      const cmp = a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
      expect(cmp, `${RELEASES[i - 1].number} after ${RELEASES[i].number}`).toBeGreaterThan(0);
    }
  });

  it('labels the build by its UTC time, or as a dev build', () => {
    expect(buildLabel('2026-10-10T14:05:33.123Z')).toBe('build 2026-10-10 14:05 UTC');
    expect(buildLabel(null)).toBe('dev build');
  });

  it('the main menu shows the release in its corner', () => {
    const html = renderToStaticMarkup(createElement(MainMenu, { saved: null, onNew: () => {}, onContinue: () => {} }));
    expect(html).toContain(`v${RELEASE.number}`);
    expect(html).toContain(RELEASE.name);
    expect(html).toContain('class="menu-version"');
  });
});
