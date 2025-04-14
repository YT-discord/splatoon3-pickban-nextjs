// reactnext/server/app.ts (修正後)
import express, { Application, Request, Response, NextFunction } from 'express'; // ★ Request, Response, NextFunction をインポート
import { sequelize, initializeDB, getMasterWeapons } from './config/database';
import { errorHandler } from './middlewares/errorHandler';
import 'reflect-metadata';
import cors from 'cors';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import type { ConnectedUserInfo, RoomUser, RoomGameState, PublicRoomGameState, MasterWeapon, RoomWeaponState, Team } from '../common/types/game'; // ★ Team をインポート
import { ROOM_IDS, MAX_USERS_PER_ROOM, MAX_BANS_PER_TEAM, BAN_PHASE_DURATION, PICK_PHASE_TURN_DURATION } from '../common/types/constants'; // ★ PICK_PHASE_TURN_DURATION もインポート
import * as GameLogic from './gameLogic';

const app: Application = express();
const server = http.createServer(app);

// --- CORS 設定 ---
const corsOptions = { origin: 'http://localhost:3000', credentials: true, optionsSuccessStatus: 200 };
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 静的ファイル配信 (画像用) ---
app.use('/images', express.static(path.join(__dirname, '..', 'public/images')));
console.log(`Serving static files from: ${path.join(__dirname, '..', 'public/images')}`);

// --- Socket.IO サーバー設定 ---
export const io = new Server(server, { cors: corsOptions });

// --- グローバル状態管理 ---
const gameRooms = new Map<string, RoomGameState>();
const connectedUsersGlobal = new Map<string, ConnectedUserInfo>();
let masterWeapons: MasterWeapon[] = [];

// ==================================
// == API ルート定義 ==
// ==================================

// --- ルーム一覧取得 API ---
app.get('/api/v1/rooms', (req: Request, res: Response) => { // ★ Request, Response 型を明示
    console.log('[API] Request received for /api/v1/rooms');
    const roomList = ROOM_IDS.map(roomId => {
        const roomState = gameRooms.get(roomId);
        return {
            roomId: roomId,
            userCount: roomState ? roomState.connectedUsers.size : 0,
            phase: roomState ? roomState.phase : 'waiting',
            maxUsers: MAX_USERS_PER_ROOM,
        };
    });
    res.json(roomList);
});

// --- マスター武器取得 API ---
app.get('/api/v1/master-weapons', async (req: Request, res: Response, next: NextFunction) => { // ★ Request, Response, NextFunction 型を明示
    try {
        console.log('[API] Request received for /api/v1/master-weapons');
        if (masterWeapons && masterWeapons.length > 0) {
             res.json(masterWeapons); // メモリから返す
        } else {
             // メモリにない場合、DBから取得 (フォールバック)
             const weaponsFromDb = await getMasterWeapons();
             masterWeapons = weaponsFromDb; // 取得したらキャッシュしておく
             res.json(weaponsFromDb);
        }
    } catch (error) {
        console.error('[API] Error fetching master weapons:', error);
        next(error); // エラーハンドリングミドルウェアに渡す
    }
});

// --- ヘルスチェックエンドポイント (任意) ---
app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
    });
  });

// ==================================
// == Socket.IO イベントハンドラ ==
// ==================================

io.on('connection', (socket: Socket) => {
    const socketId = socket.id;
    console.log(`[Connect] User connected: ${socketId}`);
    const newUserInfo: ConnectedUserInfo = { socketId: socketId, roomId: null };
    connectedUsersGlobal.set(socketId, newUserInfo);
    // console.log('[Connect] Current global users:', Array.from(connectedUsersGlobal.keys()));

        // --- ★ クライアントからの初期データ要求に応答 ---
        socket.on('request initial data', (data: { roomId: string }) => {
            const userInfo = connectedUsersGlobal.get(socketId);
            // ユーザーが存在し、要求されたルームIDと参加中のルームIDが一致するか確認
            if (userInfo && userInfo.roomId === data.roomId) {
                const roomState = gameRooms.get(data.roomId);
                if (roomState) {
                    console.log(`[Initial Data] Sending initial state and weapons to ${socketId} for room ${data.roomId}`);
                    // ★ 要求元のクライアントにのみ送信 (socket.emit を使用)
                    socket.emit('initial state', GameLogic.getPublicRoomState(roomState));
                    socket.emit('initial weapons', roomState.weapons);
                    // ★ 自分の最新情報も送る (チーム情報などを反映させるため)
                    const roomUser = roomState.connectedUsers.get(socketId);
                    if (roomUser) {
                        socket.emit('user updated', roomUser);
                    }
                } else {
                    // サーバー側でルームが見つからない場合 (通常は起こらないはず)
                    console.error(`[Initial Data] Room state not found for ${data.roomId} requested by ${socketId}`);
                    socket.emit('action failed', { reason: `ルーム ${data.roomId} の状態が見つかりません。` });
                }
            } else {
                 // 不正な要求 (別のルームの情報を要求、またはユーザー情報がない)
                 console.warn(`[Initial Data] User ${socketId} requested data for unauthorized/invalid room ${data.roomId}. UserInfo:`, userInfo);
                 // 必要ならエラーを返す
                 // socket.emit('action failed', { reason: '不正なデータ要求です。'});
            }
        });

    // --- ルーム参加 ---
    socket.on('join room', (data: { roomId: string; name: string }) => {
        // ★ バリデーション: roomId と name が存在し、文字列であることを確認
        if (!data || typeof data.roomId !== 'string' || typeof data.name !== 'string') {
            console.log(`[Join Room] Invalid data received from ${socketId}:`, data);
            socket.emit('join room failed', { roomId: data?.roomId, reason: '無効なリクエストデータです' });
            return;
        }

        const { roomId, name } = data;
        const trimmedName = name.trim(); // ★ trim 処理を追加
        console.log(`[Join Room] User ${socketId} requests to join room ${roomId} as ${trimmedName}`);
        const userInfo = connectedUsersGlobal.get(socketId);

        if (!ROOM_IDS.includes(roomId)) {
            console.log(`[Join Room] Invalid roomId: ${roomId}`);
            socket.emit('join room failed', { roomId, reason: '無効なルームIDです' });
            return;
        }
        let roomState = gameRooms.get(roomId); // ★ let で再代入可能に
        if (!roomState) {
             console.error(`[Join Room] Room state for ${roomId} not found! Initializing...`);
             roomState = GameLogic.initializeRoomState(roomId); // ★ 初期化し、roomState 変数に代入
             if (!roomState) { // さらにチェック
                console.error(`[Join Room] Failed to initialize room state for ${roomId}!`);
                socket.emit('join room failed', { roomId, reason: 'ルーム初期化エラー' });
                return;
             }
        }
         if (!userInfo) {
             console.error(`[Join Room] User info for ${socketId} not found!`);
             socket.emit('join room failed', { roomId, reason: 'ユーザー情報が見つかりません' });
             return;
         }
         if (roomState.connectedUsers.size >= MAX_USERS_PER_ROOM) {
            socket.emit('join room failed', { roomId, reason: '満員です' }); return;
         }
         if (!trimmedName) { // ★ trim 後の名前でチェック
            socket.emit('join room failed', { roomId, reason: '名前を入力してください' }); return;
         }
         // ★ 名前重複チェック (任意)
         const nameExists = Array.from(roomState.connectedUsers.values()).some(user => user.name === trimmedName);
         if (nameExists) {
             socket.emit('join room failed', { roomId, reason: 'その名前は既に使用されています' }); return;
         }

        // 以前のルームから退出
        if (userInfo.roomId && userInfo.roomId !== roomId) {
            const oldRoomId = userInfo.roomId;
            socket.leave(oldRoomId);
            const oldRoomState = gameRooms.get(oldRoomId);
            if (oldRoomState) {
                oldRoomState.connectedUsers.delete(socketId);
                io.to(oldRoomId).emit('user left', { userId: socketId });
                io.to(oldRoomId).emit('room state update', GameLogic.getPublicRoomState(oldRoomState));
                console.log(`[Join Room] User ${socketId} left previous room ${oldRoomId}`);
            }
        }

        // ルームに参加
        socket.join(roomId);
        userInfo.roomId = roomId;
        userInfo.name = trimmedName; // ★ trim した名前を保存
        userInfo.team = 'observer'; // デフォルトは観戦者

        // ルーム状態にユーザーを追加
        const roomUser: RoomUser = { id: socketId, name: trimmedName, team: 'observer' };
        roomState.connectedUsers.set(socketId, roomUser);
        console.log(`[Join Room] User ${socketId} (${trimmedName}) joined room ${roomId}. Users: ${roomState.connectedUsers.size}`);

        // 参加成功と状態通知
        socket.emit('join room success', { roomId });
        // // ★ 最新の公開状態と武器状態を送信
        // socket.emit('initial state', GameLogic.getPublicRoomState(roomState));
        // socket.emit('initial weapons', roomState.weapons);
        // // ★ 参加したユーザー自身の情報も送る (myTeam 設定用)
        // socket.emit('user updated', roomUser);
        // ★ 他のユーザーに参加を通知 & 全体の状態更新を通知
        socket.to(roomId).emit('user joined', roomUser);
        io.to(roomId).emit('room state update', GameLogic.getPublicRoomState(roomState));
    });

    // --- チーム選択 ---
    socket.on('select team', (data: { team: Team | 'observer'}) => { // ★ 型を Team | 'observer' に
        const userInfo = connectedUsersGlobal.get(socketId);
        if (!userInfo || !userInfo.roomId) { console.log(`[Select Team] Error: User ${socketId} not found or not in a room.`); return; }

        // ★ バリデーション: team が正しい値か
        if (!data || !['alpha', 'bravo', 'observer'].includes(data.team)) {
            console.log(`[Select Team ${userInfo.roomId}] Invalid team data from ${socketId}:`, data);
            socket.emit('action failed', { reason: '無効なチーム指定です' });
            return;
        }

        const roomId = userInfo.roomId;
        const requestedTeam = data.team;
        const roomState = gameRooms.get(roomId);
        if (!roomState) { console.log(`[Select Team ${roomId}] Error: Room state not found.`); return; }
        const roomUser = roomState.connectedUsers.get(socketId);
        if (!roomUser) { console.log(`[Select Team ${roomId}] Error: User ${socketId} not found in room state.`); return; }

        // ゲーム進行中チェック
        if (roomState.phase !== 'waiting') {
             console.log(`[Select Team ${roomId}] Denied: Not in waiting phase (Phase: ${roomState.phase}).`);
             socket.emit('action failed', { reason: 'ゲーム開始前のみチームを変更できます' });
             return;
        }

        // ★ 人数制限チェック (各チーム最大5人、全体で10人とする例)
        const teamUsers = Array.from(roomState.connectedUsers.values()).filter(u => u.team === requestedTeam);
        const MAX_PLAYERS_PER_TEAM = 5; // 定数化推奨
        if (requestedTeam !== 'observer' && teamUsers.length >= MAX_PLAYERS_PER_TEAM) {
            console.log(`[Select Team ${roomId}] Denied: Team ${requestedTeam} is full (${teamUsers.length}/${MAX_PLAYERS_PER_TEAM}).`);
            socket.emit('action failed', { reason: `チーム ${requestedTeam} は満員です (${MAX_PLAYERS_PER_TEAM}人まで)` });
            return;
        }

        // チーム変更
        roomUser.team = requestedTeam;
        userInfo.team = requestedTeam; // グローバルも更新
        console.log(`[Select Team ${roomId}] User ${socketId} (${userInfo.name}) selected team ${requestedTeam}.`);
        io.to(roomId).emit('user updated', roomUser); // ルーム全員に通知
        // ★ チーム変更後、最新のルーム状態も通知する (チーム構成が変わるため)
        io.to(roomId).emit('room state update', GameLogic.getPublicRoomState(roomState));
    });

     // --- ゲーム開始 ---
     socket.on('start game', () => {
         const userInfo = connectedUsersGlobal.get(socketId);
         if (!userInfo || !userInfo.roomId) return;
         const roomId = userInfo.roomId;
         const roomState = gameRooms.get(roomId);
         if (!roomState) return;
         console.log(`[Start Game ${roomId}] Request from ${socketId} (${userInfo.name}). Phase: ${roomState.phase}`);

         if (roomState.phase === 'waiting') {
             // ★ 開始条件チェック: 各チーム最低1人以上いるか
             const alphaPlayers = Array.from(roomState.connectedUsers.values()).filter(u => u.team === 'alpha');
             const bravoPlayers = Array.from(roomState.connectedUsers.values()).filter(u => u.team === 'bravo');
             if (alphaPlayers.length === 0 || bravoPlayers.length === 0) {
                 console.log(`[Start Game ${roomId}] Denied: Not enough players (Alpha: ${alphaPlayers.length}, Bravo: ${bravoPlayers.length}).`);
                 socket.emit('action failed', { reason: '各チーム最低1人以上のプレイヤーが必要です' });
                 return;
             }

             console.log(`[Start Game ${roomId}] Starting ban phase...`);
             // roomState の更新は GameLogic 内で行う想定に変更しても良い
             roomState.phase = 'ban';
             roomState.currentTurn = null;
             roomState.banPhaseState = { bans: { alpha: 0, bravo: 0 }, maxBansPerTeam: MAX_BANS_PER_TEAM };
             roomState.timeLeft = BAN_PHASE_DURATION; // タイマー初期値設定

             GameLogic.startRoomTimer(roomId, BAN_PHASE_DURATION,
                 (rId, timeLeft) => io.to(rId).emit('time update', { timeLeft }), // ★ オブジェクトで送信
                 (rId) => GameLogic.endBanPhase(rId) // 時間切れ時の処理
             );
             // ★ 最新の公開状態を送信
             io.to(roomId).emit('phase change', GameLogic.getPublicRoomState(roomState));
             console.log(`[Start Game ${roomId}] Emitted phase change to ban.`);
         } else {
              console.log(`[Start Game ${roomId}] Denied: Not in waiting phase.`);
              socket.emit('action failed', { reason: 'ゲームは既に開始されているか、待機状態ではありません' });
         }
     });

     // --- 武器禁止 ---
     socket.on('ban weapon', (data: { weaponId: number }) => { // ★ async 不要
         const userInfo = connectedUsersGlobal.get(socketId);
         if (!userInfo || !userInfo.roomId || !userInfo.team || userInfo.team === 'observer') {
             console.log(`[Ban Weapon] Invalid user state for ${socketId}.`); return;
         }

         // ★ バリデーション: weaponId が数値か
         if (!data || typeof data.weaponId !== 'number') {
             console.log(`[Ban Weapon ${userInfo.roomId}] Invalid data from ${socketId}:`, data);
             socket.emit('action failed', { reason: '無効な武器IDです' });
             return;
         }

         const roomId = userInfo.roomId;
         const team = userInfo.team;
         const weaponId = data.weaponId;
         const roomState = gameRooms.get(roomId);
         if (!roomState) { console.log(`[Ban Weapon ${roomId}] Room state not found.`); return; }
         console.log(`[Ban Weapon ${roomId}] Req from ${socketId}(${team}) for ${weaponId}. Phase: ${roomState.phase}, Turn: ${roomState.currentTurn}`);

         // BAN フェーズ & ターンチェック (もしBANフェーズもターン制にするなら)
         if (roomState.phase !== 'ban') { socket.emit('action failed', { reason: '禁止フェーズではありません'}); return; }
         // if (roomState.currentTurn !== team) { socket.emit('action failed', { reason: 'あなたのターンではありません' }); return; } // ← BANフェーズがターン制の場合

         // 禁止上限チェック
         if (roomState.banPhaseState.bans[team] >= roomState.banPhaseState.maxBansPerTeam) { socket.emit('action failed', { reason: '禁止上限です'}); return; }

         const weapon = roomState.weapons.find(w => w.id === weaponId);
         if (!weapon) { socket.emit('action failed', { reason: '武器が見つかりません'}); return; }
         if (weapon.selectedBy) { socket.emit('action failed', { reason: '既に選択されています'}); return; }
         // 既に自チームが禁止済みかチェック
         if (weapon.bannedBy.includes(team)) { socket.emit('action failed', { reason: '既に禁止しています'}); return; }
         // ★ 仕様変更により相手チームが禁止していても禁止可能

         try {
             weapon.bannedBy.push(team); // メモリ上の状態を更新
             console.log(`[Ban Weapon ${roomId}] Weapon ${weaponId} updated in memory. bannedBy: ${JSON.stringify(weapon.bannedBy)}`);
             // ★ 更新された武器情報のみを送信
             const updatedWeaponState: RoomWeaponState = { id: weapon.id, selectedBy: weapon.selectedBy, bannedBy: weapon.bannedBy };
             io.to(roomId).emit('update weapon', updatedWeaponState);
             console.log(`[Ban Weapon ${roomId}] Emitted 'update weapon'.`);

             GameLogic.handleSuccessfulBan(roomId, team); // ロジック呼び出し (BANカウント増加、フェーズ終了判定など)

             // ★ handleSuccessfulBan 内で phase change が emit されるのでここでは不要
             // socket.emit('ban success', { weaponId }); // 個別成功通知は不要かも

         } catch (error) {
             console.error(`[Ban Weapon ${roomId}] Error:`, error);
             // エラーが発生した場合、状態を元に戻す必要があればここで行う
             // weapon.bannedBy = weapon.bannedBy.filter(t => t !== team); // 例
             socket.emit('action failed', { reason: '禁止処理中にエラーが発生しました' });
         }
     });

     // --- 武器選択 ---
     socket.on('select weapon', (data: { weaponId: number }) => { // ★ async 不要
         const userInfo = connectedUsersGlobal.get(socketId);
         if (!userInfo || !userInfo.roomId || !userInfo.team || userInfo.team === 'observer') {
             console.log(`[Select Weapon] Invalid user state for ${socketId}.`); return;
         }

         // ★ バリデーション: weaponId が数値か
         if (!data || typeof data.weaponId !== 'number') {
            console.log(`[Select Weapon ${userInfo.roomId}] Invalid data from ${socketId}:`, data);
            socket.emit('action failed', { reason: '無効な武器IDです' });
            return;
        }

         const roomId = userInfo.roomId;
         const team = userInfo.team;
         const weaponId = data.weaponId;
         const roomState = gameRooms.get(roomId);
         if (!roomState) { console.log(`[Select Weapon ${roomId}] Room state not found.`); return; }
         console.log(`[Select Weapon ${roomId}] Req from ${socketId}(${team}) for ${weaponId}. Phase: ${roomState.phase}, Turn: ${roomState.currentTurn}`);

          if (roomState.phase !== 'pick') { socket.emit('action failed', { reason: '選択フェーズではありません'}); return; }
          if (roomState.currentTurn !== team) { socket.emit('action failed', { reason: 'あなたのターンではありません'}); return; }
          // ★ turnActionTaken は gameLogic 側で管理・チェックする方が一貫性があるかも
          // if (roomState.turnActionTaken[team]) { socket.emit('action failed', { reason: 'このターンは選択済みです'}); return; }

          const weapon = roomState.weapons.find(w => w.id === weaponId);
          if (!weapon) { socket.emit('action failed', { reason: '武器が見つかりません'}); return; }
          if (weapon.selectedBy) { socket.emit('action failed', { reason: '既に選択されています'}); return; }
          if (weapon.bannedBy.length > 0) { socket.emit('action failed', { reason: '禁止されています'}); return; }

          try {
              weapon.selectedBy = team; // メモリ上の状態を更新
              console.log(`[Select Weapon ${roomId}] Weapon ${weaponId} updated in memory. Selected by ${team}`);

              // ★ 更新された武器情報のみを送信
              const updatedWeaponState: RoomWeaponState = { id: weapon.id, selectedBy: weapon.selectedBy, bannedBy: weapon.bannedBy };
              io.to(roomId).emit('update weapon', updatedWeaponState);
              console.log(`[Select Weapon ${roomId}] Emitted 'update weapon'.`);

              GameLogic.handleSuccessfulPick(roomId, team); // ロジック呼び出し (Pickカウント増加、ターン切り替えなど)

              // ★ handleSuccessfulPick 内で phase change が emit されるのでここでは不要
              // socket.emit('select success', { weaponId }); // 個別成功通知は不要かも
          } catch (error) {
              console.error(`[Select Weapon ${roomId}] Error:`, error);
              // エラーが発生した場合、状態を元に戻す必要があればここで行う
              // weapon.selectedBy = null; // 例
              socket.emit('action failed', { reason: '選択処理中にエラーが発生しました' });
          }
     });

    // --- 切断処理 ---
    socket.on('disconnect', (reason: string) => {
        console.log(`[Disconnect] User disconnected: ${socketId}. Reason: ${reason}`);
        const userInfo = connectedUsersGlobal.get(socketId);
        if (userInfo) {
            const roomId = userInfo.roomId;
            const teamLeft = userInfo.team;
            const userName = userInfo.name; // ★ 名前を取得
            connectedUsersGlobal.delete(socketId);
            // console.log('[Disconnect] Removed from global map.');

            if (roomId) {
                const roomState = gameRooms.get(roomId);
                if (roomState) {
                    const userExisted = roomState.connectedUsers.delete(socketId);
                    if (userExisted) {
                        console.log(`[Disconnect ${roomId}] Removed user ${socketId} (${userName}) from room.`);
                        // ★ 他のユーザーに誰が退出したか通知
                        io.to(roomId).emit('user left', { userId: socketId, name: userName, team: teamLeft }); // ★ name と team も追加
                        // ★ 最新のルーム状態を通知 (参加者数が変わる)
                        io.to(roomId).emit('room state update', GameLogic.getPublicRoomState(roomState));

                        // ゲーム進行中にプレイヤーが抜けた場合の処理
                        if ((teamLeft === 'alpha' || teamLeft === 'bravo') && (roomState.phase === 'pick' || roomState.phase === 'ban')) {
                            console.log(`[Disconnect ${roomId}] Player ${userName}(${socketId}) from team ${teamLeft} left during active phase.`);
                            const remainingPlayersInTeam = Array.from(roomState.connectedUsers.values()).filter(u => u.team === teamLeft);
                            // チームのプレイヤーがいなくなった場合
                            if (remainingPlayersInTeam.length === 0) {
                                console.log(`[Disconnect ${roomId}] No players left in team ${teamLeft}. Resetting room.`);
                                GameLogic.resetRoom(roomId); // リセット
                            }
                            // Pick フェーズで、現在のターンプレイヤーが抜けた場合
                            else if (roomState.phase === 'pick' && roomState.currentTurn === teamLeft) {
                                console.log(`[Disconnect ${roomId}] Current turn player left. Forcing random select/turn switch.`);
                                // ★ タイマーをクリアして即座にターンを進める or ランダム選択
                                if(roomState.timer) { clearInterval(roomState.timer); roomState.timer = null; }
                                // gameLogic側でランダム選択＋ターン進行させるのが良い
                                // GameLogic.handlePlayerDisconnectDuringPick(roomId, teamLeft); のような関数を呼ぶ
                                GameLogic.selectRandomWeapon(roomId, teamLeft); // 現状はランダム選択を呼ぶ
                            }
                             // BAN フェーズで抜けた場合の処理 (必要なら追加)
                             // 例: BAN フェーズがターン制なら Pick と同様の処理
                             // 例: 並行 BAN なら何もしない or 制限時間を短縮？
                        }
                    }
                }
            }
        } else {
            console.log(`[Disconnect] User ${socketId} not found in global map.`);
        }
        // console.log('[Disconnect] Current global users:', Array.from(connectedUsersGlobal.keys()));
    });

     // --- ルームリセット ---
     socket.on('reset room', () => {
         const userInfo = connectedUsersGlobal.get(socketId);
         if (!userInfo || !userInfo.roomId) return;
         console.log(`[Reset Room ${userInfo.roomId}] Request from ${socketId} (${userInfo.name}).`);
         GameLogic.resetRoom(userInfo.roomId);
         // resetRoom 内で初期状態が emit されるはず
     });

}); // End of io.on('connection')

// ==================================
// == Express ミドルウェア & サーバー起動 ==
// ==================================

// --- エラーハンドリングミドルウェア ---
app.use(errorHandler);

// --- 404 ハンドリング (全てのルートの後に置く) ---
app.use((req: Request, res: Response) => { // ★ 型を明示
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.originalUrl} not found`
    });
});

// --- サーバー起動プロセス ---
sequelize
  .authenticate()
  .then(async () => {
    console.log('Database connected');
    await initializeDB(); // DB初期化 (テーブル作成、マスターデータ投入)
    console.log('Loading master weapons into memory...');
    masterWeapons = await getMasterWeapons(); // マスターデータをメモリにロード
    console.log(`Loaded ${masterWeapons.length} master weapons.`);

    // ゲームロジックモジュールの初期化
    GameLogic.initializeGameLogic(io, gameRooms, masterWeapons);

    // 全てのルーム状態をメモリ上に初期化
    console.log('Initializing game rooms state in memory...');
    ROOM_IDS.forEach(roomId => {
        GameLogic.initializeRoomState(roomId);
    });
    console.log('Game rooms initialized.');

    // サーバーリッスン開始
    server.listen(3001, () => {
      console.log('Server running on port 3001');
    });
  })
  .catch((error) => {
    console.error('Server startup failed:', error);
    process.exit(1);
  });