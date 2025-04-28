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
    // myActualSocketId: string;
    socket: Socket | null;
    selectedStage: Stage | typeof RANDOM_CHOICE | null;
    selectedRule: Rule | typeof RANDOM_CHOICE | null;
    onLeaveRoom: () => void;
    onStartGame: () => void;
    onResetGame: () => void;
    onOpenStageModal: () => void;
    onOpenRuleModal: () => void;
    amIHost: boolean;
}

const validateRoomName = (name: string): string | null => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) return 'ルーム名を入力してください。';
    if (trimmedName.length > 10) return 'ルーム名が長すぎます (10文字以内)';
    return null;
};

const GameHeader: React.FC<GameHeaderProps> = ({
    roomId,
    gameState,
    // myTeam,
    // myActualSocketId,
    socket,
    selectedStage,
    selectedRule,
    onLeaveRoom,
    onStartGame,
    onResetGame,
    onOpenStageModal,
    onOpenRuleModal,
    amIHost
}) => {

    const [isEditingName, setIsEditingName] = useState(false);
    const [editingName, setEditingName] = useState('');
    const [editError, setEditError] = useState<string | null>(null);

    const handleSaveName = useCallback(() => {
        // gameState が null の可能性もあるのでチェックを追加
        if (!socket || !gameState ) return;
        const validationError = validateRoomName(editingName);
        if (validationError) {
            setEditError(validationError); // エラーメッセージを表示
            // toast.error(validationError); // トーストで表示する場合
            return;
        }
        setEditError(null); // エラークリア
        const newName = editingName.trim();
        if (newName && newName !== gameState.roomName) {
            console.log(`[UI] Emitting 'change room name' to "${newName}"`);
            socket.emit('change room name', { newName });
        }
        setIsEditingName(false);
        // ★ 依存配列に gameState?.roomName, myActualSocketId を追加
    }, [socket, editingName, gameState?.roomName]); // ★ 修正

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
        if (!gameState) return;
        // setEditingName は useEffect で行うのでここでは不要
        setIsEditingName(true);
        // ★ 依存配列に gameState?.hostId, myActualSocketId を追加
    }, [gameState?.hostId]); // ★ 修正

    const getRoomIconPath = (roomId: string): string => {
        return `/images/icons/${roomId}.png`; // ★ roomId を直接使用
    };

    // ★ 早期リターン (Hook 呼び出しの後なら OK)
    if (!gameState) {
        return <div className="p-4 text-center">ヘッダー情報読み込み中...</div>;
    }

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditingName(e.target.value);
        if (editError) setEditError(null);
    };

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
            <div className="flex items-center gap-3">

            <Image
                    src={getRoomIconPath(roomId)}
                    alt={`${roomId} icon`}
                    width={40}
                    height={40}
                    className="rounded flex-shrink-0"
                />
                <div className="flex-grow min-w-0"> 
                    {/* 固定の部屋ID表示 */}
                    <div className="text-xs text-black truncate" title={roomId}>
                        {roomId} {/* アイコンと連動する元のID */}
                    </div>
                    {/* 編集可能なルーム名表示/編集 */}
                    {!isEditingName ? (
                        // 表示モード
                        <div className="flex items-center gap-1"> {/* ★ gap-1 追加 */}
                            <div className="font-semibold text-lg text-gray-800 truncate" title={gameState.roomName}>
                                {gameState.roomName}
                            </div>
                            {/* 鉛筆マーク (ルーム名の右) */}
                            {amIHost && (
                                <button onClick={startEditingName} className="p-0.5 text-gray-500 hover:text-gray-700 flex-shrink-0" title="ルーム名編集"> {/* ★ p-0.5, flex-shrink-0 */}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ) : (
                        // 編集モード
                        <div className="w-full mt-1">
                        <div className="flex items-center gap-1 w-full">
                            <input
                                type="text"
                                value={editingName}
                                onChange={handleNameChange}
                                className={`flex-grow px-2 py-1 border rounded text-sm text-gray-800  bg-white placeholder-gray-500 ${editError ? 'border-red-500' : 'border-gray-300'}`}
                                maxLength={10}
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
                            {editError && <p className="text-red-500 text-xs mt-1">{editError}</p>}
                        </div>
                    )}
                    <p className="text-sm text-gray-600 mt-0.5">({gameState.userCount}人参加)</p> {/* ★ mt調整 */}
                </div>
            </div>

            {/* ================= 中央ブロック: ゲームステータス & タイマー/ルール/ステージ ================= */}
            <div className="text-center space-y-1 flex flex-col items-center">

                {/* タイマー、ルール、ステージの横並びコンテナ */}
                <div className="flex justify-center items-start gap-3 mt-2 w-full">

                    {/* ----- タイマー表示枠 (常に表示) ----- */}
                    <div className="flex flex-col items-center text-xs border rounded p-1 bg-white shadow-sm w-[80px]">
                        <span className="font-medium text-gray-600 mb-1">残り時間</span>
                        {/* ★★★★★ 変更点: タイマーコンテナの中身を条件分岐 ★★★★★ */}
                        <div className="flex items-center justify-center w-full h-[60px]"> {/* ★ 高さ固定 */}
                            {(gameState.phase === 'ban' || gameState.phase === 'pick') && gameState.timeLeft != null && timerDuration > 0 ? (
                                // BAN/PICK 中はタイマー表示
                                <CircularTimer
                                    duration={timerDuration}
                                    currentTime={gameState.timeLeft}
                                    size={50}
                                    strokeWidth={4}
                                />
                            ) : gameState.phase === 'waiting' ? (
                                // 待機中はテキスト表示
                                <span className="text-gray-400 text-lg font-mono" title="ゲーム開始後に表示されます">--:--</span>
                            ) : gameState.phase === 'pick_complete' ? (
                                // Pick完了時はチェックマークなど (任意)
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                // それ以外 (エラーなど) は空白 or 何か表示
                                <span className="text-gray-400">-</span>
                            )}
                        </div>
                        {/* ダミーのボタンエリア (高さを揃えるため) */}
                         <div className="h-[26px] mt-1"></div>
                    </div>
                    

                    {/* ----- ルール表示 ----- */}
                    <div className="flex flex-col items-center text-xs border rounded p-1 bg-white shadow-sm w-[80px]">
                        <span className="font-medium text-gray-600 mb-1">ルール</span>
                        {/* 画像コンテナ */}
                        <div className="flex items-center justify-center w-full h-[60px] mb-1 bg-gray-100 rounded-sm overflow-hidden">
                            {selectedRule ? (
                                <Image src={selectedRule.imageUrl} alt={selectedRule.name} width={80} height={60} className="object-contain max-w-full max-h-full" />
                            ) : (<span className="text-gray-500 text-xs">未選択</span>)}
                        </div>
                        {/* 変更ボタン */}
                        <button
                            onClick={onOpenRuleModal}
                            disabled={!amIHost || gameState.phase !== 'waiting'}
                            className={`mt-1 px-2 py-0.5 text-xs rounded ${(!amIHost || gameState.phase !== 'waiting') ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-300 hover:bg-gray-400'}`}
                            title={!amIHost ? "ホストのみ変更可" : (gameState.phase !== 'waiting' ? "待機中のみ変更可" : "ルール変更")}
                        >変更</button>
                    </div>

                    {/* ----- ステージ表示 ----- */}
                     <div className="flex flex-col items-center text-xs border rounded p-1 bg-white shadow-sm w-[80px]">
                        <span className="font-medium text-gray-600 mb-1">ステージ</span>
                         {/* 画像コンテナ */}
                        <div className="flex items-center justify-center w-full h-[60px] mb-1 bg-gray-100 rounded-sm overflow-hidden">
                            {selectedStage ? (
                                <Image src={selectedStage.imageUrl} alt={selectedStage.name} width={80} height={60} className="object-contain max-w-full max-h-full" />
                            ) : (<span className="text-gray-500 text-xs">未選択</span>)}
                        </div>
                         {/* 変更ボタン */}
                        <button
                            onClick={onOpenStageModal}
                            disabled={!amIHost || gameState.phase !== 'waiting'}
                            className={`mt-1 px-2 py-0.5 text-xs rounded ${(!amIHost || gameState.phase !== 'waiting') ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-300 hover:bg-gray-400'}`}
                            title={!amIHost ? "ホストのみ変更可" : (gameState.phase !== 'waiting' ? "待機中のみ変更可" : "ステージ変更")}
                        >変更</button>
                    </div>

                </div> {/* flex container end */}

                {/* 現在のターン表示 */}
                {(gameState.phase === 'ban' || gameState.phase === 'pick') && gameState.currentTurn && (
                     <p className="text-sm text-gray-700 mt-2">
                        現在のターン: <span className={`font-bold ${gameState.currentTurn === 'alpha' ? 'text-blue-600' : 'text-red-600'}`}>{gameState.currentTurn}チーム</span>
                     </p>
                 )}
                 {/* Pick完了 */}
                 {gameState.phase === 'pick_complete' && (<p className="font-bold text-green-600 text-xl mt-2">PICK完了！</p>)}

            </div> {/* 中央ブロック end */}

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
                    ルームリセット (ホストのみ)
                </button>

            </div>
        </div>
    );
};

export default GameHeader;