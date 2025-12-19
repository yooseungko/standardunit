import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { EstimateFile, ProcessingStatus } from '@/lib/supabase';
import { storeFileData } from '@/app/api/admin/analyze-estimate/route';

// 허용된 파일 형식
const ALLOWED_TYPES: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-excel': 'xls',
    'text/csv': 'csv',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// 데모 모드 데이터 저장 (메모리)
const demoFiles: Map<string, EstimateFile & { parsedText?: string; fileBuffer?: string }> = new Map();

// 파싱된 텍스트 임시 저장 (AI 분석 시 사용, 메모리)
const parsedTextStorage: Map<string, string> = new Map();

// 외부에서 접근할 수 있도록 export
export function getParsedText(fileId: string): string | undefined {
    return parsedTextStorage.get(fileId);
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const apartmentName = formData.get('apartmentName') as string | null;
        const apartmentSize = formData.get('apartmentSize') as string | null;

        if (!file) {
            return NextResponse.json(
                { error: '파일이 없습니다.' },
                { status: 400 }
            );
        }

        // 파일 형식 검증
        const fileType = ALLOWED_TYPES[file.type];
        if (!fileType) {
            return NextResponse.json(
                { error: '지원하지 않는 파일 형식입니다. (PDF, XLSX, XLS, CSV만 지원)' },
                { status: 400 }
            );
        }

        // 파일 크기 검증
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: '파일 크기가 10MB를 초과합니다.' },
                { status: 400 }
            );
        }

        // 파일을 Buffer로 변환
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 파일 파싱 (PDF는 Gemini Vision으로 처리하므로 텍스트 추출 건너뜀)
        let processedText = '';
        let parseMetadata: Record<string, unknown> = {};

        if (fileType === 'pdf') {
            // PDF는 Gemini Vision으로 직접 분석 (파싱 스킵)
            processedText = '[PDF 파일 - AI 분석 시 Gemini Vision 사용]';
            parseMetadata = { type: 'pdf', note: 'Gemini Vision 분석 대기' };
        } else {
            // Excel/CSV는 기존 방식으로 텍스트 추출
            try {
                const { parseFile, preprocessEstimateText } = await import('@/lib/fileParser');
                const parsedResult = await parseFile(buffer, fileType);
                processedText = preprocessEstimateText(parsedResult.rawText);
                parseMetadata = parsedResult.metadata;
            } catch (parseError) {
                console.error('File parsing error:', parseError);
                return NextResponse.json(
                    { error: '파일 파싱 중 오류가 발생했습니다.' },
                    { status: 500 }
                );
            }
        }

        // Supabase가 설정되어 있으면 DB에 저장
        // 💡 스토리지 비용 절감: 원본 파일은 저장하지 않음
        // 파싱된 텍스트와 메타데이터만 DB에 저장
        if (isSupabaseConfigured && supabase) {
            // estimate_files 테이블에 레코드 저장 (원본 파일 URL 없음)
            const { data: fileRecord, error: dbError } = await supabase
                .from('estimate_files')
                .insert({
                    file_name: file.name,
                    file_type: fileType,
                    file_url: null, // 원본 파일 저장하지 않음
                    file_size: file.size,
                    processing_status: 'parsing' as ProcessingStatus,
                    apartment_name: apartmentName || null,
                    apartment_size: apartmentSize ? parseInt(apartmentSize) : null,
                    // 추출된 텍스트는 parsed_text 컬럼에 저장 (스키마에 없으면 무시됨)
                })
                .select()
                .single();

            if (dbError) {
                console.error('DB insert error:', dbError);
                return NextResponse.json(
                    { error: '데이터베이스 저장 중 오류가 발생했습니다.' },
                    { status: 500 }
                );
            }

            // 파일 데이터를 메모리에 임시 저장 (AI 분석 시 사용)
            if (fileRecord?.id) {
                if (fileType === 'pdf') {
                    // PDF는 원본 버퍼 저장 (Gemini Vision용)
                    storeFileData(fileRecord.id, buffer, file.type);
                } else {
                    // Excel/CSV는 텍스트 저장
                    parsedTextStorage.set(fileRecord.id, processedText);
                }
            }

            return NextResponse.json({
                success: true,
                file: fileRecord,
                parsed: {
                    type: fileType,
                    textLength: processedText.length,
                    textPreview: processedText.substring(0, 500) + (processedText.length > 500 ? '...' : ''),
                    metadata: parseMetadata,
                },
            });
        } else {
            // 데모 모드: 메모리에 저장
            const fileId = `demo-${Date.now()}`;
            const currentTime = new Date().toISOString();
            const demoFile: EstimateFile & { parsedText?: string } = {
                id: fileId,
                file_name: file.name,
                file_type: fileType as EstimateFile['file_type'],
                file_url: null,
                file_size: file.size,
                uploaded_at: currentTime,
                processed: false,
                processing_status: 'parsing' as ProcessingStatus,
                error_message: null,
                request_id: null,
                apartment_name: apartmentName || null,
                apartment_size: apartmentSize ? parseInt(apartmentSize) : null,
                submitted_by: null,
                created_at: currentTime,
                updated_at: currentTime,
                parsedText: processedText,
            };

            demoFiles.set(fileId, demoFile);

            return NextResponse.json({
                success: true,
                file: demoFile,
                parsed: {
                    type: fileType,
                    textLength: processedText.length,
                    textPreview: processedText.substring(0, 500) + (processedText.length > 500 ? '...' : ''),
                    metadata: parseMetadata,
                },
                demoMode: true,
            });
        }
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: '파일 업로드 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

// 데모 모드에서 파일 목록 조회
export async function GET() {
    if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
            .from('estimate_files')
            .select(`
                *,
                estimate_analysis (
                    comparison_percentage,
                    closest_grade,
                    price_difference,
                    total_extracted_price,
                    analysis_summary
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 분석 결과를 파일 객체에 포함
        // Supabase에서 1:1 관계는 객체, 1:N은 배열로 반환
        const filesWithAnalysis = data?.map(file => {
            const analysisData = file.estimate_analysis;
            return {
                ...file,
                analysis: Array.isArray(analysisData)
                    ? analysisData[0] || null
                    : analysisData || null,
            };
        }) || [];


        return NextResponse.json({ files: filesWithAnalysis });
    } else {
        // 데모 모드
        const files = Array.from(demoFiles.values()).map(({ parsedText, ...file }) => file);
        return NextResponse.json({ files, demoMode: true });
    }
}
