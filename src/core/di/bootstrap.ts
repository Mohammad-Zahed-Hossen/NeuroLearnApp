import Container from './Container';
import TOKENS from './tokens';

// Minimal logger interface for examples
export type Logger = {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

export function createDefaultContainer(overrides?: Partial<Record<keyof typeof TOKENS, any>>) {
  const container = new Container();

  // default logger
  const defaultLogger: Logger = console;
  container.register(TOKENS.Logger, { useValue: defaultLogger });

  // default config
  const defaultConfig = { env: process.env.NODE_ENV || 'development' };
  container.register(TOKENS.Config, { useValue: defaultConfig });

  // allow caller to override common tokens
  if (overrides) {
    for (const key of Object.keys(overrides) as Array<keyof typeof TOKENS>) {
      const token = (TOKENS as any)[key];
      if (token) container.register(token, { useValue: overrides[key] });
    }
  }

  return container;
}

export default createDefaultContainer;
