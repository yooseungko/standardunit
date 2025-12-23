"use client";

import { useState, useEffect } from "react";
import { CustomerStyleboard, SpaceCategory, spaceCategoryLabels } from "@/types/styleboard";

interface EstimateRequest {
    id: number;
    complex_name: string;
    size: string;
    name: string;
    phone: string;
    email: string | null;
    status: 'pending' | 'contacted' | 'completed' | 'cancelled';
}

interface StyleboardWithEstimate extends CustomerStyleboard {
    estimate_requests?: EstimateRequest;
}

export default function StyleboardManagement() {
    const [styleboards, setStyleboards] = useState<StyleboardWithEstimate[]>([]);
    const [contactedEstimates, setContactedEstimates] = useState<EstimateRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 모달 상태
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedEstimate, setSelectedEstimate] = useState<EstimateRequest | null>(null);
    const [selectedStyleboard, setSelectedStyleboard] = useState<StyleboardWithEstimate | null>(null);

    // 폼 상태
    const [newPassword, setNewPassword] = useState("");
    const [creating, setCreating] = useState(false);
    const [sendingLink, setSendingLink] = useState(false);

    // 데이터 로드
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // 스타일보드 목록 조회
            const styleboardRes = await fetch('/api/styleboard');
            const styleboardData = await styleboardRes.json();
            console.log('[StyleboardManagement] styleboard API 응답:', styleboardData);

            // 연락 완료된 견적 요청 조회
            const estimatesRes = await fetch('/api/estimates');
            const estimatesData = await estimatesRes.json();
            console.log('[StyleboardManagement] estimates API 응답:', estimatesData);

            if (styleboardData.success) {
                setStyleboards(styleboardData.data || []);
            } else {
                console.error('[StyleboardManagement] styleboard API 실패:', styleboardData.error);
            }

            if (estimatesData.success) {
                // '연락 완료' 상태인 고객만 필터링
                const contacted = (estimatesData.data || []).filter(
                    (e: EstimateRequest) => e.status === 'contacted'
                );
                console.log('[StyleboardManagement] 연락 완료 고객:', contacted.length, '명', contacted.map((e: EstimateRequest) => e.name));
                setContactedEstimates(contacted);
            } else {
                console.error('[StyleboardManagement] estimates API 실패:', estimatesData.error);
            }
        } catch (err) {
            setError('데이터를 불러오는데 실패했습니다.');
            console.error('[StyleboardManagement] fetchData 에러:', err);
        } finally {
            setLoading(false);
        }
    };

    // 스타일보드 생성
    const handleCreateStyleboard = async () => {
        if (!selectedEstimate || !newPassword) {
            alert('비밀번호를 입력해주세요.');
            return;
        }

        try {
            setCreating(true);
            const response = await fetch('/api/styleboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    estimate_id: selectedEstimate.id,
                    customer_name: selectedEstimate.name,
                    customer_phone: selectedEstimate.phone,
                    customer_email: selectedEstimate.email,
                    password: newPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '스타일보드 생성에 실패했습니다.');
            }

            alert('스타일보드가 생성되었습니다.');
            setShowCreateModal(false);
            setNewPassword("");
            setSelectedEstimate(null);
            fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
        } finally {
            setCreating(false);
        }
    };

    // 스타일보드 링크 복사
    const copyStyleboardLink = (styleboard: StyleboardWithEstimate) => {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/styleboard/${styleboard.id}`;
        navigator.clipboard.writeText(link);
        alert('링크가 클립보드에 복사되었습니다.\n\n' + link);
    };

    // 스타일보드 링크 발송 (문자 또는 이메일)
    const sendStyleboardLink = async (styleboard: StyleboardWithEstimate) => {
        try {
            setSendingLink(true);

            // 링크 발송 상태 업데이트
            const response = await fetch(`/api/styleboard/${styleboard.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ link_sent: true }),
            });

            if (!response.ok) {
                throw new Error('링크 발송 상태 업데이트에 실패했습니다.');
            }

            const baseUrl = window.location.origin;
            const link = `${baseUrl}/styleboard/${styleboard.id}`;

            // 클립보드에 복사
            await navigator.clipboard.writeText(
                `[Standard Unit 스타일보드]\n\n${styleboard.customer_name}님, 안녕하세요!\n\n아래 링크에서 원하시는 인테리어 스타일을 선택해 주세요.\n\n링크: ${link}\n비밀번호: ${styleboard.password}\n\n문의사항이 있으시면 언제든 연락주세요.`
            );

            alert('링크와 안내 메시지가 클립보드에 복사되었습니다.\n카카오톡이나 문자로 발송해 주세요.');
            fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
        } finally {
            setSendingLink(false);
        }
    };

    // 스타일보드 삭제
    const handleDeleteStyleboard = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        try {
            const response = await fetch(`/api/styleboard/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('삭제에 실패했습니다.');
            }

            fetchData();
            setShowDetailModal(false);
        } catch (err) {
            alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
        }
    };

    // 스타일보드가 없는 연락 완료 고객 필터링
    const estimatesWithoutStyleboard = contactedEstimates.filter(
        estimate => !styleboards.some(sb => sb.estimate_id === estimate.id)
    );

    // 스타일보드가 있는 고객
    const estimatesWithStyleboard = contactedEstimates.filter(
        estimate => styleboards.some(sb => sb.estimate_id === estimate.id)
    );

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
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
        <div className="space-y-8">
            {/* 헤더 */}
            <div>
                <h2 className="text-2xl font-bold text-white">스타일보드 관리</h2>
                <p className="text-gray-500 mt-1">고객에게 스타일보드 링크를 발송하고 선택 결과를 확인하세요.</p>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 backdrop-blur-xl p-6 border border-white/10 rounded-lg">
                    <p className="font-mono text-3xl font-black text-white">{contactedEstimates.length}</p>
                    <p className="text-sm text-gray-500 mt-1">연락 완료 고객</p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl p-6 border border-white/10 rounded-lg">
                    <p className="font-mono text-3xl font-black text-blue-400">{styleboards.length}</p>
                    <p className="text-sm text-gray-500 mt-1">스타일보드 생성됨</p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl p-6 border border-white/10 rounded-lg">
                    <p className="font-mono text-3xl font-black text-purple-400">
                        {styleboards.filter(sb => sb.link_sent).length}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">링크 발송됨</p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl p-6 border border-white/10 rounded-lg">
                    <p className="font-mono text-3xl font-black text-emerald-400">
                        {styleboards.filter(sb => sb.saved_at).length}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">스타일 선택 완료</p>
                </div>
            </div>

            {/* 연락 완료 고객 목록 테이블 */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h3 className="font-semibold text-white">연락 완료 고객 목록</h3>
                    <p className="text-xs text-gray-500 mt-1">스타일보드 미생성 고객은 비밀번호를 입력하여 바로 생성할 수 있습니다.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">고객명</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">단지명</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">연락처</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">비밀번호</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">상태</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">작업</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {contactedEstimates.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        연락 완료된 고객이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                contactedEstimates.map((estimate) => {
                                    const styleboard = styleboards.find(sb => sb.estimate_id === estimate.id);
                                    const hasStyleboard = !!styleboard;

                                    // 2단계 구조 선택 개수 계산
                                    const selectedCount = styleboard
                                        ? Object.values(styleboard.selected_images || {}).reduce(
                                            (spaceAcc, subCategories) => {
                                                if (typeof subCategories === 'object' && subCategories !== null) {
                                                    return spaceAcc + Object.values(subCategories).reduce(
                                                        (subAcc, arr) => subAcc + (Array.isArray(arr) ? arr.length : 0), 0
                                                    );
                                                }
                                                return spaceAcc;
                                            }, 0
                                        )
                                        : 0;

                                    return (
                                        <CustomerRow
                                            key={estimate.id}
                                            estimate={estimate}
                                            styleboard={styleboard}
                                            selectedCount={selectedCount}
                                            onCreateStyleboard={async (password: string) => {
                                                try {
                                                    setCreating(true);
                                                    const response = await fetch('/api/styleboard', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            estimate_id: estimate.id,
                                                            customer_name: estimate.name,
                                                            customer_phone: estimate.phone,
                                                            customer_email: estimate.email,
                                                            password,
                                                        }),
                                                    });
                                                    const data = await response.json();
                                                    if (!response.ok) {
                                                        throw new Error(data.error || '스타일보드 생성에 실패했습니다.');
                                                    }
                                                    fetchData();
                                                } catch (err) {
                                                    alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
                                                } finally {
                                                    setCreating(false);
                                                }
                                            }}
                                            onSendLink={() => styleboard && sendStyleboardLink(styleboard)}
                                            onViewDetail={() => {
                                                if (styleboard) {
                                                    setSelectedStyleboard(styleboard);
                                                    setShowDetailModal(true);
                                                }
                                            }}
                                            creating={creating}
                                            sendingLink={sendingLink}
                                        />
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 스타일보드 생성 모달 */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-950/90 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">스타일보드 생성</h2>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setNewPassword("");
                                    setSelectedEstimate(null);
                                }}
                                className="text-gray-500 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* 고객 선택 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    고객 선택 (연락 완료 상태)
                                </label>
                                <select
                                    value={selectedEstimate?.id || ""}
                                    onChange={(e) => {
                                        const estimate = estimatesWithoutStyleboard.find(
                                            est => est.id === parseInt(e.target.value)
                                        );
                                        setSelectedEstimate(estimate || null);
                                    }}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
                                >
                                    <option value="">고객을 선택하세요</option>
                                    {estimatesWithoutStyleboard.map((estimate) => (
                                        <option key={estimate.id} value={estimate.id}>
                                            {estimate.name} - {estimate.complex_name} ({estimate.phone})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 선택된 고객 정보 */}
                            {selectedEstimate && (
                                <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">고객명</span>
                                        <span className="text-white">{selectedEstimate.name}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">단지명</span>
                                        <span className="text-white">{selectedEstimate.complex_name}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">연락처</span>
                                        <span className="text-white font-mono">{selectedEstimate.phone}</span>
                                    </div>
                                    {selectedEstimate.email && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">이메일</span>
                                            <span className="text-white">{selectedEstimate.email}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 비밀번호 입력 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    스타일보드 접근 비밀번호
                                </label>
                                <input
                                    type="text"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="고객에게 전달할 비밀번호 (예: 1234)"
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-white focus:ring-1 focus:ring-white placeholder-gray-500"
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    * 고객이 스타일보드에 접근할 때 사용할 비밀번호입니다.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setNewPassword("");
                                    setSelectedEstimate(null);
                                }}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCreateStyleboard}
                                disabled={!selectedEstimate || !newPassword || creating}
                                className={`px-6 py-2 rounded-lg font-medium transition-colors ${!selectedEstimate || !newPassword || creating
                                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    : 'bg-white text-gray-900 hover:bg-gray-200'
                                    }`}
                            >
                                {creating ? '생성 중...' : '스타일보드 생성'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 스타일보드 상세 모달 */}
            {showDetailModal && selectedStyleboard && (
                <StyleboardDetailModal
                    styleboard={selectedStyleboard}
                    onClose={() => {
                        setShowDetailModal(false);
                        setSelectedStyleboard(null);
                    }}
                    onDelete={() => handleDeleteStyleboard(selectedStyleboard.id)}
                    onRefresh={fetchData}
                />
            )}
        </div>
    );
}

// 스타일보드 상세 모달 컴포넌트
function StyleboardDetailModal({
    styleboard,
    onClose,
    onDelete,
    onRefresh,
}: {
    styleboard: StyleboardWithEstimate;
    onClose: () => void;
    onDelete: () => void;
    onRefresh: () => void;
}) {
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const selectedImages = styleboard.selected_images || {};
    const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-950/90 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-gray-950/90 backdrop-blur-xl">
                    <h2 className="text-xl font-bold text-white">
                        {styleboard.customer_name}님의 스타일보드
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* 고객 정보 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">고객명</p>
                            <p className="font-medium text-white">{styleboard.customer_name}</p>
                        </div>
                        <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">연락처</p>
                            <p className="font-mono text-white">{styleboard.customer_phone}</p>
                        </div>
                        <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">비밀번호</p>
                            <p className="font-mono text-white">{styleboard.password}</p>
                        </div>
                        <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">저장 시간</p>
                            <p className="text-sm text-white">{formatDate(styleboard.saved_at)}</p>
                        </div>
                    </div>

                    {/* 링크 정보 */}
                    <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                        <p className="text-xs text-gray-500 mb-2">스타일보드 링크</p>
                        <code className="block text-sm text-blue-400 break-all">
                            {window.location.origin}/styleboard/{styleboard.id}
                        </code>
                    </div>

                    {/* 공간별 선택 이미지 (2단계 구조) */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">공간별 선택 이미지</h3>
                        <div className="space-y-6">
                            {Object.entries(selectedImages).map(([spaceKey, subCategories]) => {
                                if (!subCategories || typeof subCategories !== 'object') return null;

                                // 공간 이름 (영문 키를 한글로 변환)
                                const spaceLabel = spaceCategoryLabels[spaceKey as SpaceCategory] || spaceKey;

                                // 해당 공간의 전체 이미지 수 계산
                                const spaceImageCount = Object.values(subCategories).reduce(
                                    (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0
                                );

                                if (spaceImageCount === 0) return null;

                                return (
                                    <div key={spaceKey} className="border border-white/10 rounded-lg p-4">
                                        <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                                            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-bold">
                                                {spaceLabel}
                                            </span>
                                            <span className="text-gray-500">({spaceImageCount}장)</span>
                                        </h4>

                                        <div className="space-y-4">
                                            {Object.entries(subCategories as Record<string, string[]>).map(([subKey, images]) => {
                                                if (!Array.isArray(images) || images.length === 0) return null;

                                                return (
                                                    <div key={subKey}>
                                                        <p className="text-xs text-gray-400 mb-2">
                                                            {subKey} ({images.length}장)
                                                        </p>
                                                        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                                            {images.map((imagePath, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="aspect-square rounded-lg overflow-hidden border border-white/10 cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
                                                                    onClick={() => setEnlargedImage(imagePath)}
                                                                >
                                                                    <img
                                                                        src={imagePath}
                                                                        alt={`${spaceLabel} ${subKey} ${idx + 1}`}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                            {Object.keys(selectedImages).length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    아직 선택된 이미지가 없습니다.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 flex justify-between sticky bottom-0 bg-gray-950/90 backdrop-blur-xl">
                    <button
                        onClick={onDelete}
                        className="px-4 py-2 text-red-400 hover:text-red-300 transition-colors"
                    >
                        삭제
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>

            {/* 이미지 확대 모달 */}
            {enlargedImage && (
                <div
                    className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
                    onClick={() => setEnlargedImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                        onClick={() => setEnlargedImage(null)}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <img
                        src={enlargedImage}
                        alt="확대 이미지"
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}

// 고객 행 컴포넌트 - 스타일보드 유무에 따라 다른 UI
function CustomerRow({
    estimate,
    styleboard,
    selectedCount,
    onCreateStyleboard,
    onSendLink,
    onViewDetail,
    creating,
    sendingLink,
}: {
    estimate: EstimateRequest;
    styleboard: StyleboardWithEstimate | undefined;
    selectedCount: number;
    onCreateStyleboard: (password: string) => Promise<void>;
    onSendLink: () => void;
    onViewDetail: () => void;
    creating: boolean;
    sendingLink: boolean;
}) {
    const [isCreating, setIsCreating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const hasStyleboard = !!styleboard;

    // 랜덤 비밀번호 생성 (4자리 숫자)
    const generatePassword = () => {
        return Math.floor(1000 + Math.random() * 9000).toString();
    };

    // 스타일보드 생성 + 발송
    const handleCreateAndSend = async () => {
        setIsCreating(true);
        const password = generatePassword();
        await onCreateStyleboard(password);
        setIsCreating(false);
    };

    // 이메일 발송
    const handleSendEmail = async () => {
        if (!styleboard) return;

        setIsSending(true);
        try {
            const response = await fetch('/api/styleboard/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    styleboardId: styleboard.id,
                    customerName: styleboard.customer_name,
                    customerEmail: styleboard.customer_email,
                    complexName: estimate.complex_name,
                    size: estimate.size,
                    password: styleboard.password,
                }),
            });

            const data = await response.json();
            if (data.success) {
                // 클립보드에도 복사
                const link = `${window.location.origin}/styleboard/${styleboard.id}`;
                const message = `[Standard Unit 스타일보드]\n\n${styleboard.customer_name}님, 안녕하세요!\n\n아래 링크에서 원하시는 인테리어 스타일을 선택해 주세요.\n\n링크: ${link}\n비밀번호: ${styleboard.password}\n\n문의사항이 있으시면 언제든 연락주세요.`;
                await navigator.clipboard.writeText(message);
                alert('이메일 발송 완료!\n카카오톡용 메시지도 클립보드에 복사되었습니다.');
                onSendLink(); // 상태 새로고침
            } else {
                // 이메일 실패해도 클립보드 복사
                const link = `${window.location.origin}/styleboard/${styleboard.id}`;
                const message = `[Standard Unit 스타일보드]\n\n${styleboard.customer_name}님, 안녕하세요!\n\n아래 링크에서 원하시는 인테리어 스타일을 선택해 주세요.\n\n링크: ${link}\n비밀번호: ${styleboard.password}\n\n문의사항이 있으시면 언제든 연락주세요.`;
                await navigator.clipboard.writeText(message);
                alert('이메일 발송 실패. 클립보드에 메시지가 복사되었습니다.\n카카오톡으로 직접 발송해주세요.');
                onSendLink(); // 상태 새로고침
            }
        } catch (err) {
            console.error('Send error:', err);
            alert('발송 중 오류가 발생했습니다.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <tr className="hover:bg-white/5 transition-colors">
            <td className="px-6 py-4 text-sm font-medium text-white">
                {estimate.name}
            </td>
            <td className="px-6 py-4 text-sm text-gray-300">
                {estimate.complex_name}
            </td>
            <td className="px-6 py-4 text-sm font-mono text-gray-400">
                {estimate.phone}
            </td>
            <td className="px-6 py-4">
                {hasStyleboard ? (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-white bg-gray-800 px-2 py-1 rounded">
                            {styleboard.password}
                        </span>
                        <button
                            onClick={handleSendEmail}
                            disabled={isSending || sendingLink}
                            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${isSending || sendingLink
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : styleboard.link_sent
                                    ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                    : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                                }`}
                        >
                            {isSending ? '발송중...' : styleboard.link_sent ? '재발송' : '발송'}
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleCreateAndSend}
                        disabled={creating || isCreating}
                        className={`px-3 py-1 text-xs rounded font-medium transition-colors ${creating || isCreating
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            }`}
                    >
                        {isCreating ? '생성중...' : '생성하기'}
                    </button>
                )}
            </td>
            <td className="px-6 py-4">
                {hasStyleboard ? (
                    styleboard.saved_at ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full">
                            ✓ 선택완료 ({selectedCount}장)
                        </span>
                    ) : styleboard.link_sent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
                            발송완료
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full">
                            대기중
                        </span>
                    )
                ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-500/20 text-gray-400 rounded-full">
                        미생성
                    </span>
                )}
            </td>
            <td className="px-6 py-4">
                {hasStyleboard ? (
                    <button
                        onClick={onViewDetail}
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        상세보기
                    </button>
                ) : (
                    <span className="text-sm text-gray-600">-</span>
                )}
            </td>
        </tr>
    );
}
