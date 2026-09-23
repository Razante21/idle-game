/**
 * Converte uma taxa que pode crescer exponencialmente (produção de energia, poeira) em Essência/s
 * que cresce só polinomialmente no número de dígitos. Mantém os modos na mesma ordem de grandeza.
 */
export function logSquared(rate: number, divisor: number): number {
  return Math.log10(1 + Math.max(0, rate)) ** 2 / divisor;
}
