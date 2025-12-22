"use client";

import { useState, useMemo } from "react";
import { LaborCost } from "@/lib/pricingTypes";
import Pagination from "./Pagination";

interface LaborPricingTableProps {
    data: LaborCost[];
    onEdit: (item: LaborCost) => void;
    onDelete: (id: string) => void;
    searchQuery?: string;
}

export default function LaborPricingTable({ data, onEdit, onDelete, searchQuery = '' }: LaborPricingTableProps) {
    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    // 카테고리 목록 추출
    const categories = useMemo(() => {
        const cats = [...new Set(data.map(l => l.labor_type).filter(Boolean))];
        return cats.sort();
    }, [data]);

    // 필터링된 데이터 (검색 + 카테고리)
    const filteredData = useMemo(() => {
        let filtered = data;

        // 검색어 필터
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(l =>
                l.labor_type.toLowerCase().includes(query) ||
                (l.description?.toLowerCase() || '').includes(query)
            );
        }

        // 카테고리 필터
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(l => l.labor_type === categoryFilter);
        }

        // 정렬: 대표 항목 등급이 있는 항목을 먼저 표시
        filtered = [...filtered].sort((a, b) => {
            const gradeOrder = { '기본': 1, '중급': 2, '고급': 3 };
            const aHasGrade = a.representative_grade ? gradeOrder[a.representative_grade as keyof typeof gradeOrder] || 0 : 0;
            const bHasGrade = b.representative_grade ? gradeOrder[b.representative_grade as keyof typeof gradeOrder] || 0 : 0;

            if (aHasGrade && !bHasGrade) return -1;
            if (!aHasGrade && bHasGrade) return 1;
            if (aHasGrade && bHasGrade) return aHasGrade - bHasGrade;
            return 0;
        });

        return filtered;
    }, [data, categoryFilter, searchQuery]);

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

    // 필터 변경 시 페이지 리셋
    const handleFilterChange = (filter: string) => {
        setCategoryFilter(filter);
        setPage(1);
    };

    return (
        <div className="space-y-4">
            {/* 카테고리 필터 */}
            <div className="flex items-center gap-2 flex-wrap bg-white/5 border border-white/10 rounded-lg p-3">
                <span className="text-sm text-gray-400 mr-2">직종:</span>
                <button
                    onClick={() => handleFilterChange('all')}
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
                        onClick={() => handleFilterChange(cat)}
                        className={`px-3 py-1.5 text-xs rounded-full transition-colors ${categoryFilter === cat
                            ? 'bg-white text-gray-900 font-medium'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                    >
                        {cat} ({data.filter(l => l.labor_type === cat).length})
                    </button>
                ))}
            </div>

            {/* 테이블 */}
            <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300 w-12">#</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">직종</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">설명</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">일당</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">작업</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {paginatedData.map((labor, index) => (
                            <tr key={labor.id} className="hover:bg-white/5">
                                <td className="px-4 py-3 text-center text-gray-500 text-sm">
                                    {(page - 1) * itemsPerPage + index + 1}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-medium">{labor.labor_type}</span>
                                        {labor.representative_grade && (
                                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                                                {labor.representative_grade}대표
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-400 text-sm">{labor.description || '-'}</td>
                                <td className="px-4 py-3 text-right font-mono text-white">
                                    ₩{formatPrice(labor.daily_rate)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => onEdit(labor)}
                                            className="px-3 py-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded text-sm transition-colors"
                                        >
                                            수정
                                        </button>
                                        <button
                                            onClick={() => onDelete(labor.id)}
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
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                    {categoryFilter === 'all' ? '등록된 인건비가 없습니다.' : `'${categoryFilter}' 직종의 데이터가 없습니다.`}
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
