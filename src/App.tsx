import { useCallback, useEffect, useMemo, useState } from 'react';
import { ModeSelectorBar } from './components/ModeSelectorBar';
import { ResourceHUD } from './components/ResourceHUD';
import { clearSave, saveGame } from './core/engine/persistence';
import { startTickLoop } from './core/engine/tickLoop';
import { formatDuration, formatNumber } from './core/format';
import { getMode } from './core/modeRegistry';
import { SkillTreeView } from './core/skillTree/SkillTreeView';
import { createModeContext } from './core/skillTree/logic';
import { useGameStore } from './core/store/gameStore';
import styles from './App.module.css';

const AUTOSAVE_MS = 10_000;

export interface WelcomeReport {
  elapsedSeconds: number;
  essenceGained: number;
}

function persistNow() {
  saveGame(useGameStore.getState());
}

export function App({ welcome }: { welcome: WelcomeReport | null }) {
  const [treeOpen, setTreeOpen] = useState(false);
  const [welcomeReport, setWelcomeReport] = useState(welcome);

  useEffect(() => {
    const stopLoop = startTickLoop((seconds) => useGameStore.getState().advance(seconds));
    const autosave = window.setInterval(persistNow, AUTOSAVE_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persistNow();
    };
    window.addEventListener('beforeunload', persistNow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopLoop();
      window.clearInterval(autosave);
      window.removeEventListener('beforeunload', persistNow);
      document.removeEventListener('visibilitychange', onVisibility);
      persistNow();
    };
  }, []);

  const activeId = useGameStore((s) => s.meta.activeModeId);
  const purchased = useGameStore((s) => s.meta.purchasedNodes);
  const modeState = useGameStore((s) => s.modes[activeId]);
  const essenceRate = useGameStore((s) => s.essenceRates[activeId]);
  const updateMode = useGameStore((s) => s.updateMode);

  const mode = getMode(activeId);
  const ctx = useMemo(() => createModeContext(purchased, activeId), [purchased, activeId]);
  const update = useCallback(
    (fn: (state: unknown) => unknown) => updateMode(activeId, fn),
    [updateMode, activeId],
  );

  const handleReset = () => {
    if (!window.confirm('Apagar todo o progresso e começar do zero?')) return;
    clearSave();
    useGameStore.getState().reset();
    setTreeOpen(false);
  };

  const ModeView = mode.Component;

  return (
    <div className={styles.app}>
      <ResourceHUD onOpenTree={() => setTreeOpen(true)} onSave={persistNow} onReset={handleReset} />

      <main className={styles.main}>
        <div className={styles.modeHeader}>
          <h1 className={styles.modeTitle}>
            <span className={styles.modeIcon}>{mode.icon}</span> {mode.name}
          </h1>
          <p className={styles.modeTagline}>{mode.tagline}</p>
        </div>
        <ModeView state={modeState} ctx={ctx} essenceRate={essenceRate} update={update} />
      </main>

      <ModeSelectorBar />

      {treeOpen && <SkillTreeView onClose={() => setTreeOpen(false)} />}

      {welcomeReport && (
        <div className={styles.welcomeBackdrop}>
          <div className={styles.welcome} role="dialog" aria-label="Bem-vindo de volta">
            <h2>Bem-vindo de volta</h2>
            <p>
              Você ficou fora por <strong>{formatDuration(welcomeReport.elapsedSeconds)}</strong>. A rede continuou
              trabalhando e gerou <strong className={styles.essence}>{formatNumber(welcomeReport.essenceGained)}</strong>{' '}
              Essência.
            </p>
            <button onClick={() => setWelcomeReport(null)}>Continuar</button>
          </div>
        </div>
      )}
    </div>
  );
}
