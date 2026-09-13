# Phase 9 — Authorization & Permissions

## 9.1 Board Authorization Foundation

The backend now treats the board as the primary authorization boundary.

### Authorization model

- Authentication answers **who is the caller**.
- Authorization answers **what that authenticated caller may do**.
- Board ownership and membership are evaluated server-side.
- Knowing a MongoDB ObjectId never grants access by itself.

### Central authorization service

`services/authorizationService.js` is the single reusable authorization layer for board/resource access.

Key operations:

- `getBoardMembership(boardId, userId)`
- `requireBoardMember(boardId, userId)`
- `requireBoardOwner(boardId, userId)`
- `requireListBoardMember(listId, userId)`
- `requireCardBoardMember(cardId, userId)`
- `canViewBoard(board, userId)`
- `canEditBoard(board, userId)`
- `canDeleteBoard(board, userId)`
- `canManageMembers(board, userId)`

### Board route enforcement

- `GET /api/v1/boards/:id` → board member
- `PUT /api/v1/boards/:id` → board owner
- `DELETE /api/v1/boards/:id` → board owner
- `PUT /api/v1/boards/:id/reorder` → board member
- `GET /api/v1/boards/:id/activities` → board member
- `POST /api/v1/boards` remains available to authenticated users because the caller becomes the owner.

### Membership invariants

Board creation/update now:

1. Requires `member_ids` to be an array when supplied.
2. Rejects invalid MongoDB IDs.
3. Rejects missing/inactive users.
4. Deduplicates membership IDs.
5. Always includes the board owner as a member.

The Board model also enforces the owner-is-member and unique-members invariants at validation time.

### Security contract

Expected authorization failures are structured with HTTP status + code:

- `400 INVALID_ID`
- `400 BOARD_ID_REQUIRED`
- `403 BOARD_ACCESS_DENIED`
- `403 BOARD_OWNER_REQUIRED`
- `404 BOARD_NOT_FOUND`

The frontend may use these permissions for UX, but backend authorization remains authoritative.

## Not yet completed

This checkpoint does **not** claim list/card/nested-resource authorization is complete. Those are subsequent Phase 9 checkpoints and must reuse the central authorization service.
