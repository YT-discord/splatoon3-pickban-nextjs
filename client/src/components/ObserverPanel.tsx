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
        <div className="border rounded-lg p-3 bg-gray-50 shadow-sm mt-6">
             <div className="flex justify-between items-center mb-2">
                 <h4 className="font-semibold text-gray-800">観戦者 ({observers.length})</h4>
                  <button
                      onClick={() => onSelectTeam('observer')}
                      disabled={gameState.phase !== 'waiting' || myTeam === 'observer'}
                      className={`px-3 py-1 rounded-md text-xs transition-colors font-semibold ${
                         myTeam === 'observer' ? 'bg-gray-600 text-white ring-2 ring-gray-300' : 'bg-white border border-gray-400 text-gray-700 hover:bg-gray-100'
                      } ${gameState.phase !== 'waiting' ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                      観戦に参加 {myTeam === 'observer' ? '(選択中)' : ''}
                  </button>
             </div>
             <ul className="space-y-0.5 text-sm">
                 {observers.map(user => (
                     <li key={user.id} className={`flex items-center ${user.name === userName ? 'font-bold' : ''} text-gray-700`}>
                         <span className="inline-block w-2 h-2 bg-gray-500 rounded-full mr-1.5"></span>
                         {user.name}
                     </li>
                 ))}
                  {observers.length === 0 && <li className="text-gray-500 italic text-xs">観戦者はいません</li>}
             </ul>
        </div>
    );
};

export default ObserverPanel;