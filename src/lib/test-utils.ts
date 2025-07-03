// Test utilities for library API endpoints and performance validation

export interface TestResult {
  success: boolean;
  message: string;
  duration?: number;
  data?: any;
  error?: string;
}

export interface PerformanceMetrics {
  responseTime: number;
  queriesExecuted: number;
  cacheHit: boolean;
  dataSize: number;
}

// API endpoint testing utility
export async function testApiEndpoint(
  endpoint: string, 
  expectedFields: string[] = [],
  timeout: number = 5000
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      return {
        success: false,
        message: `HTTP ${response.status}: ${response.statusText}`,
        duration,
        error: `Failed to fetch ${endpoint}`
      };
    }
    
    const data = await response.json();
    
    // Validate expected fields
    const missingFields = expectedFields.filter(field => 
      !hasNestedProperty(data, field)
    );
    
    if (missingFields.length > 0) {
      return {
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        duration,
        data
      };
    }
    
    return {
      success: true,
      message: `API endpoint responded successfully in ${duration}ms`,
      duration,
      data
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      message: `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Performance validation utility
export function validatePerformance(
  metrics: PerformanceMetrics,
  thresholds: {
    maxResponseTime?: number;
    maxQueries?: number;
    minCacheHitRate?: number;
  } = {}
): TestResult {
  const issues: string[] = [];
  
  // Default thresholds
  const maxResponseTime = thresholds.maxResponseTime || 2000; // 2 seconds
  const maxQueries = thresholds.maxQueries || 10;
  const minCacheHitRate = thresholds.minCacheHitRate || 0.5; // 50%
  
  if (metrics.responseTime > maxResponseTime) {
    issues.push(`Response time (${metrics.responseTime}ms) exceeds threshold (${maxResponseTime}ms)`);
  }
  
  if (metrics.queriesExecuted > maxQueries) {
    issues.push(`Query count (${metrics.queriesExecuted}) exceeds threshold (${maxQueries})`);
  }
  
  if (!metrics.cacheHit && metrics.dataSize > 1000) {
    issues.push(`Large response (${metrics.dataSize} bytes) not served from cache`);
  }
  
  return {
    success: issues.length === 0,
    message: issues.length === 0 
      ? `Performance metrics within acceptable thresholds`
      : `Performance issues: ${issues.join('; ')}`,
    data: metrics
  };
}

// Data consistency validation
export function validateDataConsistency(data: any): TestResult {
  const issues: string[] = [];
  
  try {
    // Validate statistics consistency
    if (data.stats) {
      const stats = data.stats;
      
      // Completion rate should match calculated value
      if (stats.totalConcepts > 0) {
        const expectedCompletionRate = Math.round((stats.completedConcepts / stats.totalConcepts) * 100);
        if (Math.abs(stats.completionRate - expectedCompletionRate) > 1) {
          issues.push(`Completion rate mismatch: expected ~${expectedCompletionRate}%, got ${stats.completionRate}%`);
        }
      }
      
      // Progress to next level should be between 0-100
      if (stats.progressToNext < 0 || stats.progressToNext > 100) {
        issues.push(`Invalid progress to next level: ${stats.progressToNext}%`);
      }
      
      // Current level should be valid
      if (stats.currentLevel < 1 || stats.currentLevel > 6) {
        issues.push(`Invalid current level: ${stats.currentLevel}`);
      }
    }
    
    // Validate achievements
    if (data.achievements) {
      Object.values(data.achievements).forEach((categoryAchievements: any) => {
        if (Array.isArray(categoryAchievements)) {
          categoryAchievements.forEach((achievement: any) => {
            if (achievement.earned && !achievement.earnedAt) {
              issues.push(`Earned achievement ${achievement.id} missing earnedAt timestamp`);
            }
            if (achievement.progress < 0 || achievement.progress > 100) {
              issues.push(`Invalid progress for achievement ${achievement.id}: ${achievement.progress}%`);
            }
          });
        }
      });
    }
    
    // Validate category grid
    if (data.categoryGrid && Array.isArray(data.categoryGrid)) {
      data.categoryGrid.forEach((category: any, index: number) => {
        if (!category.id || !category.name) {
          issues.push(`Category at index ${index} missing required fields`);
        }
        if (category.completionRate < 0 || category.completionRate > 100) {
          issues.push(`Invalid completion rate for category ${category.name}: ${category.completionRate}%`);
        }
      });
    }
    
    return {
      success: issues.length === 0,
      message: issues.length === 0 
        ? 'Data consistency validation passed'
        : `Data consistency issues: ${issues.join('; ')}`,
      data: { issuesFound: issues.length, issues }
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Data validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Comprehensive library API test suite
export async function runLibraryApiTestSuite(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  console.log('🧪 Starting Library API Test Suite...');
  
  // Test 1: Library Overview API
  console.log('📊 Testing Library Overview API...');
  const overviewResult = await testApiEndpoint(
    '/api/library/overview',
    ['stats', 'categoryGrid', 'recentActivity', 'achievements']
  );
  results.push({
    ...overviewResult,
    message: `Overview API: ${overviewResult.message}`
  });
  
  if (overviewResult.success && overviewResult.data) {
    // Validate performance
    if (overviewResult.data.performance) {
      const perfResult = validatePerformance(overviewResult.data.performance);
      results.push({
        ...perfResult,
        message: `Overview Performance: ${perfResult.message}`
      });
    }
    
    // Validate data consistency
    const consistencyResult = validateDataConsistency(overviewResult.data);
    results.push({
      ...consistencyResult,
      message: `Overview Data Consistency: ${consistencyResult.message}`
    });
  }
  
  // Test 2: User Stats API
  console.log('📈 Testing User Stats API...');
  const statsResult = await testApiEndpoint(
    '/api/library/user/stats',
    ['overview', 'streaks', 'velocity', 'efficiency', 'activity']
  );
  results.push({
    ...statsResult,
    message: `User Stats API: ${statsResult.message}`
  });
  
  // Test 3: Achievements API
  console.log('🏆 Testing Achievements API...');
  const achievementsResult = await testApiEndpoint(
    '/api/library/user/achievements',
    ['summary', 'achievements', 'recentlyEarned', 'stats']
  );
  results.push({
    ...achievementsResult,
    message: `Achievements API: ${achievementsResult.message}`
  });
  
  // Test 4: Response Time Analysis
  console.log('⚡ Analyzing Response Times...');
  const responseTimes = results
    .filter(r => r.duration !== undefined)
    .map(r => r.duration!);
    
  if (responseTimes.length > 0) {
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    
    results.push({
      success: avgResponseTime < 1500 && maxResponseTime < 3000,
      message: `Response Time Analysis: Avg ${Math.round(avgResponseTime)}ms, Max ${maxResponseTime}ms`,
      data: {
        average: Math.round(avgResponseTime),
        maximum: maxResponseTime,
        count: responseTimes.length
      }
    });
  }
  
  console.log('✅ Library API Test Suite Complete');
  return results;
}

// Large dataset simulation for testing
export function generateMockLargeDataset(size: 'small' | 'medium' | 'large' = 'medium') {
  const sizes = {
    small: { concepts: 50, sessions: 5, categories: 10 },
    medium: { concepts: 500, sessions: 25, categories: 25 },
    large: { concepts: 2000, sessions: 100, categories: 50 }
  };
  
  const config = sizes[size];
  
  return {
    concepts: Array.from({ length: config.concepts }, (_, i) => ({
      id: `concept-${i}`,
      name: `Test Concept ${i + 1}`,
      isCompleted: Math.random() > 0.3,
      updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    })),
    sessions: Array.from({ length: config.sessions }, (_, i) => ({
      id: `session-${i}`,
      topic: `Test Topic ${i + 1}`,
      completionRate: Math.floor(Math.random() * 101),
      subjectCategoryId: `cat-${Math.floor(Math.random() * config.categories)}`
    })),
    categories: Array.from({ length: config.categories }, (_, i) => ({
      id: `cat-${i}`,
      name: `Category ${i + 1}`,
      description: `Test category description ${i + 1}`
    }))
  };
}

// Utility function to check nested object properties
function hasNestedProperty(obj: any, path: string): boolean {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined;
  }, obj) !== undefined;
}

// Gamification logic validation
export function validateGamificationLogic(stats: any): TestResult {
  const issues: string[] = [];
  
  try {
    // Validate level progression logic
    const completedConcepts = stats.completedConcepts || 0;
    const currentLevel = stats.currentLevel || 1;
    
    const expectedLevel = calculateExpectedLevel(completedConcepts);
    if (currentLevel !== expectedLevel) {
      issues.push(`Level calculation error: expected ${expectedLevel}, got ${currentLevel} for ${completedConcepts} concepts`);
    }
    
    // Validate streak logic
    if (stats.currentStreak < 0) {
      issues.push(`Invalid negative streak: ${stats.currentStreak}`);
    }
    
    // Validate completion rates
    if (stats.completionRate && (stats.completionRate < 0 || stats.completionRate > 100)) {
      issues.push(`Invalid completion rate: ${stats.completionRate}%`);
    }
    
    return {
      success: issues.length === 0,
      message: issues.length === 0 
        ? 'Gamification logic validation passed'
        : `Gamification issues: ${issues.join('; ')}`,
      data: { issuesFound: issues.length, issues }
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Gamification validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function for level calculation validation
function calculateExpectedLevel(completedConcepts: number): number {
  const levels = [
    { min: 0, max: 9, level: 1 },
    { min: 10, max: 24, level: 2 },
    { min: 25, max: 49, level: 3 },
    { min: 50, max: 99, level: 4 },
    { min: 100, max: 199, level: 5 },
    { min: 200, max: Infinity, level: 6 }
  ];
  
  const currentLevel = levels.find(l => completedConcepts >= l.min && completedConcepts <= l.max);
  return currentLevel?.level || 1;
}

// Export test runner for easy use
export async function runQuickHealthCheck(): Promise<boolean> {
  try {
    const results = await runLibraryApiTestSuite();
    const failedTests = results.filter(r => !r.success);
    
    if (failedTests.length === 0) {
      console.log('✅ All library tests passed!');
      return true;
    } else {
      console.log(`❌ ${failedTests.length} tests failed:`);
      failedTests.forEach(test => {
        console.log(`  - ${test.message}`);
      });
      return false;
    }
  } catch (error) {
    console.error('🚨 Test suite failed to run:', error);
    return false;
  }
} 