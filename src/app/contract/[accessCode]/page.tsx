"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import SignaturePad from "@/components/SignaturePad";
import { Contract } from "@/types/contract";

type ViewMode = 'main' | 'quote' | 'contract' | 'signing' | 'complete';

function formatPrice(price: number): string {
    return new Intl.NumberFormat("ko-KR").format(price);
}

function formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ko-KR');
}

export default function ContractPage() {
    const params = useParams();
    const accessCode = params.accessCode as string;

    const [contract, setContract] = useState<Contract | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('main');
    const [signing, setSigning] = useState(false);

    // 계약서 조회
    useEffect(() => {
        if (!accessCode) return;

        async function fetchContract() {
            try {
                const response = await fetch(`/api/contracts?access_code=${accessCode}`);
                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || '계약서를 찾을 수 없습니다.');
                }

                setContract(result.data);

                // 이미 서명된 계약이면 완료 화면으로
                if (result.data.status === 'signed') {
                    setViewMode('complete');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        }

        fetchContract();
    }, [accessCode]);

    // 서명 처리
    const handleSign = async (signatureData: string) => {
        if (!contract) return;

        try {
            setSigning(true);

            const response = await fetch('/api/contracts/sign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contract_id: contract.id,
                    signature_data: signatureData,
                }),
            });

            const result = await response.json();

            if (result.success) {
                setContract(result.data);
                setViewMode('complete');
            } else {
                alert('서명 처리 중 오류가 발생했습니다: ' + result.error);
            }
        } catch (err) {
            console.error('Sign error:', err);
            alert('서명 처리 중 오류가 발생했습니다.');
        } finally {
            setSigning(false);
        }
    };

    // 로딩 화면
    if (loading) {
        return (
            <div className="min-h-screen min-h-[100dvh] bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-white border-t-transparent rounded-full mx-auto" />
                    <p className="text-gray-400 mt-4 text-sm">로딩 중...</p>
                </div>
            </div>
        );
    }

    // 에러 화면
    if (error || !contract) {
        return (
            <div className="min-h-screen min-h-[100dvh] bg-black flex items-center justify-center p-6">
                <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-8 text-center w-full max-w-sm">
                    <div className="text-5xl mb-4">⚠️</div>
                    <p className="text-red-400 text-xl font-bold">접근 오류</p>
                    <p className="text-gray-300 mt-3 text-base">{error || '계약서를 찾을 수 없습니다.'}</p>
                    <p className="text-gray-500 text-sm mt-6">접근 코드를 확인해주세요.</p>
                </div>
            </div>
        );
    }

    // 완료 화면
    if (viewMode === 'complete') {
        return (
            <div className="min-h-screen min-h-[100dvh] bg-black flex flex-col">
                {/* 헤더 */}
                <header className="bg-black/80 backdrop-blur-xl text-white py-5 px-5 border-b border-white/10 safe-area-top">
                    <h1 className="text-lg font-bold tracking-wide text-center">Standard Unit</h1>
                </header>

                {/* 메인 컨텐츠 */}
                <main className="flex-1 px-5 py-8 safe-area-bottom">
                    <div className="max-w-sm mx-auto">
                        {/* 완료 배너 */}
                        <div className="bg-gradient-to-br from-green-600/30 to-emerald-600/20 border border-green-500/40 rounded-3xl p-8 text-center">
                            <div className="text-7xl mb-5">✅</div>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                계약이 완료되었습니다
                            </h2>
                            <p className="text-gray-200 text-lg">
                                {contract.customer_name}님, 감사합니다.
                            </p>
                            <p className="text-gray-400 text-sm mt-5">
                                서명일: {formatDate(contract.signed_at || '')}
                            </p>
                        </div>

                        {/* 계약 정보 */}
                        <div className="mt-8 space-y-4">
                            <div className="bg-white/5 rounded-2xl p-5">
                                <p className="text-gray-400 text-sm">계약번호</p>
                                <p className="text-white font-mono font-bold text-lg mt-1">{contract.contract_number}</p>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-5">
                                <p className="text-gray-400 text-sm">총 계약금액</p>
                                <p className="text-emerald-400 text-2xl font-bold mt-1">₩{formatPrice(contract.total_amount)}</p>
                            </div>
                        </div>

                        {/* 버튼들 */}
                        <div className="mt-10 space-y-4">
                            <button
                                onClick={() => setViewMode('contract')}
                                className="w-full py-5 bg-white/10 active:bg-white/20 text-white rounded-2xl transition-colors text-lg font-medium"
                            >
                                📄 계약서 다시 보기
                            </button>
                            {contract.quote_id && (
                                <button
                                    onClick={() => window.open(`/q/${contract.quote_id}`, '_blank')}
                                    className="w-full py-5 bg-white/10 active:bg-white/20 text-white rounded-2xl transition-colors text-lg font-medium"
                                >
                                    📋 견적서 보기
                                </button>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // 메인 화면 (버튼 2개)
    if (viewMode === 'main') {
        return (
            <div className="min-h-screen min-h-[100dvh] bg-black flex flex-col">
                {/* 헤더 */}
                <header className="bg-black/80 backdrop-blur-xl text-white py-5 px-5 border-b border-white/10 safe-area-top">
                    <h1 className="text-lg font-bold tracking-wide text-center">Standard Unit</h1>
                </header>

                {/* 메인 컨텐츠 */}
                <main className="flex-1 flex flex-col justify-center px-5 py-10 safe-area-bottom">
                    <div className="max-w-sm mx-auto w-full">
                        {/* 인사말 */}
                        <div className="text-center mb-10">
                            <p className="text-gray-400 text-base">안녕하세요</p>
                            <h2 className="text-3xl font-bold text-white mt-2">
                                {contract.customer_name}님
                            </h2>
                        </div>

                        {/* 계약 정보 카드 */}
                        <div className="bg-white/5 rounded-3xl p-7 mb-8">
                            <div className="text-center">
                                <p className="text-gray-400 text-sm">계약번호</p>
                                <p className="text-white font-mono font-bold text-xl mt-1">{contract.contract_number}</p>
                            </div>
                            <div className="mt-6 pt-6 border-t border-white/10 text-center">
                                <p className="text-gray-400 text-sm">총 계약금액</p>
                                <p className="text-emerald-400 text-3xl font-bold mt-2">₩{formatPrice(contract.total_amount)}</p>
                            </div>
                        </div>

                        {/* 메인 버튼들 */}
                        <div className="space-y-4">
                            {contract.quote_id && (
                                <button
                                    onClick={() => window.open(`/q/${contract.quote_id}`, '_blank')}
                                    className="w-full py-6 bg-white/10 active:bg-white/20 text-white rounded-2xl transition-colors flex items-center justify-center gap-4 text-xl"
                                >
                                    <span className="text-3xl">📋</span>
                                    최종 견적서 보기
                                </button>
                            )}

                            <button
                                onClick={() => setViewMode('contract')}
                                className="w-full py-6 bg-gradient-to-r from-blue-600 to-blue-500 active:from-blue-500 active:to-blue-400 text-white rounded-2xl transition-colors flex items-center justify-center gap-4 text-xl font-bold shadow-lg shadow-blue-500/30"
                            >
                                <span className="text-3xl">✍️</span>
                                계약하기
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // 계약서 보기 / 서명 화면
    return (
        <div className="min-h-screen min-h-[100dvh] bg-black">
            {/* 고정 헤더 */}
            <header className="bg-black/90 backdrop-blur-xl text-white py-4 px-5 border-b border-white/10 sticky top-0 z-20 safe-area-top">
                <div className="max-w-lg mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="font-bold text-lg">계약서</h1>
                        <p className="text-gray-400 text-sm">{contract.contract_number}</p>
                    </div>
                    <button
                        onClick={() => setViewMode('main')}
                        className="px-5 py-2.5 bg-white/10 active:bg-white/20 rounded-xl text-base font-medium"
                    >
                        ← 뒤로
                    </button>
                </div>
            </header>

            {/* 스크롤 컨텐츠 */}
            <main className="max-w-lg mx-auto px-5 py-6 pb-36">
                {/* 계약 정보 */}
                <section className="bg-white/5 rounded-2xl p-5 mb-5">
                    <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="text-xl">📋</span> 계약 정보
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">계약자</span>
                            <span className="text-white font-medium text-right">{contract.customer_name}</span>
                        </div>
                        <div className="flex justify-between items-start">
                            <span className="text-gray-400">시공 주소</span>
                            <span className="text-white font-medium text-right max-w-[60%]">{contract.property_address || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">공사 기간</span>
                            <span className="text-white font-medium text-sm">
                                {formatDate(contract.construction_start_date || '')} ~ {formatDate(contract.construction_end_date || '')}
                            </span>
                        </div>
                    </div>
                </section>

                {/* 결제 일정 */}
                <section className="bg-white/5 rounded-2xl p-5 mb-5">
                    <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="text-xl">💰</span> 결제 일정
                    </h3>
                    <div className="space-y-3">
                        {/* 선금 */}
                        <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                            <div>
                                <p className="text-gray-400 text-sm">선금</p>
                                <p className="text-white font-bold text-lg mt-0.5">₩{formatPrice(contract.deposit_amount)}</p>
                            </div>
                            <p className="text-gray-300 text-sm font-medium">{formatDate(contract.deposit_due_date || '')}</p>
                        </div>

                        {/* 중도금 1차 */}
                        {contract.mid_payment_1 > 0 && (
                            <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                                <div>
                                    <p className="text-gray-400 text-sm">중도금 1차</p>
                                    <p className="text-white font-bold text-lg mt-0.5">₩{formatPrice(contract.mid_payment_1)}</p>
                                </div>
                                <p className="text-gray-300 text-sm font-medium">{formatDate(contract.mid_payment_1_due_date || '')}</p>
                            </div>
                        )}

                        {/* 중도금 2차 */}
                        {contract.mid_payment_2 > 0 && (
                            <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                                <div>
                                    <p className="text-gray-400 text-sm">중도금 2차</p>
                                    <p className="text-white font-bold text-lg mt-0.5">₩{formatPrice(contract.mid_payment_2)}</p>
                                </div>
                                <p className="text-gray-300 text-sm font-medium">{formatDate(contract.mid_payment_2_due_date || '')}</p>
                            </div>
                        )}

                        {/* 잔금 */}
                        <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                            <div>
                                <p className="text-gray-400 text-sm">잔금</p>
                                <p className="text-white font-bold text-lg mt-0.5">₩{formatPrice(contract.final_payment)}</p>
                            </div>
                            <p className="text-gray-300 text-sm font-medium">{formatDate(contract.final_payment_due_date || '')}</p>
                        </div>

                        {/* 총액 */}
                        <div className="border-t border-white/10 pt-4 mt-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-300 font-medium">총 계약금액</span>
                                <span className="text-emerald-400 font-bold text-xl">₩{formatPrice(contract.total_amount)}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 계약 조항 */}
                <section className="bg-white/5 rounded-2xl p-5 mb-5">
                    <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="text-xl">📜</span> 계약 일반조건
                    </h3>
                    <div className="max-h-96 overflow-y-auto text-gray-200 text-base leading-loose whitespace-pre-wrap bg-white/5 p-5 rounded-xl">
                        {contract.contract_content}
                    </div>
                </section>

                {/* 특약사항 */}
                {contract.special_terms && (
                    <section className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-5">
                        <h3 className="text-amber-400 font-bold text-lg mb-3 flex items-center gap-2">
                            <span className="text-xl">📝</span> 특약사항
                        </h3>
                        <p className="text-gray-200 text-base leading-relaxed whitespace-pre-wrap">{contract.special_terms}</p>
                    </section>
                )}

                {/* 시공사 (을) */}
                <section className="bg-white/5 rounded-2xl p-5 mb-5">
                    <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="text-xl">🏢</span> 시공사 (을)
                    </h3>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white font-bold text-lg">스탠다드유닛</p>
                            <p className="text-gray-400 text-sm mt-1">Standard Unit Interior</p>
                        </div>
                        <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center border-2 border-red-500/50">
                            <span className="text-red-400 text-sm font-bold">도장</span>
                        </div>
                    </div>
                </section>

                {/* 계약자 (갑) - 서명 영역 */}
                {contract.status === 'signed' ? (
                    <section className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5">
                        <h3 className="text-green-400 font-bold text-lg mb-3 flex items-center gap-2">
                            <span className="text-xl">✅</span> 계약자 서명 완료
                        </h3>
                        {contract.customer_signature_url && (
                            <div className="bg-white rounded-xl p-3 inline-block">
                                <img
                                    src={contract.customer_signature_url}
                                    alt="고객 서명"
                                    className="max-h-24"
                                />
                            </div>
                        )}
                        <p className="text-gray-400 text-sm mt-3">
                            서명일: {formatDate(contract.signed_at || '')}
                        </p>
                    </section>
                ) : viewMode === 'signing' ? (
                    <section className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5">
                        <h3 className="text-blue-400 font-bold text-lg mb-4 flex items-center gap-2">
                            <span className="text-xl">✍️</span> 계약자 서명
                        </h3>
                        <SignaturePad
                            onSave={handleSign}
                            onCancel={() => setViewMode('contract')}
                            width={280}
                            height={140}
                        />
                    </section>
                ) : (
                    <section className="bg-white/5 rounded-2xl p-5">
                        <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                            <span className="text-xl">✍️</span> 계약자 (갑)
                        </h3>
                        <p className="text-white text-lg font-medium">{contract.customer_name}</p>
                        <button
                            onClick={() => setViewMode('signing')}
                            className="w-full mt-5 py-4 bg-blue-600 active:bg-blue-500 text-white rounded-xl transition-colors font-bold text-lg"
                        >
                            서명하기
                        </button>
                    </section>
                )}

                {/* 전자서명법 안내 */}
                <div className="mt-6 mb-4 px-2">
                    <p className="text-gray-500 text-xs leading-relaxed text-center">
                        본 온라인계약서는 전자서명법(제4조의2)에 의거 전자서명도 서명, 서명날인, 기명날인으로서의 효력이 부인되지 않으며, 법령이나 당사자 간 약정에 따라 선택된 경우 서면과 동일한 효력을 가집니다.
                    </p>
                </div>
            </main>

            {/* 하단 고정 CTA 버튼 */}
            {viewMode === 'contract' && contract.status !== 'signed' && (
                <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-white/10 p-5 pb-8 safe-area-bottom z-10">
                    <div className="max-w-lg mx-auto">
                        <button
                            onClick={() => setViewMode('signing')}
                            disabled={signing}
                            className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-500 active:from-blue-500 active:to-blue-400 text-white rounded-2xl transition-colors font-bold text-xl disabled:opacity-50 shadow-lg shadow-blue-500/30"
                        >
                            {signing ? '처리 중...' : '✍️ 계약 서명하기'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
