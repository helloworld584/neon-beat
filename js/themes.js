// ================================================================
// NEON BEAT – Theme Definitions
// ================================================================

export const THEMES = {
  cyber: {
    name: 'CYBER', unlocked: true,
    unlockCondition: null,
    gimmick: null,
    gimmickLabel: null,
    noteTypes: ['tap', 'hold'],
    assets: {
      bg: 'assets/bg_skyline.png', bgRoad: 'assets/bg_road.png',
      shop: 'assets/bg_shop.png',
      hitEffect: 'assets/hit_effect.png',
      hitEffectSpecial: null,
      creditIcon: 'assets/icon_credit.png',
      specialBg: null,
      specialNote: null,
    },
    colors: {
      note: ['#00ffff', '#ff00ff', '#00ffff', '#ff00ff'],
      glow: '#00ffff', accent: '#ff00ff', ui: '#00ffff',
    },
    musicList: [
      'cyber/neon_fury', 'cyber/stranger_things', 'cyber/pixel_rage',
      'cyber/password_infinity', 'cyber/neon_odyssey',
      'cyber/cyberpunk_city', 'cyber/the_sun_long',
    ],
    bonusTrack: null,
  },
  forest: {
    name: 'FOREST', unlocked: false,
    unlockCondition: 'All Perfect on any song',
    gimmick: 'sway',
    gimmickLabel: 'GIMMICK: SWAY',
    noteTypes: ['tap', 'hold', 'trunk'],
    assets: {
      bg: 'assets/bg_forest.png', bgRoad: null,
      shop: 'assets/bg_shop_forest.png',
      hitEffect: 'assets/hit_forest.png',
      hitEffectSpecial: null,
      creditIcon: 'assets/icon_credit_forest.png',
      specialBg: null,
      specialNote: null,
    },
    colors: {
      note: ['#00ff88', '#ffff00', '#00ff88', '#ffff00'],
      glow: '#00ff88', accent: '#ffff00', ui: '#00ff88',
    },
    musicList: [
      'cyber/neon_fury', 'cyber/stranger_things', 'cyber/pixel_rage',
      'cyber/password_infinity', 'cyber/neon_odyssey',
      'cyber/cyberpunk_city', 'cyber/the_sun_long',
    ],
    bonusTrack: null,
  },
  ocean: {
    name: 'OCEAN', unlocked: false,
    unlockCondition: 'Accumulate 1000 credits',
    gimmick: 'current',
    gimmickLabel: 'GIMMICK: CURRENT',
    noteTypes: ['tap', 'hold', 'zigzag'],
    assets: {
      bg: 'assets/bg_ocean.png', bgRoad: null,
      shop: 'assets/bg_shop_ocean.png',
      hitEffect: 'assets/hit_ocean.png',
      hitEffectSpecial: null,
      creditIcon: 'assets/icon_credit_ocean.png',
      specialBg: null,
      specialNote: null,
    },
    colors: {
      note: ['#00cfff', '#00ffee', '#00cfff', '#00ffee'],
      glow: '#00cfff', accent: '#00ffee', ui: '#00cfff',
    },
    musicList: [
      'cyber/neon_fury', 'cyber/stranger_things', 'cyber/pixel_rage',
      'cyber/password_infinity', 'cyber/neon_odyssey',
      'cyber/cyberpunk_city', 'cyber/the_sun_long',
    ],
    bonusTrack: null,
  },
  void: {
    name: 'VOID', unlocked: false,
    unlockCondition: 'Reach combo ×200',
    gimmick: 'phantom',
    gimmickLabel: 'GIMMICK: PHANTOM',
    noteTypes: ['tap', 'hold', 'phantom'],
    assets: {
      bg: 'assets/bg_void.png', bgRoad: null,
      shop: 'assets/bg_shop_void.png',
      hitEffect: 'assets/hit_void.png',
      hitEffectSpecial: null,
      creditIcon: 'assets/icon_credit_void.png',
      specialBg: null,
      specialNote: null,
    },
    colors: {
      note: ['#ffffff', '#cc88ff', '#ffffff', '#cc88ff'],
      glow: '#ffffff', accent: '#cc88ff', ui: '#ffffff',
    },
    musicList: [
      'cyber/neon_fury', 'cyber/stranger_things', 'cyber/pixel_rage',
      'cyber/password_infinity', 'cyber/neon_odyssey',
      'cyber/cyberpunk_city', 'cyber/the_sun_long',
    ],
    bonusTrack: null,
  },
  spring: {
    name: 'SPRING', unlocked: false,
    unlockCondition: 'Accumulate 500 credits',
    gimmick: 'wind',
    gimmickLabel: 'GIMMICK: WIND',
    noteTypes: ['tap', 'hold', 'petal'],
    assets: {
      bg: 'assets/bg_spring.png', bgRoad: null,
      shop: 'assets/bg_shop_spring.png',
      hitEffect: 'assets/hit_spring.png',
      hitEffectSpecial: null,
      creditIcon: 'assets/icon_credit_spring.png',
      specialBg: null,
      specialNote: null,
    },
    colors: {
      note: ['#ffb7c5', '#cc99ff', '#ffb7c5', '#cc99ff'],
      glow: '#ffb7c5', accent: '#cc99ff', ui: '#ffb7c5',
    },
    musicList: [
      'cyber/neon_fury', 'cyber/stranger_things', 'cyber/pixel_rage',
      'cyber/password_infinity', 'cyber/neon_odyssey',
      'cyber/cyberpunk_city', 'cyber/the_sun_long',
    ],
    bonusTrack: null,
  },
};

export const THEME_ORDER = ['cyber', 'forest', 'ocean', 'void', 'spring'];
