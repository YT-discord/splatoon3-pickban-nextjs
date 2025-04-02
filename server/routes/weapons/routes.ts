import { Router } from 'express';
import { getWeapons, selectWeapon, banWeapon } from './controller';
import { validateSelection, validateBan } from './validation';

const router = Router();

router.get('/weapons', getWeapons);
router.post(
  '/weapons/:id/select',
  validateSelection,
  selectWeapon
);
router.post(
  '/weapons/:id/ban',
  validateBan,
  banWeapon
);

export default router;