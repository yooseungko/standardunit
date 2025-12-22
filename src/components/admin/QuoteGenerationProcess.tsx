"use client";

import { useState } from "react";
import { FloorplanAnalysisResult } from "@/types/quote";
import FloorplanUpload from "./FloorplanUpload";
import QuoteEditor from "./QuoteEditor";

interface QuoteGenerationProcessProps {
    estimateId: number;
    customerName: string;
    customerEmail: string;
    propertySize?: number;
    onClose: () => void;
    onComplete?: () => void;
}

export default function QuoteGenerationProcess({
    estimateId,
    customerName,
    customerEmail,
    propertySize,
    onClose,
    onComplete,
}: QuoteGenerationProcessProps) {
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
    const [floorplanId, setFloorplanId] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<FloorplanAnalysisResult | null>(null);
    const [manualMode, setManualMode] = useState(false); // 도면 없이 수동 모드

    const steps = [
        { number: 1, title: '도면 업로드', description: '도면 이미지를 업로드합니다' },
        { number: 2, title: 'AI 분석', description: 'AI가 도면을 분석합니다' },
        { number: 3, title: '견적서 발송', description: '견적서를 확인하고 발송합니다' },
    ];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-6xl my-8">
                {/* 헤더 */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            견적서 생성 프로세스
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">
                            {customerName}님 ({customerEmail})
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* 스텝 인디케이터 */}
                <div className="px-6 py-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <div key={step.number} className="flex items-center">
                                <div className="flex items-center">
                                    <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center font-bold
                                        transition-colors duration-300
                                        ${currentStep >= step.number
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white/10 text-gray-500'
                                        }
                                        ${currentStep === step.number ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900' : ''}
                                    `}>
                                        {currentStep > step.number ? '✓' : step.number}
                                    </div>
                                    <div className="ml-3 hidden sm:block">
                                        <p className={`font-medium ${currentStep >= step.number ? 'text-white' : 'text-gray-500'
                                            }`}>
                                            {step.title}
                                        </p>
                                        <p className="text-xs text-gray-500">{step.description}</p>
                                    </div>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`
                                        w-12 sm:w-24 h-0.5 mx-4
                                        ${currentStep > step.number ? 'bg-blue-600' : 'bg-white/10'}
                                    `} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 컨텐츠 */}
                <div className="p-6">
                    {/* 스텝 1: 도면 업로드 */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <h3 className="text-lg font-bold text-white mb-2">
                                    📐 도면 업로드
                                </h3>
                                <p className="text-gray-400">
                                    아파트/주택 평면도 이미지를 업로드해주세요.
                                    <br />
                                    AI가 자동으로 분석하여 견적서를 생성합니다.
                                </p>
                            </div>

                            <FloorplanUpload
                                estimateId={estimateId}
                                propertySize={propertySize}
                                onUploadComplete={(floorplan) => {
                                    setFloorplanId(floorplan.id);
                                    setCurrentStep(2);
                                }}
                                onAnalysisComplete={(result) => {
                                    setAnalysisResult(result);
                                    setCurrentStep(3);
                                }}
                            />

                            {/* 도면 없이 진행 */}
                            <div className="text-center pt-4 border-t border-white/10">
                                <button
                                    onClick={() => {
                                        setManualMode(true);
                                        setCurrentStep(3);
                                    }}
                                    className="text-gray-400 hover:text-white text-sm underline"
                                >
                                    도면 없이 수동으로 견적 작성하기 →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 스텝 2: AI 분석 중 (자동 전환됨) */}
                    {currentStep === 2 && (
                        <div className="text-center py-12">
                            <div className="animate-spin h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6" />
                            <h3 className="text-lg font-bold text-white mb-2">
                                🤖 AI가 도면을 분석하고 있습니다
                            </h3>
                            <p className="text-gray-400">
                                공간 치수와 자재 수량을 계산하고 있습니다...
                            </p>
                        </div>
                    )}

                    {/* 스텝 3: 견적서 편집 및 발송 */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <h3 className="text-lg font-bold text-white mb-2">
                                    📋 견적서 확인 및 발송
                                </h3>
                                <p className="text-gray-400">
                                    견적 항목을 확인하고 필요시 수정한 후 발송해주세요.
                                </p>
                            </div>

                            <QuoteEditor
                                estimateId={estimateId}
                                floorplanId={floorplanId || undefined}
                                analysisResult={analysisResult}
                                manualMode={manualMode}
                                onQuoteSent={() => {
                                    onComplete?.();
                                    onClose();
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* 푸터 네비게이션 */}
                <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
                    <button
                        onClick={() => {
                            if (currentStep > 1) {
                                setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
                            } else {
                                onClose();
                            }
                        }}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                        ← {currentStep === 1 ? '취소' : '이전'}
                    </button>

                    <div className="text-gray-500 text-sm">
                        {propertySize && `${propertySize}㎡ (${(propertySize / 3.3).toFixed(1)}평)`}
                    </div>
                </div>
            </div>
        </div>
    );
}
