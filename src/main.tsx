import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, type WelcomeReport } from './App';
import { applyOfflineProgress } from './core/engine/offlineProgress';
import { loadGame } from './core/engine/persistence';
import { useGameStore } from './core/store/gameStore';
import './global.css';

const MIN_OFFLINE_REPORT_SECONDS = 60;

function bootstrap(): WelcomeReport | null {
  const saved = loadGame();
  if (!saved) return null;
  const { result, elapsedSeconds } = applyOfflineProgress(saved.state, saved.savedAt, Date.now());
  useGameStore.getState().hydrate({ meta: result.meta, modes: result.modes });
  if (elapsedSeconds < MIN_OFFLINE_REPORT_SECONDS) return null;
  return { elapsedSeconds, essenceGained: result.essenceGained };
}

const welcome = bootstrap();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App welcome={welcome} />
  </StrictMode>,
);
