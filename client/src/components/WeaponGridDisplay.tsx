import React, { memo, useMemo } from 'react';
import { FixedSizeGrid, GridChildComponentProps } from 'react-window';
import type { GameState, Team, MasterWeapon, RoomWeaponState, BanPhaseState, PickPhaseState } from '../../../common/types/index';
import type { DisplayWeapon } from './WeaponGrid';
import { MAX_BANS_PER_TEAM, MAX_PICKS_PER_TEAM, RANDOM_WEAPON_ID, RANDOM_WEAPON_CHOICE_ITEM } from '../../../common/types/index';
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
    // amIHost: boolean;
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

// WeaponGridDisplay 用の Props 比較関数 ★★★★★
const areGridDisplayPropsEqual = (prevProps: WeaponGridDisplayProps, nextProps: WeaponGridDisplayProps): boolean => {
    // 1. myTeam の変更チェック (waiting フェーズでの変更は特別扱い)
    if (prevProps.myTeam !== nextProps.myTeam) {
        // waiting フェーズ中での myTeam の変更は、WeaponGridDisplay の表示に直接影響しないため、
        // この変更だけでは再レンダリングしない。
        // ただし、フェーズ自体が waiting から変わった場合は、myTeam の変更も考慮して再レンダリングする。
        if (nextProps.phase === 'waiting' && prevProps.phase === 'waiting') {
            // console.log('[areGridDisplayPropsEqual] myTeam changed within waiting phase, WGD re-render skipped for this change.');
            // myTeam の変更はスキップするが、他の Props の比較は継続する
        } else {
            // console.log('[areGridDisplayPropsEqual] myTeam changed (and not within waiting phase or phase itself changed)');
            return false; // waiting フェーズ以外、またはフェーズが変わった場合は再レンダリング
        }
    }

    // 2. phase, currentTurn, loadingWeaponId の比較 (UIの主要な状態変化)
    if (
        prevProps.phase !== nextProps.phase ||
        prevProps.currentTurn !== nextProps.currentTurn ||
        prevProps.loadingWeaponId !== nextProps.loadingWeaponId
    ) {
        // console.log('[areGridDisplayPropsEqual] phase, currentTurn, or loadingWeaponId changed');
        return false;
    }

    // 3. displayWeaponIds の比較 (表示される武器リストの変更)
    //    参照が変わる可能性が高いので、内容 (length と各ID) を比較
    if (
        prevProps.displayWeaponIds.length !== nextProps.displayWeaponIds.length ||
        !prevProps.displayWeaponIds.every((id, i) => id === nextProps.displayWeaponIds[i])
    ) {
        // console.log('[areGridDisplayPropsEqual] displayWeaponIds changed');
        return false;
    }

    // 4. masterWeapons の比較 (基本的に不変なので参照比較でOK)
    if (prevProps.masterWeapons !== nextProps.masterWeapons) {
        // console.log('[areGridDisplayPropsEqual] masterWeapons changed');
        return false;
    }

    // 5. myBanCount, myPickCount の比較 (自分のチームのBAN/PICK数の変更)
    if (prevProps.myBanCount !== nextProps.myBanCount || prevProps.myPickCount !== nextProps.myPickCount) {
        // waiting フェーズ中では myBanCount, myPickCount の変更は WeaponGridDisplay の表示に影響しないためスキップ
        if (nextProps.phase === 'waiting' && prevProps.phase === 'waiting') {
            // console.log('[areGridDisplayPropsEqual] myBanCount/myPickCount changed within waiting phase, WGD re-render skipped for this change.');
            // myBanCount/myPickCount の変更はスキップするが、他の Props の比較は継続する
        } else {
            // console.log('[areGridDisplayPropsEqual] myBanCount or myPickCount changed (and not within waiting phase or phase itself changed)');
            return false; // waiting フェーズ以外、またはフェーズが変わった場合は再レンダリング
        }
    }

    // 6. onWeaponClick コールバックの比較 (親で useCallback により安定化されている前提)
    if (prevProps.onWeaponClick !== nextProps.onWeaponClick) {
        // console.log('[areGridDisplayPropsEqual] onWeaponClick changed');
        return false;
    }

    // 7. weaponStates, banPhaseState, pickPhaseState の比較について:
    //    - weaponStates: itemDataForGrid の依存配列に含まれており、Cell レベルでの更新に影響。
    //      WGD レベルでの詳細比較はコストが高く、他の Props (loadingWeaponId, myBanCount等) の変更で検知されることを期待。
    //    - banPhaseState, pickPhaseState: phase, myBanCount, myPickCount の変更でUIへの影響はカバーされる想定。
    //      これらのオブジェクト参照のみが変わり、他の主要 Props が変わらないケースは稀で、
    //      かつ現在の WGD の表示ロジックではUIに影響しない可能性が高い。

    // console.log('[areGridDisplayPropsEqual] Props are considered equal, skipping re-render for WeaponGridDisplay');
    return true; // 上記のいずれにも該当しなければ、Props は等しいとみなし再レンダリングしない
};

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
                <div className="text-lg font-semibold mb-2 text-gray-800 whitespace-normal px-1 flex-shrink-0">
                    <p className="text-gray-500">チームを選択して、ホストのゲーム開始をお待ちください。</p>
                </div>
            )}
            {(phase === 'ban' || phase === 'pick') && (
                <h3 className="text-lg font-semibold mb-2 text-gray-800 whitespace-normal px-1 flex-shrink-0">
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
                <div className="text-lg font-semibold mb-2 text-gray-800 whitespace-normal px-1 flex-shrink-0">
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
const MemoizedWeaponGridDisplay = memo(WeaponGridDisplayComponent, areGridDisplayPropsEqual);
export default MemoizedWeaponGridDisplay;