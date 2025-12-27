"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";

// Styleboard 이미지 경로 목록 (실제 이미지 파일들)
const styleboardImages = [
    // 거실
    "/styleboard/거실/톤앤매너/거실_after (105).webp",
    "/styleboard/거실/톤앤매너/거실_after (106).webp",
    "/styleboard/거실/톤앤매너/거실_after (116).webp",
    "/styleboard/거실/톤앤매너/거실_after (77).webp",
    "/styleboard/거실/톤앤매너/거실_after (58).webp",
    "/styleboard/거실/톤앤매너/거실_after (42).webp",
    // 욕실
    "/styleboard/욕실/샤워수전/욕실-A_after (33).webp",
    "/styleboard/욕실/샤워수전/욕실-A_after (40).webp",
    "/styleboard/욕실/샤워수전/욕실_after (10).webp",
    "/styleboard/욕실/샤워수전/욕실-A_after (50).webp",
    // 주방
    "/styleboard/주방/톤앤매너/주방_after (100).webp",
    "/styleboard/주방/톤앤매너/주방_after (106).webp",
    "/styleboard/주방/톤앤매너/주방_after (3).webp",
    "/styleboard/주방/톤앤매너/주방_after (4).webp",
    // 침실
    "/styleboard/침실/톤앤매너/침실-A_after (110).webp",
    "/styleboard/침실/톤앤매너/침실-B_after (119).webp",
    "/styleboard/침실/톤앤매너/침실-C_after (22).webp",
    "/styleboard/침실/톤앤매너/침실-D_after (23).webp",
    // 현관
    "/styleboard/현관/톤앤매너/현관_after (101).webp",
    "/styleboard/현관/톤앤매너/현관_after (104).webp",
    "/styleboard/현관/톤앤매너/현관_after (90).webp",
    "/styleboard/현관/톤앤매너/현관_after (8).webp",
];

// 이미지를 섞는 함수
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export default function PortfolioShowcase() {
    // 클라이언트에서만 셔플하여 hydration mismatch 방지
    const [shuffledImages, setShuffledImages] = useState<string[]>(styleboardImages);
    const scrollRef = useRef<HTMLDivElement>(null);

    // 클라이언트 마운트 후에만 셔플 (hydration mismatch 방지를 위해 필수)
    useEffect(() => {
        // 비동기적으로 호출하여 cascading render 경고 방지
        const timer = setTimeout(() => {
            setShuffledImages(shuffleArray(styleboardImages));
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const scrollContainer = scrollRef.current;
        if (!scrollContainer || shuffledImages.length === 0) return;

        let animationId: number;
        let scrollPosition = 0;
        const scrollSpeed = 0.5; // 픽셀/프레임

        const animate = () => {
            scrollPosition += scrollSpeed;

            // 끝에 도달하면 처음으로 리셋 (무한 스크롤 효과)
            if (scrollPosition >= scrollContainer.scrollWidth / 2) {
                scrollPosition = 0;
            }

            scrollContainer.scrollLeft = scrollPosition;
            animationId = requestAnimationFrame(animate);
        };

        animationId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [shuffledImages]);

    // 이미지를 두 배로 복제하여 무한 스크롤 효과
    const displayImages = [...shuffledImages, ...shuffledImages];

    return (
        <section className="py-24 md:py-32 bg-neutral-950 text-white overflow-hidden">
            <div className="w-full max-w-5xl mx-auto px-6 md:px-12 mb-12 md:mb-16">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Header */}
                    <p className="text-gray-500 font-mono text-sm md:text-base mb-5 tracking-widest uppercase">
                        Premium Portfolio
                    </p>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-6 tracking-tight leading-tight">
                        최고의 파트너 시공 소장들을
                        <br />
                        <span className="text-gray-400">합리적인 가격으로 진행해보세요.</span>
                    </h2>
                    <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-2xl mb-6">
                        시공 디테일과 모든 면에서 완성도 높은 현장을 구축합니다.
                    </p>

                    {/* 차별화 포인트 */}
                    <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 px-6 py-4 w-fit">
                        <span className="text-2xl">💡</span>
                        <p className="text-white font-medium">
                            업체 마진이 아닌, <span className="text-emerald-400 font-bold">개인 소장의 마진</span>으로만 진행합니다.
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* 가로 스크롤 포트폴리오 */}
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="relative"
            >
                {/* 좌우 그라데이션 오버레이 */}
                <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-r from-neutral-950 to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-l from-neutral-950 to-transparent z-10 pointer-events-none" />

                {/* 스크롤 컨테이너 */}
                <div
                    ref={scrollRef}
                    className="flex gap-4 md:gap-6 overflow-x-hidden py-4"
                    style={{ scrollBehavior: "auto" }}
                >
                    {displayImages.map((src, index) => (
                        <div
                            key={`${src}-${index}`}
                            className="flex-shrink-0 relative h-[280px] md:h-[360px] w-[400px] md:w-[520px] rounded-lg overflow-hidden group"
                        >
                            <Image
                                src={src}
                                alt={`시공 포트폴리오 ${index + 1}`}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                sizes="(max-width: 768px) 400px, 520px"
                            />
                            {/* 호버 오버레이 */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* 하단 통계/신뢰 요소 */}
            <div className="w-full max-w-5xl mx-auto px-6 md:px-12 mt-12 md:mt-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.25, delay: 0.2 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
                >
                    {[
                        { value: "500+", label: "완료된 현장" },
                        { value: "10년+", label: "평균 경력" },
                        { value: "직접 소통", label: "중간 업체 없이" },
                        { value: "품질 보장", label: "A/S 책임제" },
                    ].map((stat, index) => (
                        <div
                            key={index}
                            className="text-center p-5 md:p-6 bg-white/5 backdrop-blur-sm border border-white/10"
                        >
                            <p className="font-mono text-2xl md:text-3xl font-black text-white tracking-tight">
                                {stat.value}
                            </p>
                            <p className="text-gray-400 text-sm mt-2">
                                {stat.label}
                            </p>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
