import { body, param, validationResult } from 'express-validator';
import { Weapon } from '../../models/Weapon';
import { Request, Response, NextFunction } from 'express';

export const validateSelection = [
  param('id')
    .isInt({ min: 1, max: 130 })
    .withMessage('有効な武器IDを指定してください')
    .custom(async (value) => {
      const weapon = await Weapon.findByPk(value);
      if (!weapon) throw new Error('存在しない武器IDです');
      return true;
    }),

  body('userId')
    .trim()
    .notEmpty()
    .withMessage('ユーザーIDは必須です')
    .isLength({ max: 36 })
    .withMessage('ユーザーIDは36文字以内で入力してください')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('使用できない文字が含まれています'),

  // 検証結果の処理
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];