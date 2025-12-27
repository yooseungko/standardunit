import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { sendDetailedFormEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { estimateId } = body;

        if (!estimateId) {
            return NextResponse.json({ error: 'estimateId is required' }, { status: 400 });
        }

        if (isSupabaseConfigured && supabase) {
            // 견적 요청 정보 가져오기
            const { data: estimate, error: fetchError } = await supabase
                .from('estimate_requests')
                .select('*')
                .eq('id', estimateId)
                .single();

            if (fetchError || !estimate) {
                return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
            }

            if (!estimate.email) {
                return NextResponse.json({ error: 'Customer email not found' }, { status: 400 });
            }

            // 토큰 생성 (이미 있으면 재사용)
            let token = estimate.detailed_form_token;
            if (!token) {
                token = crypto.randomBytes(32).toString('hex');

                // 토큰 저장 및 상태 업데이트
                const { error: updateError } = await supabase
                    .from('estimate_requests')
                    .update({
                        detailed_form_token: token,
                        detailed_form_status: 'sent',
                    })
                    .eq('id', estimateId);

                if (updateError) {
                    console.error('Token update error:', updateError);
                    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
                }
            }

            // 폼 링크 생성
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://standardunit.kr';
            const formLink = `${baseUrl}/detailed-form/${token}`;

            // 이메일 발송
            const emailResult = await sendDetailedFormEmail({
                customerName: estimate.name,
                customerEmail: estimate.email,
                complexName: estimate.complex_name,
                size: estimate.size,
                formLink,
            });

            if (!emailResult.success) {
                console.error('Email send failed:', emailResult.error);
                return NextResponse.json({
                    success: false,
                    error: emailResult.error || 'Failed to send email',
                }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                formLink,
                emailSent: true,
            });
        }

        // 데모 모드
        const demoToken = crypto.randomBytes(32).toString('hex');
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const formLink = `${baseUrl}/detailed-form/${demoToken}`;

        return NextResponse.json({
            success: true,
            formLink,
            emailSent: false,
            message: '데모 모드: 이메일이 발송되지 않습니다.',
        });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
