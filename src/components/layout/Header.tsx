"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function Header() {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <AnimatePresence>
            <motion.header
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5 }}
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
                        ? "bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm"
                        : "bg-transparent"
                    }`}
            >
                <div className="w-full max-w-6xl mx-auto px-6 md:px-12">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        {/* Logo */}
                        <Link href="/" className="flex items-center py-4">
                            <span className="text-lg md:text-xl font-black tracking-tight">
                                Standard Unit
                            </span>
                        </Link>

                        {/* CTA */}
                        <a
                            href="#cta"
                            className="hidden md:inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold bg-black text-white hover:bg-gray-800 transition-all duration-200"
                        >
                            견적 받기
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </a>

                        {/* Mobile Menu Button */}
                        <a
                            href="#cta"
                            className="md:hidden px-5 py-2.5 bg-black text-white text-sm font-semibold"
                        >
                            견적 받기
                        </a>
                    </div>
                </div>
            </motion.header>
        </AnimatePresence>
    );
}
