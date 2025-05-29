'use client';

import React from 'react';
import type { Socket } from 'socket.io-client';
import type { GameState, RoomUser, RoomWeaponState, MasterWeapon, Team, Stage, Rule } from '../../../common/types/index';
import { RANDOM_STAGE_CHOICE, RANDOM_RULE_CHOICE } from '../../../common/types/index';

// 実際のコンポーネントをインポート (プレースホルダを置き換えるため)
import ActualGameHeader from './GameHeader';
import ActualTeamPanel from './TeamPanel';
import ActualWeaponGridDisplay from './WeaponGridDisplay';
import ActualObserverPanel from './ObserverPanel';

// 各コンポーネントのPropsの型定義 (実際の型に合わせてください)
interface GameHeaderProps {
  roomId: string;
  roomName: string;
  userCount: number;
  phase: GameState['phase'];
  currentTurn: GameState['currentTurn'];
  timeLeft: GameState['timeLeft'];
  hostId: GameState['hostId'];
  timerDuration: number;
  myTeam: Team | 'observer';
  amIHost: boolean;
  socket: Socket; // Socket 型をインポート
  selectedStage: Stage | typeof RANDOM_STAGE_CHOICE | null;
  selectedRule: Rule | typeof RANDOM_RULE_CHOICE | null;
  randomStagePoolCount: number;
  randomRulePoolCount: number;
  onLeaveRoom: () => void;
  onStartGame: () => void;
  onResetGame: () => void;
  onOpenStageModal: () => void;
  onOpenRuleModal: () => void;
  isAnyRandomSettingsModalOpen: boolean; // 不足していたプロパティを追加
}

interface TeamPanelProps {
  team: 'alpha' | 'bravo';
  teamDisplayName: string;
  phase: GameState['phase'];
  hostId: GameState['hostId'];
  teamUsers: RoomUser[];
  pickedWeaponIds: number[];
  bannedWeaponIds: number[];
  masterWeaponsMap: Map<number, MasterWeapon>;
  weaponStates: Record<number, RoomWeaponState>;
  pickCount: number;
  banCount: number;
  banPhaseState: GameState['banPhaseState'];
  myTeam: Team | 'observer';
  userName: string;
  onSelectTeam: (team: Team | 'observer') => void;
}

interface WeaponGridDisplayProps {
  phase: GameState['phase'];
  currentTurn: GameState['currentTurn'];
  banPhaseState: GameState['banPhaseState'];
  pickPhaseState: GameState['pickPhaseState'];
  displayWeaponIds: number[];
  masterWeapons: MasterWeapon[];
  weaponStates: Record<number, RoomWeaponState>;
  loadingWeaponId: number | null;
  myTeam: Team | 'observer';
  myBanCount: number;
  myPickCount: number;
  onWeaponClick: (weaponId: number) => void;
}

interface ObserverPanelProps {
  phase: GameState['phase'];
  hostId: GameState['hostId'];
  observers: RoomUser[];
  myTeam: Team | 'observer';
  userName: string;
  onSelectTeam: (team: Team | 'observer') => void;
}

interface WeaponGridLayoutProps {
  // GameHeader に渡すプロパティ
  gameHeaderProps: GameHeaderProps;
  // TeamPanel Alpha に渡すプロパティ
  teamAlphaProps: Omit<TeamPanelProps, 'team' | 'teamDisplayName'>; // teamDisplayName も内部で設定するため除外
  // TeamPanel Bravo に渡すプロパティ
  teamBravoProps: Omit<TeamPanelProps, 'team' | 'teamDisplayName'>; // teamDisplayName も内部で設定するため除外
  // WeaponGridDisplay に渡すプロパティ
  weaponGridDisplayProps: WeaponGridDisplayProps;
  // ObserverPanel に渡すプロパティ
  observerPanelProps: ObserverPanelProps;
}

// プレースホルダの代わりに実際のコンポーネントを使用
const GameHeader = ActualGameHeader;
const TeamPanel = ActualTeamPanel;
const WeaponGridDisplay = ActualWeaponGridDisplay;
const ObserverPanel = ActualObserverPanel;

export default function WeaponGridLayout({
  gameHeaderProps,
  teamAlphaProps,
  teamBravoProps,
  weaponGridDisplayProps,
  observerPanelProps,
}: WeaponGridLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100">
      {/* 1. GameHeader (常に一番上) */}
      <div className="p-2 md:p-4">
        <GameHeader {...gameHeaderProps} />
      </div>

      {/*
        メインコンテンツエリア
        - スマホ (デフォルト): flex-col を使い、HTMLの記述順で縦に並びます。
        - PC (lg以上): grid を使い、3カラムレイアウトを構成します。
          - 1列目: TeamPanel Alpha
          - 2列目: WeaponGridDisplay
          - 3列目: TeamPanel Bravo, ObserverPanel
      */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[minmax(200px,1fr)_minmax(0,3fr)_minmax(200px,1fr)] gap-2 md:gap-4 p-2 md:p-4">
        {/*
          以下の要素のHTML記述順が、スマホでの表示順になります。
          1. GameHeader (上記で表示済み)
          2. TeamPanel Alpha
          3. TeamPanel Bravo
          4. WeaponGridDisplay
          5. ObserverPanel
        */}

        {/* TeamPanel Alpha */}
        {/* スマホ: 2番目に表示 */}
        {/* PC: 1列目に配置 (grid-areaの指定は不要、grid-colsで制御) */}
        <div className="lg:col-start-1">
          <TeamPanel team="alpha" teamDisplayName="アルファ" {...teamAlphaProps} />
        </div>

        {/* TeamPanel Bravo */}
        {/* スマホ: 3番目に表示 */}
        {/* PC: 3列目に配置 */}
        <div className="lg:col-start-3 lg:row-start-1"> {/* PCではAlphaと同じ行から開始 */}
          <TeamPanel team="bravo" teamDisplayName="ブラボー" {...teamBravoProps} />
        </div>

        {/* WeaponGridDisplay */}
        {/* スマホ: 4番目に表示 */}
        {/* PC: 2列目に配置 */}
        <div className="lg:col-start-2 lg:row-start-1"> {/* PCではAlpha/Bravoと同じ行から開始 */}
          <WeaponGridDisplay {...weaponGridDisplayProps} /> {/* WeaponGridDisplay はそのまま */}
        </div>

        {/* ObserverPanel */}
        {/* スマホ: 5番目に表示 */}
        {/* PC: 3列目、TeamPanel Bravoの下に配置 */}
        <div className="lg:col-start-3 lg:row-start-2 lg:mt-4">
          <ObserverPanel {...observerPanelProps} /> {/* ObserverPanel はそのまま */}
        </div>
      </div>
    </div>
  );
}