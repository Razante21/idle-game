import { simulate, type SimResult, type SimState } from './simulate';

export const MAX_OFFLINE_SECONDS = 24 * 3600;

export interface OfflineReport {
  result: SimResult;
  elapsedSeconds: number;
}

export function applyOfflineProgress(state: SimState, savedAt: number, now: number): OfflineReport {
  const elapsedSeconds = Math.min(Math.max(0, (now - savedAt) / 1000), MAX_OFFLINE_SECONDS);
  return { result: simulate(state, elapsedSeconds), elapsedSeconds };
}
