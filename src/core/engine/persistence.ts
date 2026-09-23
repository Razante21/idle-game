import { ACHIEVEMENT_IDS } from '../achievements';
import { restoreCosmos } from '../cosmos/logic';
import { MODES, isModeId } from '../modeRegistry';
import { NODES_BY_ID } from '../skillTree/treeData';
import type { MetaState, ModeStates } from '../types';
import type { SimState } from './simulate';

const STORAGE_KEY = 'nexus-idle-save';
export const SCHEMA_VERSION = 1;
const EXPORT_PREFIX = 'NEXUS1:';

export interface SaveData {
  schemaVersion: number;
  savedAt: number;
  meta: MetaState;
  modes: ModeStates;
}

export function serialize(state: SimState, now: number): SaveData {
  return { schemaVersion: SCHEMA_VERSION, savedAt: now, meta: state.meta, modes: state.modes };
}

/** JSON troca Infinity por null; guardamos o maior número finito para nunca zerar um valor que estourou. */
function toJson(data: SaveData): string {
  return JSON.stringify(data, (_, v) => (typeof v === 'number' && !Number.isFinite(v) && !Number.isNaN(v) ? Math.sign(v) * Number.MAX_VALUE : v));
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
    playSeconds: Math.max(0, finiteOr(rawMeta.playSeconds, 0)),
    cosmos: restoreCosmos(rawMeta.cosmos),
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
    localStorage.setItem(STORAGE_KEY, toJson(serialize(state, Date.now())));
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

/** Texto para copiar e colar em outro navegador ou aparelho. */
export function exportSave(state: SimState, now = Date.now()): string {
  const bytes = new TextEncoder().encode(toJson(serialize(state, now)));
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return EXPORT_PREFIX + btoa(binary);
}

export function importSave(text: string): { state: SimState; savedAt: number } | null {
  try {
    const body = text.trim().replace(EXPORT_PREFIX, '');
    const binary = atob(body);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return deserialize(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}
