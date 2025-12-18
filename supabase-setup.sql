-- Standard Unit 견적 요청 테이블 생성 SQL
-- Supabase SQL Editor에서 실행하세요

-- 1. 테이블 생성
CREATE TABLE estimate_requests (
  id BIGSERIAL PRIMARY KEY,
  complex_name VARCHAR(255) NOT NULL,
  size VARCHAR(50) NOT NULL,
  floor_type VARCHAR(100),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  wants_construction BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 테이블에 wants_construction 컬럼 추가 (마이그레이션용)
-- ALTER TABLE estimate_requests ADD COLUMN IF NOT EXISTS wants_construction BOOLEAN DEFAULT FALSE;

-- 2. 인덱스 생성
CREATE INDEX idx_estimate_requests_status ON estimate_requests(status);
CREATE INDEX idx_estimate_requests_created_at ON estimate_requests(created_at DESC);

-- 3. RLS (Row Level Security) 설정
ALTER TABLE estimate_requests ENABLE ROW LEVEL SECURITY;

-- 4. 정책 생성 - 누구나 INSERT 가능 (폼 제출용)
CREATE POLICY "Anyone can insert estimate requests"
ON estimate_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 5. 정책 생성 - 누구나 SELECT 가능 (관리자 페이지용, 실제 배포 시 인증 추가 권장)
CREATE POLICY "Anyone can view estimate requests"
ON estimate_requests
FOR SELECT
TO anon, authenticated
USING (true);

-- 6. 정책 생성 - 누구나 UPDATE/DELETE 가능 (관리자 페이지용, 실제 배포 시 인증 추가 권장)
CREATE POLICY "Anyone can update estimate requests"
ON estimate_requests
FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can delete estimate requests"
ON estimate_requests
FOR DELETE
TO anon, authenticated
USING (true);

-- 7. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_estimate_requests_updated_at
BEFORE UPDATE ON estimate_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
