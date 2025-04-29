import React, { memo, useMemo } from 'react';
import { FixedSizeGrid, GridChildComponentProps } from 'react-window';
import type { GameState, Team, MasterWeapon, RoomWeaponState } from '../../../common/types/game';
import type { DisplayWeapon } from './WeaponGrid';
import { MAX_BANS_PER_TEAM, MAX_PICKS_PER_TEAM, RANDOM_CHOICE_ID, RANDOM_CHOICE_ITEM } from '../../../common/types/constants';
import WeaponItem from './WeaponItem'; 
import AutoSizer from 'react-virtualized-auto-sizer'; 

interface WeaponGridDisplayProps {
    phase: GameState['phase'];
    currentTurn: GameState['currentTurn'];
    banPhaseState: GameState['banPhaseState'];
    pickPhaseState: GameState['pickPhaseState'];
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
        imageUrl: weaponId === RANDOM_CHOICE_ID
            ? RANDOM_CHOICE_ITEM.imageUrl
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
    phase, // 分解された props を受け取る
    currentTurn,
    banPhaseState,
    pickPhaseState,
    displayWeaponIds,
    masterWeapons,
    weaponStates,
    loadingWeaponId,
    myTeam,
    // amIHost, // amIHost は Cell では使わないので itemData に含めない
    myBanCount,
    // myPickCount, // myPickCount も Cell では使わない
    onWeaponClick,
}) => {
    console.log('[WeaponGridDisplay] Rendering');

    // ★★★★★ グリッドの計算 (固定値 - 要調整) ★★★★★
    // const columnCount = 6; // 1行あたりのアイテム数
    // const rowCount = Math.ceil(displayWeaponIds.length / columnCount);
    const itemWidth = 90; // アイテムの想定幅 (ボーダーやマージン含む)
    const itemHeight = 90; // アイテムの想定高さ (ボーダーやマージン含む)
    // const gridWidth = 720;  // グリッド全体の幅 (columnWidth * columnCount + スクロールバー幅考慮)
    // const gridHeight = 500; // グリッド全体の高さ (固定、画面サイズに応じて調整推奨)

    // ★ masterWeapons を Map に変換 (useMemo)
    const masterWeaponsMap = useMemo(() => {
        const map = new Map<number, MasterWeapon>();
        masterWeapons.forEach(mw => map.set(mw.id, mw));
        map.set(RANDOM_CHOICE_ID, RANDOM_CHOICE_ITEM as MasterWeapon);
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
        <>
            {(phase === 'ban' || phase === 'pick') && (
                <div className="border-t border-gray-200 mt-2 pt-3 h-full flex flex-col">
                <h3 className="text-lg font-semibold mb-2 text-gray-800 whitespace-normal px-1 pt-3"> 
                        {/* フェーズに応じたテキスト */}
                        {phase === 'ban' ? 'BANする武器を選択してください' : 'PICKする武器を選んでください'}
                        {/* プレイヤーの場合のみBAN/PICK数を表示 */}
                        {myTeam !== 'observer' && (
                            // 三項演算子でBAN/PICKを切り替え
                            ` (${phase === 'ban'
                                // BAN数の表示 (?. と ?? を使って安全にアクセス)
                                ? `${banPhaseState?.bans[myTeam] ?? 0}/${MAX_BANS_PER_TEAM}`
                                // PICK数の表示
                                : `${pickPhaseState?.picks[myTeam] ?? 0}/${MAX_PICKS_PER_TEAM}`
                            })`
                        )}</h3>
                {displayWeaponIds.length > 0 ? (
                    // ★★★★★ AutoSizer でラップ ★★★★★
                    <div className="flex-grow min-h-0"> 
                    <AutoSizer>
                    {({ height, width }) => { // ★ width はここで取得
                    if (width === 0 || height === 0) return null; 
                        const columnCount = Math.max(1, Math.floor(width / itemWidth));
                        const rowCount = Math.ceil(displayWeaponIds.length / columnCount);
                        const calculatedColumnWidth = Math.max(itemWidth, width / columnCount);

                        // ★★★★★ 変更点: Cell に渡す itemData をここで結合 ★★★★★
                        const finalItemData: CellData = {
                            ...itemDataForGrid, // メモ化された基本データ
                            gridWidth: width,   // AutoSizer からの幅
                            itemWidth: itemWidth, // 定数
                            // columnCount は Cell 内で計算するので不要
                        };

                        return (
                            <FixedSizeGrid
                                columnCount={columnCount}
                                columnWidth={calculatedColumnWidth}
                                height={height}
                                rowCount={rowCount}
                                rowHeight={itemHeight}
                                width={width}
                                itemData={finalItemData} // ★ 結合したデータを渡す
                                className="weapon-grid-virtualized"
                            >
                                {Cell}
                            </FixedSizeGrid>
                        );
                    }}
                </AutoSizer>
                </div>
                ) : (<p className="text-center ...">表示対象の武器がありません。</p>)}
            </div>
        )}
            {phase === 'pick_complete' && (
                <div className="text-center py-10">
                    <h3 className="text-2xl font-bold text-green-600">PICK完了！</h3>
                </div>
            )}
            {phase === 'waiting' && (
                <div className="text-center py-10">
                    <h3 className="text-xl font-semibold text-gray-700">ゲーム開始待機中...</h3>
                    <p className="text-gray-500">チームを選択し、ホストの「ゲーム開始」をお待ちください。</p>
                </div>
            )}
        </>
    );
};

WeaponGridDisplayComponent.displayName = 'WeaponGridDisplay';
const MemoizedWeaponGridDisplay = memo(WeaponGridDisplayComponent);

export default MemoizedWeaponGridDisplay; // ★ メモ化されたコンポーネントをエクスポート