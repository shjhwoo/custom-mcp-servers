import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { JiraClient } from "./jira-client.js";

const JIRA_BASE_URL = process.env.JIRA_BASE_URL ?? "";
const JIRA_EMAIL = process.env.JIRA_EMAIL ?? "";
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN ?? "";

function getClient(): JiraClient {
  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    throw new Error(
      "Missing Jira credentials. Set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN environment variables.",
    );
  }
  return new JiraClient({
    baseUrl: JIRA_BASE_URL,
    email: JIRA_EMAIL,
    apiToken: JIRA_API_TOKEN,
  });
}

const server = new McpServer({ name: "jira-mcp", version: "0.1.0" });

server.tool(
  "verify-connection",
  "Verify the Jira connection and return current authenticated user info",
  {},
  async () => {
    const user = await getClient().verifyConnection();
    return { content: [{ type: "text", text: JSON.stringify(user, null, 2) }] };
  },
);

server.tool(
  "search-epics",
  "Search Jira EPICs by keyword",
  {
    keyword: z.string().describe("Keyword to search in EPIC summaries"),
    projectKey: z
      .string()
      .optional()
      .describe('Optional project key to filter (e.g. "PROJ")'),
  },
  async ({ keyword, projectKey }) => {
    let jql = `issuetype = Epic AND summary ~ "${keyword}" ORDER BY created DESC`;
    if (projectKey) jql = `project = ${projectKey} AND ` + jql;
    const result = await getClient().searchIssues(jql);
    return {
      content: [{ type: "text", text: JSON.stringify(result.issues, null, 2) }],
    };
  },
);

server.tool(
  "create-epic",
  "Create a new Jira EPIC",
  {
    projectKey: z.string().describe('Jira project key (e.g. "PROJ")'),
    summary: z.string().describe("EPIC title/summary"),
    description: z.string().optional().describe("EPIC description"),
  },
  async ({ projectKey, summary, description }) => {
    const issue = await getClient().createIssue(
      projectKey,
      summary,
      "Epic",
      description,
    );
    return {
      content: [{ type: "text", text: JSON.stringify(issue, null, 2) }],
    };
  },
);

server.tool(
  "search-issues",
  "Search Jira issues by keyword",
  {
    keyword: z.string().describe("Keyword to search in issue summaries"),
    projectKey: z
      .string()
      .optional()
      .describe("Optional project key to filter"),
    status: z
      .string()
      .optional()
      .describe('Optional status filter (e.g. "In Progress", "To Do", "Done")'),
  },
  async ({ keyword, projectKey, status }) => {
    let jql = `issuetype != Epic AND summary ~ "${keyword}"`;
    if (projectKey) jql += ` AND project = ${projectKey}`;
    if (status) jql += ` AND status = "${status}"`;
    jql += " ORDER BY created DESC";
    const result = await getClient().searchIssues(jql);
    return {
      content: [{ type: "text", text: JSON.stringify(result.issues, null, 2) }],
    };
  },
);

server.tool(
  "create-issue",
  "Create a new Jira issue (Story, Task, Bug, etc.)",
  {
    projectKey: z.string().describe('Jira project key (e.g. "PROJ")'),
    summary: z.string().describe("Issue title/summary"),
    issueType: z
      .string()
      .describe("Issue type: Story, Task, Bug, Sub-task, etc."),
    description: z.string().optional().describe("Issue description"),
    epicKey: z
      .string()
      .optional()
      .describe('Parent EPIC key to assign this issue to (e.g. "PROJ-100")'),
  },
  async ({ projectKey, summary, issueType, description, epicKey }) => {
    const issue = await getClient().createIssue(
      projectKey,
      summary,
      issueType,
      description,
      epicKey,
    );
    return {
      content: [{ type: "text", text: JSON.stringify(issue, null, 2) }],
    };
  },
);

server.tool(
  "get-issue-transitions",
  "Get available status transitions for a Jira issue (use before calling update-issue-status)",
  {
    issueKey: z.string().describe('Jira issue key (e.g. "PROJ-123")'),
  },
  async ({ issueKey }) => {
    const transitions = await getClient().getTransitions(issueKey);
    return {
      content: [{ type: "text", text: JSON.stringify(transitions, null, 2) }],
    };
  },
);

server.tool(
  "update-issue-status",
  "Update the status of a Jira issue via a transition",
  {
    issueKey: z.string().describe('Jira issue key (e.g. "PROJ-123")'),
    transitionId: z
      .string()
      .describe("Transition ID — get available IDs from get-issue-transitions"),
  },
  async ({ issueKey, transitionId }) => {
    const result = await getClient().updateIssueStatus(issueKey, transitionId);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.tool(
  "delete-issue",
  "Delete a Jira issue by its key",
  {
    issueKey: z.string().describe('Jira issue key to delete (e.g. "PROJ-123")'),
  },
  async ({ issueKey }) => {
    const result = await getClient().deleteIssue(issueKey);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.tool(
  "assign-issue-to-epic",
  "Assign a Jira issue to a parent EPIC",
  {
    issueKey: z.string().describe('Issue key to assign (e.g. "PROJ-456")'),
    epicKey: z.string().describe('Target EPIC key (e.g. "PROJ-100")'),
  },
  async ({ issueKey, epicKey }) => {
    const result = await getClient().assignToEpic(issueKey, epicKey);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.tool(
  "assign-issue-to-myself",
  "Assign a Jira issue to the currently authenticated user (yourself)",
  {
    issueKey: z.string().describe('Jira issue key (e.g. "PROJ-123")'),
  },
  async ({ issueKey }) => {
    const result = await getClient().assignToMyself(issueKey);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.tool(
  "add-comment",
  "Add a comment to a Jira issue",
  {
    issueKey: z.string().describe('Jira issue key (e.g. "PROJ-123")'),
    comment: z.string().describe("Comment text to add"),
  },
  async ({ issueKey, comment }) => {
    const result = await getClient().addComment(issueKey, comment);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
