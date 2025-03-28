'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { io, Socket } from 'socket.io-client';

interface Weapon {
  id: number;
  name: string;
  selectedBy: 'alpha' | 'bravo' | null;
  bannedBy: ('alpha' | 'bravo')[] | null; // nullを許容するように戻す or DBも[]デフォルトにする
  imageUrl: string; // このプロパティはクライアント側で生成するので必須
}

interface GameState {
  phase: 'waiting' | 'ban' | 'pick';
  timeLeft: number;
  currentTurn: 'alpha' | 'bravo' | null;
}

const WeaponGrid = () => {
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'alpha' | 'bravo'>('alpha');
  const [userName, setUserName] = useState('');
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    timeLeft: 0,
    currentTurn: null,
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  // 追加: このターンで自分が選択したかどうか
  const [hasSelectedThisTurn, setHasSelectedThisTurn] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('initial state', (initialState: GameState) => {
      setGameState(initialState);
    });

    newSocket.on('phase change', (newState: GameState) => {
      setGameState(newState);
      // ターンが切り替わったら選択フラグをリセット
      setHasSelectedThisTurn(false);
    });

    newSocket.on('time update', (newTimeLeft: number) => {
      setGameState((prev) => ({ ...prev, timeLeft: newTimeLeft }));
    });

    // 追加: 武器選択成功イベントの受信
    newSocket.on('weapon selected', (data: { team: 'alpha' | 'bravo' }) => {
        // 自分が選択した場合にフラグを立てる
        if(data.team === selectedTeam){
            setHasSelectedThisTurn(true);
        }
        // サーバーからのターン切り替えを待つため、ここでは何もしない
    });

    newSocket.on('update weapon', (updatedWeaponData: Omit<Weapon, 'imageUrl'>) => {
      setWeapons((prevWeapons) =>
        prevWeapons.map((w) =>
          w.id === updatedWeaponData.id
            ? {
                ...w, // 既存のプロパティ (...w)
                ...updatedWeaponData, // サーバーからの更新データ (...updatedWeaponData)
                // imageUrl はサーバーから来ないので、ローカルで生成したものを維持するか、
                // 必要であれば name から再生成する。今回は既存のものを維持する。
                // imageUrl: `/images/${encodeURIComponent(updatedWeaponData.name)}.png` // 必要なら再生成
              }
            : w
        )
      );
    });

    return () => {
      newSocket.disconnect();
      newSocket.off('update weapon'); // 追加
    };
  }, [selectedTeam]); // 変更: selectedTeam も依存配列に追加

  useEffect(() => {
    const fetchWeapons = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/v1/weapons', {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        if (!res.ok) throw new Error('データ取得に失敗しました');
        // サーバーから受け取るデータには imageUrl は含まれていない想定
        const serverWeaponsData: Omit<Weapon, 'imageUrl'>[] = await res.json();

        const weaponsWithImageUrl = serverWeaponsData.map((weapon) => ({
          ...weapon,
          imageUrl: `/images/${encodeURIComponent(weapon.name)}.png`,
        }));
  
        // 確認用 console.log を追加
        console.log('Generated weapons with imageUrl:', weaponsWithImageUrl);
  
        setWeapons(weaponsWithImageUrl);
      } catch (error) {
        handleError(error);
      }
    };
    fetchWeapons();
  }, []);

  const handleError = (error: unknown) => {
    if (error instanceof Error) {
      setErrorMessage(error.message);
    } else {
      setErrorMessage('不明なエラーが発生しました');
    }
    setTimeout(() => setErrorMessage(null), 5000);
  };

  const handleSelect = async (id: number) => {
    if (
      gameState.phase === 'waiting' || // waiting フェーズ
      loading ||                     // ローディング中
      (gameState.phase === 'pick' && // pick フェーズで
        (gameState.currentTurn !== selectedTeam || // 自分のターンでない
         hasSelectedThisTurn)) ||          // または既に選択済み
      (gameState.phase === 'ban' && // ban フェーズで
        (weapons.find(w=>w.id === id)?.bannedBy?.includes(selectedTeam))) // 既に自分が禁止済み
    ) {
      return;
    }

    setLoading(true);

    try {
      // 修正: gameState.phase の型が 'ban' | 'pick' の場合にのみ比較可能
      const currentPhase = gameState.phase; // 変数に代入
      const endpoint =
        currentPhase === 'ban' // 修正: エラー箇所
          ? `http://localhost:3001/api/v1/weapons/${id}/ban`
          : `http://localhost:3001/api/v1/weapons/${id}/select`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedTeam, userName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '選択/禁止に失敗しました');
      }

      // ローカル状態の即時反映 (サーバーからのイベントを待つと遅延するため)
      if (currentPhase === 'pick') {
          setWeapons((prev) =>
            prev.map((w) => (w.id === id ? { ...w, selectedBy: selectedTeam } : w))
          );
          setHasSelectedThisTurn(true);
      } else if (currentPhase === 'ban') {
          setWeapons((prev) =>
            prev.map((w) =>
              w.id === id
                ? { ...w, bannedBy: [...(w.bannedBy || []), selectedTeam] } // bannedByがnullの場合も考慮
                : w
            )
          );
      }

    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    if (socket) {
      socket.emit('start game');
    }
  };

  // 選択・禁止された武器をチームごとにフィルタリング
  const alphaPicks = weapons.filter((w) => w.selectedBy === 'alpha');
  const bravoPicks = weapons.filter((w) => w.selectedBy === 'bravo');
  const alphaBans = weapons.filter((w) => Array.isArray(w.bannedBy) && w.bannedBy.includes('alpha'));
  const bravoBans = weapons.filter((w) => Array.isArray(w.bannedBy) && w.bannedBy.includes('bravo'));

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <label
          htmlFor="userName"
          className="block text-sm font-medium text-gray-700"
        >
          ユーザー名:
        </label>
        <input
          type="text"
          id="userName"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className="mt-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <p>フェーズ: {gameState.phase}</p>
        <p>残り時間: {gameState.timeLeft}秒</p>
        {gameState.currentTurn && (
          <p>現在のターン: {gameState.currentTurn}チーム</p>
        )}
      </div>
      {gameState.phase === 'waiting' && (
        <button
          onClick={handleStart}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
        >
          スタート
        </button>
      )}
      {errorMessage && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {errorMessage}
        </div>
      )}

      {/* チーム選択ボタン */}
      <div className="mb-4">
        <button
          onClick={() => setSelectedTeam('alpha')}
          className={`px-4 py-2 rounded-md mr-2 ${
            selectedTeam === 'alpha' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          アルファ
        </button>
        <button
          onClick={() => setSelectedTeam('bravo')}
          className={`px-4 py-2 rounded-md ${
            selectedTeam === 'bravo' ? 'bg-red-500 text-white' : 'bg-gray-200'
          }`}
        >
          ブラボー
        </button>
      </div>

      {/* 選択・禁止武器を表示するエリア */}
      <div className="flex space-x-4">
        <div className="w-1/2">
          <h3 className="text-lg font-semibold mb-2">アルファチーム</h3>
          <div className="border rounded-md p-2 mb-4">
            <h4 className="text-md font-medium mb-1">選択した武器</h4>
            {alphaPicks.map((weapon) => {
              // 確認用 console.log を追加
              console.log('Rendering Alpha Pick Image src:', weapon.imageUrl); // このログを確認
              return (
                <Image
                  key={weapon.id}
                  src={weapon.imageUrl} // ここに渡される値
                  alt={weapon.name}
                  width={100}
                  height={100}
                  className="inline-block m-1"
                />
              );
            })}
          </div>
          <div className="border rounded-md p-2">
            <h4 className="text-md font-medium mb-1">禁止した武器</h4>
            {alphaBans.map((weapon) => (
              <Image
                key={weapon.id}
                src={weapon.imageUrl}
                alt={weapon.name}
                width={100}
                height={100}
                className="inline-block m-1"
              />
            ))}
          </div>
        </div>
        <div className="w-1/2">
          <h3 className="text-lg font-semibold mb-2">ブラボーチーム</h3>
          <div className="border rounded-md p-2 mb-4">
            <h4 className="text-md font-medium mb-1">選択した武器</h4>
            {bravoPicks.map((weapon) => (
              <Image
                key={weapon.id}
                src={weapon.imageUrl}
                alt={weapon.name}
                width={100}
                height={100}
                className="inline-block m-1"
              />
            ))}
          </div>
          <div className="border rounded-md p-2">
            <h4 className="text-md font-medium mb-1">禁止した武器</h4>
            {bravoBans.map((weapon) => (
              <Image
                key={weapon.id}
                src={weapon.imageUrl}
                alt={weapon.name}
                width={100}
                height={100}
                className="inline-block m-1"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {weapons.map((weapon) => {
            // 選択可能かどうかのフラグ (変更なし)
            const canSelect =
              gameState.phase === 'pick' &&
              gameState.currentTurn === selectedTeam &&
              !hasSelectedThisTurn &&
              !weapon.selectedBy;

            // 禁止可能かどうかのフラグ (変更なし)
            const canBan =
              gameState.phase === 'ban' &&
              !(weapon.bannedBy && weapon.bannedBy.includes(selectedTeam));


            const isDisabled =
              gameState.phase === 'waiting' ||
              (gameState.phase === 'pick' && !canSelect) ||
              (gameState.phase === 'ban' && !canBan) ||
              loading;

            return (
              <div
                key={weapon.id}
                className={`p-4 rounded-lg transition-colors cursor-pointer
                  ${isDisabled || weapon.selectedBy || (weapon.bannedBy && weapon.bannedBy.length > 0)
                    ? 'bg-gray-200 opacity-50'
                    : 'bg-white hover:bg-blue-50 border border-gray-200'
                  }`}
                onClick={() => handleSelect(weapon.id)}
                style={{
                  pointerEvents: isDisabled ? 'none' : 'auto',
                }}
              >
                <Image
                  src={weapon.imageUrl}
                  alt={weapon.name}
                  width={100}
                  height={100}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeaponGrid;