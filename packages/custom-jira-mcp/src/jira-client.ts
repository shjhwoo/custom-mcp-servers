import axios, { AxiosInstance } from "axios";

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export class JiraClient {
  private client: AxiosInstance;

  constructor(config: JiraConfig) {
    const token = Buffer.from(`${config.email}:${config.apiToken}`).toString(
      "base64",
    );
    this.client = axios.create({
      baseURL: `${config.baseUrl}/rest/api/3`,
      headers: {
        Authorization: `Basic ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  }

  async verifyConnection() {
    const res = await this.client.get("/myself");
    return res.data;
  }

  async searchIssues(jql: string, maxResults = 20) {
    const res = await this.client.get("/search", {
      params: {
        jql,
        maxResults,
        fields: "summary,status,issuetype,priority,assignee,parent",
      },
    });
    return res.data;
  }

  async createIssue(
    projectKey: string,
    summary: string,
    issueType: string,
    description?: string,
    parentKey?: string,
  ) {
    const body: Record<string, unknown> = {
      fields: {
        project: { key: projectKey },
        summary,
        issuetype: { name: issueType },
      } as Record<string, unknown>,
    };

    const fields = body.fields as Record<string, unknown>;

    if (description) {
      fields.description = {
        type: "doc",
        version: 1,
        content: [
          { type: "paragraph", content: [{ type: "text", text: description }] },
        ],
      };
    }
    if (parentKey) {
      fields.parent = { key: parentKey };
    }

    const res = await this.client.post("/issue", body);
    return res.data;
  }

  async deleteIssue(issueKey: string) {
    await this.client.delete(`/issue/${issueKey}`);
    return { deleted: issueKey };
  }

  async getTransitions(issueKey: string) {
    const res = await this.client.get(`/issue/${issueKey}/transitions`);
    return res.data.transitions;
  }

  async updateIssueStatus(issueKey: string, transitionId: string) {
    await this.client.post(`/issue/${issueKey}/transitions`, {
      transition: { id: transitionId },
    });
    return { updated: issueKey, transitionId };
  }

  async assignToEpic(issueKey: string, epicKey: string) {
    await this.client.put(`/issue/${issueKey}`, {
      fields: { parent: { key: epicKey } },
    });
    return { assigned: issueKey, epic: epicKey };
  }

  async assignToMyself(issueKey: string) {
    const me = await this.client.get("/myself");
    await this.client.put(`/issue/${issueKey}/assignee`, {
      accountId: me.data.accountId,
    });
    return { assigned: issueKey, assignee: me.data.displayName };
  }

  async addComment(issueKey: string, comment: string) {
    const res = await this.client.post(`/issue/${issueKey}/comment`, {
      body: {
        type: "doc",
        version: 1,
        content: [
          { type: "paragraph", content: [{ type: "text", text: comment }] },
        ],
      },
    });
    return res.data;
  }
}
