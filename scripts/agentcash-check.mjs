#!/usr/bin/env node
import { spawn } from "node:child_process";

const args = process.argv.slice(2);

function readOption(name) {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function hasFlag(name) {
  return args.includes(name);
}

function splitCommand(value) {
  return value
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
}

const endpoint =
  readOption("--endpoint") ?? process.env.AGENTCASH_CHECK_ENDPOINT ?? "";
const packageName =
  readOption("--package") ?? process.env.AGENTCASH_PACKAGE ?? "agentcash@latest";
const balanceArgs = splitCommand(
  process.env.AGENTCASH_BALANCE_ARGS ?? "wallet info"
);
const dryRunArgs = endpoint
  ? splitCommand(process.env.AGENTCASH_DRY_RUN_ARGS ?? `check ${endpoint}`)
  : [];

const npxBinary = process.platform === "win32" ? "npx.cmd" : "npx";

function runAgentCash(label, commandArgs) {
  return new Promise((resolve, reject) => {
    console.log(`\n== ${label} ==`);
    console.log(`agentcash ${commandArgs.join(" ")}`);

    const childCommand = process.platform === "win32" ? "cmd.exe" : npxBinary;
    const childArgs =
      process.platform === "win32"
        ? ["/d", "/s", "/c", npxBinary, "-y", packageName, ...commandArgs]
        : ["-y", packageName, ...commandArgs];

    const child = spawn(childCommand, childArgs, {
      stdio: "inherit",
      shell: false
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} failed with exit code ${code}.`));
    });
  });
}

async function main() {
  if (!hasFlag("--skip-balance")) {
    await runAgentCash("AgentCash balance check", balanceArgs);
  }

  if (!hasFlag("--skip-dry-run")) {
    if (!endpoint) {
      console.log(
        "\n== AgentCash endpoint dry-run ==\nSkipped. Pass --endpoint <url> or set AGENTCASH_CHECK_ENDPOINT."
      );
    } else {
      await runAgentCash("AgentCash endpoint dry-run", dryRunArgs);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
