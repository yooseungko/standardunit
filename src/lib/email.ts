import { Resend } from 'resend';

// Resend 클라이언트 생성
const resendApiKey = process.env.RESEND_API_KEY;

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const isEmailConfigured = !!resend;

// 이메일 발신자 설정 (Resend 도메인 인증 후 변경 필요)
export const EMAIL_FROM = process.env.EMAIL_FROM || 'Standard Unit <onboarding@resend.dev>';

// 공정별 비용 데이터 (평형별, 등급별)
export interface WorkItemCost {
    name: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface GradeEstimate {
    grade: string;
    description: string;
    items: WorkItemCost[];
    subtotal: number;
    laborCost: number;
    managementFee: number;
    total: number;
}

export interface SizeEstimate {
    size: string;
    area: string;
    areaM2: number;
    grades: GradeEstimate[];
}

// 공정별 단가 (등급별)
const unitPrices = {
    Standard: {
        floor_maru: 45000,      // 마루 ㎡당
        floor_tile: 55000,      // 타일 ㎡당
        wall_paper: 8500,       // 도배 ㎡당
        ceiling_molding: 15000, // 몰딩 M당
        ceiling_well: 85000,    // 우물천장 ㎡당
        kitchen_sink: 1800000,  // 싱크대
        kitchen_upper: 1200000, // 상부장
        kitchen_lower: 1500000, // 하부장
        bathroom_sanitary: 800000,  // 위생도기 세트
        bathroom_tile: 65000,   // 욕실타일 ㎡당
        bathroom_ceiling: 120000, // 욕실천장
        wood_door: 280000,      // 문짝 개당
        wood_baseboard: 12000,  // 걸레받이 M당
        wood_closet: 450000,    // 붙박이장 ㎡당
        electric_outlet: 25000, // 콘센트 개당
        electric_switch: 18000, // 스위치 개당
        electric_light: 85000,  // 조명 개당
        demolition: 2500000,    // 철거 일괄
        waste: 800000,          // 폐기물 처리
    },
    Premium: {
        floor_maru: 75000,
        floor_tile: 95000,
        wall_paper: 15000,
        ceiling_molding: 25000,
        ceiling_well: 130000,
        kitchen_sink: 3200000,
        kitchen_upper: 2200000,
        kitchen_lower: 2800000,
        bathroom_sanitary: 1500000,
        bathroom_tile: 110000,
        bathroom_ceiling: 200000,
        wood_door: 450000,
        wood_baseboard: 22000,
        wood_closet: 750000,
        electric_outlet: 45000,
        electric_switch: 35000,
        electric_light: 150000,
        demolition: 2500000,
        waste: 800000,
    },
    Luxury: {
        floor_maru: 120000,
        floor_tile: 150000,
        wall_paper: 25000,
        ceiling_molding: 45000,
        ceiling_well: 200000,
        kitchen_sink: 5500000,
        kitchen_upper: 4000000,
        kitchen_lower: 4800000,
        bathroom_sanitary: 2800000,
        bathroom_tile: 180000,
        bathroom_ceiling: 350000,
        wood_door: 750000,
        wood_baseboard: 38000,
        wood_closet: 1200000,
        electric_outlet: 75000,
        electric_switch: 55000,
        electric_light: 280000,
        demolition: 2500000,
        waste: 800000,
    },
};

// 평형별 수량 데이터
const sizeQuantities: Record<string, {
    areaM2: number;
    floorArea: number;
    wallArea: number;
    ceilingArea: number;
    moldingLength: number;
    wellCeilingArea: number;
    bathroomCount: number;
    bathroomTileArea: number;
    doorCount: number;
    baseboardLength: number;
    closetArea: number;
    outletCount: number;
    switchCount: number;
    lightCount: number;
}> = {
    '24': {
        areaM2: 59,
        floorArea: 45,
        wallArea: 120,
        ceilingArea: 45,
        moldingLength: 35,
        wellCeilingArea: 8,
        bathroomCount: 1,
        bathroomTileArea: 25,
        doorCount: 5,
        baseboardLength: 45,
        closetArea: 4,
        outletCount: 18,
        switchCount: 12,
        lightCount: 10,
    },
    '32': {
        areaM2: 84,
        floorArea: 65,
        wallArea: 160,
        ceilingArea: 65,
        moldingLength: 50,
        wellCeilingArea: 12,
        bathroomCount: 2,
        bathroomTileArea: 40,
        doorCount: 7,
        baseboardLength: 60,
        closetArea: 6,
        outletCount: 24,
        switchCount: 16,
        lightCount: 14,
    },
    '43': {
        areaM2: 110,
        floorArea: 85,
        wallArea: 210,
        ceilingArea: 85,
        moldingLength: 70,
        wellCeilingArea: 18,
        bathroomCount: 2,
        bathroomTileArea: 50,
        doorCount: 9,
        baseboardLength: 80,
        closetArea: 10,
        outletCount: 32,
        switchCount: 22,
        lightCount: 18,
    },
    '52': {
        areaM2: 132,
        floorArea: 105,
        wallArea: 260,
        ceilingArea: 105,
        moldingLength: 90,
        wellCeilingArea: 24,
        bathroomCount: 2,
        bathroomTileArea: 60,
        doorCount: 11,
        baseboardLength: 100,
        closetArea: 14,
        outletCount: 40,
        switchCount: 28,
        lightCount: 24,
    },
};

// 입력된 평형에 따라 동적으로 수량 계산
function getQuantitiesForSize(sizeInput: string | number): {
    areaM2: number;
    floorArea: number;
    wallArea: number;
    ceilingArea: number;
    moldingLength: number;
    wellCeilingArea: number;
    bathroomCount: number;
    bathroomTileArea: number;
    doorCount: number;
    baseboardLength: number;
    closetArea: number;
    outletCount: number;
    switchCount: number;
    lightCount: number;
} {
    const size = typeof sizeInput === 'string' ? parseFloat(sizeInput) : sizeInput;

    // 유효하지 않은 값이면 32평 기준
    if (isNaN(size) || size < 15 || size > 100) {
        return sizeQuantities['32'];
    }

    // 기존 데이터와 정확히 일치하는 경우
    const sizeKey = Math.round(size).toString();
    if (sizeQuantities[sizeKey]) {
        return sizeQuantities[sizeKey];
    }

    // 32평을 기준으로 비례 계산
    const baseSize = 32;
    const ratio = size / baseSize;
    const base = sizeQuantities['32'];

    // 욕실 개수는 30평 미만이면 1개, 이상이면 2개
    const bathroomCount = size < 30 ? 1 : 2;

    // 문짝 수: 기본 3개 + 평형당 0.15개 비례
    const doorCount = Math.round(3 + size * 0.15);

    return {
        areaM2: Math.round(size * 2.48), // 1평 ≈ 3.3㎡, 전용률 ~75%
        floorArea: Math.round(size * 2.03), // 바닥면적
        wallArea: Math.round(size * 5), // 벽면적 (바닥면적 × 2.5)
        ceilingArea: Math.round(size * 2.03), // 천장면적
        moldingLength: Math.round(size * 1.56), // 몰딩 길이
        wellCeilingArea: Math.round(size * 0.375), // 우물천장 (거실 일부)
        bathroomCount,
        bathroomTileArea: Math.round(20 * bathroomCount), // 욕실당 20㎡
        doorCount,
        baseboardLength: Math.round(size * 1.875), // 걸레받이
        closetArea: Math.round(size * 0.1875), // 붙박이장
        outletCount: Math.round(size * 0.75), // 콘센트
        switchCount: Math.round(size * 0.5), // 스위치
        lightCount: Math.round(size * 0.4375), // 조명
    };
}

// 견적 계산 함수 (동적 평형 지원)
function calculateGradeEstimate(size: string, grade: 'Standard' | 'Premium' | 'Luxury'): GradeEstimate {
    const qty = getQuantitiesForSize(size);
    const prices = unitPrices[grade];

    const items: WorkItemCost[] = [
        // 바닥
        { name: '마루 시공', unit: '㎡', quantity: qty.floorArea * 0.7, unitPrice: prices.floor_maru, total: Math.round(qty.floorArea * 0.7 * prices.floor_maru) },
        { name: '타일 시공', unit: '㎡', quantity: qty.floorArea * 0.3, unitPrice: prices.floor_tile, total: Math.round(qty.floorArea * 0.3 * prices.floor_tile) },
        // 벽면
        { name: '도배', unit: '㎡', quantity: qty.wallArea, unitPrice: prices.wall_paper, total: qty.wallArea * prices.wall_paper },
        // 천장
        { name: '몰딩', unit: 'M', quantity: qty.moldingLength, unitPrice: prices.ceiling_molding, total: qty.moldingLength * prices.ceiling_molding },
        { name: '우물천장', unit: '㎡', quantity: qty.wellCeilingArea, unitPrice: prices.ceiling_well, total: qty.wellCeilingArea * prices.ceiling_well },
        // 주방
        { name: '싱크대', unit: '식', quantity: 1, unitPrice: prices.kitchen_sink, total: prices.kitchen_sink },
        { name: '상부장', unit: '식', quantity: 1, unitPrice: prices.kitchen_upper, total: prices.kitchen_upper },
        { name: '하부장', unit: '식', quantity: 1, unitPrice: prices.kitchen_lower, total: prices.kitchen_lower },
        // 욕실
        { name: '위생도기', unit: '세트', quantity: qty.bathroomCount, unitPrice: prices.bathroom_sanitary, total: qty.bathroomCount * prices.bathroom_sanitary },
        { name: '욕실 타일', unit: '㎡', quantity: qty.bathroomTileArea, unitPrice: prices.bathroom_tile, total: qty.bathroomTileArea * prices.bathroom_tile },
        { name: '욕실 천장재', unit: '개소', quantity: qty.bathroomCount, unitPrice: prices.bathroom_ceiling, total: qty.bathroomCount * prices.bathroom_ceiling },
        // 목공
        { name: '문짝 교체', unit: '개', quantity: qty.doorCount, unitPrice: prices.wood_door, total: qty.doorCount * prices.wood_door },
        { name: '걸레받이', unit: 'M', quantity: qty.baseboardLength, unitPrice: prices.wood_baseboard, total: qty.baseboardLength * prices.wood_baseboard },
        { name: '붙박이장', unit: '㎡', quantity: qty.closetArea, unitPrice: prices.wood_closet, total: qty.closetArea * prices.wood_closet },
        // 전기
        { name: '콘센트', unit: '개', quantity: qty.outletCount, unitPrice: prices.electric_outlet, total: qty.outletCount * prices.electric_outlet },
        { name: '스위치', unit: '개', quantity: qty.switchCount, unitPrice: prices.electric_switch, total: qty.switchCount * prices.electric_switch },
        { name: '조명', unit: '개', quantity: qty.lightCount, unitPrice: prices.electric_light, total: qty.lightCount * prices.electric_light },
        // 철거
        { name: '철거 공사', unit: '식', quantity: 1, unitPrice: prices.demolition, total: prices.demolition },
        { name: '폐기물 처리', unit: '식', quantity: 1, unitPrice: prices.waste, total: prices.waste },
    ];

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const laborCost = Math.round(subtotal * 0.15); // 인건비 15%
    const managementFee = Math.round(subtotal * 0.05); // 관리비 5%
    const total = subtotal + laborCost + managementFee;

    const gradeDescriptions = {
        Standard: '실용적인 국산 자재 중심',
        Premium: '프리미엄 국산 + 일부 수입자재',
        Luxury: '고급 수입 자재 및 맞춤 시공',
    };

    return {
        grade,
        description: gradeDescriptions[grade],
        items,
        subtotal,
        laborCost,
        managementFee,
        total,
    };
}

// 평형별 견적 데이터 생성 (동적 평형 지원)
export function getDetailedEstimate(sizeInput: string): SizeEstimate {
    const size = parseFloat(sizeInput);
    const qty = getQuantitiesForSize(sizeInput);

    // 평형과 면적 표시
    const sizeLabel = isNaN(size) ? '32평' : `${Math.round(size)}평`;
    const areaLabel = `${qty.areaM2}㎡`;

    return {
        size: sizeLabel,
        area: areaLabel,
        areaM2: qty.areaM2,
        grades: [
            calculateGradeEstimate(sizeInput, 'Standard'),
            calculateGradeEstimate(sizeInput, 'Premium'),
            calculateGradeEstimate(sizeInput, 'Luxury'),
        ],
    };
}

// 금액 포맷팅
export function formatPrice(price: number): string {
    if (price >= 100000000) {
        const uk = Math.floor(price / 100000000);
        const man = Math.floor((price % 100000000) / 10000);
        return man > 0 ? `${uk}억 ${man.toLocaleString()}만원` : `${uk}억원`;
    }
    return `${Math.floor(price / 10000).toLocaleString()}만원`;
}

export function formatPriceNumber(price: number): string {
    return price.toLocaleString() + '원';
}

// 이전 버전 호환용 (간단한 견적 데이터)
export const estimateData: Record<string, {
    size: string;
    area: string;
    basePrice: number;
    grades: {
        grade: string;
        price: number;
        description: string;
    }[];
}> = {
    '24': {
        size: '24평',
        area: '59㎡',
        basePrice: 27000000,
        grades: [
            { grade: 'Standard', price: getDetailedEstimate('24').grades[0].total, description: '실용적인 국산 자재 중심' },
            { grade: 'Premium', price: getDetailedEstimate('24').grades[1].total, description: '프리미엄 국산 + 일부 수입자재' },
            { grade: 'Luxury', price: getDetailedEstimate('24').grades[2].total, description: '고급 수입 자재 및 맞춤 시공' },
        ],
    },
    '32': {
        size: '32평',
        area: '84㎡',
        basePrice: 35000000,
        grades: [
            { grade: 'Standard', price: getDetailedEstimate('32').grades[0].total, description: '실용적인 국산 자재 중심' },
            { grade: 'Premium', price: getDetailedEstimate('32').grades[1].total, description: '프리미엄 국산 + 일부 수입자재' },
            { grade: 'Luxury', price: getDetailedEstimate('32').grades[2].total, description: '고급 수입 자재 및 맞춤 시공' },
        ],
    },
    '43': {
        size: '43평',
        area: '110㎡',
        basePrice: 48000000,
        grades: [
            { grade: 'Standard', price: getDetailedEstimate('43').grades[0].total, description: '실용적인 국산 자재 중심' },
            { grade: 'Premium', price: getDetailedEstimate('43').grades[1].total, description: '프리미엄 국산 + 일부 수입자재' },
            { grade: 'Luxury', price: getDetailedEstimate('43').grades[2].total, description: '고급 수입 자재 및 맞춤 시공' },
        ],
    },
    '52': {
        size: '52평',
        area: '132㎡',
        basePrice: 58000000,
        grades: [
            { grade: 'Standard', price: getDetailedEstimate('52').grades[0].total, description: '실용적인 국산 자재 중심' },
            { grade: 'Premium', price: getDetailedEstimate('52').grades[1].total, description: '프리미엄 국산 + 일부 수입자재' },
            { grade: 'Luxury', price: getDetailedEstimate('52').grades[2].total, description: '고급 수입 자재 및 맞춤 시공' },
        ],
    },
};
