import { NextRequest, NextResponse } from 'next/server';
import { extractEstimateItems, extractFromDocument, isGeminiConfigured } from '@/lib/aiExtractor';
import { analyzeEstimate, toEstimateAnalysis } from '@/lib/estimateAnalyzer';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ProcessingStatus } from '@/lib/supabase';

// 파일 데이터 메모리 저장 (PDF Vision 분석용)
const fileDataStorage: Map<string, { buffer: Buffer; mimeType: string }> = new Map();

// 파일 데이터 저장 함수 (upload-estimate에서 호출)
export function storeFileData(fileId: string, buffer: Buffer, mimeType: string) {
    fileDataStorage.set(fileId, { buffer, mimeType });
}

// 파싱된 텍스트 저장 (Excel/CSV용)
const parsedTextStorage: Map<string, string> = new Map();

export function storeParsedText(fileId: string, text: string) {
    parsedTextStorage.set(fileId, text);
}

// POST: AI 분석 시작
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { fileId, parsedText, fileBuffer, mimeType } = body;

        if (!fileId) {
            return NextResponse.json(
                { error: 'fileId가 필요합니다.' },
                { status: 400 }
            );
        }

        // Gemini API 확인
        if (!isGeminiConfigured()) {
            return NextResponse.json(
                { error: 'GOOGLE_AI_API_KEY가 설정되지 않았습니다. .env.local에 추가해주세요.' },
                { status: 500 }
            );
        }

        // 파일 상태 업데이트
        if (isSupabaseConfigured && supabase) {
            await supabase
                .from('estimate_files')
                .update({ processing_status: 'extracting' as ProcessingStatus })
                .eq('id', fileId);
        }

        // AI 추출 실행
        try {
            let extractedData;

            // 1. Base64로 전달된 파일 데이터가 있으면 Vision API 사용
            if (fileBuffer && mimeType) {
                const buffer = Buffer.from(fileBuffer, 'base64');
                extractedData = await extractFromDocument(buffer, mimeType);
            }
            // 2. 메모리에 저장된 파일 데이터 확인 (PDF)
            else if (fileDataStorage.has(fileId)) {
                const fileData = fileDataStorage.get(fileId)!;
                extractedData = await extractFromDocument(fileData.buffer, fileData.mimeType);
                fileDataStorage.delete(fileId); // 사용 후 삭제
            }
            // 3. 텍스트가 있으면 텍스트 기반 분석
            else if (parsedText || parsedTextStorage.has(fileId)) {
                const textToAnalyze = parsedText || parsedTextStorage.get(fileId)!;
                extractedData = await extractEstimateItems(textToAnalyze);
                parsedTextStorage.delete(fileId);
            }
            // 4. 분석할 데이터 없음
            else {
                return NextResponse.json(
                    { error: '분석할 데이터가 없습니다. 파일을 다시 업로드해주세요.' },
                    { status: 400 }
                );
            }

            // Supabase에 결과 저장
            if (isSupabaseConfigured && supabase) {
                // 1. 파일 상태 업데이트
                await supabase
                    .from('estimate_files')
                    .update({
                        processing_status: 'reviewing' as ProcessingStatus,
                        apartment_name: extractedData.apartment_name || null,
                        apartment_size: extractedData.apartment_size || null,
                    })
                    .eq('id', fileId);

                // 2. 추출된 항목 저장
                if (extractedData.items && extractedData.items.length > 0) {
                    const itemsToInsert = extractedData.items.map(item => ({
                        file_id: fileId,
                        category: item.category,
                        sub_category: item.sub_category,
                        detail_category: item.detail_category,
                        original_item_name: item.original_item_name,
                        normalized_item_name: item.normalized_item_name,
                        brand: item.brand,
                        model: item.model,
                        product_grade: item.product_grade,
                        unit: item.unit,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        total_price: item.total_price,
                        confidence_score: item.confidence_score,
                        ai_reasoning: item.ai_reasoning,
                        is_verified: false,
                    }));

                    const { error: insertError } = await supabase
                        .from('extracted_estimate_items')
                        .insert(itemsToInsert);

                    if (insertError) {
                        console.error('Insert error:', insertError);
                    }
                }

                // 3. 비교 분석 실행 및 저장
                const comparisonResult = analyzeEstimate(extractedData);
                const analysisData = toEstimateAnalysis(fileId, comparisonResult);

                // estimate_analysis 테이블에 저장
                await supabase
                    .from('estimate_analysis')
                    .upsert(analysisData, { onConflict: 'file_id' });
            }

            // 비교 분석 실행 (데모 모드에서도)
            const comparisonResult = analyzeEstimate(extractedData);

            return NextResponse.json({
                success: true,
                data: extractedData,
                itemCount: extractedData.items?.length || 0,
                totalPrice: extractedData.total_price,
                comparison: {
                    percentage: comparisonResult.comparisonPercentage,
                    closestGrade: comparisonResult.closestGrade,
                    priceDifference: comparisonResult.priceDifference,
                    summary: comparisonResult.summary,
                    insights: comparisonResult.insights,
                    categoryBreakdown: comparisonResult.categoryBreakdown,
                },
            });
        } catch (aiError) {
            console.error('AI extraction error:', aiError);

            // 실패 상태 업데이트
            if (isSupabaseConfigured && supabase) {
                await supabase
                    .from('estimate_files')
                    .update({
                        processing_status: 'failed' as ProcessingStatus,
                        error_message: aiError instanceof Error ? aiError.message : 'AI 추출 실패',
                    })
                    .eq('id', fileId);
            }

            return NextResponse.json(
                { error: 'AI 추출에 실패했습니다.' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Analyze error:', error);
        return NextResponse.json(
            { error: '분석 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

// GET: API 상태 확인
export async function GET() {
    return NextResponse.json({
        geminiConfigured: isGeminiConfigured(),
        supabaseConfigured: isSupabaseConfigured,
    });
}
