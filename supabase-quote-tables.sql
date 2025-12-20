-- ============================================
-- 견적서 자동 생성 시스템 테이블
-- ============================================

-- 1. 도면 테이블
CREATE TABLE IF NOT EXISTS floorplans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id BIGINT REFERENCES estimate_requests(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed')),
    analysis_result JSONB, -- 도면 분석 결과 JSON
    analysis_error TEXT, -- 분석 실패 시 에러 메시지
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 견적서 테이블
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id BIGINT REFERENCES estimate_requests(id) ON DELETE CASCADE,
    floorplan_id UUID REFERENCES floorplans(id) ON DELETE SET NULL,
    quote_number TEXT NOT NULL UNIQUE, -- 견적번호 (예: QT-2024-0001)
    
    -- 금액 정보
    total_amount BIGINT NOT NULL DEFAULT 0, -- 총 금액
    labor_cost BIGINT NOT NULL DEFAULT 0, -- 인건비 합계
    material_cost BIGINT NOT NULL DEFAULT 0, -- 자재비 합계
    other_cost BIGINT NOT NULL DEFAULT 0, -- 기타 비용
    discount_amount BIGINT DEFAULT 0, -- 할인 금액
    discount_reason TEXT, -- 할인 사유
    vat_amount BIGINT DEFAULT 0, -- 부가세
    final_amount BIGINT NOT NULL DEFAULT 0, -- 최종 금액 (총액 - 할인 + 부가세)
    
    -- 상태 관리
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'sent', 'accepted', 'rejected', 'expired')),
    
    -- 메타 정보
    notes TEXT, -- 특이사항 및 메모
    valid_until DATE, -- 견적 유효기간
    sent_at TIMESTAMP WITH TIME ZONE, -- 발송일시
    
    -- 고객 정보 (estimate에서 가져오지만 견적서 시점의 정보 보존)
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    property_address TEXT,
    property_size DECIMAL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 견적서 항목 테이블
CREATE TABLE IF NOT EXISTS quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    
    -- 공정 정보
    category TEXT NOT NULL, -- 대분류 (바닥, 벽면, 도배, 전기, 설비 등)
    sub_category TEXT, -- 소분류 (마루, 타일 등)
    item_name TEXT NOT NULL, -- 항목명
    description TEXT, -- 상세 설명
    
    -- 수량 및 단가
    quantity DECIMAL NOT NULL,
    unit TEXT NOT NULL, -- 단위 (㎡, M, 개, 식 등)
    unit_price BIGINT NOT NULL, -- 단가
    total_price BIGINT NOT NULL, -- 금액 (수량 × 단가)
    
    -- 비용 분류
    cost_type TEXT DEFAULT 'material' CHECK (cost_type IN ('labor', 'material', 'composite')),
    labor_ratio DECIMAL DEFAULT 0.3, -- 인건비 비율 (복합 비용일 경우)
    
    -- 정렬 및 표시
    sort_order INTEGER DEFAULT 0,
    is_optional BOOLEAN DEFAULT FALSE, -- 선택 항목 여부
    is_included BOOLEAN DEFAULT TRUE, -- 견적 포함 여부
    
    -- 표준 단가 참조 (어떤 표준 단가를 참조했는지)
    reference_type TEXT, -- labor, material, composite
    reference_id TEXT, -- 참조한 표준 단가 ID
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 견적서 발송 이력 테이블
CREATE TABLE IF NOT EXISTS quote_send_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    send_type TEXT DEFAULT 'email' CHECK (send_type IN ('email', 'kakao', 'sms')),
    status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'opened')),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    opened_at TIMESTAMP WITH TIME ZONE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_floorplans_estimate_id ON floorplans(estimate_id);
CREATE INDEX IF NOT EXISTS idx_floorplans_status ON floorplans(analysis_status);
CREATE INDEX IF NOT EXISTS idx_quotes_estimate_id ON quotes(estimate_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_category ON quote_items(category);
CREATE INDEX IF NOT EXISTS idx_quote_send_logs_quote_id ON quote_send_logs(quote_id);

-- 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 적용
DROP TRIGGER IF EXISTS update_floorplans_updated_at ON floorplans;
CREATE TRIGGER update_floorplans_updated_at
    BEFORE UPDATE ON floorplans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
CREATE TRIGGER update_quotes_updated_at
    BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 시퀀스 (견적번호용)
CREATE SEQUENCE IF NOT EXISTS quote_number_seq START 1;

-- 견적번호 생성 함수
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    seq_part TEXT;
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    seq_part := LPAD(nextval('quote_number_seq')::TEXT, 4, '0');
    RETURN 'QT-' || year_part || '-' || seq_part;
END;
$$ LANGUAGE plpgsql;

-- RLS 정책 (Row Level Security)
ALTER TABLE floorplans ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_send_logs ENABLE ROW LEVEL SECURITY;

-- 서비스 역할은 모든 작업 허용
CREATE POLICY "Service role can do everything on floorplans" ON floorplans
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on quotes" ON quotes
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on quote_items" ON quote_items
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on quote_send_logs" ON quote_send_logs
    FOR ALL USING (true) WITH CHECK (true);

-- 스토리지 버킷 생성 (Supabase Storage)
-- 참고: 이 명령은 Supabase Dashboard에서 수동으로 생성하거나 
-- Supabase Client를 통해 생성해야 합니다.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('floorplans', 'floorplans', true);
