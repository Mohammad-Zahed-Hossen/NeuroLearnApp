// Development teardown helper
// Calls common singletons' cleanup/dispose/stop methods to make HMR and tests cleaner
async function safeCall(obj: any, fnName: string) {
  try {
    if (!obj) return;
    const fn = obj[fnName];
    if (typeof fn === 'function') {
      const res = fn.apply(obj);
      if (res && typeof res.then === 'function') await res;
      console.log(`Called ${fnName} on ${obj?.constructor?.name || 'object'}`);
    }
  } catch (e) {
    console.warn(`Teardown: failed to call ${fnName}:`, e);
  }
}

async function runTeardown() {
  console.log('Running dev teardown...');

  // Import lazily so this file can be executed via ts-node or node (if compiled)
  try {
    // Use require() for compatibility with ts-node/node. Fail gracefully if modules aren't resolvable.
    function tryRequire(p: string) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
        return require(p);
      } catch (e) {
        try {
          // try with .ts
          // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
          return require(p + '.ts');
        } catch (e2) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
            return require(p + '.js');
          } catch (e3) {
            return null;
          }
        }
      }
    }

    const caModule: any = tryRequire('../services/ai/CognitiveAuraService');
    const csModule: any = tryRequire('../services/learning/CognitiveSoundscapeEngine');
    const physicsModule: any = tryRequire('../services/learning/NeuralPhysicsEngine');
    const hybridModule: any = tryRequire('../services/storage/HybridStorageService');
    const srModule: any = tryRequire('../services/learning/SpeedReadingService');
    const ctxModule: any = tryRequire('../services/ai/ContextSensorService');

    const CognitiveAuraService = caModule?.CognitiveAuraService || caModule?.default || caModule;
    const CognitiveSoundscapeEngine = csModule?.default || csModule;
    const neuralPhysicsEngineInstance = physicsModule?.default || physicsModule?.neuralPhysicsEngineInstance || physicsModule;
    const HybridStorageService = hybridModule?.default || hybridModule;
    const SpeedReadingService = srModule?.SpeedReadingService || srModule?.default || srModule;
    const ContextSensorService = ctxModule?.ContextSensorService || ctxModule?.default || ctxModule;

    // Cognitive Aura
    const cae = CognitiveAuraService?.getInstance ? CognitiveAuraService.getInstance() : null;
    await safeCall(cae, 'dispose');
    await safeCall(cae, 'stop');

    // Soundscape engine (default export is class instance)
    await safeCall(CognitiveSoundscapeEngine, 'dispose');
    await safeCall(CognitiveSoundscapeEngine, 'stop');

    // Physics engine (default export instance)
    await safeCall(neuralPhysicsEngineInstance, 'dispose');
    await safeCall(neuralPhysicsEngineInstance, 'stop');

    // Hybrid storage
    // HybridStorageService default export may be the class or an instance; handle both
    const hybrid: any = (typeof HybridStorageService === 'function' && (HybridStorageService as any).getInstance)
      ? (HybridStorageService as any).getInstance()
      : HybridStorageService;
    await safeCall(hybrid, 'stopMigrationLoop');
    await safeCall(hybrid, 'dispose');

    // SpeedReadingService
    const srs = SpeedReadingService?.getInstance ? SpeedReadingService.getInstance() : null;
    await safeCall(srs, 'cleanup');
    await safeCall(srs, 'dispose');
    await safeCall(srs, 'stop');

    // Context sensor
    const ctx = ContextSensorService?.getInstance ? ContextSensorService.getInstance() : null;
    await safeCall(ctx, 'stopMonitoring');
    await safeCall(ctx, 'dispose');

    // CognitiveAuraService may have called other disposers; let it run last
    console.log('Dev teardown complete');
  } catch (e) {
    console.error('Dev teardown failed:', e);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runTeardown().then(() => process.exit());
}

export default runTeardown;
