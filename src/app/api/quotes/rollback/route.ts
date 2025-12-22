import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 버전으로 롤백
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { quote_id, version_id } = body;

        if (!quote_id || !version_id) {
            return NextResponse.json(
                { success: false, error: 'quote_id와 version_id가 필요합니다.' },
                { status: 400 }
            );
        }

        // 롤백할 버전 조회
        const { data: version, error: versionError } = await supabase
            .from('quote_versions')
            .select(`
                *,
                items:quote_version_items(*)
            `)
            .eq('id', version_id)
            .single();

        if (versionError || !version) {
            return NextResponse.json(
                { success: false, error: '버전을 찾을 수 없습니다.' },
                { status: 404 }
            );
        }

        // 현재 견적서의 상태도 버전으로 저장 (롤백 전 백업)
        const { data: currentQuote } = await supabase
            .from('quotes')
            .select(`
                *,
                items:quote_items(*)
            `)
            .eq('id', quote_id)
            .single();

        if (currentQuote) {
            // 현재 상태를 버전으로 저장 (롤백 전 백업)
            const { data: maxVersionData } = await supabase
                .from('quote_versions')
                .select('version_number')
                .eq('quote_id', quote_id)
                .order('version_number', { ascending: false })
                .limit(1)
                .single();

            const nextVersionNumber = (maxVersionData?.version_number || 0) + 1;

            const backupVersionData = {
                quote_id: quote_id,
                version_number: nextVersionNumber,
                quote_number: `${currentQuote.quote_number}-v${nextVersionNumber}`,
                saved_at: new Date().toISOString(),
                saved_reason: `롤백 전 백업 (v${version.version_number}으로 롤백)`,
                total_amount: currentQuote.total_amount || 0,
                labor_cost: currentQuote.labor_cost || 0,
                material_cost: currentQuote.material_cost || 0,
                other_cost: currentQuote.other_cost || 0,
                discount_amount: currentQuote.discount_amount || 0,
                discount_reason: currentQuote.discount_reason,
                vat_amount: currentQuote.vat_amount || 0,
                final_amount: currentQuote.final_amount || 0,
                status: currentQuote.status || 'draft',
                notes: currentQuote.notes,
                calculation_comment: currentQuote.calculation_comment,
                valid_until: currentQuote.valid_until,
                customer_name: currentQuote.customer_name,
                customer_email: currentQuote.customer_email,
                customer_phone: currentQuote.customer_phone,
                property_address: currentQuote.property_address,
                property_size: currentQuote.property_size,
            };

            const { data: backupVersion } = await supabase
                .from('quote_versions')
                .insert(backupVersionData)
                .select()
                .single();

            // 현재 항목들도 백업
            if (backupVersion && currentQuote.items && currentQuote.items.length > 0) {
                const backupItems = currentQuote.items.map((item: Record<string, unknown>) => ({
                    version_id: backupVersion.id,
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

                await supabase.from('quote_version_items').insert(backupItems);
            }
        }

        // 견적서를 버전 데이터로 업데이트
        const quoteUpdateData = {
            total_amount: version.total_amount,
            labor_cost: version.labor_cost,
            material_cost: version.material_cost,
            other_cost: version.other_cost,
            discount_amount: version.discount_amount,
            discount_reason: version.discount_reason,
            vat_amount: version.vat_amount,
            final_amount: version.final_amount,
            status: version.status,
            notes: version.notes,
            calculation_comment: version.calculation_comment,
            valid_until: version.valid_until,
            updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
            .from('quotes')
            .update(quoteUpdateData)
            .eq('id', quote_id);

        if (updateError) {
            console.error('Quote rollback update error:', updateError);
            return NextResponse.json(
                { success: false, error: '견적서 롤백 실패' },
                { status: 500 }
            );
        }

        // 기존 항목 삭제
        await supabase.from('quote_items').delete().eq('quote_id', quote_id);

        // 버전의 항목들을 현재 견적서로 복원
        if (version.items && version.items.length > 0) {
            const restoredItems = version.items.map((item: Record<string, unknown>, index: number) => ({
                quote_id: quote_id,
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
                sort_order: index,
                is_optional: item.is_optional,
                is_included: item.is_included,
                reference_type: item.reference_type,
                reference_id: item.reference_id,
            }));

            const { error: itemsError } = await supabase
                .from('quote_items')
                .insert(restoredItems);

            if (itemsError) {
                console.error('Rollback items error:', itemsError);
            }
        }

        // 업데이트된 견적서 조회
        const { data: rolledBackQuote } = await supabase
            .from('quotes')
            .select(`
                *,
                items:quote_items(*)
            `)
            .eq('id', quote_id)
            .single();

        return NextResponse.json({
            success: true,
            data: rolledBackQuote,
            message: `버전 ${version.version_number}(으)로 롤백되었습니다.`,
        });

    } catch (error) {
        console.error('Quote rollback error:', error);
        return NextResponse.json(
            { success: false, error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
