"use client";

import { useState, useRef } from "react";
import { Floorplan, FloorplanAnalysisResult, ROOM_TYPE_LABELS } from "@/types/quote";

interface FloorplanUploadProps {
    estimateId: number;
    propertySize?: number; // 전용면적 (㎡)
    onUploadComplete?: (floorplan: Floorplan) => void;
    onAnalysisComplete?: (result: FloorplanAnalysisResult) => void;
}

export default function FloorplanUpload({
    estimateId,
    propertySize,
    onUploadComplete,
    onAnalysisComplete
}: FloorplanUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [floorplan, setFloorplan] = useState<Floorplan | null>(null);
    const [analysisResult, setAnalysisResult] = useState<FloorplanAnalysisResult | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // 파일 선택 핸들러
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 미리보기 URL 생성
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setError(null);
        setAnalysisResult(null);

        // 파일 업로드
        await uploadFile(file);
    };

    // 파일 업로드
    const uploadFile = async (file: File) => {
        try {
            setUploading(true);
            setError(null);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('estimate_id', estimateId.toString());

            const response = await fetch('/api/floorplan', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || '업로드 실패');
            }

            setFloorplan(result.data);
            onUploadComplete?.(result.data);

            // 자동 분석 시작
            await analyzeFloorplan(result.data.id);

        } catch (err) {
            setError(err instanceof Error ? err.message : '업로드에 실패했습니다.');
        } finally {
            setUploading(false);
        }
    };

    // 도면 분석
    const analyzeFloorplan = async (floorplanId: string) => {
        try {
            setAnalyzing(true);
            setError(null);

            const response = await fetch('/api/floorplan/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    floorplan_id: floorplanId,
                    property_size: propertySize // 전용면적 정보 전달
                }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || '분석 실패');
            }

            setAnalysisResult(result.data);
            onAnalysisComplete?.(result.data);

        } catch (err) {
            setError(err instanceof Error ? err.message : '도면 분석에 실패했습니다.');
        } finally {
            setAnalyzing(false);
        }
    };

    // 드래그 앤 드롭
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            uploadFile(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // 금액 포맷
    const formatArea = (area: number) => {
        return `${area.toFixed(1)}㎡ (${(area / 3.3).toFixed(1)}평)`;
    };

    return (
        <div className="space-y-6">
            {/* 업로드 영역 */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={`
                    relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                    transition-all duration-200
                    ${uploading || analyzing
                        ? 'border-blue-500/50 bg-blue-500/5'
                        : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                    }
                `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {previewUrl ? (
                    <div className="relative">
                        <img
                            src={previewUrl}
                            alt="도면 미리보기"
                            className="max-h-64 mx-auto rounded-lg"
                        />
                        {(uploading || analyzing) && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                                <div className="text-center">
                                    <div className="animate-spin h-10 w-10 border-4 border-white border-t-transparent rounded-full mx-auto mb-3" />
                                    <p className="text-white font-medium">
                                        {uploading ? '업로드 중...' : '도면 분석 중...'}
                                    </p>
                                    {analyzing && (
                                        <p className="text-white/70 text-sm mt-1">
                                            AI가 도면을 분석하고 있습니다
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-8">
                        <div className="text-5xl mb-4">📐</div>
                        <p className="text-white font-medium mb-2">
                            도면 이미지를 드래그하거나 클릭하여 업로드
                        </p>
                        <p className="text-gray-400 text-sm">
                            PNG, JPG, WEBP, PDF 형식 지원 (최대 10MB)
                        </p>
                    </div>
                )}
            </div>

            {/* 에러 메시지 */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                    <p className="font-medium">⚠️ 오류 발생</p>
                    <p className="text-sm mt-1">{error}</p>
                    <button
                        onClick={() => floorplan && analyzeFloorplan(floorplan.id)}
                        className="mt-2 text-sm underline hover:no-underline"
                    >
                        다시 분석하기
                    </button>
                </div>
            )}

            {/* 분석 결과 */}
            {analysisResult && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            ✅ 도면 분석 완료
                        </h3>
                        <span className="text-sm text-gray-400">
                            신뢰도: {Math.round((analysisResult.confidence || 0.7) * 100)}%
                        </span>
                    </div>

                    {/* 전체 면적 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 p-4 rounded-lg">
                            <p className="text-gray-400 text-sm mb-1">전체 면적</p>
                            <p className="text-xl font-bold text-white">
                                {formatArea(analysisResult.totalArea)}
                            </p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-lg">
                            <p className="text-gray-400 text-sm mb-1">바닥 면적</p>
                            <p className="text-xl font-bold text-white">
                                {analysisResult.calculations.floorArea?.toFixed(1)}㎡
                            </p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-lg">
                            <p className="text-gray-400 text-sm mb-1">벽면 면적</p>
                            <p className="text-xl font-bold text-white">
                                {analysisResult.calculations.wallArea?.toFixed(1)}㎡
                            </p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-lg">
                            <p className="text-gray-400 text-sm mb-1">공간 수</p>
                            <p className="text-xl font-bold text-white">
                                {analysisResult.rooms.length}개
                            </p>
                        </div>
                    </div>

                    {/* 공간별 상세 */}
                    <div>
                        <h4 className="text-white font-medium mb-3">🏠 공간별 분석</h4>
                        <div className="grid gap-2">
                            {analysisResult.rooms.map((room, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between bg-white/5 px-4 py-3 rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">
                                            {room.type === 'bedroom' ? '🛏️' :
                                                room.type === 'living' ? '🛋️' :
                                                    room.type === 'kitchen' ? '🍳' :
                                                        room.type === 'bathroom' ? '🚿' :
                                                            room.type === 'balcony' ? '🌅' : '📦'}
                                        </span>
                                        <div>
                                            <p className="text-white font-medium">{room.name}</p>
                                            <p className="text-gray-400 text-sm">
                                                {ROOM_TYPE_LABELS[room.type] || room.type}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-mono">{room.area.toFixed(1)}㎡</p>
                                        <p className="text-gray-400 text-sm">
                                            {room.width}×{room.height}mm
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 예상 자재 */}
                    {analysisResult.estimatedMaterials && analysisResult.estimatedMaterials.length > 0 && (
                        <div>
                            <h4 className="text-white font-medium mb-3">🧱 예상 자재 수량</h4>
                            <div className="bg-white/5 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-gray-400">카테고리</th>
                                            <th className="px-4 py-2 text-left text-gray-400">항목</th>
                                            <th className="px-4 py-2 text-right text-gray-400">수량</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {analysisResult.estimatedMaterials.map((material, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-2 text-gray-400">{material.category}</td>
                                                <td className="px-4 py-2 text-white">{material.item}</td>
                                                <td className="px-4 py-2 text-right text-white font-mono">
                                                    {material.quantity} {material.unit}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 분석 참고사항 */}
                    {analysisResult.analysisNotes && (
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-yellow-400 text-sm">
                                💡 {analysisResult.analysisNotes}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
