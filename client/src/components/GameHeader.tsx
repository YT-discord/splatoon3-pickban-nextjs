import React from 'react';
import Image from 'next/image';
import type { GameState, Team, Stage, Rule } from '../../../common/types/game';
// import { TOTAL_PICK_TURNS } from '../../../common/types/constants';
import { RANDOM_CHOICE } from './WeaponGrid'; // WeaponGrid からインポート (後で場所を検討)

interface GameHeaderProps {
    roomId: string;
    gameState: GameState | null; // GameState全体を渡すか、必要な情報だけにするか検討
    userName: string; // 自分の名前 (表示には使わないが、操作ボタンのdisable判定等で将来使う可能性)
    myTeam: Team | 'observer'; // 自分のチーム
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
    // userName,
    myTeam,
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

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-gray-100 rounded-lg shadow mb-6">
            {/* 左ブロック: ルーム情報 */}
            <div className="flex flex-col items-start">
                <div className="font-semibold text-lg text-gray-800">ルーム: {roomId}</div>
                <p className="text-sm text-gray-600">({gameState.userCount}人参加)</p>
            </div>

            {/* 中央ブロック: ゲームステータス & ステージ/ルール */}
            <div className="text-center space-y-1">
                {(gameState.phase === 'ban' || gameState.phase === 'pick') && gameState.timeLeft != null && (
                    <p className="text-xl font-mono text-gray-800">残り時間: {gameState.timeLeft}秒</p>
                )}
                {(gameState.phase === 'ban' || gameState.phase === 'pick') && gameState.currentTurn && (
                    <p className="text-sm text-gray-700">現在のターン: <span className={`font-bold ${gameState.currentTurn === 'alpha' ? 'text-blue-600' : 'text-red-600'}`}>{gameState.currentTurn}チーム</span></p>
                )}
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
                {gameState.phase === 'waiting' && (
                    <button onClick={onStartGame} disabled={myTeam === 'observer'} className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 text-sm w-full md:w-auto">ゲーム開始</button>
                )}
                {(gameState.phase !== 'waiting') && (
                    <button onClick={onResetGame} disabled={myTeam === 'observer'} className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 text-sm w-full md:w-auto">リセット</button>
                )}
            </div>
        </div>
    );
};

export default GameHeader;