"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

// 폼 옵션 데이터
const formOptions = {
    demolition: {
        title: "A. 철거 범위 선택",
        options: [
            "전체 철거", "몰딩/걸레받이 철거", "도어 철거", "문틀 철거",
            "가구 전체 철거", "바닥 철거", "벽지 철거", "욕실 전체 철거",
            "욕실 부분 철거", "날개벽 철거(확장시/비내력벽)", "화단 철거"
        ]
    },
    woodwork: {
        title: "B. 목공 범위 선택",
        options: [
            "거실 천장 조성", "무몰딩", "히든도어", "스텝도어",
            "무문선", "9mm문선", "일반 도어"
        ]
    },
    plumbing: {
        title: "C. 설비 범위 선택",
        options: [
            "난방 분배기 이동(난방수 공급)", "라지에이터 철거"
        ]
    },
    extension: {
        title: "D. 확장 범위 선택",
        options: [
            "거실만 확장", "발코니(방 포함) 전체 확장"
        ]
    },
    finishing: {
        title: "E. 마감재 선택",
        description: "원하시는 바닥/벽 마감재를 선택해주세요",
        options: [
            "강마루", "원목마루", "강화마루", "장판", "타일",
            "실크벽지", "합지", "필름"
        ]
    },
    bathroom: {
        title: "F. 욕실",
        options: [
            "욕조시공", "이노솔 시공", "매립 수전 시공"
        ]
    },
    furniture: {
        title: "G. 가구",
        description: "붙박이장 가구의 재질과 수량을 선택해주세요",
        types: [
            "거실 붙박이장", "안방 붙박이장", "작은 방 드레스룸", "신발장", "팬트리장"
        ],
        grades: [
            { value: "pet", label: "기본 등급 PET" },
            { value: "zero_joint", label: "중간등급 제로조인트" },
            { value: "paint", label: "최고등급 페인트마감" }
        ]
    },
    aircon: {
        title: "H. 시스템 에어컨",
        locations: [
            { value: "living", label: "거실" },
            { value: "rooms", label: "방" }
        ]
    }
};

interface FurnitureItem {
    type: string;
    grade: string;
    quantity: number;
}

interface AirconItem {
    location: string;
    quantity: number;
}

interface FormData {
    demolition_scope: string[];
    woodwork_scope: string[];
    plumbing_scope: string[];
    extension_scope: string[];
    finishing_materials: string[];
    bathroom_options: string[];
    furniture_options: FurnitureItem[];
    aircon_options: AirconItem[];
}

interface EstimateInfo {
    id: number;
    complex_name: string;
    size: string;
    name: string;
    email: string;
}

export default function DetailedFormPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [estimateInfo, setEstimateInfo] = useState<EstimateInfo | null>(null);

    const [formData, setFormData] = useState<FormData>({
        demolition_scope: [],
        woodwork_scope: [],
        plumbing_scope: [],
        extension_scope: [],
        finishing_materials: [],
        bathroom_options: [],
        furniture_options: [],
        aircon_options: [
            { location: "living", quantity: 0 },
            { location: "rooms", quantity: 0 }
        ],
    });

    useEffect(() => {
        const fetchEstimateInfo = async () => {
            try {
                const response = await fetch(`/api/detailed-estimates?token=${token}`);
                const data = await response.json();

                if (data.success && data.estimate) {
                    setEstimateInfo(data.estimate);
                    if (data.form) {
                        // 이미 작성된 폼이 있으면
                        setIsSubmitted(true);
                    }
                } else {
                    setError("유효하지 않은 링크입니다.");
                }
            } catch (err) {
                console.error("Fetch error:", err);
                setError("데이터를 불러오는데 실패했습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchEstimateInfo();
    }, [token]);

    const toggleOption = (category: keyof FormData, option: string) => {
        setFormData(prev => {
            const current = prev[category] as string[];
            const updated = current.includes(option)
                ? current.filter(o => o !== option)
                : [...current, option];
            return { ...prev, [category]: updated };
        });
    };

    const addFurniture = (type: string) => {
        setFormData(prev => {
            const existing = prev.furniture_options.find(f => f.type === type);
            if (existing) {
                return {
                    ...prev,
                    furniture_options: prev.furniture_options.filter(f => f.type !== type)
                };
            }
            return {
                ...prev,
                furniture_options: [...prev.furniture_options, { type, grade: "pet", quantity: 1 }]
            };
        });
    };

    const updateFurniture = (type: string, field: "grade" | "quantity", value: string | number) => {
        setFormData(prev => ({
            ...prev,
            furniture_options: prev.furniture_options.map(f =>
                f.type === type ? { ...f, [field]: value } : f
            )
        }));
    };

    const updateAircon = (location: string, quantity: number) => {
        setFormData(prev => ({
            ...prev,
            aircon_options: prev.aircon_options.map(a =>
                a.location === location ? { ...a, quantity } : a
            )
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/detailed-estimates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, formData }),
            });

            const data = await response.json();

            if (data.success) {
                setIsSubmitted(true);
            } else {
                setError(data.error || "저장에 실패했습니다.");
            }
        } catch (err) {
            console.error("Submit error:", err);
            setError("제출 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white p-8 border border-gray-200 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold mb-4">오류</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <Link href="/" className="inline-block px-6 py-3 bg-black text-white font-semibold">
                        홈으로 돌아가기
                    </Link>
                </div>
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-white p-8 border border-gray-200 text-center"
                >
                    <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold mb-4">작성 완료!</h1>
                    <p className="text-gray-600 mb-2">정밀 견적 폼 작성이 완료되었습니다.</p>
                    <p className="text-gray-600 mb-6">담당자가 확인 후 연락드리겠습니다.</p>
                    <a
                        href="https://open.kakao.com/o/sLPdwe7h"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#FEE500] text-black font-semibold rounded-lg"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.82 5.31 4.54 6.72l-.92 3.42c-.08.3.25.55.52.4l4.04-2.34c.59.08 1.19.12 1.82.12 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
                        </svg>
                        카카오톡 상담하기
                    </a>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-black text-white p-6 md:p-8 mb-6"
                >
                    <h1 className="text-xl md:text-2xl font-bold mb-2">정밀 견적 요청서</h1>
                    <p className="text-gray-400 text-sm md:text-base">
                        계약 견적 시공 보장 의뢰에 따른 정밀 견적을 위한 추가 요청 사항입니다.
                    </p>
                    {estimateInfo && (
                        <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">고객명</span>
                                <p className="font-semibold">{estimateInfo.name}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">단지명</span>
                                <p className="font-semibold">{estimateInfo.complex_name}</p>
                            </div>
                        </div>
                    )}
                </motion.div>

                <div className="bg-emerald-50 border border-emerald-200 p-4 mb-6 text-center">
                    <p className="text-emerald-800 font-medium">
                        ⏱️ 선택만 하시면 되기 때문에 <strong>5분 이내</strong>에 끝납니다.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* A. 철거 범위 */}
                    <Section title={formOptions.demolition.title}>
                        <OptionGrid
                            options={formOptions.demolition.options}
                            selected={formData.demolition_scope}
                            onToggle={(opt) => toggleOption("demolition_scope", opt)}
                        />
                    </Section>

                    {/* B. 목공 범위 */}
                    <Section title={formOptions.woodwork.title}>
                        <OptionGrid
                            options={formOptions.woodwork.options}
                            selected={formData.woodwork_scope}
                            onToggle={(opt) => toggleOption("woodwork_scope", opt)}
                        />
                    </Section>

                    {/* C. 설비 범위 */}
                    <Section title={formOptions.plumbing.title}>
                        <OptionGrid
                            options={formOptions.plumbing.options}
                            selected={formData.plumbing_scope}
                            onToggle={(opt) => toggleOption("plumbing_scope", opt)}
                        />
                    </Section>

                    {/* D. 확장 범위 */}
                    <Section title={formOptions.extension.title}>
                        <OptionGrid
                            options={formOptions.extension.options}
                            selected={formData.extension_scope}
                            onToggle={(opt) => toggleOption("extension_scope", opt)}
                        />
                    </Section>

                    {/* E. 마감재 선택 */}
                    <Section title={formOptions.finishing.title} description={formOptions.finishing.description}>
                        <OptionGrid
                            options={formOptions.finishing.options}
                            selected={formData.finishing_materials}
                            onToggle={(opt) => toggleOption("finishing_materials", opt)}
                        />
                    </Section>

                    {/* F. 욕실 */}
                    <Section title={formOptions.bathroom.title}>
                        <OptionGrid
                            options={formOptions.bathroom.options}
                            selected={formData.bathroom_options}
                            onToggle={(opt) => toggleOption("bathroom_options", opt)}
                        />
                    </Section>

                    {/* G. 가구 */}
                    <Section title={formOptions.furniture.title} description={formOptions.furniture.description}>
                        <div className="space-y-4">
                            {formOptions.furniture.types.map((type) => {
                                const item = formData.furniture_options.find(f => f.type === type);
                                const isSelected = !!item;

                                return (
                                    <div key={type} className="border border-gray-200 p-4">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => addFurniture(type)}
                                                className="w-5 h-5 rounded border-gray-300"
                                            />
                                            <span className="font-medium">{type}</span>
                                        </label>

                                        {isSelected && (
                                            <div className="mt-4 pl-8 grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm text-gray-600 mb-1">등급</label>
                                                    <select
                                                        value={item.grade}
                                                        onChange={(e) => updateFurniture(type, "grade", e.target.value)}
                                                        className="w-full p-2 border border-gray-200 text-sm"
                                                    >
                                                        {formOptions.furniture.grades.map((g) => (
                                                            <option key={g.value} value={g.value}>{g.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-600 mb-1">수량</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="10"
                                                        value={item.quantity}
                                                        onChange={(e) => updateFurniture(type, "quantity", parseInt(e.target.value) || 1)}
                                                        className="w-full p-2 border border-gray-200 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Section>

                    {/* H. 시스템 에어컨 */}
                    <Section title={formOptions.aircon.title}>
                        <div className="grid grid-cols-2 gap-4">
                            {formOptions.aircon.locations.map((loc) => {
                                const item = formData.aircon_options.find(a => a.location === loc.value);
                                return (
                                    <div key={loc.value} className="border border-gray-200 p-4">
                                        <label className="block text-sm font-medium mb-2">{loc.label}</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max="10"
                                                value={item?.quantity || 0}
                                                onChange={(e) => updateAircon(loc.value, parseInt(e.target.value) || 0)}
                                                className="w-20 p-2 border border-gray-200 text-center"
                                            />
                                            <span className="text-gray-600">대</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Section>

                    {/* Submit Button */}
                    <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full py-4 bg-black text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                제출 중...
                            </span>
                        ) : (
                            "정밀 견적 요청 제출하기"
                        )}
                    </motion.button>
                </form>
            </div>
        </div>
    );
}

// Section Component
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 border border-gray-200"
        >
            <h2 className="text-lg font-bold mb-2">{title}</h2>
            {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
            {children}
        </motion.div>
    );
}

// Option Grid Component
function OptionGrid({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (opt: string) => void }) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((option) => {
                const isSelected = selected.includes(option);
                return (
                    <button
                        key={option}
                        type="button"
                        onClick={() => onToggle(option)}
                        className={`px-4 py-2 text-sm font-medium border transition-all ${isSelected
                                ? "bg-black text-white border-black"
                                : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                            }`}
                    >
                        {isSelected && <span className="mr-1">✓</span>}
                        {option}
                    </button>
                );
            })}
        </div>
    );
}
