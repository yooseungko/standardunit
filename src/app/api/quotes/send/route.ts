import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { Quote, QuoteItem, SendQuoteRequest } from '@/types/quote';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const resendApiKey = process.env.RESEND_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

// 금액 포맷
function formatPrice(price: number): string {
    return new Intl.NumberFormat('ko-KR').format(price);
}

// 견적번호에서 자재 등급 추출하여 배지 HTML 생성
function getGradeBadgeHtml(quoteNumber: string): string {
    let grade = '일반';
    let bgColor = '#6b7280'; // gray

    if (quoteNumber.includes('-고급')) {
        grade = '⭐ 고급';
        bgColor = '#d97706'; // amber
    } else if (quoteNumber.includes('-중급')) {
        grade = '중급';
        bgColor = '#2563eb'; // blue
    }

    return `
        <div style="margin-top: 15px;">
            <span style="display: inline-block; background-color: ${bgColor}; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                📦 자재 등급: ${grade}
            </span>
        </div>
    `;
}

// AI 계산 설명 HTML 생성
function generateAICommentHtml(comment: string | undefined): string {
    if (!comment) return '';

    // 마크다운을 HTML로 변환
    const lines = comment.split('\n');
    let html = '<div style="margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border-radius: 12px; border: 1px solid #bfdbfe;">';
    html += '<h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1e40af;">📋 견적 산출 내역</h3>';
    html += '<div style="font-size: 14px; color: #374151;">';

    lines.forEach(line => {
        if (line.startsWith('## ')) {
            html += `<p style="margin: 15px 0 8px 0; font-weight: 600; color: #1f2937;">${line.replace('## ', '')}</p>`;
        } else if (line.startsWith('### ')) {
            html += `<p style="margin: 12px 0 6px 0; font-weight: 600; color: #374151; font-size: 13px;">${line.replace('### ', '')}</p>`;
        } else if (line.startsWith('- **')) {
            const match = line.match(/- \*\*(.+?)\*\*:? ?(.*)$/);
            if (match) {
                html += `<p style="margin: 4px 0; padding-left: 12px;">• <strong>${match[1]}</strong>${match[2] ? `: ${match[2]}` : ''}</p>`;
            }
        } else if (line.startsWith('- ') || line.startsWith('• ')) {
            html += `<p style="margin: 4px 0; padding-left: 12px; color: #6b7280;">${line.replace(/^[-•] /, '• ')}</p>`;
        } else if (line.match(/^[✅✓☑] /)) {
            html += `<p style="margin: 4px 0; padding-left: 12px; color: #059669;">${line}</p>`;
        } else if (line.match(/^[⚠️❗] /)) {
            html += `<p style="margin: 4px 0; padding-left: 12px; color: #d97706;">${line}</p>`;
        } else if (line.match(/^[◆◇▶►] /)) {
            html += `<p style="margin: 8px 0 4px 0; font-weight: 500; color: #4b5563;">${line}</p>`;
        } else if (line.startsWith('*') && line.endsWith('*')) {
            html += `<p style="margin: 15px 0 0 0; font-size: 12px; color: #9ca3af; font-style: italic;">${line.replace(/\*/g, '')}</p>`;
        } else if (line === '---') {
            html += '<hr style="border: none; border-top: 1px solid #d1d5db; margin: 15px 0;">';
        } else if (line.trim()) {
            // 일반 텍스트도 포함
            html += `<p style="margin: 4px 0; color: #374151;">${line}</p>`;
        }
    });

    html += '</div></div>';
    return html;
}

// 견적서 이메일 HTML 생성 (간소화 버전)
function generateQuoteEmailHtml(quote: Quote & { items: QuoteItem[] }): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>견적서 - ${quote.quote_number}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- 헤더 -->
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700;">스탠다드 유닛</h1>
            <p style="margin: 0; opacity: 0.8; font-size: 13px;">인테리어 표준 견적 서비스</p>
        </div>

        <!-- 본문 -->
        <div style="background-color: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <!-- 메인 메시지 -->
            <div style="text-align: center; margin-bottom: 35px;">
                <h2 style="margin: 0 0 10px 0; font-size: 24px; color: #1a1a2e; font-weight: 700;">
                    ${quote.customer_name || '고객'}님,<br>견적서가 완료되었습니다
                </h2>
                <p style="margin: 0; color: #666; font-size: 14px;">
                    요청하신 인테리어 견적서를 확인해주세요
                </p>
            </div>

            <!-- 고객 정보 -->
            <div style="margin-bottom: 30px; padding: 24px; background-color: #f8f9fa; border-radius: 12px;">
                <h3 style="margin: 0 0 16px 0; font-size: 14px; color: #1a1a2e; font-weight: 600;">📋 견적 정보</h3>
                <table style="width: 100%; font-size: 14px;">
                    <tr>
                        <td style="padding: 8px 0; color: #666; width: 80px;">견적번호</td>
                        <td style="padding: 8px 0; font-weight: 500; color: #333;">${quote.quote_number}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #666;">고객명</td>
                        <td style="padding: 8px 0; font-weight: 500; color: #333;">${quote.customer_name || '-'} 님</td>
                    </tr>
                    ${quote.property_address ? `
                    <tr>
                        <td style="padding: 8px 0; color: #666;">시공 주소</td>
                        <td style="padding: 8px 0; color: #333;">${quote.property_address}</td>
                    </tr>
                    ` : ''}
                    ${quote.property_size ? `
                    <tr>
                        <td style="padding: 8px 0; color: #666;">시공 면적</td>
                        <td style="padding: 8px 0; color: #333;">${quote.property_size}㎡ (${(quote.property_size / 3.3).toFixed(1)}평)</td>
                    </tr>
                    ` : ''}
                    <tr>
                        <td style="padding: 8px 0; color: #666;">유효기간</td>
                        <td style="padding: 8px 0; color: #333;">${quote.valid_until || '발행일로부터 14일'}</td>
                    </tr>
                </table>
            </div>

            <!-- 견적서 전체 보기 버튼 -->
            <div style="text-align: center; margin-bottom: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://standardunit.kr'}/q/${quote.id}" 
                   style="display: inline-block; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; text-decoration: none; padding: 18px 50px; border-radius: 30px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(26,26,46,0.3);">
                    📋 견적서 전체 보기
                </a>
                <p style="margin: 12px 0 0 0; color: #888; font-size: 12px;">
                    버튼을 클릭하시면 상세 견적 내역을 확인하실 수 있습니다
                </p>
            </div>

            <!-- 프로모션 혜택 -->
            <div style="padding: 24px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; border: 1px solid #f59e0b;">
                <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #92400e; font-weight: 700;">🎁 특별 혜택 안내</h3>
                <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.7;">
                    이 견적으로 <strong>1월 시공계약시 비스포크 냉장고 증정</strong>,<br>
                    <strong>타 업체 견적서 첨부시 100만원 추가할인</strong> 혜택을 드립니다!
                </p>
            </div>
        </div>

        <!-- 푸터 -->
        <div style="text-align: center; padding: 25px; color: #999; font-size: 12px;">
            <p style="margin: 0 0 5px 0;">© 2024 스탠다드 유닛. All rights reserved.</p>
            <p style="margin: 0;">문의: contact@standardunit.kr</p>
        </div>
    </div>
</body>
</html>
    `;
}

// 견적서 발송
export async function POST(request: NextRequest) {
    try {
        const body: SendQuoteRequest = await request.json();
        const { quote_id, send_type = 'email', recipient_email, recipient_name, message } = body;

        if (!quote_id) {
            return NextResponse.json(
                { success: false, error: '견적서 ID가 필요합니다.' },
                { status: 400 }
            );
        }

        // 견적서 조회
        const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .select(`
                *,
                items:quote_items(*)
            `)
            .eq('id', quote_id)
            .single();

        if (quoteError || !quote) {
            return NextResponse.json(
                { success: false, error: '견적서를 찾을 수 없습니다.' },
                { status: 404 }
            );
        }

        // 수신자 이메일 결정
        const toEmail = recipient_email || quote.customer_email;
        const toName = recipient_name || quote.customer_name;

        if (!toEmail) {
            return NextResponse.json(
                { success: false, error: '수신자 이메일이 필요합니다.' },
                { status: 400 }
            );
        }

        // 이메일 발송
        const emailHtml = generateQuoteEmailHtml(quote as Quote & { items: QuoteItem[] });

        const { data: emailData, error: emailError } = await resend.emails.send({
            // 인증된 도메인 이메일 사용
            from: '스탠다드 유닛 <noreply@standardunit.kr>',
            to: toEmail,
            subject: `[스탠다드 유닛] ${toName || '고객'}님의 인테리어 견적서 (${quote.quote_number})`,
            html: emailHtml,
        });

        if (emailError) {
            console.error('Email send error:', emailError);

            // 발송 실패 로그 저장
            await supabase.from('quote_send_logs').insert({
                quote_id,
                recipient_email: toEmail,
                recipient_name: toName,
                send_type,
                status: 'failed',
                error_message: emailError.message,
            });

            return NextResponse.json(
                { success: false, error: '이메일 발송 실패: ' + emailError.message },
                { status: 500 }
            );
        }

        // 발송 성공 로그 저장
        const { data: sendLog } = await supabase
            .from('quote_send_logs')
            .insert({
                quote_id,
                recipient_email: toEmail,
                recipient_name: toName,
                send_type,
                status: 'sent',
            })
            .select()
            .single();

        // 견적서 상태 업데이트
        await supabase
            .from('quotes')
            .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
            })
            .eq('id', quote_id);

        return NextResponse.json({
            success: true,
            message: '견적서가 발송되었습니다.',
            data: {
                email_id: emailData?.id,
                send_log: sendLog,
            },
        });

    } catch (error) {
        console.error('Quote send error:', error);
        return NextResponse.json(
            { success: false, error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
