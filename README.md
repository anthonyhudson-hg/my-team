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

The first time you run `npm run team` in a repo, Claude opens the conversation itself — it introduces itself and asks about you (your name), your company (name, mission), what to call itself, and what personality it should have. Once it has answers, it writes `.my-team/profile.json` itself and adopts that identity from then on: not "an assistant with some context," but your company's AI CEO by name, on every chat turn (via a strong identity system prompt — weak "you're also helping company X" framing gets treated as low-trust incidental context and can get second-guessed; asserting it as configured identity doesn't).

**Commit `.my-team/profile.json`** — don't gitignore it. It's shared, non-sensitive team config, the same category as a checked-in `CLAUDE.md`: the whole point of it living per-repo is that teammates cloning the repo share the same CEO persona without re-onboarding. Edit your name, company name, mission, CEO name, or personality any time from the Settings page; changes take effect on the next chat turn without restarting the server.

## Interface

A Slack-style shell: a primary rail (Home / Chats / Activity / Files), a sidebar with a `#general` channel and a DM with your AI CEO, real token-by-token streaming (via the SDK's `includePartialMessages`), a typing indicator, and a command palette (`⌘K`/`Ctrl+K`) for jumping anywhere. Fonts and icons are self-hosted (no CDN dependency — this is a local tool, it shouldn't need the internet to render its own chrome). It's plain static HTML/CSS/JS (native ES modules, no bundler, no build step) talking to the backend over local HTTP + SSE — no browser-only assumptions — so a future native (Tauri) shell could point at the same server without a rewrite; there's no Tauri wrapper today, and none is planned unless that changes.

`#general` has no multi-user backend (my-team is a single-developer tool) — it's a plain persisted notes channel (`.my-team/general-history.jsonl`) rather than a real team channel.

## Appearance

Settings has a theme (Contrast / Light / Dark) and accent color picker, applied live and persisted server-side to `.my-team/ui-prefs.json` — not browser `localStorage`, since the dashboard's port is randomized on every launch, which would otherwise reset the preference on every restart.

## Model & effort

Set a default model and reasoning effort for your CEO on the Settings page (fetched live from the SDK's `supportedModels()` — the effort dropdown only ever offers levels the chosen model actually supports, e.g. Haiku offers none). Override either per message from a small selector above the chat input; each response shows a small badge with the model actually used.

## Updates

On startup, `my-team` checks the npm registry in the background for a newer published version. If one exists, a banner appears with an "Update" button that runs the install for you (`npm install --save-dev` the new version) — restart `npm run team` afterward to pick it up. No auto-restart; that's a deliberate simplicity/safety tradeoff over self-respawning the running server process.

## Logs

Every raw request sent to the Claude Agent SDK (including the exact system prompt) and every raw message it streams back is logged verbatim to a JSON-lines file, one per `npm run team` run, under `~/.my-team/logs/` (outside the repo — old runs beyond a retention count are pruned automatically). The current run's log path is printed on startup and shown on the Settings page.

## Clarifying questions

When your CEO wants a structured answer rather than free text, it asks via a real inline widget — text input, single-select, or multi-select (with an automatic "Other" option) — instead of plain prose. This is a text convention the model follows (a fenced `question-widget` block the frontend parses out of the stream and replaces with an interactive card), not an MCP tool call: a real custom-tool + elicitation round trip was tested directly against the installed SDK and confirmed not to work yet (Claude Code's MCP-client role doesn't currently declare elicitation capability), so this achieves the same UX without that dependency. The main composer is disabled while a widget is awaiting an answer.

## Chat history

The visible conversation — not just Claude's own session context — is persisted to `.my-team/chat-history.jsonl` and replayed on load, so both a page reload and a full server restart show prior messages instead of starting over. A widget that was already answered replays locked to that answer; a widget left unanswered when the server stopped (e.g. it was killed mid-conversation) replays as a genuinely live, answerable widget, composer gating included, picking up exactly where things left off. Unlike `profile.json`, this file is gitignored automatically (it can contain arbitrary conversation content) — `init` sets this up, and a plain `npm run team` self-heals the `.gitignore` too, so upgrading an existing install doesn't require re-running `init`.

## Staying out of its own way

This dashboard is itself an ordinary Node process running inside the repo it manages. If your CEO ever needs to restart a dev server, broadly killing every node process (`taskkill /F /IM node.exe`, `killall node`) would take the dashboard down with it — so the system prompt explicitly warns against that and points at `.my-team/server.pid` (also gitignored) to identify and exclude the dashboard's own process. The server also logs and continues past uncaught exceptions rather than crashing the whole session.

## Files

The Files page is a real, working mini file browser and diff viewer scoped to the repo `my-team` is running in — not a placeholder. The tree, file icons, and change badges (M/A/D/R/U) come from `git ls-files`/`git status` (falling back to a plain directory walk if the repo isn't a git checkout); opening a changed file shows its actual `git diff`, and opening an unchanged file shows its real content with basic syntax highlighting (a small hand-rolled tokenizer — no external highlighting library). The branch name, ahead/behind counts, and change count in the header are all live, re-fetched on every visit (and via the refresh button) so edits made mid-conversation — including ones your CEO makes through tool calls — show up without restarting the server.

## Resetting

The Settings page has a "Reset to factory settings" button (behind a confirmation step) that deletes `.my-team/profile.json` and `.my-team/chat-history.jsonl` and drops the resumed Claude session, so the very next message starts fresh onboarding — no restart needed, no leftover context from the old profile.

## Testing

`npm test` runs the Vitest suite for the frontend's pure logic (streaming-response parser, chat-history replay/timeline reconstruction, checklist derivation, the tiny state store) — DOM rendering and the backend's HTTP layer are covered by manual/browser verification, not automated tests, at this stage.

## Status

v2.1: CLI-auth onboarding + conversational founder/company/CEO-persona onboarding + full Slack-style shell (rail, sidebar, command palette, theming) with real streaming + per-message model/effort selection + a real Files mini-IDE (live git tree/status/diffs/content) + update checker + structured logging + inline clarifying-question widgets + persisted chat & `#general` history + dev-server-restart safety guardrail + factory reset. No multi-user support; `#general` is a single-participant notes channel, not a real team channel; Activity is still an empty-state placeholder with no backend.
