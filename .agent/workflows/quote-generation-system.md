# 견적서 자동 생성 및 발송 시스템 구현 계획

## 📋 개요

인테리어 도면을 AI가 분석하여 자재 수량 및 인건비를 자동으로 계산하고, 표준 단가를 적용하여 견적서를 생성한 후 소비자에게 이메일로 발송하는 시스템입니다.

---

## 🔄 전체 프로세스 흐름

```
[소비자] 랜딩페이지 문의
    ↓
[관리자] 도면 업로드
    ↓
[AI] Google Vision API로 도면 분석
    ↓
[시스템] 표준 단가 적용하여 견적서 생성
    ↓
[관리자] 견적서 검토 및 수정
    ↓
[시스템] 소비자 이메일로 견적서 발송
```

---

## 📦 단계별 구현 상세

### 1단계: 소비자 문의 접수 (현재 구현 완료)

**현재 상태**: ✅ 구현 완료

- 랜딩페이지 FinalCTA 컴포넌트에서 견적 문의 폼 제출
- Supabase `estimates` 테이블에 저장
- 관리자 이메일 알림 발송

**관련 파일**:
- `src/components/sections/FinalCTA.tsx`
- `src/app/api/estimates/route.ts`
- Supabase `estimates` 테이블

---

### 2단계: 관리자 도면 업로드

**구현 필요**:

1. **관리자 페이지 UI 수정**
   - 견적 요청 상세 모달에 "도면 업로드" 버튼 추가
   - 이미지 미리보기 및 다중 업로드 지원
   
2. **파일 업로드 API**
   - `/api/floorplan/upload` 엔드포인트 생성
   - Supabase Storage 또는 로컬 저장소에 파일 저장
   
3. **데이터베이스 스키마**
   ```sql
   CREATE TABLE floorplans (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       estimate_id INTEGER REFERENCES estimates(id),
       file_url TEXT NOT NULL,
       file_name TEXT NOT NULL,
       analysis_status TEXT DEFAULT 'pending', -- pending, analyzing, completed, failed
       analysis_result JSONB,
       created_at TIMESTAMP DEFAULT NOW(),
       updated_at TIMESTAMP DEFAULT NOW()
   );
   ```

---

### 3단계: Google Vision API 도면 분석

**구현 필요**:

1. **Google Cloud Vision API 설정**
   - 환경변수: `GOOGLE_CLOUD_VISION_API_KEY`
   - OCR 및 객체 감지 활용

2. **도면 분석 API**
   - `/api/floorplan/analyze` 엔드포인트 생성
   - 도면에서 추출할 정보:
     - 각 공간별 치수 (mm)
     - 공간 유형 (침실, 거실, 주방, 화장실, 발코니 등)
     - 전체 면적 계산
     - 벽체 길이 계산
     - 바닥 면적 계산

3. **AI 분석 로직** (Gemini API 활용)
   - Vision API 결과를 바탕으로 자재 수량 계산
   - 공정별 작업량 산정:
     - 바닥공사: 면적 기준 (㎡)
     - 벽면공사: 벽체 면적 기준 (㎡)
     - 도배공사: 벽면적 + 천장 면적 (㎡)
     - 전기공사: 공간 수 및 면적 기준
     - 설비공사: 화장실, 주방 개수 기준
     - 철거공사: 전체 면적 기준

4. **분석 결과 구조**
   ```typescript
   interface FloorplanAnalysis {
       totalArea: number; // 전체 면적 (㎡)
       rooms: {
           name: string; // 공간명 (침실, 거실 등)
           type: string; // 공간 유형
           width: number; // 가로 (mm)
           height: number; // 세로 (mm)
           area: number; // 면적 (㎡)
       }[];
       calculations: {
           floorArea: number; // 바닥 면적
           wallArea: number; // 벽면 면적
           ceilingArea: number; // 천장 면적
           wallLength: number; // 벽체 총 길이
       };
       estimatedMaterials: {
           category: string;
           item: string;
           quantity: number;
           unit: string;
       }[];
   }
   ```

---

### 4단계: 표준 단가 적용 및 견적서 생성

**구현 필요**:

1. **견적서 생성 API**
   - `/api/quotes/generate` 엔드포인트 생성
   - 분석 결과 + 표준 단가 테이블 매칭

2. **견적서 데이터베이스 스키마**
   ```sql
   CREATE TABLE quotes (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       estimate_id INTEGER REFERENCES estimates(id),
       floorplan_id UUID REFERENCES floorplans(id),
       quote_number TEXT NOT NULL, -- 견적번호 (예: QT-2024-0001)
       total_amount BIGINT NOT NULL,
       labor_cost BIGINT NOT NULL,
       material_cost BIGINT NOT NULL,
       other_cost BIGINT NOT NULL,
       discount_amount BIGINT DEFAULT 0,
       final_amount BIGINT NOT NULL,
       status TEXT DEFAULT 'draft', -- draft, confirmed, sent, accepted, rejected
       notes TEXT,
       valid_until DATE, -- 견적 유효기간
       created_at TIMESTAMP DEFAULT NOW(),
       updated_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE quote_items (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       quote_id UUID REFERENCES quotes(id),
       category TEXT NOT NULL, -- 공정 카테고리
       sub_category TEXT,
       item_name TEXT NOT NULL,
       description TEXT,
       quantity DECIMAL NOT NULL,
       unit TEXT NOT NULL,
       unit_price BIGINT NOT NULL,
       total_price BIGINT NOT NULL,
       labor_ratio DECIMAL DEFAULT 0.3, -- 인건비 비율
       sort_order INTEGER DEFAULT 0,
       created_at TIMESTAMP DEFAULT NOW()
   );
   ```

3. **견적서 계산 로직**
   ```typescript
   function calculateQuote(analysis: FloorplanAnalysis, standardPricing: StandardPricing) {
       // 1. 각 공정별 수량 계산
       // 2. 표준 단가 매칭
       // 3. 금액 계산 (수량 × 단가)
       // 4. 인건비/자재비 분리
       // 5. 합계 산출
   }
   ```

---

### 5단계: 견적서 검토/수정 및 이메일 발송

**구현 필요**:

1. **견적서 편집 UI**
   - 관리자 페이지에 "견적서 관리" 탭 추가
   - 견적서 미리보기 및 편집 기능
   - 항목별 수량/단가 수정 기능
   - 할인 적용 기능

2. **견적서 PDF 생성**
   - `@react-pdf/renderer` 또는 Puppeteer 활용
   - 브랜드 로고 및 스타일 적용
   - 공정별 상세 내역 포함

3. **이메일 발송 API**
   - `/api/quotes/send` 엔드포인트 생성
   - Resend API 활용
   - PDF 첨부 또는 웹 링크 형태

4. **이메일 템플릿**
   - 견적서 요약 정보
   - 웹에서 상세 견적서 확인 링크
   - PDF 다운로드 링크

---

## 🗂️ 파일 구조

```
src/
├── app/
│   ├── admin/
│   │   └── page.tsx (도면 업로드 UI 추가)
│   └── api/
│       ├── floorplan/
│       │   ├── upload/route.ts
│       │   └── analyze/route.ts
│       └── quotes/
│           ├── route.ts (CRUD)
│           ├── generate/route.ts
│           └── send/route.ts
├── components/
│   ├── admin/
│   │   ├── FloorplanUpload.tsx
│   │   ├── FloorplanAnalysis.tsx
│   │   ├── QuoteEditor.tsx
│   │   └── QuotePreview.tsx
│   └── email/
│       └── QuoteEmailTemplate.tsx
├── lib/
│   ├── vision.ts (Google Vision API)
│   ├── floorplanAnalyzer.ts (도면 분석 로직)
│   ├── quoteCalculator.ts (견적 계산 로직)
│   └── pdfGenerator.ts (PDF 생성)
└── types/
    └── quote.ts (타입 정의)
```

---

## 🔧 필요한 환경 변수

```env
# Google Cloud Vision API
GOOGLE_CLOUD_VISION_API_KEY=your_api_key

# Gemini API (이미 설정됨)
GOOGLE_GEMINI_API_KEY=your_api_key

# Resend (이미 설정됨)
RESEND_API_KEY=your_api_key

# Supabase (이미 설정됨)
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

---

## 📅 구현 순서

1. **Phase 1**: 데이터베이스 스키마 생성 (floorplans, quotes, quote_items)
2. **Phase 2**: 도면 업로드 UI 및 API 구현
3. **Phase 3**: Google Vision + Gemini 도면 분석 구현
4. **Phase 4**: 견적서 자동 생성 로직 구현
5. **Phase 5**: 견적서 편집 UI 구현
6. **Phase 6**: PDF 생성 및 이메일 발송 구현

---

## 🚀 시작하기

Phase 1부터 순차적으로 구현을 시작합니다.
