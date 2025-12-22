import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
    Quote,
    QuoteItem,
    FloorplanAnalysisResult,
    GenerateQuoteRequest,
    QUOTE_CATEGORIES
} from '@/types/quote';
import { LaborCost, MaterialPrice, CompositeCost } from '@/lib/pricingTypes';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ====== 헬퍼 함수들 ======

/**
 * 면적(㎡)을 평형대로 변환
 */
function getSizeCategory(sqm: number): '30평대' | '40평대' | '50평대' | '60평대 이상' {
    const pyeong = sqm / 3.3058;
    if (pyeong < 35) return '30평대';
    if (pyeong < 45) return '40평대';
    if (pyeong < 55) return '50평대';
    return '60평대 이상';
}

/**
 * 가격 포맷팅
 */
function formatPrice(price: number): string {
    return new Intl.NumberFormat('ko-KR').format(price);
}

// ====== 수량 계산 규칙 ======

interface QuantityCalculationContext {
    floorArea: number; // 바닥 면적 (㎡)
    wallArea: number;  // 벽 면적 (㎡)
    ceilingArea: number; // 천장 면적 (㎡)
    sizeCategory: '30평대' | '40평대' | '50평대' | '60평대 이상';
    rooms: FloorplanAnalysisResult['rooms'];
    fixtures: FloorplanAnalysisResult['fixtures'];
    kitchen: FloorplanAnalysisResult['kitchen'];
    tileAreas: FloorplanAnalysisResult['tileAreas'];
    bedroomCount: number;
    bathroomCount: number;
    balconyCount: number;
}

/**
 * 도면 분석 결과 기반으로 수량 계산 컨텍스트 생성
 */
function createCalculationContext(
    analysisResult: FloorplanAnalysisResult | null | undefined,
    estimateSize: number | undefined
): QuantityCalculationContext {
    const totalArea = analysisResult?.totalArea || estimateSize || 100;
    const floorArea = analysisResult?.calculations?.floorArea || totalArea * 0.8;
    const wallArea = analysisResult?.calculations?.wallArea || floorArea * 2.5;
    const ceilingArea = analysisResult?.calculations?.ceilingArea || floorArea;

    const rooms = analysisResult?.rooms || [];
    const bedroomCount = rooms.filter(r => r.type === 'bedroom').length || 3;
    const bathroomCount = rooms.filter(r => r.type === 'bathroom').length ||
        analysisResult?.fixtures?.toilet || 2;
    const balconyCount = rooms.filter(r => r.type === 'balcony').length || 1;

    return {
        floorArea,
        wallArea,
        ceilingArea,
        sizeCategory: getSizeCategory(floorArea),
        rooms,
        fixtures: analysisResult?.fixtures || undefined,
        kitchen: analysisResult?.kitchen || undefined,
        tileAreas: analysisResult?.tileAreas || undefined,
        bedroomCount,
        bathroomCount,
        balconyCount,
    };
}

/**
 * 항목별 수량 계산 규칙
 * 카테고리/항목명 기반으로 적절한 수량 계산
 */
function calculateQuantity(
    item: { category: string; cost_name?: string; product_name?: string; labor_type?: string; unit: string },
    ctx: QuantityCalculationContext
): { quantity: number; description: string } {
    const name = item.cost_name || item.product_name || item.labor_type || '';
    const category = item.category || '';
    const unit = item.unit || '';

    // ===== 철거 관련 =====
    if (name.includes('철거') && !name.includes('폐기물')) {
        return {
            quantity: Math.ceil(ctx.floorArea),
            description: `전용면적 ${Math.ceil(ctx.floorArea)}㎡ 전체 철거`
        };
    }
    if (name.includes('폐기물')) {
        const tons = Math.max(1, Math.ceil(ctx.floorArea / 10));
        return {
            quantity: tons,
            description: `철거 폐기물 약 ${tons}톤 예상 (10㎡당 1톤 기준)`
        };
    }

    // ===== 바닥 관련 =====
    if (category.includes('바닥') || name.includes('마루')) {
        const area = Math.ceil(ctx.floorArea * 0.8 * 1.1); // 거실/침실 80%, 로스 10%
        return {
            quantity: area,
            description: `거실/침실 바닥 (전용면적 80% + 로스 10%)`
        };
    }

    // ===== 도배 관련 =====
    if (category.includes('도배') || name.includes('벽지') || name.includes('도배')) {
        const area = Math.ceil((ctx.wallArea + ctx.ceilingArea) * 1.05);
        return {
            quantity: area,
            description: `벽면 + 천장 (로스 5% 포함)`
        };
    }

    // ===== 타일 관련 =====
    if (category.includes('타일') || name.includes('타일')) {
        let tileArea: number;
        if (ctx.tileAreas) {
            tileArea = (ctx.tileAreas.bathroom || 0) + (ctx.tileAreas.entrance || 0) +
                (ctx.tileAreas.balcony || 0) + (ctx.tileAreas.kitchenWall || 0);
        } else {
            // 기본 추정
            tileArea = (ctx.bathroomCount * 15) + 5 + (ctx.balconyCount * 10) + 5;
        }
        const quantity = Math.ceil(tileArea * 1.1);
        return {
            quantity,
            description: `욕실/현관/베란다/주방벽 (로스 10% 포함)`
        };
    }

    // ===== 욕실 설비 =====
    if (name.includes('양변기') || name.includes('변기')) {
        return { quantity: ctx.bathroomCount, description: `욕실 ${ctx.bathroomCount}개소` };
    }
    if (name.includes('세면') && (name.includes('대') || name.includes('기'))) {
        return { quantity: ctx.bathroomCount, description: `욕실 ${ctx.bathroomCount}개소` };
    }
    if (name.includes('샤워') || name.includes('욕실수전')) {
        return { quantity: ctx.bathroomCount, description: `욕실 ${ctx.bathroomCount}개소` };
    }

    // ===== 주방 설비 =====
    if (name.includes('상부장')) {
        const length = ctx.kitchen?.upperCabinet || 3;
        return { quantity: length, description: `상부장 ${length}M` };
    }
    if (name.includes('하부장')) {
        const length = ctx.kitchen?.lowerCabinet || 3;
        return { quantity: length, description: `하부장 ${length}M` };
    }
    if (name.includes('싱크') && !name.includes('수전')) {
        return { quantity: 1, description: '주방 싱크볼' };
    }
    if (name.includes('인덕션') || name.includes('쿡탑')) {
        return { quantity: 1, description: '주방 조리대' };
    }
    if (name.includes('수전') && (category.includes('주방') || name.includes('주방'))) {
        return { quantity: 1, description: '주방 싱크수전' };
    }

    // ===== 전기 설비 =====
    if (name.includes('매입등') || (name.includes('LED') && name.includes('등'))) {
        let lights: number;
        switch (ctx.sizeCategory) {
            case '30평대': lights = (ctx.bedroomCount * 6) + 10 + 3 + (ctx.bathroomCount * 2); break;
            case '40평대': lights = (ctx.bedroomCount * 7) + 12 + 3 + (ctx.bathroomCount * 2); break;
            case '50평대': lights = (ctx.bedroomCount * 8) + 15 + 4 + (ctx.bathroomCount * 2); break;
            default: lights = (ctx.bedroomCount * 9) + 18 + 5 + (ctx.bathroomCount * 2);
        }
        return { quantity: lights, description: `${ctx.sizeCategory} 기준 매입등` };
    }
    if (name.includes('콘센트')) {
        const outlets = (ctx.bedroomCount * 3) + 5 + 2;
        return { quantity: outlets, description: '방당 3개, 거실 5개, 현관 2개' };
    }
    if (name.includes('스위치')) {
        const switches = ctx.bedroomCount + 3 + ctx.bathroomCount + 2; // 침실, 거실/주방/현관, 욕실, 기타
        return { quantity: switches, description: '각 실별 1개' };
    }

    // ===== 문/목공 =====
    if (name.includes('방문')) {
        return { quantity: ctx.bedroomCount, description: `침실 ${ctx.bedroomCount}개` };
    }
    if (name.includes('현관문')) {
        return { quantity: 1, description: '현관문 1개' };
    }
    if (name.includes('걸레받이')) {
        const perimeter = Math.ceil(ctx.floorArea * 0.4 * 4); // 대략적인 둘레 계산
        return { quantity: perimeter, description: `둘레 기준 (문/창문 제외)` };
    }

    // ===== 인건비 =====
    if (unit === '일' || name.includes('인건비')) {
        // 공종별 일수 계산
        if (name.includes('목수') || name.includes('목공')) {
            const days = Math.ceil(ctx.floorArea / 30); // 하루 30㎡
            return { quantity: days, description: `${days}일 작업` };
        }
        if (name.includes('타일공')) {
            let workers: number;
            switch (ctx.sizeCategory) {
                case '30평대': workers = 3; break;
                case '40평대': workers = 4; break;
                case '50평대': workers = 5; break;
                default: workers = 6;
            }
            const manDays = workers * 3;
            return { quantity: manDays, description: `${ctx.sizeCategory} 기준: ${workers}명 × 3일` };
        }
        if (name.includes('도배공')) {
            const days = Math.ceil((ctx.wallArea + ctx.ceilingArea) / 50);
            return { quantity: days, description: `${days}일 작업 (하루 50㎡)` };
        }
        if (name.includes('전기공')) {
            const days = Math.ceil(ctx.floorArea / 40);
            return { quantity: days, description: `${days}일 작업` };
        }
        if (name.includes('설비공')) {
            const days = ctx.bathroomCount >= 2 ? Math.ceil(ctx.bathroomCount * 1.5) : 0;
            return { quantity: days, description: `욕실 ${ctx.bathroomCount}개소 기준` };
        }
        if (name.includes('가구공')) {
            let days: number;
            switch (ctx.sizeCategory) {
                case '30평대': days = 2; break;
                case '40평대': days = 3; break;
                case '50평대': days = 4; break;
                default: days = 5;
            }
            return { quantity: days, description: `${ctx.sizeCategory} 기준 ${days}일` };
        }
        if (name.includes('철거공')) {
            const days = Math.ceil(ctx.floorArea / 40);
            return { quantity: days, description: `${days}일 작업` };
        }
        // 기타 인건비
        const days = Math.ceil(ctx.floorArea / 50);
        return { quantity: days, description: `${days}일 작업` };
    }

    // ===== 기타 복합비용 =====
    if (name.includes('양중비')) {
        return { quantity: 1, description: '자재 양중 비용' };
    }
    if (name.includes('가설공사') || name.includes('보양')) {
        return { quantity: 1, description: '보양재/안전시설' };
    }
    if (name.includes('청소')) {
        return { quantity: Math.ceil(ctx.floorArea), description: `전용면적 ${Math.ceil(ctx.floorArea)}㎡` };
    }

    // ===== 기본값 =====
    if (unit === '식') return { quantity: 1, description: '일식' };
    if (unit === '%') return { quantity: 5, description: '공사비의 5%' };
    if (unit === '㎡') return { quantity: Math.ceil(ctx.floorArea), description: '전용면적 기준' };
    if (unit === 'M') return { quantity: 10, description: '기본 10M' };
    if (unit === '개') return { quantity: 1, description: '기본 1개' };

    return { quantity: 1, description: '' };
}

// ====== 대표 항목으로 견적 템플릿 생성 ======

interface RepresentativeItem {
    id: string;
    type: 'labor' | 'material' | 'composite';
    category: string;
    sub_category?: string;
    name: string;
    unit: string;
    unit_price: number;
    labor_ratio?: number;
    description?: string;
    cost_name?: string;
    product_name?: string;
    labor_type?: string;
}

/**
 * 대표 항목(기본)들을 가져와서 견적 항목으로 변환
 * @param manualMode true일 경우 모든 수량을 1로 설정 (도면 없이 수동 입력 모드)
 */
function generateQuoteFromRepresentatives(
    representativeItems: {
        labor: LaborCost[];
        material: MaterialPrice[];
        composite: CompositeCost[];
    },
    ctx: QuantityCalculationContext,
    manualMode: boolean = false
): Partial<QuoteItem>[] {
    const items: Partial<QuoteItem>[] = [];
    let sortOrder = 0;

    // 카테고리 순서 정의 (견적서 표시 순서)
    const categoryOrder: Record<string, number> = {
        [QUOTE_CATEGORIES.DEMOLITION]: 1,
        '가설': 2,
        '운반': 3,
        [QUOTE_CATEGORIES.FLOOR]: 4,
        [QUOTE_CATEGORIES.WALLPAPER]: 5,
        [QUOTE_CATEGORIES.TILE]: 6,
        [QUOTE_CATEGORIES.BATHROOM]: 7,
        [QUOTE_CATEGORIES.KITCHEN]: 8,
        [QUOTE_CATEGORIES.WINDOW]: 9,
        [QUOTE_CATEGORIES.DOOR]: 10,
        '도어': 11,
        [QUOTE_CATEGORIES.ELECTRICAL]: 12,
        [QUOTE_CATEGORIES.PLUMBING]: 13,
        [QUOTE_CATEGORIES.FURNITURE]: 14,
        '목공': 15,
        [QUOTE_CATEGORIES.CLEANING]: 16,
        '보험': 17,
        '관리': 18,
        [QUOTE_CATEGORIES.LABOR]: 19, // 인건비 카테고리
        [QUOTE_CATEGORIES.OTHER]: 99,
    };

    // 모든 대표 항목을 통합
    const allRepresentatives: RepresentativeItem[] = [];

    // 복합 비용 - DB 카테고리 그대로 사용
    representativeItems.composite.forEach(c => {
        allRepresentatives.push({
            id: c.id,
            type: 'composite',
            category: c.category || QUOTE_CATEGORIES.OTHER, // DB 카테고리 그대로
            sub_category: c.sub_category || undefined,
            name: c.cost_name,
            cost_name: c.cost_name,
            unit: c.unit,
            unit_price: c.unit_price,
            labor_ratio: c.labor_ratio || 0.3,
            description: c.description || c.calculation_notes || undefined,
        });
    });

    // 자재 - DB 카테고리 그대로 사용
    representativeItems.material.forEach(m => {
        allRepresentatives.push({
            id: m.id,
            type: 'material',
            category: m.category || QUOTE_CATEGORIES.OTHER, // DB 카테고리 그대로
            sub_category: m.sub_category || undefined,
            name: m.product_name,
            product_name: m.product_name,
            unit: m.unit,
            unit_price: m.unit_price,
            labor_ratio: 0,
            description: m.notes || undefined,
        });
    });

    // 인건비 - 모두 '인건비' 카테고리로 통합
    representativeItems.labor.forEach(l => {
        allRepresentatives.push({
            id: l.id,
            type: 'labor',
            category: QUOTE_CATEGORIES.LABOR, // 인건비 카테고리로 통합
            name: `${l.labor_type} 인건비`,
            labor_type: l.labor_type,
            unit: '품',
            unit_price: l.daily_rate,
            labor_ratio: 1,
            description: l.description || undefined,
        });
    });

    // 카테고리 순서로 정렬
    allRepresentatives.sort((a, b) => {
        const orderA = categoryOrder[a.category] || 99;
        const orderB = categoryOrder[b.category] || 99;
        return orderA - orderB;
    });

    // 각 대표 항목에 대해 수량 계산 및 견적 항목 생성
    for (const rep of allRepresentatives) {
        // 수동 모드면 수량 1, 아니면 계산된 수량 사용
        let quantity = 1;
        let description = '수동 입력';

        if (!manualMode) {
            const calcResult = calculateQuantity(
                {
                    category: rep.category,
                    cost_name: rep.cost_name,
                    product_name: rep.product_name,
                    labor_type: rep.labor_type,
                    unit: rep.unit
                },
                ctx
            );
            quantity = calcResult.quantity;
            description = calcResult.description;

            // 수량이 0이면 건너뛰기 (수동 모드가 아닐 때만)
            if (quantity <= 0) continue;
        }

        const totalPrice = Math.round(quantity * rep.unit_price);

        items.push({
            category: rep.category,
            sub_category: rep.sub_category,
            item_name: rep.name,
            description: description || rep.description,
            quantity: quantity,
            unit: rep.unit,
            unit_price: rep.unit_price,
            total_price: totalPrice,
            cost_type: rep.type,
            labor_ratio: rep.labor_ratio || 0,
            sort_order: sortOrder++,
            is_optional: false,
            is_included: true,
            reference_type: rep.type,
            reference_id: rep.id,
        });
    }

    return items;
}

// ====== AI 계산 설명 생성 ======

function generateCalculationComment(
    ctx: QuantityCalculationContext,
    items: Partial<QuoteItem>[],
    estimate: { size?: string; complex_name?: string }
): string {
    const comments: string[] = [];

    // 기본 정보
    const pyeong = estimate.size ? parseFloat(estimate.size) : Math.round(ctx.floorArea / 3.3058);

    comments.push(`## 📐 면적 정보`);
    comments.push(`- **공급면적**: ${pyeong}평 (약 ${Math.round(ctx.floorArea)}㎡)`);
    comments.push(`- **평형대 분류**: ${ctx.sizeCategory}`);
    comments.push(`- **전용면적 (바닥)**: ${ctx.floorArea.toFixed(1)}㎡`);
    comments.push(`- **벽면적**: ${ctx.wallArea.toFixed(1)}㎡`);
    comments.push(`- **천장면적**: ${ctx.ceilingArea.toFixed(1)}㎡`);

    // 공간 구성
    comments.push(`\n## 🏠 공간 구성`);
    comments.push(`- 침실: ${ctx.bedroomCount}개`);
    comments.push(`- 욕실: ${ctx.bathroomCount}개`);
    comments.push(`- 발코니: ${ctx.balconyCount}개`);

    // 주요 항목 계산 근거
    comments.push(`\n## 📋 주요 항목 계산 근거`);

    // 카테고리별 요약
    const categoryItems: Record<string, Partial<QuoteItem>[]> = {};
    items.forEach(item => {
        const cat = item.category || QUOTE_CATEGORIES.OTHER;
        if (!categoryItems[cat]) categoryItems[cat] = [];
        categoryItems[cat].push(item);
    });

    Object.entries(categoryItems).forEach(([cat, catItems]) => {
        const catTotal = catItems.reduce((sum, i) => sum + (i.total_price || 0), 0);
        comments.push(`\n### ${cat} (₩${formatPrice(catTotal)})`);
        catItems.forEach(item => {
            if (item.description) {
                comments.push(`- **${item.item_name}**: ${item.quantity}${item.unit} - ${item.description}`);
            } else {
                comments.push(`- **${item.item_name}**: ${item.quantity}${item.unit}`);
            }
        });
    });

    // 적용된 규칙
    comments.push(`\n## ⚙️ 적용된 계산 규칙`);
    comments.push(`1. **대표 항목 기반**: 표준단가표의 '기본' 등급 대표 항목 자동 적용`);
    comments.push(`2. **면적 기반 계산**: 전용면적 ${ctx.floorArea.toFixed(0)}㎡ 기준`);
    comments.push(`3. **평형대별 규칙**: ${ctx.sizeCategory} 기준 인원/수량 계산`);
    comments.push(`4. **설비 수량**: 욕실 ${ctx.bathroomCount}개소 기준`);

    comments.push(`\n---`);
    comments.push(`*이 견적서는 표준단가표의 대표 항목을 기반으로 자동 생성되었습니다.*`);
    comments.push(`*실제 현장 실측 시 수량이 변경될 수 있습니다.*`);

    return comments.join('\n');
}

// ====== 견적번호 생성 ======

async function generateQuoteNumber(): Promise<string> {
    const year = new Date().getFullYear();

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

// ====== API 핸들러 ======

export async function POST(request: NextRequest) {
    try {
        const body: GenerateQuoteRequest = await request.json();
        const { estimate_id, floorplan_id, analysis_result, manual_mode, options } = body;

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

        // ⭐ 핵심: 대표 항목(기본)만 조회
        const [laborResult, materialResult, compositeResult] = await Promise.all([
            supabase.from('labor_costs')
                .select('*')
                .eq('is_active', true)
                .eq('representative_grade', '기본'),
            supabase.from('material_prices')
                .select('*')
                .eq('is_active', true)
                .eq('representative_grade', '기본'),
            supabase.from('composite_costs')
                .select('*')
                .eq('is_active', true)
                .eq('representative_grade', '기본'),
        ]);

        const representativeItems = {
            labor: (laborResult.data || []) as LaborCost[],
            material: (materialResult.data || []) as MaterialPrice[],
            composite: (compositeResult.data || []) as CompositeCost[],
        };

        console.log('[Quote Generate] 대표 항목 개수:', {
            labor: representativeItems.labor.length,
            material: representativeItems.material.length,
            composite: representativeItems.composite.length,
        });

        // 대표 항목이 없으면 경고
        const totalRepresentatives = representativeItems.labor.length +
            representativeItems.material.length +
            representativeItems.composite.length;

        if (totalRepresentatives === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: '표준단가표에 \'기본\' 등급 대표 항목이 없습니다. 먼저 표준단가 관리에서 대표 항목을 지정해주세요.'
                },
                { status: 400 }
            );
        }

        // 수량 계산 컨텍스트 생성
        const estimateSize = estimate.size ? Math.round(parseFloat(estimate.size) * 3.3058) : undefined;
        const ctx = createCalculationContext(analysisData, estimateSize);

        // ⭐ 대표 항목 기반으로 견적 항목 생성 (수동 모드면 수량 1로 시작)
        const quoteItems = generateQuoteFromRepresentatives(representativeItems, ctx, manual_mode || false);

        console.log('[Quote Generate] 생성된 견적 항목 수:', quoteItems.length);

        // AI 계산 설명 생성
        const calculationComment = generateCalculationComment(ctx, quoteItems, estimate);

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
                calculation_comment: calculationComment,
                customer_name: estimate.name,
                customer_email: estimate.email,
                customer_phone: estimate.phone,
                property_address: estimate.address,
                property_size: estimateSize || null,
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
            meta: {
                representativeItemsUsed: totalRepresentatives,
                generatedItemsCount: quoteItems.length,
            }
        });

    } catch (error) {
        console.error('Quote generate error:', error);
        return NextResponse.json(
            { success: false, error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
