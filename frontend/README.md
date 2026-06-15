# Find a Client Frontend

Next.js app for the Find a Client platform.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` in this folder:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

You can copy from `env.sample` as a starting point.

3. Start dev server:

```bash
npm run dev
```

## Implemented Today

- Home entry page: `/`
- Register page: `/register`
- Login page: `/login`
- Guarded dashboard page: `/dashboard`
- Wired backend endpoints:
	- `POST /auth/register`
	- `POST /auth/login`
	- `POST /auth/refresh`
	- `POST /auth/logout`

## Notes

- Tokens are stored in localStorage for MVP bootstrap.
- Role selection UI is included, but backend currently stores new users as `DEVELOPER`.
- `GET /users/me` is listed in requirements docs but is not present in backend controller yet.

## Deploy To Vercel

- Set project Root Directory to `frontend`.
- Add `NEXT_PUBLIC_API_URL` in Vercel Environment Variables and point it to your Render backend URL.
- Full guide: `../docs/VERCEL_FRONTEND_DEPLOY.md`.
