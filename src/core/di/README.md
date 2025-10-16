# Dependency Injection (DI) Container

This folder contains a lightweight DI container used for wiring simple services during app bootstrap and tests.

Files:

Usage example:

````ts
## Dependency Injection (DI) Container

This folder contains a lightweight DI container used for wiring simple services during app bootstrap and tests.

Files:

- `Container.ts` - Simple container with register/resolve and singleton caching.
- `tokens.ts` - Common shared tokens used across the app.
- `bootstrap.ts` - Helper to create a default container with common providers.

Usage example:

```ts
import { createDefaultContainer } from './core/di/bootstrap';
import TOKENS from './core/di/tokens';

const container = createDefaultContainer();
const logger = container.resolve(TOKENS.Logger);
logger.log('DI container ready');
````
