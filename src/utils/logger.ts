import { appendFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

function baseDir(): string {
  return process.env.AMEM_BASE_DIR || join(homedir(), ".claude");
}

const enabled = !!process.env.AMEM_VERBOSE;
const logPath = join(baseDir(), "amem.log");

if (enabled) {
  mkdirSync(dirname(logPath), { recursive: true });
}

export function log(tool: string, params: unknown, result: unknown): void {
  if (!enabled) return;
  const entry = {
    ts: new Date().toISOString(),
    tool,
    params,
    result,
  };
  appendFileSync(logPath, JSON.stringify(entry) + "\n");
}
