"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ContractEntryPage() {
    const router = useRouter();
    const [accessCode, setAccessCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!accessCode.trim()) {
            setError("접근 코드를 입력해주세요.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 접근코드 검증
            const response = await fetch(`/api/contracts?access_code=${accessCode.trim()}`);
            const result = await response.json();

            if (result.success && result.data) {
                // 성공 - 계약 페이지로 이동
                router.push(`/contract/${accessCode.trim()}`);
            } else {
                setError("유효하지 않은 접근 코드입니다.\n다시 확인해주세요.");
            }
        } catch {
            setError("오류가 발생했습니다.\n잠시 후 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen min-h-[100dvh] bg-black flex flex-col">
            {/* 헤더 */}
            <header className="bg-black/80 backdrop-blur-xl text-white py-6 px-5 border-b border-white/10">
                <div className="max-w-sm mx-auto text-center">
                    <h1 className="text-2xl font-bold tracking-wide">Standard Unit</h1>
                    <p className="text-gray-400 text-sm mt-1">온라인 계약 시스템</p>
                </div>
            </header>

            {/* 메인 컨텐츠 */}
            <main className="flex-1 flex flex-col justify-center px-6 py-10">
                <div className="max-w-sm mx-auto w-full">
                    {/* 안내 */}
                    <div className="text-center mb-10">
                        <div className="text-6xl mb-5">🔐</div>
                        <h2 className="text-2xl font-bold text-white">
                            계약서 확인
                        </h2>
                        <p className="text-gray-400 mt-3 text-base leading-relaxed">
                            담당자에게 전달받은<br />접근 코드를 입력해주세요
                        </p>
                    </div>

                    {/* 입력 폼 */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={accessCode}
                                onChange={(e) => {
                                    setAccessCode(e.target.value);
                                    setError(null);
                                }}
                                placeholder="접근 코드 6자리"
                                maxLength={6}
                                className="w-full px-6 py-5 bg-white/10 border border-white/20 rounded-2xl text-white text-center text-3xl font-mono font-bold tracking-[0.5em] placeholder:text-gray-500 placeholder:text-lg placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all"
                                autoFocus
                            />
                        </div>

                        {/* 에러 메시지 */}
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-4 text-center">
                                <p className="text-red-400 text-base whitespace-pre-line">{error}</p>
                            </div>
                        )}

                        {/* 제출 버튼 */}
                        <button
                            type="submit"
                            disabled={loading || accessCode.length < 4}
                            className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-500 active:from-blue-500 active:to-blue-400 text-white rounded-2xl transition-all font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-3">
                                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                                    확인 중...
                                </span>
                            ) : (
                                "확인"
                            )}
                        </button>
                    </form>

                    {/* 도움말 */}
                    <div className="mt-10 text-center">
                        <p className="text-gray-500 text-sm">
                            접근 코드를 받지 못하셨나요?
                        </p>
                        <a
                            href="https://open.kakao.com/o/sLPdwe7h"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-2 text-blue-400 text-base font-medium active:text-blue-300"
                        >
                            💬 카카오톡으로 문의하기
                        </a>
                    </div>
                </div>
            </main>

            {/* 푸터 */}
            <footer className="py-6 text-center">
                <p className="text-gray-600 text-sm">
                    © Standard Unit Interior
                </p>
            </footer>
        </div>
    );
}
