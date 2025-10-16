// Lightweight TypeScript dependency injection container
export type Token<T = any> = string | symbol;

type Provider<T = any> = {
  useFactory?: (container: Container) => T;
  useValue?: T;
};

export class Container {
  private providers = new Map<Token, Provider>();
  private cache = new Map<Token, any>();

  register<T = any>(token: Token<T>, provider: Provider<T>) {
    if (!provider || (provider.useFactory === undefined && provider.useValue === undefined)) {
      throw new Error('Provider must have either useFactory or useValue');
    }
    this.providers.set(token, provider as Provider);
  }

  has(token: Token) {
    return this.providers.has(token);
  }

  resolve<T = any>(token: Token<T>): T {
    if (this.cache.has(token)) return this.cache.get(token);

    const provider = this.providers.get(token);
    if (!provider) {
      throw new Error(`No provider registered for token: ${String(token)}`);
    }

    let instance: T;
    if (provider.useValue !== undefined) {
      instance = provider.useValue as T;
    } else if (provider.useFactory) {
      instance = provider.useFactory(this);
    } else {
      throw new Error('Provider must have useValue or useFactory');
    }

    // Cache factory results to act as singletons by default
    this.cache.set(token, instance);
    return instance;
  }

  clear() {
    this.providers.clear();
    this.cache.clear();
  }
}

export default Container;
