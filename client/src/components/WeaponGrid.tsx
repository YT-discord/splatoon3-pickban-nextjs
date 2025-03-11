'use client';

import { useState, useEffect } from 'react';

interface Weapon {
  id: number;
  name: string;
  selectedBy: string | null;
}

const WeaponGrid = () => {
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [userId] = useState<string>(Math.random().toString(36).substr(2, 9));
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeapons = async () => {
      try {
        const res = await fetch('/api/weapons');
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
      const response = await fetch(`/api/select/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '選択に失敗しました');
      }

      setWeapons(prev => 
        prev.map(w => 
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
      {weapons.map(weapon => (
        <button
          key={weapon.id}
          onClick={() => handleSelect(weapon.id)}
          disabled={!!weapon.selectedBy || loading}
          className={`p-4 rounded-lg transition-colors
            ${weapon.selectedBy 
              ? 'bg-gray-200 cursor-not-allowed'
              : 'bg-white hover:bg-blue-50 border border-gray-200'}
            ${loading ? 'opacity-50' : ''}`}
        >
          <div className="font-medium">{weapon.name}</div>
          {weapon.selectedBy && (
            <div className="text-sm text-gray-500 mt-1">
              {weapon.selectedBy === userId ? 'あなたが選択' : '選択済み'}
            </div>
          )}
        </button>
      ))}
    </div>
    </div>
  );
};

export default WeaponGrid;