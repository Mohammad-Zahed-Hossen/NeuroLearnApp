// jest.performance-teardown.js
module.exports = async () => {
  // Global teardown for performance tests
  console.log('Tearing down performance monitoring...');

  if (global.performanceData) {
    const endTime = process.hrtime.bigint();
    const totalTime = Number(endTime - global.performanceData.startTime) / 1e6; // Convert to milliseconds
    const finalMemory = process.memoryUsage();

    console.log(`Total test suite execution time: ${totalTime.toFixed(2)}ms`);
    console.log(`Memory usage - RSS: ${(finalMemory.rss / 1024 / 1024).toFixed(2)}MB, Heap Used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  }
};
