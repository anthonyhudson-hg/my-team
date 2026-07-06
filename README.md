# my-team

Chat with your local Claude Code subscription from a web dashboard, scoped to whatever repo you're working in. Dev-only — no API key required, no production code path.

It drives the official [`@anthropic-ai/claude-agent-sdk`](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk), which spawns your existing `claude` login/subscription. If you're logged in via `claude login`, it just works.

## Setup

In any repo:

```sh
npx @harborgroup/my-team init
```

This adds `@harborgroup/my-team` as a devDependency and an `npm run team` script.

## Usage

```sh
npm run team
```

Opens a local, token-protected dashboard in your browser (bound to `127.0.0.1` only). If Claude Code isn't installed or logged in yet, you'll see onboarding instructions instead.

Chat runs with this repo as Claude's working directory, and tool calls (file edits, shell commands) are auto-approved via Claude's own safety classifier (`permissionMode: 'auto'`) rather than prompted per action — there's no terminal in this flow to answer y/n prompts.

## Your AI CEO

The first time you run `npm run team` in a repo, Claude opens the conversation itself — it introduces itself and asks about your company (name, mission), what to call itself, and what personality it should have. Once it has answers, it writes `.my-team/profile.json` itself and adopts that identity from then on: not "an assistant with some context," but your company's AI CEO by name, on every chat turn (via a strong identity system prompt — weak "you're also helping company X" framing gets treated as low-trust incidental context and can get second-guessed; asserting it as configured identity doesn't).

**Commit `.my-team/profile.json`** — don't gitignore it. It's shared, non-sensitive team config, the same category as a checked-in `CLAUDE.md`: the whole point of it living per-repo is that teammates cloning the repo share the same CEO persona without re-onboarding. Use the "Edit profile" button on the dashboard to adjust the company name, mission, CEO name, or personality later; changes take effect on the next chat turn without restarting the server.

## Interface

An icon rail (Home / Messages / Profile / Settings) plus a Slack-style Messages page: a `#general` channel (placeholder for now) and a DM with your CEO, real token-by-token streaming (via the SDK's `includePartialMessages`), a typing indicator, and a status dot on the CEO's avatar reflecting connection state. It's plain static HTML/CSS/JS talking to the backend over local HTTP + SSE — no browser-only assumptions — so a future native (Tauri) shell can point at the same server without a rewrite; there's no Tauri wrapper yet.

## Model & effort

Set a default model and reasoning effort for your CEO on the Profile page (fetched live from the SDK's `supportedModels()` — the effort dropdown only ever offers levels the chosen model actually supports, e.g. Haiku offers none). Override either per message from a small selector above the chat input; each response shows a small badge with the model actually used.

## Updates

On startup, `my-team` checks the npm registry in the background for a newer published version. If one exists, a banner appears with an "Update" button that runs the install for you (`npm install --save-dev` the new version) — restart `npm run team` afterward to pick it up. No auto-restart; that's a deliberate simplicity/safety tradeoff over self-respawning the running server process.

## Logs

Every raw request sent to the Claude Agent SDK (including the exact system prompt) and every raw message it streams back is logged verbatim to a JSON-lines file, one per `npm run team` run, under `~/.my-team/logs/` (outside the repo — old runs beyond a retention count are pruned automatically). The current run's log path is printed on startup and shown on the Settings page.

## Status

v1.4: CLI-auth onboarding + conversational company/CEO-persona onboarding + Slack-style chat shell with real streaming + per-message model/effort selection + update checker + structured logging. No persisted chat history across restarts, no multi-user support, no `#general` backend (sidebar placeholder only).
