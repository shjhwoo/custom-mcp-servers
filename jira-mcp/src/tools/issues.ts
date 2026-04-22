import { z } from "zod";
import type { JiraClient } from "../jiraClient.js";

function toADF(text: string) {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

export const createIssueSchema = {
  summary: z.string().describe("이슈 제목"),
  issueType: z
    .string()
    .default("Task")
    .describe("이슈 타입 이름 (예: Task, Bug, Story, Epic)"),
  description: z.string().optional().describe("이슈 설명 (평문)"),
  assigneeAccountId: z
    .string()
    .optional()
    .describe("담당자 accountId. 생략 시 미지정"),
  priority: z
    .string()
    .optional()
    .describe("우선순위 이름 (예: High, Medium, Low)"),
  projectKey: z
    .string()
    .optional()
    .describe("프로젝트 키 override. 생략 시 설정값 사용"),
  labels: z.array(z.string()).optional().describe("라벨 목록"),
};

export async function createIssue(
  client: JiraClient,
  args: {
    summary: string;
    issueType?: string;
    description?: string;
    assigneeAccountId?: string;
    priority?: string;
    projectKey?: string;
    labels?: string[];
  }
) {
  const fields: Record<string, unknown> = {
    project: { key: args.projectKey ?? client.projectKey },
    summary: args.summary,
    issuetype: { name: args.issueType ?? "Task" },
  };
  if (args.description) fields.description = toADF(args.description);
  if (args.assigneeAccountId)
    fields.assignee = { accountId: args.assigneeAccountId };
  if (args.priority) fields.priority = { name: args.priority };
  if (args.labels && args.labels.length > 0) fields.labels = args.labels;

  return client.request("POST", "/rest/api/3/issue", { fields });
}

export const updateIssueSchema = {
  issueKey: z.string().describe("이슈 키 (예: ABC-123)"),
  summary: z.string().optional(),
  description: z.string().optional(),
  assigneeAccountId: z
    .string()
    .nullable()
    .optional()
    .describe("담당자 accountId. null 전달 시 담당자 해제"),
  priority: z.string().optional(),
  labels: z.array(z.string()).optional(),
};

export async function updateIssue(
  client: JiraClient,
  args: {
    issueKey: string;
    summary?: string;
    description?: string;
    assigneeAccountId?: string | null;
    priority?: string;
    labels?: string[];
  }
) {
  const fields: Record<string, unknown> = {};
  if (args.summary !== undefined) fields.summary = args.summary;
  if (args.description !== undefined)
    fields.description = toADF(args.description);
  if (args.assigneeAccountId !== undefined)
    fields.assignee =
      args.assigneeAccountId === null
        ? null
        : { accountId: args.assigneeAccountId };
  if (args.priority !== undefined) fields.priority = { name: args.priority };
  if (args.labels !== undefined) fields.labels = args.labels;

  if (Object.keys(fields).length === 0) {
    throw new Error("No fields to update.");
  }

  await client.request(
    "PUT",
    `/rest/api/3/issue/${encodeURIComponent(args.issueKey)}`,
    { fields }
  );
  return { ok: true, issueKey: args.issueKey, updatedFields: Object.keys(fields) };
}

export const deleteIssueSchema = {
  issueKey: z.string().describe("이슈 키 (예: ABC-123)"),
  deleteSubtasks: z
    .boolean()
    .default(false)
    .describe("true면 하위작업도 함께 삭제"),
};

export async function deleteIssue(
  client: JiraClient,
  args: { issueKey: string; deleteSubtasks?: boolean }
) {
  const qs = args.deleteSubtasks ? "?deleteSubtasks=true" : "";
  await client.request(
    "DELETE",
    `/rest/api/3/issue/${encodeURIComponent(args.issueKey)}${qs}`
  );
  return { ok: true, deleted: args.issueKey };
}

export const listIssuesSchema = {
  jql: z
    .string()
    .optional()
    .describe("JQL 쿼리. 생략 시 프로젝트의 최근 이슈 조회"),
  fields: z
    .array(z.string())
    .optional()
    .describe("반환 필드 목록 (기본: summary,status,assignee,priority,issuetype)"),
  maxResults: z.number().int().min(1).max(100).default(25),
  nextPageToken: z
    .string()
    .optional()
    .describe("이전 응답의 nextPageToken (페이지네이션)"),
};

export async function listIssues(
  client: JiraClient,
  args: {
    jql?: string;
    fields?: string[];
    maxResults?: number;
    nextPageToken?: string;
  }
) {
  const jql = args.jql ?? `project = ${client.projectKey} ORDER BY updated DESC`;
  const fields =
    args.fields && args.fields.length > 0
      ? args.fields
      : ["summary", "status", "assignee", "priority", "issuetype"];

  return client.request("POST", "/rest/api/3/search/jql", {
    jql,
    fields,
    maxResults: args.maxResults ?? 25,
    nextPageToken: args.nextPageToken,
  });
}
