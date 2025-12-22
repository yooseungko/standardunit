"use client";

import { useState, useMemo } from "react";
import { MaterialPrice } from "@/lib/pricingTypes";
import Pagination from "./Pagination";
import CategoryManager from "./CategoryManager";

interface MaterialPricingTableProps {
    data: MaterialPrice[];
    onEdit: (item: MaterialPrice) => void;
    onDelete: (id: string) => void;
    onBulkUpdate?: (ids: string[], updates: Partial<MaterialPrice>) => void;
    searchQuery?: string;
}

export default function MaterialPricingTable({ data, onEdit, onDelete, onBulkUpdate, searchQuery = '' }: MaterialPricingTableProps) {
    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');

    // 선택 상태
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkEdit, setShowBulkEdit] = useState(false);
    const [bulkCategory, setBulkCategory] = useState('');
    const [bulkSubCategory, setBulkSubCategory] = useState('');

    // 카테고리 관리 모달
    const [showCategoryManager, setShowCategoryManager] = useState(false);

    // 카테고리 목록 추출
    const categories = useMemo(() => {
        const cats = [...new Set(data.map(m => m.category).filter(Boolean))];
        return cats.sort();
    }, [data]);

    // 선택된 카테고리의 세부 카테고리 목록
    const subCategories = useMemo(() => {
        if (categoryFilter === 'all') return [];
        const subs = [...new Set(
            data
                .filter(m => m.category === categoryFilter && m.sub_category)
                .map(m => m.sub_category)
        )].filter(Boolean) as string[];
        return subs.sort();
    }, [data, categoryFilter]);

    // 모든 세부 카테고리 목록 (일괄 수정용)
    const allSubCategories = useMemo(() => {
        const subs = [...new Set(data.map(m => m.sub_category).filter(Boolean))] as string[];
        return subs.sort();
    }, [data]);

    // 카테고리별 세부 카테고리 맵 (카테고리 관리용)
    const subCategoriesMap = useMemo(() => {
        const map: Record<string, string[]> = {};
        data.forEach(m => {
            if (!map[m.category]) map[m.category] = [];
            if (m.sub_category && !map[m.category].includes(m.sub_category)) {
                map[m.category].push(m.sub_category);
            }
        });
        return map;
    }, [data]);

    // 필터링된 데이터
    const filteredData = useMemo(() => {
        let filtered = data;

        // 검색어 필터
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(m =>
                m.product_name.toLowerCase().includes(query) ||
                (m.brand?.toLowerCase() || '').includes(query) ||
                m.category.toLowerCase().includes(query) ||
                (m.sub_category?.toLowerCase() || '').includes(query)
            );
        }

        // 카테고리 필터
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(m => m.category === categoryFilter);
        }

        // 세부 카테고리 필터
        if (subCategoryFilter !== 'all') {
            filtered = filtered.filter(m => m.sub_category === subCategoryFilter);
        }

        // 정렬: 대표 항목 등급이 있는 항목을 먼저 표시
        filtered = [...filtered].sort((a, b) => {
            const gradeOrder = { '기본': 1, '중급': 2, '고급': 3 };
            const aHasGrade = a.representative_grade ? gradeOrder[a.representative_grade as keyof typeof gradeOrder] || 0 : 0;
            const bHasGrade = b.representative_grade ? gradeOrder[b.representative_grade as keyof typeof gradeOrder] || 0 : 0;

            // 대표 항목이 있는 것이 먼저
            if (aHasGrade && !bHasGrade) return -1;
            if (!aHasGrade && bHasGrade) return 1;
            // 둘 다 대표 항목이면 등급순
            if (aHasGrade && bHasGrade) return aHasGrade - bHasGrade;
            return 0;
        });

        return filtered;
    }, [data, categoryFilter, subCategoryFilter, searchQuery]);

    // 페이지네이션된 데이터
    const paginatedData = useMemo(() => {
        const start = (page - 1) * itemsPerPage;
        return filteredData.slice(start, start + itemsPerPage);
    }, [filteredData, page, itemsPerPage]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    // 금액 포맷
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('ko-KR').format(price);
    };

    // 카테고리 필터 변경
    const handleCategoryChange = (filter: string) => {
        setCategoryFilter(filter);
        setSubCategoryFilter('all'); // 세부 카테고리 초기화
        setPage(1);
    };

    // 세부 카테고리 필터 변경
    const handleSubCategoryChange = (filter: string) => {
        setSubCategoryFilter(filter);
        setPage(1);
    };

    // 카테고리별 개수 계산
    const getCategoryCount = (cat: string) => {
        return data.filter(m => m.category === cat).length;
    };

    // 세부 카테고리별 개수 계산
    const getSubCategoryCount = (sub: string) => {
        return data.filter(m => m.category === categoryFilter && m.sub_category === sub).length;
    };

    // 선택 관련 함수
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === paginatedData.length) {
            // 현재 페이지 전체 선택 해제
            setSelectedIds(prev => {
                const next = new Set(prev);
                paginatedData.forEach(m => next.delete(m.id));
                return next;
            });
        } else {
            // 현재 페이지 전체 선택
            setSelectedIds(prev => {
                const next = new Set(prev);
                paginatedData.forEach(m => next.add(m.id));
                return next;
            });
        }
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
        setShowBulkEdit(false);
    };

    // 일괄 수정 적용
    const applyBulkEdit = async () => {
        if (selectedIds.size === 0) return;

        const updates: Partial<MaterialPrice> = {};
        if (bulkCategory) updates.category = bulkCategory;
        if (bulkSubCategory) updates.sub_category = bulkSubCategory;

        if (Object.keys(updates).length === 0) {
            alert('변경할 카테고리를 선택해주세요.');
            return;
        }

        if (onBulkUpdate) {
            onBulkUpdate(Array.from(selectedIds), updates);
        } else {
            // onBulkUpdate가 없으면 개별적으로 처리
            const selectedItems = data.filter(m => selectedIds.has(m.id));
            for (const item of selectedItems) {
                onEdit({ ...item, ...updates });
            }
        }

        clearSelection();
        setBulkCategory('');
        setBulkSubCategory('');
    };

    const isAllSelected = paginatedData.length > 0 && paginatedData.every(m => selectedIds.has(m.id));

    return (
        <div className="space-y-4">
            {/* 카테고리 필터 */}
            <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                {/* 메인 카테고리 */}
                <div className="flex items-center gap-2 flex-wrap p-3">
                    <span className="text-sm text-gray-400 mr-2">카테고리:</span>
                    <button
                        onClick={() => handleCategoryChange('all')}
                        className={`px-3 py-1.5 text-xs rounded-full transition-colors ${categoryFilter === 'all'
                            ? 'bg-white text-gray-900 font-medium'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                    >
                        전체 ({data.length})
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => handleCategoryChange(cat)}
                            className={`px-3 py-1.5 text-xs rounded-full transition-all ${categoryFilter === cat
                                ? 'bg-blue-500 text-white font-medium'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                }`}
                        >
                            {cat} ({getCategoryCount(cat)})
                            {categoryFilter === cat && subCategories.length > 0 && (
                                <span className="ml-1">▼</span>
                            )}
                        </button>
                    ))}

                    {/* 카테고리 수정 버튼 */}
                    <button
                        onClick={() => setShowCategoryManager(true)}
                        className="ml-auto px-3 py-1.5 text-xs rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors flex items-center gap-1"
                    >
                        <span>⚙️</span>
                        <span>카테고리 수정</span>
                    </button>
                </div>

                {/* 세부 카테고리 (슬라이드 애니메이션) */}
                <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${subCategories.length > 0
                        ? 'max-h-20 opacity-100'
                        : 'max-h-0 opacity-0'
                        }`}
                >
                    <div className="flex items-center gap-2 flex-wrap px-3 pb-3 pt-0 border-t border-white/10 bg-white/5">
                        <span className="text-xs text-gray-500 mr-2 mt-2">└ 세부:</span>
                        <button
                            onClick={() => handleSubCategoryChange('all')}
                            className={`mt-2 px-2.5 py-1 text-xs rounded transition-colors ${subCategoryFilter === 'all'
                                ? 'bg-blue-400/20 text-blue-300 font-medium border border-blue-400/30'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                                }`}
                        >
                            전체 ({getCategoryCount(categoryFilter)})
                        </button>
                        {subCategories.map(sub => (
                            <button
                                key={sub}
                                onClick={() => handleSubCategoryChange(sub)}
                                className={`mt-2 px-2.5 py-1 text-xs rounded transition-colors ${subCategoryFilter === sub
                                    ? 'bg-blue-400/20 text-blue-300 font-medium border border-blue-400/30'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                                    }`}
                            >
                                {sub} ({getSubCategoryCount(sub)})
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 선택된 항목 일괄 수정 바 */}
            {selectedIds.size > 0 && (
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-blue-300 font-medium">
                                ✓ {selectedIds.size}개 선택됨
                            </span>
                            <button
                                onClick={clearSelection}
                                className="text-gray-400 hover:text-white text-sm"
                            >
                                선택 해제
                            </button>
                        </div>

                        {showBulkEdit ? (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <label className="text-gray-400 text-sm">카테고리:</label>
                                    <select
                                        value={bulkCategory}
                                        onChange={e => setBulkCategory(e.target.value)}
                                        className="px-3 py-1.5 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none"
                                    >
                                        <option value="">변경 안함</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-gray-400 text-sm">세부:</label>
                                    <select
                                        value={bulkSubCategory}
                                        onChange={e => setBulkSubCategory(e.target.value)}
                                        className="px-3 py-1.5 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none"
                                    >
                                        <option value="">변경 안함</option>
                                        {allSubCategories.map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={applyBulkEdit}
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
                                >
                                    적용
                                </button>
                                <button
                                    onClick={() => setShowBulkEdit(false)}
                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-gray-300 text-sm rounded transition-colors"
                                >
                                    취소
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowBulkEdit(true)}
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
                            >
                                📂 카테고리 일괄 변경
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* 현재 필터 표시 */}
            {categoryFilter !== 'all' && (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">필터:</span>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                        {categoryFilter}
                        {subCategoryFilter !== 'all' && ` > ${subCategoryFilter}`}
                    </span>
                    <button
                        onClick={() => handleCategoryChange('all')}
                        className="text-gray-500 hover:text-white text-xs"
                    >
                        ✕ 초기화
                    </button>
                    <span className="text-gray-500 ml-auto">
                        {filteredData.length}개 항목
                    </span>
                </div>
            )}

            {/* 테이블 */}
            <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                            <th className="px-4 py-3 text-center w-12">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded"
                                />
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300 w-12">#</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">카테고리</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">제품명</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">브랜드</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">사이즈</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">등급</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">단가</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">단위</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">작업</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {paginatedData.map((material, index) => (
                            <tr
                                key={material.id}
                                className={`hover:bg-white/5 ${selectedIds.has(material.id) ? 'bg-blue-500/10' : ''}`}
                            >
                                <td className="px-4 py-3 text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(material.id)}
                                        onChange={() => toggleSelect(material.id)}
                                        className="w-4 h-4 rounded"
                                    />
                                </td>
                                <td className="px-4 py-3 text-center text-gray-500 text-sm">
                                    {(page - 1) * itemsPerPage + index + 1}
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-gray-400 text-xs">{material.category}</span>
                                    {material.sub_category && (
                                        <span className="text-gray-500 text-xs"> &gt; {material.sub_category}</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white">{material.product_name}</span>
                                        {material.representative_grade && (
                                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded whitespace-nowrap">
                                                {material.representative_grade}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-400">{material.brand || '-'}</td>
                                <td className="px-4 py-3 text-center text-gray-400 text-xs">
                                    {material.size || '-'}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${material.product_grade === '고급' ? 'bg-purple-500/20 text-purple-400' :
                                        material.product_grade === '중급' ? 'bg-blue-500/20 text-blue-400' :
                                            material.product_grade === '수입' ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {material.product_grade}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-white">
                                    ₩{formatPrice(material.unit_price)}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-400">
                                    {material.unit}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => onEdit(material)}
                                            className="px-3 py-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded text-sm transition-colors"
                                        >
                                            수정
                                        </button>
                                        <button
                                            onClick={() => onDelete(material.id)}
                                            className="px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded text-sm transition-colors"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredData.length === 0 && (
                            <tr>
                                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                                    {categoryFilter === 'all'
                                        ? '등록된 자재 단가가 없습니다.'
                                        : `'${categoryFilter}${subCategoryFilter !== 'all' ? ` > ${subCategoryFilter}` : ''}' 카테고리의 데이터가 없습니다.`}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={filteredData.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setPage}
                    onItemsPerPageChange={setItemsPerPage}
                />
            </div>

            {/* 카테고리 관리 모달 */}
            {showCategoryManager && (
                <CategoryManager
                    categories={categories}
                    subCategories={subCategoriesMap}
                    onSave={(updates) => {
                        // 일괄 수정 적용
                        if (onBulkUpdate && updates.length > 0) {
                            updates.forEach(update => {
                                // 해당 카테고리의 모든 항목 찾기
                                const affectedItems = data.filter(m => {
                                    if (update.oldSubCategory) {
                                        return m.category === update.oldCategory && m.sub_category === update.oldSubCategory;
                                    }
                                    return m.category === update.oldCategory;
                                });

                                const ids = affectedItems.map(m => m.id);
                                const updateData: Partial<MaterialPrice> = {};

                                if (update.newCategory !== update.oldCategory) {
                                    updateData.category = update.newCategory;
                                }
                                if (update.newSubCategory && update.newSubCategory !== update.oldSubCategory) {
                                    updateData.sub_category = update.newSubCategory;
                                }

                                if (ids.length > 0 && Object.keys(updateData).length > 0) {
                                    onBulkUpdate(ids, updateData);
                                }
                            });
                        }
                        setShowCategoryManager(false);
                    }}
                    onClose={() => setShowCategoryManager(false)}
                />
            )}
        </div>
    );
}
