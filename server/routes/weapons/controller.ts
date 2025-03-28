import { Request, Response } from 'express';
import { WeaponModel } from '../../models/Weapon';
import { ValidationError } from 'sequelize';
import { io, getGameState } from '../../app'; // 変更: socket.io インスタンスをインポート (app.ts から export する必要あり)

export const getWeapons = async (req: Request, res: Response) => {
  try {
    const weapons = await WeaponModel.findAll({
      // 修正: imageUrl は返さないので attributes から削除 (元々なくてもOK)
      attributes: ['id', 'name', 'selectedBy', 'bannedBy', 'createdAt'],
      order: [['id', 'ASC']],
    });
    // サーバー側で imageUrl を生成する処理は削除
    res.json(weapons); // DBから取得したデータをそのまま返す
  } catch (error) {
    handleError(res, error, '武器一覧の取得に失敗しました');
  }
};

interface SelectWeaponRequest extends Request {
  body: {
    userId: 'alpha' | 'bravo';
    userName: string;
  };
  params: {
    id: string;
  }
}

export const selectWeapon = async (req: SelectWeaponRequest, res: Response) => {
  // 追加: サーバー側のゲーム状態を取得 (app.ts から export する必要あり)
  const { currentPhase, currentTurn, turnActionTaken } = getGameState();

  // 追加: 選択フェーズでない場合はエラー
  if (currentPhase !== 'pick') {
    return res.status(400).json({ error: '選択フェーズではありません' });
  }

  // 追加: 現在のターンでない場合はエラー
  if (currentTurn !== req.body.userId) {
    return res.status(403).json({ error: 'あなたのターンではありません' });
  }

  // 追加: このターンで既に選択済みの場合はエラー
  if (turnActionTaken[req.body.userId]) {
    return res.status(400).json({ error: 'このターンでは既に選択済みです' });
  }

  try {
    const weapon = await WeaponModel.findByPk(req.params.id);

    if (!weapon) {
      return res.status(404).json({ error: '武器が見つかりません' });
    }

    if (weapon.selectedBy) {
      return res.status(409).json({ error: '既に選択されています' });
    }

    await weapon.update({ selectedBy: req.body.userId });

    // 追加: weapon selected イベントを発行
    io.emit('weapon selected', { team: req.body.userId });

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

export const banWeapon = async (req: SelectWeaponRequest, res: Response) => {
  try {
    const weapon = await WeaponModel.findByPk(req.params.id);

    if (!weapon) {
      return res.status(404).json({ error: '武器が見つかりません' });
    }
    //bannedByがnullの場合は空の配列で初期化
    if(weapon.bannedBy === null){
      await weapon.update({bannedBy: []});
    }
    // すでに禁止しているチームが含まれていたらエラー
    if (weapon.bannedBy.includes(req.body.userId)) {
      return res.status(409).json({ error: '既に禁止しています' });
    }
    //bannedByに追加
    const updatedBannedBy = [...weapon.bannedBy, req.body.userId];
    await weapon.update({ bannedBy: updatedBannedBy });
    res.json({
      success: true,
      weapon: {
        id: weapon.id,
        name: weapon.name,
        bannedBy: weapon.bannedBy,
      },
    });
  } catch (error) {
    handleError(res, error, '武器の禁止に失敗しました');
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