import { describe, expect, it } from 'vitest';
import { makeCtx } from '../../test/makeCtx';
import {
  SPECIES,
  buyUpgrade,
  expand,
  exports,
  initialGardenState,
  mutationCandidates,
  onCollapse,
  plant,
  plotRates,
  restore,
  setExportShare,
  tick,
  totals,
  uproot,
  type GardenState,
} from './logic';

const ctx = makeCtx();
const rich: GardenState = { ...initialGardenState, seiva: 1e9 };

describe('garden logic', () => {
  it('planting costs seiva and only works for discovered species', () => {
    const planted = plant(rich, 0, 'musgo');
    expect(planted.plots[0]?.species).toBe('musgo');
    expect(planted.seiva).toBe(rich.seiva - SPECIES.musgo.plantCost);
    expect(plant(rich, 0, 'lirio')).toBe(rich);
    expect(uproot(planted, 0).plots[0]).toBeNull();
  });

  it('plants produce seiva and food continuously and advance their growth bar', () => {
    const s = plant(plant(rich, 0, 'musgo'), 1, 'trigo');
    const next = tick(s, 5, ctx);
    expect(next.seiva).toBeGreaterThan(s.seiva);
    expect(next.plots[0]?.growth).toBeCloseTo(0.5);
    expect(tick(next, 5, ctx).harvests).toBe(1);
  });

  it('exports part of the food and composts the rest', () => {
    const s = setExportShare(plant(rich, 0, 'trigo'), 1);
    const t = totals(s, ctx);
    expect(t.exported).toBeCloseTo(t.comida);
    expect(t.compost).toBe(0);
    expect(exports(tick(s, 1, ctx)).comida).toBeCloseTo(t.comida);
    const kept = totals(setExportShare(s, 0), ctx);
    expect(kept.exported).toBe(0);
    expect(kept.compost).toBeGreaterThan(0);
  });

  it('light from the Constellation speeds up growth', () => {
    const s = plant(rich, 0, 'musgo');
    const lit = makeCtx({ imports: { luz: 1000 } });
    expect(plotRates(s, 0, lit).seiva).toBeGreaterThan(plotRates(s, 0, ctx).seiva);
  });

  it('empty plots between the right parents can mutate into a new species', () => {
    // 3x3: musgo em 0, trigo em 2; o canteiro 1 fica entre eles.
    let s = plant(plant(rich, 0, 'musgo'), 2, 'trigo');
    expect(mutationCandidates(s, 1, ctx).map((c) => c.species)).toEqual(['lirio']);
    for (let i = 0; i < 400 && !s.discovered.includes('lirio'); i++) s = tick(s, 1, ctx);
    expect(s.discovered).toContain('lirio');
    expect(s.plots[1]?.species).toBe('lirio');
    expect(s.mutations).toBe(1);
  });

  it('same-species recipes need two parents of that species', () => {
    const one = plant(rich, 0, 'trigo');
    expect(mutationCandidates(one, 1, ctx)).toEqual([]);
    const two = plant(one, 4, 'trigo');
    expect(mutationCandidates(two, 1, ctx).map((c) => c.species)).toEqual(['abobora']);
  });

  it('rare seeds need Expedition depth', () => {
    const known: GardenState = { ...rich, discovered: [...rich.discovered, 'abobora'] };
    const s = plant(plant(known, 0, 'abobora'), 2, 'musgo');
    expect(mutationCandidates(s, 1, ctx).map((c) => c.species)).not.toContain('raiz');
    expect(mutationCandidates(s, 1, makeCtx({ imports: { profundidade: 15 } })).map((c) => c.species)).toContain('raiz');
  });

  it('upgrades and expansion spend seiva', () => {
    const up = buyUpgrade(rich, 'adubo');
    expect(up.upgrades.adubo).toBe(1);
    expect(up.seiva).toBeLessThan(rich.seiva);
    const big = expand(plant(rich, 4, 'musgo'));
    expect(big.size).toBe(4);
    expect(big.plots).toHaveLength(16);
    expect(big.plots[5]?.species).toBe('musgo');
  });

  it('collapse resets the garden but the seed bank keeps species', () => {
    const s = { ...rich, discovered: [...rich.discovered, 'lirio' as const], mutations: 3 };
    expect(onCollapse(s, new Set()).discovered).toEqual(['musgo', 'trigo']);
    expect(onCollapse(s, new Set(['sementes'])).discovered).toContain('lirio');
    expect(onCollapse(s, new Set()).mutations).toBe(3);
  });

  it('restores bad saves safely', () => {
    const r = restore({ size: 99, plots: [{ species: 'nope' }, { species: 'musgo', growth: 5 }], seiva: -1, discovered: ['x'] });
    expect(r.size).toBe(6);
    expect(r.plots[0]).toBeNull();
    expect(r.plots[1]?.growth).toBeLessThan(1);
    expect(r.seiva).toBe(0);
    expect(r.discovered).toEqual(['musgo', 'trigo']);
  });
});
