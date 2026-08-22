# yap — Chat App Take-Home

A real-time chat client built on the provided Chat API. One-to-one and group chats, live
delivery over Socket.IO, and a landing page. yap is the name, gen z for talking a lot, which
is what a chat app is for.

The three parts of the task:

- **Part 1** — the chat app, and the API documentation in [docs/api.md](docs/api.md).
- **Part 2** — the landing page.
- **Part 3** — the thought process write-up in [docs/write-up.md](docs/write-up.md).

## Live demos

Both parts are one deployment, different routes.

- Part 2 — landing page: `https://front-end-task-chatapp.vercel.app`
- Part 1 — chat app: `https://front-end-task-chatapp.vercel.app/login`

> **Trying the demo:** the API has no password, a phone number *is* the account, and the
> backend is shared by everyone testing it. If you type an obvious number like
> `+15551234567` you sign into a stranger's 188 conversations and it looks broken. It is
> not, it is the API working as designed. Use a number nobody else would pick, or tap "use
> an unused number" on the login screen. This is in the write-up in more detail.

## Tech stack

- **Next.js (app router) + typescript** — the framework, and types so the api's odd shapes
  are caught at build time not at runtime.
- **Tailwind CSS v4** — styling with design tokens as css variables, so light and dark and
  the one accent colour are defined in one place.
- **TanStack Query** — the one store for server data. The socket writes into it, every
  screen reads from it, so the sidebar and the open chat can not disagree.
- **socket.io-client** — the realtime connection, receiving only.
- **zod** — validating what comes back from the api at the boundary.
- **date-fns** — day dividers and message times without a big date library.
- **lucide-react** — icons. **motion** — the small animations on the landing.

## Getting started

Needs Node 18+ and pnpm.

```bash
pnpm install
cp .env.example .env.local   # the defaults already point at the live API
pnpm dev                     # http://localhost:3000
```

The demo API is on a free tier and sleeps when idle, so the very first request after a while
can take ten to fifteen seconds. That is the server waking up, not the app hanging.

## Environment variables

Both have working defaults in [.env.example](.env.example), you only change them if the API
moves.

| variable | what it is |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | REST base, **includes** `/api`. Every REST route is relative to this. |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO origin, the **root** of the server, **no** `/api`. |

The `/api` split matters, the REST routes live under `/api` but the socket and `/health` do
not. Getting this wrong is a silent connection failure. There is more on it in the docs.

## Scripts

| command | what it does |
| --- | --- |
| `pnpm dev` | run the dev server |
| `pnpm build` | production build |
| `pnpm start` | run the production build |
| `pnpm lint` | eslint |

## Project structure

```
app/                  routes, layouts, global css, the favicon (icon.svg)
  page.tsx            landing page (Part 2)
  login/              login screen
  chat/               the chat shell, sidebar + open conversation
components/
  chat/               message list, bubble, composer, sidebar
  conversations/      new chat, new group, group settings
  auth/               login form
  landing/            the live demo on the landing page
  brand/              the yap logo
hooks/                use-chat (socket + query), use-stick-to-bottom (auto scroll)
lib/
  api/                endpoints, the http client, error mapping
  normalize.ts        turns REST and socket shapes into one clean type
  auth.tsx            session, token in localStorage
  unread.ts           client side unread, since the api has no count
docs/                 api.md (Part 1) and write-up.md (Part 3)
```

## Routes

| route | what it is |
| --- | --- |
| `/` | landing page |
| `/login` | phone + name, no password |
| `/chat` | the app, sidebar with the empty state on the right |
| `/chat/[conversationId]` | an open conversation |

## Documentation

- [API documentation](docs/api.md) — Part 1, every endpoint tested in Postman with the real
  responses written down, because the given swagger documents the requests only.
- [Thought process write-up](docs/write-up.md) — Part 3, the architecture, the design
  reasoning, how i used ai, and a long honest list of the issues i hit with the api.

## Assumptions

The short version, the full reasoning is in the write-up.

- The phone is normalised on the client, the server stores it verbatim.
- Name search leads, phone search 500s on a `+`.
- Unread is per device, worked out in localStorage, the api has no unread count.
- The green dot means active recently, from the last message time, the socket has no
  presence events.
- A phone number is the whole account, so the login screen warns about the shared backend.

## Known limitations

- Unread does not follow you across devices, it is client side.
- No demote admin button, the api has no endpoint to remove an admin.
- The message list is not virtualised, a very long conversation renders every bubble.
- The reconnect recovery is tested by hand, not automated yet.
