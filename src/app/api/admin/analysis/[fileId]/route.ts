import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// GET: 특정 파일의 분석 결과 조회
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ fileId: string }> }
) {
    const { fileId } = await params;

    if (!fileId) {
        return NextResponse.json(
            { error: 'fileId가 필요합니다.' },
            { status: 400 }
        );
    }

    // Supabase가 설정되지 않은 경우 데모 데이터 반환
    if (!isSupabaseConfigured || !supabase) {
        return NextResponse.json({
            analysis: {
                id: 'demo-analysis',
                file_id: fileId,
                apartment_size: 32,
                total_extracted_price: 42000000,
                standard_price: 38000000,
                premium_price: 52000000,
                luxury_price: 75000000,
                comparison_percentage: 110.5,
                closest_grade: 'Premium',
                price_difference: 4000000,
                analysis_summary: '표준 견적 대비 110.5% (+400만원), 프리미엄 등급 수준입니다.',
                category_breakdown: {
                    '욕실': { extracted_total: 8500000, standard_total: 7000000, difference_percentage: 21.4 },
                    '주방': { extracted_total: 12000000, standard_total: 11000000, difference_percentage: 9.1 },
                    '바닥': { extracted_total: 6500000, standard_total: 6000000, difference_percentage: 8.3 },
                    '목공': { extracted_total: 5000000, standard_total: 5500000, difference_percentage: -9.1 },
                    '전기': { extracted_total: 3000000, standard_total: 2800000, difference_percentage: 7.1 },
                    '철거': { extracted_total: 2000000, standard_total: 2000000, difference_percentage: 0 },
                },
            },
            items: [
                {
                    id: 'demo-item-1',
                    file_id: fileId,
                    category: '욕실',
                    sub_category: '수전',
                    detail_category: '욕실수전',
                    original_item_name: '욕실 수 전',
                    normalized_item_name: '욕실수전',
                    brand: '대림바스',
                    model: null,
                    product_grade: '중급',
                    unit: '개',
                    quantity: 2,
                    unit_price: 180000,
                    total_price: 360000,
                    confidence_score: 0.92,
                    ai_reasoning: "띄어쓰기 수정: '욕실 수 전' → '욕실수전'",
                    is_verified: false,
                },
                {
                    id: 'demo-item-2',
                    file_id: fileId,
                    category: '욕실',
                    sub_category: '도기',
                    detail_category: '양변기',
                    original_item_name: '양변기',
                    normalized_item_name: '양변기',
                    brand: '대림바스',
                    model: 'DL-001',
                    product_grade: '고급',
                    unit: '개',
                    quantity: 2,
                    unit_price: 450000,
                    total_price: 900000,
                    confidence_score: 0.95,
                    ai_reasoning: "욕실 > 도기 > 양변기로 분류",
                    is_verified: false,
                },
                {
                    id: 'demo-item-3',
                    file_id: fileId,
                    category: '주방',
                    sub_category: '싱크대',
                    detail_category: null,
                    original_item_name: '주방 싱크대',
                    normalized_item_name: '싱크대',
                    brand: '한샘',
                    model: null,
                    product_grade: '중급',
                    unit: '식',
                    quantity: 1,
                    unit_price: 2500000,
                    total_price: 2500000,
                    confidence_score: 0.88,
                    ai_reasoning: "주방 > 싱크대로 분류",
                    is_verified: false,
                },
            ],
            demoMode: true,
        });
    }

    try {
        // 분석 결과 조회
        const { data: analysis, error: analysisError } = await supabase
            .from('estimate_analysis')
            .select('*')
            .eq('file_id', fileId)
            .single();

        if (analysisError && analysisError.code !== 'PGRST116') {
            console.error('Analysis fetch error:', analysisError);
        }

        // 추출된 항목 조회
        const { data: items, error: itemsError } = await supabase
            .from('extracted_estimate_items')
            .select('*')
            .eq('file_id', fileId)
            .order('category', { ascending: true });

        if (itemsError) {
            console.error('Items fetch error:', itemsError);
        }

        return NextResponse.json({
            analysis: analysis || null,
            items: items || [],
        });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: '분석 결과 조회 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
