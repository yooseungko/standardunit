// 크롤러 공통 타입 정의

// 크롤링된 제품 정보
export interface CrawledProduct {
    name: string;
    price: number;
    unit: string;
    size?: string;
    imageUrl?: string;
    originalUrl: string;
    brand?: string;
    category: string;
    subCategory?: string;
    source: string; // 크롤링 소스 (예: 'ohouse', 'zzro')
}

// 카테고리 매핑 정보
export interface CategoryInfo {
    name: string;
    parent?: string;
    slug?: string; // URL에서 사용되는 슬러그
}

// 크롤러 설정
export interface CrawlerConfig {
    name: string; // 크롤러 이름
    baseUrl: string; // 기본 URL
    requestDelay: number; // 요청 간 딜레이 (ms)
    userAgent: string;
    headers?: Record<string, string>;
}

// 크롤링 진행 상태
export interface CrawlProgress {
    type: 'progress' | 'product' | 'complete' | 'error';
    progress?: number; // 0-100
    category?: string;
    product?: CrawledProduct;
    message?: string;
}

// 크롤러 인터페이스
export interface ICrawler {
    config: CrawlerConfig;
    getCategories(): Record<string | number, CategoryInfo>;
    crawlCategory(categoryId: string | number): Promise<CrawledProduct[]>;
    // crawlAll은 크롤러마다 다른 시그니처를 가질 수 있으므로 옵셔널
}


// 기본 User-Agent
export const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// 가격 파싱 유틸리티
export function parsePrice(priceText: string): number {
    const cleaned = priceText.replace(/[^\d]/g, '');
    return parseInt(cleaned, 10) || 0;
}

// 단위 추출 유틸리티
export function extractUnit(text: string): string {
    const unitPatterns = [
        { pattern: /㎡|제곱미터|평방미터/i, unit: '㎡' },
        { pattern: /롤|Roll/i, unit: '롤' },
        { pattern: /세트|set/i, unit: '세트' },
        { pattern: /개|EA|ea/i, unit: '개' },
        { pattern: /M|미터|m$/i, unit: 'M' },
        { pattern: /박스|Box/i, unit: '박스' },
        { pattern: /장/i, unit: '장' },
        { pattern: /통/i, unit: '통' },
        { pattern: /kg|킬로그램/i, unit: 'kg' },
    ];

    for (const { pattern, unit } of unitPatterns) {
        if (pattern.test(text)) {
            return unit;
        }
    }
    return '개'; // 기본값
}
