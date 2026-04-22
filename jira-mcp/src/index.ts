#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { JiraClient, JiraError } from "./jiraClient.js";
import {
  createIssue,
  createIssueSchema,
  deleteIssue,
  deleteIssueSchema,
  getChildIssues,
  getChildIssuesSchema,
  getIssue,
  getIssueSchema,
  listIssues,
  listIssuesSchema,
  updateIssue,
  updateIssueSchema,
} from "./tools/issues.js";
import { getSprintStatus, getSprintStatusSchema } from "./tools/sprint.js";
import { assignIssue, assignIssueSchema } from "./tools/assignIssue.js";

function toTextContent(value: unknown) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: "text" as const, text }] };
}

function toError(err: unknown) {
  const message =
    err instanceof JiraError
      ? `${err.message}\n${err.body}`
      : err instanceof Error
      ? err.message
      : String(err);
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

async function main() {
  const cfg = loadConfig();
  const client = new JiraClient(cfg);

  const server = new McpServer({
    name: "jira-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "create_issue",
    {
      title: "이슈 생성",
      description:
        "프로젝트 키, 타입, 제목, 설명, 담당자 등으로 Jira 이슈를 생성합니다.",
      inputSchema: createIssueSchema,
    },
    async (args) => {
      try {
        return toTextContent(await createIssue(client, args));
      } catch (err) {
        return toError(err);
      }
    }
  );

  server.registerTool(
    "update_issue",
    {
      title: "이슈 업데이트",
      description: "이슈 필드(제목, 설명, 담당자, 우선순위, 라벨)를 업데이트합니다.",
      inputSchema: updateIssueSchema,
    },
    async (args) => {
      try {
        return toTextContent(await updateIssue(client, args));
      } catch (err) {
        return toError(err);
      }
    }
  );

  server.registerTool(
    "list_issues",
    {
      title: "이슈 목록 조회",
      description:
        "JQL 기반 이슈 조회. 생략 시 현재 프로젝트의 최근 이슈를 반환합니다.",
      inputSchema: listIssuesSchema,
    },
    async (args) => {
      try {
        return toTextContent(await listIssues(client, args));
      } catch (err) {
        return toError(err);
      }
    }
  );

  server.registerTool(
    "get_sprint_status",
    {
      title: "스프린트 진행 상황 조회",
      description:
        "현재 활성 스프린트의 이슈 현황과 상태별/담당자별 집계를 반환합니다.",
      inputSchema: getSprintStatusSchema,
    },
    async (args) => {
      try {
        return toTextContent(await getSprintStatus(client, args));
      } catch (err) {
        return toError(err);
      }
    }
  );

  server.registerTool(
    "delete_issue",
    {
      title: "이슈 삭제",
      description: "이슈를 삭제합니다. deleteSubtasks=true 설정 시 하위작업도 함께 삭제됩니다.",
      inputSchema: deleteIssueSchema,
    },
    async (args) => {
      try {
        return toTextContent(await deleteIssue(client, args));
      } catch (err) {
        return toError(err);
      }
    }
  );

  server.registerTool(
    "get_issue",
    {
      title: "이슈 상세 조회",
      description: "이슈 키로 단일 이슈의 상세 정보를 조회합니다.",
      inputSchema: getIssueSchema,
    },
    async (args) => {
      try {
        return toTextContent(await getIssue(client, args));
      } catch (err) {
        return toError(err);
      }
    }
  );

  server.registerTool(
    "get_child_issues",
    {
      title: "하위 이슈 목록 조회",
      description: "상위 이슈 키로 하위 이슈(child issues) 목록을 조회합니다.",
      inputSchema: getChildIssuesSchema,
    },
    async (args) => {
      try {
        return toTextContent(await getChildIssues(client, args));
      } catch (err) {
        return toError(err);
      }
    }
  );

  server.registerTool(
    "assign_issue",
    {
      title: "이슈 자동 할당",
      description:
        "이슈를 본인(JIRA_MY_ACCOUNT_ID)에게 할당하고 상태를 '진행 중'으로 전환합니다.",
      inputSchema: assignIssueSchema,
    },
    async (args) => {
      try {
        return toTextContent(await assignIssue(client, args));
      } catch (err) {
        return toError(err);
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("[jira-mcp] fatal:", err);
  process.exit(1);
});
