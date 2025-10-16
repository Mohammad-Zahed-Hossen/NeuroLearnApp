/**
 * EngineIntegrationTest - Simple test to verify engine integration
 */

import EngineService from '../services/EngineService';

export class EngineIntegrationTest {
  public static async runBasicTest(): Promise<{
    success: boolean;
    results: string[];
    errors: string[];
  }> {
    const results: string[] = [];
    const errors: string[] = [];

    try {
      results.push('Starting NeuroLearn Engine integration test...');

      // Test 1: Engine Service Creation
      try {
        const engineService = EngineService.getInstance();
        results.push('✅ Engine service instance created');
      } catch (error) {
        errors.push(`❌ Engine service creation failed: ${error}`);
        return { success: false, results, errors };
      }

      // Test 2: Engine Initialization
      try {
        const engineService = EngineService.getInstance();
        await engineService.initialize('test_user');
        results.push('✅ Engine initialized successfully');
      } catch (error) {
        errors.push(`❌ Engine initialization failed: ${error}`);
        return { success: false, results, errors };
      }

      // Test 3: Basic Command Execution
      try {
        const engineService = EngineService.getInstance();
        const status = await engineService.execute('system:status');
        results.push('✅ Basic command execution works');
        results.push(`   Status: ${JSON.stringify(status, null, 2)}`);
      } catch (error) {
        errors.push(`❌ Command execution failed: ${error}`);
      }

      // Test 4: Engine Status Check
      try {
        const engineService = EngineService.getInstance();
        const status = engineService.getStatus();
        results.push('✅ Engine status retrieval works');
        results.push(`   Health: ${status.overallHealth}`);
        results.push(`   Initialized: ${status.isInitialized}`);
        results.push(`   Active Operations: ${status.activeOperations}`);
      } catch (error) {
        errors.push(`❌ Status check failed: ${error}`);
      }

      // Test 5: Module Status Check
      try {
        const engineService = EngineService.getInstance();
        const status = engineService.getStatus();
        const moduleCount = Object.keys(status.moduleStatus || {}).length;
        results.push(`✅ Found ${moduleCount} modules`);
        
        Object.entries(status.moduleStatus || {}).forEach(([module, moduleStatus]) => {
          results.push(`   ${module}: ${moduleStatus}`);
        });
      } catch (error) {
        errors.push(`❌ Module status check failed: ${error}`);
      }

      results.push('Integration test completed');
      return { success: errors.length === 0, results, errors };

    } catch (error) {
      errors.push(`❌ Test execution failed: ${error}`);
      return { success: false, results, errors };
    }
  }

  public static async runQuickTest(): Promise<boolean> {
    try {
      const engineService = EngineService.getInstance();
      
      if (!engineService.isEngineInitialized()) {
        await engineService.initialize('test_user');
      }
      
      await engineService.execute('system:status');
      return true;
    } catch {
      return false;
    }
  }
}

export default EngineIntegrationTest;