import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 견적서 목록 조회
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const estimateId = searchParams.get('estimate_id');
        const status = searchParams.get('status');

        // 단일 견적서 조회
        if (id) {
            const { data: quote, error } = await supabase
                .from('quotes')
                .select(`
                    *,
                    items:quote_items(*),
                    floorplan:floorplans(*)
                `)
                .eq('id', id)
                .single();

            if (error) {
                return NextResponse.json(
                    { success: false, error: '견적서를 찾을 수 없습니다.' },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                data: quote,
            });
        }

        // 목록 조회
        let query = supabase
            .from('quotes')
            .select(`
                *,
                items:quote_items(*)
            `)
            .order('created_at', { ascending: false });

        if (estimateId) {
            query = query.eq('estimate_id', parseInt(estimateId));
        }

        if (status) {
            query = query.eq('status', status);
        }

        const { data: quotes, error } = await query;

        if (error) {
            console.error('Quotes query error:', error);
            return NextResponse.json(
                { success: false, error: '데이터 조회 실패' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: quotes,
        });

    } catch (error) {
        console.error('Quotes list error:', error);
        return NextResponse.json(
            { success: false, error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

// 견적서 수정
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, items, ...quoteData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID가 필요합니다.' },
                { status: 400 }
            );
        }

        // 견적서 업데이트
        if (Object.keys(quoteData).length > 0) {
            // 금액 재계산
            if (items && items.length > 0) {
                const laborCost = items
                    .filter((item: { cost_type: string; is_included: boolean }) => item.cost_type === 'labor' && item.is_included !== false)
                    .reduce((sum: number, item: { total_price: number }) => sum + item.total_price, 0);

                const materialCost = items
                    .filter((item: { cost_type: string; is_included: boolean }) => item.cost_type === 'material' && item.is_included !== false)
                    .reduce((sum: number, item: { total_price: number }) => sum + item.total_price, 0);

                const compositeTotalPrice = items
                    .filter((item: { cost_type: string; is_included: boolean }) => item.cost_type === 'composite' && item.is_included !== false)
                    .reduce((sum: number, item: { total_price: number }) => sum + item.total_price, 0);

                const compositeLabor = items
                    .filter((item: { cost_type: string; is_included: boolean }) => item.cost_type === 'composite' && item.is_included !== false)
                    .reduce((sum: number, item: { total_price: number; labor_ratio: number }) =>
                        sum + Math.round(item.total_price * (item.labor_ratio || 0.3)), 0);

                const compositeMaterial = compositeTotalPrice - compositeLabor;

                quoteData.labor_cost = laborCost + compositeLabor;
                quoteData.material_cost = materialCost + compositeMaterial;
                quoteData.total_amount = quoteData.labor_cost + quoteData.material_cost + (quoteData.other_cost || 0);
                quoteData.final_amount = quoteData.total_amount - (quoteData.discount_amount || 0) + (quoteData.vat_amount || 0);
            }

            const { error: updateError } = await supabase
                .from('quotes')
                .update(quoteData)
                .eq('id', id);

            if (updateError) {
                console.error('Quote update error:', updateError);
                return NextResponse.json(
                    { success: false, error: '견적서 수정 실패' },
                    { status: 500 }
                );
            }
        }

        // 항목 업데이트
        if (items && items.length > 0) {
            // 기존 항목 삭제 후 새로 삽입
            await supabase.from('quote_items').delete().eq('quote_id', id);

            const itemsToInsert = items.map((item: Record<string, unknown>, index: number) => ({
                ...item,
                quote_id: id,
                sort_order: index,
            }));

            const { error: itemsError } = await supabase
                .from('quote_items')
                .insert(itemsToInsert);

            if (itemsError) {
                console.error('Quote items update error:', itemsError);
                return NextResponse.json(
                    { success: false, error: '견적 항목 수정 실패' },
                    { status: 500 }
                );
            }
        }

        // 업데이트된 견적서 조회
        const { data: updatedQuote } = await supabase
            .from('quotes')
            .select(`
                *,
                items:quote_items(*)
            `)
            .eq('id', id)
            .single();

        return NextResponse.json({
            success: true,
            data: updatedQuote,
        });

    } catch (error) {
        console.error('Quote update error:', error);
        return NextResponse.json(
            { success: false, error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

// 견적서 삭제
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID가 필요합니다.' },
                { status: 400 }
            );
        }

        // 견적 항목 먼저 삭제 (CASCADE가 없는 경우)
        await supabase.from('quote_items').delete().eq('quote_id', id);

        // 견적서 삭제
        const { error } = await supabase
            .from('quotes')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json(
                { success: false, error: '삭제 실패: ' + error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: '견적서가 삭제되었습니다.',
        });

    } catch (error) {
        console.error('Quote delete error:', error);
        return NextResponse.json(
            { success: false, error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
