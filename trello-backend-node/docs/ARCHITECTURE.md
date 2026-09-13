# Backend Architecture

## Runtime boundary

```text
server.js
  ├── loads configuration
  ├── creates HTTP server
  ├── creates Socket.IO server
  ├── authenticates Socket.IO connections
  ├── authorizes board room membership
  ├── connects MongoDB
  ├── starts listening
  └── handles graceful shutdown

app.js
  ├── Express middleware
  ├── CORS / Helmet / request logging
  ├── health/readiness endpoints
  ├── /api/v1 route mounting
  └── HTTP error/404 handling
```

`app.js` must not call `listen()` or establish the process-level database lifecycle. This keeps HTTP composition testable and gives the application one runtime owner.

## HTTP request flow

```text
HTTP request
    ↓
Express middleware
    ↓
route middleware (auth/validation/permissions)
    ↓
controller
    ↓
service/business logic
    ↓
Mongoose model
    ↓
MongoDB
    ↓
controller response
```

The current codebase still has some older controllers that perform persistence directly. Those should be migrated incrementally when the corresponding feature is completed; Phase 7 does not justify a broad rewrite.

## Real-time flow

```text
authenticated Socket.IO connection
    ↓
JWT verification + user lookup
    ↓
joinBoard(boardId)
    ↓
board membership authorization
    ↓
board:<id> room
    ↓
future domain mutation
    ↓
emit only after successful persistence
```

Socket.IO is a synchronization/notification mechanism, not the source of truth. MongoDB remains authoritative.

## Frontend boundary

The frontend uses a thin App Router page boundary and feature UI under `components/`. API/domain contracts live under `types/`, while HTTP and Socket.IO implementations live under `services/`.
