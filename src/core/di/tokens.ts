// Common DI tokens used across the app. Keep these stable (do not rename).
export const TOKENS = {
  Logger: Symbol('Logger'),
  Config: Symbol('Config'),
  StorageService: Symbol('StorageService'),
  EngineService: Symbol('EngineService'),
  NeuralIntegrationService: Symbol('NeuralIntegrationService'),
};

export type Tokens = typeof TOKENS;

export default TOKENS;
