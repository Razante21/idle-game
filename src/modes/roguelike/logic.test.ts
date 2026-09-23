import { describe, expect, it } from 'vitest';
import { makeCtx } from '../../test/makeCtx';
import {
  autoPick,
  buyUpgrade,
  choose,
  endRun,
  initialRoguelikeState,
  provides,
  restore,
  startRun,
  tick,
  type RoguelikeState,
  type Run,
} from './logic';

const ctx = makeCtx();

function withRun(run: Partial<Run>, extra: Partial<RoguelikeState> = {}): RoguelikeState {
  return {
    ...initialRoguelikeState,
    ...extra,
    run: { depth: 0, hp: 20, maxHp: 20, power: 5, gold: 0, options: ['tesouro'], revived: false, ...run },
  };
}

describe('roguelike logic', () => {
  it('starts a run with stats from upgrades and multipliers', () => {
    const state = startRun({ ...initialRoguelikeState, upgrades: { vigor: 2, forca: 1, sorte: 0, auto: 0 } }, makeCtx({ mult: { production: 2 } }));
    expect(state.run?.maxHp).toBe(40);
    expect(state.run?.power).toBe(14);
    expect(state.run?.options).toHaveLength(3);
  });

  it('is deterministic for the same seed', () => {
    const a = choose(startRun(initialRoguelikeState, ctx), 0, ctx);
    const b = choose(startRun(initialRoguelikeState, ctx), 0, ctx);
    expect(a).toEqual(b);
    expect(a.seed).not.toBe(initialRoguelikeState.seed);
  });

  it('advances depth, records best and puts a boss on every 5th floor', () => {
    const state = choose(withRun({ depth: 3, options: ['tesouro'] }), 0, ctx);
    expect(state.run?.depth).toBe(4);
    expect(state.bestDepth).toBe(4);
    expect(state.run?.gold).toBeGreaterThan(0);
    expect(state.run?.options).toEqual(['chefe']);
  });

  it('ends the run on death and keeps only the depth reward', () => {
    const state = choose(withRun({ depth: 8, hp: 1, gold: 500, options: ['combate'] }), 0, ctx);
    expect(state.run).toBeNull();
    expect(state.fragments).toBe(27);
    expect(state.runs).toBe(1);
  });

  it('Fênix revives once', () => {
    const phoenix = makeCtx({ flags: ['expedicao.segundaChance'] });
    const state = choose(withRun({ depth: 8, hp: 1, options: ['combate'] }), 0, phoenix);
    expect(state.run?.revived).toBe(true);
    expect(state.run?.hp).toBe(10);
  });

  it('returning converts gold into fragments', () => {
    const state = endRun(withRun({ depth: 4, gold: 95 }), true);
    expect(state.fragments).toBe(8 + 9);
  });

  it('auto-explore needs the Batedor upgrade or the Andarilho rule', () => {
    const on = { ...initialRoguelikeState, autoEnabled: true };
    expect(tick(on, 10, ctx)).toBe(on);
    const scouted = tick({ ...on, upgrades: { ...on.upgrades, auto: 1 } }, 10, ctx);
    expect(scouted.run !== null || scouted.runs > 0).toBe(true);
    const free = tick(on, 10, makeCtx({ flags: ['expedicao.autoGratis'] }));
    expect(free.log.length).toBeGreaterThan(0);
  });

  it('auto-pick rests when hurt and retreats before dying', () => {
    expect(autoPick({ depth: 1, hp: 5, maxHp: 20, power: 5, gold: 0, options: ['combate', 'descanso'], revived: false })).toBe(1);
    expect(autoPick({ depth: 1, hp: 4, maxHp: 20, power: 5, gold: 0, options: ['combate'], revived: false })).toBe('retreat');
  });

  it('buys upgrades up to their max', () => {
    const rich = { ...initialRoguelikeState, fragments: 1000 };
    const once = buyUpgrade(rich, 'auto');
    expect(once.upgrades.auto).toBe(1);
    expect(buyUpgrade(once, 'auto')).toBe(once);
  });

  it('relics and best depth link to other modes', () => {
    const bonuses = provides({ ...initialRoguelikeState, relics: ['coracao'], bestDepth: 10 });
    expect(bonuses).toContainEqual(expect.objectContaining({ target: 'baseClicker', value: 2 }));
    expect(bonuses).toContainEqual(expect.objectContaining({ target: 'grid', value: 1.2 }));
  });

  it('restore discards broken runs and unknown relics', () => {
    const restored = restore({ relics: ['coracao', 'fake'], run: { hp: 5, options: ['lixo'] } });
    expect(restored.relics).toEqual(['coracao']);
    expect(restored.run).toBeNull();
  });
});
