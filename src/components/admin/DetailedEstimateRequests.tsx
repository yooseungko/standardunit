"use client";

import { useState, useEffect } from "react";

interface EstimateRequest {
    id: number;
    complex_name: string;
    size: string;
    floor_type: string | null;
    name: string;
    phone: string;
    email: string | null;
    wants_construction: boolean;
    status: string;
    created_at: string;
    notes: string | null;
    construction_scope?: string[];
    preferred_construction_date?: string | null;
    detailed_form_status?: 'pending' | 'sent' | 'completed';
    detailed_form_token?: string | null;
}

interface DetailedForm {
    id: number;
    estimate_id: number;
    demolition_scope: string[];
    woodwork_scope: string[];
    plumbing_scope: string[];
    extension_scope: string[];
    finishing_materials: string[];
    bathroom_options: string[];
    furniture_options: { type: string; grade: string; quantity: number }[];
    aircon_options: { location: string; quantity: number }[];
    created_at: string;
}

const sizeLabels: Record<string, string> = {
    '24': '24평 (59㎡)',
    '32': '32평 (84㎡)',
    '43': '43평 (110㎡)',
    '52': '52평 (132㎡)',
    'other': '그 외',
};

const formStatusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: '대기', color: 'bg-gray-500/20 text-gray-400 border border-gray-500/30' },
    sent: { label: '요청됨', color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
    completed: { label: '완료됨', color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
};

const gradeLabels: Record<string, string> = {
    pet: '기본 등급 PET',
    zero_joint: '중간등급 제로조인트',
    paint: '최고등급 페인트마감',
};

const airconLocationLabels: Record<string, string> = {
    living: '거실',
    rooms: '방',
};

export default function DetailedEstimateRequests() {
    const [estimates, setEstimates] = useState<EstimateRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendingIds, setSendingIds] = useState<Set<number>>(new Set());
    const [selectedEstimate, setSelectedEstimate] = useState<EstimateRequest | null>(null);
    const [detailedForm, setDetailedForm] = useState<DetailedForm | null>(null);
    const [loadingForm, setLoadingForm] = useState(false);

    useEffect(() => {
        fetchEstimates();
    }, []);

    const fetchEstimates = async () => {
        try {
            const response = await fetch('/api/estimates');
            const data = await response.json();
            if (data.success) {
                // wants_construction = true인 것만 필터링
                const constructionEstimates = data.data.filter(
                    (e: EstimateRequest) => e.wants_construction === true
                );
                setEstimates(constructionEstimates);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendFormEmail = async (estimate: EstimateRequest) => {
        if (!estimate.email) {
            alert('고객 이메일이 없습니다.');
            return;
        }

        setSendingIds(prev => new Set(prev).add(estimate.id));

        try {
            const response = await fetch('/api/detailed-estimates/send-form', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estimateId: estimate.id }),
            });

            const data = await response.json();

            if (data.success) {
                alert('이메일이 발송되었습니다.');
                fetchEstimates(); // 목록 새로고침
            } else {
                alert(data.error || '이메일 발송에 실패했습니다.');
            }
        } catch (error) {
            console.error('Send error:', error);
            alert('이메일 발송 중 오류가 발생했습니다.');
        } finally {
            setSendingIds(prev => {
                const next = new Set(prev);
                next.delete(estimate.id);
                return next;
            });
        }
    };

    const viewDetails = async (estimate: EstimateRequest) => {
        setSelectedEstimate(estimate);
        setDetailedForm(null);

        if (estimate.detailed_form_status === 'completed') {
            setLoadingForm(true);
            try {
                const response = await fetch(`/api/detailed-estimates?estimate_id=${estimate.id}`);
                const data = await response.json();
                if (data.success && data.data) {
                    setDetailedForm(Array.isArray(data.data) ? data.data[0] : data.data);
                }
            } catch (error) {
                console.error('Fetch form error:', error);
            } finally {
                setLoadingForm(false);
            }
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6">
                    <p className="text-gray-400 text-sm">전체</p>
                    <p className="text-3xl font-bold text-white">{estimates.length}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6">
                    <p className="text-gray-400 text-sm">요청됨</p>
                    <p className="text-3xl font-bold text-yellow-400">
                        {estimates.filter(e => e.detailed_form_status === 'sent').length}
                    </p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6">
                    <p className="text-gray-400 text-sm">완료됨</p>
                    <p className="text-3xl font-bold text-emerald-400">
                        {estimates.filter(e => e.detailed_form_status === 'completed').length}
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="px-6 py-4 text-left text-xs font-mono text-gray-500 uppercase">접수일</th>
                            <th className="px-6 py-4 text-left text-xs font-mono text-gray-500 uppercase">단지명</th>
                            <th className="px-6 py-4 text-left text-xs font-mono text-gray-500 uppercase">평형</th>
                            <th className="px-6 py-4 text-left text-xs font-mono text-gray-500 uppercase">고객명</th>
                            <th className="px-6 py-4 text-left text-xs font-mono text-gray-500 uppercase">연락처</th>
                            <th className="px-6 py-4 text-left text-xs font-mono text-gray-500 uppercase">상태</th>
                            <th className="px-6 py-4 text-left text-xs font-mono text-gray-500 uppercase">상세보기</th>
                            <th className="px-6 py-4 text-left text-xs font-mono text-gray-500 uppercase">이메일 발송</th>
                        </tr>
                    </thead>
                    <tbody>
                        {estimates.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                    시공 의뢰 고객이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            estimates.map((estimate) => {
                                const isSending = sendingIds.has(estimate.id);
                                const status = estimate.detailed_form_status || 'pending';
                                const statusInfo = formStatusLabels[status];

                                return (
                                    <tr
                                        key={estimate.id}
                                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                    >
                                        <td className="px-6 py-4 text-sm font-mono text-gray-400">
                                            {formatDate(estimate.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-white">
                                            {estimate.complex_name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-300">
                                            {sizeLabels[estimate.size] || estimate.size}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-white">
                                            {estimate.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-gray-400">
                                            {estimate.phone}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                                                {statusInfo.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => viewDetails(estimate)}
                                                className="text-sm text-gray-400 hover:text-white transition-colors hover:underline"
                                            >
                                                상세보기
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => sendFormEmail(estimate)}
                                                disabled={isSending || !estimate.email}
                                                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${status === 'completed'
                                                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                        : status === 'sent'
                                                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {isSending ? (
                                                    <span className="flex items-center gap-2">
                                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        발송 중
                                                    </span>
                                                ) : status === 'completed' ? (
                                                    '완료'
                                                ) : status === 'sent' ? (
                                                    '재발송'
                                                ) : (
                                                    '발송'
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Detail Modal */}
            {selectedEstimate && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-950/90 backdrop-blur-xl border border-white/10 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">정밀 견적 상세</h2>
                            <button
                                onClick={() => setSelectedEstimate(null)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* 고객 정보 */}
                            <div>
                                <h3 className="text-sm font-mono text-gray-500 mb-3 uppercase">고객 정보</h3>
                                <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">고객명</span>
                                        <span className="text-white font-medium">{selectedEstimate.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">단지명</span>
                                        <span className="text-white font-medium">{selectedEstimate.complex_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">평형</span>
                                        <span className="text-white font-medium">{sizeLabels[selectedEstimate.size] || selectedEstimate.size}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">연락처</span>
                                        <span className="text-white font-mono">{selectedEstimate.phone}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">이메일</span>
                                        <span className="text-white font-mono">{selectedEstimate.email || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 정밀 견적 폼 응답 */}
                            {selectedEstimate.detailed_form_status === 'completed' ? (
                                loadingForm ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : detailedForm ? (
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-mono text-gray-500 uppercase">고객 응답 내용</h3>

                                        {/* 철거 범위 */}
                                        {detailedForm.demolition_scope.length > 0 && (
                                            <FormSection title="A. 철거 범위" items={detailedForm.demolition_scope} />
                                        )}

                                        {/* 목공 범위 */}
                                        {detailedForm.woodwork_scope.length > 0 && (
                                            <FormSection title="B. 목공 범위" items={detailedForm.woodwork_scope} />
                                        )}

                                        {/* 설비 범위 */}
                                        {detailedForm.plumbing_scope.length > 0 && (
                                            <FormSection title="C. 설비 범위" items={detailedForm.plumbing_scope} />
                                        )}

                                        {/* 확장 범위 */}
                                        {detailedForm.extension_scope.length > 0 && (
                                            <FormSection title="D. 확장 범위" items={detailedForm.extension_scope} />
                                        )}

                                        {/* 마감재 */}
                                        {detailedForm.finishing_materials.length > 0 && (
                                            <FormSection title="E. 마감재" items={detailedForm.finishing_materials} />
                                        )}

                                        {/* 욕실 */}
                                        {detailedForm.bathroom_options.length > 0 && (
                                            <FormSection title="F. 욕실" items={detailedForm.bathroom_options} />
                                        )}

                                        {/* 가구 */}
                                        {detailedForm.furniture_options.length > 0 && (
                                            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                                <h4 className="text-sm font-semibold text-white mb-3">G. 가구</h4>
                                                <div className="space-y-2">
                                                    {detailedForm.furniture_options.map((f, i) => (
                                                        <div key={i} className="flex justify-between text-sm">
                                                            <span className="text-gray-400">{f.type}</span>
                                                            <span className="text-white">
                                                                {gradeLabels[f.grade] || f.grade} × {f.quantity}개
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 에어컨 */}
                                        {detailedForm.aircon_options.some(a => a.quantity > 0) && (
                                            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                                <h4 className="text-sm font-semibold text-white mb-3">H. 시스템 에어컨</h4>
                                                <div className="space-y-2">
                                                    {detailedForm.aircon_options.filter(a => a.quantity > 0).map((a, i) => (
                                                        <div key={i} className="flex justify-between text-sm">
                                                            <span className="text-gray-400">{airconLocationLabels[a.location] || a.location}</span>
                                                            <span className="text-white">{a.quantity}대</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-4">폼 데이터를 불러올 수 없습니다.</p>
                                )
                            ) : (
                                <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
                                    <p className="text-gray-400">
                                        {selectedEstimate.detailed_form_status === 'sent'
                                            ? '고객이 아직 폼을 작성하지 않았습니다.'
                                            : '아직 폼 요청을 발송하지 않았습니다.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// FormSection Component
function FormSection({ title, items }: { title: string; items: string[] }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-white mb-3">{title}</h4>
            <div className="flex flex-wrap gap-2">
                {items.map((item, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full border border-blue-500/30">
                        {item}
                    </span>
                ))}
            </div>
        </div>
    );
}
