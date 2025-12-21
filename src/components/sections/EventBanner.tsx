"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function EventBanner() {
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
    });

    useEffect(() => {
        const targetDate = new Date("2026-01-31T23:59:59");

        const calculateTimeLeft = () => {
            const now = new Date();
            const difference = targetDate.getTime() - now.getTime();

            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                });
            }
        };

        // 즉시 계산
        calculateTimeLeft();

        // 1초마다 업데이트
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, []);

    const scrollToCTA = () => {
        const ctaSection = document.getElementById("cta");
        if (ctaSection) {
            ctaSection.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <section className="relative py-24 md:py-32 bg-black overflow-hidden">
            {/* 그리드 배경 */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                }}
            />

            <div className="relative w-full max-w-5xl mx-auto px-6 md:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    {/* 이벤트 라벨 */}
                    <p className="text-gray-500 font-mono text-sm md:text-base mb-6 tracking-widest uppercase text-center">
                        Limited Time Offer
                    </p>

                    {/* 메인 타이틀 */}
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-4 leading-tight text-center tracking-tight">
                        1월 한정 이벤트
                    </h2>
                    <p className="text-lg md:text-xl text-gray-400 text-center mb-12">
                        견적 문의 후 시공 계약 시
                    </p>

                    {/* 상품 카드 */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="max-w-lg mx-auto mb-12"
                    >
                        <div className="border border-gray-800 bg-gray-900/50 p-8 md:p-10 relative">
                            {/* 무료 배지 */}
                            <div className="absolute -top-4 -right-4 bg-white text-black px-4 py-2 font-black text-sm">
                                무료 증정
                            </div>

                            {/* 브랜드 */}
                            <p className="text-gray-600 font-mono text-xs mb-4 tracking-[0.3em] uppercase">
                                Samsung
                            </p>

                            {/* 제품명 */}
                            <h3 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tight">
                                비스포크 키친핏
                            </h3>
                            <p className="text-xl text-gray-400 font-medium mb-6">
                                냉장고
                            </p>

                            {/* 가격 */}
                            <div className="flex items-center gap-4 pt-6 border-t border-gray-800">
                                <span className="text-gray-600 line-through font-mono">
                                    약 200만원 상당
                                </span>
                                <span className="text-white font-black text-lg">
                                    → 0원
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    {/* 카운트다운 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="mb-12"
                    >
                        <p className="text-gray-600 text-xs font-mono mb-4 text-center tracking-widest uppercase">
                            Event Ends In
                        </p>
                        <div className="flex justify-center gap-2 md:gap-4">
                            {[
                                { value: timeLeft.days, label: "DAYS" },
                                { value: timeLeft.hours, label: "HRS" },
                                { value: timeLeft.minutes, label: "MIN" },
                                { value: timeLeft.seconds, label: "SEC" },
                            ].map((item, index) => (
                                <div key={index} className="text-center">
                                    <div className="w-16 h-16 md:w-20 md:h-20 border border-gray-800 bg-gray-900/50 flex items-center justify-center">
                                        <span className="text-2xl md:text-3xl font-black text-white font-mono">
                                            {String(item.value).padStart(2, "0")}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-gray-600 font-mono tracking-wider mt-2 block">
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* CTA 버튼 */}
                    <div className="text-center">
                        <motion.button
                            onClick={scrollToCTA}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-10 py-5 bg-white text-black font-black text-base hover:bg-gray-100 transition-colors"
                        >
                            무료 견적 받고 이벤트 참여하기
                        </motion.button>
                    </div>

                    {/* 조건 안내 */}
                    <p className="mt-8 text-gray-600 text-xs font-mono text-center">
                        * 32평 이상 전체 리모델링 시공 계약 시 적용 (선착순 10팀 한정)
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
