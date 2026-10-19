# PageSmith — merge, split & reorder PDFs

A React + Express web app for merging, splitting and reordering PDF pages. It has user accounts, per-user private file storage, and daily export limits on a Free or Pro (20 THB/month) plan. User data lives in **Neon Postgres**.

| Plan | Price | Exports per day |
|------|-------|-----------------|
| Free | 0 THB | 5 |
| Pro  | 20 THB / month | 20 + the **PageSmith 5.5 Pro** assistant |

Each export (merge, split or reorder) uses one unit. The count resets at **midnight in `APP_TIMEZONE`** (default `Asia/Bangkok`).

## Quick start

```bash
npm install
cp .env.example .env          # then paste your Neon connection string into DATABASE_URL
npm run db:migrate            # creates the tables (safe to re-run)
npm run dev                   # API on :3001, web app on http://localhost:5173
```

If `STRIPE_SECRET_KEY` is empty, the app runs in **test billing mode**: clicking Upgrade switches the account to Pro and charges nothing. The server refuses to start this way in production.

## Deploying to Vercel

1. Import the GitHub repo into Vercel. `vercel.json` already sets the Vite build, the API function (`api/index.js`) and the security headers.
2. **Storage → Create → Blob**, then connect the store to the project. This adds `BLOB_READ_WRITE_TOKEN` automatically. The API refuses to start on Vercel without it, so files can't be lost.
3. **Settings → Environment Variables**: add `DATABASE_URL`, `JWT_SECRET`, `APP_URL`, `DEEPSEEK_API_KEY`, `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
4. Run `npm run db:migrate` once from your machine, using the same `DATABASE_URL`.

How it works on Vercel:
- **Private Blob storage.** Files are stored under `users/<userId>/…` with private access. The server only reads keys inside the signed-in user's folder.
- **Direct uploads.** Vercel limits request bodies to about 4.5 MB, so the browser uploads PDFs straight to Blob (up to `MAX_UPLOAD_MB`). The server first issues a token that expires in 10 minutes and only allows one PDF at one path in that user's folder. The browser then calls `/api/files/register`, and the server checks the file is a real PDF before recording it.
- **Large downloads.** Files over 4 MB are served through a signed URL that is valid for 10 minutes and only works for that one file. Smaller files are streamed through the API.

## Other hosts (Render, Railway, VPS)

```bash
npm run build                 # builds the React app into dist/
NODE_ENV=production npm start # Express serves the API and dist/ on PORT
```

Set the same variables. Either put `STORAGE_DIR` on a persistent disk, or set `BLOB_READ_WRITE_TOKEN` to use Blob storage there as well.

### Stripe setup (THB)
1. Optional: create a Product with a recurring price of **20 THB / month** and set `STRIPE_PRICE_ID`. If you skip this, checkout builds the price inline.
2. Add a webhook endpoint at `https://<your-domain>/api/billing/webhook` with these events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
3. Turn on the Customer Portal in the Stripe dashboard. Users open it from the Account page to change their card or see invoices.
4. Local testing: `stripe listen --forward-to localhost:3001/api/billing/webhook`.

## How it works

- **Auth**: passwords are hashed with bcrypt. The session is a JWT in an httpOnly cookie. Login and register are rate-limited.
- **Database** (`server/schema.sql`):
  - `users`: username, email and password hash.
  - `payment_accounts`: the user's Stripe customer.
  - `subscriptions`: status and period end, linked to the payment account.
  - `daily_usage`: export count per user per day.
  - `files`: metadata for stored files.
- **Quota**: one atomic `INSERT … ON CONFLICT … WHERE count < limit`, so the limit holds even with parallel requests. If an export fails, its unit is given back.
- **Files**: stored in private Vercel Blob storage (`users/<userId>/…`), or on disk in `STORAGE_DIR/<userId>/` when no Blob token is set. Every lookup checks that the file belongs to the user, and storage keys are generated or validated on the server.
- **PDF processing**: done on the server with `pdf-lib`, so limits can't be bypassed from the browser. Page previews are drawn in the browser with `pdf.js`.

## Assistant (Pro)

Pro users can chat with **PageSmith 5.5 Pro** on the *Assistant* page. It can find files and answer questions about what's inside them, in Thai or English.

- Text is extracted from every uploaded or exported PDF (`server/text.js`) and stored per page in `file_pages`.
- The model is given three tools: `list_files`, `search_text` and `read_pages`. Every query is scoped to the signed-in user, so it can only see that user's files.
- Replies include clickable **Sources** that link to the files it used. Scanned or image-only PDFs have no text layer, and the assistant says so.
- The provider and model are never sent to the browser. The API returns only `ASSISTANT_NAME`, and the system prompt keeps the persona. As a fallback, any reply sentence that names the provider is removed.
- Each Pro user gets `ASSISTANT_DAILY_LIMIT` messages per day (default 100), with a burst limit of 12 per minute. Assistant messages don't count against exports.

## Project layout

```
api/index.js       Vercel function entry (wraps the Express app)
vercel.json        Vercel build, rewrites, security headers
server/            Express API
  app.js           Express app (shared by Vercel and the standalone server)
  index.js         standalone server (local dev, Render, …)
  routes/          auth, files, tools (merge/split/organize), billing (Stripe + webhook)
  plans.js         plans, daily usage, midnight reset
  pdf.js           merge / split / assemble with pdf-lib
  text.js          PDF text extraction for the assistant
  assistant.js     assistant tool loop (provider hidden behind ASSISTANT_NAME)
  storage.js       per-user file storage (Vercel Blob or local disk)
src/               React app (Vite)
  pages/           Home, Merge, Split, Organize, Files, Account, Assistant, Auth
  components/      Layout, Dropzone, PageThumb, ExportPanel, FilePicker, Toast
```
