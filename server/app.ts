import express, { Application, Router } from 'express';
import { sequelize, initializeDB, getMasterWeapons } from './config/database';
import { errorHandler } from './middlewares/errorHandler';
import 'reflect-metadata';
import cors from 'cors';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path'; // 画像配信のため
import type { ConnectedUserInfo, RoomUser, RoomGameState, PublicRoomGameState, MasterWeapon } from '../common/types/game';
import { ROOM_IDS, MAX_USERS_PER_ROOM, MAX_BANS_PER_TEAM, BAN_PHASE_DURATION } from '../common/types/constants';
import * as GameLogic from './gameLogic'; // gameLogic をインポート

const app: Application = express();
const server = http.createServer(app);

// --- CORS 設定 ---
const corsOptions = { origin: 'http://localhost:3000', credentials: true, optionsSuccessStatus: 200 };
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 静的ファイル配信 (画像用) ---
// 注意: public/images ディレクトリに武器画像を配置する必要があります
app.use('/images', express.static(path.join(__dirname, '..', 'public/images')));
console.log(`Serving static files from: ${path.join(__dirname, '..', 'public/images')}`);


// --- Socket.IO サーバー設定 ---
export const io = new Server(server, { cors: corsOptions });

// --- グローバル状態管理 ---
const gameRooms = new Map<string, RoomGameState>(); // RoomID -> RoomGameState
const connectedUsersGlobal = new Map<string, ConnectedUserInfo>(); // SocketID -> ConnectedUserInfo
let masterWeapons: MasterWeapon[] = []; // サーバー起動時に読み込む

// --- ゲームロジックモジュールの初期化 (サーバー起動時に実行) ---
// GameLogic.initializeGameLogic(io, gameRooms, masterWeapons); // 起動時処理に移動

// ==================================
// == API ルート定義 ==              // ★ このセクションを追加・修正
// ==================================
const apiRouter = Router(); // ★ API 用のルーターを作成

// --- ルーム一覧取得 API ---
apiRouter.get('/rooms', (req, res) => {
    console.log('[API] Request received for /rooms');
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
apiRouter.get('/master-weapons', async (req, res, next) => {
    try {
        console.log('[API] Request received for /master-weapons');
        if (masterWeapons && masterWeapons.length > 0) {
             res.json(masterWeapons);
        } else {
             const weaponsFromDb = await getMasterWeapons();
             res.json(weaponsFromDb);
        }
    } catch (error) {
        console.error('[API] Error fetching master weapons:', error);
        next(error);
    }
});

// ★ API ルーターを /api/v1 パスにマウント
app.use('/api/v1', apiRouter);

// ==================================
// == Socket.IO イベントハンドラ ==
// ==================================

io.on('connection', (socket: Socket) => {
    const socketId = socket.id;
    console.log(`[Connect] User connected: ${socketId}`);
    const newUserInfo: ConnectedUserInfo = { socketId: socketId, roomId: null };
    connectedUsersGlobal.set(socketId, newUserInfo);
    console.log('[Connect] Current global users:', Array.from(connectedUsersGlobal.keys()));

    // --- ルーム参加 ---
    socket.on('join room', (data: { roomId: string; name: string }) => {
        const { roomId, name } = data;
        console.log(`[Join Room] User ${socketId} requests to join room ${roomId} as ${name}`);
        const roomState = gameRooms.get(roomId);
        const userInfo = connectedUsersGlobal.get(socketId);

        if (!ROOM_IDS.includes(roomId)) {
            console.log(`[Join Room] Invalid roomId: ${roomId}`);
            socket.emit('join room failed', { roomId, reason: '無効なルームIDです' });
            return;
        }
        if (!roomState) { // 通常は initialize で作成されるはず
             console.error(`[Join Room] Room state for ${roomId} not found! Initializing...`);
             GameLogic.initializeRoomState(roomId); // 強制的に初期化
        }
         if (!userInfo) { // 通常は connection で作成されるはず
             console.error(`[Join Room] User info for ${socketId} not found!`);
             socket.emit('join room failed', { roomId, reason: 'ユーザー情報が見つかりません' });
             return;
         }
         if (roomState && roomState.connectedUsers.size >= MAX_USERS_PER_ROOM) {
            socket.emit('join room failed', { roomId, reason: '満員です' }); return;
         }
         if (!name || name.trim() === '') {
            socket.emit('join room failed', { roomId, reason: '名前を入力してください' }); return;
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
        userInfo.name = name.trim();
        userInfo.team = 'observer';

        // ルーム状態にユーザーを追加
        if (roomState) { // roomState が存在することを確認
             const roomUser: RoomUser = { id: socketId, name: name.trim(), team: 'observer' };
             roomState.connectedUsers.set(socketId, roomUser);
             console.log(`[Join Room] User ${socketId} joined room ${roomId}. Users: ${roomState.connectedUsers.size}`);

             // 参加成功と状態通知
             socket.emit('join room success', { roomId });
             socket.emit('initial state', GameLogic.getPublicRoomState(roomState));
             socket.emit('initial weapons', roomState.weapons);
             // socket.emit('user list', Array.from(roomState.connectedUsers.values()));
             socket.to(roomId).emit('user joined', roomUser);
             io.to(roomId).emit('room state update', GameLogic.getPublicRoomState(roomState));
        } else {
             // ここに来るべきではないが、念のため
             console.error(`[Join Room] Room state for ${roomId} became null unexpectedly.`);
             socket.emit('join room failed', { roomId, reason: 'ルーム状態エラー' });
        }

    });

    // --- チーム選択 ---
    socket.on('select team', (data: { team: 'alpha' | 'bravo' | 'observer'}) => {
        const userInfo = connectedUsersGlobal.get(socketId);
        if (!userInfo || !userInfo.roomId) return;
        const roomId = userInfo.roomId;
        const roomState = gameRooms.get(roomId);
        if (!roomState) return;
        const roomUser = roomState.connectedUsers.get(socketId);
        if (!roomUser) return;

        // TODO: ゲーム進行中チェック、人数制限チェック

        roomUser.team = data.team;
        userInfo.team = data.team; // グローバルも更新
        console.log(`[Select Team ${roomId}] User ${socketId} selected team ${data.team}.`);
        io.to(roomId).emit('user updated', roomUser); // ルーム全員に通知
    });

     // --- ゲーム開始 ---
     socket.on('start game', () => {
         const userInfo = connectedUsersGlobal.get(socketId);
         if (!userInfo || !userInfo.roomId) return;
         const roomId = userInfo.roomId;
         const roomState = gameRooms.get(roomId);
         if (!roomState) return;
         console.log(`[Start Game ${roomId}] Request from ${socketId}. Phase: ${roomState.phase}`);

         if (roomState.phase === 'waiting') {
             // TODO: 開始条件チェック
             console.log(`[Start Game ${roomId}] Starting ban phase...`);
             roomState.phase = 'ban';
             roomState.currentTurn = null;
             roomState.banPhaseState = { bans: { alpha: 0, bravo: 0 }, maxBansPerTeam: MAX_BANS_PER_TEAM };

             GameLogic.startRoomTimer(roomId, BAN_PHASE_DURATION,
                 (rId, timeLeft) => io.to(rId).emit('time update', timeLeft),
                 (rId) => GameLogic.endBanPhase(rId)
             );
             io.to(roomId).emit('phase change', GameLogic.getPublicRoomState(roomState));
             console.log(`[Start Game ${roomId}] Emitted phase change to ban.`);
         }
     });

     // --- 武器禁止 ---
     socket.on('ban weapon', async (data: { weaponId: number }) => {
         const userInfo = connectedUsersGlobal.get(socketId);
         if (!userInfo || !userInfo.roomId || !userInfo.team || userInfo.team === 'observer') return;
         const roomId = userInfo.roomId;
         const team = userInfo.team;
         const weaponId = data.weaponId;
         const roomState = gameRooms.get(roomId);
         if (!roomState) return;
         console.log(`[Ban Weapon ${roomId}] Req from ${socketId}(${team}) for ${weaponId}. Phase: ${roomState.phase}`);

         if (roomState.phase !== 'ban') { socket.emit('action failed', { reason: '禁止フェーズではありません'}); return; }
         if (roomState.banPhaseState.bans[team] >= roomState.banPhaseState.maxBansPerTeam) { socket.emit('action failed', { reason: '禁止上限です'}); return; }
         const weapon = roomState.weapons.find(w => w.id === weaponId);
         if (!weapon) { socket.emit('action failed', { reason: '武器が見つかりません'}); return; }
         if (weapon.selectedBy) { socket.emit('action failed', { reason: '既に選択されています'}); return; }
         if (weapon.bannedBy.includes(team)) { socket.emit('action failed', { reason: '既に禁止しています'}); return; }

         try {
             weapon.bannedBy.push(team);
             console.log(`[Ban Weapon ${roomId}] Weapon ${weaponId} updated in memory. bannedBy: ${JSON.stringify(weapon.bannedBy)}`);
             GameLogic.handleSuccessfulBan(roomId, team); // ロジック呼び出し
             io.to(roomId).emit('update weapon', { id: weapon.id, selectedBy: weapon.selectedBy, bannedBy: weapon.bannedBy });
             // socket.emit('ban success', { weaponId });
         } catch (error) {
             console.error(`[Ban Weapon ${roomId}] Error:`, error);
             socket.emit('action failed', { reason: '禁止処理エラー' });
         }
     });

     // --- 武器選択 ---
     socket.on('select weapon', async (data: { weaponId: number }) => {
         const userInfo = connectedUsersGlobal.get(socketId);
         if (!userInfo || !userInfo.roomId || !userInfo.team || userInfo.team === 'observer') return;
         const roomId = userInfo.roomId;
         const team = userInfo.team;
         const weaponId = data.weaponId;
         const roomState = gameRooms.get(roomId);
         if (!roomState) return;
         console.log(`[Select Weapon ${roomId}] Req from ${socketId}(${team}) for ${weaponId}. Phase: ${roomState.phase}, Turn: ${roomState.currentTurn}`);

          if (roomState.phase !== 'pick') { socket.emit('action failed', { reason: '選択フェーズではありません'}); return; }
          if (roomState.currentTurn !== team) { socket.emit('action failed', { reason: 'あなたのターンではありません'}); return; }
          if (roomState.turnActionTaken[team]) { socket.emit('action failed', { reason: 'このターンは選択済みです'}); return; }
          const weapon = roomState.weapons.find(w => w.id === weaponId);
          if (!weapon) { socket.emit('action failed', { reason: '武器が見つかりません'}); return; }
          if (weapon.selectedBy) { socket.emit('action failed', { reason: '既に選択されています'}); return; }
          if (weapon.bannedBy.length > 0) { socket.emit('action failed', { reason: '禁止されています'}); return; }

          try {
              weapon.selectedBy = team;
              console.log(`[Select Weapon ${roomId}] Weapon ${weaponId} updated in memory. Selected by ${team}`);
              GameLogic.handleSuccessfulPick(roomId, team); // ロジック呼び出し
              io.to(roomId).emit('update weapon', { id: weapon.id, selectedBy: weapon.selectedBy, bannedBy: weapon.bannedBy });
              // socket.emit('select success', { weaponId });
          } catch (error) {
              console.error(`[Select Weapon ${roomId}] Error:`, error);
              socket.emit('action failed', { reason: '選択処理エラー' });
          }
     });

    // --- 切断処理 ---
    socket.on('disconnect', (reason: string) => {
        console.log(`[Disconnect] User disconnected: ${socketId}. Reason: ${reason}`);
        const userInfo = connectedUsersGlobal.get(socketId);
        if (userInfo) {
            const roomId = userInfo.roomId;
            const teamLeft = userInfo.team;
            connectedUsersGlobal.delete(socketId); // グローバルから削除
            console.log('[Disconnect] Removed from global map.');

            if (roomId) {
                const roomState = gameRooms.get(roomId);
                if (roomState) {
                    const userExisted = roomState.connectedUsers.delete(socketId);
                    if (userExisted) {
                        console.log(`[Disconnect ${roomId}] Removed user ${socketId} from room.`);
                        io.to(roomId).emit('user left', { userId: socketId });
                        io.to(roomId).emit('room state update', GameLogic.getPublicRoomState(roomState));

                        if ((teamLeft === 'alpha' || teamLeft === 'bravo') && (roomState.phase === 'pick' || roomState.phase === 'ban')) {
                            console.log(`[Disconnect ${roomId}] Player ${userInfo.name}(${socketId}) from team ${teamLeft} left during active phase.`);
                            const remainingPlayersInTeam = Array.from(roomState.connectedUsers.values()).filter(u => u.team === teamLeft);
                            if (remainingPlayersInTeam.length === 0) {
                                console.log(`[Disconnect ${roomId}] No players left in team ${teamLeft}. Resetting room.`);
                                GameLogic.resetRoom(roomId); // ★ ロジック関数呼び出し
                            } else if (roomState.phase === 'pick' && roomState.currentTurn === teamLeft) {
                                console.log(`[Disconnect ${roomId}] Current turn player left. Forcing random select.`);
                                if(roomState.timer) { clearInterval(roomState.timer); roomState.timer = null; }
                                GameLogic.selectRandomWeapon(roomId, teamLeft); // ★ ロジック関数呼び出し
                            }
                        }
                    }
                }
            }
        } else {
            console.log(`[Disconnect] User ${socketId} not found in global map.`);
        }
        console.log('[Disconnect] Current global users:', Array.from(connectedUsersGlobal.keys()));
    });

     // --- ルームリセット ---
     socket.on('reset room', () => {
         const userInfo = connectedUsersGlobal.get(socketId);
         if (!userInfo || !userInfo.roomId) return;
         console.log(`[Reset Room ${userInfo.roomId}] Request from ${socketId}.`);
         GameLogic.resetRoom(userInfo.roomId); // ★ ロジック関数呼び出し
     });

}); // End of io.on('connection')

// ==================================
// == Express ルート & サーバー起動 ==
// ==================================

// --- API エンドポイント ---
app.get('/api/v1/rooms', (req, res) => {
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

app.get('/api/v1/master-weapons', async (req, res, next) => {
    try {
        console.log('[API] Request received for /api/v1/master-weapons');
        // getMasterWeapons はDBから直接取得する関数 (server/config/database.ts で定義済み)
        // または、サーバー起動時にメモリにロードした masterWeapons 変数を返す
        if (masterWeapons && masterWeapons.length > 0) {
             // メモリから返す場合 (推奨: DBアクセスが不要になる)
             res.json(masterWeapons);
        } else {
             // メモリにない場合、DBから取得 (フォールバック)
             const weaponsFromDb = await getMasterWeapons();
             res.json(weaponsFromDb);
        }
    } catch (error) {
        console.error('[API] Error fetching master weapons:', error);
        next(error); // エラーハンドリングミドルウェアに渡す
    }
});

// --- エラーハンドリング ---
app.use(errorHandler);

app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.originalUrl} not found`
    });
  });

// --- サーバー起動 ---
sequelize
  .authenticate()
  .then(async () => {
    console.log('Database connected');
    await initializeDB();
    console.log('Loading master weapons...');
    masterWeapons = await getMasterWeapons();
    console.log(`Loaded ${masterWeapons.length} master weapons.`);

    // ★ ゲームロジック初期化
    GameLogic.initializeGameLogic(io, gameRooms, masterWeapons);

    // 全てのルームを初期化
    console.log('Initializing game rooms...');
    ROOM_IDS.forEach(roomId => {
        GameLogic.initializeRoomState(roomId);
    });
    console.log('Game rooms initialized.');

    server.listen(3001, () => {
      console.log('Server running on port 3001');
    });
  })
  .catch((error) => {
    console.error('Server startup failed:', error);
    process.exit(1);
  });