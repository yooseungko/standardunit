"use client";

import { useState, useEffect, useMemo } from "react";
import Pagination from "./Pagination";

// 추출된 견적 항목 타입
interface ExtractedItem {
    id: string;
    file_id: string;
    category: string;
    sub_category?: string | null;
    original_item_name: string;
    normalized_item_name: string;
    brand?: string | null;
    product_grade?: string | null;
    unit?: string | null;
    quantity?: number | null;
    unit_price?: number | null;
    total_price?: number | null;
    confidence_score: number;
    is_verified: boolean;
    created_at: string;
    // 연결된 파일 정보
    file_name?: string;
    apartment_name?: string;
    apartment_size?: number;
}

// 가격 기록 타입
interface PriceRecord {
    id: string;
    standard_item_id?: string | null;
    extracted_item_id?: string | null;
    price_yearmonth: string;
    unit_price?: number | null;
    quantity?: number | null;
    total_price?: number | null;
    brand?: string | null;
    product_grade?: string | null;
    apartment_size?: number | null;
    is_verified: boolean;
    created_at: string;
    // 표준 항목 정보 (조인)
    standard_item?: {
        category: string;
        sub_category?: string | null;
        normalized_name: string;
    };
}

interface MarketPricingManagementProps {
    isDemoMode?: boolean;
}

type ViewMode = 'all' | 'unverified' | 'verified' | 'records';

export default function MarketPricingManagement({ isDemoMode }: MarketPricingManagementProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 데이터
    const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
    const [priceRecords, setPriceRecords] = useState<PriceRecord[]>([]);

    // 필터
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    // 선택된 항목
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    // 저장 중
    const [saving, setSaving] = useState(false);

    // 페이지네이션 상태
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // 데이터 조회
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/market-pricing');
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || '데이터 조회 실패');
            }

            setExtractedItems(result.data.extracted || []);
            setPriceRecords(result.data.records || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 카테고리 목록 추출
    const categories = [...new Set(extractedItems.map(item => item.category))].sort();

    // 필터링된 항목 (viewMode에 따라)
    const filteredItems = extractedItems.filter(item => {
        if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
        // viewMode에 따른 필터링
        if (viewMode === 'verified' && !item.is_verified) return false;
        if (viewMode === 'unverified' && item.is_verified) return false;
        return true;
    });

    // 페이지네이션된 데이터
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredItems.slice(start, start + itemsPerPage);
    }, [filteredItems, currentPage, itemsPerPage]);

    // 총 페이지 수
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

    // 필터 변경 시 페이지 초기화
    useEffect(() => {
        setCurrentPage(1);
    }, [categoryFilter, viewMode]);

    // 페이지 범위 초과 방지
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
    }, [totalPages, currentPage]);

    // 항목 선택/해제
    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    // 전체 선택/해제
    const toggleSelectAll = () => {
        if (selectedItems.size === filteredItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filteredItems.map(item => item.id)));
        }
    };

    // 표준 단가로 설정
    const handleSetAsStandard = async () => {
        if (selectedItems.size === 0) {
            alert('표준 단가로 설정할 항목을 선택해주세요.');
            return;
        }

        if (!confirm(`선택한 ${selectedItems.size}개 항목을 표준 단가로 설정하시겠습니까?`)) {
            return;
        }

        try {
            setSaving(true);

            const response = await fetch('/api/market-pricing/set-standard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemIds: Array.from(selectedItems)
                }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || '설정 실패');
            }

            alert(`${result.updated || selectedItems.size}개 항목이 표준 단가로 설정되었습니다.`);
            setSelectedItems(new Set());
            await fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    // 검증 상태 변경
    const handleVerify = async (id: string, verified: boolean) => {
        try {
            const response = await fetch('/api/market-pricing/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, verified }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || '변경 실패');
            }

            await fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
        }
    };

    // 항목 삭제
    const handleDelete = async (id: string) => {
        if (!confirm('이 항목을 삭제하시겠습니까?')) return;

        try {
            const response = await fetch(`/api/market-pricing?id=${id}`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || '삭제 실패');
            }

            await fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : '삭제에 실패했습니다.');
        }
    };

    // 수정 모달 상태
    const [editingItem, setEditingItem] = useState<ExtractedItem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 수정 시작
    const handleEdit = (item: ExtractedItem) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    // 수정 저장
    const handleSaveEdit = async (data: Partial<ExtractedItem>) => {
        if (!editingItem) return;

        try {
            setSaving(true);

            const response = await fetch('/api/market-pricing', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingItem.id,
                    ...data,
                }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || '수정 실패');
            }

            setIsModalOpen(false);
            setEditingItem(null);
            await fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : '수정에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    // 금액 포맷
    const formatPrice = (price: number | null | undefined) => {
        if (price === null || price === undefined) return '-';
        return new Intl.NumberFormat('ko-KR').format(price);
    };

    // 날짜 포맷
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
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
                    onClick={fetchData}
                    className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
                >
                    다시 시도
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* 헤더 */}
            <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-2">시장 단가 관리</h2>
                <p className="text-gray-400 text-sm">
                    견적서에서 추출된 시장 단가를 확인하고, 검증된 단가를 표준 단가로 설정할 수 있습니다.
                </p>
            </div>

            {/* 데모 모드 안내 */}
            {isDemoMode && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
                    ⚠️ 데모 모드에서는 변경사항이 서버 재시작 시 초기화됩니다.
                </div>
            )}

            {/* 뷰 모드 탭 */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'all'
                            ? 'bg-white text-gray-900'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                    >
                        📄 전체 ({extractedItems.length})
                    </button>
                    <button
                        onClick={() => setViewMode('unverified')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'unverified'
                            ? 'bg-yellow-500 text-gray-900'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                    >
                        ⏳ 미검증 ({extractedItems.filter(i => !i.is_verified).length})
                    </button>
                    <button
                        onClick={() => setViewMode('verified')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'verified'
                            ? 'bg-emerald-500 text-gray-900'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                    >
                        ✓ 검증완료 ({extractedItems.filter(i => i.is_verified).length})
                    </button>
                    <button
                        onClick={() => setViewMode('records')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'records'
                            ? 'bg-white text-gray-900'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                    >
                        📈 가격 기록 ({extractedItems.filter(i => i.is_verified).length})
                    </button>
                </div>

                <div className="flex gap-2">
                    {/* 카테고리 필터 */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none"
                    >
                        <option value="all">전체 카테고리</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 선택 액션 바 */}
            {selectedItems.size > 0 && (
                <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-between">
                    <span className="text-blue-400">
                        {selectedItems.size}개 항목 선택됨
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedItems(new Set())}
                            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            선택 해제
                        </button>
                        <button
                            onClick={handleSetAsStandard}
                            disabled={saving}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${saving
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                }`}
                        >
                            {saving ? '처리 중...' : '✓ 표준 단가로 설정'}
                        </button>
                    </div>
                </div>
            )}

            {/* 추출된 항목 테이블 */}
            {viewMode !== 'records' && (
                <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-gray-600 bg-transparent"
                                    />
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300 w-12">#</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">카테고리</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">항목명</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">수량</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">단가</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">총액</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">신뢰도</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">상태</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">작업</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                                        <div className="mb-4 text-4xl">📄</div>
                                        <p className="text-lg font-medium mb-2">추출된 시장 단가가 없습니다</p>
                                        <p className="text-sm">
                                            견적 분석 탭에서 견적서를 업로드하면<br />
                                            자동으로 시장 단가가 추출됩니다.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedItems.map((item, index) => {
                                    // 단가 계산: unit_price가 없으면 total_price / quantity로 계산
                                    const calculatedUnitPrice = item.unit_price
                                        || (item.total_price && item.quantity ? Math.round(item.total_price / item.quantity) : null);

                                    return (
                                        <tr key={item.id} className="hover:bg-white/5">
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.has(item.id)}
                                                    onChange={() => toggleSelect(item.id)}
                                                    className="w-4 h-4 rounded border-gray-600 bg-transparent"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-500 text-sm">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-gray-400 text-xs">{item.category}</span>
                                                {item.sub_category && (
                                                    <span className="text-gray-500 text-xs"> &gt; {item.sub_category}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-white font-medium">{item.normalized_item_name}</div>
                                                {item.original_item_name !== item.normalized_item_name && (
                                                    <div className="text-gray-500 text-xs mt-0.5">
                                                        원본: {item.original_item_name}
                                                    </div>
                                                )}
                                                {item.brand && (
                                                    <div className="text-gray-500 text-xs mt-0.5">
                                                        {item.brand}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-gray-400">
                                                {item.quantity ? (
                                                    <>{formatPrice(item.quantity)} {item.unit || ''}</>
                                                ) : (
                                                    <span className="text-gray-500">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-white">
                                                {calculatedUnitPrice ? (
                                                    <>
                                                        ₩{formatPrice(calculatedUnitPrice)}
                                                        {!item.unit_price && item.total_price && (
                                                            <span className="text-gray-500 text-xs ml-1">(계산)</span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-gray-500">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-yellow-400">
                                                {item.total_price ? (
                                                    <>₩{formatPrice(item.total_price)}</>
                                                ) : (
                                                    <span className="text-gray-500">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className={`inline-block px-2 py-0.5 rounded text-xs ${item.confidence_score >= 0.8 ? 'bg-emerald-500/20 text-emerald-400' :
                                                    item.confidence_score >= 0.5 ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {Math.round(item.confidence_score * 100)}%
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {item.is_verified ? (
                                                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400">
                                                        ✓ 검증됨
                                                    </span>
                                                ) : (
                                                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400">
                                                        미검증
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="text-blue-400 hover:text-blue-300 text-sm"
                                                    >
                                                        수정
                                                    </button>
                                                    <button
                                                        onClick={() => handleVerify(item.id, !item.is_verified)}
                                                        className="text-emerald-400 hover:text-emerald-300 text-sm"
                                                    >
                                                        {item.is_verified ? '검증취소' : '검증'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="text-red-400 hover:text-red-300 text-sm"
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={filteredItems.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={setItemsPerPage}
                    />
                </div>
            )}

            {/* 가격 기록 테이블 - 검증완료된 항목 기준, 미검증 시장가와 비교 */}
            {viewMode === 'records' && (
                <PriceHistoryTab
                    verifiedItems={extractedItems.filter(i => i.is_verified)}
                    allItems={extractedItems}
                    formatPrice={formatPrice}
                    formatDate={formatDate}
                />
            )}

            {/* 통계 카드 */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
                    <p className="text-2xl font-bold text-white">{extractedItems.length}</p>
                    <p className="text-sm text-gray-500">추출된 항목</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
                    <p className="text-2xl font-bold text-emerald-400">
                        {extractedItems.filter(i => i.is_verified).length}
                    </p>
                    <p className="text-sm text-gray-500">검증된 항목</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
                    <p className="text-2xl font-bold text-white">{categories.length}</p>
                    <p className="text-sm text-gray-500">카테고리</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
                    <p className="text-2xl font-bold text-white">{priceRecords.length}</p>
                    <p className="text-sm text-gray-500">가격 기록</p>
                </div>
            </div>

            {/* 수정 모달 */}
            {isModalOpen && editingItem && (
                <EditModal
                    item={editingItem}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingItem(null);
                    }}
                    onSave={handleSaveEdit}
                    saving={saving}
                />
            )}
        </div>
    );
}

// 수정 모달 컴포넌트
interface EditModalProps {
    item: ExtractedItem;
    onClose: () => void;
    onSave: (data: Partial<ExtractedItem>) => void;
    saving: boolean;
}

function EditModal({ item, onClose, onSave, saving }: EditModalProps) {
    const [formData, setFormData] = useState({
        category: item.category,
        sub_category: item.sub_category || '',
        normalized_item_name: item.normalized_item_name,
        brand: item.brand || '',
        product_grade: item.product_grade || '일반',
        unit: item.unit || '',
        quantity: item.quantity || '',
        unit_price: item.unit_price || '',
        total_price: item.total_price || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value ? Number(value) : null) : value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            category: formData.category,
            sub_category: formData.sub_category || null,
            normalized_item_name: formData.normalized_item_name,
            brand: formData.brand || null,
            product_grade: formData.product_grade || null,
            unit: formData.unit || null,
            quantity: formData.quantity ? Number(formData.quantity) : null,
            unit_price: formData.unit_price ? Number(formData.unit_price) : null,
            total_price: formData.total_price ? Number(formData.total_price) : null,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">시장 단가 수정</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">카테고리 *</label>
                            <input
                                type="text"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">서브 카테고리</label>
                            <input
                                type="text"
                                name="sub_category"
                                value={formData.sub_category}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">항목명 *</label>
                        <input
                            type="text"
                            name="normalized_item_name"
                            value={formData.normalized_item_name}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">브랜드</label>
                            <input
                                type="text"
                                name="brand"
                                value={formData.brand}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">등급</label>
                            <select
                                name="product_grade"
                                value={formData.product_grade}
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

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">단위</label>
                            <input
                                type="text"
                                name="unit"
                                value={formData.unit}
                                onChange={handleChange}
                                placeholder="예: ㎡, M, 개"
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">수량</label>
                            <input
                                type="number"
                                name="quantity"
                                value={formData.quantity}
                                onChange={handleChange}
                                step="0.01"
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">단가 (원)</label>
                            <input
                                type="number"
                                name="unit_price"
                                value={formData.unit_price}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">총액 (원)</label>
                        <input
                            type="number"
                            name="total_price"
                            value={formData.total_price}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                        />
                    </div>

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

// 그룹화된 아이템 타입
interface GroupedItem {
    key: string;
    category: string;
    subCategory: string | null;
    itemName: string;
    brand: string | null;
    latestPrice: number | null;
    latestDate: string;
    isStandardReflected: boolean;
    recordCount: number;
    records: ExtractedItem[];
}

// 가격 기록 탭 컴포넌트
interface PriceHistoryTabProps {
    verifiedItems: ExtractedItem[];  // 검증완료된 항목 (표준 단가)
    allItems: ExtractedItem[];       // 전체 항목 (미검증 시장가 비교용)
    formatPrice: (price: number | null | undefined) => string;
    formatDate: (date: string) => string;
}

function PriceHistoryTab({ verifiedItems, allItems, formatPrice, formatDate }: PriceHistoryTabProps) {
    const [selectedGroup, setSelectedGroup] = useState<GroupedItem | null>(null);
    const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);

    // 미검증 항목의 최신 시장가 맵 생성
    const latestMarketPriceMap = useMemo(() => {
        const unverifiedItems = allItems.filter(i => !i.is_verified);
        const priceMap = new Map<string, { price: number; date: string }>();

        unverifiedItems.forEach(item => {
            const key = item.original_item_name;
            const price = item.unit_price ||
                (item.total_price && item.quantity ? Math.round(item.total_price / item.quantity) : null);

            if (price) {
                const existing = priceMap.get(key);
                if (!existing || new Date(item.created_at) > new Date(existing.date)) {
                    priceMap.set(key, { price, date: item.created_at });
                }
            }
        });

        return priceMap;
    }, [allItems]);

    // 검증된 아이템 그룹화 (브랜드, 카테고리, 원본항목명, 서브카테고리 기준)
    const groupedItems: GroupedItem[] = useMemo(() => {
        const groups = new Map<string, ExtractedItem[]>();

        verifiedItems.forEach(item => {
            const key = `${item.category}|${item.sub_category || ''}|${item.original_item_name}|${item.brand || ''}`;

            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(item);
        });

        return Array.from(groups.entries()).map(([key, records]) => {
            const sortedRecords = [...records].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            const latest = sortedRecords[0];
            const latestPrice = latest.unit_price ||
                (latest.total_price && latest.quantity ? Math.round(latest.total_price / latest.quantity) : null);

            return {
                key,
                category: latest.category,
                subCategory: latest.sub_category || null,
                itemName: latest.original_item_name,
                brand: latest.brand || null,
                latestPrice,
                latestDate: latest.created_at,
                isStandardReflected: true,
                recordCount: records.length,
                records: sortedRecords,
            };
        }).sort((a, b) => b.recordCount - a.recordCount);
    }, [verifiedItems]);

    // 현재 시장가와 표준가 비교
    const getMarketComparison = (group: GroupedItem): { marketPrice: number; diff: number; percent: number; date: string } | null => {
        const marketData = latestMarketPriceMap.get(group.itemName);
        if (!marketData || !group.latestPrice) return null;

        const diff = marketData.price - group.latestPrice;
        const percent = ((marketData.price - group.latestPrice) / group.latestPrice) * 100;

        return {
            marketPrice: marketData.price,
            diff,
            percent,
            date: marketData.date
        };
    };

    const openGraphModal = (group: GroupedItem) => {
        setSelectedGroup(group);
        setIsGraphModalOpen(true);
    };

    return (
        <>
            <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300 w-12">#</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">아이템명</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">표준 단가</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">현재 시장가</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">변동</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">기록 수</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">작업</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {groupedItems.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                                    <div className="mb-4 text-4xl">📈</div>
                                    <p className="text-lg font-medium mb-2">가격 기록이 없습니다</p>
                                    <p className="text-sm">
                                        시장 단가 항목을 검증하면<br />
                                        표준 단가로 등록됩니다.
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            groupedItems.map((group, index) => {
                                const comparison = getMarketComparison(group);
                                return (
                                    <tr key={group.key} className="hover:bg-white/5">
                                        <td className="px-4 py-3 text-center text-gray-500 text-sm">{index + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="text-white font-medium">{group.itemName}</div>
                                            <div className="text-gray-500 text-xs">
                                                {group.category}
                                                {group.subCategory && ` > ${group.subCategory}`}
                                                {group.brand && ` · ${group.brand}`}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-white">
                                            {group.latestPrice ? (
                                                <>₩{formatPrice(group.latestPrice)}</>
                                            ) : (
                                                <span className="text-gray-500">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono">
                                            {comparison ? (
                                                <div>
                                                    <span className={comparison.percent > 0 ? 'text-red-400' : comparison.percent < 0 ? 'text-emerald-400' : 'text-gray-400'}>
                                                        ₩{formatPrice(comparison.marketPrice)}
                                                    </span>
                                                    <div className="text-gray-500 text-xs mt-0.5">
                                                        {formatDate(comparison.date)}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 text-xs">신규 시장가 없음</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {comparison ? (
                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${comparison.percent > 0 ? 'bg-red-500/20 text-red-400' :
                                                    comparison.percent < 0 ? 'bg-emerald-500/20 text-emerald-400' :
                                                        'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {comparison.percent > 0 ? '🔺' : comparison.percent < 0 ? '🔻' : ''}
                                                    {comparison.percent > 0 ? '+' : ''}{comparison.percent.toFixed(1)}%
                                                </span>
                                            ) : (
                                                <span className="text-gray-500 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-block px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                                                {group.recordCount}건
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => openGraphModal(group)}
                                                className="px-3 py-1 rounded text-sm bg-white/10 text-white hover:bg-white/20 transition-colors"
                                                disabled={group.recordCount < 2}
                                                title={group.recordCount < 2 ? "2건 이상의 기록이 필요합니다" : "가격 변동 그래프 보기"}
                                            >
                                                📈 그래프
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* 가격 변동 그래프 모달 */}
            {isGraphModalOpen && selectedGroup && (
                <PriceGraphModal
                    group={selectedGroup}
                    formatPrice={formatPrice}
                    formatDate={formatDate}
                    onClose={() => {
                        setIsGraphModalOpen(false);
                        setSelectedGroup(null);
                    }}
                />
            )}
        </>
    );
}

// 가격 변동 그래프 모달
interface PriceGraphModalProps {
    group: GroupedItem;
    formatPrice: (price: number | null | undefined) => string;
    formatDate: (date: string) => string;
    onClose: () => void;
}

function PriceGraphModal({ group, formatPrice, formatDate, onClose }: PriceGraphModalProps) {
    // 날짜순 정렬 (오래된 것이 먼저 - 그래프용)
    const sortedRecords = [...group.records].sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // 단가 계산
    const priceData = sortedRecords.map(record => {
        const price = record.unit_price ||
            (record.total_price && record.quantity ? Math.round(record.total_price / record.quantity) : 0);
        return {
            date: formatDate(record.created_at),
            price,
            isVerified: record.is_verified,
        };
    });

    // 가격 범위 계산
    const prices = priceData.map(d => d.price).filter(p => p > 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">📈 가격 변동 추이</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            {group.itemName}
                            <span className="text-gray-500 ml-2">
                                ({group.category}{group.subCategory && ` > ${group.subCategory}`})
                            </span>
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white">
                        ✕
                    </button>
                </div>

                <div className="p-6">
                    {/* 간단한 텍스트 기반 그래프 */}
                    <div className="mb-6 p-4 bg-white/5 rounded-lg">
                        <div className="flex justify-between text-xs text-gray-500 mb-2">
                            <span>₩{formatPrice(maxPrice)}</span>
                        </div>
                        <div className="relative h-40 border-l border-b border-white/20">
                            <div className="absolute inset-0 flex items-end justify-around">
                                {priceData.map((data, index) => {
                                    const height = prices.length > 0
                                        ? ((data.price - minPrice) / priceRange * 100) + 10
                                        : 50;
                                    return (
                                        <div key={index} className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
                                            <div
                                                className={`w-4 rounded-t transition-all ${data.isVerified ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                style={{ height: `${height}%` }}
                                                title={`₩${formatPrice(data.price)}`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                            <span>₩{formatPrice(minPrice)}</span>
                        </div>
                        <div className="flex justify-around mt-2">
                            {priceData.map((data, index) => (
                                <span key={index} className="text-xs text-gray-500" style={{ flex: 1, textAlign: 'center' }}>
                                    {data.date.split('.').slice(1, 3).join('/')}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* 기록 목록 */}
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">상세 기록</h3>
                    <div className="space-y-2">
                        {sortedRecords.map((record, index) => {
                            const price = record.unit_price ||
                                (record.total_price && record.quantity ? Math.round(record.total_price / record.quantity) : null);

                            return (
                                <div key={record.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-500 text-sm w-6">{index + 1}</span>
                                        <span className="text-gray-400 text-sm">{formatDate(record.created_at)}</span>
                                        {record.is_verified && (
                                            <span className="inline-block px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400">
                                                검증됨
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-mono text-white">
                                        {price ? `₩${formatPrice(price)}` : '-'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
