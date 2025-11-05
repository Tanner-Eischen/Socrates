// Command-line testing interface for Socratic engine validation
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { SocraticEngine } from './socratic-engine';
import { TEST_PROBLEMS, PROBLEM_DESCRIPTIONS } from './problem-bank';
import { ProblemParser } from './problem-parser';
import { ImageProcessor } from './image-processor';
import { ProblemClassifier } from './problem-classifier';
import { dataStorage } from './data-storage';
import { analyticsEngine } from './analytics-engine';
import { sessionManager } from './session-manager';
import { StudyPlanner } from './study-planner';
import { 
  ParsedProblem, 
  EnhancedProblem, 
  ClassificationResult, 
  UploadedFile,
  EnhancedSession,
  StudentProfile,
  StudyPlan,
  StudyPlanConfig,
  DifficultyLevel,
  LearningAnalytics,
  SessionPerformance,
  SessionState,
  SessionMetadata
} from './types';

const studyPlanner = StudyPlanner.getInstance();

let rl: readline.Interface | null = null;

interface TestSession {
  problemIndex: number;
  problem: string;
  engine: SocraticEngine;
  startTime: Date;
  directAnswerCount: number;
  turnCount: number;
  problemSource: 'bank' | 'custom' | 'image';
  classification?: ClassificationResult;
  originalFile?: UploadedFile;
}

// Cleanup function to properly close readline and exit
function cleanup() {
  if (rl) {
    rl.close();
    rl = null;
  }
  process.exit(0);
}

// Setup process event listeners for clean shutdown
function setupProcessHandlers() {
  process.on('SIGINT', () => {
    console.log('\n\n👋 Goodbye! Exiting CLI tester...');
    cleanup();
  });
  
  process.on('SIGTERM', cleanup);
  process.on('exit', () => {
    if (rl) {
      rl.close();
    }
  });
}

// Create session for pre-built problem from bank
async function createBankProblemSession(selectedIndex: number): Promise<TestSession> {
  const selectedProblem = TEST_PROBLEMS[selectedIndex];
  
  console.log(`\n📝 Problem: ${selectedProblem}`);
  console.log(`📊 Type: ${PROBLEM_DESCRIPTIONS[selectedIndex]}`);
  console.log('🤖 Starting Socratic dialogue...\n');
  
  const engine = new SocraticEngine();
  return {
    problemIndex: selectedIndex,
    problem: selectedProblem,
    engine,
    startTime: new Date(),
    directAnswerCount: 0,
    turnCount: 0,
    problemSource: 'bank'
  };
}

// Create session for custom text input
async function createCustomTextSession(): Promise<TestSession | null> {
  console.log('\n📝 Custom Text Input');
  console.log('====================');
  console.log('Enter your math problem in natural language.');
  console.log('Examples:');
  console.log('  - "Solve for x: 2x + 5 = 13"');
  console.log('  - "Find the area of a triangle with base 8 and height 6"');
  console.log('  - "What is the derivative of x^2 + 3x - 2?"');
  
  const customText = await askQuestion('\nEnter your problem: ');
  
  if (!customText || customText.trim().length < 5) {
    console.log('❌ Problem text too short. Please provide a meaningful math problem.');
    return null;
  }
  
  try {
    console.log('\n🔍 Analyzing your problem...');
    
    // Parse and validate the custom text
    const parsedProblem: ParsedProblem = ProblemParser.parseProblem(customText);
    
    if (!parsedProblem.isValid) {
      console.log('❌ Problem validation failed. Please check your input and try again.');
      return null;
    }
    
    // Classify the problem
    const classification = ProblemClassifier.classify(parsedProblem);
    
    // Show analysis results
    console.log('\n📊 Problem Analysis:');
    console.log(`   Type: ${classification.problemType}`);
    console.log(`   Difficulty: ${classification.difficulty}`);
    console.log(`   Confidence: ${(classification.confidence * 100).toFixed(0)}%`);
    console.log(`   Estimated Time: ${classification.estimatedTime}`);
    console.log(`   Prerequisites: ${classification.prerequisites.join(', ')}`);
    
    const preview = ProblemParser.generatePreview(parsedProblem);
    console.log(`\n📋 Problem Preview: ${preview}`);
    
    const confirm = await askQuestion('\nProceed with this problem? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ Problem cancelled.');
      return null;
    }
    
    console.log('🤖 Starting Socratic dialogue...\n');
    
    const engine = new SocraticEngine();
    return {
      problemIndex: -1,
      problem: parsedProblem.content,
      engine,
      startTime: new Date(),
      directAnswerCount: 0,
      turnCount: 0,
      problemSource: 'custom',
      classification
    };
    
  } catch (error) {
    console.error('❌ Error processing custom text:', error);
    return null;
  }
}

// Create session for image upload
async function createImageUploadSession(): Promise<TestSession | null> {
  console.log('\n📷 Image Upload');
  console.log('===============');
  console.log('Upload an image containing a math problem.');
  console.log('Supported formats: PNG, JPG, JPEG, GIF, WebP');
  console.log('Maximum size: 20MB');
  
  const imagePath = await askQuestion('\nEnter image file path: ');
  
  if (!imagePath || !fs.existsSync(imagePath)) {
    console.log('❌ File not found. Please check the path and try again.');
    return null;
  }
  
  try {
    console.log('\n🔍 Processing image...');
    
    // Initialize image processor
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.log('❌ OpenAI API key not found. Please set OPENAI_API_KEY in your .env file.');
      return null;
    }
    
    ImageProcessor.initialize(apiKey);
    
    // Validate and process the image
    const uploadedFile: UploadedFile = ImageProcessor.createFileMetadata(imagePath);
    
    const validationResult = ImageProcessor.validateImageFile(imagePath);
    if (!validationResult.isValid) {
      console.log(`❌ Image validation failed: ${validationResult.errors.join(', ')}`);
      return null;
    }
    
    // Process image with OCR
    const ocrResult = await ImageProcessor.processImage(imagePath);
    
    if (!ocrResult.success || !ocrResult.extractedText) {
      console.log('❌ Failed to extract text from image.');
      if (ocrResult.error) {
        console.log(`   Error: ${ocrResult.error}`);
      }
      const fallback = await askQuestion('Would you like to enter the problem text manually? (y/n): ');
      if (fallback.toLowerCase() !== 'y') {
        console.log('❌ Image processing aborted.');
        return null;
      }
      const manualText = await askQuestion('\nEnter the problem text: ');
      if (!manualText || manualText.trim().length < 5) {
        console.log('❌ Problem text too short. Please provide a meaningful math problem.');
        return null;
      }
      console.log('\n🔍 Analyzing your manual input...');
      const parsedProblem: ParsedProblem = ProblemParser.parseProblem(manualText);
      if (!parsedProblem.isValid) {
        console.log('❌ Problem validation failed. Please check your input and try again.');
        return null;
      }
      const classification = ProblemClassifier.classify(parsedProblem);
      console.log('\n📊 Problem Analysis:');
      console.log(`   Type: ${classification.problemType}`);
      console.log(`   Difficulty: ${classification.difficulty}`);
      console.log(`   Confidence: ${(classification.confidence * 100).toFixed(0)}%`);
      console.log(`   Estimated Time: ${classification.estimatedTime}`);
      const previewManual = ProblemParser.generatePreview(parsedProblem);
      console.log(`\n📋 Problem Preview: ${previewManual}`);
      const confirmManual = await askQuestion('\nProceed with this problem? (y/n): ');
      if (confirmManual.toLowerCase() !== 'y') {
        console.log('❌ Problem cancelled.');
        return null;
      }
      console.log('🤖 Starting Socratic dialogue...\n');
      const engineManual = new SocraticEngine();
      return {
        problemIndex: -1,
        problem: parsedProblem.content,
        engine: engineManual,
        startTime: new Date(),
        directAnswerCount: 0,
        turnCount: 0,
        problemSource: 'image',
        classification,
        originalFile: uploadedFile
      };
    }
    
    console.log('\n📊 OCR Results:');
    console.log(`   Confidence: ${(ocrResult.confidence * 100).toFixed(0)}%`);
    console.log(`   Extracted Text: "${ocrResult.extractedText}"`);
    
    if (ocrResult.confidence < 0.7) {
      console.log('⚠️  Low confidence in text extraction. Results may be inaccurate.');
      const proceed = await askQuestion('Continue anyway? (y/n): ');
      if (proceed.toLowerCase() !== 'y') {
        return null;
      }
    }
    
    // Parse the extracted text
    const parsedProblem: ParsedProblem = ProblemParser.parseProblem(ocrResult.extractedText);
    
    // Classify the problem
    const classification = ProblemClassifier.classify(parsedProblem);
    
    // Show analysis results
    console.log('\n📊 Problem Analysis:');
    console.log(`   Type: ${classification.problemType}`);
    console.log(`   Difficulty: ${classification.difficulty}`);
    console.log(`   Confidence: ${(classification.confidence * 100).toFixed(0)}%`);
    console.log(`   Estimated Time: ${classification.estimatedTime}`);
    
    const preview = ProblemParser.generatePreview(parsedProblem);
    console.log(`\n📋 Problem Preview: ${preview}`);
    
    const confirm = await askQuestion('\nProceed with this problem? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ Problem cancelled.');
      return null;
    }
    
    console.log('🤖 Starting Socratic dialogue...\n');
    
    const engine = new SocraticEngine();
    return {
      problemIndex: -1,
      problem: parsedProblem.content,
      engine,
      startTime: new Date(),
      directAnswerCount: 0,
      turnCount: 0,
      problemSource: 'image',
      classification,
      originalFile: uploadedFile
    };
    
  } catch (error) {
    console.error('❌ Error processing image:', error);
    return null;
  }
}

async function testSocraticEngine() {
  console.log('🎓 SocraTeach CLI Tester - Functionality First!');
  console.log('Testing Socratic Engine with hardcoded problems...\n');
  console.log('📋 Validation Criteria:');
  console.log('  ✅ Tutor NEVER gives direct answers');
  console.log('  ✅ Questions guide toward solution method');
  console.log('  ✅ Conversation context is maintained');
  console.log('  ✅ Encouraging language is used');
  console.log('  ✅ Hints escalate appropriately when stuck\n');
  
  // Initialize readline interface once
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }
  
  try {
    // Enhanced menu with Day 2 and Day 3 options
    console.log('🎯 SocraTeach Main Menu:');
    console.log('========================');
    console.log('📚 Learning Sessions:');
    TEST_PROBLEMS.forEach((problem, index) => {
      console.log(`  ${index + 1}. ${problem} (${PROBLEM_DESCRIPTIONS[index]})`);
    });
    console.log('\n🆕 Day 2 Features:');
    console.log(`  ${TEST_PROBLEMS.length + 1}. Custom Text Input - Enter your own math problem`);
    console.log(`  ${TEST_PROBLEMS.length + 2}. Image Upload - Upload an image with a math problem`);
    console.log('\n🚀 Day 3 Advanced Features:');
    console.log(`  ${TEST_PROBLEMS.length + 3}. Analytics Dashboard - View your learning progress and insights`);
    console.log(`  ${TEST_PROBLEMS.length + 4}. Resume Session - Continue an interrupted learning session`);
    console.log(`  ${TEST_PROBLEMS.length + 5}. Study Plan Generator - Create personalized learning plans`);
    
    const selection = await askQuestion(`\nSelect option (1-${TEST_PROBLEMS.length + 5}): `);
    const selectedIndex = parseInt(selection) - 1;
    
    let session: TestSession | null = null;
    
    // Handle different input types
    if (selectedIndex >= 0 && selectedIndex < TEST_PROBLEMS.length) {
      // Pre-built problem from bank
      session = await createBankProblemSession(selectedIndex);
    } else if (selectedIndex === TEST_PROBLEMS.length) {
      // Custom text input
      session = await createCustomTextSession();
    } else if (selectedIndex === TEST_PROBLEMS.length + 1) {
      // Image upload
      session = await createImageUploadSession();
    } else if (selectedIndex === TEST_PROBLEMS.length + 2) {
      // Analytics Dashboard
      await showAnalyticsDashboard();
      return;
    } else if (selectedIndex === TEST_PROBLEMS.length + 3) {
      // Resume Session
      await resumeSession();
      return;
    } else if (selectedIndex === TEST_PROBLEMS.length + 4) {
      // Study Plan Generator
      await showStudyPlanGenerator();
      return;
    } else {
      console.log('❌ Invalid selection. Exiting...');
      return;
    }
    
    if (!session) {
      console.log('❌ Failed to create session. Exiting...');
      return;
    }
    
    try {
      const initialResponse = await session.engine.startProblem(session.problem);
      console.log(`Tutor: ${initialResponse}\n`);
      
      // Check for direct answers in initial response
      if (session.engine.containsDirectAnswer(initialResponse)) {
        session.directAnswerCount++;
        console.log('⚠️  WARNING: Initial response may contain direct answer!\n');
      }
      
      // Interactive dialogue loop
      await runDialogueLoop(session);
      
    } catch (error) {
      console.error('❌ Error starting problem:', error);
      console.log('💡 Make sure your OpenAI API key is set in .env file');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error in CLI tester:', error);
  } finally {
    // Clean exit
    cleanup();
  }
}

async function runDialogueLoop(session: TestSession) {
  while (true) {
    const studentInput = await askQuestion('Student: ');
    
    // Handle graceful quit (including stdin closure)
    if (studentInput.toLowerCase() === 'quit') {
      await showSessionSummary(session);
      cleanup();
      return;
    }
    
    if (studentInput.toLowerCase() === 'validate') {
      await runValidationCheck(session);
      continue;
    }
    
    if (studentInput.toLowerCase() === 'help') {
      showHelp();
      continue;
    }
    
    try {
      session.turnCount++;
      const tutorResponse = await session.engine.respondToStudent(studentInput);
      console.log(`Tutor: ${tutorResponse}\n`);
      
      // Check for direct answers
      if (session.engine.containsDirectAnswer(tutorResponse)) {
        session.directAnswerCount++;
        console.log('⚠️  WARNING: Response may contain direct answer!\n');
      }
      
    } catch (error) {
      console.error('❌ Error getting response:', error);
    }
  }
}

async function showSessionSummary(session: TestSession) {
  const duration = (new Date().getTime() - session.startTime.getTime()) / 1000;
  
  console.log('\n📊 Session Summary:');
  console.log('==================');
  console.log(`Problem: ${session.problem}`);
  console.log(`Source: ${session.problemSource.toUpperCase()}`);
  console.log(`Duration: ${duration.toFixed(1)} seconds`);
  console.log(`Total turns: ${session.turnCount}`);
  console.log(`Direct answers detected: ${session.directAnswerCount}`);
  console.log(`Socratic compliance: ${session.directAnswerCount === 0 ? '✅ PASSED' : '❌ FAILED'}`);
  
  // Show classification results for Day 2 features
  if (session.classification) {
    console.log('\n🔍 Problem Classification:');
    console.log('=========================');
    console.log(`Type: ${session.classification.problemType}`);
    console.log(`Difficulty: ${session.classification.difficulty}`);
    console.log(`Confidence: ${(session.classification.confidence * 100).toFixed(0)}%`);
    console.log(`Estimated Time: ${session.classification.estimatedTime}`);
    console.log(`Prerequisites: ${session.classification.prerequisites.join(', ')}`);
    console.log(`Reasoning: ${session.classification.reasoning}`);
  }
  
  // Show file information for image uploads
  if (session.originalFile) {
    console.log('\n📷 Original File:');
    console.log('=================');
    console.log(`Name: ${session.originalFile.originalName}`);
    console.log(`Size: ${(session.originalFile.size / 1024).toFixed(1)} KB`);
    console.log(`Type: ${session.originalFile.mimeType}`);
    console.log(`Uploaded: ${session.originalFile.uploadedAt.toLocaleString()}`);
  }
  
  console.log('\n💬 Conversation History:');
  console.log('========================');
  session.engine.getConversationHistory().forEach((msg, i) => {
    const role = msg.role === 'assistant' ? 'Tutor' : 'Student';
    console.log(`${i + 1}. ${role}: ${msg.content}`);
  });
  
  if (session.directAnswerCount > 0) {
    console.log('\n⚠️  Issues Found:');
    console.log('- Tutor gave direct answers (violates Socratic method)');
    console.log('- Review system prompt and adjust if needed');
  } else {
    console.log('\n✅ Validation Passed:');
    console.log('- No direct answers detected');
    console.log('- Socratic methodology maintained');
  }
  
  // Day 2 specific validation
  if (session.problemSource !== 'bank') {
    console.log('\n🆕 Day 2 Feature Validation:');
    console.log('============================');
    console.log(`✅ ${session.problemSource === 'custom' ? 'Custom text parsing' : 'Image OCR processing'} successful`);
    console.log(`✅ Problem classification completed`);
    console.log(`✅ Enhanced session metadata captured`);
  }
}

async function runValidationCheck(session: TestSession) {
  console.log('\n🔍 Running Validation Check...');
  console.log('==============================');
  
  const history = session.engine.getConversationHistory();
  const tutorMessages = history.filter(msg => msg.role === 'assistant');
  
  console.log(`✅ Total tutor responses: ${tutorMessages.length}`);
  console.log(`✅ Direct answers detected: ${session.directAnswerCount}`);
  console.log(`✅ Conversation length: ${session.turnCount} turns`);
  console.log(`✅ Context maintained: ${history.length > 0 ? 'YES' : 'NO'}`);
  
  // Manual validation prompts
  const guidanceQuality = await askQuestion('Rate guidance quality (1-5): ');
  const encouragement = await askQuestion('Encouraging language used? (y/n): ');
  const contextMaintained = await askQuestion('Context maintained throughout? (y/n): ');
  
  console.log('\n📋 Manual Validation Results:');
  console.log(`- Guidance Quality: ${guidanceQuality}/5`);
  console.log(`- Encouraging Language: ${encouragement.toLowerCase() === 'y' ? '✅' : '❌'}`);
  console.log(`- Context Maintained: ${contextMaintained.toLowerCase() === 'y' ? '✅' : '❌'}`);
  console.log(`- No Direct Answers: ${session.directAnswerCount === 0 ? '✅' : '❌'}`);
  
  console.log('\nContinue conversation or type "quit" to finish...\n');
}

function showHelp() {
  console.log('\n📖 SocraTeach Help Guide:');
  console.log('=========================');
  console.log('💬 During Conversation:');
  console.log('  - Type your response as a student would');
  console.log('  - "quit" - End session and show summary');
  console.log('  - "validate" - Run validation check');
  console.log('  - "help" - Show this help message');
  console.log('\n🆕 Day 2 Features:');
  console.log('  - Custom Text: Enter math problems in natural language');
  console.log('  - Image Upload: Process images with OCR for math problems');
  console.log('  - Auto Classification: Automatic problem type and difficulty detection');
  console.log('  - Enhanced Analytics: Detailed session summaries with metadata');
  console.log('\n🚀 Day 3 Advanced Features:');
  console.log('  - Analytics Dashboard: View learning progress, strengths, and knowledge gaps');
  console.log('  - Session Resume: Continue interrupted learning sessions with full context');
  console.log('  - Study Plan Generator: Create personalized learning paths and schedules');
  console.log('  - Adaptive Learning: Dynamic difficulty adjustment based on performance');
  console.log('  - Progress Tracking: Comprehensive analytics with ASCII visualizations');
  console.log('  - Local Data Storage: Privacy-focused encrypted storage of learning data\n');
}

// Check if stdin is available for interactive input
function isStdinAvailable(): boolean {
  return !process.stdin.readableEnded && !process.stdin.destroyed && process.stdin.readable;
}

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if readline interface exists
    if (!rl) {
      reject(new Error('Readline interface not initialized'));
      return;
    }
    
    // Proactive stdin checking with user-friendly messages
    if (!isStdinAvailable()) {
      // Graceful handling - don't show error for normal piped input scenarios
      console.log('\n📝 Session completed - input stream ended');
      console.log('💡 For interactive testing, run the CLI directly without piping input');
      resolve('quit'); // Return quit to gracefully end the session
      return;
    }
    
    try {
      rl.question(question, (answer) => {
        resolve(answer);
      });
    } catch (error) {
      // Better error handling for unexpected issues
      console.log('\n⚠️  Input error occurred - ending session gracefully');
      resolve('quit');
    }
  });
}

// Day 3 Feature Functions
async function showAnalyticsDashboard() {
  console.log('\n📊 Analytics Dashboard');
  console.log('======================');
  
  try {
    // Get or create student profile
    const profile = await getOrCreateStudentProfile();
    
    // Generate analytics report
    const analyticsReport = await analyticsEngine.generateAnalyticsReport(profile.id);
    
    // Display analytics with ASCII visualization
    displayAnalyticsVisualization(analyticsReport, profile);
    
    // Show recommendations
    const recommendations = await studyPlanner.generateStudyRecommendations(profile);
    displayRecommendations(recommendations);
    
    // Interactive analytics menu
    await analyticsInteractiveMenu(profile);
    
  } catch (error) {
    console.error('❌ Error loading analytics:', error);
  }
}

async function resumeSession() {
  console.log('\n🔄 Resume Learning Session');
  console.log('===========================');
  
  try {
    // Get available sessions to resume
    const availableSessions = await sessionManager.getResumableSessions();
    
    if (availableSessions.length === 0) {
      console.log('📝 No interrupted sessions found.');
      console.log('💡 Start a new learning session from the main menu.');
      return;
    }
    
    // Display available sessions
    console.log('📋 Available Sessions to Resume:');
    availableSessions.forEach((session: SessionMetadata, index: number) => {
      const duration = session.lastActivity ? 
        Math.round((Date.now() - new Date(session.lastActivity).getTime()) / (1000 * 60)) : 0;
      console.log(`  ${index + 1}. ${session.problemId} (${duration} minutes ago)`);
    });
    
    const selection = await askQuestion(`\nSelect session to resume (1-${availableSessions.length}): `);
    const sessionIndex = parseInt(selection) - 1;
    
    if (sessionIndex >= 0 && sessionIndex < availableSessions.length) {
      const sessionId = availableSessions[sessionIndex].sessionId;
      console.log('🚀 Resuming session...\n');
      
      // Resume the session
      const resumedSession = await sessionManager.resumeSession(sessionId);
      
      // Continue with the session
      await continueResumedSession(resumedSession);
    } else {
      console.log('❌ Invalid selection.');
    }
    
  } catch (error) {
    console.error('❌ Error resuming session:', error);
  }
}

async function showStudyPlanGenerator() {
  console.log('\n📚 Study Plan Generator');
  console.log('========================');
  
  try {
    // Get or create student profile
    const profile = await getOrCreateStudentProfile();
    
    // Study plan configuration menu
    console.log('\n🎯 Study Plan Configuration:');
    console.log('1. Quick Plan (1 week, general improvement)');
    console.log('2. Focused Plan (2 weeks, specific topic)');
    console.log('3. Comprehensive Plan (4 weeks, full curriculum)');
    console.log('4. Custom Plan (configure all options)');
    
    const planType = await askQuestion('\nSelect plan type (1-4): ');
    
    let config: StudyPlanConfig;
    
    switch (planType) {
      case '1':
        config = await createQuickPlan();
        break;
      case '2':
        config = await createFocusedPlan();
        break;
      case '3':
        config = await createComprehensivePlan();
        break;
      case '4':
        config = await createCustomPlan();
        break;
      default:
        console.log('❌ Invalid selection.');
        return;
    }
    
    console.log('\n🔄 Generating your personalized study plan...');
    
    // Generate the study plan
    const studyPlan = await studyPlanner.generateStudyPlan(profile, config);
    
    // Display the study plan
    displayStudyPlan(studyPlan);
    
    // Study plan management menu
    await studyPlanInteractiveMenu(studyPlan);
    
  } catch (error) {
    console.error('❌ Error generating study plan:', error);
  }
}

// Helper functions for Day 3 features
async function getOrCreateStudentProfile(): Promise<StudentProfile> {
  try {
    const profileDB = await dataStorage.loadStudentProfile();
    
    if (profileDB) {
      return profileDB.profile;
    }
    
    // Create new profile
    return await createNewStudentProfile();
    
  } catch (error) {
    console.log('📝 Creating new student profile...');
    return await createNewStudentProfile();
  }
}

async function createNewStudentProfile(): Promise<StudentProfile> {
  console.log('\n👤 Create Student Profile');
  console.log('=========================');
  
  const name = await askQuestion('Enter your name: ');
  
  console.log('\n🎨 Learning Style Assessment:');
  console.log('1. Visual (learn through diagrams and visual aids)');
  console.log('2. Auditory (learn through explanation and discussion)');
  console.log('3. Kinesthetic (learn through hands-on practice)');
  console.log('4. Reading/Writing (learn through text and notes)');
  
  const styleChoice = await askQuestion('Select your learning style (1-4): ');
  const learningStyles = ['visual', 'auditory', 'kinesthetic', 'reading_writing'];
  const learningStyle = learningStyles[parseInt(styleChoice) - 1] || 'visual';
  
  const profileId = `student_${Date.now()}`;
  const profile: StudentProfile = {
    id: profileId,
    studentId: profileId,
    name,
    learningStyle: learningStyle as any,
    createdAt: new Date(),
    lastActive: new Date(),
    totalSessions: 0,
    currentLevel: 1,
    preferences: {
      sessionLength: 30,
      difficultyPreference: 'adaptive',
      feedbackLevel: 'detailed',
      feedbackStyle: 'encouraging'
    },
    performanceHistory: [],
    knowledgeGaps: [],
    analytics: {
      studentId: profileId,
      successRate: 0,
      averageSessionTime: 0,
      learningVelocity: 0,
      knowledgeGaps: [],
      strengths: [],
      performanceTrends: [],
      lastUpdated: new Date()
    }
  };
  
  const profileDB = {
    studentId: profile.id,
    profile: profile,
    analytics: profile.analytics!
  };
  await dataStorage.saveStudentProfile(profileDB);
  console.log(`✅ Profile created for ${name}!`);
  
  return profile;
}

function displayAnalyticsVisualization(analytics: any, profile: StudentProfile) {
  console.log(`\n📈 Learning Analytics for ${profile.name}`);
  console.log('=====================================');
  
  // Success Rate Visualization
  console.log('\n🎯 Success Rate:');
  const successRate = Math.round(analytics.successRate * 100);
  const successBar = '█'.repeat(Math.floor(successRate / 5)) + '░'.repeat(20 - Math.floor(successRate / 5));
  console.log(`[${successBar}] ${successRate}%`);
  
  // Learning Velocity
  console.log('\n⚡ Learning Velocity:');
  const velocity = analytics.learningVelocity;
  const velocityIndicator = velocity > 0.1 ? '📈 Accelerating' : 
                           velocity > 0 ? '➡️ Steady' : '📉 Needs Support';
  console.log(`${velocityIndicator} (${(velocity * 100).toFixed(1)}% improvement rate)`);
  
  // Strengths and Gaps
  console.log('\n💪 Strengths:');
  if (analytics.strengths.length > 0) {
    analytics.strengths.forEach((strength: string) => {
      console.log(`  ✅ ${strength}`);
    });
  } else {
    console.log('  📝 Complete more sessions to identify strengths');
  }
  
  console.log('\n🎯 Areas for Improvement:');
  if (analytics.knowledgeGaps.length > 0) {
    analytics.knowledgeGaps.forEach((gap: string) => {
      console.log(`  🔍 ${gap}`);
    });
  } else {
    console.log('  🌟 No significant knowledge gaps identified');
  }
  
  // Session Statistics
  console.log('\n📊 Session Statistics:');
  console.log(`  Total Sessions: ${analytics.totalSessions}`);
  console.log(`  Total Time: ${Math.round(analytics.totalTimeSpent / 60)} hours`);
  console.log(`  Average Session: ${analytics.totalSessions > 0 ? Math.round(analytics.totalTimeSpent / analytics.totalSessions) : 0} minutes`);
}

function displayRecommendations(recommendations: any[]) {
  if (recommendations.length === 0) return;
  
  console.log('\n💡 Personalized Recommendations:');
  console.log('=================================');
  
  recommendations.forEach((rec, index) => {
    const priorityIcon = rec.priority === 'high' ? '🔥' : rec.priority === 'medium' ? '⭐' : '💡';
    console.log(`\n${priorityIcon} ${rec.title}`);
    console.log(`   ${rec.description}`);
    console.log(`   ⏱️ Estimated time: ${rec.estimatedTime} minutes`);
    console.log(`   📊 Difficulty: ${rec.difficulty}`);
    if (rec.reasoning) {
      console.log(`   🧠 Why: ${rec.reasoning}`);
    }
  });
}

async function analyticsInteractiveMenu(profile: StudentProfile) {
  console.log('\n🔧 Analytics Options:');
  console.log('1. View detailed performance trends');
  console.log('2. Export analytics data');
  console.log('3. Reset analytics data');
  console.log('4. Return to main menu');
  
  const choice = await askQuestion('\nSelect option (1-4): ');
  
  switch (choice) {
    case '1':
      await showDetailedTrends(profile);
      break;
    case '2':
      await exportAnalyticsData(profile);
      break;
    case '3':
      await resetAnalyticsData(profile);
      break;
    case '4':
    default:
      return;
  }
}

async function continueResumedSession(session: any) {
  console.log(`📚 Continuing: ${session.topic}`);
  console.log(`⏰ Last activity: ${new Date(session.lastActivity).toLocaleString()}`);
  console.log(`📊 Progress: ${Math.round(session.progress * 100)}%\n`);
  
  // Create a test session from the resumed session
  const testSession: TestSession = {
    problemIndex: -1,
    problem: session.currentProblem || 'Continue your learning journey',
    engine: new SocraticEngine(),
    startTime: new Date(),
    directAnswerCount: 0,
    turnCount: session.turnCount || 0,
    problemSource: 'custom'
  };
  
  // Resume the conversation
  console.log('🤖 Welcome back! Let\'s continue where we left off...\n');
  await runDialogueLoop(testSession);
}

function displayStudyPlan(studyPlan: StudyPlan) {
  console.log('\n📚 Your Personalized Study Plan');
  console.log('===============================');
  console.log(`📋 Title: ${studyPlan.title}`);
  console.log(`📅 Created: ${studyPlan.createdAt.toLocaleDateString()}`);
  console.log(`🎯 Target Date: ${studyPlan.targetDate.toLocaleDateString()}`);
  console.log(`📊 Progress: ${studyPlan.progress}%`);
  console.log(`⏱️ Estimated Duration: ${Math.round(studyPlan.estimatedDuration / 60)} hours`);
  
  // Display goals
  console.log('\n🎯 Learning Goals:');
  if (studyPlan.goals.length > 0) {
    studyPlan.goals.forEach((goal, index) => {
      console.log(`  ${index + 1}. ${goal.description}`);
    });
  } else {
    console.log('  No specific goals defined');
  }
  
  // Display milestones
  console.log('\n🏆 Milestones:');
  studyPlan.milestones.forEach((milestone, index) => {
    const status = milestone.achieved ? '✅' : '⏳';
    console.log(`  ${status} ${milestone.description} (Target: ${milestone.targetDate.toLocaleDateString()})`);
  });
  
  console.log(`\n📊 Plan Statistics:`);
  console.log(`  Total milestones: ${studyPlan.milestones.length}`);
  console.log(`  Recommended problems: ${studyPlan.recommendedProblems.length}`);
  console.log(`  Adaptive adjustments: ${studyPlan.adaptiveAdjustments ? 'Enabled' : 'Disabled'}`);
}

async function studyPlanInteractiveMenu(studyPlan: StudyPlan) {
  console.log('\n🔧 Study Plan Options:');
  console.log('1. Start first session');
  console.log('2. View detailed schedule');
  console.log('3. Modify plan settings');
  console.log('4. Export plan to file');
  console.log('5. Return to main menu');
  
  const choice = await askQuestion('\nSelect option (1-5): ');
  
  switch (choice) {
    case '1':
      await startStudyPlanSession(studyPlan);
      break;
    case '2':
      await showDetailedSchedule(studyPlan);
      break;
    case '3':
      await modifyStudyPlan(studyPlan);
      break;
    case '4':
      await exportStudyPlan(studyPlan);
      break;
    case '5':
    default:
      return;
  }
}

// Study plan configuration functions
async function createQuickPlan(): Promise<StudyPlanConfig> {
  return {
    duration: 7,
    sessionsPerWeek: 5,
    sessionLength: 30,
    targetLevel: DifficultyLevel.INTERMEDIATE,
    preferences: {
      difficultyProgression: 'adaptive',
      includeReview: true
    }
  };
}

async function createFocusedPlan(): Promise<StudyPlanConfig> {
  console.log('\n🎯 Select focus area:');
  console.log('1. Algebra');
  console.log('2. Geometry');
  console.log('3. Calculus');
  console.log('4. Statistics');
  console.log('5. Word Problems');
  
  const focusChoice = await askQuestion('Select focus area (1-5): ');
  const focusAreas = ['algebra', 'geometry', 'calculus', 'statistics', 'word_problems'];
  const selectedFocus = focusAreas[parseInt(focusChoice) - 1] || 'algebra';
  
  return {
    duration: 14,
    sessionsPerWeek: 4,
    sessionLength: 45,
    focusAreas: [selectedFocus],
    targetLevel: DifficultyLevel.ADVANCED,
    preferences: {
      difficultyProgression: 'adaptive',
      includeReview: true
    }
  };
}

async function createComprehensivePlan(): Promise<StudyPlanConfig> {
  return {
    duration: 28,
    sessionsPerWeek: 5,
    sessionLength: 60,
    focusAreas: ['algebra', 'geometry', 'calculus', 'statistics'],
    targetLevel: DifficultyLevel.ADVANCED,
    preferences: {
      difficultyProgression: 'adaptive',
      includeReview: true
    }
  };
}

async function createCustomPlan(): Promise<StudyPlanConfig> {
  console.log('\n⚙️ Custom Plan Configuration:');
  
  const duration = parseInt(await askQuestion('Duration in days (7-90): ')) || 14;
  const sessionsPerWeek = parseInt(await askQuestion('Sessions per week (1-7): ')) || 3;
  const sessionLength = parseInt(await askQuestion('Session length in minutes (15-120): ')) || 30;
  
  console.log('\n🎯 Select difficulty level:');
  console.log('1. Beginner');
  console.log('2. Intermediate');
  console.log('3. Advanced');
  
  const difficultyChoice = await askQuestion('Select difficulty (1-3): ');
  const difficulties = [DifficultyLevel.BEGINNER, DifficultyLevel.INTERMEDIATE, DifficultyLevel.ADVANCED];
  const targetLevel = difficulties[parseInt(difficultyChoice) - 1] || DifficultyLevel.INTERMEDIATE;
  
  return {
    duration: Math.max(7, Math.min(90, duration)),
    sessionsPerWeek: Math.max(1, Math.min(7, sessionsPerWeek)),
    sessionLength: Math.max(15, Math.min(120, sessionLength)),
    targetLevel,
    preferences: {
      difficultyProgression: 'adaptive',
      includeReview: true
    }
  };
}

// Placeholder functions for interactive menu options
async function showDetailedTrends(profile: StudentProfile) {
  console.log('\n📈 Detailed Performance Trends');
  console.log('==============================');
  console.log('📊 Feature coming soon - detailed trend analysis with charts');
}

async function exportAnalyticsData(profile: StudentProfile) {
  console.log('\n💾 Export Analytics Data');
  console.log('========================');
  console.log('📁 Feature coming soon - export to CSV/JSON format');
}

async function resetAnalyticsData(profile: StudentProfile) {
  console.log('\n🔄 Reset Analytics Data');
  console.log('=======================');
  const confirm = await askQuestion('Are you sure you want to reset all analytics data? (yes/no): ');
  if (confirm.toLowerCase() === 'yes') {
    console.log('🗑️ Analytics data reset (feature coming soon)');
  }
}

async function startStudyPlanSession(studyPlan: StudyPlan) {
  console.log('\n🚀 Starting Study Plan Session');
  console.log('==============================');
  console.log('📚 Feature coming soon - integrated study plan sessions');
}

async function showDetailedSchedule(studyPlan: StudyPlan) {
  console.log('\n📅 Detailed Study Schedule');
  console.log('==========================');
  console.log('🗓️ Feature coming soon - calendar view with session scheduling');
}

async function modifyStudyPlan(studyPlan: StudyPlan) {
  console.log('\n⚙️ Modify Study Plan');
  console.log('====================');
  console.log('🔧 Feature coming soon - plan modification and adaptation');
}

async function exportStudyPlan(studyPlan: StudyPlan) {
  console.log('\n💾 Export Study Plan');
  console.log('====================');
  console.log('📁 Feature coming soon - export to PDF/calendar format');
}

// Handle environment setup
function checkEnvironment() {
  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ OpenAI API key not found!');
    console.log('💡 Create a .env file with: OPENAI_API_KEY=your_key_here');
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  // Load environment variables
  require('dotenv').config();
  
  // Setup process handlers for clean shutdown
  setupProcessHandlers();
  
  checkEnvironment();
  testSocraticEngine().catch((error) => {
    console.error('❌ CLI tester error:', error);
    cleanup();
  });
}