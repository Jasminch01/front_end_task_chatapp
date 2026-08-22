# Part 3 — Thought Process Write-up

## Part 1 — architecture, libraries, trade-offs

## Part 2 — design reasoning

## How AI tools were used

## Any issues I ran into with the API

Before writing any code i went through every endpoint in Postman and wrote the real
responses down, because the given swagger documents the requests only and says the
responses are not specified. I've put all of the actual responses in [api.md](api.md).

**Searching by phone number does not work at all.** This is the worst one because the task
needs it. `GET /users/search?q=+8801700000001` returns `500` with
`Regular expression is invalid: quantifier does not follow a repeatable item`. The `q`
goes into a regex without escaping and `+` is a regex character. So i tried the same
number without the `+` and got 0 results, because the phone side looks like an exact
match. i also tried escaping it from the client, `\+880...` still 500s, `[+]880...` and
`.880...` both give 0. So there is no value of `q` that finds a user whose phone was saved
with a `+`, and the swagger's own example number is `+15551234567`. Only numbers stored
without a `+`, like `01750885871`, can be found. Two more things about this endpoint while
i was there: the name match is case sensitive and only matches from the start, so `Gra`
finds Grace but `gra` and `race` find nothing, and `q` is not actually required even
though the swagger marks it as required, calling it with no `q` returns 50 users with
their phone numbers. In the client i lead with name search, i never send a raw `+`, and i
show an empty state instead of letting a 500 reach the user.

**Anyone can log in as anyone, and rename them.** There is no password, which the task
says is intended, but i sent an existing phone with a different name and got back the same
user `_id` with the name changed to what i sent. So typing someone's number gives you a
valid token for their account and also overwrites their display name. On top of that the
phone is never normalised, i sent `"  0155 900 540220 "` with the spaces and it was stored
exactly like that, so the same person typing their number slightly differently ends up
with two accounts.

**Empty messages are accepted by the server.** `POST /messages` with `{"text": ""}`
returns `200` and saves it. `"   "` saves too. But leaving `text` out completely does give
a proper `400`, so it checks the field exists and not what is inside it. The task says
empty messages must not be sendable, so that rule is fully on the client. i trim first,
then disable the send button and also block the Enter key, because disabling only the
button still lets Enter through.

**Sending to a conversation that is not mine returns `null` with status `200`.** No error,
no status to check, the body is literally `null`. A client that reads `res._id` after that
crashes. It is also inconsistent with the read side, because reading that same
conversation gives a clean `404 NOT_FOUND`. So the same permission problem is a `404` when
you read and a silent success when you write. My api layer treats a null body as an error.

**The `before` cursor is inclusive.** i asked for `limit=3`, then asked again with
`before=<the third id>`, and the first message of page two was that same third message. So
paging by appending gives one duplicate on every page break. i drop the repeated item and
i also merge by `_id`, so a duplicate can not show up even if this gets fixed later. While
testing pagination i also found that `limit=0`, `limit=-1` and `limit=abc` are all ignored
and return the whole list, and that a `before` that is not an id format gives a `500`
containing `Cast to ObjectId failed ... for model "Message"`, which is a client mistake
being reported as a server fault and leaking the model name.

**No token gives `400`, a bad token gives `401`.** Two different statuses for the same
kind of failure. The usual pattern is one interceptor that logs the user out on `401`, and
with a missing token that interceptor never fires, so the app would sit half logged in.
i key the logout off `error.code` instead of the status.

**The three list endpoints have three different shapes.** `GET /users/search` is a bare
array, `GET /conversations` is `{ data: [...] }`, and the message history is
`{ messages: [...], hasMore }`. So each list needs its own parser instead of one shared
one.

**Direct and group conversations use different field names.** A direct one has
`participant`, a single object, and a group has `participants`, an array. Same idea, two
names, so the client has to check `type` before it can read who is in the conversation.
There is also no unread count anywhere in the list, so unread has to be worked out on the
client and it can not survive a refresh properly, and `lastMessage` is an empty object
`{}` for a conversation with no messages, so `if (c.lastMessage)` is true and `.text` is
undefined.

**`/health` is not under `api`.** the api documentation says the server uses `{baseurl}/api`. But `get/api/health` returns 404. The current endpoint is `{baseurl}/health` at the root of the server. it means the the `{baseurl/api}` is not universal for every endpoint.

**Smaller things.** History comes back newest first, so i reverse it before rendering.
`POST /conversations` with my own id returned an unrelated conversation i already had,
instead of erroring. A bad id format is a `500` there too. `POST /auth/login` returns
`200` even when it creates a user while `POST /conversations/group` returns `201`. The
request field is `conversationId` but the response field is `conversation`. There is no
maximum message length, 5000 characters went through untouched. Ids are `_id`, straight
from mongo. And there is no endpoint to remove an admin, so promoting someone is one way
only, which is why my ui has no demote button.

**To be fair, the group endpoints are good.** They validate with a `details` array that
says which field failed, they use `403 FORBIDDEN` with a readable code for non admins,
duplicate participant ids are removed, adding the same person twice does nothing, and
leaving a group also removes you from `admins`. Every one of them returns the whole
updated conversation so the client can use the response directly. If the rest of the api
behaved like this section there would be almost nothing on this list.

**The same message has two different shapes depending on how it reaches you.** Postman can
not test socket.io, so i wrote a small node script with `socket.io-client` and connected
three users at once. Over REST a message is `{"_id": "...", "createdAt":
"2026-08-22T04:06:45.319Z"}`. The exact same message over the socket is `{"id": "...",
"createdAt": 1787371605319}`. Different id field, and a number instead of an ISO string.
That quietly breaks the two things a chat list does most: merging by `_id` does nothing
for a socket message because it has no `_id`, and sorting by `createdAt` ends up comparing
a string with a number. i normalise every message at the api boundary, `id ?? _id` and
`createdAt` always turned into a Date, before anything else in the app sees it. To make it
worse the other event, `conversation:updated`, uses `_id` again, so the two events do not
even agree with each other.

**Sending over the socket tells you nothing.** The `message:send` ack is `{ok: true}`, no
id and no timestamp, and the sender does not receive their own `message:new` either, i
confirmed that with two clients connected. So if i send over the socket i have no way to
match the message i sent to the message that was stored. That is why i send with
`POST /messages`, which returns the created message, and use the socket only for
receiving. It also means sending still works when the socket is down.

**A reconnect loses messages silently.** i disconnected one client, sent a message from
another, then reconnected, and the reconnected client received nothing. The client that
stayed connected got it normally. Nothing is replayed and there is no `since` parameter to
catch up with. So when the socket comes back i refetch the open conversation and the
conversation list and merge them, otherwise the user is just missing messages with no sign
anything went wrong. This is the part that separates realtime that works in a demo from
realtime that survives a laptop lid closing.

One good thing on this side: events are per user, not per conversation. There is no join
or subscribe call, and i still received `message:new` for a group nobody had opened. So a
single socket gives me everything i am a member of, and the sidebar and the open chat can
update from the same event.

## Assumptions

## What I'd do differently with more time
