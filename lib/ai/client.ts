import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Single place that knows about the LLM provider (design doc §2).
export const AI_MODEL = "claude-haiku-5-5";

let client: Anthropic | undefined;

export function ai(): Anthropic {
  client ??= new Anthropic({ maxRetries: 3 });
  return client;
}
