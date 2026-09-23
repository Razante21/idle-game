import type { ModeBonus, ModeContext, ModeId, Stat } from '../../core/types';

export type RoomKind = 'combate' | 'elite' | 'tesouro' | 'descanso' | 'evento' | 'chefe';
export type RelicId = 'coracao' | 'engrenagem' | 'lente' | 'bussola' | 'calice' | 'coroa';
export type UpgradeId = 'vigor' | 'forca' | 'sorte' | 'auto';

export const ROOMS: Record<RoomKind, { name: string; hint: string }> = {
  combate: { name: 'Combate', hint: 'Ouro e +6% de força' },
  elite: { name: 'Elite', hint: 'Inimigo forte: muito ouro e +15% de força' },
  tesouro: { name: 'Tesouro', hint: 'Ouro sem risco' },
  descanso: { name: 'Descanso', hint: 'Recupera 35% dos PV' },
  evento: { name: 'Evento', hint: 'Bênção ou armadilha' },
  chefe: { name: 'Chefe', hint: 'Pode deixar uma relíquia' },
};

export const RELICS: Record<RelicId, { name: string; description: string; target: ModeId | 'global'; stat: Stat; value: number }> = {
  coracao: { name: 'Coração Pulsante', description: 'Produção do Núcleo x2', target: 'baseClicker', stat: 'production', value: 2 },
  engrenagem: { name: 'Engrenagem Antiga', description: 'Produção da Fábrica x2', target: 'productionChain', stat: 'production', value: 2 },
  lente: { name: 'Lente Estelar', description: 'Poeira da Constelação x2', target: 'grid', stat: 'production', value: 2 },
  bussola: { name: 'Bússola Partida', description: 'Força na Expedição x1.5', target: 'roguelike', stat: 'production', value: 1.5 },
  calice: { name: 'Cálice de Éter', description: 'Éter da Ascensão x2', target: 'parallelTree', stat: 'production', value: 2 },
  coroa: { name: 'Coroa da Rede', description: 'Essência de todos os modos x1.25', target: 'global', stat: 'essence', value: 1.25 },
};

export const RELIC_IDS = Object.keys(RELICS) as RelicId[];

export const UPGRADES: Record<UpgradeId, { name: string; description: string; baseCost: number; growth: number; max: number }> = {
  vigor: { name: 'Vigor', description: '+10 PV máximos', baseCost: 5, growth: 1.5, max: Infinity },
  forca: { name: 'Força', description: '+2 de força inicial', baseCost: 5, growth: 1.5, max: Infinity },
  sorte: { name: 'Sorte', description: 'Eventos e relíquias melhores', baseCost: 10, growth: 2, max: 10 },
  auto: { name: 'Batedor', description: 'Libera a exploração automática', baseCost: 50, growth: 1, max: 1 },
};

const BOSS_EVERY = 5;
const AUTO_INTERVAL = 1.5;
const LOG_SIZE = 8;
const ROOM_WEIGHTS: [RoomKind, number][] = [
  ['combate', 40],
  ['elite', 12],
  ['tesouro', 15],
  ['descanso', 15],
  ['evento', 18],
];

export interface Run {
  depth: number;
  hp: number;
  maxHp: number;
  power: number;
  gold: number;
  options: RoomKind[];
  revived: boolean;
}

export interface RoguelikeState {
  fragments: number;
  upgrades: Record<UpgradeId, number>;
  relics: RelicId[];
  bestDepth: number;
  runs: number;
  run: Run | null;
  log: string[];
  seed: number;
  autoEnabled: boolean;
  autoTimer: number;
}

export const initialRoguelikeState: RoguelikeState = {
  fragments: 0,
  upgrades: { vigor: 0, forca: 0, sorte: 0, auto: 0 },
  relics: [],
  bestDepth: 0,
  runs: 0,
  run: null,
  log: [],
  seed: 20260923,
  autoEnabled: false,
  autoTimer: 0,
};

/** Gerador mulberry32: o estado da sorte fica no save, então a mesma escolha sempre tem o mesmo resultado. */
function createRng(seed: number) {
  let s = seed | 0;
  return {
    next() {
      s = (s + 0x6d2b79f5) | 0;
      let r = Math.imul(s ^ (s >>> 15), 1 | s);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    },
    get seed() {
      return s;
    },
  };
}
type Rng = ReturnType<typeof createRng>;

export function enemyStrength(depth: number): number {
  return 4 * 1.22 ** depth;
}

export function upgradeCost(state: RoguelikeState, id: UpgradeId): number {
  const u = UPGRADES[id];
  return Math.ceil(u.baseCost * u.growth ** state.upgrades[id]);
}

export function canAutoExplore(state: RoguelikeState, ctx: ModeContext): boolean {
  return state.upgrades.auto > 0 || ctx.hasFlag('expedicao.autoGratis');
}

export function startingStats(state: RoguelikeState, ctx: ModeContext) {
  return {
    maxHp: 20 + state.upgrades.vigor * 10,
    power: (5 + state.upgrades.forca * 2) * ctx.multiplier('production'),
  };
}

export function runReward(run: Run, returned: boolean): number {
  return Math.floor(run.depth ** 1.5) + (returned ? Math.floor(run.gold / 10) : 0);
}

function pushLog(log: string[], entry: string): string[] {
  return [entry, ...log].slice(0, LOG_SIZE);
}

function rollOptions(depth: number, rng: Rng): RoomKind[] {
  if (depth % BOSS_EVERY === 0) return ['chefe'];
  const pool = [...ROOM_WEIGHTS];
  const options: RoomKind[] = [];
  while (options.length < 3 && pool.length > 0) {
    const total = pool.reduce((sum, [, w]) => sum + w, 0);
    let roll = rng.next() * total;
    const index = pool.findIndex(([, w]) => (roll -= w) < 0);
    const [kind] = pool.splice(index === -1 ? pool.length - 1 : index, 1)[0]!;
    options.push(kind);
  }
  return options;
}

export function startRun(state: RoguelikeState, ctx: ModeContext): RoguelikeState {
  if (state.run) return state;
  const rng = createRng(state.seed);
  const { maxHp, power } = startingStats(state, ctx);
  return {
    ...state,
    run: { depth: 0, hp: maxHp, maxHp, power, gold: 0, options: rollOptions(1, rng), revived: false },
    log: pushLog(state.log, 'Uma nova expedição começa.'),
    seed: rng.seed,
  };
}

export function endRun(state: RoguelikeState, returned: boolean): RoguelikeState {
  const run = state.run;
  if (!run) return state;
  const reward = runReward(run, returned);
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

export function choose(state: RoguelikeState, optionIndex: number, ctx: ModeContext): RoguelikeState {
  const current = state.run;
  const kind = current?.options[optionIndex];
  if (!current || !kind) return state;

  const rng = createRng(state.seed);
  const depth = current.depth + 1;
  const run: Run = { ...current };
  let relics = state.relics;
  let message: string;
  const str = enemyStrength(depth);
  const luck = state.upgrades.sorte;

  switch (kind) {
    case 'combate':
    case 'elite': {
      const elite = kind === 'elite';
      const enemy = elite ? str * 1.8 : str;
      const dmg = fight(run, enemy, rng);
      const gold = Math.ceil(enemy * (1 + rng.next()) * (elite ? 3 : 1));
      run.hp -= dmg;
      run.gold += gold;
      run.power *= elite ? 1.15 : 1.06;
      message = `${ROOMS[kind].name}: -${dmg} PV, +${gold} ouro.`;
      break;
    }
    case 'tesouro': {
      const gold = Math.ceil(str * 2 * (1 + rng.next()));
      run.gold += gold;
      message = `Tesouro: +${gold} ouro.`;
      break;
    }
    case 'descanso': {
      const heal = Math.min(run.maxHp - run.hp, Math.ceil(run.maxHp * 0.35));
      run.hp += heal;
      message = `Descanso: +${heal} PV.`;
      break;
    }
    case 'evento': {
      if (rng.next() < 0.6 + 0.04 * luck) {
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
    case 'chefe': {
      const dmg = fight(run, str * 3, rng);
      run.hp -= dmg;
      run.power *= 1.2;
      const missing = RELIC_IDS.filter((r) => !relics.includes(r));
      if (run.hp > 0 && missing.length > 0 && rng.next() < 0.5 + 0.05 * luck) {
        const relic = missing[Math.floor(rng.next() * missing.length)]!;
        relics = [...relics, relic];
        message = `Chefe derrotado (-${dmg} PV)! Relíquia: ${RELICS[relic].name}.`;
      } else {
        const gold = Math.ceil(str * 5);
        run.gold += gold;
        message = `Chefe: -${dmg} PV, +${gold} ouro.`;
      }
      break;
    }
  }

  let log = pushLog(state.log, `Andar ${depth} · ${message}`);
  if (run.hp <= 0 && ctx.hasFlag('expedicao.segundaChance') && !run.revived) {
    run.hp = Math.ceil(run.maxHp * 0.5);
    run.revived = true;
    log = pushLog(log, 'Fênix: você renasce com metade dos PV.');
  }

  run.depth = depth;
  const next: RoguelikeState = {
    ...state,
    relics,
    bestDepth: Math.max(state.bestDepth, depth),
    log,
    run,
  };
  if (run.hp <= 0) return endRun({ ...next, seed: rng.seed }, false);
  run.options = rollOptions(depth + 1, rng);
  return { ...next, seed: rng.seed };
}

/** Escolha do Batedor: descansa quando fraco, volta antes de morrer, prefere salas lucrativas quando forte. */
export function autoPick(run: Run): number | 'retreat' {
  const ratio = run.hp / run.maxHp;
  const pick = (kind: RoomKind) => run.options.indexOf(kind);
  if (ratio < 0.4 && pick('descanso') !== -1) return pick('descanso');
  if (ratio < 0.3) return 'retreat';
  if (run.options[0] === 'chefe') return ratio > 0.6 ? 0 : 'retreat';
  const order: RoomKind[] = ratio > 0.7 ? ['tesouro', 'elite', 'evento', 'combate', 'descanso'] : ['tesouro', 'descanso', 'combate', 'evento', 'elite'];
  for (const kind of order) if (pick(kind) !== -1) return pick(kind);
  return 0;
}

export function tick(state: RoguelikeState, dt: number, ctx: ModeContext): RoguelikeState {
  if (!state.autoEnabled || !canAutoExplore(state, ctx)) return state;
  let next: RoguelikeState = { ...state, autoTimer: state.autoTimer + dt };
  while (next.autoTimer >= AUTO_INTERVAL) {
    next = { ...next, autoTimer: next.autoTimer - AUTO_INTERVAL };
    if (!next.run) {
      next = startRun(next, ctx);
      continue;
    }
    const move = autoPick(next.run);
    next = move === 'retreat' ? endRun(next, true) : choose(next, move, ctx);
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
  const run = s.run as Partial<Run> | null | undefined;
  const validRun =
    run && Array.isArray(run.options) && run.options.every((o) => o in ROOMS) && num(run.hp) > 0
      ? {
          depth: Math.floor(num(run.depth)),
          hp: num(run.hp),
          maxHp: num(run.maxHp, 20),
          power: num(run.power, 5),
          gold: num(run.gold),
          options: run.options as RoomKind[],
          revived: run.revived === true,
        }
      : null;
  return {
    fragments: num(s.fragments),
    upgrades: {
      vigor: Math.floor(num(u.vigor)),
      forca: Math.floor(num(u.forca)),
      sorte: Math.min(UPGRADES.sorte.max, Math.floor(num(u.sorte))),
      auto: Math.min(1, Math.floor(num(u.auto))),
    },
    relics: Array.isArray(s.relics) ? s.relics.filter((r): r is RelicId => RELIC_IDS.includes(r as RelicId)) : [],
    bestDepth: Math.floor(num(s.bestDepth)),
    runs: Math.floor(num(s.runs)),
    run: validRun,
    log: Array.isArray(s.log) ? s.log.filter((l): l is string => typeof l === 'string').slice(0, LOG_SIZE) : [],
    seed: typeof s.seed === 'number' && Number.isInteger(s.seed) ? s.seed : initialRoguelikeState.seed,
    autoEnabled: s.autoEnabled === true,
    autoTimer: 0,
  };
}
