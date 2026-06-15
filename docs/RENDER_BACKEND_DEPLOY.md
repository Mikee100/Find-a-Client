# Deploy Backend To Render

This guide deploys the NestJS API from `backend/` to Render.

## 1. Push this repository to GitHub

Render deploys from a Git repository, so ensure your latest backend changes are pushed.

## 2. Choose your database strategy

You have 2 good options:

1. Keep Supabase PostgreSQL (recommended for your current setup):
- Set both `DATABASE_URL` and `DIRECT_URL` to your Supabase connection string.
- Use the direct database URL for both values unless you have a separate pooled URL.

2. Use Render PostgreSQL:
- Create a Render Postgres instance first.
- Set `DATABASE_URL` and `DIRECT_URL` from Render connection strings.

## 3. Create the Render web service

Use one of these methods:

1. Blueprint deploy:
- In Render dashboard, choose **New +** -> **Blueprint**.
- Select this repository.
- Render will read `render.yaml` from repo root.

2. Manual deploy:
- In Render dashboard, choose **New +** -> **Web Service**.
- Root directory: `backend`
- Build command:
  `npm ci && npm run prisma:generate && npm run build && npm run prisma:deploy`
- Start command:
  `npm run start`
- Health check path:
  `/health`
- Node version: `20`

## 4. Add environment variables in Render

Required variables:

- `DATABASE_URL`
- `DIRECT_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `FRONTEND_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY`

Optional OAuth vars if you use provider login:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

Recommended fixed vars:

- `NODE_ENV=production`
- `QUIET_STARTUP_LOGS=true`
- `JWT_ACCESS_TTL=15m`
- `JWT_REFRESH_TTL=7d`

Do not set `PORT` manually; Render injects it.

## 5. First deploy and verify

After deploy finishes, verify:

1. Health check:
- `GET https://<your-render-service>.onrender.com/health`

2. Logs show startup:
- "Nest started successfully"

3. Prisma migration success:
- Build logs should include `prisma migrate deploy` success.

## 6. Update frontend API base URL

Point your frontend API URL to the Render backend domain once deployment is healthy.

## 7. Common issues

1. Crash on boot with config errors:
- Missing required env vars. Recheck values in Render dashboard.

2. Prisma migration fails:
- Wrong `DATABASE_URL` or `DIRECT_URL`.
- Ensure DB allows external connections from Render.

3. CORS blocked:
- Ensure `FRONTEND_URL` exactly matches your frontend domain.

4. Build fails with lockfile mismatch:
- Regenerate lockfile locally and commit `backend/package-lock.json`.

5. Build shows `yarn npm ci ...` and fails with `Command "npm" not found`:
- Your Render Build Command is wrong.
- Set it to exactly:
  `npm ci && npm run prisma:generate && npm run build && npm run prisma:deploy`
- Do not prefix with `yarn`.
