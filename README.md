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
