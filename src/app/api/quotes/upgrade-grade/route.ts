import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 자재 이름 정규화 (등급 관련 텍스트 제거)
function normalizeProductName(name: string): string {
    return name
        .replace(/\s*\(일반형?\)\s*/g, '')
        .replace(/\s*\(중급\)\s*/g, '')
        .replace(/\s*\(고급\)\s*/g, '')
        .replace(/\s*\(비데일체형\)\s*/g, '')
        .replace(/\s*\(반매립형\)\s*/g, '')
        .trim();
}

// 자재 카테고리별 매핑 (같은 용도의 다른 등급 자재)
const GRADE_MAPPINGS: Record<string, Record<string, string>> = {
    // 바닥재
    '마루': {
        '일반': '강화마루 12mm',
        '중급': '강마루 12mm',
        '고급': '원목마루',
    },
    // 양변기
    '양변기': {
        '일반': '양변기 (일반형)',
        '중급': '양변기 (일반형)', // 중급 없으면 일반
        '고급': '양변기 (비데일체형)',
    },
    // 세면기
    '세면기': {
        '일반': '세면기 (일반형)',
        '중급': '세면기 (반매립형)',
        '고급': '세면기 (반매립형)', // 고급 없으면 중급
    },
    // 방문
    '방문': {
        '일반': 'ABS 방문',
        '중급': '원목 방문',
        '고급': '원목 방문', // 고급 없으면 중급
    },
    // 도배
    '벽지': {
        '일반': '실크벽지',
        '중급': '실크벽지', // 중급 없으면 일반
        '고급': '수입벽지',
    },
    // 샤시
    '샤시': {
        '일반': 'PVC 이중창 (㎡당)',
        '중급': 'PVC 이중창 (㎡당)',
        '고급': '시스템창호 (㎡당)',
    },
    // 욕실 패키지
    '욕실 패키지': {
        '일반': '욕실 패키지 (일반)',
        '중급': '욕실 패키지 (중급)',
        '고급': '욕실 패키지 (고급)',
    },
    // 페인트
    '페인트': {
        '일반': '수성페인트',
        '중급': '친환경페인트',
        '고급': '친환경페인트',
    },
};

export async function POST(req: NextRequest) {
    try {
        const { quote_id, target_grade } = await req.json();

        if (!quote_id || !target_grade) {
            return NextResponse.json(
                { success: false, error: 'quote_id와 target_grade가 필요합니다.' },
                { status: 400 }
            );
        }

        if (!['일반', '중급', '고급'].includes(target_grade)) {
            return NextResponse.json(
                { success: false, error: '유효하지 않은 등급입니다. (일반/중급/고급)' },
                { status: 400 }
            );
        }

        // 기존 견적서 조회
        const { data: originalQuote, error: quoteError } = await supabase
            .from('quotes')
            .select(`
                *,
                items:quote_items(*)
            `)
            .eq('id', quote_id)
            .single();

        if (quoteError || !originalQuote) {
            return NextResponse.json(
                { success: false, error: '견적서를 찾을 수 없습니다.' },
                { status: 404 }
            );
        }

        // 자재 단가 테이블 조회
        const { data: materials } = await supabase
            .from('material_prices')
            .select('*');

        const { data: composites } = await supabase
            .from('composite_costs')
            .select('*');

        // 새 견적 항목 생성 (등급에 맞는 자재로 교체)
        const upgradedItems = originalQuote.items.map((item: {
            id: string;
            item_name: string;
            category: string;
            sub_category?: string;
            quantity: number;
            unit: string;
            unit_price: number;
            cost_type: string;
            labor_ratio?: number;
            description?: string;
            sort_order?: number;
            is_optional?: boolean;
            is_included?: boolean;
        }) => {
            // 카테고리나 서브카테고리로 매핑 찾기
            let mappingKey: string | null = null;

            for (const key of Object.keys(GRADE_MAPPINGS)) {
                if (item.item_name.includes(key) ||
                    item.sub_category?.includes(key) ||
                    item.category.includes(key)) {
                    mappingKey = key;
                    break;
                }
            }

            // 매핑이 있으면 해당 등급의 자재로 교체
            if (mappingKey && GRADE_MAPPINGS[mappingKey]) {
                const targetProductName = GRADE_MAPPINGS[mappingKey][target_grade];

                if (targetProductName) {
                    // 자재 테이블에서 해당 제품 찾기
                    const matchingMaterial = materials?.find(m =>
                        m.product_name === targetProductName
                    );

                    const matchingComposite = composites?.find(c =>
                        c.cost_name === targetProductName
                    );

                    if (matchingMaterial) {
                        return {
                            ...item,
                            item_name: matchingMaterial.product_name,
                            unit_price: matchingMaterial.unit_price,
                            total_price: Math.round(item.quantity * matchingMaterial.unit_price),
                            description: `${target_grade} 등급`,
                        };
                    }

                    if (matchingComposite) {
                        return {
                            ...item,
                            item_name: matchingComposite.cost_name,
                            unit_price: matchingComposite.unit_price,
                            total_price: Math.round(item.quantity * matchingComposite.unit_price),
                            labor_ratio: matchingComposite.labor_ratio,
                            description: `${target_grade} 등급`,
                        };
                    }
                }
            }

            // 매핑이 없으면 원래 항목 유지
            return item;
        });

        // 금액 재계산
        const laborCost = upgradedItems
            .filter((item: { cost_type: string }) => item.cost_type === 'labor')
            .reduce((sum: number, item: { total_price: number }) => sum + (item.total_price || 0), 0);

        const materialCost = upgradedItems
            .filter((item: { cost_type: string }) => item.cost_type === 'material')
            .reduce((sum: number, item: { total_price: number }) => sum + (item.total_price || 0), 0);

        const compositeTotalPrice = upgradedItems
            .filter((item: { cost_type: string }) => item.cost_type === 'composite')
            .reduce((sum: number, item: { total_price: number }) => sum + (item.total_price || 0), 0);

        const compositeLabor = upgradedItems
            .filter((item: { cost_type: string }) => item.cost_type === 'composite')
            .reduce((sum: number, item: { total_price: number; labor_ratio?: number }) =>
                sum + Math.round((item.total_price || 0) * (item.labor_ratio || 0.3)), 0);

        const compositeMaterial = compositeTotalPrice - compositeLabor;

        const totalLaborCost = laborCost + compositeLabor;
        const totalMaterialCost = materialCost + compositeMaterial;
        const totalAmount = totalLaborCost + totalMaterialCost;

        // 할인 및 부가세 계산 (기존 비율 유지)
        const discountRatio = originalQuote.discount_amount / originalQuote.total_amount || 0;
        const discountAmount = Math.round(totalAmount * discountRatio);
        const vatAmount = originalQuote.vat_amount > 0
            ? Math.round((totalAmount - discountAmount) * 0.1)
            : 0;
        const finalAmount = totalAmount - discountAmount + vatAmount;

        // 새 견적번호 생성 (원본 + 등급)
        const gradeLabel = target_grade === '일반' ? '' : `-${target_grade}`;
        const newQuoteNumber = `${originalQuote.quote_number}${gradeLabel}`;

        // 이미 같은 번호가 있는지 확인
        const { data: existing } = await supabase
            .from('quotes')
            .select('id')
            .eq('quote_number', newQuoteNumber)
            .single();

        if (existing) {
            // 기존 등급 견적 업데이트
            const { error: updateError } = await supabase
                .from('quotes')
                .update({
                    total_amount: totalAmount,
                    labor_cost: totalLaborCost,
                    material_cost: totalMaterialCost,
                    discount_amount: discountAmount,
                    vat_amount: vatAmount,
                    final_amount: finalAmount,
                })
                .eq('id', existing.id);

            if (updateError) {
                return NextResponse.json(
                    { success: false, error: '견적서 업데이트 실패' },
                    { status: 500 }
                );
            }

            // 기존 항목 삭제 후 새 항목 삽입
            await supabase.from('quote_items').delete().eq('quote_id', existing.id);

            const itemsToInsert = upgradedItems.map((item: {
                category: string;
                sub_category?: string;
                item_name: string;
                description?: string;
                quantity: number;
                unit: string;
                unit_price: number;
                total_price: number;
                cost_type: string;
                labor_ratio?: number;
                sort_order?: number;
                is_optional?: boolean;
                is_included?: boolean;
            }, index: number) => ({
                quote_id: existing.id,
                category: item.category,
                sub_category: item.sub_category,
                item_name: item.item_name,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                unit_price: item.unit_price,
                total_price: item.total_price,
                cost_type: item.cost_type,
                labor_ratio: item.labor_ratio || 0,
                sort_order: index,
                is_optional: item.is_optional || false,
                is_included: item.is_included !== false,
            }));

            await supabase.from('quote_items').insert(itemsToInsert);

            // 업데이트된 견적서 조회
            const { data: updatedQuote } = await supabase
                .from('quotes')
                .select(`*, items:quote_items(*)`)
                .eq('id', existing.id)
                .single();

            return NextResponse.json({ success: true, data: updatedQuote });
        }

        // 새 견적서 생성
        const { data: newQuote, error: insertError } = await supabase
            .from('quotes')
            .insert({
                estimate_id: originalQuote.estimate_id,
                floorplan_id: originalQuote.floorplan_id,
                quote_number: newQuoteNumber,
                total_amount: totalAmount,
                labor_cost: totalLaborCost,
                material_cost: totalMaterialCost,
                other_cost: 0,
                discount_amount: discountAmount,
                discount_reason: originalQuote.discount_reason,
                vat_amount: vatAmount,
                final_amount: finalAmount,
                status: 'draft',
                valid_until: originalQuote.valid_until,
                calculation_comment: originalQuote.calculation_comment
                    ? `[${target_grade} 등급 버전]\n\n${originalQuote.calculation_comment}`
                    : null,
                notes: `${target_grade} 등급 자재 기준 견적`,
                customer_name: originalQuote.customer_name,
                customer_email: originalQuote.customer_email,
                customer_phone: originalQuote.customer_phone,
                property_address: originalQuote.property_address,
                property_size: originalQuote.property_size,
            })
            .select()
            .single();

        if (insertError) {
            console.error('New quote insert error:', insertError);
            return NextResponse.json(
                { success: false, error: '새 견적서 생성 실패' },
                { status: 500 }
            );
        }

        // 새 견적 항목 저장
        const itemsToInsert = upgradedItems.map((item: {
            category: string;
            sub_category?: string;
            item_name: string;
            description?: string;
            quantity: number;
            unit: string;
            unit_price: number;
            total_price: number;
            cost_type: string;
            labor_ratio?: number;
            sort_order?: number;
            is_optional?: boolean;
            is_included?: boolean;
        }, index: number) => ({
            quote_id: newQuote.id,
            category: item.category,
            sub_category: item.sub_category,
            item_name: item.item_name,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            total_price: item.total_price,
            cost_type: item.cost_type,
            labor_ratio: item.labor_ratio || 0,
            sort_order: index,
            is_optional: item.is_optional || false,
            is_included: item.is_included !== false,
        }));

        await supabase.from('quote_items').insert(itemsToInsert);

        // 새 견적서 조회 (항목 포함)
        const { data: fullQuote } = await supabase
            .from('quotes')
            .select(`*, items:quote_items(*)`)
            .eq('id', newQuote.id)
            .single();

        return NextResponse.json({
            success: true,
            data: fullQuote,
            message: `${target_grade} 등급 견적서가 생성되었습니다.`,
        });

    } catch (error) {
        console.error('Grade upgrade error:', error);
        return NextResponse.json(
            { success: false, error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
