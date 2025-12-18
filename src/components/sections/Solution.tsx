"use client";

import { motion } from "framer-motion";

const solutions = [
    {
        number: "01",
        title: "평면 분류",
        description: "어떤 평면 타입인지",
        detail: "16가지 표준 분류",
    },
    {
        number: "02",
        title: "자재 등급",
        description: "어떤 자재 등급이 필요한지",
        detail: "S/A/B/C 명확한 기준",
    },
    {
        number: "03",
        title: "적정 가격",
        description: "얼마가 적정한지",
        detail: "㎡당 단가 × 항목별 투명 공개",
    },
];

export default function Solution() {
    return (
        <section className="py-28 md:py-36 lg:py-44 bg-gray-50">
            <div className="w-full max-w-6xl mx-auto px-6 md:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16 md:mb-24"
                >
                    <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight leading-tight">
                        Standard Unit은 견적을 표준화합니다
                    </h2>
                </motion.div>

                {/* 3-column grid */}
                <div className="grid md:grid-cols-3 gap-6 md:gap-8 lg:gap-10">
                    {solutions.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: index * 0.15 }}
                            className="bg-white p-8 md:p-10 lg:p-12 border-l-4 border-black relative"
                        >
                            {/* Background number */}
                            <span className="absolute top-6 right-6 font-mono text-6xl md:text-7xl lg:text-8xl font-black text-gray-100 select-none leading-none">
                                {item.number}
                            </span>

                            <div className="relative z-10">
                                <h3 className="text-2xl md:text-3xl font-bold mt-12 mb-3 tracking-tight">
                                    {item.title}
                                </h3>
                                <p className="text-base md:text-lg text-gray-500 mb-5 leading-relaxed">
                                    {item.description}
                                </p>
                                <p className="text-base md:text-lg lg:text-xl font-mono font-semibold text-black tracking-tight">
                                    {item.detail}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Stats emphasis */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="mt-24 md:mt-32 text-center space-y-5"
                >
                    <p className="text-xl md:text-2xl lg:text-3xl font-mono tracking-tight">
                        <span className="block font-mono text-5xl md:text-6xl lg:text-7xl font-black mb-3">3,847</span>
                        개 아파트 시공 데이터 기반
                    </p>
                    <p className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">
                        당신의 견적, 계산됩니다.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
