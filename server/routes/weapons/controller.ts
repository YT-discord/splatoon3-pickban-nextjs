import { Request, Response } from 'express';
import { WeaponModel } from '../../models/Weapon';
import { ValidationError } from 'sequelize';

export const getWeapons = async (req: Request, res: Response) => {
  try {
    const weapons = await WeaponModel.findAll({
      attributes: ['id', 'name', 'selectedBy', 'createdAt'], // imageUrl はDBにないので含めない
      order: [['id', 'ASC']],
    });

    // imageUrl を追加
    const weaponsWithImageUrl = weapons.map((weapon) => ({
      ...weapon.toJSON(), // toJSON() を使うと、Sequelize オブジェクトをプレーンなオブジェクトに変換できる
      imageUrl: `/images/${weapon.name}.png`,
    }));

    res.json(weaponsWithImageUrl);
  } catch (error) {
    handleError(res, error, '武器一覧の取得に失敗しました');
  }
};

interface SelectWeaponRequest extends Request {
  body: {
    userId: 'alpha' | 'bravo';
    userName: string; // userName を追加
  };
  params: {
    id: string;
  }
}

export const selectWeapon = async (req: SelectWeaponRequest, res: Response) => {
  try {
    const weapon = await WeaponModel.findByPk(req.params.id);

    if (!weapon) {
      return res.status(404).json({ error: '武器が見つかりません' });
    }

    // 変更: selectedBy が既に 'alpha' または 'bravo' であればエラー
    if (weapon.selectedBy === 'alpha' || weapon.selectedBy === 'bravo') {
      return res.status(409).json({ error: '既に選択されています' });
    }

    // 変更: req.body.userId を req.body.userId に変更
    await weapon.update({ selectedBy: req.body.userId });
    res.json({
      success: true,
      weapon: {
        id: weapon.id,
        name: weapon.name,
        selectedBy: weapon.selectedBy,
      },
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