import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// POST - 시장 단가를 표준 단가로 설정
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { itemIds } = body;

        if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
            return NextResponse.json(
                { success: false, error: 'itemIds가 필요합니다.' },
                { status: 400 }
            );
        }

        if (isSupabaseConfigured && supabase) {
            let updatedCount = 0;

            for (const itemId of itemIds) {
                // 1. 추출된 항목 조회
                const { data: extractedItem, error: fetchError } = await supabase
                    .from('extracted_estimate_items')
                    .select('*')
                    .eq('id', itemId)
                    .single();

                if (fetchError || !extractedItem) {
                    console.error(`항목 조회 실패: ${itemId}`, fetchError);
                    continue;
                }

                // 2. 단가 계산: unit_price가 없으면 total_price / quantity로 계산
                let calculatedUnitPrice = extractedItem.unit_price;
                if (!calculatedUnitPrice && extractedItem.total_price && extractedItem.quantity) {
                    calculatedUnitPrice = Math.round(extractedItem.total_price / extractedItem.quantity);
                }

                // 단가가 없으면 스킵 (경고 로그)
                if (!calculatedUnitPrice) {
                    console.warn(`단가 계산 불가 (unit_price/total_price/quantity 없음): ${extractedItem.normalized_item_name}`);
                    continue;
                }

                // 3. 해당 카테고리/항목명으로 표준 단가 찾기 또는 생성
                const { data: existingMaterial, error: materialFetchError } = await supabase
                    .from('material_prices')
                    .select('*')
                    .eq('category', extractedItem.category)
                    .eq('product_name', extractedItem.normalized_item_name)
                    .maybeSingle();

                if (materialFetchError) {
                    console.error(`표준 단가 조회 실패:`, materialFetchError);
                }

                if (existingMaterial) {
                    // 4a. 기존 표준 단가 업데이트
                    const { error: updateError } = await supabase
                        .from('material_prices')
                        .update({
                            unit_price: calculatedUnitPrice,
                            brand: extractedItem.brand || existingMaterial.brand,
                            product_grade: extractedItem.product_grade || existingMaterial.product_grade,
                            unit: extractedItem.unit || existingMaterial.unit,
                            source: '시장 단가에서 가져옴',
                            is_verified: true,
                            price_date: new Date().toISOString().split('T')[0],
                        })
                        .eq('id', existingMaterial.id);

                    if (updateError) {
                        console.error(`표준 단가 업데이트 실패:`, updateError);
                        continue;
                    }
                } else {
                    // 4b. 새 표준 단가 생성
                    const { error: insertError } = await supabase
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
                            source: '시장 단가에서 생성',
                            is_verified: true,
                            price_date: new Date().toISOString().split('T')[0],
                        });

                    if (insertError) {
                        console.error(`표준 단가 생성 실패:`, insertError);
                        continue;
                    }
                }

                // 4. 추출된 항목을 검증됨으로 표시
                await supabase
                    .from('extracted_estimate_items')
                    .update({ is_verified: true })
                    .eq('id', itemId);

                updatedCount++;
            }

            return NextResponse.json({
                success: true,
                updated: updatedCount,
                message: `${updatedCount}개 항목이 표준 단가로 설정되었습니다.`,
            });
        } else {
            // 로컬 모드에서는 단순 성공 반환
            return NextResponse.json({
                success: true,
                updated: itemIds.length,
                message: 'Supabase 미연결 - 데모 모드',
            });
        }
    } catch (error) {
        console.error('표준 단가 설정 오류:', error);
        return NextResponse.json(
            { success: false, error: '표준 단가 설정에 실패했습니다.' },
            { status: 500 }
        );
    }
}
