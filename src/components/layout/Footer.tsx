import Link from "next/link";

export default function Footer() {
    return (
        <footer className="py-16 md:py-20 bg-black text-white">
            <div className="w-full max-w-6xl mx-auto px-6 md:px-12">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10 md:gap-8">
                    {/* Brand */}
                    <div className="space-y-3">
                        <h3 className="text-xl md:text-2xl font-black tracking-tight">
                            Standard Unit
                        </h3>
                        <p className="text-gray-500 text-sm md:text-base font-mono leading-relaxed">
                            아파트 인테리어 표준 견적 서비스
                        </p>
                    </div>

                    {/* Links */}
                    <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-8 md:gap-10 text-sm md:text-base font-mono">
                        <a
                            href="mailto:standardunit25@gmail.com"
                            className="text-gray-400 hover:text-white transition-colors duration-200"
                        >
                            standardunit25@gmail.com
                        </a>
                        <Link
                            href="#"
                            className="text-gray-400 hover:text-white transition-colors duration-200"
                        >
                            개인정보처리방침
                        </Link>
                        <Link
                            href="#"
                            className="text-gray-400 hover:text-white transition-colors duration-200"
                        >
                            이용약관
                        </Link>
                    </div>
                </div>

                {/* Bottom */}
                <div className="mt-16 pt-10 border-t border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm font-mono text-gray-500">
                    <p>© 2024 Standard Unit. All rights reserved.</p>
                    <p className="text-gray-600">데이터 기반 투명 견적</p>
                </div>
            </div>
        </footer>
    );
}
