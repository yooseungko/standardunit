// 온라인 계약 시스템 타입 정의

// 계약 상태
export type ContractStatus = 'pending' | 'signed' | 'cancelled';

// 결제 일정
export interface PaymentSchedule {
    deposit: number;               // 선금
    depositDueDate?: string;
    midPayment1: number;           // 중도금 1차
    midPayment1DueDate?: string;
    midPayment2: number;           // 중도금 2차
    midPayment2DueDate?: string;
    finalPayment: number;          // 잔금
    finalPaymentDueDate?: string;
}

// 계약서
export interface Contract {
    id: string;
    quote_id?: string;                    // 연결된 견적서 ID
    contract_number: string;              // 계약번호 (CT-2025-0001)
    access_code: string;                  // 고객 접근용 비밀번호

    // 고객 정보
    customer_name: string;
    customer_phone?: string;
    customer_email?: string;
    customer_address?: string;
    customer_id_number?: string;          // 주민등록번호 (선택)

    // 시공 정보
    property_address?: string;
    construction_start_date?: string;
    construction_end_date?: string;

    // 결제 정보
    total_amount: number;
    deposit_amount: number;               // 선금
    deposit_due_date?: string;
    mid_payment_1: number;                // 중도금 1차
    mid_payment_1_due_date?: string;
    mid_payment_2: number;                // 중도금 2차
    mid_payment_2_due_date?: string;
    final_payment: number;                // 잔금
    final_payment_due_date?: string;

    // 계약 상태
    status: ContractStatus;
    signed_at?: string;
    customer_signature_url?: string;      // 고객 서명 이미지 URL
    company_stamp_url?: string;           // 회사 도장 이미지 URL

    // 계약서 내용
    contract_content?: string;            // 계약 조항
    special_terms?: string;               // 특약사항

    created_at: string;
    updated_at: string;

    // 조인 데이터
    quote?: {
        id: string;
        quote_number: string;
        final_amount: number;
        customer_name?: string;
    };
}

// 계약서 버전
export interface ContractVersion {
    id: string;
    contract_id: string;
    version_number: number;

    // 스냅샷 데이터
    quote_id?: string;
    contract_number: string;
    customer_name: string;
    customer_phone?: string;
    customer_email?: string;
    customer_address?: string;
    property_address?: string;
    construction_start_date?: string;
    construction_end_date?: string;

    total_amount: number;
    deposit_amount: number;
    deposit_due_date?: string;
    mid_payment_1: number;
    mid_payment_1_due_date?: string;
    mid_payment_2: number;
    mid_payment_2_due_date?: string;
    final_payment: number;
    final_payment_due_date?: string;

    status: ContractStatus;
    signed_at?: string;
    customer_signature_url?: string;
    contract_content?: string;
    special_terms?: string;

    saved_reason?: string;
    created_at: string;
}

// 계약서 생성 요청
export interface CreateContractRequest {
    quote_id?: string;
    customer_name: string;
    customer_phone?: string;
    customer_email?: string;
    customer_address?: string;
    customer_id_number?: string;
    property_address?: string;
    construction_start_date?: string;
    construction_end_date?: string;
    total_amount: number;
    deposit_amount: number;
    deposit_due_date?: string;
    mid_payment_1: number;
    mid_payment_1_due_date?: string;
    mid_payment_2: number;
    mid_payment_2_due_date?: string;
    final_payment: number;
    final_payment_due_date?: string;
    special_terms?: string;
}

// 계약서 응답
export interface ContractResponse {
    success: boolean;
    data?: Contract;
    error?: string;
}

// 계약서 목록 응답
export interface ContractListResponse {
    success: boolean;
    data?: Contract[];
    error?: string;
}

// 고객 접근 검증 요청
export interface VerifyAccessRequest {
    access_code: string;
}

// 서명 요청
export interface SignContractRequest {
    contract_id: string;
    signature_data: string;   // base64 인코딩된 서명 이미지
}

// 상태별 색상
export const CONTRACT_STATUS_COLORS: Record<ContractStatus, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '서명 대기' },
    signed: { bg: 'bg-green-500/20', text: 'text-green-400', label: '계약 완료' },
    cancelled: { bg: 'bg-red-500/20', text: 'text-red-400', label: '취소됨' },
};
