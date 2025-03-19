'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";

interface Weapon {
  id: number;
  name: string;
  selectedBy: string | null;
  bannedBy: string | null;
}

const WeaponGrid = () => {
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [userId] = useState<string>(Math.random().toString(36).substr(2, 9));
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeapons = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/v1/weapons', {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // 必要に応じて追加
        });
        if (!res.ok) throw new Error('データ取得に失敗しました');
        const data = await res.json();
        setWeapons(data);
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
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '選択に失敗しました');
      }

      setWeapons((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, selectedBy: userId } : w
        )
      );
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {weapons.map((weapon) => (
          <div
            key={weapon.id}
            className={`p-4 rounded-lg transition-colors cursor-pointer
              ${weapon.selectedBy
                ? 'bg-gray-200'
                : 'bg-white hover:bg-blue-50 border border-gray-200'}
              ${loading ? 'opacity-50' : ''}`}
            onClick={() => handleSelect(weapon.id)} // クリックイベントを div に移動
            style={{ pointerEvents: weapon.selectedBy ? 'none' : 'auto' }} // 選択済みの場合はクリックイベント無効
          >
            <Image
              src={`/images/${weapon.name}.png`} // 画像のパスを指定
              height={100}
              width={100}
              alt={weapon.name}
              className="w-full h-auto" // 画像のサイズを調整
            />
            {weapon.selectedBy && (
              <div className="text-sm text-gray-500 mt-1 text-center">
                {weapon.selectedBy === userId ? 'あなたが選択' : '選択済み'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeaponGrid;