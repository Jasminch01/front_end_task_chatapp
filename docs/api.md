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

## Realtime (Socket.IO)

### Connection

### Events

## Redesign notes

## Flows
