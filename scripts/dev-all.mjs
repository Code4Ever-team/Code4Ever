import { spawn } from "node:child_process";

const env = {
  ...process.env,
  PORT: process.env.PORT ?? "3000",
  WS_PORT: process.env.WS_PORT ?? "3002",
};

const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", env.PORT], {
  stdio: "inherit",
  env,
  shell: false,
});

function shutdown(code = 0) {
  next.kill();
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
next.on("exit", (code) => shutdown(code ?? 1));

console.log(`[c4e] Next.js → http://127.0.0.1:${env.PORT}`);
console.log("[c4e] Bildirimler → /api/relay (ayrı relay gerekmez; isteğe bağlı: npm run dev:relay)");
