'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import type { Socket } from 'socket.io-client';
import type { GameState, RoomUser, RoomWeaponState, MasterWeapon, Team, Stage, Rule } from '../../../common/types/index';
import {
    MAX_BANS_PER_TEAM, STAGES_DATA, RULES_DATA, WEAPON_ATTRIBUTES, BAN_PHASE_DURATION, PICK_PHASE_TURN_DURATION,
    RANDOM_WEAPON_ID, // 武器用
    RANDOM_WEAPON_CHOICE_ITEM,
    RANDOM_STAGE_CHOICE, RANDOM_RULE_CHOICE // ステージ・ルール用
} from '../../../common/types/index';
import toast from 'react-hot-toast';

import GameHeader from './GameHeader';
import TeamPanel from './TeamPanel';
import ObserverPanel from './ObserverPanel';
import WeaponFilter from './WeaponFilter';
import WeaponGridDisplay from './WeaponGridDisplay';
import MembersDisplayModal from './MembersDisplayModal';

interface WeaponGridProps {
    socket: Socket;
    roomId: string;
    masterWeapons: MasterWeapon[];
    userName: string;
    myActualSocketId: string;
    onLeaveRoom: () => void;
    onGameStateUpdate: (gameState: GameState | null) => void;
}

export interface DisplayWeapon extends MasterWeapon {
    selectedBy: Team | null;
    bannedBy: Team[];
    imageUrl: string;
    isLoading: boolean;
}

export type WeaponAttribute = typeof WEAPON_ATTRIBUTES[number];

export type FilterType = 'attribute' | 'subWeapon' | 'specialWeapon';

export default function WeaponGrid({ socket, roomId, masterWeapons, userName, myActualSocketId, onLeaveRoom, onGameStateUpdate }: WeaponGridProps) {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [weaponStates, setWeaponStates] = useState<Record<number, RoomWeaponState>>({});
    const [myTeam, setMyTeam] = useState<Team | 'observer'>('observer');
    const [loadingWeaponId, setLoadingWeaponId] = useState<number | null>(null);
    const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
    const [selectedStage, setSelectedStage] = useState<Stage | typeof RANDOM_STAGE_CHOICE | null>(RANDOM_STAGE_CHOICE);
    const [selectedRule, setSelectedRule] = useState<Rule | typeof RANDOM_RULE_CHOICE | null>(RANDOM_RULE_CHOICE);
    const [isStageModalOpen, setIsStageModalOpen] = useState(false);
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [selectedAttributes, setSelectedAttributes] = useState<WeaponAttribute[]>([]);
    const [selectedSubWeapons, setSelectedSubWeapons] = useState<string[]>([]);
    const [selectedSpecialWeapons, setSelectedSpecialWeapons] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

    const amIHost = useMemo(() => { // ★ useMemo で amIHost を計算
        return gameState !== null && gameState.hostId !== null && gameState.hostId === myActualSocketId;
    }, [gameState?.hostId, myActualSocketId]); // ★ 修正

    // ★ いずれかのランダム設定モーダルが開いているか
    const isAnyRandomSettingsModalOpen = useMemo(() => {
        return isStageModalOpen || isRuleModalOpen;
    }, [isStageModalOpen, isRuleModalOpen]);

    const timerDuration = useMemo(() => {
        if (!gameState) return 0;
        if (gameState.phase === 'ban') return BAN_PHASE_DURATION;
        if (gameState.phase === 'pick') return PICK_PHASE_TURN_DURATION;
        return 0;
    }, [gameState?.phase]);

    // myBanCount, myPickCount の useMemo 依存配列修正
    const myBanCount = useMemo(() => {
        if (!gameState || myTeam === 'observer') return 0;
        return gameState.banPhaseState?.bans[myTeam] ?? 0;
    }, [gameState?.banPhaseState?.bans, myTeam]);
    const myPickCount = useMemo(() => {
        if (!gameState || myTeam === 'observer') return 0;
        return gameState.pickPhaseState?.picks[myTeam] ?? 0;
    }, [gameState?.pickPhaseState?.picks, myTeam]);

    const masterWeaponsMap = useMemo(() => {
        // console.log('[useMemo] Calculating masterWeaponsMap'); // 計算確認ログ
        const map = new Map<number, MasterWeapon>();
        masterWeapons.forEach(mw => map.set(mw.id, mw));
        // TeamPanel ではランダム不要なので追加しない
        return map;
    }, [masterWeapons]);

    // ★ BAN/PICKされた武器のIDを gameState から順序通りに取得
    const orderedAlphaPickedIds = useMemo(() => gameState?.pickedWeaponsOrder?.alpha || [], [gameState?.pickedWeaponsOrder?.alpha]);
    const orderedBravoPickedIds = useMemo(() => gameState?.pickedWeaponsOrder?.bravo || [], [gameState?.pickedWeaponsOrder?.bravo]);
    const orderedAlphaBannedIds = useMemo(() => gameState?.bannedWeaponsOrder?.alpha || [], [gameState?.bannedWeaponsOrder?.alpha]);
    const orderedBravoBannedIds = useMemo(() => gameState?.bannedWeaponsOrder?.bravo || [], [gameState?.bannedWeaponsOrder?.bravo]);

    const displayWeaponIds = useMemo<number[]>(() => {
        let filteredWeapons = [...masterWeapons];

        // 属性フィルター
        if (selectedAttributes.length > 0) {
            filteredWeapons = filteredWeapons.filter(weapon =>
                selectedAttributes.includes(weapon.attribute as WeaponAttribute)
            );
        }
        // サブウェポンフィルター
        if (selectedSubWeapons.length > 0) {
            filteredWeapons = filteredWeapons.filter(weapon =>
                selectedSubWeapons.includes(weapon.subWeapon) // 表示名で比較
            );
        }
        // スペシャルウェポンフィルター
        if (selectedSpecialWeapons.length > 0) {
            filteredWeapons = filteredWeapons.filter(weapon =>
                selectedSpecialWeapons.includes(weapon.specialWeapon) // 表示名で比較
            );
        }

        const ids = filteredWeapons.map(w => w.id);

        if (gameState && gameState.phase === 'pick' && gameState.currentTurn === myTeam && (myTeam === 'alpha' || myTeam === 'bravo')) {
            ids.unshift(RANDOM_WEAPON_ID);
        }
        return ids;

    }, [masterWeapons, selectedAttributes, selectedSubWeapons, selectedSpecialWeapons, myTeam, gameState?.phase, gameState?.currentTurn]);

    const randomStagePoolSet = useMemo(() => {
        // gameState が null か、randomStagePool がなければ空の Set を返す
        if (!gameState?.randomStagePool) {
            return new Set<number>();
        }
        return new Set(gameState.randomStagePool);
    }, [gameState?.randomStagePool]); // gameState.randomStagePool の変化を監視

    const randomRulePoolSet = useMemo(() => {
        if (!gameState?.randomRulePool) {
            return new Set<number>();
        }
        return new Set(gameState.randomRulePool);
    }, [gameState?.randomRulePool]);

    // 参加者リストをチームごとに分類
    const alphaTeamUsers = useMemo(() => roomUsers.filter(u => u.team === 'alpha'), [roomUsers]);
    const bravoTeamUsers = useMemo(() => roomUsers.filter(u => u.team === 'bravo'), [roomUsers]);
    const observers = useMemo(() => roomUsers.filter(u => u.team === 'observer' || !u.team), [roomUsers]); // チーム未定も観戦扱い

    // --- エラーハンドラー ---
    const handleError = useCallback((message: string) => {
        // console.error('Handled Error:', message);
        toast.error(message);
    }, []);

    const handleFilterChange = useCallback((type: FilterType, value: string) => {
        switch (type) {
            case 'attribute':
                setSelectedAttributes(prev =>
                    prev.includes(value as WeaponAttribute) ? prev.filter(a => a !== value) : [...prev, value as WeaponAttribute]
                );
                break;
            case 'subWeapon':
                setSelectedSubWeapons(prev =>
                    prev.includes(value) ? prev.filter(a => a !== value) : [...prev, value]
                );
                break;
            case 'specialWeapon':
                setSelectedSpecialWeapons(prev =>
                    prev.includes(value) ? prev.filter(a => a !== value) : [...prev, value]
                );
                break;
        }
    }, []);

    const handleClearFilterSection = useCallback((type: FilterType) => {
        switch (type) {
            case 'attribute': setSelectedAttributes([]); break;
            case 'subWeapon': setSelectedSubWeapons([]); break;
            case 'specialWeapon': setSelectedSpecialWeapons([]); break;
        }
    }, []);

    // --- WebSocketイベントリスナー設定 ---
    useEffect(() => {
        if (!socket) return;
        // console.log(`[WeaponGrid ${roomId}] Setting up listeners for socket: ${socket.id}, User: ${userName}`);

        // --- リスナー定義 ---
        const handleInitialState = (initialGameState: GameState) => {
            if (initialGameState.roomId === roomId) {
                // console.log(`[WeaponGrid ${roomId}] Received initial state:`, initialGameState);

                const newStageId = initialGameState.selectedStageId;
                const newRuleId = initialGameState.selectedRuleId;
                if (newStageId === 'random') { setSelectedStage(RANDOM_STAGE_CHOICE); }
                else if (newStageId !== null) { setSelectedStage(STAGES_DATA.find(s => s.id === newStageId) || null); }
                else { setSelectedStage(null); }
                if (newRuleId === 'random') { setSelectedRule(RANDOM_RULE_CHOICE); }
                else if (newRuleId !== null) { setSelectedRule(RULES_DATA.find(r => r.id === newRuleId) || null); }
                else { setSelectedRule(null); }

                setGameState(initialGameState);
                if (initialGameState.phase === 'waiting') {
                    // console.log(`[WeaponGrid ${roomId}] Initial state is 'waiting', resetting weaponStates and loadingWeaponId.`);
                    setWeaponStates({});
                    setLoadingWeaponId(null);
                }
            } else {
                // console.warn(`[WeaponGrid ${roomId}] Received initial state for other room: ${initialGameState.roomId}`);
            }
        };

        const handleInitialWeapons = (initialWeaponStates: RoomWeaponState[]) => {
            // console.log(`[WeaponGrid ${roomId}] Received initial weapons state:`, initialWeaponStates);
            const statesMap: Record<number, RoomWeaponState> = {};
            initialWeaponStates.forEach(state => {
                statesMap[state.id] = state;
            });
            setWeaponStates(statesMap);
            // console.log(`[WeaponGrid ${roomId}] Weapons state reconstructed.`);
        };

        const handleUpdateGameState = (updatedState: GameState) => {
            setGameState(prevGameState => {
                if (updatedState.roomId === roomId) {
                    // console.log(`[WeaponGrid ${roomId}] Received game state update:`, updatedState);
                    const oldPhase = prevGameState?.phase; // ★ 以前のフェーズを取得

                    const newStageId = updatedState.selectedStageId;
                    const newRuleId = updatedState.selectedRuleId;
                    if (newStageId === 'random') {
                        setSelectedStage(RANDOM_STAGE_CHOICE);
                    } else if (newStageId !== null) {
                        const foundStage = STAGES_DATA.find(s => s.id === newStageId);
                        setSelectedStage(foundStage || null);
                    } else {
                        setSelectedStage(null);
                    }
                    if (newRuleId === 'random') {
                        setSelectedRule(RANDOM_RULE_CHOICE);
                    } else if (newRuleId !== null) {
                        const foundRule = RULES_DATA.find(r => r.id === newRuleId);
                        setSelectedRule(foundRule || null);
                    } else {
                        setSelectedRule(null);
                    }

                    if (updatedState.phase === 'waiting' && oldPhase !== 'waiting') {
                        console.log(`[WeaponGrid ${roomId}] Phase changed from ${oldPhase} to 'waiting', resetting weaponStates and loadingWeaponId.`);
                        setWeaponStates({});
                        setLoadingWeaponId(null);
                    } else if (updatedState.phase === 'waiting' && oldPhase === 'waiting' && Object.keys(weaponStatesRef.current).length > 0) {
                        // waiting のままだが、何らかの理由で weaponStates が残っている場合もクリア (念のため)
                        // console.log(`[WeaponGrid ${roomId}] Phase is 'waiting' and weaponStates were not empty, resetting.`);
                        setWeaponStates({});
                        setLoadingWeaponId(null);
                    }
                    return updatedState; // ★ 新しいゲーム状態を返す
                }
                return prevGameState; // ルームIDが一致しない場合は変更しない
            });
        };
        const handleUpdateWeapon = (updatedWeaponData: RoomWeaponState) => {
            setWeaponStates((prevStates) => ({ ...prevStates, [updatedWeaponData.id]: updatedWeaponData }));
            // console.log(`[DEBUG handleUpdateWeapon] Current loadingWeaponId: ${loadingWeaponId}, Updated weaponId: ${updatedWeaponData.id}`);
            if (loadingWeaponId === updatedWeaponData.id || loadingWeaponId === RANDOM_WEAPON_ID) {
                // console.log(`[DEBUG handleUpdateWeapon] Clearing loadingWeaponId (was: ${loadingWeaponId}) because updated weaponId is ${updatedWeaponData.id} or it was random.`);
                setLoadingWeaponId(null);
            } else {
                // console.log(`[DEBUG handleUpdateWeapon] loadingWeaponId (${loadingWeaponId}) does not match updated weaponId (${updatedWeaponData.id}) and was not random. Not clearing.`);
            }
        };

        const handleTimeUpdate = (data: { timeLeft: number }) => {
            setGameState((prev) => prev ? { ...prev, timeLeft: data.timeLeft } : null);
        };

        const handleActionFailed = (data: { reason: string }) => {
            // console.error(`[WeaponGrid ${roomId}] Action failed: ${data.reason}`);
            handleError(data.reason);
            if (loadingWeaponId !== null) {
                // console.log(`[DEBUG handleActionFailed] Clearing loadingWeaponId (was: ${loadingWeaponId})`);
                setLoadingWeaponId(null);
            }
        };

        const handleInitialUsers = (users: RoomUser[]) => {
            // console.log(`[WeaponGrid ${roomId}] Received initial users:`, users);
            setRoomUsers(users);
        };
        const handleUserJoined = (user: RoomUser) => {
            // console.log(`[WeaponGrid ${roomId}] User joined:`, user);
            setRoomUsers((prevUsers) => {
                // 同じIDのユーザーがいなければ追加
                if (!prevUsers.some(u => u.id === user.id)) {
                    return [...prevUsers, user];
                }
                return prevUsers; // 既にいたら何もしない (重複防止)
            });
        };
        const handleUserLeft = (data: { userId: string; name: string; team: Team | 'observer' }) => {
            // console.log(`[WeaponGrid ${roomId}] User left: ${data.name} (${data.userId})`);
            setRoomUsers((prevUsers) => prevUsers.filter(u => u.id !== data.userId));
        };
        const handleUserUpdated = (updatedUser: RoomUser) => {
            // console.log(`[WeaponGrid ${roomId}] User updated:`, updatedUser);
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
            // console.log(`[System Message] Received: ${data.message}`);
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

        const handleForceLeave = (data: { reason: string }) => {
            // console.log(`[Force Leave Room ${roomId}] Received. Reason: ${data.reason}`);
            // 理由に応じてメッセージを出し分けることも可能
            toast.error(`ルームがリセットされました (${data.reason === 'room_timeout' ? 'タイムアウト' : data.reason})。ルーム選択画面に戻ります。`, { duration: 5000 });
            onLeaveRoom(); // 親コンポーネントに退出処理を委譲
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
        socket.on('force leave room', handleForceLeave);

        // 初期データ要求イベントを送信
        // console.log(`[WeaponGrid ${roomId}] Requesting initial data...`);
        socket.emit('request initial data', { roomId });

        // console.log(`[WeaponGrid ${roomId}] Listeners registered.`);

        // --- クリーンアップ ---
        return () => {
            // console.log(`[WeaponGrid ${roomId}] Removing listeners...`);
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
            socket.off('force leave room', handleForceLeave);
        };
    }, [socket, roomId, userName, masterWeapons, loadingWeaponId, onGameStateUpdate]);

    useEffect(() => {
        onGameStateUpdate(gameState);
    }, [gameState, onGameStateUpdate]);

    // スマホ表示時に共通ヘッダーを非表示にする
    useEffect(() => {
        const globalHeader = document.getElementById('global-header');
        if (!globalHeader) return;

        let originalDisplay = globalHeader.style.display;

        const handleResize = () => {
            const isMobile = window.innerWidth < 1024; // Tailwindのlgブレークポイント (1024px)
            if (isMobile) {
                if (globalHeader.style.display !== 'none') {
                    originalDisplay = globalHeader.style.display; // 元のスタイルを保存
                    globalHeader.style.display = 'none';
                }
            } else {
                globalHeader.style.display = originalDisplay || ''; // PC表示では元に戻す (空文字列ならデフォルト)
            }
        };

        handleResize(); // 初期実行
        window.addEventListener('resize', handleResize);

        return () => {
            // クリーンアップ時にも元のスタイルに戻す
            globalHeader.style.display = originalDisplay || '';
            window.removeEventListener('resize', handleResize);
        };
    }, []); // このuseEffectはマウント・アンマウント時に一度だけ実行

    // モーダル表示中にゲームフェーズが 'waiting' から変更されたらモーダルを閉じる
    useEffect(() => {
        if (gameState?.phase !== 'waiting') {
            if (isStageModalOpen) {
                // console.log('[WeaponGrid] Game phase changed from waiting, closing stage modal.');
                setIsStageModalOpen(false);
            }
            if (isRuleModalOpen) {
                // console.log('[WeaponGrid] Game phase changed from waiting, closing rule modal.');
                setIsRuleModalOpen(false);
            }
        }
    }, [gameState?.phase, isStageModalOpen, isRuleModalOpen]);

    // gameState と weaponStates の最新値を useRef で保持
    const gameStateRef = useRef(gameState);
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    const weaponStatesRef = useRef(weaponStates);
    useEffect(() => {
        weaponStatesRef.current = weaponStates;
    }, [weaponStates]);

    // myTeam の最新値を useRef で保持
    const myTeamRef = useRef(myTeam);
    useEffect(() => {
        myTeamRef.current = myTeam;
    }, [myTeam]);

    // loadingWeaponId の最新値を useRef で保持
    const loadingWeaponIdRef = useRef(loadingWeaponId);
    useEffect(() => {
        loadingWeaponIdRef.current = loadingWeaponId;
    }, [loadingWeaponId]);

    // --- 武器選択/禁止処理 ---
    const handleWeaponClick = useCallback((weaponId: number) => {
        // ★ myTeam と loadingWeaponId を Ref で参照
        if (!socket || !gameStateRef.current || myTeamRef.current === 'observer' || loadingWeaponIdRef.current !== null) {
            // if (loadingWeaponId !== null) console.log(`Action prevented: loadingWeaponId is ${loadingWeaponId}`);
            return;
        }
        const currentGameState = gameStateRef.current; // Ref から最新の gameState を取得
        const currentWeaponStates = weaponStatesRef.current; // Ref から最新の weaponStates を取得
        const currentMyTeam = myTeamRef.current; // ★ Ref から最新の myTeam を取得
        // ★ 依存配列から displayWeapons を外すため、weapon をここで再検索
        const masterWeapon = masterWeapons.find(mw => mw.id === weaponId || weaponId === RANDOM_WEAPON_ID);
        const currentWeaponStateData = currentWeaponStates[weaponId] ?? { id: weaponId, selectedBy: null, bannedBy: [] };
        const weapon = masterWeapon ? {
            ...masterWeapon,
            selectedBy: currentWeaponStateData.selectedBy,
            bannedBy: currentWeaponStateData.bannedBy,
            // imageUrl は Cell 側で RANDOM_WEAPON_ID を考慮して設定されるので、ここでは masterWeapon のものを使うか、
            // Cell と同様のロジックをここにも書く必要がある。今回は masterWeapon のものをベースとする。
            imageUrl: weaponId === RANDOM_WEAPON_ID ? RANDOM_WEAPON_CHOICE_ITEM.imageUrl : `/images/weapons/${encodeURIComponent(masterWeapon.name)}.webp`,
            isLoading: loadingWeaponIdRef.current === weaponId, // ★ Ref を使用して現在のローディング状態を反映
            // sub/sp は masterWeapon から
            subWeapon: masterWeapon.subWeapon,
            specialWeapon: masterWeapon.specialWeapon,
            subWeaponImageName: masterWeapon.subWeaponImageName,
            specialWeaponImageName: masterWeapon.specialWeaponImageName,
        } : null;

        if (weaponId === RANDOM_WEAPON_ID) {
            // ★ currentMyTeam を使用
            if (currentGameState.phase === 'pick' && currentGameState.currentTurn === currentMyTeam) {
                setLoadingWeaponId(RANDOM_WEAPON_ID);
                socket.emit('select random weapon');
            } else { handleError('現在はランダム選択できません。'); }
            return;
        }

        if (!weapon) { handleError('武器情報が見つかりません。'); return; }

        const { phase, currentTurn, banPhaseState } = currentGameState;
        // ★ currentMyTeam を使用
        const isMyTurn = currentTurn === currentMyTeam;

        let action: 'ban' | 'select' | null = null;
        let canPerformAction = false;
        // ★ currentMyTeam を使用
        if (phase === 'ban' && (currentMyTeam === 'alpha' || currentMyTeam === 'bravo')) {
            const currentBans = banPhaseState?.bans[currentMyTeam] ?? 0;
            // ★ MAX_BANS_PER_TEAM を直接使用 (定数なので依存配列不要)
            // ★ currentMyTeam を使用
            if (!weapon.selectedBy && !weapon.bannedBy.includes(currentMyTeam) && currentBans < MAX_BANS_PER_TEAM) {
                action = 'ban';
                canPerformAction = true;
            }
            // ★ currentMyTeam を使用
        } else if (phase === 'pick' && (currentMyTeam === 'alpha' || currentMyTeam === 'bravo') && isMyTurn) {
            if (!weapon.selectedBy && weapon.bannedBy.length === 0) {
                action = 'select';
                canPerformAction = true;
            }
        }

        if (canPerformAction && action) {
            const eventName = action === 'ban' ? 'ban weapon' : 'select weapon';
            // console.log(`[WeaponGrid ${roomId}] Emitting ${eventName} for weapon ${weaponId}`);
            // console.log(`[DEBUG handleWeaponClick] Setting loadingWeaponId to: ${weaponId}`);
            setLoadingWeaponId(weaponId);
            socket.emit(eventName, { weaponId: weaponId });
        } else {
            // console.log('Action prevented:', { phase, currentTurn, myTeam: currentMyTeam, weaponStatus: weapon, canPerformAction, action });
            if (phase === 'pick') {
                // ★ currentMyTeam を使用
                if ((currentMyTeam === 'alpha' || currentMyTeam === 'bravo') && !isMyTurn) handleError('あなたのターンではありません。');
                else if (weapon.bannedBy.length > 0) handleError('この武器は BAN されています。');
                else if (weapon.selectedBy) handleError('この武器は既に Pick されています。');
            } else if (phase === 'ban') {
                // ★ banPhaseState を直接使用
                const currentBans = banPhaseState?.bans[currentMyTeam] ?? 0;
                const maxBans = banPhaseState?.maxBansPerTeam ?? MAX_BANS_PER_TEAM;
                if (weapon.selectedBy) handleError('既に選択されている武器は BAN できません。');
                else if (weapon.bannedBy.includes(currentMyTeam)) handleError('この武器は既にあなたが BAN しています。');
                else if (currentBans >= maxBans) handleError(`BAN できるのは ${maxBans} 個までです。`);
                else handleError('不明なBANエラー');
            }
        }
        // ★ 依存配列から myTeam と loadingWeaponId を削除
    }, [socket, handleError, masterWeapons]); // masterWeapons は find で使うため残す

    // --- チーム選択処理関数 (useCallbackで最適化) ---
    const handleTeamSelect = useCallback((team: Team | 'observer') => {
        if (socket && gameState && gameState.phase === 'waiting') {
            // console.log(`[WeaponGrid ${roomId}] Requesting team select: ${team}`);
            socket.emit('select team', { team });
        } else {
            // console.log(`[WeaponGrid ${roomId}] Cannot select team, phase is not 'waiting' (${gameState?.phase})`);
            handleError('ゲーム開始前のみチームを選択できます。');
        }
    }, [socket, gameState?.phase, handleError, roomId]);

    // モーダルを開くためのコールバック関数
    const openStageModal = useCallback(() => setIsStageModalOpen(true), []);
    const openRuleModal = useCallback(() => setIsRuleModalOpen(true), []);

    // --- ゲーム開始処理 (useCallbackで最適化) ---
    const handleStartGame = useCallback(() => {
        if (socket && gameState && gameState.phase === 'waiting') {
            socket.emit('start game');
        }
    }, [socket, gameState?.phase, roomId]);

    // --- リセット処理 (useCallbackで最適化) ---
    const handleResetGame = useCallback(() => {
        if (socket && confirm('ゲーム状態をリセットしてもよろしいですか？（全員が待機状態に戻ります）')) {
            // console.log(`[WeaponGrid ${roomId}] Emitting reset room`);
            socket.emit('reset room');
        }
    }, [socket, roomId]);

    const handleLeaveButtonClick = useCallback(() => {
        if (socket && confirm(`${roomId} から退出しますか？`)) {
            // console.log(`[WeaponGrid ${roomId}] Emitting 'leave room'`);
            socket.emit('leave room'); // サーバーに退出を通知
            onLeaveRoom(); // 親コンポーネントに状態変更を依頼
        }
    }, [socket, roomId, onLeaveRoom]);

    const handleToggleRandomStage = useCallback((stageId: number) => {
        if (!socket || !amIHost || gameState?.phase !== 'waiting') {
            if (!amIHost) handleError('ホストのみ対象ステージを変更できます。');
            else if (gameState?.phase !== 'waiting') handleError('待機中のみ変更できます。');
            return;
        }
        // console.log(`[UI] Emitting 'update random stage pool' for stageId: ${stageId}`);
        // ★ サーバーにイベントを送信
        socket.emit('update random stage pool', { stageId });
        // クライアント側の gameState.randomStagePool はサーバーからの room state update で更新されるのを待つ
    }, [socket, amIHost, gameState?.phase, handleError]); // 依存配列

    // ★ GameHeader に渡すメンバーモーダルを開く関数
    const handleOpenMembersModal = useCallback(() => {
        setIsMembersModalOpen(true);
    }, []);

    const handleToggleRandomRule = useCallback((ruleId: number) => {
        if (!socket || !amIHost || gameState?.phase !== 'waiting') {
            if (!amIHost) handleError('ホストのみ対象ステージを変更できます。');
            else if (gameState?.phase !== 'waiting') handleError('待機中のみ変更できます。');
            return;
        }
        // console.log(`[UI] Emitting 'update random rule pool' for ruleId: ${ruleId}`);
        socket.emit('update random rule pool', { ruleId });
    }, [socket, amIHost, gameState?.phase, handleError]);

    const handleSetRandomPool = useCallback((type: 'stage' | 'rule', itemIds: number[]) => {
        if (!socket || !amIHost || gameState?.phase !== 'waiting') {
            handleError(amIHost ? '待機中のみ変更できます。' : 'ホストのみ変更できます。');
            return;
        }
        socket.emit('set_random_pool', { type, itemIds });
        // クライアント側の即時反映はサーバーからの 'room state update' を待つ
    }, [socket, amIHost, gameState?.phase, handleError]);

    // --- レンダリング ---

    if (!gameState) {
        return (
            <div className="container mx-auto text-center">
                <p>ルーム情報 ({roomId}) を読み込み中...</p>
            </div>
        );
    }

        // Props の組み立て (可読性のため)
    const commonTeamPanelProps = {
        phase: gameState.phase,
        hostId: gameState.hostId,
        masterWeaponsMap: masterWeaponsMap,
        weaponStates: weaponStates,
        banPhaseState: gameState.banPhaseState,
        myTeam: myTeam,
        userName: userName,
        onSelectTeam: handleTeamSelect,
    };

    const teamAlphaPanelProps = {
        ...commonTeamPanelProps,
        teamUsers: alphaTeamUsers,
        orderedPickedWeaponIds: orderedAlphaPickedIds, // ★ 変更
        orderedBannedWeaponIds: orderedAlphaBannedIds, // ★ 変更
        pickCount: gameState.pickPhaseState?.picks.alpha ?? 0,
        banCount: gameState.banPhaseState?.bans.alpha ?? 0,
    };
    const teamBravoPanelProps = {
        ...commonTeamPanelProps,
        teamUsers: bravoTeamUsers,
        orderedPickedWeaponIds: orderedBravoPickedIds, // ★ 変更
        orderedBannedWeaponIds: orderedBravoBannedIds, // ★ 変更
        pickCount: gameState.pickPhaseState?.picks.bravo ?? 0,
        banCount: gameState.banPhaseState?.bans.bravo ?? 0,
    };

    const observerPanelSharedProps = { // ObserverPanel に渡す共通Props
        phase: gameState.phase,
        hostId: gameState.hostId,
        myTeam: myTeam,
        userName: userName,
        onSelectTeam: handleTeamSelect,
    };

    const gameHeaderSharedProps = { // GameHeader に渡す共通Props
        roomId: roomId,
        roomName: gameState.roomName,
        userCount: gameState.userCount,
        phase: gameState.phase,
        currentTurn: gameState.currentTurn,
        timeLeft: gameState.timeLeft,
        hostId: gameState.hostId,
        timerDuration: timerDuration,
        myTeam: myTeam,
        amIHost: amIHost,
        socket: socket,
        selectedStage: selectedStage,
        selectedRule: selectedRule,
        randomStagePoolCount: gameState.randomStagePool?.length ?? 0,
        randomRulePoolCount: gameState.randomRulePool?.length ?? 0,
        onLeaveRoom: handleLeaveButtonClick,
        onStartGame: handleStartGame,
        isAnyRandomSettingsModalOpen: isAnyRandomSettingsModalOpen, // ★ 追加
        onResetGame: handleResetGame,
        onOpenStageModal: openStageModal,
        onOpenRuleModal: openRuleModal,
    };

    const weaponFilterSharedProps = { // WeaponFilter に渡す共通Props
        selectedAttributes,
        selectedSubWeapons,
        selectedSpecialWeapons,
        onFilterChange: handleFilterChange,
        onClearFilterSection: handleClearFilterSection,
    };

    const weaponGridDisplaySharedProps = { // WeaponGridDisplay に渡す共通Props
        phase: gameState.phase,
        currentTurn: gameState.currentTurn,
        banPhaseState: gameState.banPhaseState,
        pickPhaseState: gameState.pickPhaseState,
        displayWeaponIds: displayWeaponIds,
        masterWeapons: masterWeapons,
        weaponStates: weaponStates,
        loadingWeaponId: loadingWeaponId,
        myTeam: myTeam,
        myBanCount: myBanCount,
        myPickCount: myPickCount,
        onWeaponClick: handleWeaponClick,
    };

    // --- JSX レンダリング本体 ---
    return (
        <>
            {/* スマホ用レイアウト (lg未満) */}
            <div className="lg:hidden flex flex-col overflow-y-hidden overflow-x-hidden text-gray-100">
                {/* GameHeader: 高さ 1/5 */}
                <div className="h-[23vh] flex-shrink-0">
                    <GameHeader {...gameHeaderSharedProps} onOpenMembersModal={handleOpenMembersModal} />
                </div>
                {/* TeamPanels (Alpha & Bravo): 高さ 1/5、横並び */}
                <div className="h-[25vh] flex gap-1 flex-shrink-0 py-1">
                    <div className="w-1/2 h-full">
                        <TeamPanel team="alpha" teamDisplayName="アルファ" {...teamAlphaPanelProps} isMobileView={true} />
                    </div>
                    <div className="w-1/2 h-full">
                        <TeamPanel team="bravo" teamDisplayName="ブラボー" {...teamBravoPanelProps} isMobileView={true} />
                    </div>
                </div>
                {/* WeaponFilter + WeaponGridDisplay: 高さ 3/5 (残り) */}
                <div className="flex flex-col min-h-0 relative pb-1 h-[50vh]">
                    {/* フィルター開閉ボタン (スマホ用) */}
                    <div className="lg:hidden">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 text-sm rounded-md flex justify-between items-center h-10" // 高さを h-10 (2.5rem) に固定
                        >
                            <span>ブキフィルター{isFilterOpen ? 'を閉じる' : 'を開く'}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform duration-150 ${isFilterOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>

                    {/* WeaponFilter (スマホ用、条件付き表示、オーバーレイ) */}
                    {isFilterOpen && (
                        <div className="lg:hidden absolute top-10 left-1 right-1 z-20 bg-gray-800 shadow-xl rounded-md border border-gray-700 max-h-[calc(60vh-3rem)] overflow-y-auto">
                            {/* top-10 (2.5rem) はボタンの高さ h-10 と同じ */}
                            {/* max-h: 60vh (コンテナの高さ想定) - 2.5rem (ボタンの高さ) - 0.5rem (余裕分) */}
                            <WeaponFilter {...weaponFilterSharedProps} />
                        </div>
                    )}
                    {/* PC用 WeaponFilter (従来通り) */}
                    <div className="hidden lg:block mb-1">
                        <WeaponFilter {...weaponFilterSharedProps} />
                    </div>
                    {/* WeaponGridDisplay (常に表示) */}
                    <div className="flex-grow min-h-0 mt-1 lg:mt-0"> {/* スマホではボタンとの間に mt-1、PCではフィルターのmb-1があるのでmt-0 */}
                        <WeaponGridDisplay {...weaponGridDisplaySharedProps} />
                    </div>
                </div>
                {/* ObserverPanel はスマホではモーダルに統合されるため、ここには表示しない */}
            </div>

            {/* PC用レイアウト (lg以上) */}
            <div className={`hidden lg:flex lg:flex-col container mx-auto p-2 space-y-3 bg-white rounded-lg shadow-md min-h-[calc(100vh-100px)]`}>
                <GameHeader {...gameHeaderSharedProps} /> {/* PCでは onOpenMembersModal は渡さない (ボタン非表示) */}
                <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-stretch flex-grow mb-2 ">
                    <TeamPanel team="alpha" teamDisplayName="アルファ" {...teamAlphaPanelProps} isMobileView={false} />
                    <div className="lg:col-span-7 flex flex-col gap-2 overflow-hidden min-h-0">
                        <div className="hidden lg:block mb-1"> {/* mb-1 をここに追加 */}
                            <WeaponFilter {...weaponFilterSharedProps} />
                        </div>
                        <div className={`rounded-lg shadow-sm relative mt-2 h-full`}>
                            <WeaponGridDisplay {...weaponGridDisplaySharedProps} />
                        </div>
                    </div>
                    <TeamPanel team="bravo" teamDisplayName="ブラボー" {...teamBravoPanelProps} isMobileView={false} />
                </div>
                <ObserverPanel observers={observers} {...observerPanelSharedProps} isMobileView={false} />
            </div>

            {/* メンバー表示モーダル (共通) */}
            <MembersDisplayModal
                isOpen={isMembersModalOpen}
                onClose={() => setIsMembersModalOpen(false)}
                roomUsers={roomUsers}
                hostId={gameState.hostId}
                userName={userName}
            />

            {/* Selection Modals (既存のステージ・ルール選択モーダル) */}
            <SelectionModal<Stage>
                modalType="stage"
                isOpen={isStageModalOpen}
                onClose={() => setIsStageModalOpen(false)}
                items={STAGES_DATA}
                initialSelectedItem={selectedStage}
                onSelect={(stage) => {
                    setSelectedStage(stage);
                    if (socket && amIHost) {
                        const stageIdToSend = stage.id === 'random' ? 'random' : stage.id;
                        socket.emit('select stage', { stageId: stageIdToSend });
                    }
                }}
                title="ステージを選択"
                randomOption={RANDOM_STAGE_CHOICE}
                isHost={amIHost}
                randomStagePool={randomStagePoolSet}
                onToggleRandomStage={handleToggleRandomStage}
                onSetRandomPool={handleSetRandomPool}
            />
            <SelectionModal<Rule>
                modalType="rule"
                isOpen={isRuleModalOpen}
                onClose={() => setIsRuleModalOpen(false)}
                items={RULES_DATA}
                initialSelectedItem={selectedRule}
                onSelect={(rule) => {
                    setSelectedRule(rule);
                    if (socket && amIHost) {
                        const ruleIdToSend = rule.id === 'random' ? 'random' : rule.id;
                        socket.emit('select rule', { ruleId: ruleIdToSend });
                    }
                }}
                title="ルールを選択"
                randomOption={RANDOM_RULE_CHOICE}
                isHost={amIHost}
                randomRulePool={randomRulePoolSet}
                onToggleRandomRule={handleToggleRandomRule}
                onSetRandomPool={handleSetRandomPool}
            />
        </>
    );

    // SelectionModal の型定義と実装は変更なし (省略)
    type RandomChoiceType = typeof RANDOM_STAGE_CHOICE | typeof RANDOM_RULE_CHOICE;
    interface SelectionModalProps<T extends Stage | Rule> {
        isOpen: boolean;
        onClose: () => void;
        items: T[];
        initialSelectedItem: T | RandomChoiceType | null;
        onSelect: (item: T | RandomChoiceType) => void;
        title: string;
        randomOption?: RandomChoiceType;
        isHost: boolean;
        randomStagePool?: Set<number>;
        randomRulePool?: Set<number>;
        onToggleRandomStage?: (stageId: number) => void;
        onToggleRandomRule?: (ruleId: number) => void;
        onSetRandomPool?: (type: 'stage' | 'rule', itemIds: number[]) => void;
        modalType: 'stage' | 'rule';
    }

    function SelectionModal<T extends Stage | Rule>({
        isOpen,
        onClose,
        items,
        initialSelectedItem,
        onSelect,
        title,
        randomOption,
        isHost,
        randomStagePool,
        randomRulePool,
        onToggleRandomStage,
        onToggleRandomRule,
        onSetRandomPool,
        modalType
    }: SelectionModalProps<T>) {

        const [currentModalSelection, setCurrentModalSelection] = useState<T | RandomChoiceType | null>(initialSelectedItem);
        
        const isRandomActiveForModal = useMemo(() => {
            if (!randomOption || !currentModalSelection) return false;
            return currentModalSelection.id === randomOption.id;
        }, [currentModalSelection, randomOption]);

        if (!isOpen) return null;

        const handleRandomSelect = () => {
            if (isHost) {
                if (randomOption) {
                    setCurrentModalSelection(randomOption);
                }
            } else {
                toast.error('ホストのみ選択できます。');
            }
        };

        const handleItemSelect = (item: T) => {
            if (isHost) {
                setCurrentModalSelection(item);
            } else {
                toast.error('ホストのみ選択できます。');
            }
        };

        const attemptCloseModal = () => {
            const currentPool = modalType === 'stage' ? randomStagePool : randomRulePool;
            const isPoolInsufficient = currentPool && (currentPool.size === 0 || currentPool.size === 1);

            if (isHost && isRandomActiveForModal && isPoolInsufficient) {
                const itemType = modalType === 'stage' ? 'ステージ' : 'ルール';
                toast.error(`ランダム${itemType}の対象を2つ以上選択してください。`, { duration: 4000 });
                return;
            }
            if (currentModalSelection) {
                onSelect(currentModalSelection);
            }
            onClose();
        };

        const currentPool = modalType === 'stage' ? randomStagePool : randomRulePool;
        const currentToggleHandler = modalType === 'stage' ? onToggleRandomStage : onToggleRandomRule;

        const renderModalItem = (
            item: T | RandomChoiceType,
            isRandom: boolean
        ) => {
            const isStageModal = modalType === 'stage';
            const isLastOneInPool = currentPool && currentPool.size === 1 && currentPool.has((item as Stage | Rule).id as number);
            const canToggleCheckbox = isHost && !isLastOneInPool;
            const isInRandomPool = isRandom ? true : (currentPool ? currentPool.has((item as Stage | Rule).id as number) : true);
            const checkboxTitle = !isHost ? 'ホストのみ変更可' :
                                isLastOneInPool ? '最後の1つは対象から外せません' :
                                (isInRandomPool ? 'ランダム対象外にする' : 'ランダム対象にする');
            const isCurrentlySelectedInModal = currentModalSelection?.id === item.id;

            const itemClasses = ["relative", "border", "rounded-md", "overflow-hidden", "aspect-square", "group"];

            if (isCurrentlySelectedInModal) {
                itemClasses.push(isRandom ? 'ring-2 ring-offset-1 ring-green-500' : 'ring-2 ring-offset-1 ring-blue-500');
                if (isInRandomPool) {
                    itemClasses.push(isRandom ? 'bg-green-50' : 'bg-blue-50');
                } else {
                    itemClasses.push('bg-gray-200');
                }
            } else {
                if (isInRandomPool) {
                    itemClasses.push('bg-white', 'hover:bg-gray-50');
                } else {
                    itemClasses.push('bg-gray-200');
                }
            }

            if (!isHost && !isInRandomPool) {
                itemClasses.push('opacity-60', 'cursor-not-allowed');
            }

            return (
                <div
                    key={item.id}
                    className={itemClasses.join(' ')}
                >
                    {!isRandom && currentToggleHandler && (
                        <div className="absolute top-1 left-1 z-10 p-0.5 bg-white/60 rounded-sm group-hover:bg-white/80 transition-colors">
                            <input
                                type="checkbox"
                                checked={isInRandomPool}
                                disabled={!canToggleCheckbox}
                                onChange={() => canToggleCheckbox && currentToggleHandler && currentToggleHandler((item as Stage | Rule).id as number)}
                                className={`w-4 h-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500 ${!canToggleCheckbox ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                                title={checkboxTitle}
                            />
                        </div>
                    )}

                    {/* 画像ボタン本体 */}
                    <button
                        disabled={!isHost && !isRandom} // ★ ランダムオプションはホスト以外も選択可能にするか？現状はホストのみ
                        onClick={() => isRandom ? handleRandomSelect() : handleItemSelect(item as T)}
                        className={`relative flex flex-col items-center justify-center w-full h-full p-1 ${!isHost && !isRandom ? 'cursor-not-allowed' : ''}`}
                        title={item.name + (!isInRandomPool && !isRandom ? ' (ランダム対象外)' : '')}
                    >
                        {/* 画像 */}
                        {isRandom ? (
                            // --- ランダムオプションの画像表示 (コンテナいっぱい) ---
                            <div className="absolute inset-0 w-full h-full">
                                <Image
                                    src={item.imageUrl}
                                    alt={item.name}
                                    fill
                                    style={{ objectFit: 'cover' }} // ランダムは cover のまま or contain
                                    className="rounded-sm"
                                />
                            </div>
                        ) : (
                            // --- 通常アイテムの画像表示 (ステージモーダルのみ90%サイズ、中央揃え) ---
                            // ステージモーダルでなければ、またはルールモーダルであれば、コンテナいっぱい
                            <div className={`absolute ${isStageModal ? 'inset-0' : 'inset-1.75'} w-full h-full flex justify-center items-center `}>
                                <div className={`absolute inset-0 ${isStageModal ? 'w-[100%] h-[100%]' : 'w-[90%] h-[90%]'}`}>
                                    <Image
                                        src={item.imageUrl}
                                        alt={item.name}
                                        fill
                                        sizes='width:159px height:159px'
                                        style={{ objectFit: `${isStageModal ? 'cover' : 'contain'}` }}
                                        className="rounded-sm"
                                    />
                                </div>
                            </div>
                        )}
                        {/* 名前表示 */}
                        <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-gradient-to-t from-black/60 to-transparent h-[30%] flex items-end justify-center">
                            <p className="text-white text-[13px] leading-tight text-center truncate font-bold">
                                {item.name}
                            </p>
                        </div>
                    </button>

                    {/* BANマーク (ランダム以外で対象外の場合) */}
                    {!isRandom && !isInRandomPool && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-md pointer-events-none z-20">
                            <svg className="w-20 h-20 text-red-500 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div
                className="fixed inset-0 bg-black/50 flex justify-center items-center z-[60] p-4" // z-index調整
                onClick={attemptCloseModal} // ★ 背景クリックでモーダルを閉じようとする
            >
                <div
                    className="bg-white rounded-lg shadow-xl p-4 md:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()} // ★ モーダル内部のクリックが背景に伝播しないようにする
                >
                    {/* モーダルヘッダー */}
                    <div className="flex justify-between items-start mb-3 md:mb-4"> {/* ★ items-start に変更 */}
                        <div>
                            <h3 className="text-lg md:text-xl font-semibold text-gray-800 font-bold">{title}</h3>
                            {isHost && onSetRandomPool && (
                                <div className="mt-1 flex gap-2">
                                    <button
                                        onClick={() => onSetRandomPool(modalType, items.map(i => i.id as number))}
                                        disabled={!isHost || (currentPool && currentPool.size === items.length)}
                                        className="text-xs px-2 py-1 border rounded bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                        title={currentPool && currentPool.size === items.length ? "すべて選択済みです" : "すべての対象を選択"}
                                    >
                                        全選択
                                    </button>
                                    <button
                                        onClick={() => onSetRandomPool(modalType, [])}
                                        disabled={!isHost || !currentPool || currentPool.size === 0}
                                        className="text-xs px-2 py-1 border rounded bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                        title={!currentPool || currentPool.size === 0 ? "すべて解除済みです" : "すべての対象を解除"}
                                    >
                                        全解除
                                    </button>
                                </div>
                            )}
                        </div>
                        <button onClick={attemptCloseModal} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                    </div>
                    {!isHost && (
                         <p className="text-xs text-gray-500 mb-2 -mt-2">
                            ランダム対象の変更はホストのみ可能です。
                         </p>
                    )}
                    <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 gap-1.5 md:gap-2"> {/* ★ xs, sm, md で調整, gap 調整 */}
                        {/* ランダム選択肢 */}
                        {randomOption && renderModalItem(randomOption, true)}
                        {/* 通常の選択肢 */}
                        {items.map((item) => renderModalItem(item, false))}
                    </div>
                </div>
            </div>
        );
    }
}