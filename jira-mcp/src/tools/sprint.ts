import { z } from "zod";
import type { JiraClient } from "../jiraClient.js";

export const getSprintStatusSchema = {
  boardId: z
    .number()
    .int()
    .optional()
    .describe("보드 ID. 생략 시 프로젝트의 첫 scrum 보드를 자동 탐색"),
  projectKey: z
    .string()
    .optional()
    .describe("프로젝트 키 override. 생략 시 설정값 사용"),
};

interface Board {
  id: number;
  name: string;
  type: string;
}

interface Sprint {
  id: number;
  name: string;
  state: string;
  startDate?: string;
  endDate?: string;
  goal?: string;
}

async function findScrumBoardId(
  client: JiraClient,
  projectKey: string
): Promise<number> {
  const res = await client.request<{ values: Board[] }>(
    "GET",
    `/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(projectKey)}&type=scrum`
  );
  const board = res.values?.[0];
  if (!board) {
    throw new Error(`No scrum board found for project ${projectKey}`);
  }
  return board.id;
}

export async function getSprintStatus(
  client: JiraClient,
  args: { boardId?: number; projectKey?: string }
) {
  const projectKey = args.projectKey ?? client.projectKey;
  const boardId = args.boardId ?? (await findScrumBoardId(client, projectKey));

  const sprintsRes = await client.request<{ values: Sprint[] }>(
    "GET",
    `/rest/agile/1.0/board/${boardId}/sprint?state=active`
  );
  const sprint = sprintsRes.values?.[0];
  if (!sprint) {
    return {
      boardId,
      sprint: null,
      message: "No active sprint.",
    };
  }

  const issuesRes = await client.request<{
    issues: Array<{
      key: string;
      fields: {
        summary: string;
        status: { name: string; statusCategory?: { key: string } };
        assignee?: { displayName?: string; accountId?: string } | null;
        issuetype?: { name: string };
      };
    }>;
  }>(
    "GET",
    `/rest/agile/1.0/sprint/${sprint.id}/issue?fields=summary,status,assignee,issuetype&maxResults=200`
  );

  const byCategory: Record<string, number> = { todo: 0, indeterminate: 0, done: 0 };
  const byStatus: Record<string, number> = {};
  const byAssignee: Record<string, number> = {};

  for (const issue of issuesRes.issues ?? []) {
    const cat = issue.fields.status?.statusCategory?.key ?? "unknown";
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    const statusName = issue.fields.status?.name ?? "Unknown";
    byStatus[statusName] = (byStatus[statusName] ?? 0) + 1;
    const assignee = issue.fields.assignee?.displayName ?? "Unassigned";
    byAssignee[assignee] = (byAssignee[assignee] ?? 0) + 1;
  }

  return {
    boardId,
    sprint: {
      id: sprint.id,
      name: sprint.name,
      state: sprint.state,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      goal: sprint.goal,
    },
    totals: {
      total: issuesRes.issues?.length ?? 0,
      todo: byCategory.todo ?? 0,
      inProgress: byCategory.indeterminate ?? 0,
      done: byCategory.done ?? 0,
    },
    byStatus,
    byAssignee,
    issues: (issuesRes.issues ?? []).map((i) => ({
      key: i.key,
      summary: i.fields.summary,
      status: i.fields.status?.name,
      assignee: i.fields.assignee?.displayName ?? null,
      issueType: i.fields.issuetype?.name,
    })),
  };
}
