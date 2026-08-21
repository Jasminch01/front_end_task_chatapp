# Part 3 — Thought Process Write-up

## Part 1 — architecture, libraries, trade-offs

## Part 2 — design reasoning

## How AI tools were used

## Any issues I ran into with the API

**`/health` is not under `api`.** the api documentation says the server uses `{baseurl}/api`. But `get/api/health` returns 404. The current endpoint is `{baseurl}/health` at the root of the server. it means the the `{baseurl/api}` is not universal for every endpoint.

## Assumptions

## What I'd do differently with more time
