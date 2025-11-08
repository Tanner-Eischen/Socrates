/**
 * Test Runner for All Validation Tests
 * Runs comprehensive test suites:
 * - Problem type testing (5+ types)
 * - Context validation
 * - Adaptive difficulty testing
 */

import { runProblemTypeTests } from './problem-types-test';
import { runContextValidationTests } from './context-validation';
import { runAdaptiveDifficultyTests } from './adaptive-difficulty-test';

interface TestSuiteResult {
  name: string;
  passed: number;
  total: number;
  duration: number;
}

/**
 * Run all test suites
 */
export async function runAllTests(): Promise<{
  suites: TestSuiteResult[];
  overallPassed: number;
  overallTotal: number;
  overallDuration: number;
}> {
  console.log('\n' + '='.repeat(70));
  console.log('🎓 COMPREHENSIVE SOCRATIC TUTOR TEST SUITE');
  console.log('='.repeat(70));
  console.log('\nThis test suite validates:');
  console.log('  ✅ 5+ problem types with Socratic compliance');
  console.log('  ✅ Conversation context maintenance');
  console.log('  ✅ Adaptive difficulty adjustment');
  console.log('\n' + '='.repeat(70) + '\n');
  
  const startTime = Date.now();
  const suites: TestSuiteResult[] = [];
  
  // Test Suite 1: Problem Types
  console.log('\n📚 TEST SUITE 1: Problem Type Testing');
  console.log('='.repeat(70));
  const suite1Start = Date.now();
  try {
    const results1 = await runProblemTypeTests();
    const suite1Duration = Date.now() - suite1Start;
    const passed1 = results1.filter(r => r.socraticCompliance).length;
    suites.push({
      name: 'Problem Type Testing',
      passed: passed1,
      total: results1.length,
      duration: suite1Duration
    });
  } catch (error) {
    console.error('❌ Problem type testing failed:', error);
    suites.push({
      name: 'Problem Type Testing',
      passed: 0,
      total: 0,
      duration: Date.now() - suite1Start
    });
  }
  
  // Test Suite 2: Context Validation
  console.log('\n\n📚 TEST SUITE 2: Context Validation');
  console.log('='.repeat(70));
  const suite2Start = Date.now();
  try {
    const results2 = await runContextValidationTests();
    const suite2Duration = Date.now() - suite2Start;
    suites.push({
      name: 'Context Validation',
      passed: results2.passed,
      total: results2.total,
      duration: suite2Duration
    });
  } catch (error) {
    console.error('❌ Context validation testing failed:', error);
    suites.push({
      name: 'Context Validation',
      passed: 0,
      total: 0,
      duration: Date.now() - suite2Start
    });
  }
  
  // Test Suite 3: Adaptive Difficulty
  console.log('\n\n📚 TEST SUITE 3: Adaptive Difficulty');
  console.log('='.repeat(70));
  const suite3Start = Date.now();
  try {
    const results3 = await runAdaptiveDifficultyTests();
    const suite3Duration = Date.now() - suite3Start;
    suites.push({
      name: 'Adaptive Difficulty',
      passed: results3.passed,
      total: results3.total,
      duration: suite3Duration
    });
  } catch (error) {
    console.error('❌ Adaptive difficulty testing failed:', error);
    suites.push({
      name: 'Adaptive Difficulty',
      passed: 0,
      total: 0,
      duration: Date.now() - suite3Start
    });
  }
  
  // Final Summary
  const overallDuration = Date.now() - startTime;
  const overallPassed = suites.reduce((sum, s) => sum + s.passed, 0);
  const overallTotal = suites.reduce((sum, s) => sum + s.total, 0);
  
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('='.repeat(70));
  
  console.log('\nTest Suites:');
  suites.forEach(suite => {
    const percentage = suite.total > 0 ? (suite.passed / suite.total * 100).toFixed(1) : '0.0';
    const durationSec = (suite.duration / 1000).toFixed(1);
    console.log(`   ${suite.passed === suite.total && suite.total > 0 ? '✅' : '⚠️ '} ${suite.name}`);
    console.log(`      ${suite.passed}/${suite.total} passed (${percentage}%) - ${durationSec}s`);
  });
  
  console.log(`\nOverall: ${overallPassed}/${overallTotal} tests passed (${(overallPassed/overallTotal*100).toFixed(1)}%)`);
  console.log(`Total Duration: ${(overallDuration / 1000).toFixed(1)}s`);
  
  // Overall assessment
  console.log('\n' + '='.repeat(70));
  if (overallPassed === overallTotal && overallTotal > 0) {
    console.log('✅ EXCELLENT: All tests passed! The Socratic tutor meets all success criteria.');
  } else if (overallPassed >= overallTotal * 0.8) {
    console.log('⚠️  GOOD: Most tests passed. Minor improvements needed.');
  } else if (overallPassed >= overallTotal * 0.6) {
    console.log('⚠️  NEEDS WORK: Some tests failed. Review and improve implementation.');
  } else {
    console.log('❌ CRITICAL: Many tests failed. Significant improvements required.');
  }
  console.log('='.repeat(70));
  
  return {
    suites,
    overallPassed,
    overallTotal,
    overallDuration
  };
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config();
  runAllTests()
    .then(() => {
      console.log('\n✅ All testing complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Testing suite failed:', error);
      process.exit(1);
    });
}

