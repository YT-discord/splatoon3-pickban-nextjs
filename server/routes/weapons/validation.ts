import { body, param, validationResult } from 'express-validator';
import { WeaponModel } from '../../models/Weapon';
import { Request, Response, NextFunction } from 'express';

export const validateSelection = [
  param('id')
    .isInt({ min: 1, max: 130 })
    .withMessage('有効な武器IDを指定してください')
    .custom(async (value) => {
      const weapon = await WeaponModel.findByPk(value);
      if (!weapon) throw new Error('存在しない武器IDです');
      return true;
    }),

    body('userId')
    .trim()
    .notEmpty()
    .withMessage('ユーザーIDは必須です')
    .isLength({ max: 5 })
    .withMessage('ユーザーIDは5文字以内で入力してください')
    .matches(/^(alpha|bravo)$/)
    .withMessage('alphaまたはbravoを指定してください'),

  // userName のバリデーションを追加
  body('userName')
    .trim()
    .notEmpty()
    .withMessage('ユーザー名は必須です')
    .isLength({ max: 20 }) // 最大文字数は適宜変更
    .withMessage('ユーザー名は20文字以内で入力してください'),

  // 検証結果の処理
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];