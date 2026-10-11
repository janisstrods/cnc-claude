// Helpers shared by the art tests: an element rendered to SVG markup, and every unit type with its full strength.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { UnitType } from '../../src/engine/types';
import { UNIT_STATS, UNIT_TYPES } from '../../src/engine/units';

/** An element rendered inside an <svg> as static markup (what the pinned hashes and the shape checks compare). */
export const svg = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(h('svg', null, el));

/** Every unit type, in the engine's table order. */
export const ALL_TYPES: readonly UnitType[] = UNIT_TYPES;

/** Each unit type's full strength in blocks. */
export const MAX = Object.fromEntries(UNIT_TYPES.map((t) => [t, UNIT_STATS[t].blocks])) as Record<UnitType, number>;
