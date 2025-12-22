// 한글 중문 크롤러
// hangel.co.kr 에서 중문 제품 정보를 크롤링합니다.

import {
    CrawledProduct,
    CrawlerConfig,
    CategoryInfo,
    ICrawler,
    CrawlProgress,
    DEFAULT_USER_AGENT,
    parsePrice,
} from './types';

// 크롤러 설정
export const HANGEL_CONFIG: CrawlerConfig = {
    name: '한글 중문',
    baseUrl: 'https://hangel.co.kr',
    requestDelay: 1000, // 1초 딜레이
    userAgent: DEFAULT_USER_AGENT,
    headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://hangel.co.kr/',
    },
};

// 카테고리 정보 (cate_no 기반)
export const HANGEL_CATEGORIES: Record<number, CategoryInfo> = {
    // 메인 카테고리
    84: { name: '중문 전체', parent: '중문' },

    // 세부 카테고리
    86: { name: '양개중문', parent: '중문' },
    1396: { name: '슬림 여닫이 중문', parent: '중문' },
    1205: { name: '스윙 중문', parent: '중문' },
    1398: { name: '연동중문', parent: '중문' },
    1291: { name: '3연동 중문', parent: '중문' },
    1289: { name: '4연동 중문', parent: '중문' },
    1290: { name: '6연동 중문', parent: '중문' },
    89: { name: '원슬라이딩 중문', parent: '중문' },
    87: { name: '미서기 중문', parent: '중문' },
    1399: { name: '간살중문', parent: '중문' },
    1206: { name: '프레임리스 중문', parent: '중문' },
    691: { name: '중문+파티션', parent: '중문' },
};

// 상위 카테고리 목록
export const HANGEL_PARENT_CATEGORIES: Record<string, number[]> = {
    '중문': [84, 86, 1396, 1205, 1398, 1291, 1289, 1290, 89, 87, 1399, 1206, 691],
};

// HTML에서 제품 정보 추출
function extractProductsFromHtml(html: string, cateNo: number): CrawledProduct[] {
    const products: CrawledProduct[] = [];
    const categoryInfo = HANGEL_CATEGORIES[cateNo] || { name: '중문', parent: '중문' };

    console.log(`[HangelCrawler] Parsing category ${cateNo}, HTML length: ${html.length}`);

    // 단계 1: df-prl__name이 있는 모든 a 태그 찾기
    // 패턴: <a href="...product_no=XXX..." class="df-prl__name ...">...<span...>제품명</span>...</a>
    // 또는: <a class="df-prl__name ..." href="...product_no=XXX...">...<span...>제품명</span>...</a>

    // 모든 df-prl__name 링크 찾기
    const nameLinkPattern = /<a[^>]*df-prl__name[^>]*href="[^"]*product_no=(\d+)[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi;
    const nameLinkPattern2 = /<a[^>]*href="[^"]*product_no=(\d+)[^"]*"[^>]*df-prl__name[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi;

    const foundProducts: Map<string, string> = new Map(); // productNo -> name

    let match;
    while ((match = nameLinkPattern.exec(html)) !== null) {
        foundProducts.set(match[1], match[2].trim());
    }
    while ((match = nameLinkPattern2.exec(html)) !== null) {
        if (!foundProducts.has(match[1])) {
            foundProducts.set(match[1], match[2].trim());
        }
    }

    console.log(`[HangelCrawler] Found ${foundProducts.size} products from name links`);

    // 단계 2: 각 제품의 가격 찾기
    const seenProducts = new Set<string>();

    for (const [productNo, name] of foundProducts) {
        // product_no 위치 찾기
        const pos = html.indexOf(`product_no=${productNo}`);
        if (pos === -1) continue;

        // 주변 컨텍스트 (product_no 뒤쪽에서 가격 찾기)
        const contextStart = pos;
        const contextEnd = Math.min(html.length, pos + 2000);
        const context = html.substring(contextStart, contextEnd);

        // 가격 찾기: "원"으로 끝나는 숫자 패턴 (product_price 클래스 내)
        // 예: <span...>570,000원</span>
        const priceMatch = context.match(/product_price[\s\S]*?<span[^>]*>([0-9,]+)\s*원/i);

        if (!priceMatch) {
            // 백업: 그냥 숫자+원 패턴 찾기
            const simplePriceMatch = context.match(/>([0-9,]{4,})\s*원</);
            if (simplePriceMatch) {
                const price = parsePrice(simplePriceMatch[1]);
                if (price > 0 && !seenProducts.has(productNo)) {
                    seenProducts.add(productNo);
                    products.push({
                        name: name.substring(0, 100),
                        price,
                        unit: '세트',
                        originalUrl: `${HANGEL_CONFIG.baseUrl}/product/detail.html?product_no=${productNo}&cate_no=${cateNo}`,
                        category: categoryInfo.parent || categoryInfo.name,
                        subCategory: categoryInfo.parent ? categoryInfo.name : undefined,
                        source: 'hangel',
                    });
                    console.log(`[HangelCrawler] Added (backup): ${name.substring(0, 40)} - ${price.toLocaleString()}원`);
                }
            }
            continue;
        }

        const price = parsePrice(priceMatch[1]);

        // 유효한 제품만 추가
        if (price > 0 && !seenProducts.has(productNo)) {
            seenProducts.add(productNo);
            products.push({
                name: name.substring(0, 100),
                price,
                unit: '세트',
                originalUrl: `${HANGEL_CONFIG.baseUrl}/product/detail.html?product_no=${productNo}&cate_no=${cateNo}`,
                category: categoryInfo.parent || categoryInfo.name,
                subCategory: categoryInfo.parent ? categoryInfo.name : undefined,
                source: 'hangel',
            });
            console.log(`[HangelCrawler] Added: ${name.substring(0, 40)} - ${price.toLocaleString()}원`);
        }
    }

    console.log(`[HangelCrawler] Total products found: ${products.length}`);

    // 중복 제거
    return products.filter((product, index, self) =>
        index === self.findIndex(p => p.name === product.name && p.price === product.price)
    );
}

// 한글 중문 크롤러 클래스
export class HangelCrawler implements ICrawler {
    config = HANGEL_CONFIG;

    getCategories(): Record<number, CategoryInfo> {
        return HANGEL_CATEGORIES;
    }

    getParentCategories(): Record<string, number[]> {
        return HANGEL_PARENT_CATEGORIES;
    }

    // 카테고리 확장
    expandCategories(categoryIds: number[]): number[] {
        const expandedIds = new Set<number>();
        for (const id of categoryIds) {
            // 상위 카테고리인 경우 모든 하위 카테고리 추가
            const parentName = Object.entries(HANGEL_PARENT_CATEGORIES).find(([, ids]) => ids.includes(id));
            if (parentName && id === HANGEL_PARENT_CATEGORIES[parentName[0]][0]) {
                // 첫 번째 ID(전체 카테고리)인 경우 하위 카테고리들 추가
                HANGEL_PARENT_CATEGORIES[parentName[0]].forEach(subId => expandedIds.add(subId));
            } else {
                expandedIds.add(id);
            }
        }
        return Array.from(expandedIds);
    }

    async crawlCategory(cateNo: number): Promise<CrawledProduct[]> {
        const url = `${this.config.baseUrl}/product/list.html?cate_no=${cateNo}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': this.config.userAgent,
                    ...this.config.headers,
                },
            });

            if (!response.ok) {
                console.error(`[HangelCrawler] Failed to fetch category ${cateNo}: ${response.status}`);
                return [];
            }

            const html = await response.text();
            return extractProductsFromHtml(html, cateNo);
        } catch (error) {
            console.error(`[HangelCrawler] Error fetching category ${cateNo}:`, error);
            return [];
        }
    }

    async *crawlAll(categoryIds: number[]): AsyncGenerator<CrawlProgress> {
        const expandedIds = this.expandCategories(categoryIds);
        const totalCategories = expandedIds.length;
        let processedCategories = 0;

        for (const cateNo of expandedIds) {
            const categoryInfo = HANGEL_CATEGORIES[cateNo] || { name: '중문' };

            // 진행 상태
            yield {
                type: 'progress',
                progress: Math.round((processedCategories / totalCategories) * 100),
                category: categoryInfo.name,
            };

            try {
                const products = await this.crawlCategory(cateNo);

                for (const product of products) {
                    yield { type: 'product', product };
                }

                // 요청 간 딜레이
                await new Promise(resolve => setTimeout(resolve, this.config.requestDelay));
            } catch (err) {
                console.error(`[HangelCrawler] Error crawling category ${cateNo}:`, err);
            }

            processedCategories++;
        }

        yield { type: 'complete', progress: 100 };
    }
}

export const hangelCrawler = new HangelCrawler();
