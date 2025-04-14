'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import type { Socket } from 'socket.io-client';
import type { GameState, RoomUser, RoomWeaponState, MasterWeapon, Team } from '../../../common/types/game';
import { TOTAL_PICK_TURNS, MAX_BANS_PER_TEAM, MAX_PICKS_PER_TEAM } from '../../../common/types/constants';

interface WeaponGridProps {
    socket: Socket;
    roomId: string;
    masterWeapons: MasterWeapon[];
    userName: string;
}

interface DisplayWeapon extends MasterWeapon {
    selectedBy: Team | null;
    bannedBy: Team[];
    imageUrl: string;
    // ★ isLoading プロパティをコメントアウト (または削除)
    // isLoading?: boolean;
}

export default function WeaponGrid({ socket, roomId, masterWeapons, userName }: WeaponGridProps) {
    // --- State定義 ---
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [weaponStates, setWeaponStates] = useState<Record<number, RoomWeaponState>>({});
    const [myTeam, setMyTeam] = useState<Team | 'observer'>('observer');
    // ★ loadingWeaponId state をコメントアウト (または削除)
    // const [loadingWeaponId, setLoadingWeaponId] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // --- 表示用武器リスト生成 (Memoized) ---
    const displayWeapons: DisplayWeapon[] = useMemo(() => {
        return masterWeapons.map(master => {
            const state = weaponStates[master.id] || {
                id: master.id,
                selectedBy: null,
                bannedBy: [],
            };
            return {
                ...master,
                selectedBy: state.selectedBy,
                bannedBy: state.bannedBy,
                imageUrl: `/images/${encodeURIComponent(master.name)}.png`,
                // ★ isLoading の設定をコメントアウト
                // isLoading: loadingWeaponId === master.id,
            };
        });
    // ★ 依存配列から loadingWeaponId を削除
    }, [masterWeapons, weaponStates /*, loadingWeaponId */]);


    // --- デバッグ用 useEffect ---
    useEffect(() => { if (gameState) { /* console.log('[DEBUG] gameState updated:', JSON.stringify(gameState, null, 2)); */ } }, [gameState]);
    useEffect(() => { /* console.log('[DEBUG] weaponStates updated:', JSON.stringify(weaponStates, null, 2)); */ }, [weaponStates]);
    // --- デバッグ用 useEffect ここまで ---

    // --- エラーハンドラー ---
    const handleError = useCallback((message: string) => {
        console.error('Handled Error:', message);
        setErrorMessage(message);
        // ★ timerId は使われていないので削除 (setTimeout の戻り値はクリアする場合に使う)
        setTimeout(() => setErrorMessage(null), 5000);
        // const timerId = setTimeout(() => setErrorMessage(null), 5000);
    }, []);

    // --- WebSocketイベントリスナー設定 ---
    useEffect(() => {
        if (!socket) return;
        console.log(`[WeaponGrid ${roomId}] Setting up listeners for socket: ${socket.id}, User: ${userName}`);

        // --- リスナー定義 ---
        const handleInitialState = (initialGameState: GameState) => {
            if (initialGameState.roomId === roomId) {
                console.log(`[WeaponGrid ${roomId}] Received initial state:`, initialGameState);
                setGameState(initialGameState);
            } else {
                console.warn(`[WeaponGrid ${roomId}] Received initial state for other room: ${initialGameState.roomId}`);
            }
        };

        const handleInitialWeapons = (initialWeaponStates: RoomWeaponState[]) => {
            console.log(`[WeaponGrid ${roomId}] Received initial weapons state:`, initialWeaponStates);
            const statesMap: Record<number, RoomWeaponState> = {};
            initialWeaponStates.forEach(state => {
                statesMap[state.id] = state;
            });
            setWeaponStates(statesMap);
            console.log(`[WeaponGrid ${roomId}] Weapons state reconstructed.`);
        };

        const handleUpdateGameState = (updatedState: GameState) => {
            if (updatedState.roomId === roomId) {
                console.log(`[WeaponGrid ${roomId}] Received game state update:`, updatedState);
                setGameState(updatedState); // gameState を更新するだけにする
   
                // ★★★ ターン/フェーズ変更によるローディング解除ロジックをコメントアウト ★★★
                /*
                if (gameState && (updatedState.currentTurn !== gameState.currentTurn || updatedState.phase !== gameState.phase)) {
                   console.log(`[DEBUG handleUpdateGameState] Clearing loadingWeaponId due to turn/phase change.`);
                   setLoadingWeaponId(null);
                }
                */
                // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            }
        };

        const handleUpdateWeapon = (updatedWeaponData: RoomWeaponState) => {
            console.log(`[WeaponGrid ${roomId}] Received update weapon:`, updatedWeaponData);
            setWeaponStates((prevStates) => ({ ...prevStates, [updatedWeaponData.id]: updatedWeaponData }));
             // ★ loadingWeaponId の解除ロジックをコメントアウト
            /*
            if (loadingWeaponId === updatedWeaponData.id) {
                setLoadingWeaponId(null);
            }
            */
        };

        const handleTimeUpdate = (data: { timeLeft: number }) => {
            setGameState((prev) => prev ? { ...prev, timeLeft: data.timeLeft } : null);
        };

        const handleActionFailed = (data: { reason: string }) => {
            console.error(`[WeaponGrid ${roomId}] Action failed: ${data.reason}`);
            handleError(data.reason);
            // ★ loadingWeaponId の解除ロジックをコメントアウト
            // setLoadingWeaponId(null);
        };

        const handleUserJoined = (user: RoomUser) => {
            console.log(`[WeaponGrid ${roomId}] User joined:`, user);
            // TODO: 参加者リスト表示を更新
        };

        const handleUserLeft = (data: { userId: string; name: string; team: Team | 'observer' }) => {
            console.log(`[WeaponGrid ${roomId}] User left: ${data.name} (${data.userId})`);
            // TODO: 参加者リスト表示を更新
        };

        const handleUserUpdated = (user: RoomUser) => {
            console.log(`[WeaponGrid ${roomId}] User updated:`, user);
            if (user.name === userName) {
                console.log(`[WeaponGrid ${roomId}] My team updated to: ${user.team}`);
                setMyTeam(user.team ?? 'observer');
            }
            // TODO: 参加者リスト表示を更新
        };

        // --- リスナー登録 ---
        socket.on('initial state', handleInitialState);
        socket.on('initial weapons', handleInitialWeapons);
        socket.on('phase change', handleUpdateGameState);
        socket.on('room state update', handleUpdateGameState);
        socket.on('update weapon', handleUpdateWeapon);
        socket.on('time update', handleTimeUpdate);
        socket.on('action failed', handleActionFailed);
        socket.on('user joined', handleUserJoined);
        socket.on('user left', handleUserLeft);
        socket.on('user updated', handleUserUpdated);

        console.log(`[WeaponGrid ${roomId}] Listeners registered.`);

        // --- クリーンアップ ---
        return () => {
            console.log(`[WeaponGrid ${roomId}] Removing listeners...`);
            socket.off('initial state', handleInitialState);
            socket.off('initial weapons', handleInitialWeapons);
            socket.off('phase change', handleUpdateGameState);
            socket.off('room state update', handleUpdateGameState);
            socket.off('update weapon', handleUpdateWeapon);
            socket.off('time update', handleTimeUpdate);
            socket.off('action failed', handleActionFailed);
            socket.off('user joined', handleUserJoined);
            socket.off('user left', handleUserLeft);
            socket.off('user updated', handleUserUpdated);
        };
    }, [socket, roomId, userName, masterWeapons, gameState, handleError]);

    // --- 武器選択/禁止処理 (useCallbackで最適化) ---
    const handleWeaponClick = useCallback((weaponId: number) => {
        // ★ 条件分岐の詳細ログ
        if (!socket) { console.log('Action prevented: socket is null.'); return; }
        if (!gameState) { console.log('Action prevented: gameState is null.'); return; }
        if (myTeam === 'observer') { console.log('Action prevented: myTeam is observer.'); return; }
        // if (loadingWeaponId !== null) {
        //     // ★ なぜローディング中なのかログ出力
        //     console.log(`Action prevented: loadingWeaponId is not null (current: ${loadingWeaponId}, trying to click: ${weaponId}).`);
        //     return;
        // }

        const weapon = displayWeapons.find(w => w.id === weaponId);
        if (!weapon) return;

        const { phase, currentTurn, /*banPhaseState*/ } = gameState;
        const isMyTurn = currentTurn === myTeam;
        const isBanningPhase = phase === 'ban';
        const isPickingPhase = phase === 'pick';

        // --- アクション判定とクリック可否 ---
        let action: 'ban' | 'select' | null = null;
        let canPerformAction = false;
        // ★ myTeam が Team 型 ('alpha' or 'bravo') であることを確認してからアクセス
        if (isBanningPhase && (myTeam === 'alpha' || myTeam === 'bravo')) {
            // ★ BANフェーズもターン制にする場合は isMyTurn チェックを追加: && isMyTurn
            const currentBans = gameState.banPhaseState?.bans[myTeam] ?? 0; // BAN数は gameState から取得
            const maxBans = gameState.banPhaseState?.maxBansPerTeam ?? MAX_BANS_PER_TEAM;
            // ★ BAN上限未満であればクリック可能 (includes(myTeam) で自分がBAN済みかもチェック)
            if (!weapon.selectedBy && !weapon.bannedBy.includes(myTeam) && currentBans < maxBans) {
                action = 'ban';
                canPerformAction = true;
            }
        } else if (isPickingPhase && (myTeam === 'alpha' || myTeam === 'bravo') && isMyTurn) {
            if (!weapon.selectedBy && weapon.bannedBy.length === 0) {
                action = 'select';
                canPerformAction = true;
            }
        }

        // --- アクション実行 ---
        if (canPerformAction && action) {
            const eventName = action === 'ban' ? 'ban weapon' : 'select weapon';
            console.log(`[WeaponGrid ${roomId}] Emitting ${eventName} for weapon ${weaponId}`);
            // ★ setLoadingWeaponId のログ追加
            console.log(`[DEBUG handleWeaponClick] Setting loadingWeaponId to: ${weaponId}`);
            // setLoadingWeaponId(weaponId); // ★ ローディング開始
            socket.emit(eventName, { weaponId: weaponId });
        } else {
            // --- エラーフィードバック ---
            console.log('Action prevented:', { phase, currentTurn, myTeam, weaponStatus: weapon, canPerformAction, action });
            if (isPickingPhase) {
                if ((myTeam === 'alpha' || myTeam === 'bravo') && !isMyTurn) handleError('あなたのターンではありません。');
                else if (weapon.bannedBy.length > 0) handleError('この武器は BAN されています。');
                else if (weapon.selectedBy) handleError('この武器は既に Pick されています。');
            } else if (isBanningPhase) {
                if (myTeam === 'alpha' || myTeam === 'bravo') {
                    const currentBans = gameState.banPhaseState?.bans[myTeam] ?? 0;
                    const maxBans = gameState.banPhaseState?.maxBansPerTeam ?? MAX_BANS_PER_TEAM;
                    if (weapon.selectedBy) handleError('既に選択されている武器は BAN できません。');
                    else if (weapon.bannedBy.includes(myTeam)) handleError('この武器は既にあなたが BAN しています。');
                    else if (currentBans >= maxBans) handleError(`BAN できるのは ${maxBans} 個までです。`);
                }
            }
        }
    }, [socket, roomId, gameState, myTeam, /*loadingWeaponId,*/ displayWeapons, handleError]);

    // --- チーム選択処理関数 (useCallbackで最適化) ---
    const handleTeamSelect = useCallback((team: Team | 'observer') => {
        if (socket && gameState && gameState.phase === 'waiting') {
            console.log(`[WeaponGrid ${roomId}] Requesting team select: ${team}`);
            socket.emit('select team', { team });
        } else {
            console.log(`[WeaponGrid ${roomId}] Cannot select team, phase is not 'waiting' (${gameState?.phase})`);
            handleError('ゲーム開始前のみチームを選択できます。');
        }
    }, [socket, gameState, handleError, roomId]);

    // --- ゲーム開始処理 (useCallbackで最適化) ---
    const handleStart = useCallback(() => {
        if (socket && gameState && gameState.phase === 'waiting') {
            console.log(`[WeaponGrid ${roomId}] Emitting start game`);
            socket.emit('start game');
        }
    }, [socket, gameState, roomId]);

    // --- リセット処理 (useCallbackで最適化) ---
    const handleReset = useCallback(() => {
        if (socket && confirm('ゲーム状態をリセットしてもよろしいですか？')) {
            console.log(`[WeaponGrid ${roomId}] Emitting reset room`);
            socket.emit('reset room');
        }
    }, [socket, roomId]);

    // --- 表示用データの準備 (useMemoで最適化) ---
    // ★ alphaPicksCount, bravoPicksCount は使われていないので削除
    const { alphaPicks, bravoPicks, alphaBans, bravoBans, /* alphaPicksCount, bravoPicksCount, */ alphaBansCount, bravoBansCount } = useMemo(() => {
        const alphaPicks = displayWeapons.filter((w) => w.selectedBy === 'alpha');
        const bravoPicks = displayWeapons.filter((w) => w.selectedBy === 'bravo');
        const alphaBans = displayWeapons.filter((w) => w.bannedBy.includes('alpha'));
        const bravoBans = displayWeapons.filter((w) => w.bannedBy.includes('bravo'));
        return {
            alphaPicks, bravoPicks, alphaBans, bravoBans,
            // alphaPicksCount: alphaPicks.length,
            // bravoPicksCount: bravoPicks.length,
            alphaBansCount: alphaBans.length,
            bravoBansCount: bravoBans.length
        };
    }, [displayWeapons]);

    // --- レンダリング ---

    if (!gameState) {
        return (
            <div className="container mx-auto p-4 text-center">
                <p>ルーム情報 ({roomId}) を読み込み中...</p>
            </div>
        );
    }

    // --- グリッドアイテムのレンダリングロジック ---
    const renderWeaponItem = (weapon: DisplayWeapon) => {
        const isSelectedByAlpha = weapon.selectedBy === 'alpha';
        const isSelectedByBravo = weapon.selectedBy === 'bravo';
        const isBannedByAlpha = weapon.bannedBy.includes('alpha');
        const isBannedByBravo = weapon.bannedBy.includes('bravo');
        const isBanned = isBannedByAlpha || isBannedByBravo;
        const isMyTeamPlayer = myTeam === 'alpha' || myTeam === 'bravo';

        // --- クリック可否判定 ---
        let canClick = false;
        const isMyTurn = gameState.currentTurn === myTeam;
        if (gameState.phase === 'pick' && isMyTeamPlayer && isMyTurn && !weapon.selectedBy && !weapon.bannedBy.includes('alpha') && !weapon.bannedBy.includes('bravo')) {
            canClick = true;
        } else if (gameState.phase === 'ban' && isMyTeamPlayer) {
            if (myTeam === 'alpha' || myTeam === 'bravo') {
                const currentBans = gameState.banPhaseState?.bans[myTeam] ?? 0;
                const maxBans = gameState.banPhaseState?.maxBansPerTeam ?? MAX_BANS_PER_TEAM;
                if (!weapon.selectedBy && !weapon.bannedBy.includes(myTeam) && currentBans < maxBans) {
                    canClick = true;
                }
            }
        }
        // ★ isDisabled の計算から weapon.isLoading を削除
        const isDisabled = !canClick; // isDisabled の計算

        // --- スタイル決定 ---
        let bgColor = 'bg-white'; let borderColor = 'border-gray-200'; let imageOpacity = 'opacity-100'; let overallOpacity = 'opacity-100'; let ring = ''; let hoverEffect = 'hover:bg-blue-50 hover:border-blue-300'; let banMark = null; let cursor = 'cursor-pointer';

        if (isSelectedByAlpha) { bgColor = 'bg-blue-100'; borderColor = 'border-blue-400'; ring = 'ring-2 ring-offset-1 ring-blue-500'; hoverEffect = ''; cursor = 'cursor-not-allowed'; }
        else if (isSelectedByBravo) { bgColor = 'bg-red-100'; borderColor = 'border-red-400'; ring = 'ring-2 ring-offset-1 ring-red-500'; hoverEffect = ''; cursor = 'cursor-not-allowed'; }
        else if (isBanned) {
            bgColor = 'bg-gray-200'; borderColor = 'border-gray-300'; imageOpacity = 'opacity-40'; overallOpacity = 'opacity-70'; hoverEffect = ''; cursor = 'cursor-not-allowed';
            // ★ banColor を const に変更
            let banColorConst = 'text-gray-700';
            if (isBannedByAlpha) { banColorConst = 'text-blue-600'; }
            else if (isBannedByBravo) { banColorConst = 'text-red-600'; }
            banMark = (<div className={`absolute inset-0 flex items-center justify-center rounded-lg pointer-events-none`}><svg className={`w-10 h-10 ${banColorConst} opacity-75`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg></div>);
            // ★ myTeam が Team 型であることを確認
        } else if (gameState.phase === 'ban' && myTeam !== 'observer' && weapon.bannedBy.includes(myTeam) && !canClick) {
            bgColor = 'bg-yellow-100'; borderColor = 'border-yellow-400'; imageOpacity = 'opacity-40'; overallOpacity = 'opacity-80'; hoverEffect = ''; cursor = 'cursor-not-allowed';
            const banColor = myTeam === 'alpha' ? 'text-blue-600' : 'text-red-600';
            banMark = (<div className={`absolute inset-0 flex items-center justify-center rounded-lg pointer-events-none`}><svg className={`w-10 h-10 ${banColor} opacity-75`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg></div>);
        } else if (isDisabled /*&& !weapon.isLoading*/) {
            cursor = 'cursor-not-allowed'; hoverEffect = '';
            if (myTeam === 'observer' || gameState.phase === 'waiting' || gameState.phase === 'pick_complete') {
                bgColor = 'bg-gray-50'; overallOpacity = 'opacity-70';
            } else { overallOpacity = 'opacity-75'; }
        }

        // --- グリッドアイテム JSX ---
        return (
            <div
                key={`weapon-grid-${weapon.id}`}
                className={`relative p-2 rounded-lg border transition-all duration-150 ${bgColor} ${borderColor} ${overallOpacity} ${ring} ${cursor} ${hoverEffect}`}
                onClick={() => !isDisabled && handleWeaponClick(weapon.id)}
                title={weapon.name + (isDisabled ? ' (操作不可)' : '')}
            >
                <Image
                    src={weapon.imageUrl}
                    alt={weapon.name}
                    width={100}
                    height={100}
                    className={`mx-auto transition-opacity duration-150 ${imageOpacity}`}
                    priority={weapon.id <= 12}
                />
                {banMark}
                {/* {weapon.isLoading && (
                    <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-lg">
                        <svg className="animate-spin h-8 w-8 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                )} */}
                {/* ターン表示 */}
                {isMyTeamPlayer && !isDisabled && gameState.phase === 'pick' && (<div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs bg-green-200 text-green-800 rounded font-semibold animate-pulse">Pick!</div>)}
                {/* ★ isMyTurn チェックは isMyTeamPlayer && !isDisabled に含まれるので削除しても良い */}
                {isMyTeamPlayer && !isDisabled && gameState.phase === 'ban' /* && isMyTurn */ && (<div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded font-semibold animate-pulse">Ban!</div>)}
            </div>
        );
    }

    // --- JSX レンダリング本体 ---
    return (
        <div className="container mx-auto p-4 space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-wrap justify-between items-center gap-4 p-4 bg-gray-100 rounded-lg shadow">
                {/* Room ID */}
                <div className="font-semibold text-lg">ルーム: {roomId}</div>
                {/* Team Selection */}
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">あなたのチーム ({userName}):</span>
                    <button onClick={() => handleTeamSelect('alpha')} disabled={gameState.phase !== 'waiting' || myTeam === 'alpha'} className={`px-3 py-1 rounded-md text-sm transition-colors ${myTeam === 'alpha' ? 'bg-blue-500 text-white font-semibold ring-2 ring-blue-300' : 'bg-gray-200 hover:bg-gray-300'} ${gameState.phase !== 'waiting' ? 'opacity-50 cursor-not-allowed' : ''}`}>アルファ</button>
                    <button onClick={() => handleTeamSelect('bravo')} disabled={gameState.phase !== 'waiting' || myTeam === 'bravo'} className={`px-3 py-1 rounded-md text-sm transition-colors ${myTeam === 'bravo' ? 'bg-red-500 text-white font-semibold ring-2 ring-red-300' : 'bg-gray-200 hover:bg-gray-300'} ${gameState.phase !== 'waiting' ? 'opacity-50 cursor-not-allowed' : ''}`}>ブラボー</button>
                    <button onClick={() => handleTeamSelect('observer')} disabled={gameState.phase !== 'waiting' || myTeam === 'observer'} className={`px-3 py-1 rounded-md text-sm transition-colors ${myTeam === 'observer' ? 'bg-gray-500 text-white font-semibold ring-2 ring-gray-300' : 'bg-gray-200 hover:bg-gray-300'} ${gameState.phase !== 'waiting' ? 'opacity-50 cursor-not-allowed' : ''}`}>観戦</button>
                </div>
                {/* Game Status */}
                <div className="text-center space-y-1">
                    <p className="text-lg font-semibold">フェーズ: <span className="font-bold text-indigo-600">{gameState.phase}</span></p>
                    {(gameState.phase === 'pick' || gameState.phase === 'pick_complete') && gameState.currentPickTurnNumber != null && (<p>Pickターン: {gameState.currentPickTurnNumber} / {TOTAL_PICK_TURNS}</p>)}
                    {(gameState.phase === 'ban' || gameState.phase === 'pick') && gameState.timeLeft != null && (<p className="text-xl font-mono">残り時間: {gameState.timeLeft}秒</p>)}
                    {(gameState.phase === 'ban' || gameState.phase === 'pick') && gameState.currentTurn && (<p>現在のターン: <span className={`font-bold ${gameState.currentTurn === 'alpha' ? 'text-blue-600' : 'text-red-600'}`}>{gameState.currentTurn}チーム</span></p>)}
                    {gameState.phase === 'pick_complete' && (<p className="font-bold text-green-600 text-xl">選択完了！</p>)}
                    <p className="text-xs text-gray-500">参加者: {gameState.userCount}人</p>
                </div>
                {/* Control Buttons */}
                <div>
                    {/* {gameState.phase === 'waiting' && (<button onClick={handleStart} className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50" disabled={!socket || loadingWeaponId !== null}>ゲーム開始</button>)}
                    {(gameState.phase !== 'waiting') && (<button onClick={handleReset} className="ml-4 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50" disabled={loadingWeaponId !== null}>リセット</button>)} */}
                    {gameState.phase === 'waiting' && (<button onClick={handleStart} className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50" disabled={!socket}>ゲーム開始</button>)}
                    {(gameState.phase !== 'waiting') && (<button onClick={handleReset} className="ml-4 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50" >リセット</button>)}

                </div>
            </div>

            {/* Error Message */}
            {errorMessage && (<div className="p-3 bg-red-100 text-red-700 rounded-lg text-center">エラー: {errorMessage}</div>)}

            {/* Picked/Banned Weapons Display */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Alpha Team */}
                <div className="flex-1 border rounded-lg p-3 bg-blue-50 shadow-sm min-h-[150px]">
                    <h3 className="text-lg font-semibold mb-2 text-blue-800">アルファチーム {myTeam === 'alpha' ? `(あなた: ${userName})` : ''}</h3>
                    <div className="mb-3">
                        <h4 className="text-md font-medium mb-1 text-blue-700">選択 ({gameState.pickPhaseState?.picks.alpha ?? 0}/{MAX_PICKS_PER_TEAM})</h4>
                        <div className="flex flex-wrap gap-1">
                            {alphaPicks.length > 0 ? alphaPicks.map((weapon) => (
                                <div key={`alpha-pick-${weapon.id}`} className="relative border border-blue-300 rounded p-1 bg-white" title={`選択: ${weapon.name}`}>
                                    <Image src={weapon.imageUrl} alt={weapon.name} width={60} height={60} />
                                </div>
                            )) : <p className="text-sm text-gray-500">{gameState.phase === 'waiting' ? '待機中' : '-'}</p>}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-md font-medium mb-1 text-blue-700">禁止 ({gameState.banPhaseState?.bans.alpha ?? 0}/{MAX_BANS_PER_TEAM})</h4>
                        <div className="flex flex-wrap gap-1">
                            {alphaBans.length > 0 ? alphaBans.map((weapon) => {
                                const isSelfOrObserver = myTeam === 'alpha' || myTeam === 'observer';
                                const shouldShowBan = gameState.phase === 'pick' || gameState.phase === 'pick_complete' || (gameState.phase === 'ban' && isSelfOrObserver);
                                if (!shouldShowBan) return null;
                                return (
                                    <div key={`alpha-ban-${weapon.id}`} className="relative border border-gray-400 rounded p-1 bg-gray-200" title={`禁止: ${weapon.name}`}>
                                        <Image src={weapon.imageUrl} alt={weapon.name} width={60} height={60} className="opacity-70" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                        </div>
                                    </div>
                                );
                            }) : <p className="text-sm text-gray-500">{gameState.phase === 'waiting' ? '待機中' : '-'}</p>}
                            {gameState.phase === 'ban' && myTeam === 'bravo' && alphaBansCount > 0 && <p className="text-sm text-gray-400 italic">（相手のBANはPickフェーズで公開）</p>}
                        </div>
                    </div>
                </div>
                {/* Bravo Team */}
                <div className="flex-1 border rounded-lg p-3 bg-red-50 shadow-sm min-h-[150px]">
                    <h3 className="text-lg font-semibold mb-2 text-red-800">ブラボーチーム {myTeam === 'bravo' ? `(あなた: ${userName})` : ''}</h3>
                    <div className="mb-3">
                        <h4 className="text-md font-medium mb-1 text-red-700">選択 ({gameState.pickPhaseState?.picks.bravo ?? 0}/{MAX_PICKS_PER_TEAM})</h4>
                        <div className="flex flex-wrap gap-1">
                            {bravoPicks.length > 0 ? bravoPicks.map((weapon) => (
                                <div key={`bravo-pick-${weapon.id}`} className="relative border border-red-300 rounded p-1 bg-white" title={`選択: ${weapon.name}`}>
                                    <Image src={weapon.imageUrl} alt={weapon.name} width={60} height={60} />
                                </div>
                            )) : <p className="text-sm text-gray-500">{gameState.phase === 'waiting' ? '待機中' : '-'}</p>}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-md font-medium mb-1 text-red-700">禁止 ({gameState.banPhaseState?.bans.bravo ?? 0}/{MAX_BANS_PER_TEAM})</h4>
                        <div className="flex flex-wrap gap-1">
                            {bravoBans.length > 0 ? bravoBans.map((weapon) => {
                                const isSelfOrObserver = myTeam === 'bravo' || myTeam === 'observer';
                                const shouldShowBan = gameState.phase === 'pick' || gameState.phase === 'pick_complete' || (gameState.phase === 'ban' && isSelfOrObserver);
                                if (!shouldShowBan) return null;
                                return (
                                    <div key={`bravo-ban-${weapon.id}`} className="relative border border-gray-400 rounded p-1 bg-gray-200" title={`禁止: ${weapon.name}`}>
                                        <Image src={weapon.imageUrl} alt={weapon.name} width={60} height={60} className="opacity-70" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                        </div>
                                    </div>
                                );
                            }) : <p className="text-sm text-gray-500">{gameState.phase === 'waiting' ? '待機中' : '-'}</p>}
                            {gameState.phase === 'ban' && myTeam === 'alpha' && bravoBansCount > 0 && <p className="text-sm text-gray-400 italic">（相手のBANはPickフェーズで公開）</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Weapon Grid */}
            {(gameState.phase === 'ban' || gameState.phase === 'pick') && (
                <div className="overflow-x-auto mt-6">
                    <h3 className="text-xl font-semibold mb-3">
                        {gameState.phase === 'ban' ? '禁止する武器を選択してください' : '選択する武器を選んでください'}
                        {/* ★ myTeam が Team 型であることを確認 */}
                        {myTeam !== 'observer' && ` (${gameState.phase === 'ban' ? `${gameState.banPhaseState?.bans[myTeam] ?? 0}/${MAX_BANS_PER_TEAM}` : `${gameState.pickPhaseState?.picks[myTeam] ?? 0}/${MAX_PICKS_PER_TEAM}`})`}
                    </h3>
                    {displayWeapons.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                            {displayWeapons.map(renderWeaponItem)}
                        </div>
                    ) : (<p className="text-center text-gray-500 py-4">武器データが読み込まれていません。</p>)}
                </div>
            )}
            {gameState.phase === 'pick_complete' && (
                <div className="text-center py-6">
                    <h3 className="text-2xl font-bold text-green-600">ピック完了！</h3>
                </div>
            )}
            {gameState.phase === 'waiting' && (
                <div className="text-center py-6">
                    <h3 className="text-xl font-semibold text-gray-700">ゲーム開始待機中...</h3>
                    <p className="text-gray-500">チームを選択し、「ゲーム開始」ボタンを押してください。</p>
                </div>
            )}

        </div> // container end
    );
}