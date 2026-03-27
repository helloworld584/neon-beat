// ================================================================
// NEON BEAT – Music Player
// ================================================================

import { TRACKS } from './constants.js';

class MusicPlayer {
  constructor() {
    this.audio = null;
    this.previewTimer = null;
    this.isPreviewing = false;
  }

  init() {
    this.audio = document.getElementById('bgm');
  }

  _load(index, loop) {
    if (!this.audio) return;
    const track = TRACKS[index];
    // Try local asset; the <source> fallback in HTML handles missing files gracefully
    this.audio.src = `assets/music/${track.file}`;
    this.audio.loop = loop;
    this.audio.currentTime = 0;
  }

  play(index) {
    this.stopPreview();
    this._load(index, true);
    this.audio.play().catch(() => {});
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

  stop() {
    this.stopPreview();
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
