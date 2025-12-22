"use client";

import React, { useState, useEffect } from "react";
import { QuoteVersion } from "@/types/quote";

interface QuoteVersionHistoryProps {
    quoteId: string;
    onRollback: (version: QuoteVersion) => void;
    isOpen: boolean;
    onToggle: () => void;
}

export default function QuoteVersionHistory({
    quoteId,
    onRollback,
    isOpen,
    onToggle,
}: QuoteVersionHistoryProps) {
    const [versions, setVersions] = useState<QuoteVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rollingBack, setRollingBack] = useState<string | null>(null);
    const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

    // 버전 목록 조회
    const fetchVersions = async () => {
        if (!quoteId) return;

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/quotes/versions?quote_id=${quoteId}`);
            const result = await response.json();

            if (result.success) {
                setVersions(result.data || []);
            } else {
                setError(result.error || '버전 목록 조회 실패');
            }
        } catch (err) {
            console.error('Fetch versions error:', err);
            setError('버전 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 열릴 때 버전 목록 조회
    useEffect(() => {
        if (isOpen && quoteId) {
            fetchVersions();
        }
    }, [isOpen, quoteId]);

    // 롤백 처리
    const handleRollback = async (version: QuoteVersion) => {
        if (!confirm(`정말 버전 ${version.version_number}(으)로 롤백하시겠습니까?\n\n현재 견적서는 자동으로 백업됩니다.`)) {
            return;
        }

        try {
            setRollingBack(version.id);

            const response = await fetch('/api/quotes/rollback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quote_id: quoteId,
                    version_id: version.id,
                }),
            });

            const result = await response.json();

            if (result.success) {
                alert(`✅ ${result.message}`);
                onRollback(version);
                fetchVersions(); // 목록 새로고침
            } else {
                alert(`❌ 롤백 실패: ${result.error}`);
            }
        } catch (err) {
            console.error('Rollback error:', err);
            alert('롤백 중 오류가 발생했습니다.');
        } finally {
            setRollingBack(null);
        }
    };

    // 금액 포맷
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('ko-KR').format(price);
    };

    // 날짜 포맷
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // 시간 경과 표시
    const getTimeAgo = (dateStr: string) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diff = now.getTime() - date.getTime();

        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days > 0) return `${days}일 전`;
        if (hours > 0) return `${hours}시간 전`;
        if (minutes > 0) return `${minutes}분 전`;
        return '방금 전';
    };

    // 사유에 따른 배지 색상
    const getReasonBadge = (reason?: string) => {
        if (!reason) return { bg: 'bg-gray-500/20', text: 'text-gray-400' };

        if (reason.includes('롤백')) {
            return { bg: 'bg-orange-500/20', text: 'text-orange-400' };
        }
        if (reason.includes('등급')) {
            return { bg: 'bg-purple-500/20', text: 'text-purple-400' };
        }
        if (reason.includes('자동')) {
            return { bg: 'bg-blue-500/20', text: 'text-blue-400' };
        }
        return { bg: 'bg-green-500/20', text: 'text-green-400' };
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {/* 헤더 - 클릭하여 접기/펴기 */}
            <button
                onClick={onToggle}
                className="w-full px-4 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 flex items-center justify-between hover:from-amber-500/20 hover:to-orange-500/20 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-lg">📜</span>
                    <span className="text-white font-medium">버전 히스토리</span>
                    <span className="text-gray-400 text-sm">
                        ({versions.length}개 버전)
                    </span>
                </div>
                <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </button>

            {/* 버전 목록 */}
            {isOpen && (
                <div className="border-t border-white/10">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <span className="animate-spin mr-2">⏳</span>
                            <span className="text-gray-400">버전 목록 로딩 중...</span>
                        </div>
                    ) : error ? (
                        <div className="p-4 text-red-400 text-center">
                            {error}
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="p-6 text-center text-gray-400">
                            <p className="mb-2">저장된 이전 버전이 없습니다.</p>
                            <p className="text-sm text-gray-500">
                                견적서를 수정하면 자동으로 이전 버전이 저장됩니다.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {versions.map((version) => {
                                const reasonBadge = getReasonBadge(version.saved_reason);
                                const isExpanded = expandedVersion === version.id;

                                return (
                                    <div key={version.id} className="hover:bg-white/5">
                                        {/* 버전 요약 */}
                                        <div className="px-4 py-3 flex items-center justify-between">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                {/* 버전 번호 */}
                                                <div className="flex-shrink-0">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center">
                                                        <span className="text-amber-400 font-bold text-sm">
                                                            v{version.version_number}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* 정보 */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-white font-medium truncate">
                                                            {version.quote_number}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs ${reasonBadge.bg} ${reasonBadge.text}`}>
                                                            {version.saved_reason || '수정'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm text-gray-400">
                                                        <span>{formatDate(version.saved_at)}</span>
                                                        <span className="text-gray-600">•</span>
                                                        <span>{getTimeAgo(version.saved_at)}</span>
                                                    </div>
                                                </div>

                                                {/* 금액 */}
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-white font-mono font-medium">
                                                        ₩{formatPrice(version.final_amount)}
                                                    </p>
                                                    <p className="text-gray-500 text-xs">
                                                        {version.items?.length || 0}개 항목
                                                    </p>
                                                </div>
                                            </div>

                                            {/* 액션 버튼 */}
                                            <div className="flex items-center gap-2 ml-4">
                                                <button
                                                    onClick={() => setExpandedVersion(isExpanded ? null : version.id)}
                                                    className="px-3 py-1.5 text-gray-400 hover:text-white text-sm rounded border border-white/10 hover:bg-white/10 transition-colors"
                                                >
                                                    {isExpanded ? '접기' : '상세'}
                                                </button>
                                                <button
                                                    onClick={() => handleRollback(version)}
                                                    disabled={rollingBack === version.id}
                                                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${rollingBack === version.id
                                                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                            : 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-500/30'
                                                        }`}
                                                >
                                                    {rollingBack === version.id ? (
                                                        <span className="flex items-center gap-1">
                                                            <span className="animate-spin">⏳</span>
                                                            롤백 중...
                                                        </span>
                                                    ) : (
                                                        '🔄 롤백'
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* 상세 정보 (접히는 부분) */}
                                        {isExpanded && (
                                            <div className="px-4 pb-4 bg-black/20">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pt-3 border-t border-white/5">
                                                    <div>
                                                        <p className="text-gray-500 text-xs mb-1">인건비</p>
                                                        <p className="text-gray-300 font-mono">₩{formatPrice(version.labor_cost)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 text-xs mb-1">자재비</p>
                                                        <p className="text-gray-300 font-mono">₩{formatPrice(version.material_cost)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 text-xs mb-1">할인</p>
                                                        <p className="text-red-400 font-mono">-₩{formatPrice(version.discount_amount)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 text-xs mb-1">부가세</p>
                                                        <p className="text-gray-300 font-mono">₩{formatPrice(version.vat_amount)}</p>
                                                    </div>
                                                </div>

                                                {/* 항목 미리보기 */}
                                                {version.items && version.items.length > 0 && (
                                                    <div className="mt-3">
                                                        <p className="text-gray-400 text-xs mb-2">항목 미리보기 (상위 5개)</p>
                                                        <div className="space-y-1">
                                                            {version.items.slice(0, 5).map((item, idx) => (
                                                                <div key={idx} className="flex items-center justify-between text-sm px-2 py-1 rounded bg-white/5">
                                                                    <span className="text-gray-300 truncate">
                                                                        {item.category} / {item.item_name}
                                                                    </span>
                                                                    <span className="text-gray-400 font-mono ml-2">
                                                                        ₩{formatPrice(item.total_price)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {version.items.length > 5 && (
                                                                <p className="text-gray-500 text-xs text-center pt-1">
                                                                    +{version.items.length - 5}개 더...
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 메모 */}
                                                {version.notes && (
                                                    <div className="mt-3 p-2 bg-white/5 rounded">
                                                        <p className="text-gray-400 text-xs mb-1">메모</p>
                                                        <p className="text-gray-300 text-sm">{version.notes}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* 새로고침 버튼 */}
                    {!loading && (
                        <div className="px-4 py-3 border-t border-white/5">
                            <button
                                onClick={fetchVersions}
                                className="text-gray-400 hover:text-white text-sm flex items-center gap-2"
                            >
                                🔄 새로고침
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
