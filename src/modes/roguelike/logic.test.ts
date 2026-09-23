import { describe, expect, it } from 'vitest';
import { makeCtx } from '../../test/makeCtx';
import {
  RELIC_IDS,
  autoPick,
  biomeAt,
  buyShopItem,
  buyUpgrade,
  choose,
  endRun,
  enemyStrength,
  initialRoguelikeState,
  leaveShop,
  provides,
  restore,
  runReward,
  startRun,
  tick,
  toggleCurse,
  unlockClass,
  type RoguelikeState,
  type Run,
} from './logic';

const ctx = makeCtx();

function makeRun(run: Partial<Run> = {}): Run {
  return {
    depth: 0,
    hp: 20,
    maxHp: 20,
    power: 5,
    gold: 0,
    options: ['tesouro'],
    revived: false,
    classId: 'guerreiro',
    curses: [],
    shopOpen: false,
    auto: false,
    iron: false,
    ...run,
  };
}

function withRun(run: Partial<Run>, extra: Partial<RoguelikeState> = {}): RoguelikeState {
  return { ...initialRoguelikeState, ...extra, run: makeRun(run) };
}

describe('roguelike runs', () => {
  it('starts a run with stats from class, upgrades and multipliers', () => {
    const base = { ...initialRoguelikeState, upgrades: { ...initialRoguelikeState.upgrades, vigor: 2, forca: 1 } };
    const warrior = startRun(base, makeCtx({ mult: { production: 2 } }));
    expect(warrior.run?.maxHp).toBe(60);
    expect(warrior.run?.power).toBe(14);
    expect(warrior.run?.options).toHaveLength(3);
    const rogue = startRun({ ...base, classes: ['guerreiro', 'ladino'], selectedClass: 'ladino' }, ctx);
    expect(rogue.run?.maxHp).toBe(40);
    expect(rogue.run?.options).toHaveLength(4);
  });

  it('is deterministic for the same seed', () => {
    const a = choose(startRun(initialRoguelikeState, ctx), 0, ctx);
    const b = choose(startRun(initialRoguelikeState, ctx), 0, ctx);
    expect(a).toEqual(b);
  });

  it('advances depth, records best and puts a boss on every 5th floor', () => {
    const state = choose(withRun({ depth: 3 }), 0, ctx);
    expect(state.run?.depth).toBe(4);
    expect(state.bestDepth).toBe(4);
    expect(state.run?.options).toEqual(['chefe']);
  });

  it('biomes change every 10 floors and scale enemies', () => {
    expect(biomeAt(10).name).toBe('Cavernas');
    expect(biomeAt(11).name).toBe('Floresta Sombria');
    expect(enemyStrength(11)).toBeCloseTo(4 * 1.24 ** 11 * 1.1);
    expect(enemyStrength(5, ['furia'])).toBeCloseTo(enemyStrength(5) * 1.4);
  });

  it('named biome bosses always drop a relic when they are beaten', () => {
    const state = choose(withRun({ depth: 9, hp: 1e6, maxHp: 1e6, power: 1e6, options: ['chefe'] }), 0, ctx);
    expect(state.relics).toHaveLength(1);
    expect(state.bossesDefeated).toBe(1);
  });

  it('ends the run on death and keeps only the depth reward', () => {
    const state = choose(withRun({ depth: 8, hp: 1, gold: 500, options: ['combate'] }), 0, ctx);
    expect(state.run).toBeNull();
    expect(state.fragments).toBe(27);
  });

  it('Fênix revives once', () => {
    const state = choose(withRun({ depth: 8, hp: 1, options: ['combate'] }), 0, makeCtx({ flags: ['expedicao.segundaChance'] }));
    expect(state.run?.revived).toBe(true);
    expect(state.run?.hp).toBe(10);
  });

  it('curses raise the reward, auto-explore lowers it', () => {
    expect(runReward(makeRun({ depth: 4, gold: 95 }), true, ctx)).toBe(17);
    expect(runReward(makeRun({ depth: 4, gold: 95, curses: ['furia', 'fome'] }), true, ctx)).toBe(27);
    expect(runReward(makeRun({ depth: 4, gold: 95, curses: ['furia'] }), true, makeCtx({ flags: ['expedicao.maldicaoLeve'] }))).toBe(25);
    expect(runReward(makeRun({ depth: 4, gold: 95, auto: true }), true, ctx)).toBe(11);
    expect(endRun(withRun({ depth: 4, gold: 95 }), true, ctx).fragments).toBe(17);
  });
});

describe('roguelike shop, classes and upgrades', () => {
  it('shop sells items for run gold and then continues', () => {
    let state = withRun({ depth: 3, gold: 200, hp: 5, shopOpen: true, options: [] });
    state = buyShopItem(state, 'pocao', ctx);
    expect(state.run?.hp).toBe(15);
    expect(state.run?.gold).toBe(155);
    expect(choose(state, 0, ctx)).toBe(state);
    state = leaveShop(state);
    expect(state.run?.shopOpen).toBe(false);
    expect(state.run?.options.length).toBeGreaterThan(0);
    const cheap = buyShopItem(withRun({ depth: 3, gold: 200, shopOpen: true }), 'lamina', makeCtx({ flags: ['expedicao.lojaDesconto'] }));
    expect(cheap.run?.gold).toBe(200 - 38);
  });

  it('classes are unlocked with fragments', () => {
    const rich = { ...initialRoguelikeState, fragments: 100 };
    const mage = unlockClass(rich, 'mago');
    expect(mage.classes).toContain('mago');
    expect(mage.selectedClass).toBe('mago');
    expect(mage.fragments).toBe(70);
    expect(unlockClass(mage, 'mago')).toBe(mage);
  });

  it('curses toggle on and off', () => {
    const on = toggleCurse(initialRoguelikeState, 'fragil');
    expect(on.selectedCurses).toEqual(['fragil']);
    expect(toggleCurse(on, 'fragil').selectedCurses).toEqual([]);
  });

  it('auto-explore needs the Batedor upgrade or the Andarilho rule, and skips curses', () => {
    const on = { ...initialRoguelikeState, autoEnabled: true, selectedCurses: ['furia' as const] };
    expect(tick(on, 10, ctx)).toBe(on);
    const scouted = tick({ ...on, upgrades: { ...on.upgrades, auto: 1 } }, 1.6, ctx);
    expect(scouted.run?.auto).toBe(true);
    expect(scouted.run?.curses).toEqual([]);
    expect(tick(on, 10, makeCtx({ flags: ['expedicao.autoGratis'] })).log.length).toBeGreaterThan(0);
  });

  it('auto-pick rests when hurt and retreats before dying', () => {
    expect(autoPick(makeRun({ hp: 5, options: ['combate', 'descanso'] }))).toBe(1);
    expect(autoPick(makeRun({ hp: 4, options: ['combate'] }))).toBe('retreat');
  });

  it('buys upgrades up to their max', () => {
    const once = buyUpgrade({ ...initialRoguelikeState, fragments: 1000 }, 'auto');
    expect(once.upgrades.auto).toBe(1);
    expect(buyUpgrade(once, 'auto')).toBe(once);
  });

  it('14 relics link to other modes', () => {
    expect(RELIC_IDS).toHaveLength(14);
    const bonuses = provides({ ...initialRoguelikeState, relics: ['coracao', 'anel'], bestDepth: 10 });
    expect(bonuses).toContainEqual(expect.objectContaining({ target: 'baseClicker', stat: 'production', value: 2 }));
    expect(bonuses).toContainEqual(expect.objectContaining({ target: 'baseClicker', stat: 'click', value: 3 }));
    expect(bonuses).toContainEqual(expect.objectContaining({ target: 'grid', value: 1.2 }));
  });

  it('restore upgrades old saves and discards broken runs', () => {
    const restored = restore({ relics: ['coracao', 'fake'], run: { hp: 5, options: ['lixo'] }, upgrades: { vigor: 2 } });
    expect(restored.relics).toEqual(['coracao']);
    expect(restored.run).toBeNull();
    expect(restored.classes).toEqual(['guerreiro']);
    expect(restored.upgrades.ganancia).toBe(0);
    const old = restore({ run: { hp: 5, maxHp: 20, power: 5, depth: 2, gold: 0, options: ['combate'] } });
    expect(old.run?.classId).toBe('guerreiro');
    expect(old.run?.shopOpen).toBe(false);
  });
});
