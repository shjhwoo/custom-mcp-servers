import type { JiraConfig } from "./config.js";

export class JiraError extends Error {
  constructor(public status: number, public body: string, message: string) {
    super(message);
    this.name = "JiraError";
  }
}

export class JiraClient {
  private authHeader: string;

  constructor(private cfg: JiraConfig) {
    const token = Buffer.from(`${cfg.email}:${cfg.apiToken}`).toString("base64");
    this.authHeader = `Basic ${token}`;
  }

  get projectKey(): string {
    return this.cfg.projectKey;
  }

  get myAccountId(): string {
    return this.cfg.myAccountId;
  }

  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.cfg.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new JiraError(
        res.status,
        text,
        `Jira API ${method} ${path} failed: ${res.status} ${res.statusText}`
      );
    }
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }
}
