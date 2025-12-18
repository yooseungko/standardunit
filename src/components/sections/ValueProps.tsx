"use client";

import { motion } from "framer-motion";

const valueProps = [
    {
        number: "01",
        title: "투명한 단가 시스템",
        content: "㎡당 바닥재 12만원, 벽체 철거 ㎡당 8만원.\n모든 항목이 단가 × 수량으로 계산됩니다.",
    },
    {
        number: "02",
        title: "표준 자재 데이터베이스",
        content: "'고급 타일'이 아닙니다.\n600×1200 포세린 타일, 흡수율 0.5% 이하, KS 1급 인증 자재입니다.",
    },
    {
        number: "03",
        title: "견적 비교 프로토콜",
        content: "다른 업체 견적서를 올리면, Standard Unit 기준으로\n항목별 단가를 비교 분석해드립니다.",
    },
];

export default function ValueProps() {
    return (
        <section className="py-28 md:py-36 lg:py-44 bg-white">
            <div className="w-full max-w-5xl mx-auto px-6 md:px-12">
                <div className="space-y-20 md:space-y-28 lg:space-y-32">
                    {valueProps.map((prop, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="grid md:grid-cols-12 gap-8 md:gap-12 items-start"
                        >
                            {/* Number */}
                            <div className="md:col-span-2">
                                <span className="font-mono text-6xl md:text-7xl lg:text-8xl font-black text-gray-100 tracking-tighter">
                                    {prop.number}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="md:col-span-10 space-y-6">
                                <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
                                    {prop.title}
                                </h3>
                                <p className="text-lg md:text-xl lg:text-2xl text-gray-600 leading-relaxed whitespace-pre-line font-mono tracking-tight">
                                    {prop.content}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
