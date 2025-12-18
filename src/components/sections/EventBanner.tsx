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
        const targetDate = new Date("2025-01-31T23:59:59");

        const timer = setInterval(() => {
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
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const scrollToCTA = () => {
        const ctaSection = document.getElementById("cta");
        if (ctaSection) {
            ctaSection.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <section className="relative py-20 md:py-28 bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden">
            {/* 배경 효과 */}
            <div className="absolute inset-0">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            {/* 패턴 오버레이 */}
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
            />

            <div className="relative w-full max-w-6xl mx-auto px-6 md:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center"
                >
                    {/* 이벤트 배지 */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-sm font-bold rounded-full mb-8"
                    >
                        <span className="animate-pulse">🎁</span>
                        1월 한정 이벤트
                        <span className="animate-pulse">🎁</span>
                    </motion.div>

                    {/* 메인 타이틀 */}
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
                        견적 문의 후<br />
                        <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                            시공 계약 시
                        </span>
                    </h2>

                    {/* 상품 표시 */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="relative inline-block mb-8"
                    >
                        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-8 md:p-12">
                            {/* 삼성 로고 */}
                            <p className="text-gray-400 text-sm font-medium mb-3 tracking-widest uppercase">
                                Samsung
                            </p>

                            {/* 제품명 */}
                            <h3 className="text-2xl md:text-4xl font-black text-white mb-2">
                                비스포크 키친핏
                            </h3>
                            <p className="text-xl md:text-2xl text-gray-300 font-medium mb-4">
                                냉장고
                            </p>

                            {/* 가격 */}
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-gray-500 line-through text-lg">
                                    약 200만원 상당
                                </span>
                                <span className="bg-red-500 text-white px-3 py-1 text-sm font-bold rounded">
                                    무료 증정
                                </span>
                            </div>
                        </div>

                        {/* 장식 */}
                        <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-3xl shadow-lg shadow-orange-500/30">
                            🎉
                        </div>
                    </motion.div>

                    {/* 카운트다운 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="mb-10"
                    >
                        <p className="text-gray-400 text-sm mb-4 font-medium">
                            이벤트 종료까지
                        </p>
                        <div className="flex justify-center gap-3 md:gap-4">
                            {[
                                { value: timeLeft.days, label: "일" },
                                { value: timeLeft.hours, label: "시간" },
                                { value: timeLeft.minutes, label: "분" },
                                { value: timeLeft.seconds, label: "초" },
                            ].map((item, index) => (
                                <div key={index} className="text-center">
                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg flex items-center justify-center mb-2">
                                        <span className="text-2xl md:text-3xl font-black text-white font-mono">
                                            {String(item.value).padStart(2, "0")}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-500">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* CTA 버튼 */}
                    <motion.button
                        onClick={scrollToCTA}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-10 py-5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-lg rounded-full shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-shadow"
                    >
                        무료 견적 받고 이벤트 참여하기
                    </motion.button>

                    {/* 조건 안내 */}
                    <p className="mt-6 text-gray-500 text-sm">
                        * 32평 이상 전체 리모델링 시공 계약 시 적용 (선착순 10팀 한정)
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
