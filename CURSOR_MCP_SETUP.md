# Cursor IDE에서 MCP 서버 사용하기

## 🚀 설정 방법

### 1. **Cursor IDE 설정 파일 위치**

#### Windows:

```
%APPDATA%\Cursor\User\globalStorage\cursor.mcp\mcp_servers.json
```

#### macOS:

```
~/Library/Application Support/Cursor/User/globalStorage/cursor.mcp/mcp_servers.json
```

#### Linux:

```
~/.config/Cursor/User/globalStorage/cursor.mcp/mcp_servers.json
```

### 2. **MCP 서버 등록**

`mcp_servers.json` 파일에 다음 내용 추가:

```json
{
  "mcpServers": {
    "codex-reviewer": {
      "command": "node",
      "args": ["--loader", "ts-node/esm", "src/mcp-server.ts"],
      "cwd": "C:\\Users\\chungheonlee\\Desktop\\programming\\mcp-code-review-agent-test"
    }
  }
}
```

**중요**: `cwd` 경로를 실제 프로젝트 경로로 변경하세요!

### 3. **다른 프로젝트에서 사용하기**

#### 방법 A: 글로벌 설치

```bash
# 글로벌로 설치
npm install -g codex-review-pipeline

# 어디서든 사용
codex-reviewer review_diff --mode staged
```

#### 방법 B: 프로젝트별 설정

각 프로젝트의 `.cursor/mcp.json` 파일에 추가:

```json
{
  "mcpServers": {
    "codex-reviewer": {
      "command": "node",
      "args": [
        "--loader",
        "ts-node/esm",
        "C:\\path\\to\\codex-review-pipeline\\src\\mcp-server.ts"
      ],
      "cwd": "C:\\path\\to\\codex-review-pipeline"
    }
  }
}
```

## 🎯 사용법

### Cursor IDE에서 사용:

1. **스테이징된 변경사항 리뷰**:

   ```
   @codex-reviewer review_diff staged
   ```

2. **마지막 커밋 리뷰**:

   ```
   @codex-reviewer review_diff last
   ```

3. **특정 파일 리뷰**:

   ```
   @codex-reviewer review_diff file src/example.ts
   ```

4. **커스텀 프롬프트로 리뷰**:
   ```
   @codex-reviewer review_diff staged "Focus on security issues and performance"
   ```

## 🔧 고급 설정

### 환경 변수 설정:

```bash
# Windows
set CODEX_MODEL=gpt-4
set CODEX_TIMEOUT=120000

# Linux/Mac
export CODEX_MODEL=gpt-4
export CODEX_TIMEOUT=120000
```

### 커스텀 모델 사용:

```json
{
  "mcpServers": {
    "codex-reviewer": {
      "command": "node",
      "args": ["mcp-server.js"],
      "cwd": ".",
      "env": {
        "CODEX_MODEL": "gpt-4",
        "CODEX_TIMEOUT": "120000"
      }
    }
  }
}
```

## 🚨 문제 해결

### 1. **서버 연결 실패**

- Codex CLI가 설치되어 있는지 확인: `codex --version`
- 로그인 상태 확인: `codex login status`

### 2. **권한 오류**

- Node.js 실행 권한 확인
- 파일 경로가 올바른지 확인

### 3. **타임아웃 오류**

- `CODEX_TIMEOUT` 환경 변수 증가
- 네트워크 연결 확인

## 📊 출력 형식

리뷰 결과는 다음 JSON 형식으로 반환됩니다:

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
      "suggestion": "개선 제안"
    }
  ]
}
```

## 🎉 완료!

이제 Cursor IDE에서 직접 코드 리뷰를 받을 수 있습니다!
