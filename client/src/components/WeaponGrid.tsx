'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { Socket } from 'socket.io-client'; // 型のみインポート
// ★ 共有ディレクトリから型をインポート
import type { Weapon, GameState, RoomUser, RoomWeaponState, MasterWeapon } from '../../../common/types/game';

// =============================================
// == クライアント側の型定義 (共有型を使用) ==
// =============================================
// GameState は PublicRoomGameState のエイリアスとして @common/types/game で定義済み
// Weapon は MasterWeapon と RoomWeaponState を結合したものとして @common/types/game で定義済み

const totalPickTurns = 8;
const activeGamePhases: GameState['phase'][] = ['ban', 'pick', 'pick_complete'];

interface WeaponGridProps {
  socket: Socket;
  roomId: string;
  masterWeapons: MasterWeapon[]; // ★ Props に masterWeapons を追加
}

export default function WeaponGrid({ socket, roomId, masterWeapons }: WeaponGridProps) {
  // --- State定義 ---
  const [weapons, setWeapons] = useState<Weapon[]>(() => {
      console.log(`[WeaponGrid ${roomId}] Initializing weapons state from master data.`);
      return masterWeapons.map(mw => ({
          ...mw,
          imageUrl: `/images/${encodeURIComponent(mw.name)}.png`,
          selectedBy: null,
          bannedBy: [],
      }));
  });
  const [loading, setLoading] = useState(false); // API通信中フラグ
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'alpha' | 'bravo' | 'observer'>('observer'); // デフォルト observer
  const [gameState, setGameState] = useState<GameState | null>(null); // 初期値 null
  const [hasSelectedThisTurn, setHasSelectedThisTurn] = useState(false);

  // --- WebSocketイベントリスナー設定 ---
  useEffect(() => {
    if (!socket) return;
    console.log(`[WeaponGrid ${roomId}] Setting up listeners for socket: ${socket.id}`);

    // --- リスナー定義 ---
    const handleInitialState = (initialState: GameState) => {
        if (initialState.roomId === roomId) {
            console.log(`[WeaponGrid ${roomId}] Received initial state:`, initialState);
            setGameState(initialState);
            setHasSelectedThisTurn(false);
            // ★ TODO: サーバーから初期チーム情報を受け取る処理 (必要なら)
            // 例: const myInfo = initialState.users?.find(u => u.id === socket.id);
            // if (myInfo?.team) setSelectedTeam(myInfo.team);
        } else {
             console.warn(`[WeaponGrid ${roomId}] Received initial state for other room: ${initialState.roomId}`);
        }
    };
    const handlePhaseChange = (newState: GameState) => {
        if (newState.roomId === roomId) {
            console.log(`[WeaponGrid ${roomId}] Received phase change:`, newState);
            setHasSelectedThisTurn(false);
            setGameState(newState);
        }
    };
    const handleTimeUpdate = (newTimeLeft: number) => {
        setGameState((prev) => prev ? { ...prev, timeLeft: newTimeLeft } : null);
    };
    const handleUpdateWeapon = (updatedWeaponData: RoomWeaponState) => {
         console.log(`[WeaponGrid ${roomId}] Received update weapon:`, updatedWeaponData);
         setWeapons((prevWeapons) =>
            prevWeapons.map((w) =>
              w.id === updatedWeaponData.id ? { ...w, ...updatedWeaponData } : w
            )
         );
     };
     const handleInitialWeapons = (initialWeaponsData: RoomWeaponState[]) => {
         console.log(`[WeaponGrid ${roomId}] Received initial weapons state:`, initialWeaponsData);
         setWeapons(masterWeapons.map(masterW => {
             const weaponState = initialWeaponsData.find(ws => ws.id === masterW.id);
             return {
                 ...masterW,
                 imageUrl: `/images/${encodeURIComponent(masterW.name)}.png`,
                 selectedBy: weaponState?.selectedBy ?? null,
                 bannedBy: weaponState?.bannedBy ?? [],
             };
         }));
         console.log(`[WeaponGrid ${roomId}] Weapons state reconstructed.`);
     };
      const handleActionFailed = (data: { reason: string }) => {
          console.error(`[WeaponGrid ${roomId}] Action failed: ${data.reason}`);
          handleError(data.reason);
          setLoading(false); // ★ エラー時はローディング解除
      };
      const handleUserJoined = (user: RoomUser) => {
          console.log(`[WeaponGrid ${roomId}] User joined:`, user);
          // TODO: 参加者リスト表示を更新
      };
      const handleUserLeft = (data: { userId: string }) => {
           console.log(`[WeaponGrid ${roomId}] User left: ${data.userId}`);
           // TODO: 参加者リスト表示を更新
      };
       const handleUserUpdated = (user: RoomUser) => {
           console.log(`[WeaponGrid ${roomId}] User updated:`, user);
           if (user.id === socket.id) {
               console.log(`[WeaponGrid ${roomId}] My team updated to: ${user.team}`);
               setSelectedTeam(user.team || 'observer');
           }
           // TODO: 参加者リスト表示を更新
       };
       const handleRoomStateUpdate = (newState: GameState) => {
           if (newState.roomId === roomId) {
               console.log(`[WeaponGrid ${roomId}] Received room state update:`, newState);
               setGameState(prev => prev ? {...prev, userCount: newState.userCount} : null);
           }
       };

    // --- リスナー登録 ---
    socket.on('initial state', handleInitialState);
    socket.on('phase change', handlePhaseChange);
    socket.on('time update', handleTimeUpdate);
    socket.on('update weapon', handleUpdateWeapon);
    socket.on('initial weapons', handleInitialWeapons);
    socket.on('action failed', handleActionFailed);
    socket.on('user joined', handleUserJoined);
    socket.on('user left', handleUserLeft);
    socket.on('user updated', handleUserUpdated);
    socket.on('room state update', handleRoomStateUpdate);

    // --- クリーンアップ ---
    return () => {
        console.log(`[WeaponGrid ${roomId}] Removing listeners...`);
        socket.off('initial state', handleInitialState);
        socket.off('phase change', handlePhaseChange);
        socket.off('time update', handleTimeUpdate);
        socket.off('update weapon', handleUpdateWeapon);
        socket.off('initial weapons', handleInitialWeapons);
        socket.off('action failed', handleActionFailed);
        socket.off('user joined', handleUserJoined);
        socket.off('user left', handleUserLeft);
        socket.off('user updated', handleUserUpdated);
        socket.off('room state update', handleRoomStateUpdate);
    };
  }, [socket, roomId, masterWeapons]); // masterWeapons は初期化に使うため依存配列に含める

  // --- エラーハンドラー ---
  const handleError = (message: string) => {
    console.error('Handled Error:', message);
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  // --- 武器選択/禁止処理 ---
  const handleSelect = async (id: number) => {
      if (!socket || !gameState) return;
      const weapon = weapons.find(w => w.id === id);
      if (!weapon) return;
      const currentPhase = gameState.phase;
      const isPlayerTeam = selectedTeam === 'alpha' || selectedTeam === 'bravo';

      // --- クリックできない条件 ---
      let canClickCheck = false;
      if (currentPhase === 'pick' && isPlayerTeam && gameState.currentTurn === selectedTeam && !hasSelectedThisTurn && !weapon.selectedBy && (!weapon.bannedBy || weapon.bannedBy.length === 0)) {
          canClickCheck = true;
      } else if (currentPhase === 'ban' && isPlayerTeam && !weapon.selectedBy && !weapon.bannedBy?.includes(selectedTeam) && (gameState.banPhaseState?.bans[selectedTeam] ?? 0) < (gameState.banPhaseState?.maxBansPerTeam ?? 3)) {
          canClickCheck = true;
      }
      const isDisabledCheck = loading || currentPhase === 'waiting' || currentPhase === 'pick_complete' || selectedTeam === 'observer' || !canClickCheck;
      // -------------------------

      if (isDisabledCheck) {
          console.log('Selection/Ban prevented:', { phase: currentPhase, loading, selectedTeam, canClickCheck, weaponStatus: { id: weapon.id, selectedBy: weapon.selectedBy, bannedBy: weapon.bannedBy }});
          return;
      }

      const action = currentPhase === 'ban' ? 'ban' : 'select';
      const eventName = action === 'ban' ? 'ban weapon' : 'select weapon';

      console.log(`[WeaponGrid ${roomId}] Emitting ${eventName} for weapon ${id}`);
      setLoading(true);
      socket.emit(eventName, { weaponId: id });

      // 即時反映 (任意)
      if (action === 'select') {
           setHasSelectedThisTurn(true);
           // setWeapons(prev => prev.map(w => w.id === id ? {...w, selectedBy: selectedTeam} : w));
      } else {
           // setWeapons(prev => prev.map(w => w.id === id ? {...w, bannedBy: [...(w.bannedBy || []), selectedTeam]} : w));
      }

      // loading解除はサーバー応答(action failed)を待つか、タイムアウトか、少し遅延させる
      // ここでは action failed で解除される + 念のためタイムアウトも設定
      // const loadingTimeout = setTimeout(() => {
      //       console.warn(`[WeaponGrid ${roomId}] Action response timeout. Force setting loading to false.`);
      //       setLoading(false);
      // }, 3000); // 3秒応答がなければ強制解除 (時間は調整)

      // action failed リスナーで clearTimeout(loadingTimeout) する必要がある
      // useEffect 内の action failed ハンドラで setLoading(false) を行うので、
      // ここでの setTimeout は不要かもしれない。シンプルにするため一旦コメントアウト。
      // setLoading(false) は action failed ハンドラに任せる。
  };

  // --- ゲーム開始処理 ---
  const handleStart = () => {
    if (socket && gameState && gameState.phase === 'waiting') {
      console.log(`[WeaponGrid ${roomId}] Emitting start game`);
      socket.emit('start game');
    }
  };

   // --- チーム選択処理関数 ---
   const handleTeamSelect = (team: 'alpha' | 'bravo' | 'observer') => {
       if (socket && gameState && gameState.phase === 'waiting') {
           console.log(`[WeaponGrid ${roomId}] Requesting team select: ${team}`);
           socket.emit('select team', { team });
       } else {
           console.log(`[WeaponGrid ${roomId}] Cannot select team, phase is not 'waiting' (${gameState?.phase})`);
       }
   };

  // --- 表示用データの準備 ---
  const alphaPicks = gameState ? weapons.filter((w) => w.selectedBy === 'alpha') : [];
  const bravoPicks = gameState ? weapons.filter((w) => w.selectedBy === 'bravo') : [];
  const alphaBans = gameState ? weapons.filter((w) => w.bannedBy?.includes('alpha')) : [];
  const bravoBans = gameState ? weapons.filter((w) => w.bannedBy?.includes('bravo')) : [];
  const isGameActive = gameState ? activeGamePhases.includes(gameState.phase) : false;
  const alphaPicksCount = alphaPicks.length;
  const bravoPicksCount = bravoPicks.length;
  const alphaBansCount = alphaBans.length;
  const bravoBansCount = bravoBans.length;


  // --- レンダリング ---

  if (!gameState) {
    // gameState が null の間の表示（通常は短時間のはず）
    return (
        <div className="container mx-auto p-4 text-center">
            <p>ルーム情報 ({roomId}) を読み込み中...</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header & Controls */}
       <div className="flex flex-wrap justify-between items-center gap-4 p-4 bg-gray-100 rounded-lg shadow">
         {/* Room ID 表示 */}
         <div className="font-semibold text-lg">ルーム: {roomId}</div>
         {/* Team Selection Buttons */}
         <div className="flex items-center space-x-2">
             <span className="text-sm font-medium text-gray-700">あなたのチーム:</span>
             <button onClick={() => handleTeamSelect('alpha')} disabled={gameState.phase !== 'waiting'} className={`px-3 py-1 rounded-md text-sm transition-colors ${selectedTeam === 'alpha' ? 'bg-blue-500 text-white font-semibold ring-2 ring-blue-300' : 'bg-gray-200 hover:bg-gray-300'} ${gameState.phase !== 'waiting' ? 'opacity-50 cursor-not-allowed' : ''}`}>アルファ</button>
             <button onClick={() => handleTeamSelect('bravo')} disabled={gameState.phase !== 'waiting'} className={`px-3 py-1 rounded-md text-sm transition-colors ${selectedTeam === 'bravo' ? 'bg-red-500 text-white font-semibold ring-2 ring-red-300' : 'bg-gray-200 hover:bg-gray-300'} ${gameState.phase !== 'waiting' ? 'opacity-50 cursor-not-allowed' : ''}`}>ブラボー</button>
             <button onClick={() => handleTeamSelect('observer')} disabled={gameState.phase !== 'waiting'} className={`px-3 py-1 rounded-md text-sm transition-colors ${selectedTeam === 'observer' ? 'bg-gray-500 text-white font-semibold ring-2 ring-gray-300' : 'bg-gray-200 hover:bg-gray-300'} ${gameState.phase !== 'waiting' ? 'opacity-50 cursor-not-allowed' : ''}`}>観戦</button>
         </div>
         {/* Game Status Display */}
         <div className="text-center space-y-1">
             <p className="text-lg font-semibold">フェーズ: <span className="font-bold text-indigo-600">{gameState.phase}</span></p>
             {(gameState.phase === 'pick' || gameState.phase === 'pick_complete') && gameState.currentPickTurnNumber != null && (<p>ターン: {gameState.currentPickTurnNumber} / {totalPickTurns}</p>)}
             {(gameState.phase === 'ban' || gameState.phase === 'pick') && (<p className="text-xl font-mono">残り時間: {gameState.timeLeft}秒</p>)}
             {(gameState.phase === 'pick') && gameState.currentTurn && (<p>現在のターン: <span className={`font-bold ${gameState.currentTurn === 'alpha' ? 'text-blue-600' : 'text-red-600'}`}>{gameState.currentTurn}チーム</span></p>)}
             {gameState.phase === 'pick_complete' && (<p className="font-bold text-green-600 text-xl">選択完了！</p>)}
             <p className="text-xs text-gray-500">参加者: {gameState.userCount}人</p> {/* 参加人数表示 */}
         </div>
         {/* Control Buttons */}
         <div>
             {gameState.phase === 'waiting' && (<button onClick={handleStart} className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50" disabled={!socket || loading}>ゲーム開始</button>)}
             {(gameState.phase === 'ban' || gameState.phase === 'pick' || gameState.phase === 'pick_complete') && (<button onClick={() => socket?.emit('reset room')} className="ml-4 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600">リセット</button>)}
         </div>
       </div>

      {/* Error Message */}
      {errorMessage && ( <div className="p-3 bg-red-100 text-red-700 rounded-lg text-center">エラー: {errorMessage}</div> )}

      {/* Picked/Banned Weapons Display */}
      <div className="flex flex-col md:flex-row gap-4">
          {/* Alpha Team */}
          <div className="flex-1 border rounded-lg p-3 bg-blue-50 shadow-sm min-h-[150px]">
              <h3 className="text-lg font-semibold mb-2 text-blue-800">アルファチーム {selectedTeam === 'alpha' ? '(あなた)' : ''}</h3>
              <div className="mb-3">
                   <h4 className="text-md font-medium mb-1 text-blue-700">選択 ({alphaPicksCount}/{gameState.pickPhaseState?.maxPicksPerTeam ?? 4})</h4>
                  <div className="flex flex-wrap gap-1">
                      {isGameActive && alphaPicks.length > 0 ? alphaPicks.map((weapon) => (
                          <div key={`alpha-pick-${weapon.id}`} className="relative border border-blue-300 rounded p-1 bg-white" title={`選択: ${weapon.name}`}>
                              <Image src={weapon.imageUrl} alt={weapon.name} width={60} height={60} />
                          </div>
                      )) : <p className="text-sm text-gray-500">{gameState.phase === 'waiting' ? 'ゲーム開始前' : (alphaPicksCount === 0 ? '選択なし' : '')}</p>}
                  </div>
              </div>
              <div>
                   <h4 className="text-md font-medium mb-1 text-blue-700">禁止 ({alphaBansCount}/{gameState.banPhaseState?.maxBansPerTeam ?? 3})</h4>
                   <div className="flex flex-wrap gap-1">
                      {isGameActive && alphaBans.length > 0 ? alphaBans.map((weapon) => {
                          const isSelfOrObserver = selectedTeam === 'alpha' || selectedTeam === 'observer';
                          const shouldShow = gameState.phase === 'pick' || gameState.phase === 'pick_complete' || (gameState.phase === 'ban' && isSelfOrObserver);
                          if (!shouldShow) return null;
                          return (
                              <div key={`alpha-ban-${weapon.id}`} className="relative border border-gray-400 rounded p-1 bg-gray-200" title={`禁止: ${weapon.name}`}>
                                   <Image src={weapon.imageUrl} alt={weapon.name} width={60} height={60} className="opacity-70" />
                                   <div className="absolute inset-0 flex items-center justify-center">
                                       <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                   </div>
                              </div>
                          );
                      }) : <p className="text-sm text-gray-500">{gameState.phase === 'waiting' ? 'ゲーム開始前' : (alphaBansCount === 0 ? '禁止なし' : '')}</p>}
                  </div>
              </div>
          </div>
          {/* Bravo Team */}
          <div className="flex-1 border rounded-lg p-3 bg-red-50 shadow-sm min-h-[150px]">
               <h3 className="text-lg font-semibold mb-2 text-red-800">ブラボーチーム {selectedTeam === 'bravo' ? '(あなた)' : ''}</h3>
               <div className="mb-3">
                  <h4 className="text-md font-medium mb-1 text-red-700">選択 ({bravoPicksCount}/{gameState.pickPhaseState?.maxPicksPerTeam ?? 4})</h4>
                  <div className="flex flex-wrap gap-1">
                       {isGameActive && bravoPicks.length > 0 ? bravoPicks.map((weapon) => (
                          <div key={`bravo-pick-${weapon.id}`} className="relative border border-red-300 rounded p-1 bg-white" title={`選択: ${weapon.name}`}>
                              <Image src={weapon.imageUrl} alt={weapon.name} width={60} height={60} />
                          </div>
                      )) : <p className="text-sm text-gray-500">{gameState.phase === 'waiting' ? 'ゲーム開始前' : (bravoPicksCount === 0 ? '選択なし' : '')}</p>}
                  </div>
              </div>
                <div>
                  <h4 className="text-md font-medium mb-1 text-red-700">禁止 ({bravoBansCount}/{gameState.banPhaseState?.maxBansPerTeam ?? 3})</h4>
                   <div className="flex flex-wrap gap-1">
                       {isGameActive && bravoBans.length > 0 ? bravoBans.map((weapon) => {
                           const isSelfOrObserver = selectedTeam === 'bravo' || selectedTeam === 'observer';
                           const shouldShow = gameState.phase === 'pick' || gameState.phase === 'pick_complete' || (gameState.phase === 'ban' && isSelfOrObserver);
                           if (!shouldShow) return null;
                          return (
                              <div key={`bravo-ban-${weapon.id}`} className="relative border border-gray-400 rounded p-1 bg-gray-200" title={`禁止: ${weapon.name}`}>
                                   <Image src={weapon.imageUrl} alt={weapon.name} width={60} height={60} className="opacity-70"/>
                                   <div className="absolute inset-0 flex items-center justify-center">
                                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                   </div>
                              </div>
                          );
                       }) : <p className="text-sm text-gray-500">{gameState.phase === 'waiting' ? 'ゲーム開始前' : (bravoBansCount === 0 ? '禁止なし' : '')}</p>}
                  </div>
              </div>
          </div>
      </div>

      {/* Weapon Grid */}
      {(gameState.phase !== 'pick_complete') && (
          <div className="overflow-x-auto">
              {weapons.length > 0 ? (
                 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                     {weapons.map((weapon) => {
                        // --- 状態判定 ---
                        const isSelectedByAlpha = weapon.selectedBy === 'alpha';
                        const isSelectedByBravo = weapon.selectedBy === 'bravo';
                        const isPlayerTeam = selectedTeam === 'alpha' || selectedTeam === 'bravo';
                        const isBannedByMe = isPlayerTeam && weapon.bannedBy?.includes(selectedTeam);
                        const anyBanExists = weapon.bannedBy && weapon.bannedBy.length > 0;
                        const showAsBannedOnGrid = (gameState.phase === 'ban' && isBannedByMe) || ((gameState.phase === 'pick' || gameState.phase === 'waiting') && anyBanExists);

                        // --- クリック可否判定 ---
                        let canClick = false;
                        if (gameState.phase === 'pick' && isPlayerTeam && gameState.currentTurn === selectedTeam && !hasSelectedThisTurn && !isSelectedByAlpha && !isSelectedByBravo && !anyBanExists) {
                            canClick = true;
                        } else if (gameState.phase === 'ban' && isPlayerTeam && !isSelectedByAlpha && !isSelectedByBravo && !isBannedByMe && (gameState.banPhaseState?.bans[selectedTeam] ?? 0) < (gameState.banPhaseState?.maxBansPerTeam ?? 3)) {
                            canClick = true;
                        }
                        const isDisabled = loading || gameState.phase === 'waiting' || selectedTeam === 'observer' || !canClick;

                        // --- スタイル決定 ---
                        let bgColor = 'bg-white'; let borderColor = 'border-gray-200'; let imageOpacity = 'opacity-100'; let overallOpacity = 'opacity-100'; let ring = ''; let hoverEffect = 'hover:bg-blue-50 hover:border-blue-300'; let banMark = null; let cursor = 'cursor-pointer';
                        if (isSelectedByAlpha) { bgColor = 'bg-blue-100'; borderColor = 'border-blue-400'; ring = 'ring-2 ring-offset-1 ring-blue-500'; hoverEffect = ''; cursor = 'cursor-not-allowed'; }
                        else if (isSelectedByBravo) { bgColor = 'bg-red-100'; borderColor = 'border-red-400'; ring = 'ring-2 ring-offset-1 ring-red-500'; hoverEffect = ''; cursor = 'cursor-not-allowed'; }
                        else if (showAsBannedOnGrid) {
                            bgColor = 'bg-gray-200'; borderColor = 'border-gray-300'; imageOpacity = 'opacity-40'; overallOpacity = 'opacity-70'; hoverEffect = ''; cursor = 'cursor-not-allowed';
                            let banColor = 'text-gray-700';
                            if (weapon.bannedBy?.includes('alpha')) { banColor = 'text-blue-600'; } else if (weapon.bannedBy?.includes('bravo')) { banColor = 'text-red-600'; }
                            banMark = ( <div className={`absolute inset-0 flex items-center justify-center rounded-lg pointer-events-none`}><svg className={`w-10 h-10 ${banColor} opacity-75`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg></div> );
                        } else if (isDisabled) {
                             cursor = 'cursor-not-allowed'; hoverEffect = '';
                             if (selectedTeam === 'observer') { bgColor = 'bg-gray-50'; overallOpacity = 'opacity-80'; }
                             else if (gameState.phase === 'waiting') { bgColor = 'bg-gray-100'; overallOpacity = 'opacity-60'; }
                             else { overallOpacity = 'opacity-75'; }
                        }

                        // --- グリッドアイテム JSX ---
                        return (
                            <div
                                key={`weapon-grid-${weapon.id}`}
                                className={`relative p-2 rounded-lg border transition-all duration-150 ${bgColor} ${borderColor} ${overallOpacity} ${ring} ${cursor} ${hoverEffect}`}
                                onClick={() => !isDisabled && handleSelect(weapon.id)}
                                title={weapon.name}
                            >
                                <Image
                                    src={weapon.imageUrl}
                                    alt={weapon.name}
                                    width={100}
                                    height={100}
                                    className={`mx-auto transition-opacity duration-150 ${imageOpacity}`}
                                    priority={weapon.id <= 12} // 先頭に近いものを優先ロード
                                />
                                {banMark}
                                {/* ターン表示 */}
                                {gameState.phase === 'pick' && gameState.currentTurn === selectedTeam && canClick && ( <div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs bg-green-200 text-green-800 rounded font-semibold animate-pulse">Pick!</div> )}
                                {gameState.phase === 'ban' && canClick && ( <div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded font-semibold animate-pulse">Ban!</div> )}
                            </div>
                        );
                     })}
                 </div>
              ) : ( <p className="text-center text-gray-500 py-4">武器データが読み込まれていません。</p> )}
          </div>
       )}
    </div> // container end
  );
}