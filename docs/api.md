# Chat API — Documentation

- Base URL: `https://frontend-task-chatapp.onrender.com/api`
- Socket origin: `https://frontend-task-chatapp.onrender.com`

## Conventions

### Authentication

### Errors

### Pagination

## Resource model

## Endpoints

### Auth

#### `POST /auth/login`

#### `GET /auth/me`

### Users

#### `GET /users/search`

### Conversations

#### `GET /conversations`

#### `POST /conversations`

#### `POST /conversations/group`

#### `PATCH /conversations/{id}`

### Messages

#### `GET /conversations/{id}/messages`

#### `POST /messages`

### Group management

#### `POST /conversations/{id}/participants`

#### `DELETE /conversations/{id}/participants/{userId}`

#### `POST /conversations/{id}/admins`

### System

#### `GET /health`
Check health of the API. public - no token required.
**Request**
No parameters, no body.

**Response**
```
{
  "status": "ok"
}
```

**Notes**
This endpoint is not under `/api`. The api documentation shows the base URL as `{baseurl/api}`. But the currect endpoint is `{baseurl/health}`. So the actual endpoint is `{baseurl/health}`.
## Realtime (Socket.IO)

### Connection

### Events

## Redesign notes

## Flows
