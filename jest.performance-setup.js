// jest.performance-setup.js
module.exports = async () => {
  // Global setup for performance tests
  console.log('Setting up performance monitoring for tests...');

  // Initialize performance monitoring
  global.performanceData = {
    startTime: process.hrtime.bigint(),
    memoryUsage: process.memoryUsage(),
  };

  // Set up performance observer if available
  if (typeof PerformanceObserver !== 'undefined') {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        console.log(`Performance: ${entry.name} - ${entry.duration}ms`);
      });
    });
    observer.observe({ entryTypes: ['measure'] });
  }
};
