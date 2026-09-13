# Backend Project Structure

The backend intentionally keeps the existing top-level Node/Express structure during the stabilization phase. The current boundaries are already coherent enough for incremental development, so a wholesale `src/` migration would add churn without delivering feature value.

```text
backend/
├── config/        # Environment, database and JWT configuration
├── controllers/   # HTTP request orchestration; no route registration
├── middleware/    # Cross-cutting HTTP concerns and authorization helpers
├── models/        # Mongoose schemas/models and persistence contracts
├── routes/        # HTTP resource routing and middleware composition
├── services/      # Business/integration logic (auth, email, OAuth, tokens)
├── validators/    # Request validation rules
├── utils/         # Small reusable helpers
├── scripts/       # Developer/CI scripts
├── tests/         # Automated backend tests
├── docs/          # Architecture and engineering documentation
├── app.js         # Express application composition; no listen()
└── server.js      # Single runtime entrypoint; HTTP + Socket.IO lifecycle
```

## Dependency direction

```text
routes
  ↓
middleware
  ↓
controllers
  ↓
services
  ↓
models
  ↓
MongoDB
```

Configuration and shared utilities are cross-cutting dependencies. `server.js` owns process/runtime lifecycle; `app.js` owns HTTP application composition.

## Structural decisions

- Keep one authoritative `server.js` entrypoint.
- Keep `app.js` importable for tests without starting a server.
- Keep REST route definitions separate from controllers.
- Keep business/integration logic in services where it already exists.
- Do not introduce a `src/` migration until the current feature set or team size justifies the migration cost.
- The misspelled `commentComtroller.js` was corrected to `commentController.js` because the file is a controller and the old name was an accidental naming defect.
- An unused `middleware/upload.js` file was removed because it was not an upload middleware at all; it duplicated generic JWT/password/helper functions and contained an insecure JWT fallback. Upload handling will be introduced as a real, purpose-specific middleware/service when attachment work is implemented.
