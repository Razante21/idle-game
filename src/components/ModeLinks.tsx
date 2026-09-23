import { formatNumber } from '../core/format';
import { getMultiplier } from '../core/skillTree/logic';
import type { MetaState, ModeBonus, ModeId, Stat } from '../core/types';
import styles from './ModeLinks.module.css';

const STAT_LABEL: Record<Stat, string> = {
  production: 'produção',
  click: 'clique',
  essence: 'Essência',
};

interface Props {
  modeId: ModeId;
  meta: MetaState;
  incoming: ModeBonus[];
}

/** Mostra de onde vêm os multiplicadores do modo ativo — a "ligação" entre os modos fica visível. */
export function ModeLinks({ modeId, meta, incoming }: Props) {
  const treeStats = (['production', 'click', 'essence'] as const)
    .map((stat) => ({ stat, value: getMultiplier(meta.purchasedNodes, modeId, stat) }))
    .filter((t) => t.value !== 1);

  if (incoming.length === 0 && treeStats.length === 0) return null;

  return (
    <div className={styles.links}>
      <span className={styles.title}>Ligações ativas</span>
      {treeStats.map((t) => (
        <span key={`tree-${t.stat}`} className={`${styles.chip} ${styles.tree}`}>
          Árvore: {STAT_LABEL[t.stat]} x{formatNumber(t.value)}
        </span>
      ))}
      {incoming.map((b, i) => (
        <span key={`${b.source}-${b.stat}-${i}`} className={styles.chip}>
          {b.source}: {STAT_LABEL[b.stat]} x{formatNumber(b.value)}
        </span>
      ))}
    </div>
  );
}
