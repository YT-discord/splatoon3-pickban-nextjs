import React, { memo } from 'react';
import Image from 'next/image';
import type { GameState, Team, RoomUser, MasterWeapon, RoomWeaponState, BanPhaseState } from '../../../common/types/index';
// import type { DisplayWeapon } from './WeaponGrid';
import { MAX_PICKS_PER_TEAM, MAX_BANS_PER_TEAM, RANDOM_WEAPON_ID } from '../../../common/types/index';

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
    isMobileView?: boolean;
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
    // banPhaseState,
    myTeam,
    userName,
    onSelectTeam,
    isMobileView = false,
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
    const buttonBaseStyle = `w-full px-3 py-1 rounded-md text-sm transition-colors font-semibold border`;
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
    // const hasVisibleBans = bannedWeaponIds.some(id => shouldShowBan(weaponStates[id]));
    // const opponentTeam = team === 'alpha' ? 'bravo' : 'alpha';
    // const opponentHasBansInBanPhase = phase === 'ban' && myTeam === opponentTeam && (banPhaseState?.bans[team] ?? 0) > 0;

    const getSubSpIconPath = (type: 'sub' | 'special', imageName: string): string | null => {
        if (!imageName || imageName.trim() === "") return null;
        const folder = type === 'sub' ? 'subweapon' : 'specialweapon';
        return `/images/${folder}/${encodeURIComponent(imageName)}.webp`;
    };

    return (
        <div className={`lg:col-span-2 border rounded-lg p-1 ${panelBgColor} shadow-sm flex flex-col h-full`}>
            {/* チーム選択ボタン */}
            <div className="flex-grow-[1] flex flex-col justify-center">
                <button
                    onClick={() => onSelectTeam(team)}
                    disabled={phase !== 'waiting' || myTeam === team}
                    className={finalButtonStyle}
                >
                    {teamDisplayName}に参加
                </button>
            </div>

            {/* メンバーリスト */}
            {!isMobileView && ( // ★ isMobileView が false の場合のみ表示 (PC表示時)
                <div className="flex-grow-[2] flex flex-col pt-2">
                    <h4 className={`font-semibold ${panelHeaderColor} mb-1`}>メンバー ({teamUsers.length})</h4>
                    <div className="flex-grow overflow-y-auto pr-1 min-h-14">
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                            {teamUsers.map(user => {
                                const isHost = user.id === hostId;
                                return (
                                    <div key={user.id} className={`flex items-center py-0.5 ${user.name === userName ? 'font-bold' : ''} ${panelTextColor} truncate`}>
                                        <span className={`inline-block w-2 h-2 ${userDotColor} rounded-full mr-1.5 flex-shrink-0`}></span>
                                        <span className="truncate">{user.name}</span>
                                        {isHost && <span className="text-xs text-gray-500 ml-1 flex-shrink-0">(ホスト)</span>}
                                    </div>
                                );
                            })}
                            {teamUsers.length === 0 && (
                                <p className="col-span-2 text-gray-500 italic text-xs py-1">プレイヤーがいません</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* PICK and BAN wrapper */}
            {/* スマホでは横並び (PICK 2/3, BAN 1/3)、PCでは縦積み (PICK flex-grow-4, BAN flex-grow-3) */}
            {/* このコンテナが残りの高さを占める */}
            <div className={`flex-grow flex flex-col ${isMobileView ? 'gap-1 pt-1 min-h-0' : ''}`}> {/* スマホでは縦積み、gap調整 */}
                {/* PICK 表示 */}
                <div className={`flex flex-col ${isMobileView ? 'flex-grow-[2]' : 'flex-grow-[4] pt-2'}`}> {/* スマホでの高さ配分調整 */}
                    <h4 className={`text-md font-medium ${panelTextColor} flex-shrink-0`}>PICK ({pickCount}/{MAX_PICKS_PER_TEAM})</h4>
                    <div className="flex-grow overflow-y-auto min-h-0"> {/* min-h-0 で overflow を防ぐ */}
                        {/* スマホでは4列、PCでは2列グリッド */}
                        <div className={`grid gap-1 ${isMobileView ? 'grid-cols-4' : 'grid-cols-2'}`}>
                            {pickedWeaponIds.map((weaponId) => {
                                const masterData = masterWeaponsMap.get(weaponId);
                                if (!masterData) return null;

                                const subIconPath = getSubSpIconPath('sub', masterData.subWeaponImageName);
                                const spIconPath = getSubSpIconPath('special', masterData.specialWeaponImageName);
                                return (
                                    <div key={`team-${team}-pick-${weaponId}`} className={`relative border ${itemBorderColor} rounded p-0.5 bg-white flex justify-center items-center aspect-square`}>
                                        <div className="relative w-full h-full">
                                            <Image
                                                src={`/images/weapons/${encodeURIComponent(masterData.name)}.webp`}
                                                alt={masterData.name}
                                                fill
                                                sizes={isMobileView ? "25vw" : "120px"} // スマホでのサイズヒント調整 (4列想定)
                                                style={{ objectFit: 'contain' }}
                                            />
                                        </div>

                                        {/* サブ・スペ アイコン */}
                                        {!isMobileView && ( // スマホでは表示しない
                                            <div className="absolute top-0.5 left-0.5 flex items-center gap-0.5">
                                                {subIconPath && (
                                                    <div className={`relative w-6 h-6 bg-gray-100 rounded-sm overflow-hidden`}>
                                                        <Image
                                                            src={subIconPath}
                                                            alt={masterData.subWeapon}
                                                            fill
                                                            sizes={"24px"}
                                                            style={{ objectFit: 'contain' }}
                                                            title={`サブ: ${masterData.subWeapon}`} />
                                                    </div>
                                                )}
                                                {spIconPath && (
                                                    <div className={`relative w-6 h-6 bg-gray-100 rounded-sm overflow-hidden`}>
                                                        <Image
                                                            src={spIconPath}
                                                            alt={masterData.specialWeapon}
                                                            fill
                                                            sizes={"24px"}
                                                            style={{ objectFit: 'contain' }}
                                                            title={`スペシャル: ${masterData.specialWeapon}`} />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>);
                            })}
                            {/* 空欄表示 */}
                            {Array.from({ length: MAX_PICKS_PER_TEAM - pickedWeaponIds.length }).map((_, index) => (
                                <div key={`pick-placeholder-${index}`} className="border border-dashed border-gray-300 rounded bg-gray-100/50 aspect-square flex-shrink-0"></div>
                            ))}
                        </div>
                    </div>
                </div> {/* PICK 表示終了 */}
                {/* BAN 表示 */}
                <div className={`flex flex-col ${isMobileView ? 'flex-grow-[1]' : 'flex-grow-[3] pt-2'}`}> {/* スマホでの高さ配分調整 */}
                    <h4 className={`text-md font-medium ${panelTextColor} flex-shrink-0`}>BAN ({banCount}/{MAX_BANS_PER_TEAM})</h4>
                    <div className="flex-grow overflow-y-auto min-h-0"> {/* min-h-0 で overflow を防ぐ */}
                        {/* スマホでは5列、PCでは3列グリッド */}
                        <div className={`grid gap-1 ${isMobileView ? 'grid-cols-5' : 'grid-cols-3'}`}>
                            {bannedWeaponIds.map((weaponId) => {
                                const stateData = weaponStates[weaponId];
                                if (!shouldShowBan(stateData)) return null;
                                const masterData = masterWeaponsMap.get(weaponId);
                                if (!masterData) return null;
                                const mainImageUrl = `/images/weapons/${encodeURIComponent(masterData.name)}.webp`;
                                const subIconPath = getSubSpIconPath('sub', masterData.subWeaponImageName);
                                const spIconPath = getSubSpIconPath('special', masterData.specialWeaponImageName);
                                return (
                                    <div key={`team-${team}-ban-${masterData.id}`} className="relative border border-gray-400 rounded p-0.5 bg-gray-200 flex justify-center items-center aspect-square">
                                        <div className="relative w-full h-full opacity-70">
                                            <Image
                                                src={mainImageUrl}
                                                alt={masterData.name}
                                                fill
                                                sizes={isMobileView ? "20vw" : "80px"} // スマホでのサイズヒント調整 (5列想定)
                                                style={{ objectFit: 'contain' }}
                                            />
                                        </div>
                                        {/* BANマーク */}
                                        {!isMobileView && ( // スマホでは表示しない
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <svg className={`w-6 h-6 ${banSvgColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                            </div>
                                        )}
                                        {/* サブ・スペ アイコン */}
                                        {!isMobileView && ( // スマホでは表示しない
                                            <div className="absolute top-0.5 left-0.5 flex items-center gap-0.5 opacity-70">
                                                {subIconPath && (
                                                    <div className={`relative w-4 h-4 bg-gray-500/60 rounded-sm`}>
                                                        <Image
                                                            src={subIconPath}
                                                            alt={masterData.subWeapon}
                                                            fill
                                                            sizes={"16px"}
                                                            style={{ objectFit: 'contain' }}
                                                            title={`サブ: ${masterData.subWeapon}`} />
                                                    </div>
                                                )}
                                                {spIconPath && (
                                                    <div className={`relative w-4 h-4 bg-gray-500/60 rounded-sm`}>
                                                        <Image
                                                            src={spIconPath}
                                                            alt={masterData.specialWeapon} fill
                                                            sizes={"16px"}
                                                            style={{ objectFit: 'contain' }}
                                                            title={`スペシャル: ${masterData.specialWeapon}`} />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {(() => {
                                const visibleBanCount = bannedWeaponIds.filter(id => shouldShowBan(weaponStates[id])).length;
                                // MAX_BANS_PER_TEAM の数だけ枠が表示されるようにプレースホルダーを計算
                                const placeholdersToRender = Math.max(0, MAX_BANS_PER_TEAM - visibleBanCount);
                                return Array.from({ length: placeholdersToRender }).map((_, index) => (
                                    <div key={`ban-placeholder-${index}`} className="border border-dashed border-gray-300 rounded bg-gray-100/50 aspect-square flex-shrink-0"></div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

TeamPanel.displayName = 'TeamPanel'; // displayName 設定
export default TeamPanel;