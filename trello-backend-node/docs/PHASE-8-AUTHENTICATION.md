# Phase 8 — Authentication Foundation

## Status

Phase 8.1 audit and foundational hardening are implemented in this checkpoint.

## Findings

| Area | Previous status | Phase 8 result |
|---|---|---|
| User model | Insecure | Reuses existing Mongoose model and no longer deletes/recompiles models |
| Access JWT | Partially complete | Centralized secret/config, explicit `access` token type, issuer and audience |
| Access-token lifetime | Too long by default | Default changed to 15 minutes; `rememberMe` remains 30 days for compatibility |
| Refresh tokens | Insecure | New refresh tokens are SHA-256 hashed at rest and rotated |
| Refresh-token reuse | Missing | Reuse detection revokes the token family |
| Refresh-token revocation | Partial | Current-session and all-session revocation use revocation timestamps |
| Refresh cookie | Broken/partial | Cookie is read explicitly and scoped to `/api/v1/auth` |
| Frontend access token | Insecure | No longer persisted in localStorage; kept in memory |
| Session restore | Partial | Frontend attempts refresh-cookie restoration on application startup |
| Auth routes | Noisy/duplicated | Debug/test endpoints removed; route registration is declarative |
| Token schema warning | Present | Duplicate `token` index removed |
| Password hashing | Present | Existing bcrypt pre-save hashing preserved |
| Password-reset revocation | Present | All refresh sessions revoked after password reset |

## Architecture

```text
Access token
  -> short-lived JWT
  -> response body
  -> frontend memory only

Refresh token
  -> cryptographically random opaque token
  -> HttpOnly cookie
  -> SHA-256 digest stored in MongoDB
  -> rotation on every refresh
  -> family revocation on replay
```

## Compatibility decisions

- The existing multi-step email/password/login-verification flow is preserved.
- The legacy direct `/auth/login` route is retained for compatibility and marked legacy in the route file.
- Existing legacy refresh-token records can be recognized once and rotated into the hash-based model; newly created records do not store raw refresh tokens.
- Google mobile login continues to return a refresh token because it is a separate client-oriented contract. Web Google OAuth still requires a later hardening step to remove the access token from the redirect query string.

## Deferred security work

1. Hash email-verification and password-reset tokens at rest.
2. Replace the Google OAuth query-string access-token handoff with a one-time authorization exchange.
3. Add dedicated authentication integration tests against a test MongoDB instance.
4. Add stronger login/registration abuse controls and consistent error contracts.
5. Review CSRF behavior if cookie-based authentication is expanded beyond refresh-token use.

## Required local verification

Backend:

```powershell
npm ci
npm test
npm run lint
npm start
```

Frontend:

```powershell
npm ci
npm run type-check
npm run lint
npm run build
```

Manual authentication flow:

```text
Register -> verify email -> complete account -> login -> profile
-> wait/force access-token expiry -> refresh -> profile
-> logout -> refresh must fail
-> login again -> logout-all -> refresh must fail
```
