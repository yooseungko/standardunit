// 견적서 시스템 타입 정의

// 도면 분석 상태
export type FloorplanAnalysisStatus = 'pending' | 'analyzing' | 'completed' | 'failed';

// 견적서 상태
export type QuoteStatus = 'draft' | 'confirmed' | 'sent' | 'accepted' | 'rejected' | 'expired';

// 비용 유형
export type CostType = 'labor' | 'material' | 'composite';

// 발송 유형
export type SendType = 'email' | 'kakao' | 'sms';

// 발송 상태
export type SendStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'opened';

// 공간 분석 결과
export interface RoomAnalysis {
    name: string; // 공간명 (침실, 거실, 주방 등)
    type: 'bedroom' | 'living' | 'kitchen' | 'bathroom' | 'balcony' | 'utility' | 'hallway' | 'other';
    width: number; // 가로 (mm)
    height: number; // 세로 (mm)
    area: number; // 면적 (㎡)
    wallHeight?: number; // 층고 (mm, 기본 2400)
    features?: string[]; // 특징 (창문, 문 등)
}

// 도면 분석 결과
export interface FloorplanAnalysisResult {
    // 기본 정보
    totalArea: number; // 전체 면적 (㎡)
    rooms: RoomAnalysis[];

    // 면적 계산
    calculations: {
        floorArea: number; // 바닥 면적 (㎡)
        wallArea: number; // 벽면 면적 (㎡)
        ceilingArea: number; // 천장 면적 (㎡)
        wallLength: number; // 벽체 총 길이 (m)
        windowCount: number; // 창문 개수
        doorCount: number; // 문 개수
    };

    // 설비 수량 (Gemini 자동 계산)
    fixtures?: {
        toilet: number; // 양변기
        sink: number; // 세면기
        bathroomFaucet: number; // 욕실 수전
        kitchenFaucet: number; // 주방 수전
        showerSet: number; // 샤워기 세트
        bathroomMirror?: number; // 욕실장(거울)
        bathroomAccessory?: number; // 욕실 악세사리 세트
        lights: {
            living: number;
            bedroom: number;
            bathroom: number;
            kitchen: number;
            hallway: number;
            balcony: number;
        };
        // 전기 설비: 매입등
        recessed_lights?: {
            living: number; // 거실 매입등
            bedroom: number; // 침실 매입등 (총합)
            hallway: number; // 현관/복도 매입등
        };
        // 전기 설비: 콘센트
        outlets?: {
            living: number; // 거실 콘센트
            bedroom: number; // 침실 콘센트 (총합)
            hallway: number; // 현관/복도 콘센트
        };
        // 전기 설비: 스위치
        switches?: {
            total: number; // 스위치 총 개수
        };
        doors: {
            room: number; // 방문
            entrance: number; // 현관문
        };
        windows: number;
    };

    // 주방 정보 (상세)
    kitchen?: {
        width?: number; // 주방 가로 (m)
        sinkFaucet: number; // 싱크수전 (필수)
        sinkBowl: number; // 싱크볼 (필수)
        induction: number; // 인덕션 (필수)
        upperCabinet?: number; // 상부장 길이 (m)
        lowerCabinet?: number; // 하부장 길이 (m)
    };

    // 타일 시공 면적
    tileAreas?: {
        bathroom: number; // 욕실 타일 면적 (㎡)
        entrance: number; // 현관 타일 면적 (㎡)
        balcony: number; // 베란다 타일 면적 (㎡)
        kitchenWall: number; // 주방 벽 타일 면적 (㎡)
    };

    // 공정별 예상 자재
    estimatedMaterials?: {
        category: string;
        subCategory?: string;
        item: string;
        quantity: number;
        unit: string;
        notes?: string;
    }[];

    // ⭐ 대표 항목별 수량 (새로운 방식)
    quantities?: Record<string, {
        item: string;
        unit: string;
        quantity: number;
    }>;

    // 메타 정보
    confidence: number; // 분석 신뢰도 (0-1)
    rawOcrText?: string; // OCR 원본 텍스트
    analysisNotes?: string; // 분석 참고사항
}


// 도면 테이블
export interface Floorplan {
    id: string;
    estimate_id: number;
    file_url: string;
    file_name: string;
    file_size?: number;
    mime_type?: string;
    analysis_status: FloorplanAnalysisStatus;
    analysis_result?: FloorplanAnalysisResult;
    analysis_error?: string;
    created_at: string;
    updated_at: string;
}

// 견적서 항목
export interface QuoteItem {
    id: string;
    quote_id: string;
    category: string;
    sub_category?: string;
    item_name: string;
    description?: string;
    size?: string; // 자재 사이즈 (예: 700×400×680)
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
    cost_type: CostType;
    labor_ratio: number;
    sort_order: number;
    is_optional: boolean;
    is_included: boolean;
    reference_type?: string;
    reference_id?: string;
    created_at: string;
}

// 견적서
export interface Quote {
    id: string;
    estimate_id: number;
    floorplan_id?: string;
    quote_number: string;

    // 금액
    total_amount: number;
    labor_cost: number;
    material_cost: number;
    other_cost: number;
    discount_amount: number;
    discount_reason?: string;
    vat_amount: number;
    final_amount: number;

    // 상태
    status: QuoteStatus;

    // 메타
    notes?: string;
    calculation_comment?: string; // AI 계산 설명
    valid_until?: string;
    sent_at?: string;

    // 고객 정보 (스냅샷)
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    property_address?: string;
    property_size?: number;

    created_at: string;
    updated_at: string;

    // 조인 데이터
    items?: QuoteItem[];
    floorplan?: Floorplan;
}

// 발송 이력
export interface QuoteSendLog {
    id: string;
    quote_id: string;
    recipient_email: string;
    recipient_name?: string;
    send_type: SendType;
    status: SendStatus;
    error_message?: string;
    sent_at: string;
    opened_at?: string;
}

// 견적서 생성 요청
export interface GenerateQuoteRequest {
    estimate_id: number;
    floorplan_id?: string;
    analysis_result?: FloorplanAnalysisResult;
    manual_mode?: boolean; // 도면 없이 수동 모드 (수량 1로 시작)
    options?: {
        includeVat?: boolean; // 부가세 포함 여부
        discountPercent?: number; // 할인율
        validDays?: number; // 유효기간 (일)
    };
}

// 견적서 생성 응답
export interface GenerateQuoteResponse {
    success: boolean;
    quote?: Quote;
    error?: string;
}

// 견적서 발송 요청
export interface SendQuoteRequest {
    quote_id: string;
    send_type: SendType;
    recipient_email?: string; // 기본값: 고객 이메일
    recipient_name?: string;
    message?: string; // 추가 메시지
    include_pdf?: boolean; // PDF 첨부 여부
}

// 견적서 발송 응답
export interface SendQuoteResponse {
    success: boolean;
    send_log?: QuoteSendLog;
    error?: string;
}

// 공정 카테고리
export const QUOTE_CATEGORIES = {
    DEMOLITION: '철거',
    FLOOR: '바닥',
    WALL: '벽면',
    WALLPAPER: '도배',
    PAINTING: '페인트',
    TILE: '타일',
    ELECTRICAL: '전기',
    PLUMBING: '설비',
    KITCHEN: '주방',
    BATHROOM: '욕실',
    WINDOW: '창호',
    DOOR: '목문',
    FURNITURE: '가구',
    CLEANING: '청소',
    LABOR: '인건비',  // 인건비 카테고리 추가
    OTHER: '기타',
} as const;

// 공간 유형 한글명
export const ROOM_TYPE_LABELS: Record<RoomAnalysis['type'], string> = {
    bedroom: '침실',
    living: '거실',
    kitchen: '주방',
    bathroom: '화장실',
    balcony: '발코니',
    utility: '다용도실',
    hallway: '복도',
    other: '기타',
};

// 기본 층고 (mm)
export const DEFAULT_WALL_HEIGHT = 2400;

// ========================================
// 견적서 버전 관리 타입
// ========================================

// 견적서 버전 항목
export interface QuoteVersionItem {
    id: string;
    version_id: string;
    category: string;
    sub_category?: string;
    item_name: string;
    description?: string;
    size?: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
    cost_type: CostType;
    labor_ratio: number;
    sort_order: number;
    is_optional: boolean;
    is_included: boolean;
    reference_type?: string;
    reference_id?: string;
    created_at: string;
}

// 견적서 버전 (히스토리)
export interface QuoteVersion {
    id: string;
    quote_id: string;
    version_number: number;
    quote_number: string; // 원본 견적번호 + 버전 표시
    saved_at: string;
    saved_reason?: string; // '수정', '등급변경', '롤백' 등

    // 금액 스냅샷
    total_amount: number;
    labor_cost: number;
    material_cost: number;
    other_cost: number;
    discount_amount: number;
    discount_reason?: string;
    vat_amount: number;
    final_amount: number;

    // 상태 스냅샷
    status: QuoteStatus;
    notes?: string;
    calculation_comment?: string;
    valid_until?: string;

    // 고객 정보 스냅샷
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    property_address?: string;
    property_size?: number;

    created_at: string;

    // 조인 데이터
    items?: QuoteVersionItem[];
}

// 버전 목록 조회 응답
export interface QuoteVersionListResponse {
    success: boolean;
    data?: QuoteVersion[];
    error?: string;
}

// 롤백 요청
export interface QuoteRollbackRequest {
    quote_id: string;
    version_id: string;
}

// 롤백 응답
export interface QuoteRollbackResponse {
    success: boolean;
    quote?: Quote; // 롤백된 현재 견적서
    message?: string;
    error?: string;
}
