import { describe, expect, it } from 'vitest';
import { makeCtx } from '../../test/makeCtx';
import {
  assign,
  build,
  enact,
  housing,
  idle,
  initialColonyState,
  lightEfficiency,
  onCollapse,
  provides,
  rates,
  restore,
  tick,
  type ColonyState,
} from './logic';

const fed = makeCtx({ imports: { comida: 1000, materiais: 100, luz: 1e6 } });
const starving = makeCtx();

function run(s: ColonyState, seconds: number, ctx = fed): ColonyState {
  let next = s;
  for (let i = 0; i < seconds; i++) next = tick(next, 1, ctx);
  return next;
}

describe('colony logic', () => {
  it('grows up to the housing limit while fed', () => {
    const grown = run(initialColonyState, 600);
    expect(grown.population).toBeCloseTo(housing(grown));
    expect(grown.peakPopulation).toBeGreaterThan(initialColonyState.population);
  });

  it('shrinks without food, but never below the minimum', () => {
    const big: ColonyState = { ...initialColonyState, population: 40, jobs: { agricultor: 0, artesao: 0, estudioso: 0 } };
    const hungry = run(big, 600, starving);
    expect(hungry.population).toBeLessThan(40);
    expect(hungry.population).toBeGreaterThanOrEqual(2);
  });

  it('farmers feed the colony without the Garden', () => {
    const r = rates(initialColonyState, starving);
    expect(r.foodLocal).toBeGreaterThan(0);
    expect(r.foodImported).toBe(0);
  });

  it('materials from the Factory accumulate and pay for buildings', () => {
    const s = run(initialColonyState, 10);
    expect(s.materiais).toBeCloseTo(1000);
    const built = build(s, 'casa');
    expect(built.buildings.casa).toBe(1);
    expect(housing(built)).toBe(15);
  });

  it('artisans need materials to make influence', () => {
    const s: ColonyState = { ...initialColonyState, population: 10, jobs: { agricultor: 0, artesao: 5, estudioso: 0 } };
    expect(rates(s, starving).influence).toBeCloseTo(0.5); // só os 5 sem emprego
    expect(rates(s, fed).influence).toBeGreaterThan(5);
  });

  it('powered buildings need light', () => {
    const s: ColonyState = { ...initialColonyState, buildings: { ...initialColonyState.buildings, oficina: 4 } };
    expect(lightEfficiency(s, fed)).toBe(1);
    expect(lightEfficiency(s, starving)).toBe(0);
  });

  it('jobs are limited by population and trimmed when it shrinks', () => {
    expect(idle(initialColonyState)).toBe(1);
    expect(assign(initialColonyState, 'artesao', 2)).toBe(initialColonyState);
    const s: ColonyState = { ...initialColonyState, population: 2.5, jobs: { agricultor: 2, artesao: 3, estudioso: 1 } };
    const next = tick(s, 0.01, fed);
    expect(next.jobs.agricultor + next.jobs.artesao + next.jobs.estudioso).toBeLessThanOrEqual(2);
  });

  it('laws cost knowledge; the council fills jobs', () => {
    const s: ColonyState = { ...initialColonyState, saber: 10_000, population: 20 };
    const withLaw = enact(s, 'conselho');
    expect(withLaw.laws).toContain('conselho');
    expect(idle(tick(withLaw, 0.1, fed))).toBe(0);
    expect(enact(initialColonyState, 'conselho')).toBe(initialColonyState);
  });

  it('gives bonuses to the Factory and the Garden', () => {
    const targets = provides({ ...initialColonyState, population: 100 }).map((b) => b.target);
    expect(targets).toEqual(['productionChain', 'garden']);
  });

  it('collapse and restore', () => {
    const s: ColonyState = { ...initialColonyState, laws: ['guildas'], peakPopulation: 900 };
    expect(onCollapse(s, new Set()).laws).toEqual([]);
    expect(onCollapse(s, new Set(['leis'])).laws).toEqual(['guildas']);
    expect(onCollapse(s, new Set()).peakPopulation).toBe(900);
    const r = restore({ population: -5, laws: ['guildas', 'x'], jobs: { artesao: 99 } });
    expect(r.population).toBe(initialColonyState.population);
    expect(r.laws).toEqual(['guildas']);
    expect(r.jobs.artesao).toBe(3);
  });
});
