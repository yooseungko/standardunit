"use client";

import { useRef, useState, useEffect } from "react";

interface SignaturePadProps {
    onSave: (signatureData: string) => void;
    onCancel: () => void;
    width?: number;
    height?: number;
}

export default function SignaturePad({
    onSave,
    onCancel,
    width = 300,
    height = 150,
}: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width, height });

    // 컨테이너 크기에 맞게 캔버스 조정
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.offsetWidth;
                const aspectRatio = height / width;
                const newWidth = Math.min(containerWidth, 400); // 최대 400px
                const newHeight = newWidth * aspectRatio;
                setCanvasSize({ width: newWidth, height: newHeight });
            }
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [width, height]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 캔버스 초기화
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3; // 모바일에서 더 두꺼운 선
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, [canvasSize]);

    const getPosition = (e: React.TouchEvent | React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        if ('touches' in e) {
            const touch = e.touches[0];
            return {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY,
            };
        } else {
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY,
            };
        }
    };

    const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        setHasSignature(true);

        const pos = getPosition(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isDrawing) return;
        e.preventDefault();

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        const pos = getPosition(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const saveSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasSignature) return;

        const dataUrl = canvas.toDataURL('image/png');
        onSave(dataUrl);
    };

    return (
        <div ref={containerRef} className="w-full">
            {/* 안내 문구 */}
            <p className="text-gray-600 text-base mb-4 text-center font-medium">
                아래 영역에 서명해 주세요
            </p>

            {/* 서명 캔버스 */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white mb-5">
                <canvas
                    ref={canvasRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    className="w-full touch-none bg-white"
                    style={{
                        height: canvasSize.height,
                        touchAction: 'none'
                    }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </div>

            {/* 버튼 그룹 */}
            <div className="grid grid-cols-3 gap-3">
                <button
                    onClick={clearCanvas}
                    className="py-4 bg-gray-200 active:bg-gray-300 text-gray-700 rounded-xl transition-colors text-base font-medium"
                >
                    다시 쓰기
                </button>
                <button
                    onClick={onCancel}
                    className="py-4 bg-gray-200 active:bg-gray-300 text-gray-700 rounded-xl transition-colors text-base font-medium"
                >
                    취소
                </button>
                <button
                    onClick={saveSignature}
                    disabled={!hasSignature}
                    className="py-4 bg-blue-600 active:bg-blue-500 text-white rounded-xl transition-colors text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    완료
                </button>
            </div>

            {/* 터치 힌트 */}
            {!hasSignature && (
                <p className="text-gray-400 text-sm text-center mt-4">
                    ☝️ 손가락으로 서명해 주세요
                </p>
            )}
        </div>
    );
}
