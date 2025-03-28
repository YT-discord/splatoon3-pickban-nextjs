import { Router } from 'express';
import { getWeapons, selectWeapon, banWeapon } from './controller'; // banWeapon を追加
import { validateSelection, validateBan } from './validation'; // 変更: validateBan もインポート

const router = Router();

router.get('/weapons', getWeapons);
router.post(
  '/weapons/:id/select',
  validateSelection,
  selectWeapon
);
router.post( // 追加: /ban ルート
  '/weapons/:id/ban',
  validateBan, // 変更: validateBan を使用
  banWeapon
);

export default router;