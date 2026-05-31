import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const env = {
  ...process.env,
  PORT: process.env.PORT ?? "3000",
  WS_PORT: process.env.WS_PORT ?? "3002",
};

function resolveRelaySpawn() {
  const bunCheck = spawnSync("bun", ["--version"], { shell: true, encoding: "utf8" });
  if (bunCheck.status === 0) {
    return { cmd: "bun", args: ["run", "server/index.ts"], shell: true };
  }

  const tsxCli = join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
  if (existsSync(tsxCli)) {
    return { cmd: process.execPath, args: [tsxCli, "server/index.ts"], shell: false };
  }

  return { cmd: "npx", args: ["tsx", "server/index.ts"], shell: true };
}

/** Windows shell:true spawn leaves orphan bun/node children without /T kill. */
function killProcessTree(child) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { shell: true, stdio: "ignore" });
    return;
  }
  child.kill("SIGTERM");
}

const relaySpawn = resolveRelaySpawn();

const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", env.PORT], {
  stdio: "inherit",
  env,
  shell: false,
});

const relay = spawn(relaySpawn.cmd, relaySpawn.args, {
  stdio: "inherit",
  env,
  shell: relaySpawn.shell,
});

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  killProcessTree(next);
  killProcessTree(relay);
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
next.on("exit", (code) => shutdown(code ?? 1));
relay.on("exit", (code) => {
  if (code && code !== 0) {
    console.error(
      `[c4e] Relay exited (${code}). Port ${env.WS_PORT} may still be in use from a previous dev session.`
    );
    console.error(`[c4e] Windows: netstat -ano | findstr :${env.WS_PORT}  then  taskkill /PID <pid> /F`);
    shutdown(code);
  }
});

console.log(`[c4e] Next.js → http://127.0.0.1:${env.PORT}`);
console.log(
  `[c4e] Relay + collab WS → http://127.0.0.1:${env.WS_PORT} (${relaySpawn.cmd} ${relaySpawn.args.join(" ")})`
);
