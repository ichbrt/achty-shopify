export const SCENE_DURATIONS = [210, 330, 300, 420, 390, 330, 300, 240, 360, 240] as const;
export const SCENE_STARTS = SCENE_DURATIONS.map((_, i) => SCENE_DURATIONS.slice(0, i).reduce((a, b) => a + b, 0));
export const TOTAL_FRAMES = SCENE_DURATIONS.reduce((a, b) => a + b, 0);
