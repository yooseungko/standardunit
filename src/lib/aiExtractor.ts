import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIExtractedData, AIExtractedItem } from './supabase';

// Gemini API 클라이언트
const genAI = process.env.GOOGLE_AI_API_KEY
    ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
    : null;

// 모델 설정 (최신 Gemini 모델)
const MODEL_NAME = 'gemini-2.0-flash-exp';

// 분석 프롬프트
const EXTRACTION_PROMPT = `당신은 인테리어 견적서 분석 전문가입니다.
이 견적서 이미지/문서에서 각 항목을 추출하고 정규화해주세요.

## 분류 체계
대분류 (category) > 중분류 (sub_category):
- 바닥 > 마루, 타일, 장판, 시공비
- 벽면 > 도배, 페인트, 타일, 시공비
- 천장 > 천장재, 몰딩, 우물천장, 시공비
- 주방 > 싱크대, 상부장, 하부장, 후드, 수전, 설치비
- 욕실 > 수전, 도기, 욕조, 샤워부스, 세면대, 비데, 타일, 설치비
- 목공 > 문, 현관문, 걸레받이, 붙박이장, 신발장, 자재, 시공비
  - 목공 자재 예시: 타카핀, 본드, 실리콘, 씰링재, 석고보드, 합판, MDF
- 전기 > 조명, 콘센트, 스위치, 배선, 시공비
- 설비 > 난방, 배관, 에어컨, 시공비
- 철거 > 철거, 폐기물, 운반
- 부자재 > 철물, 접착제, 코킹, 실리콘, 기타소모품
- 인건비 > 일반인부, 기술인부, 잡역
- 기타 > 위에 해당하지 않는 항목

## 분류 힌트
- 타카핀, 못, 나사, 볼트 → 목공 > 자재
- 본드, 실리콘, 코킹 → 목공 > 자재 또는 부자재
- 마감재, 피니쉬재 → 해당 공종 > 자재
- F-숫자 (예: F-10, F-15) → 주로 목공 자재 (타카핀 규격)

## 인건비(품) 분류 규칙 (중요!)
- 단위가 "품"인 항목은 인건비입니다
- "OOO 기능공", "OOO 기술자", "OOO 인부" 등은 인건비입니다
- 각 공종의 인건비는 해당 대분류 > 인건비로 분류하세요
  - 전기 기능공 (3품) → 전기 > 인건비
  - 도배 기능공 (2품) → 벽면 > 인건비
  - 목공 기능공 (5품) → 목공 > 인건비
  - 설비 기능공 (2품) → 설비 > 인건비
  - 보통 인부, 잡역부 등 → 인건비 > 일반인부


## 정규화 규칙
1. 띄어쓰기 오류 수정: "수 전" → "수전", "마 루" → "마루"
2. 약어 표준화: "UBR" → "욕실", "ABS" → "천장재"
3. 브랜드 식별: "대림바스", "한샘", "이누스", "로얄앤컴퍼니" 등

## 제품 등급 분류
- 일반: 기본 제품
- 중급: 중간 등급 제품
- 고급: 국내 프리미엄 제품
- 수입: 해외 수입 제품

## 출력 형식 (반드시 이 JSON 형식만 출력하세요)
{
  "apartment_size": null 또는 숫자 (평형, 예: 32),
  "apartment_name": null 또는 "아파트명",
  "items": [
    {
      "category": "대분류",
      "sub_category": "중분류 (없으면 null)",
      "detail_category": "소분류 (없으면 null)",
      "original_item_name": "원본 항목명",
      "normalized_item_name": "정규화된 항목명",
      "brand": "브랜드명 (없으면 null)",
      "model": "모델명 (없으면 null)",
      "product_grade": "일반/중급/고급/수입 중 하나 (없으면 null)",
      "unit": "단위 (㎡, M, 개, 식 등)",
      "quantity": 수량 (숫자, 없으면 null),
      "unit_price": 단가 (숫자, 없으면 null),
      "total_price": 금액 (숫자, 없으면 null),
      "confidence_score": 0.0~1.0 사이 신뢰도,
      "ai_reasoning": "분류 이유 (짧게)"
    }
  ],
  "total_price": 총 금액 (없으면 null)
}

## 주의사항
- 반드시 유효한 JSON만 출력하세요
- 마크다운이나 설명 없이 순수 JSON만 출력하세요
- 금액에서 쉼표(,)는 제거하고 숫자만 사용하세요
- 이미지가 잘 안보여도 최대한 추출해주세요

## 중복 방지 규칙 (매우 중요!)
- 표지나 요약 페이지의 총액/합계는 제외하세요
- 실제 상세 항목만 추출하세요
- 요약 금액과 상세 항목 금액이 중복되면 상세 항목만 사용
- "합계", "총계", "소계" 행은 items에 포함하지 마세요
- "공사 요약", "견적 요약", "총 공사비" 등 요약 항목은 제외

예시 (제외할 항목):
- "목공 소계: 5,000,000원" → 제외 (소계)
- "전체 합계: 50,000,000원" → 제외 (합계)
- 표지의 "주방 공사 5,000,000원" → 제외 (실제 상세 내역에서 추출)

예시 (포함할 항목):
- "강마루 시공 - 30㎡ - 단가 50,000원 - 1,500,000원" → 포함
- "양변기 교체 (한샘) - 1개 - 350,000원" → 포함

## 묶음 견적서 처리 (중요!)
견적서가 간략하게 작성된 경우, 상세 항목을 추측하여 분리하세요.

⚠️ 금액 분배 규칙 (매우 중요!) ⚠️
- 묶음 항목의 총액을 각 세부 항목에 복사하지 마세요!
- 총액을 세부 항목 수로 나누어 배분하세요
- 또는 일반적인 시장 가격을 기준으로 합리적으로 분배하세요

예시 1: "위생도기 및 악세서리 - 5,740,000원"의 경우
→ 금액을 분배하여 분리:
  - 욕실 > 도기: 양변기 - 1,200,000원 (추정)
  - 욕실 > 도기: 세면기 - 800,000원 (추정)
  - 욕실 > 수전: 세면수전 - 450,000원 (추정)
  - 욕실 > 악세서리: 휴지걸이, 수건걸이 등 - 200,000원 (추정)
  - 욕실 > 샤워부스: 샤워부스 - 2,000,000원 (추정)
  - 욕실 > 기기류: 욕조 또는 샤워기 - 1,090,000원 (추정)
  (합계 = 5,740,000원 ✓)

❌ 잘못된 예시 (절대 하지 마세요):
  - 양변기 5,740,000원
  - 세면기 5,740,000원
  - 수전 5,740,000원  ← 총액이 3배로 뻥튀기됨!

예시 2: "타일류 - 3,000,000원"
→ 금액 분배:
  - 바닥 > 타일: 바닥타일 - 1,800,000원 (추정)
  - 벽면 > 타일: 벽타일 - 1,200,000원 (추정)
  (합계 = 3,000,000원 ✓)

⚠️ 검증 규칙 ⚠️
- 분리된 세부 항목들의 금액 합계 = 원본 묶음 항목의 총액
- 금액이 맞지 않으면 조정하세요
- 원본 총액: 5,740,000원 → 분리 후 합계도 반드시 5,740,000원이어야 함

추측 시 confidence_score를 0.5 이하로 설정하고, ai_reasoning에 "(추정)" 표시`;

// NOTE: 추출시 sub_category에 세부 공종 포함

/**
 * Gemini Vision으로 PDF/이미지에서 견적 항목 추출
 * @param fileBuffer - PDF 또는 이미지 파일의 Buffer
 * @param mimeType - 파일 MIME 타입 (예: 'application/pdf', 'image/png')
 * @returns AI가 추출한 견적 데이터
 */
export async function extractFromDocument(
    fileBuffer: Buffer,
    mimeType: string
): Promise<AIExtractedData> {
    if (!genAI) {
        throw new Error('GOOGLE_AI_API_KEY가 설정되지 않았습니다.');
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Buffer를 Base64로 변환
    const base64Data = fileBuffer.toString('base64');

    try {
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data,
                },
            },
            { text: EXTRACTION_PROMPT },
        ]);

        const response = await result.response;
        const text = response.text();

        console.log('Gemini response length:', text.length);

        // JSON 추출 (마크다운 코드 블록 제거)
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.slice(7);
        }
        if (jsonText.startsWith('```')) {
            jsonText = jsonText.slice(3);
        }
        if (jsonText.endsWith('```')) {
            jsonText = jsonText.slice(0, -3);
        }
        jsonText = jsonText.trim();

        // JSON 파싱 (오류 복구 시도)
        let extractedData: AIExtractedData;
        try {
            extractedData = JSON.parse(jsonText) as AIExtractedData;
        } catch (parseError) {
            console.error('JSON parse error, attempting to fix truncated JSON...');

            // 잘린 JSON 복구 시도
            // 1. 마지막 완전한 항목까지만 파싱
            const itemsMatch = jsonText.match(/"items"\s*:\s*\[/);
            if (itemsMatch) {
                // items 배열 찾기
                const itemsStart = jsonText.indexOf('"items"');
                const arrayStart = jsonText.indexOf('[', itemsStart);

                // 마지막 완전한 객체 찾기
                let lastCompleteIndex = arrayStart;
                let braceCount = 0;
                let inString = false;

                for (let i = arrayStart; i < jsonText.length; i++) {
                    const char = jsonText[i];
                    if (char === '"' && jsonText[i - 1] !== '\\') {
                        inString = !inString;
                    }
                    if (!inString) {
                        if (char === '{') braceCount++;
                        if (char === '}') {
                            braceCount--;
                            if (braceCount === 0) {
                                lastCompleteIndex = i + 1;
                            }
                        }
                    }
                }

                // 복구 시도
                const fixedJson = jsonText.substring(0, lastCompleteIndex) + ']}';
                try {
                    extractedData = JSON.parse(fixedJson) as AIExtractedData;
                    console.log('Successfully recovered truncated JSON');
                } catch {
                    // 최소한의 데이터 반환
                    console.error('Could not recover JSON, returning empty result');
                    extractedData = { items: [], apartment_size: undefined, apartment_name: undefined, total_price: undefined };
                }
            } else {
                extractedData = { items: [], apartment_size: undefined, apartment_name: undefined, total_price: undefined };
            }
        }

        // 데이터 검증 및 정리
        if (!extractedData.items || !Array.isArray(extractedData.items)) {
            extractedData.items = [];
        }

        // 각 항목 검증
        extractedData.items = extractedData.items.map((item: AIExtractedItem) => ({
            category: item.category || '기타',
            sub_category: item.sub_category || null,
            detail_category: item.detail_category || null,
            original_item_name: item.original_item_name || item.normalized_item_name || '알 수 없음',
            normalized_item_name: item.normalized_item_name || item.original_item_name || '알 수 없음',
            brand: item.brand || null,
            model: item.model || null,
            product_grade: item.product_grade || null,
            unit: item.unit || null,
            quantity: typeof item.quantity === 'number' ? item.quantity : null,
            unit_price: typeof item.unit_price === 'number' ? item.unit_price : null,
            total_price: typeof item.total_price === 'number' ? item.total_price : null,
            confidence_score: typeof item.confidence_score === 'number'
                ? Math.min(Math.max(item.confidence_score, 0), 1)
                : 0.5,
            ai_reasoning: item.ai_reasoning || '',
        }));

        // 금액 검증 및 조정
        if (extractedData.total_price && extractedData.items.length > 0) {
            const itemsSum = extractedData.items.reduce((sum, item) => sum + (item.total_price || 0), 0);
            const declaredTotal = extractedData.total_price;

            // 합계가 총액의 1.5배 이상이면 비율 조정 (중복 금액 문제)
            if (itemsSum > declaredTotal * 1.5) {
                console.log(`금액 조정: 항목 합계(${itemsSum}) > 총액(${declaredTotal}) * 1.5`);
                const ratio = declaredTotal / itemsSum;
                extractedData.items = extractedData.items.map(item => ({
                    ...item,
                    total_price: item.total_price ? Math.round(item.total_price * ratio) : null,
                    unit_price: item.unit_price ? Math.round(item.unit_price * ratio) : null,
                    ai_reasoning: item.ai_reasoning + ' (금액 비율 조정됨)',
                }));
            }
        }

        return extractedData;
    } catch (error) {
        console.error('Gemini Vision extraction error:', error);
        throw new Error('문서에서 데이터를 추출할 수 없습니다.');
    }
}

/**
 * 텍스트 기반 견적서 분석 (Excel 파싱 결과 등)
 * @param estimateText - 견적서 텍스트
 * @returns AI가 추출한 견적 데이터
 */
export async function extractFromText(
    estimateText: string
): Promise<AIExtractedData> {
    if (!genAI) {
        throw new Error('GOOGLE_AI_API_KEY가 설정되지 않았습니다.');
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = EXTRACTION_PROMPT + `\n\n## 견적서 텍스트:\n${estimateText}`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // JSON 추출
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.slice(7);
        }
        if (jsonText.startsWith('```')) {
            jsonText = jsonText.slice(3);
        }
        if (jsonText.endsWith('```')) {
            jsonText = jsonText.slice(0, -3);
        }
        jsonText = jsonText.trim();

        const extractedData = JSON.parse(jsonText) as AIExtractedData;

        if (!extractedData.items || !Array.isArray(extractedData.items)) {
            extractedData.items = [];
        }

        extractedData.items = extractedData.items.map((item: AIExtractedItem) => ({
            category: item.category || '기타',
            sub_category: item.sub_category || null,
            detail_category: item.detail_category || null,
            original_item_name: item.original_item_name || item.normalized_item_name || '알 수 없음',
            normalized_item_name: item.normalized_item_name || item.original_item_name || '알 수 없음',
            brand: item.brand || null,
            model: item.model || null,
            product_grade: item.product_grade || null,
            unit: item.unit || null,
            quantity: typeof item.quantity === 'number' ? item.quantity : null,
            unit_price: typeof item.unit_price === 'number' ? item.unit_price : null,
            total_price: typeof item.total_price === 'number' ? item.total_price : null,
            confidence_score: typeof item.confidence_score === 'number'
                ? Math.min(Math.max(item.confidence_score, 0), 1)
                : 0.5,
            ai_reasoning: item.ai_reasoning || '',
        }));

        return extractedData;
    } catch (error) {
        console.error('AI extraction error:', error);
        throw new Error('AI 데이터 추출에 실패했습니다.');
    }
}

/**
 * Gemini API 연결 상태 확인
 */
export function isGeminiConfigured(): boolean {
    return !!genAI;
}

/**
 * API 연결 테스트
 */
export async function testGeminiConnection(): Promise<{ success: boolean; message: string }> {
    if (!genAI) {
        return { success: false, message: 'GOOGLE_AI_API_KEY가 설정되지 않았습니다.' };
    }

    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const result = await model.generateContent('안녕하세요. 간단히 "연결 성공"이라고만 답해주세요.');
        const text = (await result.response).text();
        return { success: true, message: text.trim() };
    } catch (error) {
        return { success: false, message: `연결 실패: ${error}` };
    }
}

// 기존 함수명 유지 (하위 호환)
export const extractEstimateItems = extractFromText;
