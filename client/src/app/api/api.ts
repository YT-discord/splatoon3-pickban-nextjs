export const fetchWeapons = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/v1/weapons');
      if (!response.ok) throw new Error('データ取得に失敗しました');
      return await response.json();
    } catch (error) {
      console.error('Error fetching weapons:', error);
      return [];
    }
  };