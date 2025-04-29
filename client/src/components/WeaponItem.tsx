// src/components/WeaponItem.tsx
import React, { memo } from 'react';
import Image from 'next/image';
// ★ 必要な型や定数をインポート (common や WeaponGrid から)
import type { Team, GameState } from '../../../common/types/game'; // GameState もインポート
import type { DisplayWeapon } from './WeaponGrid'; // WeaponGrid から型をインポート
import { MAX_BANS_PER_TEAM, RANDOM_CHOICE_ID, /*MAX_PICKS_PER_TEAM*/ } from '../../../common/types/constants';

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
    // まずプリミティブ値や単純な比較で済むものをチェック
    if (
        prevProps.phase !== nextProps.phase ||
        prevProps.currentTurn !== nextProps.currentTurn ||
        prevProps.myTeam !== nextProps.myTeam ||
        // isHost や pickCount も使うなら比較
        prevProps.banCount !== nextProps.banCount ||
        // ★ weapon オブジェクトの重要なプロパティを比較 ★
        prevProps.weapon.id !== nextProps.weapon.id || // ID (念のため)
        prevProps.weapon.selectedBy !== nextProps.weapon.selectedBy || // 選択状態
        prevProps.weapon.isLoading !== nextProps.weapon.isLoading || // ローディング状態
        // ★ bannedBy は配列なので参照ではなく内容を比較する必要がある (簡易比較) ★
        // (要素数が同じで、各要素が同じか。より厳密には順序も考慮)
        prevProps.weapon.bannedBy.length !== nextProps.weapon.bannedBy.length ||
        !prevProps.weapon.bannedBy.every((team, i) => team === nextProps.weapon.bannedBy[i]) ||
        // ★ onWeaponClick は useCallback でメモ化されている前提であれば参照比較でOK
        prevProps.onWeaponClick !== nextProps.onWeaponClick
    ) {
        // console.log(`[arePropsEqual] false for ${nextProps.weapon.name} - Simple props changed`);
        return false; // いずれかが異なれば再レンダリング (false を返す)
    }
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
    // console.log(`[WeaponItem] Rendering: ${weapon.name}`); // 再レンダリング確認用ログ

    // --- renderWeaponItem のロジックをここに移植 ---
    const isSelectedByAlpha = weapon.selectedBy === 'alpha';
    const isSelectedByBravo = weapon.selectedBy === 'bravo';
    const isBannedByAlpha = weapon.bannedBy.includes('alpha');
    const isBannedByBravo = weapon.bannedBy.includes('bravo');
    const isBanned = isBannedByAlpha || isBannedByBravo;
    const isMyTeamPlayer = myTeam === 'alpha' || myTeam === 'bravo';
    const isRandomChoice = weapon.id === RANDOM_CHOICE_ID;

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
        bgColor = 'bg-purple-50';
        borderColor = 'border-purple-300';
        if (!isDisabled) hoverEffect = 'hover:bg-purple-100 hover:border-purple-400';
    }

    // 選択済みスタイル
    if (isSelectedByAlpha) { bgColor = 'bg-blue-100'; borderColor = 'border-blue-400'; ring = 'ring-2 ring-offset-1 ring-blue-500'; hoverEffect = ''; cursor = 'cursor-not-allowed'; }
    else if (isSelectedByBravo) { bgColor = 'bg-red-100'; borderColor = 'border-red-400'; ring = 'ring-2 ring-offset-1 ring-red-500'; hoverEffect = ''; cursor = 'cursor-not-allowed'; }
    // BANフェーズ中の自チームBANスタイル
    else if (phase === 'ban' && isMyTeamPlayer && weapon.bannedBy.includes(myTeam)) {
        bgColor = 'bg-yellow-100'; borderColor = 'border-yellow-400'; imageOpacity = 'opacity-50'; overallOpacity = 'opacity-90'; hoverEffect = ''; cursor = 'cursor-not-allowed';
        const banColor = myTeam === 'alpha' ? 'text-blue-600' : 'text-red-600';
        banMark = (<div className={`absolute inset-0 flex items-center justify-center rounded-lg pointer-events-none`}><svg className={`w-10 h-10 ${banColor} opacity-75`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg></div>);
    }
    // PICKフェーズ以降 or 観戦者のBAN済みスタイル (公開BAN)
    else if (isBanned && (phase === 'pick' || phase === 'pick_complete' || myTeam === 'observer')) {
        bgColor = 'bg-gray-200'; borderColor = 'border-gray-300'; imageOpacity = 'opacity-40'; overallOpacity = 'opacity-70'; hoverEffect = ''; cursor = 'cursor-not-allowed';
        const banColorConst = isBannedByAlpha ? 'text-blue-600' : isBannedByBravo ? 'text-red-600' : 'text-gray-700';
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

    return (
        <div
            // key は map 側で設定
            className={`relative p-1 rounded-lg border transition-all duration-150 ${bgColor} ${borderColor} ${overallOpacity} ${ring} ${cursor} ${hoverEffect}`}
            onClick={() => !isDisabled && onWeaponClick(weapon.id)}
            title={`${weapon.name}\nサブ: ${weapon.subWeapon}\nスペシャル: ${weapon.specialWeapon}${isDisabled ? ' (操作不可)' : ''}`}
        >
            {/* メイン武器アイコン */}
            <Image
                src={weapon.imageUrl}
                alt={weapon.name}
                width={96} height={96}
                className={`mx-auto transition-opacity duration-150 ${imageOpacity}`}
                priority={weapon.id <= 12} // 画像の優先度読み込み設定 (任意)
            />

            {/* サブ・スペシャルアイコン表示エリア (アイコン上部) */}
            {!isRandomChoice && (
                <div className="absolute top-1 left-1 flex items-center gap-1">
                    {/* サブウェポン */}
                    <div className="relative w-6 h-6 bg-gray-200/80 rounded">
                        <Image
                            src={subWeaponImageUrl}
                            alt={weapon.subWeapon}
                            fill
                            sizes="(max-width: 768px) 10vw, (max-width: 1200px) 5vw, 3vw"
                            style={{ objectFit: 'contain' }}
                            title={`サブ: ${weapon.subWeapon}`}
                        />
                    </div>
                    {/* スペシャルウェポン */}
                    <div className="relative w-6 h-6 bg-gray-200/80 rounded">
                        <Image
                            src={specialWeaponImageUrl}
                            alt={weapon.specialWeapon}
                            fill
                            sizes="(max-width: 768px) 10vw, (max-width: 1200px) 5vw, 3vw"
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

            {isRandomChoice && (
                <span className="block text-center text-xs font-medium text-purple-800 mt-1">
                    ランダム
                </span>
            )}
            {/* ターン表示 */}
            {/* {!isRandomChoice && isMyTeamPlayer && !isDisabled && phase === 'pick' && (<div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs bg-green-200 text-green-800 rounded font-semibold animate-pulse">Pick!</div> )} */}
            {/* {!isRandomChoice && isMyTeamPlayer && !isDisabled && phase === 'ban' && (<div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded font-semibold animate-pulse">Ban!</div> )} */}
        </div>
    );
});

WeaponItemComponent.displayName = 'WeaponItem';

// ★★★★★ 変更点: React.memo の第二引数に比較関数を渡す ★★★★★
const MemoizedWeaponItem = memo(WeaponItemComponent, arePropsEqual);

export default MemoizedWeaponItem;