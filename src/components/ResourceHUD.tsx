import { formatNumber } from '../core/format';
import { MODES } from '../core/modeRegistry';
import { countAvailableNodes } from '../core/skillTree/logic';
import { useGameStore } from '../core/store/gameStore';
import styles from './ResourceHUD.module.css';

interface Props {
  onOpenTree(): void;
  onSave(): void;
  onReset(): void;
}

export function ResourceHUD({ onOpenTree, onSave, onReset }: Props) {
  const meta = useGameStore((s) => s.meta);
  const rates = useGameStore((s) => s.essenceRates);
  const unlocked = MODES.filter((m) => m.isUnlocked(meta));
  const totalRate = unlocked.reduce((sum, m) => sum + rates[m.id], 0);
  const available = countAvailableNodes(meta, rates);

  return (
    <header className={styles.hud}>
      <div className={styles.brand}>Nexus Idle</div>

      <div className={styles.essence}>
        <div className={styles.essenceValue}>
          <span className={styles.essenceLabel}>Essência</span>
          <strong>{formatNumber(meta.essence)}</strong>
          <span className={styles.rate}>+{formatNumber(totalRate)}/s</span>
        </div>
        <div className={styles.sources}>
          {unlocked.map((m) => (
            <span key={m.id} className={styles.source} title={`Essência gerada por ${m.name}`}>
              {m.icon} {formatNumber(rates[m.id])}/s
            </span>
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.treeButton} onClick={onOpenTree}>
          Árvore
          {available > 0 && <span className={styles.badge}>{available}</span>}
        </button>
        <button className={styles.small} onClick={onSave}>
          Salvar
        </button>
        <button className={styles.small} onClick={onReset}>
          Resetar
        </button>
      </div>
    </header>
  );
}
