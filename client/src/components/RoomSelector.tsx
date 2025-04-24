// reactnext/client/src/app/components/RoomSelector.tsx (修正後)
'use client';

import { useState, useEffect, useCallback } from 'react'; // ★ useCallback をインポート
import { Socket } from 'socket.io-client';
import Image from 'next/image';

// ルーム情報の型定義
interface RoomInfo {
  roomId: string;
  roomName: string;
  userCount: number;
  phase: string;
  maxUsers: number;
}

// コンポーネントのPropsの型定義
interface RoomSelectorProps {
  socket: Socket | null;
  setUserNameForParent: (name: string) => void;
}

const getPhaseDisplayName = (phase: string): string => {
  switch (phase) {
    case 'waiting': return '開始待機中';
    case 'ban': return 'BANフェーズ';
    case 'pick': return 'PICKフェーズ';
    case 'pick_complete': return 'PICK完了';
    default: return phase; // 不明な場合はそのまま表示
  }
};

const getRoomIconPath = (roomId: string): string => {
  return `/images/icons/${roomId}.png`; // ★ roomId を直接使用
};

const validateName = (name: string): string | null => {
  const trimmedName = name.trim();
  if (trimmedName.length === 0) return '名前を入力してください。';
  if (trimmedName.length > 10) return '名前が長すぎます (10文字以内)';
  return null; // エラーなし
};

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
          const errorText = await res.text().catch(() => '');
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

  const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setUserName(newName);
    // setError(validateName(newName)); // 入力中にエラーを出す場合
  };

  // --- 入室処理関数 (useCallbackで最適化) ---
  const handleJoinRoom = useCallback((roomIdToJoin: string) => { // ★ 引数で roomId を受け取るように変更
    const nameValidationError = validateName(userName);
    if (nameValidationError) {
      setError(nameValidationError);
      return;
    }

    if (!socket) { setError('サーバーとの接続が確立されていません。'); return; }
    // ★ selectedRoomId ではなく引数の roomIdToJoin を使うか確認
    // if (!selectedRoomId) { setError('参加するルームを選択してください。'); return; } // ← 不要に
    const nameToJoin = userName.trim();
    if (!nameToJoin) { setError('プレイヤー名を入力してください。'); return; }
    if (!socket.connected) { setError('サーバーに接続されていません。再接続を試みます...'); socket.connect(); return; }

    const roomToJoin = rooms.find(r => r.roomId === roomIdToJoin); // ★ 引数でチェック
    if (!roomToJoin) { setError('選択されたルームが見つかりません。リストを更新してください。'); return; }
    if (roomToJoin.userCount >= roomToJoin.maxUsers) { setError('このルームは満員です。'); return; } // 満員チェックは維持

    setError(null); // エラークリア
    console.log(`Attempting to join room ${roomIdToJoin} as ${nameToJoin}`);
    socket.emit('join room', { roomId: roomIdToJoin, name: nameToJoin });
    setUserNameForParent(nameToJoin);
  }, [socket, userName, rooms, setUserNameForParent]);

  // --- レンダリング ---

  // ローディング中の表示
  if (isLoading) {
    return <p className="text-center p-8">ルーム情報を読み込み中...</p>;
  }

  // エラー発生時の表示
  // if (error) { // ★ エラーはボタンの下などに表示する方がUXが良いかも
  //   return <p className="text-center p-8 text-red-500">エラー: {error}</p>;
  // }

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
          onChange={handleUserNameChange}
          placeholder="名前を入力 (10文字以内)"
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
          maxLength={10}
        />
      </div>

      {/* ルームリスト表示 */}
      <div className="space-y-3 mb-6">
        <h2 className="text-xl font-semibold mb-2">参加するルームを選択してください</h2>
        {rooms.length > 0 ? (
          rooms.map((room) => {
            const isFull = room.userCount >= room.maxUsers;
            const isSelected = selectedRoomId === room.roomId;
            const canJoin = !isFull && userName.trim().length > 0;
            const phaseDisplayName = getPhaseDisplayName(room.phase);

            return (
              <div
                key={room.roomId}
                onClick={() => !isFull && setSelectedRoomId(room.roomId)} // ★ 満員でなければクリックで選択
                className={`w-full flex justify-between items-center p-4 border rounded-lg transition-all duration-150 ease-in-out cursor-pointer ${isSelected
                  ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-300 scale-105 shadow-md'
                  : isFull
                    ? 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed' // 全体もクリック不可に
                    : 'bg-white hover:bg-gray-50 border-gray-300 hover:shadow-sm'
                  }`}
                title={isFull ? `${room.roomName} (${room.roomId}) (満員)` : `${room.roomName} (${room.roomId})`}
              >
                {/* 左側: ルーム情報 */}
                <div className="flex-grow mr-4 flex items-center gap-3">
                  <Image
                    src={getRoomIconPath(room.roomId)}
                    alt={`${room.roomId} icon`}
                    width={32} // サイズは調整
                    height={32}
                    className="rounded" // 任意
                  />
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold text-lg text-gray-800">{room.roomId} :</span>
                    <span className="font-medium text-base text-gray-800 truncate" title={room.roomName}>{room.roomName}</span>
                  </div>
                  {/* 状態と人数 */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">{phaseDisplayName}</span> {/* ★ 日本語フェーズ名 */}
                    <span className={`font-medium ${isFull ? 'text-red-600' : 'text-green-700'}`}>
                      {room.userCount} / {room.maxUsers} 人 {isFull ? '(満員)' : ''}
                    </span>
                  </div>
                </div>

                {/* ★★★★★ 追加: 右側: 入室ボタン ★★★★★ */}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // 親 div の onClick を発火させない
                    if (canJoin) {
                      handleJoinRoom(room.roomId); // ★ roomId を引数で渡す
                    }
                  }}
                  disabled={!canJoin} // ★ 結合した条件で disabled
                  className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${canJoin
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-400 cursor-not-allowed' // クリック不可時のスタイル
                    }`}
                >
                  入室
                </button>
              </div>
            );
          })
        ) : (
          !error && <p className="text-gray-500">参加可能なルームがありません...</p>
        )}
        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
      </div>
    </div>
  );
}