import { formatNumber } from '../core/format';
import { MODES } from '../core/modeRegistry';
import { useGameStore } from '../core/store/gameStore';
import styles from './ModeSelectorBar.module.css';

function LockIcon() {
  return (
    <svg width="18" height="20" viewBox="0 0 18 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="2" y="9" width="14" height="10" rx="2" />
      <path d="M5 9V6a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function ModeSelectorBar() {
  const meta = useGameStore((s) => s.meta);
  const rates = useGameStore((s) => s.essenceRates);
  const setActiveMode = useGameStore((s) => s.setActiveMode);

  return (
    <nav className={styles.bar} aria-label="Modos de jogo">
      {MODES.map((mode) => {
        const unlocked = mode.isUnlocked(meta);
        const active = meta.activeModeId === mode.id;
        const className = [styles.mode, active && styles.active, !unlocked && styles.locked]
          .filter(Boolean)
          .join(' ');
        return (
          <button
            key={mode.id}
            className={className}
            onClick={() => unlocked && setActiveMode(mode.id)}
            aria-disabled={!unlocked}
            aria-current={active ? 'page' : undefined}
            title={unlocked ? mode.tagline : mode.unlockDescription}
          >
            <span className={styles.icon}>{unlocked ? mode.icon : <LockIcon />}</span>
            <span className={styles.name}>{mode.name}</span>
            <span className={styles.detail}>
              {unlocked ? `${formatNumber(rates[mode.id])}/s` : 'Bloqueado'}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
