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

-- ============================================
-- 견적 분석 시스템 테이블
-- ============================================

-- 8. 견적서 파일 테이블
CREATE TABLE estimate_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'xlsx', 'xls', 'csv')),
  file_url TEXT, -- Supabase Storage URL
  file_size INTEGER, -- 파일 크기 (bytes)
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'parsing', 'extracting', 'reviewing', 'completed', 'failed')),
  error_message TEXT,
  request_id BIGINT REFERENCES estimate_requests(id) ON DELETE SET NULL, -- 고객 견적 요청과 연결 (선택)
  apartment_name TEXT, -- 아파트명 (수동 입력 또는 AI 추출)
  apartment_size INTEGER, -- 평형 (수동 입력 또는 AI 추출)
  submitted_by TEXT, -- 제출자 정보
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 추출된 견적 항목 테이블
-- 카테고리는 AI가 동적으로 판단하여 생성/매핑
CREATE TABLE extracted_estimate_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES estimate_files(id) ON DELETE CASCADE,
  
  -- 카테고리 (대분류: 바닥, 벽면, 천장, 주방, 욕실, 목공, 전기, 설비, 철거 등)
  category TEXT NOT NULL,
  -- 서브카테고리 (중분류: 수전, 도기, 타일, 조명 등)
  sub_category TEXT,
  -- 세부분류 (소분류: 욕실수전, 샤워수전, 세면수전, 양변기, 세면대 등)
  detail_category TEXT,
  
  -- 원본 항목명 (견적서에 적힌 그대로, "수 전", "마 루" 등 띄어쓰기 포함)
  original_item_name TEXT NOT NULL,
  -- AI가 정규화한 항목명 ("수전", "마루" 등 표준화된 이름)
  normalized_item_name TEXT NOT NULL,
  
  -- 제품 정보 (브랜드, 모델명 등)
  brand TEXT, -- 브랜드 (대림바스, 한샘, 이누스 등)
  model TEXT, -- 모델명
  product_grade TEXT, -- 제품 등급 (일반, 중급, 고급, 수입 등)
  
  unit TEXT, -- '㎡', 'M', '개', '식' 등
  quantity DECIMAL(10, 2),
  unit_price DECIMAL(15, 0),
  total_price DECIMAL(15, 0),
  notes TEXT,
  
  -- AI 분석 정보
  confidence_score DECIMAL(3, 2) DEFAULT 0.00, -- AI 추출 신뢰도 (0.00-1.00)
  ai_reasoning TEXT, -- AI가 이 카테고리로 분류한 이유
  
  is_verified BOOLEAN DEFAULT FALSE, -- 관리자 검증 완료 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. 견적 분석 결과 테이블
CREATE TABLE estimate_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES estimate_files(id) ON DELETE CASCADE UNIQUE,
  apartment_size INTEGER NOT NULL, -- 평형
  total_extracted_price DECIMAL(15, 0), -- 추출된 총 견적가
  standard_price DECIMAL(15, 0), -- 표준 견적가 (Standard 등급)
  premium_price DECIMAL(15, 0), -- Premium 등급 견적가
  luxury_price DECIMAL(15, 0), -- Luxury 등급 견적가
  comparison_percentage DECIMAL(5, 1), -- 표준 대비 % (예: 105.5)
  closest_grade TEXT CHECK (closest_grade IN ('Standard', 'Premium', 'Luxury', 'Over-Luxury', 'Under-Standard')),
  price_difference DECIMAL(15, 0), -- 표준 대비 차액 (양수: 비쌈, 음수: 저렴)
  analysis_summary TEXT, -- AI 분석 요약
  category_breakdown JSONB, -- 카테고리별 비교 데이터 JSON
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. 인덱스 생성
CREATE INDEX idx_estimate_files_processed ON estimate_files(processed);
CREATE INDEX idx_estimate_files_status ON estimate_files(processing_status);
CREATE INDEX idx_estimate_files_created_at ON estimate_files(created_at DESC);
CREATE INDEX idx_extracted_items_file_id ON extracted_estimate_items(file_id);
CREATE INDEX idx_extracted_items_category ON extracted_estimate_items(category);
CREATE INDEX idx_estimate_analysis_file_id ON estimate_analysis(file_id);

-- 12. RLS 설정
ALTER TABLE estimate_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_analysis ENABLE ROW LEVEL SECURITY;

-- 13. 정책 생성 (관리자용 - 실제 배포 시 인증 추가 권장)
CREATE POLICY "Anyone can manage estimate_files" ON estimate_files
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can manage extracted_estimate_items" ON extracted_estimate_items
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can manage estimate_analysis" ON estimate_analysis
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 14. updated_at 트리거 적용
CREATE TRIGGER update_estimate_files_updated_at
BEFORE UPDATE ON estimate_files
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extracted_estimate_items_updated_at
BEFORE UPDATE ON extracted_estimate_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 15. Supabase Storage 버킷 생성 (SQL Editor가 아닌 Dashboard에서 수동 생성 필요)
-- 버킷 이름: estimate-files
-- Public: No (비공개)
-- Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv

-- ============================================
-- 표준화 및 시간 기반 가격 추적 테이블
-- ============================================

-- 16. 표준 항목 마스터 테이블 (정규화된 항목 목록)
-- 데이터가 쌓이면서 자동으로 추가되는 표준 항목 사전
CREATE TABLE standard_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 카테고리 계층
  category TEXT NOT NULL, -- 대분류
  sub_category TEXT, -- 중분류
  detail_category TEXT, -- 소분류
  
  -- 표준화된 항목명 (유니크)
  normalized_name TEXT NOT NULL,
  
  -- 항목 메타데이터
  unit TEXT, -- 표준 단위 (㎡, M, 개, 식 등)
  description TEXT, -- 항목 설명
  
  -- 별칭 (이 항목으로 매핑될 수 있는 다양한 표현들)
  aliases TEXT[], -- ['수전', '수 전', '폭포수전', '세면수전'] 등
  
  -- 통계
  data_count INTEGER DEFAULT 0, -- 이 항목에 대한 데이터 수
  
  -- 상태
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 유니크 제약
  UNIQUE (category, sub_category, detail_category, normalized_name)
);

-- 17. 시간별 가격 데이터 테이블 (인플레이션 추적용)
-- 모든 가격 데이터를 년월 단위로 저장하여 시간에 따른 변화 추적
CREATE TABLE price_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 표준 항목 참조
  standard_item_id UUID REFERENCES standard_items(id) ON DELETE CASCADE,
  
  -- 원본 데이터 참조
  extracted_item_id UUID REFERENCES extracted_estimate_items(id) ON DELETE SET NULL,
  
  -- 시간 정보 (년월 단위로 인덱싱)
  price_year INTEGER NOT NULL, -- 년도 (2024, 2025, 2026...)
  price_month INTEGER NOT NULL CHECK (price_month BETWEEN 1 AND 12), -- 월 (1-12)
  price_yearmonth TEXT GENERATED ALWAYS AS (price_year || '-' || LPAD(price_month::TEXT, 2, '0')) STORED, -- '2025-12' 형식
  
  -- 가격 정보
  unit_price DECIMAL(15, 0), -- 단가
  quantity DECIMAL(10, 2), -- 수량
  total_price DECIMAL(15, 0), -- 금액
  
  -- 제품 정보
  brand TEXT,
  product_grade TEXT, -- 일반/중급/고급/수입
  
  -- 평형 정보 (크기별 가격 차이 분석용)
  apartment_size INTEGER,
  
  -- 지역 정보 (향후 확장용)
  region TEXT, -- 서울/경기/인천 등
  
  -- 데이터 품질
  is_verified BOOLEAN DEFAULT FALSE, -- 관리자 검증 여부
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. 월별 가격 통계 뷰 (집계용)
-- 각 항목별 월별 평균 가격, 최소/최대, 데이터 수
CREATE TABLE monthly_price_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  standard_item_id UUID REFERENCES standard_items(id) ON DELETE CASCADE,
  
  -- 시간
  stats_yearmonth TEXT NOT NULL, -- '2025-12'
  
  -- 통계
  avg_unit_price DECIMAL(15, 0), -- 평균 단가
  min_unit_price DECIMAL(15, 0), -- 최소 단가
  max_unit_price DECIMAL(15, 0), -- 최대 단가
  median_unit_price DECIMAL(15, 0), -- 중앙값 (선택)
  
  data_count INTEGER DEFAULT 0, -- 데이터 수
  verified_count INTEGER DEFAULT 0, -- 검증된 데이터 수
  
  -- 신뢰도 (데이터 수가 많을수록 높음)
  confidence_level DECIMAL(3, 2) DEFAULT 0.00, -- 0.00 ~ 1.00
  
  -- 전월 대비 변동률
  month_over_month_change DECIMAL(5, 2), -- % 변동 (예: 2.5 = 2.5% 상승)
  
  -- 전년 동월 대비 변동률 (인플레이션 지표)
  year_over_year_change DECIMAL(5, 2), -- % 변동
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (standard_item_id, stats_yearmonth)
);

-- 19. 인덱스 추가
CREATE INDEX idx_standard_items_category ON standard_items(category);
CREATE INDEX idx_standard_items_normalized ON standard_items(normalized_name);
CREATE INDEX idx_price_records_yearmonth ON price_records(price_yearmonth);
CREATE INDEX idx_price_records_item ON price_records(standard_item_id);
CREATE INDEX idx_monthly_stats_yearmonth ON monthly_price_stats(stats_yearmonth);

-- 20. RLS 설정
ALTER TABLE standard_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_price_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage standard_items" ON standard_items
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can manage price_records" ON price_records
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can manage monthly_price_stats" ON monthly_price_stats
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 21. 트리거
CREATE TRIGGER update_standard_items_updated_at
BEFORE UPDATE ON standard_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
