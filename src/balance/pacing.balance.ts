import { test } from 'vitest';
import { formatReport, runBot } from './bot';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const hours = Number(env.BALANCE_HOURS ?? 48);

test(`ritmo do jogo em ${hours}h de jogo simulado`, () => {
  const started = Date.now();
  const report = runBot({ hours });
  console.log(`\n${formatReport(report)}\n(simulado em ${((Date.now() - started) / 1000).toFixed(1)}s)`);
}, 1_800_000);
