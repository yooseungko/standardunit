-- quotes 테이블에 calculation_comment 컬럼 추가
-- Supabase SQL Editor에서 실행하세요

ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS calculation_comment TEXT;

COMMENT ON COLUMN quotes.calculation_comment IS 'AI가 생성한 견적 항목 계산 설명';
