"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface EstimateRequest {
    id: number;
    complex_name: string;
    size: string;
    floor_type: string | null;
    name: string;
    phone: string;
    email: string | null;
    wants_construction: boolean;
    status: 'pending' | 'contacted' | 'completed' | 'cancelled';
    created_at: string;
    notes: string | null;
}

const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: '대기 중', color: 'bg-yellow-100 text-yellow-800' },
    contacted: { label: '연락 완료', color: 'bg-blue-100 text-blue-800' },
    completed: { label: '완료', color: 'bg-green-100 text-green-800' },
    cancelled: { label: '취소', color: 'bg-gray-100 text-gray-600' },
};

const sizeLabels: Record<string, string> = {
    '24': '24평 (59㎡)',
    '32': '32평 (84㎡)',
    '43': '43평 (110㎡)',
    '52': '52평 (132㎡)',
    'other': '그 외',
};

export default function AdminPage() {
    // 인증 상태
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [password, setPassword] = useState("");
    const [authError, setAuthError] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(false);

    // 데이터 상태
    const [estimates, setEstimates] = useState<EstimateRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedEstimate, setSelectedEstimate] = useState<EstimateRequest | null>(null);
    const [updating, setUpdating] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);

    // 견적 이메일 발송
    const handleSendEstimate = async (estimate: EstimateRequest) => {
        if (!estimate.email) {
            alert('이메일 주소가 없습니다.');
            return;
        }

        if (!confirm(`${estimate.name}님(${estimate.email})에게 견적서를 발송하시겠습니까?`)) {
            return;
        }

        try {
            setSendingEmail(true);
            const response = await fetch('/api/send-estimate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: estimate.email,
                    customerName: estimate.name,
                    complexName: estimate.complex_name,
                    size: estimate.size,
                    floorType: estimate.floor_type,
                    wantsConstruction: estimate.wants_construction,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.demo) {
                    alert(`이메일 발송 기능이 설정되지 않았습니다.\n\nRESEND_API_KEY 환경 변수를 설정해주세요.\nhttps://resend.com 에서 무료 API 키를 발급받을 수 있습니다.`);
                } else {
                    throw new Error(data.error || '이메일 발송에 실패했습니다.');
                }
                return;
            }

            alert(`${estimate.name}님에게 견적서가 발송되었습니다!`);

            // 상태를 '연락 완료'로 변경
            await handleStatusChange(estimate.id, 'contacted');
        } catch (err) {
            alert(err instanceof Error ? err.message : '이메일 발송 중 오류가 발생했습니다.');
        } finally {
            setSendingEmail(false);
        }
    };

    // 인증 확인
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch('/api/admin/verify');
                if (response.ok) {
                    setIsAuthenticated(true);
                } else {
                    setIsAuthenticated(false);
                }
            } catch {
                setIsAuthenticated(false);
            }
        };
        checkAuth();
    }, []);

    // 로그인 처리
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError(null);

        try {
            const response = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (response.ok) {
                setIsAuthenticated(true);
                setPassword("");
            } else {
                const data = await response.json();
                setAuthError(data.error || '로그인에 실패했습니다.');
            }
        } catch {
            setAuthError('오류가 발생했습니다.');
        } finally {
            setAuthLoading(false);
        }
    };

    // 로그아웃 처리
    const handleLogout = async () => {
        await fetch('/api/admin/auth', { method: 'DELETE' });
        setIsAuthenticated(false);
        setEstimates([]);
    };

    // 견적 목록 조회
    const fetchEstimates = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/estimates');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '데이터 조회에 실패했습니다.');
            }

            setEstimates(data.data || []);
            setIsDemoMode(!data.isSupabaseConfigured);
        } catch (err) {
            setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchEstimates();
        }
    }, [isAuthenticated]);

    const handleStatusChange = async (id: number, newStatus: string) => {
        try {
            setUpdating(true);
            const response = await fetch(`/api/estimates/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                throw new Error('상태 변경에 실패했습니다.');
            }

            await fetchEstimates();
            setSelectedEstimate(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        try {
            const response = await fetch(`/api/estimates/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('삭제에 실패했습니다.');
            }

            await fetchEstimates();
            setSelectedEstimate(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // 인증 확인 중
    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full" />
            </div>
        );
    }

    // 로그인 페이지
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-8">
                        <Link href="/" className="text-2xl font-black text-white">
                            Standard Unit
                        </Link>
                        <p className="text-gray-500 font-mono text-sm mt-2">ADMIN</p>
                    </div>

                    <form onSubmit={handleLogin} className="bg-white p-8">
                        <h1 className="text-xl font-bold mb-6">관리자 로그인</h1>

                        {authError && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm">
                                {authError}
                            </div>
                        )}

                        <div className="mb-6">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                비밀번호
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-black transition-colors"
                                placeholder="관리자 비밀번호"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={authLoading}
                            className={`w-full py-3 font-bold transition-colors ${authLoading
                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                : 'bg-black text-white hover:bg-gray-800'
                                }`}
                        >
                            {authLoading ? '로그인 중...' : '로그인'}
                        </button>
                    </form>

                    <p className="text-center mt-6 text-gray-500 text-sm">
                        <Link href="/" className="hover:text-white transition-colors">
                            ← 홈으로 돌아가기
                        </Link>
                    </p>
                </div>
            </div>
        );
    }

    // 로딩 중
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-600">데이터를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    // 에러 상태
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={fetchEstimates}
                        className="px-4 py-2 bg-black text-white hover:bg-gray-800"
                    >
                        다시 시도
                    </button>
                </div>
            </div>
        );
    }

    // 관리자 대시보드
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-black text-white py-4">
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/" className="text-xl font-black">
                            Standard Unit
                        </Link>
                        <span className="text-gray-400">|</span>
                        <span className="text-sm font-mono tracking-wider">ADMIN</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={fetchEstimates}
                            className="text-sm font-mono hover:text-gray-300 transition-colors"
                        >
                            새로고침
                        </button>
                        <button
                            onClick={handleLogout}
                            className="text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            로그아웃
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Demo Mode Banner */}
                {isDemoMode && (
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800">
                        <div className="flex items-start gap-3">
                            <span className="text-xl">⚠️</span>
                            <div>
                                <p className="font-semibold">데모 모드</p>
                                <p className="text-sm mt-1">
                                    Supabase가 설정되지 않았습니다. 데이터는 서버 메모리에 임시 저장됩니다.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-6 border border-gray-200">
                        <p className="font-mono text-3xl font-black">{estimates.length}</p>
                        <p className="text-sm text-gray-500 mt-1">전체 요청</p>
                    </div>
                    <div className="bg-white p-6 border border-gray-200">
                        <p className="font-mono text-3xl font-black text-yellow-600">
                            {estimates.filter(e => e.status === 'pending').length}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">대기 중</p>
                    </div>
                    <div className="bg-white p-6 border border-gray-200">
                        <p className="font-mono text-3xl font-black text-blue-600">
                            {estimates.filter(e => e.status === 'contacted').length}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">연락 완료</p>
                    </div>
                    <div className="bg-white p-6 border border-gray-200">
                        <p className="font-mono text-3xl font-black text-green-600">
                            {estimates.filter(e => e.status === 'completed').length}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">완료</p>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">접수일시</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">단지명</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">평형</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">고객명</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">연락처</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">상태</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">작업</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {estimates.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                            아직 견적 요청이 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    estimates.map((estimate) => (
                                        <tr
                                            key={estimate.id}
                                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                                            onClick={() => setSelectedEstimate(estimate)}
                                        >
                                            <td className="px-6 py-4 text-sm font-mono text-gray-600">
                                                {formatDate(estimate.created_at)}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium">{estimate.complex_name}</td>
                                            <td className="px-6 py-4 text-sm">{sizeLabels[estimate.size] || estimate.size}</td>
                                            <td className="px-6 py-4 text-sm font-medium">{estimate.name}</td>
                                            <td className="px-6 py-4 text-sm font-mono">{estimate.phone}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${statusLabels[estimate.status]?.color}`}>
                                                    {statusLabels[estimate.status]?.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedEstimate(estimate);
                                                    }}
                                                    className="text-sm text-black hover:underline"
                                                >
                                                    상세보기
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Detail Modal */}
            {selectedEstimate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-xl font-bold">견적 요청 상세</h2>
                            <button
                                onClick={() => setSelectedEstimate(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* 아파트 정보 */}
                            <div>
                                <h3 className="text-sm font-mono text-gray-400 mb-3 uppercase">아파트 정보</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">단지명</span>
                                        <span className="font-medium">{selectedEstimate.complex_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">평형</span>
                                        <span className="font-medium">{sizeLabels[selectedEstimate.size] || selectedEstimate.size}</span>
                                    </div>
                                    {selectedEstimate.floor_type && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">평면 타입</span>
                                            <span className="font-medium">{selectedEstimate.floor_type}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 고객 정보 */}
                            <div>
                                <h3 className="text-sm font-mono text-gray-400 mb-3 uppercase">고객 정보</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">성함</span>
                                        <span className="font-medium">{selectedEstimate.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">연락처</span>
                                        <a href={`tel:${selectedEstimate.phone}`} className="font-mono font-medium hover:underline">
                                            {selectedEstimate.phone}
                                        </a>
                                    </div>
                                    {selectedEstimate.email && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">이메일</span>
                                            <a href={`mailto:${selectedEstimate.email}`} className="font-medium hover:underline">
                                                {selectedEstimate.email}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 접수 정보 */}
                            <div>
                                <h3 className="text-sm font-mono text-gray-400 mb-3 uppercase">접수 정보</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">접수일시</span>
                                        <span className="font-mono text-sm">{formatDate(selectedEstimate.created_at)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">상태</span>
                                        <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${statusLabels[selectedEstimate.status]?.color}`}>
                                            {statusLabels[selectedEstimate.status]?.label}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">시공 의뢰</span>
                                        {selectedEstimate.wants_construction ? (
                                            <span className="inline-block px-3 py-1 text-xs font-bold bg-black text-white rounded-full">
                                                희망
                                            </span>
                                        ) : (
                                            <span className="inline-block px-3 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
                                                견적만
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 상태 변경 */}
                            <div>
                                <h3 className="text-sm font-mono text-gray-400 mb-3 uppercase">상태 변경</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(statusLabels).map(([key, { label }]) => (
                                        <button
                                            key={key}
                                            disabled={updating || selectedEstimate.status === key}
                                            onClick={() => handleStatusChange(selectedEstimate.id, key)}
                                            className={`px-4 py-2 text-sm font-medium border transition-colors ${selectedEstimate.status === key
                                                ? 'bg-black text-white border-black'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-black'
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200">
                            {/* 견적 발송 버튼 */}
                            {selectedEstimate.email && (
                                <button
                                    onClick={() => handleSendEstimate(selectedEstimate)}
                                    disabled={sendingEmail}
                                    className={`w-full mb-4 py-3 font-bold flex items-center justify-center gap-2 transition-colors ${sendingEmail
                                        ? 'bg-gray-400 text-white cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    {sendingEmail ? (
                                        <>
                                            <span className="animate-spin">⏳</span>
                                            발송 중...
                                        </>
                                    ) : (
                                        <>
                                            📧 견적서 이메일 발송
                                        </>
                                    )}
                                </button>
                            )}
                            {!selectedEstimate.email && (
                                <div className="mb-4 p-3 bg-gray-100 text-gray-500 text-sm text-center">
                                    이메일 주소가 없어 견적서를 발송할 수 없습니다.
                                </div>
                            )}
                            <div className="flex justify-between">
                                <button
                                    onClick={() => handleDelete(selectedEstimate.id)}
                                    className="px-4 py-2 text-red-600 hover:text-red-700 text-sm"
                                >
                                    삭제
                                </button>
                                <button
                                    onClick={() => setSelectedEstimate(null)}
                                    className="px-6 py-2 bg-black text-white hover:bg-gray-800"
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
