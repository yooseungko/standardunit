"use client";

import { motion } from "framer-motion";

export default function GeekClassification() {
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
                            Geek Section 02
                        </p>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-5 tracking-tight leading-tight">
                            표준 평면 분류 체계
                        </h2>
                        <p className="text-xl md:text-2xl text-gray-500 leading-relaxed">
                            당신의 아파트는 Type 3-B-02 입니다
                        </p>
                    </div>

                    {/* Tree Diagram */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="font-mono text-sm md:text-base lg:text-lg bg-gray-50 p-8 md:p-12 lg:p-14 overflow-x-auto"
                    >
                        <pre className="whitespace-pre text-black leading-loose">
                            {`Type [구조]-[평면]-[변형]
     │      │      └─ 01~08: 발코니확장/변형 패턴
     │      └─ A~D: 거실-주방 배치 4가지
     └─ 1~5: 방 개수별 구조 분류`}
                        </pre>
                    </motion.div>

                    {/* Example */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="mt-12 md:mt-16 p-8 md:p-10 lg:p-12 border-l-4 border-black bg-gray-50"
                    >
                        <p className="font-mono text-base md:text-lg mb-5 text-gray-500">예:</p>
                        <p className="font-mono text-3xl md:text-4xl lg:text-5xl font-black mb-5 tracking-tight">Type 3-B-02</p>
                        <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                            = 방3개 / 주방이 거실 측면 / 안방 발코니 확장형
                        </p>
                        <p className="font-mono text-lg md:text-xl mt-6 pt-6 border-t border-gray-200">
                            → 해당 타입 시공 데이터{" "}
                            <span className="font-mono text-2xl md:text-3xl font-black">847</span>건 보유
                        </p>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="mt-16 md:mt-24 grid md:grid-cols-2 gap-6 md:gap-8"
                    >
                        <div className="p-8 md:p-10 lg:p-12 bg-black text-white">
                            <p className="font-mono text-5xl md:text-6xl lg:text-7xl font-black tracking-tight">1,247</p>
                            <p className="text-base md:text-lg text-gray-400 mt-4 leading-relaxed">
                                전국 아파트 단지 분석 완료
                            </p>
                        </div>
                        <div className="p-8 md:p-10 lg:p-12 bg-black text-white">
                            <p className="font-mono text-5xl md:text-6xl lg:text-7xl font-black tracking-tight">16</p>
                            <p className="text-base md:text-lg text-gray-400 mt-4 leading-relaxed">
                                표준 타입으로 분류
                            </p>
                        </div>
                    </motion.div>

                    {/* Brag */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="mt-16 md:mt-20 text-center space-y-4"
                    >
                        <p className="text-lg md:text-xl lg:text-2xl font-mono text-gray-600">
                            당신의 아파트가 &apos;특이&apos;할 확률:
                        </p>
                        <p className="font-mono text-5xl md:text-6xl lg:text-7xl font-black text-black tracking-tight">3.7%</p>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
