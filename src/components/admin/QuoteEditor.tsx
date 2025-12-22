"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Quote, QuoteItem, FloorplanAnalysisResult, QUOTE_CATEGORIES, QuoteVersion } from "@/types/quote";
import StandardPricingPanel from "./StandardPricingPanel";
import QuoteVersionHistory from "./QuoteVersionHistory";

interface QuoteEditorProps {
    estimateId?: number;
    floorplanId?: string;
    analysisResult?: FloorplanAnalysisResult | null;
    initialQuote?: Quote | null; // 기존 견적서 수정용
    manualMode?: boolean; // 도면 없이 수동 입력 모드 (수량 1로 시작)
    onQuoteGenerated?: (quote: Quote) => void;
    onQuoteSent?: () => void;
    onClose?: () => void;
}

export default function QuoteEditor({
    estimateId,
    floorplanId,
    analysisResult,
    initialQuote,
    manualMode = false,
    onQuoteGenerated,
    onQuoteSent,
    onClose,
}: QuoteEditorProps) {
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [sending, setSending] = useState(false);
    const [upgradingGrade, setUpgradingGrade] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [quote, setQuote] = useState<Quote | null>(initialQuote || null);
    const [items, setItems] = useState<QuoteItem[]>(initialQuote?.items || []);
    const [currentGrade, setCurrentGrade] = useState<'일반' | '중급' | '고급'>('일반');

    // 할인 설정
    const [discountPercent, setDiscountPercent] = useState(0);
    const [includeVat, setIncludeVat] = useState(true);
    const [notes, setNotes] = useState(initialQuote?.notes || "");

    // AI 코멘트 편집
    const [calculationComment, setCalculationComment] = useState(initialQuote?.calculation_comment || "");
    const [isEditingComment, setIsEditingComment] = useState(false);

    // 수정 모드
    const [editingItemId, setEditingItemId] = useState<string | null>(null);

    // 표준단가 패널 및 견적서 테이블 접기
    const [isPricingPanelOpen, setIsPricingPanelOpen] = useState(false);
    const [isQuoteTableCollapsed, setIsQuoteTableCollapsed] = useState(false);

    // 버전 히스토리 패널
    const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
    const [savingVersion, setSavingVersion] = useState(false);

    // 자재 등급 변경 함수
    const upgradeToGrade = async (targetGrade: '일반' | '중급' | '고급') => {
        if (!quote) return;

        try {
            setUpgradingGrade(true);
            setError(null);

            // API 호출하여 해당 등급의 자재로 변환된 새 견적서 생성
            const response = await fetch('/api/quotes/upgrade-grade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quote_id: quote.id,
                    target_grade: targetGrade,
                }),
            });

            const result = await response.json();

            if (result.success) {
                // 새 견적서로 업데이트
                setQuote(result.data);
                setItems(result.data.items || []);
                setCurrentGrade(targetGrade);
                alert(`✅ ${targetGrade} 등급으로 견적서가 생성되었습니다!`);
            } else {
                setError(result.error || '등급 변경 실패');
            }
        } catch (err) {
            console.error('Grade upgrade error:', err);
            setError('등급 변경 중 오류가 발생했습니다.');
        } finally {
            setUpgradingGrade(false);
        }
    };

    // initialQuote가 변경되면 상태 업데이트
    useEffect(() => {
        if (initialQuote) {
            setQuote(initialQuote);
            setItems(initialQuote.items || []);
            setNotes(initialQuote.notes || "");
            setCalculationComment(initialQuote.calculation_comment || "");
            // 할인율 역계산
            if (initialQuote.total_amount && initialQuote.discount_amount) {
                setDiscountPercent(Math.round((initialQuote.discount_amount / initialQuote.total_amount) * 100));
            }
            setIncludeVat(initialQuote.vat_amount > 0);
        }
    }, [initialQuote]);

    // 견적서 생성
    const generateQuote = async () => {
        try {
            setGenerating(true);
            setError(null);

            const response = await fetch('/api/quotes/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    estimate_id: estimateId,
                    floorplan_id: floorplanId,
                    analysis_result: analysisResult,
                    manual_mode: manualMode, // 수동 모드일 때 수량 1로 시작
                    options: {
                        discountPercent,
                        includeVat,
                        validDays: 14,
                    },
                }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || '견적서 생성 실패');
            }

            setQuote(result.data);
            setItems(result.data.items || []);
            setNotes(result.data.notes || "");
            setCalculationComment(result.data.calculation_comment || "");
            onQuoteGenerated?.(result.data);

        } catch (err) {
            setError(err instanceof Error ? err.message : '견적서 생성에 실패했습니다.');
        } finally {
            setGenerating(false);
        }
    };

    // 현재 견적서를 버전으로 저장 (백업)
    const saveCurrentVersion = async (reason: string = '수정') => {
        if (!quote) return;

        try {
            setSavingVersion(true);
            await fetch('/api/quotes/versions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quote_id: quote.id,
                    reason: reason,
                }),
            });
        } catch (err) {
            console.error('Version save error:', err);
            // 버전 저장 실패해도 진행
        } finally {
            setSavingVersion(false);
        }
    };

    // 견적서 업데이트
    const updateQuote = async () => {
        if (!quote) return;

        try {
            setLoading(true);
            setError(null);

            // ⭐ 저장 전 현재 버전을 자동 백업
            await saveCurrentVersion('수정 전 자동 저장');

            const response = await fetch('/api/quotes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: quote.id,
                    items: items,
                    notes,
                    calculation_comment: calculationComment, // 수정된 AI 코멘트
                    discount_amount: Math.round(totalAmount * (discountPercent / 100)),
                    discount_reason: discountPercent > 0 ? `${discountPercent}% 할인` : null,
                    vat_amount: includeVat ? Math.round((totalAmount - Math.round(totalAmount * (discountPercent / 100))) * 0.1) : 0,
                }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || '저장 실패');
            }

            setQuote(result.data);
            setItems(result.data.items || items);

        } catch (err) {
            setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 롤백 처리 콜백
    const handleRollback = async (version: QuoteVersion) => {
        // 롤백 후 현재 견적서 새로고침
        try {
            const response = await fetch(`/api/quotes?id=${quote?.id}`);
            const result = await response.json();
            if (result.success && result.data) {
                setQuote(result.data);
                setItems(result.data.items || []);
                setNotes(result.data.notes || "");
                setCalculationComment(result.data.calculation_comment || "");
            }
        } catch (err) {
            console.error('Refresh after rollback error:', err);
        }
    };

    // 견적서 발송
    const sendQuote = async () => {
        if (!quote) return;

        try {
            setSending(true);
            setError(null);

            // 먼저 저장
            await updateQuote();

            const response = await fetch('/api/quotes/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quote_id: quote.id,
                    send_type: 'email',
                }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || '발송 실패');
            }

            alert('견적서가 성공적으로 발송되었습니다!');
            onQuoteSent?.();

        } catch (err) {
            setError(err instanceof Error ? err.message : '견적서 발송에 실패했습니다.');
        } finally {
            setSending(false);
        }
    };

    // 항목 수정
    const updateItem = (itemId: string, field: keyof QuoteItem, value: unknown) => {
        setItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;

            const updated = { ...item, [field]: value };

            // 수량이나 단가 변경 시 총액 재계산
            if (field === 'quantity' || field === 'unit_price') {
                updated.total_price = Math.round(
                    (updated.quantity as number) * (updated.unit_price as number)
                );
            }

            return updated as QuoteItem;
        }));
    };

    // 항목 포함/제외 토글
    const toggleItemIncluded = (itemId: string) => {
        setItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, is_included: !item.is_included } : item
        ));
    };

    // 항목 삭제
    const removeItem = (itemId: string) => {
        setItems(prev => prev.filter(item => item.id !== itemId));
    };

    // 새 항목 추가
    const addItem = () => {
        const newItem: Partial<QuoteItem> = {
            id: `new-${Date.now()}`,
            quote_id: quote?.id || '',
            category: '기타',
            item_name: '새 항목',
            quantity: 1,
            unit: '식',
            unit_price: 0,
            total_price: 0,
            cost_type: 'composite',
            labor_ratio: 0.3,
            sort_order: items.length,
            is_optional: false,
            is_included: true,
        };
        setItems(prev => [...prev, newItem as QuoteItem]);
        setEditingItemId(newItem.id!);
    };

    // 금액 계산
    const includedItems = useMemo(() =>
        items.filter(item => item.is_included !== false),
        [items]
    );

    const totalAmount = useMemo(() =>
        includedItems.reduce((sum, item) => sum + (item.total_price || 0), 0),
        [includedItems]
    );

    const laborCost = useMemo(() => {
        return includedItems.reduce((sum, item) => {
            if (item.cost_type === 'labor') return sum + item.total_price;
            if (item.cost_type === 'composite') {
                return sum + Math.round(item.total_price * (item.labor_ratio || 0.3));
            }
            return sum;
        }, 0);
    }, [includedItems]);

    const materialCost = useMemo(() => totalAmount - laborCost, [totalAmount, laborCost]);

    const discountAmount = useMemo(() =>
        Math.round(totalAmount * (discountPercent / 100)),
        [totalAmount, discountPercent]
    );

    const vatAmount = useMemo(() =>
        includeVat ? Math.round((totalAmount - discountAmount) * 0.1) : 0,
        [totalAmount, discountAmount, includeVat]
    );

    const finalAmount = useMemo(() =>
        totalAmount - discountAmount + vatAmount,
        [totalAmount, discountAmount, vatAmount]
    );

    // 금액 포맷
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('ko-KR').format(price);
    };

    // 카테고리별 그룹핑
    const itemsByCategory = useMemo(() => {
        const grouped: Record<string, QuoteItem[]> = {};
        items.forEach(item => {
            if (!grouped[item.category]) {
                grouped[item.category] = [];
            }
            grouped[item.category].push(item);
        });
        return grouped;
    }, [items]);

    return (
        <div className="space-y-6">
            {/* 견적서 생성 버튼 */}
            {!quote && (
                <div className="text-center py-8">
                    <p className="text-gray-400 mb-4">
                        도면 분석이 완료되면 견적서를 생성할 수 있습니다.
                    </p>
                    <button
                        onClick={generateQuote}
                        disabled={generating}
                        className={`px-6 py-3 rounded-lg font-medium transition-all ${generating
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-500'
                            }`}
                    >
                        {generating ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                견적서 생성 중...
                            </span>
                        ) : (
                            '📋 견적서 자동 생성'
                        )}
                    </button>
                </div>
            )}

            {/* 에러 메시지 */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                    {error}
                </div>
            )}

            {/* 견적서 편집 */}
            {quote && (
                <div className="space-y-6">
                    {/* 헤더 */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-white">
                                견적서 {quote.quote_number}
                            </h3>
                            <p className="text-gray-400 text-sm">
                                {quote.customer_name}님 | {quote.property_size}㎡
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${quote.status === 'draft' ? 'bg-gray-500/20 text-gray-400' :
                                quote.status === 'sent' ? 'bg-blue-500/20 text-blue-400' :
                                    quote.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                                        'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                {quote.status === 'draft' ? '작성중' :
                                    quote.status === 'sent' ? '발송완료' :
                                        quote.status === 'accepted' ? '수락됨' : quote.status}
                            </span>
                        </div>
                    </div>

                    {/* 자재 등급 선택 */}
                    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-white font-medium">📦 자재 등급</h4>
                                <p className="text-gray-400 text-sm">등급에 따라 자재/제품이 변경됩니다</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => upgradeToGrade('일반')}
                                    disabled={upgradingGrade || currentGrade === '일반'}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentGrade === '일반'
                                        ? 'bg-gray-600 text-white ring-2 ring-gray-400'
                                        : 'bg-gray-600/50 text-gray-300 hover:bg-gray-600'
                                        } disabled:opacity-50`}
                                >
                                    일반
                                </button>
                                <button
                                    onClick={() => upgradeToGrade('중급')}
                                    disabled={upgradingGrade || currentGrade === '중급'}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentGrade === '중급'
                                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                        : 'bg-blue-600/50 text-blue-200 hover:bg-blue-600'
                                        } disabled:opacity-50`}
                                >
                                    중급
                                </button>
                                <button
                                    onClick={() => upgradeToGrade('고급')}
                                    disabled={upgradingGrade || currentGrade === '고급'}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentGrade === '고급'
                                        ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                                        : 'bg-amber-600/50 text-amber-200 hover:bg-amber-600'
                                        } disabled:opacity-50`}
                                >
                                    ⭐ 고급
                                </button>
                            </div>
                        </div>
                        {upgradingGrade && (
                            <div className="mt-3 flex items-center gap-2 text-purple-400">
                                <span className="animate-spin">⏳</span>
                                <span>등급 변경 중...</span>
                            </div>
                        )}
                    </div>

                    {/* AI 계산 설명 */}
                    {(quote.calculation_comment || calculationComment) && (
                        <details className="bg-blue-500/10 border border-blue-500/30 rounded-xl overflow-hidden" open={isEditingComment}>
                            <summary className="px-6 py-4 cursor-pointer hover:bg-blue-500/20 transition-colors flex items-center justify-between">
                                <div>
                                    <span className="text-blue-400 font-medium">🤖 AI 계산 설명</span>
                                    <span className="text-gray-400 text-sm ml-2">
                                        (이메일에 포함됨)
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIsEditingComment(!isEditingComment);
                                    }}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${isEditingComment
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white/10 text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {isEditingComment ? '✓ 편집 완료' : '✏️ 수정'}
                                </button>
                            </summary>
                            <div className="px-6 py-4 border-t border-blue-500/20 bg-black/20">
                                {isEditingComment ? (
                                    /* 편집 모드 */
                                    <div>
                                        <textarea
                                            value={calculationComment}
                                            onChange={(e) => setCalculationComment(e.target.value)}
                                            className="w-full h-64 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="AI 분석 코멘트를 입력하세요..."
                                        />
                                        <p className="text-gray-500 text-xs mt-2">
                                            💡 마크다운 형식 사용: ## 제목, - **항목**: 설명, - 목록
                                        </p>
                                    </div>
                                ) : (
                                    /* 보기 모드 */
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        {calculationComment.split('\n').map((line, idx) => {
                                            // 마크다운 스타일 적용
                                            if (line.startsWith('## ')) {
                                                return <h3 key={idx} className="text-lg font-bold text-white mt-4 mb-2">{line.replace('## ', '')}</h3>;
                                            } else if (line.startsWith('- **')) {
                                                const match = line.match(/- \*\*(.+?)\*\*: (.+)/);
                                                if (match) {
                                                    return (
                                                        <p key={idx} className="text-gray-300 ml-4 mb-1">
                                                            <span className="text-white font-medium">{match[1]}</span>: {match[2]}
                                                        </p>
                                                    );
                                                }
                                                return <p key={idx} className="text-gray-300 ml-4 mb-1">{line.replace('- **', '').replace('**', '')}</p>;
                                            } else if (line.startsWith('- ')) {
                                                return <p key={idx} className="text-gray-400 ml-4 mb-1">{line.replace('- ', '• ')}</p>;
                                            } else if (line.startsWith('*') && line.endsWith('*')) {
                                                return <p key={idx} className="text-gray-500 text-xs italic mt-4">{line.replace(/\*/g, '')}</p>;
                                            } else if (line === '---') {
                                                return <hr key={idx} className="border-gray-700 my-4" />;
                                            } else if (line.trim()) {
                                                return <p key={idx} className="text-gray-300">{line}</p>;
                                            }
                                            return null;
                                        })}
                                    </div>
                                )}
                            </div>
                        </details>
                    )}

                    {/* 📜 버전 히스토리 */}
                    <QuoteVersionHistory
                        quoteId={quote.id}
                        onRollback={handleRollback}
                        isOpen={isVersionHistoryOpen}
                        onToggle={() => setIsVersionHistoryOpen(!isVersionHistoryOpen)}
                    />

                    {/* 표준단가에서 항목 추가 */}
                    <StandardPricingPanel
                        isOpen={isPricingPanelOpen}
                        onToggle={() => setIsPricingPanelOpen(!isPricingPanelOpen)}
                        onAddItem={(newItem) => {
                            setItems(prev => [...prev, {
                                ...newItem,
                                quote_id: quote?.id || '',
                                sort_order: prev.length,
                                is_optional: false,
                                created_at: new Date().toISOString(),
                            } as QuoteItem]);
                        }}
                    />

                    {/* 공정별 항목 테이블 - 접기 가능 */}
                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                        {/* 테이블 헤더 - 클릭하여 접기/펴기 */}
                        <div className="w-full px-4 py-3 bg-white/5 flex items-center justify-between">
                            <button
                                onClick={() => setIsQuoteTableCollapsed(!isQuoteTableCollapsed)}
                                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                            >
                                <span className="text-lg">📋</span>
                                <span className="text-white font-medium">견적 항목</span>
                                <span className="text-gray-400 text-sm">
                                    ({items.length}개 항목 / 합계 ₩{formatPrice(totalAmount)})
                                </span>
                                <span className={`text-gray-400 transition-transform ${isQuoteTableCollapsed ? '' : 'rotate-180'}`}>
                                    ▼
                                </span>
                            </button>
                            {quote && (
                                <button
                                    onClick={updateQuote}
                                    disabled={loading}
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <span className="animate-spin">⏳</span>
                                            저장 중...
                                        </>
                                    ) : (
                                        <>
                                            💾 변경사항 저장
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* 접혀있을 때 요약 표시 */}
                        {isQuoteTableCollapsed ? (
                            <div className="px-4 py-3 border-t border-white/10 text-gray-400 text-sm">
                                <div className="flex flex-wrap gap-3">
                                    {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
                                        <span key={category} className="px-2 py-1 bg-white/5 rounded">
                                            {category}: ₩{formatPrice(
                                                categoryItems
                                                    .filter(i => i.is_included !== false)
                                                    .reduce((s, i) => s + i.total_price, 0)
                                            )}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* 펼쳐져 있을 때 전체 테이블 */
                            <>
                                <table className="w-full">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">포함</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">카테고리</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">항목명</th>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">사이즈</th>
                                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">수량</th>
                                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">단가</th>
                                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">금액</th>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">작업</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
                                            <React.Fragment key={`category-${category}`}>
                                                {/* 카테고리 헤더 */}
                                                <tr className="bg-white/5">
                                                    <td colSpan={7} className="px-4 py-2 text-white font-medium">
                                                        {category}
                                                    </td>
                                                    <td className="px-4 py-2 text-right text-white font-medium">
                                                        ₩{formatPrice(
                                                            categoryItems
                                                                .filter(i => i.is_included !== false)
                                                                .reduce((s, i) => s + i.total_price, 0)
                                                        )}
                                                    </td>
                                                </tr>
                                                {/* 항목들 */}
                                                {categoryItems.map(item => (
                                                    <tr
                                                        key={item.id}
                                                        className={`hover:bg-white/5 ${item.is_included === false ? 'opacity-50' : ''
                                                            }`}
                                                    >
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={item.is_included !== false}
                                                                onChange={() => toggleItemIncluded(item.id)}
                                                                className="w-4 h-4 rounded"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-400 text-sm">
                                                            {item.sub_category || '-'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {editingItemId === item.id ? (
                                                                <input
                                                                    type="text"
                                                                    value={item.item_name}
                                                                    onChange={e => updateItem(item.id, 'item_name', e.target.value)}
                                                                    className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                                                                    autoFocus
                                                                />
                                                            ) : (
                                                                <div>
                                                                    <p className="text-white">{item.item_name}</p>
                                                                    {item.description && (
                                                                        <p className="text-gray-500 text-xs">{item.description}</p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-gray-400 text-xs">
                                                            {item.size || '-'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {/* 항상 인라인 +/- 수량 조절 */}
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button
                                                                    onClick={() => {
                                                                        const newQty = Math.max(0, item.quantity - 1);
                                                                        updateItem(item.id, 'quantity', newQty);
                                                                    }}
                                                                    className="w-6 h-6 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-bold"
                                                                >
                                                                    −
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    value={item.quantity}
                                                                    onChange={e => updateItem(item.id, 'quantity', Math.max(0, Number(e.target.value)))}
                                                                    className="w-14 px-1 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                    min="0"
                                                                />
                                                                <button
                                                                    onClick={() => {
                                                                        updateItem(item.id, 'quantity', item.quantity + 1);
                                                                    }}
                                                                    className="w-6 h-6 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-bold"
                                                                >
                                                                    +
                                                                </button>
                                                                <span className="text-gray-400 text-xs ml-1">{item.unit}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            {editingItemId === item.id ? (
                                                                <input
                                                                    type="number"
                                                                    value={item.unit_price}
                                                                    onChange={e => updateItem(item.id, 'unit_price', Number(e.target.value))}
                                                                    className="w-24 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm text-right"
                                                                />
                                                            ) : (
                                                                <span className="text-gray-300 font-mono">
                                                                    ₩{formatPrice(item.unit_price)}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono text-white">
                                                            ₩{formatPrice(item.total_price)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                onClick={() => removeItem(item.id)}
                                                                className="px-2 py-1 text-red-400 hover:text-red-300 text-xs"
                                                            >
                                                                삭제
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>

                                {/* 항목 추가 버튼 */}
                                <div className="px-4 py-3 border-t border-white/10">
                                    <button
                                        onClick={addItem}
                                        className="text-blue-400 hover:text-blue-300 text-sm"
                                    >
                                        + 직접 항목 추가
                                    </button>
                                </div>
                            </>
                        )}
                    </div>


                    {/* 금액 요약 및 옵션 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 옵션 */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                            <h4 className="text-white font-medium">⚙️ 견적 옵션</h4>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">할인율 (%)</label>
                                <input
                                    type="number"
                                    value={discountPercent}
                                    onChange={e => setDiscountPercent(Number(e.target.value))}
                                    min={0}
                                    max={100}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="includeVat"
                                    checked={includeVat}
                                    onChange={e => setIncludeVat(e.target.checked)}
                                    className="w-4 h-4 rounded"
                                />
                                <label htmlFor="includeVat" className="text-gray-300">
                                    부가세 포함 (10%)
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">특이사항</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    rows={3}
                                    placeholder="고객에게 전달할 특이사항을 입력하세요"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white resize-none"
                                />
                            </div>
                        </div>

                        {/* 금액 요약 */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                            <h4 className="text-white font-medium">💰 금액 요약</h4>

                            <div className="space-y-2">
                                <div className="flex justify-between text-gray-400">
                                    <span>인건비</span>
                                    <span className="font-mono">₩{formatPrice(laborCost)}</span>
                                </div>
                                <div className="flex justify-between text-gray-400">
                                    <span>자재비</span>
                                    <span className="font-mono">₩{formatPrice(materialCost)}</span>
                                </div>
                                <div className="flex justify-between text-white font-medium pt-2 border-t border-white/10">
                                    <span>소계</span>
                                    <span className="font-mono">₩{formatPrice(totalAmount)}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-red-400">
                                        <span>할인 ({discountPercent}%)</span>
                                        <span className="font-mono">-₩{formatPrice(discountAmount)}</span>
                                    </div>
                                )}
                                {vatAmount > 0 && (
                                    <div className="flex justify-between text-gray-400">
                                        <span>부가세 (10%)</span>
                                        <span className="font-mono">₩{formatPrice(vatAmount)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t-2 border-white/20">
                                <span className="text-lg font-bold text-white">최종 금액</span>
                                <span className="text-2xl font-bold text-white font-mono">
                                    ₩{formatPrice(finalAmount)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex items-center justify-between">
                        {/* 버전 저장 안내 */}
                        <p className="text-gray-500 text-sm">
                            💡 저장 시 이전 버전이 자동으로 백업됩니다
                        </p>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={updateQuote}
                                disabled={loading || savingVersion}
                                className={`px-6 py-3 rounded-lg font-medium transition-all ${loading || savingVersion
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                                    }`}
                            >
                                {savingVersion ? (
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                        버전 저장 중...
                                    </span>
                                ) : loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                        저장 중...
                                    </span>
                                ) : '💾 저장'}
                            </button>
                            <button
                                onClick={sendQuote}
                                disabled={sending || quote.status === 'sent'}
                                className={`px-6 py-3 rounded-lg font-medium transition-all ${sending || quote.status === 'sent'
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-500'
                                    }`}
                            >
                                {sending ? (
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                        발송 중...
                                    </span>
                                ) : quote.status === 'sent' ? (
                                    '✓ 발송 완료'
                                ) : (
                                    '📧 견적서 발송'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
