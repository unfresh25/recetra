import "server-only";

/**
 * Wakes the GitHub Actions import worker. No-op when no token is configured
 * (the worker also runs on a daily schedule as a fallback).
 */
export async function dispatchImportWorker(): Promise<void> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY ?? "unfresh25/recetra";
  if (!token) return;
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/import-worker.yml/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ ref: "main" }),
  });
  if (!res.ok) console.error("worker dispatch failed", res.status, await res.text());
}
