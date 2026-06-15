# Deploy Frontend To Vercel

This project uses Next.js in `frontend/`.

Reference sample env file: `frontend/env.sample`.

## 1. Import repository into Vercel

1. Go to Vercel dashboard.
2. Click **Add New** -> **Project**.
3. Import `Mikee100/Find-a-Client`.

## 2. Configure project settings

Set:

- Framework Preset: `Next.js`
- Root Directory: `frontend`
- Build Command: `npm run build`
- Install Command: `npm ci`
- Output Directory: leave default
- Node.js Version: `20.x`

## 3. Add environment variable

In Vercel Project Settings -> Environment Variables, add:

- `NEXT_PUBLIC_API_URL` = your Render backend URL

Example:

`https://find-a-client-backend.onrender.com`

Notes:
- Do not include a trailing slash.
- Apply this variable to Production (and Preview if desired).

## 4. Deploy

Trigger deployment from Vercel.

## 5. Verify after deploy

1. Open deployed frontend URL.
2. Test register/login flow.
3. Open browser network tab and confirm requests go to your Render backend URL.

## 6. Common issues

1. 404/Network errors to `localhost`:
- `NEXT_PUBLIC_API_URL` was not set in Vercel.

2. CORS blocked:
- Ensure backend `FRONTEND_URL` in Render exactly matches Vercel frontend domain.
- If using custom domain, update `FRONTEND_URL` to custom domain.

3. Old env value after changing variable:
- Redeploy after changing environment variables.
