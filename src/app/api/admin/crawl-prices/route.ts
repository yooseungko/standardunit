// 통합 가격 크롤러 API
// 여러 소스(오하우스, 자재로, 한글중문, 이안몰, 에스와이 등)에서 제품 정보를 크롤링합니다.

import { NextRequest } from 'next/server';
import {
    CRAWLERS,
    CrawlerType,
    CRAWLER_SOURCES,
    ohouseCrawler,
    zzroCrawler,
    hangelCrawler,
    ianmallCrawler,
    symembershipCrawler,
    CrawlProgress,
} from '@/lib/crawlers';

// 스트리밍 응답
export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const body = await request.json();
                const { source, categoryIds } = body;

                // 소스 검증
                if (!source || !['ohouse', 'zzro', 'hangel', 'ianmall', 'symembership'].includes(source)) {
                    controller.enqueue(encoder.encode(JSON.stringify({
                        type: 'error',
                        message: '크롤링 소스를 선택해주세요. (ohouse, zzro, hangel, ianmall, symembership)',
                    }) + '\n'));
                    controller.close();
                    return;
                }

                if (!categoryIds || categoryIds.length === 0) {
                    controller.enqueue(encoder.encode(JSON.stringify({
                        type: 'error',
                        message: '카테고리를 선택해주세요.',
                    }) + '\n'));
                    controller.close();
                    return;
                }

                // 소스별 크롤링 실행
                if (source === 'ohouse') {
                    // 오하우스 크롤링
                    const generator = ohouseCrawler.crawlAll(categoryIds);

                    for await (const progress of generator) {
                        controller.enqueue(encoder.encode(JSON.stringify(progress) + '\n'));
                    }
                } else if (source === 'zzro') {
                    // 자재로 크롤링
                    const generator = zzroCrawler.crawlAll(categoryIds);

                    for await (const progress of generator) {
                        controller.enqueue(encoder.encode(JSON.stringify(progress) + '\n'));
                    }
                } else if (source === 'hangel') {
                    // 한글 중문 크롤링
                    const generator = hangelCrawler.crawlAll(categoryIds);

                    for await (const progress of generator) {
                        controller.enqueue(encoder.encode(JSON.stringify(progress) + '\n'));
                    }
                } else if (source === 'ianmall') {
                    // 이안몰 크롤링
                    const generator = ianmallCrawler.crawlAll(categoryIds);

                    for await (const progress of generator) {
                        controller.enqueue(encoder.encode(JSON.stringify(progress) + '\n'));
                    }
                } else if (source === 'symembership') {
                    // 에스와이 크롤링
                    const generator = symembershipCrawler.crawlAll(categoryIds);

                    for await (const progress of generator) {
                        controller.enqueue(encoder.encode(JSON.stringify(progress) + '\n'));
                    }
                }

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

// 크롤러 소스 및 카테고리 정보 조회
export async function GET() {
    return Response.json({
        success: true,
        sources: CRAWLER_SOURCES,
    });
}

