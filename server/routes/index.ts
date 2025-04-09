import { Router } from 'express';

const router = Router();

// ヘルスチェックエンドポイント
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    // package.json があればバージョン表示可能
    // version: process.env.npm_package_version
  });
});

export default router;