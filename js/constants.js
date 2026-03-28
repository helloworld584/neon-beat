// ================================================================
// NEON BEAT – Game Constants
// ================================================================

export const GAME = {
  W: 390,
  H: 844,
  BPM: 128,
  BEAT_MS: 60000 / 128,          // 468.75 ms
  LANES: 4,
  LANE_W: 390 / 4,               // 97.5 px
  NOTE_W: 85.5,                  // LANE_W - 12
  NOTE_H: 28,
  HIT_Y: 714,                    // hit-line Y
  SPAWN_Y: -32,                  // -NOTE_H - 4
  LEAD_BEATS: 3,
  LEAD_MS: 3 * (60000 / 128),    // 1406.25 ms
  SPD: (714 - (-32)) / (3 * (60000 / 128)), // px/ms ≈ 0.5126
  PERF_WIN: 50,                  // ± ms perfect
  GOOD_WIN: 100,                 // ± ms good
};

export const INPUT = {
  KEY_MAP: { d: 0, f: 1, j: 2, k: 3 },
  KEY_LABELS: ['D', 'F', 'J', 'K'],
};

export const VISUAL = {
  LANE_COL: ['#00ffff', '#ff00ff', '#00ffff', '#ff00ff'],
};

export const GAME_STATES = {
  LOADING: 'LOADING',
  TITLE: 'TITLE',
  MUSIC_SELECT: 'MUSIC_SELECT',
  PLAYING: 'PLAYING',
  GAMEOVER: 'GAMEOVER',
};

export const TRACKS = [
  { title: 'Neon Fury',                 artist: 'Neura-Flow',        vibe: 'AGGRESSIVE',  file: 'neon_fury.mp3' },
  { title: 'Stranger Things',           artist: 'Music_Unlimited',   vibe: 'ADVENTURE',   file: 'stranger_things.mp3' },
  { title: 'Pixel Rage',                artist: 'Neura-Flow',        vibe: 'SPORT',       file: 'pixel_rage.mp3' },
  { title: 'Password Infinity',         artist: 'Evgeny_Bardyuzha',  vibe: 'ATMOSPHERIC', file: 'password_infinity.mp3' },
  { title: 'Neon Odyssey',              artist: 'Grand_Project',     vibe: 'RETROWAVE',   file: 'neon_odyssey.mp3' },
  { title: 'Cyberpunk Futuristic City', artist: 'INPLUSMUSIC',       vibe: 'FUTURISTIC',  file: 'cyberpunk_city.mp3' },
  { title: 'The Sun_Long',              artist: 'Grand_Project',     vibe: 'CINEMATIC',   file: 'the_sun_long.mp3' },
];

export const SPEED_MULTIPLIERS = [0.75, 1.0, 1.25, 1.5];

export const VIBE_COLORS = {
  AGGRESSIVE:  '#ff4422',
  ADVENTURE:   '#44ff88',
  SPORT:       '#ffcc00',
  ATMOSPHERIC: '#9955ff',
  RETROWAVE:   '#ff00aa',
  FUTURISTIC:  '#00ffff',
  CINEMATIC:   '#ffaa00',
};
