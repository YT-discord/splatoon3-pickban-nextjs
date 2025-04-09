'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import RoomSelector from '../components/RoomSelector';
import WeaponGrid from '../components/WeaponGrid';
// ★ MasterWeapon 型をインポート
import type { MasterWeapon } from '../../../common/types/game';

type UserStatus = 'connecting' | 'loading_master' | 'selecting_room' | 'in_room' | 'error';

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus>('connecting');
  const [joinedRoomId, setJoinedRoomId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  // ★ マスター武器データ用の State
  const [masterWeapons, setMasterWeapons] = useState<MasterWeapon[] | null>(null);

  // --- Socket.IO 接続確立 ---
  useEffect(() => {
    const socketIoUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    const newSocket = io(socketIoUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      // ★ 接続後、マスター武器データをロードする状態へ
      setUserStatus('loading_master');
      setConnectionError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setUserStatus('error'); // 切断されたらエラー状態に
      setConnectionError('サーバーとの接続が切れました。');
      setJoinedRoomId(null); // ルーム情報もリセット
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setUserStatus('error');
      setConnectionError(`サーバーに接続できませんでした: ${err.message}`);
      setSocket(null); // 接続失敗時は socket を null に
    });

    // クリーンアップ関数
    return () => {
      console.log('Disconnecting socket on component unmount...');
      newSocket.disconnect();
    };
  }, []); // 初回マウント時のみ実行

  // --- マスター武器データ取得 ---
  useEffect(() => {
    if (userStatus === 'loading_master' && masterWeapons === null) {
      const fetchMasterData = async () => {
        try {
          console.log('Fetching master weapons data...');
          const res = await fetch('/api/v1/master-weapons');
          if (!res.ok) {
            // エラーレスポンスからメッセージを生成
            const errorText = await res.text().catch(() => '');
            throw new Error(`マスター武器データの取得失敗 (Status: ${res.status}${errorText ? ` - ${errorText}` : ''})`);
          }
          const data: MasterWeapon[] = await res.json();
          // ★ データ形式の簡単なチェック (任意)
          if (!Array.isArray(data)) {
              throw new Error("サーバーから受け取った武器データの形式が不正です。");
          }
          console.log('Master weapons data fetched:', data.length);
          setMasterWeapons(data);
          setUserStatus('selecting_room');
        } catch (error: unknown) { // ★ unknown 型でキャッチ
          console.error('Error fetching master weapons:', error);
          setUserStatus('error');
          // --- ★ 型ガードでメッセージ抽出 ---
          let message = 'マスター武器データの取得中にエラーが発生しました。';
          if (error instanceof Error) {
            message = error.message;
          } else if (typeof error === 'string') {
            message = error;
          }
          setConnectionError(message); // ★ 抽出したメッセージをセット
          // ------------------------------------
        }
      };
      fetchMasterData();
    }
  }, [userStatus, masterWeapons]);

  // --- ルーム参加成功/失敗ハンドラー ---
  useEffect(() => {
    if (!socket) return;

    const handleJoinSuccess = (data: { roomId: string }) => {
      console.log(`Successfully joined room: ${data.roomId}`);
      setJoinedRoomId(data.roomId);
      setUserStatus('in_room');
    };

    const handleJoinFailed = (data: { roomId: string; reason: string }) => {
      console.error(`Failed to join room ${data.roomId}: ${data.reason}`);
      // エラーメッセージを表示するなどの処理 (RoomSelector側で表示しても良い)
      alert(`入室失敗: ${data.reason}`); // 簡単な例
      setUserStatus('selecting_room'); // ルーム選択状態に戻す
      setJoinedRoomId(null);
    };

    socket.on('join room success', handleJoinSuccess);
    socket.on('join room failed', handleJoinFailed);

    // クリーンアップ
    return () => {
      socket.off('join room success', handleJoinSuccess);
      socket.off('join room failed', handleJoinFailed);
    };
  }, [socket]); // socket が変更されたらリスナーを再設定

  // --- レンダリング ---
  const renderContent = () => {
    switch (userStatus) {
      case 'connecting':
        return <p className="text-center p-8">サーバーに接続中...</p>;
      case 'loading_master':
        return <p className="text-center p-8">基本データを読み込み中...</p>; // ★ ロード中表示追加
      case 'selecting_room':
        // ★ masterWeapons がロードできていない場合はエラー表示
        if (!masterWeapons) {
             return <p className="text-center p-8 text-red-500">エラー: 武器データの読み込みに失敗しました。</p>;
        }
        return <RoomSelector socket={socket} />;
      case 'in_room':
        // ★ masterWeapons と roomId を WeaponGrid に渡す
        if (socket && joinedRoomId && masterWeapons) {
          return <WeaponGrid socket={socket} roomId={joinedRoomId} masterWeapons={masterWeapons} />;
        } else {
           return <p className="text-center p-8 text-red-500">エラー: ルームまたは武器データの準備ができていません。</p>;
        }
      case 'error':
        return <p className="text-center p-8 text-red-500">エラー: {connectionError || '不明な接続エラー'}</p>;
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ヘッダーなどを追加可能 */}
      {/* <header>...</header> */}
      <div>
        {renderContent()}
      </div>
    </main>
  );
}