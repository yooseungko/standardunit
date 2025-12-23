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
    valid_until?: string;
    created_at: string;
    items: QuoteItem[];
}

function formatPrice(price: number): string {
    return new Intl.NumberFormat("ko-KR").format(price);
}

export default function QuotePrintPage() {
    const params = useParams();
    const quoteId = params.id as string;

    const [quote, setQuote] = useState<Quote | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!quoteId) return;

        async function fetchQuote() {
            try {
                const response = await fetch(`/api/quotes?id=${quoteId}`);
                const result = await response.json();
                if (result.success) {
                    setQuote(result.data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchQuote();
    }, [quoteId]);

    // 자동 인쇄
    useEffect(() => {
        if (quote && !loading) {
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [quote, loading]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <p className="text-gray-600">견적서 로딩 중...</p>
            </div>
        );
    }

    if (!quote) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <p className="text-red-600">견적서를 찾을 수 없습니다.</p>
            </div>
        );
    }

    // 카테고리 순서 정의
    const CATEGORY_ORDER: Record<string, number> = {
        '인건비': 1,
        '가설': 2,
        '철거': 3,
        '확장': 4,
        '샷시': 5,
        '창호': 5,
        '설비': 6,
        '에어컨': 7,
        '목공': 8,
        '목자재': 9,
        '도어': 10,
        '목문': 10,
        '전기': 11,
        '타일': 12,
        '바닥': 13,
        '도배': 14,
        '벽면': 14,
        '필름': 15,
        '욕실': 16,
        '중문': 17,
        '주방': 18,
        '가구': 19,
        '마감': 20,
        '청소': 21,
        '기타': 99,
    };

    // 카테고리별 그룹핑
    const itemsByCategory: Record<string, QuoteItem[]> = {};
    quote.items?.forEach((item) => {
        if (!item.is_included) return;
        if (!itemsByCategory[item.category]) {
            itemsByCategory[item.category] = [];
        }
        itemsByCategory[item.category].push(item);
    });

    // 카테고리 순서대로 정렬
    const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
        const orderA = CATEGORY_ORDER[a] || 50;
        const orderB = CATEGORY_ORDER[b] || 50;
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b);
    });

    const today = new Date().toLocaleDateString('ko-KR');

    return (
        <>
            {/* 인쇄 스타일 */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 12mm 15mm;
                    }
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
                @media screen {
                    body {
                        background: #f0f0f0;
                    }
                }
            `}</style>

            <div className="bg-white min-h-screen" style={{ maxWidth: '210mm', margin: '0 auto', padding: '10mm', fontFamily: 'Pretendard, sans-serif' }}>
                {/* 헤더 */}
                <div className="text-center border-b-2 border-black pb-4 mb-6">
                    <h1 className="text-2xl font-bold tracking-wider">견 적 서</h1>
                    <p className="text-xs text-gray-500 mt-1">QUOTATION</p>
                </div>

                {/* 상단 정보 */}
                <div className="flex justify-between mb-6 text-sm">
                    <div className="flex-1">
                        <table className="w-full border-collapse">
                            <tbody>
                                <tr>
                                    <td className="py-1 pr-3 text-gray-600 w-20">견적번호</td>
                                    <td className="py-1 font-medium">{quote.quote_number}</td>
                                </tr>
                                <tr>
                                    <td className="py-1 pr-3 text-gray-600">발행일</td>
                                    <td className="py-1">{today}</td>
                                </tr>
                                <tr>
                                    <td className="py-1 pr-3 text-gray-600">유효기간</td>
                                    <td className="py-1">{quote.valid_until || '발행일로부터 14일'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="flex-1 text-right">
                        <p className="font-bold text-lg">Standard Unit</p>
                        <p className="text-xs text-gray-500">스탠다드유닛 인테리어</p>
                    </div>
                </div>

                {/* 고객 정보 */}
                <div className="bg-gray-50 p-4 rounded mb-6 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-gray-500">고객명: </span>
                            <span className="font-medium">{quote.customer_name || '-'} 님</span>
                        </div>
                        {quote.property_size && (
                            <div>
                                <span className="text-gray-500">시공면적: </span>
                                <span>{quote.property_size}㎡ ({(quote.property_size / 3.3).toFixed(0)}평)</span>
                            </div>
                        )}
                        {quote.property_address && (
                            <div className="col-span-2">
                                <span className="text-gray-500">시공주소: </span>
                                <span>{quote.property_address}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 금액 요약 */}
                <div className="border-2 border-black p-4 mb-6">
                    <div className="flex justify-between items-center">
                        <span className="text-lg font-bold">총 견적금액</span>
                        <span className="text-2xl font-bold text-blue-700">₩{formatPrice(quote.final_amount)}</span>
                    </div>
                    <div className="flex justify-end gap-6 mt-2 text-sm text-gray-600">
                        <span>인건비: ₩{formatPrice(quote.labor_cost)}</span>
                        <span>자재비: ₩{formatPrice(quote.material_cost)}</span>
                        {quote.discount_amount > 0 && (
                            <span className="text-red-600">할인: -₩{formatPrice(quote.discount_amount)}</span>
                        )}
                    </div>
                </div>

                {/* 상세 내역 */}
                <div className="mb-6">
                    <h2 className="text-sm font-bold border-b border-gray-300 pb-2 mb-3">상세 견적 내역</h2>

                    {sortedCategories.map((category) => {
                        const items = itemsByCategory[category];
                        const categoryTotal = items.reduce((sum, item) => sum + item.total_price, 0);
                        return (
                            <div key={category} className="mb-4">
                                <h3 className="text-xs font-bold bg-gray-100 px-2 py-1 mb-1">{category}</h3>
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b text-gray-500">
                                            <th className="text-left py-1 w-2/5">품목</th>
                                            <th className="text-center py-1 w-1/6">수량</th>
                                            <th className="text-right py-1 w-1/5">단가</th>
                                            <th className="text-right py-1 w-1/5">금액</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item) => (
                                            <tr key={item.id} className="border-b border-gray-100">
                                                <td className="py-1">{item.item_name}</td>
                                                <td className="text-center py-1">{item.quantity} {item.unit}</td>
                                                <td className="text-right py-1">₩{formatPrice(item.unit_price)}</td>
                                                <td className="text-right py-1 font-medium">₩{formatPrice(item.total_price)}</td>
                                            </tr>
                                        ))}
                                        {/* 카테고리 소계 */}
                                        <tr className="border-t border-gray-300 bg-gray-50">
                                            <td colSpan={3} className="py-1.5 text-right font-bold pr-2">{category} 소계</td>
                                            <td className="text-right py-1.5 font-bold text-blue-700">₩{formatPrice(categoryTotal)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}
                </div>

                {/* 특이사항 */}
                {quote.notes && (
                    <div className="mb-6 text-sm">
                        <h2 className="font-bold border-b border-gray-300 pb-1 mb-2 text-xs">특이사항</h2>
                        <p className="text-gray-700 text-xs">{quote.notes}</p>
                    </div>
                )}

                {/* 안내문 */}
                <div className="bg-gray-50 p-3 rounded text-xs text-gray-600 mb-6">
                    <h3 className="font-bold mb-1">안내사항</h3>
                    <ul className="list-disc list-inside space-y-0.5">
                        <li>본 견적서는 {quote.valid_until || '발행일로부터 14일'}까지 유효합니다.</li>
                    </ul>
                </div>

                {/* 푸터 */}
                <div className="border-t pt-4 text-center text-xs text-gray-500">
                    <p className="font-medium text-black mb-1">Standard Unit Interior</p>
                    <p>스탠다드유닛 인테리어 | 문의: 카카오톡 채널</p>
                </div>

                {/* 화면용 버튼 (인쇄 시 숨김) */}
                <div className="fixed bottom-4 right-4 flex gap-2 print:hidden">
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700"
                    >
                        🖨️ 인쇄/PDF 저장
                    </button>
                    <button
                        onClick={() => window.close()}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg shadow-lg hover:bg-gray-700"
                    >
                        ✕ 닫기
                    </button>
                </div>
            </div>
        </>
    );
}
