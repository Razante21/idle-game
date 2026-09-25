import type { ModeBonus, ModeId, Stat } from './types';

export interface WeeklyEvent {
  id: string;
  name: string;
  description: string;
  target: ModeId | 'global';
  stat: Stat;
  value: number;
}

/** Um por semana ISO, sempre em ordem — dá pra saber o próximo evento com antecedência. */
export const WEEKLY_EVENTS: readonly WeeklyEvent[] = [
  { id: 'mare', name: 'Maré de Essência', description: 'Essência de todos os modos +20%', target: 'global', stat: 'essence', value: 1.2 },
  { id: 'voltagem', name: 'Sobrevoltagem', description: 'Produção do Núcleo +40%', target: 'baseClicker', stat: 'production', value: 1.4 },
  { id: 'forja', name: 'Semana da Forja', description: 'Produção da Fábrica +40%', target: 'productionChain', stat: 'production', value: 1.4 },
  { id: 'ceuClaro', name: 'Céu Claro', description: 'Produção da Constelação +40%', target: 'grid', stat: 'production', value: 1.4 },
  { id: 'chamado', name: 'Chamado da Expedição', description: 'Força da Expedição +40%', target: 'roguelike', stat: 'production', value: 1.4 },
  { id: 'fluxoEterico', name: 'Fluxo Etérico', description: 'Éter da Ascensão +40%', target: 'parallelTree', stat: 'production', value: 1.4 },
  { id: 'floracao', name: 'Florada', description: 'Produção do Jardim +40%', target: 'garden', stat: 'production', value: 1.4 },
  { id: 'censo', name: 'Semana do Censo', description: 'Produção da Colônia +40%', target: 'colony', stat: 'production', value: 1.4 },
];

/** Semana ISO-8601 (quinta-feira decide o ano da semana), estável e sem depender de fuso do servidor. */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export function currentWeeklyEvent(now: Date = new Date()): WeeklyEvent {
  const week = isoWeek(now) + now.getUTCFullYear() * 53;
  return WEEKLY_EVENTS[((week % WEEKLY_EVENTS.length) + WEEKLY_EVENTS.length) % WEEKLY_EVENTS.length]!;
}

export function weeklyEventBonus(now: Date = new Date()): ModeBonus {
  const e = currentWeeklyEvent(now);
  return { target: e.target, stat: e.stat, value: e.value, source: `Evento: ${e.name}` };
}
