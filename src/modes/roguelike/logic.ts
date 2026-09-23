import { createRng, validSeed, type Rng } from '../../core/rng';
import type { ModeBonus, ModeContext, ModeId, Stat } from '../../core/types';

export type RoomKind = 'combate' | 'elite' | 'tesouro' | 'descanso' | 'evento' | 'loja' | 'chefe';
export type RelicId =
  | 'coracao'
  | 'engrenagem'
  | 'lente'
  | 'bussola'
  | 'calice'
  | 'coroa'
  | 'anel'
  | 'martelo'
  | 'mapa'
  | 'relogio'
  | 'olho'
  | 'pena'
  | 'estrela'
  | 'cristal';
export type UpgradeId = 'vigor' | 'forca' | 'sorte' | 'ganancia' | 'auto';
export type ClassId = 'guerreiro' | 'mago' | 'ladino';
export type CurseId = 'furia' | 'fome' | 'fragil' | 'pobreza';
export type ShopItem = 'pocao' | 'lamina' | 'armadura';

export const ROOMS: Record<RoomKind, { name: string; hint: string }> = {
  combate: { name: 'Combate', hint: 'Ouro e +6% de força' },
  elite: { name: 'Elite', hint: 'Inimigo forte: muito ouro e +15% de força' },
  tesouro: { name: 'Tesouro', hint: 'Ouro sem risco' },
  descanso: { name: 'Descanso', hint: 'Recupera 35% dos PV' },
  evento: { name: 'Evento', hint: 'Bênção ou armadilha' },
  loja: { name: 'Loja', hint: 'Gaste ouro em poções e equipamento' },
  chefe: { name: 'Chefe', hint: 'Pode deixar uma relíquia' },
};

export const RELICS: Record<RelicId, { name: string; description: string; target: ModeId | 'global'; stat: Stat; value: number }> = {
  coracao: { name: 'Coração Pulsante', description: 'Produção do Núcleo x2', target: 'baseClicker', stat: 'production', value: 2 },
  engrenagem: { name: 'Engrenagem Antiga', description: 'Produção da Fábrica x2', target: 'productionChain', stat: 'production', value: 2 },
  lente: { name: 'Lente Estelar', description: 'Poeira da Constelação x2', target: 'grid', stat: 'production', value: 2 },
  bussola: { name: 'Bússola Partida', description: 'Força na Expedição x1.5', target: 'roguelike', stat: 'production', value: 1.5 },
  calice: { name: 'Cálice de Éter', description: 'Éter da Ascensão x2', target: 'parallelTree', stat: 'production', value: 2 },
  coroa: { name: 'Coroa da Rede', description: 'Essência de todos os modos x1.25', target: 'global', stat: 'essence', value: 1.25 },
  anel: { name: 'Anel Solar', description: 'Clique do Núcleo x3', target: 'baseClicker', stat: 'click', value: 3 },
  martelo: { name: 'Martelo do Ferreiro', description: 'Produção da Fábrica x1.5', target: 'productionChain', stat: 'production', value: 1.5 },
  mapa: { name: 'Mapa Celeste', description: 'Poeira da Constelação x1.5', target: 'grid', stat: 'production', value: 1.5 },
  relogio: { name: 'Relógio Quebrado', description: 'Produção de todos os modos x1.1', target: 'global', stat: 'production', value: 1.1 },
  olho: { name: 'Olho do Abismo', description: 'Força na Expedição x2', target: 'roguelike', stat: 'production', value: 2 },
  pena: { name: 'Pena da Fênix', description: 'Éter da Ascensão x1.5', target: 'parallelTree', stat: 'production', value: 1.5 },
  estrela: { name: 'Estrela Cadente', description: 'Essência de todos os modos x1.15', target: 'global', stat: 'essence', value: 1.15 },
  cristal: { name: 'Cristal do Vazio', description: 'Produção do Núcleo x3', target: 'baseClicker', stat: 'production', value: 3 },
};

export const RELIC_IDS = Object.keys(RELICS) as RelicId[];

export const UPGRADES: Record<UpgradeId, { name: string; description: string; baseCost: number; growth: number; max: number }> = {
  vigor: { name: 'Vigor', description: '+10 PV máximos', baseCost: 5, growth: 1.5, max: Infinity },
  forca: { name: 'Força', description: '+2 de força inicial', baseCost: 5, growth: 1.5, max: Infinity },
  ganancia: { name: 'Ganância', description: '+10% de ouro', baseCost: 8, growth: 1.6, max: Infinity },
  sorte: { name: 'Sorte', description: 'Eventos e relíquias melhores', baseCost: 10, growth: 2, max: 10 },
  auto: { name: 'Batedor', description: 'Libera a exploração automática', baseCost: 50, growth: 1, max: 1 },
};

export const CLASSES: Record<ClassId, { name: string; description: string; unlockCost: number }> = {
  guerreiro: { name: 'Guerreiro', description: 'PV máximos x1.5', unlockCost: 0 },
  mago: { name: 'Mago', description: 'Força x1.35 e eventos mais favoráveis', unlockCost: 30 },
  ladino: { name: 'Ladino', description: 'Ouro x1.6 e 4 caminhos por andar', unlockCost: 60 },
};
export const CLASS_IDS = Object.keys(CLASSES) as ClassId[];

export const CURSES: Record<CurseId, { name: string; description: string }> = {
  furia: { name: 'Fúria', description: 'Inimigos 40% mais fortes' },
  fome: { name: 'Fome', description: 'Descansos curam metade' },
  fragil: { name: 'Fragilidade', description: 'PV máximos -30%' },
  pobreza: { name: 'Pobreza', description: 'Ouro -40%' },
};
export const CURSE_IDS = Object.keys(CURSES) as CurseId[];

export const SHOP: Record<ShopItem, { name: string; description: string; pricePerDepth: number }> = {
  pocao: { name: 'Poção', description: 'Cura 50% dos PV', pricePerDepth: 15 },
  lamina: { name: 'Lâmina Afiada', description: 'Força +20%', pricePerDepth: 25 },
  armadura: { name: 'Armadura', description: '+10 PV máximos', pricePerDepth: 20 },
};
export const SHOP_ITEMS = Object.keys(SHOP) as ShopItem[];

interface Biome {
  name: string;
  from: number;
  enemy: number;
  gold: number;
  boss: string;
  weights: Partial<Record<RoomKind, number>>;
}

export const BIOMES: Biome[] = [
  { name: 'Cavernas', from: 1, enemy: 1, gold: 1, boss: 'Rei das Cavernas', weights: {} },
  { name: 'Floresta Sombria', from: 11, enemy: 1.1, gold: 1.2, boss: 'Ent Sombrio', weights: { evento: 28 } },
  { name: 'Deserto de Cinzas', from: 21, enemy: 1.2, gold: 1.5, boss: 'Serpente de Cinzas', weights: { descanso: 6 } },
  { name: 'Abismo', from: 31, enemy: 1.35, gold: 2, boss: 'Guardião do Abismo', weights: { elite: 20 } },
  { name: 'Vazio Estelar', from: 41, enemy: 1.5, gold: 3, boss: 'Devorador de Estrelas', weights: { tesouro: 22 } },
];

const BOSS_EVERY = 5;
const NAMED_BOSS_EVERY = 10;
const AUTO_INTERVAL = 1.5;
const AUTO_REWARD = 0.7;
const LOG_SIZE = 10;
const BASE_WEIGHTS: Record<Exclude<RoomKind, 'chefe'>, number> = {
  combate: 40,
  elite: 12,
  tesouro: 15,
  descanso: 15,
  evento: 18,
  loja: 8,
};

export interface Run {
  depth: number;
  hp: number;
  maxHp: number;
  power: number;
  gold: number;
  options: RoomKind[];
  revived: boolean;
  classId: ClassId;
  curses: CurseId[];
  shopOpen: boolean;
  auto: boolean;
}

export interface RoguelikeState {
  fragments: number;
  upgrades: Record<UpgradeId, number>;
  relics: RelicId[];
  classes: ClassId[];
  selectedClass: ClassId;
  selectedCurses: CurseId[];
  bestDepth: number;
  bossesDefeated: number;
  runs: number;
  run: Run | null;
  log: string[];
  seed: number;
  autoEnabled: boolean;
  autoTimer: number;
}

export const initialRoguelikeState: RoguelikeState = {
  fragments: 0,
  upgrades: { vigor: 0, forca: 0, sorte: 0, ganancia: 0, auto: 0 },
  relics: [],
  classes: ['guerreiro'],
  selectedClass: 'guerreiro',
  selectedCurses: [],
  bestDepth: 0,
  bossesDefeated: 0,
  runs: 0,
  run: null,
  log: [],
  seed: 20260923,
  autoEnabled: false,
  autoTimer: 0,
};

export function biomeAt(depth: number): Biome {
  return [...BIOMES].reverse().find((b) => depth >= b.from) ?? BIOMES[0]!;
}

export function isNamedBoss(depth: number): boolean {
  return depth % NAMED_BOSS_EVERY === 0;
}

export function enemyStrength(depth: number, curses: readonly CurseId[] = []): number {
  return 4 * 1.24 ** depth * biomeAt(depth).enemy * (curses.includes('furia') ? 1.4 : 1);
}

export function roomStrength(kind: RoomKind, depth: number, curses: readonly CurseId[] = []): number {
  const base = enemyStrength(depth, curses);
  if (kind === 'elite') return base * 1.8;
  if (kind === 'chefe') return base * (isNamedBoss(depth) ? 4 : 3);
  return base;
}

export function upgradeCost(state: RoguelikeState, id: UpgradeId): number {
  const u = UPGRADES[id];
  return Math.ceil(u.baseCost * u.growth ** state.upgrades[id]);
}

export function canAutoExplore(state: RoguelikeState, ctx: ModeContext): boolean {
  return state.upgrades.auto > 0 || ctx.hasFlag('expedicao.autoGratis');
}

export function startingStats(state: RoguelikeState, ctx: ModeContext, classId = state.selectedClass, curses = state.selectedCurses) {
  let maxHp = 20 + state.upgrades.vigor * 10;
  if (classId === 'guerreiro') maxHp *= 1.5;
  if (curses.includes('fragil')) maxHp *= 0.7;
  let power = (5 + state.upgrades.forca * 2) * ctx.multiplier('production');
  if (classId === 'mago') power *= 1.35;
  return { maxHp: Math.round(maxHp), power };
}

export function curseMultiplier(curses: readonly CurseId[], ctx: ModeContext): number {
  return 1 + curses.length * (ctx.hasFlag('expedicao.maldicaoLeve') ? 0.5 : 0.3);
}

export function runReward(run: Run, returned: boolean, ctx: ModeContext): number {
  const base = Math.floor(run.depth ** 1.5) + (returned ? Math.floor(run.gold / 10) : 0);
  return Math.floor(base * curseMultiplier(run.curses, ctx) * (run.auto ? AUTO_REWARD : 1));
}

export function shopPrice(item: ShopItem, depth: number, ctx: ModeContext): number {
  return Math.ceil(SHOP[item].pricePerDepth * Math.max(1, depth) * (ctx.hasFlag('expedicao.lojaDesconto') ? 0.5 : 1));
}

function pushLog(log: string[], entry: string): string[] {
  return [entry, ...log].slice(0, LOG_SIZE);
}

function rollOptions(run: Pick<Run, 'classId'>, depth: number, rng: Rng): RoomKind[] {
  if (depth % BOSS_EVERY === 0) return ['chefe'];
  const weights = { ...BASE_WEIGHTS, ...biomeAt(depth).weights };
  if (depth < 2) weights.loja = 0;
  const pool = (Object.entries(weights) as [RoomKind, number][]).filter(([, w]) => w > 0);
  const count = run.classId === 'ladino' ? 4 : 3;
  const options: RoomKind[] = [];
  while (options.length < count && pool.length > 0) {
    const total = pool.reduce((sum, [, w]) => sum + w, 0);
    let roll = rng.next() * total;
    const index = pool.findIndex(([, w]) => (roll -= w) < 0);
    const [kind] = pool.splice(index === -1 ? pool.length - 1 : index, 1)[0]!;
    options.push(kind);
  }
  return options;
}

export function startRun(state: RoguelikeState, ctx: ModeContext, auto = false): RoguelikeState {
  if (state.run) return state;
  const rng = createRng(state.seed);
  const classId = state.classes.includes(state.selectedClass) ? state.selectedClass : 'guerreiro';
  const curses = auto ? [] : state.selectedCurses;
  const { maxHp, power } = startingStats(state, ctx, classId, curses);
  const run: Run = {
    depth: 0,
    hp: maxHp,
    maxHp,
    power,
    gold: 0,
    options: [],
    revived: false,
    classId,
    curses: [...curses],
    shopOpen: false,
    auto,
  };
  run.options = rollOptions(run, 1, rng);
  const cursed = curses.length ? ` com ${curses.length} ${curses.length === 1 ? 'maldição' : 'maldições'}` : '';
  return {
    ...state,
    run,
    log: pushLog(state.log, `${CLASSES[classId].name} parte em expedição${cursed}.`),
    seed: rng.seed,
  };
}

export function endRun(state: RoguelikeState, returned: boolean, ctx: ModeContext): RoguelikeState {
  const run = state.run;
  if (!run) return state;
  const reward = runReward(run, returned, ctx);
  const verb = returned ? 'Você voltou em segurança' : 'Você caiu';
  return {
    ...state,
    run: null,
    runs: state.runs + 1,
    fragments: state.fragments + reward,
    log: pushLog(state.log, `${verb} no andar ${run.depth}: +${reward} fragmentos.`),
  };
}

function fight(run: Run, strength: number, rng: Rng): number {
  return Math.ceil(((strength * strength) / (run.power + strength)) * (0.8 + 0.4 * rng.next()));
}

function goldMultiplier(state: RoguelikeState, run: Run, depth: number): number {
  let m = biomeAt(depth).gold * (1 + 0.1 * state.upgrades.ganancia);
  if (run.classId === 'ladino') m *= 1.6;
  if (run.curses.includes('pobreza')) m *= 0.6;
  return m;
}

export function choose(state: RoguelikeState, optionIndex: number, ctx: ModeContext): RoguelikeState {
  const current = state.run;
  const kind = current?.options[optionIndex];
  if (!current || current.shopOpen || !kind) return state;

  const rng = createRng(state.seed);
  const depth = current.depth + 1;
  const run: Run = { ...current };
  let relics = state.relics;
  let bossesDefeated = state.bossesDefeated;
  let message: string;
  const str = roomStrength(kind, depth, run.curses);
  const gm = goldMultiplier(state, run, depth);
  const luck = state.upgrades.sorte;

  switch (kind) {
    case 'combate':
    case 'elite': {
      const elite = kind === 'elite';
      const dmg = fight(run, str, rng);
      const gold = Math.ceil(str * (1 + rng.next()) * (elite ? 3 : 1) * gm);
      run.hp -= dmg;
      run.gold += gold;
      run.power *= elite ? 1.15 : 1.06;
      message = `${ROOMS[kind].name}: -${dmg} PV, +${gold} ouro.`;
      break;
    }
    case 'tesouro': {
      const gold = Math.ceil(str * 2 * (1 + rng.next()) * gm);
      run.gold += gold;
      message = `Tesouro: +${gold} ouro.`;
      break;
    }
    case 'descanso': {
      const pct = run.curses.includes('fome') ? 0.175 : 0.35;
      const heal = Math.min(run.maxHp - run.hp, Math.ceil(run.maxHp * pct));
      run.hp += heal;
      message = `Descanso: +${heal} PV.`;
      break;
    }
    case 'evento': {
      const good = 0.6 + 0.04 * luck + (run.classId === 'mago' ? 0.2 : 0);
      if (rng.next() < good) {
        if (rng.next() < 0.5) {
          run.power *= 1.25;
          message = 'Bênção: força +25%.';
        } else {
          run.maxHp += 5;
          run.hp += 5;
          message = 'Bênção: +5 PV máximos.';
        }
      } else {
        const dmg = Math.ceil(run.maxHp * 0.2);
        run.hp -= dmg;
        message = `Armadilha: -${dmg} PV.`;
      }
      break;
    }
    case 'loja': {
      run.shopOpen = true;
      message = 'Você encontrou um mercador.';
      break;
    }
    case 'chefe': {
      const named = isNamedBoss(depth);
      const name = named ? biomeAt(depth).boss : 'Chefe';
      const dmg = fight(run, str, rng);
      run.hp -= dmg;
      run.power *= named ? 1.3 : 1.2;
      const missing = RELIC_IDS.filter((r) => !relics.includes(r));
      const chance = named ? 1 : 0.5 + 0.05 * luck;
      if (run.hp > 0) bossesDefeated++;
      if (run.hp > 0 && missing.length > 0 && rng.next() < chance) {
        const relic = missing[Math.floor(rng.next() * missing.length)]!;
        relics = [...relics, relic];
        message = `${name} derrotado (-${dmg} PV)! Relíquia: ${RELICS[relic].name}.`;
      } else {
        const gold = Math.ceil(str * 5 * gm);
        run.gold += gold;
        message = `${name}: -${dmg} PV, +${gold} ouro.`;
      }
      break;
    }
  }

  let log = pushLog(state.log, `Andar ${depth} (${biomeAt(depth).name}) · ${message}`);
  if (run.hp <= 0 && ctx.hasFlag('expedicao.segundaChance') && !run.revived) {
    run.hp = Math.ceil(run.maxHp * 0.5);
    run.revived = true;
    log = pushLog(log, 'Fênix: você renasce com metade dos PV.');
  }

  run.depth = depth;
  const next: RoguelikeState = {
    ...state,
    relics,
    bossesDefeated,
    bestDepth: Math.max(state.bestDepth, depth),
    log,
    run,
  };
  if (run.hp <= 0) return endRun({ ...next, seed: rng.seed }, false, ctx);
  if (!run.shopOpen) run.options = rollOptions(run, depth + 1, rng);
  return { ...next, seed: rng.seed };
}

export function buyShopItem(state: RoguelikeState, item: ShopItem, ctx: ModeContext): RoguelikeState {
  const run = state.run;
  if (!run?.shopOpen) return state;
  const price = shopPrice(item, run.depth, ctx);
  if (run.gold < price) return state;
  const next: Run = { ...run, gold: run.gold - price };
  if (item === 'pocao') next.hp = Math.min(next.maxHp, next.hp + Math.ceil(next.maxHp * 0.5));
  if (item === 'lamina') next.power *= 1.2;
  if (item === 'armadura') {
    next.maxHp += 10;
    next.hp += 10;
  }
  return { ...state, run: next, log: pushLog(state.log, `Comprou ${SHOP[item].name} por ${price} ouro.`) };
}

export function leaveShop(state: RoguelikeState): RoguelikeState {
  const run = state.run;
  if (!run?.shopOpen) return state;
  const rng = createRng(state.seed);
  return { ...state, seed: rng.seed, run: { ...run, shopOpen: false, options: rollOptions(run, run.depth + 1, rng) } };
}

/** Escolha do Batedor: descansa quando fraco, volta antes de morrer, prefere salas lucrativas quando forte. */
export function autoPick(run: Run): number | 'retreat' {
  const ratio = run.hp / run.maxHp;
  const pick = (kind: RoomKind) => run.options.indexOf(kind);
  if (ratio < 0.4 && pick('descanso') !== -1) return pick('descanso');
  if (ratio < 0.3) return 'retreat';
  if (run.options[0] === 'chefe') return ratio > 0.6 ? 0 : 'retreat';
  const order: RoomKind[] =
    ratio > 0.7
      ? ['tesouro', 'elite', 'evento', 'combate', 'loja', 'descanso']
      : ['tesouro', 'descanso', 'loja', 'combate', 'evento', 'elite'];
  for (const kind of order) if (pick(kind) !== -1) return pick(kind);
  return 0;
}

function autoStep(state: RoguelikeState, ctx: ModeContext): RoguelikeState {
  const run = state.run;
  if (!run) return startRun(state, ctx, true);
  if (run.shopOpen) {
    const needsHeal = run.hp / run.maxHp < 0.6;
    const bought = needsHeal ? buyShopItem(state, 'pocao', ctx) : buyShopItem(state, 'lamina', ctx);
    return leaveShop(bought);
  }
  const move = autoPick(run);
  return move === 'retreat' ? endRun(state, true, ctx) : choose(state, move, ctx);
}

export function tick(state: RoguelikeState, dt: number, ctx: ModeContext): RoguelikeState {
  if (!state.autoEnabled || !canAutoExplore(state, ctx)) return state;
  let next: RoguelikeState = { ...state, autoTimer: state.autoTimer + dt };
  while (next.autoTimer >= AUTO_INTERVAL) {
    next = autoStep({ ...next, autoTimer: next.autoTimer - AUTO_INTERVAL }, ctx);
  }
  return next;
}

export function buyUpgrade(state: RoguelikeState, id: UpgradeId): RoguelikeState {
  const cost = upgradeCost(state, id);
  if (state.upgrades[id] >= UPGRADES[id].max || state.fragments < cost) return state;
  return {
    ...state,
    fragments: state.fragments - cost,
    upgrades: { ...state.upgrades, [id]: state.upgrades[id] + 1 },
  };
}

export function unlockClass(state: RoguelikeState, id: ClassId): RoguelikeState {
  const cost = CLASSES[id].unlockCost;
  if (state.classes.includes(id) || state.fragments < cost) return state;
  return { ...state, fragments: state.fragments - cost, classes: [...state.classes, id], selectedClass: id };
}

export function selectClass(state: RoguelikeState, id: ClassId): RoguelikeState {
  return state.classes.includes(id) ? { ...state, selectedClass: id } : state;
}

export function toggleCurse(state: RoguelikeState, id: CurseId): RoguelikeState {
  const selectedCurses = state.selectedCurses.includes(id)
    ? state.selectedCurses.filter((c) => c !== id)
    : [...state.selectedCurses, id];
  return { ...state, selectedCurses };
}

export function essenceRate(state: RoguelikeState): number {
  return 0.15 * state.bestDepth ** 1.2;
}

export function provides(state: RoguelikeState): ModeBonus[] {
  const relicBonuses = state.relics.map((id) => {
    const r = RELICS[id];
    return { target: r.target, stat: r.stat, value: r.value, source: r.name };
  });
  return [
    ...relicBonuses,
    { target: 'grid', stat: 'production', value: 1 + 0.02 * state.bestDepth, source: 'Mapas da Expedição' },
  ];
}

export function restore(saved: unknown): RoguelikeState {
  const s = (saved ?? {}) as Partial<RoguelikeState>;
  const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback);
  const u = (s.upgrades ?? {}) as Partial<Record<UpgradeId, number>>;
  const pickList = <T extends string>(v: unknown, valid: readonly T[]): T[] =>
    Array.isArray(v) ? [...new Set(v.filter((x): x is T => valid.includes(x as T)))] : [];
  const run = s.run as Partial<Run> | null | undefined;
  const classes = pickList(s.classes, CLASS_IDS);
  if (!classes.includes('guerreiro')) classes.unshift('guerreiro');
  const validRun: Run | null =
    run && Array.isArray(run.options) && run.options.every((o) => o in ROOMS) && num(run.hp) > 0
      ? {
          depth: Math.floor(num(run.depth)),
          hp: num(run.hp),
          maxHp: num(run.maxHp, 20),
          power: num(run.power, 5),
          gold: num(run.gold),
          options: run.options as RoomKind[],
          revived: run.revived === true,
          classId: CLASS_IDS.includes(run.classId as ClassId) ? (run.classId as ClassId) : 'guerreiro',
          curses: pickList(run.curses, CURSE_IDS),
          shopOpen: run.shopOpen === true,
          auto: run.auto === true,
        }
      : null;
  const selectedClass = classes.includes(s.selectedClass as ClassId) ? (s.selectedClass as ClassId) : 'guerreiro';
  return {
    fragments: num(s.fragments),
    upgrades: {
      vigor: Math.floor(num(u.vigor)),
      forca: Math.floor(num(u.forca)),
      sorte: Math.min(UPGRADES.sorte.max, Math.floor(num(u.sorte))),
      ganancia: Math.floor(num(u.ganancia)),
      auto: Math.min(1, Math.floor(num(u.auto))),
    },
    relics: pickList(s.relics, RELIC_IDS),
    classes,
    selectedClass,
    selectedCurses: pickList(s.selectedCurses, CURSE_IDS),
    bestDepth: Math.floor(num(s.bestDepth)),
    bossesDefeated: Math.floor(num(s.bossesDefeated)),
    runs: Math.floor(num(s.runs)),
    run: validRun,
    log: Array.isArray(s.log) ? s.log.filter((l): l is string => typeof l === 'string').slice(0, LOG_SIZE) : [],
    seed: validSeed(s.seed, initialRoguelikeState.seed),
    autoEnabled: s.autoEnabled === true,
    autoTimer: 0,
  };
}
