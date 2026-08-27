const path = require("node:path");

const projectRoot =
  process.env.ALLINLE_ROOT || path.resolve(__dirname, "../..");
const apiRoot = path.join(projectRoot, "apps/api");
const logRoot = process.env.ALLINLE_LOG_DIR || path.join(projectRoot, "logs");

module.exports = {
  apps: [
    {
      name: "allinle-api",
      script: "dist/main.js",
      cwd: apiRoot,
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || "3000",
      },
      instances: Number(process.env.WEB_CONCURRENCY || 1),
      exec_mode: "cluster",
      max_memory_restart: process.env.MAX_MEMORY_RESTART || "512M",
      merge_logs: true,
      time: true,
      error_file: path.join(logRoot, "api-error.log"),
      out_file: path.join(logRoot, "api-out.log"),
    },
  ],
};
