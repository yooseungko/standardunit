"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface TickerItem {
    label: string;
    value: number;
    suffix: string;
    isTime?: boolean;
}

const baseData: TickerItem[] = [
    { label: "분석 중인 견적서", value: 23, suffix: "건" },
    { label: "비교 중인 자재 옵션", value: 847, suffix: "개" },
    { label: "계산된 면적 측정값", value: 1847293, suffix: " points" },
    { label: "평균 견적 생성 시간", value: 157, suffix: "초", isTime: true },
    { label: "데이터베이스 시공 사례", value: 3847, suffix: "건" },
];

function formatNumber(num: number): string {
    return num.toLocaleString('ko-KR');
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs}초`;
}

export default function GeekTicker() {
    const [data, setData] = useState(baseData);
    const [lastUpdate, setLastUpdate] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setData(prev => prev.map(item => ({
                ...item,
                value: item.value + Math.floor(Math.random() * 3),
            })));
            setLastUpdate(0);
        }, 5000);

        const updateTimer = setInterval(() => {
            setLastUpdate(prev => prev + 1);
        }, 1000);

        return () => {
            clearInterval(interval);
            clearInterval(updateTimer);
        };
    }, []);

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
                            Geek Section 05
                        </p>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-5 tracking-tight leading-tight">
                            지금 이 순간도
                            <br />
                            Standard Unit은 아파트에 집착합니다
                        </h2>
                    </div>

                    {/* Ticker */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="bg-black text-white p-8 md:p-12 lg:p-14"
                    >
                        <div className="space-y-0">
                            {data.map((item, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: index * 0.1 }}
                                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-8 py-6 md:py-7 border-b border-gray-800 last:border-0"
                                >
                                    <span className="text-gray-400 font-mono text-sm md:text-base tracking-wide">
                                        {item.label}
                                    </span>
                                    <span className="font-mono text-3xl md:text-4xl lg:text-5xl font-black animate-ticker text-white tracking-tight">
                                        {item.isTime
                                            ? formatTime(item.value)
                                            : formatNumber(item.value) + item.suffix}
                                    </span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Last Update */}
                        <div className="mt-10 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-gray-400 font-mono text-sm tracking-wider">LIVE</span>
                            </div>
                            <span className="text-gray-500 font-mono text-sm">
                                마지막 업데이트: {lastUpdate}초 전
                            </span>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
