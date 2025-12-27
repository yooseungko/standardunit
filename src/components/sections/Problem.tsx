"use client";

import { motion } from "framer-motion";

const problems = [
    "'고급 자재' '프리미엄 마감'이 정확히 뭔지 모른다",
    "평당 300만원이 합리적인지 비싼건지 판단 안 된다",
    "A업체 견적서와 B업체 견적서 비교가 불가능하다",
    "시공 중 '추가 비용'이 계속 발생할까 두렵다",
];

export default function Problem() {
    return (
        <section className="py-28 md:py-36 lg:py-44 bg-white">
            <div className="w-full max-w-4xl mx-auto px-6 md:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.3 }}
                >
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-400 mb-16 md:mb-20 tracking-tight leading-relaxed">
                        아파트 인테리어 견적을 받아보셨다면
                    </h2>

                    {/* Problem List */}
                    <div className="space-y-8 md:space-y-10 lg:space-y-12">
                        {problems.map((problem, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.25, delay: index * 0.05 }}
                                className="flex items-start gap-5 md:gap-7"
                            >
                                <span className="flex-shrink-0 text-3xl md:text-4xl lg:text-5xl font-black text-black select-none leading-none mt-1">
                                    ✕
                                </span>
                                <p className="text-lg md:text-xl lg:text-2xl font-medium text-gray-800 leading-relaxed tracking-tight">
                                    {problem}
                                </p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Emphasis */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        className="mt-20 md:mt-28 pt-16 border-t border-gray-200"
                    >
                        <p className="text-2xl md:text-3xl lg:text-4xl font-black leading-snug tracking-tight">
                            당신의 집은 표준 평면인데,
                            <br />
                            <span className="text-gray-400">왜 견적은 이렇게 불투명할까요?</span>
                        </p>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
