import React from 'react';
import Image from 'next/image';
// ★ 型定義インポートを修正・追加
import type { GameState, Team, RoomUser } from '../../../common/types/game';
import type { DisplayWeapon } from './WeaponGrid'; // WeaponGrid から DisplayWeapon をインポート
import { MAX_PICKS_PER_TEAM, MAX_BANS_PER_TEAM, RANDOM_CHOICE_ID } from '../../../common/types/constants';

interface TeamPanelProps {
    team: Team; // 'alpha' または 'bravo'
    teamDisplayName: string; // 'アルファ' または 'ブラボー'
    gameState: GameState;
    teamUsers: RoomUser[];
    pickedWeapons: DisplayWeapon[];
    bannedWeapons: DisplayWeapon[];
    myTeam: Team | 'observer';
    userName: string;
    onSelectTeam: (team: Team) => void;
}

const TeamPanel: React.FC<TeamPanelProps> = ({
    team,
    teamDisplayName,
    // teamColor, // ← 使わない
    gameState,
    teamUsers,
    pickedWeapons,
    bannedWeapons,
    myTeam,
    userName,
    onSelectTeam,
}) => {
    // ★★★★★ 変更点: team の値に基づいて静的なクラス名を定義 ★★★★★
    const isAlpha = team === 'alpha';

    // パネルスタイル
    const panelBgColor = isAlpha ? 'bg-blue-50' : 'bg-red-50';
    // テキスト・ヘッダースタイル
    const panelTextColor = isAlpha ? 'text-blue-700' : 'text-red-700';
    const panelHeaderColor = isAlpha ? 'text-blue-800' : 'text-red-800';
    // メンバーリストのドット
    const userDotColor = isAlpha ? 'bg-blue-500' : 'bg-red-500';
    // Pick アイテムのボーダー
    const itemBorderColor = isAlpha ? 'border-blue-300' : 'border-red-300';
    // BAN アイコンの SVG 色
    const banSvgColor = isAlpha ? 'text-blue-600' : 'text-red-600';

    // 参加ボタンのスタイルを条件分岐で設定
    const buttonBaseStyle = `w-full px-3 py-1.5 rounded-md text-sm transition-colors font-semibold`;
    const buttonDisabledStyle = gameState.phase !== 'waiting' ? 'opacity-60 cursor-not-allowed' : '';
    let buttonTeamStyle = '';
    if (myTeam === team) {
        // 自分が選択中のチームの場合
        buttonTeamStyle = isAlpha
            ? `bg-blue-600 text-white ring-2 ring-blue-300`
            : `bg-red-600 text-white ring-2 ring-red-300`;
    } else {
        // 自分が選択していないチームの場合
        buttonTeamStyle = isAlpha
            ? `bg-white border border-blue-300 text-blue-700 hover:bg-blue-100`
            : `bg-white border border-red-300 text-red-700 hover:bg-red-100`; // ← ブラボーの色を明示
    }
    const finalButtonStyle = `${buttonBaseStyle} ${buttonTeamStyle} ${buttonDisabledStyle}`;

    // BAN表示関連の計算 (変更なし)
    const banCount = gameState.banPhaseState?.bans[team] ?? 0;
    const pickCount = gameState.pickPhaseState?.picks[team] ?? 0;
    const shouldShowBan = (weapon: DisplayWeapon): boolean => {
        if (weapon.id === RANDOM_CHOICE_ID) return false;
        const isSelfOrObserver = myTeam === team || myTeam === 'observer';
        return gameState.phase === 'pick' || gameState.phase === 'pick_complete' || (gameState.phase === 'ban' && isSelfOrObserver);
    }
    const hasVisibleBans = bannedWeapons.some(shouldShowBan);
    const opponentTeam = team === 'alpha' ? 'bravo' : 'alpha';
    const opponentHasBansInBanPhase = gameState.phase === 'ban' && myTeam === opponentTeam && (gameState.banPhaseState?.bans[team] ?? 0) > 0;


    return (
        <div className={`lg:col-span-3 border rounded-lg p-3 ${panelBgColor} shadow-sm space-y-3 flex flex-col h-full`}>
            {/* チーム選択ボタン */}
            <button
                onClick={() => onSelectTeam(team)}
                disabled={gameState.phase !== 'waiting' || myTeam === team}
                className={finalButtonStyle} // ★ 結合したスタイルを適用
            >
                {teamDisplayName}に参加 {myTeam === team ? '(選択中)' : ''}
            </button>
            {/* メンバーリスト */}
            <div>
                {/* ★ ヘッダー色、テキスト色を適用 */}
                <h4 className={`font-semibold ${panelHeaderColor} mb-1`}>メンバー ({teamUsers.length})</h4>
                <div className="max-h-40 overflow-y-auto pr-1">
                    <ul className="space-y-0.5 text-sm">
                        {teamUsers.map(user => {
                            // ★★★★★ 追加: ホストかどうかの判定 ★★★★★
                            const isHost = user.id === gameState.hostId;
                            return (
                                <li key={user.id} className={`flex items-center ${user.name === userName ? 'font-bold' : ''} ${panelTextColor}`}>
                                    <span className={`inline-block w-2 h-2 ${userDotColor} rounded-full mr-1.5`}></span>
                                    {user.name}
                                    {isHost && <span className="text-xs text-gray-500 ml-1">(ホスト)</span>}
                                </li>
                            );
                        })}
                        {teamUsers.length === 0 && <li className="text-gray-500 italic text-xs">プレイヤーがいません</li>}
                    </ul>
                </div>
            </div>
            {/* PICK 表示 */}
            <div className="pt-2">
                {/* ★ テキスト色を適用 */}
                <h4 className={`text-md font-medium mb-1 ${panelTextColor}`}>PICK ({pickCount}/{MAX_PICKS_PER_TEAM})</h4>
                <div className="flex flex-wrap gap-1 min-h-[60px] items-center">
                    {pickedWeapons.length > 0 ? pickedWeapons.map((weapon) => (
                        // ★ アイテムボーダー色を適用
                        <div key={`team-${team}-pick-${weapon.id}`} className={`relative border ${itemBorderColor} rounded p-1 bg-white`} title={`PICK: ${weapon.name}`}>
                            <Image src={weapon.imageUrl} alt={weapon.name} width={50} height={50} />
                        </div>
                    )) : <p className="text-xs text-gray-500 w-full text-center">{gameState.phase === 'waiting' ? '待機中' : '-'}</p>}
                </div>
            </div>
            {/* BAN 表示 */}
            <div className="pt-2">
                {/* ★ テキスト色を適用 */}
                <h4 className={`text-md font-medium mb-1 ${panelTextColor}`}>BAN ({banCount}/{MAX_BANS_PER_TEAM})</h4>
                <div className="flex flex-wrap gap-1 min-h-[60px] items-center">
                    {bannedWeapons.map((weapon) => {
                        if (!shouldShowBan(weapon)) return null;
                        return (
                            <div key={`team-${team}-ban-${weapon.id}`} className="relative border border-gray-400 rounded p-1 bg-gray-200" title={`BAN: ${weapon.name}`}>
                                <Image src={weapon.imageUrl} alt={weapon.name} width={50} height={50} className="opacity-70" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    {/* ★ SVG 色を適用 */}
                                    <svg className={`w-6 h-6 ${banSvgColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                </div>
                            </div>
                        );
                    })}
                    {!hasVisibleBans && <p className="text-xs text-gray-500 w-full text-center">{gameState.phase === 'waiting' ? '待機中' : '-'}</p>}
                    {opponentHasBansInBanPhase && <p className="text-xs text-gray-400 italic w-full text-center mt-1">（相手のBANはPickフェーズで公開）</p>}
                </div>
            </div>
        </div>
    );
};

export default TeamPanel;