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
        <div
            onClick={() => onToggle(type)} // ★ セクション開閉は div で行う
            className="w-full flex justify-between items-center py-2 px-1 text-left hover:bg-gray-100 cursor-pointer"
        >
            {/* タイトル (クリックしても開閉) */}
            <span className="text-sm font-semibold text-gray-700">
                {isOpen ? '▼' : '▶'} {title}
            </span>
            {/* 右側の要素 (選択数と解除ボタン) */}
            <div className="flex items-center gap-2">
                 {/* 選択数表示 */}
                 {selectedItems.length > 0 && (
                     <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                         {selectedItems.length} 件選択中
                     </span>
                 )}
                {/* ★★★★★ 解除ボタン (ネストされていない) ★★★★★ */}
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // ★ 親 div の onClick を防ぐ
                        onClear(type);
                    }}
                    className="text-xs px-2 py-1 border rounded bg-white text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed" // ★ hover スタイル調整
                    disabled={selectedItems.length === 0}
                >
                    解除
                </button>
            </div>
        </div>
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
        // アコーディオン形式のUI
        <div className="mb-4 bg-white rounded border">
            <FilterSection
                type="attribute"
                title="ブキ種"
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