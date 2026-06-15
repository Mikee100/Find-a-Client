# DevShowcase Auth, Users, and Registration Requirements

## Purpose

Define clear requirements for:
- Registration
- Login
- User roles and profile details

This document is the source of truth for frontend and backend implementation.

## Personas

The platform supports two primary personas:
- Developer
- Client

## Data Model Split

### 1. Auth Identity (credentials and sessions)
Fields:
- id (uuid)
- email (unique)
- passwordHash (if managed locally)
- oauthProvider (google or github)
- oauthProviderId
- emailVerified (boolean)
- lastLoginAt
- accountStatus (ACTIVE, SUSPENDED)
- createdAt
- updatedAt

Notes:
- If using Supabase Auth, password and provider-level fields are managed by Supabase.
- App DB should still store accountStatus and metadata needed by product logic.

### 2. Core User Profile (shared by all users)
Fields:
- id (uuid)
- role (DEVELOPER, CLIENT)
- fullName
- username (unique, slug format)
- avatarUrl
- location
- createdAt
- updatedAt

### 3. Developer Profile (role-specific)
Fields:
- userId
- headline
- bio
- skills (string array)
- yearsExperience
- hourlyRate (nullable)
- githubUrl (nullable)
- websiteUrl (nullable)
- linkedinUrl (nullable)
- availability (OPEN, LIMITED, UNAVAILABLE)
- isVerified (boolean)

### 4. Client Profile (role-specific)
Fields:
- userId
- companyName (nullable)
- companySize (nullable)
- industry (nullable)
- budgetRange (nullable)
- projectTypesNeeded (string array, nullable)
- contactPreference (nullable)

## Registration Requirements

### Common Registration Inputs
Required:
- email
- password
- fullName
- username
- role (developer or client)
- acceptTerms (boolean)

### Developer Registration (step 2 onboarding)
Recommended extra fields:
- primarySkills
- shortBio
- githubUrl or portfolio link

### Client Registration (step 2 onboarding)
Recommended extra fields:
- companyName or individual indicator
- hiringNeeds summary

### OAuth Registration
Support:
- Google
- GitHub

Rules:
- On first OAuth login, require role selection.
- Prompt user to complete missing profile fields after OAuth callback.

## Login Requirements

### Supported Login Methods
- Email + password
- Google OAuth
- GitHub OAuth

### Session Policy
- Access token TTL: 15 minutes
- Refresh token TTL: 7 days
- Refresh token rotation required
- Logout invalidates refresh token

### Security Controls
- Rate limit failed login attempts
- Temporary cooldown or lockout after repeated failures
- Require email verification for full platform access
- Optional 2FA in a later phase

## Validation Rules

### Username
- Lowercase slug only
- Unique
- Reserved word blacklist (examples: admin, support, api)

### Password
- Minimum length: 8
- Strong policy recommended
- Breached-password checks in later phase

### Email
- Unique
- Verified via email link

### Role Changes
- Role is immutable after creation for MVP
- Future role changes should use admin-approved flow

## MVP API Endpoints

Auth:
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- GET /auth/google
- GET /auth/github

User:
- GET /users/me
- PUT /users/me
- POST /users/me/avatar

## MVP Scope (Build Order)

Phase 1:
1. Register, login, refresh, logout
2. Role assignment at registration
3. Basic profile read/update

Phase 2:
1. Email verification
2. OAuth onboarding completion
3. Profile completion wizard by role

Phase 3:
1. Optional 2FA
2. Session management dashboard
3. Role-upgrade request flow

## Implementation Notes

- Keep controllers thin; place business rules in services.
- Use DTO validation on all auth and user endpoints.
- Never log passwords, tokens, or sensitive PII.
- Enforce RBAC guards by role for role-specific endpoints.
- Keep auth identity concerns separated from profile concerns.
