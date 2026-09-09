// PM2 config for self-hosting the Node build.
//
//   npm run build:node
//   pm2 start ecosystem.config.cjs
//
// Override the port or password without editing this file:
//   PORT=9000 ADMIN_PASSWORD='secret' pm2 start ecosystem.config.cjs --update-env
module.exports = {
  apps: [
    {
      name: "loan-app",
      script: ".output/server/index.mjs",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        // Port the app listens on. Put nginx in front of it for a domain + HTTPS.
        PORT: process.env.PORT || 8080,
        // 0.0.0.0 makes it reachable directly at http://SERVER_IP:8080.
        // Switch to 127.0.0.1 once nginx proxies to it.
        HOST: process.env.HOST || "0.0.0.0",
        // SQLite database + uploaded KYC/QR files live here. It must survive
        // deploys and be writable by the user running PM2.
        DATA_DIR: process.env.DATA_DIR || `${__dirname}/data`,
        // Change this before going live.
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "change-me-now",
      },
    },
  ],
};
