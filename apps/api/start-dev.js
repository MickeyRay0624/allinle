// Dev server keep-alive: auto-restart on crash
const { spawn } = require("child_process");
const path = require("path");

function start() {
  const child = spawn("node", ["dist/main.js"], {
    cwd: path.join(__dirname),
    stdio: "inherit",
    env: { ...process.env },
  });

  child.on("exit", (code, signal) => {
    console.log(`[keep-alive] API exited (code=${code}, signal=${signal}), restarting in 2s...`);
    setTimeout(start, 2000);
  });

  child.on("error", (err) => {
    console.error(`[keep-alive] Failed to start: ${err.message}, retrying in 2s...`);
    setTimeout(start, 2000);
  });
}

process.on("uncaughtException", (err) => {
  console.error("[keep-alive] Uncaught exception:", err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("[keep-alive] Unhandled rejection:", reason);
});

console.log("[keep-alive] Starting ALLINLE API dev server...");
start();
