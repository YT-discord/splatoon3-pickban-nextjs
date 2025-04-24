// src/components/WeaponGridDisplay.tsx
import React from 'react';
import Image from 'next/image';
import type { GameState, Team } from '../../../common/types/game';
import type { DisplayWeapon } from './WeaponGrid';
import { MAX_BANS_PER_TEAM, MAX_PICKS_PER_TEAM } from '../../../common/types/constants';
import { RANDOM_CHOICE_ID } from '../components/WeaponGrid'

interface WeaponGridDisplayProps {
    gameState: GameState; // フェーズやターン判定に必要
    displayWeapons: DisplayWeapon[]; // 表示する武器の配列
    myTeam: Team | 'observer'; // 自分のチーム（クリック可否判定に使用）
    onWeaponClick: (weaponId: number) => void; // 武器クリック時のコールバック
}

const renderWeaponItem = (
    weapon: DisplayWeapon,
    gameState: GameState,
    myTeam: Team | 'observer',
    onWeaponClick: (weaponId: number) => void
) => {
    const isSelectedByAlpha = weapon.selectedBy === 'alpha';
    const isSelectedByBravo = weapon.selectedBy === 'bravo';
    const isBannedByAlpha = weapon.bannedBy.includes('alpha');
    const isBannedByBravo = weapon.bannedBy.includes('bravo');
    const isBanned = isBannedByAlpha || isBannedByBravo;
    const isMyTeamPlayer = myTeam === 'alpha' || myTeam === 'bravo';
    const isRandomChoice = weapon.id === RANDOM_CHOICE_ID;

    // --- クリック可否判定 ---
    let canClick = false;
    const isMyTurn = gameState.currentTurn === myTeam;

    if (isRandomChoice) {
        if (gameState.phase === 'pick' && isMyTurn && isMyTeamPlayer) {
            canClick = true;
        }
    } else if (gameState.phase === 'pick' && isMyTeamPlayer && isMyTurn && !weapon.selectedBy && !isBanned) {
        canClick = true;
    } else if (gameState.phase === 'ban' && isMyTeamPlayer) {
        if (myTeam === 'alpha' || myTeam === 'bravo') {
            const currentBans = gameState.banPhaseState?.bans[myTeam] ?? 0;
            const maxBans = gameState.banPhaseState?.maxBansPerTeam ?? MAX_BANS_PER_TEAM;
            if (!weapon.selectedBy && !weapon.bannedBy.includes(myTeam) && currentBans < maxBans) {
                canClick = true;
            }
        }
    }
    // isLoading は DisplayWeapon に必須で含まれる想定
    const isDisabled = weapon.isLoading || !canClick;

    // --- スタイル決定 ---
    let bgColor = 'bg-white', borderColor = 'border-gray-200', imageOpacity = 'opacity-100', overallOpacity = 'opacity-100', ring = '', hoverEffect = 'hover:bg-blue-50 hover:border-blue-300', banMark = null, cursor = 'cursor-pointer';

    if (isRandomChoice) {
        bgColor = 'bg-purple-50';
        borderColor = 'border-purple-300';
        if (!isDisabled) hoverEffect = 'hover:bg-purple-100 hover:border-purple-400';
    }

    if (isSelectedByAlpha) { bgColor = 'bg-blue-100'; borderColor = 'border-blue-400'; ring = 'ring-2 ring-offset-1 ring-blue-500'; hoverEffect = ''; cursor = 'cursor-not-allowed'; }
    else if (isSelectedByBravo) { bgColor = 'bg-red-100'; borderColor = 'border-red-400'; ring = 'ring-2 ring-offset-1 ring-red-500'; hoverEffect = ''; cursor = 'cursor-not-allowed'; }
    else if (gameState.phase === 'ban' && isMyTeamPlayer && weapon.bannedBy.includes(myTeam)) {
        bgColor = 'bg-yellow-100'; borderColor = 'border-yellow-400'; imageOpacity = 'opacity-50'; overallOpacity = 'opacity-90'; hoverEffect = ''; cursor = 'cursor-not-allowed';
        const banColor = myTeam === 'alpha' ? 'text-blue-600' : 'text-red-600';
        banMark = (<div className={`absolute inset-0 flex items-center justify-center rounded-lg pointer-events-none`}><svg className={`w-10 h-10 ${banColor} opacity-75`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg></div>);
    } else if (isBanned && (gameState.phase === 'pick' || gameState.phase === 'pick_complete' || myTeam === 'observer')) {
        bgColor = 'bg-gray-200'; borderColor = 'border-gray-300'; imageOpacity = 'opacity-40'; overallOpacity = 'opacity-70'; hoverEffect = ''; cursor = 'cursor-not-allowed';
        const banColorConst = isBannedByAlpha ? 'text-blue-600' : isBannedByBravo ? 'text-red-600' : 'text-gray-700';
        banMark = (<div className={`absolute inset-0 flex items-center justify-center rounded-lg pointer-events-none`}><svg className={`w-10 h-10 ${banColorConst} opacity-75`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg></div>);
    } else if (isDisabled) {
        cursor = 'cursor-not-allowed'; hoverEffect = '';
        if (weapon.isLoading) {
            overallOpacity = 'opacity-50';
        } else if (myTeam === 'observer' || gameState.phase === 'waiting' || gameState.phase === 'pick_complete') {
            if (!isRandomChoice) { bgColor = 'bg-gray-50'; overallOpacity = 'opacity-70'; }
        } else { overallOpacity = 'opacity-75'; }
    }

    return (
        <div
            key={`weapon-grid-${weapon.id}`}
            className={`relative p-2 rounded-lg border transition-all duration-150 ${bgColor} ${borderColor} ${overallOpacity} ${ring} ${cursor} ${hoverEffect}`}
            onClick={() => !isDisabled && onWeaponClick(weapon.id)} // Props の関数を呼び出し
            title={weapon.name + (isDisabled ? ' (操作不可)' : '')}
        >
            <div className="absolute top-0 left-0 px-1 py-0.5 bg-black bg-opacity-60 text-white text-[8px] rounded-br-md leading-none truncate max-w-[80%]">
                {weapon.name}
            </div>
            <Image
                src={weapon.imageUrl}
                alt={weapon.name}
                width={100}
                height={100}
                className={`mx-auto transition-opacity duration-150 ${imageOpacity}`}
                priority={weapon.id <= 12}
            />
            {banMark}
            {weapon.isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-lg">
                    <svg className="animate-spin h-8 w-8 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            )}
            {isRandomChoice && (
                <span className="block text-center text-xs font-medium text-purple-800 mt-1">ランダム</span>
            )}
            {!isRandomChoice && isMyTeamPlayer && !isDisabled && gameState.phase === 'pick' && (<div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs bg-green-200 text-green-800 rounded font-semibold animate-pulse">Pick!</div>)}
            {!isRandomChoice && isMyTeamPlayer && !isDisabled && gameState.phase === 'ban' && (<div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded font-semibold animate-pulse">Ban!</div>)}
        </div>
    );
};


const WeaponGridDisplay: React.FC<WeaponGridDisplayProps> = ({
    gameState,
    displayWeapons,
    myTeam,
    onWeaponClick,
}) => {
    return (
        <>
            {(gameState.phase === 'ban' || gameState.phase === 'pick') && (
                <div className="overflow-x-auto border-t border-gray-200 mt-4 pt-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">
                        {gameState.phase === 'ban' ? 'BANする武器を選択してください' : 'PICKする武器を選んでください'}
                        {/* BAN/PICK カウント表示 */}
                        {myTeam !== 'observer' && (
                            ` (${gameState.phase === 'ban'
                                ? `${gameState.banPhaseState?.bans[myTeam] ?? 0}/${MAX_BANS_PER_TEAM}`
                                : `${gameState.pickPhaseState?.picks[myTeam] ?? 0}/${MAX_PICKS_PER_TEAM}`
                            })`
                        )}
                    </h3>
                    {displayWeapons.length > 0 ? (
                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                            {displayWeapons.map(weapon => renderWeaponItem(weapon, gameState, myTeam, onWeaponClick))}
                        </div>
                    ) : (<p className="text-center text-gray-500 py-4">表示対象の武器がありません。</p>)}
                </div>
            )}
            {gameState.phase === 'pick_complete' && (
                <div className="text-center py-10">
                    <h3 className="text-2xl font-bold text-green-600">PICK完了！</h3>
                </div>
            )}
            {gameState.phase === 'waiting' && (
                <div className="text-center py-10">
                    <h3 className="text-xl font-semibold text-gray-700">ゲーム開始待機中...</h3>
                    <p className="text-gray-500">チームを選択し、ホストの「ゲーム開始」をお待ちください。</p>
                </div>
            )}
        </>
    );
};

export default WeaponGridDisplay;