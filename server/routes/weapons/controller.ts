import { Request, Response } from 'express';
import { WeaponModel } from '../../models/Weapon';
import { ValidationError } from 'sequelize';
import { getGameState, handleSuccessfulPick, handleSuccessfulBan } from '../../gameLogic';
import { io } from '../../app';

export const getWeapons = async (req: Request, res: Response) => {
    try {
        const weapons = await WeaponModel.findAll({
            // ★ attribute も返すように変更 (ステップ4準備)
            attributes: ['id', 'name', 'selectedBy', 'bannedBy', 'attribute', 'createdAt', 'updatedAt'], // imageUrl は不要
            order: [['id', 'ASC']],
        });
        res.json(weapons);
    } catch (error) {
        handleError(res, error, '武器一覧の取得に失敗しました');
    }
};

interface SelectWeaponRequest extends Request {
  body: {
    userId: 'alpha' | 'bravo';
    userName: string; // userName は現状使われていないが、ログ等で活用可能
  };
  params: {
    id: string;
  }
}

export const selectWeapon = async (req: SelectWeaponRequest, res: Response) => {
    console.log('[Select Controller] Received request:', { params: req.params, body: req.body });
    const { currentPhase, currentTurn, turnActionTaken } = getGameState();
    const team = req.body.userId;
    const weaponId = req.params.id;

    console.log('[Select Controller] Current State:', { currentPhase, currentTurn, turnActionTaken });

    // --- エラーチェック ---
    if (currentPhase !== 'pick') {
        console.log('[Select Controller] Error: Not pick phase.');
        return res.status(400).json({ error: '選択フェーズではありません' });
    }
    if (currentTurn !== team) {
        console.log(`[Select Controller] Error: Not team ${team}'s turn (Current: ${currentTurn}).`);
        return res.status(403).json({ error: 'あなたのターンではありません' });
    }
    if (turnActionTaken[team]) {
        // ★ 既にアクション済みの場合でもエラーを返すべきか、リクエストを受け流すか検討
        // ここではエラーを返す
        console.log(`[Select Controller] Error: Action already taken by team ${team}.`);
        return res.status(400).json({ error: 'このターンでは既に選択済みです' });
    }
    // --------------------

    try {
        console.log(`[Select Controller] Finding weapon with ID: ${weaponId}`);
        const weapon = await WeaponModel.findByPk(weaponId);

        if (!weapon) {
            console.log('[Select Controller] Error: Weapon not found.');
            return res.status(404).json({ error: '武器が見つかりません' });
        }
        console.log('[Select Controller] Weapon found:', { id: weapon.id, name: weapon.name, selectedBy: weapon.selectedBy, bannedBy: weapon.bannedBy });

        if (weapon.selectedBy !== null) {
            console.log(`[Select Controller] Error: Weapon ${weapon.id} already selected by ${weapon.selectedBy}.`);
            return res.status(409).json({ error: 'その武器は既に選択されています' });
        }
        // bannedByのチェック (JSON配列のパースが必要な場合があるため注意)
        let isBanned = false;
        if (weapon.bannedBy) {
            try {
                // bannedBy が文字列で格納されている場合 (SQLite JSON型など)
                const bannedTeams = Array.isArray(weapon.bannedBy) ? weapon.bannedBy : JSON.parse(weapon.bannedBy as unknown as string);
                if (Array.isArray(bannedTeams) && bannedTeams.length > 0) {
                   isBanned = true;
                }
            } catch (e) {
                // 配列として直接格納されている場合 (PostgreSQL JSONBなど)
                 if (Array.isArray(weapon.bannedBy) && weapon.bannedBy.length > 0) {
                     isBanned = true;
                 }
            }
        }
        if (isBanned) {
            console.log(`[Select Controller] Error: Weapon ${weapon.id} is banned by ${JSON.stringify(weapon.bannedBy)}.`);
            return res.status(409).json({ error: 'その武器は禁止されています' });
        }

        console.log(`[Select Controller] Updating weapon ${weapon.id} selectedBy to ${team}...`);
        await weapon.update({ selectedBy: team });
        console.log(`[Select Controller] Weapon ${weapon.id} updated.`);

        // DB更新後の武器情報を取得 (重要: updateは更新後のオブジェクトを返さないことがある)
        const updatedWeapon = await WeaponModel.findByPk(weaponId);
        if (!updatedWeapon) {
            console.error('[Select Controller] Error: Failed to retrieve weapon after update!');
            throw new Error('Failed to retrieve weapon after update');
        }
        console.log('[Select Controller] Updated weapon retrieved:', updatedWeapon.toJSON()); // .toJSON() で見やすく

        // ★★★ サーバー内部のターン進行処理を呼び出す ★★★
        console.log(`[Select Controller] Calling handleSuccessfulPick for team ${team}.`);
        handleSuccessfulPick(team);
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★

        // クライアントに武器の更新情報を通知
        console.log(`[Select Controller] Emitting 'update weapon' for weapon ${updatedWeapon.id}...`);
        const weaponDataToSend = {
            id: updatedWeapon.id,
            name: updatedWeapon.name,
            selectedBy: updatedWeapon.selectedBy,
            bannedBy: updatedWeapon.bannedBy,
            attribute: updatedWeapon.attribute, // ★ attribute も含める
        };
        io.emit('update weapon', weaponDataToSend);

        // ▼▼▼ 'weapon selected' イベントの emit はコメントアウト ▼▼▼
        // console.log(`[Select Controller] Emitting 'weapon selected' for team ${team}...`);
        // io.emit('weapon selected', { team });
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        console.log(`[Select Controller] Sending success response for weapon ${updatedWeapon.id}.`);
        res.json({
            success: true,
            weapon: weaponDataToSend, // 更新後のデータを返す
        });
    } catch (error) {
        console.error('[Select Controller] Error during selection process:', error);
        handleError(res, error, '武器の選択に失敗しました');
    }
};

export const banWeapon = async (req: SelectWeaponRequest, res: Response) => {
  const team = req.body.userId;
  const weaponId = req.params.id;
  const { banPhaseState, currentPhase } = getGameState();

  console.log(`[Ban Controller] Received request for weapon ${weaponId} by team ${team}. Current Phase: ${currentPhase}`);
  // ★ 取得した最新の banPhaseState でログ表示＆チェック
  console.log(`[Ban Controller] Current Ban State from getGameState(): Alpha=${banPhaseState.bans.alpha}, Bravo=${banPhaseState.bans.bravo}`);

  if (currentPhase !== 'ban') {
      console.log('[Ban Controller] Error: Not ban phase.');
      return res.status(400).json({ error: '禁止フェーズではありません' });
  }

  // ★ 最新の banPhaseState で上限チェック
  if (banPhaseState.bans[team] >= banPhaseState.maxBansPerTeam) {
      console.log(`[Ban Controller] Error: Team ${team} reached max bans (${banPhaseState.bans[team]}/${banPhaseState.maxBansPerTeam}).`);
      return res.status(400).json({ error: `禁止できる武器は${banPhaseState.maxBansPerTeam}つまでです` });
  }

  try {
      const weapon = await WeaponModel.findByPk(weaponId);

      if (!weapon) { return res.status(404).json({ error: '武器が見つかりません' }); }
      let currentBans: ('alpha' | 'bravo')[] = [];
      if (weapon.bannedBy) { try { currentBans = Array.isArray(weapon.bannedBy) ? weapon.bannedBy : JSON.parse(weapon.bannedBy as unknown as string || '[]'); if (!Array.isArray(currentBans)) currentBans = []; } catch(e){ currentBans = []; } }
      if (currentBans.includes(team)) {
        console.log(`[Ban Controller] Error: Weapon ${weaponId} already banned by own team ${team}.`);
        return res.status(409).json({ error: 'あなたのチームはこの武器を既に禁止しています' });
    }
      if (weapon.selectedBy) { return res.status(409).json({ error: 'その武器は既に選択されているため禁止できません' }); }


      // 禁止リストに追加 & DB更新
      const updatedBannedBy = [...currentBans, team];
      console.log(`[Ban Controller] Updating weapon ${weaponId} bannedBy to ${JSON.stringify(updatedBannedBy)}...`);
      await weapon.update({ bannedBy: updatedBannedBy });

      const updatedWeapon = await WeaponModel.findByPk(weaponId);
      if (!updatedWeapon) { throw new Error('Failed to retrieve weapon after update'); }
      console.log('[Ban Controller] Updated weapon retrieved:', updatedWeapon.toJSON());

      console.log(`[Ban Controller] Calling handleSuccessfulBan for team ${team}...`);

      handleSuccessfulBan(team); // team情報を渡す
      // イベント発行 (update weapon) - クライアントUI更新用 (これは必要)
      console.log(`[Ban Controller] Emitting 'update weapon' for weapon ${updatedWeapon.id}...`);
      const weaponDataToSend = {
          id: updatedWeapon.id,
          name: updatedWeapon.name,
          selectedBy: updatedWeapon.selectedBy,
          bannedBy: updatedWeapon.bannedBy,
          attribute: updatedWeapon.attribute,
      };
      io.emit('update weapon', weaponDataToSend);
      console.log(`[Ban Controller] Sending success response for weapon ${updatedWeapon.id}.`);
      res.json({ success: true, weapon: weaponDataToSend });

  } catch (error) {
      console.error('[Ban Controller] Error during banning process:', error);
      handleError(res, error, '武器の禁止に失敗しました');
  }
};

const handleError = (res: Response, error: unknown, defaultMessage: string) => {
  console.error('API Error:', error); // エラーログ改善

  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: 'バリデーションエラー',
      details: error.errors.map(e => ({ path: e.path, message: e.message })) // 詳細情報追加
    });
  }

  // エラーオブジェクトからメッセージを取得試行
  let errorMessage = defaultMessage;
  if (error instanceof Error) {
      errorMessage = error.message || defaultMessage;
  } else if (typeof error === 'string') {
      errorMessage = error;
  }

  res.status(500).json({
    error: defaultMessage, // 一般的なメッセージ
    details: errorMessage // 詳細なエラーメッセージ
  });
};