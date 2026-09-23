import { useCallback, useEffect, useMemo, useState } from 'react';
import { AchievementsView } from './components/AchievementsView';
import { MenuView } from './components/MenuView';
import { CollapseView } from './components/CollapseView';
import { ANOMALIES } from './core/cosmos/data';
import { ModeLinks } from './components/ModeLinks';
import { ModeSelectorBar } from './components/ModeSelectorBar';
import { ResourceHUD } from './components/ResourceHUD';
import { ACHIEVEMENTS } from './core/achievements';
import { bonusesFor, buildContexts, collectBonuses } from './core/engine/contexts';
import { saveGame } from './core/engine/persistence';
import { startTickLoop } from './core/engine/tickLoop';
import { formatDuration, formatNumber } from './core/format';
import { getMode } from './core/modeRegistry';
import { SkillTreeView } from './core/skillTree/SkillTreeView';
import { useGameStore } from './core/store/gameStore';
import styles from './App.module.css';

const AUTOSAVE_MS = 10_000;
const TOAST_MS = 3_500;

export interface WelcomeReport {
  elapsedSeconds: number;
  essenceGained: number;
}

function persistNow() {
  saveGame(useGameStore.getState());
}

export function App({ welcome }: { welcome: WelcomeReport | null }) {
  const [treeOpen, setTreeOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapseOpen, setCollapseOpen] = useState(false);
  const [welcomeReport, setWelcomeReport] = useState(welcome);
  const toastId = useGameStore((s) => s.toasts[0]);
  const toast = toastId ? ACHIEVEMENTS.find((x) => x.id === toastId) : undefined;

  useEffect(() => {
    if (!toastId) return;
    const timer = window.setTimeout(() => useGameStore.getState().dismissToast(), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toastId]);

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

  const meta = useGameStore((s) => s.meta);
  const modes = useGameStore((s) => s.modes);
  const rates = useGameStore((s) => s.essenceRates);
  const updateMode = useGameStore((s) => s.updateMode);

  const activeId = meta.activeModeId;
  const mode = getMode(activeId);
  const ctx = useMemo(() => buildContexts(meta, modes, rates)[activeId], [meta, modes, rates, activeId]);
  const incoming = useMemo(() => bonusesFor(collectBonuses(meta, modes), activeId), [meta, modes, activeId]);
  const update = useCallback(
    (fn: (state: unknown) => unknown) => updateMode(activeId, fn),
    [updateMode, activeId],
  );

  const ModeView = mode.Component;

  return (
    <div className={styles.app}>
      <ResourceHUD
        onOpenTree={() => setTreeOpen(true)}
        onOpenAchievements={() => setAchievementsOpen(true)}
        onOpenMenu={() => setMenuOpen(true)}
        onOpenCollapse={() => setCollapseOpen(true)}
      />

      <main className={styles.main}>
        {meta.cosmos.anomaly && (
          <div className={styles.anomaly} role="status">
            <span>
              <strong>Anomalia: {ANOMALIES[meta.cosmos.anomaly].name}</strong> · {ANOMALIES[meta.cosmos.anomaly].rule}. Vença
              comprando o Portal da Expedição.
            </span>
            <button
              onClick={() => {
                if (window.confirm('Abandonar a Anomalia? O ciclo continua sem a regra e sem a recompensa.')) {
                  useGameStore.getState().abandonAnomaly();
                }
              }}
            >
              Abandonar
            </button>
          </div>
        )}
        <div className={styles.modeHeader}>
          <h1 className={styles.modeTitle}>
            <span className={styles.modeIcon}>{mode.icon}</span> {mode.name}
          </h1>
          <p className={styles.modeTagline}>{mode.tagline}</p>
          <ModeLinks modeId={activeId} meta={meta} incoming={incoming} />
        </div>
        <ModeView state={modes[activeId]} ctx={ctx} essenceRate={rates[activeId]} update={update} />
      </main>

      <ModeSelectorBar />

      {treeOpen && <SkillTreeView onClose={() => setTreeOpen(false)} />}
      {achievementsOpen && <AchievementsView onClose={() => setAchievementsOpen(false)} />}
      {menuOpen && <MenuView onClose={() => setMenuOpen(false)} />}
      {collapseOpen && <CollapseView onClose={() => setCollapseOpen(false)} />}

      {toast && (
        <div className={styles.toast} role="status">
          <span className={styles.toastLabel}>★ Conquista</span>
          <strong>{toast.name}</strong>
          <span className={styles.toastDesc}>{toast.description} · +2% Essência</span>
        </div>
      )}

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
