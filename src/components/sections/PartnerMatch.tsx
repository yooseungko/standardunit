"use client";

import { motion } from "framer-motion";

const partnerBenefits = [
    {
        icon: "📋",
        title: "표준 견적 그대로",
        description: "Standard Unit에서 받은 견적 그대로 시공됩니다. 추가 비용 없이.",
    },
    {
        icon: "✓",
        title: "검증된 파트너사",
        description: "시공 이력, 고객 평점, AS 처리율 기준으로 엄선된 시공사만 매칭됩니다.",
    },
    {
        icon: "🔒",
        title: "가격 보장 계약",
        description: "견적가 고정 계약. 시공 중 추가 비용 발생 시 파트너사가 부담합니다.",
    },
];

const stats = [
    { value: "47", label: "검증된 파트너사" },
    { value: "98.7%", label: "고객 만족도" },
    { value: "0건", label: "추가 비용 분쟁" },
];

export default function PartnerMatch() {
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
                            Partner Matching
                        </p>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-6 tracking-tight leading-tight">
                            견적 받고 끝?
                            <br />
                            <span className="text-gray-400">아닙니다. 시공까지 연결합니다.</span>
                        </h2>
                        <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-2xl">
                            Standard Unit의 표준 견적을 인정하는 파트너 시공사에게
                            <br className="hidden md:block" />
                            동일한 조건으로 바로 시공을 의뢰할 수 있습니다.
                        </p>
                    </div>

                    {/* Process Flow */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="mb-16 md:mb-20"
                    >
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
                            {/* Step 1 */}
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 md:w-16 md:h-16 bg-white text-black font-mono text-xl md:text-2xl font-black flex items-center justify-center">
                                    01
                                </div>
                                <div>
                                    <p className="font-bold text-lg">표준 견적 확정</p>
                                    <p className="text-gray-500 text-sm">온라인 견적서 발급</p>
                                </div>
                            </div>

                            {/* Arrow */}
                            <div className="hidden md:block text-gray-600 text-3xl">→</div>
                            <div className="md:hidden text-gray-600 text-2xl rotate-90">→</div>

                            {/* Step 2 */}
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 md:w-16 md:h-16 bg-white text-black font-mono text-xl md:text-2xl font-black flex items-center justify-center">
                                    02
                                </div>
                                <div>
                                    <p className="font-bold text-lg">파트너사 매칭</p>
                                    <p className="text-gray-500 text-sm">지역/일정 맞춤 배정</p>
                                </div>
                            </div>

                            {/* Arrow */}
                            <div className="hidden md:block text-gray-600 text-3xl">→</div>
                            <div className="md:hidden text-gray-600 text-2xl rotate-90">→</div>

                            {/* Step 3 */}
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 md:w-16 md:h-16 bg-white text-black font-mono text-xl md:text-2xl font-black flex items-center justify-center">
                                    03
                                </div>
                                <div>
                                    <p className="font-bold text-lg">계약 및 시공</p>
                                    <p className="text-gray-500 text-sm">가격 보장 계약 체결</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Benefits */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="grid md:grid-cols-3 gap-6 md:gap-8 mb-16 md:mb-20"
                    >
                        {partnerBenefits.map((benefit, index) => (
                            <div
                                key={index}
                                className="p-8 md:p-10 bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300"
                            >
                                <span className="text-4xl mb-6 block">{benefit.icon}</span>
                                <h3 className="text-xl md:text-2xl font-bold mb-4 tracking-tight">
                                    {benefit.title}
                                </h3>
                                <p className="text-gray-400 leading-relaxed">
                                    {benefit.description}
                                </p>
                            </div>
                        ))}
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="grid grid-cols-3 gap-4 md:gap-8"
                    >
                        {stats.map((stat, index) => (
                            <div key={index} className="text-center p-6 md:p-8 bg-white/5 backdrop-blur-sm border border-white/10">
                                <p className="font-mono text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight">
                                    {stat.value}
                                </p>
                                <p className="text-gray-400 text-sm md:text-base mt-3">
                                    {stat.label}
                                </p>
                            </div>
                        ))}
                    </motion.div>

                    {/* Guarantee Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="mt-16 md:mt-20 p-8 md:p-12 border-2 border-white text-center"
                    >
                        <p className="font-mono text-sm text-gray-400 mb-4 tracking-widest uppercase">
                            Standard Unit Guarantee
                        </p>
                        <p className="text-xl md:text-2xl lg:text-3xl font-bold leading-relaxed">
                            견적과 다른 금액이 청구되면,
                            <br />
                            <span className="text-white">차액의 200%를 보상합니다.</span>
                        </p>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
