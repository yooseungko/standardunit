import { getDetailedEstimate, formatPriceNumber } from './email';
import type { AIExtractedData, EstimateAnalysis, CategoryBreakdown, ComparisonGrade } from './supabase';

// 카테고리 매핑 (AI 추출 카테고리 → 표준 카테고리)
const categoryMapping: Record<string, string[]> = {
    '바닥': ['바닥', '마루', '타일', '장판'],
    '벽면': ['벽면', '도배', '페인트'],
    '천장': ['천장', '몰딩', '우물천장'],
    '주방': ['주방', '싱크대', '상부장', '하부장', '후드'],
    '욕실': ['욕실', '수전', '도기', '욕조', '샤워부스', '비데', '양변기', '세면대'],
    '목공': ['목공', '문', '현관문', '걸레받이', '붙박이장', '신발장'],
    '전기': ['전기', '조명', '콘센트', '스위치'],
    '설비': ['설비', '난방', '배관', '에어컨'],
    '철거': ['철거', '폐기물'],
};

// 표준 카테고리로 변환
function normalizeCategory(category: string, subCategory?: string | null): string {
    const searchTerms = [category, subCategory].filter(Boolean).join(' ').toLowerCase();

    for (const [standardCategory, keywords] of Object.entries(categoryMapping)) {
        if (keywords.some(keyword => searchTerms.includes(keyword.toLowerCase()))) {
            return standardCategory;
        }
    }

    return '기타';
}

// 분석 결과 인터페이스
export interface ComparisonResult {
    apartmentSize: number;
    extractedTotal: number;
    standardPrice: number;
    premiumPrice: number;
    luxuryPrice: number;
    comparisonPercentage: number;
    closestGrade: ComparisonGrade;
    priceDifference: number;
    categoryBreakdown: CategoryBreakdown;
    summary: string;
    insights: string[];
}

/**
 * AI 추출 견적과 표준 견적 비교 분석
 * @param extractedData - AI가 추출한 견적 데이터
 * @param apartmentSize - 평형 (없으면 AI 추출 데이터에서 사용)
 * @returns 비교 분석 결과
 */
export function analyzeEstimate(
    extractedData: AIExtractedData,
    apartmentSize?: number
): ComparisonResult {
    // 평형 결정
    const size = apartmentSize || extractedData.apartment_size || 32;

    // 표준 견적 계산
    const standardEstimate = getDetailedEstimate(size.toString());
    const standardPrice = standardEstimate.grades[0].total; // Standard 등급
    const premiumPrice = standardEstimate.grades[1].total; // Premium 등급
    const luxuryPrice = standardEstimate.grades[2].total; // Luxury 등급

    // 추출된 총 금액 계산
    const extractedTotal = extractedData.total_price ||
        extractedData.items.reduce((sum, item) => sum + (item.total_price || 0), 0);

    // 표준 대비 비율 계산
    const comparisonPercentage = standardPrice > 0
        ? (extractedTotal / standardPrice) * 100
        : 100;

    // 가장 가까운 등급 찾기
    let closestGrade: ComparisonGrade;
    if (extractedTotal < standardPrice * 0.8) {
        closestGrade = 'Under-Standard';
    } else if (extractedTotal >= luxuryPrice * 1.1) {
        closestGrade = 'Over-Luxury';
    } else if (extractedTotal >= luxuryPrice * 0.9) {
        closestGrade = 'Luxury';
    } else if (extractedTotal >= premiumPrice * 0.9) {
        closestGrade = 'Premium';
    } else {
        closestGrade = 'Standard';
    }

    // 표준 대비 차액
    const priceDifference = extractedTotal - standardPrice;

    // 카테고리별 비교
    const categoryBreakdown = calculateCategoryBreakdown(
        extractedData.items,
        standardEstimate.grades[0].items,
        size.toString()
    );

    // 인사이트 생성
    const insights = generateInsights(
        comparisonPercentage,
        closestGrade,
        categoryBreakdown,
        extractedData.items
    );

    // 요약 생성
    const summary = generateSummary(comparisonPercentage, closestGrade, priceDifference);

    return {
        apartmentSize: size,
        extractedTotal,
        standardPrice,
        premiumPrice,
        luxuryPrice,
        comparisonPercentage: Math.round(comparisonPercentage * 10) / 10,
        closestGrade,
        priceDifference,
        categoryBreakdown,
        summary,
        insights,
    };
}

/**
 * 카테고리별 비교 분석
 */
function calculateCategoryBreakdown(
    extractedItems: AIExtractedData['items'],
    standardItems: { name: string; total: number }[],
    size: string
): CategoryBreakdown {
    const breakdown: CategoryBreakdown = {};

    // 추출된 항목을 카테고리별로 합산
    const extractedByCategory: Record<string, number> = {};
    for (const item of extractedItems) {
        const normalizedCategory = normalizeCategory(item.category, item.sub_category);
        extractedByCategory[normalizedCategory] =
            (extractedByCategory[normalizedCategory] || 0) + (item.total_price || 0);
    }

    // 표준 항목을 카테고리별로 합산
    const standardByCategory: Record<string, number> = {};
    for (const item of standardItems) {
        const category = getItemCategory(item.name);
        standardByCategory[category] = (standardByCategory[category] || 0) + item.total;
    }

    // 비교 데이터 생성
    const allCategories = new Set([
        ...Object.keys(extractedByCategory),
        ...Object.keys(standardByCategory)
    ]);

    for (const category of allCategories) {
        const extracted = extractedByCategory[category] || 0;
        const standard = standardByCategory[category] || 0;
        const differencePercentage = standard > 0
            ? ((extracted - standard) / standard) * 100
            : (extracted > 0 ? 100 : 0);

        breakdown[category] = {
            extracted_total: extracted,
            standard_total: standard,
            difference_percentage: Math.round(differencePercentage * 10) / 10,
        };
    }

    return breakdown;
}

/**
 * 항목명에서 카테고리 추출
 */
function getItemCategory(itemName: string): string {
    const categoryKeywords: Record<string, string[]> = {
        '바닥': ['마루', '타일 시공'],
        '벽면': ['도배'],
        '천장': ['몰딩', '우물천장'],
        '주방': ['싱크대', '상부장', '하부장'],
        '욕실': ['위생도기', '욕실 타일', '욕실 천장'],
        '목공': ['문짝', '걸레받이', '붙박이장'],
        '전기': ['콘센트', '스위치', '조명'],
        '철거': ['철거', '폐기물'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => itemName.includes(keyword))) {
            return category;
        }
    }

    return '기타';
}

/**
 * 인사이트 생성
 */
function generateInsights(
    percentage: number,
    closestGrade: ComparisonGrade,
    categoryBreakdown: CategoryBreakdown,
    items: AIExtractedData['items']
): string[] {
    const insights: string[] = [];

    // 전체 가격 인사이트
    if (percentage > 120) {
        insights.push(`⚠️ 제출된 견적이 표준보다 ${Math.round(percentage - 100)}% 비쌉니다. 협상 여지가 있을 수 있습니다.`);
    } else if (percentage < 80) {
        insights.push(`💡 제출된 견적이 표준보다 ${Math.round(100 - percentage)}% 저렴합니다. 자재 품질을 확인해보세요.`);
    } else if (percentage >= 95 && percentage <= 105) {
        insights.push(`✅ 제출된 견적이 표준 범위 내에 있습니다.`);
    }

    // 카테고리별 인사이트 (큰 차이가 있는 항목)
    for (const [category, data] of Object.entries(categoryBreakdown)) {
        if (data.difference_percentage > 30 && data.standard_total > 0) {
            insights.push(`📊 ${category}: 표준 대비 ${Math.round(data.difference_percentage)}% 높음 (${formatPriceNumber(data.extracted_total)}원 vs ${formatPriceNumber(data.standard_total)}원)`);
        } else if (data.difference_percentage < -30 && data.standard_total > 0) {
            insights.push(`📉 ${category}: 표준 대비 ${Math.round(Math.abs(data.difference_percentage))}% 낮음`);
        }
    }

    // 신뢰도가 낮은 항목 경고
    const lowConfidenceItems = items.filter(item => item.confidence_score < 0.7);
    if (lowConfidenceItems.length > 0) {
        insights.push(`⚡ ${lowConfidenceItems.length}개 항목의 AI 추출 신뢰도가 낮습니다. 수동 검토를 권장합니다.`);
    }

    return insights;
}

/**
 * 요약 문구 생성
 */
function generateSummary(
    percentage: number,
    closestGrade: ComparisonGrade,
    priceDifference: number
): string {
    const gradeLabels: Record<ComparisonGrade, string> = {
        'Under-Standard': '표준 이하',
        'Standard': '표준',
        'Premium': '프리미엄',
        'Luxury': '럭셔리',
        'Over-Luxury': '럭셔리 초과',
    };

    const diffText = priceDifference >= 0
        ? `+${formatPriceNumber(priceDifference)}원`
        : `${formatPriceNumber(priceDifference)}원`;

    return `표준 견적 대비 ${Math.round(percentage)}% (${diffText}), ${gradeLabels[closestGrade]} 등급 수준`;
}

/**
 * DB 저장용 분석 결과 변환
 */
export function toEstimateAnalysis(
    fileId: string,
    result: ComparisonResult
): Omit<EstimateAnalysis, 'id' | 'analyzed_at' | 'created_at'> {
    return {
        file_id: fileId,
        apartment_size: result.apartmentSize,
        total_extracted_price: result.extractedTotal,
        standard_price: result.standardPrice,
        premium_price: result.premiumPrice,
        luxury_price: result.luxuryPrice,
        comparison_percentage: result.comparisonPercentage,
        closest_grade: result.closestGrade,
        price_difference: result.priceDifference,
        analysis_summary: result.summary,
        category_breakdown: result.categoryBreakdown,
    };
}
