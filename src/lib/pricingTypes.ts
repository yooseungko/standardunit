// ============================================
// 단가 관리 시스템 타입 정의
// ============================================

// 대표 항목 등급 타입
export type RepresentativeGrade = '기본' | '중급' | '고급' | null;

// 인건비 (Labor Costs)
export interface LaborCost {
  id: string;
  labor_type: string; // '목수', '타일공' 등
  labor_type_en?: string | null;
  description?: string | null;
  daily_rate: number; // 일당
  hourly_rate?: number | null;
  min_work_hours?: number; // 최소 작업 시간
  overtime_rate?: number; // 연장근무 할증률
  notes?: string | null;
  representative_grade?: RepresentativeGrade; // 대표 항목 등급 (기본/중급/고급)
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 자재 카테고리
export interface MaterialCategory {
  id: string;
  category: string;
  sub_category?: string | null;
  detail_category?: string | null;
  description?: string | null;
  standard_unit?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 자재/제품 단가 (Material Prices)
export interface MaterialPrice {
  id: string;
  category_id?: string | null;
  category: string;
  sub_category?: string | null;
  detail_category?: string | null;
  product_name: string;
  brand?: string | null;
  model?: string | null;
  size?: string | null; // 자재 사이즈 (예: 700×400×680, 600각)
  product_grade: '일반' | '중급' | '고급' | '수입';
  unit: string;
  unit_price: number;
  price_includes_install: boolean;
  price_date: string;
  price_valid_until?: string | null;
  source?: string | null;
  source_url?: string | null;
  notes?: string | null;
  representative_grade?: RepresentativeGrade; // 대표 항목 등급 (기본/중급/고급)
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

// 복합 비용 (Composite Costs)
export interface CompositeCost {
  id: string;
  cost_name: string;
  cost_name_en?: string | null;
  description?: string | null;
  category: string;
  sub_category?: string | null;
  unit: string;
  unit_price: number;
  labor_ratio?: number | null; // 인건비 비율
  material_ratio?: number | null; // 자재비 비율
  service_ratio?: number | null; // 서비스비 비율
  other_ratio?: number | null; // 기타 비율
  min_quantity?: number | null;
  calculation_notes?: string | null;
  notes?: string | null;
  representative_grade?: RepresentativeGrade; // 대표 항목 등급 (기본/중급/고급)
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 가격 변동 이력
export interface PriceHistory {
  id: string;
  price_type: 'labor' | 'material' | 'composite';
  reference_id: string;
  field_changed: string;
  old_value?: string | null;
  new_value: string;
  change_reason?: string | null;
  changed_by?: string | null;
  created_at: string;
}

// ============================================
// 견적 계산용 타입
// ============================================

// 방 정보 (도면 분석 결과)
export interface RoomInfo {
  name: string; // 방 이름: '거실', '침실1', '주방' 등
  width: number; // 가로 (m)
  length: number; // 세로 (m)
  area: number; // 면적 (㎡)
  perimeter: number; // 둘레 (m)
  wallArea: number; // 벽면적 (층고 2.4m 기준)
  ceilingArea: number; // 천장 면적 (= 바닥 면적)
  type: 'living' | 'bedroom' | 'kitchen' | 'bathroom' | 'balcony' | 'utility' | 'other';
}

// 도면 분석 결과
export interface FloorPlanAnalysis {
  totalArea: number; // 전용면적 (㎡)
  totalAreaPyeong: number; // 전용면적 (평)
  ceilingHeight: number; // 층고 (m) - 기본값 2.4
  rooms: RoomInfo[];

  // 집계 데이터
  summary: {
    totalFloorArea: number; // 총 바닥 면적
    totalWallArea: number; // 총 벽 면적
    totalCeilingArea: number; // 총 천장 면적
    totalPerimeter: number; // 총 둘레
    roomCount: number; // 방 개수
    bathroomCount: number; // 욕실 개수
  };
}

// 자재 소요량 계산 결과
export interface MaterialRequirement {
  category: string;
  sub_category?: string;
  item_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  calculation_basis: string; // 계산 근거 설명
}

// 인건비 계산 결과
export interface LaborRequirement {
  labor_type: string;
  daily_rate: number;
  estimated_days: number;
  total_cost: number;
  calculation_basis: string;
}

// 복합비용 계산 결과
export interface CompositeRequirement {
  cost_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_cost: number;
  calculation_basis: string;
}

// 전체 견적 결과
export interface FloorPlanEstimate {
  floorPlanAnalysis: FloorPlanAnalysis;
  materials: MaterialRequirement[];
  labor: LaborRequirement[];
  composite: CompositeRequirement[];

  // 소계
  materialSubtotal: number;
  laborSubtotal: number;
  compositeSubtotal: number;

  // 추가 비용
  managementFee: number; // 현장관리비
  contingency: number; // 예비비

  // 총계
  grandTotal: number;

  // 메타데이터
  generatedAt: string;
  priceValidUntil: string;
}

// ============================================
// 기본 단가 값 (DB 미연결 시 폴백)
// ============================================

export const DEFAULT_LABOR_COSTS: Omit<LaborCost, 'id' | 'created_at' | 'updated_at'>[] = [
  { labor_type: '목수', labor_type_en: 'carpenter', daily_rate: 280000, description: '목공사, 가구 설치, 문틀 등', is_active: true },
  { labor_type: '타일공', labor_type_en: 'tile_worker', daily_rate: 300000, description: '바닥/벽면 타일 시공', is_active: true },
  { labor_type: '도배공', labor_type_en: 'wallpaper_worker', daily_rate: 250000, description: '도배 시공', is_active: true },
  { labor_type: '전기공', labor_type_en: 'electrician', daily_rate: 280000, description: '전기 배선, 조명 설치', is_active: true },
  { labor_type: '설비공', labor_type_en: 'plumber', daily_rate: 290000, description: '배관, 보일러, 위생설비', is_active: true },
  { labor_type: '철거공', labor_type_en: 'demolition_worker', daily_rate: 230000, description: '철거 작업', is_active: true },
  { labor_type: '잡역', labor_type_en: 'general_worker', daily_rate: 180000, description: '청소, 운반, 보조 작업', is_active: true },
  { labor_type: '페인트공', labor_type_en: 'painter', daily_rate: 260000, description: '페인트, 도장 작업', is_active: true },
];

export const DEFAULT_COMPOSITE_COSTS: Omit<CompositeCost, 'id' | 'created_at' | 'updated_at'>[] = [
  { cost_name: '폐기물 처리', cost_name_en: 'waste_disposal', category: '철거', unit: '톤', unit_price: 450000, labor_ratio: 0.30, service_ratio: 0.70, description: '철거 폐기물 수거/운반/처리 비용', calculation_notes: '보통 32평 기준 전체 철거 시 3~4톤 발생', is_active: true },
  { cost_name: '내부 철거 (전체)', cost_name_en: 'full_demolition', category: '철거', unit: '㎡', unit_price: 25000, labor_ratio: 0.50, service_ratio: 0.50, description: '바닥/벽체/천장 전면 철거', is_active: true },
  { cost_name: '내부 철거 (부분)', cost_name_en: 'partial_demolition', category: '철거', unit: '㎡', unit_price: 15000, labor_ratio: 0.50, service_ratio: 0.50, description: '부분 철거 (욕실, 주방 등)', is_active: true },
  { cost_name: '양중비', cost_name_en: 'elevator_fee', category: '기타', unit: '식', unit_price: 300000, labor_ratio: 0.20, service_ratio: 0.80, description: '자재 양중(엘리베이터 사용) 비용', is_active: true },
  { cost_name: '가설공사', cost_name_en: 'temporary_work', category: '기타', unit: '식', unit_price: 250000, labor_ratio: 0.40, service_ratio: 0.60, description: '보양재, 안전시설 설치/철거', is_active: true },
  { cost_name: '청소비', cost_name_en: 'cleaning', category: '기타', unit: '㎡', unit_price: 3000, labor_ratio: 0.60, service_ratio: 0.40, description: '입주 전 정밀 청소', is_active: true },
];

// 자재 기본 단가
export const DEFAULT_MATERIAL_PRICES: Partial<MaterialPrice>[] = [
  // 바닥
  { category: '바닥', sub_category: '마루', product_name: '강화마루 12mm (일반)', unit: '㎡', unit_price: 35000, product_grade: '일반' },
  { category: '바닥', sub_category: '마루', product_name: '강화마루 12mm (브랜드)', unit: '㎡', unit_price: 45000, product_grade: '중급' },
  { category: '바닥', sub_category: '타일', product_name: '폴리싱 타일', unit: '㎡', unit_price: 38000, product_grade: '일반' },

  // 벽면
  { category: '벽면', sub_category: '도배', product_name: '실크 도배지', unit: '㎡', unit_price: 8000, product_grade: '일반' },
  { category: '벽면', sub_category: '도배', product_name: '합지 도배지', unit: '㎡', unit_price: 5500, product_grade: '일반' },

  // 천장
  { category: '천장', sub_category: '몰딩', product_name: 'PVC 몰딩', unit: 'M', unit_price: 3500, product_grade: '일반' },

  // 욕실
  { category: '욕실', sub_category: '도기', product_name: '양변기', unit: '개', unit_price: 250000, product_grade: '일반' },
  { category: '욕실', sub_category: '도기', product_name: '세면대', unit: '개', unit_price: 180000, product_grade: '일반' },
  { category: '욕실', sub_category: '수전', product_name: '세면수전', unit: '개', unit_price: 85000, product_grade: '일반' },
  { category: '욕실', sub_category: '수전', product_name: '샤워수전', unit: '개', unit_price: 120000, product_grade: '일반' },

  // 목공
  { category: '목공', sub_category: '문', product_name: '방문 ABS', unit: '개', unit_price: 180000, product_grade: '일반' },
  { category: '목공', sub_category: '걸레받이', product_name: 'PVC 걸레받이', unit: 'M', unit_price: 4500, product_grade: '일반' },

  // 전기
  { category: '전기', sub_category: '콘센트', product_name: '2구 콘센트', unit: '개', unit_price: 8500, product_grade: '일반' },
  { category: '전기', sub_category: '스위치', product_name: '3구 스위치', unit: '개', unit_price: 12000, product_grade: '일반' },
  { category: '전기', sub_category: '조명', product_name: 'LED 방등', unit: '개', unit_price: 45000, product_grade: '일반' },
];
