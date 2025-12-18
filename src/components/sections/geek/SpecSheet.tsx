"use client";

import { motion } from "framer-motion";

const materialData = [
    { item: "두께", standardA: "12mm", standardB: "15mm", premiumS: "18mm" },
    { item: "밀도", standardA: "850kg/㎥", standardB: "920kg/㎥", premiumS: "980kg/㎥" },
    { item: "포름알데히드", standardA: "E0 (0.3mg/L)", standardB: "SE0 (0.2mg/L)", premiumS: "Super E0 (0.1mg/L)" },
    { item: "내스크래치", standardA: "4H", standardB: "6H", premiumS: "8H" },
    { item: "보증기간", standardA: "10년", standardB: "15년", premiumS: "20년" },
    { item: "㎡당 단가", standardA: "47,000원", standardB: "68,000원", premiumS: "94,000원", isPrice: true },
];

export default function GeekSpecSheet() {
    return (
        <section className="py-28 md:py-36 lg:py-44 bg-gray-50">
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
                            Geek Section 03
                        </p>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-5 tracking-tight leading-tight">
                            자재 스펙 시트
                        </h2>
                        <p className="text-xl md:text-2xl text-gray-500 leading-relaxed">
                            &apos;마루&apos;가 아닙니다. 이건 데이터입니다
                        </p>
                    </div>

                    {/* Desktop Table */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="hidden md:block overflow-x-auto bg-white"
                    >
                        <table className="w-full font-mono text-sm lg:text-base border-collapse">
                            <thead>
                                <tr className="bg-black text-white">
                                    <th className="p-5 lg:p-6 text-left font-bold tracking-wide">항목</th>
                                    <th className="p-5 lg:p-6 text-left font-bold tracking-wide">Standard-A</th>
                                    <th className="p-5 lg:p-6 text-left font-bold tracking-wide">Standard-B</th>
                                    <th className="p-5 lg:p-6 text-left font-bold tracking-wide">Premium-S</th>
                                </tr>
                            </thead>
                            <tbody>
                                {materialData.map((row, index) => (
                                    <tr
                                        key={index}
                                        className={`border-b border-gray-100 ${row.isPrice ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-50 transition-colors`}
                                    >
                                        <td className="p-5 lg:p-6 font-semibold text-gray-700">{row.item}</td>
                                        <td className={`p-5 lg:p-6 ${row.isPrice ? 'font-bold text-lg lg:text-xl' : 'text-gray-600'}`}>{row.standardA}</td>
                                        <td className={`p-5 lg:p-6 ${row.isPrice ? 'font-bold text-lg lg:text-xl' : 'text-gray-600'}`}>{row.standardB}</td>
                                        <td className={`p-5 lg:p-6 ${row.isPrice ? 'font-bold text-lg lg:text-xl' : 'text-gray-600'}`}>{row.premiumS}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </motion.div>

                    {/* Mobile Cards */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="md:hidden space-y-6"
                    >
                        {["Standard-A", "Standard-B", "Premium-S"].map((grade, gradeIndex) => (
                            <div key={grade} className="bg-white p-7 border-l-4 border-black">
                                <h3 className="font-mono font-bold text-xl mb-6">{grade}</h3>
                                <div className="space-y-4 font-mono text-sm">
                                    {materialData.map((row, rowIndex) => (
                                        <div key={rowIndex} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                            <span className="text-gray-500">{row.item}</span>
                                            <span className={row.isPrice ? 'font-bold text-base' : ''}>
                                                {gradeIndex === 0 ? row.standardA : gradeIndex === 1 ? row.standardB : row.premiumS}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </motion.div>

                    {/* Message */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="mt-16 md:mt-24 p-8 md:p-12 lg:p-14 bg-black text-white"
                    >
                        <p className="text-lg md:text-xl lg:text-2xl leading-relaxed">
                            &quot;고급 자재&quot;라는 말로 3만원을 더 받는 순간,
                            <br className="hidden md:block" />
                            <span className="font-bold">
                                당신은 정확히 무엇에 돈을 쓰는지 알 권리가 있습니다.
                            </span>
                        </p>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
