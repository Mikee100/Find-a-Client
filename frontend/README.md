# Find a Client Frontend

Next.js app for the Find a Client platform.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` in this folder:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. Start dev server:

```bash
npm run dev
```

## Implemented Today

- Home entry page: `/`
- Register page: `/register`
- Login page: `/login`
- Guarded dashboard page: `/dashboard`
- Client workspace: `/client/dashboard`
- Client discovery: `/client/discover`
- Client project/developer detail: `/client/discover/[slug]`
- Wired backend endpoints:
	- `POST /auth/register`
	- `POST /auth/login`
	- `POST /auth/refresh`
	- `POST /auth/logout`
	- `GET /projects`
	- `GET /projects/:slug`
	- `GET /search`
	- `GET /users/:username`
	- `GET /users/me/saved`
	- `GET /messages/threads`
	- `POST /messages/threads`

## Notes

- Tokens are stored in localStorage for MVP bootstrap.
- Role selection UI is not included in registration because the backend register payload does not support role assignment.
- `GET /users/me` is listed in requirements docs but is not present in backend controller yet.
- Hire request UI is currently a placeholder because no hire request endpoint exists yet.

More detail: `../docs/CLIENT_MARKETPLACE_FLOW.md`.
