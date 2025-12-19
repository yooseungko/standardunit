/**
 * 동적 표준 단가 시스템
 * 
 * 검증된 견적 데이터가 쌓이면 자동으로 표준 단가가 업데이트됩니다.
 * 
 * 표준 단가 결정 우선순위:
 * 1. 검증된 데이터 (n >= 10) → 중간값 사용
 * 2. 검증된 데이터 부족 (n < 10) → 기본 단가 + 데이터 가중 평균
 * 3. 데이터 없음 → 기본 하드코딩 단가
 */

import { supabase, isSupabaseConfigured } from './supabase';

// 기본 단가 (하드코딩, 데이터 없을 때 사용)
const DEFAULT_UNIT_PRICES: Record<string, Record<string, number>> = {
    Standard: {
        floor_maru: 45000,
        floor_tile: 55000,
        wall_paper: 15000,
        ceiling_molding: 8000,
        ceiling_well: 35000,
        kitchen_sink: 800000,
        kitchen_upper: 600000,
        kitchen_lower: 700000,
        bathroom_sanitary: 400000,
        bathroom_tile: 65000,
        bathroom_ceiling: 150000,
        wood_door: 180000,
        wood_baseboard: 5000,
        wood_closet: 200000,
        electric_outlet: 25000,
        electric_switch: 20000,
        electric_light: 80000,
        demolition: 500000,
        waste: 300000,
    },
    Premium: {
        floor_maru: 75000,
        floor_tile: 85000,
        wall_paper: 22000,
        ceiling_molding: 12000,
        ceiling_well: 50000,
        kitchen_sink: 1500000,
        kitchen_upper: 1000000,
        kitchen_lower: 1200000,
        bathroom_sanitary: 800000,
        bathroom_tile: 95000,
        bathroom_ceiling: 250000,
        wood_door: 300000,
        wood_baseboard: 8000,
        wood_closet: 350000,
        electric_outlet: 35000,
        electric_switch: 30000,
        electric_light: 150000,
        demolition: 700000,
        waste: 400000,
    },
    Luxury: {
        floor_maru: 120000,
        floor_tile: 150000,
        wall_paper: 35000,
        ceiling_molding: 18000,
        ceiling_well: 80000,
        kitchen_sink: 3000000,
        kitchen_upper: 2000000,
        kitchen_lower: 2500000,
        bathroom_sanitary: 1500000,
        bathroom_tile: 150000,
        bathroom_ceiling: 400000,
        wood_door: 500000,
        wood_baseboard: 12000,
        wood_closet: 550000,
        electric_outlet: 50000,
        electric_switch: 45000,
        electric_light: 300000,
        demolition: 1000000,
        waste: 600000,
    },
};

// 항목 카테고리 매핑
const ITEM_CATEGORY_MAP: Record<string, { category: string; subCategory?: string }> = {
    floor_maru: { category: '바닥', subCategory: '마루' },
    floor_tile: { category: '바닥', subCategory: '타일' },
    wall_paper: { category: '벽면', subCategory: '도배' },
    ceiling_molding: { category: '천장', subCategory: '몰딩' },
    ceiling_well: { category: '천장', subCategory: '우물천장' },
    kitchen_sink: { category: '주방', subCategory: '싱크대' },
    kitchen_upper: { category: '주방', subCategory: '상부장' },
    kitchen_lower: { category: '주방', subCategory: '하부장' },
    bathroom_sanitary: { category: '욕실', subCategory: '도기' },
    bathroom_tile: { category: '욕실', subCategory: '타일' },
    bathroom_ceiling: { category: '욕실', subCategory: '천장재' },
    wood_door: { category: '목공', subCategory: '문' },
    wood_baseboard: { category: '목공', subCategory: '걸레받이' },
    wood_closet: { category: '목공', subCategory: '붙박이장' },
    electric_outlet: { category: '전기', subCategory: '콘센트' },
    electric_switch: { category: '전기', subCategory: '스위치' },
    electric_light: { category: '전기', subCategory: '조명' },
    demolition: { category: '철거' },
    waste: { category: '철거', subCategory: '폐기물' },
};

// 신뢰도 계산 (데이터 수 기반)
function calculateConfidence(dataCount: number): number {
    if (dataCount >= 50) return 0.95;
    if (dataCount >= 30) return 0.85;
    if (dataCount >= 20) return 0.75;
    if (dataCount >= 10) return 0.60;
    if (dataCount >= 5) return 0.40;
    return dataCount * 0.08;
}

// 표준 단가 조회 결과
export interface DynamicUnitPrice {
    itemKey: string;
    unitPrice: number;
    dataCount: number;
    confidence: number;
    source: 'data' | 'hybrid' | 'default';
    lastUpdated?: string;
}

/**
 * 동적 표준 단가 조회
 * @param itemKey - 항목 키 (예: 'bathroom_sanitary')
 * @param grade - 등급 ('Standard', 'Premium', 'Luxury')
 * @param options - 필터 옵션 (지역, 평형 등)
 */
export async function getDynamicUnitPrice(
    itemKey: string,
    grade: 'Standard' | 'Premium' | 'Luxury',
    options?: {
        region?: string;
        apartmentSize?: number;
        maxMonthsAgo?: number; // 최근 N개월 데이터만 사용
    }
): Promise<DynamicUnitPrice> {
    const defaultPrice = DEFAULT_UNIT_PRICES[grade]?.[itemKey] || 0;

    // Supabase가 설정되지 않은 경우 기본값 반환
    if (!isSupabaseConfigured || !supabase) {
        return {
            itemKey,
            unitPrice: defaultPrice,
            dataCount: 0,
            confidence: 0,
            source: 'default',
        };
    }

    try {
        const categoryInfo = ITEM_CATEGORY_MAP[itemKey];
        if (!categoryInfo) {
            return {
                itemKey,
                unitPrice: defaultPrice,
                dataCount: 0,
                confidence: 0,
                source: 'default',
            };
        }

        // 최근 N개월 이내 데이터 조회
        const monthsAgo = options?.maxMonthsAgo || 6;
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - monthsAgo);
        const cutoffYearMonth = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`;

        // price_records에서 검증된 데이터 조회
        let query = supabase
            .from('price_records')
            .select('unit_price')
            .eq('is_verified', true)
            .gte('price_yearmonth', cutoffYearMonth);

        // 지역 필터
        if (options?.region) {
            query = query.eq('region', options.region);
        }

        // 평형 필터 (±5평 범위)
        if (options?.apartmentSize) {
            query = query
                .gte('apartment_size', options.apartmentSize - 5)
                .lte('apartment_size', options.apartmentSize + 5);
        }

        // 등급 필터
        const gradeMap: Record<string, string> = {
            Standard: '일반',
            Premium: '중급',
            Luxury: '고급',
        };
        query = query.eq('product_grade', gradeMap[grade] || '일반');

        const { data, error } = await query;

        if (error || !data || data.length === 0) {
            return {
                itemKey,
                unitPrice: defaultPrice,
                dataCount: 0,
                confidence: 0,
                source: 'default',
            };
        }

        const prices = data
            .map(d => d.unit_price)
            .filter((p): p is number => p !== null && p > 0)
            .sort((a, b) => a - b);

        if (prices.length === 0) {
            return {
                itemKey,
                unitPrice: defaultPrice,
                dataCount: 0,
                confidence: 0,
                source: 'default',
            };
        }

        const dataCount = prices.length;
        const confidence = calculateConfidence(dataCount);

        // 중간값 계산
        const medianIndex = Math.floor(prices.length / 2);
        const medianPrice = prices.length % 2 === 0
            ? (prices[medianIndex - 1] + prices[medianIndex]) / 2
            : prices[medianIndex];

        // 데이터 충분 → 중간값 사용
        if (dataCount >= 10) {
            return {
                itemKey,
                unitPrice: Math.round(medianPrice),
                dataCount,
                confidence,
                source: 'data',
                lastUpdated: new Date().toISOString(),
            };
        }

        // 데이터 부족 → 기본값과 가중 평균
        const weight = dataCount / 10; // 0 ~ 1
        const hybridPrice = defaultPrice * (1 - weight) + medianPrice * weight;

        return {
            itemKey,
            unitPrice: Math.round(hybridPrice),
            dataCount,
            confidence,
            source: 'hybrid',
            lastUpdated: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Error fetching dynamic price:', error);
        return {
            itemKey,
            unitPrice: defaultPrice,
            dataCount: 0,
            confidence: 0,
            source: 'default',
        };
    }
}

/**
 * 특정 등급의 모든 항목 단가 조회
 */
export async function getAllDynamicPrices(
    grade: 'Standard' | 'Premium' | 'Luxury',
    options?: {
        region?: string;
        apartmentSize?: number;
        maxMonthsAgo?: number;
    }
): Promise<Map<string, DynamicUnitPrice>> {
    const results = new Map<string, DynamicUnitPrice>();

    for (const itemKey of Object.keys(DEFAULT_UNIT_PRICES[grade])) {
        const price = await getDynamicUnitPrice(itemKey, grade, options);
        results.set(itemKey, price);
    }

    return results;
}

/**
 * 표준 단가 데이터 상태 요약
 */
export async function getPriceDataSummary(): Promise<{
    totalVerifiedRecords: number;
    itemsWithSufficientData: number;
    averageConfidence: number;
    lastUpdated: string;
}> {
    if (!isSupabaseConfigured || !supabase) {
        return {
            totalVerifiedRecords: 0,
            itemsWithSufficientData: 0,
            averageConfidence: 0,
            lastUpdated: new Date().toISOString(),
        };
    }

    try {
        const { count } = await supabase
            .from('price_records')
            .select('*', { count: 'exact', head: true })
            .eq('is_verified', true);

        return {
            totalVerifiedRecords: count || 0,
            itemsWithSufficientData: 0, // TODO: 계산 로직 추가
            averageConfidence: calculateConfidence(count || 0),
            lastUpdated: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Error fetching price summary:', error);
        return {
            totalVerifiedRecords: 0,
            itemsWithSufficientData: 0,
            averageConfidence: 0,
            lastUpdated: new Date().toISOString(),
        };
    }
}
