"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";

// 평형별 기본 면적 (㎡)
const sizeOptions = [
    { label: "24평 (59㎡)", value: 59 },
    { label: "32평 (84㎡)", value: 84 },
    { label: "43평 (110㎡)", value: 110 },
    { label: "52평 (132㎡)", value: 132 },
];

// 자재 등급
const gradeOptions = [
    { label: "Standard-A", value: "A", multiplier: 1.0, pricePerSqm: 350000 },
    { label: "Standard-B", value: "B", multiplier: 1.3, pricePerSqm: 420000 },
    { label: "Premium-S", value: "S", multiplier: 1.6, pricePerSqm: 520000 },
];

// 공사 범위
const scopeOptions = [
    { label: "부분 시공", value: "partial", multiplier: 0.5 },
    { label: "전체 시공", value: "full", multiplier: 1.0 },
    { label: "확장 시공", value: "extended", multiplier: 1.2 },
];

function formatPrice(price: number): string {
    if (price >= 100000000) {
        const 억 = Math.floor(price / 100000000);
        const 만 = Math.floor((price % 100000000) / 10000);
        if (만 > 0) {
            return `${억}억 ${만.toLocaleString()}만원`;
        }
        return `${억}억원`;
    }
    return `${Math.floor(price / 10000).toLocaleString()}만원`;
}

export default function Calculator() {
    const [size, setSize] = useState(84);
    const [grade, setGrade] = useState("B");
    const [scope, setScope] = useState("full");
    const [ceilingHeight, setCeilingHeight] = useState(2.3);

    const calculation = useMemo(() => {
        const selectedGrade = gradeOptions.find(g => g.value === grade)!;
        const selectedScope = scopeOptions.find(s => s.value === scope)!;

        // 층고 보정 계수 (2.3m 기준, 10cm당 5% 증가)
        const heightFactor = 1 + ((ceilingHeight - 2.3) / 0.1) * 0.05;

        // 기본 가격 계산
        const basePrice = size * selectedGrade.pricePerSqm;
        const scopeAdjusted = basePrice * selectedScope.multiplier;
        const heightAdjusted = scopeAdjusted * heightFactor;

        // 난이도 계수 (랜덤하지만 고정된 값 시뮬레이션)
        const difficultyFactor = 1.08;

        const finalPrice = heightAdjusted * difficultyFactor;

        return {
            basePrice,
            scopeAdjusted,
            heightAdjusted,
            finalPrice: Math.round(finalPrice),
            pricePerSqm: Math.round(finalPrice / size),
            estimatedDays: Math.ceil(30 + (size / 10) + ((ceilingHeight - 2.3) * 10)),
        };
    }, [size, grade, scope, ceilingHeight]);

    return (
        <section className="py-28 md:py-36 lg:py-44 bg-gray-900">
            <div className="w-full max-w-5xl mx-auto px-6 md:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Header */}
                    <div className="mb-16 md:mb-20 text-center">
                        <p className="text-gray-500 font-mono text-sm md:text-base mb-5 tracking-widest uppercase">
                            Interactive Calculator
                        </p>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-5 tracking-tight leading-tight">
                            실시간 견적 계산기
                        </h2>
                        <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto">
                            슬라이더를 움직여 예상 비용을 즉시 확인하세요
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
                        {/* Controls */}
                        <div className="space-y-10">
                            {/* Size Selector */}
                            <div>
                                <label className="block font-mono text-sm text-gray-400 mb-4 tracking-wide">
                                    평형 선택
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {sizeOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setSize(option.value)}
                                            className={`p-4 font-mono text-sm md:text-base font-medium transition-all duration-200 ${size === option.value
                                                    ? "bg-white text-black"
                                                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Grade Selector */}
                            <div>
                                <label className="block font-mono text-sm text-gray-400 mb-4 tracking-wide">
                                    자재 등급
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {gradeOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setGrade(option.value)}
                                            className={`p-4 font-mono text-sm md:text-base font-medium transition-all duration-200 ${grade === option.value
                                                    ? "bg-white text-black"
                                                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Scope Selector */}
                            <div>
                                <label className="block font-mono text-sm text-gray-400 mb-4 tracking-wide">
                                    공사 범위
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {scopeOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setScope(option.value)}
                                            className={`p-4 font-mono text-sm md:text-base font-medium transition-all duration-200 ${scope === option.value
                                                    ? "bg-white text-black"
                                                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Ceiling Height Slider */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <label className="font-mono text-sm text-gray-400 tracking-wide">
                                        층고
                                    </label>
                                    <span className="font-mono text-lg text-white font-bold">
                                        {ceilingHeight.toFixed(1)}m
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="2.3"
                                    max="3.0"
                                    step="0.1"
                                    value={ceilingHeight}
                                    onChange={(e) => setCeilingHeight(parseFloat(e.target.value))}
                                    className="w-full"
                                    style={{
                                        background: `linear-gradient(to right, white 0%, white ${((ceilingHeight - 2.3) / 0.7) * 100}%, #1f2937 ${((ceilingHeight - 2.3) / 0.7) * 100}%, #1f2937 100%)`
                                    }}
                                />
                                <div className="flex justify-between mt-2 text-xs text-gray-600 font-mono">
                                    <span>2.3m</span>
                                    <span>3.0m</span>
                                </div>
                            </div>
                        </div>

                        {/* Results */}
                        <div className="bg-black p-8 md:p-10 lg:p-12 border-l-4 border-white">
                            <p className="font-mono text-sm text-gray-500 mb-6 tracking-wide">예상 견적</p>

                            <motion.div
                                key={calculation.finalPrice}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <p className="font-mono text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight mb-2">
                                    {formatPrice(calculation.finalPrice)}
                                </p>
                                <p className="font-mono text-gray-500 text-base">
                                    ㎡당 {(calculation.pricePerSqm).toLocaleString()}원
                                </p>
                            </motion.div>

                            {/* Breakdown */}
                            <div className="mt-10 pt-8 border-t border-gray-800 space-y-5">
                                <div className="flex justify-between items-center">
                                    <span className="font-mono text-sm text-gray-500">기준 면적</span>
                                    <span className="font-mono text-white">{size}㎡</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-mono text-sm text-gray-500">자재 등급</span>
                                    <span className="font-mono text-white">{gradeOptions.find(g => g.value === grade)?.label}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-mono text-sm text-gray-500">공사 범위</span>
                                    <span className="font-mono text-white">{scopeOptions.find(s => s.value === scope)?.label}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-mono text-sm text-gray-500">층고 보정</span>
                                    <span className="font-mono text-white">{ceilingHeight > 2.3 ? `+${Math.round((ceilingHeight - 2.3) * 50)}%` : '기준'}</span>
                                </div>
                            </div>

                            {/* Estimated Days */}
                            <div className="mt-8 pt-8 border-t border-gray-800">
                                <div className="flex justify-between items-center">
                                    <span className="font-mono text-sm text-gray-500">예상 공기</span>
                                    <span className="font-mono text-2xl md:text-3xl font-black text-white">{calculation.estimatedDays}일</span>
                                </div>
                            </div>

                            {/* CTA */}
                            <a
                                href="#cta"
                                className="mt-10 w-full inline-flex items-center justify-center gap-3 px-8 py-5 bg-white text-black font-bold text-base md:text-lg hover:bg-gray-100 transition-all duration-200"
                            >
                                정밀 견적 받기
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <p className="mt-12 text-center font-mono text-sm text-gray-600 leading-relaxed">
                        * 본 계산기는 예상 비용을 제공하며, 실제 견적은 현장 상황에 따라 달라질 수 있습니다.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
