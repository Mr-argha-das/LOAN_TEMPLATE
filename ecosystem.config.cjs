// PM2 config for self-hosting the Node build: `pm2 start ecosystem.config.cjs`
module.exports = {
  apps: [
    {
      name: "loan-app",
      script: ".output/server/index.mjs",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "127.0.0.1",
        // SQLite database + uploaded KYC/QR files live here. Keep it outside the repo
        // if you prefer; it must survive deploys and be writable by the app user.
        DATA_DIR: `${__dirname}/data`,
        // Change this before going live.
        ADMIN_PASSWORD: "change-me-now",
      },
    },
  ],
};
