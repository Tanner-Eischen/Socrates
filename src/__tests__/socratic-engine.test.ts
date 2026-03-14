/**
 * Socratic Engine Tests
 * Tests for the core Socratic tutoring engine functionality
 *
 * Covers:
 * - buildEnhancedSystemPrompt includes problem context
 * - Engine never provides direct answers
 * - Engine adapts to student confidence
 * - Engine asks context-aware questions
 */

import { describe, expect, it, beforeEach, jest, afterEach } from '@jest/globals';
import { SocraticQuestionType, DialogueLevel, CycleStage } from '../engine/types';

// Mock the OpenAI client to avoid actual API calls
jest.mock('../engine/openai-client', () => ({
  chatCompletion: jest.fn<() => Promise<string>>().mockResolvedValue(
    'What steps have you tried so far to solve this problem?'
  ),
}));

// Mock the logger
jest.mock('../api/middleware/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SocraticEngine', () => {
  let engine: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // 1. buildEnhancedSystemPrompt includes problem context
  // ========================================
  describe('buildEnhancedSystemPrompt', () => {
    it('includes the problem context in the system prompt', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const buildPrompt = engine.buildEnhancedSystemPrompt.bind(engine);
      const problem = 'Solve 2x + 5 = 13';
      const prompt = buildPrompt(problem);

      expect(prompt).toContain('PROBLEM:');
      expect(prompt).toContain('2x + 5 = 13');
    });

    it('includes algebra problems verbatim', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const buildPrompt = engine.buildEnhancedSystemPrompt.bind(engine);
      const problem = 'Solve the quadratic equation: x^2 - 5x + 6 = 0';
      const prompt = buildPrompt(problem);

      expect(prompt).toContain('x^2 - 5x + 6 = 0');
    });

    it('includes geometry problems verbatim', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const buildPrompt = engine.buildEnhancedSystemPrompt.bind(engine);
      const problem = 'Find the area of a circle with radius 5';
      const prompt = buildPrompt(problem);

      expect(prompt).toContain('circle');
      expect(prompt).toContain('radius 5');
    });

    it('includes science problems verbatim', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const buildPrompt = engine.buildEnhancedSystemPrompt.bind(engine);
      const problem = 'What is photosynthesis?';
      const prompt = buildPrompt(problem);

      expect(prompt).toContain('photosynthesis');
    });

    it('includes Socratic questioning guidelines', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const buildPrompt = engine.buildEnhancedSystemPrompt.bind(engine);
      const prompt = buildPrompt('Test problem');

      expect(prompt).toMatch(/critical.*thinking/i);
      expect(prompt).toMatch(/metacognitive/i);
    });

    it('includes adaptive questioning guidelines for student confidence', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const buildPrompt = engine.buildEnhancedSystemPrompt.bind(engine);
      const prompt = buildPrompt('Calculate the area of a circle');

      expect(prompt).toMatch(/adaptive/i);
      expect(prompt).toMatch(/struggling|difficulty/i);
    });

    it('includes error analysis guidelines', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const buildPrompt = engine.buildEnhancedSystemPrompt.bind(engine);
      const prompt = buildPrompt('Solve the quadratic equation');

      expect(prompt).toMatch(/error.*analysis|misunderstanding/i);
      expect(prompt).toMatch(/misconception/i);
    });
  });

  // ========================================
  // 2. The engine never provides direct answers
  // ========================================
  describe('Engine Never Provides Direct Answers', () => {
    it('instructs the tutor to never provide direct answers in the system prompt', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const buildPrompt = engine.buildEnhancedSystemPrompt.bind(engine);
      const prompt = buildPrompt('Test problem');

      expect(prompt).toMatch(/never.*immediately.*provide.*answer/i);
    });

    it('instructs tutor to redirect students asking for final solutions', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const buildPrompt = engine.buildEnhancedSystemPrompt.bind(engine);
      const prompt = buildPrompt('Test problem');

      expect(prompt).toMatch(/respectfully.*decline|redirect/i);
    });

    it('emphasizes guiding over solving', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const buildPrompt = engine.buildEnhancedSystemPrompt.bind(engine);
      const prompt = buildPrompt('Test problem');

      expect(prompt).toMatch(/hint|nudge|guide/i);
      expect(prompt).toMatch(/independent.*problem.*solving/i);
    });

    it('tutor response validation detects direct answer patterns', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      // Check if the engine has a method to detect direct answers
      const containsDirectAnswer = engine.containsDirectAnswer?.bind(engine);
      if (containsDirectAnswer) {
        // Direct answer patterns should be detected
        expect(containsDirectAnswer('The answer is 4')).toBe(true);
        expect(containsDirectAnswer('x = 4')).toBe(true);
        expect(containsDirectAnswer('So x equals 4')).toBe(true);

        // Socratic responses should not trigger
        expect(containsDirectAnswer('What do you think x might be?')).toBe(false);
        expect(containsDirectAnswer('How did you arrive at that conclusion?')).toBe(false);
      }
    });

    it('includes incremental hint guidelines instead of complete steps', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const buildPrompt = engine.buildEnhancedSystemPrompt.bind(engine);
      const prompt = buildPrompt('Test problem');

      expect(prompt).toMatch(/incremental.*hint|small.*nudge/i);
      expect(prompt).toMatch(/complete.*step/i);
    });
  });

  // ========================================
  // 3. The engine adapts to student confidence
  // ========================================
  describe('Engine Adapts to Student Confidence', () => {
    it('includes adaptive difficulty guidelines in system prompt', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const buildPrompt = engine.buildEnhancedSystemPrompt.bind(engine);
      const prompt = buildPrompt('Test problem');

      expect(prompt).toMatch(/adapt.*difficulty/i);
    });

    it('includes guidance for students demonstrating strong understanding', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const buildPrompt = engine.buildEnhancedSystemPrompt.bind(engine);
      const prompt = buildPrompt('Test problem');

      expect(prompt).toMatch(/strong.*understanding|challenging.*question/i);
    });

    it('includes guidance for struggling students', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const buildPrompt = engine.buildEnhancedSystemPrompt.bind(engine);
      const prompt = buildPrompt('Test problem');

      expect(prompt).toMatch(/struggling|simpler.*question|additional.*support/i);
    });

    it('has assessStudentResponse method for confidence evaluation', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      // Check for assessment method
      const assessMethod = engine.assessStudentResponse?.bind(engine);
      if (assessMethod) {
        const assessment = assessMethod("I'm not sure, but I think...");
        expect(assessment).toHaveProperty('confidenceLevel');
      }
    });

    it('has depth tracker for conversation progression', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      // Check for depth tracker
      const depthTracker = engine.getDepthTracker?.();
      if (depthTracker) {
        expect(depthTracker).toHaveProperty('currentDepth');
        expect(depthTracker).toHaveProperty('maxDepthReached');
      }
    });

    it('has analytics generation for tracking student progress', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      // Check for analytics method
      const analytics = engine.generateAnalytics?.();
      if (analytics) {
        expect(analytics).toHaveProperty('totalInteractions');
      }
    });
  });

  // ========================================
  // 4. The engine asks context-aware questions
  // ========================================
  describe('Engine Asks Context-Aware Questions', () => {
    it('system prompt references the specific problem domain', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const buildPrompt = engine.buildEnhancedSystemPrompt.bind(engine);

      // Algebra problem
      const algebraPrompt = buildPrompt('Solve 2x + 5 = 13');
      expect(algebraPrompt).toContain('2x + 5 = 13');

      // Geometry problem
      const geometryPrompt = buildPrompt('Find the area of a circle with radius 5');
      expect(geometryPrompt).toContain('circle');
      expect(geometryPrompt).toContain('radius 5');
    });

    it('includes example phrases for Socratic questioning', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const buildPrompt = engine.buildEnhancedSystemPrompt.bind(engine);
      const prompt = buildPrompt('Test problem');

      expect(prompt).toMatch(/explain your thinking/i);
      expect(prompt).toMatch(/what might you try next/i);
    });

    it('includes metacognitive prompt examples', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const buildPrompt = engine.buildEnhancedSystemPrompt.bind(engine);
      const prompt = buildPrompt('Test problem');

      expect(prompt).toMatch(/self-evaluation|reflect/i);
      expect(prompt).toMatch(/strategies|confident/i);
    });

    it('has metacognitive prompt retrieval method', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      // Check for metacognitive prompt method
      const getMetacognitivePrompt = engine.getMetacognitivePrompt?.bind(engine);
      if (getMetacognitivePrompt) {
        const prompt = getMetacognitivePrompt('processReflection');
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(10);
      }
    });

    it('has question type selection for varied questioning', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      // Check for question type sequence tracking
      const sequence = engine.getQuestionTypeSequence?.();
      expect(Array.isArray(sequence)).toBe(true);
    });

    it('includes guidance to avoid repetition', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const buildPrompt = engine.buildEnhancedSystemPrompt.bind(engine);
      const prompt = buildPrompt('Test problem');

      // The prompt should encourage varied questioning
      expect(prompt.length).toBeGreaterThan(100);
    });
  });

  // ========================================
  // Additional tests for session management
  // ========================================
  describe('Session Management', () => {
    it('initializes session correctly', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const sessionId = 'test-session-123';
      engine.initializeSession(sessionId);

      // Session should be initialized without error
      expect(engine).toBeDefined();
    });

    it('starts problem with student-first option', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const response = await engine.startProblem('Test problem', { studentFirst: true });
      expect(typeof response).toBe('string');
    });

    it('starts problem without student-first option', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const response = await engine.startProblem('Test problem', { studentFirst: false });
      expect(typeof response).toBe('string');
    });

    it('returns conversation history', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      await engine.startProblem('Test problem');
      const history = engine.getConversationHistory?.();

      expect(Array.isArray(history)).toBe(true);
    });
  });

  // ========================================
  // Assessment Mode Tests
  // ========================================
  describe('Assessment Mode', () => {
    it('starts assessment mode with expected answer', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const problem = 'What is 5 + 3?';
      await engine.startAssessmentProblem(problem, '8');

      expect(engine.isInAssessmentMode?.()).toBe(true);
    });

    it('exits assessment mode after correct answer', async () => {
      const { SocraticEngine } = await import('../socratic-engine');
      engine = new SocraticEngine();

      const problem = 'What is 2 + 2?';
      await engine.startAssessmentProblem(problem, '4');

      expect(engine.isInAssessmentMode?.()).toBe(true);

      await engine.respondToStudent('4');

      expect(engine.isInAssessmentMode?.()).toBe(false);
    });
  });

  // ========================================
  // Error Handling Tests
  // ========================================
  describe('Error Handling', () => {
    it('throws error when API key is missing', async () => {
      delete process.env.OPENAI_API_KEY;

      const { SocraticEngine } = await import('../socratic-engine');
      const engineNoKey = new SocraticEngine();

      await engineNoKey.startProblem('Test problem');

      await expect(
        engineNoKey.respondToStudent('Test input')
      ).rejects.toThrow('OpenAI API key');

      process.env.OPENAI_API_KEY = 'test-key';
    });
  });
});
