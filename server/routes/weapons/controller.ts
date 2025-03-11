import { Request, Response } from 'express';
import { Weapon } from '../../models/Weapon';
import { ValidationError } from 'sequelize';

export const getWeapons = async (req: Request, res: Response) => {
  try {
    const weapons = await Weapon.findAll({
      attributes: ['id', 'name', 'selectedBy', 'createdAt'],
      order: [['id', 'ASC']]
    });
    res.json(weapons);
  } catch (error) {
    handleError(res, error, '武器一覧の取得に失敗しました');
  }
};

export const selectWeapon = async (req: Request, res: Response) => {
  try {
    const weapon = await Weapon.findByPk(req.params.id);
    
    if (!weapon) {
      return res.status(404).json({ error: '武器が見つかりません' });
    }
    
    if (weapon.selectedBy) {
      return res.status(409).json({ error: '既に選択されています' });
    }

    await weapon.update({ selectedBy: req.body.userId });
    res.json({
      success: true,
      weapon: {
        id: weapon.id,
        name: weapon.name,
        selectedBy: weapon.selectedBy
      }
    });
  } catch (error) {
    handleError(res, error, '武器の選択に失敗しました');
  }
};

// エラーハンドリング共通化
const handleError = (res: Response, error: unknown, defaultMessage: string) => {
  console.error(error);

  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: 'バリデーションエラー',
      details: error.errors.map(e => e.message)
    });
  }

  res.status(500).json({
    error: defaultMessage,
    details: error instanceof Error ? error.message : '不明なエラー'
  });
};