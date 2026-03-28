// ================================================================
// NEON BEAT – Music Player
// ================================================================

import { TRACKS } from './constants.js';

class MusicPlayer {
  constructor() {
    this.audio = null;
    this.previewTimer = null;
    this.isPreviewing = false;
    this._pendingPlay = false;
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

  play(index) {
    this.stopPreview();
    this._load(index, true);
    this._pendingPlay = false;
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
}

export const musicPlayer = new MusicPlayer();
