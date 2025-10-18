# Codex Review Pipeline

자동화된 코드 리뷰 파이프라인으로, OpenAI Codex를 사용하여 git diff 기반 코드 리뷰를 수행합니다.

## 🚀 기능

- **Git Diff 기반 리뷰**: 변경된 파일만 리뷰하여 비용 최적화
- **표준화된 JSON 출력**: 일관된 리뷰 결과 형식
- **심각도별 분류**: info, minor, major, critical 레벨
- **품질 게이트**: critical 이슈 발견 시 커밋 차단
- **다양한 실행 모드**: staged, last commit, 특정 파일 리뷰

## 📋 요구사항

- Node.js 18+
- Git 저장소
- OpenAI API Key

## 🛠 설치

1. 의존성 설치:
```bash
npm install
```

2. 환경 변수 설정:
```bash
cp .env.example .env
# .env 파일에서 OPENAI_API_KEY를 실제 키로 변경
```

## 🎯 사용법

### 기본 명령어

```bash
# 스테이징된 변경사항 리뷰
npm run review:staged

# 마지막 커밋 리뷰
npm run review:last

# 특정 파일 리뷰
npm run review:file src/example.ts
```

### 출력 예시

```
Requesting Codex review…

Summary: Found several code quality issues that should be addressed.

[critical] Unhandled Promise Rejection  src/api.ts:45
  Promise rejection is not properly handled, which could cause application crashes.
  Suggestion: Add .catch() handler or use try-catch with async/await

[major] Missing Input Validation  src/validation.ts:12
  User input is not validated before processing.
  Suggestion: Add input sanitization and validation checks

[minor] Console.log in Production  src/debug.ts:3
  Console.log statements should be removed from production code.
  Suggestion: Use proper logging library or remove debug statements

Saved: .codex/review.json
```

## 🔧 Pre-commit 훅 설정

### 방법 1: Git 기본 훅

```bash
# .git/hooks/pre-commit 파일 생성
cat > .git/hooks/pre-commit << 'EOF'
#!/usr/bin/env bash
echo "[pre-commit] Running Codex review on staged changes..."
npm run review:staged
STATUS=$?
if [ $STATUS -ne 0 ]; then
  echo "Codex review failed or found critical issues. Aborting commit."
  exit $STATUS
fi
EOF

chmod +x .git/hooks/pre-commit
```

### 방법 2: Husky 사용

```bash
# Husky 설치 (이미 package.json에 포함됨)
npm install

# pre-commit 훅 설정
npx husky add .husky/pre-commit "npm run review:staged"
```

## 📊 출력 형식

리뷰 결과는 `.codex/review.json` 파일에 저장됩니다:

```json
{
  "summary": "리뷰 요약",
  "points": [
    {
      "file": "src/example.ts",
      "line": 42,
      "severity": "major",
      "title": "이슈 제목",
      "message": "상세 설명",
      "suggestion": "개선 제안 (선택사항)"
    }
  ]
}
```

## 🚨 품질 게이트

- **Critical 이슈**: 프로세스 종료 코드 2로 커밋 차단
- **기타 이슈**: 경고만 출력하고 커밋 허용

## 💡 베스트 프랙티스

### 비용 최적화
- 큰 diff는 파일 단위로 분할하여 리뷰
- 불필요한 파일 변경사항 제외

### 시스템 프롬프트 커스터마이징
`src/codexReview.ts`의 `SYSTEM_PROMPT`에 사내 코딩 규칙 추가:

```typescript
const SYSTEM_PROMPT = `
You are a senior code reviewer for [회사명].
Additional guidelines:
- Follow our ESLint configuration
- Enforce security best practices
- Check for performance issues
- Ensure proper error handling
...
`;
```

### 민감한 파일 필터링
보안상 민감한 파일은 리뷰에서 제외:

```bash
# .gitignore에 추가
.env
*.key
secrets/
```

## 🔍 문제 해결

### 일반적인 오류

1. **API 키 오류**: `.env` 파일의 `OPENAI_API_KEY` 확인
2. **Git 오류**: Git 저장소가 초기화되어 있는지 확인
3. **의존성 오류**: `npm install` 재실행

### 디버깅

```bash
# 상세 로그와 함께 실행
DEBUG=* npm run review:staged
```

## 🚀 향후 확장 계획

- **MCP 서버화**: Cursor/IDE에서 직접 호출 가능한 MCP 서버로 변환
- **병렬 처리**: 여러 파일 동시 리뷰
- **커스텀 규칙**: 프로젝트별 리뷰 규칙 설정
- **통계 대시보드**: 리뷰 히스토리 및 품질 지표

## 📝 라이선스

MIT License
