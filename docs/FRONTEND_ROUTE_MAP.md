# Frontend Route Map

This document defines route ownership and naming conventions for the Find a Client frontend.

## Route Ownership Rules

- Use singular route namespaces for role-owned workspaces:
  - `/developer/*`
  - `/client/*`
  - `/admin/*`
- Use plural namespaces for public discovery collections:
  - `/developers` for discovery/listing
  - `/projects` for marketplace listings
- Keep compatibility routes as redirects only. Do not add feature logic there.

## Canonical Role Routes

### Developer
- `/developer/dashboard`
- `/developer/settings`

### Client
- `/client/dashboard`
- `/client/projects/new`
- `/client/settings`

### Admin
- `/admin/dashboard`

## Compatibility Redirect Routes

- `/dashboard` redirects to role-specific dashboard based on authenticated session role.
- `/account/settings` redirects to `/developer/settings`, `/client/settings`, or `/admin/dashboard` based on authenticated session role.
- `/developers/dashboard` redirects to `/developer/dashboard`.
- `/developers/settings` redirects to `/developer/settings`.

## Feature Folder Conventions

- Put role-specific UI in role feature folders:
  - `src/features/developer/*`
  - `src/features/client/*`
  - `src/features/admin/*`
- Keep `src/features/shared/*` only for reusable, cross-role components.

## Add New Routes Checklist

1. Pick a canonical owner namespace (developer/client/admin/public).
2. If replacing old paths, add a redirect route for backward compatibility.
3. Update nav links to canonical paths only.
4. Avoid duplicate singular/plural routes for the same page behavior.
