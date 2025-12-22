// 이안몰 크롤러
// ian-mall.kr 에서 싱크볼 등 주방용품 정보를 크롤링합니다.

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
export const IANMALL_CONFIG: CrawlerConfig = {
    name: '이안몰',
    baseUrl: 'https://ian-mall.kr',
    requestDelay: 1000, // 1초 딜레이
    userAgent: DEFAULT_USER_AGENT,
    headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://ian-mall.kr/',
    },
};

// 카테고리 정보 (cate_no 기반)
// url은 실제 카테고리 페이지 경로
export const IANMALL_CATEGORIES: Record<number, CategoryInfo & { url?: string }> = {
    // 싱크볼
    993: { name: '싱크볼', parent: '주방', url: '/category/%EC%94%BD%ED%81%AC%EB%B3%BC/993' },

    // 수전 카테고리 (추후 확장 가능)
    // 994: { name: '주방수전', parent: '주방', url: '/category/주방수전/994' },
};

// 상위 카테고리 목록
export const IANMALL_PARENT_CATEGORIES: Record<string, number[]> = {
    '주방': [993],
};

// HTML에서 제품 정보 추출
function extractProductsFromHtml(html: string, cateNo: number): CrawledProduct[] {
    const products: CrawledProduct[] = [];
    const categoryInfo = IANMALL_CATEGORIES[cateNo] || { name: '싱크볼', parent: '주방' };

    console.log(`[IanmallCrawler] Parsing category ${cateNo}, HTML length: ${html.length}`);

    // 모든 df-prl-name 링크 찾기 (하이픈 사용)
    // 패턴: <a href="...product_no=XXX..." class="df-prl-name ...">
    //         <strong class="displaynone"><span>상품명</span></strong>  <-- 숨겨진 라벨, 제외해야 함
    //         <span>[에스티로] 사각 엠보 싱크볼 850</span>  <-- 실제 제품명
    //       </a>

    // 접근법: product_no와 관련된 모든 a 태그에서 마지막 span의 텍스트를 추출
    const productLinkPattern = /<a[^>]*href="[^"]*product_no=(\d+)[^"]*"[^>]*class="[^"]*df-prl-name[^"]*"[^>]*>[\s\S]*?<\/a>|<a[^>]*class="[^"]*df-prl-name[^"]*"[^>]*href="[^"]*product_no=(\d+)[^"]*"[^>]*>[\s\S]*?<\/a>/gi;

    const foundProducts: Map<string, string> = new Map(); // productNo -> name

    let match;
    while ((match = productLinkPattern.exec(html)) !== null) {
        const productNo = match[1] || match[2];
        const linkHtml = match[0];

        // displaynone이 아닌 마지막 span 찾기
        // 모든 span 추출 후 마지막 것 사용
        const spanPattern = /<span[^>]*>([^<]+)<\/span>/gi;
        const spans: string[] = [];
        let spanMatch;
        while ((spanMatch = spanPattern.exec(linkHtml)) !== null) {
            const text = spanMatch[1].trim();
            // "상품명" 같은 라벨 텍스트 제외
            if (text && text !== '상품명' && text.length > 2) {
                spans.push(text);
            }
        }

        // 마지막 유효한 span이 제품명
        const name = spans.length > 0 ? spans[spans.length - 1] : null;
        if (name && productNo) {
            foundProducts.set(productNo, name);
        }
    }

    console.log(`[IanmallCrawler] Found ${foundProducts.size} products from name links`);

    // 각 제품의 가격 찾기
    const seenProducts = new Set<string>();

    for (const [productNo, name] of foundProducts) {
        // product_no 위치 찾기
        const pos = html.indexOf(`product_no=${productNo}`);
        if (pos === -1) continue;

        // 주변 컨텍스트 (product_no 뒤쪽에서 가격 찾기)
        const contextStart = pos;
        const contextEnd = Math.min(html.length, pos + 2000);
        const context = html.substring(contextStart, contextEnd);

        // 가격 찾기: "원"으로 끝나는 숫자 패턴
        const priceMatch = context.match(/product_price[\s\S]*?<span[^>]*>([0-9,]+)\s*원/i);

        let price = 0;
        if (priceMatch) {
            price = parsePrice(priceMatch[1]);
        } else {
            // 백업: 그냥 숫자+원 패턴 찾기
            const simplePriceMatch = context.match(/>([0-9,]{4,})\s*원</);
            if (simplePriceMatch) {
                price = parsePrice(simplePriceMatch[1]);
            }
        }

        // 유효한 제품만 추가
        if (price > 0 && !seenProducts.has(productNo)) {
            seenProducts.add(productNo);
            products.push({
                name: name.substring(0, 100),
                price,
                unit: '개',
                originalUrl: `${IANMALL_CONFIG.baseUrl}/product/detail.html?product_no=${productNo}&cate_no=${cateNo}`,
                category: categoryInfo.parent || categoryInfo.name,
                subCategory: categoryInfo.parent ? categoryInfo.name : undefined,
                source: 'ianmall',
            });
            console.log(`[IanmallCrawler] Added: ${name.substring(0, 40)} - ${price.toLocaleString()}원`);
        }
    }

    console.log(`[IanmallCrawler] Total products found: ${products.length}`);

    // 중복 제거
    return products.filter((product, index, self) =>
        index === self.findIndex(p => p.name === product.name && p.price === product.price)
    );
}

// 이안몰 크롤러 클래스
export class IanmallCrawler implements ICrawler {
    config = IANMALL_CONFIG;

    getCategories(): Record<number, CategoryInfo> {
        return IANMALL_CATEGORIES;
    }

    getParentCategories(): Record<string, number[]> {
        return IANMALL_PARENT_CATEGORIES;
    }

    // 카테고리 확장
    expandCategories(categoryIds: number[]): number[] {
        const expandedIds = new Set<number>();
        for (const id of categoryIds) {
            expandedIds.add(id);
        }
        return Array.from(expandedIds);
    }

    async crawlCategory(cateNo: number): Promise<CrawledProduct[]> {
        const categoryInfo = IANMALL_CATEGORIES[cateNo];
        const urlPath = categoryInfo?.url || `/category/?cate_no=${cateNo}`;
        const url = `${this.config.baseUrl}${urlPath}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': this.config.userAgent,
                    ...this.config.headers,
                },
            });

            if (!response.ok) {
                console.error(`[IanmallCrawler] Failed to fetch category ${cateNo}: ${response.status}`);
                return [];
            }

            const html = await response.text();
            return extractProductsFromHtml(html, cateNo);
        } catch (error) {
            console.error(`[IanmallCrawler] Error fetching category ${cateNo}:`, error);
            return [];
        }
    }

    async *crawlAll(categoryIds: number[]): AsyncGenerator<CrawlProgress> {
        const expandedIds = this.expandCategories(categoryIds);
        const totalCategories = expandedIds.length;
        let processedCategories = 0;

        for (const cateNo of expandedIds) {
            const categoryInfo = IANMALL_CATEGORIES[cateNo] || { name: '싱크볼' };

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
                console.error(`[IanmallCrawler] Error crawling category ${cateNo}:`, err);
            }

            processedCategories++;
        }

        yield { type: 'complete', progress: 100 };
    }
}

export const ianmallCrawler = new IanmallCrawler();
