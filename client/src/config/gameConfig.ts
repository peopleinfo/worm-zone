// please check server config too avoid not sync

export const MINI_MAP_WIDTH = 110;
export const MINI_MAP_HEIGHT = 80;
export const WORLD_WIDTH = 1200;
export const WORLD_HEIGHT = 800;
export const MAP_ZOOM_LEVEL = 3.5;
export const POINT = 1; // Points awarded for eating food
export const MIN_PLAYERS_FOR_BATTLE = 4;
export const CLEANUP_INTERVAL = 30000; // 30 seconds

// Frame Rate Configuration
export const FORCE_FPS_LIMIT = true; // Enable/disable forced FPS limiting
export const TARGET_FPS = 40; // Configurable FPS between 30-45
export const MIN_FPS = 35; // Minimum allowed FPS
export const MAX_FPS = 45; // Maximum allowed FPS

// Shadow Configuration
export const ENABLE_SHADOWS = true; // Enable/disable shadow effects
export const SHADOW_BLUR = 1; // Shadow blur radius in pixels
export const SHADOW_OFFSET_X = 1; // Shadow horizontal offset
export const SHADOW_OFFSET_Y = 1; // Shadow vertical offset
export const SHADOW_COLOR = 'rgba(0, 0, 0, 0.7)'; // Shadow color with transparency

// Snake Configuration
export const BODY_SEGMENT_SPACING = 0.5; // Spacing between snake body segments