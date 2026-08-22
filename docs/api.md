# Chat API — Documentation

- Base URL: `https://frontend-task-chatapp.onrender.com/api`
- Socket origin: `https://frontend-task-chatapp.onrender.com`

The given swagger only documents the request side. It says the response bodies and the
status codes are not specified and i have to check the live api myself. So every response
here is copied from a real call i made in Postman, nothing is guessed.

## Conventions

### Authentication

`POST /auth/login` gives a JWT. Send it on every other endpoint.

```
Authorization: Bearer <token>
```

Only `POST /auth/login` and `GET /health` work without a token. i checked
`/users/search` and `/conversations` without a token and both are protected.

The token payload has `sub`, `iat`, `exp`. `exp - iat` is 7 days. There is no refresh
endpoint in the swagger, so after 7 days the user has to login again.

### Errors

The normal envelope.

```json
{ "error": { "message": "No token provided", "code": "NO_TOKEN" } }
```

Validation errors add a `details` array, which is useful because it tells you which field
failed.

```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [{ "path": "name", "message": "Required" }]
  }
}
```

Every code i saw while testing.

| Status | Code | When |
| --- | --- | --- |
| 400 | `NO_TOKEN` | No `Authorization` header |
| 401 | `INVALID_TOKEN` | Token is broken or expired |
| 400 | `VALIDATION_ERROR` | A required field is missing. has `details` |
| 403 | `FORBIDDEN` | Not an admin, or not a member of the conversation |
| 400 | `NOT_A_GROUP` | A group action on a direct conversation |
| 404 | `NOT_FOUND` | Route or conversation does not exist |
| 500 | `SERVER_ERROR` | An id in the wrong format. leaks the database error |
| 500 | `51091` (number) | Bad regex in `/users/search`. see that endpoint |

`code` is a string everywhere except the regex one, where it is a number. So in the client
i typed it as `string | number`.

### Pagination

Only `GET /conversations/{id}/messages` is paginated, with `limit` and `before`. Default
limit is 20. `GET /conversations` and `GET /users/search` have no pagination at all.

### The list endpoints do not agree

Three endpoints return a list and all three wrap it differently.

| Endpoint | Shape |
| --- | --- |
| `GET /users/search` | bare array `[...]` |
| `GET /conversations` | `{ "data": [...] }` |
| `GET /conversations/{id}/messages` | `{ "messages": [...], "hasMore": bool }` |

## Resource model

Ids are `_id`, mongo style, not `id`.

**User**

```json
{
  "_id": "6a891845e5d6aac9752667b0",
  "name": "Ada",
  "phone": "+17775402201",
  "createdAt": "2026-08-22T03:32:21.224Z"
}
```

**Message**

```json
{
  "_id": "6a8918d5e5d6aac975266e73",
  "conversation": "6a89186ee5d6aac97526699c",
  "sender": "6a891845e5d6aac9752667b0",
  "text": "message one from A",
  "createdAt": "2026-08-22T03:34:45.859Z"
}
```

`sender` is only an id. In a group i have to match it against the `participants` of the
conversation myself to show a name.

**Conversation** — the shape is not the same for direct and group, and it is also not the
same between the create response and the list response. See the endpoints below.

## Endpoints

### Auth

#### `POST /auth/login`

Login and register together. A new phone makes a user, an existing phone logs in.

**Request**

| Field | Type | Required |
| --- | --- | --- |
| `phone` | string | yes |
| `name` | string | yes |

```json
{ "phone": "+17775402201", "name": "Ada" }
```

**Response** `200`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "6a891845e5d6aac9752667b0",
    "name": "Ada",
    "phone": "+17775402201",
    "createdAt": "2026-08-22T03:32:21.224Z"
  }
}
```

**Errors**

| Status | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | `name` or `phone` missing. `details: [{ path: "name", message: "Required" }]` |

**Notes**

1. It returns `200` even when it creates a new user. `POST /conversations/group` returns
   `201` for a create. So the api is not consistent about this.

2. Logging in with a phone that already exists but a different name **renames that
   account**. i sent the same phone with the name `Ada RENAMED` and got the same `_id`
   back with the new name on it. There is no password, so anyone who types your number
   gets a working token for your account and can also change your display name.

3. The phone is not validated and not normalised. i sent `"  0155 900 540220 "` with the
   spaces and it was saved exactly like that. So `+15551234567` and `15551234567` become
   two different accounts, and that also breaks searching, see `/users/search`.

#### `GET /auth/me`

The logged in user. i use it on app start to check a saved token is still good.

**Response** `200`

```json
{
  "_id": "6a891845e5d6aac9752667b0",
  "name": "Ada",
  "phone": "+17775402201",
  "createdAt": "2026-08-22T03:32:21.224Z"
}
```

**Errors**

| Status | Code | When |
| --- | --- | --- |
| 400 | `NO_TOKEN` | No header at all |
| 401 | `INVALID_TOKEN` | Broken or expired token |

**Notes**

The user comes back flat here, but login puts the same object inside a `user` key. Same
data, two wrappers.

No token is `400` and a bad token is `401`. Two statuses for the same kind of failure. The
normal way is one interceptor that logs out on `401`, and that interceptor would never run
for a missing token. So in the client i check `error.code`, not the status.

### Users

#### `GET /users/search`

Search a user by name or phone, used before starting a conversation.

**Request**

| Param | In | Type | Required |
| --- | --- | --- | --- |
| `q` | query | string | swagger says yes, the server says no |

**Response** `200` — a bare array

```json
[
  { "_id": "6a8827c5e5d6aac97521e3ef", "name": "Grace Probe", "phone": "+15550001002" },
  { "_id": "6a882830e5d6aac97521e503", "name": "Grace Hopper", "phone": "+15553333333" }
]
```

**Notes**

This endpoint has the most problems. i tested it with 14 different values of `q` and this
is what it does.

**1. How the matching actually works**

| `q` | Result |
| --- | --- |
| `Grace` | 43 results |
| `Gra` | 43 results |
| `grace` | 0 |
| `GRACE` | 0 |
| `race` | 0 |
| `01750885871` | 1 result, that exact user |
| `1750885871` | 0 |

So the name match is **from the start of the name only** and it is **case sensitive**. A
search box where the user types in lower case finds nothing. The phone looks like an exact
match, not a prefix one, because dropping one character gives zero.

**2. A phone number with `+` returns 500**

```
GET /users/search?q=%2B8801700000001
```

```json
{
  "error": {
    "message": "Regular expression is invalid: quantifier does not follow a repeatable item",
    "code": 51091
  }
}
```

`q` is put into a regex without escaping and `+` is a regex character, so it breaks. The
`code` is a number here, everywhere else it is a string.

**3. Which means you can not search a `+` number at all**

This is the part that matters for the task. The task says the user searches by number.

- `+8801700000001` → 500
- `8801700000001` (same number, no `+`) → 0 results

i also tried to escape it from the client: `\+8801700000001` still gives 500, and
`[+]8801700000001` and `.8801700000001` both give 0. So there is no `q` i can send that
finds a user whose phone was saved with a `+`. Only numbers saved without a `+` are
findable, like `01750885871`.

Since login saves the phone exactly as typed, this decides how my app should register
people. i handle it in the client by searching on name as the main path, and by not
sending a raw `+` to this endpoint so it never 500s in front of the user.

**4. `q` is not required**

Calling it with no `q`, or with `q=`, returns 50 users with their phone numbers. The
swagger marks `q` as required. There is no `limit` parameter, and 50 looks like a hard cap.

**5. Your own account can come back in the results**, so the client filters it out.

### Conversations

#### `GET /conversations`

The sidebar list.

**Response** `200`

A direct one:

```json
{
  "data": [
    {
      "_id": "6a89186ee5d6aac97526699c",
      "type": "direct",
      "lastMessage": {
        "text": "filler 3",
        "sender": "6a891845e5d6aac9752667b0",
        "createdAt": "2026-08-22T03:34:56.723Z"
      },
      "updatedAt": "2026-08-22T03:34:56.957Z",
      "participant": {
        "_id": "6a891846e5d6aac9752667ca",
        "name": "Grace",
        "phone": "+17775402202"
      }
    }
  ]
}
```

A group one:

```json
{
  "_id": "6a89190ee5d6aac975267135",
  "type": "group",
  "lastMessage": { "text": "hello group", "sender": "...", "createdAt": "..." },
  "updatedAt": "2026-08-22T03:35:59.026Z",
  "name": "Renamed By Admin",
  "createdBy": "6a891845e5d6aac9752667b0",
  "admins": ["6a891845e5d6aac9752667b0"],
  "participants": [
    { "_id": "...", "name": "Ada", "phone": "+17775402201" },
    { "_id": "...", "name": "Margaret", "phone": "+17775402203" }
  ]
}
```

**Notes**

- `type` is `direct` or `group`, that part is clean.
- The keys that only exist on a group: `name`, `createdBy`, `admins`, `participants`.
  The key that only exists on a direct one: `participant`.
- So a direct conversation has **`participant`**, one object, and a group has
  **`participants`**, an array. Same idea, two names, so the client has to branch on
  `type` before it can read who is in the conversation. On the good side the direct one is
  already resolved to the other person, so i do not have to work out which participant is
  not me.
- A direct conversation has no `name`. The title is the other person's name.
- `lastMessage` is `{}`, an empty object, when the conversation has no messages yet. Not
  `null`, not missing. So a check like `if (c.lastMessage)` is true for an empty
  conversation and then `.text` is undefined.
- `lastMessage.sender` is only an id, so for a group preview i have to look the name up in
  `participants`.
- **There is no unread count anywhere.** So unread has to be done on the client, and it
  can not survive a refresh properly.
- Group entries inline every participant. In the shared database i saw one group with
  around 90 members and all of them are inside the conversation list response. One big
  group makes the sidebar request heavy.

#### `POST /conversations`

Start a one to one conversation.

**Request**

```json
{ "userId": "6a891846e5d6aac9752667ca" }
```

**Response** `200`

```json
{
  "_id": "6a89186ee5d6aac97526699c",
  "participants": ["6a891845e5d6aac9752667b0", "6a891846e5d6aac9752667ca"],
  "createdAt": "2026-08-22T03:33:02.624Z"
}
```

**Errors**

| Status | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | `userId` missing |
| 500 | `SERVER_ERROR` | `userId` is not an id format. `Cast to ObjectId failed ... for model "User"` |

**Notes**

1. It is idempotent. i called it twice with the same user and got the same `_id`, so it
   does not create duplicates. Good, the client does not need its own guard.

2. The shape is **not** the list shape. Here `participants` is an array of plain id
   strings and there is no `type`. In `GET /conversations` the same conversation has
   `type` and a populated `participant`. So i can not put this response straight into the
   sidebar cache, i have to refetch the list or build the object myself.

3. Sending my **own** id returned the conversation i already had with someone else,
   `_id: 6a89186ee5d6aac97526699c`, which is my chat with Grace. It did not error and it
   did not make a self chat. So passing a wrong id can silently hand you an unrelated
   conversation. In the client i never send my own id.

4. A bad id format is a `500`, not a `400`, and the message includes the mongoose model
   name.

#### `POST /conversations/group`

Make a group.

**Request**

| Field | Type | Required |
| --- | --- | --- |
| `name` | string | yes |
| `participantIds` | string[] | yes, at least 2 others |

```json
{ "name": "Postman Group", "participantIds": ["<idB>", "<idC>"] }
```

**Response** `201`

```json
{
  "_id": "6a89190ee5d6aac975267135",
  "type": "group",
  "name": "Postman Group",
  "createdBy": "6a891845e5d6aac9752667b0",
  "admins": ["6a891845e5d6aac9752667b0"],
  "participants": [
    { "_id": "...", "name": "Ada", "phone": "+17775402201" },
    { "_id": "...", "name": "Grace", "phone": "+17775402202" },
    { "_id": "...", "name": "Margaret", "phone": "+17775402203" }
  ],
  "createdAt": "2026-08-22T03:35:33.000Z",
  "updatedAt": "2026-08-22T03:35:33.000Z"
}
```

**Errors**

| Status | Code | Detail |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | `{ path: "name", message: "name is required" }` |
| 400 | `VALIDATION_ERROR` | `{ path: "participantIds", message: "a group needs at least 3 members" }` |

**Notes**

- The creator is added automatically and becomes the first admin. i sent 2 ids and got 3
  participants back.
- Duplicate ids are removed. i sent `[B, B, C]` and got 3 participants, not 4.
- This endpoint validates properly and returns `201`. `POST /messages` does neither. Same
  api, two standards.

#### `PATCH /conversations/{id}`

Rename a group. Admin only.

**Request**

```json
{ "name": "Renamed By Admin" }
```

**Response** `200` — the full updated conversation, so the client can use it directly.

**Errors**

| Status | Code | When |
| --- | --- | --- |
| 403 | `FORBIDDEN` | `"Only admins can rename the group"` |

### Messages

#### `GET /conversations/{id}/messages`

The history of one conversation.

**Request**

| Param | In | Type | Required |
| --- | --- | --- | --- |
| `id` | path | string | yes |
| `limit` | query | number | no, default 20 |
| `before` | query | message `_id` | no |

**Response** `200`

```json
{
  "messages": [
    {
      "_id": "6a8918e0e5d6aac975266f13",
      "conversation": "6a89186ee5d6aac97526699c",
      "sender": "6a891845e5d6aac9752667b0",
      "text": "filler 3",
      "createdAt": "2026-08-22T03:34:56.723Z"
    }
  ],
  "hasMore": false
}
```

**Errors**

| Status | Code | When |
| --- | --- | --- |
| 404 | `NOT_FOUND` | `"Conversation not found"` |
| 403 | `FORBIDDEN` | `"Not a participant of this conversation"` — a user who was removed |
| 500 | `SERVER_ERROR` | `before` is not an id format |

**Notes**

1. **The order is newest first.** A chat screen shows the oldest at the top, so i reverse
   the array before rendering.

2. **`before` is inclusive.** This is the one that is easy to miss. i asked for `limit=3`
   and got three ids, then asked again with `before=<the third id>` and the first item of
   page two was that same third message.

   ```
   page 1  ... , ... , 6a8918dee5d6aac975266ee4
   page 2  6a8918dee5d6aac975266ee4 , ... , ...
   ```

   So if i just append every page i get one duplicate message on every page break. In the
   client i drop the repeated item, and i also merge by `_id`, so a duplicate can not
   appear even if this gets fixed later.

3. `hasMore` exists, so i do not have to guess the end from a short page.

4. `limit` is ignored when it is not a sensible number. `limit=0`, `limit=-1` and
   `limit=abc` all returned the full list instead of erroring. So i can not trust `limit`
   to be validated, but the client only ever sends a fixed number anyway.

5. A bad `before` is a `500` and the message is
   `Cast to ObjectId failed for value "notanid" (type string) at path "_id" for model "Message"`.
   That should be a `400` and it should not tell the browser the model name.

#### `POST /messages`

Send a message. The same endpoint for direct and for group.

**Request**

| Field | Type | Required |
| --- | --- | --- |
| `conversationId` | string | yes |
| `text` | string | yes |

**Response** `200`

```json
{
  "_id": "6a8918d5e5d6aac975266e73",
  "conversation": "6a89186ee5d6aac97526699c",
  "sender": "6a891845e5d6aac9752667b0",
  "text": "message one from A",
  "createdAt": "2026-08-22T03:34:45.859Z"
}
```

**Notes**

1. The request field is `conversationId` and the response field is `conversation`. Same
   thing, two names.

2. **Empty text is accepted.** `{"text": ""}` returns `200` and saves an empty message.
   `"   "` is saved too, with the spaces. But leaving the field out completely gives a
   proper `400 VALIDATION_ERROR`. So it checks that the field exists and not what is in
   it. The task says empty messages should not be sendable, so that rule is fully mine on
   the client. i trim first, then disable the send button **and** block the Enter key,
   because disabling only the button still lets Enter through.

3. There is no maximum length. i sent 5000 characters and all 5000 came back.

4. **Sending to a conversation i am not in returns `null` with status `200`.**

   ```
   HTTP 200
   null
   ```

   No error and no status to check. A client doing `res._id` after this crashes on null.
   And it is inconsistent with the read side, because reading the same conversation gives
   a proper `404`. In my api layer i treat a null body as an error.

### Group management

#### `POST /conversations/{id}/participants`

Add members. Admin only.

**Request**

```json
{ "userIds": ["<idD>"] }
```

**Response** `200` — the full updated conversation.

**Errors** — `403 FORBIDDEN`, `"Only admins can add participants"`.

**Notes** — adding someone who is already a member does nothing, the count stays the same.
So it is safe to call twice.

#### `DELETE /conversations/{id}/participants/{userId}`

Remove a member. Passing my own id is how leaving works.

**Response** `200` — the full updated conversation.

**Notes**

- When user B left, B was removed from `participants` **and** from `admins`. So leaving
  demotes you at the same time, i do not have to clean that up.
- After being removed, that user gets `403 FORBIDDEN`, `"Not a participant of this
  conversation"`, when they try to read the history. So a user who has the chat open when
  they get removed will start getting 403s, and the ui has to handle that instead of
  showing a generic error.

#### `POST /conversations/{id}/admins`

Promote a member to admin. Admin only.

**Request**

```json
{ "userId": "<idB>" }
```

**Response** `200` — the conversation, with the new id appended to `admins`.

**Errors**

| Status | Code | When |
| --- | --- | --- |
| 400 | `NOT_A_GROUP` | Called on a direct conversation |
| 403 | `FORBIDDEN` | Caller is not an admin |

**Notes** — there is no endpoint to remove an admin, so promoting is one way only. i do
not show a demote action in the ui, because there is nothing behind it.

The group endpoints are the best part of this api. They validate, they use `403` with a
readable code, and they always return the whole updated conversation. The message and
search endpoints do not do any of that.

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

The socket is on the root of the host, not on `/api`. Socket.io serves itself at
`/socket.io/`.

```js
io("https://frontend-task-chatapp.onrender.com", { auth: { token } });
```

The token goes in the handshake. A missing or bad token is rejected.

### Events

| Direction | Event | Payload |
| --- | --- | --- |
| client → server | `message:send` | `{ conversationId, text }`, ack callback is optional |
| server → client | `message:new` | a new message for me |
| server → client | `conversation:updated` | a group i am in changed |

**Not tested yet.** Postman can not test socket.io properly, its websocket client speaks
plain websocket and socket.io has its own handshake on top. What is still open:

- does the sender also get his own `message:new` back
- what the ack of `message:send` returns
- does `message:new` fire for conversations that are not open right now
- is `conversation:updated` the whole conversation or a delta
- does the server replay anything after a reconnect

## Redesign notes

If it was my api i would change these. i did not change anything in the client, it works
against the api as it is.

| # | Now | i would do | Why |
| --- | --- | --- | --- |
| 1 | `q` goes into a regex unescaped | escape it, and match case insensitive and anywhere in the name | Right now the main feature, search by number, is broken |
| 2 | `POST /messages` with `conversationId` in the body | `POST /conversations/{id}/messages` | The read side is already like that |
| 3 | `POST /conversations` and `POST /conversations/group` | one `POST /conversations` with `{ type, participantIds, name? }` | Two endpoints for one resource makes the client branch |
| 4 | three different list shapes | one shape everywhere | Every list needs its own parser now |
| 5 | `participant` for direct, `participants` for group | always `participants` | Same idea should not have two names |
| 6 | sending to a conversation that is not mine gives `200 null` | `403`, like the read side already does | A null body with a success status is the worst case for a client |
| 7 | `before` is inclusive | make it exclusive | It causes a duplicate on every page break |
| 8 | bad id formats give `500` with the model name | `400` with a normal message | It is a client mistake and it leaks internals |
| 9 | no demote admin endpoint | add `DELETE /conversations/{id}/admins/{userId}` | Promote with no undo |
| 10 | `_id`, `conversation` | `id`, `conversationId` | Do not leak the database naming |
| 11 | no unread count | add one to `GET /conversations` | Every chat sidebar needs it and the client can not do it properly alone |

## Flows

**Login**

```
POST /auth/login   → token + user
GET  /auth/me      → check a saved token on app start
connect socket with the token
GET  /conversations
```

**First message to someone**

```
GET  /users/search?q=Grace     → pick a user, take _id
POST /conversations {userId}   → conversation _id (same one if it already exists)
POST /messages {conversationId, text}
```

**Opening a conversation**

```
GET /conversations/{id}/messages?limit=20     → newest 20, reverse them
scroll to top → GET ...?limit=20&before=<oldest _id>
              → drop the first item, it is the same message again
```

**Making a group**

```
GET  /users/search              → pick 2 or more people
POST /conversations/group       → 201, i am added and i am the admin
POST /messages                  → same endpoint as a direct message
```
