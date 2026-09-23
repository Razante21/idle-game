import { useSettings } from './settings';

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function formatNumber(value: number): string {
  if (Number.isNaN(value)) return '—';
  if (!Number.isFinite(value)) return '∞';
  if (value < 0) return `-${formatNumber(-value)}`;
  if (value < 1000) {
    if (Number.isInteger(value)) return String(value);
    return value < 10 ? value.toFixed(2) : value.toFixed(1);
  }
  const tier = Math.floor(Math.log10(value) / 3);
  if (tier >= SUFFIXES.length || useSettings.getState().notation === 'cientifica') {
    return value.toExponential(2).replace('+', '');
  }
  const scaled = value / 10 ** (tier * 3);
  const digits = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
  return `${scaled.toFixed(digits)}${SUFFIXES[tier]}`;
}

export function formatDuration(seconds: number): string {
  const s = Math.floor(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s % 60}s`;
  return `${s}s`;
}
