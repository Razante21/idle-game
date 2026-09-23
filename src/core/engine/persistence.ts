import { ACHIEVEMENT_IDS } from '../achievements';
import { MODES, isModeId } from '../modeRegistry';
import { NODES_BY_ID } from '../skillTree/treeData';
import type { MetaState, ModeStates } from '../types';
import type { SimState } from './simulate';

const STORAGE_KEY = 'nexus-idle-save';
export const SCHEMA_VERSION = 1;

export interface SaveData {
  schemaVersion: number;
  savedAt: number;
  meta: MetaState;
  modes: ModeStates;
}

export function serialize(state: SimState, now: number): SaveData {
  return { schemaVersion: SCHEMA_VERSION, savedAt: now, meta: state.meta, modes: state.modes };
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function deserialize(raw: unknown): { state: SimState; savedAt: number } | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const data = raw as Partial<SaveData>;
  if (data.schemaVersion !== SCHEMA_VERSION) return null;

  const rawMeta = (data.meta ?? {}) as Partial<MetaState>;
  const purchasedNodes = Array.isArray(rawMeta.purchasedNodes)
    ? rawMeta.purchasedNodes.filter((id): id is string => typeof id === 'string' && NODES_BY_ID.has(id))
    : [];
  const meta: MetaState = {
    essence: finiteOr(rawMeta.essence, 0),
    totalEssence: finiteOr(rawMeta.totalEssence, 0),
    purchasedNodes,
    activeModeId: 'baseClicker',
    achievements: Array.isArray(rawMeta.achievements)
      ? [...new Set(rawMeta.achievements.filter((id): id is string => typeof id === 'string' && ACHIEVEMENT_IDS.has(id)))]
      : [],
  };
  if (isModeId(rawMeta.activeModeId) && MODES.some((m) => m.id === rawMeta.activeModeId && m.isUnlocked(meta))) {
    meta.activeModeId = rawMeta.activeModeId;
  }

  const savedModes = (data.modes ?? {}) as Partial<ModeStates>;
  const modes = Object.fromEntries(
    MODES.map((m) => {
      const saved = savedModes[m.id];
      if (saved === undefined) return [m.id, m.initialState];
      if (m.restore) return [m.id, m.restore(saved)];
      return [m.id, { ...m.initialState, ...(saved as object) }];
    }),
  ) as ModeStates;

  return { state: { meta, modes }, savedAt: finiteOr(data.savedAt, Date.now()) };
}

export function saveGame(state: SimState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize(state, Date.now())));
  } catch {
    // Armazenamento indisponível (modo privado, cota cheia): o jogo segue sem salvar.
  }
}

export function loadGame(): { state: SimState; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? deserialize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorado
  }
}
