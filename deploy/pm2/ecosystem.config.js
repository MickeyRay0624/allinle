module.exports = {
  apps: [
    {
      name: "allinle-api",
      script: "dist/main.js",
      cwd: "/var/www/allinle/apps/api",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      instances: 2,
      exec_mode: "cluster",
      max_memory_restart: "512M",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/var/log/allinle/api-error.log",
      out_file: "/var/log/allinle/api-out.log",
    },
  ],
};
