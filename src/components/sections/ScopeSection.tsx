"use client";

import { motion } from "framer-motion";

const includedItems = [
    { category: "바닥", items: ["마루", "타일", "장판"] },
    { category: "벽면", items: ["도배", "페인트"] },
    { category: "천장", items: ["몰딩", "우물천장", "조명등 설치"] },
    { category: "주방", items: ["싱크대", "상부장", "하부장 교체"] },
    { category: "욕실", items: ["위생도기", "타일", "천장재"] },
    { category: "목공", items: ["문짝 교체", "걸레받이", "붙박이장"] },
    { category: "전기", items: ["콘센트/스위치", "조명 배선"] },
    { category: "철거", items: ["기존 자재 철거", "폐기물 처리"] },
];

const optionalItems = [
    { name: "샷시 (창호)", description: "기존 창호 교체" },
    { name: "발코니 확장", description: "발코니 확장 공사" },
    { name: "시스템 에어컨", description: "설치 및 이전" },
    { name: "가전/가구", description: "빌트인 가전, 맞춤 가구" },
];

export default function ScopeSection() {
    return (
        <section className="py-28 md:py-36 lg:py-44 bg-white">
            <div className="w-full max-w-5xl mx-auto px-6 md:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Header */}
                    <div className="mb-16 md:mb-24">
                        <p className="text-gray-400 font-mono text-sm md:text-base mb-5 tracking-widest uppercase">
                            Estimate Scope
                        </p>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-6 tracking-tight leading-tight">
                            견적에 포함되는 범위
                        </h2>
                        <p className="text-lg md:text-xl text-gray-500 leading-relaxed max-w-2xl">
                            Standard Unit의 표준 견적에는 아래 항목이 모두 포함됩니다.
                            <br className="hidden md:block" />
                            별도 옵션은 추가 비용이 발생합니다.
                        </p>
                    </div>

                    {/* 기본 포함 항목 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="mb-16 md:mb-20"
                    >
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-8 h-8 bg-black text-white flex items-center justify-center text-lg">
                                ✓
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold">기본 포함 항목</h3>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            {includedItems.map((category, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.3, delay: 0.1 * index }}
                                    className="p-6 bg-gray-50 border border-gray-100"
                                >
                                    <h4 className="font-bold text-lg mb-3">{category.category}</h4>
                                    <ul className="space-y-1">
                                        {category.items.map((item, itemIndex) => (
                                            <li
                                                key={itemIndex}
                                                className="text-gray-600 text-sm flex items-center gap-2"
                                            >
                                                <span className="text-black">•</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* 별도 옵션 항목 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-8 h-8 bg-gray-200 text-gray-600 flex items-center justify-center text-lg">
                                +
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-gray-600">별도 옵션</h3>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            {optionalItems.map((item, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.3, delay: 0.1 * index }}
                                    className="p-6 border border-dashed border-gray-300 bg-white"
                                >
                                    <h4 className="font-bold text-gray-600 mb-2">{item.name}</h4>
                                    <p className="text-gray-400 text-sm">{item.description}</p>
                                </motion.div>
                            ))}
                        </div>

                        <p className="mt-8 text-gray-400 text-sm text-center">
                            * 별도 옵션은 현장 상담 후 정확한 견적을 안내드립니다
                        </p>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
