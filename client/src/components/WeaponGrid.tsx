'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { io, Socket } from 'socket.io-client';

const totalPickTurns = 8; // サーバーと合わせること

interface Weapon {
  id: number;
  name: string;
  selectedBy: 'alpha' | 'bravo' | null;
  bannedBy: ('alpha' | 'bravo')[] | null;
  imageUrl: string;
  attribute: string; // ★ 追加 (ソート用)
}

// ★ GameState インターフェースに 'pick_complete' を追加
interface GameState {
  phase: 'waiting' | 'ban' | 'pick' | 'pick_complete'; // ★ 追加
  timeLeft: number;
  currentTurn: 'alpha' | 'bravo' | null;
  currentPickTurnNumber?: number;
  banPhaseState?: {
    bans: { alpha: number; bravo: number; };
    maxBansPerTeam: number;
  };
  pickPhaseState?: {
    picks: { alpha: number; bravo: number; };
    maxPicksPerTeam: number;
  };
}

const WeaponGrid = () => {
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'alpha' | 'bravo'>('alpha'); // 初期値を設定
  const [userName, setUserName] = useState(''); // 初期値を設定
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    timeLeft: 0,
    currentTurn: null,
    currentPickTurnNumber: 0,
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [hasSelectedThisTurn, setHasSelectedThisTurn] = useState(false);

  // --- WebSocket接続とイベントリスナー設定 ---
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);
    console.log('[WS Client] Connecting...');

    newSocket.on('connect', () => {
        console.log('[WS Client] Connected:', newSocket.id);
        // ★ 接続直後にも現在の情報を送信（再接続時などを考慮）
        newSocket.emit('set user info', { name: userName || '名無し', team: selectedTeam });
    });

    newSocket.on('disconnect', (reason) => {
        console.log('[WS Client] Disconnected:', reason);
    });

    newSocket.on('initial state', (initialState: GameState) => {
      console.log('[WS Client] Received initial state:', initialState);
      setGameState(initialState);
      setHasSelectedThisTurn(false); // 状態が変わったらリセット
    });

    newSocket.on('phase change', (newState: GameState) => {
      console.log('[WS Client] Received phase change:', newState);
      // フェーズが変わったら、自分のターン選択済みフラグをリセット
      setHasSelectedThisTurn(false);
      setGameState(newState);
      // Pickフェーズ開始時またはPick Complete時にターン数をリセット（あるいはサーバーから正しい値を受け取る）
       if (newState.phase === 'pick' && newState.currentPickTurnNumber === 1) {
           console.log("Pick phase started, resetting hasSelectedThisTurn");
           setHasSelectedThisTurn(false);
       } else if (newState.phase === 'pick_complete'){
           console.log("Pick phase completed.");
           // 必要なら完了時の処理
       }
    });

    newSocket.on('time update', (newTimeLeft: number) => {
      setGameState((prev) => ({ ...prev, timeLeft: newTimeLeft }));
    });

    newSocket.on('update weapon', (updatedWeaponData: Omit<Weapon, 'imageUrl'>) => {
      console.log('[WS Client] Received update weapon:', updatedWeaponData);
      setWeapons((prevWeapons) =>
        prevWeapons.map((w) =>
          w.id === updatedWeaponData.id
            ? {
                ...w, // imageUrl は維持
                ...updatedWeaponData, // サーバーからのデータで上書き
              }
            : w
        )
      );
    });

    newSocket.on('initial weapons', (initialWeaponsData: Omit<Weapon, 'imageUrl'>[]) => {
      console.log('[WS Client] Received initial weapons:', initialWeaponsData);
      const weaponsWithImageUrl = initialWeaponsData.map((weapon) => ({
        ...weapon,
        // imageUrl がサーバーからのデータに含まれていないことを確認
        imageUrl: `/images/${encodeURIComponent(weapon.name)}.png`,
        // ★ attribute がサーバーから来ていることを確認
        attribute: weapon.attribute || '不明', // fallback
      }));
      setWeapons(weaponsWithImageUrl);
    });

    return () => {
      console.log('[WS Client] Disconnecting socket...');
      newSocket.disconnect();
      // リスナー解除
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('initial state');
      newSocket.off('phase change');
      newSocket.off('time update');
      // newSocket.off('weapon selected'); // ★ 削除
      newSocket.off('update weapon');
      newSocket.off('initial weapons');
    };
    // ★ useEffect の依存配列を見直し。初回のみ実行で良いはず。
  }, []); // 空の依存配列

  // --- 初期武器データ取得 ---
  useEffect(() => {
    const fetchWeapons = async () => {
      setLoading(true); // ローディング開始
      try {
        console.log('Fetching initial weapons from API...');
        const res = await fetch('http://localhost:3001/api/v1/weapons'); // GETリクエスト
        if (!res.ok) throw new Error('データ取得に失敗しました');
        // サーバーからは attribute も返ってくる想定
        const serverWeaponsData: Omit<Weapon, 'imageUrl'>[] = await res.json();
        console.log('Fetched weapons data:', serverWeaponsData);

        const weaponsWithImageUrl = serverWeaponsData.map((weapon) => ({
          ...weapon,
          imageUrl: `/images/${encodeURIComponent(weapon.name)}.png`,
          attribute: weapon.attribute || '不明', // fallback
        }));

        console.log('Generated weapons with imageUrl:', weaponsWithImageUrl);
        setWeapons(weaponsWithImageUrl);
      } catch (error) {
        handleError(error);
      } finally {
        setLoading(false); // ローディング終了
      }
    };
    // マウント時に武器データを取得
    fetchWeapons();
  }, []); // 空の依存配列でマウント時に1回だけ実行

  // ★★★ チーム選択またはユーザー名が変更されたらサーバーへユーザー情報を送信 ★★★
  useEffect(() => {
    // socket が null でなく、接続済みの場合のみ emit
    if (socket && socket.connected) {
      const infoToSend = {
        name: userName || '名無し', // 名前が空なら '名無し' を送信
        team: selectedTeam
      };
      console.log(`[User Info Emit] Sending user info due to change:`, infoToSend);
      socket.emit('set user info', infoToSend);
    }
    // 依存配列に socket, selectedTeam, userName を指定
    // これらが変更されるたびに副作用が実行される
  }, [socket, selectedTeam, userName]);

  const handleError = (error: unknown) => {
    let message = '不明なエラーが発生しました';
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }
    console.error('Error:', message); // コンソールにもエラー出力
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  // --- 武器選択/禁止処理 ---
  const handleSelect = async (id: number) => {
    const weapon = weapons.find(w => w.id === id);
    if (!weapon) return;

    const currentPhase = gameState.phase; // 変数に代入

    // --- クリックできない条件 ---
    if (
      currentPhase === 'waiting' ||
      currentPhase === 'pick_complete' || // ★ 完了フェーズでも不可
      loading ||
      // Pickフェーズの条件
      (currentPhase === 'pick' && (
          gameState.currentTurn !== selectedTeam || // 自分のターンでない
          hasSelectedThisTurn ||                   // 既に選択済み
          weapon.selectedBy !== null ||            // 誰かに選択されている
          (weapon.bannedBy && weapon.bannedBy.length > 0) // 禁止されている
      )) ||
      // Banフェーズの条件
      (currentPhase === 'ban' && (
          // 自分のチームの禁止上限チェック (サーバーでもチェックするがUIでも)
          (gameState.banPhaseState?.bans[selectedTeam] ?? 0) >= (gameState.banPhaseState?.maxBansPerTeam ?? 3) ||
          (weapon.bannedBy && weapon.bannedBy.length > 0) || // 既に禁止されている
          weapon.selectedBy !== null // 既に選択されている (禁止フェーズ開始前に選択されることはないはずだが念のため)
      ))
    ) {
      console.log('Selection/Ban prevented:', { currentPhase, currentTurn: gameState.currentTurn, selectedTeam, hasSelectedThisTurn, weaponStatus: { selectedBy: weapon.selectedBy, bannedBy: weapon.bannedBy }, banCount: gameState.banPhaseState?.bans[selectedTeam]});
      return;
    }
    // -------------------------


    setLoading(true);
    const action = currentPhase === 'ban' ? 'ban' : 'select';
    const endpoint = `http://localhost:3001/api/v1/weapons/${id}/${action}`;

    console.log(`Sending ${action} request for weapon ${id} by team ${selectedTeam}...`);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedTeam, userName: userName || '名無し' }), // userNameも送信
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(errorData.error || errorData.details || `${action === 'ban' ? '禁止' : '選択'}に失敗しました`);
      }

      const result = await response.json();
      console.log(`Weapon ${action} successful:`, result);

      // --- ローカル状態の即時反映 ---
      if (currentPhase === 'pick') {
          // setWeapons(...) は 'update weapon' イベントで更新されるのを待っても良いが、
          // 即時反映させたい場合はここで行う
          setWeapons((prev) =>
              prev.map((w) => (w.id === id ? { ...w, selectedBy: selectedTeam } : w))
          );
          setHasSelectedThisTurn(true); // ★ 自分が選択したらフラグを立てる
          console.log('Local state updated for pick, hasSelectedThisTurn set to true.');
      } else if (currentPhase === 'ban') {
          // setWeapons(...) は 'update weapon' イベントで更新されるのを待つ
           setWeapons((prev) =>
              prev.map((w) =>
                w.id === id
                  ? { ...w, bannedBy: [...(w.bannedBy || []), selectedTeam] }
                  : w
              )
          );
          // Banの場合、hasSelectedThisTurn は関係ないが、
          // Ban上限に達したかの判定は gameState.banPhaseState を見る
          console.log('Local state updated for ban.');
      }
      // ---------------------------

    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  // --- ゲーム開始処理 ---
  const handleStart = () => {
    if (socket && gameState.phase === 'waiting') { // waiting 中のみ実行
      console.log('Requesting to start game...');
      socket.emit('start game');
    }
  };

  // --- 表示用データの準備 ---
  const alphaPicks = weapons.filter((w) => w.selectedBy === 'alpha');
  const bravoPicks = weapons.filter((w) => w.selectedBy === 'bravo');
  // ★ 禁止武器の表示ロジックはステップ2で変更予定 (今は全表示)
  const alphaBans = weapons.filter((w) => w.bannedBy?.includes('alpha'));
  const bravoBans = weapons.filter((w) => w.bannedBy?.includes('bravo'));


  // --- レンダリング ---
  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap justify-between items-center gap-4 p-4 bg-gray-100 rounded-lg shadow">
        {/* User Info & Team Selection */}
        <div className="flex items-center gap-4">
          <div>
            <label htmlFor="userName" className="block text-sm font-medium text-gray-700">ユーザー名:</label>
            <input
              type="text"
              id="userName"
              value={userName}
              // ★ onChange で userName state を更新
              onChange={(e) => setUserName(e.target.value)}
              className="mt-1 px-3 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="名前を入力"
              disabled={gameState.phase !== 'waiting'} // ゲーム中は変更不可にする
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">チーム:</span>
            <button
              // ★ onClick で selectedTeam state を更新
              onClick={() => setSelectedTeam('alpha')}
              disabled={gameState.phase !== 'waiting'} // ゲーム中は変更不可
              className={`px-3 py-1 rounded-md text-sm ${selectedTeam === 'alpha' ? 'bg-blue-500 text-white font-semibold' : 'bg-gray-200 hover:bg-gray-300'} ${gameState.phase !== 'waiting' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              アルファ
            </button>
            <button
              // ★ onClick で selectedTeam state を更新
              onClick={() => setSelectedTeam('bravo')}
              disabled={gameState.phase !== 'waiting'} // ゲーム中は変更不可
              className={`px-3 py-1 rounded-md text-sm ${selectedTeam === 'bravo' ? 'bg-red-500 text-white font-semibold' : 'bg-gray-200 hover:bg-gray-300'} ${gameState.phase !== 'waiting' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              ブラボー
            </button>
          </div>
        </div>
        
        {/* Game Status */}
        <div className="text-center space-y-1">
          <p className="text-lg font-semibold">
            フェーズ: <span className="font-bold text-indigo-600">{gameState.phase}</span>
          </p>
          {(gameState.phase === 'pick' || gameState.phase === 'pick_complete') && gameState.currentPickTurnNumber && (
            <p>ターン: {gameState.currentPickTurnNumber} / {totalPickTurns}</p>
          )}
          {(gameState.phase === 'ban' || gameState.phase === 'pick') && (
             <p className="text-xl font-mono">残り時間: {gameState.timeLeft}秒</p>
          )}
           {(gameState.phase === 'pick') && gameState.currentTurn && (
             <p>現在のターン: <span className={`font-bold ${gameState.currentTurn === 'alpha' ? 'text-blue-600' : 'text-red-600'}`}>{gameState.currentTurn}チーム</span></p>
           )}
           {gameState.phase === 'pick_complete' && (
               <p className="font-bold text-green-600 text-xl">選択完了！</p>
           )}
        </div>

        {/* Start Button */}
        <div>
            {gameState.phase === 'waiting' && (
                <button
                    onClick={handleStart}
                    className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                    disabled={!socket || loading} // Socket未接続やローディング中は無効
                >
                    ゲーム開始
                </button>
            )}
             {/* ★ リセットボタンを追加 (デバッグ用など) */}
             {(gameState.phase === 'ban' || gameState.phase === 'pick' || gameState.phase === 'pick_complete') && (
                 <button
                    onClick={() => socket?.emit('reset game')} // サーバーにリセット要求
                    className="ml-4 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                 >
                     リセット
                 </button>
             )}
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-center">
          エラー: {errorMessage}
        </div>
      )}

      {/* Picked/Banned Weapons Display */}
      {(gameState.phase !== 'waiting') && ( // Waiting中は表示しない
          <div className="flex flex-col md:flex-row gap-4">
              {/* Alpha Team */}
              <div className="flex-1 border rounded-lg p-3 bg-blue-50 shadow-sm">
                  <h3 className="text-lg font-semibold mb-2 text-blue-800">アルファチーム {selectedTeam === 'alpha' ? '(あなた)' : ''}</h3>
                  <div className="mb-3">
                      <h4 className="text-md font-medium mb-1 text-blue-700">選択 ({alphaPicks.length}/{gameState.pickPhaseState?.maxPicksPerTeam ?? 4})</h4>{/* ちょっと変えちゃった */}
                      <div className="flex flex-wrap gap-1">
                          {alphaPicks.length > 0 ? alphaPicks.map((weapon) => (
                              <div key={weapon.id} className="relative border border-blue-300 rounded p-1 bg-white">
                                  <Image src={weapon.imageUrl} alt={weapon.name} width={60} height={60} />
                              </div>
                          )) : <p className="text-sm text-gray-500">選択なし</p>}
                      </div>
                  </div>
                  <div>
                      <h4 className="text-md font-medium mb-1 text-blue-700">禁止 ({alphaBans.length}/{gameState.banPhaseState?.maxBansPerTeam ?? 3})</h4>{/* ちょっと変えちゃった */}
                       <div className="flex flex-wrap gap-1">
                          {/* ★ 禁止表示はステップ2で変更 */}
                          {alphaBans.length > 0 ? alphaBans.map((weapon) => (
                              <div key={weapon.id} className="relative border border-gray-400 rounded p-1 bg-gray-200">
                                  <Image src={weapon.imageUrl} alt={weapon.name} width={60} height={60} className="opacity-70" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                  </div>
                              </div>
                          )) : <p className="text-sm text-gray-500">禁止なし</p>}
                      </div>
                  </div>
              </div>
              {/* Bravo Team */}
              <div className="flex-1 border rounded-lg p-3 bg-red-50 shadow-sm">
                  <h3 className="text-lg font-semibold mb-2 text-red-800">ブラボーチーム {selectedTeam === 'bravo' ? '(あなた)' : ''}</h3>
                   <div className="mb-3">
                      <h4 className="text-md font-medium mb-1 text-red-700">選択 ({bravoPicks.length}/{gameState.pickPhaseState?.maxPicksPerTeam ?? 4})</h4>{/* ちょっと変えちゃった */}
                      <div className="flex flex-wrap gap-1">
                           {bravoPicks.length > 0 ? bravoPicks.map((weapon) => (
                              <div key={weapon.id} className="relative border border-red-300 rounded p-1 bg-white">
                                  <Image src={weapon.imageUrl} alt={weapon.name} width={60} height={60} />
                              </div>
                          )) : <p className="text-sm text-gray-500">選択なし</p>}
                      </div>
                  </div>
                  <div>
                      <h4 className="text-md font-medium mb-1 text-red-700">禁止 ({bravoBans.length}/{gameState.banPhaseState?.maxBansPerTeam ?? 3})</h4>{/* ★ ちょっと変えちゃった */}
                       <div className="flex flex-wrap gap-1">
                          {/* ★ 禁止表示はステップ2で変更 */}
                           {bravoBans.length > 0 ? bravoBans.map((weapon) => (
                              <div key={weapon.id} className="relative border border-gray-400 rounded p-1 bg-gray-200">
                                  <Image src={weapon.imageUrl} alt={weapon.name} width={60} height={60} className="opacity-70"/>
                                   <div className="absolute inset-0 flex items-center justify-center">
                                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                  </div>
                              </div>
                          )) : <p className="text-sm text-gray-500">禁止なし</p>}
                      </div>
                  </div>
              </div>
          </div>
      )}


      {/* Weapon Grid */}
      {(gameState.phase === 'ban' || gameState.phase === 'pick') && ( // ban か pick 中のみ表示
          <div className="overflow-x-auto">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                  {weapons.map((weapon) => {
                      const isSelectedByAlpha = weapon.selectedBy === 'alpha';
                      const isSelectedByBravo = weapon.selectedBy === 'bravo';
                      const isBanned = weapon.bannedBy && weapon.bannedBy.length > 0; // ★ ステップ2で詳細化
                      // const isBannedByMe = weapon.bannedBy?.includes(selectedTeam); // ★ ステップ2で使用

                      // --- クリック可能かどうかの判定 (handleSelectのガードと同期) ---
                      let canClick = false;
                      if (gameState.phase === 'pick' &&
                          gameState.currentTurn === selectedTeam &&
                          !hasSelectedThisTurn &&
                          !isSelectedByAlpha && !isSelectedByBravo && !isBanned) {
                          canClick = true;
                      } else if (gameState.phase === 'ban' &&
                          !isBanned && !isSelectedByAlpha && !isSelectedByBravo && // 誰も選択/禁止していない
                          (gameState.banPhaseState?.bans[selectedTeam] ?? 0) < (gameState.banPhaseState?.maxBansPerTeam ?? 3)) { // 自分の禁止上限未満
                           canClick = true;
                      }
                      const isDisabled = loading || !canClick;
                      // ----------------------------------------------------------

                      // --- 見た目のスタイル決定 ---
                      let bgColor = 'bg-white';
                      let borderColor = 'border-gray-200';
                      let opacity = 'opacity-100';
                      let ring = '';
                      let hoverEffect = 'hover:bg-blue-50 hover:border-blue-300';

                      if (isSelectedByAlpha) {
                          bgColor = 'bg-blue-100';
                          borderColor = 'border-blue-400';
                          ring = 'ring-2 ring-offset-1 ring-blue-500';
                          hoverEffect = ''; // 選択済みはホバー効果なし
                      } else if (isSelectedByBravo) {
                          bgColor = 'bg-red-100';
                          borderColor = 'border-red-400';
                          ring = 'ring-2 ring-offset-1 ring-red-500';
                           hoverEffect = ''; // 選択済みはホバー効果なし
                      } else if (isBanned) { // ★ ステップ2で条件変更
                          bgColor = 'bg-gray-300';
                          borderColor = 'border-gray-400';
                          opacity = 'opacity-50';
                           hoverEffect = ''; // 禁止済みはホバー効果なし
                      }

                      if (isDisabled && !isSelectedByAlpha && !isSelectedByBravo && !isBanned) {
                           bgColor = 'bg-gray-100';
                           opacity = 'opacity-60';
                           hoverEffect = ''; // 無効状態はホバー効果なし
                      }
                      // ---------------------------

                      return (
                          <div
                              key={weapon.id}
                              className={`relative p-2 rounded-lg border transition-all duration-150 ${bgColor} ${borderColor} ${opacity} ${ring} ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer ' + hoverEffect}`}
                              onClick={() => !isDisabled && handleSelect(weapon.id)} // isDisabledならonClick発火しない
                              title={weapon.name} // ツールチップ
                          >
                              <Image
                                  src={weapon.imageUrl}
                                  alt={weapon.name}
                                  width={100}
                                  height={100}
                                  className="mx-auto"
                                  priority={weapon.id <= 12} // 最初の数個を優先読み込み
                              />
                              {/* 禁止マーク (ステップ2で条件変更) */}
                              {isBanned && (
                                   <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-lg">
                                      <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                                  </div>
                              )}
                              {/* 選択チーム表示 (オプション) */}
                              {/* {isSelectedByAlpha && <div className="absolute top-1 left-1 px-1 py-0.5 text-xs bg-blue-500 text-white rounded">A</div>} */}
                              {/* {isSelectedByBravo && <div className="absolute top-1 left-1 px-1 py-0.5 text-xs bg-red-500 text-white rounded">B</div>} */}

                               {/* ターン表示 (自分のターンの時だけ表示) */}
                               {gameState.phase === 'pick' && gameState.currentTurn === selectedTeam && canClick && (
                                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs bg-green-200 text-green-800 rounded font-semibold animate-pulse">
                                      Pick!
                                  </div>
                               )}
                               {gameState.phase === 'ban' && canClick && (
                                   <div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded font-semibold animate-pulse">
                                       Ban!
                                  </div>
                               )}

                          </div>
                      );
                  })}
              </div>
          </div>
       )}
       {/* ローディング表示 */}
       {loading && (
           <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
               <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
           </div>
       )}
    </div>
  );
};

export default WeaponGrid;