# TNH Custom MCP Servers

Claude Code에서 Jira를 직접 조작할 수 있는 MCP(Model Context Protocol) 서버입니다.

## 제공 기능 (Tools)

| Tool | 설명 |
|------|------|
| `verify-connection` | Jira 연결 상태 및 인증 사용자 확인 |
| `search-epics` | 키워드로 에픽 검색 |
| `create-epic` | 새 에픽 생성 |
| `search-issues` | 키워드/상태로 이슈 검색 |
| `create-issue` | 새 이슈 생성 (Story, Task, Bug 등) |
| `get-issue-transitions` | 이슈의 전환 가능한 상태 목록 조회 |
| `update-issue-status` | 이슈 상태 변경 |
| `assign-issue-to-epic` | 이슈를 에픽에 연결 |
| `assign-issue-to-myself` | 이슈를 나 자신에게 할당 |
| `add-comment` | 이슈에 댓글 추가 |
| `delete-issue` | 이슈 삭제 |

## 설치 방법

### 1. 사전 준비

- [Node.js](https://nodejs.org/) 18 이상
- Jira API 토큰 발급
  1. [Atlassian 계정 설정](https://id.atlassian.com/manage-profile/security/api-tokens) 접속
  2. **Create API token** 클릭 후 토큰 복사

### 2. 저장소 클론 및 빌드

```bash
git clone git@github.com:shjhwoo/tnh-custom-mcp-servers.git
cd tnh-custom-mcp-servers
npm install
npm run build
```

### 3. Claude Code에 MCP 서버 등록

프로젝트 루트에 `.mcp.json` 파일을 생성합니다.

```json
{
  "mcpServers": {
    "jira": {
      "type": "stdio",
      "command": "node",
      "args": ["/절대경로/tnh-custom-mcp-servers/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://your-company.atlassian.net",
        "JIRA_EMAIL": "your-email@company.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

> **주의:** `.mcp.json`은 API 토큰이 포함되므로 절대 Git에 커밋하지 마세요. (`.gitignore`에 이미 포함됨)

### 4. 연결 확인

Claude Code에서 다음과 같이 입력해 연결을 확인합니다.

```
Jira 연결 확인해줘
```

정상 연결 시 현재 인증된 사용자 정보가 반환됩니다.

## 사용 예시

```
TNH 프로젝트에서 "로그인" 키워드로 에픽 검색해줘

PROJ 프로젝트에 "결제 모듈 개선" 에픽 만들어줘

PROJ-123 이슈 상태를 In Progress로 변경해줘

PROJ-456 이슈를 PROJ-100 에픽에 연결해줘
```

## 환경변수 설명

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `JIRA_BASE_URL` | Jira 인스턴스 URL | `https://your-company.atlassian.net` |
| `JIRA_EMAIL` | Atlassian 계정 이메일 | `dev@company.com` |
| `JIRA_API_TOKEN` | Atlassian API 토큰 | `ATATxxxxxxxxxxxxxxxx` |
