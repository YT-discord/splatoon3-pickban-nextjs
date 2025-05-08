import React from 'react';
import type { GameState, Team, RoomUser } from '../../../common/types/game';

interface ObserverPanelProps {
    gameState: GameState;
    observers: RoomUser[];
    myTeam: Team | 'observer';
    userName: string;
    onSelectTeam: (team: 'observer') => void; // 観戦を選択する関数
}

const ObserverPanel: React.FC<ObserverPanelProps> = ({
    gameState,
    observers,
    myTeam,
    userName,
    onSelectTeam,
}) => {
    return (
        <div className="border rounded-lg p-2 bg-gray-50 shadow-sm mt-1">
             <div className="flex justify-between items-center mb-2">
                 <h4 className="font-semibold text-gray-800">観戦者 ({observers.length})</h4>
                  <button
                      onClick={() => onSelectTeam('observer')}
                      disabled={gameState.phase !== 'waiting' || myTeam === 'observer'}
                      className={`px-3 py-1 rounded-md text-xs transition-colors font-semibold border ${
                         myTeam === 'observer' ? 'bg-gray-600 text-white ring-2 ring-gray-300' : 'bg-white border border-gray-400 text-gray-700 hover:bg-gray-100'
                      } ${gameState.phase !== 'waiting' ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                      観戦に参加 {myTeam === 'observer' ? '(選択中)' : ''}
                  </button>
             </div>
             <div className="max-h-20 overflow-y-auto pr-2"> {/* ★ pr-2 でスクロールバー分のスペース確保 */}
                 <ul className="flex flex-wrap space-y-0.5 text-sm">
                     {observers.map(user => {
                         const isHost = user.id === gameState.hostId;
                         return (
                            <li key={user.id} className={`flex items-center flex-shrink-0 py-0.5 ${user.name === userName ? 'font-bold' : ''} text-gray-700`}> {/* ★ flex-shrink-0, py */}
                            <span className="inline-block w-2 h-2 bg-gray-500 rounded-full mr-1"></span> {/* ★ mr-1 */}
                            <span className="truncate max-w-[100px]">{user.name}</span> {/* ★ max-w で最大幅指定 (任意) */}
                            {isHost && <span className="text-xs text-gray-500 ml-1 flex-shrink-0 mr-1">(ホスト)</span>}
                        </li>
                         );
                     })}
                      {observers.length === 0 && <li className="text-white italic text-xs w-full text-center py-1">ダミー</li>}
                 </ul>
             </div>
        </div>
    );
};

export default ObserverPanel;