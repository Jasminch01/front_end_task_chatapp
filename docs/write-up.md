# Part 3 — Thought Process Write-up

## Part 1 — architecture, libraries, trade-offs

The app is Next.js with the app router, typescript and tailwind. The interesting part is
not the framework, it is where the realtime data lives.

i used TanStack Query as the one place that holds the server data. The reason is realtime.
A chat has two ways new data arrives, the first fetch and then the socket, and they both
have to end up in the same list or the ui shows two different truths. So i made the socket
the writer and the query cache the store. When a `message:new` comes in i write it into the
cache for that conversation, and every screen that reads from the cache updates on its own.
i did not want each component keeping its own copy of the messages and trying to stay in
sync, that is where the bugs come from.

Everything gets normalised at the api boundary before the app sees it, in
[lib/normalize.ts](../lib/normalize.ts). This is because the same data has different shapes
over REST and over the socket, `_id` vs `id`, an ISO string vs an epoch number, `participant`
vs `participants`, and i did not want that mess spread across the whole app. One function
turns all of it into a single `Message` and `Conversation` type, and the rest of the code
only ever sees the clean shape. i wrote about the exact differences in the issues section
below.

i send messages with `POST /messages`, not over the socket, even though it is a socket app.
The socket send ack is only `{ok: true}`, no id and no timestamp, so if i send over the
socket i can not match the message i sent to the one that got stored. REST gives me the
created message back. The socket is only for receiving. A side benefit is that sending still
works when the socket is down.

Sending is optimistic. i show the message the moment you press enter with a temporary id,
then when the real one comes back i swap it in, and if it fails i keep it and mark it so you
can retry. The trade-off of this whole setup is that TanStack Query is one more dependency
and the cache is easy to get wrong, if i write into the wrong key i get a stale list that
looks fine until you switch conversations. i decided that is worth it because doing the
realtime merge by hand would be harder to keep correct.

## Part 2 — design reasoning

i did not want it to look like a default template. So the background is a warm off white,
not pure white, the text is a near black not `#000`, and there is one purple accent that
does all the work, the send button, the unread dot, the focus ring and the outgoing bubble.
One accent used everywhere reads as a decision, five colours read as no decision.

For type i used three fonts with a job each. Bricolage Grotesque for the headings because it
has some character, Plus Jakarta Sans for the body because it is clean and easy to read at
small sizes, and JetBrains Mono for phone numbers and ids so the digits line up and do not
jump around as they change.

One small thing i am a bit proud of, the outgoing bubble colour is a separate token from the
accent. A fill has to be dark enough to carry white text, but the accent is also used as
text on a dark background where it has to be light. One value can not be both, so i split
them and measured the contrast so the white text on the bubble passes (6.3:1). It is the
kind of thing nobody notices unless it is wrong.

The live demo on the landing page is not a screenshot and not a fake, it is the real
`MessageBubble` component running a scripted conversation, and you can type in it. i did it
that way so the landing page can not drift away from what the actual app looks like, if i
restyle a bubble the demo restyles with it.

The name is yap. i wanted something short, and yap is what the app is for, talking
a lot. The logo is a speech bubble with a typing dots inside, and the same drawing is the
favicon.

## How AI tools were used

i want to be honest about this because the task asks for it.

i used Claude Code, which is an ai agent, as the main tool for this project. i did not write
most of the implementation code line by line myself, the ai wrote it while i directed what
to build, reviewed it, and told it what to change.

The parts that are mine and not the ai's, the thinking mostly. i read the task and decided
the order to do it in. i tested every api endpoint myself in Postman, one at a time in order,
and wrote down the real responses, and the whole issues section above and the api.md are in
my own words because the ai english did not sound like me and i wanted the docs to be mine.
The product decisions are mine too, the continuous live demo on the landing, the name, the
white bubble text, the sidebar layout, wanting the chat to be full screen with each panel
scrolling on its own.


So the short version, the ai did the typing and a lot of the testing, i did the testing of
the api, the decisions and the review. i checked everything before i kept it.

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

These are the places where the api did not decide for me, so i decided.

- The phone number is normalised on the client, spaces and punctuation stripped, before it
  is sent, because the server stores whatever you type exactly as is. Otherwise the same
  person typing their number two slightly different ways ends up as two accounts.
- Name search leads in the ui, phone search is second, because phone search 500s on a `+`
  and the swagger's own example number has a `+`. i never send a raw `+` to the server.
- Unread is per device. The api has no unread count, so i remember the last time you opened
  each conversation in this browser's localStorage and compare it to the last message. It
  can not follow you to another device, and a server side count would fix that, it is the
  first thing i would want added.
- The green dot means active recently, not online. There are no presence events on the
  socket, so i work it out from the last message time, last five minutes. A real online dot
  would be invented, not observed, so i did not pretend to have one.
- A phone number is the whole account and there is no password, and the backend is shared by
  everyone trying the demo. i treated that as a real risk, not a footnote, so the login
  screen says it plainly and there is a "use an unused number" button, otherwise a reviewer
  types an obvious number and lands in a stranger's 188 conversations and thinks the app is
  broken.

## What I'd do differently with more time

Roughly in the order i would pick them up.

- Automate the reconnect test. Right now i tested the socket dropping and coming back by
  hand with two clients. i would make that a two tab playwright test that runs on its own,
  because it is the part most likely to break quietly later.
- Server side unread, so the count is real and survives a refresh and a second device,
  instead of the client side guess i have now.
- Virtualise the message list. A conversation with thousands of messages renders every
  bubble right now. It is fine at demo size but it would get heavy, so i would only render
  what is on screen.
- A demote admin flow, once the api has an endpoint for it. Promoting is one way only today
  because there is no remove admin route, which is why my ui has no demote button. That one
  is not on me, it is a limit of the api.
- Surface server errors a bit better in a few spots, and decide on a max message length,
  since the server has none.
