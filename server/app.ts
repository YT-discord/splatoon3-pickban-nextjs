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
import { Op } from 'sequelize';

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
let currentPhase: 'waiting' | 'ban' | 'pick' = 'waiting';
let timeLeft = 0;
let currentTurn: 'alpha' | 'bravo' | null = null;
let timer: NodeJS.Timeout | null = null;
const turnActionTaken = { // 選択フェーズ用
  alpha: false,
  bravo: false,
};
// 変更: banPhaseState の型定義を変更
interface BanPhaseState {
  bans: { // ネストしたオブジェクトに変更
    alpha: number;
    bravo: number;
  };
  maxBansPerTeam: number;
}
const banPhaseState: BanPhaseState = {
  bans: { // 初期値も変更
    alpha: 0,
    bravo: 0,
  },
  maxBansPerTeam: 3,
};

// 変更: pickPhaseState も同様に型定義 (今後のために)
interface PickPhaseState {
  picks: { // ネストしたオブジェクトに変更
    alpha: number;
    bravo: number;
  };
  maxPicksPerTeam: number;
}
const pickPhaseState: PickPhaseState = {
  picks: { // 初期値も変更
    alpha: 0,
    bravo: 0,
  },
  maxPicksPerTeam: 4,
};
// ---------------------

// ゲーム状態を返す関数 (変更なし、型推論でOK)
export const getGameState = () => ({
  currentPhase,
  currentTurn,
  turnActionTaken,
  banPhaseState,
  pickPhaseState,
});

// タイマーを開始/停止する関数
const startTimer = (duration: number, onTick: () => void, onEnd: () => void) => {
  if (timer) {
    console.log('[Timer] Clearing existing timer:', timer);
    clearInterval(timer);
  }
  timeLeft = duration;
  console.log(`[Timer] Starting timer for ${duration} seconds.`);
  onTick(); // 最初の時間を送信
  timer = setInterval(() => {
    timeLeft--;
    onTick();
    if (timeLeft <= 0) {
      console.log('[Timer] Timer ended.');
      clearInterval(timer!);
      timer = null;
      onEnd(); // 時間切れ処理を実行
    }
  }, 1000);
};

const selectRandomWeapon = async (team: 'alpha' | 'bravo') => {
  try {
    // まず、選択されておらず、かつ自分が禁止していない武器候補を取得
    const allAvailableCandidates = await WeaponModel.findAll({
      where: {
        selectedBy: null,
        // bannedBy が空配列、または null である武器のみ
        [Op.or]: [
          { bannedBy: { [Op.is]: null } },
          { bannedBy: { [Op.eq]: '[]' } } // SQLite では JSON 配列を文字列として比較する必要があるかも
          // 注意: bannedBy が JSON 型の場合、DB によってクエリが異なる可能性があります。
          // PostgreSQL などでは `bannedBy: { [Op.eq]: [] }` が使えるかもしれません。
          // SQLiteの場合、JSON関数を使う方が確実かもしれません: `where: sequelize.literal('json_array_length(bannedBy) = 0')`
        ]
      },
    });

    // 取得した候補の中から、指定されたチームが禁止していない武器をフィルタリング
    const trulyAvailableWeapons = allAvailableCandidates.filter(weapon =>
        !(weapon.bannedBy && weapon.bannedBy.includes(team)) // 自分が禁止していないものだけ
    );

    if (trulyAvailableWeapons.length > 0) {
      const randomIndex = Math.floor(Math.random() * trulyAvailableWeapons.length);
      const weaponToSelect = trulyAvailableWeapons[randomIndex];

      await weaponToSelect.update({ selectedBy: team });

      // 追加: 更新後のデータを再取得
      const updatedWeapon = await WeaponModel.findByPk(weaponToSelect.id);
       if (!updatedWeapon) {
            throw new Error('Failed to retrieve weapon after random update');
       }

      console.log(`[Random Select] Team ${team} timed out. Selected: ${updatedWeapon.name}`);
      io.emit('weapon selected', { team });

      // 修正: 再取得したデータから必要なものだけ送信
      const weaponDataToSend = {
        id: updatedWeapon.id,
        name: updatedWeapon.name,
        selectedBy: updatedWeapon.selectedBy,
        bannedBy: updatedWeapon.bannedBy,
      };
      io.emit('update weapon', weaponDataToSend);
    } else {
      console.log(`[Random Select] Team ${team} timed out. No available weapons.`);
      io.emit('weapon selected', { team });
    }
  } catch (error) {
    console.error(`[Random Select] Error for team ${team}:`, error);
     io.emit('weapon selected', { team });
  }
};


// 選択フェーズのターン切り替え処理 (修正: フェーズ終了チェック追加)
const switchPickTurn = () => {
  // 終了条件チェック
  if (pickPhaseState.picks.alpha >= pickPhaseState.maxPicksPerTeam &&
      pickPhaseState.picks.bravo >= pickPhaseState.maxPicksPerTeam) {
    console.log('[Pick End] Both teams reached max picks. Returning to waiting.');
    currentPhase = 'waiting';
    currentTurn = null;
    if (timer) clearInterval(timer);
    timer = null;
    io.emit('phase change', { phase: currentPhase, timeLeft, currentTurn, banPhaseState, pickPhaseState }); 
    // 選択/禁止状態をリセットする処理も必要に応じて追加
    // resetGameStates(); // 例えばこんな関数
    return; // ターン切り替えせずに終了
  }

  const previousTurn = currentTurn;
  currentTurn = currentTurn === 'alpha' ? 'bravo' : 'alpha';
  turnActionTaken.alpha = false;
  turnActionTaken.bravo = false;

  console.log(`[Turn] Switching pick turn to ${currentTurn}`);

  startTimer(
    10,
    () => io.emit('time update', timeLeft),
    async () => {
      console.log(`[Timer End] Pick turn ended for ${previousTurn}. Checking action...`);
      if (previousTurn && !turnActionTaken[previousTurn]) {
        console.log(`[Timer End] Action NOT taken for ${previousTurn}. Selecting randomly...`);
        await selectRandomWeapon(previousTurn);
      }
      // 'weapon selected' が発行される -> ハンドラで switchPickTurn が呼ばれる
    }
  );
  io.emit('phase change', { phase: currentPhase, timeLeft, currentTurn });
};

// 追加: 禁止フェーズ終了処理
const endBanPhase = () => {
  if (currentPhase !== 'ban') return; // 既に移行済みの場合は何もしない
  console.log('Ban phase ended. Starting pick phase...');
  currentPhase = 'pick';
  currentTurn = 'alpha';
  // 選択状態リセット
  pickPhaseState.picks.alpha = 0;
  pickPhaseState.picks.bravo = 0;
  turnActionTaken.alpha = false;
  turnActionTaken.bravo = false;

  // 最初の選択ターン開始
  startTimer(
    10,
    () => io.emit('time update', timeLeft),
    async () => { // 最初のターン時間切れ
      console.log(`[Timer End] First pick turn ended for ${currentTurn}.`);
      if (currentTurn && !turnActionTaken[currentTurn]) {
        console.log(`[Timer End] Action NOT taken for ${currentTurn}. Selecting randomly...`);
        await selectRandomWeapon(currentTurn);
      }
    }
  );
  io.emit('phase change', { phase: currentPhase, timeLeft, currentTurn, banPhaseState, pickPhaseState });
};

io.on('connection', (socket: Socket) => {
  console.log('a user connected');

  socket.emit('initial state', {
    phase: currentPhase,
    timeLeft,
    currentTurn,
    banPhaseState,
    pickPhaseState,
  });

  socket.on('start game', () => {
    if (currentPhase === 'waiting') {
      console.log('Game starting...');
      currentPhase = 'ban';
      currentTurn = null;
      // 禁止状態リセット
      banPhaseState.bans.alpha = 0;
      banPhaseState.bans.bravo = 0;

      // 禁止フェーズ開始
      startTimer(
        30,
        () => io.emit('time update', timeLeft),
        () => { // 時間切れで禁止フェーズ終了
          endBanPhase();
        }
      );
      io.emit('phase change', { phase: currentPhase, timeLeft, currentTurn, banPhaseState, pickPhaseState });
    }
  });

  // weapon banned イベントハンドラ (修正)
  socket.on('weapon banned', (data: { team: 'alpha' | 'bravo' }) => {
    if (currentPhase === 'ban') {
      // 変更: banPhaseState へのアクセス方法を変更
      banPhaseState.bans[data.team]++; // カウントアップ
      console.log(`[Ban Count] ${data.team}: ${banPhaseState.bans[data.team]}`);
      // 変更: チェック方法を変更
      if (banPhaseState.bans.alpha >= banPhaseState.maxBansPerTeam &&
          banPhaseState.bans.bravo >= banPhaseState.maxBansPerTeam) {
        console.log('[Ban End] Both teams reached max bans.');
        if (timer) clearInterval(timer);
        timer = null;
        endBanPhase();
      }
    }
  });

  // weapon selected イベントハンドラ (修正: 選択数カウント追加)
  socket.on('weapon selected', (data: { team: 'alpha' | 'bravo' }) => {
    console.log(`[Event] Received 'weapon selected' for team: ${data.team}. Current turn: ${currentTurn}`);
    if (currentPhase === 'pick' && currentTurn === data.team) {
      if (!turnActionTaken[data.team]) {
        console.log(`[Event] Action confirmed for team ${data.team}.`);
        turnActionTaken[data.team] = true;
        // 変更: pickPhaseState へのアクセス方法を変更
        pickPhaseState.picks[data.team]++; // カウントアップ
        console.log(`[Pick Count] ${data.team}: ${pickPhaseState.picks[data.team]}`);

        if (timer) {
          console.log('[Event] Clearing current timer due to selection:', timer);
          clearInterval(timer);
          timer = null;
        }
        console.log('[Event] Switching turn.');
        switchPickTurn();
      } else {
         console.log(`[Event] Action already taken for team ${data.team}. Ignoring.`);
      }
    } else {
        console.info(`[Event] Received 'weapon selected' outside of pick phase or correct turn. Phase: ${currentPhase}, Turn: ${currentTurn}, Team: ${data.team}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// データベース接続 (変更: server.listen を使用)
sequelize
  .authenticate()
  .then(() => {
    console.log('Database connected');
    initializeDB();
    server.listen(3001, () => {
      // 変更
      console.log('Server running on port 3001');
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });