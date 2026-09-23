import { ACHIEVEMENTS, ACHIEVEMENT_BONUS, type AchievementCategory } from '../core/achievements';
import { useGameStore } from '../core/store/gameStore';
import styles from './AchievementsView.module.css';

const CATEGORIES: AchievementCategory[] = ['Núcleo', 'Fábrica', 'Constelação', 'Expedição', 'Ascensão', 'Rede'];

export function AchievementsView({ onClose }: { onClose(): void }) {
  const done = new Set(useGameStore((s) => s.meta.achievements));

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Conquistas">
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>
              Conquistas {done.size}/{ACHIEVEMENTS.length}
            </h2>
            <p className={styles.subtitle}>
              Cada conquista dá +{Math.round(ACHIEVEMENT_BONUS * 100)}% de Essência em todos os modos (agora +
              {Math.round(done.size * ACHIEVEMENT_BONUS * 100)}%).
            </p>
          </div>
          <button onClick={onClose}>Fechar</button>
        </header>
        <div className={styles.body}>
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
        </div>
      </div>
    </div>
  );
}
