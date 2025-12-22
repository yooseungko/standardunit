import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// GET - 대표 항목(기본) 목록 조회
export async function GET() {
    try {
        if (!isSupabaseConfigured || !supabase) {
            return NextResponse.json(
                { success: false, error: 'Supabase가 설정되지 않았습니다.' },
                { status: 500 }
            );
        }

        const [laborResult, materialResult, compositeResult] = await Promise.all([
            supabase
                .from('labor_costs')
                .select('*')
                .eq('is_active', true)
                .eq('representative_grade', '기본')
                .order('labor_type'),
            supabase
                .from('material_prices')
                .select('*')
                .eq('is_active', true)
                .eq('representative_grade', '기본')
                .order('category')
                .order('product_name'),
            supabase
                .from('composite_costs')
                .select('*')
                .eq('is_active', true)
                .eq('representative_grade', '기본')
                .order('category')
                .order('cost_name'),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                labor: laborResult.data || [],
                material: materialResult.data || [],
                composite: compositeResult.data || [],
            },
            counts: {
                labor: laborResult.data?.length || 0,
                material: materialResult.data?.length || 0,
                composite: compositeResult.data?.length || 0,
            },
        });
    } catch (error) {
        console.error('Representative items fetch error:', error);
        return NextResponse.json(
            { success: false, error: '대표 항목 조회 실패' },
            { status: 500 }
        );
    }
}
