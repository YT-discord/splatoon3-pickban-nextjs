import { Router } from 'express';
import { getWeapons, selectWeapon } from './controller';
import { validateSelection } from './validation';

const router = Router();

router.get('/weapons', getWeapons);
router.post(
  '/weapons/:id/select',
  validateSelection,
  selectWeapon
);

export default router;