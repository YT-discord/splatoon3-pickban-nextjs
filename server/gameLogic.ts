import { Server } from 'socket.io';
import { RoomGameState, RoomUser, RoomWeaponState, PublicRoomGameState, MasterWeapon } from '../common/types/game';
import { MAX_BANS_PER_TEAM, MAX_PICKS_PER_TEAM, TOTAL_PICK_TURNS, BAN_PHASE_DURATION, PICK_PHASE_TURN_DURATION, USE_FAST_TIMER, FAST_TIMER_MULTIPLIER } from '../common/types/constants';

// --- モジュールスコープ変数 (初期化関数で設定) ---
let io: Server;
let gameRooms: Map<string, RoomGameState>;
let masterWeapons: MasterWeapon[];

/**
 * ゲームロジックモジュールを初期化する
 */
export const initializeGameLogic = (
    socketIo: Server,
    roomsMap: Map<string, RoomGameState>,
    masterWeaponsList: MasterWeapon[]
): void => {
    io = socketIo;
    gameRooms = roomsMap;
    masterWeapons = masterWeaponsList;
    console.log('[Game Logic] Initialized with IO server, rooms map, and master weapons.');
};

// =============================================
// == ルーム状態操作 & ゲームロジック関数群 ==
// =============================================

/**
 * 指定されたルームIDのゲーム状態を初期化（またはリセット）する
 * (この関数は gameRooms Map を直接操作するため注意)
 */
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
        connectedUsers: existingRoomState?.connectedUsers ?? new Map<string, RoomUser>(), // ★ ユーザー情報はリセットしない（必要なら別途クリア）
    };
    gameRooms.set(roomId, newState); // Mapを更新
    return newState;
};

/**
 * 特定のルームのゲーム状態をリセットし、通知する
 */
export const resetRoom = (roomId: string): void => {
    console.log(`[Game Logic] Resetting room: ${roomId}`);
    const roomState = initializeRoomState(roomId); // initialize が Map を更新
    if (roomState) {
        // ルーム内の全員にリセットされた状態を通知
        io.to(roomId).emit('initial state', getPublicRoomState(roomState));
        io.to(roomId).emit('initial weapons', roomState.weapons);
        console.log(`[Game Logic] Room ${roomId} reset and notified.`);
    } else {
        console.error(`[Game Logic] Failed to reset room ${roomId}, state is null after init?`);
    }
};

/**
 * クライアントに送信する用の公開ゲーム状態を取得する
 */
export const getPublicRoomState = (roomState: RoomGameState): PublicRoomGameState => {
    const { timer, connectedUsers, ...publicState } = roomState;
    return {
        ...publicState,
        userCount: connectedUsers.size,
    };
};


/**
 * 指定されたルームのタイマーを開始/管理する
 */
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

    // ★ setInterval の参照を roomState.timer に確実に保存する
    const intervalId = setInterval(() => {
        // ★ Mapから最新のroomStateを取得して操作する
        const currentRoomState = gameRooms.get(roomId);
        // ★ タイマーがクリアされたか、ルームが存在しない場合はインターバルを停止
        if (!currentRoomState || currentRoomState.timer === null || currentRoomState.timer !== intervalId) {
             console.log(`[Timer Tick ${roomId}] Timer stop requested or room state invalid. Clearing interval ${intervalId}.`);
             clearInterval(intervalId);
             // Map上のタイマーもnullにする（別の場所でnullにされていなければ）
             if (currentRoomState && currentRoomState.timer === intervalId) {
                 currentRoomState.timer = null;
             }
             return;
        }

        currentRoomState.timeLeft = Math.max(0, currentRoomState.timeLeft - 1);
        onTick(roomId, currentRoomState.timeLeft);

        if (currentRoomState.timeLeft <= 0) {
            console.log(`[Timer ${roomId}] Timer ${intervalId} ended.`);
            clearInterval(intervalId); // ★ ここでクリア
            currentRoomState.timer = null; // ★ nullをセット
            onEnd(roomId);
        }
    }, actualTickInterval);

    // ★ 作成したインターバルIDを roomState に保存
    roomState.timer = intervalId;
};

/**
 * 指定されたルームでランダムな武器を選択する
 */
export const selectRandomWeapon = async (roomId: string, team: 'alpha' | 'bravo'): Promise<void> => {
    console.log(`[Random Select ${roomId}] Attempting random select for team ${team}...`);
    const roomState = gameRooms.get(roomId);
    if (!roomState || roomState.phase !== 'pick') return;

    try {
        const availableWeapons = roomState.weapons.filter(weapon =>
            !weapon.selectedBy &&
            !weapon.bannedBy.includes(team) // 自分が禁止してない
            // && weapon.bannedBy.length === 0 // 必要なら「誰も禁止してない」条件を追加
        );
        console.log(`[Random Select ${roomId}] Found ${availableWeapons.length} available weapons for team ${team}.`);

        if (availableWeapons.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableWeapons.length);
            const weaponToSelect = availableWeapons[randomIndex];
            const masterWeaponInfo = masterWeapons.find(mw => mw.id === weaponToSelect.id);

            console.log(`[Random Select ${roomId}] Team ${team} timed out. Selecting: ${masterWeaponInfo?.name} (ID: ${weaponToSelect.id})`);
            weaponToSelect.selectedBy = team; // メモリ上の状態を更新
            console.log(`[Random Select ${roomId}] Weapon ${weaponToSelect.id} state updated in room memory.`);

            io.to(roomId).emit('update weapon', { /* ... */ });
            handleSuccessfulPick(roomId, team); // ★ 引数 roomId を渡す
        } else {
            console.log(`[Random Select ${roomId}] Team ${team} timed out. No available weapons for them.`);
            handleSuccessfulPick(roomId, team); // ★ 引数 roomId を渡す
        }
    } catch (error) {
        console.error(`[Random Select ${roomId}] Error for team ${team}:`, error);
        handleSuccessfulPick(roomId, team); // ★ 引数 roomId を渡す
    }
};

/**
 * 指定されたルームでの禁止成功処理
 */
export const handleSuccessfulBan = (roomId: string, team: 'alpha' | 'bravo'): void => {
    const roomState = gameRooms.get(roomId);
    if (!roomState || roomState.phase !== 'ban') return;
    console.log(`[App Logic ${roomId}] handleSuccessfulBan called for team: ${team}.`);

    if (roomState.banPhaseState.bans[team] < roomState.banPhaseState.maxBansPerTeam) {
        roomState.banPhaseState.bans[team]++;
        console.log(`[Ban Count ${roomId}] Updated. Counts: A=${roomState.banPhaseState.bans.alpha}, B=${roomState.banPhaseState.bans.bravo}`);
        io.to(roomId).emit('phase change', getPublicRoomState(roomState));

        const alphaReachedMax = roomState.banPhaseState.bans.alpha >= roomState.banPhaseState.maxBansPerTeam;
        const bravoReachedMax = roomState.banPhaseState.bans.bravo >= roomState.banPhaseState.maxBansPerTeam;
        if (alphaReachedMax && bravoReachedMax) {
            console.log(`[Ban End ${roomId}] Both teams reached max bans. Calling endBanPhase...`);
            if(roomState.timer) { clearInterval(roomState.timer); roomState.timer = null; }
            endBanPhase(roomId); // ★ 引数 roomId を渡す
        }
    } else {
         console.warn(`[App Logic ${roomId}] handleSuccessfulBan called for ${team}, but limit already reached.`);
    }
};

/**
 * 指定されたルームでのピック成功/時間切れ処理
 */
export const handleSuccessfulPick = (roomId: string, team: 'alpha' | 'bravo'): void => {
    const roomState = gameRooms.get(roomId);
    if (!roomState || roomState.phase !== 'pick') return;
    console.log(`[App Logic ${roomId}] handleSuccessfulPick called for team: ${team}.`);

    if (!roomState.turnActionTaken[team]) {
        roomState.turnActionTaken[team] = true;
        roomState.pickPhaseState.picks[team]++;
        console.log(`[Pick Count ${roomId}] ${team}: ${roomState.pickPhaseState.picks[team]}`);

        if (roomState.timer && roomState.currentTurn === team) {
            console.log(`[App Logic ${roomId}] Clearing current timer for ${team}.`);
            clearInterval(roomState.timer);
            roomState.timer = null;
        }
        console.log(`[App Logic ${roomId}] Calling switchPickTurn().`);
        switchPickTurn(roomId); // ★ 引数 roomId を渡す
    } else {
        console.log(`[App Logic ${roomId}] Action already taken for team ${team}. Ignoring.`);
    }
};

/**
 * 指定されたルームのピックターンを切り替える
 */
export const switchPickTurn = (roomId: string): void => {
    const roomState = gameRooms.get(roomId);
    if (!roomState || roomState.phase !== 'pick') return;
    console.log(`[Switch Turn ${roomId}] Function called. Turn before: ${roomState.currentPickTurnNumber}`);

    if (roomState.timer) { clearInterval(roomState.timer); roomState.timer = null; }

    // const previousTurnPlayer = roomState.currentTurn; // これは時間切れ処理用
    roomState.currentPickTurnNumber++;
    console.log(`[Switch Turn ${roomId}] Incremented pick turn to ${roomState.currentPickTurnNumber}`);

    if (roomState.currentPickTurnNumber > TOTAL_PICK_TURNS) {
        console.log(`[Pick End ${roomId}] Max pick turns reached. Setting phase to pick_complete.`);
        roomState.phase = 'pick_complete';
        roomState.currentTurn = null;
        roomState.timeLeft = 0;
        io.to(roomId).emit('phase change', getPublicRoomState(roomState));
        return;
    }

    roomState.currentTurn = roomState.currentTurn === 'alpha' ? 'bravo' : 'alpha';
    roomState.turnActionTaken = { alpha: false, bravo: false };
    console.log(`[Switch Turn ${roomId}] Switched turn to ${roomState.currentTurn}.`);

    startRoomTimer(roomId, PICK_PHASE_TURN_DURATION,
        (rId, timeLeft) => io.to(rId).emit('time update', timeLeft),
        async (rId) => { // onEnd (時間切れ)
            const timedOutRoomState = gameRooms.get(rId); // ★ 最新の状態を取得
            if (!timedOutRoomState) return;
            const timedOutPlayer = timedOutRoomState.currentTurn;
            console.log(`[Timer End ${rId}] Pick turn ${timedOutRoomState.currentPickTurnNumber} (Player: ${timedOutPlayer}) timed out.`);
            if (timedOutPlayer && !timedOutRoomState.turnActionTaken[timedOutPlayer]) {
                console.log(`[Timer End ${rId}] Action NOT taken. Selecting randomly...`);
                await selectRandomWeapon(rId, timedOutPlayer); // ★ 引数 rId を渡す
            } else {
                 console.log(`[Timer End ${rId}] Action WAS taken or no player assigned.`);
            }
        }
    );

    console.log(`[Switch Turn ${roomId}] Emitting phase change.`);
    io.to(roomId).emit('phase change', getPublicRoomState(roomState));
};

/**
 * 指定されたルームの禁止フェーズを終了し、ピックフェーズを開始する
 */
export const endBanPhase = (roomId: string): void => {
    const roomState = gameRooms.get(roomId);
    if (!roomState || roomState.phase !== 'ban') return;
    console.log(`[Ban End ${roomId}] Ending ban phase. Starting pick phase...`);

    if (roomState.timer) { clearInterval(roomState.timer); roomState.timer = null; }

    roomState.phase = 'pick';
    roomState.currentTurn = null; // switchPickTurn で設定
    roomState.currentPickTurnNumber = 0; // switchPickTurn で設定
    roomState.pickPhaseState.picks = { alpha: 0, bravo: 0 };
    roomState.turnActionTaken = { alpha: false, bravo: false };

    // 最終的な禁止情報を通知 (任意)
    // io.to(roomId).emit('initial weapons', roomState.weapons);

    console.log(`[Ban End ${roomId}] Calling switchPickTurn() to start the first pick turn.`);
    switchPickTurn(roomId); // ★ 引数 roomId を渡す
};