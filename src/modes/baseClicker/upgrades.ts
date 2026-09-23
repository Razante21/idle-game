export interface GeneratorDef {
  name: string;
  baseCost: number;
  baseRate: number;
  growth: number;
}

export const GENERATORS: GeneratorDef[] = [
  { name: 'Faísca', baseCost: 10, baseRate: 0.5, growth: 1.15 },
  { name: 'Dínamo', baseCost: 120, baseRate: 4, growth: 1.15 },
  { name: 'Reator', baseCost: 1_400, baseRate: 30, growth: 1.15 },
  { name: 'Estrela', baseCost: 16_000, baseRate: 220, growth: 1.15 },
  { name: 'Pulsar', baseCost: 200_000, baseRate: 1_800, growth: 1.15 },
  { name: 'Quasar', baseCost: 3_000_000, baseRate: 16_000, growth: 1.15 },
  { name: 'Magnetar', baseCost: 50_000_000, baseRate: 140_000, growth: 1.17 },
  { name: 'Supernova', baseCost: 800_000_000, baseRate: 1_200_000, growth: 1.17 },
  { name: 'Buraco Branco', baseCost: 15e9, baseRate: 11e6, growth: 1.17 },
  { name: 'Galáxia', baseCost: 300e9, baseRate: 100e6, growth: 1.17 },
  { name: 'Aglomerado', baseCost: 7e12, baseRate: 900e6, growth: 1.17 },
  { name: 'Singularidade', baseCost: 200e12, baseRate: 8.5e9, growth: 1.17 },
];

export type UpgradeRequirement =
  | { kind: 'owned'; index: number; count: number }
  | { kind: 'pair'; a: number; b: number; count: number }
  | { kind: 'clicks'; count: number }
  | { kind: 'surges'; count: number };

export type UpgradeEffect =
  | { type: 'generator'; index: number; mult: number }
  | { type: 'click'; mult: number; share: number }
  | { type: 'synergy'; from: number; to: number; perUnit: number }
  | { type: 'surge'; frequency: number; duration: number };

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  requirement: UpgradeRequirement;
  effect: UpgradeEffect;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const TIER_THRESHOLDS = [1, 10, 25, 50, 100, 150];
const TIER_COST_MULT = [20, 150, 2_000, 30_000, 500_000, 10_000_000];

const tierUpgrades: UpgradeDef[] = GENERATORS.flatMap((g, index) =>
  TIER_THRESHOLDS.map((count, k) => ({
    id: `gen-${index}-${k}`,
    name: `${g.name} ${ROMAN[k]}`,
    description: `${g.name}: produção x2`,
    cost: g.baseCost * TIER_COST_MULT[k]!,
    requirement: { kind: 'owned', index, count },
    effect: { type: 'generator', index, mult: 2 },
  })),
);

const CLICK_NAMES = ['Dedos Ágeis', 'Toque Preciso', 'Mão de Ferro', 'Punho Estelar', 'Gesto Cósmico', 'Vontade do Nexus'];
const CLICK_REQS = [25, 100, 500, 2_000, 8_000, 25_000];
const CLICK_COSTS = [50, 2_000, 200_000, 2e7, 2e9, 2e11];

const clickUpgrades: UpgradeDef[] = CLICK_NAMES.map((name, k) => ({
  id: `click-${k}`,
  name,
  description: 'Clique x2 e +1% da produção por clique',
  cost: CLICK_COSTS[k]!,
  requirement: { kind: 'clicks', count: CLICK_REQS[k]! },
  effect: { type: 'click', mult: 2, share: 0.01 },
}));

const synergyUpgrades: UpgradeDef[] = GENERATORS.slice(0, -1).map((g, from) => {
  const to = from + 1;
  const target = GENERATORS[to]!;
  return {
    id: `syn-${from}`,
    name: `Ressonância ${g.name}–${target.name}`,
    description: `${target.name} +1% para cada ${g.name}`,
    cost: target.baseCost * 40,
    requirement: { kind: 'pair', a: from, b: to, count: 15 },
    effect: { type: 'synergy', from, to, perUnit: 0.01 },
  };
});

const surgeUpgrades: UpgradeDef[] = [
  {
    id: 'surge-0',
    name: 'Sorte Cósmica',
    description: 'Surtos aparecem 25% mais vezes',
    cost: 5_000,
    requirement: { kind: 'surges', count: 3 },
    effect: { type: 'surge', frequency: 0.75, duration: 0 },
  },
  {
    id: 'surge-1',
    name: 'Surto Prolongado',
    description: 'Surtos duram 15s a mais',
    cost: 500_000,
    requirement: { kind: 'surges', count: 10 },
    effect: { type: 'surge', frequency: 1, duration: 15 },
  },
  {
    id: 'surge-2',
    name: 'Tempestade Solar',
    description: 'Surtos aparecem 25% mais vezes',
    cost: 5e7,
    requirement: { kind: 'surges', count: 30 },
    effect: { type: 'surge', frequency: 0.75, duration: 0 },
  },
];

export const UPGRADES: UpgradeDef[] = [...tierUpgrades, ...clickUpgrades, ...synergyUpgrades, ...surgeUpgrades].sort(
  (a, b) => a.cost - b.cost,
);

export const UPGRADES_BY_ID: ReadonlyMap<string, UpgradeDef> = new Map(UPGRADES.map((u) => [u.id, u]));

export function requirementText(req: UpgradeRequirement): string {
  switch (req.kind) {
    case 'owned':
      return `Requer ${req.count} ${GENERATORS[req.index]!.name}`;
    case 'pair':
      return `Requer ${req.count} de ${GENERATORS[req.a]!.name} e ${GENERATORS[req.b]!.name}`;
    case 'clicks':
      return `Requer ${req.count} cliques`;
    case 'surges':
      return `Requer ${req.count} Surtos capturados`;
  }
}
