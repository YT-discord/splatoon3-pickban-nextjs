
import { Server } from 'socket.io';
import { RoomGameState, RoomUser, RoomWeaponState, PublicRoomGameState, MasterWeapon, Team } from '../common/types/game';
import {
    MAX_BANS_PER_TEAM, MAX_PICKS_PER_TEAM, TOTAL_PICK_TURNS, BAN_PHASE_DURATION,
    PICK_PHASE_TURN_DURATION, USE_FAST_TIMER, FAST_TIMER_MULTIPLIER, DEFAULT_ROOM_NAMES, ROOM_IDS, STAGES_DATA, RULES_DATA
} from '../common/types/constants';

// タイムアウト関連の定数
export const ROOM_TIMEOUT_DURATION = 15 * 60 * 1000; // 15分 (ミリ秒)
export const ROOM_CHECK_INTERVAL = 5 * 60 * 1000; // 5分 (ミリ秒)

// --- モジュールスコープ変数 ---
let io: Server;
let gameRooms: Map<string, RoomGameState>;
let masterWeapons: MasterWeapon[];
let recordGameResultCallback: ((roomId: string) => Promise<void>) | null = null;

export const initializeGameLogic = (
    socketIo: Server,
    roomsMap: Map<string, RoomGameState>,
    masterWeaponsList: MasterWeapon[],
    recordGameResultFunc: (roomId: string) => Promise<void> // ★ 引数を追加
): void => {
    io = socketIo;
    gameRooms = roomsMap;
    masterWeapons = masterWeaponsList;
    recordGameResultCallback = recordGameResultFunc; // ★ 受け取った関数を保存
    console.log('[Game Logic] Initialized.');
};

// =============================================
// == ルーム状態操作 & ゲームロジック関数群 ==
// =============================================

export const initializeRoomState = (roomId: string, existingUsers?: Map<string, RoomUser>, initialRoomName?: string): RoomGameState => {
    console.log(`[Game Logic] Initializing basic room state for: ${roomId}`);
    const existingRoomState = gameRooms.get(roomId);
    if (existingRoomState?.timer) {
        clearInterval(existingRoomState.timer);
    }

    const roomIndex = ROOM_IDS.indexOf(roomId);
    const defaultName = (roomIndex !== -1 && roomIndex < DEFAULT_ROOM_NAMES.length)
        ? DEFAULT_ROOM_NAMES[roomIndex]
        : roomId;
    const roomNameToSet = initialRoomName ?? defaultName;

    const initialWeapons: RoomWeaponState[] = masterWeapons.map(mw => ({
        id: mw.id,
        selectedBy: null,
        bannedBy: [],
    }));

    // ★ 既存ユーザーを引き継ぐ場合、ホストも引き継ぐか検討が必要
    //   今回はリセット時は全員 observer になる運用なので、新規Mapで良い
    const initialUsers = new Map<string, RoomUser>(); // 新規作成
    // もし既存ユーザーを引き継ぎたい場合はコメントアウトを外す
    // const initialUsers = existingRoomState?.connectedUsers ?? new Map<string, RoomUser>();

    const newState: RoomGameState = {
        roomId: roomId,
        roomName: roomNameToSet,
        phase: 'waiting',
        timeLeft: 0,
        currentTurn: null,
        currentPickTurnNumber: 0,
        timer: null,
        turnActionTaken: { alpha: false, bravo: false },
        bannedWeaponsOrder: { alpha: [], bravo: [] }, // ★ BAN順序の初期化
        banPhaseState: { bans: { alpha: 0, bravo: 0 }, maxBansPerTeam: MAX_BANS_PER_TEAM },
        pickedWeaponsOrder: { alpha: [], bravo: [] }, // ★ PICK順序の初期化
        pickPhaseState: { picks: { alpha: 0, bravo: 0 }, maxPicksPerTeam: MAX_PICKS_PER_TEAM },
        weapons: initialWeapons,
        connectedUsers: existingUsers ? new Map(existingUsers) : new Map<string, RoomUser>(),
        selectedStageId: 'random',
        selectedRuleId: 'random',
        hostId: null,
        lastActivityTime: Date.now(),
        randomStagePool: STAGES_DATA.map(stage => stage.id),
        randomRulePool: RULES_DATA.map(rule => rule.id)
    };
    gameRooms.set(roomId, newState);
    return newState;
};

export const electNewHost = (roomId: string): void => {
    const roomState = gameRooms.get(roomId);
    if (!roomState) return;

    const currentUsers = Array.from(roomState.connectedUsers.values()); // Map からユーザー配列を取得
    if (currentUsers.length > 0) {
        // 単純に配列の最初のユーザーを新しいホストにする
        const newHost = currentUsers[0];
        roomState.hostId = newHost.id;
        roomState.randomStagePool = STAGES_DATA.map(stage => stage.id);
        roomState.randomRulePool = RULES_DATA.map(rule => rule.id);
        console.log(`[Host Election ${roomId}] New host elected: ${newHost.name} (${newHost.id})`);
        // ★ ホスト変更をクライアントに通知 (新しいイベント)
        io.to(roomId).emit('host changed', { hostId: newHost.id, hostName: newHost.name });
        // ★ 状態更新も通知 (hostId が変わったため)
        io.to(roomId).emit('room state update', getPublicRoomState(roomState));
    } else {
        roomState.hostId = null;
        const roomIndex = ROOM_IDS.indexOf(roomId);
        const defaultRoomName = (roomIndex !== -1 && roomIndex < DEFAULT_ROOM_NAMES.length)
            ? DEFAULT_ROOM_NAMES[roomIndex]
            : roomId;
        // 名前が既にデフォルト名でなければ変更し通知
        if (roomState.roomName !== defaultRoomName) {
            console.log(`[Host Election ${roomId}] No users left, resetting room name to default: "${defaultRoomName}".`);
            roomState.roomName = defaultRoomName;
            // 名前変更も room state update で通知される
        } else {
            console.log(`[Host Election ${roomId}] No users left, host set to null. Room name already default.`);
        }
        io.to(roomId).emit('host changed', { hostId: null, hostName: null });
        io.to(roomId).emit('room state update', getPublicRoomState(roomState));
    }
};

export const resetRoom = (roomId: string, triggeredBy?: 'user' | 'timeout' | 'system'): RoomGameState | null => { // ★ 戻り値を変更
    console.log(`[Game Logic] Resetting room: ${roomId}` + (triggeredBy ? ` (Triggered by: ${triggeredBy})` : ''));
    const currentRoomState = gameRooms.get(roomId);
    if (!currentRoomState) {
        console.error(`[Reset Room ${roomId}] Room not found.`);
        return null; // ルームが存在しなければ null を返す
    }

    // 1. タイムアウト時はユーザー情報を保持しない (全員退出扱いのため)
    //    ユーザー操作によるリセットの場合は保持する
    const usersToKeep = triggeredBy === 'timeout' ? new Map<string, RoomUser>() : new Map(currentRoomState.connectedUsers);
    if (triggeredBy === 'timeout') {
        console.log(`[Game Logic Reset ${roomId}] Timeout reset. All users will be effectively removed from this room state.`);
    }
    const currentRoomName = currentRoomState.roomName;

    // 2. 新しい基本状態を作成 (ユーザー情報はまだ空)
    const newState = initializeRoomState(roomId, usersToKeep, currentRoomName);

    // 3. 保持していたユーザー情報を新しい状態にセットし、チームをリセット
    // タイムアウトでない場合のみ、既存ユーザーを観戦者にする
    if (triggeredBy !== 'timeout') {
        newState.bannedWeaponsOrder = { alpha: [], bravo: [] }; // ★ リセット
        newState.pickedWeaponsOrder = { alpha: [], bravo: [] }; // ★ リセット
        newState.connectedUsers.forEach(user => {
            user.team = 'observer';
        });
    }

    // 4. 新しい状態を gameRooms に保存
    gameRooms.set(roomId, newState);

    // 5. 新しいホストを選出 (ユーザー情報がセットされた後に行う)
    electNewHost(roomId); // これで newState.hostId が設定される

    // 6. クライアントに通知
    const publicState = getPublicRoomState(newState);

    if (triggeredBy === 'timeout') {
        io.to(roomId).emit('system message', { type: 'room_timeout', message: `ルーム "${roomId}" は一定時間操作がなかったためリセットされました。` });
        // ★ タイムアウト時は、クライアント側でルーム退出処理を促すイベントを発行する
        //    または、サーバー側で強制的に Socket.IO のルームから leave させる
        //    ここではクライアントに通知し、クライアント側での対応を促す例
        io.to(roomId).emit('force leave room', { reason: 'room_timeout' });
        console.log(`[Game Logic Reset ${roomId}] Emitted 'force leave room' due to timeout.`);
    } else {
        // ユーザー操作やシステムによるリセットの場合
        io.to(roomId).emit('initial state', publicState);
        io.to(roomId).emit('initial weapons', newState.weapons);
        newState.connectedUsers.forEach(user => { io.to(roomId).emit('user updated', user); });
    }
    // ユーザー操作によるリセット通知は app.ts 側で行う

    console.log(`[Game Logic] Room ${roomId} reset. Name kept: "${newState.roomName}", Users: ${newState.connectedUsers.size}, New Host: ${newState.hostId}`);
    return newState; // ★ 更新された状態を返す
};

// ★★★★★ 追加: ランダムステージプール更新関数 ★★★★★
export const updateRandomStagePool = (roomId: string, stageId: number): boolean => {
    const roomState = gameRooms.get(roomId);
    if (!roomState) return false;

    const pool = roomState.randomStagePool;
    const index = pool.indexOf(stageId);

    if (index > -1) {
        // 既に含まれていれば削除
        pool.splice(index, 1);
        console.log(`[Random Pool ${roomId}] Stage ${stageId} removed. New size: ${pool.length}`);
    } else {
        // 含まれていなければ追加
        pool.push(stageId);
        console.log(`[Random Pool ${roomId}] Stage ${stageId} added. New size: ${pool.length}`);
    }
    // pool.sort((a, b) => a - b); // 任意: ID順にソートしておく

    roomState.lastActivityTime = Date.now(); // アクティビティ時刻更新

    // 変更をルーム全員に通知
    io.to(roomId).emit('room state update', getPublicRoomState(roomState));
    return true;
};

// ★★★★★ 追加: ランダムプールを一括設定する関数 ★★★★★
export const setRandomPool = (roomId: string, type: 'stage' | 'rule', itemIds: number[]): boolean => {
    const roomState = gameRooms.get(roomId);
    if (!roomState) {
        console.error(`[Set Random Pool ${roomId}] Room not found.`);
        return false;
    }

    // itemIds のバリデーション (存在するIDのみにフィルタリングし、重複を排除)
    const sourceData = type === 'stage' ? STAGES_DATA : RULES_DATA;
    const allSourceIds = sourceData.map(item => item.id);
    const validItemIds = [...new Set(itemIds.filter(id => allSourceIds.includes(id)))];

    if (type === 'stage') {
        roomState.randomStagePool = validItemIds;
        console.log(`[Set Random Pool ${roomId}] Stage pool updated with ${validItemIds.length} items: [${validItemIds.join(', ')}]`);
    } else { // type === 'rule'
        roomState.randomRulePool = validItemIds;
        console.log(`[Set Random Pool ${roomId}] Rule pool updated with ${validItemIds.length} items: [${validItemIds.join(', ')}]`);
    }

    roomState.lastActivityTime = Date.now(); // アクティビティ時刻更新

    // 変更をルーム全員に通知
    io.to(roomId).emit('room state update', getPublicRoomState(roomState));
    console.log(`[Set Random Pool ${roomId}] Emitted 'room state update'.`);
    return true;
};


// ゲーム開始時のランダムステージ選択ロジック
// (このロジックは start game イベントハンドラ内に移動しても良い)
export const determineStartingStage = (roomId: string): number | 'random' | null | 'error' => {
    const roomState = gameRooms.get(roomId);
    if (!roomState) return null; // エラーまたは未選択

    if (roomState.selectedStageId === 'random') {
        const pool = roomState.randomStagePool;
        if (pool.length === 0) {
            console.error(`[Start Game ${roomId}] Random stage selected but pool is empty!`);
            return 'error'; // プールが空の場合はエラーを示す
        }
        const randomIndex = Math.floor(Math.random() * pool.length);
        const selectedId = pool[randomIndex];
        console.log(`[Start Game ${roomId}] Random stage selected from pool: ${STAGES_DATA.find(s => s.id === selectedId)?.name} (ID: ${selectedId})`);
        return selectedId; // 選択された数値 ID を返す
    } else {
        // 'random' 以外が選択されている場合はそれをそのまま返す
        return roomState.selectedStageId;
    }
};

export const updateRandomRulePool = (roomId: string, ruleId: number): boolean => {
    const roomState = gameRooms.get(roomId);
    if (!roomState) return false;
    const pool = roomState.randomRulePool;
    const index = pool.indexOf(ruleId);

    if (index > -1) {
        // 既に含まれていれば削除
        pool.splice(index, 1);
        console.log(`[Random Pool ${roomId}] Rule ${ruleId} removed. New size: ${pool.length}`);
    } else {
        // 含まれていなければ追加
        pool.push(ruleId);
        console.log(`[Random Pool ${roomId}] Rule ${ruleId} added. New size: ${pool.length}`);
    }
    console.log(`[Random Pool ${roomId}] Rule ${ruleId} ${pool.includes(ruleId) ? 'added' : 'removed'}. New size: ${pool.length}`);
    roomState.lastActivityTime = Date.now();
    io.to(roomId).emit('room state update', getPublicRoomState(roomState));
    return true;
};

// ★★★★★ 追加: determineStartingRule 関数 ★★★★★
export const determineStartingRule = (roomId: string): number | 'random' | null | 'error' => {
    const roomState = gameRooms.get(roomId);
    if (!roomState) return null;
    if (roomState.selectedRuleId === 'random') {
        const pool = roomState.randomRulePool;
        // ★★★★★ 変更点: プールが1つ以下の場合の考慮 ★★★★★
        if (pool.length === 0) {
            console.error(`[Start Game ${roomId}] Random rule selected but pool is empty!`);
            return 'error';
        }
        // ★ ランダム対象が1つの場合も、その1つを選択する（ランダムではない警告はクライアント側）
        const randomIndex = Math.floor(Math.random() * pool.length);
        const selectedId = pool[randomIndex];
        console.log(`[Start Game ${roomId}] Random rule selected from pool: ${RULES_DATA.find(r => r.id === selectedId)?.name} (ID: ${selectedId})`);
        return selectedId;
    } else {
        return roomState.selectedRuleId;
    }
};

export const changeRoomName = (roomId: string, newName: string): boolean => {
    const roomState = gameRooms.get(roomId);
    if (!roomState) {
        console.error(`[Change Room Name ${roomId}] Room not found.`);
        return false;
    }

    roomState.roomName = newName;
    roomState.lastActivityTime = Date.now(); // 名前変更もアクティビティとみなす
    console.log(`[Change Room Name ${roomId}] Name changed to "${newName}". Last activity updated.`);

    // 変更をルーム全員に通知 (room state update で新しい名前が伝わる)
    io.to(roomId).emit('room state update', getPublicRoomState(roomState));

    return true;
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
        bannedWeaponsOrder: roomState.bannedWeaponsOrder, // ★ 追加
        pickCounts: roomState.pickPhaseState.picks,
        pickedWeaponsOrder: roomState.pickedWeaponsOrder, // ★ 追加
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

export const selectRandomWeapon = async (roomId: string, team: Team): Promise<void> => {
    console.log(`[Random Select ${roomId}] Attempting random select for team ${team}...`);
    const roomState = gameRooms.get(roomId);
    if (!roomState || roomState.phase !== 'pick') return;

    try {
        const availableWeapons = roomState.weapons.filter(weapon => // NOSONAR
            !weapon.selectedBy &&
            weapon.bannedBy.length === 0 // BANされていない武器のみ
        );
        console.log(`[Random Select ${roomId}] Found ${availableWeapons.length} available weapons.`);

        if (availableWeapons.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableWeapons.length);
            const weaponToSelect = availableWeapons[randomIndex];
            const selectedId = weaponToSelect.id;
            const masterWeaponInfo = masterWeapons.find(mw => mw.id === weaponToSelect.id);

            console.log(`[Random Select ${roomId}] Team ${team} timed out. Selecting: ${masterWeaponInfo?.name} (ID: ${selectedId})`);
            weaponToSelect.selectedBy = team;
            console.log(`[Random Select ${roomId}] Weapon ${selectedId} state updated in room memory.`);

            // ★ ランダム選択後も武器状態を通知
            const updatedWeaponState: RoomWeaponState = { id: weaponToSelect.id, selectedBy: weaponToSelect.selectedBy, bannedBy: weaponToSelect.bannedBy };
            io.to(roomId).emit('update weapon', updatedWeaponState);

            // 成功処理を呼ぶ (Pickカウント増加、ターン進行)
            handleSuccessfulPick(roomId, team, selectedId); // ★ 選択した武器のIDを渡す
        } else {
            console.log(`[Random Select ${roomId}] Team ${team} timed out. No available weapons.`);
            // 選択できる武器がなくてもターンは進める
            handleSuccessfulPick(roomId, team, null); // ★ 武器が選択されなかったのでnullを渡す
        }
    } catch (error) {
        console.error(`[Random Select ${roomId}] Error for team ${team}:`, error);
        // エラーでもターンは進める
        handleSuccessfulPick(roomId, team, null); // ★ エラー時はnullを渡す
    }
};

export const handleSuccessfulBan = (roomId: string, team: Team, bannedWeaponId: number): void => { // ★ bannedWeaponId を引数に追加
    const roomState = gameRooms.get(roomId);
    if (!roomState || roomState.phase !== 'ban') return;
    console.log(`[Game Logic ${roomId}] handleSuccessfulBan called for team: ${team}.`);

    // ★ BANされた武器のIDを順番に記録
    if (!roomState.bannedWeaponsOrder[team].includes(bannedWeaponId)) {
        roomState.bannedWeaponsOrder[team].push(bannedWeaponId);
    }

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
        if (roomState.timer) { clearInterval(roomState.timer); roomState.timer = null; }
        endBanPhase(roomId);
    }
};

export const handleSuccessfulPick = (roomId: string, team: Team, pickedWeaponId: number | null): void => { // ★ pickedWeaponId を引数に追加し、型を number | null に変更
    const roomState = gameRooms.get(roomId);
    if (!roomState || roomState.phase !== 'pick') return;
    console.log(`[Game Logic ${roomId}] handleSuccessfulPick called for team: ${team}. Weapon ID: ${pickedWeaponId}`);

    // このターンでまだアクションしていない場合のみ処理
    if (!roomState.turnActionTaken[team]) {
        roomState.turnActionTaken[team] = true; // アクション済みフラグを立てる
        roomState.pickPhaseState.picks[team]++; // Pick カウントを増やす

        // ★ PICKされた武器のIDを順番に記録 (nullでない場合のみ)
        if (pickedWeaponId !== null && !roomState.pickedWeaponsOrder[team].includes(pickedWeaponId)) {
            roomState.pickedWeaponsOrder[team].push(pickedWeaponId);
        }
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
        // ★★★★★ ゲーム結果記録コールバックを呼び出す ★★★★★
        if (recordGameResultCallback) {
            recordGameResultCallback(roomId).catch(err => {
                console.error(`[Pick End ${roomId}] Error calling recordGameResultCallback:`, err);
            });
        }
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        roomState.timeLeft = 0;
        roomState.lastActivityTime = Date.now();
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

export const checkRoomTimeouts = (): string[] => { // 戻り値を string[] に変更
    const now = Date.now();
    // console.log(`[Timeout Check] Running check at ${new Date(now).toLocaleTimeString()}`);
    let resetCount = 0;
    const timedOutRoomIds: string[] = []; // タイムアウトしたルームIDを格納する配列

    gameRooms.forEach((roomState, roomId) => {
        if (roomState.phase === 'waiting' || roomState.phase === 'pick_complete') {
            const timeSinceLastActivity = now - roomState.lastActivityTime;
            if (timeSinceLastActivity > ROOM_TIMEOUT_DURATION) {
                console.log(`[Timeout Check ${roomId}] Room timed out (Phase: ${roomState.phase}, Elapsed: ${Math.round(timeSinceLastActivity / 60000)}min). Resetting...`);
                const resetResultState = resetRoom(roomId, 'timeout');
                if (resetResultState) {
                    timedOutRoomIds.push(roomId); // タイムアウトしたIDを追加
                    // タイムアウト後、ルーム内のユーザーのグローバル情報を更新する必要がある
                    // (app.ts 側で connectedUsersGlobal から該当ユーザーを削除するなど)
                    // この情報は gameLogic から直接は操作できないため、app.ts 側で対応が必要
                    io.to(roomId).emit('room_timed_out_server_reset'); // app.ts側で処理するためのイベント
                } resetCount++;
            }
        }
    });

    if (resetCount > 0) {
        console.log(`[Timeout Check] Finished. Reset ${resetCount} room(s).`);
    }
    return timedOutRoomIds; // タイムアウトしたルームIDのリストを返す
};