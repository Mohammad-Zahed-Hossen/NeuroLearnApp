# Dev teardown helper

This module provides a small utility to call cleanup/dispose/stop methods on long-lived singletons
used during development. It's useful for Hot Module Reloading and for tests that need a clean
environment between runs.

Usage:

- Run via ts-node from the repo root:

  npx ts-node src/dev/devTeardown.ts

Or use the npm script added to package.json:

npm run dev:teardown

The script attempts to call common methods like `dispose`, `stop`, `cleanup`, and `stopMonitoring`.
It is intentionally defensive and will log but not throw on missing methods.

TODO: npm run dev:teardown
