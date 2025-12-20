-- ============================================
-- 단가 관리 시스템 테이블 (Pricing Management System)
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- ============================================
-- 1. 인건비 테이블 (Labor Costs)
-- 관리자가 직접 설정하는 직종별 노임 단가
-- ============================================

CREATE TABLE labor_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 직종 정보
  labor_type TEXT NOT NULL UNIQUE, -- '목수', '타일공', '도배공', '전기공', '설비공' 등
  labor_type_en TEXT, -- 'carpenter', 'tile_worker' 등 (선택)
  description TEXT, -- 직종 설명
  
  -- 단가 정보
  daily_rate DECIMAL(15, 0) NOT NULL, -- 일당 (원)
  hourly_rate DECIMAL(15, 0), -- 시간당 (원) - 계산용
  
  -- 적용 범위
  min_work_hours DECIMAL(4, 1) DEFAULT 8, -- 최소 작업 시간 (일당 기준)
  overtime_rate DECIMAL(3, 2) DEFAULT 1.5, -- 연장근무 할증률 (1.5 = 50% 할증)
  
  -- 메모
  notes TEXT,
  
  -- 상태
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 초기 인건비 데이터 삽입
INSERT INTO labor_costs (labor_type, labor_type_en, daily_rate, description) VALUES
  ('목수', 'carpenter', 280000, '목공사, 가구 설치, 문틀 등'),
  ('타일공', 'tile_worker', 300000, '바닥/벽면 타일 시공'),
  ('도배공', 'wallpaper_worker', 250000, '도배 시공'),
  ('전기공', 'electrician', 280000, '전기 배선, 조명 설치'),
  ('설비공', 'plumber', 290000, '배관, 보일러, 위생설비'),
  ('철거공', 'demolition_worker', 230000, '철거 작업'),
  ('잡역', 'general_worker', 180000, '청소, 운반, 보조 작업'),
  ('페인트공', 'painter', 260000, '페인트, 도장 작업'),
  ('샤시공', 'window_installer', 300000, '창호/샤시 설치'),
  ('유리공', 'glass_worker', 280000, '유리 설치')
ON CONFLICT (labor_type) DO NOTHING;


-- ============================================
-- 2. 자재/제품 단가 테이블 (Material Prices)
-- 시장 가격 변동을 반영하는 자재 DB
-- ============================================

-- 자재 카테고리 테이블
CREATE TABLE material_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  category TEXT NOT NULL, -- 대분류: '바닥', '벽면', '천장' 등
  sub_category TEXT, -- 중분류: '마루', '타일', '시트' 등
  detail_category TEXT, -- 소분류: '강화마루', '원목마루', '비닐타일' 등
  
  description TEXT,
  standard_unit TEXT, -- 표준 단위: '㎡', 'M', '개', '식', 'EA' 등
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (category, sub_category, detail_category)
);

-- 자재/제품 단가 테이블
CREATE TABLE material_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 카테고리 참조
  category_id UUID REFERENCES material_categories(id) ON DELETE SET NULL,
  
  -- 또는 직접 카테고리 지정 (카테고리 없이도 사용 가능)
  category TEXT NOT NULL, -- 대분류
  sub_category TEXT, -- 중분류
  detail_category TEXT, -- 소분류
  
  -- 제품 정보
  product_name TEXT NOT NULL, -- 제품명
  brand TEXT, -- 브랜드: 'LG하우시스', '한샘', '대림바스' 등
  model TEXT, -- 모델명
  product_grade TEXT DEFAULT '일반', -- '일반', '중급', '고급', '수입'
  
  -- 단가 정보
  unit TEXT NOT NULL, -- '㎡', 'M', '개', '식' 등
  unit_price DECIMAL(15, 0) NOT NULL, -- 단가 (원)
  price_includes_install BOOLEAN DEFAULT FALSE, -- 시공비 포함 여부
  
  -- 가격 유효 기간
  price_date DATE DEFAULT CURRENT_DATE, -- 가격 기준일
  price_valid_until DATE, -- 가격 유효 기한 (선택)
  
  -- 데이터 출처
  source TEXT, -- 가격 출처: '제조사', '도매상', '인터넷 검색' 등
  source_url TEXT, -- 참조 URL
  
  -- 메모
  notes TEXT,
  
  -- 상태
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE, -- 관리자 검증 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 자재 단가 초기 데이터 (대표값)
INSERT INTO material_prices (category, sub_category, detail_category, product_name, brand, unit, unit_price, product_grade) VALUES
  -- 바닥재
  ('바닥', '마루', '강화마루', '강화마루 12mm', NULL, '㎡', 35000, '일반'),
  ('바닥', '마루', '강화마루', '강화마루 12mm', 'LG하우시스', '㎡', 45000, '중급'),
  ('바닥', '마루', '강화마루', '강화마루 12mm', '한화', '㎡', 48000, '중급'),
  ('바닥', '마루', '원목마루', '원목마루 15mm', NULL, '㎡', 85000, '고급'),
  ('바닥', '타일', '폴리싱', '폴리싱 타일 600x600', NULL, '㎡', 38000, '일반'),
  ('바닥', '타일', '포세린', '포세린 타일 600x600', NULL, '㎡', 55000, '중급'),
  
  -- 벽면
  ('벽면', '도배', '실크', '실크 도배지', NULL, '㎡', 8000, '일반'),
  ('벽면', '도배', '합지', '합지 도배지', NULL, '㎡', 5500, '일반'),
  ('벽면', '페인트', '수성페인트', '수성 페인트', '노루페인트', '㎡', 12000, '중급'),
  
  -- 천장
  ('천장', '몰딩', 'PVC몰딩', 'PVC 몰딩', NULL, 'M', 3500, '일반'),
  ('천장', '몰딩', '폴리우레탄', '폴리우레탄 몰딩', NULL, 'M', 8500, '중급'),
  
  -- 주방
  ('주방', '싱크대', '상부장', '주방 상부장', '한샘', 'M', 320000, '중급'),
  ('주방', '싱크대', '하부장', '주방 하부장', '한샘', 'M', 450000, '중급'),
  ('주방', '상판', '인조대리석', '인조대리석 상판', NULL, 'M', 180000, '일반'),
  ('주방', '상판', '엔지니어드스톤', '엔지니어드스톤', NULL, 'M', 350000, '중급'),
  
  -- 욕실
  ('욕실', '도기', '양변기', '양변기 원피스', '대림바스', '개', 250000, '일반'),
  ('욕실', '도기', '양변기', '양변기 비데일체형', 'TOTO', '개', 650000, '고급'),
  ('욕실', '도기', '세면기', '세면대 일체형', '대림바스', '개', 180000, '일반'),
  ('욕실', '수전', '세면수전', '세면수전', NULL, '개', 85000, '일반'),
  ('욕실', '수전', '샤워수전', '샤워수전 세트', NULL, '개', 120000, '일반'),
  ('욕실', '타일', '벽타일', '욕실 벽타일 300x600', NULL, '㎡', 35000, '일반'),
  
  -- 목공
  ('목공', '문', '방문', '방문 ABS', NULL, '개', 180000, '일반'),
  ('목공', '문', '현관문', '현관문 단열', NULL, '개', 450000, '일반'),
  ('목공', '걸레받이', 'PVC걸레받이', 'PVC 걸레받이', NULL, 'M', 4500, '일반'),
  ('목공', '붙박이장', '붙박이장', '붙박이장 슬라이딩', NULL, 'M', 280000, '일반'),
  
  -- 전기
  ('전기', '콘센트', '2구콘센트', '2구 콘센트', NULL, '개', 8500, '일반'),
  ('전기', '스위치', '3구스위치', '3구 스위치', NULL, '개', 12000, '일반'),
  ('전기', '조명', 'LED등', 'LED 방등', NULL, '개', 45000, '일반'),
  ('전기', '조명', 'LED등', 'LED 거실등', NULL, '개', 85000, '일반')
ON CONFLICT DO NOTHING;


-- ============================================
-- 3. 복합 비용 테이블 (Composite Costs)
-- 인건비 + 서비스비가 합쳐진 정량화 어려운 비용
-- ============================================

CREATE TABLE composite_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 비용 정보
  cost_name TEXT NOT NULL UNIQUE, -- '폐기물 처리', '철거 공사' 등
  cost_name_en TEXT, -- 영문명 (선택)
  description TEXT,
  
  -- 카테고리
  category TEXT NOT NULL, -- '철거', '기타' 등
  sub_category TEXT,
  
  -- 단가 정보
  unit TEXT NOT NULL, -- '톤', '㎡', '식' 등
  unit_price DECIMAL(15, 0) NOT NULL, -- 단가 (원)
  
  -- 구성요소 비율 (선택 - 원가 분석용)
  labor_ratio DECIMAL(3, 2), -- 인건비 비율 (예: 0.40 = 40%)
  material_ratio DECIMAL(3, 2), -- 자재비 비율
  service_ratio DECIMAL(3, 2), -- 서비스/운영비 비율
  other_ratio DECIMAL(3, 2), -- 기타 비율
  
  -- 적용 조건
  min_quantity DECIMAL(10, 2), -- 최소 적용 수량 (예: 폐기물 최소 1톤)
  calculation_notes TEXT, -- 수량 계산 방법 안내
  
  -- 메모
  notes TEXT,
  
  -- 상태
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 복합 비용 초기 데이터
INSERT INTO composite_costs (cost_name, cost_name_en, category, sub_category, unit, unit_price, labor_ratio, service_ratio, description, calculation_notes) VALUES
  ('폐기물 처리', 'waste_disposal', '철거', '폐기물', '톤', 450000, 0.30, 0.70, '철거 폐기물 수거/운반/처리 비용', '보통 32평 기준 전체 철거 시 3~4톤 발생'),
  ('내부 철거 (전체)', 'full_demolition', '철거', '철거', '㎡', 25000, 0.50, 0.50, '바닥/벽체/천장 전면 철거', '전용면적 기준'),
  ('내부 철거 (부분)', 'partial_demolition', '철거', '철거', '㎡', 15000, 0.50, 0.50, '부분 철거 (욕실, 주방 등)', '철거 범위 면적 기준'),
  ('양중비', 'elevator_fee', '기타', '운반', '식', 300000, 0.20, 0.80, '자재 양중(엘리베이터 사용) 비용', '고층/자재량에 따라 변동'),
  ('가설공사', 'temporary_work', '기타', '가설', '식', 250000, 0.40, 0.60, '보양재, 안전시설 설치/철거', '공사 규모에 따라 변동'),
  ('현장관리비', 'site_management', '기타', '관리', '%', 5, 0.70, 0.30, '현장 관리 인건비', '총 공사비의 5%'),
  ('산업재해보험', 'industrial_insurance', '기타', '보험', '%', 1, 0.00, 1.00, '산업재해 보상보험료', '인건비의 1%'),
  ('청소비', 'cleaning', '기타', '청소', '㎡', 3000, 0.60, 0.40, '입주 전 정밀 청소', '전용면적 기준')
ON CONFLICT (cost_name) DO NOTHING;


-- ============================================
-- 4. 단가 변동 이력 테이블 (Price History)
-- 모든 단가 변경을 추적
-- ============================================

CREATE TABLE price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 참조 테이블 구분
  price_type TEXT NOT NULL CHECK (price_type IN ('labor', 'material', 'composite')),
  reference_id UUID NOT NULL, -- labor_costs.id / material_prices.id / composite_costs.id
  
  -- 변경 내용
  field_changed TEXT NOT NULL, -- 변경된 필드명
  old_value TEXT, -- 이전 값
  new_value TEXT NOT NULL, -- 새 값
  
  -- 변경 사유
  change_reason TEXT,
  changed_by TEXT, -- 변경자
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================
-- 5. 인덱스 생성
-- ============================================

CREATE INDEX idx_labor_costs_type ON labor_costs(labor_type);
CREATE INDEX idx_labor_costs_active ON labor_costs(is_active);

CREATE INDEX idx_material_categories_category ON material_categories(category);
CREATE INDEX idx_material_prices_category ON material_prices(category, sub_category);
CREATE INDEX idx_material_prices_brand ON material_prices(brand);
CREATE INDEX idx_material_prices_active ON material_prices(is_active);

CREATE INDEX idx_composite_costs_category ON composite_costs(category);
CREATE INDEX idx_composite_costs_active ON composite_costs(is_active);

CREATE INDEX idx_price_history_type ON price_history(price_type, reference_id);
CREATE INDEX idx_price_history_date ON price_history(created_at DESC);


-- ============================================
-- 6. RLS 설정
-- ============================================

ALTER TABLE labor_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE composite_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- 정책 생성 (관리자용 - 실제 배포 시 인증 추가 권장)
CREATE POLICY "Anyone can manage labor_costs" ON labor_costs
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can manage material_categories" ON material_categories
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can manage material_prices" ON material_prices
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can manage composite_costs" ON composite_costs
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can manage price_history" ON price_history
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ============================================
-- 7. updated_at 트리거 적용
-- ============================================

CREATE TRIGGER update_labor_costs_updated_at
BEFORE UPDATE ON labor_costs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_material_prices_updated_at
BEFORE UPDATE ON material_prices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_composite_costs_updated_at
BEFORE UPDATE ON composite_costs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_material_categories_updated_at
BEFORE UPDATE ON material_categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 8. 가격 변경 자동 기록 트리거
-- ============================================

CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- 인건비 변경 기록
  IF TG_TABLE_NAME = 'labor_costs' THEN
    IF OLD.daily_rate IS DISTINCT FROM NEW.daily_rate THEN
      INSERT INTO price_history (price_type, reference_id, field_changed, old_value, new_value)
      VALUES ('labor', NEW.id, 'daily_rate', OLD.daily_rate::TEXT, NEW.daily_rate::TEXT);
    END IF;
  -- 자재비 변경 기록
  ELSIF TG_TABLE_NAME = 'material_prices' THEN
    IF OLD.unit_price IS DISTINCT FROM NEW.unit_price THEN
      INSERT INTO price_history (price_type, reference_id, field_changed, old_value, new_value)
      VALUES ('material', NEW.id, 'unit_price', OLD.unit_price::TEXT, NEW.unit_price::TEXT);
    END IF;
  -- 복합비용 변경 기록
  ELSIF TG_TABLE_NAME = 'composite_costs' THEN
    IF OLD.unit_price IS DISTINCT FROM NEW.unit_price THEN
      INSERT INTO price_history (price_type, reference_id, field_changed, old_value, new_value)
      VALUES ('composite', NEW.id, 'unit_price', OLD.unit_price::TEXT, NEW.unit_price::TEXT);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_labor_price_change
AFTER UPDATE ON labor_costs
FOR EACH ROW
EXECUTE FUNCTION log_price_change();

CREATE TRIGGER log_material_price_change
AFTER UPDATE ON material_prices
FOR EACH ROW
EXECUTE FUNCTION log_price_change();

CREATE TRIGGER log_composite_price_change
AFTER UPDATE ON composite_costs
FOR EACH ROW
EXECUTE FUNCTION log_price_change();
