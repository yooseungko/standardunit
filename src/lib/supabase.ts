import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Supabase 클라이언트 생성 (환경 변수가 있을 때만)
export const supabase: SupabaseClient | null =
    supabaseUrl && supabaseAnonKey
        ? createClient(supabaseUrl, supabaseAnonKey)
        : null;

// Supabase 연결 여부 확인
export const isSupabaseConfigured = !!supabase;

// 견적 요청 타입
export interface EstimateRequest {
    id?: number;
    complex_name: string;
    size: string;
    floor_type?: string | null;
    name: string;
    phone: string;
    email?: string | null;
    wants_construction?: boolean;
    status: 'pending' | 'contacted' | 'completed' | 'cancelled';
    created_at?: string;
    notes?: string | null;
    construction_scope?: string[];
}

// ============================================
// 견적 분석 시스템 타입
// ============================================

// 파일 처리 상태
export type ProcessingStatus = 'pending' | 'parsing' | 'extracting' | 'reviewing' | 'completed' | 'failed';

// 파일 타입
export type EstimateFileType = 'pdf' | 'xlsx' | 'xls' | 'csv';

// 공종 카테고리
export type EstimateCategory = '바닥' | '벽면' | '천장' | '주방' | '욕실' | '목공' | '전기' | '설비' | '철거' | '기타';

// 비교 등급
export type ComparisonGrade = 'Standard' | 'Premium' | 'Luxury' | 'Over-Luxury' | 'Under-Standard';

// 견적서 파일
export interface EstimateFile {
    id: string;
    file_name: string;
    file_type: EstimateFileType;
    file_url?: string | null;
    file_size?: number | null;
    uploaded_at: string;
    processed: boolean;
    processing_status: ProcessingStatus;
    error_message?: string | null;
    request_id?: number | null;
    apartment_name?: string | null;
    apartment_size?: number | null;
    submitted_by?: string | null;
    created_at: string;
    updated_at: string;
}

// 추출된 견적 항목
export interface ExtractedEstimateItem {
    id: string;
    file_id: string;

    // 카테고리 계층 (AI가 동적으로 판단)
    category: string; // 대분류: 바닥, 벽면, 천장, 주방, 욕실, 목공, 전기, 설비, 철거 등
    sub_category?: string | null; // 중분류: 수전, 도기, 타일, 조명 등
    detail_category?: string | null; // 소분류: 욕실수전, 샤워수전, 양변기 등

    // 항목명
    original_item_name: string; // 원본 (띄어쓰기 포함: "수 전", "마 루")
    normalized_item_name: string; // AI 정규화 ("수전", "마루")

    // 제품 정보
    brand?: string | null; // 브랜드 (대림바스, 한샘 등)
    model?: string | null; // 모델명
    product_grade?: string | null; // 등급 (일반, 중급, 고급, 수입)

    unit?: string | null;
    quantity?: number | null;
    unit_price?: number | null;
    total_price?: number | null;
    notes?: string | null;

    // AI 분석 정보
    confidence_score: number;
    ai_reasoning?: string | null; // AI가 이 카테고리로 분류한 이유

    is_verified: boolean;
    created_at: string;
    updated_at: string;
}

// 견적 분석 결과
export interface EstimateAnalysis {
    id: string;
    file_id: string;
    apartment_size: number;
    total_extracted_price?: number | null;
    standard_price?: number | null;
    premium_price?: number | null;
    luxury_price?: number | null;
    comparison_percentage?: number | null;
    closest_grade?: ComparisonGrade | null;
    price_difference?: number | null;
    analysis_summary?: string | null;
    category_breakdown?: CategoryBreakdown | null;
    analyzed_at: string;
    created_at: string;
}

// 카테고리별 분석 데이터
export interface CategoryBreakdown {
    [category: string]: {
        extracted_total: number;
        standard_total: number;
        difference_percentage: number;
    };
}

// AI 추출 결과 형식
export interface AIExtractedData {
    apartment_size?: number;
    apartment_name?: string;
    items: AIExtractedItem[];
    total_price?: number;
    raw_text?: string;
}

// AI가 추출한 개별 항목
export interface AIExtractedItem {
    // 카테고리 계층
    category: string; // 대분류
    sub_category?: string | null; // 중분류 (수전, 도기, 타일 등)
    detail_category?: string | null; // 소분류 (욕실수전, 샤워수전 등)

    // 항목명
    original_item_name: string; // 원본 그대로
    normalized_item_name: string; // 정규화된 이름

    // 제품 정보
    brand?: string | null;
    model?: string | null;
    product_grade?: string | null; // 일반/중급/고급/수입

    // 수량 및 가격
    unit?: string | null;
    quantity?: number | null;
    unit_price?: number | null;
    total_price?: number | null;

    // AI 분석 정보
    confidence_score: number; // 0-1
    ai_reasoning: string; // 분류 이유 ("'욕실 수 전'은 띄어쓰기를 제거하면 '욕실수전'으로, 욕실>수전>욕실수전으로 분류")
}

// ============================================
// 표준화 및 시간 기반 가격 추적 타입
// ============================================

// 표준 항목 마스터 (정규화된 항목 사전)
export interface StandardItem {
    id: string;
    category: string;
    sub_category?: string | null;
    detail_category?: string | null;
    normalized_name: string;
    unit?: string | null;
    description?: string | null;
    aliases?: string[]; // 이 항목으로 매핑될 수 있는 다양한 표현들
    data_count: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// 가격 기록 (시간별 가격 데이터)
export interface PriceRecord {
    id: string;
    standard_item_id: string;
    extracted_item_id?: string | null;

    // 시간 정보
    price_year: number;
    price_month: number;
    price_yearmonth: string; // '2025-12'

    // 가격 정보
    unit_price?: number | null;
    quantity?: number | null;
    total_price?: number | null;

    // 제품 정보
    brand?: string | null;
    product_grade?: string | null;

    // 메타데이터
    apartment_size?: number | null;
    region?: string | null;
    is_verified: boolean;

    created_at: string;
}

// 월별 가격 통계
export interface MonthlyPriceStats {
    id: string;
    standard_item_id: string;
    stats_yearmonth: string; // '2025-12'

    // 통계
    avg_unit_price?: number | null;
    min_unit_price?: number | null;
    max_unit_price?: number | null;
    median_unit_price?: number | null;

    data_count: number;
    verified_count: number;

    // 신뢰도
    confidence_level: number; // 0.00 ~ 1.00

    // 변동률
    month_over_month_change?: number | null; // 전월 대비
    year_over_year_change?: number | null; // 전년 동월 대비 (인플레이션)

    updated_at: string;
}

// 신뢰도 계산 함수
export function calculateConfidence(dataCount: number, verifiedCount: number): number {
    // 데이터가 많고, 검증된 비율이 높을수록 신뢰도 상승
    // n=1: 0.1, n=5: 0.4, n=10: 0.6, n=30: 0.85, n=50+: 0.95
    const countFactor = Math.min(dataCount / 50, 1) * 0.7; // 최대 0.7
    const verifiedRatio = dataCount > 0 ? verifiedCount / dataCount : 0;
    const verifiedFactor = verifiedRatio * 0.3; // 최대 0.3
    return Math.min(countFactor + verifiedFactor, 1);
}

// 로컬 스토리지 키 (Supabase 없을 때 사용)
export const LOCAL_STORAGE_KEY = 'standard_unit_estimates';
