// 스타일보드 관련 타입 정의

// 공간 카테고리 (대분류)
export type SpaceCategory = 'living' | 'bedroom' | 'bathroom' | 'kitchen' | 'entrance' | 'study' | 'kids';

// 공간 카테고리 라벨
export const spaceCategoryLabels: Record<SpaceCategory, string> = {
    living: '거실',
    bedroom: '침실',
    bathroom: '욕실',
    kitchen: '주방',
    entrance: '현관',
    study: '서재',
    kids: '아이방',
};

// 한글 -> 영문 매핑
export const spaceCategoryMap: Record<string, SpaceCategory> = {
    '거실': 'living',
    'living': 'living',
    '침실': 'bedroom',
    'bedroom': 'bedroom',
    '욕실': 'bathroom',
    'bathroom': 'bathroom',
    '주방': 'kitchen',
    'kitchen': 'kitchen',
    '현관': 'entrance',
    'entrance': 'entrance',
    '서재': 'study',
    'study': 'study',
    '아이방': 'kids',
    'kids': 'kids',
};

// 하위 카테고리 (소분류) - 공통
export type SubCategory =
    | 'furniture'   // 가구
    | 'detail'      // 디테일
    | 'hallway'     // 복도
    | 'switch'      // 스위치
    | 'ceilingfan'  // 실링팬
    | 'lighting'    // 조명
    | 'other'       // 기타
    | 'tile'        // 타일
    | 'fixture'     // 수전/설비
    | 'vanity'      // 세면대
    | 'bathtub'     // 욕조
    | 'shower'      // 샤워부스
    | 'cabinet'     // 수납장
    | 'sink'        // 싱크대
    | 'appliance'   // 가전
    | 'storage'     // 수납
    | 'desk'        // 책상
    | 'shelf'       // 선반
    | 'bed'         // 침대
    | 'closet'      // 옷장
    | 'door'        // 문/도어
    | 'shoes'       // 신발장
    | 'mirror';     // 거울

// 하위 카테고리 라벨
export const subCategoryLabels: Record<string, string> = {
    // 공통
    'furniture': '가구',
    'detail': '디테일',
    'hallway': '복도',
    'switch': '스위치',
    'ceilingfan': '실링팬',
    'lighting': '조명',
    'other': '기타',
    // 욕실
    'tile': '타일',
    'fixture': '수전/설비',
    'vanity': '세면대',
    'bathtub': '욕조',
    'shower': '샤워부스',
    // 주방
    'cabinet': '수납장',
    'sink': '싱크대',
    'appliance': '가전',
    'storage': '수납',
    // 서재
    'desk': '책상',
    'shelf': '선반',
    // 침실
    'bed': '침대',
    'closet': '옷장',
    // 현관
    'door': '문/도어',
    'shoes': '신발장',
    'mirror': '거울',
    // 한글 매핑
    '가구': 'furniture',
    '디테일': 'detail',
    '복도': 'hallway',
    '스위치': 'switch',
    '실링팬': 'ceilingfan',
    '조명': 'lighting',
    '기타': 'other',
    '타일': 'tile',
    '수전': 'fixture',
    '설비': 'fixture',
    '세면대': 'vanity',
    '욕조': 'bathtub',
    '샤워부스': 'shower',
    '수납장': 'cabinet',
    '싱크대': 'sink',
    '가전': 'appliance',
    '수납': 'storage',
    '책상': 'desk',
    '선반': 'shelf',
    '침대': 'bed',
    '옷장': 'closet',
    '문': 'door',
    '도어': 'door',
    '신발장': 'shoes',
    '거울': 'mirror',
};

// 스타일보드 이미지 (2단계 구조)
export interface StyleboardImage {
    id: string;
    space_category: SpaceCategory;    // 대분류 (거실, 침실 등)
    space_label: string;              // 대분류 한글 라벨
    sub_category: string;             // 소분류 (가구, 조명 등)
    sub_label: string;                // 소분류 한글 라벨
    file_path: string;
    file_name: string;
}

// 공간별 하위 카테고리 구조
export interface SpaceSubCategories {
    space: SpaceCategory;
    space_label: string;
    sub_categories: {
        name: string;
        label: string;
        count: number;
    }[];
    total_count: number;
}

// 고객 스타일보드
export interface CustomerStyleboard {
    id: string;
    estimate_id: number;
    customer_name: string;
    customer_phone: string;
    customer_email?: string | null;
    password: string;

    // 공간별 선택 이미지 (2단계 구조 지원)
    // 형식: { "living": { "furniture": ["path1.jpg"], "lighting": ["path2.jpg"] } }
    selected_images: {
        [spaceCategory: string]: {
            [subCategory: string]: string[];
        };
    };

    link_sent: boolean;
    link_sent_at?: string | null;
    saved_at?: string | null;
    last_modified_at?: string | null;

    created_at: string;
    updated_at: string;
}

// 스타일보드 생성 요청
export interface CreateStyleboardRequest {
    estimate_id: number;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    password: string;
}

// 스타일보드 업데이트 요청
export interface UpdateStyleboardSelectionsRequest {
    selected_images: {
        [spaceCategory: string]: {
            [subCategory: string]: string[];
        };
    };
}

// 스타일보드 접근 확인 요청
export interface StyleboardAccessRequest {
    id: string;
    password: string;
}
