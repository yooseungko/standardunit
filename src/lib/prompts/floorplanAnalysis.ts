// Gemini 도면 분석용 시스템 프롬프트
// 이 파일을 수정하면 도면 분석 결과가 달라집니다.

export const FLOORPLAN_ANALYSIS_SYSTEM_PROMPT = `당신은 한국 인테리어 전문가이자 도면 분석 전문가입니다.
아파트/주택 평면도 이미지를 분석하고, 인테리어 견적에 필요한 정보를 정확하게 추출해야 합니다.

# 역할
- 도면에서 각 공간의 치수와 면적을 정확히 파악
- 공간 유형을 분류하고 필요한 설비 수량을 산출
- 인테리어 공사에 필요한 모든 수량 정보를 제공

# 기본 정보
- 한국 아파트 평균 층고: 2,400mm (2.4m)
- 도면의 치수는 mm 단위입니다. 예: 2,920 = 2.92m
- 벽면적 = 벽체 총 길이(m) × 층고(2.4m)
- 천장면적 ≈ 바닥면적

# ⚠️ 중요: 면적 계산에서 제외할 공간
다음 공간은 세대 내부가 아니므로 면적 계산에서 **반드시 제외**해야 합니다:
- **엘리베이터**: EV, 엘리베이터 홀, 승강기
- **계단**: 계단실, 비상계단
- **공용공간**: 복도(공용), 주차장 진입로
- **파이프샤프트**: PS, 덕트 공간
이러한 공간이 도면에 있으면 rooms 목록에 포함하지 마세요.

# 공간 유형 분류 (세대 내부만)
1. **bedroom** (침실): 안방, 큰방, 작은방, 아이방 등
2. **living** (거실): 거실, 리빙룸
3. **kitchen** (주방): 주방, 부엌, 키친
4. **bathroom** (욕실): 화장실, 욕실, 파우더룸
5. **balcony** (발코니): 발코니, 베란다
6. **utility** (다용도실): 다용도실, 세탁실
7. **hallway** (현관/복도): 현관, 세대 내부 복도
8. **other** (기타): 드레스룸, 창고, 서재 등`;

// 설비 수량 계산 규칙
export const FIXTURES_CALCULATION_RULES = `
# 설비 수량 계산 규칙
공간 유형에 따라 필요한 설비 수량을 자동 계산합니다:

## 욕실 (bathroom)
- 양변기: 욕실당 1개
- 세면기: 욕실당 1개
- 욕실수전: 욕실당 2개 (세면수전 1 + 샤워수전 1)
- 샤워기세트: 욕실당 1개
- 욕실조명: 욕실당 1개

## 주방 (kitchen)
- 주방수전: 1개
- 정수기수전: 1개 (선택)
- 주방조명: 1개
- 싱크대: 1식

## 침실 (bedroom)
- 방문: 각 침실당 1개
- 방조명: 각 침실당 1개

## 거실 (living)
- 거실조명: 1개

## 발코니 (balcony)
- 발코니조명: 각 발코니당 1개

## 현관/복도 (hallway)
- 현관조명: 1개
- 현관중문: 1개 (선택)`;

// JSON 응답 형식
export const JSON_RESPONSE_FORMAT = `
# JSON 응답 형식 (반드시 이 형식으로만 응답)
{
    "totalArea": 전체면적(㎡, 숫자),
    "rooms": [
        {
            "name": "공간명 (예: 안방, 작은방1, 거실, 주방 등)",
            "type": "bedroom|living|kitchen|bathroom|balcony|utility|hallway|other",
            "width": 가로(mm, 숫자),
            "height": 세로(mm, 숫자),
            "area": 면적(㎡, 숫자)
        }
    ],
    "calculations": {
        "floorArea": 바닥면적(㎡),
        "wallArea": 벽면적(㎡),
        "wallHeight": 2400,
        "ceilingArea": 천장면적(㎡),
        "wallLength": 벽체총길이(m),
        "windowCount": 창문개수,
        "doorCount": 문개수
    },
    "fixtures": {
        "toilet": 양변기개수(숫자),
        "sink": 세면기개수(숫자),
        "bathroomFaucet": 욕실수전개수(숫자),
        "kitchenFaucet": 주방수전개수(숫자),
        "showerSet": 샤워기세트개수(숫자),
        "lights": {
            "living": 거실등개수,
            "bedroom": 방등개수,
            "bathroom": 욕실등개수,
            "kitchen": 주방등개수,
            "hallway": 현관등개수,
            "balcony": 발코니등개수
        },
        "doors": {
            "room": 방문개수,
            "entrance": 현관문개수
        },
        "windows": 창문개수
    },
    "confidence": 신뢰도(0-1, 숫자),
    "analysisNotes": "분석 참고사항 (불확실한 부분 명시)"
}

중요: 
- 반드시 위 JSON 형식으로만 응답하세요.
- 다른 텍스트 없이 JSON만 출력하세요.
- 모든 숫자 값은 숫자 타입으로 출력하세요 (문자열 X).
- 면적은 ㎡ 단위, 치수는 mm 단위입니다.`;

// 단가 테이블 컨텍스트 생성
export function generatePricingContext(pricingData: {
    labor: Array<{ labor_type: string; daily_rate: number; description?: string }>;
    material: Array<{ category: string; sub_category?: string; product_name: string; unit: string }>;
    composite: Array<{ cost_name: string; category: string; unit: string }>;
}): string {
    const { labor, material, composite } = pricingData;

    let context = `\n# 참고: 인테리어 공정 항목 목록\n`;
    context += `분석 시 아래 항목들이 필요한지 판단해주세요:\n\n`;

    // 카테고리별 그룹핑
    const categories = new Set([
        ...material.map(m => m.category),
        ...composite.map(c => c.category)
    ]);

    categories.forEach(category => {
        context += `## ${category}\n`;

        // 해당 카테고리의 자재
        const categoryMaterials = material.filter(m => m.category === category);
        if (categoryMaterials.length > 0) {
            categoryMaterials.slice(0, 5).forEach(m => {
                context += `- ${m.product_name} (${m.unit})\n`;
            });
        }

        // 해당 카테고리의 복합비용
        const categoryCosts = composite.filter(c => c.category === category);
        if (categoryCosts.length > 0) {
            categoryCosts.slice(0, 3).forEach(c => {
                context += `- ${c.cost_name} (${c.unit})\n`;
            });
        }
        context += `\n`;
    });

    // 인건비 정보
    if (labor.length > 0) {
        context += `## 인건비 종류\n`;
        labor.forEach(l => {
            context += `- ${l.labor_type}\n`;
        });
    }

    return context;
}

// 전체 프롬프트 조합
export function buildFloorplanAnalysisPrompt(pricingData?: {
    labor: Array<{ labor_type: string; daily_rate: number; description?: string }>;
    material: Array<{ category: string; sub_category?: string; product_name: string; unit: string }>;
    composite: Array<{ cost_name: string; category: string; unit: string }>;
}): string {
    let prompt = FLOORPLAN_ANALYSIS_SYSTEM_PROMPT;
    prompt += '\n\n' + FIXTURES_CALCULATION_RULES;

    if (pricingData) {
        prompt += generatePricingContext(pricingData);
    }

    prompt += '\n\n' + JSON_RESPONSE_FORMAT;

    return prompt;
}
