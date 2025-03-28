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
// import { Op } from 'sequelize';

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

let currentPhase: 'waiting' | 'ban' | 'pick' = 'waiting';
let timeLeft = 0;
let currentTurn: 'alpha' | 'bravo' | null = null;
let timer: NodeJS.Timeout | null = null;
const turnActionTaken = {
  alpha: false,
  bravo: false,
};

// 追加: ゲーム状態を返す関数を export
export const getGameState = () => ({
  currentPhase,
  currentTurn,
  turnActionTaken,
});

// タイマーを開始/停止する関数
const startTimer = (duration: number, onTick: () => void, onEnd: () => void) => {
  if (timer) {
    clearInterval(timer); // 既存のタイマーをクリア
  }
  timeLeft = duration;
  onTick(); // 最初の時間を送信
  timer = setInterval(() => {
    timeLeft--;
    onTick();
    if (timeLeft <= 0) {
      clearInterval(timer!); // timerがnullでないことを保証
      timer = null; // タイマーIDをクリア
      onEnd();
    }
  }, 1000);
};

const selectRandomWeapon = async (team: 'alpha' | 'bravo') => {
  try {
    // まず、選択されておらず、かつ自分が禁止していない武器候補を取得
    const allAvailableCandidates = await WeaponModel.findAll({
      where: {
        selectedBy: null,
      },
    });

    // 取得した候補の中から、指定されたチームが禁止していない武器をフィルタリング
    const trulyAvailableWeapons = allAvailableCandidates.filter(weapon =>
        !(weapon.bannedBy && weapon.bannedBy.includes(team)) // 自分が禁止していないものだけ
    );


    if (trulyAvailableWeapons.length > 0) {
      // 配列からランダムに1つ選択
      const randomIndex = Math.floor(Math.random() * trulyAvailableWeapons.length);
      const weaponToSelect = trulyAvailableWeapons[randomIndex];

      await weaponToSelect.update({ selectedBy: team });
      console.log(`Team ${team} timed out. Randomly selected: ${weaponToSelect.name}`);
      // 選択イベントを発行してクライアントに通知
      io.emit('weapon selected', { team });
      const weaponDataToSend = {
        id: weaponToSelect.id,
        name: weaponToSelect.name,
        selectedBy: weaponToSelect.selectedBy,
        bannedBy: weaponToSelect.bannedBy,
        // imageUrl は含めない
      };
      io.emit('update weapon', weaponDataToSend);
    } else {
      console.log(`Team ${team} timed out. No available weapons to select.`);
      // 選択できる武器がない場合でもターンは切り替える必要がある
      io.emit('weapon selected', { team }); // ダミーの選択イベントを発行してターンを進める
    }
  } catch (error) {
    console.error(`Error selecting random weapon for team ${team}:`, error);
    // エラーが発生してもターンは切り替える
     io.emit('weapon selected', { team }); // ダミーの選択イベントを発行してターンを進める
  }
};


// 選択フェーズのターン切り替え処理
const switchPickTurn = () => {
  // 変更: 現在のターンを取得してから切り替え
  const previousTurn = currentTurn;
  currentTurn = currentTurn === 'alpha' ? 'bravo' : 'alpha';

  // ターンが切り替わったら、選択済みフラグをリセット
  turnActionTaken.alpha = false;
  turnActionTaken.bravo = false;

  // タイマーをリスタート
  startTimer(
    10,
    () => io.emit('time update', timeLeft), // 残り時間を送信
    async () => { // 変更: async にして await を使用可能に
      // 時間切れの場合、前のターンが選択していなければランダム選択
      if (previousTurn && !turnActionTaken[previousTurn]) {
        await selectRandomWeapon(previousTurn); // ランダム選択処理を待つ
      } else {
        // 時間切れでターンが切り替わる場合もフラグリセットして次のターンへ
        switchPickTurn();
        io.emit('phase change', { phase: currentPhase, timeLeft, currentTurn }); // 状態を送信
      }
      // selectRandomWeapon 内で weapon selected イベントが発行されるので、ここでは発行しない
      // もしくは、selectRandomWeapon が成功した場合のみ switchPickTurn を呼ぶように変更も可能
    }
  );
  io.emit('phase change', { phase: currentPhase, timeLeft, currentTurn }); // 新しいターン情報を送信
};

io.on('connection', (socket: Socket) => { // Socket 型を指定
  console.log('a user connected');

  socket.emit('initial state', {
    phase: currentPhase,
    timeLeft,
    currentTurn,
  });

  socket.on('start game', () => {
    if (currentPhase === 'waiting') {
      currentPhase = 'ban';
      currentTurn = null;
      startTimer(
        30,
        () => io.emit('time update', timeLeft),
        () => {
          currentPhase = 'pick';
          currentTurn = 'alpha';
          turnActionTaken.alpha = false; // フラグリセット
          turnActionTaken.bravo = false;
          startTimer(
            10,
            () => io.emit('time update', timeLeft),
            async () => { // 変更: async
              // 最初のターンで時間切れの場合
              if (currentTurn && !turnActionTaken[currentTurn]) {
                await selectRandomWeapon(currentTurn);
              } else {
                switchPickTurn();
              }
            }
          );
          io.emit('phase change', { phase: currentPhase, timeLeft, currentTurn });
        }
      );
      io.emit('phase change', { phase: currentPhase, timeLeft, currentTurn });
    }
  });

  // 追加: 武器選択成功イベントの受信 (コントローラーから発行)
  socket.on('weapon selected', (data: { team: 'alpha' | 'bravo' }) => {
    if (currentPhase === 'pick' && currentTurn === data.team) {
      // 選択済みフラグを立てる (selectRandomWeaponでも発行されるため、ここでは不要かも)
      // turnActionTaken[data.team] = true;
      // ターンを切り替える
      switchPickTurn(); // 選択されたらすぐにターン切り替え
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