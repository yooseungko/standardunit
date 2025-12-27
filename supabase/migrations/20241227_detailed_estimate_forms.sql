-- =============================================
-- 정밀 견적 요청 기능을 위한 Supabase 마이그레이션
-- =============================================

-- 1. estimate_requests 테이블에 새 컬럼 추가
ALTER TABLE estimate_requests
ADD COLUMN IF NOT EXISTS detailed_form_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS detailed_form_token VARCHAR(64) UNIQUE;

-- 상태값: 'pending' (대기), 'sent' (요청됨), 'completed' (완료됨)

-- 2. detailed_estimate_forms 테이블 생성
CREATE TABLE IF NOT EXISTS detailed_estimate_forms (
    id SERIAL PRIMARY KEY,
    estimate_id INTEGER NOT NULL REFERENCES estimate_requests(id) ON DELETE CASCADE,
    
    -- A. 철거 범위
    demolition_scope JSONB DEFAULT '[]'::jsonb,
    
    -- B. 목공 범위
    woodwork_scope JSONB DEFAULT '[]'::jsonb,
    
    -- C. 설비 범위
    plumbing_scope JSONB DEFAULT '[]'::jsonb,
    
    -- D. 확장 범위
    extension_scope JSONB DEFAULT '[]'::jsonb,
    
    -- E. 마감재 선택
    finishing_materials JSONB DEFAULT '[]'::jsonb,
    
    -- F. 욕실
    bathroom_options JSONB DEFAULT '[]'::jsonb,
    
    -- G. 가구 (type, grade, quantity)
    furniture_options JSONB DEFAULT '[]'::jsonb,
    
    -- H. 시스템 에어컨 (location, quantity)
    aircon_options JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_estimate_form UNIQUE (estimate_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_detailed_forms_estimate_id ON detailed_estimate_forms(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_requests_form_token ON estimate_requests(detailed_form_token);
CREATE INDEX IF NOT EXISTS idx_estimate_requests_form_status ON estimate_requests(detailed_form_status);

-- RLS 정책 (필요시)
-- ALTER TABLE detailed_estimate_forms ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE detailed_estimate_forms IS '정밀 견적 폼 응답 데이터';
COMMENT ON COLUMN detailed_estimate_forms.demolition_scope IS '철거 범위 선택';
COMMENT ON COLUMN detailed_estimate_forms.woodwork_scope IS '목공 범위 선택';
COMMENT ON COLUMN detailed_estimate_forms.plumbing_scope IS '설비 범위 선택';
COMMENT ON COLUMN detailed_estimate_forms.extension_scope IS '확장 범위 선택';
COMMENT ON COLUMN detailed_estimate_forms.finishing_materials IS '마감재 선택';
COMMENT ON COLUMN detailed_estimate_forms.bathroom_options IS '욕실 옵션 선택';
COMMENT ON COLUMN detailed_estimate_forms.furniture_options IS '가구 선택 (type, grade, quantity)';
COMMENT ON COLUMN detailed_estimate_forms.aircon_options IS '시스템 에어컨 선택 (location, quantity)';
