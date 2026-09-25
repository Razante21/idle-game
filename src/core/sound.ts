import { useSettings } from './settings';

export type SoundId = 'click' | 'buy' | 'achievement' | 'collapse' | 'error';

interface Preset {
  freq: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  /** Se definido, a frequência desliza até `freq * sweep` durante o som (dá o "brilho" das conquistas). */
  sweep?: number;
}

const PRESETS: Record<SoundId, Preset> = {
  click: { freq: 520, duration: 0.05, type: 'triangle', gain: 0.05 },
  buy: { freq: 660, duration: 0.09, type: 'sine', gain: 0.06 },
  achievement: { freq: 660, duration: 0.25, type: 'sine', gain: 0.08, sweep: 1.5 },
  collapse: { freq: 180, duration: 0.6, type: 'sawtooth', gain: 0.07, sweep: 0.4 },
  error: { freq: 140, duration: 0.12, type: 'square', gain: 0.05 },
};

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

/** Toca um som sintetizado curtinho, se as configurações permitirem. Nunca lança — áudio é sempre opcional. */
export function playSound(id: SoundId): void {
  if (!useSettings.getState().sound) return;
  const audio = getContext();
  if (!audio) return;
  try {
    if (audio.state === 'suspended') void audio.resume();
    const { freq, duration, type, gain, sweep } = PRESETS[id];
    const osc = audio.createOscillator();
    const env = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    if (sweep) osc.frequency.exponentialRampToValueAtTime(freq * sweep, audio.currentTime + duration);
    env.gain.setValueAtTime(gain, audio.currentTime);
    env.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    osc.connect(env).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  } catch {
    // Autoplay bloqueado, contexto indisponível etc. — o jogo segue mudo, sem quebrar nada.
  }
}
