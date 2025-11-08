/**
 * Comprehensive Problem Type Testing Suite
 * Tests Socratic compliance across 5+ problem types:
 * 1. Arithmetic
 * 2. Algebra (linear equations)
 * 3. Geometry
 * 4. Word problems
 * 5. Multi-step problems
 * 6. Calculus
 */

import { SocraticEngine, DifficultyLevel } from '../socratic-engine';

interface ProblemTypeTest {
  category: string;
  problem: string;
  expectedConcepts: string[];
  studentResponses: string[];
}

interface TestResult {
  problem: string;
  category: string;
  initialResponse: string;
  conversation: Array<{ student: string; tutor: string; directAnswerDetected: boolean }>;
  directAnswerCount: number;
  socraticCompliance: boolean;
  contextMaintained: boolean;
  adaptiveDifficultyWorked: boolean;
  questionTypesUsed: string[];
  depthLevelsReached: number[];
}

// Test problems covering 5+ types
const PROBLEM_TYPES: ProblemTypeTest[] = [
  {
    category: 'Arithmetic',
    problem: 'Solve 15 + 27',
    expectedConcepts: ['arithmetic', 'addition'],
    studentResponses: [
      "I'm not sure where to start",
      "Do I just add them together?",
      "15 + 27 = 42?",
      "Is that the answer?"
    ]
  },
  {
    category: 'Algebra - Linear Equation',
    problem: 'Solve 2x + 5 = 13',
    expectedConcepts: ['algebra', 'variables', 'equations', 'solving'],
    studentResponses: [
      "I don't understand what to do",
      "We need to find x",
      "Maybe subtract 5 from both sides?",
      "So 2x = 8?",
      "Then x = 4?"
    ]
  },
  {
    category: 'Geometry',
    problem: 'Find the area of a circle with radius 5',
    expectedConcepts: ['geometry', 'circle', 'area'],
    studentResponses: [
      "I forgot the formula",
      "Is it π times radius squared?",
      "So π * 5²?",
      "That's 25π?"
    ]
  },
  {
    category: 'Word Problem',
    problem: 'John has 3 times as many apples as Mary. If Mary has 5 apples, how many apples does John have?',
    expectedConcepts: ['word problem', 'multiplication', 'arithmetic'],
    studentResponses: [
      "I'm confused by the wording",
      "John has 3 times what Mary has?",
      "So John has 3 * 5?",
      "That's 15 apples?"
    ]
  },
  {
    category: 'Multi-step Problem',
    problem: 'Solve the system: x + y = 5 and 2x - y = 1',
    expectedConcepts: ['algebra', 'system of equations', 'solving'],
    studentResponses: [
      "This looks complicated",
      "I can use substitution or elimination",
      "Let me try substitution - y = 5 - x",
      "Substituting into the second equation...",
      "2x - (5 - x) = 1, so 3x = 6?",
      "x = 2, then y = 3?"
    ]
  },
  {
    category: 'Calculus',
    problem: 'Find the derivative of f(x) = x² + 3x',
    expectedConcepts: ['calculus', 'derivatives'],
    studentResponses: [
      "I remember the power rule",
      "The derivative of x² is 2x",
      "The derivative of 3x is 3",
      "So f\'(x) = 2x + 3?"
    ]
  }
];

/**
 * Test a single problem type
 */
async function testProblemType(problemType: ProblemTypeTest): Promise<TestResult> {
  const engine = new SocraticEngine();
  const sessionId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  engine.initializeSession(sessionId);
  
  const result: TestResult = {
    problem: problemType.problem,
    category: problemType.category,
    initialResponse: '',
    conversation: [],
    directAnswerCount: 0,
    socraticCompliance: true,
    contextMaintained: true,
    adaptiveDifficultyWorked: false,
    questionTypesUsed: [],
    depthLevelsReached: []
  };

  try {
    // Start the problem
    console.log(`\n🧮 Testing ${problemType.category}: "${problemType.problem}"`);
    console.log('─'.repeat(60));
    
    const initialResponse = await engine.startProblem(problemType.problem);
    result.initialResponse = initialResponse;
    
    // Check initial response
    if (engine.containsDirectAnswer(initialResponse)) {
      result.directAnswerCount++;
      console.log('⚠️  WARNING: Initial response contains direct answer!');
    }
    
    // Track initial question type and depth
    const initialDepth = engine.getDepthTracker().currentDepth;
    result.depthLevelsReached.push(initialDepth);
    const questionTypes = engine.getQuestionTypeSequence();
    if (questionTypes.length > 0) {
      result.questionTypesUsed.push(questionTypes[questionTypes.length - 1]);
    }
    
    // Simulate conversation
    let initialDifficulty = engine.getCurrentDifficulty();
    let difficultyChanged = false;
    
    for (const studentInput of problemType.studentResponses) {
      console.log(`\nStudent: ${studentInput}`);
      
      const response = await engine.respondToStudent(studentInput);
      console.log(`Tutor: ${response}`);
      
      // Check for direct answers
      const hasDirectAnswer = engine.containsDirectAnswer(response);
      if (hasDirectAnswer) {
        result.directAnswerCount++;
        console.log('⚠️  WARNING: Response contains direct answer!');
      }
      
      // Track question types and depth
      const currentQuestionTypes = engine.getQuestionTypeSequence();
      if (currentQuestionTypes.length > 0) {
        const lastType = currentQuestionTypes[currentQuestionTypes.length - 1];
        if (!result.questionTypesUsed.includes(lastType)) {
          result.questionTypesUsed.push(lastType);
        }
      }
      
      const currentDepth = engine.getDepthTracker().currentDepth;
      if (!result.depthLevelsReached.includes(currentDepth)) {
        result.depthLevelsReached.push(currentDepth);
      }
      
      // Check if difficulty changed
      const currentDifficulty = engine.getCurrentDifficulty();
      if (currentDifficulty !== initialDifficulty) {
        difficultyChanged = true;
        initialDifficulty = currentDifficulty;
      }
      
      result.conversation.push({
        student: studentInput,
        tutor: response,
        directAnswerDetected: hasDirectAnswer
      });
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Validate results
    result.socraticCompliance = result.directAnswerCount === 0;
    result.contextMaintained = engine.getConversationLength() > 0;
    result.adaptiveDifficultyWorked = difficultyChanged || 
      (engine.getCurrentDifficulty() !== DifficultyLevel.INTERMEDIATE);
    
    // Print summary
    console.log('\n📊 Test Summary:');
    console.log(`   Direct answers: ${result.directAnswerCount}`);
    console.log(`   Socratic compliance: ${result.socraticCompliance ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Context maintained: ${result.contextMaintained ? '✅ YES' : '❌ NO'}`);
    console.log(`   Adaptive difficulty: ${result.adaptiveDifficultyWorked ? '✅ YES' : '⚠️  NO'}`);
    console.log(`   Question types used: ${result.questionTypesUsed.join(', ')}`);
    console.log(`   Max depth reached: ${Math.max(...result.depthLevelsReached)}`);
    
  } catch (error) {
    console.error(`❌ Error testing ${problemType.category}:`, error);
    result.socraticCompliance = false;
  }
  
  return result;
}

/**
 * Run all problem type tests
 */
export async function runProblemTypeTests(): Promise<TestResult[]> {
  console.log('🎓 Comprehensive Problem Type Testing Suite');
  console.log('='.repeat(60));
  console.log(`\nTesting ${PROBLEM_TYPES.length} problem types:\n`);
  
  PROBLEM_TYPES.forEach((p, i) => {
    console.log(`${i + 1}. ${p.category}: ${p.problem}`);
  });
  
  const results: TestResult[] = [];
  
  for (const problemType of PROBLEM_TYPES) {
    try {
      const result = await testProblemType(problemType);
      results.push(result);
    } catch (error) {
      console.error(`Failed to test ${problemType.category}:`, error);
      results.push({
        problem: problemType.problem,
        category: problemType.category,
        initialResponse: '',
        conversation: [],
        directAnswerCount: 999,
        socraticCompliance: false,
        contextMaintained: false,
        adaptiveDifficultyWorked: false,
        questionTypesUsed: [],
        depthLevelsReached: []
      });
    }
  }
  
  // Print final summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('='.repeat(60));
  
  const totalDirectAnswers = results.reduce((sum, r) => sum + r.directAnswerCount, 0);
  const compliantTests = results.filter(r => r.socraticCompliance).length;
  const contextMaintainedTests = results.filter(r => r.contextMaintained).length;
  const adaptiveTests = results.filter(r => r.adaptiveDifficultyWorked).length;
  
  console.log(`\nTotal Problems Tested: ${results.length}`);
  console.log(`✅ Socratic Compliance: ${compliantTests}/${results.length} (${(compliantTests/results.length*100).toFixed(1)}%)`);
  console.log(`✅ Context Maintained: ${contextMaintainedTests}/${results.length} (${(contextMaintainedTests/results.length*100).toFixed(1)}%)`);
  console.log(`✅ Adaptive Difficulty: ${adaptiveTests}/${results.length} (${(adaptiveTests/results.length*100).toFixed(1)}%)`);
  console.log(`⚠️  Direct Answers Detected: ${totalDirectAnswers}`);
  
  // Breakdown by category
  console.log('\n📋 Breakdown by Category:');
  results.forEach(r => {
    const status = r.socraticCompliance ? '✅' : '❌';
    console.log(`   ${status} ${r.category}: ${r.directAnswerCount} direct answers, ${r.questionTypesUsed.length} question types`);
  });
  
  // Question type distribution
  const allQuestionTypes = new Set<string>();
  results.forEach(r => r.questionTypesUsed.forEach(t => allQuestionTypes.add(t)));
  console.log(`\n🔍 Question Types Used Across All Tests: ${Array.from(allQuestionTypes).join(', ')}`);
  
  // Depth analysis
  const maxDepths = results.map(r => Math.max(...r.depthLevelsReached, 0));
  const avgMaxDepth = maxDepths.reduce((a, b) => a + b, 0) / maxDepths.length;
  console.log(`\n📈 Average Max Depth Reached: ${avgMaxDepth.toFixed(1)}/5`);
  
  // Overall assessment
  console.log('\n🎯 Overall Assessment:');
  if (totalDirectAnswers === 0 && compliantTests === results.length) {
    console.log('✅ EXCELLENT: All tests passed with 100% Socratic compliance!');
  } else if (totalDirectAnswers < 3 && compliantTests >= results.length * 0.8) {
    console.log('✅ GOOD: Most tests passed with minor issues.');
  } else {
    console.log('⚠️  NEEDS IMPROVEMENT: Multiple direct answers detected. Review system prompts.');
  }
  
  return results;
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config();
  runProblemTypeTests()
    .then(() => {
      console.log('\n✅ Problem type testing complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Testing failed:', error);
      process.exit(1);
    });
}

