// --- 共有される型定義 ---

// --- チームを表す型 ---
export type Team = 'alpha' | 'bravo'; // ★ この行を追加

// サーバー全体で接続中のユーザー情報 (app.ts で使用)
export interface ConnectedUserInfo {
    socketId: string;
    roomId: string | null;
    name?: string;
    team?: 'alpha' | 'bravo' | 'observer';
  }
  
  // ルーム内のユーザー情報 (gameLogic.ts, クライアントで使用)
  export interface RoomUser {
    id: string; // Socket ID
    name: string;
    team?: 'alpha' | 'bravo' | 'observer';
  }
  
  // ルーム内の武器ごとの状態 (gameLogic.ts, クライアントで使用)
  export interface RoomWeaponState {
    id: number;
    selectedBy: 'alpha' | 'bravo' | null;
    bannedBy: ('alpha' | 'bravo')[];
  }
  
  // ルーム全体のゲーム状態 (gameLogic.ts で使用)
  export interface RoomGameState {
    roomId: string;
    phase: 'waiting' | 'ban' | 'pick' | 'pick_complete';
    timeLeft: number;
    currentTurn: 'alpha' | 'bravo' | null;
    currentPickTurnNumber: number;
    timer: NodeJS.Timeout | null;
    turnActionTaken: { alpha: boolean; bravo: boolean };
    banPhaseState: { bans: { alpha: number; bravo: number; }; maxBansPerTeam: number; };
    pickPhaseState: { picks: { alpha: number; bravo: number; }; maxPicksPerTeam: number; };
    weapons: RoomWeaponState[];
    connectedUsers: Map<string, RoomUser>;
  }
  
  // クライアントに送信する公開ゲーム状態 (gameLogic.ts で生成、クライアントで使用)
  export interface PublicRoomGameState extends Omit<RoomGameState, 'timer' | 'connectedUsers' | 'weapons'> {
      // timer, connectedUsers, weapons は除外 (weapons は別イベントで送る)
      userCount: number;
  }
  // ★ クライアント側で使用する GameState 型として PublicRoomGameState を使う
  export type GameState = PublicRoomGameState;
  
  
  // DBから取得するマスター武器データの型 (gameLogic.ts, database.ts で使用)
  export interface MasterWeapon {
      id: number;
      name: string;
      imageUrl: string; // 画像パス (サーバー側で組み立てる)
      attribute: string;
  }
  
  // クライアント側で使う武器情報の型 (マスター情報 + 状態) (クライアントで使用)
  export interface Weapon extends MasterWeapon, RoomWeaponState {} // MasterとStateを結合