# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Accounts

The home page opens with a Login / Register panel. Registering takes a full name,
email and password (minimum 8 characters); logging in takes email and password.
Passwords are stored as PBKDF2-SHA256 hashes with a per-user salt and are never
returned by the API. The session is an HttpOnly cookie that lasts 30 days.

A loan application can only be submitted while signed in, and every application is
linked to the account that created it. The admin console lists all registered
users (name, email, registered date, last login) and shows the linked account on
each application card.

## Approval and disbursement flow

After submission, the existing admin review is retained. The admin sets an approved
amount (the form defaults to ₹20,000), title and image. The applicant then sees
**Amount Approved → Disbursement (bank details) → Processing**. Processing is a saved
request status, not a completed transfer; this template does not integrate with a
bank payment provider. Submitted bank details are visible only through the
admin-authenticated application endpoint; public status returns only the last four
account digits. Approval changes are blocked once processing begins.

Before deploying this update, apply `drizzle/0002_nice_revanche.sql` to the existing
D1 database using your normal migration workflow. Existing approved applications
need an amount confirmed by the admin before they can request disbursement.

Local development and development-only Arena previews use in-memory storage when
D1/R2 are absent (data resets when the server restarts). Production still requires
`DB`, `FILES` and `ADMIN_PASSWORD` bindings. Use test documents and bank details in
development. Run `npm test` for the local and SQLite-backed API flow checks.

## Free deployment to Cloudflare (Workers + D1 + R2)

The app runs as a Cloudflare Worker and expects two bindings: `DB` (D1) and
`FILES` (R2). Everything below fits inside Cloudflare's free tier.

```sh
# 1. Sign in (opens a browser once)
npx wrangler login

# 2. Create the database and the file bucket
npx wrangler d1 create chola-loan-db     # copy the printed database_id
npx wrangler r2 bucket create chola-loan-files

# 3. Paste the database_id into wrangler.cloudflare.json

# 4. Create the tables in the remote database
npm run db:migrate:remote

# 5. Set the admin password (used by /admin)
npx wrangler secret put ADMIN_PASSWORD --name chola-loan-app

# 6. Build and deploy
npm run deploy
```

The deploy prints the live URL (`https://chola-loan-app.<subdomain>.workers.dev`).
The admin console lives at `/admin`.

Re-deploying later is just `npm run deploy`; run `npm run db:migrate:remote`
again whenever a new file is added to `drizzle/`.

Notes:

- Without `DB`/`FILES` bindings the API returns 503 in production; local `vite dev`
  falls back to in-memory storage with the admin password `admin123`.
- R2 requires a payment method on the Cloudflare account even on the free tier
  (10 GB storage is free). To avoid that, deploy with D1 only and store uploads
  elsewhere.

## Self-hosting on your own server (Node + SQLite)

The Node build stores everything on disk: `DATA_DIR/loan.db` (SQLite) and
`DATA_DIR/files` (KYC documents, approval images, payment QR). Migrations from
`drizzle/` run automatically on boot, so there is no separate migration step.

```sh
cd /var/www/html/LOAN_TEMPLATE
git pull origin arena/01a0856a-loan-template
npm install
npm run build:node

# quick test on port 8080
DATA_DIR=$PWD/data ADMIN_PASSWORD='your-strong-password' PORT=8080 npm start
```

Keep it running with PM2 (edit `ADMIN_PASSWORD` in `ecosystem.config.cjs` first).
It defaults to port 8080 on all interfaces:

```sh
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
```

Useful PM2 commands: `pm2 logs loan-app`, `pm2 restart loan-app`, `pm2 status`.
If port 8080 is already taken by something else, pick another one:

```sh
PORT=9000 pm2 start ecosystem.config.cjs --update-env
```

Then put nginx in front of it:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 2m;   # uploads are capped at 900 KB each

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```sh
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com    # HTTPS, required for secure admin cookies
```

Updating later:

```sh
git pull origin arena/01a0856a-loan-template
npm install
npm run build:node
pm2 restart loan-app
```

Requires Node 22+ (uses the built-in `node:sqlite` module). Back up `DATA_DIR`
regularly — it holds every application, document and bank detail.
