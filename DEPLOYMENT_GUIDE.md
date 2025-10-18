# MCP 서버 배포 가이드

## 🚀 **배포 방법들**

### **방법 1: NPM 글로벌 설치 (권장)**

#### **1. 패키지 발행**
```bash
# 패키지 빌드
npm run build

# NPM에 발행 (선택사항)
npm publish
```

#### **2. 사용자 설치**
```bash
# 글로벌 설치
npm install -g codex-review-pipeline

# 또는 특정 버전
npm install -g codex-review-pipeline@1.0.0
```

#### **3. Cursor 설정**
```json
{
  "mcpServers": {
    "codex-reviewer": {
      "command": "codex-reviewer-mcp"
    }
  }
}
```

### **방법 2: 로컬 프로젝트 설치**

#### **1. 프로젝트에 설치**
```bash
# 프로젝트 루트에서
npm install codex-review-pipeline
```

#### **2. Cursor 설정**
```json
{
  "mcpServers": {
    "codex-reviewer": {
      "command": "npx",
      "args": ["codex-reviewer-mcp"],
      "cwd": "."
    }
  }
}
```

### **방법 3: 직접 복사**

#### **1. 파일 복사**
```bash
# 프로젝트에 복사
cp -r codex-review-pipeline/src ./mcp-servers/
cp codex-review-pipeline/package.json ./mcp-servers/
```

#### **2. Cursor 설정**
```json
{
  "mcpServers": {
    "codex-reviewer": {
      "command": "node",
      "args": ["--loader", "ts-node/esm", "mcp-servers/src/mcp-server.ts"],
      "cwd": "."
    }
  }
}
```

### **방법 4: Docker 컨테이너**

#### **1. Dockerfile 생성**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install -g codex-review-pipeline
CMD ["codex-reviewer-mcp"]
```

#### **2. Cursor 설정**
```json
{
  "mcpServers": {
    "codex-reviewer": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "codex-reviewer"]
    }
  }
}
```

## 📦 **패키지 구성**

### **필수 파일들**
```
codex-review-pipeline/
├── dist/
│   ├── mcp-server.js      # 실행 파일
│   ├── codexReview.js     # 리뷰 로직
│   ├── getDiff.js         # Git diff 추출
│   └── types.js           # 타입 정의
├── package.json           # 패키지 설정
└── README.md             # 사용법
```

### **package.json 설정**
```json
{
  "name": "codex-review-pipeline",
  "version": "1.0.0",
  "bin": {
    "codex-reviewer-mcp": "dist/mcp-server.js"
  },
  "files": ["dist/", "README.md"],
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "zod": "^3.22.4"
  }
}
```

## 🔧 **사용자 설정 가이드**

### **최소 설정**
```json
{
  "mcpServers": {
    "codex-reviewer": {
      "command": "codex-reviewer-mcp"
    }
  }
}
```

### **고급 설정**
```json
{
  "mcpServers": {
    "codex-reviewer": {
      "command": "codex-reviewer-mcp",
      "env": {
        "CODEX_MODEL": "gpt-4",
        "CODEX_TIMEOUT": "120000"
      }
    }
  }
}
```

## 🎯 **권장 배포 전략**

### **개인 사용**
- 방법 1: NPM 글로벌 설치
- 가장 간단하고 관리하기 쉬움

### **팀 사용**
- 방법 2: 프로젝트별 설치
- 버전 관리가 용이함

### **엔터프라이즈**
- 방법 4: Docker 컨테이너
- 보안과 격리가 중요할 때

## 📋 **체크리스트**

### **배포 전 확인사항**
- [ ] `npm run build` 성공
- [ ] `codex-reviewer-mcp` 명령어 작동
- [ ] Cursor에서 `@codex-reviewer` 사용 가능
- [ ] README.md 업데이트
- [ ] 버전 태그 생성

### **사용자 가이드**
- [ ] 설치 방법 명시
- [ ] 설정 예제 제공
- [ ] 문제 해결 가이드
- [ ] 사용 예제 포함
