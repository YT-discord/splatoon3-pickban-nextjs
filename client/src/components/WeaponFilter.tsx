// src/components/WeaponFilter.tsx
import React from 'react';
import type { WeaponAttribute } from './WeaponGrid'; // WeaponGrid から型をインポート
import { WEAPON_ATTRIBUTES } from '../../../common/types/constants';


interface WeaponFilterProps {
    selectedAttributes: WeaponAttribute[];
    onAttributeChange: (attribute: WeaponAttribute) => void;
    onClearFilters: () => void;
}

const WeaponFilter: React.FC<WeaponFilterProps> = ({
    selectedAttributes,
    onAttributeChange,
    onClearFilters,
}) => {
    return (
        <div className="mb-4 p-3 bg-gray-50 rounded border">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">武器フィルター:</span>
                <div className="space-x-2">
                <button
                        onClick={onClearFilters}
                        className="text-xs px-2 py-1 border rounded bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:text-gray-400"
                        disabled={selectedAttributes.length === 0}
                    >
                        選択解除
                    </button>
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                {WEAPON_ATTRIBUTES.map(attr => {
                    const isSelected = selectedAttributes.includes(attr);
                    return (
                        <button
                            key={attr}
                            onClick={() => onAttributeChange(attr)} // Props の関数を呼び出し
                            className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                                isSelected
                                    ? 'bg-blue-500 text-white border-blue-600 font-semibold'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                            }`}
                        >
                            {attr}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default WeaponFilter;