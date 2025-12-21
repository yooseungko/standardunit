// 자재로 크롤러
// zzro.kr 에서 제품 정보를 크롤링합니다.

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
export const ZZRO_CONFIG: CrawlerConfig = {
    name: '자재로',
    baseUrl: 'https://zzro.kr',
    requestDelay: 800, // 자재로는 좀 더 긴 딜레이
    userAgent: DEFAULT_USER_AGENT,
    headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://zzro.kr/',
    },
};

// 카테고리 정보 (URL 슬러그 기반) - 실제 zzro.kr 사이트 구조 반영
export const ZZRO_CATEGORIES: Record<string, CategoryInfo> = {
    // 목자재
    'wooden-all': { name: '목자재 전체', parent: '목자재', slug: 'wooden-all' },
    'wooden-scantling': { name: '각재', parent: '목자재', slug: 'wooden-scantling' },
    'wooden-plywood': { name: '합판', parent: '목자재', slug: 'wooden-plywood' },
    'wooden-mdf': { name: 'MDF', parent: '목자재', slug: 'wooden-mdf' },
    'wooden-molding': { name: '몰딩', parent: '목자재', slug: 'wooden-molding' },

    // 타일
    'tile-all': { name: '타일 전체', parent: '타일', slug: 'tile-all' },
    'tile-porcelain': { name: '포세린', parent: '타일', slug: 'tile-porcelain' },
    'tile-ceramic': { name: '도기질', parent: '타일', slug: 'tile-ceramic' },

    // 수전
    'faucet-all': { name: '수전 전체', parent: '수전', slug: 'faucet-all' },
    'faucet-kitchen': { name: '주방수전', parent: '수전', slug: 'faucet-kitchen' },
    'faucet-bath': { name: '욕실수전', parent: '수전', slug: 'faucet-bath' },

    // 도어
    'door-all': { name: '도어 전체', parent: '도어', slug: 'door-all' },
    'door-handle': { name: '손잡이', parent: '도어', slug: 'door-handle' },
    'door-rail': { name: '경첩/레일', parent: '도어', slug: 'door-rail' },

    // 부자재
    'subsidiary-all': { name: '부자재 전체', parent: '부자재', slug: 'subsidiary-all' },
    'subsidiary-adhesive': { name: '접착제/본드', parent: '부자재', slug: 'subsidiary-adhesive' },
    'subsidiary-hardware': { name: '기타철물', parent: '부자재', slug: 'subsidiary-hardware' },
    'subsidiary-switch': { name: '스위치', parent: '부자재', slug: 'subsidiary-switch' },
    'subsidiary-concent': { name: '콘센트', parent: '부자재', slug: 'subsidiary-concent' },
    'subsidiary-tacker': { name: '타카핀', parent: '부자재', slug: 'subsidiary-tacker' },
    'subsidiary-access': { name: '점검구', parent: '부자재', slug: 'subsidiary-access' },
    'subsidiary-corner': { name: '코너비드', parent: '부자재', slug: 'subsidiary-corner' },
    'subsidiary-trench': { name: '육가/유강', parent: '부자재', slug: 'subsidiary-trench' },

    // 조명 (lights - 's' 있음 주의! 'light'는 경량자재)
    'lights-all': { name: '조명 전체', parent: '조명', slug: 'lights-all' },
    'lights-recessed': { name: '매입등', parent: '조명', slug: 'lights-recessed' },
    'lights-ceiling': { name: '천정등', parent: '조명', slug: 'lights-ceiling' },
    'lights-direct': { name: '직부등', parent: '조명', slug: 'lights-direct' },
    'lights-pendant': { name: '펜던트등', parent: '조명', slug: 'lights-pendant' },

    // 도기 (sanitaryware - 올바른 슬러그)
    'sanitaryware-all': { name: '도기 전체', parent: '도기', slug: 'sanitaryware-all' },
    'sanitaryware-americanstandard': { name: '아메리칸스탠다드', parent: '도기', slug: 'sanitaryware-americanstandard' },
    'sanitaryware-dk': { name: 'DK', parent: '도기', slug: 'sanitaryware-dk' },
    'sanitaryware-lauche': { name: '라우체', parent: '도기', slug: 'sanitaryware-lauche' },

    // 경량자재 (light - 's' 없음)
    'light-all': { name: '경량자재 전체', parent: '경량자재', slug: 'light-all' },
};

// 상위 카테고리 목록
export const ZZRO_PARENT_CATEGORIES: Record<string, string[]> = {
    'wooden': ['wooden-all', 'wooden-scantling', 'wooden-plywood', 'wooden-mdf', 'wooden-molding'],
    'tile': ['tile-all', 'tile-porcelain', 'tile-ceramic'],
    'faucet': ['faucet-all', 'faucet-kitchen', 'faucet-bath'],
    'door': ['door-all', 'door-handle', 'door-rail'],
    'subsidiary': ['subsidiary-all', 'subsidiary-adhesive', 'subsidiary-hardware', 'subsidiary-switch', 'subsidiary-concent', 'subsidiary-tacker', 'subsidiary-access', 'subsidiary-corner', 'subsidiary-trench'],
    'lights': ['lights-all', 'lights-recessed', 'lights-ceiling', 'lights-direct', 'lights-pendant'],
    'sanitaryware': ['sanitaryware-all', 'sanitaryware-americanstandard', 'sanitaryware-dk', 'sanitaryware-lauche'],
    'light': ['light-all'],
};


// HTML에서 제품 정보 추출
function extractProductsFromHtml(html: string, categorySlug: string): CrawledProduct[] {
    const products: CrawledProduct[] = [];
    const categoryInfo = ZZRO_CATEGORIES[categorySlug] || { name: categorySlug };

    console.log(`[ZzroCrawler] Parsing category ${categorySlug}, HTML length: ${html.length}`);

    // 자재로 사이트는 다양한 패턴 사용
    // 패턴 1: a.blocked._fade_link 내부의 h2 (제품명)와 p (가격)
    // 패턴 예: <a class="blocked _fade_link" href="/shop_view/?idx=12345">
    //           <h2>제품명</h2>
    //           <p>10,230원</p>
    //         </a>

    // shop_view idx 추출
    const productPattern = /href="\/shop_view\/\?idx=(\d+)"[\s\S]*?<h2[^>]*>([^<]+)<\/h2>[\s\S]*?<p[^>]*>([^<]*원[^<]*)<\/p>/gi;
    const productMatches = [...html.matchAll(productPattern)];

    console.log(`[ZzroCrawler] Pattern 1 found ${productMatches.length} products`);

    for (const match of productMatches) {
        const idx = match[1];
        const name = match[2].trim();
        const priceText = match[3];
        const price = parsePrice(priceText);

        if (name && price > 0) {
            products.push({
                name,
                price,
                unit: extractUnit(name),
                originalUrl: `${ZZRO_CONFIG.baseUrl}/shop_view/?idx=${idx}`,
                category: categoryInfo.parent || categoryInfo.name,
                subCategory: categoryInfo.parent ? categoryInfo.name : undefined,
                source: 'zzro',
            });
            console.log(`[ZzroCrawler] Added: ${name} - ${price}원`);
        }
    }

    // 패턴 2: 다른 구조의 제품 카드
    if (products.length === 0) {
        console.log('[ZzroCrawler] Trying alternative pattern...');

        // idx와 제품명/가격을 분리해서 찾기
        const idxPattern = /\/shop_view\/\?idx=(\d+)/g;
        const idxMatches = [...html.matchAll(idxPattern)];
        const idxSet = new Set<string>();

        for (const match of idxMatches) {
            idxSet.add(match[1]);
        }

        console.log(`[ZzroCrawler] Found ${idxSet.size} unique product IDs`);

        // 각 idx 주변에서 정보 추출
        for (const idx of idxSet) {
            const idxPos = html.indexOf(`idx=${idx}`);
            if (idxPos !== -1) {
                // idx 주변 2000자 범위에서 제품명과 가격 찾기
                const start = Math.max(0, idxPos - 500);
                const end = Math.min(html.length, idxPos + 1500);
                const context = html.substring(start, end);

                // 제품명 추출 (h2, h3, span 등에서)
                const nameMatch = context.match(/<h2[^>]*>([^<]{2,100})<\/h2>|<h3[^>]*>([^<]{2,100})<\/h3>|class="[^"]*name[^"]*"[^>]*>([^<]{2,100})</i);
                const name = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3])?.trim() : null;

                // 가격 추출
                const priceMatch = context.match(/(\d{1,3}(?:,\d{3})*)\s*원/);
                const price = priceMatch ? parsePrice(priceMatch[1]) : 0;

                if (name && price > 0) {
                    // 중복 체크
                    const isDuplicate = products.some(p => p.name === name && p.price === price);
                    if (!isDuplicate) {
                        products.push({
                            name,
                            price,
                            unit: extractUnit(name),
                            originalUrl: `${ZZRO_CONFIG.baseUrl}/shop_view/?idx=${idx}`,
                            category: categoryInfo.parent || categoryInfo.name,
                            subCategory: categoryInfo.parent ? categoryInfo.name : undefined,
                            source: 'zzro',
                        });
                        console.log(`[ZzroCrawler] Added (alt): ${name} - ${price}원`);
                    }
                }
            }
        }
    }

    // 패턴 3: 간단한 제품명-가격 쌍
    if (products.length === 0) {
        console.log('[ZzroCrawler] Trying simple pattern...');

        // 제품명과 가격이 인접한 패턴
        const simplePattern = />([가-힣A-Za-z0-9\s\-\(\)]{3,50})<[\s\S]{0,200}?(\d{1,3}(?:,\d{3})+)\s*원/gi;
        const simpleMatches = [...html.matchAll(simplePattern)];

        const seenNames = new Set<string>();
        for (const match of simpleMatches) {
            const name = match[1].trim();
            const price = parsePrice(match[2]);

            // 유효한 제품명인지 확인 (너무 일반적인 단어 제외)
            const invalidNames = ['자재로', '카테고리', '메뉴', '검색', '장바구니', '로그인', '회원가입'];
            const isValid = name.length >= 3 && !invalidNames.some(n => name.includes(n));

            if (isValid && price > 1000 && !seenNames.has(name)) {
                seenNames.add(name);
                products.push({
                    name,
                    price,
                    unit: extractUnit(name),
                    originalUrl: `${ZZRO_CONFIG.baseUrl}/product-${categorySlug}`,
                    category: categoryInfo.parent || categoryInfo.name,
                    subCategory: categoryInfo.parent ? categoryInfo.name : undefined,
                    source: 'zzro',
                });
                console.log(`[ZzroCrawler] Added (simple): ${name} - ${price}원`);
            }
        }
    }

    console.log(`[ZzroCrawler] Total products found: ${products.length}`);

    // 중복 제거
    return products.filter((product, index, self) =>
        index === self.findIndex(p => p.name === product.name && p.price === product.price)
    );
}

// 자재로 크롤러 클래스
export class ZzroCrawler implements ICrawler {
    config = ZZRO_CONFIG;

    getCategories(): Record<string, CategoryInfo> {
        return ZZRO_CATEGORIES;
    }

    getParentCategories(): Record<string, string[]> {
        return ZZRO_PARENT_CATEGORIES;
    }

    // 카테고리 확장
    expandCategories(categoryIds: string[]): string[] {
        const expandedIds = new Set<string>();
        for (const id of categoryIds) {
            // 상위 카테고리인 경우 -all 카테고리만 추가
            if (ZZRO_PARENT_CATEGORIES[id]) {
                const allCategory = `${id}-all`;
                if (ZZRO_CATEGORIES[allCategory]) {
                    expandedIds.add(allCategory);
                }
            } else {
                expandedIds.add(id);
            }
        }
        return Array.from(expandedIds);
    }

    async crawlCategory(categorySlug: string): Promise<CrawledProduct[]> {
        const url = `${this.config.baseUrl}/product-${categorySlug}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': this.config.userAgent,
                    ...this.config.headers,
                },
            });

            if (!response.ok) {
                console.error(`[ZzroCrawler] Failed to fetch category ${categorySlug}: ${response.status}`);
                return [];
            }

            const html = await response.text();
            return extractProductsFromHtml(html, categorySlug);
        } catch (error) {
            console.error(`[ZzroCrawler] Error fetching category ${categorySlug}:`, error);
            return [];
        }
    }

    async *crawlAll(categoryIds: string[]): AsyncGenerator<CrawlProgress> {
        const expandedIds = this.expandCategories(categoryIds);
        const totalCategories = expandedIds.length;
        let processedCategories = 0;

        for (const categorySlug of expandedIds) {
            const categoryInfo = ZZRO_CATEGORIES[categorySlug] || { name: categorySlug };

            // 진행 상태
            yield {
                type: 'progress',
                progress: Math.round((processedCategories / totalCategories) * 100),
                category: categoryInfo.name,
            };

            try {
                const products = await this.crawlCategory(categorySlug);

                for (const product of products) {
                    yield { type: 'product', product };
                }

                // 요청 간 딜레이
                await new Promise(resolve => setTimeout(resolve, this.config.requestDelay));
            } catch (err) {
                console.error(`[ZzroCrawler] Error crawling category ${categorySlug}:`, err);
            }

            processedCategories++;
        }

        yield { type: 'complete', progress: 100 };
    }
}

export const zzroCrawler = new ZzroCrawler();
