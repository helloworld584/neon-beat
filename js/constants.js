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
  HIT_Y: 714,                    // default hit-line Y (overridden by gameState.hitY)
  SPAWN_Y: -32,                  // -NOTE_H - 4
  LEAD_BEATS: 3,
  LEAD_MS: 3 * (60000 / 128),    // 1406.25 ms
  SPD: (714 - (-32)) / (3 * (60000 / 128)), // px/ms ≈ 0.5126 (reference only)
  PERF_WIN: 50,                  // ± ms perfect
  GOOD_WIN: 100,                 // ± ms good
  NOTE_SHAPE: 'rectangle',       // 'rectangle' | 'circle'
  JUDGMENT_LINE_Y: 0.82,         // default fraction of canvas height
};

export const NOTE_SPEED_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export const INPUT = {
  KEY_MAP_4: { d: 0, f: 1, j: 2, k: 3 },
  KEY_MAP_6: { d: 0, f: 1, g: 2, h: 3, j: 4, k: 5 },
  KEY_LABELS_4: ['D', 'F', 'J', 'K'],
  KEY_LABELS_6: ['D', 'F', 'G', 'H', 'J', 'K'],
};

export const VISUAL = {
  // 6 entries so double_lane (6-lane) works without change
  LANE_COL: ['#00ffff', '#ff00ff', '#00ffff', '#ff00ff', '#00ffff', '#ff00ff'],
};

export const GAME_STATES = {
  LOADING: 'LOADING',
  TITLE: 'TITLE',
  MUSIC_SELECT: 'MUSIC_SELECT',
  SHOP: 'SHOP',
  PLAYING: 'PLAYING',
  GAMEOVER: 'GAMEOVER',
  KEYBINDINGS: 'KEYBINDINGS',
  SETTINGS: 'SETTINGS',
  THEME_SELECT: 'THEME_SELECT',
};

export const JUDGMENT_LINE_LEVELS = [0.70, 0.75, 0.80, 0.85, 0.90];

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

export const SHOP_ITEMS = [
  { id: 'overclock',   name: 'OVERCLOCK',    desc: 'Speed +20%  /  Score ×2',           cost: 300 },
  { id: 'ghost_notes', name: 'GHOST NOTES',  desc: 'Notes fade  /  Perfect +50ms',       cost: 200 },
  { id: 'double_lane', name: 'DOUBLE LANE',  desc: 'Expand to 6 lanes',                  cost: 500 },
  { id: 'auto_heal',   name: 'AUTO-HEAL',    desc: 'Perfect ×10  →  score ×1.5 bonus',   cost: 150 },
  { id: 'score_virus', name: 'SCORE VIRUS',  desc: 'Miss  −100  /  Clear  ×3',           cost: 0   },
  { id: 'mirror',      name: 'MIRROR',       desc: 'Lanes reversed  /  Score ×1.5',      cost: 100 },
];

export const VIBE_COLORS = {
  AGGRESSIVE:  '#ff4422',
  ADVENTURE:   '#44ff88',
  SPORT:       '#ffcc00',
  ATMOSPHERIC: '#9955ff',
  RETROWAVE:   '#ff00aa',
  FUTURISTIC:  '#00ffff',
  CINEMATIC:   '#ffaa00',
};
