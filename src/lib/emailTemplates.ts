import { getDetailedEstimate, formatPrice, formatPriceNumber, GradeEstimate } from './email';

interface EstimateEmailProps {
  customerName: string;
  complexName: string;
  size: string;
  floorType?: string | null;
  wantsConstruction?: boolean;
}

function generateItemsTable(grade: GradeEstimate): string {
  const categoryMap: Record<string, string> = {
    '마루 시공': '바닥',
    '타일 시공': '바닥',
    '도배': '벽면',
    '몰딩': '천장',
    '우물천장': '천장',
    '싱크대': '주방',
    '상부장': '주방',
    '하부장': '주방',
    '위생도기': '욕실',
    '욕실 타일': '욕실',
    '욕실 천장재': '욕실',
    '문짝 교체': '목공',
    '걸레받이': '목공',
    '붙박이장': '목공',
    '콘센트': '전기',
    '스위치': '전기',
    '조명': '전기',
    '철거 공사': '철거',
    '폐기물 처리': '철거',
  };

  let currentCategory = '';
  let rows = '';

  grade.items.forEach(item => {
    const category = categoryMap[item.name] || '';
    const showCategory = category !== currentCategory;
    currentCategory = category;

    rows += `
        <tr style="background-color: #ffffff;">
            <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: ${showCategory ? '#000000' : '#666666'}; font-weight: ${showCategory ? '600' : '400'};">
                ${showCategory ? category : ''}
            </td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #333333;">
                ${item.name}
            </td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 12px; color: #666666; text-align: center;">
                ${Math.round(item.quantity)}${item.unit}
            </td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 12px; color: #666666; text-align: right; font-family: monospace;">
                ${item.unitPrice.toLocaleString()}
            </td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #000000; text-align: right; font-family: monospace; font-weight: 500;">
                ${item.total.toLocaleString()}
            </td>
        </tr>
        `;
  });

  return rows;
}

export function generateEstimateEmailHtml({
  customerName,
  complexName,
  size,
  floorType,
  wantsConstruction,
}: EstimateEmailProps): string {
  const estimate = getDetailedEstimate(size);
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // 기본 등급 (Standard)으로 상세 견적 표시
  const selectedGrade = estimate.grades[0]; // Standard

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Standard Unit 정밀 견적서</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border: 0; cellpadding: 0; cellspacing: 0;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e5e5;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #000000; padding: 32px 40px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">
                Standard Unit
              </h1>
              <p style="margin: 8px 0 0 0; color: #888888; font-size: 12px; font-family: monospace; letter-spacing: 2px;">
                DETAILED ESTIMATE
              </p>
            </td>
          </tr>

          <!-- Title Section -->
          <tr>
            <td style="padding: 40px 40px 24px 40px; border-bottom: 1px solid #f0f0f0;">
              <h2 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 900; color: #000000;">
                ${customerName}님의<br>정밀 견적서
              </h2>
              <p style="margin: 0; color: #666666; font-size: 14px;">
                발행일: ${today} | 견적번호: SU-${Date.now().toString().slice(-8)}
              </p>
            </td>
          </tr>

          <!-- Property Info -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8f8f8; border-bottom: 1px solid #f0f0f0;">
              <table role="presentation" style="width: 100%; border: 0;">
                <tr>
                  <td style="padding: 4px 0; color: #666666; font-size: 13px; width: 80px;">단지명</td>
                  <td style="padding: 4px 0; font-weight: 600; font-size: 13px;">${complexName}</td>
                  <td style="padding: 4px 0; color: #666666; font-size: 13px; width: 80px;">평형</td>
                  <td style="padding: 4px 0; font-weight: 600; font-size: 13px;">${estimate.size} (${estimate.area})</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #666666; font-size: 13px;">평면타입</td>
                  <td style="padding: 4px 0; font-weight: 600; font-size: 13px;">${floorType || '-'}</td>
                  <td style="padding: 4px 0; color: #666666; font-size: 13px;">시공의뢰</td>
                  <td style="padding: 4px 0; font-weight: 600; font-size: 13px;">${wantsConstruction ? '희망' : '견적만'}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Summary -->
          <tr>
            <td style="padding: 32px 40px; border-bottom: 1px solid #f0f0f0;">
              <p style="margin: 0 0 20px 0; color: #888888; font-size: 11px; font-family: monospace; letter-spacing: 2px;">
                ESTIMATE SUMMARY
              </p>
              <table role="presentation" style="width: 100%; border: 0; border-collapse: collapse;">
                ${estimate.grades.map((grade, idx) => `
                <tr style="background-color: ${idx === 0 ? '#000000' : '#ffffff'};">
                  <td style="padding: 16px 20px; border: 1px solid ${idx === 0 ? '#000000' : '#e5e5e5'};">
                    <div style="font-weight: 700; font-size: 15px; color: ${idx === 0 ? '#ffffff' : '#000000'}; margin-bottom: 4px;">
                      ${grade.grade} ${idx === 0 ? '(기준)' : ''}
                    </div>
                    <div style="font-size: 12px; color: ${idx === 0 ? '#aaaaaa' : '#888888'};">
                      ${grade.description}
                    </div>
                  </td>
                  <td style="padding: 16px 20px; text-align: right; border: 1px solid ${idx === 0 ? '#000000' : '#e5e5e5'}; width: 140px;">
                    <div style="font-weight: 700; font-size: 18px; color: ${idx === 0 ? '#ffffff' : '#000000'}; font-family: monospace;">
                      ${formatPrice(grade.total)}
                    </div>
                  </td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>

          <!-- Detailed Breakdown Title -->
          <tr>
            <td style="padding: 32px 40px 16px 40px;">
              <p style="margin: 0; color: #888888; font-size: 11px; font-family: monospace; letter-spacing: 2px;">
                DETAILED BREAKDOWN - ${selectedGrade.grade.toUpperCase()}
              </p>
            </td>
          </tr>

          <!-- Detailed Items Table -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <table role="presentation" style="width: 100%; border: 0; border-collapse: collapse; font-size: 13px;">
                <tr style="background-color: #f8f8f8;">
                  <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #666666; border-bottom: 2px solid #000000; width: 60px;">공종</th>
                  <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #666666; border-bottom: 2px solid #000000;">항목</th>
                  <th style="padding: 10px 12px; text-align: center; font-size: 11px; font-weight: 600; color: #666666; border-bottom: 2px solid #000000; width: 60px;">수량</th>
                  <th style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 600; color: #666666; border-bottom: 2px solid #000000; width: 80px;">단가</th>
                  <th style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 600; color: #666666; border-bottom: 2px solid #000000; width: 100px;">금액</th>
                </tr>
                ${generateItemsTable(selectedGrade)}
              </table>
            </td>
          </tr>

          <!-- Subtotal -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" style="width: 100%; border: 0; border-collapse: collapse; background-color: #f8f8f8;">
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #666666;">자재 및 시공비 소계</td>
                  <td style="padding: 12px 16px; text-align: right; font-size: 14px; font-family: monospace; font-weight: 600;">${formatPriceNumber(selectedGrade.subtotal)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #666666;">인건비 (15%)</td>
                  <td style="padding: 12px 16px; text-align: right; font-size: 14px; font-family: monospace;">${formatPriceNumber(selectedGrade.laborCost)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #666666;">현장관리비 (5%)</td>
                  <td style="padding: 12px 16px; text-align: right; font-size: 14px; font-family: monospace;">${formatPriceNumber(selectedGrade.managementFee)}</td>
                </tr>
                <tr style="background-color: #000000;">
                  <td style="padding: 16px; font-size: 15px; font-weight: 700; color: #ffffff;">총 견적 금액</td>
                  <td style="padding: 16px; text-align: right; font-size: 20px; font-family: monospace; font-weight: 700; color: #ffffff;">${formatPriceNumber(selectedGrade.total)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Scope Note -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8f8f8; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 12px 0; font-size: 12px; font-weight: 600; color: #333333;">
                📋 견적 포함 범위
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666; line-height: 1.6;">
                바닥(마루/타일), 벽면(도배), 천장(몰딩/우물천장), 주방(싱크대/상하부장), 욕실(위생도기/타일/천장재), 목공(문짝/걸레받이/붙박이장), 전기(콘센트/스위치/조명), 철거 및 폐기물 처리
              </p>
              <p style="margin: 12px 0 0 0; font-size: 11px; color: #888888;">
                * 샷시, 발코니 확장, 시스템 에어컨, 가전/가구는 별도 옵션입니다.
              </p>
            </td>
          </tr>

          <!-- Notice Section -->
          <tr>
            <td style="padding: 24px 40px; background-color: #ffffff; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 12px 0; color: #888888; font-size: 10px; font-family: monospace; letter-spacing: 2px;">
                STANDARD UNIT GUARANTEE
              </p>
              <ul style="margin: 0; padding: 0 0 0 16px; font-size: 12px; color: #666666; line-height: 1.8;">
                <li>본 견적은 3,847건의 실제 시공 데이터 기반으로 산출되었습니다.</li>
                <li>현장 실측 후 정밀 견적으로 조정될 수 있습니다.</li>
                <li>가격 보장 계약 체결 시, 추가 비용 발생 시 차액 200% 보상합니다.</li>
                <li>견적 유효기간: 발행일로부터 30일</li>
              </ul>
            </td>
          </tr>

          ${wantsConstruction ? `
          <!-- Construction Request Notice -->
          <tr>
            <td style="padding: 20px 40px; background-color: #000000;">
              <p style="margin: 0; font-size: 14px; color: #ffffff; font-weight: 600;">
                🏠 시공 매칭 요청이 접수되었습니다
              </p>
              <p style="margin: 6px 0 0 0; font-size: 12px; color: #888888;">
                담당자가 24시간 내에 검증된 파트너 시공사 정보와 함께 연락드리겠습니다.
              </p>
            </td>
          </tr>
          ` : ''}

          <!-- CTA Button -->
          <tr>
            <td style="padding: 32px 40px; text-align: center;">
              <a href="https://open.kakao.com/o/sLPdwe7h" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 16px 48px; font-size: 14px; font-weight: 700;">
                상세 상담 신청하기
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f8f8f8; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #888888;">
                Standard Unit | 아파트 인테리어 표준 견적 서비스
              </p>
              <p style="margin: 0; font-size: 10px; color: #aaaaaa;">
                본 메일은 고객님의 견적 요청에 따라 발송되었습니다.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function generateEstimateEmailText({
  customerName,
  complexName,
  size,
  floorType,
  wantsConstruction,
}: EstimateEmailProps): string {
  const estimate = getDetailedEstimate(size);
  const today = new Date().toLocaleDateString('ko-KR');
  const selectedGrade = estimate.grades[0];

  return `
Standard Unit 정밀 견적서
=========================

${customerName}님의 정밀 견적서
발행일: ${today}
견적번호: SU-${Date.now().toString().slice(-8)}

[ PROJECT INFO ]
단지명: ${complexName}
평형: ${estimate.size} (${estimate.area})
평면 타입: ${floorType || '-'}
시공 의뢰: ${wantsConstruction ? '희망' : '견적만'}

[ ESTIMATE SUMMARY ]
${estimate.grades.map(g => `• ${g.grade}: ${formatPrice(g.total)} - ${g.description}`).join('\n')}

[ DETAILED BREAKDOWN - ${selectedGrade.grade.toUpperCase()} ]
${selectedGrade.items.map(item => `${item.name}: ${Math.round(item.quantity)}${item.unit} × ${item.unitPrice.toLocaleString()}원 = ${item.total.toLocaleString()}원`).join('\n')}

자재 및 시공비 소계: ${formatPriceNumber(selectedGrade.subtotal)}
인건비 (15%): ${formatPriceNumber(selectedGrade.laborCost)}
현장관리비 (5%): ${formatPriceNumber(selectedGrade.managementFee)}
----------------------------------------
총 견적 금액: ${formatPriceNumber(selectedGrade.total)}

[ INCLUDED IN ESTIMATE ]
바닥(마루/타일), 벽면(도배), 천장(몰딩/우물천장), 주방(싱크대/상하부장),
욕실(위생도기/타일/천장재), 목공(문짝/걸레받이/붙박이장), 전기(콘센트/스위치/조명),
철거 및 폐기물 처리

* 샷시, 발코니 확장, 시스템 에어컨, 가전/가구는 별도 옵션입니다.

[ STANDARD UNIT GUARANTEE ]
• 본 견적은 3,847건의 실제 시공 데이터 기반으로 산출되었습니다.
• 현장 실측 후 정밀 견적으로 조정될 수 있습니다.
• 가격 보장 계약 체결 시, 추가 비용 발생 시 차액 200% 보상합니다.
• 견적 유효기간: 발행일로부터 30일

${wantsConstruction ? '🏠 시공 매칭 요청이 접수되었습니다. 담당자가 24시간 내에 연락드리겠습니다.' : ''}

---
Standard Unit | 아파트 인테리어 표준 견적 서비스
상세 상담: https://open.kakao.com/o/sLPdwe7h
  `;
}
