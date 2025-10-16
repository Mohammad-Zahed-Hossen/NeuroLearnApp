/**
 * EngineHealthCheck - Utility to verify NeuroLearn Engine integration
 */

import EngineService from '../services/EngineService';

export interface HealthCheckResult {
  isHealthy: boolean;
  issues: string[];
  warnings: string[];
  engineStatus?: any;
}

export class EngineHealthCheck {
  public static async performHealthCheck(userId: string): Promise<HealthCheckResult> {
    const issues: string[] = [];
    const warnings: string[] = [];
    let engineStatus: any = null;

    try {
      const engineService = EngineService.getInstance();

      // Check if engine is initialized
      if (!engineService.isEngineInitialized()) {
        try {
          await engineService.initialize(userId);
        } catch (error) {
          issues.push(`Engine initialization failed: ${error instanceof Error ? error.message : String(error)}`);
          return { isHealthy: false, issues, warnings };
        }
      }

      // Get engine status
      try {
        engineStatus = engineService.getStatus();
        
        if (!engineStatus.isInitialized) {
          issues.push('Engine reports as not initialized');
        }

        if (engineStatus.overallHealth === 'critical') {
          issues.push('Engine health is critical');
        } else if (engineStatus.overallHealth === 'warning') {
          warnings.push('Engine health shows warnings');
        }

        // Check module status
        const moduleStatus = engineStatus.moduleStatus || {};
        Object.entries(moduleStatus).forEach(([module, status]) => {
          if (status === 'error') {
            issues.push(`Module ${module} is in error state`);
          } else if (status === 'disabled') {
            warnings.push(`Module ${module} is disabled`);
          }
        });

      } catch (error) {
        issues.push(`Failed to get engine status: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Test basic command execution
      try {
        await engineService.execute('system:status');
      } catch (error) {
        issues.push(`Basic command execution failed: ${error instanceof Error ? error.message : String(error)}`);
      }

    } catch (error) {
      issues.push(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      warnings,
      engineStatus
    };
  }

  public static async quickHealthCheck(): Promise<boolean> {
    try {
      const engineService = EngineService.getInstance();
      return engineService.isEngineInitialized();
    } catch {
      return false;
    }
  }
}

export default EngineHealthCheck;