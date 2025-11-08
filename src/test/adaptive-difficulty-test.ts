/**
 * Adaptive Difficulty Testing
 * Validates that the system adapts difficulty based on:
 * - Student struggling → difficulty decreases
 * - Student excelling → difficulty increases
 * - Confidence level tracking accuracy
 * - Hint frequency adjustment
 */

import { SocraticEngine, DifficultyLevel } from '../socratic-engine';

interface DifficultyTestScenario {
  name: string;
  problem: string;
  studentProfile: {
    initialDifficulty: DifficultyLevel;
    responses: Array<{ input: string; expectedDifficultyChange: 'decrease' | 'increase' | 'maintain' }>;
  };
}

/**
 * Test: Student struggling → difficulty decreases
 */
async function testStrugglingStudent(): Promise<boolean> {
  console.log('\n📉 Test 1: Struggling Student → Difficulty Decreases');
  console.log('─'.repeat(60));
  
  const engine = new SocraticEngine();
  const sessionId = `test-struggling-${Date.now()}`;
  engine.initializeSession(sessionId);
  
  // Start with intermediate difficulty
  engine.updateDifficulty(DifficultyLevel.INTERMEDIATE);
  const initialDifficulty = engine.getCurrentDifficulty();
  console.log(`   Initial difficulty: ${initialDifficulty}`);
  
  const problem = 'Solve 4x + 9 = 25';
  await engine.startProblem(problem);
  
  // Simulate struggling student responses
  const strugglingResponses = [
    "I don't understand",
    "I'm confused",
    "This is too hard",
    "I don't know what to do",
    "Can you make it simpler?",
    "I'm really stuck"
  ];
  
  let difficultyDecreased = false;
  
  for (const studentInput of strugglingResponses) {
    const beforeDifficulty = engine.getCurrentDifficulty();
    const response = await engine.respondToStudent(studentInput);
    const afterDifficulty = engine.getCurrentDifficulty();
    
    // Check if difficulty decreased
    const difficultyOrder = [DifficultyLevel.BEGINNER, DifficultyLevel.INTERMEDIATE, DifficultyLevel.ADVANCED];
    const beforeIndex = difficultyOrder.indexOf(beforeDifficulty);
    const afterIndex = difficultyOrder.indexOf(afterDifficulty);
    
    if (afterIndex < beforeIndex) {
      difficultyDecreased = true;
      console.log(`   ✅ Difficulty decreased: ${beforeDifficulty} → ${afterDifficulty}`);
      break;
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  const finalDifficulty = engine.getCurrentDifficulty();
  console.log(`   Final difficulty: ${finalDifficulty}`);
  console.log(`   Difficulty decreased: ${difficultyDecreased ? '✅ YES' : '❌ NO'}`);
  console.log(`   Result: ${difficultyDecreased || finalDifficulty === DifficultyLevel.BEGINNER ? '✅ PASS' : '❌ FAIL'}`);
  
  return difficultyDecreased || finalDifficulty === DifficultyLevel.BEGINNER;
}

/**
 * Test: Student excelling → difficulty increases
 */
async function testExcellingStudent(): Promise<boolean> {
  console.log('\n📈 Test 2: Excelling Student → Difficulty Increases');
  console.log('─'.repeat(60));
  
  const engine = new SocraticEngine();
  const sessionId = `test-excelling-${Date.now()}`;
  engine.initializeSession(sessionId);
  
  // Start with beginner difficulty
  engine.updateDifficulty(DifficultyLevel.BEGINNER);
  const initialDifficulty = engine.getCurrentDifficulty();
  console.log(`   Initial difficulty: ${initialDifficulty}`);
  
  const problem = 'Solve 2x + 5 = 13';
  await engine.startProblem(problem);
  
  // Simulate excelling student responses
  const excellingResponses = [
    "I know this! We need to isolate x",
    "Subtract 5 from both sides: 2x = 8",
    "Then divide by 2: x = 4",
    "Let me verify: 2(4) + 5 = 8 + 5 = 13 ✓",
    "This is easy for me",
    "Can we do something more challenging?"
  ];
  
  let difficultyIncreased = false;
  
  for (const studentInput of excellingResponses) {
    const beforeDifficulty = engine.getCurrentDifficulty();
    const response = await engine.respondToStudent(studentInput);
    const afterDifficulty = engine.getCurrentDifficulty();
    
    // Check if difficulty increased
    const difficultyOrder = [DifficultyLevel.BEGINNER, DifficultyLevel.INTERMEDIATE, DifficultyLevel.ADVANCED];
    const beforeIndex = difficultyOrder.indexOf(beforeDifficulty);
    const afterIndex = difficultyOrder.indexOf(afterDifficulty);
    
    if (afterIndex > beforeIndex) {
      difficultyIncreased = true;
      console.log(`   ✅ Difficulty increased: ${beforeDifficulty} → ${afterDifficulty}`);
      break;
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  const finalDifficulty = engine.getCurrentDifficulty();
  console.log(`   Final difficulty: ${finalDifficulty}`);
  console.log(`   Difficulty increased: ${difficultyIncreased ? '✅ YES' : '❌ NO'}`);
  console.log(`   Result: ${difficultyIncreased || finalDifficulty === DifficultyLevel.INTERMEDIATE || finalDifficulty === DifficultyLevel.ADVANCED ? '✅ PASS' : '❌ FAIL'}`);
  
  return difficultyIncreased || finalDifficulty === DifficultyLevel.INTERMEDIATE || finalDifficulty === DifficultyLevel.ADVANCED;
}

/**
 * Test: Confidence level tracking accuracy
 */
async function testConfidenceTracking(): Promise<boolean> {
  console.log('\n📊 Test 3: Confidence Level Tracking');
  console.log('─'.repeat(60));
  
  const engine = new SocraticEngine();
  const sessionId = `test-confidence-${Date.now()}`;
  engine.initializeSession(sessionId);
  
  const problem = 'Find the area of a circle with radius 6';
  await engine.startProblem(problem);
  
  // Test with varying confidence levels
  const testCases = [
    { input: "I'm not sure", expectedLowConfidence: true },
    { input: "I think it's πr²", expectedLowConfidence: false },
    { input: "I'm definitely sure it's π * 36", expectedLowConfidence: false },
    { input: "I have no idea", expectedLowConfidence: true }
  ];
  
  let confidenceTrackingAccurate = true;
  const confidenceLevels: number[] = [];
  
  for (const testCase of testCases) {
    const response = await engine.respondToStudent(testCase.input);
    
    // Get conversation history to check confidence tracking
    const history = engine.getConversationHistory();
    const lastUserMessage = history.filter(m => m.role === 'user').slice(-1)[0];
    
    if (lastUserMessage && 'studentConfidence' in lastUserMessage) {
      const confidence = (lastUserMessage as any).studentConfidence;
      if (confidence !== undefined) {
        confidenceLevels.push(confidence);
        
        // Check if confidence matches expectation
        const isLowConfidence = confidence < 0.4;
        if (testCase.expectedLowConfidence && !isLowConfidence) {
          console.log(`   ⚠️  Expected low confidence for "${testCase.input}", got ${confidence}`);
          confidenceTrackingAccurate = false;
        } else if (!testCase.expectedLowConfidence && isLowConfidence) {
          console.log(`   ⚠️  Expected higher confidence for "${testCase.input}", got ${confidence}`);
          confidenceTrackingAccurate = false;
        }
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  const avgConfidence = confidenceLevels.length > 0 
    ? confidenceLevels.reduce((a, b) => a + b, 0) / confidenceLevels.length 
    : 0;
  
  console.log(`   Confidence levels tracked: ${confidenceLevels.length}/${testCases.length}`);
  console.log(`   Average confidence: ${avgConfidence.toFixed(2)}`);
  console.log(`   Tracking accurate: ${confidenceTrackingAccurate ? '✅ YES' : '❌ NO'}`);
  console.log(`   Result: ${confidenceTrackingAccurate && confidenceLevels.length >= testCases.length * 0.5 ? '✅ PASS' : '❌ FAIL'}`);
  
  return confidenceTrackingAccurate && confidenceLevels.length >= testCases.length * 0.5;
}

/**
 * Test: Hint frequency adjustment
 */
async function testHintFrequency(): Promise<boolean> {
  console.log('\n💡 Test 4: Hint Frequency Adjustment');
  console.log('─'.repeat(60));
  
  const engine = new SocraticEngine();
  const sessionId = `test-hints-${Date.now()}`;
  engine.initializeSession(sessionId);
  
  const problem = 'Solve 3x - 7 = 14';
  await engine.startProblem(problem);
  
  // Simulate student needing multiple hints
  const responses = [
    "I don't know where to start",
    "Still not sure",
    "Can you help me more?",
    "I'm really stuck"
  ];
  
  let hintFrequencyIncreased = false;
  let strugglingTurns = 0;
  
  for (const studentInput of responses) {
    const beforeStruggling = engine.getSessionPerformance().strugglingTurns;
    const response = await engine.respondToStudent(studentInput);
    const afterStruggling = engine.getSessionPerformance().strugglingTurns;
    
    if (afterStruggling > beforeStruggling) {
      strugglingTurns = afterStruggling;
    }
    
    // Check if response provides more scaffolding (indicates increased hint frequency)
    const hasMoreGuidance = response.toLowerCase().includes('hint') || 
                           response.toLowerCase().includes('think about') ||
                           response.toLowerCase().includes('consider') ||
                           response.length > 100; // Longer responses often indicate more guidance
    
    if (hasMoreGuidance && strugglingTurns > 2) {
      hintFrequencyIncreased = true;
      console.log(`   ✅ More guidance provided after ${strugglingTurns} struggling turns`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  const finalStruggling = engine.getSessionPerformance().strugglingTurns;
  console.log(`   Struggling turns tracked: ${finalStruggling}`);
  console.log(`   Hint frequency increased: ${hintFrequencyIncreased ? '✅ YES' : '⚠️  PARTIAL'}`);
  console.log(`   Result: ${hintFrequencyIncreased || finalStruggling >= 2 ? '✅ PASS' : '❌ FAIL'}`);
  
  return hintFrequencyIncreased || finalStruggling >= 2;
}

/**
 * Test: Smooth difficulty transitions
 */
async function testSmoothTransitions(): Promise<boolean> {
  console.log('\n🔄 Test 5: Smooth Difficulty Transitions');
  console.log('─'.repeat(60));
  
  const engine = new SocraticEngine();
  const sessionId = `test-transitions-${Date.now()}`;
  engine.initializeSession(sessionId);
  
  engine.updateDifficulty(DifficultyLevel.INTERMEDIATE);
  const initialDifficulty = engine.getCurrentDifficulty();
  console.log(`   Initial difficulty: ${initialDifficulty}`);
  
  const problem = 'Solve 5x + 3 = 18';
  await engine.startProblem(problem);
  
  // Simulate mixed performance
  const mixedResponses = [
    "I'm not sure", // Struggling
    "Maybe subtract 3?", // Getting it
    "5x = 15", // Making progress
    "So x = 3?", // Almost there
    "I think I got it!" // Excelling
  ];
  
  const difficultyHistory: DifficultyLevel[] = [initialDifficulty];
  
  for (const studentInput of mixedResponses) {
    const response = await engine.respondToStudent(studentInput);
    const currentDifficulty = engine.getCurrentDifficulty();
    difficultyHistory.push(currentDifficulty);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Check for smooth transitions (no abrupt jumps)
  let transitionsSmooth = true;
  const difficultyOrder = [DifficultyLevel.BEGINNER, DifficultyLevel.INTERMEDIATE, DifficultyLevel.ADVANCED];
  
  for (let i = 1; i < difficultyHistory.length; i++) {
    const prev = difficultyOrder.indexOf(difficultyHistory[i - 1]);
    const curr = difficultyOrder.indexOf(difficultyHistory[i]);
    const jump = Math.abs(curr - prev);
    
    if (jump > 1) {
      console.log(`   ⚠️  Abrupt jump detected: ${difficultyHistory[i - 1]} → ${difficultyHistory[i]}`);
      transitionsSmooth = false;
    }
  }
  
  console.log(`   Difficulty history: ${difficultyHistory.join(' → ')}`);
  console.log(`   Transitions smooth: ${transitionsSmooth ? '✅ YES' : '❌ NO'}`);
  console.log(`   Result: ${transitionsSmooth ? '✅ PASS' : '❌ FAIL'}`);
  
  return transitionsSmooth;
}

/**
 * Run all adaptive difficulty tests
 */
export async function runAdaptiveDifficultyTests(): Promise<{
  passed: number;
  total: number;
  results: Array<{ name: string; passed: boolean }>;
}> {
  console.log('🎚️  Adaptive Difficulty Testing Suite');
  console.log('='.repeat(60));
  
  const results: Array<{ name: string; passed: boolean }> = [];
  
  try {
    const test1 = await testStrugglingStudent();
    results.push({ name: 'Struggling Student → Decrease', passed: test1 });
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
    results.push({ name: 'Struggling Student → Decrease', passed: false });
  }
  
  try {
    const test2 = await testExcellingStudent();
    results.push({ name: 'Excelling Student → Increase', passed: test2 });
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
    results.push({ name: 'Excelling Student → Increase', passed: false });
  }
  
  try {
    const test3 = await testConfidenceTracking();
    results.push({ name: 'Confidence Level Tracking', passed: test3 });
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
    results.push({ name: 'Confidence Level Tracking', passed: false });
  }
  
  try {
    const test4 = await testHintFrequency();
    results.push({ name: 'Hint Frequency Adjustment', passed: test4 });
  } catch (error) {
    console.error('❌ Test 4 failed:', error);
    results.push({ name: 'Hint Frequency Adjustment', passed: false });
  }
  
  try {
    const test5 = await testSmoothTransitions();
    results.push({ name: 'Smooth Difficulty Transitions', passed: test5 });
  } catch (error) {
    console.error('❌ Test 5 failed:', error);
    results.push({ name: 'Smooth Difficulty Transitions', passed: false });
  }
  
  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Adaptive Difficulty Summary');
  console.log('='.repeat(60));
  console.log(`\nPassed: ${passed}/${total} (${(passed/total*100).toFixed(1)}%)`);
  
  results.forEach(r => {
    console.log(`   ${r.passed ? '✅' : '❌'} ${r.name}`);
  });
  
  if (passed === total) {
    console.log('\n✅ EXCELLENT: All adaptive difficulty tests passed!');
  } else if (passed >= total * 0.75) {
    console.log('\n⚠️  GOOD: Most tests passed, but some adaptive features need improvement.');
  } else {
    console.log('\n❌ NEEDS IMPROVEMENT: Significant adaptive difficulty issues detected.');
  }
  
  return { passed, total, results };
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config();
  runAdaptiveDifficultyTests()
    .then(() => {
      console.log('\n✅ Adaptive difficulty testing complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Testing failed:', error);
      process.exit(1);
    });
}

