import React, { useState, useCallback, useEffect, memo} from 'react';
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
    isAnyRandomSettingsModalOpen: boolean; // ★ 追加: ランダム設定モーダルが開いているか
    onStartGame: () => void;
    onResetGame: () => void;
    onOpenStageModal: () => void;
    onOpenRuleModal: () => void;
    onOpenMembersModal?: () => void;
}

const validateRoomName = (name: string): string | null => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) return 'ルーム名を入力してください。';
    if (trimmedName.length > 10) return 'ルーム名が長すぎます (10文字以内)';
    return null;
};

const getRandomStageDisplayImagePath = (count: number, total: number): string => {
    if (count === total) {
        return '/images/stages/omakase/25.png'; // 全選択状態のアイコン
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
    isAnyRandomSettingsModalOpen, // ★ props を受け取る
    onStartGame,
    onResetGame,
    onOpenStageModal,
    onOpenRuleModal,
    onOpenMembersModal
}) => {

    const [isEditingName, setIsEditingName] = useState(false);
    const [editingName, setEditingName] = useState(roomName);
    const [editError, setEditError] = useState<string | null>(null);

    // 表示用のステージ・ルール情報を管理するローカルステート
    const [displayStageImagePath, setDisplayStageImagePath] = useState<string>('');
    const [displayRuleImagePath, setDisplayRuleImagePath] = useState<string>('');
    const [displaySelectedStageName, setDisplaySelectedStageName] = useState<string>('');
    const [displaySelectedRuleName, setDisplaySelectedRuleName] = useState<string>('');

    useEffect(() => {
        // モーダルが開いている間は、propsの変更を表示に即時反映しない
        // (モーダル内での選択とヘッダー表示がチカチカするのを防ぐため)
        // モーダルが閉じていれば、propsの変更を常に表示に反映する
        if (!isAnyRandomSettingsModalOpen) {
            if (selectedStage) {
                setDisplaySelectedStageName(selectedStage.name);
                if (selectedStage.id === 'random') {
                    // ゲーム開始前のおまかせ選択時
                    setDisplayStageImagePath(getRandomStageDisplayImagePath(randomStagePoolCount, STAGES_DATA.length));
                } else {
                    // ゲーム開始後、具体的なステージが決定された場合、または通常選択時
                    setDisplayStageImagePath(selectedStage.imageUrl);
                }
            } else {
                setDisplaySelectedStageName('未選択');
                setDisplayStageImagePath(''); // またはデフォルト画像
            }

            if (selectedRule) {
                setDisplaySelectedRuleName(selectedRule.name);
                if (selectedRule.id === 'random') {
                    setDisplayRuleImagePath(getRandomRuleDisplayImagePath(randomRulePoolCount, RULES_DATA.length));
                } else {
                    setDisplayRuleImagePath(selectedRule.imageUrl);
                }
            } else {
                setDisplaySelectedRuleName('未選択');
                setDisplayRuleImagePath(''); // またはデフォルト画像
            }
        }
    }, [isAnyRandomSettingsModalOpen, selectedStage, randomStagePoolCount, selectedRule, randomRulePoolCount]);

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
        <div className={`flex flex-col lg:grid lg:grid-cols-3 lg:gap-4 items-stretch ${headerBgColor} rounded-lg shadow lg:mb-4 transition-colors duration-300 h-full`}>
            {/* --- 上部セクション (スマホ: 2/5高, 横並び) / PC: 左ブロック (アイコンと情報が横並び) --- */}
            <div className={`h-[40%] lg:h-auto flex flex-row items-start justify-between p-1 lg:flex-row lg:items-center lg:p-0 lg:ml-4`}>
                {/* 左側コンテンツブロック (ルームアイコン + ルーム情報) */}
                <div className="flex items-center gap-2 lg:gap-3"> {/* スマホ・PC共にアイコンとテキスト情報を横並びにするためのコンテナ */}
                    <Image
                        src={getRoomIconPath(roomId)} // roomId は固定なので変更なし
                        alt={`${roomId} icon`} // roomId は固定なので変更なし
                        width={32} // スマホ用に少し小さく
                        height={32} // スマホ用に少し小さく
                        className="rounded flex-shrink-0 lg:w-10 lg:h-10" // PCでは元のサイズに戻す
                    />
                    <div className="flex-grow min-w-0 ml-2 lg:ml-0">
                        {/* 固定の部屋ID表示 */}
                        <div className="text-[10px] lg:text-xs text-black truncate" title={roomId}>
                            {roomId} {/* アイコンと連動する元のID */}
                        </div>
                        {/* 編集可能なルーム名表示/編集 */}
                        {!isEditingName ? (
                            // 表示モード
                            <div className="flex items-center gap-1">
                                <div className="font-semibold text-base lg:text-lg text-gray-800 truncate" title={roomName}>
                                    {roomName}
                                </div>
                                {/* 鉛筆マーク (ルーム名の右) */}
                                {amIHost && (
                                    <button onClick={startEditingName} className="p-0.5 text-gray-500 hover:text-gray-700 flex-shrink-0" title="ルーム名編集">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 lg:h-4 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                                        className={`flex-grow px-2 py-1 border rounded text-xs lg:text-sm text-gray-800 bg-white placeholder-gray-500 ${editError ? 'border-red-500' : 'border-gray-300'}`}
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
                        <p className="text-xs lg:text-sm text-gray-600 mt-0.5">({userCount}人参加)</p>
                    </div>
                </div>

                {/* 右側: スマホ用操作ボタン4つ (PCでは非表示) */}
                {/* このコンテナはスマホでのみ表示され、ボタンを横並びにする */}
                <div className="grid grid-cols-2 gap-1 lg:hidden flex-shrink-0"> {/* flex-shrink-0 でボタンが潰れるのを防ぐ */}
                    {/* 1行目 */}
                    {onOpenMembersModal && (
                        <button
                            onClick={onOpenMembersModal}
                            className="w-10 h-7 flex items-center justify-center bg-indigo-500 text-white rounded-md hover:bg-indigo-600 text-[10px] leading-tight"
                            title="参加者リスト"
                        >
                            メンバー
                        </button>
                    )}
                    <button
                        onClick={onLeaveRoom}
                        className="w-10 h-7 flex items-center justify-center bg-gray-500 text-white rounded-md hover:bg-gray-600 text-[10px] leading-tight"
                        title="ルーム退出"
                    >
                        退出
                    </button>
                    {/* 2行目 */}
                    <button
                        onClick={onStartGame}
                        disabled={!amIHost || phase !== 'waiting'}
                        className={`w-10 h-7 flex items-center justify-center rounded-md text-[10px] leading-tight transition-colors
                            ${(amIHost && phase === 'waiting') ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                        title={!amIHost ? 'ホストのみ' : (phase !== 'waiting' ? '待機中のみ' : 'ゲーム開始')}
                    >
                        開始
                    </button>
                    <button
                        onClick={onResetGame}
                        disabled={!amIHost || phase === 'waiting'}
                        className={`w-10 h-7 flex items-center justify-center rounded-md text-[10px] leading-tight transition-colors
                            ${(amIHost && phase !== 'waiting') ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                        title={!amIHost ? 'ホストのみ' : (phase === 'waiting' ? '待機中は不可' : 'ルームリセット')}
                    >
                        リセット
                    </button>
                </div>
            </div>

            {/* --- 中央セクション (スマホ: 2/5高) / PC: 中央ブロック --- */}
            <div className="h-[60%] lg:h-auto text-center flex flex-col items-center justify-center p-1 lg:p-0 border-t lg:border-none"> {/* スマホ用に p-1 を維持、高さを h-[40%] に戻す */}

                {/* タイマー、ルール、ステージの横並びコンテナ */}
                <div className="flex justify-around items-stretch gap-1 lg:gap-3 w-full h-full lg:h-auto">

                    {/* ----- タイマー表示枠 (常に表示) ----- */}
                    <div className="flex flex-col items-center text-[10px] lg:text-xs border rounded p-0.5 lg:p-1 bg-white shadow-sm w-[33%] h-full">
                        <span className="font-medium text-gray-600 mb-0.5 lg:mb-1">残り時間</span>
                        <div className="flex items-center justify-center w-full flex-grow min-h-0 my-0.5 lg:my-0">
                            {(phase === 'ban' || phase === 'pick') && timeLeft != null && timerDuration > 0 ? (
                                // BAN/PICK 中はタイマー表示
                                <CircularTimer
                                    duration={timerDuration}
                                    currentTime={timeLeft}
                                    size={40} // スマホ用に小さく
                                    strokeWidth={3} // スマホ用に細く
                                // PC用スタイルは props で渡すか、ここで lg: で上書き
                                />
                            ) : phase === 'waiting' ? (
                                // 待機中はテキスト表示
                                <span className="text-gray-400 text-base lg:text-lg font-mono" title="ゲーム開始後に表示されます">--:--</span>
                            ) : phase === 'pick_complete' ? (
                                // Pick完了時はチェックマークなど (任意)
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 lg:h-8 lg:w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                // それ以外 (エラーなど) は空白 or 何か表示
                                <span className="text-gray-400">-</span>
                            )}
                        </div>
                        {/* ダミーのボタンエリア (高さを揃えるため) */}
                        <div className="h-5 lg:h-[26px] mt-0.5 lg:mt-1"></div> {/* スマホ用に高さを調整 */}
                    </div>


                    {/* ----- ルール表示 ----- */}
                    <div className="flex flex-col items-center text-[10px] lg:text-xs border rounded p-0.5 lg:p-1 bg-white shadow-sm w-[33%] h-full">
                        <span className="font-medium text-gray-600 mb-0.5 lg:mb-1 flex-shrink-0">ルール</span>
                        <div
                            className={`flex items-center justify-center w-full h-12 lg:h-[60px] bg-gray-100 rounded-sm overflow-hidden relative flex-grow min-h-0 my-0.5 lg:my-0 group
                                ${phase === 'waiting' ? (amIHost ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : 'cursor-pointer hover:ring-2 hover:ring-gray-400') : 'cursor-not-allowed'}`}
                            onClick={() => {
                                if (phase === 'waiting') {
                                    onOpenRuleModal();
                                }
                            }}
                            title={phase !== 'waiting' ? "ゲーム進行中は変更/確認できません" : (amIHost ? "対象ルール変更" : "対象ルール確認")}
                        >
                            {displayRuleImagePath ? (
                                <>
                                    {/* ランダムルールアイコン表示 */}
                                    {selectedRule?.id === 'random' ? ( // props の selectedRule を参照してランダムかどうか判断
                                        <>
                                            <Image
                                                src={displayRuleImagePath} // 表示用ステートを使用
                                                alt={`ランダム (対象: ${randomRulePoolCount})`} // alt は元の情報で良い
                                                fill // fill を維持
                                                sizes='(max-width: 1023px) 80px, 142px' // スマホ用とPC用でサイズ指定

                                                style={{ objectFit: 'cover' }}
                                            />
                                        </>
                                    ) : (
                                        // 通常のルール画像
                                        <Image src={displayRuleImagePath} // 表示用ステートを使用
                                            alt={displaySelectedRuleName} // 表示用ステートを使用
                                            fill
                                            sizes='(max-width: 1023px) 80px, 142px'
                                            style={{ objectFit: 'contain' }}
                                        />
                                    )}
                                </>
                            ) : (<span className="text-gray-500 text-[10px] lg:text-xs">{displaySelectedRuleName}</span>)}
                        </div>
                        {/* 名前表示 */}
                        <div className="h-5 lg:h-8 mt-0.5 lg:mt-1 flex items-center justify-center flex-shrink-0">
                            {displaySelectedRuleName && (
                                <p className="text-[10px] lg:text-[15px] font-semibold text-gray-800 leading-tight text-center break-words">
                                    {displaySelectedRuleName}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ----- ステージ表示 ----- */}
                    <div className="flex flex-col items-center text-[10px] lg:text-xs border rounded p-0.5 lg:p-1 bg-white shadow-sm w-[33%] h-full ">
                        <span className="font-medium text-gray-600 mb-0.5 lg:mb-1 flex-shrink-0">ステージ</span>
                        <div
                            className={`flex items-center justify-center w-full h-12 lg:h-[60px] bg-gray-100 rounded-sm overflow-hidden relative flex-grow min-h-0 my-0.5 lg:my-0 group
                                ${phase === 'waiting' ? (amIHost ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : 'cursor-pointer hover:ring-2 hover:ring-gray-400') : 'cursor-not-allowed'}`}
                            onClick={() => {
                                if (phase === 'waiting') {
                                    onOpenStageModal();
                                }
                            }}
                            title={phase !== 'waiting' ? "ゲーム進行中は変更/確認できません" : (amIHost ? "対象ステージ変更" : "対象ステージ確認")}
                        >
                            {displayStageImagePath ? (
                                <>
                                    {/* ランダムステージアイコン表示 */}
                                    {selectedStage?.id === 'random' ? ( // props の selectedStage を参照
                                        <>
                                            <Image
                                                src={displayStageImagePath} // 表示用ステートを使用
                                                alt={`ランダム (対象: ${randomStagePoolCount})`} // alt は元の情報で良い
                                                fill
                                                sizes='(max-width: 1023px) 80px, 142px' // スマホ用とPC用でサイズ指定
                                                style={{ objectFit: 'cover' }}
                                            />
                                        </>
                                    ) : (
                                        // 通常のステージ画像
                                        <Image
                                            src={displayStageImagePath} // 表示用ステートを使用
                                            alt={displaySelectedStageName} // 表示用ステートを使用
                                            fill
                                            sizes='(max-width: 1023px) 80px, 142px' // スマホ用とPC用でサイズ指定
                                            style={{ objectFit: 'cover' }}
                                        />
                                    )}
                                </>
                            ) : (<span className="text-gray-500 text-[10px] lg:text-xs">{displaySelectedStageName}</span>)}
                        </div>
                        {/* 名前表示 */}
                        <div className="h-5 lg:h-8 mt-0.5 lg:mt-1 flex items-center justify-center flex-shrink-0">
                            {displaySelectedStageName && (
                                <p className={`font-semibold text-gray-800 leading-tight text-center break-words ${displaySelectedStageName.length <= 7 ? 'text-[10px] lg:text-[15px]' : 'text-[8px] lg:text-[10px]'}`}>
                                    {displaySelectedStageName}
                                </p>
                            )}
                        </div>
                    </div>

                </div> {/* flex container end */}

                {/* 現在のターン表示 (PC用 - 中央セクション下部) */}
                <div className="hidden lg:flex h-[2rem] mt-2 items-center justify-center">
                    {phase === 'waiting' && (<p className="font-semibold text-gray-700 text-sm lg:text-xl"> --- </p>)}
                    {phase === 'ban' && (
                        <p className="font-semibold text-sm lg:text-xl text-purple-700">
                            BANフェーズ
                        </p>)}
                    {phase === 'pick' && currentTurn === 'alpha' && (
                        <p className="font-semibold text-gray-700 text-sm lg:text-xl">
                            PICK: <span className={'text-blue-600'}> アルファ </span>
                        </p>)}
                    {phase === 'pick' && currentTurn === 'bravo' && (
                        <p className="font-semibold text-gray-700 text-sm lg:text-xl">
                            PICK: <span className={'text-red-600'}> ブラボー </span>
                        </p>
                    )}
                    {phase === 'pick_complete' && (<p className="font-semibold text-green-600 text-sm lg:text-xl">PICK完了!</p>)}
                </div>

            </div> {/* 中央ブロック end */}

            {/* --- 下部セクション (スマホ: 1/5高) / PC: 右ブロック --- */}
            <div className="h-[20%] lg:h-auto flex flex-col items-center justify-center p-1 lg:p-0 lg:items-end lg:justify-start gap-1 lg:gap-2 lg:my-4 border-t lg:border-none"> {/* スマホ用に p-1 を維持 */}
                {/* 現在のターン表示 (スマホ用 - 下部セクション) */}
                <div className="lg:hidden flex items-center justify-center w-full h-full">
                    {phase === 'waiting' && (<p className="font-semibold text-gray-700 text-sm"> --- </p>)}
                    {phase === 'ban' && (
                        <p className="font-semibold text-purple-700 text-sm">
                            BANフェーズ
                        </p>)}
                    {phase === 'pick' && currentTurn === 'alpha' && (
                        <p className="font-semibold text-gray-700 text-sm">
                            PICK: <span className={'text-blue-600'}> アルファ </span>
                        </p>)}
                    {phase === 'pick' && currentTurn === 'bravo' && (
                        <p className="font-semibold text-gray-700 text-sm">
                            PICK: <span className={'text-red-600'}> ブラボー </span>
                        </p>
                    )}
                    {phase === 'pick_complete' && (<p className="font-semibold text-green-600 text-sm">PICK完了!</p>)}
+                </div>
                {/* PC用メンバー表示ボタン (スマホでは非表示、上部セクションに専用ボタンあり) */}
                {onOpenMembersModal && ( // onOpenMembersModal が渡された場合のみ表示 (PC用)
                    <button
                        onClick={onOpenMembersModal}
                        className="hidden lg:block px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 text-sm lg:w-2/3 md:w-auto"
                    >
                        メンバー表示
                    </button>
                )}
                <button
                    onClick={onLeaveRoom} // Props の関数を呼び出し
                    className="hidden lg:block lg:px-4 lg:py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 lg:text-sm lg:w-2/3"
                >
                    ルーム退出
                </button>
                <button
                    onClick={onStartGame}
                    // disabled 条件: ホストでない または 待機中でない
                    disabled={!amIHost || phase !== 'waiting'}
                    className={`hidden lg:block lg:px-6 lg:py-2 rounded-md lg:text-sm lg:w-2/3 transition-colors
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
                    className={`hidden lg:block lg:px-4 lg:py-2 rounded-md lg:text-sm lg:w-2/3 transition-colors
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