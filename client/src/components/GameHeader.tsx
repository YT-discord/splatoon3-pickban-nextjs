import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import type { GameState, Team, Stage, Rule } from '../../../common/types/game';
import type { Socket } from 'socket.io-client';
import { RANDOM_CHOICE } from './WeaponGrid'; // WeaponGrid からインポート (後で場所を検討)
import { BAN_PHASE_DURATION, PICK_PHASE_TURN_DURATION } from '../../../common/types/constants';
import CircularTimer from './CircularTimer';

interface GameHeaderProps {
    roomId: string;
    gameState: GameState | null; // GameState全体を渡すか、必要な情報だけにするか検討
    myTeam: Team | 'observer'; // 自分のチーム
    myActualSocketId: string;
    socket: Socket | null;
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
    // myTeam,
    myActualSocketId,
    socket,
    selectedStage,
    selectedRule,
    onLeaveRoom,
    onStartGame,
    onResetGame,
    onOpenStageModal,
    onOpenRuleModal,
}) => {

    const [isEditingName, setIsEditingName] = useState(false);
    const [editingName, setEditingName] = useState('');

    const handleSaveName = useCallback(() => {
        // gameState が null の可能性もあるのでチェックを追加
        if (!socket || !gameState || gameState.hostId !== myActualSocketId) return;
        const newName = editingName.trim();
        if (newName && newName !== gameState.roomName) {
            console.log(`[UI] Emitting 'change room name' to "${newName}"`);
            socket.emit('change room name', { newName });
        }
        setIsEditingName(false);
    // ★ 依存配列に gameState?.roomName, myActualSocketId を追加
    }, [socket, editingName, gameState?.roomName, myActualSocketId]); // ★ 修正

    const handleCancelEditName = useCallback(() => {
        // gameState が null の可能性を考慮
        setEditingName(gameState?.roomName || roomId);
        setIsEditingName(false);
    // ★ 依存配列に gameState?.roomName, roomId を追加
    }, [gameState?.roomName, roomId]); // ★ 修正

    // 編集モード開始時に現在の名前をセットするための useEffect
    // (startEditingName 内で set すると useCallback の依存関係が複雑になるため)
    useEffect(() => {
        if (isEditingName && gameState) {
            setEditingName(gameState.roomName || roomId);
        }
    }, [isEditingName, gameState, roomId]); // gameState と roomId も依存配列に追加

    const startEditingName = useCallback(() => {
        // gameState が null の可能性を考慮
        if (!gameState || gameState.hostId !== myActualSocketId) return;
        // setEditingName は useEffect で行うのでここでは不要
        setIsEditingName(true);
    // ★ 依存配列に gameState?.hostId, myActualSocketId を追加
    }, [gameState?.hostId, myActualSocketId]); // ★ 修正


    // ★ 早期リターン (Hook 呼び出しの後なら OK)
    if (!gameState) {
        return <div className="p-4 text-center">ヘッダー情報読み込み中...</div>;
    }

    // amIHost の判定 (トップレベルに近い方が良いが、gameState が必要なのでここ)
    const amIHost = gameState.hostId !== null && gameState.hostId === myActualSocketId;

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditingName(e.target.value);
    }; // 依存配列は空

    const headerBgColor = 'bg-gray-100';

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
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 ${headerBgColor} ...`}>
            {/* 左ブロック: ルーム情報 */}
            <div className="flex items-center gap-2"> {/* ★ flex items-center gap-2 追加 */}
                {/* 編集モードの UI */}
                {!isEditingName ? (
                    <>
                        <div className="font-semibold text-lg text-gray-800 truncate" title={gameState.roomName}> {/* ★ truncate 追加 */}
                            {gameState.roomName} {/* roomName を表示 */}
                        </div>
                        {amIHost && ( // ホストのみ編集ボタン表示
                            <button onClick={startEditingName} className="p-1 text-gray-500 hover:text-gray-700" title="ルーム名編集">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                        )}
                        <p className="text-sm text-gray-600">({gameState.userCount}人参加)</p>
                    </>
                ) : (
                    // 編集モード
                    <div className="flex items-center gap-1 w-full">
                        <input
                            type="text"
                            value={editingName}
                            onChange={handleNameChange}
                            className="flex-grow px-2 py-1 border rounded text-sm"
                            maxLength={50}
                            autoFocus
                        />
                        <button onClick={handleSaveName} className="p-1 text-green-600 hover:text-green-800" title="保存">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </button>
                        <button onClick={handleCancelEditName} className="p-1 text-red-600 hover:text-red-800" title="キャンセル">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* 中央ブロック: ゲームステータス & ステージ/ルール */}
            <div className="text-center space-y-1 flex flex-col items-center">
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
                    // disabled 条件: ホストでない または 待機中でない
                    disabled={!amIHost || gameState.phase !== 'waiting'}
                    className={`px-6 py-2 rounded-md text-sm w-full md:w-auto transition-colors
                        ${(amIHost && gameState.phase === 'waiting')
                            ? 'bg-green-500 text-white hover:bg-green-600' // ホストかつ待機中: 緑
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed' // それ以外: グレーアウト
                        }`}
                    // title は disabled の理由を示す
                    title={!amIHost ? 'ホストのみ開始できます' : (gameState.phase !== 'waiting' ? '待機中のみ開始できます' : '')}
                >
                    {/* ★★★★★ 変更点: 文言を常に表示 ★★★★★ */}
                    ゲーム開始 (ホストのみ)
                </button>

                {/* ★★★★★ 変更点: リセットボタン (常に表示) ★★★★★ */}
                <button
                    onClick={onResetGame}
                    // disabled 条件: ホストでない または 待機中でない (リセットは待機中にはできない)
                    disabled={!amIHost || gameState.phase === 'waiting'}
                    className={`px-4 py-2 rounded-md text-sm w-full md:w-auto transition-colors
                        ${(amIHost && gameState.phase !== 'waiting')
                            ? 'bg-yellow-500 text-white hover:bg-yellow-600' // ホストかつ待機中でない: 黄色
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed' // それ以外: グレーアウト
                        }`}
                    // title は disabled の理由を示す
                    title={!amIHost ? 'ホストのみリセットできます' : (gameState.phase === 'waiting' ? '待機中はリセットできません' : '')}
                >
                    {/* ★★★★★ 変更点: 文言を常に表示 ★★★★★ */}
                    リセット (ホストのみ)
                </button>

            </div>
        </div>
    );
};

export default GameHeader;