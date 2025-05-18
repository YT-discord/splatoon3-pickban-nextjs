import React from 'react';
import type { RoomUser } from '../../../common/types/index';

interface MembersDisplayModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomUsers: RoomUser[];
    hostId: string | null;
    userName: string; // 自分のユーザー名を強調表示するため
}

const MembersDisplayModal: React.FC<MembersDisplayModalProps> = ({
    isOpen,
    onClose,
    roomUsers,
    hostId,
    userName,
}) => {
    if (!isOpen) return null;

    const alphaTeamUsers = roomUsers.filter(u => u.team === 'alpha');
    const bravoTeamUsers = roomUsers.filter(u => u.team === 'bravo');
    const observers = roomUsers.filter(u => u.team === 'observer' || !u.team);

    const renderUserList = (users: RoomUser[], teamName: string, teamColorClass: string, dotColorClass: string) => (
        <div className="mb-4 last:mb-0">
            <h3 className={`text-lg font-semibold mb-2 ${teamColorClass}`}>{teamName} ({users.length})</h3>
            {users.length > 0 ? (
                <ul className="space-y-1 text-sm max-h-40 overflow-y-auto pr-2"> {/* max-h を調整 */}
                    {users.map(user => {
                        const isHostUser = user.id === hostId;
                        const isSelf = user.name === userName;
                        return (
                            <li key={user.id} className={`flex items-center py-0.5 ${isSelf ? 'font-bold text-yellow-300' : 'text-gray-300'}`}>
                                <span className={`inline-block w-2.5 h-2.5 ${dotColorClass} rounded-full mr-2 flex-shrink-0`}></span>
                                <span className="truncate flex-grow">{user.name}</span>
                                {isHostUser && <span className="text-xs text-gray-500 ml-1 flex-shrink-0">(ホスト)</span>}
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className="text-sm text-gray-500 italic">メンバーがいません</p>
            )}
        </div>
    );

    return (
        <div
            className="fixed inset-0 bg-black/70 flex justify-center items-center z-[100]" // z-index を高く設定
            onClick={onClose}
        >
            <div
                className="bg-gray-800 text-white rounded-lg shadow-xl p-6 max-w-md w-full max-h-[70vh] overflow-y-hidden flex flex-col" // max-h を調整
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">参加者リスト</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto flex-grow">
                    {renderUserList(alphaTeamUsers, 'アルファチーム', 'text-blue-400', 'bg-blue-500')}
                    {renderUserList(bravoTeamUsers, 'ブラボーチーム', 'text-red-400', 'bg-red-500')}
                    {renderUserList(observers, '観戦者', 'text-gray-400', 'bg-gray-500')}
                </div>
            </div>
        </div>
    );
};

export default MembersDisplayModal;