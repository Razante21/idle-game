import styles from './Tabs.module.css';

interface Props<T extends string> {
  tabs: { id: T; label: string; badge?: number }[];
  active: T;
  onChange(id: T): void;
}

export function Tabs<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <div className={styles.tabs} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          className={active === t.id ? styles.active : styles.tab}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {!!t.badge && <span className={styles.badge}>{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}
