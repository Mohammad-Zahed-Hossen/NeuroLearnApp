// Simple test to verify circular dependency is fixed
console.log('Testing circular dependency fix...');

try {
  // This should not cause stack overflow anymore
  const StorageService = require('./src/services/StorageService.ts');
  const HybridStorageService = require('./src/services/HybridStorageService.ts');
  
  console.log('✅ StorageService imported successfully');
  console.log('✅ HybridStorageService imported successfully');
  
  // Try to get instances
  const storage = StorageService.StorageService.getInstance();
  const hybrid = HybridStorageService.HybridStorageService.getInstance();
  
  console.log('✅ StorageService instance created successfully');
  console.log('✅ HybridStorageService instance created successfully');
  
  console.log('🎉 CIRCULAR DEPENDENCY FIXED!');
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack trace:', error.stack);
}