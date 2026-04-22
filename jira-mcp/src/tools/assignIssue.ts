import { z } from "zod";
import type { JiraClient } from "../jiraClient.js";

export const assignIssueSchema = {
  issueKey: z.string().describe("이슈 키 (예: ABC-123)"),
  targetStatus: z
    .string()
    .default("진행 중")
    .describe("전환할 상태 이름. 기본 '진행 중' (영문 환경은 'In Progress' 권장)"),
};

interface Transition {
  id: string;
  name: string;
  to?: { name: string };
}

function normalize(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

const IN_PROGRESS_ALIASES = [
  "진행중",
  "진행 중",
  "inprogress",
  "in progress",
].map(normalize);

function matchesInProgress(name: string): boolean {
  const n = normalize(name);
  return IN_PROGRESS_ALIASES.includes(n);
}

async function findTransitionId(
  client: JiraClient,
  issueKey: string,
  targetStatus: string
): Promise<string> {
  const res = await client.request<{ transitions: Transition[] }>(
    "GET",
    `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`
  );
  const transitions = res.transitions ?? [];

  const targetNorm = normalize(targetStatus);
  let match = transitions.find(
    (t) => normalize(t.name) === targetNorm || normalize(t.to?.name ?? "") === targetNorm
  );

  if (!match && matchesInProgress(targetStatus)) {
    match = transitions.find(
      (t) => matchesInProgress(t.name) || matchesInProgress(t.to?.name ?? "")
    );
  }

  if (!match) {
    const available = transitions
      .map((t) => `${t.name} -> ${t.to?.name ?? "?"}`)
      .join(", ");
    throw new Error(
      `No transition matching "${targetStatus}" for ${issueKey}. Available: ${available}`
    );
  }
  return match.id;
}

export async function assignIssue(
  client: JiraClient,
  args: { issueKey: string; targetStatus?: string }
) {
  const issueKey = args.issueKey;
  const targetStatus = args.targetStatus ?? "진행 중";

  await client.request(
    "PUT",
    `/rest/api/3/issue/${encodeURIComponent(issueKey)}/assignee`,
    { accountId: client.myAccountId }
  );

  const transitionId = await findTransitionId(client, issueKey, targetStatus);
  await client.request(
    "POST",
    `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`,
    { transition: { id: transitionId } }
  );

  return {
    ok: true,
    issueKey,
    assigneeAccountId: client.myAccountId,
    transitionedTo: targetStatus,
  };
}
