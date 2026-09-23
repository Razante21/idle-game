const STEP_SECONDS = 0.1;

/** Chama `onAdvance` com o tempo acumulado sempre que passar ao menos um passo. Retorna a função de parada. */
export function startTickLoop(onAdvance: (seconds: number) => void): () => void {
  let last = performance.now();
  let accumulated = 0;
  let frame = 0;

  const loop = (now: number) => {
    accumulated += (now - last) / 1000;
    last = now;
    if (accumulated >= STEP_SECONDS) {
      onAdvance(accumulated);
      accumulated = 0;
    }
    frame = requestAnimationFrame(loop);
  };

  frame = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(frame);
}
