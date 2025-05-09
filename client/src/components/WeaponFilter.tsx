// client/src/components/WeaponFilter.tsx
import React,{memo} from 'react';
import Image from 'next/image';
import type { WeaponAttribute, FilterType } from './WeaponGrid';
import { WEAPON_ATTRIBUTES, SUB_WEAPONS, SPECIAL_WEAPONS } from '../../../common/types/constants';

const getFilterIconPath = (type: FilterType, itemName: string): string => {
    let folder: string;
    const extension = 'webp';
    switch (type) {
        case 'attribute': folder = 'attributes'; break;
        case 'subWeapon': folder = 'subweapon'; break;
        case 'specialWeapon': folder = 'specialweapon'; break;
        default: folder = 'unknown';
    }
    return `/images/${folder}/${encodeURIComponent(itemName)}.${extension}`;
};

interface WeaponFilterProps {
    selectedAttributes: WeaponAttribute[];
    selectedSubWeapons: string[];
    selectedSpecialWeapons: string[];
    onFilterChange: (type: FilterType, value: string) => void;
    onClearFilterSection: (type: FilterType) => void;
}

const WeaponFilter: React.FC<WeaponFilterProps> = memo(({
    selectedAttributes,
    selectedSubWeapons,
    selectedSpecialWeapons,
    onFilterChange,
    onClearFilterSection,
}) => {
    // 各フィルター行をレンダリングするヘルパー関数
    const renderFilterRow = (
        type: FilterType,
        title: string,
        items: readonly string[] | string[],
        selectedItems: string[],
        onItemChange: (type: FilterType, value: string) => void,
        onClear: (type: FilterType) => void
    ) => (
        <div className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-b-0 px-2">
        {/* ラベル */}
        <div className="w-20 flex-shrink-0 text-right pr-1">
            <span className="text-xs font-semibold text-gray-600">{title}:</span>
        </div>

        <div className="border-l border-gray-200 h-auto self-stretch"></div>

        {/* アイコンボタンリスト (flex-grow で残りのスペースを占める) */}
        <div className="flex flex-wrap gap-1 flex-grow min-w-0">
            {items.map(item => {
                const isSelected = selectedItems.includes(item);
                const iconPath = getFilterIconPath(type, item);
                if (!iconPath) return null;
                return (
                    <button
                        key={item}
                        onClick={() => onItemChange(type, item)}
                        title={item}
                        className={`p-0.5 border rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400
                            ${isSelected
                                ? 'bg-blue-500 text-white border-blue-600 font-semibold'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                            }`}
                    >
                                <Image
                                    src={iconPath}
                                    alt={item}
                                    width={21} height={21}
                                    className="block"
                                />
                    </button>
                );
            })}
            {items.length === 0 && <p className="text-xs text-gray-500">該当なし</p>}
        </div>
             <div className="flex-shrink-0 pt-1 ml-auto pl-2">
             <button
                onClick={() => onClear(type)}
                className="text-xs px-1.5 py-0.5 border rounded bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:text-gray-400"
                disabled={selectedItems.length === 0}
             >
                解除
            </button>
         </div>
    </div>
);

return (
    <div className="mb-1 bg-white rounded border p-1">
        {renderFilterRow('attribute', 'ブキ種', WEAPON_ATTRIBUTES, selectedAttributes, onFilterChange, onClearFilterSection)}
        {renderFilterRow('subWeapon', 'サブ', SUB_WEAPONS, selectedSubWeapons, onFilterChange, onClearFilterSection)}
        {renderFilterRow('specialWeapon', 'スペシャル', SPECIAL_WEAPONS, selectedSpecialWeapons, onFilterChange, onClearFilterSection)}
    </div>
);
});
WeaponFilter.displayName = 'WeaponFilter';

export default WeaponFilter;