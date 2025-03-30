import { Request, Response } from 'express';
import { WeaponModel } from '../../models/Weapon';
import { ValidationError } from 'sequelize';
import { io } from '../../app'; // socket.io インスタンス
import { getGameState } from '../../app'; // ゲーム状態取得関数

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

    const updatedWeapon = await WeaponModel.findByPk(req.params.id);
    if (!updatedWeapon) {
        throw new Error('Failed to retrieve weapon after update');
    }

    // イベント発行
    io.emit('weapon selected', { team: req.body.userId });
    // 修正: 再取得したデータから必要なものだけ送信
    const weaponDataToSend = {
        id: updatedWeapon.id,
        name: updatedWeapon.name,
        selectedBy: updatedWeapon.selectedBy,
        bannedBy: updatedWeapon.bannedBy,
    };
    io.emit('update weapon', weaponDataToSend);

    // レスポンスも再取得したデータ基準に
    res.json({
      success: true,
      weapon: weaponDataToSend, // 修正
    });
  } catch (error) {
    handleError(res, error, '武器の選択に失敗しました');
  }
};

// 武器禁止 (修正)
export const banWeapon = async (req: SelectWeaponRequest, res: Response) => {
  const { banPhaseState, currentPhase } = getGameState(); // ゲーム状態取得
  const team = req.body.userId;

  if (currentPhase !== 'ban') {
    return res.status(400).json({ error: '禁止フェーズではありません' });
  }

  // 変更: banPhaseState へのアクセス方法を変更
  if (banPhaseState.bans[team] >= banPhaseState.maxBansPerTeam) {
    return res.status(400).json({ error: `禁止できる武器は${banPhaseState.maxBansPerTeam}つまでです` });
  }


  try {
    const weapon = await WeaponModel.findByPk(req.params.id);

    if (!weapon) {
      return res.status(404).json({ error: '武器が見つかりません' });
    }

    // bannedBy が null または空配列の場合のみ処理を進める
    const currentBans = weapon.bannedBy || []; // null の場合は空配列として扱う

    // 既に自分が禁止していたらエラー (念のため)
    if (currentBans.includes(team)) {
      return res.status(409).json({ error: '既に禁止しています' });
    }

    // 禁止リストに追加
    const updatedBannedBy = [...currentBans, team];
    await weapon.update({ bannedBy: updatedBannedBy });

    const updatedWeapon = await WeaponModel.findByPk(req.params.id);
    if (!updatedWeapon) {
        // 更新後に見つからないのは異常だが、念のためハンドル
        throw new Error('Failed to retrieve weapon after update');
    }

    // イベント発行
    io.emit('weapon banned', { team: req.body.userId });
    // 修正: 再取得したデータから必要なものだけ送信
    const weaponDataToSend = {
        id: updatedWeapon.id,
        name: updatedWeapon.name,
        selectedBy: updatedWeapon.selectedBy,
        bannedBy: updatedWeapon.bannedBy,
    };
    io.emit('update weapon', weaponDataToSend);

    // レスポンスも再取得したデータ基準に (必須ではないが整合性のため)
    res.json({
      success: true,
      weapon: weaponDataToSend, // 修正
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