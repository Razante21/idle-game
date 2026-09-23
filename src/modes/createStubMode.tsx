import { isModeUnlockedByTree } from '../core/skillTree/logic';
import type { GameMode, ModeId } from '../core/types';
import styles from './StubView.module.css';

export type StubState = Record<string, never>;

interface StubConfig {
  id: ModeId;
  name: string;
  icon: string;
  tagline: string;
  unlockDescription: string;
  plannedFeatures: string[];
}

export function createStubMode(config: StubConfig): GameMode<StubState> {
  function StubView() {
    return (
      <div className={styles.root}>
        <div className={styles.icon}>{config.icon}</div>
        <h2 className={styles.title}>{config.name}</h2>
        <p className={styles.tagline}>{config.tagline}</p>
        <div className={styles.badge}>Em construção</div>
        <ul className={styles.features}>
          {config.plannedFeatures.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
    );
  }

  return {
    id: config.id,
    name: config.name,
    icon: config.icon,
    tagline: config.tagline,
    initialState: {},
    isUnlocked: (meta) => isModeUnlockedByTree(meta.purchasedNodes, config.id),
    unlockDescription: config.unlockDescription,
    tick: (state) => state,
    essenceRate: () => 0,
    Component: StubView,
  };
}
