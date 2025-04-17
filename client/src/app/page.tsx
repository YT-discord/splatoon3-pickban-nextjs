'use client';

import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import RoomSelector from '../components/RoomSelector';
import WeaponGrid from '../components/WeaponGrid';
import type { MasterWeapon } from '../../../common/types/game';
import type { DefaultEventsMap } from '@socket.io/component-emitter';

type UserStatus = 'connecting' | 'loading_master' | 'selecting_room' | 'in_room' | 'error';

console.log('[page.tsx] Component rendering/re-rendering'); // ★ レンダリング確認ログ

export default function Home() {
  console.log('[Home Component] Initializing state...'); // ★ State 初期化確認ログ
  const [socket, setSocket] = useState<Socket<DefaultEventsMap, DefaultEventsMap> | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus>('connecting');
  const [joinedRoomId, setJoinedRoomId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [masterWeapons, setMasterWeapons] = useState<MasterWeapon[] | null>(null);

  // ★ userStatus の変化を監視する useEffect
  useEffect(() => {
    console.log(`[DEBUG] userStatus changed to: ${userStatus}`);
  }, [userStatus]);

  // --- Socket.IO 接続処理 ---
  useEffect(() => {
    console.log('[useEffect Socket.IO] Running effect to connect socket...');
    const socketIoUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    console.log(`[useEffect Socket.IO] Connecting to: ${socketIoUrl}`);
    const newSocket: Socket<DefaultEventsMap, DefaultEventsMap> = io(socketIoUrl);
    setSocket(newSocket); // ★ setSocket 呼び出しログ
    console.log('[useEffect Socket.IO] setSocket called.');

    const onConnect = () => {
      console.log('[Socket Event] connect received. Socket ID:', newSocket.id);
      setConnectionError(null);
      // ★ setUserStatus の呼び出しをログで確認
      console.log('[Socket Event connect] Current userStatus before setting:', userStatus);
      if (userStatus !== 'in_room') {
          console.log('[Socket Event connect] Setting userStatus to loading_master');
          setUserStatus('loading_master');
      } else {
           console.log('[Socket Event connect] userStatus is already in_room, not changing.');
      }
    };

    const onDisconnect = (reason: string) => {
      console.log('[Socket Event] disconnect received. Reason:', reason);
      console.log('[Socket Event disconnect] Setting userStatus to error');
      setUserStatus('error');
      setConnectionError('サーバーとの接続が切れました。ページを再読み込みしてください。');
      setJoinedRoomId(null);
      setUserName('');
      setSocket(null);
    };

    const onConnectError = (err: Error) => {
      console.error('[Socket Event] connect_error received:', err);
      console.log('[Socket Event connect_error] Setting userStatus to error');
      setUserStatus('error');
      setConnectionError(`サーバーに接続できませんでした: ${err.message}`);
      setSocket(null);
    };

    console.log('[useEffect Socket.IO] Registering listeners...');
    newSocket.on('connect', onConnect);
    newSocket.on('disconnect', onDisconnect);
    newSocket.on('connect_error', onConnectError);

    return () => {
      console.log('[useEffect Socket.IO] Cleanup: Disconnecting socket...');
      newSocket.off('connect', onConnect);
      newSocket.off('disconnect', onDisconnect);
      newSocket.off('connect_error', onConnectError);
      newSocket.disconnect();
      console.log('[useEffect Socket.IO] Cleanup: Socket disconnected.');
    };
  }, []); // ★ 依存配列は空のまま

  // --- マスター武器データ取得 ---
  useEffect(() => {
    console.log(`[useEffect MasterData] Running effect. userStatus: ${userStatus}, socket connected: ${socket?.connected}, masterWeapons loaded: ${!!masterWeapons}`);
    // ★ 条件を再確認
    if (socket?.connected && userStatus === 'loading_master' && masterWeapons === null) {
      console.log('[useEffect MasterData] Conditions met, starting fetchMasterData...');
      const fetchMasterData = async () => {
        console.log('[fetchMasterData] Fetch function started.');
        try {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
          const apiUrl = `${apiBaseUrl}/api/v1/master-weapons`;
          console.log(`[fetchMasterData] Fetching from: ${apiUrl}`);
          const res = await fetch(apiUrl);
          console.log(`[fetchMasterData] Fetch response status: ${res.status}`);
          if (!res.ok) {
            const errorText = await res.text().catch(() => '');
            const detail = errorText.length < 500 ? errorText : '(HTML response)';
            console.error(`[fetchMasterData] Fetch failed! Status: ${res.status}, Detail: ${detail}`);
            throw new Error(`マスター武器データの取得失敗 (Status: ${res.status}${detail ? ` - ${detail}` : ''})`);
          }
          const data: MasterWeapon[] = await res.json();
          console.log(`[fetchMasterData] Fetch successful. Data length: ${Array.isArray(data) ? data.length : 'Invalid Format'}`);
          if (!Array.isArray(data)) {
              console.error('[fetchMasterData] Invalid data format received.');
              throw new Error("サーバーから受け取った武器データの形式が不正です。");
          }
          console.log('[fetchMasterData] Calling setMasterWeapons...');
          setMasterWeapons(data);
          console.log('[fetchMasterData] Calling setUserStatus("selecting_room")...');
          setUserStatus('selecting_room'); // ★ ここが実行されているか？
          console.log('[fetchMasterData] setUserStatus("selecting_room") called.');
        } catch (error: unknown) {
          console.error('[fetchMasterData] Error caught:', error);
          // ★ エラー時の setUserStatus 呼び出しログ
          console.log('[fetchMasterData] Setting userStatus to error due to fetch failure.');
          setUserStatus('error');
          let message = 'マスター武器データの取得中にエラーが発生しました。';
          if (error instanceof Error) { message = error.message; }
          else if (typeof error === 'string') { message = error; }
          if (message.includes('Failed to fetch')) { message = `APIサーバー(${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'})に接続できませんでした。`; }
          setConnectionError(message);
        }
      };
      fetchMasterData();
    } else {
        console.log('[useEffect MasterData] Conditions not met or already loaded.');
    }
    // ★ 依存配列を再確認
  }, [userStatus, masterWeapons, socket]);

  // --- ルーム参加成功/失敗ハンドラー (ログ追加) ---
  useEffect(() => {
    if (!socket) return;
    console.log('[useEffect JoinRoomHandlers] Registering join room listeners...');

    const handleJoinSuccess = (data: { roomId: string }) => {
      console.log('[Socket Event] join room success received:', data);
      console.log('[Socket Event join room success] Setting joinedRoomId and userStatus("in_room")...');
      setJoinedRoomId(data.roomId);
      setUserStatus('in_room');
    };

    const handleJoinFailed = (data: { roomId: string; reason: string }) => {
      console.error('[Socket Event] join room failed received:', data);
      alert(`入室失敗: ${data.reason}`);
      console.log('[Socket Event join room failed] Setting userStatus("selecting_room")...');
      setUserStatus('selecting_room');
      setJoinedRoomId(null);
    };

    socket.on('join room success', handleJoinSuccess);
    socket.on('join room failed', handleJoinFailed);

    return () => {
      console.log('[useEffect JoinRoomHandlers] Cleanup: Removing join room listeners...');
      socket.off('join room success', handleJoinSuccess);
      socket.off('join room failed', handleJoinFailed);
    };
  }, [socket]); // ★ socket のみでOK

  // ★ RoomSelector から userName を受け取る関数
  const handleSetUserName = useCallback((name: string) => { setUserName(name); }, []);

  // ★★★ ルーム退出処理関数を追加 ★★★
  const handleLeaveRoom = useCallback(() => {
      console.log(`[Home] Leaving room ${joinedRoomId}`);
      setJoinedRoomId(null);
      setUserStatus('selecting_room');
      // userName はリセットしない方が、再入室時に便利かもしれない
      // setUserName('');
      // ★ サーバー側の leave room ハンドラで socket.leave() が呼ばれる
      // ★ 必要であれば、ここで明示的に socket?.emit('leave room') を呼んでも良いが、
      // ★ WeaponGrid 側で呼ぶ方が責務分担として自然かもしれない
  }, [joinedRoomId]);
  // ★★★★★★★★★★★★★★★★★★★★★

  // --- レンダリング ---
  console.log(`[renderContent] Rendering content for userStatus: ${userStatus}`); // ★ レンダリング時の状態確認
  const renderContent = () => {
    switch (userStatus) {
        case 'connecting': return <p className="text-center p-8">サーバーに接続中...</p>;
        case 'loading_master': return <p className="text-center p-8">基本データを読み込み中...</p>;
        case 'selecting_room':
            if (!masterWeapons) { return <p className="text-center p-8 text-red-500">エラー: 武器データの読み込みに失敗しました。</p>; }
            return <RoomSelector socket={socket} setUserNameForParent={handleSetUserName} />;
        case 'in_room':
            if (socket && joinedRoomId && masterWeapons && userName) { return <WeaponGrid socket={socket} roomId={joinedRoomId} masterWeapons={masterWeapons} userName={userName} onLeaveRoom={handleLeaveRoom} />; }
            else { return <p className="text-center p-8 text-red-500">エラー: ルーム参加情報の準備ができていません (State: {userStatus})</p>; }
        case 'error': return <p className="text-center p-8 text-red-500">エラー: {connectionError || '不明な接続エラー'} (ページを更新してください)</p>;
        default: return null;
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