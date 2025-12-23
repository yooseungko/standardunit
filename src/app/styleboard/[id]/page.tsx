"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { SpaceCategory, spaceCategoryLabels, CustomerStyleboard, SpaceSubCategories, StyleboardImage } from "@/types/styleboard";

interface ImageData {
    grouped: Record<SpaceCategory, Record<string, StyleboardImage[]>>;
    spaces: SpaceSubCategories[];
    total: number;
}

export default function StyleboardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    // 인증 상태
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [authError, setAuthError] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(false);

    // 데이터 상태
    const [styleboard, setStyleboard] = useState<CustomerStyleboard | null>(null);
    const [imageData, setImageData] = useState<ImageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 선택 상태 (2단계 구조)
    const [selectedImages, setSelectedImages] = useState<Record<string, Record<string, string[]>>>({});

    // 현재 선택된 탭
    const [activeSpace, setActiveSpace] = useState<SpaceCategory | null>(null);
    const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // 이미지 확대 모달
    const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

    // 스타일보드 인증
    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError(null);

        try {
            const response = await fetch(`/api/styleboard/${id}?password=${encodeURIComponent(password)}`);
            const data = await response.json();

            if (!response.ok) {
                setAuthError(data.error || '인증에 실패했습니다.');
                return;
            }

            setStyleboard(data.data);
            setIsAuthenticated(true);

            // 기존 선택 이미지 불러오기
            if (data.data.selected_images) {
                setSelectedImages(data.data.selected_images);
            }
        } catch {
            setAuthError('오류가 발생했습니다.');
        } finally {
            setAuthLoading(false);
        }
    };

    // 이미지 목록 로드
    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchImages = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/styleboard/images');
                const data = await response.json();

                if (data.success) {
                    setImageData(data.data);

                    // 이미지가 있는 첫 번째 공간으로 이동 (전체 탭으로)
                    if (data.data.spaces.length > 0) {
                        const firstSpace = data.data.spaces[0];
                        setActiveSpace(firstSpace.space);
                        setActiveSubCategory('__all__'); // 전체 탭
                    }
                }
            } catch {
                setError('이미지를 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchImages();
    }, [isAuthenticated]);

    // 이미지 선택/해제
    const toggleImageSelection = (space: SpaceCategory, subCategory: string, imagePath: string) => {
        setSelectedImages(prev => {
            const spaceSel = prev[space] || {};
            const subSel = spaceSel[subCategory] || [];
            const isSelected = subSel.includes(imagePath);

            // 공간별 전체 선택 수 계산
            const spaceTotalSelected = Object.values(spaceSel).reduce((acc, arr) => acc + arr.length, 0);

            if (isSelected) {
                // 선택 해제
                return {
                    ...prev,
                    [space]: {
                        ...spaceSel,
                        [subCategory]: subSel.filter(p => p !== imagePath),
                    },
                };
            } else {
                // 선택 추가 (공간당 최대 5장)
                if (spaceTotalSelected >= 5) {
                    alert(`${spaceCategoryLabels[space]}은(는) 전체 하위 카테고리 합쳐서 최대 5장까지 선택 가능합니다.`);
                    return prev;
                }
                return {
                    ...prev,
                    [space]: {
                        ...spaceSel,
                        [subCategory]: [...subSel, imagePath],
                    },
                };
            }
        });
        setSaved(false);
    };

    // 저장
    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await fetch(`/api/styleboard/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password,
                    selected_images: selectedImages,
                    save: true,
                }),
            });

            if (!response.ok) {
                throw new Error('저장에 실패했습니다.');
            }

            setSaved(true);
            alert('스타일보드가 저장되었습니다!');
        } catch {
            alert('저장에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setSaving(false);
        }
    };

    // 총 선택 개수
    const totalSelected = Object.values(selectedImages).reduce(
        (spaceAcc, subCategories) =>
            spaceAcc + Object.values(subCategories).reduce((subAcc, arr) => subAcc + arr.length, 0),
        0
    );

    // 특정 공간의 선택 개수
    const getSpaceSelectedCount = (space: SpaceCategory) => {
        const spaceSel = selectedImages[space] || {};
        return Object.values(spaceSel).reduce((acc, arr) => acc + arr.length, 0);
    };

    // 특정 하위 카테고리의 선택 개수
    const getSubSelectedCount = (space: SpaceCategory, sub: string) => {
        return (selectedImages[space]?.[sub] || []).length;
    };

    // 비밀번호 입력 페이지
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-8">
                        <Link href="/" className="text-2xl font-black text-white">
                            Standard Unit
                        </Link>
                        <p className="text-gray-500 text-sm mt-2">스타일보드</p>
                    </div>

                    <form onSubmit={handleAuth} className="bg-white/5 backdrop-blur-xl border border-gray-800 p-8 rounded-2xl shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">🎨</span>
                            </div>
                            <h1 className="text-xl font-bold text-white">스타일보드 열기</h1>
                            <p className="text-gray-400 text-sm mt-2">
                                관리자에게 받은 비밀번호를 입력해주세요
                            </p>
                        </div>

                        {authError && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg text-center">
                                {authError}
                            </div>
                        )}

                        <div className="mb-6">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-center text-lg tracking-widest rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 placeholder-gray-500"
                                placeholder="비밀번호"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={authLoading}
                            className={`w-full py-4 font-bold rounded-xl transition-all text-lg ${authLoading
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                                }`}
                        >
                            {authLoading ? '확인 중...' : '열기'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // 로딩 중
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-400">스타일 이미지를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    // 에러
    if (error) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-white text-gray-900 rounded-lg"
                    >
                        다시 시도
                    </button>
                </div>
            </div>
        );
    }

    const spaces = imageData?.spaces || [];
    const currentSpaceInfo = spaces.find(s => s.space === activeSpace);
    const currentSubCategories = currentSpaceInfo?.sub_categories || [];

    // 전체 탭일 경우 해당 공간의 모든 이미지, 아니면 해당 서브 카테고리 이미지
    const activeImages = activeSpace && activeSubCategory
        ? activeSubCategory === '__all__'
            ? Object.values(imageData?.grouped[activeSpace] || {}).flat()
            : (imageData?.grouped[activeSpace]?.[activeSubCategory] || [])
        : [];

    // 전체 탭의 총 이미지 수 계산
    const allImagesCount = activeSpace
        ? Object.values(imageData?.grouped[activeSpace] || {}).flat().length
        : 0;

    return (
        <div className="min-h-screen bg-gray-950 pb-24">
            {/* 헤더 - 모바일 최적화 */}
            <header className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur-xl border-b border-white/10">
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Link href="/" className="text-lg font-black text-white">
                                Standard Unit
                            </Link>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {styleboard?.customer_name}님의 스타일보드
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">
                                {totalSelected}장 선택
                            </span>
                        </div>
                    </div>
                </div>

                {/* 공간 탭 (1단계) - 수평 스크롤 */}
                <div className="overflow-x-auto scrollbar-hide border-b border-white/5">
                    <div className="flex px-4 pb-3 gap-2 min-w-max">
                        {spaces.map(({ space, space_label }) => {
                            const selectedCount = getSpaceSelectedCount(space);
                            const isActive = activeSpace === space;

                            return (
                                <button
                                    key={space}
                                    onClick={() => {
                                        setActiveSpace(space);
                                        setActiveSubCategory('__all__'); // 전체 탭으로
                                    }}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${isActive
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    {space_label}
                                    {selectedCount > 0 && (
                                        <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${isActive ? 'bg-white/20' : 'bg-purple-500/30 text-purple-400'
                                            }`}>
                                            {selectedCount}/5
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 하위 카테고리 탭 (2단계) */}
                {currentSubCategories.length > 0 && (
                    <div className="overflow-x-auto scrollbar-hide bg-white/5">
                        <div className="flex px-4 py-2 gap-2 min-w-max">
                            {/* 전체 탭 */}
                            <button
                                onClick={() => setActiveSubCategory('__all__')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${activeSubCategory === '__all__'
                                    ? 'bg-white text-gray-900'
                                    : 'bg-transparent text-gray-400 hover:text-white'
                                    }`}
                            >
                                전체
                                <span className="ml-1 text-gray-500">({allImagesCount})</span>
                            </button>
                            {currentSubCategories.map(({ name, label, count }) => {
                                const selectedCount = activeSpace ? getSubSelectedCount(activeSpace, name) : 0;
                                const isActive = activeSubCategory === name;

                                return (
                                    <button
                                        key={name}
                                        onClick={() => setActiveSubCategory(name)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${isActive
                                            ? 'bg-white text-gray-900'
                                            : 'bg-transparent text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        {label}
                                        <span className="ml-1 text-gray-500">({count})</span>
                                        {selectedCount > 0 && (
                                            <span className={`ml-1 px-1 py-0.5 text-xs rounded ${isActive ? 'bg-purple-500 text-white' : 'bg-purple-500/30 text-purple-400'
                                                }`}>
                                                {selectedCount}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </header>

            {/* 안내 메시지 */}
            <div className="px-4 py-3 bg-purple-500/10 border-b border-purple-500/20">
                <p className="text-sm text-purple-300 text-center">
                    각 공간별로 마음에 드는 스타일을 <strong>최대 5장</strong>까지 선택해주세요
                </p>
            </div>

            {/* 이미지 그리드 */}
            <main className="p-4">
                {!activeSpace || !activeSubCategory ? (
                    <div className="text-center py-12 text-gray-500">
                        <p>공간을 선택해주세요.</p>
                    </div>
                ) : activeImages.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <p>이미지가 없습니다.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {activeImages.map((image, idx) => {
                            // 전체 탭일 경우 해당 이미지의 실제 서브 카테고리에서 선택 상태 확인
                            const imageSubCategory = image.sub_category || activeSubCategory;
                            const isSelected = selectedImages[activeSpace]?.[imageSubCategory]?.includes(image.file_path);
                            const allSpaceSelections = selectedImages[activeSpace] || {};
                            let selectionOrder = 0;
                            if (isSelected) {
                                // 공간 전체에서 선택 순서 계산
                                let order = 0;
                                for (const [sub, paths] of Object.entries(allSpaceSelections)) {
                                    for (const p of paths) {
                                        order++;
                                        if (p === image.file_path) {
                                            selectionOrder = order;
                                            break;
                                        }
                                    }
                                    if (selectionOrder > 0) break;
                                }
                            }

                            return (
                                <div key={idx} className="relative group">
                                    <div
                                        onClick={() => toggleImageSelection(activeSpace, imageSubCategory, image.file_path)}
                                        className={`relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer transition-all ${isSelected
                                            ? 'ring-4 ring-purple-500 ring-offset-2 ring-offset-gray-950'
                                            : 'hover:opacity-90'
                                            }`}
                                    >
                                        <img
                                            src={image.file_path}
                                            alt={`${image.space_label} ${image.sub_label} ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                        />

                                        {/* 선택 인디케이터 */}
                                        {isSelected && (
                                            <div className="absolute top-2 left-2 w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
                                                {selectionOrder}
                                            </div>
                                        )}

                                        {/* 호버/선택 오버레이 */}
                                        <div className={`absolute inset-0 transition-all ${isSelected
                                            ? 'bg-purple-500/10'
                                            : 'bg-transparent group-hover:bg-black/20'
                                            }`} />
                                    </div>

                                    {/* 확대 버튼 - 항상 희미하게 표시, 호버 시 진하게 */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEnlargedImage(image.file_path);
                                        }}
                                        className="absolute bottom-2 right-2 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white/60 opacity-60 hover:opacity-100 hover:text-white hover:bg-black/70 transition-all"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                        </svg>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* 하단 고정 저장 버튼 */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950/95 backdrop-blur-xl border-t border-white/10">
                <div className="max-w-lg mx-auto">
                    <button
                        onClick={handleSave}
                        disabled={saving || totalSelected === 0}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${saving || totalSelected === 0
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : saved
                                ? 'bg-emerald-500 text-white'
                                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 active:scale-98'
                            }`}
                    >
                        {saving ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                                저장 중...
                            </span>
                        ) : saved ? (
                            <span className="flex items-center justify-center gap-2">
                                ✓ 저장 완료
                            </span>
                        ) : (
                            <span>스타일보드 저장 ({totalSelected}장)</span>
                        )}
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-2">
                        저장 후에도 언제든 수정할 수 있습니다
                    </p>
                </div>
            </div>

            {/* 이미지 확대 모달 */}
            {enlargedImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
                    onClick={() => setEnlargedImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
                        onClick={() => setEnlargedImage(null)}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <img
                        src={enlargedImage}
                        alt="확대 이미지"
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
