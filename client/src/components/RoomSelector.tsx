// reactnext/client/src/app/components/RoomSelector.tsx (修正後)
'use client';

import { useState, useEffect, useCallback } from 'react'; // ★ useCallback をインポート
import { Socket } from 'socket.io-client';

// ルーム情報の型定義
interface RoomInfo {
  roomId: string;
  userCount: number;
  phase: string;
  maxUsers: number;
}

// コンポーネントのPropsの型定義
interface RoomSelectorProps {
  socket: Socket | null;
  setUserNameForParent: (name: string) => void;
}

export default function RoomSelector({ socket, setUserNameForParent }: RoomSelectorProps) {
  // --- State 定義 ---
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true); // ★ 初期値を true に変更
  const [error, setError] = useState<string | null>(null);

  // --- ルームリスト取得 Effect ---
  useEffect(() => {
    let isMounted = true;

    const fetchRooms = async () => {
      if (!isMounted) return; // アンマウントされていたら何もしない
      // setIsLoading(true); // isLoading は初期値 true なのでここでは不要かも
      setError(null);

      try {
        // ★ 環境変数から API ベース URL を取得 (なければデフォルト値)
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
        const apiUrl = `${apiBaseUrl}/api/v1/rooms`; // ★ 完全な URL を組み立て
        console.log(`Fetching room list from: ${apiUrl}`); // ★ ログで URL を確認
        const res = await fetch(apiUrl); // ★ 組み立てた URL で fetch

        if (!res.ok) {
          const errorText = await res.text().catch(()=>'');
          // ★ 404 等のエラーメッセージを調整
          const detail = errorText.length < 500 ? errorText : '(HTML response)';
          throw new Error(`ルームリストの取得に失敗 (Status: ${res.status}${detail ? ` - ${detail}` : ''})`);
        }
        const data: RoomInfo[] = await res.json();

        if (isMounted) {
            console.log('Fetched rooms:', data);
            setRooms(data);

            // デフォルト選択ロジック
            if (data.length > 0 && !selectedRoomId) {
               setSelectedRoomId(data[0].roomId);
            }
            if (selectedRoomId && !data.some(room => room.roomId === selectedRoomId)) {
                setSelectedRoomId(data.length > 0 ? data[0].roomId : '');
            }
        }
      } catch (error: unknown) {
        console.error('Error fetching rooms:', error);
        let message = 'ルームリストの取得中にエラーが発生しました。';
        if (error instanceof Error) {
          message = error.message;
        } else if (typeof error === 'string') {
          message = error;
        }
        // ★ サーバー接続失敗時のメッセージ
        if (message.includes('Failed to fetch')) {
            message = `APIサーバー(${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'})に接続できませんでした。サーバーが起動しているか確認してください。`;
        }
        if (isMounted) {
           setError(message);
        }
      } finally {
         if (isMounted) {
             setIsLoading(false); // ★ finally でローディング解除
         }
      }
    };

    fetchRooms();

    // クリーンアップ関数
    return () => {
      isMounted = false;
    };
  // ★ 依存配列から selectedRoomId を削除 (初回取得のみ実行)
  }, []); // 空の依存配列: 初回マウント時のみ実行

  // --- 入室処理関数 (useCallbackで最適化) ---
  const handleJoinRoom = useCallback(() => {
    if (!socket) {
        setError('サーバーとの接続が確立されていません。'); // ★ エラー表示を state 経由に
        return;
    }
    if (!selectedRoomId) {
        setError('参加するルームを選択してください。');
        return;
    }
    const nameToJoin = userName.trim(); // ★ trim した名前を使用
    if (!nameToJoin) {
        setError('プレイヤー名を入力してください。');
        return;
    }
    if (!socket.connected) {
        setError('サーバーに接続されていません。再接続を試みます...');
        socket.connect();
        return;
    }

    const roomToJoin = rooms.find(r => r.roomId === selectedRoomId);
    if (!roomToJoin) {
        setError('選択されたルームが見つかりません。リストを更新してください。');
        return;
    }
    // ★ 満員チェックを disabled だけでなくここでも行う
    if (roomToJoin.userCount >= roomToJoin.maxUsers) {
        setError('このルームは満員です。他のルームを選択してください。');
        return;
    }

    // ★ エラーがあればクリア
    setError(null);
    console.log(`Attempting to join room ${selectedRoomId} as ${nameToJoin}`);
    socket.emit('join room', { roomId: selectedRoomId, name: nameToJoin });
    setUserNameForParent(nameToJoin); // 親コンポーネントに名前をセット

  // ★ 依存配列を適切に設定
  }, [socket, selectedRoomId, userName, rooms, setUserNameForParent]);

  // --- レンダリング ---

  // ローディング中の表示
  if (isLoading) {
    return <p className="text-center p-8">ルーム情報を読み込み中...</p>;
  }

  // エラー発生時の表示
  // if (error) { // ★ エラーはボタンの下などに表示する方がUXが良いかも
  //   return <p className="text-center p-8 text-red-500">エラー: {error}</p>;
  // }

  // 選択されているルームの情報を取得
  const selectedRoomInfo = rooms.find(r => r.roomId === selectedRoomId);

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 text-center">ルーム選択</h1>

      {/* 名前入力フィールド */}
      <div className="mb-6">
        <label htmlFor="userName" className="block text-lg font-medium text-gray-700 mb-2">
          プレイヤー名
        </label>
        <input
          type="text"
          id="userName"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="名前を入力 (必須)"
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={20}
        />
      </div>

      {/* ルームリスト表示 */}
      <div className="space-y-3 mb-6">
        <h2 className="text-xl font-semibold mb-2">参加するルームを選択してください</h2>
        {rooms.length > 0 ? (
          rooms.map((room) => {
            const isFull = room.userCount >= room.maxUsers;
            const isSelected = selectedRoomId === room.roomId;
            return (
                <button
                  key={room.roomId}
                  onClick={() => setSelectedRoomId(room.roomId)}
                  className={`w-full flex justify-between items-center p-4 border rounded-lg text-left transition-all duration-150 ease-in-out ${
                    isSelected
                      ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-300 scale-105 shadow-md'
                      : isFull
                      ? 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed'
                      : 'bg-white hover:bg-gray-50 border-gray-300 hover:shadow-sm'
                  }`}
                  disabled={isFull}
                >
                  <div>
                    <span className="font-semibold text-lg">{room.roomId}</span>
                    <span className="text-sm text-gray-600 ml-2">({room.phase})</span>
                  </div>
                  <span
                    className={`text-sm font-medium px-2 py-0.5 rounded ${
                       isFull ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
                    }`}
                  >
                    {room.userCount} / {room.maxUsers} 人
                  </span>
                </button>
            );
          })
        ) : (
          // ★ エラーがない場合のみ「参加可能なルームがない」と表示
          !error && <p className="text-gray-500">参加可能なルームがありません。サーバーが起動しているか確認してください。</p>
        )}
        {/* ★ エラーメッセージ表示 */}
        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
      </div>

      {/* 入室ボタン */}
      <button
        onClick={handleJoinRoom}
        disabled={
            !socket ||
            !selectedRoomId ||
            !userName.trim() ||
            !selectedRoomInfo ||
            selectedRoomInfo.userCount >= selectedRoomInfo.maxUsers
        }
        className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {selectedRoomInfo ? `${selectedRoomInfo.roomId} に入室` : 'ルームを選択して入室'}
      </button>
    </div>
  );
}