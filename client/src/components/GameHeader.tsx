import React from 'react';
import Image from 'next/image';
import type { GameState, Team, Stage, Rule } from '../../../common/types/game';
import { RANDOM_CHOICE } from './WeaponGrid'; // WeaponGrid からインポート (後で場所を検討)
import { BAN_PHASE_DURATION, PICK_PHASE_TURN_DURATION } from '../../../common/types/constants';
import CircularTimer from './CircularTimer';

interface GameHeaderProps {
    roomId: string;
    gameState: GameState | null; // GameState全体を渡すか、必要な情報だけにするか検討
    myTeam: Team | 'observer'; // 自分のチーム
    myActualSocketId: string;
    selectedStage: Stage | typeof RANDOM_CHOICE | null;
    selectedRule: Rule | typeof RANDOM_CHOICE | null;
    onLeaveRoom: () => void;
    onStartGame: () => void;
    onResetGame: () => void;
    onOpenStageModal: () => void;
    onOpenRuleModal: () => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({
    roomId,
    gameState,
    //userName,
    myTeam,
    myActualSocketId,
    selectedStage,
    selectedRule,
    onLeaveRoom,
    onStartGame,
    onResetGame,
    onOpenStageModal,
    onOpenRuleModal,
}) => {
    if (!gameState) {
        return <div className="p-4 text-center">ヘッダー情報読み込み中...</div>;
    }

    const amIHost = gameState.hostId !== null && gameState.hostId === myActualSocketId;

    const getTimerDuration = (): number => {
        if (gameState.phase === 'ban') {
            return BAN_PHASE_DURATION;
        } else if (gameState.phase === 'pick') {
            return PICK_PHASE_TURN_DURATION;
        }
        return 0; // それ以外のフェーズでは 0
    };
    const timerDuration = getTimerDuration();

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-gray-100 rounded-lg shadow mb-6">
            {/* 左ブロック: ルーム情報 */}
            <div className="flex flex-col items-start">
                <div className="font-semibold text-lg text-gray-800">ルーム: {roomId}</div>
                <p className="text-sm text-gray-600">({gameState.userCount}人参加)</p>
            </div>

            {/* 中央ブロック: ゲームステータス & ステージ/ルール */}
            <div className="text-center space-y-1 flex flex-col items-center"> {/* ★ flex flex-col items-center 追加 */}
                 {/* 参加者数 */}
                 <p className="text-sm text-gray-600">({gameState.userCount}人参加)</p>

                 {/* ★★★★★ 変更点: 残り時間表示を CircularTimer に変更 ★★★★★ */}
                 {(gameState.phase === 'ban' || gameState.phase === 'pick') && gameState.timeLeft != null && timerDuration > 0 && (
                    <div className="my-1"> {/* マージン調整用 */}
                        <CircularTimer
                            duration={timerDuration}
                            currentTime={gameState.timeLeft}
                            size={50} // サイズを少し小さめに設定 (任意)
                            strokeWidth={5}
                            // baseColor="#ddd" // 色はデフォルトを使用 or カスタマイズ
                            // progressColor="#1976d2"
                            // textColor="#111"
                        />
                    </div>
                 )}
                 {/* ★ 既存のテキスト表示は削除 */}
                 {/*
                 {(gameState.phase === 'ban' || gameState.phase === 'pick') && gameState.timeLeft != null && (
                    <p className="text-xl font-mono text-gray-800">残り時間: {gameState.timeLeft}秒</p>
                 )}
                 */}

                 {/* 現在のターン */}
                 {(gameState.phase === 'ban' || gameState.phase === 'pick') && gameState.currentTurn && (
                     <p className="text-sm text-gray-700 mt-1"> {/* mt-1 追加 */}
                        現在のターン: <span className={`font-bold ${gameState.currentTurn === 'alpha' ? 'text-blue-600' : 'text-red-600'}`}>{gameState.currentTurn}チーム</span>
                     </p>
                 )}
                 {/* Pick完了 */}
                 {gameState.phase === 'pick_complete' && (<p className="font-bold text-green-600 text-xl">PICK完了！</p>)}
                {/* ステージ・ルール表示 */}
                <div className="flex justify-center gap-4 mt-2">
                    {/* ステージ */}
                    <div className="flex flex-col items-center text-xs border rounded p-1 bg-white shadow-sm w-[100px]">
                        <span className="font-medium text-gray-600 mb-0.5">ステージ</span>
                        <div className="flex items-center justify-center w-full min-h-[68px] mb-0.5">
                            {selectedStage ? (
                                <div className="flex flex-col items-center">
                                    <Image src={selectedStage.imageUrl} alt={selectedStage.name} width={80} height={45} className="object-cover border" />
                                    <span className="font-semibold text-gray-800 mt-0.5">{selectedStage.name}</span>
                                </div>
                            ) : (<span className="text-gray-500 text-xs">未選択</span>)}
                        </div>
                        <button
                            onClick={onOpenStageModal} // Props の関数を呼び出し
                            disabled={gameState.phase !== 'waiting'}
                            className={`mt-1 px-2 py-0.5 text-xs rounded ${gameState.phase === 'waiting' ? 'bg-gray-300 hover:bg-gray-400' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                        >変更</button>
                    </div>
                    {/* ルール */}
                    <div className="flex flex-col items-center text-xs border rounded p-1 bg-white shadow-sm w-[100px]">
                        <span className="font-medium text-gray-600 mb-0.5">ルール</span>
                        <div className="flex items-center justify-center w-full min-h-[68px] mb-0.5">
                            {selectedRule ? (
                                <div className="flex flex-col items-center">
                                    <Image src={selectedRule.imageUrl} alt={selectedRule.name} width={80} height={45} className="object-cover border" />
                                    <span className="font-semibold text-gray-800 mt-0.5">{selectedRule.name}</span>
                                </div>
                            ) : (<span className="text-gray-500 text-xs">未選択</span>)}
                        </div>
                        <button
                            onClick={onOpenRuleModal} // Props の関数を呼び出し
                            disabled={gameState.phase !== 'waiting'}
                            className={`mt-1 px-2 py-0.5 text-xs rounded ${gameState.phase === 'waiting' ? 'bg-gray-300 hover:bg-gray-400' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                        >変更</button>
                    </div>
                </div>
            </div>

            {/* 右ブロック: 操作ボタン */}
            <div className="flex flex-col items-end gap-2">
                <button
                    onClick={onLeaveRoom} // Props の関数を呼び出し
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm w-full md:w-auto"
                >
                    ルーム退出
                </button>
                <button
                    onClick={onStartGame}
                    // disabled 条件: (ホストでない または 待機中でない)
                    disabled={!amIHost || gameState.phase !== 'waiting'}
                    className={`px-6 py-2 rounded-md text-sm w-full md:w-auto transition-colors
                        ${(amIHost && gameState.phase === 'waiting')
                            ? 'bg-green-500 text-white hover:bg-green-600' // ホストかつ待機中なら緑
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed' // それ以外はグレーアウト
                        }`}
                    title={!amIHost ? 'ホストのみ開始できます' : (gameState.phase !== 'waiting' ? '待機中のみ開始できます' : '')}
                 >                    ゲーム開始
                 </button>
                {(gameState.phase !== 'waiting') && (
                     <button onClick={onResetGame} disabled={myTeam === 'observer' || !amIHost} className="..." title={!amIHost ? 'ホストのみリセットできます' : ''}>リセット</button>
                )}
            </div>
        </div>
    );
};

export default GameHeader;