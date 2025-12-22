-- 견적서 버전 관리 테이블 생성
-- Quote Version History Table for version control

-- 견적서 버전 테이블
CREATE TABLE IF NOT EXISTS quote_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    
    -- 버전 메타 정보
    quote_number TEXT NOT NULL,  -- 원본 견적번호 + 버전
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    saved_reason TEXT,  -- 저장 사유 (수정, 등급변경 등)
    
    -- 금액 정보 스냅샷
    total_amount BIGINT NOT NULL DEFAULT 0,
    labor_cost BIGINT NOT NULL DEFAULT 0,
    material_cost BIGINT NOT NULL DEFAULT 0,
    other_cost BIGINT NOT NULL DEFAULT 0,
    discount_amount BIGINT NOT NULL DEFAULT 0,
    discount_reason TEXT,
    vat_amount BIGINT NOT NULL DEFAULT 0,
    final_amount BIGINT NOT NULL DEFAULT 0,
    
    -- 상태 스냅샷
    status TEXT NOT NULL DEFAULT 'draft',
    notes TEXT,
    calculation_comment TEXT,
    valid_until TIMESTAMPTZ,
    
    -- 고객 정보 스냅샷
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    property_address TEXT,
    property_size REAL,
    
    -- 생성 시간
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 견적서 버전 항목 테이블 (각 버전의 항목 저장)
CREATE TABLE IF NOT EXISTS quote_version_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES quote_versions(id) ON DELETE CASCADE,
    
    -- 항목 정보
    category TEXT NOT NULL,
    sub_category TEXT,
    item_name TEXT NOT NULL,
    description TEXT,
    size TEXT,
    quantity REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    unit_price BIGINT NOT NULL DEFAULT 0,
    total_price BIGINT NOT NULL DEFAULT 0,
    cost_type TEXT NOT NULL DEFAULT 'composite',
    labor_ratio REAL NOT NULL DEFAULT 0.3,
    sort_order INT NOT NULL DEFAULT 0,
    is_optional BOOLEAN NOT NULL DEFAULT FALSE,
    is_included BOOLEAN NOT NULL DEFAULT TRUE,
    reference_type TEXT,
    reference_id UUID,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_quote_versions_quote_id ON quote_versions(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_versions_saved_at ON quote_versions(saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_version_items_version_id ON quote_version_items(version_id);

-- RLS 정책 설정
ALTER TABLE quote_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_version_items ENABLE ROW LEVEL SECURITY;

-- 관리자 전체 접근 정책
CREATE POLICY "Allow all for authenticated users on quote_versions" ON quote_versions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users on quote_version_items" ON quote_version_items
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 서비스 역할 접근 정책 (API용)
CREATE POLICY "Allow all for service role on quote_versions" ON quote_versions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for service role on quote_version_items" ON quote_version_items
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 버전 번호 자동 증가 함수
CREATE OR REPLACE FUNCTION get_next_version_number(p_quote_id UUID)
RETURNS INT AS $$
DECLARE
    max_version INT;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) INTO max_version
    FROM quote_versions
    WHERE quote_id = p_quote_id;
    
    RETURN max_version + 1;
END;
$$ LANGUAGE plpgsql;

-- 코멘트 추가
COMMENT ON TABLE quote_versions IS '견적서 버전 히스토리 - 수정 시 이전 버전 자동 저장';
COMMENT ON TABLE quote_version_items IS '견적서 버전의 항목 스냅샷';
COMMENT ON COLUMN quote_versions.version_number IS '버전 번호 (1부터 시작, 자동 증가)';
COMMENT ON COLUMN quote_versions.saved_reason IS '버전 저장 사유 (수정, 등급변경 등)';
