"use client";

import { useState, useEffect } from "react";
import { LaborCost, MaterialPrice, CompositeCost } from "@/lib/pricingTypes";
import LaborPricingTable from "./LaborPricingTable";
import MaterialPricingTable from "./MaterialPricingTable";
import CompositePricingTable from "./CompositePricingTable";
import PricingEditModal, { PricingTab } from "./PricingEditModal";

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
    const [saving, setSaving] = useState(false);

    // 검색 상태
    const [searchQuery, setSearchQuery] = useState('');

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
    const handleDelete = async (type: PricingTab, id: string) => {
        console.log('[PricingManagement] handleDelete called:', { type, id });

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

    // 일괄 수정 (자재 단가)
    const handleBulkUpdate = async (ids: string[], updates: Partial<MaterialPrice>) => {
        try {
            setSaving(true);

            // 각 항목 업데이트
            for (const id of ids) {
                const item = materialPrices.find(m => m.id === id);
                if (item) {
                    await fetch('/api/pricing', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'material',
                            data: { ...item, ...updates }
                        }),
                    });
                }
            }

            await fetchPricing();
            alert(`✅ ${ids.length}개 항목이 수정되었습니다.`);
        } catch (err) {
            alert(err instanceof Error ? err.message : '일괄 수정에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

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

                <div className="flex items-center gap-3">
                    {/* 검색바 */}
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="항목 검색... (예: 세면수전)"
                            className="w-64 px-4 py-2 pl-10 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            🔍
                        </span>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <button
                        onClick={handleAdd}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center gap-2"
                    >
                        <span>+</span>
                        <span>추가</span>
                    </button>
                </div>
            </div>

            {/* 데모 모드 안내 */}
            {isDemoMode && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
                    ⚠️ 데모 모드에서는 변경사항이 서버 재시작 시 초기화됩니다.
                </div>
            )}

            {/* 인건비 탭 */}
            {activeTab === 'labor' && (
                <LaborPricingTable
                    data={laborCosts}
                    onEdit={handleEdit}
                    onDelete={(id) => handleDelete('labor', id)}
                    searchQuery={searchQuery}
                />
            )}

            {/* 자재 단가 탭 */}
            {activeTab === 'material' && (
                <MaterialPricingTable
                    data={materialPrices}
                    onEdit={handleEdit}
                    onDelete={(id) => handleDelete('material', id)}
                    onBulkUpdate={handleBulkUpdate}
                    searchQuery={searchQuery}
                />
            )}

            {/* 복합 비용 탭 */}
            {activeTab === 'composite' && (
                <CompositePricingTable
                    data={compositeCosts}
                    onEdit={handleEdit}
                    onDelete={(id) => handleDelete('composite', id)}
                    searchQuery={searchQuery}
                />
            )}

            {/* 편집 모달 */}
            {isModalOpen && (
                <PricingEditModal
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
