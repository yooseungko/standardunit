"use client";

import { motion } from "framer-motion";

export default function EstimateShare() {
    return (
        <section className="relative py-24 md:py-32 bg-white overflow-hidden">
            {/* 배경 패턴 */}
            <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(to right, black 1px, transparent 1px), linear-gradient(to bottom, black 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
                }}
            />

            <div className="relative w-full max-w-5xl mx-auto px-6 md:px-12">
                {/* 상단 공감 메시지 */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16 md:mb-20"
                >
                    <p className="text-gray-400 font-mono text-sm mb-6 tracking-widest uppercase">
                        Transparency Movement
                    </p>
                    <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-black leading-tight tracking-tight mb-6">
                        당신이 보내주는 견적서가<br />
                        <span className="text-gray-400">대한민국의 인테리어를</span><br />
                        투명하게 바꿉니다.
                    </h2>
                    <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
                        우리는 수집된 견적 데이터를 분석하여<br className="hidden md:block" />
                        투명하고 공정한 인테리어 시장을 만들어갑니다.
                    </p>
                </motion.div>

                {/* 혜택 카드 */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="max-w-3xl mx-auto"
                >
                    <div className="border-2 border-black p-8 md:p-12 relative">
                        {/* 배지 */}
                        <div className="absolute -top-4 left-8 bg-black text-white px-4 py-2 font-mono text-sm tracking-wider">
                            SPECIAL OFFER
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                            {/* 왼쪽: 혜택 설명 */}
                            <div>
                                <h3 className="text-xl md:text-2xl font-black text-black mb-4 tracking-tight">
                                    다른 곳에서 받은 견적서를<br />
                                    보내주시면
                                </h3>
                                <div className="flex items-baseline gap-2 mb-6">
                                    <span className="text-4xl md:text-5xl font-black text-black">100만원</span>
                                    <span className="text-xl text-gray-500 font-medium">추가 할인</span>
                                </div>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    인테리어 계약 시 적용되는 특별 할인 혜택입니다.<br />
                                    보내주신 견적서는 시장 분석에 활용되어<br />
                                    더 투명한 인테리어 시장을 만드는 데 기여합니다.
                                </p>
                            </div>

                            {/* 오른쪽: 참여 방법 */}
                            <div className="bg-gray-50 p-6 md:p-8">
                                <p className="font-mono text-xs text-gray-400 mb-4 tracking-widest uppercase">
                                    How to Participate
                                </p>
                                <ol className="space-y-4">
                                    <li className="flex gap-4">
                                        <span className="flex-shrink-0 w-8 h-8 bg-black text-white font-mono text-sm flex items-center justify-center">
                                            1
                                        </span>
                                        <div>
                                            <p className="font-semibold text-black text-sm">무료 견적 신청</p>
                                            <p className="text-gray-500 text-xs mt-1">Standard Unit에서 견적을 받으세요</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <span className="flex-shrink-0 w-8 h-8 bg-black text-white font-mono text-sm flex items-center justify-center">
                                            2
                                        </span>
                                        <div>
                                            <p className="font-semibold text-black text-sm">타사 견적서 공유</p>
                                            <p className="text-gray-500 text-xs mt-1">다른 곳에서 받은 견적서를 이메일로 전송</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <span className="flex-shrink-0 w-8 h-8 bg-black text-white font-mono text-sm flex items-center justify-center">
                                            3
                                        </span>
                                        <div>
                                            <p className="font-semibold text-black text-sm">100만원 할인 적용</p>
                                            <p className="text-gray-500 text-xs mt-1">시공 계약 시 자동 할인</p>
                                        </div>
                                    </li>
                                </ol>
                            </div>
                        </div>

                        {/* 하단 이메일 안내 */}
                        <div className="mt-8 pt-8 border-t border-gray-200 text-center">
                            <p className="text-gray-400 text-sm mb-2">견적서 보내실 곳</p>
                            <a
                                href="mailto:standardunit25@gmail.com"
                                className="text-black font-mono text-lg md:text-xl font-bold hover:underline"
                            >
                                standardunit25@gmail.com
                            </a>
                        </div>

                        {/* 참여자 롤링 티커 */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <div className="text-center mb-4">
                                <p className="text-sm text-gray-500">
                                    대한민국의 인테리어 견적을 바꾸는 사람들
                                </p>
                                <p className="text-2xl font-black text-black mt-1">
                                    현재 <span className="font-mono">1,248</span>명
                                </p>
                            </div>

                            {/* 롤링 티커 */}
                            <div className="overflow-hidden relative h-24 bg-gray-50">
                                <div className="animate-scroll-up absolute w-full">
                                    {[
                                        { location: "강남", apt: "래미안", size: "32평", name: "김*명" },
                                        { location: "분당", apt: "파크뷰", size: "43평", name: "이*수" },
                                        { location: "용산", apt: "한남더힐", size: "52평", name: "박*진" },
                                        { location: "송파", apt: "헬리오시티", size: "32평", name: "최*영" },
                                        { location: "마포", apt: "마포래미안", size: "24평", name: "정*은" },
                                        { location: "서초", apt: "아크로리버", size: "43평", name: "강*호" },
                                        { location: "잠실", apt: "엘스", size: "32평", name: "윤*미" },
                                        { location: "판교", apt: "알파리움", size: "32평", name: "한*준" },
                                        { location: "강남", apt: "래미안", size: "32평", name: "김*명" },
                                        { location: "분당", apt: "파크뷰", size: "43평", name: "이*수" },
                                        { location: "용산", apt: "한남더힐", size: "52평", name: "박*진" },
                                    ].map((item, index) => (
                                        <div
                                            key={index}
                                            className="py-2 px-4 text-center text-sm text-gray-600 font-mono"
                                        >
                                            {item.location} {item.apt}아파트 {item.size} 전체 리모델링 견적서 <span className="text-black font-semibold">{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 하단 부연 설명 */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="mt-12 text-center"
                >
                    <p className="text-gray-400 text-xs font-mono">
                        * 견적서는 익명으로 처리되며, 개인정보는 보호됩니다<br />
                        * 32평 이상 전체 리모델링 시공 계약 시 적용
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
