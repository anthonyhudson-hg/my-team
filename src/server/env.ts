/**
 * Claude Code refuses to start when it detects it's already running inside
 * another Claude Code session. Strip those markers so `cofound` still works
 * when launched from a terminal that's itself inside a `claude` session.
 */
export function sanitizeEnv(base: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env = { ...base };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  delete env.CLAUDE_CODE_SESSION;
  return env;
}
