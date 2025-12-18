"use client";

import { motion } from "framer-motion";

export default function GeekDifficulty() {
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
                            Geek Section 04
                        </p>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-5 tracking-tight leading-tight">
                            시공 난이도 알고리즘
                        </h2>
                        <p className="text-xl md:text-2xl text-gray-400 leading-relaxed">
                            같은 84㎡도 난이도는 다릅니다
                        </p>
                    </div>

                    {/* Code Block */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="bg-gray-900 p-8 md:p-10 lg:p-12 overflow-x-auto border-l-4 border-green-500"
                    >
                        <pre className="font-mono text-sm md:text-base lg:text-lg text-gray-100 leading-loose">
                            <code>
                                {`difficulty_score = (
    structure_complexity * 0.3 +`}    <span className="text-gray-500">{`  # 구조 복잡도`}</span>
                                {`
    ceiling_height_factor * 0.2 +`}   <span className="text-gray-500">{` # 층고 변수`}</span>
                                {`
    existing_condition * 0.25 +`}     <span className="text-gray-500">{` # 기존 상태`}</span>
                                {`
    access_constraint * 0.15 +`}      <span className="text-gray-500">{` # 작업 접근성`}</span>
                                {`
    timeline_pressure * 0.1`}         <span className="text-gray-500">{` # 공기 압박도`}</span>
                                {`
)`}
                            </code>
                        </pre>
                    </motion.div>

                    {/* Result Example */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="mt-12 md:mt-16 grid md:grid-cols-2 gap-6 md:gap-8"
                    >
                        <div className="bg-gray-900 p-8 md:p-10 lg:p-12">
                            <p className="text-gray-500 font-mono text-sm md:text-base mb-4">당신의 아파트</p>
                            <div className="flex items-end gap-3">
                                <span className="font-mono text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tight">6.8</span>
                                <span className="font-mono text-2xl md:text-3xl text-gray-600 pb-2 font-bold">/ 10</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-8 h-3 bg-gray-800 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    whileInView={{ width: "68%" }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                                    className="h-full bg-white"
                                />
                            </div>
                        </div>

                        <div className="bg-gray-900 p-8 md:p-10 lg:p-12 font-mono">
                            <div className="space-y-8">
                                <div>
                                    <p className="text-gray-500 text-sm md:text-base mb-3">표준 공기</p>
                                    <p className="text-xl md:text-2xl font-bold leading-relaxed">
                                        45일 + 보정 7일 = <span className="text-white">52일</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-sm md:text-base mb-3">인건비 보정</p>
                                    <p className="text-3xl md:text-4xl font-black text-white tracking-tight">+12%</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
