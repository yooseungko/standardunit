"use client";

import { motion } from "framer-motion";

export default function GeekAnatomy() {
    return (
        <section className="py-28 md:py-36 lg:py-44 bg-black text-white">
            <div className="w-full max-w-5xl mx-auto px-6 md:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Header */}
                    <div className="mb-16 md:mb-24">
                        <p className="text-gray-500 font-mono text-sm md:text-base mb-5 tracking-widest uppercase">
                            Geek Section 01
                        </p>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-5 tracking-tight leading-tight">
                            견적 해부학
                        </h2>
                        <p className="text-xl md:text-2xl text-gray-400 leading-relaxed">
                            당신의 견적서, 127개 변수로 분해합니다
                        </p>
                    </div>

                    {/* Formula */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="bg-gray-900 p-10 md:p-14 lg:p-16 mb-14"
                    >
                        <div className="font-mono text-center">
                            <p className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-4 leading-relaxed">
                                견적 = Σ(단가<sub className="text-base md:text-lg">i</sub> × 수량<sub className="text-base md:text-lg">i</sub> × 난이도계수<sub className="text-base md:text-lg">i</sub>)
                            </p>
                            <p className="text-gray-500 text-base md:text-lg mt-4">i=1 to n</p>
                        </div>
                    </motion.div>

                    {/* Variable Explanation */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="space-y-7 md:space-y-8 font-mono pl-4 md:pl-6"
                    >
                        <div className="flex items-start gap-5 md:gap-6">
                            <span className="text-gray-600 select-none text-lg">├─</span>
                            <div className="space-y-1">
                                <span className="font-bold text-lg md:text-xl">단가</span>
                                <span className="text-gray-400 text-base md:text-lg ml-3 md:ml-5">자재비 + 인건비 + 부대비용</span>
                            </div>
                        </div>
                        <div className="flex items-start gap-5 md:gap-6">
                            <span className="text-gray-600 select-none text-lg">├─</span>
                            <div className="space-y-1">
                                <span className="font-bold text-lg md:text-xl">수량</span>
                                <span className="text-gray-400 text-base md:text-lg ml-3 md:ml-5">실측 면적 ÷ 자재 규격 × 여유율 1.05</span>
                            </div>
                        </div>
                        <div className="flex items-start gap-5 md:gap-6">
                            <span className="text-gray-600 select-none text-lg">└─</span>
                            <div className="space-y-1">
                                <span className="font-bold text-lg md:text-xl">난이도계수</span>
                                <span className="text-gray-400 text-base md:text-lg ml-3 md:ml-5">층고/평면/구조체 보정값</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Interactive Example */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="mt-16 md:mt-20 p-8 md:p-10 lg:p-12 border-2 border-gray-700 bg-gray-900/50"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                            <span className="font-mono text-sm text-gray-400 tracking-wide">Interactive Example</span>
                        </div>
                        <p className="font-mono text-lg md:text-xl lg:text-2xl leading-relaxed">
                            <span className="text-gray-400">층고</span>{" "}
                            <span className="text-white font-bold">2.3m</span>{" "}
                            <span className="text-gray-600 mx-2">→</span>{" "}
                            <span className="text-white font-bold">2.6m</span>
                            <span className="text-gray-400 ml-2">로 변경 시:</span>
                        </p>
                        <p className="font-mono text-4xl md:text-5xl font-black mt-6 text-white tracking-tight">
                            +2,847,000원
                        </p>
                        <p className="font-mono text-gray-500 mt-4 text-base md:text-lg">
                            (천장 마감재 12㎡ 증가)
                        </p>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
