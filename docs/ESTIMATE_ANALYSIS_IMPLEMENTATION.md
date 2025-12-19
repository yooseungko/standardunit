# 견적 분석 시스템 구현 계획

## 📋 프로젝트 개요

사용자가 제출한 타사 견적서(PDF/Excel)를 AI로 분석하여 Standard Unit 표준 견적과 비교하는 시스템

### 🎯 핵심 설계 원칙

#### 1. 항목 표준화
- 모든 견적 항목을 **정규화된 카테고리 체계**로 분류
- "수 전" → "수전", 다양한 표현 → 하나의 표준 항목
- AI가 띄어쓰기 오류, 약어, 다양한 표현을 자동 정규화

#### 2. 데이터 축적 → 신뢰도 향상
- 같은 항목에 대한 데이터가 많아질수록 **통계적 신뢰도 상승**
- 예: "32평 욕실수전 평균 15만원 (n=47건, 신뢰도 95%)"
- 관리자 검증 데이터는 가중치 부여

#### 3. 시간에 따른 인플레이션 반영
- **1년 전 가격 ≠ 현재 가격**
- 모든 가격 데이터에 **년월(YYYY-MM)** 기록
- 전월 대비, 전년 동월 대비 변동률 추적
- 시점 기준 가격 비교 가능

### 핵심 기능
- PDF 및 Excel(CSV) 파일 업로드
- AI를 활용한 견적 데이터 자동 추출 및 정규화
- 표준 견적 대비 비교 분석 (예: "표준 견적 대비 105%")
- 시간에 따른 가격 변동 추적 (인플레이션)
- 데이터 축적에 따른 신뢰도 표시

---

## 🏗️ 시스템 아키텍처

```
[파일 업로드] → [텍스트 파싱] → [원본 삭제] → [AI 추출] → [DB 저장] → [비교 분석]
     ↓              ↓              ↓           ↓            ↓            ↓
   PDF/Excel     텍스트만      스토리지     Gemini     Supabase     동적 표준단가
                  추출          절약         API         only         비교
```

### 💾 스토리지 비용 절감
- 원본 파일은 **파싱 후 즉시 삭제**
- DB에는 **추출된 데이터만** 저장
- 스토리지 비용 0원

### 📈 동적 표준 단가
```
검증된 데이터 (n>=10) → 중간값 사용
데이터 부족 (n<10)   → 기본값 + 데이터 가중평균
데이터 없음          → 기본 하드코딩 단가
```

---

## 📝 단계별 구현 계획

### Phase 1: 데이터베이스 스키마 설계
**예상 시간: 30분**

#### 1.1 Supabase 테이블 생성

```sql
-- 견적서 파일 테이블
CREATE TABLE estimate_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'excel', 'csv'
  file_url TEXT, -- Supabase Storage URL
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  request_id UUID REFERENCES estimate_requests(id), -- 고객 견적 요청과 연결
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 추출된 견적 항목 테이블
CREATE TABLE extracted_estimate_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES estimate_files(id) ON DELETE CASCADE,
  category TEXT, -- '바닥', '벽면', '주방', '욕실', '전기', '철거' 등
  item_name TEXT NOT NULL,
  unit TEXT, -- '㎡', 'M', '개', '식' 등
  quantity DECIMAL,
  unit_price DECIMAL,
  total_price DECIMAL,
  notes TEXT,
  confidence_score DECIMAL, -- AI 추출 신뢰도 (0-1)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 견적 분석 결과 테이블
CREATE TABLE estimate_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES estimate_files(id) ON DELETE CASCADE,
  apartment_size INTEGER, -- 평형
  total_price DECIMAL, -- 총 견적가
  standard_price DECIMAL, -- 표준 견적가 (Standard 등급 기준)
  comparison_percentage DECIMAL, -- 표준 대비 % (105면 5% 비쌈)
  grade_comparison TEXT, -- 'Standard', 'Premium', 'Luxury' 중 가장 가까운 등급
  analysis_summary TEXT, -- AI 분석 요약
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 1.2 Supabase Storage 버킷 생성
- `estimate-files` 버킷 생성 (PDF, Excel 파일 저장용)

---

### Phase 2: 파일 업로드 UI 구현
**예상 시간: 1시간**

#### 2.1 관리자 페이지 탭 추가
- `/admin` 페이지에 "견적 분석" 탭 추가
- 탭 네비게이션: 견적 요청 | **견적 분석**

#### 2.2 파일 업로드 컴포넌트
```
┌─────────────────────────────────────────┐
│  📁 견적서 업로드                        │
│  ┌─────────────────────────────────────┐│
│  │  PDF 또는 Excel 파일을 드래그하세요  ││
│  │  또는 클릭하여 파일 선택            ││
│  └─────────────────────────────────────┘│
│  지원 형식: PDF, XLSX, XLS, CSV         │
└─────────────────────────────────────────┘
```

#### 2.3 파일 목록 테이블
| 파일명 | 유형 | 업로드 일시 | 상태 | 분석 결과 | 액션 |
|--------|------|------------|------|----------|------|
| 래미안_견적서.pdf | PDF | 2025-12-19 | ✅ 완료 | 표준 대비 108% | 상세보기 |

---

### Phase 3: 파일 파싱 시스템 구현
**예상 시간: 2시간**

#### 3.1 PDF 파싱
- **라이브러리**: `pdf-parse` 또는 `pdfjs-dist`
- 텍스트 추출 → AI로 전달

#### 3.2 Excel/CSV 파싱
- **라이브러리**: `xlsx` (SheetJS)
- 셀 데이터 → 구조화된 JSON으로 변환

#### 3.3 API 엔드포인트
```typescript
// POST /api/admin/upload-estimate
// - 파일 업로드
// - Supabase Storage에 저장
// - estimate_files 테이블에 레코드 생성

// POST /api/admin/parse-estimate
// - 파일 파싱 (PDF → 텍스트, Excel → JSON)
// - 파싱 결과 반환
```

---

### Phase 4: AI 데이터 추출 시스템
**예상 시간: 2시간**

#### 4.1 Gemini API 연동

AI는 다음 작업을 수행합니다:
1. **텍스트 정규화**: 띄어쓰기 오류 수정 ("수 전" → "수전", "마 루" → "마루")
2. **카테고리 분류**: 대분류 > 중분류 > 소분류 계층 구조로 분류
3. **제품 정보 추출**: 브랜드, 모델명, 등급 식별
4. **신뢰도 평가**: 각 항목의 추출 신뢰도 점수 부여

```typescript
// 프롬프트 예시
const prompt = `
당신은 인테리어 견적서 분석 전문가입니다.
다음 견적서 텍스트에서 각 항목을 추출하고 정규화해주세요.

## 분류 체계
- 대분류: 바닥, 벽면, 천장, 주방, 욕실, 목공, 전기, 설비, 철거, 기타
- 중분류 예시:
  - 욕실: 수전, 도기, 타일, 천장재, 욕조, 샤워부스
  - 주방: 싱크대, 상부장, 하부장, 타일, 후드
  - 바닥: 마루, 타일, 장판
- 소분류 예시:
  - 수전: 욕실수전, 샤워수전, 세면수전, 주방수전
  - 도기: 양변기, 세면대, 비데

## 정규화 규칙
- 띄어쓰기 오류 수정: "수 전" → "수전", "마 루" → "마루"
- 약어 표준화: "UBR" → "욕실", "ABS" → "천장재"
- 브랜드 식별: "대림바스", "한샘", "이누스", "로얄앤컴퍼니" 등

## 출력 형식 (JSON)
{
  "apartment_size": 32,
  "apartment_name": "래미안 아파트",
  "items": [
    {
      "category": "욕실",
      "sub_category": "수전",
      "detail_category": "샤워수전",
      "original_item_name": "샤워 수 전 (대림)",
      "normalized_item_name": "샤워수전",
      "brand": "대림바스",
      "model": null,
      "product_grade": "일반",
      "unit": "개",
      "quantity": 2,
      "unit_price": 150000,
      "total_price": 300000,
      "confidence_score": 0.95,
      "ai_reasoning": "'샤워 수 전'은 띄어쓰기를 제거하면 '샤워수전'으로, 욕실>수전>샤워수전으로 분류. (대림)은 대림바스 브랜드로 식별."
    }
  ],
  "total_price": 35000000
}

## 견적서 텍스트:
${extractedText}
`;
```

#### 4.2 카테고리 동적 생성
- AI가 기존 카테고리에 없는 항목 발견 시 새 카테고리 제안
- 관리자가 승인하면 시스템에 추가

#### 4.3 신뢰도 점수 계산
| 점수 | 의미 |
|------|------|
| 0.9 ~ 1.0 | 높은 확신 (명확한 항목) |
| 0.7 ~ 0.9 | 중간 확신 (약간의 추론 필요) |
| 0.5 ~ 0.7 | 낮은 확신 (관리자 검토 권장) |
| < 0.5 | 불확실 (수동 입력 필요) |

#### 4.4 관리자 검증 UI
- AI 추출 결과를 관리자가 확인/수정
- 낮은 신뢰도 항목은 노란색으로 하이라이트
- 확정 버튼 클릭 시 DB 저장

---

### Phase 5: 표준 견적 비교 분석
**예상 시간: 1시간**

#### 5.1 비교 로직
```typescript
function analyzeEstimate(extractedData: EstimateData) {
  const size = extractedData.apartment_size;
  const standardEstimate = getDetailedEstimate(size.toString());
  
  const standardTotal = standardEstimate.grades[0].total; // Standard 등급
  const premiumTotal = standardEstimate.grades[1].total;  // Premium 등급
  const luxuryTotal = standardEstimate.grades[2].total;   // Luxury 등급
  
  const submittedTotal = extractedData.total_price;
  const comparisonPercentage = (submittedTotal / standardTotal) * 100;
  
  // 가장 가까운 등급 찾기
  let closestGrade = 'Standard';
  if (submittedTotal >= luxuryTotal * 0.9) closestGrade = 'Luxury';
  else if (submittedTotal >= premiumTotal * 0.9) closestGrade = 'Premium';
  
  return {
    comparisonPercentage,
    closestGrade,
    summary: `표준 견적 대비 ${comparisonPercentage.toFixed(0)}%`
  };
}
```

#### 5.2 항목별 상세 비교
| 공종 | 제출 견적 | 표준 견적 | 차이 |
|------|----------|----------|------|
| 바닥 | 3,200,000 | 2,925,000 | +9.4% |
| 벽면 | 1,500,000 | 1,360,000 | +10.3% |
| ... | ... | ... | ... |

---

### Phase 6: 분석 결과 대시보드
**예상 시간: 1.5시간**

#### 6.1 통계 카드
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 분석 건수    │ │ 평균 비교    │ │ 가장 비싼    │
│    47건     │ │   112%      │ │   158%      │
└──────────────┘ └──────────────┘ └──────────────┘
```

#### 6.2 분석 결과 상세 모달
- 원본 견적 이미지/데이터
- AI 추출 결과
- 표준 견적 비교 차트
- 항목별 상세 비교 테이블

---

### Phase 7: 테스트 및 최적화
**예상 시간: 1시간**

#### 7.1 테스트 시나리오
- [ ] PDF 견적서 업로드 및 파싱
- [ ] Excel 견적서 업로드 및 파싱
- [ ] AI 데이터 추출 정확도 확인
- [ ] 표준 견적 비교 정확성 검증
- [ ] 관리자 검증/수정 기능

#### 7.2 에러 처리
- 파일 형식 오류
- AI 파싱 실패
- 네트워크 오류

---

## 🔧 필요한 패키지

```bash
npm install pdf-parse xlsx
npm install @google/generative-ai  # Gemini API (이미 설치되어 있을 수 있음)
```

---

## 🔑 환경 변수

```env
# .env.local에 추가
GOOGLE_AI_API_KEY=your_gemini_api_key
```

---

## 📅 예상 총 소요 시간

| Phase | 내용 | 예상 시간 |
|-------|------|----------|
| 1 | 데이터베이스 스키마 | 30분 |
| 2 | 파일 업로드 UI | 1시간 |
| 3 | 파일 파싱 시스템 | 2시간 |
| 4 | AI 데이터 추출 | 2시간 |
| 5 | 표준 견적 비교 | 1시간 |
| 6 | 결과 대시보드 | 1.5시간 |
| 7 | 테스트 및 최적화 | 1시간 |
| **합계** | | **약 9시간** |

---

## 🚀 시작하기

Phase 1부터 순차적으로 진행하시면 됩니다.
각 Phase 완료 후 "다음 Phase 진행해줘"라고 말씀해주시면 계속 진행하겠습니다.

---

*문서 작성일: 2025-12-19*
*작성자: Antigravity AI Assistant*
