/**
 * Jogador simulado para medir o ritmo do jogo. Usa só a lógica pura dos modos (sem React),
 * joga de forma gananciosa porém razoável e registra quando cada marco acontece.
 */
import { buildContexts } from '../core/engine/contexts';
import { computeEssenceRates, simulate, type SimState } from '../core/engine/simulate';
import { COSMOLOGY } from '../core/cosmos/data';
import { buyCosmos, canCollapse, collapse, collapseGain, completeAnomalyIfReached, cosmosNodeStatus } from '../core/cosmos/logic';
import { initialMeta } from '../core/meta';
import { initialModeStates } from '../core/modeRegistry';
import { getNodeStatus } from '../core/skillTree/logic';
import { SKILL_TREE } from '../core/skillTree/treeData';
import type { EssenceRates, ModeContext, ModeId } from '../core/types';
import * as nucleo from '../modes/baseClicker/logic';
import { GENERATORS, UPGRADES } from '../modes/baseClicker/upgrades';
import * as grid from '../modes/grid/logic';
import * as asc from '../modes/parallelTree/logic';
import * as fab from '../modes/productionChain/logic';
import * as exp from '../modes/roguelike/logic';

export interface BotOptions {
  hours: number;
  clicksPerSecond: number;
  /** Segundos de jogo entre decisões do robô. */
  decisionEvery: number;
  /** Colapsa assim que o ganho de Singularidades chegar a este valor (0 = nunca). */
  collapseAtGain: number;
  trace?: (t: number, state: SimState, rates: EssenceRates) => void;
}

export interface BotReport {
  milestones: Record<string, number>;
  finalEssence: number;
  finalRates: EssenceRates;
  nodes: number;
}

const DEFAULTS: BotOptions = { hours: 48, clicksPerSecond: 3, decisionEvery: 1, collapseAtGain: 6 };
const KEY_NODES = new Set(['unlock_productionChain', 'unlock_grid', 'unlock_roguelike', 'unlock_parallelTree', 'harmonia', 'singularidade', 'omega']);

type Modes = SimState['modes'];

function playNucleo(s: nucleo.BaseClickerState, ctx: ModeContext, clicks: number): nucleo.BaseClickerState {
  let next = s;
  for (let i = 0; i < clicks; i++) next = nucleo.click(next, ctx);
  if (next.surge.orbLeft > 0) next = nucleo.catchSurge(next, ctx);
  for (const u of UPGRADES) if (nucleo.upgradeStatus(next, u) === 'available') next = nucleo.buyUpgrade(next, u.id);

  // Compra o gerador com melhor retorno (custo por unidade de produção ganha).
  for (let guard = 0; guard < 50; guard++) {
    const base = nucleo.productionPerSecond(next, ctx);
    let best = -1;
    let bestScore = Infinity;
    GENERATORS.forEach((_, i) => {
      const owned = next.owned[i] ?? 0;
      if (i > 0 && (next.owned[i - 1] ?? 0) === 0 && owned === 0) return;
      const cost = nucleo.bulkCost(i, owned, 1);
      const trial = nucleo.buyGenerator({ ...next, energy: Infinity }, i, 1);
      const gain = nucleo.productionPerSecond(trial, ctx) - base;
      const score = gain > 0 ? cost / gain : Infinity;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best < 0) break;
    const bought = nucleo.buyGenerator(next, best, 1);
    if (bought === next) break;
    next = bought;
  }

  const gain = nucleo.cargaGain(next);
  if (gain >= Math.max(3, next.carga)) next = nucleo.sobrecarga(next);
  return next;
}

const STATION_WEIGHTS = [3, 3, 3, 2, 2, 2, 2, 1];

function playFabrica(s: fab.ProductionChainState, ctx: ModeContext): fab.ProductionChainState {
  let next = s;
  for (const id of fab.TECH_IDS) next = fab.research(next, id);
  if (next.contract) next = fab.deliverContract(next);
  while (next.resources.lingote >= fab.hireCost(next) * 1.5) next = fab.hire(next);

  // Redistribui todo mundo pelo peso desejado. Com poucos operários, só Mina e Fundição trabalham
  // (sobram lingotes para contratar); a cadeia inteira entra conforme a equipe cresce.
  next = { ...next, assigned: next.assigned.map(() => 0) };
  const allowed = (i: number) => i < 2 || (i < 4 && next.workers >= 5) || next.workers >= 10;
  while (fab.freeWorkers(next) > 0) {
    const unlocked = fab.STATIONS.map((_, i) => i).filter((i) => fab.isStationUnlocked(next, i) && allowed(i));
    const totalWeight = unlocked.reduce((sum, i) => sum + STATION_WEIGHTS[i]!, 0);
    const total = next.assigned.reduce((a, b) => a + b, 0) + 1;
    const target = unlocked.reduce((best, i) => {
      const deficit = (STATION_WEIGHTS[i]! / totalWeight) * total - (next.assigned[i] ?? 0);
      const bestDeficit = (STATION_WEIGHTS[best]! / totalWeight) * total - (next.assigned[best] ?? 0);
      return deficit > bestDeficit ? i : best;
    }, unlocked[0]!);
    const assigned = fab.assign(next, target, 1);
    if (assigned === next) break;
    next = assigned;
  }

  fab.STATIONS.forEach((st, i) => {
    if (next.resources[st.upgrade.resource] >= fab.upgradeCost(next, i) * 2) next = fab.upgrade(next, i);
  });
  const full = fab.RESOURCES.some((r) => next.resources[r] >= fab.storageCap(next, r, ctx) * 0.99);
  if (full && next.resources.lingote >= fab.storageUpgradeCost(next) * 1.5) next = fab.expandStorage(next);
  return next;
}

const PIECE_PRIORITY: grid.PieceType[] = ['ana', 'gigante', 'ana', 'ana', 'pulsar', 'binaria', 'binaria', 'quasar', 'farolNucleo'];

function bestPlacement(s: grid.GridState, piece: grid.Piece): number {
  let best = -1;
  let bestDust = -1;
  s.cells.forEach((c, i) => {
    if (c) return;
    const dust = grid.rawDustPerSecond(grid.place(s, i, piece));
    if (dust > bestDust) {
      bestDust = dust;
      best = i;
    }
  });
  return best;
}

function playGrid(s: grid.GridState, ctx: ModeContext, step: number): grid.GridState {
  let next = s;
  const cost = grid.expandCost(next);
  if (cost !== null && next.dust >= cost) next = grid.expand(next);
  const wanted = PIECE_PRIORITY[step % PIECE_PRIORITY.length]!;
  if (next.cells.some((c) => !c) && next.dust >= grid.pieceCost(next, wanted)) next = grid.buy(next, wanted);
  for (const type of grid.PIECE_TYPES) {
    for (let level = 1; level < grid.MAX_LEVEL; level++) {
      if (next.cells.every(Boolean)) next = grid.fuse(next, { type, level }, ctx);
    }
    for (let level = grid.MAX_LEVEL; level >= 1; level--) {
      const piece = { type, level };
      while (grid.inventoryCount(next, piece) > 0) {
        const cell = bestPlacement(next, piece);
        if (cell < 0) break;
        next = grid.place(next, cell, piece);
      }
    }
  }
  return next;
}

function playExpedicao(s: exp.RoguelikeState, ctx: ModeContext): exp.RoguelikeState {
  let next = s;
  for (const id of ['auto', 'vigor', 'forca', 'ganancia', 'sorte'] as exp.UpgradeId[]) {
    while (next.fragments >= exp.upgradeCost(next, id) && next.upgrades[id] < exp.UPGRADES[id].max) {
      next = exp.buyUpgrade(next, id);
    }
  }
  if (exp.canAutoExplore(next, ctx)) return next.autoEnabled ? next : { ...next, autoEnabled: true };
  if (!next.run) return exp.startRun(next, ctx);
  if (next.run.shopOpen) return exp.leaveShop(exp.buyShopItem(next, 'pocao', ctx));
  const move = exp.autoPick(next.run);
  return move === 'retreat' ? exp.endRun(next, true, ctx) : exp.choose(next, move, ctx);
}

const ASC_PREFERENCE = ['forjaAstral', 'tempestade', 'fusaoEstelar', 'andarilho', 'armazemDimensional', 'olhoCosmico', 'motorPerpetuo', 'transcendencia'];

function playAscensao(s: asc.ParallelTreeState): asc.ParallelTreeState {
  let next = s;
  for (const id of ASC_PREFERENCE) next = asc.buyNode(next, id);
  return next;
}

export function runBot(options: Partial<BotOptions> = {}): BotReport {
  const opts = { ...DEFAULTS, ...options };
  let state: SimState = {
    meta: initialMeta(),
    modes: initialModeStates(),
  };
  let rates = computeEssenceRates(state);
  const milestones: Record<string, number> = {};
  const mark = (key: string, t: number) => {
    if (!(key in milestones)) milestones[key] = t;
  };

  const totalSeconds = opts.hours * 3600;
  let step = 0;
  for (let t = 0; t < totalSeconds; t += opts.decisionEvery, step++) {
    const ctx = buildContexts(state.meta, state.modes, rates);
    const has = (id: ModeId) => state.meta.purchasedNodes.includes(`unlock_${id}`);
    const modes: Modes = { ...state.modes };

    modes.baseClicker = playNucleo(modes.baseClicker as nucleo.BaseClickerState, ctx.baseClicker, opts.clicksPerSecond * opts.decisionEvery);
    if (has('productionChain')) modes.productionChain = playFabrica(modes.productionChain as fab.ProductionChainState, ctx.productionChain);
    if (has('grid')) modes.grid = playGrid(modes.grid as grid.GridState, ctx.grid, step);
    if (has('roguelike') && step % 2 === 0) modes.roguelike = playExpedicao(modes.roguelike as exp.RoguelikeState, ctx.roguelike);
    if (has('parallelTree')) modes.parallelTree = playAscensao(modes.parallelTree as asc.ParallelTreeState);

    // Árvore: compra o nó disponível mais barato, repetidamente.
    const cycle = state.meta.cosmos.collapses + 1;
    let meta = state.meta;
    for (;;) {
      const node = SKILL_TREE.filter((n) => getNodeStatus(n, meta, rates) === 'available').sort((a, b) => a.cost - b.cost)[0];
      if (!node) break;
      meta = completeAnomalyIfReached({ ...meta, essence: meta.essence - node.cost, purchasedNodes: [...meta.purchasedNodes, node.id] });
      if (cycle === 1 || KEY_NODES.has(node.id)) mark(`ciclo ${cycle} · nó: ${node.id}`, t);
    }

    const gain = collapseGain(meta.cosmos.runEssence);
    // Como um jogador: só colapsa quando o ganho vale a pena (pelo menos metade do que já acumulou).
    const worthIt = Math.max(opts.collapseAtGain, Math.ceil(meta.cosmos.totalSingularities * 0.5));
    if (opts.collapseAtGain > 0 && canCollapse(meta) && gain >= worthIt) {
      state = collapse({ meta, modes });
      let cosmos = state.meta.cosmos;
      for (;;) {
        const next = COSMOLOGY.filter((n) => cosmosNodeStatus(cosmos, n) === 'available').sort((a, b) => a.cost - b.cost)[0];
        if (!next) break;
        cosmos = buyCosmos(cosmos, next.id);
      }
      state = { ...state, meta: { ...state.meta, cosmos } };
      rates = computeEssenceRates(state);
      mark(`Colapso #${cosmos.collapses} (+${gain} Singularidades, Cosmologia: ${cosmos.nodes.length} nós)`, t);
      continue;
    }

    const result = simulate({ meta, modes }, opts.decisionEvery, rates, 1);
    state = { meta: result.meta, modes: result.modes };
    rates = result.essenceRates;
    opts.trace?.(t, state, rates);

    const n = state.modes.baseClicker as nucleo.BaseClickerState;
    const f = state.modes.productionChain as fab.ProductionChainState;
    const e = state.modes.roguelike as exp.RoguelikeState;
    if (n.sobrecargas > 0) mark('1ª Sobrecarga', t);
    if (f.resources.maquina >= 1) mark('1ª Máquina', t);
    if (f.resources.robo >= 1) mark('1º Robô', t);
    if (e.bestDepth >= 10) mark('Expedição andar 10', t);
    if (e.bestDepth >= 25) mark('Expedição andar 25', t);
    if ((state.modes.parallelTree as asc.ParallelTreeState).nodes.includes('transcendencia')) mark('Transcendência', t);
  }

  return { milestones, finalEssence: state.meta.totalEssence, finalRates: rates, nodes: state.meta.purchasedNodes.length };
}

export function formatReport(report: BotReport): string {
  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`;
  };
  const lines = Object.entries(report.milestones)
    .sort((a, b) => a[1] - b[1])
    .map(([k, t]) => `${fmt(t).padStart(7)}  ${k}`);
  const rates = Object.entries(report.finalRates)
    .map(([k, v]) => `${k}=${v.toFixed(2)}`)
    .join(' ');
  return [...lines, '', `Nós comprados: ${report.nodes}/${SKILL_TREE.length}`, `Essência/s final: ${rates}`].join('\n');
}
