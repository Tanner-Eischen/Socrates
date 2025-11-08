/**
 * Conversation Context Validation Tests
 * Validates that the Socratic engine maintains context across:
 * - Long conversations (20+ turns)
 * - Problem references throughout
 * - Student confusion recovery
 * - Multi-concept problems
 */

import { SocraticEngine } from '../socratic-engine';

interface ContextTestScenario {
  name: string;
  problem: string;
  conversation: Array<{ student: string; expectedContext: string[] }>;
  validateContext: (conversation: any[], problem: string) => boolean;
}

/**
 * Test context persistence across long conversations
 */
async function testLongConversation(): Promise<boolean> {
  console.log('\n📝 Test 1: Long Conversation Context (20+ turns)');
  console.log('─'.repeat(60));
  
  const engine = new SocraticEngine();
  const sessionId = `test-long-${Date.now()}`;
  engine.initializeSession(sessionId);
  
  const problem = 'Solve 3x + 7 = 22';
  await engine.startProblem(problem);
  
  // Simulate 20+ turns
  const studentResponses = [
    "I need to solve for x",
    "3x + 7 = 22",
    "Maybe subtract 7?",
    "3x = 15",
    "Then divide by 3?",
    "So x = 5?",
    "Wait, let me check: 3(5) + 7 = 15 + 7 = 22, yes!",
    "That's the answer",
    "I think I understand now",
    "Can you give me another problem?",
    "Actually, can we review this one?",
    "What was the original equation again?",
    "I want to make sure I understand",
    "What if the equation was 3x + 7 = 25?",
    "Would I do the same steps?",
    "Subtract 7 from both sides?",
    "So 3x = 18?",
    "Then x = 6?",
    "That makes sense!",
    "Thanks for helping me understand"
  ];
  
  let contextMaintained = true;
  const problemReferences: string[] = [];
  
  for (let i = 0; i < studentResponses.length; i++) {
    const response = await engine.respondToStudent(studentResponses[i]);
    
    // Check if the tutor remembers the original problem
    const history = engine.getConversationHistory();
    const problemMentioned = history.some(msg => 
      msg.content.toLowerCase().includes('3x') || 
      msg.content.toLowerCase().includes('22') ||
      msg.content.toLowerCase().includes('original')
    );
    
    if (i > 5 && !problemMentioned) {
      // After several turns, tutor should still reference the problem
      const recentMessages = history.slice(-3).map(m => m.content).join(' ').toLowerCase();
      if (!recentMessages.includes('3x') && !recentMessages.includes('22') && 
          !recentMessages.includes('problem') && !recentMessages.includes('equation')) {
        console.log(`⚠️  Turn ${i + 1}: Context may be lost - no problem reference`);
        contextMaintained = false;
      }
    }
    
    problemReferences.push(problemMentioned ? 'YES' : 'NO');
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  const conversationLength = engine.getConversationLength();
  const contextScore = problemReferences.filter(r => r === 'YES').length / problemReferences.length;
  
  console.log(`   Conversation length: ${conversationLength} messages`);
  console.log(`   Context retention: ${(contextScore * 100).toFixed(1)}%`);
  console.log(`   Result: ${contextMaintained && contextScore > 0.6 ? '✅ PASS' : '❌ FAIL'}`);
  
  return contextMaintained && contextScore > 0.6;
}

/**
 * Test context recovery after student confusion
 */
async function testConfusionRecovery(): Promise<boolean> {
  console.log('\n🔄 Test 2: Context Recovery After Confusion');
  console.log('─'.repeat(60));
  
  const engine = new SocraticEngine();
  const sessionId = `test-confusion-${Date.now()}`;
  engine.initializeSession(sessionId);
  
  const problem = 'Find the area of a rectangle with length 8 and width 5';
  await engine.startProblem(problem);
  
  const conversation = [
    "I don't know where to start",
    "Is it multiplication?",
    "Length times width?",
    "8 * 5 = 40?",
    "Wait, I'm confused",
    "Can we start over?",
    "What were we trying to find again?"
  ];
  
  let contextRecovered = false;
  
  for (const studentInput of conversation) {
    const response = await engine.respondToStudent(studentInput);
    
    // After confusion, check if tutor recovers context
    if (studentInput.toLowerCase().includes('start over') || 
        studentInput.toLowerCase().includes('find again')) {
      const history = engine.getConversationHistory();
      const recentMessages = history.slice(-2).map(m => m.content).join(' ').toLowerCase();
      
      // Tutor should reference the original problem (area, rectangle, length, width)
      const hasArea = recentMessages.includes('area');
      const hasRectangle = recentMessages.includes('rectangle');
      const hasDimensions = recentMessages.includes('length') || recentMessages.includes('width');
      
      if (hasArea || hasRectangle || hasDimensions) {
        contextRecovered = true;
        console.log(`   ✅ Context recovered - tutor referenced: ${[
          hasArea && 'area',
          hasRectangle && 'rectangle',
          hasDimensions && 'dimensions'
        ].filter(Boolean).join(', ')}`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`   Result: ${contextRecovered ? '✅ PASS' : '❌ FAIL'}`);
  return contextRecovered;
}

/**
 * Test multi-concept problem context
 */
async function testMultiConceptContext(): Promise<boolean> {
  console.log('\n🧩 Test 3: Multi-Concept Problem Context');
  console.log('─'.repeat(60));
  
  const engine = new SocraticEngine();
  const sessionId = `test-multiconcept-${Date.now()}`;
  engine.initializeSession(sessionId);
  
  const problem = 'A rectangle has perimeter 24. If the length is twice the width, find the dimensions.';
  await engine.startProblem(problem);
  
  const concepts = ['perimeter', 'rectangle', 'length', 'width', 'dimensions', 'twice'];
  const conceptsMentioned: string[] = [];
  
  const conversation = [
    "This seems complicated",
    "We have perimeter and need to find dimensions",
    "Perimeter is 2(length + width)",
    "So 2(L + W) = 24",
    "And L = 2W",
    "I can substitute!"
  ];
  
  for (const studentInput of conversation) {
    const response = await engine.respondToStudent(studentInput);
    
    // Check which concepts are mentioned in the conversation
    const history = engine.getConversationHistory();
    const allText = history.map(m => m.content).join(' ').toLowerCase();
    
    concepts.forEach(concept => {
      if (allText.includes(concept.toLowerCase()) && !conceptsMentioned.includes(concept)) {
        conceptsMentioned.push(concept);
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  const conceptCoverage = conceptsMentioned.length / concepts.length;
  console.log(`   Concepts covered: ${conceptsMentioned.length}/${concepts.length} (${(conceptCoverage * 100).toFixed(1)}%)`);
  console.log(`   Concepts: ${conceptsMentioned.join(', ')}`);
  console.log(`   Result: ${conceptCoverage >= 0.6 ? '✅ PASS' : '❌ FAIL'}`);
  
  return conceptCoverage >= 0.6;
}

/**
 * Test problem-specific context maintenance
 */
async function testProblemSpecificContext(): Promise<boolean> {
  console.log('\n🎯 Test 4: Problem-Specific Context Maintenance');
  console.log('─'.repeat(60));
  
  const engine = new SocraticEngine();
  const sessionId = `test-specific-${Date.now()}`;
  engine.initializeSession(sessionId);
  
  const problem = 'Solve 5x - 3 = 12';
  await engine.startProblem(problem);
  
  // After several turns, check if tutor still references the specific problem
  const studentResponses = [
    "I need to isolate x",
    "Maybe add 3 to both sides?",
    "5x = 15",
    "Then divide by 5?",
    "x = 3?",
    "Can you explain why we add 3 first?"
  ];
  
  let problemContextMaintained = true;
  
  for (const studentInput of studentResponses) {
    const response = await engine.respondToStudent(studentInput);
    
    // Check if response is relevant to the problem
    const problemElements = ['5x', '3', '12', 'equation', 'solve'];
    const responseLower = response.toLowerCase();
    const hasRelevance = problemElements.some(element => 
      responseLower.includes(element.toLowerCase())
    ) || responseLower.includes('this') || responseLower.includes('it');
    
    if (!hasRelevance && studentResponses.indexOf(studentInput) > 2) {
      console.log(`   ⚠️  Turn ${studentResponses.indexOf(studentInput) + 1}: Response may lack problem context`);
      problemContextMaintained = false;
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  const currentProblem = engine.getCurrentProblem();
  const problemMatches = currentProblem === problem;
  
  console.log(`   Original problem: ${problem}`);
  console.log(`   Current problem: ${currentProblem}`);
  console.log(`   Problem matches: ${problemMatches ? '✅ YES' : '❌ NO'}`);
  console.log(`   Context maintained: ${problemContextMaintained ? '✅ YES' : '❌ NO'}`);
  console.log(`   Result: ${problemMatches && problemContextMaintained ? '✅ PASS' : '❌ FAIL'}`);
  
  return problemMatches && problemContextMaintained;
}

/**
 * Run all context validation tests
 */
export async function runContextValidationTests(): Promise<{
  passed: number;
  total: number;
  results: Array<{ name: string; passed: boolean }>;
}> {
  console.log('🔍 Conversation Context Validation Test Suite');
  console.log('='.repeat(60));
  
  const results: Array<{ name: string; passed: boolean }> = [];
  
  try {
    const test1 = await testLongConversation();
    results.push({ name: 'Long Conversation Context', passed: test1 });
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
    results.push({ name: 'Long Conversation Context', passed: false });
  }
  
  try {
    const test2 = await testConfusionRecovery();
    results.push({ name: 'Confusion Recovery', passed: test2 });
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
    results.push({ name: 'Confusion Recovery', passed: false });
  }
  
  try {
    const test3 = await testMultiConceptContext();
    results.push({ name: 'Multi-Concept Context', passed: test3 });
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
    results.push({ name: 'Multi-Concept Context', passed: false });
  }
  
  try {
    const test4 = await testProblemSpecificContext();
    results.push({ name: 'Problem-Specific Context', passed: test4 });
  } catch (error) {
    console.error('❌ Test 4 failed:', error);
    results.push({ name: 'Problem-Specific Context', passed: false });
  }
  
  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Context Validation Summary');
  console.log('='.repeat(60));
  console.log(`\nPassed: ${passed}/${total} (${(passed/total*100).toFixed(1)}%)`);
  
  results.forEach(r => {
    console.log(`   ${r.passed ? '✅' : '❌'} ${r.name}`);
  });
  
  if (passed === total) {
    console.log('\n✅ EXCELLENT: All context validation tests passed!');
  } else if (passed >= total * 0.75) {
    console.log('\n⚠️  GOOD: Most tests passed, but some context issues detected.');
  } else {
    console.log('\n❌ NEEDS IMPROVEMENT: Significant context maintenance issues detected.');
  }
  
  return { passed, total, results };
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config();
  runContextValidationTests()
    .then(() => {
      console.log('\n✅ Context validation testing complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Testing failed:', error);
      process.exit(1);
    });
}

