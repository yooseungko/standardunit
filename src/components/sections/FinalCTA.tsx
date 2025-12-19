"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function FinalCTA() {
    const [formData, setFormData] = useState({
        complexName: "",
        size: "",
        floorType: "",
        name: "",
        phone: "",
        email: "",
        wantsConstruction: false,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/estimates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '견적 요청에 실패했습니다.');
            }

            setIsSubmitted(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <section id="cta" className="py-28 md:py-36 lg:py-44 bg-gray-50">
                <div className="w-full max-w-2xl mx-auto px-6 md:px-12 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white p-12 md:p-16 border border-gray-200"
                    >
                        <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-8">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight mb-4">
                            견적 요청이 완료되었습니다
                        </h2>
                        <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                            담당자가 24시간 내에 연락드리겠습니다.
                            <br />
                            빠른 상담을 원하시면 카카오톡으로 문의해주세요.
                        </p>
                        <a
                            href="https://open.kakao.com/o/sLPdwe7h"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 mt-8 px-8 py-4 bg-[#FEE500] text-[#000000] font-bold text-lg rounded-lg hover:bg-[#FDD835] transition-colors"
                        >
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.82 5.31 4.54 6.72l-.92 3.42c-.08.3.25.55.52.4l4.04-2.34c.59.08 1.19.12 1.82.12 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
                            </svg>
                            카카오톡 상담하기
                        </a>
                    </motion.div>
                </div>
            </section>
        );
    }

    return (
        <section id="cta" className="py-28 md:py-36 lg:py-44 bg-gray-50">
            <div className="w-full max-w-4xl mx-auto px-6 md:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Headline */}
                    <div className="text-center mb-12 md:mb-16">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight tracking-tight">
                            당신의 아파트,
                            <br />
                            정확히 계산하겠습니다.
                        </h2>
                        <p className="mt-6 text-lg md:text-xl text-gray-500">
                            3분이면 표준 견적을 받아보실 수 있습니다
                        </p>
                    </div>

                    {/* Form */}
                    <motion.form
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        onSubmit={handleSubmit}
                        className="bg-white p-8 md:p-12 border border-gray-200"
                    >
                        {/* 아파트 정보 */}
                        <div className="mb-10">
                            <h3 className="font-mono text-sm text-gray-400 mb-6 tracking-widest uppercase">
                                아파트 정보
                            </h3>
                            <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                                <div>
                                    <label htmlFor="complexName" className="block text-sm font-medium text-gray-700 mb-2">
                                        단지명 *
                                    </label>
                                    <input
                                        type="text"
                                        id="complexName"
                                        name="complexName"
                                        required
                                        placeholder="예: 래미안 퍼스티지"
                                        value={formData.complexName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-4 border border-gray-300 text-base focus:outline-none focus:border-black transition-colors"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-2">
                                        평형 <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            id="size"
                                            name="size"
                                            required
                                            min="15"
                                            max="100"
                                            placeholder="예: 32"
                                            value={formData.size}
                                            onChange={handleChange}
                                            className="w-full px-4 py-4 border border-gray-300 text-base focus:outline-none focus:border-black transition-colors"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">평</span>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-400">전용면적 기준 (15~100평)</p>
                                </div>
                                <div>
                                    <label htmlFor="floorType" className="block text-sm font-medium text-gray-700 mb-2">
                                        평면 타입 (선택)
                                    </label>
                                    <input
                                        type="text"
                                        id="floorType"
                                        name="floorType"
                                        placeholder="예: A타입, 3-B-02"
                                        value={formData.floorType}
                                        onChange={handleChange}
                                        className="w-full px-4 py-4 border border-gray-300 text-base focus:outline-none focus:border-black transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 연락처 정보 */}
                        <div className="mb-10 pt-8 border-t border-gray-100">
                            <h3 className="font-mono text-sm text-gray-400 mb-6 tracking-widest uppercase">
                                연락처 정보
                            </h3>
                            <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                        성함 *
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        required
                                        placeholder="홍길동"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full px-4 py-4 border border-gray-300 text-base focus:outline-none focus:border-black transition-colors"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                                        연락처 *
                                    </label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        required
                                        placeholder="010-0000-0000"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full px-4 py-4 border border-gray-300 text-base focus:outline-none focus:border-black transition-colors"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                        이메일 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        required
                                        placeholder="email@example.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full px-4 py-4 border border-gray-300 text-base focus:outline-none focus:border-black transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 시공 의뢰 옵션 */}
                        <div className="mb-10 pt-8 border-t border-gray-100">
                            <label className="flex items-start gap-4 cursor-pointer group">
                                <div className="relative flex-shrink-0 mt-1">
                                    <input
                                        type="checkbox"
                                        name="wantsConstruction"
                                        checked={formData.wantsConstruction}
                                        onChange={(e) => setFormData(prev => ({ ...prev, wantsConstruction: e.target.checked }))}
                                        className="sr-only peer"
                                    />
                                    <div className="w-6 h-6 border-2 border-gray-300 peer-checked:border-black peer-checked:bg-black transition-all duration-200 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                                <div>
                                    <p className="font-bold text-lg group-hover:text-black transition-colors">
                                        견적 확인 후 시공도 의뢰하고 싶어요
                                    </p>
                                    <p className="text-gray-500 text-sm mt-1">
                                        검증된 파트너 시공사를 매칭해드립니다. 가격 보장 계약으로 추가 비용 걱정 없이 진행하세요.
                                    </p>
                                </div>
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-5 md:py-6 text-lg md:text-xl font-bold flex items-center justify-center gap-3 transition-all duration-300 ${isSubmitting
                                ? "bg-gray-400 text-white cursor-not-allowed"
                                : "bg-black text-white hover:bg-gray-800"
                                }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    견적 요청 중...
                                </>
                            ) : (
                                <>
                                    표준 견적 받기
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </>
                            )}
                        </button>

                        {/* Privacy Notice */}
                        <p className="mt-6 text-center text-sm text-gray-400">
                            제출 시 <a href="#" className="underline hover:text-gray-600">개인정보처리방침</a>에 동의하는 것으로 간주됩니다.
                        </p>
                    </motion.form>

                    {/* Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="mt-12 grid md:grid-cols-3 gap-6 text-center"
                    >
                        <div className="p-6 bg-white border border-gray-200">
                            <p className="font-mono text-3xl md:text-4xl font-black text-black">3분</p>
                            <p className="text-sm text-gray-500 mt-2">소요 시간</p>
                        </div>
                        <div className="p-6 bg-white border border-gray-200">
                            <p className="font-mono text-3xl md:text-4xl font-black text-black">24H</p>
                            <p className="text-sm text-gray-500 mt-2">견적 회신</p>
                        </div>
                        <div className="p-6 bg-white border border-gray-200">
                            <p className="font-mono text-3xl md:text-4xl font-black text-black">무료</p>
                            <p className="text-sm text-gray-500 mt-2">상담 비용</p>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
