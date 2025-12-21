---
description: 백업 프로세스 - lint 검사, 빌드 테스트 후 커밋 및 푸시
---

# 백업 프로세스

이 워크플로우는 코드 변경사항을 안전하게 백업(커밋 & 푸시)합니다.
**배포 전 lint와 빌드 체크를 수행하여 배포 실패를 방지합니다.**

## 단계

### 1. ESLint 검사 (자동 수정 포함)
// turbo
```bash
npm run lint -- --fix
```

### 2. TypeScript 타입 검사
// turbo
```bash
npx tsc --noEmit
```

### 3. 프로덕션 빌드 테스트
// turbo
```bash
npm run build
```

### 4. 에러 확인
- 위 단계에서 **에러가 발생하면** 수정 후 다시 1번부터 진행
- **warning만 있으면** 진행 가능 (배포에 영향 없음)

### 5. 변경사항 스테이징
// turbo
```bash
git add -A
```

### 6. 변경사항 확인
// turbo
```bash
git status --short
```

### 7. 커밋 메시지 작성
사용자에게 커밋 메시지를 요청하거나, 변경 내용을 기반으로 생성:
- `feat:` - 새로운 기능
- `fix:` - 버그 수정
- `refactor:` - 리팩토링
- `style:` - 스타일 변경
- `docs:` - 문서 수정
- `chore:` - 기타 작업

### 8. 커밋
```bash
git commit -m "커밋 메시지"
```

### 9. 푸시
```bash
git push origin main
```

### 10. 배포 확인
- Vercel Dashboard에서 배포 상태 확인 알림
- 배포 URL: https://vercel.com/dashboard

---

## 주의사항
- **에러가 0개**여야 푸시 진행
- warning은 허용되지만, 가능하면 수정 권장
- 푸시 후 Vercel이 자동으로 배포 시작
