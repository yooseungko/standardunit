import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 견적서 버전 목록 조회
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const quoteId = searchParams.get('quote_id');

        if (!quoteId) {
            return NextResponse.json(
                { success: false, error: 'quote_id가 필요합니다.' },
                { status: 400 }
            );
        }

        // 버전 목록 조회 (최신순)
        const { data: versions, error } = await supabase
            .from('quote_versions')
            .select(`
                *,
                items:quote_version_items(*)
            `)
            .eq('quote_id', quoteId)
            .order('version_number', { ascending: false });

        if (error) {
            console.error('Quote versions query error:', error);
            return NextResponse.json(
                { success: false, error: '버전 목록 조회 실패' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: versions || [],
        });

    } catch (error) {
        console.error('Quote versions list error:', error);
        return NextResponse.json(
            { success: false, error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

// 현재 견적서를 버전으로 저장
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { quote_id, reason } = body;

        if (!quote_id) {
            return NextResponse.json(
                { success: false, error: 'quote_id가 필요합니다.' },
                { status: 400 }
            );
        }

        // 현재 견적서 조회
        const { data: currentQuote, error: quoteError } = await supabase
            .from('quotes')
            .select(`
                *,
                items:quote_items(*)
            `)
            .eq('id', quote_id)
            .single();

        if (quoteError || !currentQuote) {
            return NextResponse.json(
                { success: false, error: '견적서를 찾을 수 없습니다.' },
                { status: 404 }
            );
        }

        // 현재 최대 버전 번호 조회
        const { data: maxVersionData } = await supabase
            .from('quote_versions')
            .select('version_number')
            .eq('quote_id', quote_id)
            .order('version_number', { ascending: false })
            .limit(1)
            .single();

        const nextVersionNumber = (maxVersionData?.version_number || 0) + 1;

        // 버전 생성
        const versionData = {
            quote_id: quote_id,
            version_number: nextVersionNumber,
            quote_number: `${currentQuote.quote_number}-v${nextVersionNumber}`,
            saved_at: new Date().toISOString(),
            saved_reason: reason || '수정',

            // 금액 복사
            total_amount: currentQuote.total_amount || 0,
            labor_cost: currentQuote.labor_cost || 0,
            material_cost: currentQuote.material_cost || 0,
            other_cost: currentQuote.other_cost || 0,
            discount_amount: currentQuote.discount_amount || 0,
            discount_reason: currentQuote.discount_reason,
            vat_amount: currentQuote.vat_amount || 0,
            final_amount: currentQuote.final_amount || 0,

            // 상태 복사
            status: currentQuote.status || 'draft',
            notes: currentQuote.notes,
            calculation_comment: currentQuote.calculation_comment,
            valid_until: currentQuote.valid_until,

            // 고객 정보 복사
            customer_name: currentQuote.customer_name,
            customer_email: currentQuote.customer_email,
            customer_phone: currentQuote.customer_phone,
            property_address: currentQuote.property_address,
            property_size: currentQuote.property_size,
        };

        const { data: newVersion, error: versionError } = await supabase
            .from('quote_versions')
            .insert(versionData)
            .select()
            .single();

        if (versionError) {
            console.error('Version create error:', versionError);
            return NextResponse.json(
                { success: false, error: '버전 저장 실패: ' + versionError.message },
                { status: 500 }
            );
        }

        // 항목들 복사
        if (currentQuote.items && currentQuote.items.length > 0) {
            const versionItems = currentQuote.items.map((item: Record<string, unknown>) => ({
                version_id: newVersion.id,
                category: item.category,
                sub_category: item.sub_category,
                item_name: item.item_name,
                description: item.description,
                size: item.size,
                quantity: item.quantity,
                unit: item.unit,
                unit_price: item.unit_price,
                total_price: item.total_price,
                cost_type: item.cost_type,
                labor_ratio: item.labor_ratio,
                sort_order: item.sort_order,
                is_optional: item.is_optional,
                is_included: item.is_included,
                reference_type: item.reference_type,
                reference_id: item.reference_id,
            }));

            const { error: itemsError } = await supabase
                .from('quote_version_items')
                .insert(versionItems);

            if (itemsError) {
                console.error('Version items error:', itemsError);
                // 버전은 생성됨, 항목만 실패
            }
        }

        // 생성된 버전 다시 조회 (항목 포함)
        const { data: savedVersion } = await supabase
            .from('quote_versions')
            .select(`
                *,
                items:quote_version_items(*)
            `)
            .eq('id', newVersion.id)
            .single();

        return NextResponse.json({
            success: true,
            data: savedVersion,
            message: `버전 ${nextVersionNumber}이(가) 저장되었습니다.`,
        });

    } catch (error) {
        console.error('Quote version save error:', error);
        return NextResponse.json(
            { success: false, error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
