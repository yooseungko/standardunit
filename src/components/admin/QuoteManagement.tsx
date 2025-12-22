"use client";

import { useState, useEffect } from "react";
import { Quote, QuoteStatus } from "@/types/quote";
import QuoteEditor from "./QuoteEditor";

// 상태별 색상
const STATUS_COLORS: Record<QuoteStatus, { bg: string; text: string; label: string }> = {
    draft: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: '작성중' },
    confirmed: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '확정' },
    sent: { bg: 'bg-green-500/20', text: 'text-green-400', label: '발송완료' },
    accepted: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '승인됨' },
    rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: '거절됨' },
    expired: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '만료' },
};

export default function QuoteManagement() {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
    const [editMode, setEditMode] = useState(false); // 편집 모드
    const [sending, setSending] = useState(false);
    const [filterStatus, setFilterStatus] = useState<QuoteStatus | 'all'>('all');

    // 견적서 목록 조회
    const fetchQuotes = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filterStatus !== 'all') {
                params.append('status', filterStatus);
            }

            const response = await fetch(`/api/quotes?${params.toString()}`);
            const result = await response.json();

            if (result.success) {
                setQuotes(result.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch quotes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotes();
    }, [filterStatus]);

    // 견적서 발송
    const handleSendQuote = async (quote: Quote) => {
        if (!quote.customer_email) {
            alert('고객 이메일이 없습니다.');
            return;
        }

        try {
            setSending(true);
            const response = await fetch('/api/quotes/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quote_id: quote.id,
                    recipient_email: quote.customer_email,
                    recipient_name: quote.customer_name,
                }),
            });

            const result = await response.json();

            if (result.success) {
                alert('✅ 견적서가 발송되었습니다!');
                fetchQuotes(); // 목록 새로고침
                setSelectedQuote(null);
            } else {
                alert('❌ 발송 실패: ' + result.error);
            }
        } catch (error) {
            console.error('Send error:', error);
            alert('발송 중 오류가 발생했습니다.');
        } finally {
            setSending(false);
        }
    };

    // 견적서 삭제
    const handleDeleteQuote = async (quoteId: string) => {
        try {
            const response = await fetch(`/api/quotes?id=${quoteId}`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (result.success) {
                setQuotes(quotes.filter(q => q.id !== quoteId));
                setSelectedQuote(null);
            } else {
                alert('삭제 실패: ' + result.error);
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    // 금액 포맷
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('ko-KR').format(amount);
    };

    // ⭐ 견적서 항목 기반 최종금액 계산 (items의 total_price 합계 - 할인 + VAT)
    const calculateFinalAmount = (quote: Quote) => {
        if (!quote.items || quote.items.length === 0) {
            // items가 없으면 DB 저장값 사용
            return quote.final_amount;
        }

        // 포함된 항목만 합산
        const totalAmount = quote.items
            .filter(item => item.is_included !== false)
            .reduce((sum, item) => sum + (item.total_price || 0), 0);

        // 할인 및 VAT 적용
        const discountAmount = quote.discount_amount || 0;
        const vatAmount = quote.vat_amount || 0;

        return totalAmount - discountAmount + vatAmount;
    };

    // 날짜 포맷
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">견적서 관리</h2>
                    <p className="text-gray-400 mt-1">
                        생성된 견적서를 관리하고 발송할 수 있습니다
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* 상태 필터 */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as QuoteStatus | 'all')}
                        className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="all">전체 상태</option>
                        <option value="draft">작성중</option>
                        <option value="confirmed">확정</option>
                        <option value="sent">발송완료</option>
                        <option value="accepted">승인됨</option>
                        <option value="rejected">거절됨</option>
                        <option value="expired">만료</option>
                    </select>
                    <button
                        onClick={fetchQuotes}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                    >
                        🔄 새로고침
                    </button>
                </div>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">전체 견적서</p>
                    <p className="text-2xl font-bold text-white mt-1">{quotes.length}건</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">발송 대기</p>
                    <p className="text-2xl font-bold text-blue-400 mt-1">
                        {quotes.filter(q => q.status === 'draft' || q.status === 'confirmed').length}건
                    </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">발송 완료</p>
                    <p className="text-2xl font-bold text-green-400 mt-1">
                        {quotes.filter(q => q.status === 'sent').length}건
                    </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">총 견적 금액</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">
                        ₩{formatMoney(quotes.reduce((sum, q) => sum + calculateFinalAmount(q), 0))}
                    </p>
                </div>
            </div>

            {/* 견적서 목록 */}
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full mx-auto" />
                        <p className="text-gray-400 mt-4">견적서 목록을 불러오는 중...</p>
                    </div>
                ) : quotes.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-5xl mb-4">📋</p>
                        <p className="text-gray-400">아직 생성된 견적서가 없습니다</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">견적번호</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">고객명</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">면적</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">최종금액</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">상태</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">생성일</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">작업</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {quotes.map((quote) => {
                                const status = STATUS_COLORS[quote.status] || STATUS_COLORS.draft;
                                return (
                                    <tr
                                        key={quote.id}
                                        className="hover:bg-white/5 cursor-pointer transition-colors"
                                        onClick={() => setSelectedQuote(quote)}
                                    >
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-white">{quote.quote_number}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-white font-medium">{quote.customer_name || '-'}</p>
                                            <p className="text-gray-500 text-sm">{quote.customer_email || '-'}</p>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400">
                                            {quote.property_size ? `${quote.property_size}㎡` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-white font-bold">
                                                ₩{formatMoney(calculateFinalAmount(quote))}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">
                                            {formatDate(quote.created_at)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {quote.status !== 'sent' && quote.customer_email && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSendQuote(quote);
                                                        }}
                                                        disabled={sending}
                                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        📧 발송
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteQuote(quote.id);
                                                    }}
                                                    className="px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm rounded-lg transition-colors"
                                                >
                                                    🗑️
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.open(`/q/${quote.id}`, '_blank');
                                                    }}
                                                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-gray-300 text-sm rounded-lg transition-colors"
                                                    title="웹뷰 미리보기"
                                                >
                                                    🔍
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 견적서 상세/편집 모달 */}
            {selectedQuote && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
                        {/* 모달 헤더 */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white">
                                        {selectedQuote.quote_number}
                                    </h3>
                                    <p className="text-gray-400 mt-1">
                                        {selectedQuote.customer_name} | {selectedQuote.customer_email}
                                    </p>
                                </div>
                                {/* 편집 모드 토글 */}
                                <button
                                    onClick={() => setEditMode(!editMode)}
                                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${editMode
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white/10 text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {editMode ? '✏️ 편집 중' : '✏️ 편집'}
                                </button>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedQuote(null);
                                    setEditMode(false);
                                }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <span className="text-2xl text-gray-400">×</span>
                            </button>
                        </div>

                        {/* 모달 본문 */}
                        <div className="p-6 overflow-y-auto max-h-[70vh]">
                            {editMode ? (
                                /* 편집 모드: QuoteEditor 사용 */
                                <QuoteEditor
                                    initialQuote={selectedQuote}
                                    onQuoteSent={() => {
                                        fetchQuotes();
                                        setSelectedQuote(null);
                                        setEditMode(false);
                                    }}
                                    onClose={() => {
                                        setSelectedQuote(null);
                                        setEditMode(false);
                                    }}
                                />
                            ) : (
                                /* 보기 모드 */
                                <div className="space-y-6">
                                    {/* 금액 요약 */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-white/5 p-4 rounded-lg">
                                            <p className="text-gray-400 text-sm">인건비</p>
                                            <p className="text-lg font-bold text-white">₩{formatMoney(selectedQuote.labor_cost)}</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-lg">
                                            <p className="text-gray-400 text-sm">자재비</p>
                                            <p className="text-lg font-bold text-white">₩{formatMoney(selectedQuote.material_cost)}</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-lg">
                                            <p className="text-gray-400 text-sm">할인</p>
                                            <p className="text-lg font-bold text-red-400">-₩{formatMoney(selectedQuote.discount_amount)}</p>
                                        </div>
                                        <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/30">
                                            <p className="text-gray-400 text-sm">최종 금액</p>
                                            <p className="text-lg font-bold text-emerald-400">₩{formatMoney(calculateFinalAmount(selectedQuote))}</p>
                                        </div>
                                    </div>

                                    {/* 견적 항목 */}
                                    {selectedQuote.items && selectedQuote.items.length > 0 ? (
                                        <div>
                                            <h4 className="text-white font-medium mb-3">📋 견적 항목 ({selectedQuote.items.length}개)</h4>
                                            <div className="bg-white/5 rounded-lg overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-white/5">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left text-gray-400">카테고리</th>
                                                            <th className="px-3 py-2 text-left text-gray-400">항목</th>
                                                            <th className="px-3 py-2 text-right text-gray-400">수량</th>
                                                            <th className="px-3 py-2 text-right text-gray-400">단가</th>
                                                            <th className="px-3 py-2 text-right text-gray-400">금액</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {selectedQuote.items.map((item) => (
                                                            <tr key={item.id}>
                                                                <td className="px-3 py-2 text-gray-400">{item.category}</td>
                                                                <td className="px-3 py-2 text-white">{item.item_name}</td>
                                                                <td className="px-3 py-2 text-right text-gray-400">
                                                                    {item.quantity} {item.unit}
                                                                </td>
                                                                <td className="px-3 py-2 text-right text-gray-400">
                                                                    ₩{formatMoney(item.unit_price)}
                                                                </td>
                                                                <td className="px-3 py-2 text-right text-white font-medium">
                                                                    ₩{formatMoney(item.total_price)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-400">
                                            <p>견적 항목이 없습니다.</p>
                                            <button
                                                onClick={() => setEditMode(true)}
                                                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                                            >
                                                ✏️ 항목 추가하기
                                            </button>
                                        </div>
                                    )}

                                    {/* 메모 */}
                                    {selectedQuote.notes && (
                                        <div>
                                            <h4 className="text-white font-medium mb-2">📝 메모</h4>
                                            <p className="text-gray-400 bg-white/5 p-4 rounded-lg">{selectedQuote.notes}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 모달 푸터 (보기 모드에서만) */}
                        {!editMode && (
                            <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                                <button
                                    onClick={() => setEditMode(true)}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                                >
                                    ✏️ 수정
                                </button>
                                <button
                                    onClick={() => setSelectedQuote(null)}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                                >
                                    닫기
                                </button>
                                {selectedQuote.customer_email && (
                                    <button
                                        onClick={() => handleSendQuote(selectedQuote)}
                                        disabled={sending}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {sending ? (
                                            <>
                                                <span className="animate-spin">⏳</span>
                                                발송 중...
                                            </>
                                        ) : (
                                            <>
                                                📧 이메일 발송
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
