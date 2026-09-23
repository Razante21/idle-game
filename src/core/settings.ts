import { create } from 'zustand';

export type Notation = 'sufixo' | 'cientifica';

export interface Settings {
  notation: Notation;
  sound: boolean;
}

const KEY = 'nexus-idle-settings';
const DEFAULTS: Settings = { notation: 'sufixo', sound: true };

function load(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>;
    return {
      notation: raw.notation === 'cientifica' ? 'cientifica' : 'sufixo',
      sound: raw.sound !== false,
    };
  } catch {
    return DEFAULTS;
  }
}

interface SettingsStore extends Settings {
  set(partial: Partial<Settings>): void;
}

/** Preferências de quem está jogando neste navegador (não fazem parte do save do jogo). */
export const useSettings = create<SettingsStore>()((set, get) => ({
  ...(typeof localStorage === 'undefined' ? DEFAULTS : load()),
  set(partial) {
    set(partial);
    try {
      const { notation, sound } = get();
      localStorage.setItem(KEY, JSON.stringify({ notation, sound }));
    } catch {
      // Armazenamento indisponível: a preferência vale só nesta sessão.
    }
  },
}));
