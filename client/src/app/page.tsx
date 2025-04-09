'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import RoomSelector from '../components/RoomSelector';
import WeaponGrid from '../components/WeaponGrid';
import type { MasterWeapon } from '../../../common/types/game';
import type { DefaultEventsMap } from '@socket.io/component-emitter';

type UserStatus = 'connecting' | 'loading_master' | 'selecting_room' | 'in_room' | 'error';

export default function Home() {
  // ★ Socket の型をより具体的に
  const [socket, setSocket] = useState<Socket<DefaultEventsMap, DefaultEventsMap> | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus>('connecting');
  const [joinedRoomId, setJoinedRoomId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [masterWeapons, setMasterWeapons] = useState<MasterWeapon[] | null>(null);
  const [userName, setUserName] = useState<string>('');


  // --- Socket.IO 接続確立 ---
  useEffect(() => {
    // (変更なし)
    const socketIoUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    const newSocket: Socket<DefaultEventsMap, DefaultEventsMap> = io(socketIoUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setUserStatus('loading_master');
      setConnectionError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setUserStatus('error');
      setConnectionError('サーバーとの接続が切れました。');
      setJoinedRoomId(null);
      setUserName(''); // ★ 切断時はユーザー名もリセット
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setUserStatus('error');
      setConnectionError(`サーバーに接続できませんでした: ${err.message}`);
      setSocket(null);
    });

    return () => {
      console.log('Disconnecting socket on component unmount...');
      newSocket.disconnect();
    };
  }, []);

  // --- マスター武器データ取得 ---
  useEffect(() => {
    // (変更なし)
    if (userStatus === 'loading_master' && masterWeapons === null) {
      const fetchMasterData = async () => {
        try {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
          const apiUrl = `${apiBaseUrl}/api/v1/master-weapons`;
          console.log(`Fetching master weapons data from: ${apiUrl}`);
          const res = await fetch(apiUrl);
          if (!res.ok) {
            const errorText = await res.text().catch(() => '');
            const detail = errorText.length < 500 ? errorText : '(HTML response)';
            throw new Error(`マスター武器データの取得失敗 (Status: ${res.status}${detail ? ` - ${detail}` : ''})`);
          }
          const data: MasterWeapon[] = await res.json();
          if (!Array.isArray(data)) {
              throw new Error("サーバーから受け取った武器データの形式が不正です。");
          }
          console.log('Master weapons data fetched:', data.length);
          setMasterWeapons(data);
          setUserStatus('selecting_room');
        } catch (error: unknown) {
          console.error('Error fetching master weapons:', error);
          setUserStatus('error');
          let message = 'マスター武器データの取得中にエラーが発生しました。';
          if (error instanceof Error) {
            message = error.message;
          } else if (typeof error === 'string') {
            message = error;
          }
          if (message.includes('Failed to fetch')) {
               message = `APIサーバー(${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'})に接続できませんでした。サーバーが起動しているか確認してください。`;
          }
          setConnectionError(message);
        }
      };
      fetchMasterData();
    }
  }, [userStatus, masterWeapons]);

  // --- ルーム参加成功/失敗ハンドラー ---
  useEffect(() => {
    // (変更なし)
    if (!socket) return;

    const handleJoinSuccess = (data: { roomId: string }) => {
      // ★ userName state は RoomSelector 側で setUserNameForParent 経由で設定される
      console.log(`Successfully joined room: ${data.roomId}`);
      setJoinedRoomId(data.roomId);
      setUserStatus('in_room');
    };

    const handleJoinFailed = (data: { roomId: string; reason: string }) => {
      console.error(`Failed to join room ${data.roomId}: ${data.reason}`);
      alert(`入室失敗: ${data.reason}`);
      setUserStatus('selecting_room');
      setJoinedRoomId(null);
      // ★ 入室失敗時はユーザー名をリセットしても良いかも
      // setUserName('');
    };

    socket.on('join room success', handleJoinSuccess);
    socket.on('join room failed', handleJoinFailed);

    return () => {
      socket.off('join room success', handleJoinSuccess);
      socket.off('join room failed', handleJoinFailed);
    };
  }, [socket]);

  // --- レンダリング ---
  const renderContent = () => {
    switch (userStatus) {
      case 'connecting':
        return <p className="text-center p-8">サーバーに接続中...</p>;
      case 'loading_master':
        return <p className="text-center p-8">基本データを読み込み中...</p>;
      case 'selecting_room':
        if (!masterWeapons) {
             return <p className="text-center p-8 text-red-500">エラー: 武器データの読み込みに失敗しました。</p>;
        }
        return <RoomSelector socket={socket} setUserNameForParent={setUserName} />;
      case 'in_room':
        if (socket && joinedRoomId && masterWeapons && userName) {
          return <WeaponGrid socket={socket} roomId={joinedRoomId} masterWeapons={masterWeapons} userName={userName} />;
        } else {
           return <p className="text-center p-8 text-red-500">エラー: ルーム参加情報の準備ができていません (Socket: {socket ? 'OK' : 'NG'}, RoomID: {joinedRoomId ?? 'NG'}, MasterData: {masterWeapons ? 'OK' : 'NG'}, UserName: {userName || 'NG'})。</p>;
        }
      case 'error':
        return <p className="text-center p-8 text-red-500">エラー: {connectionError || '不明な接続エラー'}</p>;
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div>
        {renderContent()}
      </div>
    </main>
  );
}