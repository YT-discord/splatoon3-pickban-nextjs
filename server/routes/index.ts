import { Router } from 'express';
import weaponsRouter from './weapons/routes';

const router = Router();

// APIバージョニング
router.use('/api/v1', [
  weaponsRouter,
]);

// ヘルスチェックエンドポイント
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});

// 404ハンドリング
router.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

export default router;