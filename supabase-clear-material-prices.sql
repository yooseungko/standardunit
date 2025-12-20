-- ============================================
-- 자재 단가 테이블 전체 삭제
-- ============================================
-- 주의: 이 쿼리를 실행하면 material_prices 테이블의 
-- 모든 데이터가 영구적으로 삭제됩니다!
-- ============================================

-- 삭제 전 현재 데이터 개수 확인
SELECT COUNT(*) as total_count FROM material_prices;

-- ⚠️ 전체 삭제 실행 (아래 쿼리를 실행하세요)
DELETE FROM material_prices;

-- 삭제 후 확인
SELECT COUNT(*) as remaining_count FROM material_prices;

-- ============================================
-- 실행 방법:
-- 1. Supabase Dashboard > SQL Editor 접속
-- 2. 위 DELETE 쿼리 실행
-- 3. remaining_count가 0이면 성공!
-- ============================================
