-- ============================================
-- material_prices 및 quote_items 테이블에 size 컬럼 추가
-- ============================================

-- 1. material_prices 테이블에 size 컬럼 추가
ALTER TABLE material_prices 
ADD COLUMN IF NOT EXISTS size VARCHAR(100);

-- 2. quote_items 테이블에 size 컬럼 추가
ALTER TABLE quote_items 
ADD COLUMN IF NOT EXISTS size VARCHAR(100);

-- 3. 컬럼 설명 추가
COMMENT ON COLUMN material_prices.size IS '자재 사이즈 (예: 700×400×680, 600각)';
COMMENT ON COLUMN quote_items.size IS '자재 사이즈 (예: 700×400×680, 600각)';

-- ============================================
-- 실행 후 확인
-- ============================================
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'material_prices' OR table_name = 'quote_items';
