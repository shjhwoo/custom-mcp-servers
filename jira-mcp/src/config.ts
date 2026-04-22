import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  myAccountId: string;
  projectKey: string;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function readJsonIfExists(path: string): any | null {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err: any) {
    if (err?.code === "ENOENT") return null;
    throw new Error(`Failed to read ${path}: ${err.message}`);
  }
}

function loadProjectKey(cwd: string): string {
  const envKey = process.env.JIRA_PROJECT_KEY;
  if (envKey) return envKey;

  const claudeSettings = readJsonIfExists(resolve(cwd, ".claude/settings.json"));
  const key1 = claudeSettings?.jira?.projectKey;
  if (typeof key1 === "string" && key1.length > 0) return key1;

  const fallback = readJsonIfExists(resolve(cwd, ".jira-mcp.json"));
  const key2 = fallback?.projectKey;
  if (typeof key2 === "string" && key2.length > 0) return key2;

  throw new Error(
    "projectKey not found. Set it in .claude/settings.json under `jira.projectKey`, " +
      "or in .jira-mcp.json, or via JIRA_PROJECT_KEY env."
  );
}

export function loadConfig(cwd: string = process.cwd()): JiraConfig {
  return {
    baseUrl: requireEnv("JIRA_BASE_URL").replace(/\/$/, ""),
    email: requireEnv("JIRA_EMAIL"),
    apiToken: requireEnv("JIRA_API_TOKEN"),
    myAccountId: requireEnv("JIRA_MY_ACCOUNT_ID"),
    projectKey: loadProjectKey(cwd),
  };
}
