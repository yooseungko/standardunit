"use client";

import { useState, useEffect } from "react";
import { Contract, CONTRACT_STATUS_COLORS, ContractStatus } from "@/types/contract";

interface ConfirmedQuote {
    id: string;
    quote_number: string;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    property_address?: string;
    property_size?: number;
    final_amount: number;
    status: string;
    created_at: string;
}

export default function ContractManagement() {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [confirmedQuotes, setConfirmedQuotes] = useState<ConfirmedQuote[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedQuoteForContract, setSelectedQuoteForContract] = useState<ConfirmedQuote | null>(null);
    const [filterStatus, setFilterStatus] = useState<ContractStatus | 'all'>('all');

    // 계약 폼 상태
    const [formData, setFormData] = useState({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        customer_address: '',
        customer_id_number: '',
        property_address: '',
        construction_start_date: '',
        construction_end_date: '',
        total_amount: 0,
        deposit_amount: 0,
        deposit_due_date: '',
        mid_payment_1: 0,
        mid_payment_1_due_date: '',
        mid_payment_2: 0,
        mid_payment_2_due_date: '',
        final_payment: 0,
        final_payment_due_date: '',
        special_terms: '',
    });

    // 계약서 목록 조회
    const fetchContracts = async () => {
        try {
            const params = new URLSearchParams();
            if (filterStatus !== 'all') {
                params.append('status', filterStatus);
            }

            const response = await fetch(`/api/contracts?${params.toString()}`);
            const result = await response.json();

            if (result.success) {
                setContracts(result.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch contracts:', error);
        }
    };

    // 확정된 견적서 목록 조회
    const fetchConfirmedQuotes = async () => {
        try {
            const response = await fetch('/api/quotes?status=confirmed');
            const result = await response.json();

            if (result.success) {
                setConfirmedQuotes(result.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch confirmed quotes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContracts();
        fetchConfirmedQuotes();
    }, [filterStatus]);

    // 금액 포맷
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('ko-KR').format(amount);
    };

    // 날짜 포맷
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('ko-KR');
    };

    // 계약서 생성
    const handleCreateContract = async () => {
        try {
            const response = await fetch('/api/contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    quote_id: selectedQuoteForContract?.id,
                }),
            });

            const result = await response.json();

            if (result.success) {
                alert(`✅ 계약서가 생성되었습니다!\n\n접근코드: ${result.data.access_code}\n\n이 코드를 고객에게 전달해주세요.`);
                setIsCreating(false);
                setSelectedQuoteForContract(null);
                resetForm();
                fetchContracts();
            } else {
                alert('❌ 계약서 생성 실패: ' + result.error);
            }
        } catch (error) {
            console.error('Create contract error:', error);
            alert('계약서 생성 중 오류가 발생했습니다.');
        }
    };

    // 폼 초기화
    const resetForm = () => {
        setFormData({
            customer_name: '',
            customer_phone: '',
            customer_email: '',
            customer_address: '',
            customer_id_number: '',
            property_address: '',
            construction_start_date: '',
            construction_end_date: '',
            total_amount: 0,
            deposit_amount: 0,
            deposit_due_date: '',
            mid_payment_1: 0,
            mid_payment_1_due_date: '',
            mid_payment_2: 0,
            mid_payment_2_due_date: '',
            final_payment: 0,
            final_payment_due_date: '',
            special_terms: '',
        });
    };

    // 견적서에서 계약 생성 시작
    const startContractFromQuote = (quote: ConfirmedQuote) => {
        setSelectedQuoteForContract(quote);
        setFormData({
            ...formData,
            customer_name: quote.customer_name || '',
            customer_email: quote.customer_email || '',
            customer_phone: quote.customer_phone || '',
            property_address: quote.property_address || '',
            total_amount: quote.final_amount || 0,
        });
        setIsCreating(true);
    };

    // 계약서 삭제
    const handleDeleteContract = async (contractId: string) => {
        if (!confirm('정말 이 계약서를 삭제하시겠습니까?')) return;

        try {
            const response = await fetch(`/api/contracts?id=${contractId}`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (result.success) {
                setContracts(contracts.filter(c => c.id !== contractId));
                setSelectedContract(null);
            } else {
                alert('삭제 실패: ' + result.error);
            }
        } catch (error) {
            console.error('Delete contract error:', error);
        }
    };

    // 고객 계약 페이지 열기
    const openContractPage = (accessCode: string) => {
        window.open(`/contract/${accessCode}`, '_blank');
    };

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">계약 관리</h2>
                    <p className="text-gray-400 mt-1">
                        견적 확정된 고객과 온라인 계약을 진행할 수 있습니다
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as ContractStatus | 'all')}
                        className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="all">전체 상태</option>
                        <option value="pending">서명 대기</option>
                        <option value="signed">계약 완료</option>
                        <option value="cancelled">취소됨</option>
                    </select>
                </div>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">확정된 견적</p>
                    <p className="text-2xl font-bold text-white mt-1">{confirmedQuotes.length}건</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">전체 계약서</p>
                    <p className="text-2xl font-bold text-blue-400 mt-1">{contracts.length}건</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">서명 대기</p>
                    <p className="text-2xl font-bold text-yellow-400 mt-1">
                        {contracts.filter(c => c.status === 'pending').length}건
                    </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">계약 완료</p>
                    <p className="text-2xl font-bold text-green-400 mt-1">
                        {contracts.filter(c => c.status === 'signed').length}건
                    </p>
                </div>
            </div>

            {/* 견적 확정 목록 */}
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-white/5 border-b border-white/10">
                    <h3 className="text-white font-medium">📋 견적 확정 고객 (계약 가능)</h3>
                </div>
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full mx-auto" />
                    </div>
                ) : confirmedQuotes.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        <p>견적 확정된 고객이 없습니다.</p>
                        <p className="text-sm mt-2">견적서 관리에서 견적을 확정해주세요.</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">견적번호</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">고객명</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">견적금액</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">확정일</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">작업</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {confirmedQuotes.map((quote) => (
                                <tr key={quote.id} className="hover:bg-white/5">
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-white">{quote.quote_number}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-white font-medium">{quote.customer_name || '-'}</p>
                                        <p className="text-gray-500 text-sm">{quote.customer_email || '-'}</p>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-white font-bold">₩{formatMoney(quote.final_amount)}</span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 text-sm">
                                        {formatDate(quote.created_at)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => startContractFromQuote(quote)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
                                        >
                                            ✍️ 계약하기
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 계약서 목록 */}
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-white/5 border-b border-white/10">
                    <h3 className="text-white font-medium">📄 계약서 목록</h3>
                </div>
                {contracts.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        <p>생성된 계약서가 없습니다.</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">계약번호</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">고객명</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">계약금액</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">상태</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">접근코드</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">작업</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {contracts.map((contract) => {
                                const status = CONTRACT_STATUS_COLORS[contract.status] || CONTRACT_STATUS_COLORS.pending;
                                return (
                                    <tr key={contract.id} className="hover:bg-white/5">
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-white">{contract.contract_number}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-white font-medium">{contract.customer_name}</p>
                                            <p className="text-gray-500 text-sm">{contract.customer_phone || '-'}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-white font-bold">₩{formatMoney(contract.total_amount)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-mono text-blue-400 bg-blue-500/20 px-2 py-1 rounded">
                                                {contract.access_code}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openContractPage(contract.access_code)}
                                                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-gray-300 text-sm rounded-lg transition-colors"
                                                    title="고객 페이지 열기"
                                                >
                                                    🔗
                                                </button>
                                                <button
                                                    onClick={() => setSelectedContract(contract)}
                                                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-gray-300 text-sm rounded-lg transition-colors"
                                                >
                                                    상세
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteContract(contract.id)}
                                                    className="px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm rounded-lg transition-colors"
                                                >
                                                    🗑️
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

            {/* 계약서 생성 모달 */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-white/10">
                            <h3 className="text-xl font-bold text-white">새 계약서 작성</h3>
                            {selectedQuoteForContract && (
                                <p className="text-gray-400 mt-1">
                                    견적서: {selectedQuoteForContract.quote_number}
                                </p>
                            )}
                        </div>
                        <div className="p-6 space-y-6">
                            {/* 고객 정보 */}
                            <div>
                                <h4 className="text-white font-medium mb-3">👤 고객 정보</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">고객명 *</label>
                                        <input
                                            type="text"
                                            value={formData.customer_name}
                                            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">연락처</label>
                                        <input
                                            type="tel"
                                            value={formData.customer_phone}
                                            onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">이메일</label>
                                        <input
                                            type="email"
                                            value={formData.customer_email}
                                            onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">주소</label>
                                        <input
                                            type="text"
                                            value={formData.customer_address}
                                            onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 시공 정보 */}
                            <div>
                                <h4 className="text-white font-medium mb-3">🏠 시공 정보</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-gray-400 text-sm mb-1">시공 주소</label>
                                        <input
                                            type="text"
                                            value={formData.property_address}
                                            onChange={(e) => setFormData({ ...formData, property_address: e.target.value })}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">공사 시작일</label>
                                        <input
                                            type="date"
                                            value={formData.construction_start_date}
                                            onChange={(e) => setFormData({ ...formData, construction_start_date: e.target.value })}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">공사 종료일</label>
                                        <input
                                            type="date"
                                            value={formData.construction_end_date}
                                            onChange={(e) => setFormData({ ...formData, construction_end_date: e.target.value })}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 결제 정보 */}
                            <div>
                                <h4 className="text-white font-medium mb-3">💰 결제 정보</h4>
                                <div className="mb-4">
                                    <label className="block text-gray-400 text-sm mb-1">총 계약금액 *</label>
                                    <input
                                        type="number"
                                        value={formData.total_amount}
                                        onChange={(e) => setFormData({ ...formData, total_amount: Number(e.target.value) })}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-lg font-bold"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">선금</label>
                                        <input
                                            type="number"
                                            value={formData.deposit_amount}
                                            onChange={(e) => setFormData({ ...formData, deposit_amount: Number(e.target.value) })}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">선금 납부일</label>
                                        <input
                                            type="date"
                                            value={formData.deposit_due_date}
                                            onChange={(e) => setFormData({ ...formData, deposit_due_date: e.target.value })}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">중도금 1차</label>
                                        <input
                                            type="number"
                                            value={formData.mid_payment_1}
                                            onChange={(e) => setFormData({ ...formData, mid_payment_1: Number(e.target.value) })}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">중도금 1차 납부일</label>
                                        <input
                                            type="date"
                                            value={formData.mid_payment_1_due_date}
                                            onChange={(e) => setFormData({ ...formData, mid_payment_1_due_date: e.target.value })}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">중도금 2차</label>
                                        <input
                                            type="number"
                                            value={formData.mid_payment_2}
                                            onChange={(e) => setFormData({ ...formData, mid_payment_2: Number(e.target.value) })}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">중도금 2차 납부일</label>
                                        <input
                                            type="date"
                                            value={formData.mid_payment_2_due_date}
                                            onChange={(e) => setFormData({ ...formData, mid_payment_2_due_date: e.target.value })}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">잔금</label>
                                        <input
                                            type="number"
                                            value={formData.final_payment}
                                            onChange={(e) => setFormData({ ...formData, final_payment: Number(e.target.value) })}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">잔금 납부일</label>
                                        <input
                                            type="date"
                                            value={formData.final_payment_due_date}
                                            onChange={(e) => setFormData({ ...formData, final_payment_due_date: e.target.value })}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 특약사항 */}
                            <div>
                                <h4 className="text-white font-medium mb-3">📝 특약사항</h4>
                                <textarea
                                    value={formData.special_terms}
                                    onChange={(e) => setFormData({ ...formData, special_terms: e.target.value })}
                                    rows={4}
                                    placeholder="특약사항을 입력하세요..."
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white resize-none"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setIsCreating(false);
                                    setSelectedQuoteForContract(null);
                                    resetForm();
                                }}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCreateContract}
                                disabled={!formData.customer_name || !formData.total_amount}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                계약서 생성
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 계약서 상세 모달 */}
            {selectedContract && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white">{selectedContract.contract_number}</h3>
                                <p className="text-gray-400 mt-1">{selectedContract.customer_name}</p>
                            </div>
                            <button
                                onClick={() => setSelectedContract(null)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <span className="text-2xl text-gray-400">×</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-lg">
                                    <p className="text-gray-400 text-sm">총 계약금액</p>
                                    <p className="text-white font-bold text-lg">₩{formatMoney(selectedContract.total_amount)}</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-lg">
                                    <p className="text-gray-400 text-sm">계약 상태</p>
                                    <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${CONTRACT_STATUS_COLORS[selectedContract.status].bg} ${CONTRACT_STATUS_COLORS[selectedContract.status].text}`}>
                                        {CONTRACT_STATUS_COLORS[selectedContract.status].label}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-white/5 p-4 rounded-lg">
                                <p className="text-gray-400 text-sm mb-2">결제 일정</p>
                                <div className="space-y-2 text-sm">
                                    <p className="text-white">선금: ₩{formatMoney(selectedContract.deposit_amount)} ({formatDate(selectedContract.deposit_due_date || '')})</p>
                                    <p className="text-white">중도금 1차: ₩{formatMoney(selectedContract.mid_payment_1)} ({formatDate(selectedContract.mid_payment_1_due_date || '')})</p>
                                    <p className="text-white">중도금 2차: ₩{formatMoney(selectedContract.mid_payment_2)} ({formatDate(selectedContract.mid_payment_2_due_date || '')})</p>
                                    <p className="text-white">잔금: ₩{formatMoney(selectedContract.final_payment)} ({formatDate(selectedContract.final_payment_due_date || '')})</p>
                                </div>
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                                <p className="text-blue-400 font-medium">🔐 고객 접근코드</p>
                                <p className="text-white font-mono text-2xl mt-2">{selectedContract.access_code}</p>
                                <p className="text-gray-400 text-sm mt-2">
                                    고객에게 이 코드를 전달하면 계약서에 접근할 수 있습니다.
                                </p>
                            </div>

                            {selectedContract.customer_signature_url && (
                                <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg">
                                    <p className="text-green-400 font-medium mb-2">✅ 고객 서명</p>
                                    <img
                                        src={selectedContract.customer_signature_url}
                                        alt="고객 서명"
                                        className="max-h-24 bg-white rounded"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                            <button
                                onClick={() => openContractPage(selectedContract.access_code)}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                            >
                                🔗 고객 페이지 열기
                            </button>
                            <button
                                onClick={() => setSelectedContract(null)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
