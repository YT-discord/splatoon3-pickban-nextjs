
import { Server } from 'socket.io';
import { RoomGameState, RoomUser, RoomWeaponState, PublicRoomGameState, MasterWeapon, Team } from '../common/types/game';
import { MAX_BANS_PER_TEAM, MAX_PICKS_PER_TEAM, TOTAL_PICK_TURNS, BAN_PHASE_DURATION, PICK_PHASE_TURN_DURATION, USE_FAST_TIMER, FAST_TIMER_MULTIPLIER } from '../common/types/constants';

// --- モジュールスコープ変数 ---
let io: Server;
let gameRooms: Map<string, RoomGameState>;
let masterWeapons: MasterWeapon[];

export const initializeGameLogic = (
    socketIo: Server,
    roomsMap: Map<string, RoomGameState>,
    masterWeaponsList: MasterWeapon[]
): void => {
    io = socketIo;
    gameRooms = roomsMap;
    masterWeapons = masterWeaponsList;
    console.log('[Game Logic] Initialized.');
};

// =============================================
// == ルーム状態操作 & ゲームロジック関数群 ==
// =============================================

export const initializeRoomState = (roomId: string): RoomGameState => {
    console.log(`[Game Logic] Initializing state for room: ${roomId}`);
    const existingRoomState = gameRooms.get(roomId);
    if (existingRoomState?.timer) {
        clearInterval(existingRoomState.timer);
    }

    const initialWeapons: RoomWeaponState[] = masterWeapons.map(mw => ({
        id: mw.id,
        selectedBy: null,
        bannedBy: [],
    }));

    const newState: RoomGameState = {
        roomId: roomId,
        phase: 'waiting',
        timeLeft: 0,
        currentTurn: null,
        currentPickTurnNumber: 0,
        timer: null,
        turnActionTaken: { alpha: false, bravo: false },
        banPhaseState: { bans: { alpha: 0, bravo: 0 }, maxBansPerTeam: MAX_BANS_PER_TEAM },
        pickPhaseState: { picks: { alpha: 0, bravo: 0 }, maxPicksPerTeam: MAX_PICKS_PER_TEAM },
        weapons: initialWeapons,
        connectedUsers: existingRoomState?.connectedUsers ?? new Map<string, RoomUser>(),
        selectedStageId: 'random', 
        selectedRuleId: 'random'
    };
    gameRooms.set(roomId, newState);
    return newState;
};

export const resetRoom = (roomId: string): void => {
    console.log(`[Game Logic] Resetting room: ${roomId}`);
    const roomState = initializeRoomState(roomId); // 状態を初期化
    if (roomState) {
        // 1. リセットされた初期状態を通知
        io.to(roomId).emit('initial state', getPublicRoomState(roomState));
        io.to(roomId).emit('initial weapons', roomState.weapons);

        // 2. ユーザーのチームを observer に戻す通知
        roomState.connectedUsers.forEach(user => {
             user.team = 'observer';
             io.to(roomId).emit('user updated', user);
        });

        // 3. リセット通知イベントを発行
        io.to(roomId).emit('room reset notification', { message: `ルーム "${roomId}" がリセットされました。` });

        console.log(`[Game Logic] Room ${roomId} reset and notified all events.`);
    } else {
        console.error(`[Game Logic] Failed to reset room ${roomId}, state is null after init?`);
    }
};

/**
 * クライアントに送信する用の公開ゲーム状態を取得する
 */
export const getPublicRoomState = (roomState: RoomGameState): PublicRoomGameState => {
    const { timer, connectedUsers, weapons, turnActionTaken, teams, ...publicState } = roomState;
    return {
        ...publicState,
        userCount: connectedUsers.size,
        banCounts: roomState.banPhaseState.bans,
        pickCounts: roomState.pickPhaseState.picks,
    };
};

export const startRoomTimer = (roomId: string, duration: number, onTick: (roomId: string, timeLeft: number) => void, onEnd: (roomId: string) => void): void => {
    const roomState = gameRooms.get(roomId);
    if (!roomState) {
        console.error(`[Timer ${roomId}] Cannot start timer, room state not found.`);
        return;
    }

    const tickInterval = 1000;
    const actualDuration = USE_FAST_TIMER ? Math.ceil(duration / FAST_TIMER_MULTIPLIER) : duration;
    const actualTickInterval = USE_FAST_TIMER ? Math.ceil(tickInterval / FAST_TIMER_MULTIPLIER) : tickInterval;

    if (roomState.timer) {
        console.log(`[Timer ${roomId}] Clearing existing timer:`, roomState.timer);
        clearInterval(roomState.timer);
    }

    roomState.timeLeft = actualDuration;
    console.log(`[Timer ${roomId}] Starting timer for ${actualDuration} seconds. Phase: ${roomState.phase}, Turn: ${roomState.currentPickTurnNumber || 'N/A'}, Player: ${roomState.currentTurn || 'N/A'}`);
    onTick(roomId, roomState.timeLeft);

    const intervalId = setInterval(() => {
        const currentRoomState = gameRooms.get(roomId);
        if (!currentRoomState || currentRoomState.timer === null || currentRoomState.timer !== intervalId) {
             console.log(`[Timer Tick ${roomId}] Timer stop requested or room state invalid. Clearing interval ${intervalId}.`);
             clearInterval(intervalId);
             if (currentRoomState && currentRoomState.timer === intervalId) {
                 currentRoomState.timer = null;
             }
             return;
        }

        currentRoomState.timeLeft = Math.max(0, currentRoomState.timeLeft - 1);
        onTick(roomId, currentRoomState.timeLeft);

        if (currentRoomState.timeLeft <= 0) {
            console.log(`[Timer ${roomId}] Timer ${intervalId} ended.`);
            // clearInterval(intervalId); // onEnd の中でタイマーが再開される可能性があるのでクリアは onEnd 側で行うか、ここで確実にクリアする
            currentRoomState.timer = null;
            clearInterval(intervalId); // ★ やはりここでクリアするのが安全
            onEnd(roomId);
        }
    }, actualTickInterval);

    roomState.timer = intervalId;
    console.log(`[Timer ${roomId}] Timer intervalId ${intervalId} stored in room state.`);
};

export const selectRandomWeapon = async (roomId: string, team: Team): Promise<void> => { // ★ 型を Team に
    console.log(`[Random Select ${roomId}] Attempting random select for team ${team}...`);
    const roomState = gameRooms.get(roomId);
    if (!roomState || roomState.phase !== 'pick') return;

    try {
        const availableWeapons = roomState.weapons.filter(weapon =>
            !weapon.selectedBy &&
            weapon.bannedBy.length === 0 // BANされていない武器のみ
        );
        console.log(`[Random Select ${roomId}] Found ${availableWeapons.length} available weapons.`);

        if (availableWeapons.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableWeapons.length);
            const weaponToSelect = availableWeapons[randomIndex];
            const masterWeaponInfo = masterWeapons.find(mw => mw.id === weaponToSelect.id);

            console.log(`[Random Select ${roomId}] Team ${team} timed out. Selecting: ${masterWeaponInfo?.name} (ID: ${weaponToSelect.id})`);
            weaponToSelect.selectedBy = team;
            console.log(`[Random Select ${roomId}] Weapon ${weaponToSelect.id} state updated in room memory.`);

            // ★ ランダム選択後も武器状態を通知
            const updatedWeaponState: RoomWeaponState = { id: weaponToSelect.id, selectedBy: weaponToSelect.selectedBy, bannedBy: weaponToSelect.bannedBy };
            io.to(roomId).emit('update weapon', updatedWeaponState);

            // 成功処理を呼ぶ (Pickカウント増加、ターン進行)
            handleSuccessfulPick(roomId, team); // ★ 引数 roomId を渡す
        } else {
            console.log(`[Random Select ${roomId}] Team ${team} timed out. No available weapons.`);
            // 選択できる武器がなくてもターンは進める
            handleSuccessfulPick(roomId, team); // ★ 引数 roomId を渡す
        }
    } catch (error) {
        console.error(`[Random Select ${roomId}] Error for team ${team}:`, error);
        // エラーでもターンは進める
        handleSuccessfulPick(roomId, team); // ★ 引数 roomId を渡す
    }
};

export const handleSuccessfulBan = (roomId: string, team: Team): void => { // ★ 型を Team に
    const roomState = gameRooms.get(roomId);
    if (!roomState || roomState.phase !== 'ban') return;
    console.log(`[Game Logic ${roomId}] handleSuccessfulBan called for team: ${team}.`);

    // BANカウントを増やす（上限チェックは app.ts で行う想定）
    roomState.banPhaseState.bans[team]++;
    console.log(`[Ban Count ${roomId}] Updated. Counts: A=${roomState.banPhaseState.bans.alpha}, B=${roomState.banPhaseState.bans.bravo}`);

    // ★★★ 最新のゲーム状態をクライアントに通知 ★★★
    io.to(roomId).emit('phase change', getPublicRoomState(roomState)); // または 'room state update'
    console.log(`[Game Logic ${roomId}] Emitted state update after ban.`);

    // 両チームがBAN上限に達したらフェーズ終了
    const alphaReachedMax = roomState.banPhaseState.bans.alpha >= roomState.banPhaseState.maxBansPerTeam;
    const bravoReachedMax = roomState.banPhaseState.bans.bravo >= roomState.banPhaseState.maxBansPerTeam;
    if (alphaReachedMax && bravoReachedMax) {
        console.log(`[Ban End ${roomId}] Both teams reached max bans. Calling endBanPhase...`);
        if(roomState.timer) { clearInterval(roomState.timer); roomState.timer = null; }
        endBanPhase(roomId);
    }
};

export const handleSuccessfulPick = (roomId: string, team: Team): void => { // ★ 型を Team に
    const roomState = gameRooms.get(roomId);
    if (!roomState || roomState.phase !== 'pick') return;
    console.log(`[Game Logic ${roomId}] handleSuccessfulPick called for team: ${team}.`);

    // このターンでまだアクションしていない場合のみ処理
    if (!roomState.turnActionTaken[team]) {
        roomState.turnActionTaken[team] = true; // アクション済みフラグを立てる
        roomState.pickPhaseState.picks[team]++; // Pick カウントを増やす
        console.log(`[Pick Count ${roomId}] ${team}: ${roomState.pickPhaseState.picks[team]}`);

        // ★★★ 最新のゲーム状態をクライアントに通知 (Pick数が増えたため) ★★★
        // ターン切り替え前に一度通知する (任意だが、即時反映感が出るかも)
        // io.to(roomId).emit('phase change', getPublicRoomState(roomState));

        // 現在のタイマーがあればクリア (相手のターンに移るため)
        if (roomState.timer && roomState.currentTurn === team) {
            console.log(`[Game Logic ${roomId}] Clearing current timer for ${team}.`);
            clearInterval(roomState.timer);
            roomState.timer = null;
        }
        console.log(`[Game Logic ${roomId}] Calling switchPickTurn().`);
        switchPickTurn(roomId); // 次のターンへ
    } else {
        // 基本的に app.ts 側でチェックされるはずだが、念のためログ
        console.warn(`[Game Logic ${roomId}] Action already taken for team ${team} in this turn. Ignoring handleSuccessfulPick.`);
    }
};

export const switchPickTurn = (roomId: string): void => {
    const roomState = gameRooms.get(roomId);
    // ★ フェーズが 'pick' または 'ban' (endBanPhaseから呼ばれる) であることを許容
    if (!roomState || !['pick', 'ban'].includes(roomState.phase)) return;
    console.log(`[Switch Turn ${roomId}] Function called. Current Phase: ${roomState.phase}, Turn before: ${roomState.currentPickTurnNumber}`);

    // ★ 現在のタイマーがあればクリア (フェーズ移行やターン切り替えのため)
    if (roomState.timer) {
        console.log(`[Switch Turn ${roomId}] Clearing previous timer ${roomState.timer}`);
        clearInterval(roomState.timer);
        roomState.timer = null;
    }

    // Pick フェーズでなければ Pick フェーズに移行
    if (roomState.phase === 'ban') {
        roomState.phase = 'pick';
        roomState.currentPickTurnNumber = 0; // Pick ターン番号リセット
        roomState.pickPhaseState.picks = { alpha: 0, bravo: 0 }; // Pick カウントリセット
    }

    roomState.currentPickTurnNumber++;
    console.log(`[Switch Turn ${roomId}] Incremented pick turn to ${roomState.currentPickTurnNumber}`);

    // 全 Pick ターン終了チェック
    if (roomState.currentPickTurnNumber > TOTAL_PICK_TURNS) {
        console.log(`[Pick End ${roomId}] Max pick turns reached. Setting phase to pick_complete.`);
        roomState.phase = 'pick_complete';
        roomState.currentTurn = null;
        roomState.timeLeft = 0;
        // ★★★ 完了状態を通知 ★★★
        io.to(roomId).emit('phase change', getPublicRoomState(roomState));
        return;
    }

    // ターンプレイヤー決定 (ABBAABBA... のような形式など、ルールに合わせて実装)
    // 例: シンプルな交互ターン
    roomState.currentTurn = roomState.currentTurn === 'alpha' ? 'bravo' : 'alpha';
    // ★ 最初のターンは alpha からにする
    if (roomState.currentPickTurnNumber === 1) {
        roomState.currentTurn = 'alpha';
    }

    // アクション済みフラグをリセット
    roomState.turnActionTaken = { alpha: false, bravo: false };
    console.log(`[Switch Turn ${roomId}] Switched turn to ${roomState.currentTurn}.`);

    // 次のターンのタイマーを開始
    startRoomTimer(roomId, PICK_PHASE_TURN_DURATION,
        (rId, timeLeft) => io.to(rId).emit('time update', { timeLeft }),
        async (rId) => { // onEnd (時間切れ)
            const timedOutRoomState = gameRooms.get(rId);
            if (!timedOutRoomState || timedOutRoomState.phase !== 'pick' || timedOutRoomState.timer !== null) {
                 console.log(`[Timer End ${rId}] Room state invalid or new timer started. Aborting timeout action.`);
                 return;
            }
            const timedOutPlayer = timedOutRoomState.currentTurn;
            console.log(`[Timer End ${rId}] Pick turn ${timedOutRoomState.currentPickTurnNumber} (Player: ${timedOutPlayer}) timed out.`);
            if (timedOutPlayer && !timedOutRoomState.turnActionTaken[timedOutPlayer]) {
                console.log(`[Timer End ${rId}] Action NOT taken. Selecting randomly...`);
                await selectRandomWeapon(rId, timedOutPlayer);
            } else {
                 console.log(`[Timer End ${rId}] Action WAS taken or no player assigned.`);
                 // ★ アクション済みでも時間切れなのでターンは進める必要がある
                 switchPickTurn(rId);
            }
        }
    );

    // ★★★ ターンが切り替わったことを含む最新状態を通知 ★★★
    console.log(`[Switch Turn ${roomId}] Emitting state update.`);
    io.to(roomId).emit('phase change', getPublicRoomState(roomState));
};

export const endBanPhase = (roomId: string): void => {
    const roomState = gameRooms.get(roomId);
    if (!roomState || roomState.phase !== 'ban') return;
    console.log(`[Ban End ${roomId}] Ending ban phase. Starting pick phase...`);

    // ★ BAN フェーズのタイマーをクリア (switchPickTurnでもクリアされるが念のため)
    if (roomState.timer) {
        console.log(`[Ban End ${roomId}] Clearing ban phase timer ${roomState.timer}`);
        clearInterval(roomState.timer);
        roomState.timer = null;
    }

    // Pick フェーズへの移行処理は switchPickTurn に任せる
    console.log(`[Ban End ${roomId}] Calling switchPickTurn() to start the first pick turn.`);
    switchPickTurn(roomId);
};