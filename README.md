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

## Status

v1: onboarding + a single chat session per launch. No persisted chat history, no multi-user support.
