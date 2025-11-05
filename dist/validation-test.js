"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Test script to verify the improved validation system
const socratic_engine_1 = require("./socratic-engine");
require('dotenv').config();
function testValidation() {
    console.log('🔍 Testing Improved Validation System');
    console.log('=====================================\n');
    const engine = new socratic_engine_1.SocraticEngine();
    // Test cases that should NOT be flagged (legitimate Socratic guidance)
    const legitimateResponses = [
        "Great job! Now we have 2x = 8. What can we do next to isolate x?",
        "Yes, that's correct! If you subtract 5 from both sides, what does the equation become?",
        "Excellent thinking! How did you arrive at that conclusion?",
        "That's right! Our equation is 2x + 5 = 13. What are we trying to find?",
        "Perfect! So we have x = 4. Can you tell me how you got that result?",
        "Good work! The equation becomes 2x = 8. What's our next step?",
        "Exactly! What do you think we should do to solve for x?"
    ];
    // Test cases that SHOULD be flagged (actual direct answers)
    const directAnswers = [
        "The answer is 4",
        "x = 4.",
        "Therefore, x = 4",
        "So, x = 4.",
        "The solution is 4",
        "The final answer is 4",
        "The result is 4",
        "we get x = 4.",
        "this gives us x = 4"
    ];
    console.log('✅ Testing Legitimate Socratic Responses (should NOT be flagged):');
    console.log('================================================================');
    let falsePositives = 0;
    legitimateResponses.forEach((response, i) => {
        const isDirectAnswer = engine.containsDirectAnswer(response);
        const status = isDirectAnswer ? '❌ FLAGGED (FALSE POSITIVE)' : '✅ PASSED';
        console.log(`${i + 1}. "${response}"`);
        console.log(`   Result: ${status}\n`);
        if (isDirectAnswer)
            falsePositives++;
    });
    console.log('❌ Testing Direct Answers (SHOULD be flagged):');
    console.log('===============================================');
    let missedViolations = 0;
    directAnswers.forEach((response, i) => {
        const isDirectAnswer = engine.containsDirectAnswer(response);
        const status = isDirectAnswer ? '✅ CORRECTLY FLAGGED' : '❌ MISSED VIOLATION';
        console.log(`${i + 1}. "${response}"`);
        console.log(`   Result: ${status}\n`);
        if (!isDirectAnswer)
            missedViolations++;
    });
    console.log('📊 Validation System Performance:');
    console.log('==================================');
    console.log(`False Positives: ${falsePositives}/${legitimateResponses.length} (${((falsePositives / legitimateResponses.length) * 100).toFixed(1)}%)`);
    console.log(`Missed Violations: ${missedViolations}/${directAnswers.length} (${((missedViolations / directAnswers.length) * 100).toFixed(1)}%)`);
    const totalTests = legitimateResponses.length + directAnswers.length;
    const correctResults = (legitimateResponses.length - falsePositives) + (directAnswers.length - missedViolations);
    const accuracy = ((correctResults / totalTests) * 100).toFixed(1);
    console.log(`Overall Accuracy: ${correctResults}/${totalTests} (${accuracy}%)`);
    if (falsePositives === 0 && missedViolations === 0) {
        console.log('\n🎉 PERFECT! Validation system is working correctly!');
        console.log('✅ No false positives detected');
        console.log('✅ All direct answers properly flagged');
    }
    else {
        console.log('\n⚠️  Validation system needs further improvement:');
        if (falsePositives > 0) {
            console.log(`❌ ${falsePositives} false positive(s) detected`);
        }
        if (missedViolations > 0) {
            console.log(`❌ ${missedViolations} violation(s) missed`);
        }
    }
}
// Run the test
if (require.main === module) {
    testValidation();
}
//# sourceMappingURL=validation-test.js.map