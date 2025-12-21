"use client";

import { useState, useMemo } from "react";
import { MaterialPrice } from "@/lib/pricingTypes";
import Pagination from "./Pagination";

interface MaterialPricingTableProps {
    data: MaterialPrice[];
    onEdit: (item: MaterialPrice) => void;
    onDelete: (id: string) => void;
}

export default function MaterialPricingTable({ data, onEdit, onDelete }: MaterialPricingTableProps) {
    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');

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

    // 필터링된 데이터
    const filteredData = useMemo(() => {
        let filtered = data;

        if (categoryFilter !== 'all') {
            filtered = filtered.filter(m => m.category === categoryFilter);
        }

        if (subCategoryFilter !== 'all') {
            filtered = filtered.filter(m => m.sub_category === subCategoryFilter);
        }

        return filtered;
    }, [data, categoryFilter, subCategoryFilter]);

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
                            <tr key={material.id} className="hover:bg-white/5">
                                <td className="px-4 py-3 text-center text-gray-500 text-sm">
                                    {(page - 1) * itemsPerPage + index + 1}
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-gray-400 text-xs">{material.category}</span>
                                    {material.sub_category && (
                                        <span className="text-gray-500 text-xs"> &gt; {material.sub_category}</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-white">{material.product_name}</td>
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
                                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
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
        </div>
    );
}
