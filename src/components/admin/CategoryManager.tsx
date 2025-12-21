"use client";

import { useState, useMemo } from "react";

interface CategoryManagerProps {
    categories: string[];
    subCategories: Record<string, string[]>;
    onSave: (updates: CategoryUpdate[]) => void;
    onClose: () => void;
}

interface CategoryUpdate {
    oldCategory: string;
    oldSubCategory?: string;
    newCategory: string;
    newSubCategory?: string;
}

interface CategoryItem {
    category: string;
    subCategories: string[];
    isEditing: boolean;
    editValue: string;
}

export default function CategoryManager({
    categories,
    subCategories,
    onSave,
    onClose,
}: CategoryManagerProps) {
    // 카테고리 상태
    const [categoryItems, setCategoryItems] = useState<CategoryItem[]>(() =>
        categories.map(cat => ({
            category: cat,
            subCategories: subCategories[cat] || [],
            isEditing: false,
            editValue: cat,
        }))
    );

    // 세부 카테고리 편집 상태
    const [editingSubCat, setEditingSubCat] = useState<{ catIndex: number; subIndex: number; value: string } | null>(null);

    // 새 카테고리 추가
    const [newCategory, setNewCategory] = useState('');
    const [newSubCategory, setNewSubCategory] = useState<{ catIndex: number; value: string } | null>(null);

    // 변경 추적
    const [updates, setUpdates] = useState<CategoryUpdate[]>([]);

    // 카테고리 이름 변경
    const startEditCategory = (index: number) => {
        setCategoryItems(prev => prev.map((item, i) => ({
            ...item,
            isEditing: i === index,
            editValue: item.category,
        })));
    };

    const saveEditCategory = (index: number) => {
        const item = categoryItems[index];
        if (item.editValue.trim() && item.editValue !== item.category) {
            // 변경 추적
            setUpdates(prev => [...prev, {
                oldCategory: item.category,
                newCategory: item.editValue.trim(),
            }]);

            setCategoryItems(prev => prev.map((it, i) => ({
                ...it,
                category: i === index ? item.editValue.trim() : it.category,
                isEditing: false,
            })));
        } else {
            setCategoryItems(prev => prev.map((it, i) => ({
                ...it,
                isEditing: false,
            })));
        }
    };

    // 세부 카테고리 이름 변경
    const startEditSubCategory = (catIndex: number, subIndex: number) => {
        setEditingSubCat({
            catIndex,
            subIndex,
            value: categoryItems[catIndex].subCategories[subIndex],
        });
    };

    const saveEditSubCategory = () => {
        if (!editingSubCat) return;

        const { catIndex, subIndex, value } = editingSubCat;
        const oldSub = categoryItems[catIndex].subCategories[subIndex];

        if (value.trim() && value !== oldSub) {
            setUpdates(prev => [...prev, {
                oldCategory: categoryItems[catIndex].category,
                oldSubCategory: oldSub,
                newCategory: categoryItems[catIndex].category,
                newSubCategory: value.trim(),
            }]);

            setCategoryItems(prev => prev.map((it, i) => {
                if (i !== catIndex) return it;
                const newSubs = [...it.subCategories];
                newSubs[subIndex] = value.trim();
                return { ...it, subCategories: newSubs };
            }));
        }

        setEditingSubCat(null);
    };

    // 새 카테고리 추가
    const addCategory = () => {
        if (!newCategory.trim()) return;
        if (categoryItems.some(it => it.category === newCategory.trim())) {
            alert('이미 존재하는 카테고리입니다.');
            return;
        }

        setCategoryItems(prev => [...prev, {
            category: newCategory.trim(),
            subCategories: [],
            isEditing: false,
            editValue: newCategory.trim(),
        }]);
        setNewCategory('');
    };

    // 새 세부 카테고리 추가
    const startAddSubCategory = (catIndex: number) => {
        setNewSubCategory({ catIndex, value: '' });
    };

    const addSubCategory = () => {
        if (!newSubCategory || !newSubCategory.value.trim()) {
            setNewSubCategory(null);
            return;
        }

        const { catIndex, value } = newSubCategory;
        if (categoryItems[catIndex].subCategories.includes(value.trim())) {
            alert('이미 존재하는 세부 카테고리입니다.');
            return;
        }

        setCategoryItems(prev => prev.map((it, i) => {
            if (i !== catIndex) return it;
            return { ...it, subCategories: [...it.subCategories, value.trim()] };
        }));
        setNewSubCategory(null);
    };

    // 카테고리 삭제
    const deleteCategory = (index: number) => {
        if (!confirm(`'${categoryItems[index].category}' 카테고리를 삭제하시겠습니까?\n(기존 제품들의 카테고리는 유지됩니다)`)) return;
        setCategoryItems(prev => prev.filter((_, i) => i !== index));
    };

    // 세부 카테고리 삭제
    const deleteSubCategory = (catIndex: number, subIndex: number) => {
        if (!confirm(`'${categoryItems[catIndex].subCategories[subIndex]}' 세부 카테고리를 삭제하시겠습니까?`)) return;
        setCategoryItems(prev => prev.map((it, i) => {
            if (i !== catIndex) return it;
            return { ...it, subCategories: it.subCategories.filter((_, si) => si !== subIndex) };
        }));
    };

    // 저장
    const handleSave = () => {
        if (updates.length > 0) {
            onSave(updates);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
                {/* 헤더 */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-white">📂 카테고리 관리</h3>
                        <p className="text-gray-400 text-sm mt-1">
                            카테고리와 세부 카테고리를 수정할 수 있습니다
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <span className="text-xl text-gray-400">×</span>
                    </button>
                </div>

                {/* 본문 */}
                <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
                    {/* 새 카테고리 추가 */}
                    <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg">
                        <input
                            type="text"
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                            placeholder="새 카테고리 이름"
                            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            onKeyDown={e => e.key === 'Enter' && addCategory()}
                        />
                        <button
                            onClick={addCategory}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
                        >
                            + 추가
                        </button>
                    </div>

                    {/* 카테고리 목록 */}
                    {categoryItems.map((item, catIndex) => (
                        <div key={item.category} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                            {/* 카테고리 헤더 */}
                            <div className="p-3 bg-white/5 flex items-center justify-between">
                                {item.isEditing ? (
                                    <div className="flex items-center gap-2 flex-1">
                                        <input
                                            type="text"
                                            value={item.editValue}
                                            onChange={e => setCategoryItems(prev => prev.map((it, i) =>
                                                i === catIndex ? { ...it, editValue: e.target.value } : it
                                            ))}
                                            className="flex-1 px-3 py-1.5 bg-white/10 border border-blue-500/50 rounded text-white text-sm focus:outline-none"
                                            autoFocus
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') saveEditCategory(catIndex);
                                                if (e.key === 'Escape') setCategoryItems(prev => prev.map(it => ({ ...it, isEditing: false })));
                                            }}
                                        />
                                        <button
                                            onClick={() => saveEditCategory(catIndex)}
                                            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded"
                                        >
                                            저장
                                        </button>
                                        <button
                                            onClick={() => setCategoryItems(prev => prev.map(it => ({ ...it, isEditing: false })))}
                                            className="px-3 py-1.5 bg-white/10 text-gray-300 text-xs rounded"
                                        >
                                            취소
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-medium">{item.category}</span>
                                            <span className="text-gray-500 text-xs">({item.subCategories.length}개)</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => startEditCategory(catIndex)}
                                                className="px-2 py-1 text-blue-400 hover:bg-blue-500/20 rounded text-xs"
                                            >
                                                수정
                                            </button>
                                            <button
                                                onClick={() => startAddSubCategory(catIndex)}
                                                className="px-2 py-1 text-green-400 hover:bg-green-500/20 rounded text-xs"
                                            >
                                                + 세부
                                            </button>
                                            <button
                                                onClick={() => deleteCategory(catIndex)}
                                                className="px-2 py-1 text-red-400 hover:bg-red-500/20 rounded text-xs"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* 세부 카테고리 목록 */}
                            {(item.subCategories.length > 0 || (newSubCategory?.catIndex === catIndex)) && (
                                <div className="p-3 space-y-2">
                                    {item.subCategories.map((sub, subIndex) => (
                                        <div key={sub} className="flex items-center gap-2 pl-4">
                                            <span className="text-gray-500">└</span>
                                            {editingSubCat?.catIndex === catIndex && editingSubCat?.subIndex === subIndex ? (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <input
                                                        type="text"
                                                        value={editingSubCat.value}
                                                        onChange={e => setEditingSubCat({ ...editingSubCat, value: e.target.value })}
                                                        className="flex-1 px-2 py-1 bg-white/10 border border-blue-500/50 rounded text-white text-xs focus:outline-none"
                                                        autoFocus
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') saveEditSubCategory();
                                                            if (e.key === 'Escape') setEditingSubCat(null);
                                                        }}
                                                    />
                                                    <button
                                                        onClick={saveEditSubCategory}
                                                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded"
                                                    >
                                                        저장
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingSubCat(null)}
                                                        className="px-2 py-1 bg-white/10 text-gray-300 text-xs rounded"
                                                    >
                                                        취소
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="text-gray-300 text-sm flex-1">{sub}</span>
                                                    <button
                                                        onClick={() => startEditSubCategory(catIndex, subIndex)}
                                                        className="px-2 py-0.5 text-blue-400 hover:bg-blue-500/20 rounded text-xs"
                                                    >
                                                        수정
                                                    </button>
                                                    <button
                                                        onClick={() => deleteSubCategory(catIndex, subIndex)}
                                                        className="px-2 py-0.5 text-red-400 hover:bg-red-500/20 rounded text-xs"
                                                    >
                                                        삭제
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ))}

                                    {/* 새 세부 카테고리 입력 */}
                                    {newSubCategory?.catIndex === catIndex && (
                                        <div className="flex items-center gap-2 pl-4">
                                            <span className="text-gray-500">└</span>
                                            <input
                                                type="text"
                                                value={newSubCategory.value}
                                                onChange={e => setNewSubCategory({ ...newSubCategory, value: e.target.value })}
                                                placeholder="새 세부 카테고리"
                                                className="flex-1 px-2 py-1 bg-white/10 border border-green-500/50 rounded text-white text-xs focus:outline-none"
                                                autoFocus
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') addSubCategory();
                                                    if (e.key === 'Escape') setNewSubCategory(null);
                                                }}
                                            />
                                            <button
                                                onClick={addSubCategory}
                                                className="px-2 py-1 bg-green-600 text-white text-xs rounded"
                                            >
                                                추가
                                            </button>
                                            <button
                                                onClick={() => setNewSubCategory(null)}
                                                className="px-2 py-1 bg-white/10 text-gray-300 text-xs rounded"
                                            >
                                                취소
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {categoryItems.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            등록된 카테고리가 없습니다
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <div className="p-4 border-t border-white/10 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                        {updates.length > 0 && (
                            <span className="text-blue-400">
                                ✓ {updates.length}개 변경사항
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition-colors"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                        >
                            저장
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
