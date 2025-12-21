// 오하우스 인테리어 크롤러
// ohouseinterior.com 에서 제품 정보를 크롤링합니다.

import {
    CrawledProduct,
    CrawlerConfig,
    CategoryInfo,
    ICrawler,
    CrawlProgress,
    DEFAULT_USER_AGENT,
    parsePrice,
    extractUnit,
} from './types';

// 크롤러 설정
export const OHOUSE_CONFIG: CrawlerConfig = {
    name: '오하우스 인테리어',
    baseUrl: 'https://ohouseinterior.com',
    requestDelay: 500,
    userAgent: DEFAULT_USER_AGENT,
    headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    },
};

// 카테고리 정보
export const OHOUSE_CATEGORIES: Record<number, CategoryInfo> = {
    126: { name: '양변기/소변기', parent: '욕실' },
    137: { name: '세면대/하부장', parent: '욕실' },
    148: { name: '수전/샤워기', parent: '욕실' },
    163: { name: '욕실장/거울', parent: '욕실' },
    178: { name: '악세사리', parent: '욕실' },
    242: { name: '환풍기/기타', parent: '욕실' },
    109: { name: '실크', parent: '벽지' },
    112: { name: '합지', parent: '벽지' },
    79: { name: '강마루', parent: '바닥' },
    84: { name: '원목마루', parent: '바닥' },
    87: { name: 'SPC마루', parent: '바닥' },
    89: { name: '모노륨 장판', parent: '바닥' },
    92: { name: '데코타일', parent: '바닥' },
    69: { name: '목자재', parent: '목공' },
    74: { name: '단열재', parent: '목공' },
    76: { name: '철물', parent: '목공' },
    93: { name: '도기질', parent: '타일' },
    106: { name: '포세린', parent: '타일' },
    244: { name: '조명', parent: '전기' },
    246: { name: '콘센트/스위치', parent: '전기' },
    248: { name: '감지기/스피커', parent: '전기' },
    233: { name: '싱크수전', parent: '주방' },
    54: { name: '창호', parent: '창호' },
    56: { name: '도어', parent: '문' },
    225: { name: '중문', parent: '문' },
    210: { name: '설비시공', parent: '설비' },
    213: { name: '부분철거', parent: '철거' },
    59: { name: '제작가구', parent: '가구' },
    53: { name: '시스템에어컨', parent: '에어컨' },
};

// 상위 카테고리 → 하위 카테고리 매핑
export const OHOUSE_PARENT_CATEGORIES: Record<number, number[]> = {
    50: [126, 137, 148, 163, 178, 242], // 욕실 제품
    108: [109, 112], // 벽지
    52: [79, 84, 87], // 마루
    88: [89], // 장판
    55: [69, 74, 76], // 목자재/철물
    91: [93, 106], // 타일
    64: [244, 246, 248], // 조명/전기
    62: [233], // 주방제품
    209: [210, 213], // 설비/철거
};

// HTML에서 제품 정보 추출
function extractProductsFromHtml(html: string, categoryId: number): CrawledProduct[] {
    const products: CrawledProduct[] = [];
    const categoryInfo = OHOUSE_CATEGORIES[categoryId] || { name: `카테고리 ${categoryId}` };

    console.log(`[OhouseCrawler] Parsing category ${categoryId}, HTML length: ${html.length}`);

    // 제품 정보 추출 (img alt 속성 기반)
    const productMap = new Map<string, { name: string; productNo: string; imageUrl?: string }>();

    // 패턴 1: eListPrdImage{product_no} 패턴에서 제품명 추출
    const imgAltPattern = /id="eListPrdImage(\d+)[^"]*"[^>]*alt="([^"]+)"/gi;
    const imgAltMatches = [...html.matchAll(imgAltPattern)];

    for (const match of imgAltMatches) {
        const productNo = match[1];
        const name = match[2].trim();

        if (name && name.length > 1 && !productMap.has(productNo)) {
            const srcMatch = match.input?.substring(
                Math.max(0, match.index! - 200),
                match.index! + match[0].length + 100
            ).match(/src="([^"]+)"/i);

            productMap.set(productNo, {
                name,
                productNo,
                imageUrl: srcMatch ? srcMatch[1] : undefined
            });
        }
    }

    // 패턴 2: df-prl__name 클래스에서 제품명 추출
    const namePattern = /product_no=(\d+)[^"]*"[^>]*class="df-prl__name[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi;
    const nameMatches = [...html.matchAll(namePattern)];

    for (const match of nameMatches) {
        const productNo = match[1];
        const name = match[2].trim();

        if (name && name.length > 1 && !productMap.has(productNo)) {
            productMap.set(productNo, { name, productNo });
        }
    }

    // 패턴 3: 일반 alt 속성에서 추출
    const altPattern = /product_no=(\d+)[\s\S]*?alt="([^"]+)"/gi;
    const altMatches = [...html.matchAll(altPattern)];

    for (const match of altMatches) {
        const productNo = match[1];
        const name = match[2].trim();

        if (name && name.length > 1 && !productMap.has(productNo)) {
            productMap.set(productNo, { name, productNo });
        }
    }

    console.log(`[OhouseCrawler] Found ${productMap.size} unique products`);

    // 가격 추출
    const pricePattern = /판매가[\s\S]*?>(\d{1,3}(?:,\d{3})*)\s*원/gi;
    const priceMatches = [...html.matchAll(pricePattern)];
    const prices: number[] = [];

    for (const match of priceMatches) {
        const price = parsePrice(match[1]);
        if (price > 0) {
            prices.push(price);
        }
    }

    console.log(`[OhouseCrawler] Found ${prices.length} prices`);

    // 제품 정보 조합
    let priceIdx = 0;

    for (const [productNo, info] of productMap) {
        const price = prices[priceIdx] || 0;

        // 브랜드와 사이즈 추출
        const productNoIdx = html.indexOf(`product_no=${productNo}`);
        let brand: string | undefined = undefined;
        let size: string | undefined = undefined;
        let unit: string | undefined = undefined;

        if (productNoIdx !== -1) {
            const start = Math.max(0, productNoIdx - 200);
            const end = Math.min(html.length, productNoIdx + 3000);
            const context = html.substring(start, end);

            // 브랜드 추출
            const brandMatch = context.match(/브랜드<\/span>[\s\S]*?<span[^>]*>([A-Za-z가-힣0-9\s]+)<\/span>/i);
            if (brandMatch) {
                const extractedBrand = brandMatch[1].trim();
                const invalidBrands = ['항목들', '수집', '필터링', '버튼', '모두보기', '상품', '브랜드'];
                if (extractedBrand.length >= 2 && !invalidBrands.includes(extractedBrand)) {
                    brand = extractedBrand;
                }
            }

            // 사이즈 추출
            const sizeMatch = context.match(/사이즈<\/span>[\s\S]*?<span[^>]*>([^<]+)<\/span>/i);
            if (sizeMatch) {
                size = sizeMatch[1].replace(/\s*\([^)]+\)\s*/g, '').trim();
            }

            // 단위 추출
            const unitMatch = context.match(/단위\s*:\s*1?\s*(롤|평|㎡|세트|개|장|박스|M|EA)/i);
            if (unitMatch) {
                unit = unitMatch[1];
            }
        }

        if (!unit) {
            unit = extractUnit(info.name);
        }

        if (price > 0) {
            products.push({
                name: info.name,
                price,
                unit,
                size,
                imageUrl: info.imageUrl,
                originalUrl: `${OHOUSE_CONFIG.baseUrl}/product/detail.html?product_no=${productNo}&cate_no=${categoryId}`,
                brand,
                category: categoryInfo.parent || categoryInfo.name,
                subCategory: categoryInfo.parent ? categoryInfo.name : undefined,
                source: 'ohouse',
            });
        }

        priceIdx++;
    }

    // 간단한 대체 패턴 (위 방법이 실패한 경우)
    if (products.length === 0) {
        console.log('[OhouseCrawler] Trying simple pattern...');

        const simplePattern = /alt="([^"]{3,50})"[\s\S]{0,500}?(\d{1,3}(?:,\d{3})+)\s*원/gi;
        const simpleMatches = [...html.matchAll(simplePattern)];

        const seenNames = new Set<string>();
        for (const match of simpleMatches) {
            const name = match[1].trim();
            const price = parsePrice(match[2]);

            if (name && price > 10000 && !seenNames.has(name)) {
                seenNames.add(name);
                products.push({
                    name,
                    price,
                    unit: extractUnit(name),
                    originalUrl: `${OHOUSE_CONFIG.baseUrl}/product/list.html?cate_no=${categoryId}`,
                    category: categoryInfo.parent || categoryInfo.name,
                    subCategory: categoryInfo.parent ? categoryInfo.name : undefined,
                    source: 'ohouse',
                });
            }
        }
    }

    console.log(`[OhouseCrawler] Total products found: ${products.length}`);

    // 중복 제거
    return products.filter((product, index, self) =>
        index === self.findIndex(p => p.name === product.name)
    );
}

// 오하우스 크롤러 클래스
export class OhouseCrawler implements ICrawler {
    config = OHOUSE_CONFIG;

    getCategories(): Record<number, CategoryInfo> {
        return OHOUSE_CATEGORIES;
    }

    getParentCategories(): Record<number, number[]> {
        return OHOUSE_PARENT_CATEGORIES;
    }

    // 카테고리 확장 (상위 카테고리면 하위 포함)
    expandCategories(categoryIds: number[]): number[] {
        const expandedIds = new Set<number>();
        for (const id of categoryIds) {
            if (OHOUSE_PARENT_CATEGORIES[id]) {
                OHOUSE_PARENT_CATEGORIES[id].forEach(childId => expandedIds.add(childId));
            } else {
                expandedIds.add(id);
            }
        }
        return Array.from(expandedIds);
    }

    async crawlCategory(categoryId: number): Promise<CrawledProduct[]> {
        const url = `${this.config.baseUrl}/product/list.html?cate_no=${categoryId}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': this.config.userAgent,
                ...this.config.headers,
            },
        });

        if (!response.ok) {
            console.error(`[OhouseCrawler] Failed to fetch category ${categoryId}: ${response.status}`);
            return [];
        }

        const html = await response.text();
        return extractProductsFromHtml(html, categoryId);
    }

    async *crawlAll(categoryIds: number[]): AsyncGenerator<CrawlProgress> {
        const expandedIds = this.expandCategories(categoryIds);
        const totalCategories = expandedIds.length;
        let processedCategories = 0;

        for (const categoryId of expandedIds) {
            const categoryInfo = OHOUSE_CATEGORIES[categoryId] || { name: `카테고리 ${categoryId}` };

            // 진행 상태
            yield {
                type: 'progress',
                progress: Math.round((processedCategories / totalCategories) * 100),
                category: categoryInfo.name,
            };

            try {
                const products = await this.crawlCategory(categoryId);

                for (const product of products) {
                    yield { type: 'product', product };
                }

                // 요청 간 딜레이
                await new Promise(resolve => setTimeout(resolve, this.config.requestDelay));
            } catch (err) {
                console.error(`[OhouseCrawler] Error crawling category ${categoryId}:`, err);
            }

            processedCategories++;
        }

        yield { type: 'complete', progress: 100 };
    }
}

export const ohouseCrawler = new OhouseCrawler();
