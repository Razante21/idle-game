import { ANOMALY_IDS, COSMOLOGY } from './cosmos/data';
import type { SimState } from './engine/simulate';
import { SKILL_TREE } from './skillTree/treeData';
import type { ModeId } from './types';
import type { BaseClickerState } from '../modes/baseClicker/logic';
import type { ColonyState } from '../modes/colony/logic';
import { LAW_IDS } from '../modes/colony/logic';
import type { GardenState } from '../modes/garden/logic';
import { SPECIES_IDS } from '../modes/garden/logic';
import type { VazioState } from '../modes/vazio/logic';
import { VAZIO_UPGRADE_IDS } from '../modes/vazio/logic';
import { GENERATORS, UPGRADES } from '../modes/baseClicker/upgrades';
import type { GridState } from '../modes/grid/logic';
import { MAX_LEVEL, MAX_SIZE, PATTERN_IDS } from '../modes/grid/logic';
import type { ParallelTreeState } from '../modes/parallelTree/logic';
import type { ProductionChainState } from '../modes/productionChain/logic';
import { TECH_IDS } from '../modes/productionChain/logic';
import type { RoguelikeState } from '../modes/roguelike/logic';
import { CLASS_IDS, RELIC_IDS } from '../modes/roguelike/logic';

export type AchievementCategory =
  | 'Núcleo'
  | 'Fábrica'
  | 'Constelação'
  | 'Expedição'
  | 'Ascensão'
  | 'Jardim'
  | 'Colônia'
  | 'Vazio'
  | 'Rede'
  | 'Cosmos';

export interface Achievement {
  id: string;
  category: AchievementCategory;
  name: string;
  description: string;
  check(s: SimState): boolean;
}

export const ACHIEVEMENT_BONUS = 0.02;

const nucleo = (s: SimState) => s.modes.baseClicker as BaseClickerState;
const fabrica = (s: SimState) => s.modes.productionChain as ProductionChainState;
const grid = (s: SimState) => s.modes.grid as GridState;
const expedicao = (s: SimState) => s.modes.roguelike as RoguelikeState;
const ascensao = (s: SimState) => s.modes.parallelTree as ParallelTreeState;
const jardim = (s: SimState) => s.modes.garden as GardenState;
const colonia = (s: SimState) => s.modes.colony as ColonyState;
const vazio = (s: SimState) => s.modes.vazio as VazioState;
const unlocked = (s: SimState, id: string) => s.meta.purchasedNodes.includes(id);

function a(category: AchievementCategory, id: string, name: string, description: string, check: (s: SimState) => boolean): Achievement {
  return { id, category, name, description, check };
}

export const ACHIEVEMENTS: Achievement[] = [
  a('Núcleo', 'n_click100', 'Primeiro Contato', 'Clicar 100 vezes', (s) => nucleo(s).clicks >= 100),
  a('Núcleo', 'n_click5k', 'Dedos Calejados', 'Clicar 5.000 vezes', (s) => nucleo(s).clicks >= 5_000),
  a('Núcleo', 'n_e1m', 'Megawatt', 'Gerar 1M de energia', (s) => nucleo(s).totalEnergy >= 1e6),
  a('Núcleo', 'n_e1b', 'Gigawatt', 'Gerar 1B de energia', (s) => nucleo(s).totalEnergy >= 1e9),
  a('Núcleo', 'n_e1t', 'Terawatt', 'Gerar 1T de energia', (s) => nucleo(s).totalEnergy >= 1e12),
  a('Núcleo', 'n_e1qa', 'Petawatt', 'Gerar 1Qa de energia', (s) => nucleo(s).totalEnergy >= 1e15),
  a('Núcleo', 'n_fais100', 'Centena de Faíscas', 'Ter 100 Faíscas', (s) => (nucleo(s).owned[0] ?? 0) >= 100),
  a('Núcleo', 'n_allgen', 'Coleção Completa', 'Ter pelo menos 1 de cada gerador', (s) =>
    GENERATORS.every((_, i) => (nucleo(s).owned[i] ?? 0) > 0),
  ),
  a('Núcleo', 'n_upg25', 'Engenheiro', 'Comprar 25 melhorias', (s) => nucleo(s).upgrades.length >= 25),
  a('Núcleo', 'n_upgAll', 'Perfeccionista', 'Comprar todas as melhorias', (s) => nucleo(s).upgrades.length >= UPGRADES.length),
  a('Núcleo', 'n_surge1', 'Pegou!', 'Capturar um Surto', (s) => nucleo(s).surge.caught >= 1),
  a('Núcleo', 'n_surge50', 'Caçador de Tempestades', 'Capturar 50 Surtos', (s) => nucleo(s).surge.caught >= 50),
  a('Núcleo', 'n_sobre1', 'Alta Voltagem', 'Fazer uma Sobrecarga', (s) => nucleo(s).sobrecargas >= 1),
  a('Núcleo', 'n_carga25', 'Carga Máxima', 'Acumular 25 de Carga', (s) => nucleo(s).carga >= 25),

  a('Fábrica', 'f_maq1', 'Primeira Máquina', 'Construir uma Máquina', (s) => fabrica(s).resources.maquina >= 1),
  a('Fábrica', 'f_maq100', 'Linha de Produção', 'Ter 100 Máquinas', (s) => fabrica(s).resources.maquina >= 100),
  a('Fábrica', 'f_robo1', 'Consciência Artificial', 'Construir um Robô', (s) => fabrica(s).resources.robo >= 1),
  a('Fábrica', 'f_robo50', 'Exército de Aço', 'Ter 50 Robôs', (s) => fabrica(s).resources.robo >= 50),
  a('Fábrica', 'f_work20', 'Sindicato', 'Ter 20 operários', (s) => fabrica(s).workers >= 20),
  a('Fábrica', 'f_contract10', 'Fornecedor Confiável', 'Cumprir 10 contratos', (s) => fabrica(s).contractsDone >= 10),
  a('Fábrica', 'f_techAll', 'Revolução Industrial', 'Concluir todas as pesquisas', (s) => fabrica(s).techs.length >= TECH_IDS.length),

  a('Constelação', 'c_full', 'Céu Estrelado', 'Preencher todo o grid', (s) => grid(s).cells.every(Boolean)),
  a('Constelação', 'c_7x7', 'Firmamento', `Expandir o grid até ${MAX_SIZE}x${MAX_SIZE}`, (s) => grid(s).size >= MAX_SIZE),
  a('Constelação', 'c_pat4', 'Astrônomo', 'Descobrir 4 padrões', (s) => grid(s).patterns.length >= 4),
  a('Constelação', 'c_patAll', 'Cartógrafo Celeste', 'Descobrir todos os padrões', (s) => grid(s).patterns.length >= PATTERN_IDS.length),
  a('Constelação', 'c_lvl5', 'Estrela Suprema', `Criar uma peça de nível ${MAX_LEVEL}`, (s) =>
    grid(s).cells.some((p) => p?.level === MAX_LEVEL) ||
    Object.values(grid(s).inventory).some((levels) => (levels[MAX_LEVEL - 1] ?? 0) > 0),
  ),
  a('Constelação', 'c_bh', 'Singularidade Local', 'Colocar um Buraco Negro', (s) => grid(s).cells.some((p) => p?.type === 'buracoNegro')),

  a('Expedição', 'e_d10', 'Explorador', 'Chegar ao andar 10', (s) => expedicao(s).bestDepth >= 10),
  a('Expedição', 'e_d25', 'Desbravador', 'Chegar ao andar 25', (s) => expedicao(s).bestDepth >= 25),
  a('Expedição', 'e_d50', 'Lenda Viva', 'Chegar ao andar 50', (s) => expedicao(s).bestDepth >= 50),
  a('Expedição', 'e_rel7', 'Colecionador', 'Encontrar 7 relíquias', (s) => expedicao(s).relics.length >= 7),
  a('Expedição', 'e_relAll', 'Tesouro Completo', 'Encontrar todas as relíquias', (s) => expedicao(s).relics.length >= RELIC_IDS.length),
  a('Expedição', 'e_classes', 'Versátil', 'Liberar todas as classes', (s) => expedicao(s).classes.length >= CLASS_IDS.length),
  a('Expedição', 'e_boss10', 'Matador de Chefes', 'Derrotar 10 chefes', (s) => expedicao(s).bossesDefeated >= 10),
  a('Expedição', 'e_runs100', 'Veterano', 'Completar 100 expedições', (s) => expedicao(s).runs >= 100),

  a('Ascensão', 'a_first', 'Primeiro Passo', 'Escolher um caminho na Ascensão', (s) => ascensao(s).nodes.length >= 1),
  a('Ascensão', 'a_cap', 'Transcendente', 'Alcançar a Transcendência', (s) => ascensao(s).nodes.includes('transcendencia')),
  a('Ascensão', 'a_ether', 'Mar de Éter', 'Acumular 100K de Éter', (s) => ascensao(s).totalEther >= 1e5),

  a('Jardim', 'j_mut1', 'Polinizador', 'Ver uma mutação brotar', (s) => jardim(s).mutations >= 1),
  a('Jardim', 'j_species5', 'Botânico', 'Descobrir 5 espécies', (s) => jardim(s).discovered.length >= 5),
  a('Jardim', 'j_speciesAll', 'Herbário Cósmico', 'Descobrir todas as espécies', (s) => jardim(s).discovered.length >= SPECIES_IDS.length),
  a('Jardim', 'j_full', 'Jardim Suspenso', 'Ampliar o Jardim até 6x6', (s) => jardim(s).size >= 6),
  a('Jardim', 'j_harvest10k', 'Safra Recorde', 'Fazer 10.000 colheitas', (s) => jardim(s).harvests >= 10_000),
  a('Jardim', 'j_tree', 'Yggdrasil', 'Plantar uma Árvore-Mundo', (s) => jardim(s).plots.some((p) => p?.species === 'arvore')),

  a('Colônia', 'o_pop50', 'Vilarejo', 'Chegar a 50 habitantes', (s) => colonia(s).peakPopulation >= 50),
  a('Colônia', 'o_pop500', 'Cidade', 'Chegar a 500 habitantes', (s) => colonia(s).peakPopulation >= 500),
  a('Colônia', 'o_pop5k', 'Metrópole', 'Chegar a 5.000 habitantes', (s) => colonia(s).peakPopulation >= 5_000),
  a('Colônia', 'o_law5', 'Legislador', 'Aprovar 5 leis', (s) => colonia(s).laws.length >= 5),
  a('Colônia', 'o_lawAll', 'Constituinte', 'Aprovar todas as leis', (s) => colonia(s).laws.length >= LAW_IDS.length),
  a('Colônia', 'o_monument', 'Marco Eterno', 'Erguer um Monumento', (s) => colonia(s).buildings.monumento >= 1),

  a('Vazio', 'v_first', 'Primeira Fenda', 'Selar a primeira fenda do Vazio', (s) => vazio(s).sealed >= 1),
  a('Vazio', 'v_seal20', 'Guardião', 'Selar 20 fendas', (s) => vazio(s).sealed >= 20),
  a('Vazio', 'v_dm1k', 'Colecionador de Sombra', 'Acumular 1.000 de Matéria Escura', (s) => vazio(s).totalDarkMatter >= 1_000),
  a('Vazio', 'v_shadow', 'Núcleo Pleno', 'Levar o Núcleo de Sombra ao máximo', (s) => vazio(s).upgrades.nucleoDeSombra >= 5),
  a('Vazio', 'v_allUp', 'Domador do Vazio', 'Comprar pelo menos um nível de cada melhoria do Vazio', (s) =>
    VAZIO_UPGRADE_IDS.every((id) => vazio(s).upgrades[id] >= 1),
  ),

  a('Rede', 'm_ess1k', 'Faísca de Essência', 'Acumular 1K de Essência', (s) => s.meta.totalEssence >= 1e3),
  a('Rede', 'm_ess1m', 'Rio de Essência', 'Acumular 1M de Essência', (s) => s.meta.totalEssence >= 1e6),
  a('Rede', 'm_ess1b', 'Oceano de Essência', 'Acumular 1B de Essência', (s) => s.meta.totalEssence >= 1e9),
  a('Rede', 'm_allModes', 'Rede Completa', 'Desbloquear todos os modos', (s) =>
    (['productionChain', 'grid', 'roguelike', 'parallelTree', 'garden', 'colony'] as ModeId[]).every((m) => unlocked(s, `unlock_${m}`)),
  ),
  a('Rede', 'm_tree', 'Arquiteto', 'Comprar todos os nós da Árvore', (s) => SKILL_TREE.every((n) => unlocked(s, n.id))),

  a('Cosmos', 'k_collapse1', 'Big Crunch', 'Fazer o primeiro Colapso', (s) => s.meta.cosmos.collapses >= 1),
  a('Cosmos', 'k_collapse5', 'Eterno Retorno', 'Fazer 5 Colapsos', (s) => s.meta.cosmos.collapses >= 5),
  a('Cosmos', 'k_sing50', 'Horizonte', 'Acumular 50 Singularidades', (s) => s.meta.cosmos.totalSingularities >= 50),
  a('Cosmos', 'k_cosmos8', 'Cosmólogo', 'Comprar 8 nós da Cosmologia', (s) => s.meta.cosmos.nodes.length >= 8),
  a('Cosmos', 'k_cosmosAll', 'Teoria de Tudo', 'Comprar toda a Cosmologia', (s) => s.meta.cosmos.nodes.length >= COSMOLOGY.length),
  a('Cosmos', 'k_anomaly1', 'Sobrevivente', 'Vencer uma Anomalia', (s) => s.meta.cosmos.anomaliesDone.length >= 1),
  a('Cosmos', 'k_anomalyAll', 'Imune ao Caos', 'Vencer todas as Anomalias', (s) => s.meta.cosmos.anomaliesDone.length >= ANOMALY_IDS.length),
];

export const ACHIEVEMENT_IDS: ReadonlySet<string> = new Set(ACHIEVEMENTS.map((x) => x.id));

/** Ids das conquistas recém-cumpridas (ainda não registradas no meta). */
export function newlyEarned(state: SimState): string[] {
  const done = new Set(state.meta.achievements);
  return ACHIEVEMENTS.filter((x) => !done.has(x.id) && x.check(state)).map((x) => x.id);
}

export function achievementMultiplier(count: number): number {
  return 1 + ACHIEVEMENT_BONUS * count;
}
