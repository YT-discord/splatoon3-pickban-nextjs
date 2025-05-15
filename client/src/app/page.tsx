'use client';

import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import RoomSelector from '../components/RoomSelector';
import WeaponGrid from '../components/WeaponGrid';
import type { DefaultEventsMap } from '@socket.io/component-emitter';
import type { MasterWeapon, GameState } from '../../../common/types/game';

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
  const [mySocketId, setMySocketId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameStateForBodyClass, setGameStateForBodyClass] = useState<GameState | null>(null);

  // ★ userStatus の変化を監視する useEffect
  useEffect(() => {
    console.log(`[DEBUG] userStatus changed to: ${userStatus}`);
  }, [userStatus]);

  // --- Socket.IO 接続処理 ---
  useEffect(() => {
    console.log('[useEffect Socket.IO] Running effect to connect socket...');
    const socketIoUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    console.log(`[useEffect Socket.IO] Connecting to: ${socketIoUrl}`);
    const newSocket: Socket<DefaultEventsMap, DefaultEventsMap> = io(socketIoUrl);
    setSocket(newSocket); // ★ setSocket 呼び出しログ
    console.log('[useEffect Socket.IO] setSocket called.');

    const onConnect = () => {
      console.log('[Socket Event] connect received. Socket ID:', newSocket.id);
      setIsConnected(true);

      if (newSocket.id) {
        console.log(`[Socket Event connect] Setting mySocketId to ${newSocket.id}`); // ★ ログ追加
        setMySocketId(newSocket.id);
      } else {
        console.error('[Socket Event connect] Socket ID is undefined after connect!');
        setConnectionError('接続エラー: Socket IDを取得できませんでした。');
        setUserStatus('error');
        setMySocketId(null);
      }

      setConnectionError(null);
      // ★ setUserStatus の呼び出しをログで確認
      setUserStatus(prevStatus => {
        if (prevStatus !== 'in_room') {
          console.log('[Socket Event connect] Setting userStatus to loading_master');
          return 'loading_master';
        }
        console.log('[Socket Event connect] userStatus is already in_room, not changing.');
        return prevStatus; // 現在の status を維持
      });
    };

    const onDisconnect = (reason: string) => {
      console.log('[Socket Event] disconnect received. Reason:', reason);
      setIsConnected(false); // ★ 接続状態 state を false に
      setMySocketId(null);
      // サーバー側の問題かネットワークの問題かを区別するメッセージが良いかも
      if (reason === 'io server disconnect') {
        setConnectionError('サーバーによって切断されました。');
      } else {
        setConnectionError('サーバーとの接続が切れました。ページを再読み込みしてください。');
      }
      setUserStatus('error');
      setJoinedRoomId(null);
      setUserName('');
      // setSocket(null); // Socketオブジェクト自体は維持しても良いかもしれない
    };

    const onConnectError = (err: Error) => {
      console.error('[Socket Event] connect_error received:', err);
      setIsConnected(false); // ★ 接続状態 state を false に
      setMySocketId(null);
      setUserStatus('error');
      setConnectionError(`サーバーに接続できませんでした: ${err.message}`);
      // setSocket(null);
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
      setIsConnected(false); // ★ クリーンアップ時も false に
      setMySocketId(null);
      setSocket(null); // ★ クリーンアップでは socket を null に戻す
      console.log('[useEffect Socket.IO] Cleanup: Socket disconnected.');
    };
  }, []); // ★ 依存配列は空のまま

  // --- マスター武器データ取得 ---
  useEffect(() => {
    console.log(`[useEffect MasterData] Running effect. isConnected: ${isConnected}, userStatus: ${userStatus}, masterWeapons loaded: ${!!masterWeapons}`);
    // 条件: 接続済み(isConnected state が true) かつ userStatus が 'loading_master' かつ masterWeapons がまだ読み込まれていない
    if (isConnected && userStatus === 'loading_master' && masterWeapons === null) {
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
            const errorText = await res.text().catch(() => 'Failed to get error details');
            throw new Error(`マスター武器データの取得に失敗しました (Status: ${res.status} - ${errorText.substring(0, 100)})${errorText.length > 100 ? '...' : ''}`);
          }
          const data: MasterWeapon[] = await res.json();
          console.log(`[fetchMasterData] Fetch successful. Data length: ${Array.isArray(data) ? data.length : 'Invalid Format'}`);
          if (!Array.isArray(data)) {
            // サーバーからのレスポンスがJSONではあるが、期待する配列形式でない場合
            // （例: { error: "message" } のようなオブジェクトが返ってきた場合など）
            let detail = '';
                        try { detail = JSON.stringify(data).substring(0, 100); } catch (e) {
              console.warn('[fetchMasterData] Failed to stringify non-array data for error detail:', e);
              detail = 'Invalid JSON structure (stringify failed)';
            }
            throw new Error(`マスター武器データの形式が正しくありません。期待したのは配列ですが、受け取ったデータ: ${detail}${detail.length >= 100 ? '...' : ''}`);
          }
          console.log('[fetchMasterData] Calling setMasterWeapons...');
          setMasterWeapons(data);
          console.log('[fetchMasterData] Calling setUserStatus("selecting_room")...');
          setUserStatus('selecting_room');
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
      console.log('[useEffect MasterData] Conditions NOT met. Details:', {
        isConnected: isConnected,
        isCorrectStatus: userStatus === 'loading_master',
        masterWeaponsIsNull: masterWeapons === null,
        userStatus: userStatus,
      });
    }

  }, [isConnected, userStatus, masterWeapons]);

  const handleGameStateUpdate = useCallback((newGameState: GameState | null) => {
    setGameStateForBodyClass(newGameState); // 内部 state を更新
  }, []);

  // gameStateForBodyClass が変更されたら body クラスを更新する Effect ★★★★★
  useEffect(() => {
    // console.log('[Body Class Effect] gameState changed:', gameStateForBodyClass); // デバッグ用
    const body = document.body;
    // 既存のフェーズ/ターンクラスを一旦削除
    body.classList.remove('phase-ban', 'phase-pick', 'turn-alpha', 'turn-bravo');

    if (!gameStateForBodyClass) return; // gameState がなければ何もしない

    // 新しいクラスを追加
    if (gameStateForBodyClass.phase === 'ban') {
      body.classList.add('phase-ban');
    } else if (gameStateForBodyClass.phase === 'pick') {
      body.classList.add('phase-pick'); // pick 自体のクラスも追加 (任意)
      if (gameStateForBodyClass.currentTurn === 'alpha') {
        body.classList.add('turn-alpha');
      } else if (gameStateForBodyClass.currentTurn === 'bravo') {
        body.classList.add('turn-bravo');
      }
    }
  }, [gameStateForBodyClass]); // gameStateForBodyClass の変更を監視

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
  }, [socket]);

  const handleSetUserName = useCallback((name: string) => { setUserName(name); }, []);

  const handleLeaveRoom = useCallback(() => {
    console.log(`[Home] Leaving room ${joinedRoomId}`);
    setJoinedRoomId(null);
    setGameStateForBodyClass(null); // ★ body のクラスをリセットするために gameState を null にする
    setUserStatus('selecting_room');
  }, [joinedRoomId]); // setGameStateForBodyClass は安定しているので依存配列に追加不要

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
        if (socket && joinedRoomId && masterWeapons && userName && mySocketId) {
          return <WeaponGrid
            socket={socket}
            roomId={joinedRoomId}
            masterWeapons={masterWeapons}
            userName={userName}
            myActualSocketId={mySocketId}
            onLeaveRoom={handleLeaveRoom}
            onGameStateUpdate={handleGameStateUpdate}
          />;
        } else {
          // エラーメッセージを少し具体的に
          const missing = [
            !socket && "socket",
            !joinedRoomId && "roomId",
            !masterWeapons && "masterWeapons",
            !userName && "userName",
            !mySocketId && "mySocketId"
          ].filter(Boolean).join(', ');
          return <p className="text-center p-8 text-red-500">エラー: ルーム参加情報の準備ができていません (不足: {missing}) (State: {userStatus})</p>;
        }
      case 'error': return <p className="text-center p-8 text-red-500">エラー: {connectionError || '不明な接続エラー'} (ページを更新してください)</p>;
      default: return null;
    }
  };

  return (
    <div>
      {renderContent()}
    </div>
  );
}