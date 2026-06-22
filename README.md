# Trello Clone Backend (Node.js)

This repository contains the backend for a Trello-style task management app built with Node.js, Express, MongoDB, and Socket.io.

> The actual backend project lives in the `trello-backend-node/` folder.

## Project Overview

The backend provides RESTful APIs and real-time board collaboration support for:

- Authentication and registration
- Multi-step login flow
- JWT access tokens and refresh tokens
- Email verification and password reset
- Google OAuth and mobile SPA Google login
- Board and list management
- Card creation, updates, and movement
- Activity tracking and board activity feeds
- File upload support and static file serving

## Tech Stack

- Node.js
- Express
- MongoDB / Mongoose
- Socket.io
- JSON Web Tokens (JWT)
- bcryptjs
- express-validator
- express-rate-limit
- helmet
- cors
- dotenv
- nodemon (dev)
- jest (dev)

## Folder Structure

Inside `trello-backend-node/`:

- `config/` - database and JWT configuration
- `controllers/` - request handlers and business logic
- `middleware/` - auth, validation, permissions, rate limiting, file uploads
- `models/` - Mongoose schemas for users, boards, cards, lists, activities, tokens
- `routes/` - API route definitions
- `services/` - email, auth, token, Google OAuth helpers
- `utils/` - common utility functions
- `uploads/` - static file upload storage
- `validators/` - request validation rules
- `server.js` - application entrypoint
- `package.json` - project metadata and scripts

## Getting Started

### Requirements

- Node.js 18+ (recommended)
- npm 9+
- MongoDB instance (Atlas or local)

### Install Dependencies

```bash
cd trello-backend-node
npm install
```

### Environment Variables

Create a `.env` file in `trello-backend-node/` with the required configuration.

Example:

```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

MONGODB_URI=mongodb://127.0.0.1:27017/trello-clone

JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1d

BREVO_API_KEY=your_brevo_api_key
EMAIL_FROM="Trello Clone" <noreply@example.com>

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp,application/pdf

RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=5

SOCKET_CORS_ORIGIN=http://localhost:3000
```

### Run the Server

Start in development mode with auto-reload:

```bash
npm run dev
```

Start in production mode:

```bash
npm start
```

## API Endpoints

The backend exposes endpoints under `/api`.

### Health & Debug

- `GET /api/health` - health check
- `GET /api/test` - basic API status

### Auth

- `POST /api/auth/register/start` - begin registration and send verification email
- `POST /api/auth/register/verify` - verify email token
- `POST /api/auth/register/complete` - complete registration with password
- `POST /api/auth/login/email` - login step 1: verify email
- `POST /api/auth/login/password` - login step 2: verify password
- `POST /api/auth/login/verify-token` - login step 3: verify login token and issue JWT
- `POST /api/auth/refresh-token` - refresh access token
- `GET /api/auth/google` - Google OAuth redirect
- `GET /api/auth/google/callback` - Google OAuth callback
- `POST /api/auth/google/login` - Google mobile/SPA login
- `POST /api/auth/forgot-password` - request password reset
- `POST /api/auth/reset-password` - reset password
- `POST /api/auth/logout` - logout
- `POST /api/auth/logout-all` - revoke all refresh tokens
- `GET /api/auth/profile` - get user profile
- `PUT /api/auth/profile` - update profile
- `POST /api/auth/check-email` - check email availability

### Boards

- `GET /api/boards` - list boards
- `GET /api/boards/:id` - get board details
- `POST /api/boards` - create board
- `PUT /api/boards/:id` - update board
- `DELETE /api/boards/:id` - archive board

### Lists

- `GET /api/lists` - list lists
- `GET /api/lists/:id` - get list details
- `POST /api/lists` - create list
- `PUT /api/lists/:id` - update list
- `DELETE /api/lists/:id` - delete list
- `PUT /api/lists/board/:boardId/reorder` - reorder lists

### Cards

- `GET /api/cards` - list cards
- `GET /api/cards/:id` - get card details
- `POST /api/cards` - create card
- `PUT /api/cards/:id` - update card
- `PUT /api/cards/:id/move` - move/reorder card

### Activities

- `GET /api/activities/board/:boardId` - get board activity feed
- `GET /api/activities/user` - get user activities
- `GET /api/activities/:id` - get specific activity
- `DELETE /api/activities/:id` - delete activity
- `DELETE /api/activities/board/:boardId/clear` - clear board activities

## Real-Time Collaboration

The server uses Socket.io to support board-level real-time communication.

Clients can join board rooms using events such as:

- `joinBoard`
- `leaveBoard`

## Notes

- The main application entrypoint is `trello-backend-node/server.js`.
- Static uploads are served from `trello-backend-node/uploads/`.
- CORS is configured to allow the configured `FRONTEND_URL`.
- Authentication is required for protected routes via JWT middleware.

## Testing

The repository includes a Jest setup in `package.json`.

Run tests with:

```bash
npm test
```

## License

This project is licensed under the MIT License.
