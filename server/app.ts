import express, { Application } from 'express';
import { sequelize } from './config/database';
import { initializeDB } from './config/database';
import weaponsRouter from './routes/weapons/routes';
import { errorHandler } from './middlewares/errorHandler';
import 'reflect-metadata';
import cors from 'cors';

const app: Application = express();

const corsOptions = {
  origin: 'http://localhost:3000', // クライアントのURL
  credentials: true,
  optionsSuccessStatus: 200
};

// ミドルウェア設定
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions)); // CORSミドルウェア追加

// ルーター設定
app.use('/api/v1', weaponsRouter);

// エラーハンドリング
app.use(errorHandler);

// データベース接続
sequelize.authenticate()
  .then(() => {
    console.log('Database connected');
    initializeDB();
    app.listen(3001, () => {
      console.log('Server running on port 3001');
    });
  })
  .catch(error => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });