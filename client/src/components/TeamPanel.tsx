import React, {memo} from 'react';
import Image from 'next/image';
import type { GameState, Team, RoomUser, MasterWeapon, RoomWeaponState, BanPhaseState } from '../../../common/types/game';
// import type { DisplayWeapon } from './WeaponGrid';
import { MAX_PICKS_PER_TEAM, MAX_BANS_PER_TEAM, RANDOM_WEAPON_ID } from '../../../common/types/constants';

interface TeamPanelProps {
    team: Team;
    teamDisplayName: string;
    phase: GameState['phase']; // phase を受け取る
    hostId: string | null; // hostId を受け取る
    teamUsers: RoomUser[];
    pickedWeaponIds: number[]; // ID リストを受け取る
    bannedWeaponIds: number[]; // ID リストを受け取る
    masterWeaponsMap: Map<number, MasterWeapon>; // Map を受け取る
    weaponStates: Record<number, RoomWeaponState>; // 状態を受け取る
    pickCount: number; // Pickカウントを受け取る
    banCount: number;  // Banカウントを受け取る
    banPhaseState: BanPhaseState | undefined;
    myTeam: Team | 'observer';
    userName: string;
    onSelectTeam: (team: Team) => void;
}

const TeamPanel: React.FC<TeamPanelProps> = memo(({ // ★ memo でラップ (任意)
    team,
    teamDisplayName,
    phase, // ★ 受け取る
    hostId, // ★ 受け取る
    teamUsers,
    pickedWeaponIds, // ★ 受け取る
    bannedWeaponIds, // ★ 受け取る
    masterWeaponsMap, // ★ 受け取る
    weaponStates, // ★ 受け取る
    pickCount, // ★ 受け取る
    banCount,  // ★ 受け取る
    banPhaseState,
    myTeam,
    userName,
    onSelectTeam,
    // className = '', // className を受け取る (任意)
}) => {
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
    const buttonBaseStyle = `w-full px-3 py-1.5 rounded-md text-sm transition-colors font-semibold border`;
    const buttonDisabledStyle = phase !== 'waiting' ? 'opacity-60 cursor-not-allowed' : '';
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
    const shouldShowBan = (weaponState: RoomWeaponState | undefined): boolean => {
        if (!weaponState || weaponState.id === RANDOM_WEAPON_ID) return false;
        const isSelfOrObserver = myTeam === team || myTeam === 'observer';
        // ★ gameState.phase を phase で置き換え
        return phase === 'pick' || phase === 'pick_complete' || (phase === 'ban' && isSelfOrObserver);
    }
    // ★ bannedWeaponIds と weaponStates を使って計算
    const hasVisibleBans = bannedWeaponIds.some(id => shouldShowBan(weaponStates[id]));
    const opponentTeam = team === 'alpha' ? 'bravo' : 'alpha';
    // ★ banCount を直接使うか、gameState が必要なら props で渡す
    // const opponentHasBansInBanPhase = phase === 'ban' && myTeam === opponentTeam && (banCount > 0); // banCount を使う場合
    // gameState が必要なら props で banPhaseState を受け取る
    const opponentHasBansInBanPhase = phase === 'ban' && myTeam === opponentTeam && (banPhaseState?.bans[team] ?? 0) > 0;

    const getSubSpIconPath = (type: 'sub' | 'special', imageName: string): string | null => {
        if (!imageName || imageName.trim() === "") return null;
        const folder = type === 'sub' ? 'subweapon' : 'specialweapon';
        return `/images/${folder}/${encodeURIComponent(imageName)}.webp`;
    };

    return (
        <div className={`lg:col-span-2 border rounded-lg p-3 ${panelBgColor} shadow-sm space-y-3 flex flex-col h-full`}>
            {/* チーム選択ボタン */}
            <button
                onClick={() => onSelectTeam(team)}
                disabled={phase !== 'waiting' || myTeam === team}
                className={finalButtonStyle}
            >
                {teamDisplayName}に参加 {myTeam === team ? '(選択中)' : ''}
            </button>
            {/* メンバーリスト */}
            <div>
                <h4 className={`font-semibold ${panelHeaderColor} mb-1`}>メンバー ({teamUsers.length})</h4>
                {/* スクロール可能なコンテナ */}
                <div className="max-h-40 overflow-y-auto pr-1 min-h-20"> {/* 例: 最大高さ設定 */}
                    <ul className="space-y-0.5 text-sm">
                        {teamUsers.map(user => {
                            const isHost = user.id === hostId;
                            return (
                                <li key={user.id} className={`flex items-center ${user.name === userName ? 'font-bold' : ''} ${panelTextColor}`}>
                                    <span className={`inline-block w-2 h-2 ${userDotColor} rounded-full mr-1.5`}></span>
                                    <span className="truncate">{user.name}</span>
                                    {isHost && <span className="text-xs text-gray-500 ml-1 flex-shrink-0">(ホスト)</span>}
                                </li>
                            );
                        })}
                        {teamUsers.length === 0 && <li className="text-gray-500 italic text-xs">プレイヤーがいません</li>}
                    </ul>
                </div>
            </div>
            {/* PICK 表示 (2列グリッド) */}
            <div className="pt-2">
                <h4 className={`text-md font-medium mb-1 ${panelTextColor}`}>PICK ({pickCount}/{MAX_PICKS_PER_TEAM})</h4>
                <div className="grid grid-cols-2 gap-1 items-center"> {/* 2列グリッド、最小高さ、中央揃え */}
                {pickedWeaponIds.map((weaponId) => {
                        const masterData = masterWeaponsMap.get(weaponId);
                        // const stateData = weaponStates[weaponId]; // 存在保証
                        if (!masterData) return null; // マスターデータなければ描画しない

                        const subIconPath = getSubSpIconPath('sub', masterData.subWeaponImageName);
                        const spIconPath = getSubSpIconPath('special', masterData.specialWeaponImageName);
                        return (
                            <div key={`team-${team}-pick-${weaponId}`} className={`relative border ${itemBorderColor} rounded p-0.5 bg-white flex justify-center items-center h-[74px]`}>
                                <Image src={`/images/weapons/${encodeURIComponent(masterData.name)}.webp`} alt={masterData.name} width={100} height={100} style={{
                                    width: 'auto', // ★ 親要素の幅に合わせる
                                    height: '100%',  // ★ 高さは自動調整
                                    objectFit: 'contain', // ★ 念のため contain を指定 (なくても効く場合あり)
                                }} />

                                {/* サブ・スペ アイコン */}
                                <div className="absolute top-0.5 left-0.5 flex items-center gap-0.5">
                                    {subIconPath && (
                                        <div className="relative w-3.5 h-3.5 bg-gray-100 rounded-sm overflow-hidden">
                                            <Image src={subIconPath} alt={masterData.subWeapon} layout="fill" objectFit="contain" title={`サブ: ${masterData.subWeapon}`} />
                                        </div>
                                    )}
                                    {spIconPath && (
                                        <div className="relative w-3.5 h-3.5 bg-gray-100 rounded-sm overflow-hidden">
                                            <Image src={spIconPath} alt={masterData.specialWeapon} layout="fill" objectFit="contain" title={`スペシャル: ${masterData.specialWeapon}`} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {/* 空欄表示 */}
                    {Array.from({ length: MAX_PICKS_PER_TEAM - pickedWeaponIds.length }).map((_, index) => (
                        <div key={`pick-placeholder-${index}`} className="border border-dashed border-gray-300 rounded bg-gray-100/50 h-[74px] flex-shrink-0"></div>
                    ))}
                    {/* Pickが0件の場合のテキスト表示 */}
                    {pickedWeaponIds.length === 0 && (
                        <p className="text-xs text-gray-500 col-span-2 text-center">{phase === 'waiting' ? '待機中' : '-'}</p>
                    )}
                </div>
            </div>
            {/* BAN 表示 (Flexbox wrap) */}
            <div className="pt-2">
                <h4 className={`text-md font-medium mb-1 ${panelTextColor}`}>BAN ({banCount}/{MAX_BANS_PER_TEAM})</h4>
                <div className="grid grid-cols-3 gap-1 items-center">
                    {/* ★ bannedWeaponIds を map */}
                    {bannedWeaponIds.map((weaponId) => {
                         const stateData = weaponStates[weaponId]; // 存在保証
                         if (!shouldShowBan(stateData)) return null; // 表示条件
                         const masterData = masterWeaponsMap.get(weaponId);
                         if (!masterData) return null;
                         const mainImageUrl = `/images/weapons/${encodeURIComponent(masterData.name)}.webp`;
                         const subIconPath = getSubSpIconPath('sub', masterData.subWeaponImageName);
                         const spIconPath = getSubSpIconPath('special', masterData.specialWeaponImageName);
                         console.log(`[TeamPanel BAN ${team}] ID:${weaponId}, Main:${mainImageUrl}, Sub:${subIconPath}, Sp:${spIconPath}`);
                        return (
                            <div key={`team-${team}-ban-${masterData.id}`} className="relative border border-gray-400 rounded p-0.5 bg-gray-200 flex justify-center items-center h-[64px]"> {/* ★ 中央揃え */}
                                <Image src={mainImageUrl} alt={masterData.name} width={58} height={58} className="opacity-70 style={{ objectFit: 'contain' }}" />
                                {/* BANマーク */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <svg className={`w-6 h-6 ${banSvgColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                </div>
                                {/* サブ・スペ アイコン */}
                                <div className="absolute top-0.5 left-0.5 flex items-center gap-0.5 opacity-70">
                                    {subIconPath && (
                                        <div className="relative w-3.5 h-3.5 bg-gray-500/60 rounded-sm">
                                            <Image src={subIconPath} alt={masterData.subWeapon} layout="fill" objectFit="contain" title={`サブ: ${masterData.subWeapon}`} />
                                        </div>
                                    )}
                                    {spIconPath && (
                                        <div className="relative w-3.5 h-3.5 bg-gray-500/60 rounded-sm">
                                            <Image src={spIconPath} alt={masterData.specialWeapon} layout="fill" objectFit="contain" title={`スペシャル: ${masterData.specialWeapon}`} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {(() => {
                        const visibleBanCount = bannedWeaponIds.filter(id => shouldShowBan(weaponStates[id])).length;
                        return Array.from({ length: MAX_BANS_PER_TEAM - visibleBanCount }).map((_, index) => (
                            <div key={`ban-placeholder-${index}`} className="border border-dashed border-gray-300 rounded bg-gray-100/50 h-[64px] flex-shrink-0"></div>
                        ));
                    })()}
                    {/* BANが0件の場合のテキスト表示 (任意) */}
                    {!hasVisibleBans && (
                        <p className="text-xs text-gray-500 col-span-3 text-center">{phase === 'waiting' ? '待機中' : '-'}</p>
                    )}
                    {/* 相手のBANが非表示の場合 */}
                    {opponentHasBansInBanPhase && <p className="text-xs text-gray-400 italic col-span-3 text-center mt-1">（相手のBANはPickフェーズで公開）</p>}
                </div>
            </div>
        </div>
    );
});
TeamPanel.displayName = 'TeamPanel'; // displayName 設定
export default TeamPanel;