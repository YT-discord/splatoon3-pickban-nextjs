'use client';

import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

// ルーム情報の型定義 (サーバーから受け取る形式に合わせる)
interface RoomInfo {
  roomId: string;
  userCount: number;
  phase: string; // 'waiting', 'ban', 'pick', 'pick_complete' などを想定
  maxUsers: number;
}

// コンポーネントのPropsの型定義
interface RoomSelectorProps {
  socket: Socket | null; // 親から socket インスタンスを受け取る (null の可能性あり)
}

export default function RoomSelector({ socket }: RoomSelectorProps) {
  // --- State 定義 ---
  const [rooms, setRooms] = useState<RoomInfo[]>([]); // APIから取得するルームリスト
  const [selectedRoomId, setSelectedRoomId] = useState<string>(''); // ユーザーが選択したルームID
  const [userName, setUserName] = useState<string>(''); // ユーザーが入力した名前
  const [isLoading, setIsLoading] = useState<boolean>(false); // ルームリスト取得中のローディング状態
  const [error, setError] = useState<string | null>(null); // エラーメッセージ

  // --- ルームリスト取得 Effect ---
  useEffect(() => {
    let isMounted = true; // アンマウント後の状態更新を防ぐフラグ

    const fetchRooms = async () => {
      if (isMounted) {
          setIsLoading(true); // ローディング開始
          setError(null);     // エラーをクリア
      }
      try {
        console.log('Fetching room list from /api/v1/rooms...');
        const res = await fetch('/api/v1/rooms'); // APIエンドポイントを叩く
        if (!res.ok) {
          // fetchが失敗した場合 (ネットワークエラーやサーバーエラーなど)
          const errorText = await res.text().catch(()=>''); // エラーレスポンス本文を取得試行
          throw new Error(`ルームリストの取得に失敗 (Status: ${res.status}${errorText ? ` - ${errorText}`: ''})`);
        }
        const data: RoomInfo[] = await res.json(); // レスポンスをJSONとしてパース

        if (isMounted) { // コンポーネントがまだマウントされていれば状態更新
            console.log('Fetched rooms:', data);
            setRooms(data); // 取得したルームリストで state を更新

            // 初回ロード時などで、選択中のルームIDがなく、リストにルームが存在する場合
            if (data.length > 0 && !selectedRoomId) {
               setSelectedRoomId(data[0].roomId); // リストの最初のルームをデフォルトで選択
            }
            // もし選択中のルームがリストから消えていた場合 (サーバー側でルームが削除されたなど)
            if (selectedRoomId && !data.some(room => room.roomId === selectedRoomId)) {
                // 選択をリセットするか、リストの最初のルームを再選択する
                setSelectedRoomId(data.length > 0 ? data[0].roomId : '');
            }
        }
      } catch (error: unknown) { // エラー処理 (型ガード使用)
        console.error('Error fetching rooms:', error);
        let message = 'ルームリストの取得中にエラーが発生しました。';
        if (error instanceof Error) {
          message = error.message;
        } else if (typeof error === 'string') {
          message = error;
        }
        if (isMounted) { // マウント中ならエラーメッセージを設定
           setError(message);
        }
      } finally {
         if (isMounted) { // マウント中ならローディング解除
             setIsLoading(false);
         }
      }
    };

    fetchRooms(); // コンポーネントマウント時にルームリストを取得

    // クリーンアップ関数: コンポーネントがアンマウントされたときにフラグを更新
    return () => {
      isMounted = false;
    };
  }, []); // 空の依存配列: 初回マウント時のみ実行

  // --- 入室処理関数 ---
  const handleJoinRoom = () => {
    // 入力チェック
    if (!socket) {
        alert('サーバーとの接続が確立されていません。');
        return;
    }
    if (!selectedRoomId) {
        alert('参加するルームを選択してください。');
        return;
    }
    if (!userName.trim()) {
        alert('プレイヤー名を入力してください。');
        return;
    }
    if (!socket.connected) { // Socket接続状態チェック
        alert('サーバーに接続されていません。再接続を試みます...');
        socket.connect(); // 再接続を試みる (任意)
        return;
    }

    // 選択されたルームの情報を取得して満員チェック
    const roomToJoin = rooms.find(r => r.roomId === selectedRoomId);
    if (!roomToJoin) {
        alert('選択されたルームが見つかりません。リストを更新してください。');
        setError('選択されたルーム情報が無効です。'); // エラー表示
        return;
    }
    if (roomToJoin.userCount >= roomToJoin.maxUsers) {
        alert('このルームは満員です。他のルームを選択してください。');
        return; // disabled 属性でも防いでいるが、念のため
    }

    // サーバーに 'join room' イベントを送信
    console.log(`Attempting to join room ${selectedRoomId} as ${userName.trim()}`);
    socket.emit('join room', { roomId: selectedRoomId, name: userName.trim() });

    // ここで一時的なローディング表示（例：ボタンを無効化して「入室中...」表示）を追加しても良い
    // setIsJoining(true); など
  };

  // --- レンダリング ---

  // ローディング中の表示
  if (isLoading) {
    return <p className="text-center p-8">ルーム情報を読み込み中...</p>;
  }

  // エラー発生時の表示
  if (error) {
    // TODO: エラー表示を改善 (例: 再試行ボタンなど)
    return <p className="text-center p-8 text-red-500">エラー: {error}</p>;
  }

  // 選択されているルームの情報を取得 (レンダリングで使用)
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
          onChange={(e) => setUserName(e.target.value)} // 入力時に userName state を更新
          placeholder="名前を入力 (必須)"
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={20} // 文字数制限 (任意)
        />
      </div>

      {/* ルームリスト表示 */}
      <div className="space-y-3 mb-6">
        <h2 className="text-xl font-semibold mb-2">参加するルームを選択してください</h2>
        {rooms.length > 0 ? (
          // ルームリストをループしてボタン表示
          rooms.map((room) => {
            const isFull = room.userCount >= room.maxUsers; // 満員かどうか
            const isSelected = selectedRoomId === room.roomId; // このルームが選択されているか
            return (
                <button
                  key={room.roomId} // React識別のためのキー
                  onClick={() => setSelectedRoomId(room.roomId)} // クリックで selectedRoomId state を更新
                  // 動的なクラス設定: 選択状態、満員状態に応じてスタイル変更
                  className={`w-full flex justify-between items-center p-4 border rounded-lg text-left transition-all duration-150 ease-in-out ${
                    isSelected
                      ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-300 scale-105 shadow-md' // 選択時のスタイル
                      : isFull
                      ? 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed' // 満員時のスタイル
                      : 'bg-white hover:bg-gray-50 border-gray-300 hover:shadow-sm' // 通常・ホバー時のスタイル
                  }`}
                  disabled={isFull} // 満員ならボタンを無効化
                >
                  {/* ルーム名とフェーズ表示 */}
                  <div>
                    <span className="font-semibold text-lg">{room.roomId}</span>
                    <span className="text-sm text-gray-600 ml-2">({room.phase})</span>
                  </div>
                  {/* 人数表示 */}
                  <span
                    className={`text-sm font-medium px-2 py-0.5 rounded ${
                       isFull ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800' // 満員なら赤、そうでなければ緑
                    }`}
                  >
                    {room.userCount} / {room.maxUsers} 人
                  </span>
                </button>
            );
          })
        ) : (
          // 表示できるルームがない場合のメッセージ
          <p className="text-gray-500">参加可能なルームがありません。サーバーが起動しているか確認してください。</p>
        )}
      </div>

      {/* 入室ボタン */}
      <button
        onClick={handleJoinRoom} // クリックで入室処理関数を呼び出し
        // disabled 条件: socket未接続, ルーム未選択, 名前未入力, 選択ルーム情報なし, 満員 のいずれか
        disabled={
            !socket ||
            !selectedRoomId ||
            !userName.trim() ||
            !selectedRoomInfo ||
            selectedRoomInfo.userCount >= selectedRoomInfo.maxUsers
        }
        className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {/* ボタンテキスト: 選択されたルームがあればルーム名、なければ汎用テキスト */}
        {selectedRoomInfo ? `${selectedRoomInfo.roomId} に入室` : 'ルームを選択して入室'}
      </button>
    </div>
  );
}