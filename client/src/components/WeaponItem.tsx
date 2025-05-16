// src/components/WeaponItem.tsx
import React, { memo } from 'react';
import Image from 'next/image';
// ★ 必要な型や定数をインポート (common や WeaponGrid から)
import type { Team, GameState } from '../../../common/types/index'; // GameState もインポート
import type { DisplayWeapon } from './WeaponGrid'; // WeaponGrid から型をインポート
import { MAX_BANS_PER_TEAM, RANDOM_WEAPON_ID } from '../../../common/types/index';

// ★ WeaponItem が受け取る Props
interface WeaponItemProps {
    weapon: DisplayWeapon;
    phase: GameState['phase']; // GameState から phase の型を取得
    currentTurn: GameState['currentTurn']; // GameState から currentTurn の型を取得
    myTeam: Team | 'observer';
    // isHost: boolean; // 現在使われていないのでコメントアウト or 削除
    banCount: number; // 自分のチームの現在のBAN数 (BAN可否判定用)
    // pickCount: number; // 現在使われていないのでコメントアウト or 削除
    onWeaponClick: (weaponId: number) => void;
}

const arePropsEqual = (prevProps: WeaponItemProps, nextProps: WeaponItemProps): boolean => {
    // console.log(`[WeaponItem arePropsEqual CALLED] For ${nextProps.weapon.name} (ID: ${nextProps.weapon.id})`);
    if (prevProps.phase !== nextProps.phase) {
        // console.log(`[WeaponItem arePropsEqual RETURNING FALSE] For ${nextProps.weapon.name}. Reason: phase changed. Prev: ${prevProps.phase}, Next: ${nextProps.phase}`);
        return false;
    }
    if (prevProps.myTeam !== nextProps.myTeam) {
        // console.log(`[WeaponItem arePropsEqual RETURNING FALSE] For ${nextProps.weapon.name}. Reason: myTeam changed. Prev: ${prevProps.myTeam}, Next: ${nextProps.myTeam}`);
        return false;
    }
    if (prevProps.banCount !== nextProps.banCount) {
        // console.log(`[WeaponItem arePropsEqual RETURNING FALSE] For ${nextProps.weapon.name}. Reason: banCount changed. Prev: ${prevProps.banCount}, Next: ${nextProps.banCount}`);
        return false;
    }
    if (prevProps.weapon.id !== nextProps.weapon.id) { // 通常これは起こらないはず
        // console.log(`[WeaponItem arePropsEqual RETURNING FALSE] For ${nextProps.weapon.name}. Reason: weapon.id changed. Prev: ${prevProps.weapon.id}, Next: ${nextProps.weapon.id}`);
        return false;
    }
    if (prevProps.weapon.selectedBy !== nextProps.weapon.selectedBy) {
        // console.log(`[WeaponItem arePropsEqual RETURNING FALSE] For ${nextProps.weapon.name}. Reason: weapon.selectedBy changed. Prev: ${prevProps.weapon.selectedBy}, Next: ${nextProps.weapon.selectedBy}`);
        return false;
    }
    if (prevProps.weapon.isLoading !== nextProps.weapon.isLoading) {
        // console.log(`[WeaponItem arePropsEqual RETURNING FALSE] For ${nextProps.weapon.name}. Reason: weapon.isLoading changed. Prev: ${prevProps.weapon.isLoading}, Next: ${nextProps.weapon.isLoading}`);
        return false;
    }
    if (prevProps.weapon.bannedBy.length !== nextProps.weapon.bannedBy.length ||
        !prevProps.weapon.bannedBy.every((team, i) => team === nextProps.weapon.bannedBy[i])) {
        // console.log(`[WeaponItem arePropsEqual RETURNING FALSE] For ${nextProps.weapon.name}. Reason: weapon.bannedBy changed. Prev: ${JSON.stringify(prevProps.weapon.bannedBy)}, Next: ${JSON.stringify(nextProps.weapon.bannedBy)}`);
        return false;
    }
    if (prevProps.onWeaponClick !== nextProps.onWeaponClick) {
        // console.log(`[WeaponItem arePropsEqual RETURNING FALSE] For ${nextProps.weapon.name}. Reason: onWeaponClick changed (ref).`);
        return false;
    }
    if (prevProps.currentTurn !== nextProps.currentTurn) {
        const isPlayerTeam = nextProps.myTeam === 'alpha' || nextProps.myTeam === 'bravo';
        // PICKフェーズでプレイヤーチームのアイテムの場合、currentTurnはクリック可否に影響するため再レンダリング
        if (nextProps.phase === 'pick' && isPlayerTeam) {
            // console.log(`[WeaponItem arePropsEqual RETURNING FALSE] For ${nextProps.weapon.name}. Reason: currentTurn changed (pick phase, player). Prev: ${prevProps.currentTurn}, Next: ${nextProps.currentTurn}`);
            return false;
        }
        // それ以外の場合 (BANフェーズなど) は、currentTurnの変更だけではWeaponItemの表示に影響しないとみなし、
        // この理由だけでの再レンダリングはスキップする。
        // (他のプロパティが変更されていれば、そちらの条件で再レンダリングされる)
        // console.log(`[WeaponItem arePropsEqual SKIPPING for currentTurn change] For ${nextProps.weapon.name}. Phase: ${nextProps.phase}, MyTeam: ${nextProps.myTeam}. Prev: ${prevProps.currentTurn}, Next: ${nextProps.currentTurn}`);
        return true; // ここでtrueを返すと、currentTurnの変更だけでは再レンダリングされなくなる
    }
    // console.log(`[WeaponItem arePropsEqual RETURNING TRUE (all checks passed)] Skipping re-render for ${nextProps.weapon.name} (ID: ${nextProps.weapon.id})`);
    return true;
}

const WeaponItemComponent: React.FC<WeaponItemProps> = memo(({
    weapon,
    phase,
    currentTurn,
    myTeam,
    // isHost,
    banCount,
    // pickCount,
    onWeaponClick,
}) => {
    // console.log(`[WeaponItem Rendering] ${weapon.name} (ID: ${weapon.id}), isLoading: ${weapon.isLoading}, selectedBy: ${weapon.selectedBy}, bannedBy: ${weapon.bannedBy.join(',')}`);

    // --- renderWeaponItem のロジックをここに移植 ---
    const isSelectedByAlpha = weapon.selectedBy === 'alpha';
    const isSelectedByBravo = weapon.selectedBy === 'bravo';
    const isBannedByAlpha = weapon.bannedBy.includes('alpha');
    const isBannedByBravo = weapon.bannedBy.includes('bravo');
    const isBanned = isBannedByAlpha || isBannedByBravo;
    const isMyTeamPlayer = myTeam === 'alpha' || myTeam === 'bravo';
    const isRandomChoice = weapon.id === RANDOM_WEAPON_ID;

    // クリック可否判定 (props を使用)
    let canClick = false;
    const isMyTurn = currentTurn === myTeam;

    if (isRandomChoice) {
        if (phase === 'pick' && isMyTurn && isMyTeamPlayer) { canClick = true; }
    } else if (phase === 'pick' && isMyTeamPlayer && isMyTurn && !weapon.selectedBy && !isBanned) {
        canClick = true;
    } else if (phase === 'ban' && isMyTeamPlayer) {
        // banCount を使用して判定
        if (banCount < MAX_BANS_PER_TEAM && !weapon.selectedBy && !weapon.bannedBy.includes(myTeam)) {
            canClick = true;
        }
    }
    // weapon.isLoading は DisplayWeapon 型に含まれる
    const isDisabled = weapon.isLoading || !canClick;

    // スタイル決定 (props を使用)
    let bgColor = 'bg-white', borderColor = 'border-gray-200', imageOpacity = 'opacity-100', overallOpacity = 'opacity-100', ring = '', hoverEffect = 'hover:bg-blue-50 hover:border-blue-300', banMark = null, cursor = 'cursor-pointer';

    // ランダム選択肢のスタイル
    if (isRandomChoice) {
        bgColor = 'bg-green-50';
        borderColor = 'border-green-300';
        if (!isDisabled) hoverEffect = 'hover:bg-green-100 hover:border-green-400';
    }

    // 選択済みスタイル
    if (isSelectedByAlpha) { bgColor = 'bg-blue-100'; borderColor = 'border-blue-400'; ring = 'ring-2 ring-offset-1 ring-blue-500'; hoverEffect = ''; cursor = 'cursor-not-allowed'; }
    else if (isSelectedByBravo) { bgColor = 'bg-red-100'; borderColor = 'border-red-400'; ring = 'ring-2 ring-offset-1 ring-red-500'; hoverEffect = ''; cursor = 'cursor-not-allowed'; }
    // BANフェーズ中の自チームBANスタイル
    else if (phase === 'ban' && isMyTeamPlayer && weapon.bannedBy.includes(myTeam)) {
        bgColor = 'bg-yellow-100'; borderColor = 'border-yellow-400'; imageOpacity = 'opacity-50'; overallOpacity = 'opacity-90'; hoverEffect = ''; cursor = 'cursor-not-allowed';
        const banColor = 'text-purple-600'; // 紫色に変更
        banMark = (<div className={`absolute inset-0 flex items-center justify-center rounded-lg pointer-events-none`}><svg className={`w-10 h-10 ${banColor} opacity-75`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg></div>);
    }
    // PICKフェーズ以降 or 観戦者のBAN済みスタイル (公開BAN)
    else if (isBanned && (phase === 'pick' || phase === 'pick_complete' || myTeam === 'observer')) {
        bgColor = 'bg-gray-200'; borderColor = 'border-gray-300'; imageOpacity = 'opacity-40'; overallOpacity = 'opacity-70'; hoverEffect = ''; cursor = 'cursor-not-allowed';
        const banColorConst = 'text-purple-600'; // 紫色に変更 (isBannedByAlpha や isBannedByBravo の条件に関わらず紫)
        banMark = (<div className={`absolute inset-0 flex items-center justify-center rounded-lg pointer-events-none`}><svg className={`w-10 h-10 ${banColorConst} opacity-75`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg></div>);
    }
    // その他のクリック不可状態
    else if (isDisabled) {
        cursor = 'cursor-not-allowed'; hoverEffect = '';
        if (weapon.isLoading) {
            overallOpacity = 'opacity-50';
        } else if (myTeam === 'observer' || phase === 'waiting' || phase === 'pick_complete') {
            if (!isRandomChoice) { bgColor = 'bg-gray-50'; overallOpacity = 'opacity-70'; }
        } else { overallOpacity = 'opacity-75'; } // 自分のターンではないなど
    }

    // サブ・スペ画像パス生成
    const subWeaponImageUrl = !isRandomChoice ? `/images/subweapon/${encodeURIComponent(weapon.subWeaponImageName)}.webp` : '';
    const specialWeaponImageUrl = !isRandomChoice ? `/images/specialweapon/${encodeURIComponent(weapon.specialWeaponImageName)}.webp` : '';
    // const mainImageUrl = weapon.id === RANDOM_WEAPON_ID
    //     ? RANDOM_WEAPON_CHOICE_ITEM.imageUrl
    //     : `/images/weapons/${encodeURIComponent(weapon.name)}.webp`;

    return (
        <div
            className={`relative p-1 rounded-lg border transition-all duration-150 ${bgColor} ${borderColor} ${overallOpacity} ${ring} ${cursor} ${hoverEffect} h-full w-full`}
            onClick={() => !isDisabled && onWeaponClick(weapon.id)}
            title={`${weapon.name}\nサブ: ${weapon.subWeapon}\nスペシャル: ${weapon.specialWeapon}${isDisabled ? ' (操作不可)' : ''}`}
        >
            {/* メイン武器アイコン */}
            {isRandomChoice ? (
                <Image
                    src={weapon.imageUrl}
                    alt={weapon.name}
                    // ★★★ ダミーの width と height を指定 ★★★
                    width={100}
                    height={100}
                    style={{
                        width: '100%', // ★ 親要素の幅に合わせる
                        height: 'auto',  // ★ 高さは自動調整
                        objectFit: 'contain', // ★ 念のため contain を指定 (なくても効く場合あり)
                    }}
                    className={`mx-auto transition-opacity duration-150 ${imageOpacity} rounded-sm overflow-hidden `}
                />
            ) : (
                <Image
                    src={weapon.imageUrl}
                    alt={weapon.name}
                    fill // ★ fill prop を使用
                    sizes="width:123px height:123px"
                    style={{ objectFit: 'contain' }} // ★ contain でアスペクト比維持
                    className={`mx-auto transition-opacity duration-150 ${imageOpacity}`}
                />
            )}
            {/* サブ・スペシャルアイコン表示エリア (アイコン上部) */}
            {!isRandomChoice && (
                <div className="absolute top-1 left-1 flex items-center gap-1 z-10">
                    {/* サブウェポン */}
                    <div className="relative w-6 h-6 bg-gray-100 rounded-sm overflow-hidden">
                        <Image
                            src={subWeaponImageUrl}
                            alt={weapon.subWeapon}
                            fill
                            sizes="width:24px height:24px"
                            style={{ objectFit: 'contain' }}
                            title={`サブ: ${weapon.subWeapon}`}
                        />
                    </div>
                    {/* スペシャルウェポン */}
                    <div className="relative w-6 h-6 bg-gray-100 rounded-sm overflow-hidden">
                        <Image
                            src={specialWeaponImageUrl}
                            alt={weapon.specialWeapon}
                            fill
                            sizes="width:24px height:24px"
                            style={{ objectFit: 'contain' }}
                            title={`スペシャル: ${weapon.specialWeapon}`}
                        />
                    </div>
                </div>
            )}

            {/* BANマーク */}
            {banMark}
            {/* ローディング表示 */}
            {weapon.isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-lg">
                    <svg className="animate-spin h-8 w-8 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            )}
        </div>
    );
});

WeaponItemComponent.displayName = 'WeaponItem';

// ★★★★★ 変更点: React.memo の第二引数に比較関数を渡す ★★★★★
const MemoizedWeaponItem = memo(WeaponItemComponent, arePropsEqual);

export default MemoizedWeaponItem;