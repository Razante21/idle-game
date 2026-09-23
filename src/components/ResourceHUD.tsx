import { ACHIEVEMENTS } from '../core/achievements';
import { COLLAPSE_REQUIRED_NODE, canCollapse, collapseGain } from '../core/cosmos/logic';
import { formatNumber } from '../core/format';
import { MODES } from '../core/modeRegistry';
import { countAvailableNodes } from '../core/skillTree/logic';
import { useGameStore } from '../core/store/gameStore';
import styles from './ResourceHUD.module.css';

interface Props {
  onOpenTree(): void;
  onOpenAchievements(): void;
  onOpenMenu(): void;
  onOpenCollapse(): void;
}

export function ResourceHUD({ onOpenTree, onOpenAchievements, onOpenMenu, onOpenCollapse }: Props) {
  const meta = useGameStore((s) => s.meta);
  const rates = useGameStore((s) => s.essenceRates);
  const unlocked = MODES.filter((m) => m.isUnlocked(meta));
  const totalRate = unlocked.reduce((sum, m) => sum + rates[m.id], 0);
  const available = countAvailableNodes(meta, rates);
  const showCollapse = meta.cosmos.collapses > 0 || meta.purchasedNodes.includes(COLLAPSE_REQUIRED_NODE);

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
        {showCollapse && (
          <button className={styles.treeButton} onClick={onOpenCollapse} title="Colapso e Cosmologia">
            ✺ {meta.cosmos.singularities}
            {canCollapse(meta) && <span className={styles.badge}>+{collapseGain(meta.cosmos.runEssence)}</span>}
          </button>
        )}
        <button onClick={onOpenAchievements} title="Conquistas">
          ★ {meta.achievements.length}/{ACHIEVEMENTS.length}
        </button>
        <button className={styles.small} onClick={onOpenMenu}>
          ☰ Menu
        </button>
      </div>
    </header>
  );
}
