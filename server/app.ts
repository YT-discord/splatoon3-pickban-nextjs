import express, { Application } from 'express';
import { sequelize } from './config/database';
import { initializeDB } from './config/database';
import weaponsRouter from './routes/weapons/routes';
import { errorHandler } from './middlewares/errorHandler';
import 'reflect-metadata';
import cors from 'cors';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { WeaponModel } from './models/Weapon';

const app: Application = express();

const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

app.use('/api/v1', weaponsRouter);

app.use(errorHandler);

const server = http.createServer(app);
export const io = new Server(server, {
  cors: corsOptions,
});

// --- ゲーム状態変数 ---
let currentPhase: 'waiting' | 'ban' | 'pick' | 'pick_complete' = 'waiting';
let timeLeft = 0;
let currentTurn: 'alpha' | 'bravo' | null = null;
let currentPickTurnNumber = 0;
const totalPickTurns = 8;
let timer: NodeJS.Timeout | null = null;
const turnActionTaken = { alpha: false, bravo: false };

interface BanPhaseState {
  bans: { alpha: number; bravo: number; };
  maxBansPerTeam: number;
}
const banPhaseState: BanPhaseState = { bans: { alpha: 0, bravo: 0 }, maxBansPerTeam: 3 };

interface PickPhaseState {
  picks: { alpha: number; bravo: number; };
  maxPicksPerTeam: number;
}
const pickPhaseState: PickPhaseState = { picks: { alpha: 0, bravo: 0 }, maxPicksPerTeam: 4 };
// ---------------------

interface ConnectedUser { id: string; name?: string; team?: 'alpha' | 'bravo' | 'observer'; }
const connectedUsers = new Map<string, ConnectedUser>();

export const getGameState = () => ({
  currentPhase,
  currentTurn,
  currentPickTurnNumber,
  timeLeft,
  turnActionTaken,
  banPhaseState,
  pickPhaseState,
});

const startTimer = (duration: number, onTick: () => void, onEnd: () => void) => {
  const tickInterval = 1000;
  const useFastTimer = process.env.FAST_TIMER === 'true';
  const actualDuration = useFastTimer ? Math.ceil(duration / 5) : duration;
  const actualTickInterval = useFastTimer ? Math.ceil(tickInterval / 5) : tickInterval;

  if (timer) {
    console.log('[Timer] Clearing existing timer:', timer);
    clearInterval(timer);
  }
  timeLeft = actualDuration;
  console.log(`[Timer] Starting timer for ${actualDuration} seconds (Interval: ${actualTickInterval}ms). Phase: ${currentPhase}, Turn: ${currentPickTurnNumber || 'N/A'}, Player: ${currentTurn || 'N/A'}`);
  onTick(); // 開始時に残り時間を送信
  timer = setInterval(() => {
    timeLeft = Math.max(0, timeLeft - 1);
    onTick();
    if (timeLeft <= 0) {
      console.log('[Timer] Timer ended.');
      clearInterval(timer!);
      timer = null;
      onEnd();
    }
  }, actualTickInterval);
};

const selectRandomWeapon = async (team: 'alpha' | 'bravo') => {
  console.log(`[Random Select] Attempting random select for team ${team}...`);
  try {
    // 1. まず選択されていない武器候補をDBから取得
    console.log('[Random Select] Finding candidates (selectedBy is null)...');
    const candidates = await WeaponModel.findAll({
      where: {
        selectedBy: null,
      },
    });
    console.log(`[Random Select] Found ${candidates.length} candidates not selected.`);

    if (candidates.length === 0) {
      console.log(`[Random Select] No weapons available (all are selected).`);
      // ★ 選択できる武器がない場合も、ターンを進めるべき。相手にターンを渡す。
      // handleSuccessfulPick を呼ばずに switchPickTurn を直接呼ぶか、
      // handleSuccessfulPick を呼んで「アクションは無かったがターンは進める」形にする。
      // ここでは handleSuccessfulPick を呼ぶことにする。
      console.log(`[Random Select] No available weapon found for ${team}. Calling handleSuccessfulPick to proceed turn.`);
      handleSuccessfulPick(team); // アクションは無かったが、ターン進行のために呼ぶ
      return;
    }

    // 2. 取得した候補から、指定されたチームが禁止していない武器をフィルタリング
    const availableWeapons = candidates.filter(weapon => {
      let isBannedByTeam = false;
      if (weapon.bannedBy) {
        try {
          // DBから取得した bannedBy が配列か文字列かを判定してパース
          const bannedTeams = Array.isArray(weapon.bannedBy)
            ? weapon.bannedBy
            : JSON.parse(weapon.bannedBy as unknown as string || '[]'); // 文字列ならパース、nullなら空配列
          isBannedByTeam = Array.isArray(bannedTeams) && bannedTeams.includes(team);
        } catch (e) {
          console.warn(`[Random Select] Failed to parse bannedBy for weapon ${weapon.id} (${weapon.bannedBy}). Assuming not banned by ${team}.`, e);
          isBannedByTeam = false;
        }
      }
      // console.log(`[Random Select] Checking weapon ${weapon.id}: bannedBy=${JSON.stringify(weapon.bannedBy)}, isBannedBy${team}=${isBannedByTeam}`); // デバッグ用ログ
      return !isBannedByTeam; // 自分が禁止していないもの
    });
    console.log(`[Random Select] Found ${availableWeapons.length} truly available weapons for team ${team}.`);


    if (availableWeapons.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableWeapons.length);
      const weaponToSelect = availableWeapons[randomIndex];

      console.log(`[Random Select] Team ${team} timed out. Selecting: ${weaponToSelect.name} (ID: ${weaponToSelect.id})`);
      await weaponToSelect.update({ selectedBy: team });
      const updatedWeapon = await WeaponModel.findByPk(weaponToSelect.id);
      if (!updatedWeapon) { throw new Error('Failed to retrieve weapon after random update'); }
      console.log(`[Random Select] Weapon ${updatedWeapon.id} updated in DB.`);

      const weaponDataToSend = {
        id: updatedWeapon.id,
        name: updatedWeapon.name,
        selectedBy: updatedWeapon.selectedBy,
        bannedBy: updatedWeapon.bannedBy,
        attribute: updatedWeapon.attribute,
      };
      io.emit('update weapon', weaponDataToSend);
      console.log(`[Random Select] Emitted 'update weapon' for ${updatedWeapon.id}.`);

      console.log(`[Random Select] Calling handleSuccessfulPick for team ${team}.`);
      handleSuccessfulPick(team); // ★ ターン進行処理を呼び出す

    } else {
      console.log(`[Random Select] Team ${team} timed out. No available weapons for them (possibly all banned by ${team}).`);
      // ★ 利用可能な武器が無くてもターンを進める
      console.log(`[Random Select] No available weapon found for ${team}. Calling handleSuccessfulPick to proceed turn.`);
      handleSuccessfulPick(team);
    }
  } catch (error) {
    console.error(`[Random Select] Error for team ${team}:`, error);
    // エラー発生時もターンを進める (無限ループを防ぐため)
    console.log(`[Random Select] Error occurred. Calling handleSuccessfulPick to proceed turn anyway.`);
    handleSuccessfulPick(team);
  }
};

const resetGame = async () => { // DBリセットも行うように async に変更
  console.log('[Reset] Resetting game state to waiting.');
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  currentPhase = 'waiting';
  currentTurn = null;
  timeLeft = 0;
  currentPickTurnNumber = 0; // ターン数リセット
  banPhaseState.bans.alpha = 0;
  banPhaseState.bans.bravo = 0;
  pickPhaseState.picks.alpha = 0;
  pickPhaseState.picks.bravo = 0;
  turnActionTaken.alpha = false;
  turnActionTaken.bravo = false;

  try {
    console.log('[Reset] Resetting selectedBy and bannedBy in database...');
    // ★ DBの状態もリセットする
    await WeaponModel.update(
      { selectedBy: null, bannedBy: [] }, // bannedBy を空配列にリセット
      { where: {} }
    );
    console.log('[Reset] Database reset successful.');

    // 全クライアントに通知
    io.emit('phase change', {
      phase: currentPhase,
      timeLeft,
      currentTurn,
      currentPickTurnNumber, // 0 を送信
      banPhaseState,
      pickPhaseState,
    });
    console.log('[Reset] Emitted phase change to waiting.');

    // 武器情報もリセット後の状態で再送信
    const weapons = await WeaponModel.findAll({
      attributes: ['id', 'name', 'selectedBy', 'bannedBy', 'attribute'], // attributeも送信
      order: [['id', 'ASC']],
    });
    const weaponsDataToSend = weapons.map(w => ({
      id: w.id,
      name: w.name,
      selectedBy: w.selectedBy,
      bannedBy: w.bannedBy,
      attribute: w.attribute,
    }));
    io.emit('initial weapons', weaponsDataToSend);
    console.log('[Reset] Emitted initial weapons.');

  } catch (error) {
    console.error('[Reset] Error resetting database:', error);
    // エラーが発生しても、できるだけクライアントには通知
    io.emit('phase change', {
      phase: 'waiting', // waiting に戻す
      timeLeft: 0,
      currentTurn: null,
      currentPickTurnNumber: 0,
      // ban/pick state は初期値で送る
      banPhaseState: { bans: { alpha: 0, bravo: 0 }, maxBansPerTeam: 3 },
      pickPhaseState: { picks: { alpha: 0, bravo: 0 }, maxPicksPerTeam: 4 },
    });
    // エラー発生を示すメッセージをクライアントに送ることも検討
    // io.emit('error message', 'ゲームのリセットに失敗しました。');
  }
};

export const handleSuccessfulBan = (team: 'alpha' | 'bravo') => {
  console.log(`[App Logic] handleSuccessfulBan called for team: ${team}. Current Phase: ${currentPhase}`);
  // banフェーズ中のみ処理
  if (currentPhase === 'ban') {
    // グローバルな banPhaseState を更新
    // ここでも上限チェックは念のため行う (コントローラーでチェック済みのはず)
    if (banPhaseState.bans[team] < banPhaseState.maxBansPerTeam) {
      banPhaseState.bans[team]++; // ★ カウントアップ
      console.log(`[Ban Count] Updated by handleSuccessfulBan for ${team}. New counts: Alpha=${banPhaseState.bans.alpha}, Bravo=${banPhaseState.bans.bravo}`);

      // クライアントに banPhaseState の更新を通知 (禁止数をUI表示する場合に必要)
      io.emit('phase change', { phase: currentPhase, timeLeft, currentTurn, currentPickTurnNumber, banPhaseState, pickPhaseState });
      console.log(`[App Logic] Emitted phase change with updated ban counts.`);

      // 両チームが上限に達したかチェック
      const alphaReachedMax = banPhaseState.bans.alpha >= banPhaseState.maxBansPerTeam;
      const bravoReachedMax = banPhaseState.bans.bravo >= banPhaseState.maxBansPerTeam;
      console.log(`[Ban Check by Handle] Alpha reached max: ${alphaReachedMax}, Bravo reached max: ${bravoReachedMax}`);

      if (alphaReachedMax && bravoReachedMax) {
        console.log('[Ban End Check by Handle] Both teams reached max bans. Calling endBanPhase...');
        // タイマーが動いていても即座に終了処理へ
        if (timer) {
          clearInterval(timer);
          timer = null;
          console.log('[Ban End Check by Handle] Cleared ban phase timer.');
        }
        endBanPhase(); // フェーズ移行
      }
    } else {
      // コントローラーでチェックしてるはずだが、もしここに来たら警告
      console.warn(`[App Logic] handleSuccessfulBan called for ${team}, but limit already reached (${banPhaseState.bans[team]}/${banPhaseState.maxBansPerTeam}). Skipping count increment.`);
    }
  } else {
    // ban フェーズ以外で呼ばれた場合
    console.warn(`[App Logic] handleSuccessfulBan called but current phase is not 'ban' (${currentPhase})`);
  }
};

// ★★★ ターン進行処理を export 可能にする ★★★
export const handleSuccessfulPick = (team: 'alpha' | 'bravo') => {
  console.log(`[App Logic] handleSuccessfulPick called for team: ${team}. Current state: Phase=${currentPhase}, Turn=${currentTurn}, AlphaTaken=${turnActionTaken.alpha}, BravoTaken=${turnActionTaken.bravo}`);
  // この関数は選択成功/時間切れランダム選択後に呼ばれる
  if (currentPhase === 'pick') { // pickフェーズ中であることだけ確認
    // ターンが一致するか、アクション済みかはチェックせず、来たチームのアクションとして記録する
    // （時間切れランダム選択の場合、currentTurnとteamが一致しない可能性があるため）
    if (!turnActionTaken[team]) {
      console.log(`[App Logic] Action confirmed or forced for team ${team}. Updating turnActionTaken.`);
      turnActionTaken[team] = true; // アクション済みフラグを立てる
      pickPhaseState.picks[team]++; // ピック数をカウント
      console.log(`[Pick Count] ${team}: ${pickPhaseState.picks[team]}`);

      // 現在のターンタイマーが動いていれば停止
      if (timer && currentTurn === team) { // 自分のターンのタイマーのみクリア
        console.log(`[App Logic] Clearing current timer for ${team}:`, timer);
        clearInterval(timer);
        timer = null;
      }
      console.log('[App Logic] Calling switchPickTurn().');
      switchPickTurn(); // ★ ターン切り替え関数を呼び出す
    } else {
      // 既にアクション済みの場合（例：時間切れ処理と手動選択が競合した場合など）
      console.log(`[App Logic] Action already taken for team ${team}. Turn should be switching or already switched.`);
      // ここでは switchPickTurn を呼ばない（二重呼び出しを防ぐ）
    }
  } else {
    console.warn(`[App Logic] handleSuccessfulPick called but current phase is not 'pick' (${currentPhase}). Ignoring.`);
  }
};

const switchPickTurn = () => {
  console.log(`[Switch Turn] Function called. Current turn number before increment: ${currentPickTurnNumber}`);
  // タイマーが残っていればクリア（主に先行入力などでタイマー終了前に呼ばれた場合）
  if (timer) {
    console.log('[Switch Turn] Clearing previous timer (if any):', timer);
    clearInterval(timer);
    timer = null;
  }

  const previousTurnPlayer = currentTurn; // ★バグ修正：インクリメント前に保持
  currentPickTurnNumber++; // ターン数を増やす
  console.log(`[Switch Turn] Incremented pick turn number to ${currentPickTurnNumber}`);

  // --- 8ターン完了後の処理 ---
  if (currentPickTurnNumber > totalPickTurns) {
    console.log(`[Switch Turn] Max pick turns reached (${totalPickTurns}). Current turn number: ${currentPickTurnNumber}`);
    console.log(`[Pick End] Setting phase to pick_complete.`);
    currentPhase = 'pick_complete';
    currentTurn = null;
    timeLeft = 0;
    // pickPhaseState は完了時の状態を保持
    io.emit('phase change', {
      phase: currentPhase,
      timeLeft,
      currentTurn,
      currentPickTurnNumber,
      banPhaseState,
      pickPhaseState,
    });
    console.log(`[Switch Turn] Emitted 'phase change' for pick_complete.`);
    return; // ターン進行処理終了
  }
  // --------------------------

  // 次のターンプレイヤーを決定
  // ★ 修正: 初回ターン(currentTurn=null)や交互ターンを考慮
  if (currentTurn === null) { // 最初のターン開始時
    currentTurn = 'alpha'; // Alphaから開始
  } else {
    currentTurn = currentTurn === 'alpha' ? 'bravo' : 'alpha'; // 交互に
  }

  // 次のターンのアクションフラグをリセット
  turnActionTaken.alpha = false;
  turnActionTaken.bravo = false;
  console.log(`[Switch Turn] Switched turn to ${currentTurn}. Reset turnActionTaken.`);

  // 次のターンのタイマーを開始
  console.log(`[Switch Turn] Starting timer for next turn (${currentTurn}, Turn ${currentPickTurnNumber})`);
  startTimer(
    10, // 選択時間 (設定可能にすると良い)
    () => io.emit('time update', timeLeft),
    async () => { // 時間切れ処理
      const timedOutPlayer = currentTurn; // ★ 時間切れになったプレイヤーを保持
      console.log(`[Timer End] Pick turn ${currentPickTurnNumber} (Player: ${timedOutPlayer}) timed out. Checking if action was taken...`);

      // ★ 時間切れ時のプレイヤーのアクションフラグを確認
      if (timedOutPlayer && !turnActionTaken[timedOutPlayer]) {
        console.log(`[Timer End] Action NOT taken for ${timedOutPlayer}. Selecting randomly...`);
        await selectRandomWeapon(timedOutPlayer); // ランダム選択 -> handleSuccessfulPick -> switchPickTurn が呼ばれる
      } else {
        console.log(`[Timer End] Action WAS taken for ${timedOutPlayer} or no player assigned. Turn switch likely happened already.`);
        // 既に選択済み、または何らかの理由でプレイヤーがいない場合
        // ここで switchPickTurn を呼ぶ必要はない
      }
    }
  );

  // クライアントに新しい状態を通知
  console.log(`[Switch Turn] Emitting phase change. Phase: ${currentPhase}, Turn: ${currentTurn}, TurnNumber: ${currentPickTurnNumber}`);
  io.emit('phase change', { phase: currentPhase, timeLeft, currentTurn, currentPickTurnNumber, banPhaseState, pickPhaseState });
};


const endBanPhase = async () => { // async に変更
  if (currentPhase !== 'ban') return;
  console.log('[Ban End] Ban phase ended. Starting pick phase...');
  if (timer) { // 禁止フェーズタイマーをクリア
    clearInterval(timer);
    timer = null;
  }
  currentPhase = 'pick';
  // currentTurn = 'alpha'; // ★ switchPickTurnで設定するので不要
  currentTurn = null; // ★ nullにしておく
  currentPickTurnNumber = 0; // ★ 0 にリセット (switchPickTurnで1になる)
  pickPhaseState.picks.alpha = 0;
  pickPhaseState.picks.bravo = 0;
  turnActionTaken.alpha = false;
  turnActionTaken.bravo = false;

  // ★ 禁止フェーズ完了時に全武器情報を送信 (ステップ2の準備)
  try {
    console.log('[Ban End] Fetching all weapons data to emit...');
    const allWeapons = await WeaponModel.findAll({
      attributes: ['id', 'name', 'selectedBy', 'bannedBy', 'attribute'], // attribute も含める
      order: [['id', 'ASC']],
    });
    const weaponsDataToSend = allWeapons.map(w => ({
      id: w.id,
      name: w.name,
      selectedBy: w.selectedBy,
      bannedBy: w.bannedBy,
      attribute: w.attribute,
    }));
    io.emit('initial weapons', weaponsDataToSend);
    console.log('[Ban End] Emitted initial weapons.');
  } catch (error) {
    console.error('[Ban End] Error fetching or emitting weapons data:', error);
  }

  console.log(`[Ban End] Calling switchPickTurn() to start the first pick turn.`);
  switchPickTurn(); // ★ 最初のピックターンを開始するために呼び出す
};


io.on('connection', (socket: Socket) => {
  console.log(`[Connect] User connected: ${socket.id}`);
  const newUser: ConnectedUser = { id: socket.id };
  connectedUsers.set(socket.id, newUser);
  console.log('[Connect] Current users:', Array.from(connectedUsers.values()).map(u => u.id)); // IDのみ表示

  socket.emit('initial state', {
    phase: currentPhase,
    timeLeft,
    currentTurn,
    currentPickTurnNumber,
    banPhaseState,
    pickPhaseState,
  });
  console.log(`[Connect] Sent initial state to ${socket.id}:`, { currentPhase, currentTurn, currentPickTurnNumber });

  // ★ 必要に応じて現在の武器リストも送信
  if (currentPhase !== 'waiting') {
    WeaponModel.findAll({
      attributes: ['id', 'name', 'selectedBy', 'bannedBy', 'attribute'],
      order: [['id', 'ASC']],
    }).then(weapons => {
      const weaponsDataToSend = weapons.map(w => ({
        id: w.id,
        name: w.name,
        selectedBy: w.selectedBy,
        bannedBy: w.bannedBy,
        attribute: w.attribute,
      }));
      socket.emit('initial weapons', weaponsDataToSend);
      console.log(`[Connect] Sent initial weapons data to ${socket.id}.`);
    }).catch(err => console.error(`[Connect] Error sending initial weapons to ${socket.id}:`, err));
  }


  socket.on('set user info', (data: { name: string; team: 'alpha' | 'bravo' | 'observer' }) => {
    const user = connectedUsers.get(socket.id);
    // ★ 受信ログを追加
    console.log(`[User Info Event] Received 'set user info' from ${socket.id}: Name='${data.name}', Team='${data.team}'`);
    if (user) {
        // チーム名のバリデーション
        if (['alpha', 'bravo', 'observer'].includes(data.team)) {
            user.name = data.name;
            user.team = data.team;
            // ★ 更新成功ログを追加
            console.log(`[User Info Update] User ${socket.id} data updated in map: Name='${user.name}', Team='${user.team}'`);
        } else {
             console.warn(`[User Info Update] Invalid team value received from ${socket.id}: ${data.team}`);
        }
    } else {
        // ユーザーがマップに見つからない場合（接続直後などタイミングの問題？）
        console.warn(`[User Info Update] User ${socket.id} not found in map when trying to set info. Data:`, data);
    }
  });

  socket.on('start game', () => {
    if (currentPhase === 'waiting') {
      console.log('[Start Game] Received start game request.');
      // ★ ゲーム開始時にリセット処理を呼ぶ（DB含む）
      resetGame().then(() => {
        console.log('[Start Game] Game reset complete. Starting ban phase...');
        currentPhase = 'ban';
        currentTurn = null; // 禁止フェーズはターンなし
        currentPickTurnNumber = 0;
        banPhaseState.bans.alpha = 0;
        banPhaseState.bans.bravo = 0;

        startTimer(
          30, // 禁止フェーズ時間
          () => io.emit('time update', timeLeft),
          () => {
            console.log('[Start Game] Ban phase timer ended. Calling endBanPhase...');
            endBanPhase();
          }
        );
        io.emit('phase change', { phase: currentPhase, timeLeft, currentTurn, currentPickTurnNumber, banPhaseState, pickPhaseState });
        console.log('[Start Game] Emitted phase change to ban.');
      }).catch(error => {
        console.error('[Start Game] Failed to reset game before starting:', error);
        // エラー通知など
      });
    } else {
      console.warn(`[Start Game] Received start game request but current phase is ${currentPhase}. Ignoring.`);
    }
  });

  // ★ リセットボタン用のリスナーを追加
  socket.on('reset game', () => {
    console.log(`[Event] Received 'reset game' request from ${socket.id}.`);
    // ★ ゲーム状態に関わらずリセットを実行
    resetGame();
  });

  socket.on('disconnect', (reason: string) => {
    const socketId = socket.id; // 切断したsocketのIDを保持
    console.log(`[Disconnect] User disconnected: ${socketId}. Reason: ${reason}`);
    const disconnectedUser = connectedUsers.get(socketId);

    if (disconnectedUser) {
      const userId = disconnectedUser.id;
      const teamLeft = disconnectedUser.team;
      const userName = disconnectedUser.name;
      console.log(`[Disconnect] Found disconnected user in map: ID=${userId}, Name=${userName}, Team=${teamLeft}`);

      // マップから削除
      connectedUsers.delete(socketId);
      const remainingUsers = Array.from(connectedUsers.values()); // 残りのユーザーリスト取得
      const remainingUserIds = remainingUsers.map(u => ({ id: u.id, team: u.team }));
      console.log(`[Disconnect] User ${userId} removed from map. Remaining users (${remainingUsers.length}):`, remainingUserIds);

      // ゲーム中のプレイヤー離脱処理 ('alpha' or 'bravo' かつ 'pick' or 'ban' フェーズ)
      if ((teamLeft === 'alpha' || teamLeft === 'bravo') && (currentPhase === 'pick' || currentPhase === 'ban')) {
        console.log(`[Disconnect] Player ${userId} from team ${teamLeft} left during active phase (${currentPhase}).`);

        // チームに残っているプレイヤーがいるか確認
        const remainingPlayersInTeam = remainingUsers.filter(user => user.team === teamLeft); // 削除後のリストでフィルタリング
        console.log(`[Disconnect] Checking remaining players in team ${teamLeft}: Count = ${remainingPlayersInTeam.length}`);

        if (remainingPlayersInTeam.length === 0) {
          // ★ チームメンバーが0人になったらリセット
          console.log(`[Disconnect] No players left in team ${teamLeft}. Calling resetGame().`);
          resetGame();
        } else {
          // チームにまだプレイヤーが残っている場合
          console.log(`[Disconnect] Team ${teamLeft} still has players:`, remainingPlayersInTeam.map(u => u.id));
          // 現在のターンプレイヤーが抜けた場合の処理
          if (currentPhase === 'pick' && currentTurn === teamLeft) {
            console.log(`[Disconnect] Current turn player (${currentTurn}, ${userId}) left. Forcing random selection.`);
            if (timer) {
              clearInterval(timer);
              timer = null;
              console.log(`[Disconnect] Cleared existing timer for ${currentTurn}.`);
            }
            selectRandomWeapon(currentTurn); // ランダム選択を実行
          } else {
            console.log(`[Disconnect] Player ${userId} left, but it wasn't their turn or not in pick phase. No immediate game action needed.`);
          }
        }
      } else if (teamLeft === 'observer') {
        console.log(`[Disconnect] Observer ${userId} left.`);
      } else {
        // プレイヤーではない、またはアクティブフェーズでない場合
        console.log(`[Disconnect] Disconnected user ${userId} was not an active player ('${teamLeft}') or game not in active phase ('${currentPhase}'). No reset needed.`);
      }
    } else {
      // マップにユーザーが見つからない場合（既に削除された後など）
      console.log(`[Disconnect] User ${socketId} not found in connected users map (might have already been removed or never registered fully).`);
    }
  });
});

// データベース接続 & サーバー起動
sequelize
  .authenticate()
  .then(() => {
    console.log('Database connected');
    initializeDB(); // DB初期化 (force: true に注意)
    server.listen(3001, () => {
      console.log('Server running on port 3001');
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });