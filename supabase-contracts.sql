-- ==========================================
-- 온라인 계약 시스템 테이블
-- ==========================================

-- 계약서 테이블
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,  -- 연결된 견적서
    contract_number TEXT NOT NULL UNIQUE,                     -- 계약번호 (CT-2025-0001)
    access_code TEXT NOT NULL UNIQUE,                         -- 고객 접근용 비밀번호
    
    -- 고객 정보 (관리자 입력)
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    customer_address TEXT,
    customer_id_number TEXT,                                  -- 주민등록번호 (선택)
    
    -- 시공 정보
    property_address TEXT,
    construction_start_date DATE,
    construction_end_date DATE,
    
    -- 결제 정보 (선금/중도금/잔금)
    total_amount BIGINT NOT NULL DEFAULT 0,
    deposit_amount BIGINT DEFAULT 0,                          -- 선금
    deposit_due_date DATE,                                    -- 선금 납부일
    mid_payment_1 BIGINT DEFAULT 0,                           -- 중도금 1차
    mid_payment_1_due_date DATE,                              -- 중도금 1차 납부일
    mid_payment_2 BIGINT DEFAULT 0,                           -- 중도금 2차
    mid_payment_2_due_date DATE,                              -- 중도금 2차 납부일
    final_payment BIGINT DEFAULT 0,                           -- 잔금
    final_payment_due_date DATE,                              -- 잔금 납부일
    
    -- 계약 상태
    status TEXT NOT NULL DEFAULT 'pending',                   -- pending, signed, cancelled
    signed_at TIMESTAMPTZ,
    customer_signature_url TEXT,                              -- 고객 서명 이미지 URL
    company_stamp_url TEXT,                                   -- 회사 도장 이미지 URL
    
    -- 계약서 내용
    contract_content TEXT,                                    -- 계약 조항 (마크다운 또는 HTML)
    special_terms TEXT,                                       -- 특약사항
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 계약서 버전 히스토리
CREATE TABLE IF NOT EXISTS contract_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    
    -- 스냅샷 데이터
    quote_id UUID,
    contract_number TEXT NOT NULL,
    
    -- 고객 정보 스냅샷
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    customer_address TEXT,
    customer_id_number TEXT,
    
    -- 시공 정보 스냅샷
    property_address TEXT,
    construction_start_date DATE,
    construction_end_date DATE,
    
    -- 결제 정보 스냅샷
    total_amount BIGINT NOT NULL DEFAULT 0,
    deposit_amount BIGINT DEFAULT 0,
    deposit_due_date DATE,
    mid_payment_1 BIGINT DEFAULT 0,
    mid_payment_1_due_date DATE,
    mid_payment_2 BIGINT DEFAULT 0,
    mid_payment_2_due_date DATE,
    final_payment BIGINT DEFAULT 0,
    final_payment_due_date DATE,
    
    -- 계약 상태 스냅샷
    status TEXT NOT NULL DEFAULT 'pending',
    signed_at TIMESTAMPTZ,
    customer_signature_url TEXT,
    
    -- 계약서 내용 스냅샷
    contract_content TEXT,
    special_terms TEXT,
    
    -- 버전 메타
    saved_reason TEXT,                                        -- 저장 사유
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_contracts_quote_id ON contracts(quote_id);
CREATE INDEX IF NOT EXISTS idx_contracts_access_code ON contracts(access_code);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contract_versions_contract_id ON contract_versions(contract_id);

-- RLS 정책 설정
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_versions ENABLE ROW LEVEL SECURITY;

-- 서비스 역할 접근 정책 (API용)
CREATE POLICY "Allow all for service role on contracts" ON contracts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for service role on contract_versions" ON contract_versions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 코멘트 추가
COMMENT ON TABLE contracts IS '온라인 계약서 - 고객 서명 포함';
COMMENT ON TABLE contract_versions IS '계약서 버전 히스토리';
COMMENT ON COLUMN contracts.access_code IS '고객이 계약서 접근시 사용하는 비밀번호';
COMMENT ON COLUMN contracts.status IS 'pending: 대기중, signed: 서명완료, cancelled: 취소됨';
