// 에스와이 (symembership.com) 크롤러
// symembership.com 에서 주방후드, 쿡탑, 수전 등 주방가전 정보를 크롤링합니다.

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
export const SYMEMBERSHIP_CONFIG: CrawlerConfig = {
    name: '에스와이',
    baseUrl: 'https://symembership.com',
    requestDelay: 1000, // 1초 딜레이
    userAgent: DEFAULT_USER_AGENT,
    headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://symembership.com/',
    },
};

// 카테고리 정보 (cate_no 기반)
// 주방후드 카테고리: 80 (하츠 브랜드)
export const SYMEMBERSHIP_CATEGORIES: Record<number, CategoryInfo & { url?: string }> = {
    // 하츠 브랜드 - 주방후드
    80: { name: '주방후드', parent: '하츠', url: '/category/%EC%A3%BC%EB%B0%A9%ED%9B%84%EB%93%9C/80' },

    // 추가 카테고리 (필요시 확장)
    // 하츠 쿡탑
    145: { name: '쿡탑', parent: '하츠', url: '/category/%EC%BF%A1%ED%83%91/145' },
    // 하츠 싱크볼
    144: { name: '싱크볼', parent: '하츠', url: '/category/%EC%8B%B1%ED%81%AC%EB%B3%BC/144' },
    // 하츠 주방수전
    79: { name: '주방수전', parent: '하츠', url: '/category/%EC%A3%BC%EB%B0%A9%EC%88%98%EC%A0%84/79' },
    // 욕실환풍기
    141: { name: '욕실환풍기', parent: '하츠', url: '/category/%EC%9A%95%EC%8B%A4-%ED%99%98%ED%92%8D%EA%B8%B0/141' },

    // 파세코 브랜드 - 주방후드
    85: { name: '주방후드', parent: '파세코', url: '/category/%EC%A3%BC%EB%B0%A9%ED%9B%84%EB%93%9C/85' },
    // 파세코 쿡탑
    86: { name: '쿡탑', parent: '파세코', url: '/category/%EC%BF%A1%ED%83%91/86' },

    // 트라이애드 브랜드 - 주방후드
    97: { name: '주방후드', parent: '트라이애드', url: '/category/%EC%A3%BC%EB%B0%A9%ED%9B%84%EB%93%9C/97' },
    // 트라이애드 쿡탑
    98: { name: '쿡탑', parent: '트라이애드', url: '/category/%EC%BF%A1%ED%83%91/98' },

    // 엠시스 브랜드 - 주방후드
    131: { name: '주방후드', parent: '엠시스', url: '/category/%EC%A3%BC%EB%B0%A9%ED%9B%84%EB%93%9C/131' },

    // 주방후드 전체 (카테고리 104)
    104: { name: '주방후드', parent: '전체', url: '/category/%EC%A3%BC%EB%B0%A9%ED%9B%84%EB%93%9C/104' },
};

// 상위 카테고리 목록
export const SYMEMBERSHIP_PARENT_CATEGORIES: Record<string, number[]> = {
    '하츠': [80, 145, 144, 79, 141],
    '파세코': [85, 86],
    '트라이애드': [97, 98],
    '엠시스': [131],
    '주방후드': [80, 85, 97, 131, 104],
    '쿡탑': [145, 86, 98],
};

// HTML에서 제품 정보 추출
// 실제 HTML 구조:
// <li id="anchorBoxId_XXX">
//   <div class="prdList__item">
//     <div class="thumbnail"><a href="/product/detail.html?product_no=XXX&cate_no=80">...</a></div>
//     <div class="description" ec-data-price="350000">
//       <div class="name"><a href="..."><span class="displaynone">상품명 :</span><span>제품명</span></a></div>
//       <ul class="spec">
//         <li><strong class="displaynone">판매가 :</strong><span>350,000원</span></li>
//       </ul>
//     </div>
//   </div>
// </li>
function extractProductsFromHtml(html: string, cateNo: number): CrawledProduct[] {
    const products: CrawledProduct[] = [];
    const categoryInfo = SYMEMBERSHIP_CATEGORIES[cateNo] || { name: '주방후드', parent: '주방' };

    console.log(`[SymembershipCrawler] Parsing category ${cateNo}, HTML length: ${html.length}`);

    // 방법 1: anchorBoxId_XXX 패턴으로 각 제품 블록 찾기
    const productBlockPattern = /<li[^>]*id="anchorBoxId_(\d+)"[^>]*>([\s\S]*?)<\/li>/gi;

    let match;
    while ((match = productBlockPattern.exec(html)) !== null) {
        const productNo = match[1];
        const blockHtml = match[2];

        // product_no 추출 (href에서)
        const hrefMatch = blockHtml.match(/href="([^"]*product_no=(\d+)[^"]*)"/i);
        if (!hrefMatch) continue;

        const productUrl = hrefMatch[1];
        const actualProductNo = hrefMatch[2];

        // 제품명 추출: <div class="name">...<span>제품명</span></a></div>
        // displaynone이 아닌 마지막 span의 텍스트
        let productName = '';

        // 이름 div 찾기
        const nameMatch = blockHtml.match(/<div[^>]*class="[^"]*name[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        if (nameMatch) {
            const nameHtml = nameMatch[1];
            // displaynone이 아닌 span들에서 텍스트 추출
            const spanPattern = /<span(?![^>]*displaynone)[^>]*>([^<]+)<\/span>/gi;
            const spans: string[] = [];
            let spanMatch;
            while ((spanMatch = spanPattern.exec(nameHtml)) !== null) {
                const text = spanMatch[1].trim();
                if (text && text !== '상품명' && text !== '상품명 :' && text.length > 2) {
                    spans.push(text);
                }
            }
            // 마지막 유효한 span이 제품명
            if (spans.length > 0) {
                productName = spans[spans.length - 1];
            }
        }

        // 이름이 없으면 img alt에서 추출 시도
        if (!productName) {
            const imgMatch = blockHtml.match(/<img[^>]*alt="([^"]+)"[^>]*>/i);
            if (imgMatch) {
                productName = imgMatch[1].trim();
            }
        }

        if (!productName) continue;

        // 가격 추출
        let price = 0;

        // 방법 1: ec-data-price 속성 (가장 신뢰할 수 있음)
        const ecPriceMatch = blockHtml.match(/ec-data-price="(\d+)"/i);
        if (ecPriceMatch) {
            price = parseInt(ecPriceMatch[1], 10);
        }

        // 방법 2: 판매가 span에서 추출
        if (price === 0) {
            const pricePatterns = [
                /판매가[^<]*<\/(?:strong|span)>\s*<span[^>]*>([0-9,]+)\s*원/i,
                />([0-9,]{4,})\s*원<\/span>/i,
                /([0-9,]{4,})\s*원/,
            ];

            for (const pattern of pricePatterns) {
                const priceMatch = blockHtml.match(pattern);
                if (priceMatch) {
                    price = parsePrice(priceMatch[1]);
                    if (price > 0) break;
                }
            }
        }

        if (price <= 0) continue;

        // 브랜드 추출 (상품명에서)
        let brand = categoryInfo.parent || '기타';
        if (productName.includes('하츠') || productName.toLowerCase().includes('hatz')) brand = '하츠';
        else if (productName.includes('파세코') || productName.toLowerCase().includes('paseco')) brand = '파세코';
        else if (productName.includes('트라이애드')) brand = '트라이애드';
        else if (productName.includes('엠시스') || productName.toLowerCase().includes('msys')) brand = '엠시스';
        else if (productName.includes('엘리카') || productName.toLowerCase().includes('elica')) brand = '하츠(엘리카)';

        // URL 정규화
        const fullUrl = productUrl.startsWith('http')
            ? productUrl
            : `${SYMEMBERSHIP_CONFIG.baseUrl}${productUrl.startsWith('/') ? '' : '/'}${productUrl}`;

        products.push({
            name: productName.substring(0, 100),
            price,
            unit: '개',
            originalUrl: fullUrl,
            brand,
            category: '주방',
            subCategory: categoryInfo.name,
            source: 'symembership',
        });

        console.log(`[SymembershipCrawler] Added: ${productName.substring(0, 40)} - ${price.toLocaleString()}원 (${brand})`);
    }

    // 방법 2: prdList__item 패턴으로도 시도 (백업)
    if (products.length === 0) {
        console.log(`[SymembershipCrawler] Trying alternative pattern...`);

        // product_no와 가격 쌍 찾기
        const productLinkPattern = /href="[^"]*product_no=(\d+)[^"]*"[^>]*>[\s\S]*?<img[^>]*alt="([^"]+)"[\s\S]*?ec-data-price="(\d+)"/gi;

        while ((match = productLinkPattern.exec(html)) !== null) {
            const productNo = match[1];
            const productName = match[2].trim();
            const price = parseInt(match[3], 10);

            if (productName && price > 0) {
                let brand = categoryInfo.parent || '기타';
                if (productName.includes('하츠')) brand = '하츠';

                products.push({
                    name: productName.substring(0, 100),
                    price,
                    unit: '개',
                    originalUrl: `${SYMEMBERSHIP_CONFIG.baseUrl}/product/detail.html?product_no=${productNo}&cate_no=${cateNo}`,
                    brand,
                    category: '주방',
                    subCategory: categoryInfo.name,
                    source: 'symembership',
                });

                console.log(`[SymembershipCrawler] Added (alt): ${productName.substring(0, 40)} - ${price.toLocaleString()}원`);
            }
        }
    }

    console.log(`[SymembershipCrawler] Total products found: ${products.length}`);

    // 중복 제거
    return products.filter((product, index, self) =>
        index === self.findIndex(p => p.name === product.name && p.price === product.price)
    );
}

// 페이지 수 추출
function extractMaxPage(html: string): number {
    // 페이지네이션에서 최대 페이지 번호 찾기
    // 패턴: page=N 형태
    const pageMatches = html.matchAll(/[?&]page=(\d+)/g);
    let maxPage = 1;

    for (const match of pageMatches) {
        const pageNum = parseInt(match[1], 10);
        if (pageNum > maxPage) {
            maxPage = pageNum;
        }
    }

    return maxPage;
}

// 에스와이 크롤러 클래스
export class SymembershipCrawler implements ICrawler {
    config = SYMEMBERSHIP_CONFIG;

    getCategories(): Record<number, CategoryInfo> {
        return SYMEMBERSHIP_CATEGORIES;
    }

    getParentCategories(): Record<string, number[]> {
        return SYMEMBERSHIP_PARENT_CATEGORIES;
    }

    // 카테고리 확장
    expandCategories(categoryIds: number[]): number[] {
        const expandedIds = new Set<number>();
        for (const id of categoryIds) {
            expandedIds.add(id);
        }
        return Array.from(expandedIds);
    }

    async fetchPage(cateNo: number, page: number = 1): Promise<string> {
        const categoryInfo = SYMEMBERSHIP_CATEGORIES[cateNo];
        const urlPath = categoryInfo?.url || `/category/?cate_no=${cateNo}`;
        const url = page > 1
            ? `${this.config.baseUrl}${urlPath}?page=${page}`
            : `${this.config.baseUrl}${urlPath}`;

        console.log(`[SymembershipCrawler] Fetching: ${url}`);

        const response = await fetch(url, {
            headers: {
                'User-Agent': this.config.userAgent,
                ...this.config.headers,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }

        return await response.text();
    }

    async crawlCategory(cateNo: number): Promise<CrawledProduct[]> {
        try {
            const allProducts: CrawledProduct[] = [];

            // 첫 페이지 크롤링
            const firstPageHtml = await this.fetchPage(cateNo, 1);
            const firstPageProducts = extractProductsFromHtml(firstPageHtml, cateNo);
            allProducts.push(...firstPageProducts);

            // 페이지 수 확인
            const maxPage = extractMaxPage(firstPageHtml);
            console.log(`[SymembershipCrawler] Category ${cateNo} has ${maxPage} pages`);

            // 추가 페이지 크롤링
            for (let page = 2; page <= maxPage; page++) {
                await new Promise(resolve => setTimeout(resolve, this.config.requestDelay));

                try {
                    const html = await this.fetchPage(cateNo, page);
                    const products = extractProductsFromHtml(html, cateNo);
                    allProducts.push(...products);
                } catch (error) {
                    console.error(`[SymembershipCrawler] Error fetching page ${page}:`, error);
                }
            }

            // 중복 제거
            const uniqueProducts = allProducts.filter((product, index, self) =>
                index === self.findIndex(p => p.name === product.name && p.price === product.price)
            );

            return uniqueProducts;
        } catch (error) {
            console.error(`[SymembershipCrawler] Error fetching category ${cateNo}:`, error);
            return [];
        }
    }

    async *crawlAll(categoryIds: number[]): AsyncGenerator<CrawlProgress> {
        const expandedIds = this.expandCategories(categoryIds);
        const totalCategories = expandedIds.length;
        let processedCategories = 0;

        for (const cateNo of expandedIds) {
            const categoryInfo = SYMEMBERSHIP_CATEGORIES[cateNo] || { name: '주방후드' };

            // 진행 상태
            yield {
                type: 'progress',
                progress: Math.round((processedCategories / totalCategories) * 100),
                category: `${categoryInfo.parent || ''} ${categoryInfo.name}`.trim(),
            };

            try {
                const products = await this.crawlCategory(cateNo);

                for (const product of products) {
                    yield { type: 'product', product };
                }

                // 요청 간 딜레이
                await new Promise(resolve => setTimeout(resolve, this.config.requestDelay));
            } catch (err) {
                console.error(`[SymembershipCrawler] Error crawling category ${cateNo}:`, err);
            }

            processedCategories++;
        }

        yield { type: 'complete', progress: 100 };
    }
}

export const symembershipCrawler = new SymembershipCrawler();
