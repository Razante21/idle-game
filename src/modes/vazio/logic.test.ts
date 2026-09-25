import { describe, expect, it } from 'vitest';
import { makeCtx } from '../../test/makeCtx';
import {
  buyUpgrade,
  drainMultiplier,
  essenceRate,
  focoRate,
  initialVazioState,
  maxRiftSlots,
  onCollapse,
  provides,
  restore,
  sealCost,
  sealReward,
  sealRift,
  tick,
  type VazioState,
} from './logic';

const ctx = makeCtx();
const withRift: VazioState = { ...initialVazioState, foco: 1e9, darkMatter: 1e9, rifts: [{ id: 1, power: 0.1, timeLeft: 200, hardened: 0 }] };

describe('vazio logic', () => {
  it('accumulates foco over time, scaled by production', () => {
    const next = tick(initialVazioState, 10, ctx);
    expect(next.foco).toBeCloseTo(focoRate(initialVazioState, ctx) * 10);
    const boosted = tick(initialVazioState, 10, makeCtx({ mult: { production: 5 } }));
    expect(boosted.foco).toBeGreaterThan(next.foco);
  });

  it('spawns rifts over time up to the slot limit', () => {
    let s = initialVazioState;
    for (let i = 0; i < 2000 && s.rifts.length < maxRiftSlots(s); i++) s = tick(s, 5, ctx);
    expect(s.rifts.length).toBe(maxRiftSlots(s));
    const before = s.rifts.length;
    s = tick(s, 5000, ctx);
    expect(s.rifts.length).toBe(before); // não passa do limite mesmo com muito tempo
  });

  it('rifts left open too long harden instead of disappearing', () => {
    const s = tick(withRift, 1000, ctx);
    const rift = s.rifts.find((r) => r.id === 1)!;
    expect(rift.hardened).toBeGreaterThan(0);
    expect(rift.power).toBeGreaterThan(withRift.rifts[0]!.power);
  });

  it('hardening caps out instead of compounding forever out of reach of a linear foco income', () => {
    // Sem teto, uma fenda esquecida por muito tempo teria um custo de selar exponencial — impossível
    // de alcançar com o Foco, que só cresce linearmente. Isso soft-lockaria a vaga para sempre.
    let s = withRift;
    for (let i = 0; i < 50; i++) s = tick(s, 240, ctx); // 50 endurecimentos, bem além do que o jogo normal alcança
    const rift = s.rifts.find((r) => r.id === 1)!;
    expect(rift.power).toBeLessThanOrEqual(0.6);
    expect(sealCost(rift)).toBeLessThanOrEqual(1800);
  });

  it('open rifts drain global production proportionally to their power, floored', () => {
    expect(drainMultiplier(initialVazioState)).toBe(1);
    expect(drainMultiplier(withRift)).toBeCloseTo(0.9);
    const heavy: VazioState = { ...initialVazioState, rifts: Array.from({ length: 5 }, (_, i) => ({ id: i, power: 0.5, timeLeft: 100, hardened: 0 })) };
    expect(drainMultiplier(heavy)).toBe(0.25);
  });

  it('sealing a rift costs foco and grants dark matter', () => {
    const rift = withRift.rifts[0]!;
    const cost = sealCost(rift);
    const reward = sealReward(withRift, rift);
    const sealed = sealRift(withRift, rift.id);
    expect(sealed.rifts).toHaveLength(0);
    expect(sealed.foco).toBeCloseTo(withRift.foco - cost);
    expect(sealed.darkMatter).toBeCloseTo(withRift.darkMatter + reward);
    expect(sealed.sealed).toBe(1);
    expect(sealRift(initialVazioState, 1)).toBe(initialVazioState); // sem foco suficiente
  });

  it('ressonancia increases the dark matter reward from sealing', () => {
    const boosted = { ...withRift, upgrades: { ...withRift.upgrades, ressonancia: 5 } };
    expect(sealReward(boosted, boosted.rifts[0]!)).toBeGreaterThan(sealReward(withRift, withRift.rifts[0]!));
  });

  it('upgrades cost dark matter and cap at their max level', () => {
    const bought = buyUpgrade(withRift, 'nucleoDeSombra');
    expect(bought.upgrades.nucleoDeSombra).toBe(1);
    const maxed = { ...withRift, upgrades: { ...withRift.upgrades, nucleoDeSombra: 5 } };
    expect(buyUpgrade(maxed, 'nucleoDeSombra')).toBe(maxed);
  });

  it('provides permanent global bonuses plus the current drain', () => {
    const bonuses = provides({ ...withRift, upgrades: { ...withRift.upgrades, nucleoDeSombra: 2, ecoDoNada: 3 } });
    expect(bonuses).toContainEqual({ target: 'global', stat: 'production', value: 0.9, source: 'Fendas abertas' });
    expect(bonuses).toContainEqual({ target: 'global', stat: 'production', value: 1.2, source: 'Núcleo de Sombra' });
    expect(bonuses).toContainEqual({ target: 'global', stat: 'essence', value: 1.15, source: 'Eco do Nada' });
  });

  it('essence rate grows with accumulated dark matter', () => {
    expect(essenceRate(initialVazioState)).toBe(0);
    expect(essenceRate({ ...initialVazioState, totalDarkMatter: 1e6 })).toBeGreaterThan(0);
  });

  it('collapse closes open rifts but keeps dark matter and upgrades forever', () => {
    const s: VazioState = { ...withRift, upgrades: { ...withRift.upgrades, nucleoDeSombra: 3 } };
    const collapsed = onCollapse(s);
    expect(collapsed.rifts).toEqual([]);
    expect(collapsed.darkMatter).toBe(s.darkMatter);
    expect(collapsed.totalDarkMatter).toBe(s.totalDarkMatter);
    expect(collapsed.upgrades.nucleoDeSombra).toBe(3);
  });

  it('restores bad saves safely', () => {
    const r = restore({ foco: -5, rifts: [{ id: 1, power: 5 }, { bad: true }], upgrades: { nucleoDeSombra: 999 } });
    expect(r.foco).toBe(0);
    expect(r.rifts).toHaveLength(1);
    expect(r.rifts[0]!.power).toBeLessThanOrEqual(1);
    expect(r.upgrades.nucleoDeSombra).toBe(5);
  });
});
