import { ACHIEVEMENTS, ACHIEVEMENT_BONUS, type AchievementCategory } from '../core/achievements';
import { useGameStore } from '../core/store/gameStore';
import { Modal } from './Modal';
import styles from './AchievementsView.module.css';

const CATEGORIES: AchievementCategory[] = [
  'Núcleo',
  'Fábrica',
  'Constelação',
  'Expedição',
  'Ascensão',
  'Jardim',
  'Colônia',
  'Vazio',
  'Rede',
  'Cosmos',
];

export function AchievementsView({ onClose }: { onClose(): void }) {
  const done = new Set(useGameStore((s) => s.meta.achievements));
  const pct = (n: number) => Math.round(n * ACHIEVEMENT_BONUS * 100);

  return (
    <Modal
      title={`Conquistas ${done.size}/${ACHIEVEMENTS.length}`}
      subtitle={`Cada conquista dá +${pct(1)}% de Essência em todos os modos (agora +${pct(done.size)}%).`}
      onClose={onClose}
    >
      {CATEGORIES.map((cat) => {
        const list = ACHIEVEMENTS.filter((x) => x.category === cat);
        return (
          <section key={cat}>
            <h3 className={styles.category}>
              {cat} · {list.filter((x) => done.has(x.id)).length}/{list.length}
            </h3>
            <div className={styles.grid}>
              {list.map((x) => (
                <div key={x.id} className={done.has(x.id) ? styles.done : styles.todo}>
                  <span className={styles.name}>{x.name}</span>
                  <span className={styles.desc}>{x.description}</span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </Modal>
  );
}
