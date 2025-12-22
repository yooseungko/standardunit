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
            // "new-"로 시작하는 ID는 임시 ID이므로 유효한 UUID가 아님
            const isValidUUID = (id: string) => id && !id.toString().startsWith('new-');

            // 현재 items의 id 목록 (유효한 UUID만)
            const currentItemIds = items
                .filter((item: { id?: string }) => item.id && isValidUUID(item.id))
                .map((item: { id: string }) => item.id);

            // 기존 항목 중 현재 목록에 없는 것들 삭제
            if (currentItemIds.length > 0) {
                await supabase
                    .from('quote_items')
                    .delete()
                    .eq('quote_id', id)
                    .not('id', 'in', `(${currentItemIds.join(',')})`);
            } else {
                // 모든 기존 항목 삭제 (새로 생성된 견적서인 경우)
                await supabase.from('quote_items').delete().eq('quote_id', id);
            }

            // 기존 항목 (유효한 UUID가 있는 것) - upsert
            const existingItems = items
                .filter((item: { id?: string }) => item.id && isValidUUID(item.id))
                .map((item: Record<string, unknown>, index: number) => {
                    const { created_at, ...rest } = item;
                    return {
                        ...rest,
                        quote_id: id,
                        sort_order: index,
                    };
                });

            // 새 항목 (new-로 시작하는 ID 또는 ID가 없는 것) - insert
            const newItems = items
                .filter((item: { id?: string }) => !item.id || !isValidUUID(item.id))
                .map((item: Record<string, unknown>, index: number) => {
                    const { id: itemId, created_at, ...rest } = item;
                    return {
                        ...rest,
                        quote_id: id,
                        sort_order: existingItems.length + index,
                    };
                });

            // 기존 항목 upsert
            if (existingItems.length > 0) {
                const { error: upsertError } = await supabase
                    .from('quote_items')
                    .upsert(existingItems, { onConflict: 'id' });

                if (upsertError) {
                    console.error('Quote items upsert error:', upsertError);
                    return NextResponse.json(
                        { success: false, error: '견적 항목 수정 실패: ' + upsertError.message },
                        { status: 500 }
                    );
                }
            }

            // 새 항목 insert
            if (newItems.length > 0) {
                const { error: insertError } = await supabase
                    .from('quote_items')
                    .insert(newItems);

                if (insertError) {
                    console.error('Quote items insert error:', insertError);
                    return NextResponse.json(
                        { success: false, error: '견적 항목 추가 실패: ' + insertError.message },
                        { status: 500 }
                    );
                }
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

        console.log('📋 견적서 삭제 요청:', { id });

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID가 필요합니다.' },
                { status: 400 }
            );
        }

        // 견적 항목 먼저 삭제 (CASCADE가 없는 경우)
        const { error: itemsError } = await supabase.from('quote_items').delete().eq('quote_id', id);
        if (itemsError) {
            console.error('❌ 견적 항목 삭제 실패:', itemsError);
        } else {
            console.log('✅ 견적 항목 삭제 완료');
        }

        // 견적서 삭제
        const { error } = await supabase
            .from('quotes')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('❌ 견적서 삭제 실패:', error);
            return NextResponse.json(
                { success: false, error: '삭제 실패: ' + error.message },
                { status: 500 }
            );
        }

        console.log('✅ 견적서 삭제 완료:', id);
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
