# jira-mcp

Claude Code에서 사용할 수 있는 커스텀 Jira MCP 서버. Atlassian Cloud Jira의 이슈/스프린트를 조작하는 5개 도구를 제공합니다.

## 제공 툴

| 툴 이름 | 설명 |
| --- | --- |
| `create_issue` | 프로젝트 키·타입·제목·설명·담당자 등으로 이슈 생성 |
| `update_issue` | 이슈의 summary, description, assignee, priority, labels 업데이트 |
| `list_issues` | JQL 기반 이슈 조회 (생략 시 현재 프로젝트의 최근 이슈) |
| `get_sprint_status` | 활성 스프린트의 이슈 현황 및 상태·담당자별 집계 |
| `assign_issue` | 이슈를 본인에게 할당하고 상태를 '진행 중'으로 전환 |
| `delete_issue` | 이슈 삭제 (옵션: 하위작업 포함) |

## 설치

```bash
cd jira-mcp
npm install
npm run build
```

빌드 후 `jira-mcp/dist/index.js`가 엔트리포인트가 됩니다.

## 설정

### 1) 환경변수 — 전역 (개인 로컬)

Atlassian 계정 기준 값이라 프로젝트가 몇 개든 하나로 고정됩니다. **절대 레포에 커밋하지 마세요.**

```
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=your@email.com
JIRA_API_TOKEN=your_token
JIRA_MY_ACCOUNT_ID=your_account_id
```

#### API 토큰 발급
Atlassian 계정 설정 → Security → API tokens → Create API token.

#### 본인 accountId 확인
```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/myself" | jq .accountId
```

### 2) 프로젝트별 설정 — `.claude/settings.json`

레포 루트의 `.claude/settings.json`에 `jira.projectKey`를 기재합니다. 팀 공유 가능한 값이라 커밋해도 무방합니다.

```json
{
  "jira": {
    "projectKey": "ABC"
  }
}
```

폴백 순서: `JIRA_PROJECT_KEY` env → `.claude/settings.json` → `.jira-mcp.json`.

#### 프로젝트 키 확인
```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/project/search" | jq '.values[] | {key, name}'
```

### 3) Claude Code에 등록 — `.mcp.json`

레포 루트에 `.mcp.json`을 생성합니다. 환경변수를 여기에 직접 넣거나 셸 env에서 주입하면 됩니다.

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["<ABSOLUTE_PATH>/jira-mcp/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://yourcompany.atlassian.net",
        "JIRA_EMAIL": "your@email.com",
        "JIRA_API_TOKEN": "your_token",
        "JIRA_MY_ACCOUNT_ID": "your_account_id"
      }
    }
  }
}
```

Claude Code를 재시작하면 `mcp__jira__create_issue` 등의 이름으로 툴이 노출됩니다.

## 사용 예시

Claude Code 대화에서 자연어로 호출합니다.

- "SCRUM 프로젝트에 '로그인 버그 수정'이라는 Task 이슈 만들어줘" → `create_issue`
- "내가 담당자인 진행 중인 이슈만 보여줘" → `list_issues` (jql: `assignee = currentUser() AND statusCategory = "In Progress"`)
- "SCRUM-7 이슈 나한테 할당하고 진행 중으로 바꿔줘" → `assign_issue`
- "이번 스프린트 진행 상황 요약해줘" → `get_sprint_status`
- "SCRUM-7 제목을 '로그인 OAuth 버그'로 바꾸고 라벨 auth 추가해줘" → `update_issue`
- "SCRUM-7 삭제해줘" → `delete_issue`

## 개발

```bash
npm run dev      # tsc --watch
npm run build    # 한 번 빌드
npm start        # node dist/index.js (stdio MCP 서버)
```

## 구조

```
jira-mcp/
├── src/
│   ├── index.ts           # MCP 서버 엔트리
│   ├── config.ts          # 환경변수 + .claude/settings.json 로드
│   ├── jiraClient.ts      # Atlassian REST 래퍼 (Basic auth)
│   └── tools/
│       ├── issues.ts      # create/update/list/delete
│       ├── sprint.ts      # get_sprint_status
│       └── assignIssue.ts # 본인 할당 + 진행 중 전환
├── .env.example
├── package.json
└── tsconfig.json
```
