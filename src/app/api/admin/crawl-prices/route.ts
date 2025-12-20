import { NextRequest } from 'next/server';

const BASE_URL = 'https://ohouseinterior.com';

// 카테고리 정보
const CATEGORY_MAP: Record<number, { name: string; parent?: string }> = {
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
};

// 상위 카테고리 (하위 카테고리 가져오기용)
const PARENT_CATEGORIES: Record<number, number[]> = {
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

// 가격 파싱
function parsePrice(priceText: string): number {
    const cleaned = priceText.replace(/[^\d]/g, '');
    return parseInt(cleaned, 10) || 0;
}

// 단위 추출
function extractUnit(text: string): string {
    const unitPatterns = [
        { pattern: /㎡|제곱미터|평방미터/i, unit: '㎡' },
        { pattern: /롤|Roll/i, unit: '롤' },
        { pattern: /세트|set/i, unit: '세트' },
        { pattern: /개|EA|ea/i, unit: '개' },
        { pattern: /M|미터|m/i, unit: 'M' },
        { pattern: /박스|Box/i, unit: '박스' },
        { pattern: /장/i, unit: '장' },
    ];

    for (const { pattern, unit } of unitPatterns) {
        if (pattern.test(text)) {
            return unit;
        }
    }
    return '개'; // 기본값
}

// HTML에서 제품 정보 추출 (정규식 기반)
function extractProducts(html: string, categoryId: number): Array<{
    name: string;
    price: number;
    unit: string;
    size?: string;
    imageUrl?: string;
    originalUrl: string;
    brand?: string;
}> {
    const products: Array<{
        name: string;
        price: number;
        unit: string;
        size?: string;
        imageUrl?: string;
        originalUrl: string;
        brand?: string;
    }> = [];

    console.log(`[Crawl] Parsing category ${categoryId}, HTML length: ${html.length}`);

    // 방법 1: df-prl 구조 기반 추출 (Cafe24 템플릿)
    // 제품 블록 패턴: product_no가 포함된 링크를 기준으로 제품 찾기

    // alt 속성에서 제품명과 product_no 매핑
    const productMap = new Map<string, { name: string; productNo: string; imageUrl?: string }>();

    // 패턴 1: img 태그의 alt 속성에서 제품명 추출 (eListPrdImage{product_no} 패턴)
    // 예: <img ... id="eListPrdImage271_1" alt="하우스 스톤" ...>
    const imgAltPattern = /id="eListPrdImage(\d+)[^"]*"[^>]*alt="([^"]+)"/gi;
    const imgAltMatches = [...html.matchAll(imgAltPattern)];

    for (const match of imgAltMatches) {
        const productNo = match[1];
        const name = match[2].trim();

        if (name && name.length > 1 && !productMap.has(productNo)) {
            // 해당 img 근처에서 src 추출
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

    // 패턴 2: df-prl__name 클래스에서 제품명 추출 (alt가 없는 경우)
    const namePattern = /product_no=(\d+)[^"]*"[^>]*class="df-prl__name[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi;
    const nameMatches = [...html.matchAll(namePattern)];

    for (const match of nameMatches) {
        const productNo = match[1];
        const name = match[2].trim();

        if (name && name.length > 1 && !productMap.has(productNo)) {
            productMap.set(productNo, {
                name,
                productNo,
            });
        }
    }

    // 패턴 3: 일반 alt 속성에서 추출 (product_no와 alt가 같은 a 태그 내에 있는 경우)
    const altPattern = /product_no=(\d+)[\s\S]*?alt="([^"]+)"/gi;
    const altMatches = [...html.matchAll(altPattern)];

    for (const match of altMatches) {
        const productNo = match[1];
        const name = match[2].trim();

        if (name && name.length > 1 && !productMap.has(productNo)) {
            productMap.set(productNo, {
                name,
                productNo,
            });
        }
    }

    console.log(`[Crawl] Found ${productMap.size} unique products from various patterns`);

    // 가격 추출: "판매가" 뒤에 오는 가격 또는 일반 가격 패턴
    // 실제 HTML: <span>판매가</span> :</strong> <span>275,000원</span>
    const pricePattern = /판매가[\s\S]*?>(\d{1,3}(?:,\d{3})*)\s*원/gi;
    const priceMatches = [...html.matchAll(pricePattern)];
    const prices: number[] = [];

    for (const match of priceMatches) {
        const price = parsePrice(match[1]);
        if (price > 0) {
            prices.push(price);
        }
    }

    console.log(`[Crawl] Found ${prices.length} prices`);

    // 브랜드 추출: 모든 브랜드를 순서대로 추출
    const brandPattern = /브랜드\s*[:\s]\s*([A-Za-z가-힣\s]+?)(?:\s*[-<\n]|$)/gi;
    const brandMatches = [...html.matchAll(brandPattern)];
    const brands: string[] = [];

    for (const match of brandMatches) {
        const brand = match[1].trim();
        if (brand && brand.length > 1) {
            brands.push(brand);
        }
    }

    console.log(`[Crawl] Found ${brands.length} brands`);

    // "견적 문의" 제품 수 카운트
    const inquiryPattern = /견적\s*문의/gi;
    const inquiryCount = (html.match(inquiryPattern) || []).length;
    if (inquiryCount > 0) {
        console.log(`[Crawl] Skipping ${inquiryCount} products with "견적 문의" (no price)`);
    }

    // 제품 정보 조합
    let priceIdx = 0;
    let skippedCount = 0;

    for (const [productNo, info] of productMap) {
        const price = prices[priceIdx] || 0;

        // 해당 제품의 브랜드와 사이즈를 주변 HTML에서 찾기
        const productNoIdx = html.indexOf(`product_no=${productNo}`);
        let brand: string | undefined = undefined;
        let size: string | undefined = undefined;
        let unit: string | undefined = undefined;

        if (productNoIdx !== -1) {
            // product_no 주변에서 브랜드와 사이즈 찾기 (범위 확장)
            const start = Math.max(0, productNoIdx - 200);
            const end = Math.min(html.length, productNoIdx + 3000);
            const context = html.substring(start, end);

            // 브랜드 추출 (예: "<span>브랜드</span> :</strong> <span>LX지인</span>")
            // "브랜드</span>" 이후에 나오는 첫 번째 span 태그 내용 추출
            const brandMatch = context.match(/브랜드<\/span>[\s\S]*?<span[^>]*>([A-Za-z가-힣0-9\s]+)<\/span>/i);
            if (brandMatch) {
                const extractedBrand = brandMatch[1].trim();
                // 유효한 브랜드인지 확인 (너무 짧거나 일반적인 단어 제외)
                const invalidBrands = ['항목들', '수집', '필터링', '버튼', '모두보기', '상품', '브랜드'];
                if (extractedBrand.length >= 2 && !invalidBrands.includes(extractedBrand)) {
                    brand = extractedBrand;
                }
            }

            // 사이즈 추출 (예: "사이즈 : 3Tx600x600", "106cmx15.5m (5평)")
            // 실제 HTML: <span>사이즈</span> :</strong> <span>106cmx15.5m (5평)</span>
            const sizeMatch = context.match(/사이즈<\/span>[\s\S]*?<span[^>]*>([^<]+)<\/span>/i);
            if (sizeMatch) {
                // 사이즈에서 (5평) 같은 괄호 부분 제거
                size = sizeMatch[1].replace(/\s*\([^)]+\)\s*/g, '').trim();
            }

            // 단위 추출 (예: "단위: 1롤", "단위: 1평")
            // 실제 HTML: 단위: 1롤 또는 단위: 1평
            const unitMatch = context.match(/단위\s*:\s*1?\s*(롤|평|㎡|세트|개|장|박스|M|EA)/i);
            if (unitMatch) {
                unit = unitMatch[1];
            }
        }

        // 단위가 없으면 제품명에서 추출
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
                originalUrl: `${BASE_URL}/product/detail.html?product_no=${productNo}&cate_no=${categoryId}`,
                brand,
            });
            console.log(`[Crawl] Added: ${info.name} - ${brand || 'N/A'} - ${size || 'N/A'} - ${unit} - ${price}원`);
        } else {
            skippedCount++;
        }

        priceIdx++;
    }

    if (skippedCount > 0) {
        console.log(`[Crawl] Skipped ${skippedCount} products without valid price`);
    }

    // 방법 2: 간단한 대체 패턴 (위 방법이 실패한 경우)
    if (products.length === 0) {
        console.log('[Crawl] Trying simple pattern...');

        // 간단하게 이름-가격 쌍 추출
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
                    originalUrl: `${BASE_URL}/product/list.html?cate_no=${categoryId}`,
                });
                console.log(`[Crawl] Added (simple): ${name} - ${price}원`);
            }
        }
    }

    console.log(`[Crawl] Total products found: ${products.length}`);

    // 중복 제거 (같은 이름의 제품)
    const uniqueProducts = products.filter((product, index, self) =>
        index === self.findIndex(p => p.name === product.name)
    );

    return uniqueProducts;
}

// 스트리밍 응답
export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const { categoryIds } = await request.json();

                if (!categoryIds || categoryIds.length === 0) {
                    controller.enqueue(encoder.encode(JSON.stringify({
                        type: 'error',
                        message: '카테고리를 선택해주세요.',
                    }) + '\n'));
                    controller.close();
                    return;
                }

                // 선택된 카테고리 확장 (상위 카테고리면 하위 포함)
                const expandedIds = new Set<number>();
                for (const id of categoryIds) {
                    if (PARENT_CATEGORIES[id]) {
                        PARENT_CATEGORIES[id].forEach(childId => expandedIds.add(childId));
                    } else {
                        expandedIds.add(id);
                    }
                }

                const idsToFetch = Array.from(expandedIds);
                const totalCategories = idsToFetch.length;
                let processedCategories = 0;

                for (const categoryId of idsToFetch) {
                    const categoryInfo = CATEGORY_MAP[categoryId] || { name: `카테고리 ${categoryId}` };

                    // 진행 상태 전송
                    controller.enqueue(encoder.encode(JSON.stringify({
                        type: 'progress',
                        progress: Math.round((processedCategories / totalCategories) * 100),
                        category: categoryInfo.name,
                    }) + '\n'));

                    try {
                        // 카테고리 페이지 가져오기
                        const url = `${BASE_URL}/product/list.html?cate_no=${categoryId}`;
                        const response = await fetch(url, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                            },
                        });

                        if (!response.ok) {
                            console.error(`Failed to fetch category ${categoryId}: ${response.status}`);
                            processedCategories++;
                            continue;
                        }

                        const html = await response.text();
                        const products = extractProducts(html, categoryId);

                        // 추출된 제품 전송
                        for (const product of products) {
                            controller.enqueue(encoder.encode(JSON.stringify({
                                type: 'product',
                                product: {
                                    ...product,
                                    category: categoryInfo.parent || categoryInfo.name,
                                    subCategory: categoryInfo.parent ? categoryInfo.name : undefined,
                                },
                            }) + '\n'));
                        }

                        // 요청 간 딜레이 (서버 부하 방지)
                        await new Promise(resolve => setTimeout(resolve, 500));

                    } catch (err) {
                        console.error(`Error crawling category ${categoryId}:`, err);
                    }

                    processedCategories++;
                }

                // 완료
                controller.enqueue(encoder.encode(JSON.stringify({
                    type: 'complete',
                    progress: 100,
                }) + '\n'));

            } catch (error) {
                console.error('Crawling error:', error);
                controller.enqueue(encoder.encode(JSON.stringify({
                    type: 'error',
                    message: error instanceof Error ? error.message : '크롤링 중 오류가 발생했습니다.',
                }) + '\n'));
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
