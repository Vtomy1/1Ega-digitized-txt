// Optional retro PC speaker sound generator using Web Audio API

let audioCtx: AudioContext | null = null;
let soundEnabled = false;

export function setAudioEnabled(enabled: boolean) {
  soundEnabled = enabled;
  if (enabled && !audioCtx) {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AudioContextClass();
    } catch {
      // AudioContext not supported
    }
  }
}

export function isAudioEnabled(): boolean {
  return soundEnabled;
}

/**
 * Play a vintage PC speaker beep (square wave)
 */
export function playRetroBeep(frequency = 880, duration = 0.04, volume = 0.08) {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'square'; // Classic 8253 PIT chip square wave
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    // Ignore audio error
  }
}

/**
 * Play subtle raster scanline sweep tick
 */
export function playScanlineTick(pitchFactor = 1) {
  if (!soundEnabled) return;
  playRetroBeep(440 * pitchFactor, 0.015, 0.04);
}

/**
 * Play QBasic completion chime
 */
export function playCompletionChime() {
  if (!soundEnabled) return;
  setTimeout(() => playRetroBeep(523.25, 0.08, 0.1), 0);
  setTimeout(() => playRetroBeep(659.25, 0.08, 0.1), 100);
  setTimeout(() => playRetroBeep(783.99, 0.16, 0.12), 200);
}
