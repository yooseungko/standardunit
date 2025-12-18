import { NextRequest, NextResponse } from 'next/server';
import { resend, isEmailConfigured, EMAIL_FROM } from '@/lib/email';
import { generateEstimateEmailHtml, generateEstimateEmailText } from '@/lib/emailTemplates';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { to, customerName, complexName, size, floorType, wantsConstruction } = body;

        // 필수 필드 검증
        if (!to || !customerName || !complexName || !size) {
            return NextResponse.json(
                { error: '필수 정보가 누락되었습니다.' },
                { status: 400 }
            );
        }

        // 이메일 설정 확인
        if (!isEmailConfigured || !resend) {
            return NextResponse.json(
                {
                    error: '이메일이 설정되지 않았습니다.',
                    details: 'RESEND_API_KEY 환경 변수를 설정해주세요.',
                    demo: true,
                },
                { status: 503 }
            );
        }

        // 이메일 발송
        const { data, error } = await resend.emails.send({
            from: EMAIL_FROM,
            to: [to],
            subject: `[Standard Unit] ${customerName}님의 표준 견적서`,
            html: generateEstimateEmailHtml({
                customerName,
                complexName,
                size,
                floorType,
                wantsConstruction,
            }),
            text: generateEstimateEmailText({
                customerName,
                complexName,
                size,
                floorType,
                wantsConstruction,
            }),
        });

        if (error) {
            console.error('Email send error:', error);
            return NextResponse.json(
                { error: '이메일 발송에 실패했습니다.', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            messageId: data?.id,
        });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
