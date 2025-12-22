-- ============================================
-- 대표 항목 등급 필드 추가 마이그레이션
-- ============================================
-- 이 SQL을 Supabase SQL Editor에서 실행하세요!
-- ============================================

-- 1. labor_costs 테이블에 representative_grade 컬럼 추가
ALTER TABLE labor_costs 
ADD COLUMN IF NOT EXISTS representative_grade TEXT;

-- 2. material_prices 테이블에 representative_grade 컬럼 추가
ALTER TABLE material_prices 
ADD COLUMN IF NOT EXISTS representative_grade TEXT;

-- 3. composite_costs 테이블에 representative_grade 컬럼 추가
ALTER TABLE composite_costs 
ADD COLUMN IF NOT EXISTS representative_grade TEXT;

-- 컬럼에 대한 코멘트 추가 (선택사항)
COMMENT ON COLUMN labor_costs.representative_grade IS '대표 항목 등급: 기본, 중급, 고급 중 하나 또는 NULL';
COMMENT ON COLUMN material_prices.representative_grade IS '대표 항목 등급: 기본, 중급, 고급 중 하나 또는 NULL';
COMMENT ON COLUMN composite_costs.representative_grade IS '대표 항목 등급: 기본, 중급, 고급 중 하나 또는 NULL';

-- ============================================
-- 확인 쿼리
-- ============================================
-- 추가된 컬럼 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'labor_costs' AND column_name = 'representative_grade';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'material_prices' AND column_name = 'representative_grade';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'composite_costs' AND column_name = 'representative_grade';

-- ============================================
-- 사용 예시: 대표 항목 조회
-- ============================================
-- 기본 등급 대표 항목 조회
-- SELECT * FROM labor_costs WHERE representative_grade = '기본' AND is_active = true;
-- SELECT * FROM material_prices WHERE representative_grade = '기본' AND is_active = true;
-- SELECT * FROM composite_costs WHERE representative_grade = '기본' AND is_active = true;
