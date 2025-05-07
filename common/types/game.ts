// --- チームを表す型 ---
export type Team = 'alpha' | 'bravo';

export interface Stage {
  id: number;
  name: string;
  imageUrl: string; // 例: '/images/stages/stage_a.png'
}

export interface Rule {
  id: number;
  name: string;
  imageUrl: string; // 例: '/images/rules/rule_1.png'
  description?: string; // ルールの説明など (任意)
}

// サーバー全体で接続中のユーザー情報 (app.ts で使用)
export interface ConnectedUserInfo {
    socketId: string;
    roomId: string | null;
    name?: string;
    team?: Team | 'observer';
  }

  // ルーム内のユーザー情報 (gameLogic.ts, クライアントで使用)
  export interface RoomUser {
    id: string; // Socket ID
    name: string;
    team?: Team | 'observer';
  }

  // ルーム内の武器ごとの状態 (gameLogic.ts, クライアントで使用)
  export interface RoomWeaponState {
    id: number;
    selectedBy: Team | null;
    bannedBy: Team[];
  }

  // ★ BAN/PICK フェーズの状態を表す型 (ネストを明確化)
  export interface BanPhaseState {
    bans: Record<Team, number>;
    maxBansPerTeam: number;
  }

  export interface PickPhaseState {
    picks: Record<Team, number>;
    maxPicksPerTeam: number;
  }

  // ルーム全体のゲーム状態 (gameLogic.ts で使用)
  export interface RoomGameState {
    roomId: string;
    roomName: string;
    phase: 'waiting' | 'ban' | 'pick' | 'pick_complete';
    timeLeft: number;
    currentTurn: Team | null;
    currentPickTurnNumber: number;
    timer: NodeJS.Timeout | null;
    turnActionTaken: Record<Team, boolean>;
    banPhaseState: BanPhaseState;
    pickPhaseState: PickPhaseState;
    weapons: RoomWeaponState[];
    connectedUsers: Map<string, RoomUser>;
    teams?: Record<Team, { users: RoomUser[] }>;
    selectedStageId: number | 'random' | null;
    selectedRuleId: number | 'random' | null;
    hostId: string | null;
    lastActivityTime: number;
    randomStagePool: number[];
    randomRulePool: number[];
  }

  // クライアントに送信する公開ゲーム状態
  export interface PublicRoomGameState extends Omit<RoomGameState, | 'connectedUsers' | 'weapons' | 'timer' | 'turnActionTaken' | 'teams' | 'lastActivityTime'> {
    roomName: string; 
    userCount: number;
    banCounts: Record<Team, number>;
    pickCounts: Record<Team, number>;
    selectedStageId: number | 'random' | null;
    selectedRuleId: number | 'random' | null;
    hostId: string | null;
    randomStagePool: number[];
    randomRulePool: number[];
}
  // ★ クライアント側で使用する GameState 型
  export type GameState = PublicRoomGameState;


  // DBから取得するマスター武器データの型
  export interface MasterWeapon {
      id: number;
      name: string;
      imageUrl: string; // ファイル名のみ想定
      attribute: string;
      subWeapon: string;   // 例: スプラッシュボム
      specialWeapon: string; // 例: グレートバリア
      subWeaponImageName: string; // 例: splash_bomb
      specialWeaponImageName: string; // 例: great_barrier
  }

  // クライアント側で使う武器情報の型 (マスター情報 + 状態)
  // ★ Omit を使って id の重複を避ける (推奨)
  export interface Weapon extends MasterWeapon, Omit<RoomWeaponState, 'id'> {}
  // export interface Weapon extends MasterWeapon, RoomWeaponState {} // こちらでも動作はする