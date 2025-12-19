"use client";

import { useState, useEffect } from "react";
import type { EstimateFile, EstimateAnalysis as AnalysisType, ExtractedEstimateItem } from "@/lib/supabase";

interface AnalysisDetailModalProps {
    file: EstimateFile;
    onClose: () => void;
}

// 분석 결과 타입
interface AnalysisData {
    analysis: AnalysisType | null;
    items: ExtractedEstimateItem[];
}

export default function AnalysisDetailModal({ file, onClose }: AnalysisDetailModalProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AnalysisData | null>(null);
    const [activeTab, setActiveTab] = useState<'summary' | 'items' | 'categories'>('summary');

    useEffect(() => {
        fetchAnalysisData();
    }, [file.id]);

    const fetchAnalysisData = async () => {
        try {
            const response = await fetch(`/api/admin/analysis/${file.id}`);
            if (response.ok) {
                const result = await response.json();
                setData(result);
            }
        } catch (error) {
            console.error('Failed to fetch analysis:', error);
        } finally {
            setLoading(false);
        }
    };

    // 등급별 색상
    const getGradeColor = (grade: string | null | undefined) => {
        switch (grade) {
            case 'Under-Standard': return 'text-blue-600 bg-blue-50';
            case 'Standard': return 'text-green-600 bg-green-50';
            case 'Premium': return 'text-purple-600 bg-purple-50';
            case 'Luxury': return 'text-amber-600 bg-amber-50';
            case 'Over-Luxury': return 'text-red-600 bg-red-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    // 비율 색상
    const getPercentageColor = (percentage: number | null | undefined) => {
        if (!percentage) return 'text-gray-600';
        if (percentage < 90) return 'text-blue-600';
        if (percentage <= 110) return 'text-green-600';
        if (percentage <= 130) return 'text-amber-600';
        return 'text-red-600';
    };

    // 금액 포맷
    const formatPrice = (price: number | null | undefined) => {
        if (!price) return '-';
        return price.toLocaleString() + '원';
    };

    // 차이 바 너비 계산
    const getBarWidth = (percentage: number) => {
        const clamped = Math.min(Math.max(percentage, 0), 200);
        return `${(clamped / 200) * 100}%`;
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-950/90 backdrop-blur-xl border border-white/10 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* 헤더 */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">📊 견적 분석 결과</h2>
                        <p className="text-sm text-gray-500 mt-1">{file.file_name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-2xl text-gray-500 hover:text-white transition-colors"
                    >
                        ×
                    </button>
                </div>

                {/* 탭 네비게이션 - 다크모드 */}
                <div className="border-b border-white/10 shrink-0">
                    <nav className="flex">
                        <button
                            onClick={() => setActiveTab('summary')}
                            className={`px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === 'summary'
                                ? 'border-white text-white'
                                : 'border-transparent text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            요약
                        </button>
                        <button
                            onClick={() => setActiveTab('items')}
                            className={`px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === 'items'
                                ? 'border-white text-white'
                                : 'border-transparent text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            추출 항목
                        </button>
                        <button
                            onClick={() => setActiveTab('categories')}
                            className={`px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === 'categories'
                                ? 'border-white text-white'
                                : 'border-transparent text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            카테고리별
                        </button>
                    </nav>
                </div>

                {/* 콘텐츠 */}
                <div className="flex-1 overflow-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full" />
                        </div>
                    ) : !data?.analysis ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">분석 데이터가 없습니다.</p>
                            <p className="text-sm text-gray-600 mt-2">파일 분석을 먼저 실행해주세요.</p>
                        </div>
                    ) : (
                        <>
                            {/* 요약 탭 */}
                            {activeTab === 'summary' && (
                                <div className="space-y-6">
                                    {/* 핵심 지표 - 다크모드 */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
                                            <p className="text-sm text-gray-500 mb-2">표준 대비</p>
                                            <p className={`text-4xl font-black ${getPercentageColor(data.analysis.comparison_percentage)}`}>
                                                {data.analysis.comparison_percentage?.toFixed(1) || '-'}%
                                            </p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
                                            <p className="text-sm text-gray-500 mb-2">예상 등급</p>
                                            <span className={`inline-block px-4 py-2 text-lg font-bold rounded ${getGradeColor(data.analysis.closest_grade)}`}>
                                                {data.analysis.closest_grade || '-'}
                                            </span>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
                                            <p className="text-sm text-gray-500 mb-2">차액</p>
                                            <p className={`text-2xl font-bold ${(data.analysis.price_difference || 0) >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                                {(data.analysis.price_difference || 0) >= 0 ? '+' : ''}
                                                {formatPrice(data.analysis.price_difference)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 가격 비교 - 다크모드 */}
                                    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                                        <h3 className="font-bold mb-4 text-white">💰 가격 비교</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <span className="w-24 text-sm text-gray-500">제출 견적</span>
                                                <div className="flex-1 bg-white/5 h-8 rounded-lg overflow-hidden">
                                                    <div
                                                        className="h-full rounded-lg"
                                                        style={{
                                                            width: getBarWidth(data.analysis.comparison_percentage || 100),
                                                            background: 'linear-gradient(90deg, #64748b 0%, #94a3b8 100%)'
                                                        }}
                                                    />
                                                </div>
                                                <span className="w-32 text-right font-mono font-semibold text-white">
                                                    {formatPrice(data.analysis.total_extracted_price)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="w-24 text-sm text-gray-500">Standard</span>
                                                <div className="flex-1 bg-white/5 h-8 rounded-lg overflow-hidden">
                                                    <div
                                                        className="h-full rounded-lg"
                                                        style={{
                                                            width: '50%',
                                                            background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                                                        }}
                                                    />
                                                </div>
                                                <span className="w-32 text-right font-mono text-emerald-400">
                                                    {formatPrice(data.analysis.standard_price)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="w-24 text-sm text-gray-500">Premium</span>
                                                <div className="flex-1 bg-white/5 h-8 rounded-lg overflow-hidden">
                                                    <div
                                                        className="h-full rounded-lg"
                                                        style={{
                                                            width: '65%',
                                                            background: 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)'
                                                        }}
                                                    />
                                                </div>
                                                <span className="w-32 text-right font-mono text-violet-400">
                                                    {formatPrice(data.analysis.premium_price)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="w-24 text-sm text-gray-500">Luxury</span>
                                                <div className="flex-1 bg-white/5 h-8 rounded-lg overflow-hidden">
                                                    <div
                                                        className="h-full rounded-lg"
                                                        style={{
                                                            width: '85%',
                                                            background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)'
                                                        }}
                                                    />
                                                </div>
                                                <span className="w-32 text-right font-mono text-amber-400">
                                                    {formatPrice(data.analysis.luxury_price)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 분석 요약 - 다크모드 */}
                                    {data.analysis.analysis_summary && (
                                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
                                            <h3 className="font-bold mb-2 text-white">📝 분석 요약</h3>
                                            <p className="text-gray-300">{data.analysis.analysis_summary}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 추출 항목 탭 - 다크모드 */}
                            {activeTab === 'items' && (
                                <div>
                                    {data.items.length === 0 ? (
                                        <p className="text-center text-gray-500 py-8">추출된 항목이 없습니다.</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gray-800/50 text-left text-xs font-mono text-gray-500 uppercase">
                                                        <th className="px-3 py-2">카테고리</th>
                                                        <th className="px-3 py-2">항목명</th>
                                                        <th className="px-3 py-2">브랜드</th>
                                                        <th className="px-3 py-2 text-right">단가</th>
                                                        <th className="px-3 py-2 text-right">수량</th>
                                                        <th className="px-3 py-2 text-right">금액</th>
                                                        <th className="px-3 py-2 text-center">신뢰도</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-800">
                                                    {data.items.map((item) => (
                                                        <tr key={item.id} className="hover:bg-gray-800/50 transition-colors">
                                                            <td className="px-3 py-2">
                                                                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                                                                    {item.category}
                                                                    {item.sub_category && ` > ${item.sub_category}`}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2 font-medium text-white">
                                                                {item.normalized_item_name}
                                                                {item.original_item_name !== item.normalized_item_name && (
                                                                    <span className="block text-xs text-gray-500">
                                                                        원본: {item.original_item_name}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2 text-gray-500">
                                                                {item.brand || '-'}
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-mono text-gray-300">
                                                                {formatPrice(item.unit_price)}
                                                            </td>
                                                            <td className="px-3 py-2 text-right text-gray-400">
                                                                {item.quantity} {item.unit}
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-mono font-medium text-white">
                                                                {formatPrice(item.total_price)}
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                <span className={`inline-block w-12 text-xs font-mono ${item.confidence_score >= 0.8 ? 'text-emerald-400' :
                                                                    item.confidence_score >= 0.5 ? 'text-yellow-400' :
                                                                        'text-red-400'
                                                                    }`}>
                                                                    {(item.confidence_score * 100).toFixed(0)}%
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 카테고리별 탭 - 다크모드 */}
                            {activeTab === 'categories' && data.analysis.category_breakdown && (
                                <div className="space-y-4">
                                    {Object.entries(data.analysis.category_breakdown).map(([category, breakdown]) => (
                                        <div key={category} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-bold text-white">{category}</h4>
                                                <span className={`text-sm font-mono ${breakdown.difference_percentage > 10 ? 'text-red-400' :
                                                    breakdown.difference_percentage < -10 ? 'text-blue-400' :
                                                        'text-emerald-400'
                                                    }`}>
                                                    {breakdown.difference_percentage >= 0 ? '+' : ''}
                                                    {breakdown.difference_percentage.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <div className="flex-1">
                                                    <div className="flex justify-between mb-1">
                                                        <span className="text-gray-500">제출</span>
                                                        <span className="font-mono text-gray-300">{formatPrice(breakdown.extracted_total)}</span>
                                                    </div>
                                                    <div className="bg-gray-700 h-2 rounded overflow-hidden">
                                                        <div
                                                            className={`h-full ${breakdown.difference_percentage > 10 ? 'bg-red-400' : breakdown.difference_percentage < -10 ? 'bg-blue-400' : 'bg-emerald-400'}`}
                                                            style={{
                                                                width: breakdown.standard_total > 0
                                                                    ? `${Math.min((breakdown.extracted_total / breakdown.standard_total) * 100, 150)}%`
                                                                    : '100%'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="text-gray-600">vs</div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between mb-1">
                                                        <span className="text-gray-500">표준</span>
                                                        <span className="font-mono text-gray-300">{formatPrice(breakdown.standard_total)}</span>
                                                    </div>
                                                    <div className="bg-gray-700 h-2 rounded overflow-hidden">
                                                        <div className="h-full bg-gray-500" style={{ width: '100%' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* 푸터 - 다크모드 */}
                <div className="p-4 border-t border-gray-800 shrink-0 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
