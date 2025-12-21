"use client";

import { useState, useMemo } from "react";
import { CompositeCost } from "@/lib/pricingTypes";
import Pagination from "./Pagination";

interface CompositePricingTableProps {
    data: CompositeCost[];
    onEdit: (item: CompositeCost) => void;
    onDelete: (id: string) => void;
}

export default function CompositePricingTable({ data, onEdit, onDelete }: CompositePricingTableProps) {
    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    // 카테고리 목록 추출
    const categories = useMemo(() => {
        const cats = [...new Set(data.map(c => c.category).filter(Boolean))];
        return cats.sort();
    }, [data]);

    // 필터링된 데이터
    const filteredData = useMemo(() => {
        if (categoryFilter === 'all') return data;
        return data.filter(c => c.category === categoryFilter);
    }, [data, categoryFilter]);

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
                <span className="text-sm text-gray-400 mr-2">카테고리:</span>
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
                        {cat} ({data.filter(c => c.category === cat).length})
                    </button>
                ))}
            </div>

            {/* 테이블 */}
            <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300 w-12">#</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">비용명</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">카테고리</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">설명</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">단가</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">단위</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">구성 비율</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">작업</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {paginatedData.map((composite, index) => (
                            <tr key={composite.id} className="hover:bg-white/5">
                                <td className="px-4 py-3 text-center text-gray-500 text-sm">
                                    {(page - 1) * itemsPerPage + index + 1}
                                </td>
                                <td className="px-4 py-3 text-white font-medium">{composite.cost_name}</td>
                                <td className="px-4 py-3 text-gray-400">{composite.category}</td>
                                <td className="px-4 py-3 text-gray-400 text-sm max-w-xs truncate">
                                    {composite.description || '-'}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-white">
                                    ₩{formatPrice(composite.unit_price)}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-400">
                                    {composite.unit}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {composite.material_ratio && composite.labor_ratio ? (
                                        <div className="flex items-center justify-center gap-1 text-xs">
                                            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                                                자재 {composite.material_ratio}%
                                            </span>
                                            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                                                인건 {composite.labor_ratio}%
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-500">-</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => onEdit(composite)}
                                            className="px-3 py-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded text-sm transition-colors"
                                        >
                                            수정
                                        </button>
                                        <button
                                            onClick={() => onDelete(composite.id)}
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
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                    {categoryFilter === 'all' ? '등록된 복합 비용이 없습니다.' : `'${categoryFilter}' 카테고리의 데이터가 없습니다.`}
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
