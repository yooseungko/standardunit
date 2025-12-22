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

// 견적서 이메일 HTML 생성
function generateQuoteEmailHtml(quote: Quote & { items: QuoteItem[] }): string {
    const itemsByCategory: Record<string, QuoteItem[]> = {};

    quote.items?.forEach(item => {
        if (!item.is_included) return;
        if (!itemsByCategory[item.category]) {
            itemsByCategory[item.category] = [];
        }
        itemsByCategory[item.category].push(item);
    });

    const categoryRows = Object.entries(itemsByCategory).map(([category, items]) => {
        const categoryTotal = items.reduce((sum, item) => sum + item.total_price, 0);
        const itemRows = items.map(item => `
            <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #666;">${item.item_name}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: right;">${item.quantity} ${item.unit}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: right;">₩${formatPrice(item.unit_price)}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 500;">₩${formatPrice(item.total_price)}</td>
            </tr>
        `).join('');

        return `
            <tr style="background-color: #f8f9fa;">
                <td colspan="3" style="padding: 10px 12px; font-weight: 600; color: #333;">${category}</td>
                <td style="padding: 10px 12px; text-align: right; font-weight: 600;">₩${formatPrice(categoryTotal)}</td>
            </tr>
            ${itemRows}
        `;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>견적서 - ${quote.quote_number}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">
    <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
        <!-- 헤더 -->
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 700;">스탠다드 유닛</h1>
            <p style="margin: 0; opacity: 0.9; font-size: 14px;">인테리어 표준 견적서</p>
            ${getGradeBadgeHtml(quote.quote_number)}
        </div>

        <!-- 본문 -->
        <div style="background-color: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <!-- 견적 정보 -->
            <div style="margin-bottom: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                    <div>
                        <p style="margin: 0 0 5px 0; color: #666; font-size: 12px;">견적번호</p>
                        <p style="margin: 0; font-weight: 600; font-size: 16px;">${quote.quote_number}</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0 0 5px 0; color: #666; font-size: 12px;">유효기간</p>
                        <p style="margin: 0; font-weight: 600; font-size: 16px;">${quote.valid_until || '-'}</p>
                    </div>
                </div>
                <div>
                    <p style="margin: 0 0 5px 0; color: #666; font-size: 12px;">고객명</p>
                    <p style="margin: 0; font-weight: 600; font-size: 16px;">${quote.customer_name || '-'} 님</p>
                </div>
                ${quote.property_address ? `
                <div style="margin-top: 10px;">
                    <p style="margin: 0 0 5px 0; color: #666; font-size: 12px;">시공 주소</p>
                    <p style="margin: 0; font-size: 14px;">${quote.property_address}</p>
                </div>
                ` : ''}
                ${quote.property_size ? `
                <div style="margin-top: 10px;">
                    <p style="margin: 0 0 5px 0; color: #666; font-size: 12px;">시공 면적</p>
                    <p style="margin: 0; font-size: 14px;">${quote.property_size}㎡ (${(quote.property_size / 3.3).toFixed(1)}평)</p>
                </div>
                ` : ''}
            </div>

            <!-- 견적 상세 (위로 이동) -->
            <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #333;">📋 공정별 견적 내역</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <thead>
                    <tr style="background-color: #1a1a2e; color: white;">
                        <th style="padding: 12px; text-align: left; font-weight: 500;">항목</th>
                        <th style="padding: 12px; text-align: right; font-weight: 500;">수량</th>
                        <th style="padding: 12px; text-align: right; font-weight: 500;">단가</th>
                        <th style="padding: 12px; text-align: right; font-weight: 500;">금액</th>
                    </tr>
                </thead>
                <tbody>
                    ${categoryRows}
                </tbody>
            </table>

            <!-- 금액 요약 -->
            <div style="padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: #666;">인건비</span>
                    <span style="font-weight: 500;">₩${formatPrice(quote.labor_cost)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: #666;">자재비</span>
                    <span style="font-weight: 500;">₩${formatPrice(quote.material_cost)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #ddd;">
                    <span style="color: #666;">소계</span>
                    <span style="font-weight: 500;">₩${formatPrice(quote.total_amount)}</span>
                </div>
                ${quote.discount_amount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #e74c3c;">
                    <span>할인 ${quote.discount_reason || ''}</span>
                    <span>-₩${formatPrice(quote.discount_amount)}</span>
                </div>
                ` : ''}
                ${quote.vat_amount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: #666;">부가세 (10%)</span>
                    <span>₩${formatPrice(quote.vat_amount)}</span>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 2px solid #1a1a2e;">
                    <span style="font-size: 18px; font-weight: 700;">최종 금액</span>
                    <span style="font-size: 24px; font-weight: 700; color: #1a1a2e;">₩${formatPrice(quote.final_amount)}</span>
                </div>
            </div>

            ${quote.notes ? `
            <!-- 특이사항 -->
            <div style="padding: 15px; background-color: #fff3cd; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0 0 5px 0; font-weight: 600; color: #856404;">📝 특이사항</p>
                <p style="margin: 0; color: #856404; font-size: 14px;">${quote.notes}</p>
            </div>
            ` : ''}

            <!-- 안내사항 -->
            <div style="padding: 15px; background-color: #e3f2fd; border-radius: 8px; font-size: 13px; color: #1565c0; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0; font-weight: 600;">📌 안내사항</p>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>본 견적서는 ${quote.valid_until || '발행일로부터 14일'}까지 유효합니다.</li>
                    <li>현장 상황에 따라 금액이 변동될 수 있습니다.</li>
                    <li>자세한 상담이 필요하시면 연락 주세요.</li>
                </ul>
            </div>

            <!-- 상세 보기 버튼 -->
            <div style="text-align: center; padding: 20px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://standardunit.kr'}/q/${quote.id}" 
                   style="display: inline-block; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                    📋 견적서 전체 보기
                </a>
                <p style="margin: 15px 0 0 0; color: #666; font-size: 12px;">
                    모바일에서도 편하게 확인하세요
                </p>
            </div>
        </div>

        <!-- 푸터 -->
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
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
