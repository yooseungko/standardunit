// 크롤러 모듈 인덱스
// 모든 크롤러를 한 곳에서 내보내기

export * from './types';
export * from './ohouse';
export * from './zzro';
export * from './hangel';
export * from './ianmall';

// 크롤러 레지스트리
import { ohouseCrawler, OhouseCrawler, OHOUSE_CATEGORIES, OHOUSE_PARENT_CATEGORIES } from './ohouse';
import { zzroCrawler, ZzroCrawler, ZZRO_CATEGORIES, ZZRO_PARENT_CATEGORIES } from './zzro';
import { hangelCrawler, HangelCrawler, HANGEL_CATEGORIES, HANGEL_PARENT_CATEGORIES } from './hangel';
import { ianmallCrawler, IanmallCrawler, IANMALL_CATEGORIES, IANMALL_PARENT_CATEGORIES } from './ianmall';
import type { ICrawler, CategoryInfo } from './types';

// 사용 가능한 크롤러 목록
export const CRAWLERS = {
    ohouse: ohouseCrawler,
    zzro: zzroCrawler,
    hangel: hangelCrawler,
    ianmall: ianmallCrawler,
} as const;

export type CrawlerType = keyof typeof CRAWLERS;

// 크롤러 인스턴스 가져오기
export function getCrawler(type: CrawlerType) {
    return CRAWLERS[type];
}


// 모든 크롤러 소스 정보
export const CRAWLER_SOURCES = [
    {
        id: 'ohouse' as const,
        name: '오하우스 인테리어',
        url: 'https://ohouseinterior.com',
        description: '욕실, 바닥, 타일, 전기, 문, 창호 등 인테리어 자재',
        categories: OHOUSE_CATEGORIES,
        parentCategories: OHOUSE_PARENT_CATEGORIES,
    },
    {
        id: 'zzro' as const,
        name: '자재로',
        url: 'https://zzro.kr',
        description: '목자재, 타일, 수전, 도어, 부자재, 조명, 철물 등',
        categories: ZZRO_CATEGORIES,
        parentCategories: ZZRO_PARENT_CATEGORIES,
    },
    {
        id: 'hangel' as const,
        name: '한글 중문',
        url: 'https://hangel.co.kr',
        description: '양개중문, 연동중문, 스윙중문, 미서기중문 등 중문 전문',
        categories: HANGEL_CATEGORIES,
        parentCategories: HANGEL_PARENT_CATEGORIES,
    },
    {
        id: 'ianmall' as const,
        name: '이안몰',
        url: 'https://ian-mall.kr',
        description: '싱크볼, 주방수전, 주방용품 전문',
        categories: IANMALL_CATEGORIES,
        parentCategories: IANMALL_PARENT_CATEGORIES,
    },
];

// 특정 소스의 카테고리 가져오기
export function getCategoriesBySource(source: CrawlerType): Record<string | number, CategoryInfo> {
    switch (source) {
        case 'ohouse':
            return OHOUSE_CATEGORIES;
        case 'zzro':
            return ZZRO_CATEGORIES;
        case 'hangel':
            return HANGEL_CATEGORIES;
        case 'ianmall':
            return IANMALL_CATEGORIES;
        default:
            return {};
    }
}

// 특정 소스의 상위 카테고리 가져오기
export function getParentCategoriesBySource(source: CrawlerType): Record<string | number, (string | number)[]> {
    switch (source) {
        case 'ohouse':
            return OHOUSE_PARENT_CATEGORIES;
        case 'zzro':
            return ZZRO_PARENT_CATEGORIES;
        case 'hangel':
            return HANGEL_PARENT_CATEGORIES;
        case 'ianmall':
            return IANMALL_PARENT_CATEGORIES;
        default:
            return {};
    }
}

