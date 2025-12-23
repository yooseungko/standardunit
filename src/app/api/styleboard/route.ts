import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { CustomerStyleboard, CreateStyleboardRequest } from '@/types/styleboard';

// 임시 메모리 저장소 (Supabase 없을 때)
const localStyleboards: CustomerStyleboard[] = [];

// GET: 모든 스타일보드 조회 (관리자용)
export async function GET() {
    try {
        if (isSupabaseConfigured && supabase) {
            const { data, error } = await supabase
                .from('customer_styleboards')
                .select(`
                    *,
                    estimate_requests (
                        id,
                        complex_name,
                        size,
                        name,
                        phone,
                        email,
                        status
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                throw new Error(error.message);
            }

            return NextResponse.json({
                success: true,
                data: data || [],
                isSupabaseConfigured: true,
            });
        }

        // 로컬 스토리지 모드
        return NextResponse.json({
            success: true,
            data: localStyleboards,
            isSupabaseConfigured: false,
        });
    } catch (error) {
        console.error('스타일보드 조회 오류:', error);
        return NextResponse.json(
            { success: false, error: '스타일보드 조회에 실패했습니다.' },
            { status: 500 }
        );
    }
}

// POST: 새 스타일보드 생성
export async function POST(request: NextRequest) {
    try {
        const body: CreateStyleboardRequest = await request.json();

        if (!body.estimate_id || !body.customer_name || !body.customer_phone || !body.password) {
            return NextResponse.json(
                { success: false, error: '필수 정보가 누락되었습니다.' },
                { status: 400 }
            );
        }

        const newStyleboard: Omit<CustomerStyleboard, 'id' | 'created_at' | 'updated_at'> = {
            estimate_id: body.estimate_id,
            customer_name: body.customer_name,
            customer_phone: body.customer_phone,
            customer_email: body.customer_email || null,
            password: body.password,
            selected_images: {},
            link_sent: false,
            link_sent_at: null,
            saved_at: null,
            last_modified_at: null,
        };

        if (isSupabaseConfigured && supabase) {
            // 기존 스타일보드가 있는지 확인
            const { data: existing } = await supabase
                .from('customer_styleboards')
                .select('id')
                .eq('estimate_id', body.estimate_id)
                .single();

            if (existing) {
                return NextResponse.json(
                    { success: false, error: '이미 스타일보드가 생성되어 있습니다.' },
                    { status: 400 }
                );
            }

            const { data, error } = await supabase
                .from('customer_styleboards')
                .insert([newStyleboard])
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }

            return NextResponse.json({
                success: true,
                data,
            });
        }

        // 로컬 스토리지 모드
        const localStyleboard: CustomerStyleboard = {
            ...newStyleboard,
            id: `local_${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        localStyleboards.push(localStyleboard);

        return NextResponse.json({
            success: true,
            data: localStyleboard,
        });
    } catch (error) {
        console.error('스타일보드 생성 오류:', error);
        return NextResponse.json(
            { success: false, error: '스타일보드 생성에 실패했습니다.' },
            { status: 500 }
        );
    }
}
