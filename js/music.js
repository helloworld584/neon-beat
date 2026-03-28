// ================================================================
// NEON BEAT – Music Player
// ================================================================

import { TRACKS } from './constants.js';
import { analyzeAudio } from './beatdetect.js';

class MusicPlayer {
  constructor() {
    this.audio = null;
    this.previewTimer = null;
    this.isPreviewing = false;
    this._pendingPlay = false;
    // BGM state (title / music-select background music)
    this._bgmActive = false;
    this._bgmTime = 0;     // saved position for restore after preview
    // Per-track analysis cache: index → 'pending' | {bpm, beatMs, beats}
    this._analysisCache = {};
  }

  init() {
    this.audio = document.getElementById('bgm');
    if (!this.audio) {
      console.error('[MusicPlayer] <audio id="bgm"> not found in DOM');
      return;
    }
    this.audio.volume = 0.75;
    this.audio.onerror = (e) => {
      console.warn('[MusicPlayer] audio error:', this.audio.src, e.type,
        this.audio.error ? `code=${this.audio.error.code}` : '');
    };
    console.log('[MusicPlayer] initialized, audio element found');
  }

  _load(index, loop) {
    if (!this.audio) return;
    const track = TRACKS[index];
    const src = `assets/music/${track.file}`;
    console.log(`[MusicPlayer] _load(${index}) "${track.title}" → src="${src}" loop=${loop}`);
    this.audio.src = src;
    this.audio.loop = loop;
    this.audio.currentTime = 0;
  }

  // ── BGM (title / music-select background) ────────────────────────
  // Plays neon_fury (track 0) at reduced volume. Safe to call if already running.
  playBgm() {
    if (this._bgmActive) return;
    this._bgmActive = true;
    if (!this.audio) return;
    this.audio.src = `assets/music/${TRACKS[0].file}`;
    this.audio.loop = true;
    this.audio.volume = 0.4;
    this.audio.currentTime = this._bgmTime || 0;
    this.audio.play().catch((err) => {
      console.warn('[MusicPlayer] BGM blocked:', err.name);
    });
    console.log('[MusicPlayer] BGM started');
  }

  // ── Game-track playback ───────────────────────────────────────────
  play(index) {
    this._bgmActive = false;    // deactivate BGM before stopPreview
    this.stopPreview();
    this._load(index, true);
    this._pendingPlay = false;
    this.audio.volume = 0.75;   // restore full game volume
    console.log('[MusicPlayer] calling audio.play()…');
    const p = this.audio.play();
    if (p !== undefined) {
      p.then(() => {
        console.log('[MusicPlayer] audio.play() resolved — music playing');
      }).catch((err) => {
        console.warn('[MusicPlayer] audio.play() blocked:', err.name, err.message);
        this._pendingPlay = true;
      });
    }
  }

  // Retry play on the next user gesture (called from onPress in input.js)
  resumeIfPending() {
    if (this._pendingPlay && this.audio && this.audio.paused) {
      this._pendingPlay = false;
      console.log('[MusicPlayer] resuming blocked audio on user gesture');
      this.audio.play().catch(() => {});
    }
  }

  preview(index) {
    // Save BGM position so we can restore it after preview ends
    if (this._bgmActive && this.audio) {
      this._bgmTime = this.audio.currentTime;
    }
    this.stopPreview();
    this._load(index, false);
    this.audio.play().catch(() => {});
    this.isPreviewing = true;
    this.previewTimer = setTimeout(() => this.stopPreview(), 10000);
  }

  stopPreview() {
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
    if (this.isPreviewing) {
      if (this.audio) {
        this.audio.pause();
        this.audio.currentTime = 0;
      }
      this.isPreviewing = false;
      // Restore BGM if it was active when preview started
      if (this._bgmActive && this.audio) {
        this.audio.src = `assets/music/${TRACKS[0].file}`;
        this.audio.loop = true;
        this.audio.volume = 0.4;
        this.audio.currentTime = this._bgmTime || 0;
        this.audio.play().catch(() => {});
        console.log('[MusicPlayer] BGM restored after preview');
      }
    }
  }

  pause() {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
  }

  resume() {
    if (this.audio && this.audio.paused && this.audio.src) {
      this.audio.play().catch(() => {});
    }
  }

  stop() {
    this._bgmActive = false;    // deactivate BGM before stopPreview
    this.stopPreview();
    this._pendingPlay = false;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  setMuted(muted) {
    if (this.audio) this.audio.muted = muted;
  }

  // ── Beat analysis ─────────────────────────────────────────────────
  // Start async analysis for a track. Results cached by index.
  async startAnalysis(index) {
    if (this._analysisCache[index] !== undefined) return; // already running or done
    this._analysisCache[index] = 'pending';
    try {
      const src = `assets/music/${TRACKS[index].file}`;
      const result = await analyzeAudio(src);
      this._analysisCache[index] = result;
      console.log(`[MusicPlayer] analysis[${index}] done: bpm=${result.bpm} beats=${result.beats.length}`);
    } catch (e) {
      console.warn(`[MusicPlayer] analysis[${index}] failed:`, e);
      delete this._analysisCache[index];
    }
  }

  // Returns analysis result if done, or null if pending/unavailable.
  getAnalysis(index) {
    const v = this._analysisCache[index];
    return (v && v !== 'pending') ? v : null;
  }

  // Returns true while analysis for this track is in progress.
  isAnalyzing(index) {
    return this._analysisCache[index] === 'pending';
  }
}

export const musicPlayer = new MusicPlayer();
