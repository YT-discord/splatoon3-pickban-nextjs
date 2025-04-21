'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import type { Socket } from 'socket.io-client';
import type { GameState, RoomUser, RoomWeaponState, MasterWeapon, Team, Stage, Rule, /*DisplayWeapon*/ } from '../../../common/types/game';
import { MAX_BANS_PER_TEAM,  STAGES_DATA, RULES_DATA, WEAPON_ATTRIBUTES, /*TOTAL_PICK_TURNS, MAX_PICKS_PER_TEAM*/ } from '../../../common/types/constants';
import toast from 'react-hot-toast';

import GameHeader from './GameHeader';
import TeamPanel from './TeamPanel';
import ObserverPanel from './ObserverPanel';
import WeaponFilter from './WeaponFilter';
import WeaponGridDisplay from './WeaponGridDisplay';

// ★ ランダム選択肢の定義
export const RANDOM_CHOICE = { id: 'random', name: 'ランダム', imageUrl: '/images/icons/random.png' };
export const RANDOM_CHOICE_ID = -1; // ランダム選択用の特別なID
export const RANDOM_CHOICE_ITEM = { id: RANDOM_CHOICE_ID, name: 'ランダム', attribute: 'special', imageUrl: '/images/icons/random.png' };


interface WeaponGridProps {
    socket: Socket;
    roomId: string;
    masterWeapons: MasterWeapon[];
    userName: string;
    myActualSocketId: string;
    onLeaveRoom: () => void;
}

export interface DisplayWeapon extends MasterWeapon {
    selectedBy: Team | null;
    bannedBy: Team[];
    imageUrl: string;
    isLoading: boolean;
}

export type WeaponAttribute = typeof WEAPON_ATTRIBUTES[number];

export default function WeaponGrid({ socket, roomId, masterWeapons, userName, myActualSocketId, onLeaveRoom }: WeaponGridProps) {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [weaponStates, setWeaponStates] = useState<Record<number, RoomWeaponState>>({});
    const [myTeam, setMyTeam] = useState<Team | 'observer'>('observer');
    const [loadingWeaponId, setLoadingWeaponId] = useState<number | null>(null);
    const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
    const [selectedStage, setSelectedStage] = useState<Stage | typeof RANDOM_CHOICE | null>(RANDOM_CHOICE);
    const [selectedRule, setSelectedRule] = useState<Rule | typeof RANDOM_CHOICE | null>(RANDOM_CHOICE);
    const [isStageModalOpen, setIsStageModalOpen] = useState(false);
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [selectedAttributes, setSelectedAttributes] = useState<WeaponAttribute[]>([]);

    // --- 表示用武器リスト生成 (Memoized) ---
    const displayWeapons: DisplayWeapon[] = useMemo(() => {
        let filteredWeapons = [...masterWeapons];

        if (selectedAttributes.length > 0) {
            filteredWeapons = filteredWeapons.filter(weapon =>
                // MasterWeapon の attribute が selectedAttributes 配列に含まれているかチェック
                selectedAttributes.includes(weapon.attribute as WeaponAttribute) // 型アサーション
            );
        }

        const currentDisplayWeapons = filteredWeapons.map(master => {
            const state = weaponStates[master.id] || { id: master.id, selectedBy: null, bannedBy: [], };
            return {
                ...master,
                selectedBy: state.selectedBy,
                bannedBy: state.bannedBy,
                imageUrl: `/images/weapons/${encodeURIComponent(master.name)}.png`,
                isLoading: loadingWeaponId === master.id,
            };
        });

        // Pickフェーズの自分のターンなら先頭にランダム選択アイテムを追加 ★★★
        if (gameState && gameState.phase === 'pick' && gameState.currentTurn === myTeam && (myTeam === 'alpha' || myTeam === 'bravo')) {
            const randomItemWithState: DisplayWeapon = {
                ...RANDOM_CHOICE_ITEM,
                selectedBy: null,
                bannedBy: [],
                isLoading: loadingWeaponId === RANDOM_CHOICE_ID,
            };
            currentDisplayWeapons.unshift(randomItemWithState);
        }

        return currentDisplayWeapons;
    }, [masterWeapons, weaponStates, loadingWeaponId, gameState, myTeam, selectedAttributes]);

    // 参加者リストをチームごとに分類
    const alphaTeamUsers = useMemo(() => roomUsers.filter(u => u.team === 'alpha'), [roomUsers]);
    const bravoTeamUsers = useMemo(() => roomUsers.filter(u => u.team === 'bravo'), [roomUsers]);
    const observers = useMemo(() => roomUsers.filter(u => u.team === 'observer' || !u.team), [roomUsers]); // チーム未定も観戦扱い

    // --- エラーハンドラー ---
    const handleError = useCallback((message: string) => {
        console.error('Handled Error:', message);
        toast.error(message);
    }, []);

    // --- WebSocketイベントリスナー設定 ---
    useEffect(() => {
        if (!socket) return;
        console.log(`[WeaponGrid ${roomId}] Setting up listeners for socket: ${socket.id}, User: ${userName}`);

        // --- リスナー定義 ---
        const handleInitialState = (initialGameState: GameState) => {
            if (initialGameState.roomId === roomId) {
                console.log(`[WeaponGrid ${roomId}] Received initial state:`, initialGameState);

                const newStageId = initialGameState.selectedStageId;
                const newRuleId = initialGameState.selectedRuleId;
                if (newStageId === 'random') { setSelectedStage(RANDOM_CHOICE); }
                else if (newStageId !== null) { setSelectedStage(STAGES_DATA.find(s => s.id === newStageId) || null); }
                else { setSelectedStage(null); }
                if (newRuleId === 'random') { setSelectedRule(RANDOM_CHOICE); }
                else if (newRuleId !== null) { setSelectedRule(RULES_DATA.find(r => r.id === newRuleId) || null); }
                else { setSelectedRule(null); }

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
                const newStageId = updatedState.selectedStageId;
                const newRuleId = updatedState.selectedRuleId;
                if (newStageId === 'random') {
                    setSelectedStage(RANDOM_CHOICE);
                } else if (newStageId !== null) {
                    const foundStage = STAGES_DATA.find(s => s.id === newStageId);
                    setSelectedStage(foundStage || null);
                } else {
                    setSelectedStage(null);
                }
                if (newRuleId === 'random') {
                    setSelectedRule(RANDOM_CHOICE);
                } else if (newRuleId !== null) {
                    const foundRule = RULES_DATA.find(r => r.id === newRuleId);
                    setSelectedRule(foundRule || null);
                } else {
                    setSelectedRule(null);
                }
                setGameState(updatedState);
            }
        };
        const handleUpdateWeapon = (updatedWeaponData: RoomWeaponState) => {
            setWeaponStates((prevStates) => ({ ...prevStates, [updatedWeaponData.id]: updatedWeaponData }));
            console.log(`[DEBUG handleUpdateWeapon] Current loadingWeaponId: ${loadingWeaponId}, Updated weaponId: ${updatedWeaponData.id}`);
            if (loadingWeaponId === updatedWeaponData.id || loadingWeaponId === RANDOM_CHOICE_ID) {
                console.log(`[DEBUG handleUpdateWeapon] Clearing loadingWeaponId (was: ${loadingWeaponId}) because updated weaponId is ${updatedWeaponData.id} or it was random.`);
                setLoadingWeaponId(null);
            } else {
                console.log(`[DEBUG handleUpdateWeapon] loadingWeaponId (${loadingWeaponId}) does not match updated weaponId (${updatedWeaponData.id}) and was not random. Not clearing.`);
            }
        };

        const handleTimeUpdate = (data: { timeLeft: number }) => {
            setGameState((prev) => prev ? { ...prev, timeLeft: data.timeLeft } : null);
        };

        const handleActionFailed = (data: { reason: string }) => {
            console.error(`[WeaponGrid ${roomId}] Action failed: ${data.reason}`);
            handleError(data.reason);
            if (loadingWeaponId !== null) {
                console.log(`[DEBUG handleActionFailed] Clearing loadingWeaponId (was: ${loadingWeaponId})`);
                setLoadingWeaponId(null);
            }
        };

        const handleInitialUsers = (users: RoomUser[]) => {
            console.log(`[WeaponGrid ${roomId}] Received initial users:`, users);
            setRoomUsers(users);
        };
        const handleUserJoined = (user: RoomUser) => {
            console.log(`[WeaponGrid ${roomId}] User joined:`, user);
            setRoomUsers((prevUsers) => {
                // 同じIDのユーザーがいなければ追加
                if (!prevUsers.some(u => u.id === user.id)) {
                    return [...prevUsers, user];
                }
                return prevUsers; // 既にいたら何もしない (重複防止)
            });
        };
        const handleUserLeft = (data: { userId: string; name: string; team: Team | 'observer' }) => {
            console.log(`[WeaponGrid ${roomId}] User left: ${data.name} (${data.userId})`);
            setRoomUsers((prevUsers) => prevUsers.filter(u => u.id !== data.userId));
        };
        const handleUserUpdated = (updatedUser: RoomUser) => {
            console.log(`[WeaponGrid ${roomId}] User updated:`, updatedUser);
            // 自分のチーム情報を更新
            if (updatedUser.name === userName) {
                setMyTeam(updatedUser.team ?? 'observer');
            }
            // 参加者リストの情報を更新
            setRoomUsers((prevUsers) => prevUsers.map(u =>
                u.id === updatedUser.id ? updatedUser : u
            ));
        };

        const handleRoomResetNotification = (data: { message: string }) => {
            toast.success(data.message, { icon: '🔄' });
        };

        const handleSystemMessage = (data: { type: string; message: string }) => {
            console.log(`[System Message] Received: ${data.message}`);
            // type によってアイコンなどを変えても良い
            if (data.type === 'game_started') {
                toast.success(data.message, { icon: '▶️' });
            } else if (data.type === 'room_reset') {
                toast.success(data.message, { icon: '🔄' });
            } else {
                toast.success(data.message, { icon: 'ℹ️' }); // デフォルト
            }
        };

        const handleHostChanged = (data: { hostId: string | null; hostName: string | null }) => {
            console.log(`[Host Changed] New host: ${data.hostName ?? 'None'} (${data.hostId ?? 'null'})`);
            // gameState に hostId が含まれているので、基本的には room state update で UI は更新されるはず。
            // 必要であれば、ここで別途 state を更新したり、トースト通知を出したりする。
            // 例: toast(`ホストが ${data.hostName ?? '不在'} になりました。`);
        };

        // --- リスナー登録 ---
        socket.on('initial state', handleInitialState);
        socket.on('initial weapons', handleInitialWeapons);
        socket.on('initial users', handleInitialUsers);
        socket.on('phase change', handleUpdateGameState);
        socket.on('room state update', handleUpdateGameState);
        socket.on('update weapon', handleUpdateWeapon);
        socket.on('time update', handleTimeUpdate);
        socket.on('action failed', handleActionFailed);
        socket.on('user joined', handleUserJoined);
        socket.on('user left', handleUserLeft);
        socket.on('user updated', handleUserUpdated);
        socket.on('room reset notification', handleRoomResetNotification);
        socket.on('system message', handleSystemMessage);
        socket.on('host changed', handleHostChanged);

        // 初期データ要求イベントを送信
        console.log(`[WeaponGrid ${roomId}] Requesting initial data...`);
        socket.emit('request initial data', { roomId });

        console.log(`[WeaponGrid ${roomId}] Listeners registered.`);

        // --- クリーンアップ ---
        return () => {
            console.log(`[WeaponGrid ${roomId}] Removing listeners...`);
            socket.off('initial state', handleInitialState);
            socket.off('initial weapons', handleInitialWeapons);
            socket.off('initial users');
            socket.off('phase change', handleUpdateGameState);
            socket.off('room state update', handleUpdateGameState);
            socket.off('update weapon', handleUpdateWeapon);
            socket.off('time update', handleTimeUpdate);
            socket.off('action failed', handleActionFailed);
            socket.off('user joined', handleUserJoined);
            socket.off('user left', handleUserLeft);
            socket.off('user updated', handleUserUpdated);
            socket.off('room reset notification', handleRoomResetNotification);
            socket.off('system message', handleSystemMessage);
            socket.off('host changed', handleHostChanged);
        };
    }, [socket, roomId, userName, masterWeapons, loadingWeaponId]);

    const handleAttributeFilterChange = useCallback((attribute: WeaponAttribute) => {
        setSelectedAttributes(prev =>
            prev.includes(attribute)
                ? prev.filter(a => a !== attribute)
                : [...prev, attribute]
        );
    }, []);
    const handleClearFilters = useCallback(() => {
        setSelectedAttributes([]);
    }, []);
    const handleSelectAllFilters = useCallback(() => {
        setSelectedAttributes([...WEAPON_ATTRIBUTES]);
    }, []);

    // --- 武器選択/禁止処理 ---
    const handleWeaponClick = (weaponId: number) => {
        if (!socket || !gameState || myTeam === 'observer' || loadingWeaponId !== null) {
            if (loadingWeaponId !== null) console.log(`Action prevented: loadingWeaponId is ${loadingWeaponId}`);
            return;
        }
        if (weaponId === RANDOM_CHOICE_ID) {
            if (gameState.phase === 'pick' && gameState.currentTurn === myTeam) {
                console.log(`[WeaponGrid ${roomId}] Emitting 'select random weapon'`);
                setLoadingWeaponId(RANDOM_CHOICE_ID); // ランダム選択中を示すIDを設定
                socket.emit('select random weapon'); // ★ サーバー側でランダム選択イベントを処理
            } else {
                handleError('現在はランダム選択できません。');
            }
            return; // 通常の武器選択処理は行わない
        }
        const weapon = displayWeapons.find(w => w.id === weaponId);
        if (!weapon) return;

        // ★ banPhaseState をここで分割代入 (ESLint警告対応)
        const { phase, currentTurn, banPhaseState } = gameState;
        const isMyTurn = currentTurn === myTeam;
        const isBanningPhase = phase === 'ban';
        const isPickingPhase = phase === 'pick';

        // --- アクション判定とクリック可否 ---
        let action: 'ban' | 'select' | null = null;
        let canPerformAction = false;
        if (isBanningPhase && (myTeam === 'alpha' || myTeam === 'bravo')) {
            const currentBans = banPhaseState?.bans[myTeam] ?? 0;
            const maxBans = banPhaseState?.maxBansPerTeam ?? MAX_BANS_PER_TEAM;
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
            console.log(`[DEBUG handleWeaponClick] Setting loadingWeaponId to: ${weaponId}`);
            setLoadingWeaponId(weaponId);
            socket.emit(eventName, { weaponId: weaponId });
        } else {
            // --- エラーフィードバック ---
            console.log('Action prevented:', { phase, currentTurn, myTeam, weaponStatus: weapon, canPerformAction, action });
            if (isPickingPhase) {
                if ((myTeam === 'alpha' || myTeam === 'bravo') && !isMyTurn) handleError('あなたのターンではありません。');
                else if (weapon.bannedBy.length > 0) handleError('この武器は BAN されています。');
                else if (weapon.selectedBy) handleError('この武器は既に Pick されています。');
            } else if (isBanningPhase) {
                // ★ banPhaseState を直接使用
                const currentBans = banPhaseState?.bans[myTeam] ?? 0;
                const maxBans = banPhaseState?.maxBansPerTeam ?? MAX_BANS_PER_TEAM;
                if (weapon.selectedBy) handleError('既に選択されている武器は BAN できません。');
                else if (weapon.bannedBy.includes(myTeam)) handleError('この武器は既にあなたが BAN しています。');
                else if (currentBans >= maxBans) handleError(`BAN できるのは ${maxBans} 個までです。`);
                else handleError('不明なBANエラー');
            }
        }
    }

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

    // モーダルを開くためのコールバック関数
    const openStageModal = useCallback(() => setIsStageModalOpen(true), []);
    const openRuleModal = useCallback(() => setIsRuleModalOpen(true), []);

    // --- ゲーム開始処理 (useCallbackで最適化) ---
    const handleStartGame = useCallback(() => {
        if (socket && gameState && gameState.phase === 'waiting') {
            console.log(`[WeaponGrid ${roomId}] Emitting start game`);
            socket.emit('start game');
        }
    }, [socket, gameState, roomId]);

    // --- リセット処理 (useCallbackで最適化) ---
    const handleResetGame = useCallback(() => {
        if (socket && confirm('ゲーム状態をリセットしてもよろしいですか？（全員が待機状態に戻ります）')) {
            console.log(`[WeaponGrid ${roomId}] Emitting reset room`);
            socket.emit('reset room');
        }
    }, [socket, roomId]);

    // --- 表示用データの準備 (useMemoで最適化) ---
    const { alphaPicks, bravoPicks, alphaBans, bravoBans } = useMemo(() => {
        // displayWeapons はフィルターとソートが適用されたリスト
        const alphaPicks = displayWeapons.filter(w => w.selectedBy === 'alpha');
        const bravoPicks = displayWeapons.filter(w => w.selectedBy === 'bravo');
        // bannedWeapons はフィルター前の全武器から計算する方が正確かもしれないが、
        // TeamPanel では表示されている武器の BAN 状態を見たいので displayWeapons からで良い
        const alphaBans = displayWeapons.filter(w => w.bannedBy.includes('alpha'));
        const bravoBans = displayWeapons.filter(w => w.bannedBy.includes('bravo'));
        return { alphaPicks, bravoPicks, alphaBans, bravoBans };
    }, [displayWeapons]); // displayWeapons が変更されたら再計算

    const handleLeaveButtonClick = useCallback(() => {
        if (socket && confirm(`${roomId} から退出しますか？`)) {
            console.log(`[WeaponGrid ${roomId}] Emitting 'leave room'`);
            socket.emit('leave room'); // サーバーに退出を通知
            onLeaveRoom(); // 親コンポーネントに状態変更を依頼
        }
    }, [socket, roomId, onLeaveRoom]);

    // --- レンダリング ---

    if (!gameState) {
        return (
            <div className="container mx-auto p-4 text-center">
                <p>ルーム情報 ({roomId}) を読み込み中...</p>
            </div>
        );
    }

    // ページ全体と中央カラム(グリッド部)の背景色クラスを決定
    let pageBgColor = 'bg-white'; // デフォルトのページ背景
    let gridBgColor = 'bg-white'; // デフォルトのグリッド背景

    if (gameState.phase === 'ban') {
        pageBgColor = 'bg-purple-100'; // BANフェーズのページ背景
        gridBgColor = 'bg-purple-200'; // BANフェーズのグリッド背景 (濃く)
    } else if (gameState.phase === 'pick' && gameState.currentTurn) {
        if (gameState.currentTurn === 'alpha') {
            pageBgColor = 'bg-blue-100'; // アルファターンのページ背景
            gridBgColor = 'bg-blue-200'; // アルファターンのグリッド背景 (濃く)
        } else if (gameState.currentTurn === 'bravo') {
            pageBgColor = 'bg-red-100'; // ブラボーターンのページ背景
            gridBgColor = 'bg-red-200'; // ブラボーターンのグリッド背景 (濃く)
        }
    }

    // --- JSX レンダリング本体 ---
    return (
        <div className={`container mx-auto p-4 space-y-6 ${pageBgColor} transition-colors duration-300 rounded-lg shadow-md`}>
            {/* ================== ヘッダーエリア ================== */}
            <GameHeader
                roomId={roomId}
                gameState={gameState}
                // userName={userName}
                myActualSocketId={myActualSocketId}
                myTeam={myTeam}
                selectedStage={selectedStage}
                selectedRule={selectedRule}
                onLeaveRoom={handleLeaveButtonClick} // 親から受け取った関数をそのまま渡す
                onStartGame={handleStartGame}       // 名前変更した関数
                onResetGame={handleResetGame}       // 名前変更した関数
                onOpenStageModal={openStageModal}   // モーダルを開く関数
                onOpenRuleModal={openRuleModal}     // モーダルを開く関数
            />

            {/* ================== メインエリア (3カラム) ================== */}
            {/* lg以上で3カラム、それ未満は1カラム */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <TeamPanel
                    team="alpha"
                    teamDisplayName="アルファ"
                    gameState={gameState} // gameState を渡す
                    teamUsers={alphaTeamUsers}
                    pickedWeapons={alphaPicks}
                    bannedWeapons={alphaBans}
                    myTeam={myTeam}
                    userName={userName}
                    onSelectTeam={handleTeamSelect} // チーム選択関数を渡す
                />

                {/* ----- 中央カラム: 武器グリッド ----- */}
                <div className="lg:col-span-6 lg:max-h-[calc(75vh-250px)] lg:overflow-y-auto flex flex-col gap-4">
                    <WeaponFilter
                        selectedAttributes={selectedAttributes}
                        onAttributeChange={handleAttributeFilterChange}
                        onClearFilters={handleClearFilters}
                        onSelectAllFilters={handleSelectAllFilters}
                    />


                    {/* Weapon Grid 本体 */}
                    <div className={`p-3 rounded-lg shadow-sm ${gridBgColor} transition-colors duration-300`}>
                    <WeaponGridDisplay
                        gameState={gameState}
                        displayWeapons={displayWeapons} // 計算済みの表示用武器リスト
                        myTeam={myTeam}
                        onWeaponClick={handleWeaponClick} // 武器クリックハンドラを渡す
                    />
                    </div>
                </div>
                

                {/* ----- 右カラム: ブラボーチーム ----- */}
                <TeamPanel
                    team="bravo"
                    teamDisplayName="ブラボー"
                    gameState={gameState} // gameState を渡す
                    teamUsers={bravoTeamUsers}
                    pickedWeapons={bravoPicks}
                    bannedWeapons={bravoBans}
                    myTeam={myTeam}
                    userName={userName}
                    onSelectTeam={handleTeamSelect} // チーム選択関数を渡す
                />
            </div>

            {/* ================== フッターエリア: 観戦者リスト ================== */}
            <ObserverPanel
                gameState={gameState}
                observers={observers}
                myTeam={myTeam}
                userName={userName}
                onSelectTeam={handleTeamSelect}
            />

            {/* Selection Modals */}
            <SelectionModal
                isOpen={isStageModalOpen}
                onClose={() => setIsStageModalOpen(false)}
                items={STAGES_DATA}
                onSelect={(stage) => {
                    setSelectedStage(stage);
                    if (socket) {
                        const stageIdToSend = typeof stage.id === 'string' ? 'random' : stage.id;
                        console.log(`[WeaponGrid ${roomId}] Emitting 'select stage':`, stageIdToSend);
                        socket.emit('select stage', { stageId: stageIdToSend });
                    }
                    console.log('Selected Stage:', stage);
                }}
                title="ステージを選択"
                randomOption={RANDOM_CHOICE}
            />
            <SelectionModal
                isOpen={isRuleModalOpen}
                onClose={() => setIsRuleModalOpen(false)}
                items={RULES_DATA}
                onSelect={(rule) => {
                    setSelectedRule(rule);
                    if (socket) {
                        const ruleIdToSend = typeof rule.id === 'string' ? 'random' : rule.id;
                        console.log(`[WeaponGrid ${roomId}] Emitting 'select rule':`, ruleIdToSend);
                        socket.emit('select rule', { ruleId: ruleIdToSend });
                    }
                    console.log('Selected Rule:', rule);
                }}
                title="ルールを選択"
                randomOption={RANDOM_CHOICE}
            />
        </div> // container end
    );

    // ★★★ 選択肢の型定義 (ステージまたはルール) ★★★
    type SelectableItem = Stage | Rule | typeof RANDOM_CHOICE;

    // ★★★ 汎用選択モーダルコンポーネント (簡易版) ★★★
    interface SelectionModalProps<T extends SelectableItem> {
        isOpen: boolean;
        onClose: () => void;
        items: (T extends typeof RANDOM_CHOICE ? never : T)[];
        onSelect: (item: T) => void;
        title: string;
        randomOption?: typeof RANDOM_CHOICE; // ランダム選択肢を追加
    }

    function SelectionModal<T extends SelectableItem>({ isOpen, onClose, items, onSelect, title, randomOption }: SelectionModalProps<T>) {
        if (!isOpen) return null;

        const handleSelect = (item: T) => {
            onSelect(item);
            onClose();
        };

        return (
            // オーバーレイ (半透明黒背景)
            <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4"> {/* ★ bg-opacity-80 追加 */}
                {/* モーダル本体 */}
                <div className="bg-white rounded-lg shadow-xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        {/* ★ タイトル文字色変更 */}
                        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                    </div>
                    {/* 選択肢グリッド */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                        {/* ランダム選択肢 */}
                        {randomOption && (
                            <button
                                key={randomOption.id}
                                onClick={() => handleSelect(randomOption as T)}
                                className="flex flex-col items-center p-2 border rounded-md hover:bg-gray-100 hover:shadow-sm transition-all"
                            >
                                <Image src={randomOption.imageUrl} alt={randomOption.name} width={80} height={45} className="object-cover mb-1 border" />
                                {/* ★ 文字色変更 */}
                                <span className="text-xs text-center text-gray-800">{randomOption.name}</span>
                            </button>
                        )}
                        {/* 通常の選択肢 */}
                        {items.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleSelect(item)}
                                className="flex flex-col items-center p-2 border rounded-md hover:bg-gray-100 hover:shadow-sm transition-all"
                            >
                                <Image src={item.imageUrl} alt={item.name} width={80} height={45} className="object-cover mb-1 border" />
                                {/* ★ 文字色変更 */}
                                <span className="text-xs text-center text-gray-800">{item.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
}