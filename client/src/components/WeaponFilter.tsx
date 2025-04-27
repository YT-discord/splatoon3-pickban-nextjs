// src/components/WeaponFilter.tsx
import React from 'react';
import type { WeaponAttribute, FilterType } from './WeaponGrid';
import { WEAPON_ATTRIBUTES, SUB_WEAPONS, SPECIAL_WEAPONS } from '../../../common/types/constants';


interface WeaponFilterProps {
    selectedAttributes: WeaponAttribute[];
    selectedSubWeapons: string[];
    selectedSpecialWeapons: string[];
    filterSectionOpen: Record<FilterType, boolean>; // 開閉状態
    onFilterChange: (type: FilterType, value: string) => void; // 汎用ハンドラ
    onClearFilterSection: (type: FilterType) => void; // セクションクリア
    onToggleSection: (type: FilterType) => void; // セクション開閉
}

interface FilterSectionProps {
    type: FilterType;
    title: string;
    items: readonly string[] | string[]; // 属性orサブorスペリスト
    selectedItems: string[];
    isOpen: boolean;
    onToggle: (type: FilterType) => void;
    onItemChange: (type: FilterType, value: string) => void;
    onClear: (type: FilterType) => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({
    type, title, items, selectedItems, isOpen, onToggle, onItemChange, onClear
}) => (
    <div className="border-b border-gray-200 last:border-b-0">
        {/* ヘッダー (クリックで開閉) */}
        <button
            onClick={() => onToggle(type)}
            className="w-full flex justify-between items-center py-2 px-1 text-left hover:bg-gray-100"
        >
            <span className="text-sm font-semibold text-gray-700">
                {isOpen ? '▼' : '▶'} {title}
            </span>
            <div className="flex items-center gap-2">
                 {/* 選択数表示 */}
                 {selectedItems.length > 0 && (
                     <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                         {selectedItems.length} 件選択中
                     </span>
                 )}
                {/* 選択解除ボタン */}
                <button
                    onClick={(e) => { e.stopPropagation(); onClear(type); }}
                    className="text-xs px-2 py-1 border rounded bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={selectedItems.length === 0}
                >
                    解除
                </button>
            </div>
        </button>
        {/* コンテンツ (開いているときだけ表示) */}
        {isOpen && (
            <div className="pt-2 pb-3 px-1 flex flex-wrap gap-1.5">
                {items.map(item => {
                    const isSelected = selectedItems.includes(item);
                    return (
                        <button
                            key={item}
                            onClick={() => onItemChange(type, item)}
                            className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                                isSelected
                                    ? 'bg-blue-500 text-white border-blue-600 font-semibold'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                            }`}
                        >
                            {item}
                        </button>
                    );
                })}
                 {items.length === 0 && <p className="text-xs text-gray-500">該当なし</p>}
            </div>
        )}
    </div>
);


const WeaponFilter: React.FC<WeaponFilterProps> = ({
    selectedAttributes,
    selectedSubWeapons,
    selectedSpecialWeapons,
    filterSectionOpen,
    onFilterChange,
    onClearFilterSection,
    onToggleSection,
}) => {
    return (
        // ★★★★★ 変更点: アコーディオン形式のUI ★★★★★
        <div className="mb-4 bg-white rounded border"> {/* 背景を白に */}
            <FilterSection
                type="attribute"
                title="属性"
                items={WEAPON_ATTRIBUTES}
                selectedItems={selectedAttributes}
                isOpen={filterSectionOpen.attribute}
                onToggle={onToggleSection}
                onItemChange={onFilterChange}
                onClear={onClearFilterSection}
            />
            <FilterSection
                type="subWeapon"
                title="サブウェポン"
                items={SUB_WEAPONS}
                selectedItems={selectedSubWeapons}
                isOpen={filterSectionOpen.subWeapon}
                onToggle={onToggleSection}
                onItemChange={onFilterChange}
                onClear={onClearFilterSection}
            />
             <FilterSection
                type="specialWeapon"
                title="スペシャルウェポン"
                items={SPECIAL_WEAPONS}
                selectedItems={selectedSpecialWeapons}
                isOpen={filterSectionOpen.specialWeapon}
                onToggle={onToggleSection}
                onItemChange={onFilterChange}
                onClear={onClearFilterSection}
            />
        </div>
    );
};

export default WeaponFilter;