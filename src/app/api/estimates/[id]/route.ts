import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const { status, notes } = body;

        // Supabase가 설정된 경우
        if (isSupabaseConfigured && supabase) {
            const { data, error } = await supabase
                .from('estimate_requests')
                .update({ status, notes, updated_at: new Date().toISOString() })
                .eq('id', parseInt(id))
                .select();

            if (error) {
                console.error('Supabase error:', error);
                return NextResponse.json(
                    { error: '상태 업데이트에 실패했습니다.' },
                    { status: 500 }
                );
            }

            return NextResponse.json({ success: true, data: data[0] });
        }

        // Supabase 없을 때 - 데모 모드
        return NextResponse.json({
            success: true,
            message: '데모 모드에서는 상태 변경이 저장되지 않습니다.'
        });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Supabase가 설정된 경우
        if (isSupabaseConfigured && supabase) {
            const { error } = await supabase
                .from('estimate_requests')
                .delete()
                .eq('id', parseInt(id));

            if (error) {
                console.error('Supabase error:', error);
                return NextResponse.json(
                    { error: '삭제에 실패했습니다.' },
                    { status: 500 }
                );
            }

            return NextResponse.json({ success: true });
        }

        // Supabase 없을 때 - 데모 모드
        return NextResponse.json({
            success: true,
            message: '데모 모드에서는 삭제가 저장되지 않습니다.'
        });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
