import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { sendStyleboardEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { styleboardId, customerName, customerEmail, complexName, size, password } = body;

        if (!styleboardId) {
            return NextResponse.json({ error: 'styleboardId is required' }, { status: 400 });
        }

        // 스타일보드 링크 생성
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://standardunit.kr';
        const styleboardLink = `${baseUrl}/styleboard/${styleboardId}`;

        // 이메일 발송
        const emailResult = await sendStyleboardEmail({
            customerName,
            customerEmail,
            complexName,
            size,
            styleboardLink,
            password,
        });

        if (!emailResult.success) {
            console.error('Styleboard email failed:', emailResult.error);
            // 이메일 실패해도 계속 진행
        }

        // 발송 상태 업데이트
        if (isSupabaseConfigured && supabase) {
            const { error } = await supabase
                .from('customer_styleboards')
                .update({
                    link_sent: true,
                    link_sent_at: new Date().toISOString(),
                })
                .eq('id', styleboardId);

            if (error) {
                console.error('Failed to update styleboard status:', error);
            }
        }

        return NextResponse.json({
            success: true,
            emailSent: emailResult.success,
            styleboardLink,
        });
    } catch (error) {
        console.error('Styleboard send error:', error);
        return NextResponse.json({ error: 'Failed to send styleboard' }, { status: 500 });
    }
}
