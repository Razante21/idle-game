import { useState } from 'react';
import { ACHIEVEMENTS } from '../core/achievements';
import { clearSave, exportSave, importSave, saveGame } from '../core/engine/persistence';
import { formatDuration, formatNumber } from '../core/format';
import { MODES } from '../core/modeRegistry';
import { useSettings } from '../core/settings';
import { SKILL_TREE } from '../core/skillTree/treeData';
import { useGameStore } from '../core/store/gameStore';
import type { BaseClickerState } from '../modes/baseClicker/logic';
import { UPGRADES } from '../modes/baseClicker/upgrades';
import { PATTERN_IDS, type GridState } from '../modes/grid/logic';
import type { ParallelTreeState } from '../modes/parallelTree/logic';
import type { ProductionChainState } from '../modes/productionChain/logic';
import { RELIC_IDS, type RoguelikeState } from '../modes/roguelike/logic';
import { Modal } from './Modal';
import { Tabs } from './Tabs';
import s from '../modes/shared.module.css';
import m from './MenuView.module.css';

type Tab = 'estatisticas' | 'config' | 'save';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={s.row}>
      <span className={s.muted}>{label}</span>
      <span className={s.value}>{value}</span>
    </div>
  );
}

function Stats() {
  const meta = useGameStore((st) => st.meta);
  const modes = useGameStore((st) => st.modes);
  const n = modes.baseClicker as BaseClickerState;
  const f = modes.productionChain as ProductionChainState;
  const g = modes.grid as GridState;
  const e = modes.roguelike as RoguelikeState;
  const a = modes.parallelTree as ParallelTreeState;
  const unlocked = MODES.filter((mode) => mode.isUnlocked(meta)).length;

  return (
    <div className={m.columns}>
      <section className={s.panel}>
        <h3 className={s.sectionTitle}>Rede</h3>
        <Stat label="Tempo de jogo" value={formatDuration(meta.playSeconds)} />
        <Stat label="Essência total" value={formatNumber(meta.totalEssence)} />
        <Stat label="Nós da Árvore" value={`${meta.purchasedNodes.length}/${SKILL_TREE.length}`} />
        <Stat label="Modos liberados" value={`${unlocked}/${MODES.length}`} />
        <Stat label="Conquistas" value={`${meta.achievements.length}/${ACHIEVEMENTS.length}`} />
      </section>
      <section className={s.panel}>
        <h3 className={s.sectionTitle}>◉ Núcleo</h3>
        <Stat label="Energia total" value={formatNumber(n.totalEnergy)} />
        <Stat label="Cliques" value={formatNumber(n.clicks)} />
        <Stat label="Melhorias" value={`${n.upgrades.length}/${UPGRADES.length}`} />
        <Stat label="Surtos capturados" value={n.surge.caught} />
        <Stat label="Sobrecargas / Carga" value={`${n.sobrecargas} / ${n.carga}`} />
      </section>
      <section className={s.panel}>
        <h3 className={s.sectionTitle}>⚙ Fábrica</h3>
        <Stat label="Máquinas" value={formatNumber(Math.floor(f.resources.maquina))} />
        <Stat label="Robôs" value={formatNumber(Math.floor(f.resources.robo))} />
        <Stat label="Operários" value={f.workers} />
        <Stat label="Contratos cumpridos" value={f.contractsDone} />
        <Stat label="Pesquisas" value={f.techs.length} />
      </section>
      <section className={s.panel}>
        <h3 className={s.sectionTitle}>✦ Constelação</h3>
        <Stat label="Grid" value={`${g.size}x${g.size}`} />
        <Stat label="Peças no céu" value={g.cells.filter(Boolean).length} />
        <Stat label="Padrões" value={`${g.patterns.length}/${PATTERN_IDS.length}`} />
      </section>
      <section className={s.panel}>
        <h3 className={s.sectionTitle}>⚔ Expedição</h3>
        <Stat label="Andar recorde" value={e.bestDepth} />
        <Stat label="Expedições" value={e.runs} />
        <Stat label="Chefes derrotados" value={e.bossesDefeated} />
        <Stat label="Relíquias" value={`${e.relics.length}/${RELIC_IDS.length}`} />
      </section>
      <section className={s.panel}>
        <h3 className={s.sectionTitle}>❖ Ascensão</h3>
        <Stat label="Éter total" value={formatNumber(a.totalEther)} />
        <Stat label="Caminhos escolhidos" value={a.nodes.length} />
      </section>
    </div>
  );
}

function Config() {
  const notation = useSettings((st) => st.notation);
  const set = useSettings((st) => st.set);
  return (
    <section className={s.panel}>
      <h3 className={s.sectionTitle}>Números grandes</h3>
      <div className={s.buttons}>
        <button aria-pressed={notation === 'sufixo'} className={notation === 'sufixo' ? s.primary : ''} onClick={() => set({ notation: 'sufixo' })}>
          Sufixos (1.50M)
        </button>
        <button
          aria-pressed={notation === 'cientifica'}
          className={notation === 'cientifica' ? s.primary : ''}
          onClick={() => set({ notation: 'cientifica' })}
        >
          Científica (1.50e6)
        </button>
      </div>
    </section>
  );
}

function SaveTab({ onReset }: { onReset(): void }) {
  const [exported, setExported] = useState('');
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState('');

  const doExport = () => {
    const text = exportSave(useGameStore.getState());
    setExported(text);
    navigator.clipboard?.writeText(text).then(
      () => setMessage('Save copiado para a área de transferência.'),
      () => setMessage('Copie o texto abaixo.'),
    );
  };

  const doImport = () => {
    const loaded = importSave(importText);
    if (!loaded) {
      setMessage('Esse texto não é um save válido.');
      return;
    }
    if (!window.confirm('Substituir o progresso atual pelo save importado?')) return;
    useGameStore.getState().hydrate(loaded.state);
    saveGame(useGameStore.getState());
    setImportText('');
    setMessage('Save importado.');
  };

  return (
    <div className={s.stack}>
      <section className={s.panel}>
        <h3 className={s.sectionTitle}>Salvar</h3>
        <p className={s.muted}>O jogo salva sozinho a cada 10 segundos e quando você fecha a aba.</p>
        <button
          onClick={() => {
            saveGame(useGameStore.getState());
            setMessage('Jogo salvo.');
          }}
        >
          Salvar agora
        </button>
      </section>
      <section className={s.panel}>
        <h3 className={s.sectionTitle}>Levar para outro aparelho</h3>
        <div className={s.buttons}>
          <button className={s.primary} onClick={doExport}>
            Exportar save
          </button>
        </div>
        {exported && <textarea className={m.textarea} readOnly value={exported} onFocus={(ev) => ev.currentTarget.select()} />}
        <textarea
          className={m.textarea}
          placeholder="Cole aqui um save exportado"
          value={importText}
          onChange={(ev) => setImportText(ev.target.value)}
        />
        <button disabled={!importText.trim()} onClick={doImport}>
          Importar save
        </button>
      </section>
      <section className={s.panel}>
        <h3 className={s.sectionTitle}>Recomeçar</h3>
        <p className={s.muted}>Apaga todo o progresso deste navegador.</p>
        <button className={m.danger} onClick={onReset}>
          Resetar tudo
        </button>
      </section>
      {message && <p className={s.good}>{message}</p>}
    </div>
  );
}

export function MenuView({ onClose }: { onClose(): void }) {
  const [tab, setTab] = useState<Tab>('estatisticas');

  const onReset = () => {
    if (!window.confirm('Apagar todo o progresso e começar do zero?')) return;
    clearSave();
    useGameStore.getState().reset();
    onClose();
  };

  return (
    <Modal title="Menu" onClose={onClose}>
      <Tabs<Tab>
        tabs={[
          { id: 'estatisticas', label: 'Estatísticas' },
          { id: 'config', label: 'Configurações' },
          { id: 'save', label: 'Save' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'estatisticas' && <Stats />}
      {tab === 'config' && <Config />}
      {tab === 'save' && <SaveTab onReset={onReset} />}
    </Modal>
  );
}
