'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { io, Socket } from 'socket.io-client';

// --- インターフェース定義 ---
interface Weapon {
  id: number;
  name: string;
  selectedBy: 'alpha' | 'bravo' | null;
  bannedBy: ('alpha' | 'bravo')[] | null;
  imageUrl: string; // クライアントで生成
  attribute: string;
}

interface GameState {
  phase: 'waiting' | 'ban' | 'pick' | 'pick_complete';
  timeLeft: number;
  currentTurn: 'alpha' | 'bravo' | null;
  currentPickTurnNumber?: number;
  banPhaseState?: { bans: { alpha: number; bravo: number; }; maxBansPerTeam: number; };
  pickPhaseState?: { picks: { alpha: number; bravo: number; }; maxPicksPerTeam: number; };
}

// --- 定数 ---
const totalPickTurns = 8;
const activeGamePhases: GameState['phase'][] = ['ban', 'pick', 'pick_complete']; // waiting 以外のフェーズ

// --- コンポーネント本体 ---
const WeaponGrid = () => {
  // --- State定義 ---
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [loading, setLoading] = useState(true); // ★ 初期ロード + API通信用フラグ
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'alpha' | 'bravo'>('alpha');
  const [userName, setUserName] = useState('');
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    timeLeft: 0,
    currentTurn: null,
    currentPickTurnNumber: 0,
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [hasSelectedThisTurn, setHasSelectedThisTurn] = useState(false); // Pickフェーズで自分のターンに選択済みか

  // --- WebSocket接続とイベントリスナー設定 ---
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);
    console.log('[WS Client] Connecting...');

    newSocket.on('connect', () => {
        console.log('[WS Client] Connected:', newSocket.id);
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
      setHasSelectedThisTurn(false); // フェーズが変わったらリセット
      setGameState(newState);
    });

    newSocket.on('time update', (newTimeLeft: number) => {
      setGameState((prev) => ({ ...prev, timeLeft: newTimeLeft }));
    });

    newSocket.on('update weapon', (updatedWeaponData: Omit<Weapon, 'imageUrl'>) => {
      console.log('[WS Client] Received update weapon:', updatedWeaponData);
      setWeapons((prevWeapons) =>
        prevWeapons.map((w) =>
          w.id === updatedWeaponData.id
            ? { ...w, ...updatedWeaponData } // imageUrl は維持しつつ他を更新
            : w
        )
      );
    });

    newSocket.on('initial weapons', (initialWeaponsData: Omit<Weapon, 'imageUrl'>[]) => {
      console.log('[WS Client] Received initial weapons:', initialWeaponsData);
      const weaponsWithImageUrl = initialWeaponsData.map((weapon) => ({
        ...weapon,
        imageUrl: `/images/${encodeURIComponent(weapon.name)}.png`,
        attribute: weapon.attribute || '不明',
      }));
      setWeapons(weaponsWithImageUrl);
    });

    return () => {
      console.log('[WS Client] Disconnecting socket...');
      newSocket.disconnect();
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('initial state');
      newSocket.off('phase change');
      newSocket.off('time update');
      newSocket.off('update weapon');
      newSocket.off('initial weapons');
    };
  }, []); // 空の依存配列: 初回マウント時のみ実行

  // --- 初期武器データ取得 ---
  useEffect(() => {
    const fetchWeapons = async () => {
      console.log('Fetching initial weapons from API...');
      setLoading(true);
      try {
        const res = await fetch('http://localhost:3001/api/v1/weapons');
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Failed to fetch weapons:', res.status, errorText);
          throw new Error(`データ取得失敗: Status ${res.status} - ${errorText || 'サーバーエラー'}`);
        }
        const serverWeaponsData: Omit<Weapon, 'imageUrl'>[] = await res.json();
        console.log('Fetched weapons data:', serverWeaponsData);
        if (!Array.isArray(serverWeaponsData)) {
             console.error("Fetched data is not an array:", serverWeaponsData);
             throw new Error("サーバーから受け取ったデータ形式が不正です。");
        }
        const weaponsWithImageUrl = serverWeaponsData.map((weapon) => ({
          ...weapon,
          imageUrl: `/images/${encodeURIComponent(weapon.name)}.png`,
          attribute: weapon.attribute || '不明',
        }));
        console.log('Generated weapons with imageUrl:', weaponsWithImageUrl);
        setWeapons(weaponsWithImageUrl);
      } catch (error: unknown) { // error を unknown 型でキャッチ
        console.error('Error during fetchWeapons:', error);
        let message = '武器データの取得中に不明なエラーが発生しました。';
        if (error instanceof Error) { message = error.message; }
        else if (typeof error === 'string') { message = error; }
        handleError(message); // string 型のメッセージを渡す
      } finally {
        console.log('Finished fetching weapons, setting loading to false.');
        setLoading(false); // 必ず false にする
      }
    };
    fetchWeapons();
  }, []); // 空の依存配列: 初回マウント時のみ実行

  // --- ユーザー情報送信 ---
  useEffect(() => {
    if (socket && socket.connected) {
      const infoToSend = { name: userName || '名無し', team: selectedTeam };
      console.log(`[User Info Emit] Sending user info due to change:`, infoToSend);
      socket.emit('set user info', infoToSend);
    }
  }, [socket, selectedTeam, userName]);

  // --- エラーハンドラー ---
  const handleError = (message: string) => {
    console.error('Handled Error:', message);
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  // --- 武器選択/禁止処理 ---
  const handleSelect = async (id: number) => {
    const weapon = weapons.find(w => w.id === id);
    if (!weapon) return;

    const currentPhase = gameState.phase;

    // --- クリックできない条件の判定 ---
    let canClickCheck = false;
     if (currentPhase === 'pick' && gameState.currentTurn === selectedTeam && !hasSelectedThisTurn && !weapon.selectedBy && (!weapon.bannedBy || weapon.bannedBy.length === 0)) {
        canClickCheck = true;
   } else if (currentPhase === 'ban' && !weapon.selectedBy && !weapon.bannedBy?.includes(selectedTeam) && (gameState.banPhaseState?.bans[selectedTeam] ?? 0) < (gameState.banPhaseState?.maxBansPerTeam ?? 3)) {
        canClickCheck = true;
    }
    const isDisabledCheck = loading || currentPhase === 'waiting' || currentPhase === 'pick_complete' || !canClickCheck;
    // ------------------------------------

    if (isDisabledCheck) {
      console.log('Selection/Ban prevented:', { phase: currentPhase, loading, canClickCheck, weaponStatus: { selectedBy: weapon.selectedBy, bannedBy: weapon.bannedBy }});
      return;
    }

    setLoading(true); // API通信開始 -> ローディング表示（個々のアイテムスタイルに影響）
    const action = currentPhase === 'ban' ? 'ban' : 'select';
    const endpoint = `http://localhost:3001/api/v1/weapons/${id}/${action}`;

    console.log(`Sending ${action} request for weapon ${id} by team ${selectedTeam}...`);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedTeam, userName: userName || '名無し' }),
      });

      if (!response.ok) {
        let errorMsg = `${action === 'ban' ? '禁止' : '選択'}に失敗しました (Status: ${response.status})`;
        try {
           const errorData = await response.json();
           errorMsg = errorData.error || errorData.details || errorData.message || errorMsg;
        } catch (jsonError) {
           console.error('Failed to parse error response as JSON:', jsonError);
           const textError = await response.text().catch(() => '');
           if (textError) errorMsg = `${errorMsg} - ${textError}`;
        }
        console.error('API Error Response:', errorMsg);
        throw new Error(errorMsg); // Error オブジェクトとして throw
      }

      const result = await response.json();
      console.log(`Weapon ${action} successful:`, result);

      // --- ローカル状態の即時反映 (UIの反応性を上げるため) ---
      if (currentPhase === 'pick') {
          setWeapons((prev) => prev.map((w) => (w.id === id ? { ...w, selectedBy: selectedTeam } : w)));
          setHasSelectedThisTurn(true);
          console.log('Local state updated for pick, hasSelectedThisTurn set to true.');
      } else if (currentPhase === 'ban') {
          setWeapons((prev) => prev.map((w) => w.id === id ? { ...w, bannedBy: [...(w.bannedBy || []), selectedTeam] } : w));
          console.log('Local state updated for ban.');
      }
      // ---------------------------

    } catch (error: unknown) { // unknown でキャッチ
      console.error(`Error during ${action} process:`, error);
      let message = `武器の${action === 'ban' ? '禁止' : '選択'}中に不明なエラーが発生しました。`;
      if (error instanceof Error) { message = error.message; }
      else if (typeof error === 'string') { message = error; }
      handleError(message); // string メッセージを渡す
    } finally {
      setLoading(false); // API通信終了 -> ローディング解除
    }
  };

  // --- ゲーム開始処理 ---
  const handleStart = () => {
    if (socket && gameState.phase === 'waiting') {
      console.log('Requesting to start game...');
      socket.emit('start game');
    }
  };

  // --- 表示用データ準備 ---
  const alphaPicks = weapons.filter((w) => w.selectedBy === 'alpha');
  const bravoPicks = weapons.filter((w) => w.selectedBy === 'bravo');
  const alphaBans = weapons.filter((w) => w.bannedBy?.includes('alpha'));
  const bravoBans = weapons.filter((w) => w.bannedBy?.includes('bravo'));
  const isGameActive = activeGamePhases.includes(gameState.phase);

  // --- レンダリング ---

  // 初期ロード中表示
  if (loading && weapons.length === 0) {
      return (
          <div className="container mx-auto p-4 text-center">
              <p>武器データを読み込み中...</p>
              <div className="mt-4 inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
          </div>
      );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header & Controls */}
       <div className="flex flex-wrap justify-between items-center gap-4 p-4 bg-gray-100 rounded-lg shadow">
         {/* User Info & Team Selection */}
         <div className="flex items-center gap-4">
             {/* User Name Input */}
             <div>
                 <label htmlFor="userName" className="block text-sm font-medium text-gray-700">ユーザー名:</label>
                 <input type="text" id="userName" value={userName} onChange={(e) => setUserName(e.target.value)} className="mt-1 px-3 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="名前を入力" disabled={gameState.phase !== 'waiting'} />
             </div>
             {/* Team Selection Buttons */}
             <div className="flex items-center space-x-2">
                 <span className="text-sm font-medium text-gray-700">チーム:</span>
                 <button onClick={() => setSelectedTeam('alpha')} disabled={gameState.phase !== 'waiting'} className={`px-3 py-1 rounded-md text-sm ${selectedTeam === 'alpha' ? 'bg-blue-500 text-white font-semibold' : 'bg-gray-200 hover:bg-gray-300'} ${gameState.phase !== 'waiting' ? 'opacity-50 cursor-not-allowed' : ''}`}>アルファ</button>
                 <button onClick={() => setSelectedTeam('bravo')} disabled={gameState.phase !== 'waiting'} className={`px-3 py-1 rounded-md text-sm ${selectedTeam === 'bravo' ? 'bg-red-500 text-white font-semibold' : 'bg-gray-200 hover:bg-gray-300'} ${gameState.phase !== 'waiting' ? 'opacity-50 cursor-not-allowed' : ''}`}>ブラボー</button>
             </div>
         </div>
         {/* Game Status Display */}
         <div className="text-center space-y-1">
             <p className="text-lg font-semibold">フェーズ: <span className="font-bold text-indigo-600">{gameState.phase}</span></p>
             {(gameState.phase === 'pick' || gameState.phase === 'pick_complete') && gameState.currentPickTurnNumber != null && (<p>ターン: {gameState.currentPickTurnNumber} / {totalPickTurns}</p>)}
             {(gameState.phase === 'ban' || gameState.phase === 'pick') && (<p className="text-xl font-mono">残り時間: {gameState.timeLeft}秒</p>)}
             {(gameState.phase === 'pick') && gameState.currentTurn && (<p>現在のターン: <span className={`font-bold ${gameState.currentTurn === 'alpha' ? 'text-blue-600' : 'text-red-600'}`}>{gameState.currentTurn}チーム</span></p>)}
             {gameState.phase === 'pick_complete' && (<p className="font-bold text-green-600 text-xl">選択完了！</p>)}
         </div>
         {/* Control Buttons */}
         <div>
             {gameState.phase === 'waiting' && (<button onClick={handleStart} className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50" disabled={!socket || loading}>ゲーム開始</button>)}
             {(gameState.phase === 'ban' || gameState.phase === 'pick' || gameState.phase === 'pick_complete') && (<button onClick={() => socket?.emit('reset game')} className="ml-4 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600">リセット</button>)}
         </div>
       </div>

      {/* Error Message */}
      {errorMessage && ( <div className="p-3 bg-red-100 text-red-700 rounded-lg text-center">エラー: {errorMessage}</div> )}

      {/* Picked/Banned Weapons Display */}
      <div className="flex flex-col md:flex-row gap-4">
          {/* Alpha Team */}
          <div className="flex-1 border rounded-lg p-3 bg-blue-50 shadow-sm min-h-[150px]">
              <h3 className="text-lg font-semibold mb-2 text-blue-800">アルファチーム {selectedTeam === 'alpha' ? '(あなた)' : ''}</h3>
              {/* Alpha Picks */}
              <div className="mb-3">
                  <h4 className="text-md font-medium mb-1 text-blue-700">選択 ({alphaPicks.length}/{gameState.pickPhaseState?.maxPicksPerTeam ?? 4})</h4>
                  <div className="flex flex-wrap gap-1">
                      {isGameActive && alphaPicks.length > 0 ? alphaPicks.map((weapon) => (
                          <div key={weapon.id} className="relative border border-blue-300 rounded p-1 bg-white" title={`選択: ${weapon.name}`}>
                              <Image src={weapon.imageUrl} alt={weapon.name} width={60} height={60} />
                          </div>
                      )) : <p className="text-sm text-gray-500">{gameState.phase === 'waiting' ? 'ゲーム開始前' : (alphaPicks.length === 0 ? '選択なし' : '')}</p>}
                  </div>
              </div>
              {/* Alpha Bans */}
              <div>
                  <h4 className="text-md font-medium mb-1 text-blue-700">禁止 ({alphaBans.length}/{gameState.banPhaseState?.maxBansPerTeam ?? 3})</h4>
                   <div className="flex flex-wrap gap-1">
                      {/* ★ 修正: 表示ルールを適用 */}
                      {alphaBans.length > 0 ? alphaBans.map((weapon) => {
                          // 表示条件:
                          // - 選択フェーズ以降は常に表示
                          // - 禁止フェーズ中は、自分がアルファチームの場合のみ表示
                          const shouldShow = gameState.phase === 'pick' || gameState.phase === 'pick_complete' || (gameState.phase === 'ban' && selectedTeam === 'alpha');
                          if (!shouldShow) return null;

                          return (
                              <div key={weapon.id} className="relative border border-gray-400 rounded p-1 bg-gray-200" title={`禁止: ${weapon.name}`}>
                                   <Image src={weapon.imageUrl} alt={weapon.name} width={60} height={60} className="opacity-70" />
                                   <div className="absolute inset-0 flex items-center justify-center">
                                       <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                   </div>
                              </div>
                          );
                      }) : <p className="text-sm text-gray-500">{gameState.phase === 'waiting' ? 'ゲーム開始前' : '禁止なし'}</p>}
                  </div>
              </div>
          </div>
          {/* Bravo Team */}
          <div className="flex-1 border rounded-lg p-3 bg-red-50 shadow-sm min-h-[150px]">
              <h3 className="text-lg font-semibold mb-2 text-red-800">ブラボーチーム {selectedTeam === 'bravo' ? '(あなた)' : ''}</h3>
               {/* Bravo Picks */}
               <div className="mb-3">
                  <h4 className="text-md font-medium mb-1 text-red-700">選択 ({bravoPicks.length}/{gameState.pickPhaseState?.maxPicksPerTeam ?? 4})</h4>
                  <div className="flex flex-wrap gap-1">
                       {isGameActive && bravoPicks.length > 0 ? bravoPicks.map((weapon) => (
                          <div key={weapon.id} className="relative border border-red-300 rounded p-1 bg-white" title={`選択: ${weapon.name}`}>
                              <Image src={weapon.imageUrl} alt={weapon.name} width={60} height={60} />
                          </div>
                      )) : <p className="text-sm text-gray-500">{gameState.phase === 'waiting' ? 'ゲーム開始前' : (bravoPicks.length === 0 ? '選択なし' : '')}</p>}
                  </div>
              </div>
              {/* Bravo Bans */}
              <div>
                  <h4 className="text-md font-medium mb-1 text-red-700">禁止 ({bravoBans.length}/{gameState.banPhaseState?.maxBansPerTeam ?? 3})</h4>
                   <div className="flex flex-wrap gap-1">
                       {/* ★ 修正: 表示ルールを適用 */}
                       {bravoBans.length > 0 ? bravoBans.map((weapon) => {
                           // 表示条件:
                           // - 選択フェーズ以降は常に表示
                           // - 禁止フェーズ中は、自分がブラボーチームの場合のみ表示
                           const shouldShow = gameState.phase === 'pick' || gameState.phase === 'pick_complete' || (gameState.phase === 'ban' && selectedTeam === 'bravo');
                           if (!shouldShow) return null;

                          return (
                              <div key={weapon.id} className="relative border border-gray-400 rounded p-1 bg-gray-200" title={`禁止: ${weapon.name}`}>
                                   <Image src={weapon.imageUrl} alt={weapon.name} width={60} height={60} className="opacity-70"/>
                                   <div className="absolute inset-0 flex items-center justify-center">
                                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                   </div>
                              </div>
                          );
                       }) : <p className="text-sm text-gray-500">{gameState.phase === 'waiting' ? 'ゲーム開始前' : '禁止なし'}</p>}
                  </div>
              </div>
          </div>
      </div>

      {/* Weapon Grid */}
      {(gameState.phase !== 'pick_complete') && (
          <div className="overflow-x-auto">
              {!loading && weapons.length > 0 ? (
                 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                     {weapons.map((weapon) => {
                        const isSelectedByAlpha = weapon.selectedBy === 'alpha';
                        const isSelectedByBravo = weapon.selectedBy === 'bravo';
                        const isBannedByMe = weapon.bannedBy?.includes(selectedTeam);
                        const anyBanExists = weapon.bannedBy && weapon.bannedBy.length > 0;

                        //グリッド上の禁止表示ルール
                        const showAsBannedOnGrid =
                            // 禁止フェーズ中は、自分が禁止したものだけ表示
                            (gameState.phase === 'ban' && isBannedByMe) ||
                            // それ以外のフェーズ (pick, waiting) では、誰かが禁止していれば表示
                            ((gameState.phase === 'pick' || gameState.phase === 'waiting') && anyBanExists);
                        //

                        // クリック可能か？ (相手が禁止したものは禁止フェーズ中はクリック可能に見えるが、サーバー側で拒否される)
                        let canClick = false;
                        if (gameState.phase === 'pick' && // Pick フェーズ
                            gameState.currentTurn === selectedTeam && // 自分のターン
                            !hasSelectedThisTurn && // まだ選択してない
                            !isSelectedByAlpha && !isSelectedByBravo && // 誰も選択してない
                            !anyBanExists) { // 誰も禁止してない
                            canClick = true;
                        } else if (gameState.phase === 'ban' && // Ban フェーズ
                            !isSelectedByAlpha && !isSelectedByBravo && // 誰も選択してない
                            !isBannedByMe && // 自分がまだ禁止してない (相手の禁止は問わない)
                            (gameState.banPhaseState?.bans[selectedTeam] ?? 0) < (gameState.banPhaseState?.maxBansPerTeam ?? 3)) { // 禁止上限未満
                            canClick = true;
                        }
                        const isDisabled = loading || gameState.phase === 'waiting' || !canClick;

                        // スタイル決定
                        let bgColor = 'bg-white';
                        let borderColor = 'border-gray-200';
                        let imageOpacity = 'opacity-100';
                        let overallOpacity = 'opacity-100';
                        let ring = '';
                        let hoverEffect = 'hover:bg-blue-50 hover:border-blue-300';
                        let banMark = null; // 禁止マーク初期化
                        let cursor = 'cursor-pointer';

                        if (isSelectedByAlpha) {
                            bgColor = 'bg-blue-100'; borderColor = 'border-blue-400'; ring = 'ring-2 ring-offset-1 ring-blue-500'; hoverEffect = ''; cursor = 'cursor-not-allowed';
                        } else if (isSelectedByBravo) {
                            bgColor = 'bg-red-100'; borderColor = 'border-red-400'; ring = 'ring-2 ring-offset-1 ring-red-500'; hoverEffect = ''; cursor = 'cursor-not-allowed';
                        } else if (showAsBannedOnGrid) {
                            // 禁止スタイル
                            bgColor = 'bg-gray-200'; borderColor = 'border-gray-300'; imageOpacity = 'opacity-40'; overallOpacity = 'opacity-70'; hoverEffect = ''; cursor = 'cursor-not-allowed';
                            let banColor = 'text-gray-700';
                            if (weapon.bannedBy?.includes('alpha')) { banColor = 'text-blue-600'; }
                            else if (weapon.bannedBy?.includes('bravo')) { banColor = 'text-red-600'; }

                            banMark = (
                                 <div className={`absolute inset-0 flex items-center justify-center rounded-lg pointer-events-none`}>
                                    <svg
                                        className={`w-10 h-10 ${banColor} opacity-75`} // サイズ、色、透明度
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        {/* 禁止マークの線の部分 */}
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2} // 線の太さ
                                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" // 斜め線 + 円の組み合わせ
                                        />
                                    </svg>
                                </div>
                            );

                        } else if (isDisabled) {
                            // 無効スタイル (waiting, loading, 相手ターンなど)
                            cursor = 'cursor-not-allowed'; hoverEffect = '';
                            if (gameState.phase === 'waiting') { bgColor = 'bg-gray-100'; overallOpacity = 'opacity-60'; }
                            else { overallOpacity = 'opacity-75'; }
                        }

                        // return 文 (変更なし)
                        return (
                            <div key={weapon.id} className={`relative p-2 rounded-lg border transition-all duration-150 ${bgColor} ${borderColor} ${overallOpacity} ${ring} ${cursor} ${hoverEffect}`} onClick={() => !isDisabled && handleSelect(weapon.id)} title={weapon.name}>
                                <Image src={weapon.imageUrl} alt={weapon.name} width={100} height={100} className={`mx-auto transition-opacity duration-150 ${imageOpacity}`} priority={weapon.id <= 12}/>
                                {banMark}
                                {/* ターン表示 */}
                                {gameState.phase === 'pick' && gameState.currentTurn === selectedTeam && canClick && ( <div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs bg-green-200 text-green-800 rounded font-semibold animate-pulse">Pick!</div> )}
                                {gameState.phase === 'ban' && canClick && ( <div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded font-semibold animate-pulse">Ban!</div> )}
                            </div>
                        );
                     })}
                 </div>
              ) : !loading && weapons.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">武器データが見つかりません。</p>
              ) : null } {/* 初期ロード中は専用表示が出るので null */}
          </div>
       )}

    </div> // container end
  );
};

export default WeaponGrid;