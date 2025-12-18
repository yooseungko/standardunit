"use client";

import { motion } from "framer-motion";

export default function Hero() {
    return (
        <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-20">
            {/* Background - 아파트 평면도 그래픽 (매우 연하게) */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                <svg className="w-full h-full" viewBox="0 0 1000 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="1" />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    <rect x="200" y="200" width="600" height="400" stroke="currentColor" strokeWidth="2" fill="none" />
                    <line x1="200" y1="350" x2="500" y2="350" stroke="currentColor" strokeWidth="2" />
                    <line x1="500" y1="200" x2="500" y2="600" stroke="currentColor" strokeWidth="2" />
                    <rect x="220" y="220" width="100" height="80" stroke="currentColor" strokeWidth="1" fill="none" />
                    <rect x="520" y="220" width="120" height="100" stroke="currentColor" strokeWidth="1" fill="none" />
                    <rect x="680" y="220" width="100" height="80" stroke="currentColor" strokeWidth="1" fill="none" />
                </svg>
            </div>

            <div className="w-full max-w-5xl mx-auto px-6 md:px-12 lg:px-16 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-center md:text-left"
                >
                    {/* Main Headline */}
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black leading-[1.15] tracking-tight mb-10 md:mb-12">
                        <span className="block">왜 같은 84㎡인데</span>
                        <span className="block mt-3 md:mt-4">
                            견적은 <span className="inline-block border-b-4 md:border-b-[5px] border-black pb-1">3천만원</span>부터
                        </span>
                        <span className="block mt-3 md:mt-4">
                            <span className="inline-block border-b-4 md:border-b-[5px] border-black pb-1">8천만원</span>까지인가요?
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                        className="max-w-2xl mx-auto md:mx-0 space-y-5"
                    >
                        <p className="text-lg md:text-xl lg:text-2xl text-gray-500 leading-relaxed tracking-tight">
                            불투명한 견적, 애매한 자재 등급, "현장 상황에 따라 추가"
                        </p>
                        <p className="text-xl md:text-2xl lg:text-3xl font-semibold text-black leading-snug tracking-tight">
                            당신의 아파트는 표준인데,<br className="hidden sm:block" /> 견적은 왜 비표준인가요?
                        </p>
                    </motion.div>

                    {/* CTA Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                        className="mt-12 md:mt-14"
                    >
                        <a
                            href="#cta"
                            className="inline-flex items-center gap-4 px-8 md:px-10 py-5 md:py-6 bg-black text-white text-base md:text-lg lg:text-xl font-semibold tracking-tight hover:bg-gray-800 transition-all duration-300 hover:translate-x-2"
                        >
                            내 아파트 표준 견적 받기
                            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </a>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.9, ease: "easeOut" }}
                        className="mt-16 md:mt-20 flex flex-wrap gap-10 md:gap-14 lg:gap-16 justify-center md:justify-start"
                    >
                        <div className="text-center md:text-left">
                            <p className="font-mono text-4xl md:text-5xl font-black tracking-tight text-black">3,847</p>
                            <p className="text-sm md:text-base text-gray-400 mt-2 tracking-wide">시공 데이터</p>
                        </div>
                        <div className="text-center md:text-left">
                            <p className="font-mono text-4xl md:text-5xl font-black tracking-tight text-black">127</p>
                            <p className="text-sm md:text-base text-gray-400 mt-2 tracking-wide">견적 변수</p>
                        </div>
                        <div className="text-center md:text-left">
                            <p className="font-mono text-4xl md:text-5xl font-black tracking-tight text-black">16</p>
                            <p className="text-sm md:text-base text-gray-400 mt-2 tracking-wide">표준 타입</p>
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Scroll indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.5 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2"
            >
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-7 h-11 border-2 border-gray-300 rounded-full flex justify-center pt-2"
                >
                    <div className="w-1.5 h-3 bg-gray-400 rounded-full" />
                </motion.div>
            </motion.div>
        </section>
    );
}
