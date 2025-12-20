import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
    LaborCost,
    MaterialPrice,
    CompositeCost,
    DEFAULT_LABOR_COSTS,
    DEFAULT_MATERIAL_PRICES,
    DEFAULT_COMPOSITE_COSTS
} from '@/lib/pricingTypes';

// 로컬 스토리지 (Supabase 미연결 시)
let localLaborCosts: LaborCost[] = [];
let localMaterialPrices: MaterialPrice[] = [];
let localCompositeCosts: CompositeCost[] = [];

// 기본값으로 초기화
function initializeLocalData() {
    if (localLaborCosts.length === 0) {
        localLaborCosts = DEFAULT_LABOR_COSTS.map((item, idx) => ({
            ...item,
            id: `labor-${idx}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })) as LaborCost[];
    }

    if (localMaterialPrices.length === 0) {
        localMaterialPrices = DEFAULT_MATERIAL_PRICES.map((item, idx) => ({
            ...item,
            id: `material-${idx}`,
            is_active: true,
            is_verified: false,
            price_includes_install: false,
            price_date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })) as MaterialPrice[];
    }

    if (localCompositeCosts.length === 0) {
        localCompositeCosts = DEFAULT_COMPOSITE_COSTS.map((item, idx) => ({
            ...item,
            id: `composite-${idx}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })) as CompositeCost[];
    }
}

initializeLocalData();

// GET - 모든 단가 조회
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'labor' | 'material' | 'composite' | 'all'

    try {
        if (isSupabaseConfigured && supabase) {
            const result: {
                labor?: LaborCost[];
                material?: MaterialPrice[];
                composite?: CompositeCost[];
            } = {};

            if (!type || type === 'all' || type === 'labor') {
                const { data: laborData, error: laborError } = await supabase
                    .from('labor_costs')
                    .select('*')
                    .eq('is_active', true)
                    .order('labor_type');

                if (laborError) throw laborError;
                result.labor = laborData || [];
            }

            if (!type || type === 'all' || type === 'material') {
                const { data: materialData, error: materialError } = await supabase
                    .from('material_prices')
                    .select('*')
                    .eq('is_active', true)
                    .order('category')
                    .order('sub_category')
                    .order('product_name');

                if (materialError) throw materialError;
                result.material = materialData || [];
            }

            if (!type || type === 'all' || type === 'composite') {
                const { data: compositeData, error: compositeError } = await supabase
                    .from('composite_costs')
                    .select('*')
                    .eq('is_active', true)
                    .order('category')
                    .order('cost_name');

                if (compositeError) throw compositeError;
                result.composite = compositeData || [];
            }

            return NextResponse.json({
                success: true,
                data: result,
                isSupabaseConfigured: true,
            });
        } else {
            // 로컬 데이터 반환
            const result: {
                labor?: LaborCost[];
                material?: MaterialPrice[];
                composite?: CompositeCost[];
            } = {};

            if (!type || type === 'all' || type === 'labor') {
                result.labor = localLaborCosts.filter(l => l.is_active);
            }
            if (!type || type === 'all' || type === 'material') {
                result.material = localMaterialPrices.filter(m => m.is_active);
            }
            if (!type || type === 'all' || type === 'composite') {
                result.composite = localCompositeCosts.filter(c => c.is_active);
            }

            return NextResponse.json({
                success: true,
                data: result,
                isSupabaseConfigured: false,
                message: 'Supabase 미연결 - 로컬 기본값 사용',
            });
        }
    } catch (error) {
        console.error('단가 조회 오류 (로컬 폴백 사용):', error);

        // Supabase 에러 시 로컬 데이터로 폴백
        initializeLocalData();

        const result: {
            labor?: LaborCost[];
            material?: MaterialPrice[];
            composite?: CompositeCost[];
        } = {};

        if (!type || type === 'all' || type === 'labor') {
            result.labor = localLaborCosts.filter(l => l.is_active);
        }
        if (!type || type === 'all' || type === 'material') {
            result.material = localMaterialPrices.filter(m => m.is_active);
        }
        if (!type || type === 'all' || type === 'composite') {
            result.composite = localCompositeCosts.filter(c => c.is_active);
        }

        return NextResponse.json({
            success: true,
            data: result,
            isSupabaseConfigured: false,
            message: 'DB 테이블 미생성 - 로컬 기본값 사용. Supabase에 supabase-pricing-tables.sql을 실행하세요.',
        });
    }
}

// POST - 단가 추가/수정
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, data } = body;

        if (!type || !data) {
            return NextResponse.json(
                { success: false, error: 'type과 data가 필요합니다.' },
                { status: 400 }
            );
        }

        if (isSupabaseConfigured && supabase) {
            let result;

            switch (type) {
                case 'labor':
                    if (data.id) {
                        // 수정
                        const { data: updated, error } = await supabase
                            .from('labor_costs')
                            .update({
                                labor_type: data.labor_type,
                                labor_type_en: data.labor_type_en,
                                description: data.description,
                                daily_rate: data.daily_rate,
                                hourly_rate: data.hourly_rate,
                                notes: data.notes,
                            })
                            .eq('id', data.id)
                            .select()
                            .single();

                        if (error) throw error;
                        result = updated;
                    } else {
                        // 추가
                        const { data: inserted, error } = await supabase
                            .from('labor_costs')
                            .insert({
                                labor_type: data.labor_type,
                                labor_type_en: data.labor_type_en,
                                description: data.description,
                                daily_rate: data.daily_rate,
                                hourly_rate: data.hourly_rate,
                                notes: data.notes,
                            })
                            .select()
                            .single();

                        if (error) throw error;
                        result = inserted;
                    }
                    break;

                case 'material':
                    if (data.id) {
                        const { data: updated, error } = await supabase
                            .from('material_prices')
                            .update({
                                category: data.category,
                                sub_category: data.sub_category,
                                detail_category: data.detail_category,
                                product_name: data.product_name,
                                brand: data.brand,
                                model: data.model,
                                product_grade: data.product_grade,
                                unit: data.unit,
                                unit_price: data.unit_price,
                                price_includes_install: data.price_includes_install,
                                source: data.source,
                                source_url: data.source_url,
                                notes: data.notes,
                                is_verified: data.is_verified,
                            })
                            .eq('id', data.id)
                            .select()
                            .single();

                        if (error) throw error;
                        result = updated;
                    } else {
                        const { data: inserted, error } = await supabase
                            .from('material_prices')
                            .insert({
                                category: data.category,
                                sub_category: data.sub_category,
                                detail_category: data.detail_category,
                                product_name: data.product_name,
                                brand: data.brand,
                                model: data.model,
                                product_grade: data.product_grade || '일반',
                                unit: data.unit,
                                unit_price: data.unit_price,
                                price_includes_install: data.price_includes_install || false,
                                source: data.source,
                                source_url: data.source_url,
                                notes: data.notes,
                            })
                            .select()
                            .single();

                        if (error) throw error;
                        result = inserted;
                    }
                    break;

                case 'composite':
                    if (data.id) {
                        const { data: updated, error } = await supabase
                            .from('composite_costs')
                            .update({
                                cost_name: data.cost_name,
                                cost_name_en: data.cost_name_en,
                                description: data.description,
                                category: data.category,
                                sub_category: data.sub_category,
                                unit: data.unit,
                                unit_price: data.unit_price,
                                labor_ratio: data.labor_ratio,
                                material_ratio: data.material_ratio,
                                service_ratio: data.service_ratio,
                                other_ratio: data.other_ratio,
                                min_quantity: data.min_quantity,
                                calculation_notes: data.calculation_notes,
                                notes: data.notes,
                            })
                            .eq('id', data.id)
                            .select()
                            .single();

                        if (error) throw error;
                        result = updated;
                    } else {
                        const { data: inserted, error } = await supabase
                            .from('composite_costs')
                            .insert({
                                cost_name: data.cost_name,
                                cost_name_en: data.cost_name_en,
                                description: data.description,
                                category: data.category,
                                sub_category: data.sub_category,
                                unit: data.unit,
                                unit_price: data.unit_price,
                                labor_ratio: data.labor_ratio,
                                material_ratio: data.material_ratio,
                                service_ratio: data.service_ratio,
                                other_ratio: data.other_ratio,
                                min_quantity: data.min_quantity,
                                calculation_notes: data.calculation_notes,
                                notes: data.notes,
                            })
                            .select()
                            .single();

                        if (error) throw error;
                        result = inserted;
                    }
                    break;

                default:
                    return NextResponse.json(
                        { success: false, error: '올바르지 않은 type입니다.' },
                        { status: 400 }
                    );
            }

            return NextResponse.json({
                success: true,
                data: result,
            });
        } else {
            // 로컬 저장
            const id = data.id || `${type}-${Date.now()}`;
            const now = new Date().toISOString();

            switch (type) {
                case 'labor':
                    const newLabor = { ...data, id, updated_at: now, created_at: data.created_at || now };
                    const laborIdx = localLaborCosts.findIndex(l => l.id === id);
                    if (laborIdx >= 0) {
                        localLaborCosts[laborIdx] = newLabor;
                    } else {
                        localLaborCosts.push(newLabor);
                    }
                    return NextResponse.json({ success: true, data: newLabor });

                case 'material':
                    const newMaterial = { ...data, id, updated_at: now, created_at: data.created_at || now };
                    const materialIdx = localMaterialPrices.findIndex(m => m.id === id);
                    if (materialIdx >= 0) {
                        localMaterialPrices[materialIdx] = newMaterial;
                    } else {
                        localMaterialPrices.push(newMaterial);
                    }
                    return NextResponse.json({ success: true, data: newMaterial });

                case 'composite':
                    const newComposite = { ...data, id, updated_at: now, created_at: data.created_at || now };
                    const compositeIdx = localCompositeCosts.findIndex(c => c.id === id);
                    if (compositeIdx >= 0) {
                        localCompositeCosts[compositeIdx] = newComposite;
                    } else {
                        localCompositeCosts.push(newComposite);
                    }
                    return NextResponse.json({ success: true, data: newComposite });

                default:
                    return NextResponse.json(
                        { success: false, error: '올바르지 않은 type입니다.' },
                        { status: 400 }
                    );
            }
        }
    } catch (error) {
        console.error('단가 저장 오류:', error);
        return NextResponse.json(
            { success: false, error: '단가 저장에 실패했습니다.' },
            { status: 500 }
        );
    }
}

// DELETE - 단가 삭제 (비활성화)
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const id = searchParams.get('id');

        if (!type || !id) {
            return NextResponse.json(
                { success: false, error: 'type과 id가 필요합니다.' },
                { status: 400 }
            );
        }

        if (isSupabaseConfigured && supabase) {
            let tableName: string;
            switch (type) {
                case 'labor':
                    tableName = 'labor_costs';
                    break;
                case 'material':
                    tableName = 'material_prices';
                    break;
                case 'composite':
                    tableName = 'composite_costs';
                    break;
                default:
                    return NextResponse.json(
                        { success: false, error: '올바르지 않은 type입니다.' },
                        { status: 400 }
                    );
            }

            // 소프트 삭제 (is_active = false)
            console.log(`[DELETE] Attempting to delete ${type} with id: ${id} from table: ${tableName}`);
            const { error } = await supabase
                .from(tableName)
                .update({ is_active: false })
                .eq('id', id);

            if (error) {
                console.error('[DELETE] Supabase error:', error);
                throw error;
            }
            console.log(`[DELETE] Successfully deleted ${type} with id: ${id}`);

            return NextResponse.json({ success: true });
        } else {
            // 로컬 삭제
            switch (type) {
                case 'labor':
                    localLaborCosts = localLaborCosts.filter(l => l.id !== id);
                    break;
                case 'material':
                    localMaterialPrices = localMaterialPrices.filter(m => m.id !== id);
                    break;
                case 'composite':
                    localCompositeCosts = localCompositeCosts.filter(c => c.id !== id);
                    break;
            }

            return NextResponse.json({ success: true });
        }
    } catch (error) {
        console.error('단가 삭제 오류:', error);
        return NextResponse.json(
            { success: false, error: '단가 삭제에 실패했습니다.' },
            { status: 500 }
        );
    }
}
