import { z } from "zod";
import type { JiraClient } from "../jiraClient.js";

export const transitionIssueSchema = {
  issueKey: z.string().describe("이슈 키 (예: ABC-123)"),
  targetStatus: z
    .string()
    .describe(
      "전환할 상태 이름 (예: '진행 중', '완료', '해야 할 일', 'In Progress', 'Done')"
    ),
};

interface Transition {
  id: string;
  name: string;
  to?: { name: string };
}

function normalize(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

async function findTransitionId(
  client: JiraClient,
  issueKey: string,
  targetStatus: string
): Promise<{ id: string; toName: string }> {
  const res = await client.request<{ transitions: Transition[] }>(
    "GET",
    `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`
  );
  const transitions = res.transitions ?? [];

  const targetNorm = normalize(targetStatus);
  const match = transitions.find(
    (t) =>
      normalize(t.name) === targetNorm ||
      normalize(t.to?.name ?? "") === targetNorm
  );

  if (!match) {
    const available = transitions
      .map((t) => `"${t.name}" (→ ${t.to?.name ?? "?"})`)
      .join(", ");
    throw new Error(
      `"${targetStatus}" 상태로 전환할 수 없습니다. 가능한 전환: ${available}`
    );
  }
  return { id: match.id, toName: match.to?.name ?? match.name };
}

export async function transitionIssue(
  client: JiraClient,
  args: { issueKey: string; targetStatus: string }
) {
  const { id, toName } = await findTransitionId(
    client,
    args.issueKey,
    args.targetStatus
  );
  await client.request(
    "POST",
    `/rest/api/3/issue/${encodeURIComponent(args.issueKey)}/transitions`,
    { transition: { id } }
  );
  return { ok: true, issueKey: args.issueKey, transitionedTo: toName };
}
