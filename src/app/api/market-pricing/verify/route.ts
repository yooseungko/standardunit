import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// POST - 시장 단가 항목 검증 상태 변경 + 표준 단가에 추가
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, verified } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'id가 필요합니다.' },
                { status: 400 }
            );
        }

        if (isSupabaseConfigured && supabase) {
            // 1. 검증 상태 변경
            const { error: verifyError } = await supabase
                .from('extracted_estimate_items')
                .update({ is_verified: verified })
                .eq('id', id);

            if (verifyError) {
                throw verifyError;
            }

            // 2. 검증 처리 시 표준 단가에도 자동 추가
            if (verified) {
                // 추출된 항목 조회
                const { data: extractedItem, error: fetchError } = await supabase
                    .from('extracted_estimate_items')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (fetchError || !extractedItem) {
                    console.error('항목 조회 실패:', fetchError);
                    return NextResponse.json({
                        success: true,
                        message: '검증 처리되었습니다. (표준 단가 추가 실패)',
                    });
                }

                // 단가 계산: unit_price가 없으면 total_price / quantity로 계산
                let calculatedUnitPrice = extractedItem.unit_price;
                if (!calculatedUnitPrice && extractedItem.total_price && extractedItem.quantity) {
                    calculatedUnitPrice = Math.round(extractedItem.total_price / extractedItem.quantity);
                }

                // 단가가 있는 경우에만 표준 단가에 추가
                if (calculatedUnitPrice) {
                    // 기존 표준 단가 찾기
                    const { data: existingMaterial } = await supabase
                        .from('material_prices')
                        .select('*')
                        .eq('category', extractedItem.category)
                        .eq('product_name', extractedItem.normalized_item_name)
                        .maybeSingle();

                    if (existingMaterial) {
                        // 기존 표준 단가 업데이트
                        await supabase
                            .from('material_prices')
                            .update({
                                unit_price: calculatedUnitPrice,
                                brand: extractedItem.brand || existingMaterial.brand,
                                product_grade: extractedItem.product_grade || existingMaterial.product_grade,
                                unit: extractedItem.unit || existingMaterial.unit,
                                source: '시장 단가에서 검증됨',
                                is_verified: true,
                                price_date: new Date().toISOString().split('T')[0],
                            })
                            .eq('id', existingMaterial.id);
                    } else {
                        // 새 표준 단가 생성
                        await supabase
                            .from('material_prices')
                            .insert({
                                category: extractedItem.category,
                                sub_category: extractedItem.sub_category,
                                detail_category: extractedItem.detail_category,
                                product_name: extractedItem.normalized_item_name,
                                brand: extractedItem.brand,
                                product_grade: extractedItem.product_grade || '일반',
                                unit: extractedItem.unit || '개',
                                unit_price: calculatedUnitPrice,
                                source: '시장 단가에서 검증됨',
                                is_verified: true,
                                is_active: true,
                                price_date: new Date().toISOString().split('T')[0],
                            });
                    }

                    return NextResponse.json({
                        success: true,
                        message: '검증 처리 및 표준 단가에 추가되었습니다.',
                        addedToStandard: true,
                    });
                } else {
                    return NextResponse.json({
                        success: true,
                        message: '검증 처리되었습니다. (단가 정보 없음)',
                        addedToStandard: false,
                    });
                }
            }

            return NextResponse.json({
                success: true,
                message: '검증이 취소되었습니다.',
            });
        } else {
            return NextResponse.json({
                success: true,
                message: 'Supabase 미연결 - 데모 모드',
            });
        }
    } catch (error) {
        console.error('검증 상태 변경 오류:', error);
        return NextResponse.json(
            { success: false, error: '검증 상태 변경에 실패했습니다.' },
            { status: 500 }
        );
    }
}
