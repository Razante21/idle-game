import { MODES, zeroRates } from '../modeRegistry';
import { createModeContext } from '../skillTree/logic';
import type { EssenceRates, MetaState, ModeStates } from '../types';

export interface SimState {
  meta: MetaState;
  modes: ModeStates;
}

export interface SimResult extends SimState {
  essenceRates: EssenceRates;
  essenceGained: number;
}

const MAX_STEP_SECONDS = 0.1;
const MAX_STEPS = 2000;

function activeModes(meta: MetaState) {
  return MODES.filter((m) => m.isUnlocked(meta)).map((mode) => ({
    mode,
    ctx: createModeContext(meta.purchasedNodes, mode.id),
  }));
}

export function computeEssenceRates(state: SimState): EssenceRates {
  const rates = zeroRates();
  for (const { mode, ctx } of activeModes(state.meta)) {
    rates[mode.id] = mode.essenceRate(state.modes[mode.id], ctx) * ctx.multiplier('essence');
  }
  return rates;
}

/**
 * Avança todos os modos desbloqueados em paralelo. Intervalos longos (aba em segundo plano,
 * progresso offline) são divididos em no máximo MAX_STEPS passos para manter o custo limitado.
 */
export function simulate(state: SimState, seconds: number): SimResult {
  const active = activeModes(state.meta);
  const modes = { ...state.modes };
  let gained = 0;

  if (seconds > 0) {
    const steps = Math.min(Math.max(1, Math.ceil(seconds / MAX_STEP_SECONDS)), MAX_STEPS);
    const dt = seconds / steps;
    for (let i = 0; i < steps; i++) {
      for (const { mode, ctx } of active) {
        modes[mode.id] = mode.tick(modes[mode.id], dt, ctx);
        gained += mode.essenceRate(modes[mode.id], ctx) * ctx.multiplier('essence') * dt;
      }
    }
  }

  const next: SimState = {
    meta: {
      ...state.meta,
      essence: state.meta.essence + gained,
      totalEssence: state.meta.totalEssence + gained,
    },
    modes,
  };
  return { ...next, essenceRates: computeEssenceRates(next), essenceGained: gained };
}
