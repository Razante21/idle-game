import { zeroRates } from '../modeRegistry';
import type { EssenceRates, MetaState, ModeContext, ModeId, ModeStates } from '../types';
import { buildContexts, unlockedModes } from './contexts';

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

function ratesFrom(state: SimState, contexts: Record<ModeId, ModeContext>): EssenceRates {
  const rates = zeroRates();
  for (const mode of unlockedModes(state.meta)) {
    const ctx = contexts[mode.id];
    rates[mode.id] = mode.essenceRate(state.modes[mode.id], ctx) * ctx.multiplier('essence');
  }
  return rates;
}

/** Calcula as taxas atuais; roda duas vezes porque modos como a Ascensão leem as taxas dos outros. */
export function computeEssenceRates(state: SimState, previous: EssenceRates = zeroRates()): EssenceRates {
  const first = ratesFrom(state, buildContexts(state.meta, state.modes, previous));
  return ratesFrom(state, buildContexts(state.meta, state.modes, first));
}

/**
 * Avança todos os modos desbloqueados em paralelo. Os bônus entre modos são recalculados a cada passo;
 * intervalos longos (aba em segundo plano, progresso offline) usam no máximo MAX_STEPS passos.
 */
export function simulate(
  state: SimState,
  seconds: number,
  previousRates?: EssenceRates,
  maxStepSeconds = MAX_STEP_SECONDS,
): SimResult {
  const active = unlockedModes(state.meta);
  let modes = { ...state.modes };
  let rates = previousRates ?? computeEssenceRates(state);
  let gained = 0;

  if (seconds > 0) {
    const steps = Math.min(Math.max(1, Math.ceil(seconds / maxStepSeconds)), MAX_STEPS);
    const dt = seconds / steps;
    for (let i = 0; i < steps; i++) {
      const contexts = buildContexts(state.meta, modes, rates);
      const nextModes = { ...modes };
      const nextRates = zeroRates();
      for (const mode of active) {
        const ctx = contexts[mode.id];
        nextModes[mode.id] = mode.tick(modes[mode.id], dt, ctx);
        nextRates[mode.id] = mode.essenceRate(nextModes[mode.id], ctx) * ctx.multiplier('essence');
        gained += nextRates[mode.id] * dt;
      }
      modes = nextModes;
      rates = nextRates;
    }
  }

  const next: SimState = {
    meta: {
      ...state.meta,
      essence: state.meta.essence + gained,
      totalEssence: state.meta.totalEssence + gained,
      playSeconds: state.meta.playSeconds + Math.max(0, seconds),
    },
    modes,
  };
  return { ...next, essenceRates: computeEssenceRates(next, rates), essenceGained: gained };
}
