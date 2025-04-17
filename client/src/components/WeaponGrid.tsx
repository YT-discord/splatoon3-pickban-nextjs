'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import type { Socket } from 'socket.io-client';
import type { GameState, RoomUser, RoomWeaponState, MasterWeapon, Team, Stage, Rule } from '../../../common/types/game';
import { TOTAL_PICK_TURNS, MAX_BANS_PER_TEAM, MAX_PICKS_PER_TEAM, STAGES_DATA, RULES_DATA, WEAPON_ATTRIBUTES } from '../../../common/types/constants';
import toast from 'react-hot-toast';

// ★ ランダム選択肢の定義
const RANDOM_CHOICE = { id: 'random', name: 'ランダム', imageUrl: '/images/icons/random.png' };
const RANDOM_CHOICE_ID = -1; // ランダム選択用の特別なID
const RANDOM_CHOICE_ITEM = { id: RANDOM_CHOICE_ID, name: 'ランダム', attribute:'special', imageUrl: '/images/icons/random.png' };


interface WeaponGridProps {
    socket: Socket;
    roomId: string;
    masterWeapons: MasterWeapon[];
    userName: string;
    onLeaveRoom: () => void;
}

interface DisplayWeapon extends MasterWeapon {
    selectedBy: Team | null;
    bannedBy: Team[];
    imageUrl: string;
    isLoading: boolean;
}

type SortableKey = keyof Pick<MasterWeapon, 'id' | 'name' | 'attribute'>;
type WeaponAttribute = typeof WEAPON_ATTRIBUTES[number];

export default function WeaponGrid({ socket, roomId, masterWeapons, userName, onLeaveRoom }: WeaponGridProps) {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [weaponStates, setWeaponStates] = useState<Record<number, RoomWeaponState>>({});
    const [myTeam, setMyTeam] = useState<Team | 'observer'>('observer');
    const [loadingWeaponId, setLoadingWeaponId] = useState<number | null>(null);
    const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
    const [selectedStage, setSelectedStage] = useState<Stage | typeof RANDOM_CHOICE | null>(RANDOM_CHOICE);
    const [selectedRule, setSelectedRule] = useState<Rule | typeof RANDOM_CHOICE | null>(RANDOM_CHOICE);
    const [isStageModalOpen, setIsStageModalOpen] = useState(false);
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKey | null; direction: 'ascending' | 'descending' }>({ key: 'id', direction: 'ascending' });
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

        const sortableItems = filteredWeapons
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key!]; // sortConfig.key は null でないことを保証
                const bValue = b[sortConfig.key!];
                if (sortConfig.key === 'id' && typeof aValue === 'number' && typeof bValue === 'number') {
                     return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
                }
                // 名前や属性でソートする場合 (文字列比較)
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                     return sortConfig.direction === 'ascending'
                       ? aValue.localeCompare(bValue, 'ja') // 日本語対応
                       : bValue.localeCompare(aValue, 'ja');
                }
                return 0;
            });
        }

        const currentDisplayWeapons = sortableItems.map(master => {
            const state = weaponStates[master.id] || { id: master.id, selectedBy: null, bannedBy: [], };
            return {
                ...master,
                selectedBy: state.selectedBy,
                bannedBy: state.bannedBy,
                imageUrl: `/images/${encodeURIComponent(master.name)}.png`,
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
    }, [masterWeapons, weaponStates, loadingWeaponId, sortConfig, gameState, myTeam, selectedAttributes]);

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
        };
    }, [socket, roomId, userName, masterWeapons, loadingWeaponId]);

    const handleAttributeFilterChange = (attribute: WeaponAttribute) => {
        setSelectedAttributes(prev =>
            prev.includes(attribute)
                ? prev.filter(a => a !== attribute) // 既に選択されていれば解除
                : [...prev, attribute] // 選択されていなければ追加
        );
    };

    const handleClearFilters = () => {
        setSelectedAttributes([]); // 空にする = すべて表示
    };
    const handleSelectAllFilters = () => {
        setSelectedAttributes([...WEAPON_ATTRIBUTES]); // 全て選択
    };

    // eslint-disable-next-line
    const handleSort = (key: SortableKey) => { 
        let direction: 'ascending' | 'descending' = 'ascending';
        // 現在と同じキーがクリックされたら方向を反転
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
        console.log(`[WeaponGrid ${roomId}] Sorting by ${key} ${direction}`);
    };

    // --- 武器選択/禁止処理 ---
    const handleWeaponClick = (weaponId: number) => {
        if (!socket || !gameState || myTeam === 'observer' || loadingWeaponId !== null) {
            if (loadingWeaponId !== null) console.log(`Action prevented: loadingWeaponId is ${loadingWeaponId}`);
            return;
        }
        // ★ weaponId が RANDOM_CHOICE_ID (-1) かどうかでランダム選択を判定 ★★★★★ 変更点 ★★★★★
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
        // ★ myTeam が Team 型 ('alpha' or 'bravo') であることを確認してからアクセス
        if (isBanningPhase && (myTeam === 'alpha' || myTeam === 'bravo')) {
            // ★ banPhaseState を直接使用
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

    // --- ゲーム開始処理 (useCallbackで最適化) ---
    const handleStart = useCallback(() => {
        if (socket && gameState && gameState.phase === 'waiting') {
            console.log(`[WeaponGrid ${roomId}] Emitting start game`);
            socket.emit('start game');
        }
    }, [socket, gameState, roomId]);

    // --- リセット処理 (useCallbackで最適化) ---
    const handleReset = useCallback(() => {
        if (socket && confirm('ゲーム状態をリセットしてもよろしいですか？（全員が待機状態に戻ります）')) {
            console.log(`[WeaponGrid ${roomId}] Emitting reset room`);
            socket.emit('reset room');
        }
    }, [socket, roomId]);

    // --- 表示用データの準備 (useMemoで最適化) ---
    const { alphaPicks, bravoPicks, alphaBans, bravoBans, /* alphaPicksCount, bravoPicksCount, alphaBansCount, bravoBansCount */} = useMemo(() => {
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

    // --- グリッドアイテムレンダリング関数 ---
    const renderWeaponItem = (weapon: DisplayWeapon) => {
        const isSelectedByAlpha = weapon.selectedBy === 'alpha';
        const isSelectedByBravo = weapon.selectedBy === 'bravo';
        const isBannedByAlpha = weapon.bannedBy.includes('alpha');
        const isBannedByBravo = weapon.bannedBy.includes('bravo');
        const isBanned = isBannedByAlpha || isBannedByBravo;
        const isMyTeamPlayer = myTeam === 'alpha' || myTeam === 'bravo';
        const isRandomChoice = weapon.id === RANDOM_CHOICE_ID;

        // --- クリック可否判定 ---
        let canClick = false;
        const isMyTurn = gameState.currentTurn === myTeam;

        if (isRandomChoice) {
            if (gameState.phase === 'pick' && isMyTurn && isMyTeamPlayer) {
                canClick = true;
            }
        }

        if (weapon.id === RANDOM_CHOICE_ID) {
            if (gameState.phase === 'pick' && isMyTurn && (myTeam === 'alpha' || myTeam === 'bravo')) {
                canClick = true;
            }
        }

        if (gameState.phase === 'pick' && isMyTeamPlayer && isMyTurn && !weapon.selectedBy && !isBanned) {
            canClick = true;
        } else if (gameState.phase === 'ban' && isMyTeamPlayer) {
            if (myTeam === 'alpha' || myTeam === 'bravo') {
                // ★ banPhaseState を直接使用
                const currentBans = gameState.banPhaseState?.bans[myTeam] ?? 0;
                const maxBans = gameState.banPhaseState?.maxBansPerTeam ?? MAX_BANS_PER_TEAM;
                if (!weapon.selectedBy && !weapon.bannedBy.includes(myTeam) && currentBans < maxBans) {
                    canClick = true;
                }
            }
        }
        const isDisabled = weapon.isLoading || !canClick;

        // --- スタイル決定 ---
        let bgColor = 'bg-white', borderColor = 'border-gray-200', imageOpacity = 'opacity-100', overallOpacity = 'opacity-100', ring = '', hoverEffect = 'hover:bg-blue-50 hover:border-blue-300', banMark = null, cursor = 'cursor-pointer';

        // ★ ランダム選択アイテムの特別スタイル (任意)
        if (isRandomChoice) {
            bgColor = 'bg-purple-50'; // 例: 紫系の背景
            borderColor = 'border-purple-300';
            if (!isDisabled) hoverEffect = 'hover:bg-purple-100 hover:border-purple-400';
        }

        // 1. 選択済みのスタイル (最優先)
        if (isSelectedByAlpha) { bgColor = 'bg-blue-100'; borderColor = 'border-blue-400'; ring = 'ring-2 ring-offset-1 ring-blue-500'; hoverEffect = ''; cursor = 'cursor-not-allowed'; }
        else if (isSelectedByBravo) { bgColor = 'bg-red-100'; borderColor = 'border-red-400'; ring = 'ring-2 ring-offset-1 ring-red-500'; hoverEffect = ''; cursor = 'cursor-not-allowed'; }

        // 2. BANフェーズ中の自チームBANのスタイル
        else if (gameState.phase === 'ban' && isMyTeamPlayer && weapon.bannedBy.includes(myTeam)) {
            // isMyTeamPlayer で myTeam !== 'observer' はチェック済み
            bgColor = 'bg-yellow-100'; // 例: BAN中は黄色背景
            borderColor = 'border-yellow-400';
            imageOpacity = 'opacity-50'; // 少し薄く
            overallOpacity = 'opacity-90';
            hoverEffect = '';
            cursor = 'cursor-not-allowed'; // 自分がBANしたらもうクリックできない
            const banColor = myTeam === 'alpha' ? 'text-blue-600' : 'text-red-600';
            banMark = (<div className={`absolute inset-0 flex items-center justify-center rounded-lg pointer-events-none`}><svg className={`w-10 h-10 ${banColor} opacity-75`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg></div>);
        }
        // 3. PICKフェーズ以降 または 観戦者 が見る BAN済みスタイル (公開BAN)
        //    (BANフェーズ中の相手チームBANも観戦者はここに入る)
        else if (isBanned && (gameState.phase === 'pick' || gameState.phase === 'pick_complete' || myTeam === 'observer')) {
            bgColor = 'bg-gray-200'; // 公開BANはグレー背景
            borderColor = 'border-gray-300';
            imageOpacity = 'opacity-40';
            overallOpacity = 'opacity-70';
            hoverEffect = '';
            cursor = 'cursor-not-allowed';
            const banColorConst = isBannedByAlpha ? 'text-blue-600' : isBannedByBravo ? 'text-red-600' : 'text-gray-700';
            banMark = (<div className={`absolute inset-0 flex items-center justify-center rounded-lg pointer-events-none`}><svg className={`w-10 h-10 ${banColorConst} opacity-75`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg></div>);
        }
        // 4. その他のクリック不可状態
        else if (isDisabled) { // ★ isDisabled の条件に weapon.isLoading を含める
            cursor = 'cursor-not-allowed'; hoverEffect = '';
            if (weapon.isLoading) { // ★ ローディング中のスタイル
                overallOpacity = 'opacity-50';
            } else if (myTeam === 'observer' || gameState.phase === 'waiting' || gameState.phase === 'pick_complete') {
                if (!isRandomChoice) bgColor = 'bg-gray-50'; overallOpacity = 'opacity-70';
            } else { overallOpacity = 'opacity-75'; } // 自分のターンではないなど
        }

        // --- グリッドアイテム JSX ---
        return (
            <div
                key={`weapon-grid-${weapon.id}`} // key は数値でも文字列でもOK
                className={`relative p-2 rounded-lg border transition-all duration-150 ${bgColor} ${borderColor} ${overallOpacity} ${ring} ${cursor} ${hoverEffect}`}
                onClick={() => !isDisabled && handleWeaponClick(weapon.id)} // weapon.id は数値 (-1 含む)
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
                {weapon.isLoading && (
                    <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-lg">
                        <svg className="animate-spin h-8 w-8 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                )}
                {/* ターン表示 */}
                {!isRandomChoice && isMyTeamPlayer && !isDisabled && gameState.phase === 'pick' && (<div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs bg-green-200 text-green-800 rounded font-semibold animate-pulse">Pick!</div> )}
                {!isRandomChoice && isMyTeamPlayer && !isDisabled && gameState.phase === 'ban' && (<div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded font-semibold animate-pulse">Ban!</div> )}
            </div>
        );
    }

    // --- JSX レンダリング本体 ---
    return (
        <div className="container mx-auto p-4 space-y-6">
            {/* ================== ヘッダーエリア ================== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-gray-100 rounded-lg shadow mb-6">
                {/* 左ブロック: ルーム情報 */}
                <div className="flex flex-col items-start">
                    <div className="font-semibold text-lg text-gray-800">ルーム: {roomId}</div>
                    {/* 参加者数はステータス表示部に移動 */}
                </div>

                {/* 中央ブロック: ゲームステータス & ステージ/ルール */}
                <div className="text-center space-y-1">
                    <p className="text-lg font-semibold text-gray-800">
                        フェーズ: <span className="font-bold">{gameState.phase}</span>
                        <span className="text-sm text-gray-600 ml-2">({gameState.userCount}人参加)</span>
                    </p>
                    {(gameState.phase === 'pick' || gameState.phase === 'pick_complete') && gameState.currentPickTurnNumber != null && (
                        <p className="text-sm text-gray-700">Pickターン: {gameState.currentPickTurnNumber} / {TOTAL_PICK_TURNS}</p>
                    )}
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
                         <div className="flex flex-col items-center text-xs border rounded p-1 bg-white shadow-sm w-[100px]"> {/* ★ 横幅固定 */}
                             <span className="font-medium text-gray-600 mb-0.5">ステージ</span>
                             {/* ★ 高さ確保用のコンテナ */}
                             <div className="flex items-center justify-center w-full min-h-[68px] mb-0.5"> {/* 画像(h45)+テキスト分の高さを確保 */}
                                 {selectedStage ? (
                                     <div className="flex flex-col items-center">
                                         <Image src={selectedStage.imageUrl} alt={selectedStage.name} width={80} height={45} className="object-cover border" />
                                         <span className="font-semibold text-gray-800 mt-0.5">{selectedStage.name}</span>
                                     </div>
                                 ) : (<span className="text-gray-500 text-xs">未選択</span>)}
                             </div>
                             <button
                                 onClick={() => setIsStageModalOpen(true)}
                                 disabled={gameState.phase !== 'waiting'}
                                 className={`mt-1 px-2 py-0.5 text-xs rounded ${gameState.phase === 'waiting' ? 'bg-gray-300 hover:bg-gray-400' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                             >変更</button>
                         </div>
                         {/* ルール */}
                         <div className="flex flex-col items-center text-xs border rounded p-1 bg-white shadow-sm w-[100px]"> {/* ★ 横幅固定 */}
                              <span className="font-medium text-gray-600 mb-0.5">ルール</span>
                              {/* ★ 高さ確保用のコンテナ */}
                              <div className="flex items-center justify-center w-full min-h-[68px] mb-0.5"> {/* 画像(h45)+テキスト分の高さを確保 */}
                                  {selectedRule ? (
                                     <div className="flex flex-col items-center">
                                          <Image src={selectedRule.imageUrl} alt={selectedRule.name} width={80} height={45} className="object-cover border" />
                                          <span className="font-semibold text-gray-800 mt-0.5">{selectedRule.name}</span>
                                      </div>
                                  ) : (<span className="text-gray-500 text-xs">未選択</span>)}
                              </div>
                              <button
                                  onClick={() => setIsRuleModalOpen(true)}
                                  disabled={gameState.phase !== 'waiting'}
                                  className={`mt-1 px-2 py-0.5 text-xs rounded ${gameState.phase === 'waiting' ? 'bg-gray-300 hover:bg-gray-400' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                              >変更</button>
                          </div>
                    </div>
                </div>

                {/* 右ブロック: 操作ボタン */}
                <div className="flex flex-col items-end gap-2">
                     <button
                         onClick={handleLeaveButtonClick}
                         className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm w-full md:w-auto"
                     >
                         ルーム退出
                     </button>
                     {gameState.phase === 'waiting' && (
                         <button onClick={handleStart} disabled={!socket || myTeam === 'observer'} className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 text-sm w-full md:w-auto">ゲーム開始</button>
                     )}
                     {(gameState.phase !== 'waiting') && (
                         <button onClick={handleReset} disabled={!socket || myTeam === 'observer'} className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 text-sm w-full md:w-auto">リセット</button>
                     )}
                </div>
            </div>

            {/* ================== メインエリア (3カラム) ================== */}
            {/* lg以上で3カラム、それ未満は1カラム */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                {/* ----- 左カラム: アルファチーム ----- */}
                <div className="lg:col-span-3 border rounded-lg p-3 bg-blue-50 shadow-sm space-y-3">
                    {/* チーム選択ボタン */}
                    <button
                        onClick={() => handleTeamSelect('alpha')}
                        disabled={gameState.phase !== 'waiting' || myTeam === 'alpha'}
                        className={`w-full px-3 py-1.5 rounded-md text-sm transition-colors font-semibold ${
                            myTeam === 'alpha' ? 'bg-blue-600 text-white ring-2 ring-blue-300' : 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-100'
                        } ${gameState.phase !== 'waiting' ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        アルファに参加 {myTeam === 'alpha' ? '(選択中)' : ''}
                    </button>
                    {/* メンバーリスト */}
                    <div>
                        <h4 className="font-semibold text-blue-800 mb-1">メンバー ({alphaTeamUsers.length})</h4>
                        <ul className="space-y-0.5 text-sm">
                            {alphaTeamUsers.map(user => (
                                <li key={user.id} className={`flex items-center ${user.name === userName ? 'font-bold' : ''} text-blue-700`}> {/* 文字色変更 */}
                                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1.5"></span>
                                    {user.name}
                                </li>
                            ))}
                            {alphaTeamUsers.length === 0 && <li className="text-gray-500 italic text-xs">プレイヤーがいません</li>}
                        </ul>
                    </div>
                    {/* PICK 表示 */}
                    <div className="border-t pt-2">
                        <h4 className="text-md font-medium mb-1 text-blue-700">PICK ({gameState.pickPhaseState?.picks.alpha ?? 0}/{MAX_PICKS_PER_TEAM})</h4>
                        {/* ★ 高さ確保 min-h-[60px] を維持 */}
                        <div className="flex flex-wrap gap-1 min-h-[60px] items-center"> {/* ★ items-center 追加 */}
                            {alphaPicks.length > 0 ? alphaPicks.map((weapon) => (
                                <div key={`alpha-pick-${weapon.id}`} className="relative border border-blue-300 rounded p-1 bg-white" title={`PICK: ${weapon.name}`}>
                                    <Image src={weapon.imageUrl} alt={weapon.name} width={50} height={50} />
                                </div>
                            )) : <p className="text-xs text-gray-500 w-full text-center">{gameState.phase === 'waiting' ? '待機中' : '-'}</p>} {/* ★ 中央揃え */}
                        </div>
                    </div>
                    {/* BAN 表示 */}
                    <div className="border-t pt-2">
                        <h4 className="text-md font-medium mb-1 text-blue-700">BAN ({gameState.banPhaseState?.bans.alpha ?? 0}/{MAX_BANS_PER_TEAM})</h4>
                        {/* ★ 高さ確保 min-h-[60px] を維持 */}
                        <div className="flex flex-wrap gap-1 min-h-[60px] items-center"> {/* ★ items-center 追加 */}
                            {alphaBans.length > 0 ? alphaBans.map((weapon) => {
                                if (weapon.id === RANDOM_CHOICE_ID) return null; // ランダム選択肢(-1)は表示しない
                                const isSelfOrObserver = myTeam === 'alpha' || myTeam === 'observer';
                                const shouldShowBan = gameState.phase === 'pick' || gameState.phase === 'pick_complete' || (gameState.phase === 'ban' && isSelfOrObserver);
                                if (!shouldShowBan) return null; // 表示すべきでない場合は null を返す
                                return (
                                    <div key={`alpha-ban-${weapon.id}`} className="relative border border-gray-400 rounded p-1 bg-gray-200" title={`BAN: ${weapon.name}`}>
                                        <Image src={weapon.imageUrl} alt={weapon.name} width={50} height={50} className="opacity-70" /> {/* 少し小さく */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                        </div>
                                    </div>
                                );
                            // BAN表示の map 処理が終わった後に、表示すべき BAN アイコンが1つもなかった場合にテキストを表示
                            }) : null} {/* map が実行されなかった場合は何もしない */}
                            {/* 表示されるべき BAN アイコンが1つもない (alphaBans 配列内の表示すべき要素が0) 場合にテキストを表示 */}
                            {!alphaBans.some(weapon => {
                                if (weapon.id === RANDOM_CHOICE_ID) return false; // ランダムはカウントしない
                                const isSelfOrObserver = myTeam === 'alpha' || myTeam === 'observer';
                                return gameState.phase === 'pick' || gameState.phase === 'pick_complete' || (gameState.phase === 'ban' && isSelfOrObserver);
                            }) && <p className="text-xs text-gray-500 w-full text-center">{gameState.phase === 'waiting' ? '待機中' : '-'}</p>} {/* ★ 条件付き表示調整 */}
                            {/* 相手チーム(Bravo)で、BANフェーズ中で、かつアルファチームがBANしている場合に表示 */}
                            {gameState.phase === 'ban' && myTeam === 'bravo' && (gameState.banPhaseState?.bans.alpha ?? 0) > 0 && <p className="text-xs text-gray-400 italic w-full text-center mt-1">（相手のBANはPickフェーズで公開）</p>}
                        </div>
                    </div>
                </div>

                {/* ----- 中央カラム: 武器グリッド ----- */}
                <div className="lg:col-span-6 lg:max-h-[calc(100vh-250px)] lg:overflow-y-auto">
                    {/* ★★★★★ 変更点: フィルター UI ★★★★★ */}
                    <div className="mb-4 p-3 bg-gray-50 rounded border">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-gray-700">武器フィルター:</span>
                            <div className="space-x-2">
                                <button
                                    onClick={handleClearFilters}
                                    className="text-xs px-2 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50"
                                    disabled={selectedAttributes.length === 0}
                                >
                                    すべて表示
                                </button>
                                <button
                                     onClick={handleSelectAllFilters}
                                     className="text-xs px-2 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50"
                                     disabled={selectedAttributes.length === WEAPON_ATTRIBUTES.length}
                                >
                                     すべて選択
                                 </button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {WEAPON_ATTRIBUTES.map(attr => {
                                const isSelected = selectedAttributes.includes(attr);
                                return (
                                    <button
                                        key={attr}
                                        onClick={() => handleAttributeFilterChange(attr)}
                                        className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                                            isSelected
                                                ? 'bg-blue-500 text-white border-blue-600 font-semibold'
                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                        }`}
                                    >
                                        {attr}
                                    </button>
                                );
                            })}
                        </div>
                    </div>


                    {/* Weapon Grid 本体 */}
                    {(gameState.phase === 'ban' || gameState.phase === 'pick') && (
                        <div className="overflow-x-auto">
                            <h3 className="text-lg font-semibold mb-3 text-gray-800">
                                {gameState.phase === 'ban' ? 'BANする武器を選択してください' : 'PICKする武器を選んでください'}
                                {myTeam !== 'observer' && ` (${gameState.phase === 'ban' ? `${gameState.banPhaseState?.bans[myTeam] ?? 0}/${MAX_BANS_PER_TEAM}` : `${gameState.pickPhaseState?.picks[myTeam] ?? 0}/${MAX_PICKS_PER_TEAM}`})`}
                            </h3>
                            {displayWeapons.length > 0 ? (
                                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6 gap-2"> {/* 列数を調整 */}
                                    {displayWeapons.map(renderWeaponItem)}
                                </div>
                            ) : (<p className="text-center text-gray-500 py-4">武器データが読み込まれていません。</p>)}
                        </div>
                    )}
                     {gameState.phase === 'pick_complete' && (
                        <div className="text-center py-10">
                            <h3 className="text-2xl font-bold text-green-600">ピック完了！</h3>
                        </div>
                    )}
                    {gameState.phase === 'waiting' && (
                        <div className="text-center py-10">
                            <h3 className="text-xl font-semibold text-gray-700">ゲーム開始待機中...</h3>
                            <p className="text-gray-500">チームを選択し、ヘッダーの「ゲーム開始」ボタンを押してください。</p>
                        </div>
                    )}
                </div>

                {/* ----- 右カラム: ブラボーチーム ----- */}
                <div className="lg:col-span-3 border rounded-lg p-3 bg-red-50 shadow-sm space-y-3">
                     {/* チーム選択ボタン */}
                     <button
                         onClick={() => handleTeamSelect('bravo')}
                         disabled={gameState.phase !== 'waiting' || myTeam === 'bravo'}
                         className={`w-full px-3 py-1.5 rounded-md text-sm transition-colors font-semibold ${
                            myTeam === 'bravo' ? 'bg-red-600 text-white ring-2 ring-red-300' : 'bg-white border border-red-300 text-red-700 hover:bg-red-100'
                         } ${gameState.phase !== 'waiting' ? 'opacity-60 cursor-not-allowed' : ''}`}
                     >
                         ブラボーに参加 {myTeam === 'bravo' ? '(選択中)' : ''}
                     </button>
                     {/* メンバーリスト */}
                     <div>
                         <h4 className="font-semibold text-red-800 mb-1">メンバー ({bravoTeamUsers.length})</h4>
                         <ul className="space-y-0.5 text-sm">
                             {bravoTeamUsers.map(user => (
                                 <li key={user.id} className={`flex items-center ${user.name === userName ? 'font-bold' : ''} text-red-700`}> {/* 文字色変更 */}
                                     <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1.5"></span>
                                     {user.name}
                                 </li>
                             ))}
                             {bravoTeamUsers.length === 0 && <li className="text-gray-500 italic text-xs">プレイヤーがいません</li>}
                         </ul>
                     </div>
                      {/* PICK 表示 */}
                      <div className="border-t pt-2">
                         <h4 className="text-md font-medium mb-1 text-red-700">PICK ({gameState.pickPhaseState?.picks.bravo ?? 0}/{MAX_PICKS_PER_TEAM})</h4>
                         {/* ★ 高さ確保 min-h-[60px] を維持 */}
                         <div className="flex flex-wrap gap-1 min-h-[60px] items-center"> {/* ★ items-center 追加 */}
                             {bravoPicks.length > 0 ? bravoPicks.map((weapon) => (
                                 <div key={`bravo-pick-${weapon.id}`} className="relative border border-red-300 rounded p-1 bg-white" title={`PICK: ${weapon.name}`}>
                                     <Image src={weapon.imageUrl} alt={weapon.name} width={50} height={50} />
                                 </div>
                             )) : <p className="text-xs text-gray-500 w-full text-center">{gameState.phase === 'waiting' ? '待機中' : '-'}</p>} {/* ★ 中央揃え */}
                         </div>
                     </div>
                     {/* BAN 表示 */}
                     <div className="border-t pt-2">
                        <h4 className="text-md font-medium mb-1 text-red-700">BAN ({gameState.banPhaseState?.bans.bravo ?? 0}/{MAX_BANS_PER_TEAM})</h4>
                        {/* ★ 高さ確保 min-h-[60px] を維持 */}
                        <div className="flex flex-wrap gap-1 min-h-[60px] items-center"> {/* ★ items-center 追加 */}
                            {bravoBans.length > 0 ? bravoBans.map((weapon) => {
                                if (weapon.id === RANDOM_CHOICE_ID) return null; // ランダム選択肢(-1)は表示しない
                                const isSelfOrObserver = myTeam === 'bravo' || myTeam === 'observer';
                                const shouldShowBan = gameState.phase === 'pick' || gameState.phase === 'pick_complete' || (gameState.phase === 'ban' && isSelfOrObserver);
                                if (!shouldShowBan) return null; // 表示すべきでない場合は null を返す
                                return (
                                    <div key={`bravo-ban-${weapon.id}`} className="relative border border-gray-400 rounded p-1 bg-gray-200" title={`BAN: ${weapon.name}`}>
                                        <Image src={weapon.imageUrl} alt={weapon.name} width={50} height={50} className="opacity-70" /> {/* 少し小さく */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                        </div>
                                    </div>
                                );
                            // BAN表示の map 処理が終わった後に、表示すべき BAN アイコンが1つもなかった場合にテキストを表示
                            }) : null} {/* map が実行されなかった場合は何もしない */}
                             {/* 表示されるべき BAN アイコンが1つもない (bravoBans 配列内の表示すべき要素が0) 場合にテキストを表示 */}
                            {!bravoBans.some(weapon => {
                                if (weapon.id === RANDOM_CHOICE_ID) return false; // ランダムはカウントしない
                                const isSelfOrObserver = myTeam === 'bravo' || myTeam === 'observer';
                                return gameState.phase === 'pick' || gameState.phase === 'pick_complete' || (gameState.phase === 'ban' && isSelfOrObserver);
                            }) && <p className="text-xs text-gray-500 w-full text-center">{gameState.phase === 'waiting' ? '待機中' : '-'}</p>} {/* ★ 条件付き表示調整 */}
                            {/* 相手チーム(Alpha)で、BANフェーズ中で、かつブラボーチームがBANしている場合に表示 */}
                            {gameState.phase === 'ban' && myTeam === 'alpha' && (gameState.banPhaseState?.bans.bravo ?? 0) > 0 && <p className="text-xs text-gray-400 italic w-full text-center mt-1">（相手のBANはPickフェーズで公開）</p>}
                        </div>
                    </div>
                </div>
            </div>

             {/* ================== フッターエリア: 観戦者リスト ================== */}
             <div className="border rounded-lg p-3 bg-gray-50 shadow-sm mt-6">
                 <div className="flex justify-between items-center mb-2">
                     <h4 className="font-semibold text-gray-800">観戦者 ({observers.length})</h4>
                      <button
                          onClick={() => handleTeamSelect('observer')}
                          disabled={gameState.phase !== 'waiting' || myTeam === 'observer'}
                          className={`px-3 py-1 rounded-md text-xs transition-colors font-semibold ${
                             myTeam === 'observer' ? 'bg-gray-600 text-white ring-2 ring-gray-300' : 'bg-white border border-gray-400 text-gray-700 hover:bg-gray-100'
                          } ${gameState.phase !== 'waiting' ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                          観戦に参加 {myTeam === 'observer' ? '(選択中)' : ''}
                      </button>
                 </div>
                 <ul className="space-y-0.5 text-sm">
                     {observers.map(user => (
                         <li key={user.id} className={`flex items-center ${user.name === userName ? 'font-bold' : ''} text-gray-700`}> {/* 文字色変更 */}
                             <span className="inline-block w-2 h-2 bg-gray-500 rounded-full mr-1.5"></span>
                             {user.name}
                         </li>
                     ))}
                      {observers.length === 0 && <li className="text-gray-500 italic text-xs">観戦者はいません</li>}
                 </ul>
            </div>

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