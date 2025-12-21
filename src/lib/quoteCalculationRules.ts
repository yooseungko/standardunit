/**
 * 견적서 작성 규칙 및 계산 공식
 * AI가 견적서를 작성할 때 참고하는 표준 규칙
 */

// ============================================
// 1. 도배 (벽지) 계산 규칙
// ============================================
export const WALLPAPER_RULES = {
    // 롤당 시공 가능 면적 (㎡)
    ROLL_COVERAGE_SQM: 15,

    // 로스율 (10%)
    LOSS_RATE: 0.10,

    // 도배공 인원 기준 (평수별)
    WORKERS_BY_SIZE: {
        30: 4,  // 30평 이하: 4명
        35: 5,  // 35평: 5명
        40: 6,  // 40평: 6명
        45: 7,  // 45평 이상: 7명
    },

    // 기본 작업일수
    BASE_WORK_DAYS: 3,

    // 구축 아파트 추가 일수
    OLD_BUILDING_EXTRA_DAYS: 1,

    // 도배공 계산 함수
    calculateWorkers: (pyeong: number): number => {
        if (pyeong >= 45) return 7;
        if (pyeong >= 40) return 6;
        if (pyeong >= 35) return 5;
        return 4;
    },

    // 롤 수량 계산 함수
    calculateRolls: (wallAreaSqm: number): number => {
        const areaWithLoss = wallAreaSqm * (1 + WALLPAPER_RULES.LOSS_RATE);
        return Math.ceil(areaWithLoss / WALLPAPER_RULES.ROLL_COVERAGE_SQM);
    },
};

// ============================================
// 2. 타일 계산 규칙
// ============================================
export const TILE_RULES = {
    // 타일 시공 위치
    LOCATIONS: ['현관 입구', '베란다', '화장실'],

    // 표준 화장실 바닥 면적 (㎡)
    STANDARD_BATHROOM_FLOOR_SQM: 6,

    // 타일 로스율 (10%)
    LOSS_RATE: 0.10,

    // 타일공 하루 시공 가능 면적 (㎡)
    WORKER_DAILY_CAPACITY_SQM: 16,

    // 화장실 벽면 높이 (일반적으로 2.4m)
    WALL_HEIGHT_M: 2.4,

    // 화장실 둘레 계산 (2x3m 기준 = 10m)
    STANDARD_BATHROOM_PERIMETER_M: 10,

    // 화장실 총 타일량 계산 함수 (바닥 + 벽)
    calculateBathroomTiles: (count: number = 1): { floorSqm: number; wallSqm: number; totalSqm: number; workDays: number } => {
        const floorSqm = TILE_RULES.STANDARD_BATHROOM_FLOOR_SQM * count;
        const wallSqm = TILE_RULES.STANDARD_BATHROOM_PERIMETER_M * TILE_RULES.WALL_HEIGHT_M * count;
        const totalWithLoss = (floorSqm + wallSqm) * (1 + TILE_RULES.LOSS_RATE);
        const workDays = Math.ceil(totalWithLoss / TILE_RULES.WORKER_DAILY_CAPACITY_SQM);

        return {
            floorSqm: Math.ceil(floorSqm * (1 + TILE_RULES.LOSS_RATE) * 10) / 10,
            wallSqm: Math.ceil(wallSqm * (1 + TILE_RULES.LOSS_RATE) * 10) / 10,
            totalSqm: Math.ceil(totalWithLoss * 10) / 10,
            workDays,
        };
    },
};

// ============================================
// 3. 목공 계산 규칙
// ============================================
export const WOODWORK_RULES = {
    // 걸레받이 (내부 라인 길이)
    BASEBOARD: {
        // 평당 예상 내부 라인 길이 (m)
        // 30평 아파트 기준 약 80~100m 정도
        LINE_LENGTH_PER_PYEONG_M: 3,

        // 걸레받이 높이 (mm)
        HEIGHT_MM: 100,
    },

    // 도어 시공
    DOORS: {
        // 평수별 예상 도어 수
        DOORS_BY_SIZE: {
            20: 5,  // 방문 3 + 화장실 2
            25: 6,  // 방문 4 + 화장실 2
            30: 7,  // 방문 4 + 화장실 2 + 드레스룸 1
            35: 8,  // 방문 5 + 화장실 2 + 드레스룸 1
            40: 9,  // 방문 5 + 화장실 3 + 드레스룸 1
            45: 10, // 방문 6 + 화장실 3 + 드레스룸 1
        },
    },

    // 내부 라인 길이 계산 (평수 기반 추정)
    calculateBaseboardLength: (pyeong: number): number => {
        return Math.round(pyeong * WOODWORK_RULES.BASEBOARD.LINE_LENGTH_PER_PYEONG_M);
    },

    // 도어 수 계산
    calculateDoorCount: (pyeong: number): number => {
        if (pyeong >= 45) return 10;
        if (pyeong >= 40) return 9;
        if (pyeong >= 35) return 8;
        if (pyeong >= 30) return 7;
        if (pyeong >= 25) return 6;
        return 5;
    },
};

// ============================================
// 4. 폐기물 처리 규칙
// ============================================
export const WASTE_RULES = {
    // 4주 공사 기준 폐기물 수거 횟수
    PICKUPS_PER_4_WEEKS: 5,

    // 초반 철거 폐기물량 (톤)
    INITIAL_DEMOLITION_TONS: 2,

    // 주당 평균 수거 횟수
    PICKUPS_PER_WEEK: 1.25,

    // 폐기물 수거 횟수 계산 (공사 주수 기반)
    calculatePickups: (constructionWeeks: number): number => {
        return Math.ceil(constructionWeeks * WASTE_RULES.PICKUPS_PER_WEEK);
    },
};

// ============================================
// 5. 욕실 항목 체크리스트
// ============================================
export const BATHROOM_CHECKLIST = {
    // 필수 항목
    REQUIRED: [
        '양변기',
        '세면기',
        '욕실수전',
        '샤워기',
        '거울장',
    ],

    // 악세사리류
    ACCESSORIES: [
        '수건걸이',
        '휴지걸이',
        '비누받침',
        '선반',
        '샤워커튼봉',
        '욕실매트',
    ],

    // 화장실당 기본 구성
    getBasicItems: (): string[] => {
        return [...BATHROOM_CHECKLIST.REQUIRED, ...BATHROOM_CHECKLIST.ACCESSORIES];
    },
};

// ============================================
// 6. 바닥재 계산 규칙
// ============================================
export const FLOORING_RULES = {
    // 로스율 (10%)
    LOSS_RATE: 0.10,

    // 마루 한 박스 면적 (㎡) - 제품마다 다름
    LAMINATE_BOX_SQM: 2.4,

    // 장판 한 롤 면적 (㎡)
    VINYL_ROLL_SQM: 27, // 1.8m x 15m

    // 바닥재 수량 계산
    calculateFlooringQuantity: (floorAreaSqm: number, type: 'laminate' | 'vinyl'): number => {
        const areaWithLoss = floorAreaSqm * (1 + FLOORING_RULES.LOSS_RATE);

        if (type === 'laminate') {
            return Math.ceil(areaWithLoss / FLOORING_RULES.LAMINATE_BOX_SQM);
        } else {
            return Math.ceil(areaWithLoss / FLOORING_RULES.VINYL_ROLL_SQM);
        }
    },
};

// ============================================
// 7. 공사 기간 계산 (평수별)
// ============================================
export const CONSTRUCTION_DURATION = {
    // 평수별 예상 공사 기간 (주)
    WEEKS_BY_SIZE: {
        20: 3,
        25: 3,
        30: 4,
        35: 4,
        40: 5,
        45: 5,
        50: 6,
    },

    // 구축 추가 기간 (주)
    OLD_BUILDING_EXTRA_WEEKS: 1,

    // 공사 기간 계산
    calculateDuration: (pyeong: number, isOldBuilding: boolean = false): number => {
        let weeks = 4; // 기본값

        if (pyeong >= 50) weeks = 6;
        else if (pyeong >= 40) weeks = 5;
        else if (pyeong >= 30) weeks = 4;
        else weeks = 3;

        if (isOldBuilding) weeks += CONSTRUCTION_DURATION.OLD_BUILDING_EXTRA_WEEKS;

        return weeks;
    },
};

// ============================================
// 8. 전기 공사 규칙
// ============================================
export const ELECTRICAL_RULES = {
    // 평수별 콘센트/스위치 예상 개수
    OUTLETS_BY_SIZE: {
        20: 25,  // 콘센트 20개 + 스위치 5개
        25: 30,
        30: 35,
        35: 40,
        40: 45,
        45: 50,
    },

    // 평수별 조명 개수
    LIGHTS_BY_SIZE: {
        20: 10,
        25: 12,
        30: 15,
        35: 18,
        40: 20,
        45: 22,
    },

    // 전기공 작업일 (평수 무관, 보통 2-3일)
    WORK_DAYS: 3,

    // 분전반 교체 여부 (구축일 경우 필수)
    PANEL_REPLACEMENT_REQUIRED_FOR_OLD: true,

    calculateOutlets: (pyeong: number): number => {
        if (pyeong >= 45) return 50;
        if (pyeong >= 40) return 45;
        if (pyeong >= 35) return 40;
        if (pyeong >= 30) return 35;
        if (pyeong >= 25) return 30;
        return 25;
    },

    calculateLights: (pyeong: number): number => {
        if (pyeong >= 45) return 22;
        if (pyeong >= 40) return 20;
        if (pyeong >= 35) return 18;
        if (pyeong >= 30) return 15;
        if (pyeong >= 25) return 12;
        return 10;
    },
};

// ============================================
// 9. 설비 공사 규칙
// ============================================
export const PLUMBING_RULES = {
    // 배관 교체 범위
    PIPE_TYPES: ['급수배관', '배수배관', '난방배관'],

    // 평수별 예상 배관 길이 (m)
    PIPE_LENGTH_PER_PYEONG_M: 5,

    // 화장실 배관 교체 (개당)
    BATHROOM_PLUMBING_DAYS: 2,

    // 주방 배관 교체
    KITCHEN_PLUMBING_DAYS: 1,

    // 난방 배관 (평당)
    HEATING_PIPE_PER_PYEONG_M: 8,

    // 설비공 작업일
    calculateWorkDays: (pyeong: number, bathroomCount: number): number => {
        return bathroomCount * 2 + 1 + Math.ceil(pyeong / 20);
    },
};

// ============================================
// 10. 주방 공사 규칙
// ============================================
export const KITCHEN_RULES = {
    // 평수별 싱크대 길이 (m)
    SINK_LENGTH_BY_SIZE: {
        20: 2.4,  // I자형
        25: 3.0,  // I자형
        30: 3.6,  // L자형 시작
        35: 4.2,  // L자형
        40: 4.8,  // L자형
        45: 5.4,  // ㄷ자형 가능
    },

    // 상부장 길이 (싱크대의 80% 정도)
    UPPER_CABINET_RATIO: 0.8,

    // 아일랜드 설치 기준 (40평 이상)
    ISLAND_MIN_PYEONG: 40,

    // 주방 기본 항목
    BASIC_ITEMS: [
        '싱크대 하부장',
        '싱크대 상부장',
        '싱크볼',
        '싱크수전',
        '후드',
        '가스레인지/인덕션',
    ],

    calculateSinkLength: (pyeong: number): number => {
        if (pyeong >= 45) return 5.4;
        if (pyeong >= 40) return 4.8;
        if (pyeong >= 35) return 4.2;
        if (pyeong >= 30) return 3.6;
        if (pyeong >= 25) return 3.0;
        return 2.4;
    },
};

// ============================================
// 11. 창호 공사 규칙
// ============================================
export const WINDOW_RULES = {
    // 평수별 창문 개수
    WINDOWS_BY_SIZE: {
        20: 5,
        25: 6,
        30: 8,
        35: 9,
        40: 10,
        45: 12,
    },

    // 베란다 샷시 (평수별 m)
    VERANDA_FRAME_BY_SIZE: {
        20: 4,
        25: 5,
        30: 6,
        35: 7,
        40: 8,
        45: 10,
    },

    // 창호 타입
    TYPES: ['이중창', '삼중창', 'PVC', '알루미늄'],

    // 방음/단열 등급
    GRADES: ['일반', '고단열', '고방음'],

    calculateWindowCount: (pyeong: number): number => {
        if (pyeong >= 45) return 12;
        if (pyeong >= 40) return 10;
        if (pyeong >= 35) return 9;
        if (pyeong >= 30) return 8;
        if (pyeong >= 25) return 6;
        return 5;
    },
};

// ============================================
// 12. 철거 공사 규칙
// ============================================
export const DEMOLITION_RULES = {
    // 철거 범위
    SCOPES: {
        PARTIAL: '부분 철거',  // 특정 공간만
        FULL: '전체 철거',     // 골조만 남김
    },

    // 철거 작업일 (평수별)
    DAYS_BY_SIZE: {
        20: 2,
        25: 2,
        30: 3,
        35: 3,
        40: 4,
        45: 5,
    },

    // 철거 인원 (평수별)
    WORKERS_BY_SIZE: {
        20: 3,
        25: 3,
        30: 4,
        35: 4,
        40: 5,
        45: 6,
    },

    // 철거 항목 체크리스트
    CHECKLIST: [
        '바닥재 철거',
        '벽지 철거',
        '타일 철거',
        '천장 철거',
        '주방 철거',
        '욕실 철거',
        '도어 철거',
        '창호 철거',
    ],

    calculateDays: (pyeong: number): number => {
        if (pyeong >= 45) return 5;
        if (pyeong >= 40) return 4;
        if (pyeong >= 30) return 3;
        return 2;
    },
};

// ============================================
// 13. 중문 규칙
// ============================================
export const MIDDLE_DOOR_RULES = {
    // 중문 종류
    TYPES: ['슬라이딩', '여닫이', '폴딩'],

    // 평수별 중문 너비 (mm)
    WIDTH_BY_SIZE: {
        20: 1800,
        25: 2000,
        30: 2200,
        35: 2400,
        40: 2600,
        45: 2800,
    },

    // 중문 설치 위치
    LOCATIONS: ['현관', '주방-거실 사이', '베란다'],
};

// ============================================
// 14. 붙박이장 규칙
// ============================================
export const CLOSET_RULES = {
    // 평수별 붙박이장 개수
    COUNT_BY_SIZE: {
        20: 1,
        25: 2,
        30: 2,
        35: 3,
        40: 3,
        45: 4,
    },

    // 붙박이장 표준 크기 (mm)
    STANDARD_SIZE: {
        WIDTH: 2400,   // 너비
        HEIGHT: 2400,  // 높이
        DEPTH: 600,    // 깊이
    },

    // 내부 구성
    INTERIOR: ['서랍', '선반', '행거', '거울'],

    calculateCount: (pyeong: number): number => {
        if (pyeong >= 45) return 4;
        if (pyeong >= 35) return 3;
        if (pyeong >= 25) return 2;
        return 1;
    },
};

// ============================================
// 15. 페인트 공사 규칙
// ============================================
export const PAINT_RULES = {
    // 1리터당 도포 면적 (㎡)
    COVERAGE_PER_LITER_SQM: 10,

    // 2회 도장 기준
    COATS: 2,

    // 로스율 (10%)
    LOSS_RATE: 0.10,

    // 페인트공 하루 작업량 (㎡)
    WORKER_DAILY_CAPACITY_SQM: 50,

    // 페인트 양 계산 (리터)
    calculatePaintLiters: (areaSqm: number): number => {
        const areaWithLoss = areaSqm * (1 + PAINT_RULES.LOSS_RATE);
        return Math.ceil((areaWithLoss * PAINT_RULES.COATS) / PAINT_RULES.COVERAGE_PER_LITER_SQM);
    },
};

// ============================================
// 16. 천장 공사 규칙
// ============================================
export const CEILING_RULES = {
    // 천장 종류
    TYPES: ['석고보드', '텍스', '우물천장', '간접조명'],

    // 석고보드 1장 면적 (㎡)
    GYPSUM_BOARD_SQM: 2.88, // 1200mm x 2400mm

    // 로스율 (10%)
    LOSS_RATE: 0.10,

    // 천장공 하루 작업량 (㎡)
    WORKER_DAILY_CAPACITY_SQM: 20,

    calculateBoards: (ceilingAreaSqm: number): number => {
        const areaWithLoss = ceilingAreaSqm * (1 + CEILING_RULES.LOSS_RATE);
        return Math.ceil(areaWithLoss / CEILING_RULES.GYPSUM_BOARD_SQM);
    },
};

// ============================================
// 17. 시스템에어컨 규칙
// ============================================
export const SYSTEM_AIRCON_RULES = {
    // 가격대별 실(Room) 수
    // 시스템에어컨 가격을 보면 몇 실을 커버하는지 판단 가능
    PRICE_TO_ROOMS: {
        '2실': { minPrice: 2000000, maxPrice: 3999999 },  // 200~399만원
        '3실': { minPrice: 4000000, maxPrice: 4999999 },  // 400~499만원
        '4실': { minPrice: 5000000, maxPrice: 6999999 },  // 500~699만원
        '5실': { minPrice: 7000000, maxPrice: 99999999 }, // 700만원 이상
    },

    // 평수별 권장 실 수
    RECOMMENDED_ROOMS_BY_SIZE: {
        20: 2,  // 20평 → 2실
        25: 3,  // 25평 → 3실
        30: 3,  // 30평 → 3실
        35: 4,  // 35평 → 4실
        40: 4,  // 40평 → 4실
        45: 5,  // 45평 → 5실
        50: 5,  // 50평 → 5실
    },

    // 가격으로 실 수 판단
    getRoomsByPrice: (priceWon: number): string => {
        if (priceWon >= 7000000) return '5실';
        if (priceWon >= 5000000) return '4실';
        if (priceWon >= 4000000) return '3실';
        return '2실';
    },

    // 평수로 권장 실 수 계산
    getRecommendedRooms: (pyeong: number): number => {
        if (pyeong >= 45) return 5;
        if (pyeong >= 35) return 4;
        if (pyeong >= 25) return 3;
        return 2;
    },

    // 실 수로 대략적인 가격대 추정
    getPriceRangeByRooms: (rooms: number): { min: number; max: number } => {
        switch (rooms) {
            case 2: return { min: 2000000, max: 3999999 };
            case 3: return { min: 4000000, max: 4999999 };
            case 4: return { min: 5000000, max: 6999999 };
            case 5: return { min: 7000000, max: 10000000 };
            default: return { min: 3000000, max: 5000000 };
        }
    },
};

// ============================================
// AI 프롬프트용 요약 텍스트 생성
// ============================================
export function generateCalculationGuide(): string {
    return `
## 견적서 작성 계산 규칙

### 1. 도배 (벽지)
- 1롤당 시공 가능 면적: 15㎡
- 로스율 10% 적용
- 도배공 인원: 30평 4명, 35평 5명, 40평 6명, 45평 7명
- 작업일수: 기본 3일, 구축 아파트 +1일

### 2. 타일
- 시공 위치: 현관 입구, 베란다, 화장실
- 표준 화장실 바닥: 6㎡ (2x3m)
- 로스율 10% 적용 → 실제 필요량 6.6㎡
- 타일공 하루 시공량: 16㎡
- 화장실 벽면: 둘레(10m) x 높이(2.4m) = 24㎡

### 3. 목공
- 걸레받이: 평당 약 3m (30평 = 약 90m)
- 도어 수: 30평 7개, 35평 8개, 40평 9개, 45평 10개

### 4. 폐기물
- 4주 공사 기준 5회 수거
- 초반 철거 폐기물: 약 2톤 이내

### 5. 욕실 필수 항목
- 기본: 양변기, 세면기, 수전, 샤워기, 거울장
- 악세사리: 수건걸이, 휴지걸이, 비누받침, 선반 등

### 6. 바닥재
- 마루: 1박스 = 2.4㎡
- 장판: 1롤 = 27㎡ (1.8m x 15m)
- 로스율 10% 적용

### 7. 공사 기간
- 30평: 4주, 40평: 5주, 50평: 6주
- 구축 아파트: +1주

### 8. 전기
- 콘센트/스위치: 30평 35개, 40평 45개
- 조명: 30평 15개, 40평 20개
- 구축 시 분전반 교체 필수

### 9. 설비 (배관)
- 배관 종류: 급수, 배수, 난방
- 난방배관: 평당 8m
- 화장실 배관 교체: 개당 2일

### 10. 주방
- 싱크대 길이: 30평 3.6m, 40평 4.8m
- 상부장: 싱크대 길이의 80%
- 아일랜드: 40평 이상 설치 가능
- 기본: 하부장, 상부장, 싱크볼, 수전, 후드, 레인지

### 11. 창호
- 창문 개수: 30평 8개, 40평 10개
- 베란다 샷시: 30평 6m, 40평 8m
- 타입: 이중창, 삼중창, PVC, 알루미늄

### 12. 철거
- 철거일: 30평 3일, 40평 4일, 45평 5일
- 철거 인원: 30평 4명, 40평 5명
- 철거 범위: 부분/전체

### 13. 중문
- 종류: 슬라이딩, 여닫이, 폴딩
- 너비: 30평 2200mm, 40평 2600mm

### 14. 붙박이장
- 개수: 30평 2개, 40평 3개, 45평 4개
- 표준 크기: 2400x2400x600mm

### 15. 페인트
- 1리터당 10㎡ 도포 (2회 도장)
- 로스율 10%
- 페인트공 하루 50㎡

### 16. 천장
- 석고보드 1장: 2.88㎡
- 로스율 10%
- 천장공 하루 20㎡

### 17. 시스템에어컨 (가격으로 실 수 판단)
- 200~399만원: 2실 (방 2개)
- 400~499만원: 3실 (방 3개)
- 500~699만원: 4실 (방 4개)
- 700만원 이상: 5실 (방 5개)
- 평수별 권장: 25평 3실, 35평 4실, 45평 5실
- 시스템에어컨 가격을 보고 해당 제품이 몇 실용인지 판단하여 평수에 맞게 선택
`;
}

