"use client";

import { useState, useCallback, useEffect } from "react";
import type { EstimateFile, ProcessingStatus } from "@/lib/supabase";
import AnalysisDetailModal from "./AnalysisDetailModal";

// 허용된 파일 형식
const ACCEPTED_FILE_TYPES = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-excel': 'xls',
    'text/csv': 'csv',
} as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface EstimateAnalysisProps {
    isDemoMode: boolean;
}

export default function EstimateAnalysis({ isDemoMode }: EstimateAnalysisProps) {
    // 상태
    const [files, setFiles] = useState<EstimateFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<EstimateFile | null>(null);
    const [parsedPreview, setParsedPreview] = useState<string | null>(null);
    const [loadingFiles, setLoadingFiles] = useState(true);

    // 초기 파일 목록 로드
    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            const response = await fetch('/api/admin/upload-estimate');
            if (response.ok) {
                const data = await response.json();
                setFiles(data.files || []);
            }
        } catch (error) {
            console.error('Failed to fetch files:', error);
        } finally {
            setLoadingFiles(false);
        }
    };

    // 드래그 앤 드롭 핸들러
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
        }
    };

    // 파일 업로드 처리
    const handleFileUpload = async (file: File) => {
        // 파일 형식 검증
        const fileType = ACCEPTED_FILE_TYPES[file.type as keyof typeof ACCEPTED_FILE_TYPES];
        if (!fileType) {
            alert('지원하지 않는 파일 형식입니다.\n지원 형식: PDF, XLSX, XLS, CSV');
            return;
        }

        // 파일 크기 검증
        if (file.size > MAX_FILE_SIZE) {
            alert('파일 크기가 10MB를 초과합니다.');
            return;
        }

        setUploading(true);
        setParsedPreview(null);

        try {
            // 항상 API 호출 (데모 모드에서도 파싱 테스트 가능)
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/admin/upload-estimate', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '파일 업로드에 실패했습니다.');
            }

            const data = await response.json();
            const uploadedFile = data.file;
            setFiles(prev => [uploadedFile, ...prev]);

            // 파싱 미리보기 표시
            if (data.parsed) {
                setParsedPreview(data.parsed.textPreview);
            }

            // ✅ 업로드 완료 후 자동으로 AI 분석 시작
            if (uploadedFile?.id) {
                // 상태 업데이트
                setFiles(prev => prev.map(f =>
                    f.id === uploadedFile.id
                        ? { ...f, processing_status: 'extracting' as ProcessingStatus }
                        : f
                ));

                try {
                    // PDF는 Base64로 인코딩해서 전달
                    let fileBuffer: string | undefined;
                    let mimeType: string | undefined;

                    if (file.type === 'application/pdf') {
                        const arrayBuffer = await file.arrayBuffer();
                        const uint8Array = new Uint8Array(arrayBuffer);
                        let binary = '';
                        for (let i = 0; i < uint8Array.length; i++) {
                            binary += String.fromCharCode(uint8Array[i]);
                        }
                        fileBuffer = btoa(binary);
                        mimeType = file.type;
                    }

                    const analyzeResponse = await fetch('/api/admin/analyze-estimate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fileId: uploadedFile.id,
                            fileBuffer,
                            mimeType,
                            parsedText: data.parsed?.type !== 'pdf' ? data.parsed?.textPreview : undefined,
                        }),
                    });

                    const analyzeData = await analyzeResponse.json();

                    if (!analyzeResponse.ok) {
                        throw new Error(analyzeData.error || 'AI 분석에 실패했습니다.');
                    }

                    // 성공 시 파일 상태 및 분석 결과 업데이트
                    setFiles(prev => prev.map(f =>
                        f.id === uploadedFile.id
                            ? {
                                ...f,
                                processing_status: 'reviewing' as ProcessingStatus,
                                // 분석 결과 저장 (확장 속성)
                                _analysisResult: {
                                    itemCount: analyzeData.itemCount,
                                    totalPrice: analyzeData.totalPrice,
                                    comparison: analyzeData.comparison,
                                }
                            } as EstimateFile & { _analysisResult?: unknown }
                            : f
                    ));

                    console.log('✅ AI 분석 완료:', analyzeData);
                } catch (analyzeErr) {
                    console.error('AI analysis error:', analyzeErr);
                    setFiles(prev => prev.map(f =>
                        f.id === uploadedFile.id
                            ? { ...f, processing_status: 'failed' as ProcessingStatus }
                            : f
                    ));
                    console.error('AI 분석 실패:', analyzeErr);
                }
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert(err instanceof Error ? err.message : '파일 업로드 중 오류가 발생했습니다.');
        } finally {
            setUploading(false);
        }
    };

    // 파일 처리 시작 (AI 분석)
    const handleProcessFile = async (fileId: string) => {
        // 해당 파일 상태 업데이트
        setFiles(prev => prev.map(f =>
            f.id === fileId
                ? { ...f, processing_status: 'extracting' as ProcessingStatus }
                : f
        ));

        try {
            const response = await fetch('/api/admin/analyze-estimate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileId,
                    parsedText: parsedPreview // 미리보기 텍스트 전달
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'AI 분석에 실패했습니다.');
            }

            // 성공 시 파일 상태 업데이트
            setFiles(prev => prev.map(f =>
                f.id === fileId
                    ? { ...f, processing_status: 'reviewing' as ProcessingStatus }
                    : f
            ));

            // 비교 분석 결과 알림
            const comp = data.comparison;
            const insights = comp?.insights?.slice(0, 3).join('\n') || '';
            alert(`✅ AI 분석 완료!\n\n📊 추출된 항목: ${data.itemCount}개\n💰 총 금액: ${data.totalPrice?.toLocaleString() || '알 수 없음'}원\n\n📈 ${comp?.summary || ''}\n\n${insights}`);
        } catch (err) {
            console.error('AI analysis error:', err);

            // 실패 시 상태 업데이트
            setFiles(prev => prev.map(f =>
                f.id === fileId
                    ? { ...f, processing_status: 'failed' as ProcessingStatus }
                    : f
            ));

            alert(err instanceof Error ? err.message : 'AI 분석 중 오류가 발생했습니다.');
        }
    };

    // 상태별 배지 색상 (다크모드)
    const getStatusBadge = (status: ProcessingStatus) => {
        const statusConfig: Record<ProcessingStatus, { label: string; color: string }> = {
            pending: { label: '대기 중', color: 'bg-gray-700 text-gray-300' },
            parsing: { label: '파싱 중', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
            extracting: { label: 'AI 추출 중', color: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
            reviewing: { label: '검토 필요', color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
            completed: { label: '완료', color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
            failed: { label: '실패', color: 'bg-red-500/20 text-red-400 border border-red-500/30' },
        };
        const config = statusConfig[status];
        return (
            <span className={`px-2 py-1 text-xs font-mono rounded ${config.color}`}>
                {config.label}
            </span>
        );
    };

    // 파일 크기 포맷
    const formatFileSize = (bytes: number | null | undefined) => {
        if (!bytes) return '-';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // 날짜 포맷
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div>
            {/* 통계 카드 - 다크모드 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white/5 backdrop-blur-xl p-6 border border-white/10 rounded-lg">
                    <p className="text-gray-500 text-xs font-mono mb-2">총 견적서</p>
                    <p className="text-3xl font-black text-white">{files.length}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl p-6 border border-white/10 rounded-lg">
                    <p className="text-gray-500 text-xs font-mono mb-2">분석 완료</p>
                    <p className="text-3xl font-black text-emerald-400">
                        {files.filter(f => f.processing_status === 'completed').length}
                    </p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl p-6 border border-white/10 rounded-lg">
                    <p className="text-gray-500 text-xs font-mono mb-2">검토 필요</p>
                    <p className="text-3xl font-black text-yellow-400">
                        {files.filter(f => f.processing_status === 'reviewing').length}
                    </p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl p-6 border border-white/10 rounded-lg">
                    <p className="text-gray-500 text-xs font-mono mb-2">평균 비교</p>
                    <p className="text-3xl font-black text-white">-</p>
                    <p className="text-xs text-gray-500 mt-1">데이터 수집 중</p>
                </div>
            </div>

            {/* 파일 업로드 영역 - 다크모드 */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-8 mb-8">
                <h2 className="text-lg font-bold mb-4 text-white">📁 견적서 업로드</h2>

                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${dragActive
                        ? 'border-white bg-white/10'
                        : 'border-white/20 hover:border-white/40'
                        }`}
                    onClick={() => document.getElementById('file-input')?.click()}
                >
                    <input
                        id="file-input"
                        type="file"
                        accept=".pdf,.xlsx,.xls,.csv"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={uploading}
                    />

                    {uploading ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full" />
                            <p className="text-gray-400">업로드 중...</p>
                        </div>
                    ) : (
                        <>
                            <div className="text-4xl mb-4">📄</div>
                            <p className="text-gray-400 mb-2">
                                PDF 또는 Excel 파일을 드래그하거나 클릭하여 선택하세요
                            </p>
                            <p className="text-gray-600 text-sm font-mono">
                                지원 형식: PDF, XLSX, XLS, CSV (최대 10MB)
                            </p>
                        </>
                    )}
                </div>

                {/* 파싱 미리보기 - 다크모드 */}
                {parsedPreview && (
                    <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-medium text-gray-300">📋 추출된 텍스트 미리보기</p>
                            <button
                                onClick={() => setParsedPreview(null)}
                                className="text-gray-500 hover:text-white text-sm transition-colors"
                            >
                                닫기
                            </button>
                        </div>
                        <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono bg-black/30 p-3 border border-white/10 rounded max-h-48 overflow-auto">
                            {parsedPreview}
                        </pre>
                    </div>
                )}
            </div>

            {/* 파일 목록 - 다크모드 */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h2 className="text-lg font-bold text-white">업로드된 견적서</h2>
                </div>

                {files.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <p>업로드된 견적서가 없습니다.</p>
                        <p className="text-sm mt-2">위의 업로드 영역을 사용하여 견적서를 추가하세요.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-white/5 text-left text-xs font-mono text-gray-500 uppercase">
                                    <th className="px-4 py-3">파일명</th>
                                    <th className="px-4 py-3">유형</th>
                                    <th className="px-4 py-3">크기</th>
                                    <th className="px-4 py-3">업로드</th>
                                    <th className="px-4 py-3">상태</th>
                                    <th className="px-4 py-3">분석 결과</th>
                                    <th className="px-4 py-3">액션</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {files.map((file) => (
                                    <tr key={file.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">
                                                    {file.file_type === 'pdf' ? '📕' : '📗'}
                                                </span>
                                                <span className="font-medium truncate max-w-xs text-white">
                                                    {file.file_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-sm uppercase text-gray-400">
                                                {file.file_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {formatFileSize(file.file_size)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {formatDate(file.uploaded_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {getStatusBadge(file.processing_status)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {(() => {
                                                // DB에서 가져온 분석 결과 사용
                                                const analysis = (file as EstimateFile & { analysis?: { comparison_percentage?: number; closest_grade?: string; price_difference?: number } }).analysis;
                                                // 또는 메모리에 저장된 결과 사용
                                                const memResult = (file as EstimateFile & { _analysisResult?: { comparison?: { percentage?: number; closestGrade?: string } } })._analysisResult;

                                                const pct = analysis?.comparison_percentage || memResult?.comparison?.percentage;
                                                const grade = analysis?.closest_grade || memResult?.comparison?.closestGrade;

                                                if (pct) {
                                                    const color = pct > 110 ? 'text-red-400' : pct < 90 ? 'text-blue-400' : 'text-emerald-400';
                                                    return (
                                                        <div className="text-sm">
                                                            <span className={`font-semibold ${color}`}>
                                                                표준 대비 {pct.toFixed(1)}%
                                                            </span>
                                                            {grade && (
                                                                <span className="ml-2 text-xs text-gray-500">
                                                                    ({grade})
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                                if (file.processing_status === 'extracting') {
                                                    return <span className="text-purple-400 text-sm">분석 중...</span>;
                                                }
                                                if (file.processing_status === 'reviewing') {
                                                    return <span className="text-yellow-400 text-sm">검토 필요</span>;
                                                }
                                                return <span className="text-gray-600 text-sm">-</span>;
                                            })()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                {(file.processing_status === 'pending' || file.processing_status === 'parsing') && (
                                                    <button
                                                        onClick={() => handleProcessFile(file.id)}
                                                        className="px-3 py-1 text-xs bg-white text-gray-900 rounded hover:bg-gray-200 transition-colors"
                                                    >
                                                        분석 시작
                                                    </button>
                                                )}
                                                {file.processing_status === 'reviewing' && (
                                                    <button
                                                        onClick={() => setSelectedFile(file)}
                                                        className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-400 transition-colors"
                                                    >
                                                        검토하기
                                                    </button>
                                                )}
                                                {file.processing_status === 'completed' && (
                                                    <button
                                                        onClick={() => setSelectedFile(file)}
                                                        className="px-3 py-1 text-xs border border-gray-700 text-gray-400 rounded hover:border-white hover:text-white transition-colors"
                                                    >
                                                        상세보기
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* 분석 결과 상세 모달 */}
            {selectedFile && (
                <AnalysisDetailModal
                    file={selectedFile}
                    onClose={() => setSelectedFile(null)}
                />
            )}
        </div>
    );
}
