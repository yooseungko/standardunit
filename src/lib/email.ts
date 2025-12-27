import { Resend } from 'resend';

// Resend 클라이언트 생성
const resendApiKey = process.env.RESEND_API_KEY;

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const isEmailConfigured = !!resend;

// 이메일 발신자 설정 (Resend 도메인 인증 후 변경 필요)
export const EMAIL_FROM = process.env.EMAIL_FROM || 'Standard Unit <onboarding@resend.dev>';

// 관리자 알림 이메일 주소 (Resend 무료 계정에서는 계정 이메일만 사용 가능)
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'yooseungko@gmail.com';

// 평형 라벨
const sizeLabels: Record<string, string> = {
    '24': '24평 (59㎡)',
    '32': '32평 (84㎡)',
    '43': '43평 (110㎡)',
    '52': '52평 (132㎡)',
};

// 관리자에게 신규 견적 요청 알림 이메일 발송
export async function sendAdminNotification(estimate: {
    complex_name: string;
    size: string;
    floor_type?: string | null;
    name: string;
    phone: string;
    email?: string | null;
    wants_construction: boolean;
    created_at: string;
    construction_scope?: string[];
    notes?: string | null;
}): Promise<{ success: boolean; error?: string }> {
    console.log('sendAdminNotification called');
    console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
    console.log('resend client exists:', !!resend);
    console.log('EMAIL_FROM:', EMAIL_FROM);
    console.log('ADMIN_EMAIL:', ADMIN_EMAIL);

    if (!resend) {
        console.log('Resend not configured, skipping admin notification');
        return { success: false, error: 'Email not configured' };
    }

    const sizeLabel = sizeLabels[estimate.size] || `${estimate.size}평`;
    const date = new Date(estimate.created_at);
    const formattedDate = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

    // 시공 범위 라벨 매핑
    const scopeLabels: Record<string, string> = {
        extension: '확장',
        demolition: '철거',
        window: '샷시',
        plumbing: '설비',
        door: '도어교체',
        woodwork: '목공',
        flooring: '바닥',
        wallpaper: '도배',
        paint: '페인트',
        electrical: '전기/조명',
        kitchen: '주방',
        bathroom: '욕실',
        tile: '타일',
        aircon: '시스템에어컨',
        furniture: '가구',
        middleDoor: '중문',
        cleaning: '마감청소',
    };

    const scopeText = estimate.construction_scope?.map(id => scopeLabels[id] || id).join(', ') || '선택 없음';

    console.log('Sending email to:', ADMIN_EMAIL);

    try {
        const { error } = await resend.emails.send({
            from: EMAIL_FROM,
            to: ADMIN_EMAIL,
            subject: `[Standard Unit] 새로운 견적 문의 - ${estimate.complex_name} ${sizeLabel}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #ffffff; padding: 40px 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #111111; border-radius: 16px; overflow: hidden; border: 1px solid #222; }
        .header { background: linear-gradient(135deg, #1a1a1a, #0d0d0d); padding: 32px; text-align: center; border-bottom: 1px solid #222; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; }
        .header p { margin: 8px 0 0; color: #888; font-size: 14px; }
        .badge { display: inline-block; background: #22c55e; color: #000; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 16px; }
        .content { padding: 32px; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
        .info-box { background: #1a1a1a; border-radius: 12px; padding: 20px; border: 1px solid #333; }
        .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #222; }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #888; font-size: 14px; }
        .info-value { color: #fff; font-weight: 500; font-size: 14px; }
        .info-value.highlight { color: #3b82f6; }
        .info-value.phone { font-family: monospace; color: #22c55e; }
        .scope-tags { margin-top: 8px; }
        .scope-tag { display: inline-block; background: #333; color: #fff; padding: 6px 12px; border-radius: 4px; font-size: 12px; margin: 3px; white-space: nowrap; }
        .wants-construction { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 16px 20px; border-radius: 12px; text-align: center; margin-top: 20px; }
        .wants-construction span { font-weight: 700; }
        .footer { background: #0d0d0d; padding: 24px; text-align: center; border-top: 1px solid #222; }
        .footer a { display: inline-block; background: #fff; color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
        .footer p { margin: 16px 0 0; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Standard Unit</h1>
            <p>새로운 견적 문의가 접수되었습니다</p>
            <span class="badge">🔔 신규 문의</span>
        </div>
        
        <div class="content">
            <div class="section">
                <div class="section-title">아파트 정보</div>
                <div class="info-box">
                    <div class="info-row">
                        <span class="info-label">단지명</span>
                        <span class="info-value">${estimate.complex_name}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">평형</span>
                        <span class="info-value">${sizeLabel}</span>
                    </div>
                    ${estimate.floor_type ? `
                    <div class="info-row">
                        <span class="info-label">평면 타입</span>
                        <span class="info-value">${estimate.floor_type}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">고객 정보</div>
                <div class="info-box">
                    <div class="info-row">
                        <span class="info-label">성함</span>
                        <span class="info-value">${estimate.name}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">연락처</span>
                        <span class="info-value phone">${estimate.phone}</span>
                    </div>
                    ${estimate.email ? `
                    <div class="info-row">
                        <span class="info-label">이메일</span>
                        <span class="info-value highlight">${estimate.email}</span>
                    </div>
                    ` : ''}
                    <div class="info-row">
                        <span class="info-label">접수 시각</span>
                        <span class="info-value">${formattedDate}</span>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">희망 시공 범위</div>
                <div class="info-box">
                    <div class="scope-tags">
                        ${estimate.construction_scope?.map(id => `<span class="scope-tag">${scopeLabels[id] || id}</span>`).join(' ') || '<span style="color:#888">선택 없음</span>'}
                    </div>
                </div>
            </div>

            ${estimate.notes ? `
            <div class="section">
                <div class="section-title">고객 요청사항</div>
                <div class="info-box">
                    <p style="color:#fff; margin:0; white-space:pre-wrap; line-height:1.6;">${estimate.notes}</p>
                </div>
            </div>
            ` : ''}
            
            ${estimate.wants_construction ? `
            <div class="wants-construction">
                🏗️ <span>시공까지 희망</span>하는 고객입니다
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://standardunit.co.kr'}/admin">관리자 페이지에서 확인하기</a>
            <p>이 이메일은 Standard Unit 시스템에서 자동 발송되었습니다.</p>
        </div>
    </div>
</body>
</html>
            `,
        });

        if (error) {
            console.error('Admin notification email error:', error);
            return { success: false, error: error.message };
        }

        console.log('Admin notification email sent successfully');
        return { success: true };
    } catch (error) {
        console.error('Admin notification email error:', error);
        return { success: false, error: String(error) };
    }
}

// 정밀 견적 폼 요청 이메일 발송
export async function sendDetailedFormEmail(data: {
    customerName: string;
    customerEmail: string;
    complexName: string;
    size: string;
    formLink: string;
}): Promise<{ success: boolean; error?: string }> {
    console.log('sendDetailedFormEmail called for:', data.customerName);

    if (!resend) {
        console.log('Resend not configured, skipping detailed form email');
        return { success: false, error: 'Email not configured' };
    }

    const sizeLabel = sizeLabels[data.size] || `${data.size}평`;

    try {
        const { error } = await resend.emails.send({
            from: '스탠다드 유닛 <noreply@standardunit.kr>',
            to: data.customerEmail,
            subject: `[Standard Unit] ${data.customerName}님, 정밀 견적을 위한 추가 정보를 요청드립니다`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #ffffff; padding: 40px 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #111111; border-radius: 16px; overflow: hidden; border: 1px solid #222; }
        .header { background: #000000; padding: 32px; text-align: center; border-bottom: 1px solid #222; }
        .logo { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
        .header p { margin: 8px 0 0; color: #888; font-size: 14px; }
        .badge { display: inline-block; background: #3b82f6; color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 16px; }
        .content { padding: 32px; }
        .greeting { font-size: 18px; font-weight: 600; color: #fff; margin-bottom: 16px; }
        .description { color: #aaa; line-height: 1.8; margin-bottom: 24px; font-size: 15px; }
        .highlight { background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 20px; border-radius: 12px; margin: 24px 0; }
        .highlight p { color: #fff; margin: 0; font-size: 15px; line-height: 1.6; }
        .highlight strong { font-size: 18px; }
        .info-box { background: #1a1a1a; border-radius: 12px; padding: 20px; border: 1px solid #333; margin-bottom: 24px; }
        .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #222; }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #888; font-size: 14px; }
        .info-value { color: #fff; font-weight: 500; font-size: 14px; }
        .cta-button { display: block; background: #fff; color: #000; padding: 18px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; text-align: center; margin: 24px 0; }
        .time-note { background: #22c55e20; border: 1px solid #22c55e40; border-radius: 8px; padding: 16px; margin: 24px 0; }
        .time-note p { color: #22c55e; margin: 0; font-size: 14px; text-align: center; }
        .footer { background: #0d0d0d; padding: 24px; text-align: center; border-top: 1px solid #222; }
        .footer p { margin: 0; color: #666; font-size: 12px; }
        .footer a { color: #3b82f6; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Standard Unit</div>
            <p>계약 견적가 보장 시공</p>
            <span class="badge">📋 정밀 견적 요청</span>
        </div>
        
        <div class="content">
            <div class="greeting">${data.customerName}님, 안녕하세요!</div>
            <p class="description">
                계약 견적 시공 보장 의뢰에 따른<br>
                <strong>정밀 견적을 위한 추가 요청 사항</strong>을 보내드립니다.
            </p>
            
            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">단지명</span>
                    <span class="info-value">${data.complexName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">평형</span>
                    <span class="info-value">${sizeLabel}</span>
                </div>
            </div>
            
            <div class="highlight">
                <p><strong>💡 선택만 하시면 됩니다!</strong></p>
                <p style="margin-top: 8px;">철거, 목공, 설비, 확장, 마감재, 욕실, 가구, 에어컨 등<br>원하시는 시공 범위를 선택해주세요.</p>
            </div>

            <div class="time-note">
                <p>⏱️ <strong>약 5분</strong>이면 작성 완료!</p>
            </div>
            
            <a href="${data.formLink}" class="cta-button">📝 정밀 견적 폼 작성하기</a>
            
            <p style="color: #888; font-size: 13px; line-height: 1.6; text-align: center;">
                작성하신 내용을 바탕으로 정확한 견적서를 준비해드리겠습니다.
            </p>
        </div>
        
        <div class="footer">
            <p>문의사항이 있으시면 언제든 연락주세요.</p>
            <p style="margin-top: 8px;"><a href="https://open.kakao.com/o/sLPdwe7h">카카오톡 상담하기</a></p>
            <p style="margin-top: 16px; color: #444;">© Standard Unit</p>
        </div>
    </div>
</body>
</html>
            `,
        });

        if (error) {
            console.error('Detailed form email error:', error);
            return { success: false, error: error.message };
        }

        console.log('Detailed form email sent successfully');
        return { success: true };
    } catch (error) {
        console.error('Detailed form email error:', error);
        return { success: false, error: String(error) };
    }
}

// 스타일보드 링크 이메일 발송
export async function sendStyleboardEmail(data: {
    customerName: string;
    customerEmail: string;
    complexName: string;
    size: string;
    styleboardLink: string;
    password: string;
}): Promise<{ success: boolean; error?: string }> {
    console.log('sendStyleboardEmail called for:', data.customerName);

    if (!resend) {
        console.log('Resend not configured, skipping styleboard email');
        return { success: false, error: 'Email not configured' };
    }

    const sizeLabel = sizeLabels[data.size] || `${data.size}평`;

    try {
        const { error } = await resend.emails.send({
            from: '스탠다드 유닛 <noreply@standardunit.kr>', // 하드코딩 - 환경변수 의존성 제거
            to: data.customerEmail, // 도메인 인증 완료 - 고객 이메일로 발송
            subject: `[Standard Unit] ${data.customerName}님, 스타일보드가 준비되었습니다`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #ffffff; padding: 40px 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #111111; border-radius: 16px; overflow: hidden; border: 1px solid #222; }
        .header { background: #000000; padding: 32px; text-align: center; border-bottom: 1px solid #222; }
        .logo { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
        .header p { margin: 8px 0 0; color: #888; font-size: 14px; }
        .badge { display: inline-block; background: #8b5cf6; color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 16px; }
        .content { padding: 32px; }
        .greeting { font-size: 18px; font-weight: 600; color: #fff; margin-bottom: 16px; }
        .description { color: #aaa; line-height: 1.6; margin-bottom: 24px; }
        .info-box { background: #1a1a1a; border-radius: 12px; padding: 20px; border: 1px solid #333; margin-bottom: 24px; }
        .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #222; }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #888; font-size: 14px; }
        .info-value { color: #fff; font-weight: 500; font-size: 14px; }
        .password-box { background: linear-gradient(135deg, #8b5cf6, #6d28d9); padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px; }
        .password-label { color: rgba(255,255,255,0.8); font-size: 12px; margin-bottom: 8px; }
        .password-value { font-size: 32px; font-weight: 800; color: #fff; font-family: monospace; letter-spacing: 4px; }
        .cta-button { display: block; background: #fff; color: #000; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; text-align: center; margin-bottom: 16px; }
        .cta-button:hover { background: #f0f0f0; }
        .link-box { background: #1a1a1a; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; }
        .link-url { color: #8b5cf6; font-size: 12px; word-break: break-all; }
        .footer { background: #0d0d0d; padding: 24px; text-align: center; border-top: 1px solid #222; }
        .footer p { margin: 0; color: #666; font-size: 12px; }
        .footer a { color: #8b5cf6; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Standard Unit</div>
            <p>인테리어 스타일보드</p>
            <span class="badge">🎨 스타일 선택 요청</span>
        </div>
        
        <div class="content">
            <div class="greeting">${data.customerName}님, 안녕하세요!</div>
            <p class="description">
                스탠다드 유닛을 선택해 주셔서 감사합니다.<br>
                아래 링크에서 원하시는 인테리어 스타일을 선택해 주세요.<br>
                선택하신 이미지를 바탕으로 맞춤 상담을 진행해 드리겠습니다.
            </p>
            
            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">단지명</span>
                    <span class="info-value">${data.complexName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">평형</span>
                    <span class="info-value">${sizeLabel}</span>
                </div>
            </div>
            
            <div class="password-box">
                <div class="password-label">접속 비밀번호</div>
                <div class="password-value">${data.password}</div>
            </div>
            
            <p style="color: #fff; font-size: 15px; text-align: center; margin-bottom: 16px;">
                스타일보드에서 공간 취향을 찾아보세요
            </p>
            <a href="${data.styleboardLink}" class="cta-button">🏠 내 취향 찾기</a>
            
            <div class="link-box">
                <span class="info-label">접속 링크</span>
                <div class="link-url">${data.styleboardLink}</div>
            </div>
            
            <p style="color: #888; font-size: 13px; line-height: 1.6;">
                💡 스타일보드에서 각 공간별로 마음에 드는 이미지를 최대 5장씩 선택해 주세요.<br>
                선택이 완료되면 저장 버튼을 눌러주시면 됩니다.
            </p>
        </div>
        
        <div class="footer">
            <p>문의사항이 있으시면 언제든 연락주세요.</p>
            <p style="margin-top: 8px;"><a href="https://open.kakao.com/o/sLPdwe7h">카카오톡 상담하기</a></p>
            <p style="margin-top: 16px; color: #444;">© Standard Unit</p>
        </div>
    </div>
</body>
</html>
            `,
        });

        if (error) {
            console.error('Styleboard email error:', error);
            return { success: false, error: error.message };
        }

        console.log('Styleboard email sent successfully');
        return { success: true };
    } catch (error) {
        console.error('Styleboard email error:', error);
        return { success: false, error: String(error) };
    }
}

// 공정별 비용 데이터 (평형별, 등급별)
export interface WorkItemCost {
    name: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface GradeEstimate {
    grade: string;
    description: string;
    items: WorkItemCost[];
    subtotal: number;
    laborCost: number;
    managementFee: number;
    total: number;
}

export interface SizeEstimate {
    size: string;
    area: string;
    areaM2: number;
    grades: GradeEstimate[];
}

// 공정별 단가 (등급별)
const unitPrices = {
    Standard: {
        floor_maru: 45000,      // 마루 ㎡당
        floor_tile: 55000,      // 타일 ㎡당
        wall_paper: 8500,       // 도배 ㎡당
        ceiling_molding: 15000, // 몰딩 M당
        ceiling_well: 85000,    // 우물천장 ㎡당
        kitchen_sink: 1800000,  // 싱크대
        kitchen_upper: 1200000, // 상부장
        kitchen_lower: 1500000, // 하부장
        bathroom_sanitary: 800000,  // 위생도기 세트
        bathroom_tile: 65000,   // 욕실타일 ㎡당
        bathroom_ceiling: 120000, // 욕실천장
        wood_door: 280000,      // 문짝 개당
        wood_baseboard: 12000,  // 걸레받이 M당
        wood_closet: 450000,    // 붙박이장 ㎡당
        electric_outlet: 25000, // 콘센트 개당
        electric_switch: 18000, // 스위치 개당
        electric_light: 85000,  // 조명 개당
        demolition: 2500000,    // 철거 일괄
        waste: 800000,          // 폐기물 처리
    },
    Premium: {
        floor_maru: 75000,
        floor_tile: 95000,
        wall_paper: 15000,
        ceiling_molding: 25000,
        ceiling_well: 130000,
        kitchen_sink: 3200000,
        kitchen_upper: 2200000,
        kitchen_lower: 2800000,
        bathroom_sanitary: 1500000,
        bathroom_tile: 110000,
        bathroom_ceiling: 200000,
        wood_door: 450000,
        wood_baseboard: 22000,
        wood_closet: 750000,
        electric_outlet: 45000,
        electric_switch: 35000,
        electric_light: 150000,
        demolition: 2500000,
        waste: 800000,
    },
    Luxury: {
        floor_maru: 120000,
        floor_tile: 150000,
        wall_paper: 25000,
        ceiling_molding: 45000,
        ceiling_well: 200000,
        kitchen_sink: 5500000,
        kitchen_upper: 4000000,
        kitchen_lower: 4800000,
        bathroom_sanitary: 2800000,
        bathroom_tile: 180000,
        bathroom_ceiling: 350000,
        wood_door: 750000,
        wood_baseboard: 38000,
        wood_closet: 1200000,
        electric_outlet: 75000,
        electric_switch: 55000,
        electric_light: 280000,
        demolition: 2500000,
        waste: 800000,
    },
};

// 평형별 수량 데이터
const sizeQuantities: Record<string, {
    areaM2: number;
    floorArea: number;
    wallArea: number;
    ceilingArea: number;
    moldingLength: number;
    wellCeilingArea: number;
    bathroomCount: number;
    bathroomTileArea: number;
    doorCount: number;
    baseboardLength: number;
    closetArea: number;
    outletCount: number;
    switchCount: number;
    lightCount: number;
}> = {
    '24': {
        areaM2: 59,
        floorArea: 45,
        wallArea: 120,
        ceilingArea: 45,
        moldingLength: 35,
        wellCeilingArea: 8,
        bathroomCount: 1,
        bathroomTileArea: 25,
        doorCount: 5,
        baseboardLength: 45,
        closetArea: 4,
        outletCount: 18,
        switchCount: 12,
        lightCount: 10,
    },
    '32': {
        areaM2: 84,
        floorArea: 65,
        wallArea: 160,
        ceilingArea: 65,
        moldingLength: 50,
        wellCeilingArea: 12,
        bathroomCount: 2,
        bathroomTileArea: 40,
        doorCount: 7,
        baseboardLength: 60,
        closetArea: 6,
        outletCount: 24,
        switchCount: 16,
        lightCount: 14,
    },
    '43': {
        areaM2: 110,
        floorArea: 85,
        wallArea: 210,
        ceilingArea: 85,
        moldingLength: 70,
        wellCeilingArea: 18,
        bathroomCount: 2,
        bathroomTileArea: 50,
        doorCount: 9,
        baseboardLength: 80,
        closetArea: 10,
        outletCount: 32,
        switchCount: 22,
        lightCount: 18,
    },
    '52': {
        areaM2: 132,
        floorArea: 105,
        wallArea: 260,
        ceilingArea: 105,
        moldingLength: 90,
        wellCeilingArea: 24,
        bathroomCount: 2,
        bathroomTileArea: 60,
        doorCount: 11,
        baseboardLength: 100,
        closetArea: 14,
        outletCount: 40,
        switchCount: 28,
        lightCount: 24,
    },
};

// 입력된 평형에 따라 동적으로 수량 계산
function getQuantitiesForSize(sizeInput: string | number): {
    areaM2: number;
    floorArea: number;
    wallArea: number;
    ceilingArea: number;
    moldingLength: number;
    wellCeilingArea: number;
    bathroomCount: number;
    bathroomTileArea: number;
    doorCount: number;
    baseboardLength: number;
    closetArea: number;
    outletCount: number;
    switchCount: number;
    lightCount: number;
} {
    const size = typeof sizeInput === 'string' ? parseFloat(sizeInput) : sizeInput;

    // 유효하지 않은 값이면 32평 기준
    if (isNaN(size) || size < 15 || size > 100) {
        return sizeQuantities['32'];
    }

    // 기존 데이터와 정확히 일치하는 경우
    const sizeKey = Math.round(size).toString();
    if (sizeQuantities[sizeKey]) {
        return sizeQuantities[sizeKey];
    }

    // 32평을 기준으로 비례 계산
    const baseSize = 32;
    const ratio = size / baseSize;
    const base = sizeQuantities['32'];

    // 욕실 개수는 30평 미만이면 1개, 이상이면 2개
    const bathroomCount = size < 30 ? 1 : 2;

    // 문짝 수: 기본 3개 + 평형당 0.15개 비례
    const doorCount = Math.round(3 + size * 0.15);

    return {
        areaM2: Math.round(size * 2.48), // 1평 ≈ 3.3㎡, 전용률 ~75%
        floorArea: Math.round(size * 2.03), // 바닥면적
        wallArea: Math.round(size * 5), // 벽면적 (바닥면적 × 2.5)
        ceilingArea: Math.round(size * 2.03), // 천장면적
        moldingLength: Math.round(size * 1.56), // 몰딩 길이
        wellCeilingArea: Math.round(size * 0.375), // 우물천장 (거실 일부)
        bathroomCount,
        bathroomTileArea: Math.round(20 * bathroomCount), // 욕실당 20㎡
        doorCount,
        baseboardLength: Math.round(size * 1.875), // 걸레받이
        closetArea: Math.round(size * 0.1875), // 붙박이장
        outletCount: Math.round(size * 0.75), // 콘센트
        switchCount: Math.round(size * 0.5), // 스위치
        lightCount: Math.round(size * 0.4375), // 조명
    };
}

// 견적 계산 함수 (동적 평형 지원)
function calculateGradeEstimate(size: string, grade: 'Standard' | 'Premium' | 'Luxury'): GradeEstimate {
    const qty = getQuantitiesForSize(size);
    const prices = unitPrices[grade];

    const items: WorkItemCost[] = [
        // 바닥
        { name: '마루 시공', unit: '㎡', quantity: qty.floorArea * 0.7, unitPrice: prices.floor_maru, total: Math.round(qty.floorArea * 0.7 * prices.floor_maru) },
        { name: '타일 시공', unit: '㎡', quantity: qty.floorArea * 0.3, unitPrice: prices.floor_tile, total: Math.round(qty.floorArea * 0.3 * prices.floor_tile) },
        // 벽면
        { name: '도배', unit: '㎡', quantity: qty.wallArea, unitPrice: prices.wall_paper, total: qty.wallArea * prices.wall_paper },
        // 천장
        { name: '몰딩', unit: 'M', quantity: qty.moldingLength, unitPrice: prices.ceiling_molding, total: qty.moldingLength * prices.ceiling_molding },
        { name: '우물천장', unit: '㎡', quantity: qty.wellCeilingArea, unitPrice: prices.ceiling_well, total: qty.wellCeilingArea * prices.ceiling_well },
        // 주방
        { name: '싱크대', unit: '식', quantity: 1, unitPrice: prices.kitchen_sink, total: prices.kitchen_sink },
        { name: '상부장', unit: '식', quantity: 1, unitPrice: prices.kitchen_upper, total: prices.kitchen_upper },
        { name: '하부장', unit: '식', quantity: 1, unitPrice: prices.kitchen_lower, total: prices.kitchen_lower },
        // 욕실
        { name: '위생도기', unit: '세트', quantity: qty.bathroomCount, unitPrice: prices.bathroom_sanitary, total: qty.bathroomCount * prices.bathroom_sanitary },
        { name: '욕실 타일', unit: '㎡', quantity: qty.bathroomTileArea, unitPrice: prices.bathroom_tile, total: qty.bathroomTileArea * prices.bathroom_tile },
        { name: '욕실 천장재', unit: '개소', quantity: qty.bathroomCount, unitPrice: prices.bathroom_ceiling, total: qty.bathroomCount * prices.bathroom_ceiling },
        // 목공
        { name: '문짝 교체', unit: '개', quantity: qty.doorCount, unitPrice: prices.wood_door, total: qty.doorCount * prices.wood_door },
        { name: '걸레받이', unit: 'M', quantity: qty.baseboardLength, unitPrice: prices.wood_baseboard, total: qty.baseboardLength * prices.wood_baseboard },
        { name: '붙박이장', unit: '㎡', quantity: qty.closetArea, unitPrice: prices.wood_closet, total: qty.closetArea * prices.wood_closet },
        // 전기
        { name: '콘센트', unit: '개', quantity: qty.outletCount, unitPrice: prices.electric_outlet, total: qty.outletCount * prices.electric_outlet },
        { name: '스위치', unit: '개', quantity: qty.switchCount, unitPrice: prices.electric_switch, total: qty.switchCount * prices.electric_switch },
        { name: '조명', unit: '개', quantity: qty.lightCount, unitPrice: prices.electric_light, total: qty.lightCount * prices.electric_light },
        // 철거
        { name: '철거 공사', unit: '식', quantity: 1, unitPrice: prices.demolition, total: prices.demolition },
        { name: '폐기물 처리', unit: '식', quantity: 1, unitPrice: prices.waste, total: prices.waste },
    ];

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const laborCost = Math.round(subtotal * 0.15); // 인건비 15%
    const managementFee = Math.round(subtotal * 0.05); // 관리비 5%
    const total = subtotal + laborCost + managementFee;

    const gradeDescriptions = {
        Standard: '실용적인 국산 자재 중심',
        Premium: '프리미엄 국산 + 일부 수입자재',
        Luxury: '고급 수입 자재 및 맞춤 시공',
    };

    return {
        grade,
        description: gradeDescriptions[grade],
        items,
        subtotal,
        laborCost,
        managementFee,
        total,
    };
}

// 평형별 견적 데이터 생성 (동적 평형 지원)
export function getDetailedEstimate(sizeInput: string): SizeEstimate {
    const size = parseFloat(sizeInput);
    const qty = getQuantitiesForSize(sizeInput);

    // 평형과 면적 표시
    const sizeLabel = isNaN(size) ? '32평' : `${Math.round(size)}평`;
    const areaLabel = `${qty.areaM2}㎡`;

    return {
        size: sizeLabel,
        area: areaLabel,
        areaM2: qty.areaM2,
        grades: [
            calculateGradeEstimate(sizeInput, 'Standard'),
            calculateGradeEstimate(sizeInput, 'Premium'),
            calculateGradeEstimate(sizeInput, 'Luxury'),
        ],
    };
}

// 금액 포맷팅
export function formatPrice(price: number): string {
    if (price >= 100000000) {
        const uk = Math.floor(price / 100000000);
        const man = Math.floor((price % 100000000) / 10000);
        return man > 0 ? `${uk}억 ${man.toLocaleString()}만원` : `${uk}억원`;
    }
    return `${Math.floor(price / 10000).toLocaleString()}만원`;
}

export function formatPriceNumber(price: number): string {
    return price.toLocaleString() + '원';
}

// 이전 버전 호환용 (간단한 견적 데이터)
export const estimateData: Record<string, {
    size: string;
    area: string;
    basePrice: number;
    grades: {
        grade: string;
        price: number;
        description: string;
    }[];
}> = {
    '24': {
        size: '24평',
        area: '59㎡',
        basePrice: 27000000,
        grades: [
            { grade: 'Standard', price: getDetailedEstimate('24').grades[0].total, description: '실용적인 국산 자재 중심' },
            { grade: 'Premium', price: getDetailedEstimate('24').grades[1].total, description: '프리미엄 국산 + 일부 수입자재' },
            { grade: 'Luxury', price: getDetailedEstimate('24').grades[2].total, description: '고급 수입 자재 및 맞춤 시공' },
        ],
    },
    '32': {
        size: '32평',
        area: '84㎡',
        basePrice: 35000000,
        grades: [
            { grade: 'Standard', price: getDetailedEstimate('32').grades[0].total, description: '실용적인 국산 자재 중심' },
            { grade: 'Premium', price: getDetailedEstimate('32').grades[1].total, description: '프리미엄 국산 + 일부 수입자재' },
            { grade: 'Luxury', price: getDetailedEstimate('32').grades[2].total, description: '고급 수입 자재 및 맞춤 시공' },
        ],
    },
    '43': {
        size: '43평',
        area: '110㎡',
        basePrice: 48000000,
        grades: [
            { grade: 'Standard', price: getDetailedEstimate('43').grades[0].total, description: '실용적인 국산 자재 중심' },
            { grade: 'Premium', price: getDetailedEstimate('43').grades[1].total, description: '프리미엄 국산 + 일부 수입자재' },
            { grade: 'Luxury', price: getDetailedEstimate('43').grades[2].total, description: '고급 수입 자재 및 맞춤 시공' },
        ],
    },
    '52': {
        size: '52평',
        area: '132㎡',
        basePrice: 58000000,
        grades: [
            { grade: 'Standard', price: getDetailedEstimate('52').grades[0].total, description: '실용적인 국산 자재 중심' },
            { grade: 'Premium', price: getDetailedEstimate('52').grades[1].total, description: '프리미엄 국산 + 일부 수입자재' },
            { grade: 'Luxury', price: getDetailedEstimate('52').grades[2].total, description: '고급 수입 자재 및 맞춤 시공' },
        ],
    },
};
