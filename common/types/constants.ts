export const ROOM_IDS = ['room1', 'room2', 'room3', 'room4', 'room5'];
export const MAX_USERS_PER_ROOM = 10;
export const MAX_PLAYERS_PER_TEAM = 4;
export const MIN_PLAYERS_PER_TEAM = 1;
export const MAX_BANS_PER_TEAM = 3;
export const MAX_PICKS_PER_TEAM = 4; // = totalPickTurns / 2
export const TOTAL_PICK_TURNS = MAX_PICKS_PER_TEAM * 2; // 8
export const MAX_USERS_PER_TEAM = 4;

// 時間設定 (秒)
export const BAN_PHASE_DURATION = 30;
export const PICK_PHASE_TURN_DURATION = 10;

// Fast Timer (デバッグ用) 環境変数 FAST_TIMER=true で有効
export const USE_FAST_TIMER = process.env.FAST_TIMER === 'true';
export const FAST_TIMER_MULTIPLIER = 5; // 例: 1/5 の時間にする