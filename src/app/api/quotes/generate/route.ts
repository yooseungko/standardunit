import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
    Quote,
    QuoteItem,
    FloorplanAnalysisResult,
    GenerateQuoteRequest,
    QUOTE_CATEGORIES
} from '@/types/quote';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 견적서 생성
export async function POST(request: NextRequest) {
    try {
        const body: GenerateQuoteRequest = await request.json();
        const { estimate_id, floorplan_id, analysis_result, options } = body;

        if (!estimate_id) {
            return NextResponse.json(
                { success: false, error: '견적 요청 ID가 필요합니다.' },
                { status: 400 }
            );
        }

        // 견적 요청 정보 조회
        const { data: estimate, error: estimateError } = await supabase
            .from('estimate_requests')
            .select('*')
            .eq('id', estimate_id)
            .single();

        if (estimateError || !estimate) {
            return NextResponse.json(
                { success: false, error: '견적 요청을 찾을 수 없습니다.' },
                { status: 404 }
            );
        }

        // 도면 분석 결과 가져오기
        let analysisData = analysis_result;

        if (!analysisData && floorplan_id) {
            const { data: floorplan } = await supabase
                .from('floorplans')
                .select('analysis_result')
                .eq('id', floorplan_id)
                .single();

            if (floorplan?.analysis_result) {
                analysisData = floorplan.analysis_result as FloorplanAnalysisResult;
            }
        }

        // 표준 단가 데이터 조회
        const [laborResult, materialResult, compositeResult] = await Promise.all([
            supabase.from('labor_costs').select('*'),
            supabase.from('material_prices').select('*'),
            supabase.from('composite_costs').select('*'),
        ]);

        const standardPricing = {
            labor: laborResult.data || [],
            material: materialResult.data || [],
            composite: compositeResult.data || [],
        };

        // 견적 항목 생성
        const quoteItems = generateQuoteItems(analysisData, standardPricing, estimate);

        // AI 계산 설명 생성
        const calculationComment = generateCalculationComment(analysisData || null, quoteItems, estimate);

        // 금액 계산
        const laborCost = quoteItems
            .filter(item => item.cost_type === 'labor')
            .reduce((sum, item) => sum + (item.total_price || 0), 0);

        const materialCost = quoteItems
            .filter(item => item.cost_type === 'material')
            .reduce((sum, item) => sum + (item.total_price || 0), 0);

        const compositeTotalPrice = quoteItems
            .filter(item => item.cost_type === 'composite')
            .reduce((sum, item) => sum + (item.total_price || 0), 0);

        // 복합 비용에서 인건비/자재비 분리
        const compositeLabor = quoteItems
            .filter(item => item.cost_type === 'composite')
            .reduce((sum, item) => sum + Math.round((item.total_price || 0) * (item.labor_ratio || 0.3)), 0);

        const compositeMaterial = compositeTotalPrice - compositeLabor;

        const totalLaborCost = laborCost + compositeLabor;
        const totalMaterialCost = materialCost + compositeMaterial;
        const totalAmount = totalLaborCost + totalMaterialCost;

        // 할인 계산
        const discountPercent = options?.discountPercent || 0;
        const discountAmount = Math.round(totalAmount * (discountPercent / 100));

        // 부가세 계산
        const includeVat = options?.includeVat ?? true;
        const vatAmount = includeVat ? Math.round((totalAmount - discountAmount) * 0.1) : 0;

        // 최종 금액
        const finalAmount = totalAmount - discountAmount + vatAmount;

        // 유효기간 설정
        const validDays = options?.validDays || 14;
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + validDays);

        // 견적번호 생성
        const quoteNumber = await generateQuoteNumber();

        // 견적서 저장
        const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .insert({
                estimate_id,
                floorplan_id,
                quote_number: quoteNumber,
                total_amount: totalAmount,
                labor_cost: totalLaborCost,
                material_cost: totalMaterialCost,
                other_cost: 0,
                discount_amount: discountAmount,
                discount_reason: discountPercent > 0 ? `${discountPercent}% 할인 적용` : null,
                vat_amount: vatAmount,
                final_amount: finalAmount,
                status: 'draft',
                valid_until: validUntil.toISOString().split('T')[0],
                calculation_comment: calculationComment, // AI 계산 설명
                customer_name: estimate.name,
                customer_email: estimate.email,
                customer_phone: estimate.phone,
                property_address: estimate.address,
                // 평형(pyeong)을 ㎡로 변환 (1평 = 3.3058㎡)
                property_size: estimate.size ? Math.round(parseFloat(estimate.size) * 3.3058) : null,
            })
            .select()
            .single();

        if (quoteError) {
            console.error('Quote insert error:', quoteError);
            return NextResponse.json(
                { success: false, error: '견적서 생성 실패: ' + quoteError.message },
                { status: 500 }
            );
        }

        // 견적 항목 저장
        const itemsToInsert = quoteItems.map((item, index) => ({
            quote_id: quote.id,
            category: item.category,
            sub_category: item.sub_category,
            item_name: item.item_name,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            total_price: item.total_price,
            cost_type: item.cost_type,
            labor_ratio: item.labor_ratio,
            sort_order: index,
            is_optional: item.is_optional || false,
            is_included: item.is_included !== false,
            reference_type: item.reference_type,
            reference_id: item.reference_id,
        }));

        const { error: itemsError } = await supabase
            .from('quote_items')
            .insert(itemsToInsert);

        if (itemsError) {
            console.error('Quote items insert error:', itemsError);
            // 롤백: 견적서 삭제
            await supabase.from('quotes').delete().eq('id', quote.id);
            return NextResponse.json(
                { success: false, error: '견적 항목 저장 실패' },
                { status: 500 }
            );
        }

        // 생성된 견적서 조회 (항목 포함)
        const { data: fullQuote } = await supabase
            .from('quotes')
            .select(`
                *,
                items:quote_items(*)
            `)
            .eq('id', quote.id)
            .single();

        return NextResponse.json({
            success: true,
            data: fullQuote,
        });

    } catch (error) {
        console.error('Quote generate error:', error);
        return NextResponse.json(
            { success: false, error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

// AI 계산 설명 생성
function generateCalculationComment(
    analysis: FloorplanAnalysisResult | null,
    items: Array<Partial<{ category: string; item_name: string; quantity: number; unit: string; description?: string }>>,
    estimate: { size?: string; complex_name?: string }
): string {
    const comments: string[] = [];

    // 기본 정보
    const pyeong = estimate.size ? parseFloat(estimate.size) : 0;
    const sqm = Math.round(pyeong * 3.3058);

    comments.push(`## 📐 면적 정보`);
    comments.push(`- **공급면적**: ${pyeong}평 (약 ${sqm}㎡)`);

    if (analysis) {
        const floorArea = analysis.calculations?.floorArea || sqm;
        const wallArea = analysis.calculations?.wallArea || 0;
        const ceilingArea = analysis.calculations?.ceilingArea || floorArea;

        comments.push(`- **전용면적 (바닥)**: ${floorArea.toFixed(1)}㎡`);
        if (wallArea > 0) {
            comments.push(`- **벽면적**: ${wallArea.toFixed(1)}㎡ (층고 2.4m 기준)`);
        }
        comments.push(`- **천장면적**: ${ceilingArea.toFixed(1)}㎡`);

        // 공간 구성
        if (analysis.rooms && analysis.rooms.length > 0) {
            comments.push(`\n## 🏠 공간 구성`);
            const roomCounts: Record<string, number> = {};
            analysis.rooms.forEach(room => {
                const typeLabel = {
                    bedroom: '침실',
                    living: '거실',
                    kitchen: '주방',
                    bathroom: '욕실',
                    balcony: '발코니',
                    utility: '다용도실',
                    hallway: '현관/복도',
                    other: '기타',
                }[room.type] || room.type;
                roomCounts[typeLabel] = (roomCounts[typeLabel] || 0) + 1;
            });
            Object.entries(roomCounts).forEach(([type, count]) => {
                comments.push(`- ${type}: ${count}개`);
            });
        }

        // fixtures 정보
        if (analysis.fixtures) {
            const { toilet, sink, bathroomFaucet, kitchenFaucet, doors, lights } = analysis.fixtures;
            comments.push(`\n## 🔧 설비 수량`);
            if (toilet) comments.push(`- 양변기: ${toilet}개`);
            if (sink) comments.push(`- 세면기: ${sink}개`);
            if (bathroomFaucet) comments.push(`- 욕실수전: ${bathroomFaucet}개`);
            if (kitchenFaucet) comments.push(`- 주방수전: ${kitchenFaucet}개`);
            if (doors?.room) comments.push(`- 방문: ${doors.room}개`);
            if (lights) {
                const totalLights = (lights.living || 0) + (lights.bedroom || 0) +
                    (lights.bathroom || 0) + (lights.kitchen || 0) +
                    (lights.hallway || 0) + (lights.balcony || 0);
                if (totalLights > 0) comments.push(`- 조명: ${totalLights}개소`);
            }
        }
    }

    // 주요 항목 계산 근거
    comments.push(`\n## 📋 주요 항목 계산 근거`);

    // 철거
    const demolitionItem = items.find(i => i.item_name?.includes('철거') && !i.item_name?.includes('폐기물'));
    if (demolitionItem) {
        comments.push(`- **철거**: 전용면적 ${demolitionItem.quantity}${demolitionItem.unit} 전체 철거`);
    }

    // 폐기물
    const wasteItem = items.find(i => i.item_name?.includes('폐기물'));
    if (wasteItem) {
        comments.push(`- **폐기물 처리**: 면적 기준 약 0.1톤/㎡ → ${wasteItem.quantity}${wasteItem.unit}`);
    }

    // 바닥
    const floorItem = items.find(i => i.category?.includes('바닥') && i.item_name?.includes('마루'));
    if (floorItem) {
        comments.push(`- **바닥재**: 전용면적 기준 ${floorItem.quantity}${floorItem.unit}`);
    }

    // 도배
    const wallpaperItem = items.find(i => i.category?.includes('도배'));
    if (wallpaperItem) {
        comments.push(`- **도배**: 벽+천장 면적 기준 ${wallpaperItem.quantity}${wallpaperItem.unit}`);
    }

    // 욕실
    const bathroomItems = items.filter(i => i.category?.includes('욕실'));
    if (bathroomItems.length > 0) {
        const bathroomCount = items.find(i => i.item_name?.includes('욕실') && i.item_name?.includes('공사'))?.quantity ||
            analysis?.rooms?.filter(r => r.type === 'bathroom').length || 2;
        comments.push(`- **욕실 공사**: ${bathroomCount}개소 기준`);
    }

    comments.push(`\n---`);
    comments.push(`*이 견적서는 도면 분석 결과를 바탕으로 자동 생성되었습니다.*`);
    comments.push(`*실제 현장 실측 시 수량이 변경될 수 있습니다.*`);

    return comments.join('\n');
}

// 견적번호 생성
async function generateQuoteNumber(): Promise<string> {
    const year = new Date().getFullYear();

    // 해당 년도의 마지막 견적번호 조회
    const { data } = await supabase
        .from('quotes')
        .select('quote_number')
        .like('quote_number', `QT-${year}-%`)
        .order('quote_number', { ascending: false })
        .limit(1);

    let seq = 1;
    if (data && data.length > 0) {
        const lastNumber = data[0].quote_number;
        const match = lastNumber.match(/QT-\d{4}-(\d{4})/);
        if (match) {
            seq = parseInt(match[1]) + 1;
        }
    }

    return `QT-${year}-${seq.toString().padStart(4, '0')}`;
}

// 견적 항목 생성
function generateQuoteItems(
    analysisResult: FloorplanAnalysisResult | null | undefined,
    standardPricing: {
        labor: Array<{ id: string; labor_type: string; daily_rate: number; description?: string }>;
        material: Array<{ id: string; category: string; sub_category?: string; product_name: string; unit_price: number; unit: string; product_grade?: string }>;
        composite: Array<{ id: string; cost_name: string; category: string; unit_price: number; unit: string; labor_ratio?: number; description?: string }>;
    },
    estimate: { size?: number;[key: string]: unknown }
): Partial<QuoteItem>[] {
    const items: Partial<QuoteItem>[] = [];

    // 분석 결과가 없으면 면적 기반으로 기본 견적 생성
    const totalArea = analysisResult?.totalArea || estimate.size || 100; // 기본 100㎡
    const floorArea = analysisResult?.calculations?.floorArea || totalArea;
    const wallArea = analysisResult?.calculations?.wallArea || totalArea * 2.5;
    const ceilingArea = analysisResult?.calculations?.ceilingArea || totalArea;

    let sortOrder = 0;

    // 1. 철거 공사
    const demolitionCost = standardPricing.composite.find(c =>
        c.cost_name.includes('철거') || c.category === '철거'
    );
    if (demolitionCost) {
        items.push({
            category: QUOTE_CATEGORIES.DEMOLITION,
            item_name: demolitionCost.cost_name,
            description: demolitionCost.description,
            quantity: floorArea,
            unit: demolitionCost.unit || '㎡',
            unit_price: demolitionCost.unit_price,
            total_price: Math.round(floorArea * demolitionCost.unit_price),
            cost_type: 'composite',
            labor_ratio: demolitionCost.labor_ratio || 0.7,
            sort_order: sortOrder++,
            reference_type: 'composite',
            reference_id: demolitionCost.id,
        });
    }

    // 2. 폐기물 처리 (철거와 별도, 중복 방지)
    const wasteCost = standardPricing.composite.find(c =>
        (c.cost_name.includes('폐기물') || c.cost_name.includes('쓰레기')) &&
        !c.cost_name.includes('철거') // 철거 비용과 중복 방지
    );
    if (wasteCost) {
        // 10㎡당 약 1톤 기준, 최소 1톤, 최대 20톤으로 제한
        const wasteQuantity = Math.max(1, Math.min(20, Math.ceil(floorArea / 10)));
        items.push({
            category: QUOTE_CATEGORIES.DEMOLITION,
            sub_category: '폐기물',
            item_name: wasteCost.cost_name,
            description: `약 ${wasteQuantity}톤 예상`,
            quantity: wasteQuantity,
            unit: '톤',
            unit_price: wasteCost.unit_price,
            total_price: Math.round(wasteQuantity * wasteCost.unit_price),
            cost_type: 'composite',
            labor_ratio: wasteCost.labor_ratio || 0.3,
            sort_order: sortOrder++,
            reference_type: 'composite',
            reference_id: wasteCost.id,
        });
    }

    // 3. 바닥 공사 - 마루
    const floorMaterial = standardPricing.material.find(m =>
        m.category === '바닥' && (m.sub_category === '마루' || m.product_name.includes('마루'))
    );
    if (floorMaterial) {
        const quantity = Math.ceil(floorArea * 0.8 * 1.1); // 거실/침실 80% + 로스 10%
        items.push({
            category: QUOTE_CATEGORIES.FLOOR,
            sub_category: '마루',
            item_name: floorMaterial.product_name,
            description: `${floorMaterial.product_grade || '일반'} 등급`,
            quantity: quantity,
            unit: floorMaterial.unit,
            unit_price: floorMaterial.unit_price,
            total_price: Math.round(quantity * floorMaterial.unit_price),
            cost_type: 'material',
            labor_ratio: 0,
            sort_order: sortOrder++,
            reference_type: 'material',
            reference_id: floorMaterial.id,
        });
    }

    // 마루 시공 인건비
    const floorLabor = standardPricing.labor.find(l =>
        l.labor_type.includes('마루') || l.labor_type.includes('바닥')
    );
    if (floorLabor) {
        const days = Math.ceil(floorArea * 0.8 / 20); // 하루 20㎡ 시공
        items.push({
            category: QUOTE_CATEGORIES.FLOOR,
            sub_category: '마루',
            item_name: `${floorLabor.labor_type} 인건비`,
            description: `${days}일 작업`,
            quantity: days,
            unit: '일',
            unit_price: floorLabor.daily_rate,
            total_price: Math.round(days * floorLabor.daily_rate),
            cost_type: 'labor',
            labor_ratio: 1,
            sort_order: sortOrder++,
            reference_type: 'labor',
            reference_id: floorLabor.id,
        });
    }

    // 4. 도배 공사
    const wallpaperMaterial = standardPricing.material.find(m =>
        m.category === '도배' || m.product_name.includes('벽지')
    );
    if (wallpaperMaterial) {
        const quantity = Math.ceil((wallArea + ceilingArea) * 1.05); // 로스 5%
        items.push({
            category: QUOTE_CATEGORIES.WALLPAPER,
            item_name: wallpaperMaterial.product_name,
            description: `${wallpaperMaterial.product_grade || '일반'} 등급`,
            quantity: quantity,
            unit: wallpaperMaterial.unit,
            unit_price: wallpaperMaterial.unit_price,
            total_price: Math.round(quantity * wallpaperMaterial.unit_price),
            cost_type: 'material',
            labor_ratio: 0,
            sort_order: sortOrder++,
            reference_type: 'material',
            reference_id: wallpaperMaterial.id,
        });
    }

    // 도배 인건비
    const wallpaperLabor = standardPricing.labor.find(l =>
        l.labor_type.includes('도배')
    );
    if (wallpaperLabor) {
        const days = Math.ceil((wallArea + ceilingArea) / 50); // 하루 50㎡
        items.push({
            category: QUOTE_CATEGORIES.WALLPAPER,
            item_name: `${wallpaperLabor.labor_type} 인건비`,
            description: `${days}일 작업`,
            quantity: days,
            unit: '일',
            unit_price: wallpaperLabor.daily_rate,
            total_price: Math.round(days * wallpaperLabor.daily_rate),
            cost_type: 'labor',
            labor_ratio: 1,
            sort_order: sortOrder++,
            reference_type: 'labor',
            reference_id: wallpaperLabor.id,
        });
    }

    // 5. 타일 공사 (화장실, 주방)
    const tileMaterial = standardPricing.material.find(m =>
        m.category === '타일' || m.product_name.includes('타일')
    );
    if (tileMaterial) {
        const tileArea = Math.ceil(floorArea * 0.15 * 5); // 화장실/주방 15% x 5 (바닥+벽)
        items.push({
            category: QUOTE_CATEGORIES.TILE,
            item_name: tileMaterial.product_name,
            description: `화장실/주방 바닥 및 벽면`,
            quantity: tileArea,
            unit: tileMaterial.unit,
            unit_price: tileMaterial.unit_price,
            total_price: Math.round(tileArea * tileMaterial.unit_price),
            cost_type: 'material',
            labor_ratio: 0,
            sort_order: sortOrder++,
            reference_type: 'material',
            reference_id: tileMaterial.id,
        });
    }

    // 타일 인건비
    const tileLabor = standardPricing.labor.find(l =>
        l.labor_type.includes('타일')
    );
    if (tileLabor) {
        const days = Math.ceil(floorArea * 0.15 * 5 / 10); // 하루 10㎡
        items.push({
            category: QUOTE_CATEGORIES.TILE,
            item_name: `${tileLabor.labor_type} 인건비`,
            description: `${days}일 작업`,
            quantity: days,
            unit: '일',
            unit_price: tileLabor.daily_rate,
            total_price: Math.round(days * tileLabor.daily_rate),
            cost_type: 'labor',
            labor_ratio: 1,
            sort_order: sortOrder++,
            reference_type: 'labor',
            reference_id: tileLabor.id,
        });
    }

    // 6. 전기 공사
    const electricCost = standardPricing.composite.find(c =>
        c.category === '전기' || c.cost_name.includes('전기')
    );
    if (electricCost) {
        items.push({
            category: QUOTE_CATEGORIES.ELECTRICAL,
            item_name: electricCost.cost_name,
            description: electricCost.description,
            quantity: 1,
            unit: electricCost.unit || '식',
            unit_price: Math.round(floorArea * electricCost.unit_price),
            total_price: Math.round(floorArea * electricCost.unit_price),
            cost_type: 'composite',
            labor_ratio: electricCost.labor_ratio || 0.5,
            sort_order: sortOrder++,
            reference_type: 'composite',
            reference_id: electricCost.id,
        });
    }

    // 7. 설비 공사
    const plumbingCost = standardPricing.composite.find(c =>
        c.category === '설비' || c.cost_name.includes('설비') || c.cost_name.includes('배관')
    );
    if (plumbingCost) {
        items.push({
            category: QUOTE_CATEGORIES.PLUMBING,
            item_name: plumbingCost.cost_name,
            description: plumbingCost.description,
            quantity: 1,
            unit: plumbingCost.unit || '식',
            unit_price: plumbingCost.unit_price,
            total_price: plumbingCost.unit_price,
            cost_type: 'composite',
            labor_ratio: plumbingCost.labor_ratio || 0.6,
            sort_order: sortOrder++,
            reference_type: 'composite',
            reference_id: plumbingCost.id,
        });
    }

    // 8. 목공 공사
    const woodworkCost = standardPricing.composite.find(c =>
        c.category === '목공' || c.cost_name.includes('목공') || c.cost_name.includes('걸레받이')
    );
    if (woodworkCost) {
        items.push({
            category: '목공',
            item_name: woodworkCost.cost_name,
            description: woodworkCost.description,
            quantity: 1,
            unit: woodworkCost.unit || '식',
            unit_price: woodworkCost.unit_price,
            total_price: woodworkCost.unit_price,
            cost_type: 'composite',
            labor_ratio: woodworkCost.labor_ratio || 0.6,
            sort_order: sortOrder++,
            reference_type: 'composite',
            reference_id: woodworkCost.id,
        });
    }

    // [별도옵션] 창호(샷시) - 기본 견적에서 제외
    // const windowCount = analysisResult?.calculations?.windowCount || 4;
    // 창호 교체는 별도 옵션으로 분류됨

    // 10. 문 공사 (문 개수 기반)
    const doorCount = analysisResult?.calculations?.doorCount || 5;
    const doorCost = standardPricing.composite.find(c =>
        c.category === '문' || c.cost_name.includes('문') || c.cost_name.includes('도어')
    );
    if (doorCost) {
        items.push({
            category: QUOTE_CATEGORIES.DOOR,
            item_name: doorCost.cost_name,
            description: `${doorCount}개소`,
            quantity: doorCount,
            unit: doorCost.unit || '개',
            unit_price: doorCost.unit_price,
            total_price: Math.round(doorCount * doorCost.unit_price),
            cost_type: 'composite',
            labor_ratio: doorCost.labor_ratio || 0.5,
            sort_order: sortOrder++,
            reference_type: 'composite',
            reference_id: doorCost.id,
        });
    }

    // 11. 주방 공사
    const kitchenCost = standardPricing.composite.find(c =>
        c.category === '주방' || c.cost_name.includes('주방') || c.cost_name.includes('싱크대')
    );
    if (kitchenCost) {
        items.push({
            category: QUOTE_CATEGORIES.KITCHEN,
            item_name: kitchenCost.cost_name,
            description: kitchenCost.description || '주방 가구 및 설치',
            quantity: 1,
            unit: kitchenCost.unit || '식',
            unit_price: kitchenCost.unit_price,
            total_price: kitchenCost.unit_price,
            cost_type: 'composite',
            labor_ratio: kitchenCost.labor_ratio || 0.3,
            sort_order: sortOrder++,
            reference_type: 'composite',
            reference_id: kitchenCost.id,
        });
    }

    // 12. 욕실 공사 (화장실 개수 기반 - fixtures 우선)
    const bathroomCount = analysisResult?.fixtures?.toilet ||
        analysisResult?.rooms?.filter(r => r.type === 'bathroom').length || 2;
    const bathroomCost = standardPricing.composite.find(c =>
        c.category === '욕실' || c.cost_name.includes('욕실') || c.cost_name.includes('화장실')
    );
    if (bathroomCost) {
        items.push({
            category: QUOTE_CATEGORIES.BATHROOM,
            item_name: bathroomCost.cost_name,
            description: `${bathroomCount}개소`,
            quantity: bathroomCount,
            unit: bathroomCost.unit || '개소',
            unit_price: bathroomCost.unit_price,
            total_price: Math.round(bathroomCount * bathroomCost.unit_price),
            cost_type: 'composite',
            labor_ratio: bathroomCost.labor_ratio || 0.4,
            sort_order: sortOrder++,
            reference_type: 'composite',
            reference_id: bathroomCost.id,
        });
    }

    // 13. 양변기 (fixtures 기반)
    const toiletCount = analysisResult?.fixtures?.toilet || bathroomCount;
    const toiletMaterial = standardPricing.material.find(m =>
        m.product_name.includes('양변기')
    );
    if (toiletMaterial) {
        items.push({
            category: QUOTE_CATEGORIES.BATHROOM,
            sub_category: '도기',
            item_name: toiletMaterial.product_name,
            description: `${toiletCount}개`,
            quantity: toiletCount,
            unit: toiletMaterial.unit || '개',
            unit_price: toiletMaterial.unit_price,
            total_price: Math.round(toiletCount * toiletMaterial.unit_price),
            cost_type: 'material',
            labor_ratio: 0,
            sort_order: sortOrder++,
            reference_type: 'material',
            reference_id: toiletMaterial.id,
        });
    }

    // 14. 세면기 (fixtures 기반)
    const sinkCount = analysisResult?.fixtures?.sink || bathroomCount;
    const sinkMaterial = standardPricing.material.find(m =>
        m.product_name.includes('세면기')
    );
    if (sinkMaterial) {
        items.push({
            category: QUOTE_CATEGORIES.BATHROOM,
            sub_category: '도기',
            item_name: sinkMaterial.product_name,
            description: `${sinkCount}개`,
            quantity: sinkCount,
            unit: sinkMaterial.unit || '개',
            unit_price: sinkMaterial.unit_price,
            total_price: Math.round(sinkCount * sinkMaterial.unit_price),
            cost_type: 'material',
            labor_ratio: 0,
            sort_order: sortOrder++,
            reference_type: 'material',
            reference_id: sinkMaterial.id,
        });
    }

    // 15. 욕실 수전 (fixtures 기반)
    const bathroomFaucetCount = analysisResult?.fixtures?.bathroomFaucet || (bathroomCount * 2);
    const bathroomFaucetMaterial = standardPricing.material.find(m =>
        m.product_name.includes('세면수전') || (m.sub_category === '수전' && m.category === '욕실')
    );
    if (bathroomFaucetMaterial) {
        items.push({
            category: QUOTE_CATEGORIES.BATHROOM,
            sub_category: '수전',
            item_name: bathroomFaucetMaterial.product_name,
            description: `욕실 ${bathroomCount}개소`,
            quantity: bathroomFaucetCount,
            unit: bathroomFaucetMaterial.unit || '개',
            unit_price: bathroomFaucetMaterial.unit_price,
            total_price: Math.round(bathroomFaucetCount * bathroomFaucetMaterial.unit_price),
            cost_type: 'material',
            labor_ratio: 0,
            sort_order: sortOrder++,
            reference_type: 'material',
            reference_id: bathroomFaucetMaterial.id,
        });
    }

    // 16. 주방 수전 (fixtures 기반)
    const kitchenFaucetCount = analysisResult?.fixtures?.kitchenFaucet || 1;
    const kitchenFaucetMaterial = standardPricing.material.find(m =>
        m.product_name.includes('주방수전') || (m.sub_category === '수전' && m.category === '주방')
    );
    if (kitchenFaucetMaterial) {
        items.push({
            category: QUOTE_CATEGORIES.KITCHEN,
            sub_category: '수전',
            item_name: kitchenFaucetMaterial.product_name,
            description: `주방 ${kitchenFaucetCount}개`,
            quantity: kitchenFaucetCount,
            unit: kitchenFaucetMaterial.unit || '개',
            unit_price: kitchenFaucetMaterial.unit_price,
            total_price: Math.round(kitchenFaucetCount * kitchenFaucetMaterial.unit_price),
            cost_type: 'material',
            labor_ratio: 0,
            sort_order: sortOrder++,
            reference_type: 'material',
            reference_id: kitchenFaucetMaterial.id,
        });
    }

    // 17. 조명 (fixtures 기반)
    const fixturesLights = analysisResult?.fixtures?.lights;
    const totalLights = fixturesLights
        ? (fixturesLights.living + fixturesLights.bedroom + fixturesLights.bathroom +
            fixturesLights.kitchen + fixturesLights.hallway + fixturesLights.balcony)
        : (analysisResult?.rooms?.length || 6);

    const lightingMaterial = standardPricing.material.find(m =>
        m.product_name.includes('LED') || m.product_name.includes('조명')
    );
    if (lightingMaterial) {
        items.push({
            category: QUOTE_CATEGORIES.ELECTRICAL,
            sub_category: '조명',
            item_name: lightingMaterial.product_name,
            description: `${totalLights}개소`,
            quantity: totalLights,
            unit: lightingMaterial.unit || '개',
            unit_price: lightingMaterial.unit_price,
            total_price: Math.round(totalLights * lightingMaterial.unit_price),
            cost_type: 'material',
            labor_ratio: 0,
            sort_order: sortOrder++,
            reference_type: 'material',
            reference_id: lightingMaterial.id,
        });
    }

    // 16. 발코니 페인트 (발코니가 있는 경우)
    const balconies = analysisResult?.rooms?.filter(r => r.type === 'balcony') || [];
    if (balconies.length > 0) {
        const balconyArea = balconies.reduce((sum, r) => sum + r.area, 0);
        const paintMaterial = standardPricing.material.find(m =>
            m.category === '페인트' || m.product_name.includes('페인트')
        );
        if (paintMaterial) {
            const paintArea = Math.ceil(balconyArea * 3.5); // 바닥 + 벽 + 천장
            items.push({
                category: QUOTE_CATEGORIES.PAINTING,
                item_name: paintMaterial.product_name,
                description: `발코니 ${balconies.length}개소`,
                quantity: paintArea,
                unit: paintMaterial.unit || '㎡',
                unit_price: paintMaterial.unit_price,
                total_price: Math.round(paintArea * paintMaterial.unit_price),
                cost_type: 'material',
                labor_ratio: 0,
                sort_order: sortOrder++,
                reference_type: 'material',
                reference_id: paintMaterial.id,
            });
        }
    }

    // [별도옵션] 청소 및 마감 - 기본 견적에서 제외
    // 필요시 관리자가 수동으로 추가할 수 있음

    // 기본 항목이 없는 경우 면적 기반 기본 견적
    if (items.length === 0) {
        // 기본 인테리어 비용 (평당 300만원 기준)
        const pyeong = floorArea / 3.3;
        const basePrice = 3000000;

        items.push({
            category: '기타',
            item_name: '인테리어 공사 (기본)',
            description: `${pyeong.toFixed(1)}평 기준 견적`,
            quantity: pyeong,
            unit: '평',
            unit_price: basePrice,
            total_price: Math.round(pyeong * basePrice),
            cost_type: 'composite',
            labor_ratio: 0.4,
            sort_order: 0,
        });
    }

    return items;
}
