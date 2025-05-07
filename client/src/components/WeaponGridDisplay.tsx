import React, { memo, useMemo } from 'react';
import { FixedSizeGrid, GridChildComponentProps } from 'react-window';
import type { GameState, Team, MasterWeapon, RoomWeaponState, BanPhaseState, PickPhaseState } from '../../../common/types/game';
import type { DisplayWeapon } from './WeaponGrid';
import { MAX_BANS_PER_TEAM, MAX_PICKS_PER_TEAM, RANDOM_WEAPON_ID, RANDOM_WEAPON_CHOICE_ITEM } from '../../../common/types/constants';
import WeaponItem from './WeaponItem';
import AutoSizer from 'react-virtualized-auto-sizer';

interface WeaponGridDisplayProps {
    phase: GameState['phase'];
    currentTurn: GameState['currentTurn'];
    banPhaseState: BanPhaseState | undefined;
    pickPhaseState: PickPhaseState | undefined;
    displayWeaponIds: number[];
    masterWeapons: MasterWeapon[];
    weaponStates: Record<number, RoomWeaponState>;
    loadingWeaponId: number | null;
    myTeam: Team | 'observer';
    amIHost: boolean;
    myBanCount: number;
    myPickCount: number;
    onWeaponClick: (weaponId: number) => void;
}

interface CellData {
    weaponIds: number[];
    masterWeaponsMap: Map<number, MasterWeapon>; // Map の方が効率的
    weaponStates: Record<number, RoomWeaponState>;
    loadingWeaponId: number | null;
    // columnCount: number;
    phase: GameState['phase'];
    currentTurn: GameState['currentTurn'];
    myTeam: Team | 'observer';
    myBanCount: number;
    onWeaponClick: (weaponId: number) => void;
    gridWidth: number;
    itemWidth: number;
}

interface CellProps extends GridChildComponentProps {
    data: CellData;
}

const Cell: React.FC<CellProps> = memo(({ columnIndex, rowIndex, style, data }) => {
    const {
        weaponIds, masterWeaponsMap, weaponStates, loadingWeaponId, /*columnCount,*/
        phase, currentTurn, myTeam, myBanCount, onWeaponClick,
        gridWidth, itemWidth
    } = data;

    const columnCount = Math.max(1, Math.floor(gridWidth / itemWidth));
    const index = rowIndex * columnCount + columnIndex;
    const weaponId = weaponIds[index];

    // 範囲外またはIDがなければ何も描画しない
    if (weaponId === undefined) {
        return <div style={style}></div>;
    }

    const masterData = masterWeaponsMap.get(weaponId);
    const stateData = weaponStates[weaponId] ?? { id: weaponId, selectedBy: null, bannedBy: [] };

    if (!masterData) {
        return <div style={style}>Error: Master data missing</div>;
    }

    // WeaponItem に渡す weapon prop を組み立てる
    const weaponProp: DisplayWeapon = {
        ...masterData,
        selectedBy: stateData.selectedBy,
        bannedBy: stateData.bannedBy,
        imageUrl: weaponId === RANDOM_WEAPON_ID
            ? RANDOM_WEAPON_CHOICE_ITEM.imageUrl
            : `/images/weapons/${encodeURIComponent(masterData.name)}.webp`,
        isLoading: loadingWeaponId === weaponId,
    };

    // style を適用した div で WeaponItem をラップ
    return (
        // ★ style を適用: position, top, left, width, height が含まれる
        <div style={style}>
            {/* ★ パディングなどを Cell 側で調整するか、WeaponItem側で行うか選択 */}
            {/* 例: Cell に padding を追加 */}
            <div className="p-1 h-full"> {/* 例: 各セル内にパディング */}
                <WeaponItem
                    // key は不要
                    weapon={weaponProp}
                    phase={phase}
                    currentTurn={currentTurn}
                    myTeam={myTeam}
                    banCount={myBanCount}
                    onWeaponClick={onWeaponClick}
                />
            </div>
        </div>
    );
});
Cell.displayName = 'GridCell';


// メインコンポーネント
const WeaponGridDisplayComponent: React.FC<WeaponGridDisplayProps> = ({
    phase,
    currentTurn,
    banPhaseState,
    pickPhaseState,
    displayWeaponIds,
    masterWeapons,
    weaponStates,
    loadingWeaponId,
    myTeam,
    // amIHost, // Cell に渡さない
    myBanCount,
    // myPickCount, // Cell に渡さない
    onWeaponClick,
}) => {
    console.log('[WeaponGridDisplay] Rendering, Phase:', phase);

    // ★★★★★ グリッドの計算 (固定値 - 要調整) ★★★★★
    const targetColumnCount = 7;

    // ★ masterWeapons を Map に変換 (useMemo)
    const masterWeaponsMap = useMemo(() => {
        const map = new Map<number, MasterWeapon>();
        masterWeapons.forEach(mw => map.set(mw.id, mw));
        map.set(RANDOM_WEAPON_ID, RANDOM_WEAPON_CHOICE_ITEM as MasterWeapon);
        return map;
    }, [masterWeapons]);

    // ★ itemData を useMemo でメモ化
    const itemDataForGrid = useMemo<Omit<CellData, 'columnCount' | 'gridWidth' | 'itemWidth'>>(() => ({
        weaponIds: displayWeaponIds,
        masterWeaponsMap,
        weaponStates,
        loadingWeaponId,
        phase,
        currentTurn,
        myTeam,
        myBanCount,
        onWeaponClick,
    }), [displayWeaponIds, masterWeaponsMap, weaponStates, loadingWeaponId,
        phase, currentTurn, myTeam, myBanCount, onWeaponClick]);



    return (
        <div className="h-full flex flex-col ">
            {/* --- 上部メッセージエリア --- */}
            {phase === 'waiting' && (
                <div className="text-center py-0 px-2 flex-shrink-0">
                    <p className="text-gray-500 mt-1">チームを選択して、ホストのゲーム開始をお待ちください。</p>
                </div>
            )}
            {(phase === 'ban' || phase === 'pick') && (
                <h3 className="text-lg font-semibold mb-2 text-gray-800 whitespace-normal px-1 pt-3 flex-shrink-0">
                    {phase === 'ban' ? 'BANする武器を選択してください' : 'PICKする武器を選んでください'}
                    {myTeam !== 'observer' && (
                        ` (${phase === 'ban'
                            ? `${banPhaseState?.bans[myTeam] ?? 0}/${MAX_BANS_PER_TEAM}`
                            : `${pickPhaseState?.picks[myTeam] ?? 0}/${MAX_PICKS_PER_TEAM}`
                        })`
                    )}
                </h3>
            )}
            {phase === 'pick_complete' && (
                <div className="text-center px-2 flex-shrink-0">
                    <p className="text-gray-500 mt-1">試合を開始してください。結果をリセットするときはホストのルームリセットをお待ちください。</p>
                </div>
            )}

            {/* --- グリッド表示エリア  --- */}
            <div className="flex-grow min-h-0">
                {displayWeaponIds.length > 0 ? (
                    <div className="h-full border border-gray-300 rounded-md overflow-hidden bg-white">
                        <AutoSizer>
                            {({ height, width }) => {
                                if (width === 0 || height === 0) return null;

                                const scrollbarWidth = 17; // 一般的なスクロールバー幅 (環境依存あり)
                                const availableWidth = width - scrollbarWidth; // スクロールバー分を引いた幅

                                // セルサイズを width/height と目標列数から計算
                                const columnCount = targetColumnCount; // 目標列数をそのまま使用
                                const calculatedColumnWidth = availableWidth / columnCount; // スクロールを除いた幅を列数で割る
                                const rowCount = Math.ceil(displayWeaponIds.length / columnCount);// 実際の行数を計算
                                // ★ セルの高さをアイテムのアスペクト比等から決定 (例: 幅に合わせる、または固定比率)
                                // 例1: セルをほぼ正方形にする
                                const calculatedRowHeight = calculatedColumnWidth;
                                // 例2: 武器アイコンの比率 (仮に 1:1) + 上下マージンを考慮
                                // const calculatedRowHeight = calculatedColumnWidth * 1.0 + 30; // 30px はマージン分 (要調整)

                                const finalItemData: CellData = {
                                    ...itemDataForGrid,
                                    gridWidth: width,
                                    itemWidth: calculatedColumnWidth, // ★ 計算結果を渡す
                                    // columnCount は Cell 内計算なので不要
                                };

                                return (
                                    <FixedSizeGrid
                                        columnCount={columnCount}
                                        columnWidth={calculatedColumnWidth} // ★ 計算結果を使用
                                        height={height}
                                        rowCount={rowCount} // ★ 計算結果を使用
                                        rowHeight={calculatedRowHeight} // ★ 計算結果を使用
                                        width={width}
                                        itemData={finalItemData}
                                        className="weapon-grid-virtualized"
                                        overscanColumnCount={1}
                                        overscanRowCount={1}
                                    >
                                        {Cell}
                                    </FixedSizeGrid>
                                );
                            }}
                        </AutoSizer>
                    </div>
                ) : (<p className="text-center text-gray-500 py-4">表示対象の武器がありません。</p>)}
            </div>
        </div> // ルート要素の閉じタグ
    );
};

// メモ化とエクスポート
WeaponGridDisplayComponent.displayName = 'WeaponGridDisplay';
const MemoizedWeaponGridDisplay = memo(WeaponGridDisplayComponent);
export default MemoizedWeaponGridDisplay;