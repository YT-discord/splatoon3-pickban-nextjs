import React, { useState, useCallback, useEffect, memo } from 'react';
import Image from 'next/image';
import type { GameState, Team, Stage, Rule } from '../../../common/types/index';
import type { Socket } from 'socket.io-client';
import { RANDOM_RULE_CHOICE, RANDOM_STAGE_CHOICE, STAGES_DATA, RULES_DATA } from '../../../common/types/index';
import CircularTimer from './CircularTimer';

interface GameHeaderProps {
    roomId: string;
    roomName: string; // ★ gameState.roomName から
    userCount: number; // ★ gameState.userCount から
    phase: GameState['phase']; // ★ gameState.phase から
    currentTurn: GameState['currentTurn']; // ★ gameState.currentTurn から
    timeLeft: number | null; // ★ gameState.timeLeft から
    hostId: string | null; // ★ gameState.hostId から
    timerDuration: number; // ★ WeaponGrid で計算して渡す
    myTeam: Team | 'observer'; // ★ これは WeaponGrid の myTeam state から
    amIHost: boolean;
    socket: Socket | null;
    selectedStage: Stage | typeof RANDOM_STAGE_CHOICE | null;
    selectedRule: Rule | typeof RANDOM_RULE_CHOICE | null;
    randomStagePoolCount: number;
    randomRulePoolCount: number;
    onLeaveRoom: () => void;
    onStartGame: () => void;
    onResetGame: () => void;
    onOpenStageModal: () => void;
    onOpenRuleModal: () => void;
}

const validateRoomName = (name: string): string | null => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) return 'ルーム名を入力してください。';
    if (trimmedName.length > 10) return 'ルーム名が長すぎます (10文字以内)';
    return null;
};

const getRandomStageDisplayImagePath = (count: number, total: number): string => {
    if (count === total) {
        return '/images/stages/omakase/24.png'; // 全選択状態のアイコン
    } else if (count > 0) {
        // 数字付きのアイコンを返す (例: random_stage_10.png)
        // 適切な画像がない場合はデフォルトや汎用アイコンを返す
        // ここでは仮に汎用アイコン + 数字表示とする
        return `/images/stages/omakase/${count}.png`; // カスタム選択状態アイコン
    } else {
        return '/images/icons/random_stage_empty.png'; // 対象が0の場合のアイコン
    }
};

const getRandomRuleDisplayImagePath = (count: number, total: number): string => {
    if (count === total) return '/images/rules/omakase/5.png';
    if (count === 0) return '/images/rules/omakase/random_rule_empty.png';
    // ★ 対象数が1つの場合のアイコン
    if (count === 1) return '/images/rules/omakase/random_rule_one.png'; // or カスタムアイコン
    return `/images/rules/omakase/${count}.png`; // カスタム選択状態アイコン
};

const GameHeader: React.FC<GameHeaderProps> = memo(({
    roomId,
    roomName, // ★ 受け取る
    userCount, // ★ 受け取る
    phase,     // ★ 受け取る
    currentTurn, // ★ 受け取る
    timeLeft,    // ★ 受け取る
    // hostId,      // ★ 受け取る
    timerDuration, // ★ 受け取る
    // myTeam,
    amIHost,
    socket,
    selectedStage,
    selectedRule,
    randomStagePoolCount,
    randomRulePoolCount,
    onLeaveRoom,
    onStartGame,
    onResetGame,
    onOpenStageModal,
    onOpenRuleModal,
}) => {

    const [isEditingName, setIsEditingName] = useState(false);
    const [editingName, setEditingName] = useState(roomName);
    const [editError, setEditError] = useState<string | null>(null);

    const handleSaveName = useCallback(() => {
        if (!socket || !amIHost) return; // ★ amIHost を使う
        const validationError = validateRoomName(editingName);
        if (validationError) { setEditError(validationError); return; }
        setEditError(null);
        const newName = editingName.trim();
        if (newName && newName !== roomName) { // ★ props の roomName と比較
            socket.emit('change room name', { newName });
        }
        setIsEditingName(false);
    }, [socket, amIHost, editingName, roomName]);

    const handleCancelEditName = useCallback(() => {
        setEditingName(roomName || roomId); // ★ props の roomName を使う
        setIsEditingName(false);
        setEditError(null);
    }, [roomName, roomId]);

    // 編集モード開始時に現在の名前をセットするための useEffect
    // (startEditingName 内で set すると useCallback の依存関係が複雑になるため)
    useEffect(() => {
        if (isEditingName) {
            setEditingName(roomName || roomId); // ★ props の roomName を使う
        }
    }, [isEditingName, roomName, roomId]);

    const startEditingName = useCallback(() => {
        if (!amIHost) return; // ★ amIHost を使う
        setIsEditingName(true);
    }, [amIHost]);

    const getRoomIconPath = (roomId: string): string => {
        return `/images/icons/${roomId}.png`; // ★ roomId を直接使用
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditingName(e.target.value);
        if (editError) setEditError(null);
    };

    const headerBgColor = 'bg-gray-100';

    return (
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch p-1 ${headerBgColor} rounded-lg shadow mb-4 transition-colors duration-300`}>
            {/* 左ブロック: ルーム情報 */}
            <div className="flex items-center gap-3 ml-4">

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
                        <div className="flex items-center gap-1">
                            <div className="font-semibold text-lg text-gray-800 truncate" title={roomName}>
                                {roomName}
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
                    <p className="text-sm text-gray-600 mt-0.5">({userCount}人参加)</p>
                </div>
            </div>

            {/* ================= 中央ブロック: ゲームステータス & タイマー/ルール/ステージ ================= */}
            <div className="text-center space-y-1 flex flex-col items-center flex-grow">

                {/* タイマー、ルール、ステージの横並びコンテナ */}
                <div className="flex justify-center items-stretch gap-3 mt-1 w-full h-full">

                    {/* ----- タイマー表示枠 (常に表示) ----- */}
                    <div className="flex flex-col items-center text-xs border rounded p-1 bg-white shadow-sm w-[33%] h-full">
                        <span className="font-medium text-gray-600 mb-1">残り時間</span>
                        <div className="flex items-center justify-center w-full flex-grow min-h-0">
                            {(phase === 'ban' || phase === 'pick') && timeLeft != null && timerDuration > 0 ? (
                                // BAN/PICK 中はタイマー表示
                                <CircularTimer
                                    duration={timerDuration}
                                    currentTime={timeLeft}
                                    size={50}
                                    strokeWidth={4}
                                />
                            ) : phase === 'waiting' ? (
                                // 待機中はテキスト表示
                                <span className="text-gray-400 text-lg font-mono" title="ゲーム開始後に表示されます">--:--</span>
                            ) : phase === 'pick_complete' ? (
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
                    <div className="flex flex-col items-center text-xs border rounded p-1 bg-white shadow-sm w-[33%] h-full">
                        <span className="font-medium text-gray-600 mb-1">ルール</span>
                        <div className="flex items-center justify-center w-full h-[60px] bg-gray-100 rounded-sm overflow-hidden relative  flex-grow min-h-0"> {/* relative 追加 */}
                            {selectedRule ? (
                                <>
                                    {/* ランダムルールアイコン表示 */}
                                    {selectedRule.id === 'random' ? (
                                        <>
                                            <Image
                                                src={getRandomRuleDisplayImagePath(randomRulePoolCount, RULES_DATA.length)}
                                                alt={`ランダム (対象: ${randomRulePoolCount})`}
                                                fill
                                                sizes='width:142px height:60px'
                                                style={{ objectFit: 'cover' }}
                                            />
                                        </>
                                    ) : (
                                        // 通常のルール画像
                                        <Image src={selectedRule.imageUrl}
                                        alt={selectedRule.name}
                                        fill
                                        sizes='width:142px height:60px'
                                        style={{ objectFit: 'contain' }}
                                                 />
                                    )}
                                </>
                            ) : (<span className="text-gray-500 text-xs">未選択</span>)}
                        </div>
                        {/* 名前表示 */}
                        <div className="h-8 mt-1 flex items-center justify-center"> {/* ★ 名前表示用スペース */}
                            {selectedRule && (
                                <p className="text-[15px] font-semibold text-gray-800 leading-tight text-center break-words"> {/* ★ スタイル調整 */}
                                    {selectedRule.name}
                                </p>
                            )}
                        </div>
                        {/* 変更/確認ボタン */}
                        <button
                            onClick={onOpenRuleModal}
                            className={`mt-1 px-2 py-0.5 text-xs rounded ${phase !== 'waiting' ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-300 hover:bg-gray-400'}`}
                            disabled={phase !== 'waiting'} // ★ ゲーム進行中は常に無効
                            title={phase !== 'waiting' ? "ゲーム進行中は変更/確認できません" : (amIHost ? "対象ルール変更" : "対象ルール確認")}
                        >
                            {amIHost && phase === 'waiting' ? '変更' : '確認'}
                        </button>
                    </div>

                    {/* ----- ステージ表示 ----- */}
                    <div className="flex flex-col items-center text-xs border rounded p-1 bg-white shadow-sm w-[33%] h-full">
                        <span className="font-medium text-gray-600 mb-1">ステージ</span>
                        <div className="flex items-center justify-center w-full h-[60px] bg-gray-100 rounded-sm overflow-hidden relative  flex-grow min-h-0">
                            {selectedStage ? (
                                <>
                                    {/* ランダムステージアイコン表示 */}
                                    {selectedStage.id === 'random' ? (
                                        <>
                                            <Image
                                                src={getRandomStageDisplayImagePath(randomStagePoolCount, STAGES_DATA.length)}
                                                alt={`ランダム (対象: ${randomStagePoolCount})`}
                                                fill
                                                sizes='width:142px height:60px'
                                                style={{ objectFit: 'cover' }}
                                            />
                                        </>
                                    ) : (
                                        // 通常のステージ画像
                                        <Image 
                                        src={selectedStage.imageUrl}
                                        alt={selectedStage.name}
                                        fill
                                        sizes='width:142px height:60px'
                                        style={{ objectFit: 'cover' }}
                                        />
                                    )}
                                </>
                            ) : (<span className="text-gray-500 text-xs">未選択</span>)}
                        </div>
                        {/* 名前表示 */}
                        <div className="h-8 mt-1 flex items-center justify-center"> {/* ★ 名前表示用スペース */}
                            {selectedStage && (
                                <p className={`font-semibold text-gray-800 leading-tight text-center break-words ${selectedStage.name.length <= 7 ? 'text-[15px]' : 'text-[10px]'}`}>
                                    {selectedStage.name}
                                </p>
                            )}
                        </div>
                        {/* 変更/確認ボタン */}
                        <button
                            onClick={onOpenStageModal}
                            className={`mt-1 px-2 py-0.5 text-xs rounded ${phase !== 'waiting' ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-300 hover:bg-gray-400'}`}
                            disabled={phase !== 'waiting'} // ★ ゲーム進行中は常に無効
                            title={phase !== 'waiting' ? "ゲーム進行中は変更/確認できません" : (amIHost ? "対象ステージ変更" : "対象ステージ確認")}
                        >
                            {amIHost && phase === 'waiting' ? '変更' : '確認'}
                        </button>
                    </div>

                </div> {/* flex container end */}

                {/* 現在のターン表示 */}
                {phase === 'waiting' && (<p className="font-bold text-gray-700 text-xl mt-2"> --- </p>)}
                {phase === 'ban' && (
                    <p className="font-bold text-xl text-purple-700 mt-2">
                        BANフェーズ
                    </p>)}
                {phase === 'pick' && currentTurn === 'alpha' && (
                    <p className="font-bold text-xl text-gray-700 mt-2">
                        PICKフェーズ: <span className={'text-blue-600'}> アルファチーム </span>
                    </p>)}
                {phase === 'pick' && currentTurn === 'bravo' && (
                    <p className="font-bold text-xl text-gray-700 mt-2">
                        PICKフェーズ: <span className={'text-red-600'}> ブラボーチーム </span>
                    </p>
                )}
                {/* Pick完了 */}
                {phase === 'pick_complete' && (<p className="font-bold text-green-600 text-xl mt-2">PICK完了!</p>)}

            </div> {/* 中央ブロック end */}

            {/* 右ブロック: 操作ボタン */}
            <div className="flex flex-col items-end gap-2 mt-4 mr-4">
                <button
                    onClick={onLeaveRoom} // Props の関数を呼び出し
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm w-full md:w-auto"
                >
                    ルーム退出
                </button>
                <button
                    onClick={onStartGame}
                    // disabled 条件: ホストでない または 待機中でない
                    disabled={!amIHost || phase !== 'waiting'}
                    className={`px-6 py-2 rounded-md text-sm w-full md:w-auto transition-colors
                        ${(amIHost && phase === 'waiting')
                            ? 'bg-green-500 text-white hover:bg-green-600' // ホストかつ待機中: 緑
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed' // それ以外: グレーアウト
                        }`}
                    // title は disabled の理由を示す
                    title={!amIHost ? 'ホストのみ開始できます' : (phase !== 'waiting' ? '待機中のみ開始できます' : '')}
                >
                    ゲーム開始 (ホストのみ)
                </button>

                <button
                    onClick={onResetGame}
                    // disabled 条件: ホストでない または 待機中でない (リセットは待機中にはできない)
                    disabled={!amIHost || phase === 'waiting'}
                    className={`px-4 py-2 rounded-md text-sm w-full md:w-auto transition-colors
                        ${(amIHost && phase !== 'waiting')
                            ? 'bg-yellow-500 text-white hover:bg-yellow-600' // ホストかつ待機中でない: 黄色
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed' // それ以外: グレーアウト
                        }`}
                    title={!amIHost ? 'ホストのみリセットできます' : (phase === 'waiting' ? '待機中はリセットできません' : '')}
                >
                    ルームリセット (ホストのみ)
                </button>

            </div>
        </div>
    );
});
GameHeader.displayName = 'GameHeader';
export default GameHeader;