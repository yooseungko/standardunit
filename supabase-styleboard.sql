-- ============================================
-- 스타일보드 테이블 생성 SQL (수정본)
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- 기존 테이블/정책이 있다면 먼저 삭제
DROP TABLE IF EXISTS customer_styleboards CASCADE;

-- 고객 스타일보드 테이블
CREATE TABLE customer_styleboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id BIGINT NOT NULL REFERENCES estimate_requests(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    password TEXT NOT NULL,
    
    -- 공간별 선택 이미지 (JSONB로 저장)
    -- 2단계 구조: { "living": { "가구": ["path1.jpg"], "조명": ["path2.jpg"] } }
    selected_images JSONB DEFAULT '{}'::jsonb,
    
    -- 링크 발송 여부
    link_sent BOOLEAN DEFAULT false,
    link_sent_at TIMESTAMPTZ,
    
    -- 고객 저장 시간
    saved_at TIMESTAMPTZ,
    last_modified_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_customer_styleboards_estimate_id ON customer_styleboards(estimate_id);
CREATE INDEX idx_customer_styleboards_customer_phone ON customer_styleboards(customer_phone);

-- RLS 정책 (Row Level Security)
ALTER TABLE customer_styleboards ENABLE ROW LEVEL SECURITY;

-- 모든 사용자에게 모든 권한 (관리자 페이지에서 사용)
CREATE POLICY "Allow all operations on customer_styleboards" ON customer_styleboards
    FOR ALL USING (true) WITH CHECK (true);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_styleboard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_styleboard_updated_at ON customer_styleboards;
CREATE TRIGGER trigger_update_styleboard_updated_at
    BEFORE UPDATE ON customer_styleboards
    FOR EACH ROW
    EXECUTE FUNCTION update_styleboard_updated_at();
