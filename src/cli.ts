#!/usr/bin/env node
import { runInit } from './init.js';
import { startServer } from './server/start.js';

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.error('Cofound is a dev-only tool and refuses to run with NODE_ENV=production.');
    process.exitCode = 1;
    return;
  }

  const [, , command] = process.argv;
  if (command === 'init') {
    await runInit(process.cwd());
  } else {
    await startServer(process.cwd());
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
