"use client";

import { useState, useEffect } from "react";

interface CrawledProduct {
    id?: string;
    category: string;
    subCategory?: string;
    name: string;
    price: number;
    unit: string;
    size?: string;
    originalUrl: string;
    imageUrl?: string;
    description?: string;
    brand?: string;
    source?: string;
}

// 크롤러 소스 타입
type CrawlerSource = "ohouse" | "zzro" | "hangel" | "ianmall";

// 카테고리 정보
interface CategoryInfo {
    name: string;
    parent?: string;
    slug?: string;
    productCount?: number;
}

// 소스별 카테고리 그룹
interface CategoryGroup {
    groupName: string;
    categories: Array<{
        id: string | number;
        name: string;
        productCount?: number;
        children?: Array<{ id: string | number; name: string; productCount?: number }>;
    }>;
}

// 오하우스 카테고리
const OHOUSE_CATEGORY_GROUPS: CategoryGroup[] = [
    {
        groupName: "마감재",
        categories: [
            {
                id: 108, name: "벽지", productCount: 36, children: [
                    { id: 109, name: "실크", productCount: 32 },
                    { id: 112, name: "합지", productCount: 4 },
                ]
            },
            {
                id: 52, name: "마루", productCount: 16, children: [
                    { id: 79, name: "강마루", productCount: 13 },
                    { id: 84, name: "원목마루", productCount: 1 },
                    { id: 87, name: "SPC마루", productCount: 2 },
                ]
            },
            {
                id: 88, name: "장판", productCount: 5, children: [
                    { id: 89, name: "모노륨 장판", productCount: 5 },
                ]
            },
            { id: 92, name: "데코타일", productCount: 4 },
            {
                id: 91, name: "타일", productCount: 7, children: [
                    { id: 93, name: "도기질", productCount: 2 },
                    { id: 106, name: "포세린", productCount: 5 },
                ]
            },
        ]
    },
    {
        groupName: "욕실",
        categories: [
            {
                id: 50, name: "욕실 제품", productCount: 49, children: [
                    { id: 126, name: "양변기/소변기", productCount: 8 },
                    { id: 137, name: "세면대/하부장", productCount: 8 },
                    { id: 148, name: "수전/샤워기", productCount: 13 },
                    { id: 163, name: "욕실장/거울", productCount: 3 },
                    { id: 178, name: "악세사리", productCount: 14 },
                    { id: 242, name: "환풍기/기타", productCount: 3 },
                ]
            },
        ]
    },
    {
        groupName: "주방",
        categories: [
            {
                id: 62, name: "주방제품", productCount: 7, children: [
                    { id: 233, name: "싱크수전", productCount: 7 },
                ]
            },
        ]
    },
    {
        groupName: "목공/문",
        categories: [
            {
                id: 55, name: "목자재/철물", productCount: 16, children: [
                    { id: 69, name: "목자재", productCount: 11 },
                    { id: 74, name: "단열재", productCount: 2 },
                    { id: 76, name: "철물", productCount: 3 },
                ]
            },
            { id: 56, name: "도어", productCount: 6 },
            { id: 225, name: "중문", productCount: 3 },
        ]
    },
    {
        groupName: "창호",
        categories: [
            { id: 54, name: "창호", productCount: 24 },
        ]
    },
    {
        groupName: "전기/조명",
        categories: [
            {
                id: 64, name: "조명/전기", productCount: 49, children: [
                    { id: 244, name: "조명", productCount: 17 },
                    { id: 246, name: "콘센트/스위치", productCount: 14 },
                    { id: 248, name: "감지기/스피커", productCount: 18 },
                ]
            },
        ]
    },
    {
        groupName: "설비/에어컨",
        categories: [
            {
                id: 209, name: "설비/철거", productCount: 9, children: [
                    { id: 210, name: "설비시공", productCount: 5 },
                    { id: 213, name: "부분철거", productCount: 4 },
                ]
            },
            { id: 53, name: "시스템에어컨", productCount: 10 },
        ]
    },
    {
        groupName: "가구",
        categories: [
            { id: 59, name: "제작가구", productCount: 15 },
        ]
    },
];

// 자재로 카테고리 - 실제 zzro.kr 사이트 구조 반영
const ZZRO_CATEGORY_GROUPS: CategoryGroup[] = [
    {
        groupName: "목자재",
        categories: [
            {
                id: "wooden", name: "목자재", children: [
                    { id: "wooden-all", name: "전체" },
                    { id: "wooden-scantling", name: "각재" },
                    { id: "wooden-plywood", name: "합판" },
                    { id: "wooden-mdf", name: "MDF" },
                    { id: "wooden-molding", name: "몰딩" },
                ]
            },
        ]
    },
    {
        groupName: "타일",
        categories: [
            {
                id: "tile", name: "타일", children: [
                    { id: "tile-all", name: "전체" },
                    { id: "tile-porcelain", name: "포세린" },
                    { id: "tile-ceramic", name: "도기질" },
                ]
            },
        ]
    },
    {
        groupName: "수전",
        categories: [
            {
                id: "faucet", name: "수전", children: [
                    { id: "faucet-all", name: "전체" },
                    { id: "faucet-kitchen", name: "주방수전" },
                    { id: "faucet-bath", name: "욕실수전" },
                ]
            },
        ]
    },
    {
        groupName: "도어/철물",
        categories: [
            {
                id: "door", name: "도어", children: [
                    { id: "door-all", name: "전체" },
                    { id: "door-handle", name: "손잡이" },
                    { id: "door-rail", name: "경첩/레일" },
                ]
            },
        ]
    },
    {
        groupName: "부자재",
        categories: [
            {
                id: "subsidiary", name: "부자재", children: [
                    { id: "subsidiary-all", name: "전체" },
                    { id: "subsidiary-adhesive", name: "접착제/본드" },
                    { id: "subsidiary-hardware", name: "기타철물" },
                    { id: "subsidiary-switch", name: "스위치" },
                    { id: "subsidiary-concent", name: "콘센트" },
                    { id: "subsidiary-tacker", name: "타카핀" },
                    { id: "subsidiary-access", name: "점검구" },
                    { id: "subsidiary-corner", name: "코너비드" },
                    { id: "subsidiary-trench", name: "육가/유강" },
                ]
            },
        ]
    },
    {
        groupName: "조명",
        categories: [
            {
                id: "lights", name: "조명", children: [
                    { id: "lights-all", name: "전체" },
                    { id: "lights-recessed", name: "매입등" },
                    { id: "lights-ceiling", name: "천정등" },
                    { id: "lights-direct", name: "직부등" },
                    { id: "lights-pendant", name: "펜던트등" },
                ]
            },
        ]
    },
    {
        groupName: "도기",
        categories: [
            {
                id: "sanitaryware", name: "도기", children: [
                    { id: "sanitaryware-all", name: "전체" },
                    { id: "sanitaryware-americanstandard", name: "아메리칸스탠다드" },
                    { id: "sanitaryware-dk", name: "DK" },
                    { id: "sanitaryware-lauche", name: "라우체" },
                ]
            },
        ]
    },
    {
        groupName: "경량자재",
        categories: [
            {
                id: "light", name: "경량자재", children: [
                    { id: "light-all", name: "전체" },
                ]
            },
        ]
    },
];

// 한글 중문 카테고리
const HANGEL_CATEGORY_GROUPS: CategoryGroup[] = [
    {
        groupName: "중문",
        categories: [
            {
                id: 84, name: "중문 전체", children: [
                    { id: 86, name: "양개중문" },
                    { id: 1396, name: "슬림 여닫이 중문" },
                    { id: 1205, name: "스윙 중문" },
                    { id: 1398, name: "연동중문" },
                    { id: 1291, name: "3연동 중문" },
                    { id: 1289, name: "4연동 중문" },
                    { id: 1290, name: "6연동 중문" },
                    { id: 89, name: "원슬라이딩 중문" },
                    { id: 87, name: "미서기 중문" },
                    { id: 1399, name: "간살중문" },
                    { id: 1206, name: "프레임리스 중문" },
                    { id: 691, name: "중문+파티션" },
                ]
            },
        ]
    },
    {
        groupName: "필름",
        categories: [
            { id: 173, name: "예림 필름" },
        ]
    },
];


// 크롤러 소스 정보
const CRAWLER_SOURCES = [
    {
        id: "ohouse" as const,
        name: "오하우스 인테리어",
        url: "https://ohouseinterior.com",
        description: "욕실, 바닥, 타일, 전기, 문, 창호 등 인테리어 자재",
        icon: "🏠",
        categoryGroups: OHOUSE_CATEGORY_GROUPS,
    },
    {
        id: "zzro" as const,
        name: "자재로",
        url: "https://zzro.kr",
        description: "목자재, 타일, 수전, 도어, 부자재, 조명, 철물 등",
        icon: "🔧",
        categoryGroups: ZZRO_CATEGORY_GROUPS,
    },
    {
        id: "hangel" as const,
        name: "한글 중문",
        url: "https://hangel.co.kr",
        description: "양개중문, 연동중문, 스윙중문, 미서기중문 등 중문 전문",
        icon: "🚪",
        categoryGroups: HANGEL_CATEGORY_GROUPS,
    },
    {
        id: "ianmall" as const,
        name: "이안몰",
        url: "https://ian-mall.kr",
        description: "싱크볼, 주방수전, 주방용품 전문",
        icon: "🚰",
        categoryGroups: [
            {
                groupName: "주방",
                categories: [
                    { id: 993, name: "싱크볼", productCount: 0, children: [] },
                ]
            },
        ],
    },
];

export default function PriceCrawler() {
    const [selectedSource, setSelectedSource] = useState<CrawlerSource>("ohouse");
    const [crawling, setCrawling] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentCategory, setCurrentCategory] = useState<string>("");
    const [products, setProducts] = useState<CrawledProduct[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategories, setSelectedCategories] = useState<(string | number)[]>([]);
    const [importing, setImporting] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());

    // 소스가 변경되면 선택된 카테고리 초기화
    useEffect(() => {
        setSelectedCategories([]);
        setProducts([]);
        setSelectedProducts(new Set());
    }, [selectedSource]);

    // 현재 소스의 카테고리 그룹 가져오기
    const currentCategoryGroups = CRAWLER_SOURCES.find(s => s.id === selectedSource)?.categoryGroups || [];

    // 제품 선택/해제
    const toggleProductSelection = (idx: number) => {
        setSelectedProducts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(idx)) {
                newSet.delete(idx);
            } else {
                newSet.add(idx);
            }
            return newSet;
        });
    };

    // 전체 제품 선택/해제
    const toggleAllProducts = () => {
        if (selectedProducts.size === products.length) {
            setSelectedProducts(new Set());
        } else {
            setSelectedProducts(new Set(products.map((_, idx) => idx)));
        }
    };

    // 전체 카테고리 선택/해제
    const toggleAllCategories = () => {
        const allIds = currentCategoryGroups.flatMap(g =>
            g.categories.flatMap(cat =>
                cat.children
                    ? cat.children.map(c => c.id)
                    : [cat.id]
            )
        );

        if (selectedCategories.length === allIds.length) {
            setSelectedCategories([]);
        } else {
            setSelectedCategories(allIds);
        }
    };

    // 카테고리 선택
    const toggleCategory = (id: string | number) => {
        setSelectedCategories(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    // 크롤링 시작
    const startCrawling = async () => {
        if (selectedCategories.length === 0) {
            setError("크롤링할 카테고리를 선택해주세요.");
            return;
        }

        setCrawling(true);
        setError(null);
        setProducts([]);
        setProgress(0);

        try {
            const response = await fetch("/api/admin/crawl-prices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source: selectedSource,
                    categoryIds: selectedCategories,
                }),
            });

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error("응답을 읽을 수 없습니다.");
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n").filter(Boolean);

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);

                        if (data.type === "progress") {
                            setProgress(data.progress);
                            setCurrentCategory(data.category);
                        } else if (data.type === "product") {
                            setProducts(prev => [...prev, data.product]);
                        } else if (data.type === "error") {
                            setError(data.message);
                        } else if (data.type === "complete") {
                            setProgress(100);
                        }
                    } catch {
                        // JSON 파싱 실패 무시
                    }
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "크롤링 중 오류가 발생했습니다.");
        } finally {
            setCrawling(false);
        }
    };

    // 표준단가에 추가
    const importToStandardPricing = async () => {
        const selectedProductList = products.filter((_, idx) => selectedProducts.has(idx));

        if (selectedProductList.length === 0) {
            setError("추가할 제품을 선택해주세요.");
            return;
        }

        setImporting(true);
        setError(null);

        try {
            const response = await fetch("/api/admin/import-crawled-prices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ products: selectedProductList }),
            });

            const result = await response.json();

            if (result.success) {
                alert(`✅ ${result.imported}개 제품이 표준단가에 추가되었습니다!`);
                // 선택된 제품들을 목록에서 제거
                setProducts(prev => prev.filter((_, idx) => !selectedProducts.has(idx)));
                setSelectedProducts(new Set());
            } else {
                setError(result.error || "추가 실패");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "추가 중 오류가 발생했습니다.");
        } finally {
            setImporting(false);
        }
    };

    // 금액 포맷
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("ko-KR").format(price);
    };

    const currentSourceInfo = CRAWLER_SOURCES.find(s => s.id === selectedSource);

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">🕷️ 건자재 단가 크롤러</h2>
                    <p className="text-gray-400 mt-1">
                        여러 건자재 사이트에서 가격을 수집합니다
                    </p>
                </div>
                <div className="flex gap-3">
                    {products.length > 0 && (
                        <button
                            onClick={importToStandardPricing}
                            disabled={importing || selectedProducts.size === 0}
                            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {importing ? (
                                <>
                                    <span className="animate-spin">⏳</span>
                                    추가 중...
                                </>
                            ) : (
                                <>
                                    💾 표준단가에 추가 ({selectedProducts.size}개)
                                </>
                            )}
                        </button>
                    )}
                    <button
                        onClick={startCrawling}
                        disabled={crawling}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {crawling ? (
                            <>
                                <span className="animate-spin">🔄</span>
                                크롤링 중...
                            </>
                        ) : (
                            <>
                                🚀 크롤링 시작
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* 크롤러 소스 선택 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-white font-medium mb-4">📦 크롤링 소스 선택</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {CRAWLER_SOURCES.map(source => (
                        <button
                            key={source.id}
                            onClick={() => setSelectedSource(source.id)}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${selectedSource === source.id
                                ? "border-blue-500 bg-blue-500/10"
                                : "border-white/10 hover:border-white/30"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{source.icon}</span>
                                <div>
                                    <span className={`font-medium ${selectedSource === source.id ? "text-blue-400" : "text-white"}`}>
                                        {source.name}
                                    </span>
                                    <p className="text-gray-400 text-sm mt-1">{source.description}</p>
                                    <p className="text-gray-500 text-xs mt-1">{source.url}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* 에러 */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                    {error}
                </div>
            )}

            {/* 진행 상태 */}
            {crawling && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-blue-400">
                            {currentSourceInfo?.icon} {currentCategory} 크롤링 중...
                        </span>
                        <span className="text-white font-bold">{progress}%</span>
                    </div>
                    <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 카테고리 선택 */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-medium">📁 카테고리 선택</h3>
                        <button
                            onClick={toggleAllCategories}
                            className="text-sm text-blue-400 hover:text-blue-300"
                        >
                            {selectedCategories.length > 0 ? "전체 해제" : "전체 선택"}
                        </button>
                    </div>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                        {currentCategoryGroups.map(group => (
                            <div key={group.groupName} className="border border-white/10 rounded-lg overflow-hidden">
                                {/* 그룹 헤더 */}
                                <div className="bg-white/10 px-3 py-2">
                                    <span className="text-sm font-bold text-blue-400">{group.groupName}</span>
                                </div>
                                {/* 그룹 내 카테고리들 */}
                                <div className="p-2 space-y-1">
                                    {group.categories.map(category => (
                                        <div key={String(category.id)}>
                                            <label className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCategories.includes(category.id)}
                                                    onChange={() => toggleCategory(category.id)}
                                                    className="rounded border-gray-600"
                                                />
                                                <span className="text-white flex-1 text-sm">{category.name}</span>
                                                {category.productCount && (
                                                    <span className="text-gray-400 text-xs">{category.productCount}</span>
                                                )}
                                            </label>
                                            {category.children && (
                                                <div className="ml-6 space-y-1">
                                                    {category.children.map(child => (
                                                        <label
                                                            key={String(child.id)}
                                                            className="flex items-center gap-2 p-1.5 hover:bg-white/5 rounded-lg cursor-pointer"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedCategories.includes(child.id)}
                                                                onChange={() => toggleCategory(child.id)}
                                                                className="rounded border-gray-600"
                                                            />
                                                            <span className="text-gray-300 flex-1 text-sm">{child.name}</span>
                                                            {child.productCount && (
                                                                <span className="text-gray-500 text-xs">{child.productCount}</span>
                                                            )}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 수집된 제품 목록 */}
                <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <h3 className="text-white font-medium">📋 수집된 제품 ({products.length}개)</h3>
                        {products.length > 0 && (
                            <button
                                onClick={() => setProducts([])}
                                className="text-sm text-red-400 hover:text-red-300"
                            >
                                전체 삭제
                            </button>
                        )}
                    </div>
                    <div className="max-h-[500px] overflow-y-auto">
                        {products.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <p className="text-4xl mb-4">🕷️</p>
                                <p>소스와 카테고리를 선택하고 크롤링을 시작하세요</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-white/5 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-400 w-12">
                                            <input
                                                type="checkbox"
                                                checked={selectedProducts.size === products.length && products.length > 0}
                                                onChange={toggleAllProducts}
                                                className="w-4 h-4 rounded"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">소스</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">카테고리</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">제품명</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">가격</th>
                                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">단위</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {products.map((product, idx) => (
                                        <tr
                                            key={idx}
                                            className={`hover:bg-white/5 cursor-pointer ${selectedProducts.has(idx) ? 'bg-blue-500/10' : ''}`}
                                            onClick={() => toggleProductSelection(idx)}
                                        >
                                            <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProducts.has(idx)}
                                                    onChange={() => toggleProductSelection(idx)}
                                                    className="w-4 h-4 rounded"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-1 rounded ${product.source === 'ohouse'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : product.source === 'hangel'
                                                        ? 'bg-purple-500/20 text-purple-400'
                                                        : product.source === 'ianmall'
                                                            ? 'bg-orange-500/20 text-orange-400'
                                                            : 'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                    {product.source === 'ohouse' ? '오하우스' : product.source === 'hangel' ? '한글중문' : product.source === 'ianmall' ? '이안몰' : '자재로'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <span className="text-gray-400 text-xs">{product.category}</span>
                                                    {product.subCategory && (
                                                        <span className="text-gray-500 text-xs"> / {product.subCategory}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-white">
                                                {product.name}
                                                {product.brand && (
                                                    <span className="text-gray-400 text-xs ml-2">({product.brand})</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right text-blue-400 font-medium">
                                                ₩{formatPrice(product.price)}
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-400">
                                                {product.unit}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
