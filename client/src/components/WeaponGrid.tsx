'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";

interface Weapon {
  id: number;
  name: string;
  selectedBy: 'alpha' | 'bravo' | null;
  bannedBy: 'alpha' | 'bravo' | null;
  attribute: string;
  imageUrl: string;
}

const WeaponGrid = () => {
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  // const [userId] = useState<string>(Math.random().toString(36).substr(2, 9));
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'alpha' | 'bravo'>('alpha'); // 追加: 選択中のチームを保持
  const [userName, setUserName] = useState(''); // 追加: ユーザー名を保持する state

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
        const data = await res.json();
        // imageUrl を追加
        const weaponsWithImageUrl = data.map((weapon: Weapon) => ({
          ...weapon,
          imageUrl: `/images/${weapon.name}.png`,
        }));
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
    if (loading) return;
    setLoading(true);

    try {
      const response = await fetch(`http://localhost:3001/api/v1/weapons/${id}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedTeam, userName }), // selectedTeam を送信
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '選択に失敗しました');
      }

      setWeapons((prev) =>
        prev.map((w) => (w.id === id ? { ...w, selectedBy: selectedTeam } : w)) // selectedTeam を設定
      );
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

    // 選択した武器をチームごとにフィルタリング
    const alphaPicks = weapons.filter((w) => w.selectedBy === 'alpha');
    const bravoPicks = weapons.filter((w) => w.selectedBy === 'bravo');

    return (
      <div className="space-y-4">
        {/* ユーザー名入力フォーム */}
        <div className="mb-4">
          <label htmlFor="userName" className="block text-sm font-medium text-gray-700">
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
  
        {errorMessage && (
          <div className="p-4 bg-red-100 text-red-700 rounded-lg">
            {errorMessage}
          </div>
        )}
         {/* チーム選択ボタン */}
         <div className="mb-4">
          <button
            onClick={() => setSelectedTeam('alpha')}
            className={`px-4 py-2 rounded-md mr-2 ${selectedTeam === 'alpha' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
          >
            アルファ
          </button>
          <button
            onClick={() => setSelectedTeam('bravo')}
            className={`px-4 py-2 rounded-md ${selectedTeam === 'bravo' ? 'bg-red-500 text-white' : 'bg-gray-200'
              }`}
          >
            ブラボー
          </button>
        </div>
  
        {/* 選択した武器を表示するエリア */}
        <div className="flex space-x-4">
          <div className="w-1/2">
            <h3 className="text-lg font-semibold mb-2">アルファチーム</h3>
            <div className="border rounded-md p-2">
              {alphaPicks.map((weapon) => (
                <img
                  key={weapon.id}
                  src={weapon.imageUrl}
                  alt={weapon.name}
                  className="w-16 h-16 object-contain inline-block m-1" // 小さめの画像で表示
                />
              ))}
            </div>
          </div>
          <div className="w-1/2">
            <h3 className="text-lg font-semibold mb-2">ブラボーチーム</h3>
            <div className="border rounded-md p-2">
              {bravoPicks.map((weapon) => (
                <img
                  key={weapon.id}
                  src={weapon.imageUrl}
                  alt={weapon.name}
                  className="w-16 h-16 object-contain inline-block m-1"
                />
              ))}
            </div>
          </div>
        </div>
  
        {/* 武器一覧 (スクロール可能) */}
        <div className="overflow-x-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {weapons.map((weapon) => (
              <div
                key={weapon.id}
                className={`p-4 rounded-lg transition-colors cursor-pointer
                  ${weapon.selectedBy
                    ? 'bg-gray-200'
                    : 'bg-white hover:bg-blue-50 border border-gray-200'}
                  ${loading ? 'opacity-50' : ''}`}
                onClick={() => handleSelect(weapon.id)}
                style={{ pointerEvents: weapon.selectedBy ? 'none' : 'auto' }}
              >
                <Image
                  width={100}
                  height={100}
                  src={weapon.imageUrl}
                  alt={weapon.name}
                  className="w-full h-auto"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  export default WeaponGrid;