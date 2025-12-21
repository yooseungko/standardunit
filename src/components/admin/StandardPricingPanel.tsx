"use client";

import React, { useState, useEffect, useMemo } from "react";
import { QuoteItem } from "@/types/quote";

interface StandardPricingPanelProps {
    onAddItem: (item: Partial<QuoteItem>) => void;
    isOpen: boolean;
    onToggle: () => void;
}

interface LaborCost {
    id: number;
    labor_type: string;
    daily_rate: number;
    description?: string;
    category?: string;
}

interface MaterialPrice {
    id: number;
    category: string;
    sub_category?: string;
    product_name: string;
    brand?: string;
    size?: string;
    unit: string;
    unit_price: number;
    grade?: string;
}

interface CompositeCost {
    id: number;
    cost_name: string;
    category: string;
    unit: string;
    unit_price: number;
    labor_ratio: number;
    description?: string;
}

type PricingTab = 'labor' | 'material' | 'composite';

// 수량 입력 상태
interface QuantityState {
    [key: string]: number;
}

export default function StandardPricingPanel({
    onAddItem,
    isOpen,
    onToggle,
}: StandardPricingPanelProps) {
    const [activeTab, setActiveTab] = useState<PricingTab>('material');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');

    // 수량 상태
    const [quantities, setQuantities] = useState<QuantityState>({});

    // 데이터
    const [laborCosts, setLaborCosts] = useState<LaborCost[]>([]);
    const [materialPrices, setMaterialPrices] = useState<MaterialPrice[]>([]);
    const [compositeCosts, setCompositeCosts] = useState<CompositeCost[]>([]);

    // 데이터 로드
    useEffect(() => {
        if (isOpen && laborCosts.length === 0) {
            loadPricingData();
        }
    }, [isOpen]);

    const loadPricingData = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/pricing');
            const result = await response.json();
            if (result.success) {
                setLaborCosts(result.data.labor || []);
                setMaterialPrices(result.data.material || []);
                setCompositeCosts(result.data.composite || []);
            }
        } catch (err) {
            console.error('Failed to load pricing data:', err);
        } finally {
            setLoading(false);
        }
    };

    // 현재 데이터 기반 카테고리 목록
    const categories = useMemo(() => {
        switch (activeTab) {
            case 'labor':
                return [...new Set(laborCosts.map(l => l.category || '기타'))].sort();
            case 'material':
                return [...new Set(materialPrices.map(m => m.category))].sort();
            case 'composite':
                return [...new Set(compositeCosts.map(c => c.category))].sort();
            default:
                return [];
        }
    }, [activeTab, laborCosts, materialPrices, compositeCosts]);

    // 세부 카테고리
    const subCategories = useMemo(() => {
        if (activeTab !== 'material' || categoryFilter === 'all') return [];
        return [...new Set(
            materialPrices
                .filter(m => m.category === categoryFilter && m.sub_category)
                .map(m => m.sub_category)
        )].filter(Boolean) as string[];
    }, [activeTab, categoryFilter, materialPrices]);

    // 필터링된 데이터
    const filteredData = useMemo(() => {
        const query = searchQuery.toLowerCase();

        switch (activeTab) {
            case 'labor':
                return laborCosts.filter(l =>
                    (categoryFilter === 'all' || l.category === categoryFilter) &&
                    (l.labor_type.toLowerCase().includes(query) ||
                        l.description?.toLowerCase().includes(query))
                );
            case 'material':
                return materialPrices.filter(m =>
                    (categoryFilter === 'all' || m.category === categoryFilter) &&
                    (subCategoryFilter === 'all' || m.sub_category === subCategoryFilter) &&
                    (m.product_name.toLowerCase().includes(query) ||
                        m.brand?.toLowerCase().includes(query) ||
                        m.sub_category?.toLowerCase().includes(query))
                );
            case 'composite':
                return compositeCosts.filter(c =>
                    (categoryFilter === 'all' || c.category === categoryFilter) &&
                    (c.cost_name.toLowerCase().includes(query) ||
                        c.description?.toLowerCase().includes(query))
                );
            default:
                return [];
        }
    }, [activeTab, searchQuery, categoryFilter, subCategoryFilter, laborCosts, materialPrices, compositeCosts]);

    // 카테고리별 개수
    const getCategoryCount = (cat: string) => {
        switch (activeTab) {
            case 'labor':
                return laborCosts.filter(l => (l.category || '기타') === cat).length;
            case 'material':
                return materialPrices.filter(m => m.category === cat).length;
            case 'composite':
                return compositeCosts.filter(c => c.category === cat).length;
            default:
                return 0;
        }
    };

    // 세부 카테고리별 개수
    const getSubCategoryCount = (sub: string) => {
        return materialPrices.filter(m => m.category === categoryFilter && m.sub_category === sub).length;
    };

    // 카테고리 필터 변경
    const handleCategoryChange = (filter: string) => {
        setCategoryFilter(filter);
        setSubCategoryFilter('all');
    };

    // 탭 변경
    const handleTabChange = (tab: PricingTab) => {
        setActiveTab(tab);
        setCategoryFilter('all');
        setSubCategoryFilter('all');
        setSearchQuery('');
    };

    // 수량 변경
    const getQuantity = (id: string | number) => quantities[`${activeTab}-${id}`] || 1;
    const setQuantity = (id: string | number, qty: number) => {
        setQuantities(prev => ({
            ...prev,
            [`${activeTab}-${id}`]: Math.max(1, qty)
        }));
    };

    // 견적서에 항목 추가
    const addLaborItem = (labor: LaborCost) => {
        const qty = getQuantity(labor.id);
        onAddItem({
            id: `new-${Date.now()}`,
            category: labor.category || '인건비',
            sub_category: labor.labor_type,
            item_name: `${labor.labor_type} 공임`,
            description: labor.description,
            quantity: qty,
            unit: '일',
            unit_price: labor.daily_rate,
            total_price: labor.daily_rate * qty,
            cost_type: 'labor',
            labor_ratio: 1,
            is_included: true,
        });
    };

    const addMaterialItem = (material: MaterialPrice) => {
        const qty = getQuantity(material.id);
        onAddItem({
            id: `new-${Date.now()}`,
            category: material.category,
            sub_category: material.sub_category,
            item_name: material.product_name,
            size: material.size,
            quantity: qty,
            unit: material.unit,
            unit_price: material.unit_price,
            total_price: material.unit_price * qty,
            cost_type: 'material',
            labor_ratio: 0,
            is_included: true,
        });
    };

    const addCompositeItem = (composite: CompositeCost) => {
        const qty = getQuantity(composite.id);
        onAddItem({
            id: `new-${Date.now()}`,
            category: composite.category,
            item_name: composite.cost_name,
            description: composite.description,
            quantity: qty,
            unit: composite.unit,
            unit_price: composite.unit_price,
            total_price: composite.unit_price * qty,
            cost_type: 'composite',
            labor_ratio: composite.labor_ratio,
            is_included: true,
        });
    };

    // 금액 포맷
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('ko-KR').format(price);
    };

    // 수량 입력 컴포넌트
    const QuantityInput = ({ id }: { id: string | number }) => {
        const qty = getQuantity(id);
        return (
            <div className="inline-flex items-center bg-white/10 rounded text-xs">
                <button
                    onClick={() => setQuantity(id, qty - 1)}
                    className="px-1.5 py-0.5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                    −
                </button>
                <input
                    type="number"
                    value={qty}
                    onChange={e => setQuantity(id, Number(e.target.value))}
                    className="w-8 text-center bg-transparent text-white text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min={1}
                />
                <button
                    onClick={() => setQuantity(id, qty + 1)}
                    className="px-1.5 py-0.5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                    +
                </button>
            </div>
        );
    };

    // 전체 데이터 개수
    const getTotalCount = () => {
        switch (activeTab) {
            case 'labor': return laborCosts.length;
            case 'material': return materialPrices.length;
            case 'composite': return compositeCosts.length;
            default: return 0;
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={onToggle}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-xl text-green-400 font-medium hover:from-green-500/30 hover:to-blue-500/30 transition-all flex items-center justify-center gap-2"
            >
                <span className="text-lg">📦</span>
                표준단가에서 항목 추가
                <span className="text-sm">▼</span>
            </button>
        );
    }

    return (
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-xl overflow-hidden">
            {/* 헤더 */}
            <div className="px-4 py-3 bg-black/20 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                    <span className="text-lg">📦</span>
                    <span className="text-white font-medium">표준단가에서 항목 추가</span>
                </div>
                <button
                    onClick={onToggle}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    ▲ 접기
                </button>
            </div>

            {/* 탭 */}
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
                <button
                    onClick={() => handleTabChange('material')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'material'
                        ? 'bg-green-600 text-white'
                        : 'bg-white/10 text-gray-400 hover:text-white'
                        }`}
                >
                    🧱 자재 ({materialPrices.length})
                </button>
                <button
                    onClick={() => handleTabChange('labor')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'labor'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/10 text-gray-400 hover:text-white'
                        }`}
                >
                    👷 인건비 ({laborCosts.length})
                </button>
                <button
                    onClick={() => handleTabChange('composite')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'composite'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/10 text-gray-400 hover:text-white'
                        }`}
                >
                    📋 복합비용 ({compositeCosts.length})
                </button>

                {/* 검색 */}
                <div className="relative ml-auto flex-shrink-0">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="검색..."
                        className="w-48 pl-8 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                </div>
            </div>

            {/* 카테고리 필터 - 버튼 스타일 */}
            <div className="bg-white/5 border-b border-white/10">
                {/* 메인 카테고리 */}
                <div className="flex items-center gap-2 flex-wrap p-3">
                    <span className="text-xs text-gray-400 mr-1">카테고리:</span>
                    <button
                        onClick={() => handleCategoryChange('all')}
                        className={`px-3 py-1.5 text-xs rounded-full transition-colors ${categoryFilter === 'all'
                            ? 'bg-white text-gray-900 font-medium'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                    >
                        전체 ({getTotalCount()})
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => handleCategoryChange(cat)}
                            className={`px-3 py-1.5 text-xs rounded-full transition-all ${categoryFilter === cat
                                ? 'bg-green-500 text-white font-medium'
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

                {/* 세부 카테고리 (자재만) */}
                {activeTab === 'material' && subCategories.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap px-3 pb-3 pt-0 border-t border-white/10 bg-white/5">
                        <span className="text-xs text-gray-500 mr-1 mt-2">└ 세부:</span>
                        <button
                            onClick={() => setSubCategoryFilter('all')}
                            className={`mt-2 px-2.5 py-1 text-xs rounded transition-colors ${subCategoryFilter === 'all'
                                ? 'bg-green-400/20 text-green-300 font-medium border border-green-400/30'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                                }`}
                        >
                            전체 ({getCategoryCount(categoryFilter)})
                        </button>
                        {subCategories.map(sub => (
                            <button
                                key={sub}
                                onClick={() => setSubCategoryFilter(sub)}
                                className={`mt-2 px-2.5 py-1 text-xs rounded transition-colors ${subCategoryFilter === sub
                                    ? 'bg-green-400/20 text-green-300 font-medium border border-green-400/30'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                                    }`}
                            >
                                {sub} ({getSubCategoryCount(sub)})
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* 목록 */}
            <div className="max-h-[350px] overflow-y-auto">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">
                        <span className="animate-spin inline-block mr-2">⏳</span>
                        로딩 중...
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        검색 결과가 없습니다
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-white/5 sticky top-0">
                            <tr>
                                {activeTab === 'labor' && (
                                    <>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">직종</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">설명</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-400">일급</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-400">수량</th>
                                        <th className="px-4 py-2 w-20"></th>
                                    </>
                                )}
                                {activeTab === 'material' && (
                                    <>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">제품명</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-400">규격</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-400">단가</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-400">수량</th>
                                        <th className="px-4 py-2 w-20"></th>
                                    </>
                                )}
                                {activeTab === 'composite' && (
                                    <>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">카테고리</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">항목명</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-400">단가</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-400">수량</th>
                                        <th className="px-4 py-2 w-20"></th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {activeTab === 'labor' && (filteredData as LaborCost[]).map(labor => (
                                <tr key={labor.id} className="hover:bg-white/5">
                                    <td className="px-4 py-2 text-white text-sm">{labor.labor_type}</td>
                                    <td className="px-4 py-2 text-gray-400 text-xs">{labor.description || '-'}</td>
                                    <td className="px-4 py-2 text-right text-blue-400 font-mono text-sm">
                                        ₩{formatPrice(labor.daily_rate)}/일
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <QuantityInput id={labor.id} />
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <button
                                            onClick={() => addLaborItem(labor)}
                                            className="w-8 h-8 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors flex items-center justify-center"
                                        >
                                            +
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {activeTab === 'material' && (filteredData as MaterialPrice[]).map(material => (
                                <tr key={material.id} className="hover:bg-white/5">
                                    <td className="px-4 py-2">
                                        <div className="text-white text-sm">{material.product_name}</div>
                                        {material.brand && (
                                            <span className="text-gray-400 text-xs">({material.brand})</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-center text-gray-400 text-xs">
                                        {material.size || '-'}
                                    </td>
                                    <td className="px-4 py-2 text-right text-green-400 font-mono text-sm">
                                        ₩{formatPrice(material.unit_price)}/{material.unit}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <QuantityInput id={material.id} />
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <button
                                            onClick={() => addMaterialItem(material)}
                                            className="w-8 h-8 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors flex items-center justify-center"
                                        >
                                            +
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {activeTab === 'composite' && (filteredData as CompositeCost[]).map(composite => (
                                <tr key={composite.id} className="hover:bg-white/5">
                                    <td className="px-4 py-2 text-gray-400 text-xs">{composite.category}</td>
                                    <td className="px-4 py-2">
                                        <div className="text-white text-sm">{composite.cost_name}</div>
                                        {composite.description && (
                                            <span className="text-gray-500 text-xs">{composite.description}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right text-purple-400 font-mono text-sm">
                                        ₩{formatPrice(composite.unit_price)}/{composite.unit}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <QuantityInput id={composite.id} />
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <button
                                            onClick={() => addCompositeItem(composite)}
                                            className="w-8 h-8 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors flex items-center justify-center"
                                        >
                                            +
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 요약 */}
            <div className="px-4 py-2 border-t border-white/10 bg-black/20 text-xs text-gray-400 flex items-center justify-between">
                <span>
                    {activeTab === 'labor' && `인건비 ${filteredData.length}개`}
                    {activeTab === 'material' && `자재 ${filteredData.length}개`}
                    {activeTab === 'composite' && `복합비용 ${filteredData.length}개`}
                </span>
                <span className="text-gray-500">
                    수량 조절 후 + 버튼을 눌러주세요
                </span>
            </div>
        </div>
    );
}
