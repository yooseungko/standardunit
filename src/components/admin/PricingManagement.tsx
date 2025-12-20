"use client";

import { useState, useEffect, useMemo } from "react";
import { LaborCost, MaterialPrice, CompositeCost } from "@/lib/pricingTypes";
import Pagination from "./Pagination";

type PricingTab = 'labor' | 'material' | 'composite';

interface PricingManagementProps {
    isDemoMode?: boolean;
}

export default function PricingManagement({ isDemoMode }: PricingManagementProps) {
    const [activeTab, setActiveTab] = useState<PricingTab>('labor');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 데이터
    const [laborCosts, setLaborCosts] = useState<LaborCost[]>([]);
    const [materialPrices, setMaterialPrices] = useState<MaterialPrice[]>([]);
    const [compositeCosts, setCompositeCosts] = useState<CompositeCost[]>([]);

    // 모달 상태
    const [editingItem, setEditingItem] = useState<LaborCost | MaterialPrice | CompositeCost | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 페이지네이션 상태
    const [laborPage, setLaborPage] = useState(1);
    const [materialPage, setMaterialPage] = useState(1);
    const [compositePage, setCompositePage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [saving, setSaving] = useState(false);

    // 데이터 조회
    const fetchPricing = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/pricing?type=all');
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || '데이터 조회 실패');
            }

            setLaborCosts(result.data.labor || []);
            setMaterialPrices(result.data.material || []);
            setCompositeCosts(result.data.composite || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPricing();
    }, []);

    // 저장
    const handleSave = async (type: PricingTab, data: Record<string, unknown>) => {
        try {
            setSaving(true);

            const response = await fetch('/api/pricing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, data }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || '저장 실패');
            }

            await fetchPricing();
            setIsModalOpen(false);
            setEditingItem(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : '저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    // 삭제
    const handleDelete = async (type: PricingTab, id: string, e?: React.MouseEvent) => {
        // 이벤트 버블링 방지
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        console.log('[PricingManagement] handleDelete called:', { type, id });

        // 바로 삭제 진행 (confirm 대화상자 제거)
        try {
            console.log('[PricingManagement] Sending DELETE request...');
            const response = await fetch(`/api/pricing?type=${type}&id=${id}`, {
                method: 'DELETE',
            });

            const result = await response.json();
            console.log('[PricingManagement] DELETE response:', result);

            if (!result.success) {
                throw new Error(result.error || '삭제 실패');
            }

            await fetchPricing();
            console.log('[PricingManagement] Data refreshed after delete');
        } catch (err) {
            console.error('[PricingManagement] Delete error:', err);
            alert(err instanceof Error ? err.message : '삭제에 실패했습니다.');
        }
    };

    // 새 항목 추가
    const handleAdd = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    // 수정
    const handleEdit = (item: LaborCost | MaterialPrice | CompositeCost) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    // 금액 포맷
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('ko-KR').format(price);
    };

    // 페이지네이션된 데이터
    const paginatedLabor = useMemo(() => {
        const start = (laborPage - 1) * itemsPerPage;
        return laborCosts.slice(start, start + itemsPerPage);
    }, [laborCosts, laborPage, itemsPerPage]);

    const paginatedMaterial = useMemo(() => {
        const start = (materialPage - 1) * itemsPerPage;
        return materialPrices.slice(start, start + itemsPerPage);
    }, [materialPrices, materialPage, itemsPerPage]);

    const paginatedComposite = useMemo(() => {
        const start = (compositePage - 1) * itemsPerPage;
        return compositeCosts.slice(start, start + itemsPerPage);
    }, [compositeCosts, compositePage, itemsPerPage]);

    // 총 페이지 수 계산
    const laborTotalPages = Math.ceil(laborCosts.length / itemsPerPage);
    const materialTotalPages = Math.ceil(materialPrices.length / itemsPerPage);
    const compositeTotalPages = Math.ceil(compositeCosts.length / itemsPerPage);

    // 페이지 변경 시 범위 초과 방지
    useEffect(() => {
        if (laborPage > laborTotalPages && laborTotalPages > 0) setLaborPage(laborTotalPages);
    }, [laborTotalPages, laborPage]);

    useEffect(() => {
        if (materialPage > materialTotalPages && materialTotalPages > 0) setMaterialPage(materialTotalPages);
    }, [materialTotalPages, materialPage]);

    useEffect(() => {
        if (compositePage > compositeTotalPages && compositeTotalPages > 0) setCompositePage(compositeTotalPages);
    }, [compositeTotalPages, compositePage]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                    onClick={fetchPricing}
                    className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
                >
                    다시 시도
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* 탭 네비게이션 */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('labor')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'labor'
                            ? 'bg-white text-gray-900'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                    >
                        👷 인건비 ({laborCosts.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('material')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'material'
                            ? 'bg-white text-gray-900'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                    >
                        🧱 자재 단가 ({materialPrices.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('composite')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'composite'
                            ? 'bg-white text-gray-900'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                    >
                        🔧 복합 비용 ({compositeCosts.length})
                    </button>
                </div>

                <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center gap-2"
                >
                    <span>+</span>
                    <span>추가</span>
                </button>
            </div>

            {/* 데모 모드 안내 */}
            {isDemoMode && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
                    ⚠️ 데모 모드에서는 변경사항이 서버 재시작 시 초기화됩니다.
                </div>
            )}

            {/* 인건비 탭 */}
            {activeTab === 'labor' && (
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
                            {paginatedLabor.map((labor, index) => (
                                <tr key={labor.id} className="hover:bg-white/5">
                                    <td className="px-4 py-3 text-center text-gray-500 text-sm">{(laborPage - 1) * itemsPerPage + index + 1}</td>
                                    <td className="px-4 py-3 text-white font-medium">{labor.labor_type}</td>
                                    <td className="px-4 py-3 text-gray-400 text-sm">{labor.description || '-'}</td>
                                    <td className="px-4 py-3 text-right font-mono text-white">
                                        ₩{formatPrice(labor.daily_rate)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleEdit(labor)}
                                                className="px-3 py-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded text-sm transition-colors"
                                            >
                                                수정
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete('labor', labor.id, e)}
                                                className="px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded text-sm transition-colors"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {laborCosts.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                        등록된 인건비가 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    <Pagination
                        currentPage={laborPage}
                        totalPages={laborTotalPages}
                        totalItems={laborCosts.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setLaborPage}
                        onItemsPerPageChange={setItemsPerPage}
                    />
                </div>
            )}

            {/* 자재 단가 탭 */}
            {activeTab === 'material' && (
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
                            {paginatedMaterial.map((material, index) => (
                                <tr key={material.id} className="hover:bg-white/5">
                                    <td className="px-4 py-3 text-center text-gray-500 text-sm">{(materialPage - 1) * itemsPerPage + index + 1}</td>
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
                                                onClick={() => handleEdit(material)}
                                                className="px-3 py-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded text-sm transition-colors"
                                            >
                                                수정
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete('material', material.id, e)}
                                                className="px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded text-sm transition-colors"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {materialPrices.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                        등록된 자재 단가가 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    <Pagination
                        currentPage={materialPage}
                        totalPages={materialTotalPages}
                        totalItems={materialPrices.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setMaterialPage}
                        onItemsPerPageChange={setItemsPerPage}
                    />
                </div>
            )}

            {/* 복합 비용 탭 */}
            {activeTab === 'composite' && (
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
                            {paginatedComposite.map((composite, index) => (
                                <tr key={composite.id} className="hover:bg-white/5">
                                    <td className="px-4 py-3 text-center text-gray-500 text-sm">{(compositePage - 1) * itemsPerPage + index + 1}</td>
                                    <td className="px-4 py-3 text-white font-medium">{composite.cost_name}</td>
                                    <td className="px-4 py-3 text-gray-400">{composite.category}</td>
                                    <td className="px-4 py-3 text-gray-400 text-sm max-w-xs truncate">
                                        {composite.description || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-white">
                                        {composite.unit === '%' ? (
                                            <span>{composite.unit_price}%</span>
                                        ) : (
                                            <span>₩{formatPrice(composite.unit_price)}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-400">
                                        {composite.unit}
                                    </td>
                                    <td className="px-4 py-3 text-center text-xs">
                                        {composite.labor_ratio && (
                                            <span className="text-blue-400 mr-2">인건비 {(composite.labor_ratio * 100).toFixed(0)}%</span>
                                        )}
                                        {composite.service_ratio && (
                                            <span className="text-green-400">서비스 {(composite.service_ratio * 100).toFixed(0)}%</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleEdit(composite)}
                                                className="px-3 py-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded text-sm transition-colors"
                                            >
                                                수정
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete('composite', composite.id, e)}
                                                className="px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded text-sm transition-colors"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {compositeCosts.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                        등록된 복합 비용이 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    <Pagination
                        currentPage={compositePage}
                        totalPages={compositeTotalPages}
                        totalItems={compositeCosts.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCompositePage}
                        onItemsPerPageChange={setItemsPerPage}
                    />
                </div>
            )}

            {/* 편집 모달 */}
            {isModalOpen && (
                <EditModal
                    tab={activeTab}
                    item={editingItem}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingItem(null);
                    }}
                    onSave={handleSave}
                    saving={saving}
                />
            )}
        </div>
    );
}

// 편집 모달 컴포넌트
interface EditModalProps {
    tab: PricingTab;
    item: LaborCost | MaterialPrice | CompositeCost | null;
    onClose: () => void;
    onSave: (type: PricingTab, data: Record<string, unknown>) => void;
    saving: boolean;
}

function EditModal({ tab, item, onClose, onSave, saving }: EditModalProps) {
    const [formData, setFormData] = useState<Record<string, unknown>>(
        item ? { ...item } : {}
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value ? Number(value) : null) : value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(tab, formData);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">
                        {item ? '수정' : '추가'} - {
                            tab === 'labor' ? '인건비' :
                                tab === 'material' ? '자재 단가' : '복합 비용'
                        }
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* 인건비 폼 */}
                    {tab === 'labor' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">직종명 *</label>
                                <input
                                    type="text"
                                    name="labor_type"
                                    value={(formData.labor_type as string) || ''}
                                    onChange={handleChange}
                                    required
                                    placeholder="예: 목수, 타일공"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">일당 (원) *</label>
                                <input
                                    type="number"
                                    name="daily_rate"
                                    value={(formData.daily_rate as number) || ''}
                                    onChange={handleChange}
                                    required
                                    placeholder="예: 280000"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">설명</label>
                                <textarea
                                    name="description"
                                    value={(formData.description as string) || ''}
                                    onChange={handleChange}
                                    rows={2}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                />
                            </div>
                        </>
                    )}

                    {/* 자재 단가 폼 */}
                    {tab === 'material' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">카테고리 *</label>
                                    <input
                                        type="text"
                                        name="category"
                                        value={(formData.category as string) || ''}
                                        onChange={handleChange}
                                        required
                                        placeholder="예: 바닥, 벽면"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">서브 카테고리</label>
                                    <input
                                        type="text"
                                        name="sub_category"
                                        value={(formData.sub_category as string) || ''}
                                        onChange={handleChange}
                                        placeholder="예: 마루, 타일"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">제품명 *</label>
                                <input
                                    type="text"
                                    name="product_name"
                                    value={(formData.product_name as string) || ''}
                                    onChange={handleChange}
                                    required
                                    placeholder="예: 강화마루 12mm"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">브랜드</label>
                                    <input
                                        type="text"
                                        name="brand"
                                        value={(formData.brand as string) || ''}
                                        onChange={handleChange}
                                        placeholder="예: LG하우시스"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">등급</label>
                                    <select
                                        name="product_grade"
                                        value={(formData.product_grade as string) || '일반'}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                    >
                                        <option value="일반">일반</option>
                                        <option value="중급">중급</option>
                                        <option value="고급">고급</option>
                                        <option value="수입">수입</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">사이즈</label>
                                <input
                                    type="text"
                                    name="size"
                                    value={(formData.size as string) || ''}
                                    onChange={handleChange}
                                    placeholder="예: 700×400×680, 600각"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">단가 (원) *</label>
                                    <input
                                        type="number"
                                        name="unit_price"
                                        value={(formData.unit_price as number) || ''}
                                        onChange={handleChange}
                                        required
                                        placeholder="예: 45000"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">단위 *</label>
                                    <input
                                        type="text"
                                        name="unit"
                                        value={(formData.unit as string) || ''}
                                        onChange={handleChange}
                                        required
                                        placeholder="예: ㎡, M, 개"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* 복합 비용 폼 */}
                    {tab === 'composite' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">비용명 *</label>
                                <input
                                    type="text"
                                    name="cost_name"
                                    value={(formData.cost_name as string) || ''}
                                    onChange={handleChange}
                                    required
                                    placeholder="예: 폐기물 처리"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">카테고리 *</label>
                                <input
                                    type="text"
                                    name="category"
                                    value={(formData.category as string) || ''}
                                    onChange={handleChange}
                                    required
                                    placeholder="예: 철거, 기타"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">단가 *</label>
                                    <input
                                        type="number"
                                        name="unit_price"
                                        value={(formData.unit_price as number) || ''}
                                        onChange={handleChange}
                                        required
                                        placeholder="예: 450000"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">단위 *</label>
                                    <input
                                        type="text"
                                        name="unit"
                                        value={(formData.unit as string) || ''}
                                        onChange={handleChange}
                                        required
                                        placeholder="예: 톤, ㎡, %"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">인건비 비율 (0~1)</label>
                                    <input
                                        type="number"
                                        name="labor_ratio"
                                        value={(formData.labor_ratio as number) || ''}
                                        onChange={handleChange}
                                        step="0.01"
                                        min="0"
                                        max="1"
                                        placeholder="예: 0.30"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">서비스 비율 (0~1)</label>
                                    <input
                                        type="number"
                                        name="service_ratio"
                                        value={(formData.service_ratio as number) || ''}
                                        onChange={handleChange}
                                        step="0.01"
                                        min="0"
                                        max="1"
                                        placeholder="예: 0.70"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">설명</label>
                                <textarea
                                    name="description"
                                    value={(formData.description as string) || ''}
                                    onChange={handleChange}
                                    rows={2}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">수량 계산 방법</label>
                                <textarea
                                    name="calculation_notes"
                                    value={(formData.calculation_notes as string) || ''}
                                    onChange={handleChange}
                                    rows={2}
                                    placeholder="예: 보통 32평 기준 전체 철거 시 3~4톤 발생"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                />
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className={`px-6 py-2 rounded-lg font-medium transition-colors ${saving
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-900 hover:bg-gray-200'
                                }`}
                        >
                            {saving ? '저장 중...' : '저장'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
