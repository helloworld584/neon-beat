// ================================================================
// NEON BEAT – Beat Detection & Auto-Chart Generation
// ================================================================

import { GAME } from './constants.js';
import { PATTERNS, SONG, makeChart } from './chart.js';

/**
 * Fetch an audio file, decode it, and detect beats.
 * @param {string} src - URL of the audio file
 * @returns {Promise<{bpm: number, beatMs: number, beats: number[]}>}
 */
export async function analyzeAudio(src) {
  const response = await fetch(src);
  const arrayBuffer = await response.arrayBuffer();

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let audioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    audioCtx.close();
  }

  return detectBeats(audioBuffer);
}

function detectBeats(audioBuffer) {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  // ── Energy envelope (~11 ms hops) ────────────────────────────────
  const hopSize = Math.round(sampleRate * 0.011);
  const winSize = hopSize * 2;
  const energies = [];

  for (let i = 0; i + winSize < channelData.length; i += hopSize) {
    let e = 0;
    for (let j = 0; j < winSize; j++) e += channelData[i + j] ** 2;
    energies.push(e / winSize);
  }

  // ── Onset detection function (positive energy flux) ───────────────
  const odf = [0];
  for (let i = 1; i < energies.length; i++) {
    odf.push(Math.max(0, energies[i] - energies[i - 1]));
  }

  // ── Adaptive threshold (local mean ±200 ms × 1.5) ─────────────────
  const frameMs = (hopSize / sampleRate) * 1000;
  const threshWin = Math.round(200 / frameMs);
  const threshold = odf.map((_, i) => {
    const s = Math.max(0, i - threshWin);
    const e = Math.min(odf.length, i + threshWin + 1);
    let sum = 0;
    for (let j = s; j < e; j++) sum += odf[j];
    return (sum / (e - s)) * 1.5;
  });

  // ── Peak picking (min 250 ms gap between beats) ───────────────────
  const minGap = Math.round(250 / frameMs);
  const beats = []; // timestamps in ms
  let lastPeak = -minGap;

  for (let i = 1; i < odf.length - 1; i++) {
    if (
      odf[i] > threshold[i] &&
      odf[i] > odf[i - 1] &&
      odf[i] >= odf[i + 1] &&
      i - lastPeak >= minGap
    ) {
      beats.push((i * hopSize / sampleRate) * 1000);
      lastPeak = i;
    }
  }

  if (beats.length < 4) {
    console.warn('[beatdetect] too few beats detected, using fallback BPM');
    return { bpm: GAME.BPM, beatMs: GAME.BEAT_MS, beats: [] };
  }

  // ── BPM histogram (5 ms bins, 250–1000 ms range) ──────────────────
  const binW = 5, minMs = 250, maxMs = 1000;
  const binCount = Math.ceil((maxMs - minMs) / binW);
  const bins = new Array(binCount).fill(0);

  for (let i = 1; i < beats.length; i++) {
    const iv = beats[i] - beats[i - 1];
    if (iv >= minMs && iv < maxMs) {
      bins[Math.floor((iv - minMs) / binW)]++;
    } else {
      // Tempo octave folding: half the interval might be the actual beat
      for (let m = 2; m <= 4; m++) {
        const folded = iv / m;
        if (folded >= minMs && folded < maxMs) {
          bins[Math.floor((folded - minMs) / binW)] += 0.5;
        }
      }
    }
  }

  let bestBin = 0;
  for (let i = 1; i < bins.length; i++) {
    if (bins[i] > bins[bestBin]) bestBin = i;
  }

  const beatMs = minMs + bestBin * binW + binW / 2;
  const bpm = Math.round(60000 / beatMs);

  console.log(`[beatdetect] bpm=${bpm} beatMs=${beatMs.toFixed(1)} beats=${beats.length}`);
  return { bpm, beatMs, beats };
}

/**
 * Generate a note chart mapped to detected beat timestamps.
 * Uses the existing SONG/PATTERNS arrangement with real beat timing.
 * chartOffset is applied externally in state.startGame().
 *
 * @param {number[]} beats - detected beat timestamps in ms
 * @param {number}   beatMs - ms per beat
 * @returns {Array}  notes array (unsorted → sorted)
 */
export function makeChartFromBeats(beats, beatMs) {
  if (!beats || beats.length === 0) return makeChart();

  const LEAD = 4; // beat lead-in before song starts
  const notes = [];

  SONG.forEach((name, barIndex) => {
    PATTERNS[name].forEach(([beat, lane]) => {
      const beatIdx = LEAD + barIndex * 4 + beat;
      const fi = Math.floor(beatIdx);
      const frac = beatIdx - fi;

      let time;
      if (fi < beats.length) {
        const base = beats[fi];
        const next = fi + 1 < beats.length ? beats[fi + 1] : base + beatMs;
        time = base + frac * (next - base);
      } else {
        // Extrapolate beyond the last detected beat
        const last = beats[beats.length - 1];
        time = last + (beatIdx - (beats.length - 1)) * beatMs;
      }

      notes.push({ time, lane, y: GAME.SPAWN_Y, state: 'pending' });
    });
  });

  return notes.sort((a, b) => a.time - b.time);
}
