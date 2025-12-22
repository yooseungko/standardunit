"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface QuoteItem {
    id: string;
    category: string;
    item_name: string;
    description?: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
    is_included: boolean;
}

interface Quote {
    id: string;
    quote_number: string;
    customer_name?: string;
    customer_email?: string;
    property_address?: string;
    property_size?: number;
    labor_cost: number;
    material_cost: number;
    total_amount: number;
    discount_amount: number;
    discount_reason?: string;
    vat_amount: number;
    final_amount: number;
    notes?: string;
    calculation_comment?: string;
    valid_until?: string;
    created_at: string;
    items: QuoteItem[];
}

function formatPrice(price: number): string {
    return new Intl.NumberFormat("ko-KR").format(price);
}

export default function QuoteViewPage() {
    const params = useParams();
    const quoteId = params.id as string;

    const [quote, setQuote] = useState<Quote | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!quoteId) return;

        async function fetchQuote() {
            try {
                const response = await fetch(`/api/quotes?id=${quoteId}`);
                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || "견적서를 불러올 수 없습니다.");
                }

                setQuote(result.data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        }

        fetchQuote();
    }, [quoteId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin h-12 w-12 border-4 border-white border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error || !quote) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center max-w-md">
                    <p className="text-red-400 text-lg font-medium">⚠️ 오류</p>
                    <p className="text-gray-300 mt-2">{error || "견적서를 찾을 수 없습니다."}</p>
                </div>
            </div>
        );
    }

    // 카테고리별 그룹핑
    const itemsByCategory: Record<string, QuoteItem[]> = {};
    quote.items?.forEach((item) => {
        if (!item.is_included) return;
        if (!itemsByCategory[item.category]) {
            itemsByCategory[item.category] = [];
        }
        itemsByCategory[item.category].push(item);
    });

    return (
        <div className="min-h-screen bg-black">
            {/* 헤더 */}
            <header className="bg-black text-white py-6 px-4 sticky top-0 z-10 shadow-lg">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-xl font-bold tracking-wide">Standard Unit</h1>
                    <p className="text-gray-400 text-sm mt-1">인테리어 견적서</p>
                </div>
            </header>

            <main className="max-w-2xl mx-auto p-4 pb-24">
                {/* 견적 정보 카드 */}
                <div className="bg-white/10 backdrop-blur rounded-xl p-5 mb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 text-xs">견적번호</p>
                            <p className="text-white font-bold text-lg">{quote.quote_number}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-400 text-xs">유효기간</p>
                            <p className="text-white">{quote.valid_until || "-"}</p>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-gray-400 text-xs">고객명</p>
                        <p className="text-white font-medium">{quote.customer_name || "-"} 님</p>
                    </div>

                    {quote.property_size && (
                        <div className="mt-3">
                            <p className="text-gray-400 text-xs">시공 면적</p>
                            <p className="text-white">
                                {quote.property_size}㎡ ({(quote.property_size / 3.3).toFixed(1)}평)
                            </p>
                        </div>
                    )}

                    {quote.property_address && (
                        <div className="mt-3">
                            <p className="text-gray-400 text-xs">시공 주소</p>
                            <p className="text-white text-sm">{quote.property_address}</p>
                        </div>
                    )}
                </div>

                {/* 최종 금액 카드 */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-5 mb-4 shadow-lg">
                    <p className="text-emerald-100 text-sm">최종 견적 금액</p>
                    <p className="text-white font-bold mt-1" style={{ fontSize: '32px' }}>
                        ₩{formatPrice(quote.final_amount)}
                    </p>
                    <div className="mt-3 pt-3 border-t border-white/20 grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-emerald-100">인건비</p>
                            <p className="text-white font-medium" style={{ fontSize: '16px' }}>₩{formatPrice(quote.labor_cost)}</p>
                        </div>
                        <div>
                            <p className="text-emerald-100">자재비</p>
                            <p className="text-white font-medium" style={{ fontSize: '16px' }}>₩{formatPrice(quote.material_cost)}</p>
                        </div>
                    </div>
                    {quote.discount_amount > 0 && (
                        <p className="text-emerald-200 mt-2" style={{ fontSize: '15px' }}>
                            할인 {quote.discount_reason}: -₩{formatPrice(quote.discount_amount)}
                        </p>
                    )}
                    {quote.vat_amount > 0 && (
                        <p className="text-emerald-200" style={{ fontSize: '15px' }}>
                            부가세: ₩{formatPrice(quote.vat_amount)}
                        </p>
                    )}
                </div>

                {/* 공정별 견적 내역 */}
                <div className="bg-white/10 backdrop-blur rounded-xl overflow-hidden mb-4">
                    <div className="bg-white/5 px-5 py-3">
                        <h2 className="text-white font-bold">📋 공정별 견적 내역</h2>
                    </div>

                    {Object.entries(itemsByCategory).map(([category, items]) => {
                        const categoryTotal = items.reduce((sum, item) => sum + item.total_price, 0);
                        return (
                            <div key={category} className="border-t border-white/10">
                                {/* 카테고리 헤더 */}
                                <div className="px-5 py-3 bg-white/5 flex justify-between items-center">
                                    <span className="text-white font-medium">{category}</span>
                                    <span className="text-emerald-400 font-bold" style={{ fontSize: '16px' }}>
                                        ₩{formatPrice(categoryTotal)}
                                    </span>
                                </div>

                                {/* 항목들 */}
                                <div className="divide-y divide-white/5">
                                    {items.map((item) => (
                                        <div key={item.id} className="px-5 py-3 flex justify-between items-center">
                                            <div className="flex-1 min-w-0 mr-3">
                                                <p className="text-white text-sm truncate">{item.item_name}</p>
                                                <p className="text-gray-400" style={{ fontSize: '13px' }}>
                                                    {item.quantity} {item.unit} × ₩{formatPrice(item.unit_price)}
                                                </p>
                                            </div>
                                            <p className="text-white font-mono whitespace-nowrap" style={{ fontSize: '15px' }}>
                                                ₩{formatPrice(item.total_price)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 견적 산출 내역 */}
                {quote.calculation_comment && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5 mb-4">
                        <h3 className="text-blue-400 font-bold mb-3">📋 견적 산출 내역</h3>
                        <div className="text-gray-300 text-sm space-y-2 whitespace-pre-wrap">
                            {quote.calculation_comment.split("\n").map((line, idx) => {
                                if (line.startsWith("## ")) {
                                    return (
                                        <p key={idx} className="text-white font-bold mt-4 mb-2">
                                            {line.replace("## ", "")}
                                        </p>
                                    );
                                }
                                if (line.startsWith("### ")) {
                                    return (
                                        <p key={idx} className="text-white font-medium mt-3 mb-1">
                                            {line.replace("### ", "")}
                                        </p>
                                    );
                                }
                                if (line.match(/^[✅✓☑◆◇▶►⚠️❗] /)) {
                                    return <p key={idx} className="pl-2">{line}</p>;
                                }
                                if (line.startsWith("- ") || line.startsWith("• ")) {
                                    return <p key={idx} className="pl-4 text-gray-400">{line}</p>;
                                }
                                if (line.trim()) {
                                    return <p key={idx}>{line}</p>;
                                }
                                return null;
                            })}
                        </div>
                    </div>
                )}

                {/* 특이사항 */}
                {quote.notes && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 mb-4">
                        <h3 className="text-yellow-400 font-bold mb-2">📝 특이사항</h3>
                        <p className="text-gray-300 text-sm">{quote.notes}</p>
                    </div>
                )}

                {/* 안내사항 */}
                <div className="bg-white/5 rounded-xl p-5 text-gray-400 text-sm mb-4">
                    <h3 className="text-white font-bold mb-2">📌 안내사항</h3>
                    <ul className="space-y-1 list-disc list-inside">
                        <li>본 견적서는 {quote.valid_until || "발행일로부터 14일"}까지 유효합니다.</li>
                        <li>현장 상황에 따라 금액이 변동될 수 있습니다.</li>
                        <li>자세한 상담이 필요하시면 연락 주세요.</li>
                    </ul>
                </div>

                {/* 특별 할인 혜택 */}
                <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/50 rounded-xl p-5">
                    <h3 className="text-amber-400 font-bold mb-3">🎁 특별 할인 혜택</h3>
                    <div className="space-y-2 text-sm">
                        <p className="text-white">
                            <span className="text-amber-300 font-semibold">✓ 1월 시공계약시</span>{" "}
                            비스포크 냉장고 증정
                        </p>
                        <p className="text-white">
                            <span className="text-amber-300 font-semibold">✓ 타 업체 견적서 첨부시</span>{" "}
                            100만원 추가할인
                        </p>
                    </div>
                    <p className="text-gray-400 text-xs mt-3">
                        * 본 혜택은 이 견적서로 시공 계약시에만 적용됩니다.
                    </p>
                </div>
            </main>

            {/* 하단 고정 CTA */}
            <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur border-t border-white/10 p-4">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-xs">최종 금액</p>
                        <p className="text-white font-bold" style={{ fontSize: '20px' }}>₩{formatPrice(quote.final_amount)}</p>
                    </div>
                    <a
                        href="https://open.kakao.com/o/sLPdwe7h"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-full transition-colors"
                    >
                        💬 상담하기
                    </a>
                </div>
            </div>
        </div>
    );
}
