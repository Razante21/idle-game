import { baseClickerMode } from '../modes/baseClicker';
import { colonyMode } from '../modes/colony';
import { gardenMode } from '../modes/garden';
import { vazioMode } from '../modes/vazio';
import { gridMode } from '../modes/grid';
import { parallelTreeMode } from '../modes/parallelTree';
import { productionChainMode } from '../modes/productionChain';
import { roguelikeMode } from '../modes/roguelike';
import type { EssenceRates, GameMode, ModeId, ModeStates } from './types';

// `any` é necessário aqui: cada modo tem seu próprio tipo de estado, e o core só os trata de forma opaca.
export type AnyGameMode = GameMode<any>;

export const MODES: readonly AnyGameMode[] = [
  baseClickerMode,
  productionChainMode,
  gridMode,
  roguelikeMode,
  parallelTreeMode,
  gardenMode,
  colonyMode,
  vazioMode,
];

const MODES_BY_ID = new Map<ModeId, AnyGameMode>(MODES.map((m) => [m.id, m]));

export function getMode(id: ModeId): AnyGameMode {
  const mode = MODES_BY_ID.get(id);
  if (!mode) throw new Error(`Modo desconhecido: ${id}`);
  return mode;
}

export function isModeId(value: unknown): value is ModeId {
  return typeof value === 'string' && MODES_BY_ID.has(value as ModeId);
}

export function initialModeStates(): ModeStates {
  return Object.fromEntries(MODES.map((m) => [m.id, m.initialState])) as ModeStates;
}

export function zeroRates(): EssenceRates {
  return Object.fromEntries(MODES.map((m) => [m.id, 0])) as EssenceRates;
}
