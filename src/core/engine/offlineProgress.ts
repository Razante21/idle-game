import { offlineCapSeconds } from '../cosmos/logic';
import { simulate, type SimResult, type SimState } from './simulate';

/** Limite padrão; a Cosmologia (Sono Profundo) pode aumentar. */
export const MAX_OFFLINE_SECONDS = 24 * 3600;

export interface OfflineReport {
  result: SimResult;
  elapsedSeconds: number;
}

export function applyOfflineProgress(state: SimState, savedAt: number, now: number): OfflineReport {
  const cap = offlineCapSeconds(state.meta.cosmos);
  const elapsedSeconds = Math.min(Math.max(0, (now - savedAt) / 1000), cap);
  return { result: simulate(state, elapsedSeconds), elapsedSeconds };
}
