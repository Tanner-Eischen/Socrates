/**
 * Socratic Engine - Main Implementation
 * 
 * This file maintains backward compatibility while using modular components.
 * Types and utilities have been extracted to separate modules but are re-exported here.
 */

import { BehavioralAssessment } from './types';
import { chatCompletion } from './engine/openai-client';

// Import types explicitly
import type {
  ConversationDepthTracker,
  SocraticAssessment,
  EnhancedMessage,
  EnhancedStudentProfile,
  SessionPerformance,
} from './engine/types';
import {
  SocraticQuestionType,
  DialogueLevel,
  CycleStage,
  DifficultyLevel,
} from './engine/types';

// Re-export types from centralized location (for backward compatibility)
export * from './engine/types';

// Import modular utilities
import { computeDialogueLevel, computeCycleStage } from './engine/dialogue-utils';
import { PromptManager } from './engine/prompts';
import { QuestionSelector } from './engine/question-selector';
import { StudentAssessor } from './engine/student-assessor';
import { DepthTrackerManager } from './engine/depth-tracker';

// Complete Socratic Engine Implementation
export class SocraticEngine {
  // OpenAI client removed; using centralized chatCompletion wrapper
  private conversation: EnhancedMessage[] = [];
  private problem: string = '';
  private sessionId: string = '';
  private studentProfile?: EnhancedStudentProfile;
  private currentDifficulty: DifficultyLevel = DifficultyLevel.INTERMEDIATE;
  private sessionStartTime: Date = new Date();
  private strugglingTurns: number = 0;
  private lastResponseTime: number = 0;
  
  // Enhanced properties - using modular components
  private depthTrackerManager: DepthTrackerManager;
  private questionTypeSequence: SocraticQuestionType[] = [];
  private promptManager: PromptManager;
  private questionSelector: QuestionSelector;
  private studentAssessor: StudentAssessor;
  private sessionManager?: any;
  
  // Keep depthTracker for backward compatibility
  private get depthTracker(): ConversationDepthTracker {
    return this.depthTrackerManager.getTracker();
  }
  private lastUnderstandingCheckTurn: number = 0;
  private understandingCheckCount: number = 0;
  private probeType?: 'teachback' | 'transfer' | 'question';
  private lastProbeTurn: number = 0;
  private strictMode: boolean = false;
  private isAssessmentMode: boolean = false; // New: Assessment mode flag
  private expectedAnswer?: string; // New: Expected answer for assessment
  private studentHasAnswered: boolean = false; // New: Track if student gave an answer
  private sessionPhase: 'goal' | 'assess_knowledge' | 'first_steps' | 'working' | 'hint_needed' | 'wrap_up' = 'goal';
  private problemSolved: boolean = false;
  private hintGiven: boolean = false;
  private turnsSinceLastPhase: number = 0;

  constructor(sessionManager?: any, strictMode: boolean = false) {
    this.sessionManager = sessionManager;
    this.strictMode = strictMode;
    this.promptManager = new PromptManager();
    this.questionSelector = new QuestionSelector();
    this.studentAssessor = new StudentAssessor();
    this.depthTrackerManager = new DepthTrackerManager();
  }

  // Delegate to modular utilities
  private computeDialogueLevel(qt: SocraticQuestionType, isUnderstandingCheck?: boolean): DialogueLevel {
    return computeDialogueLevel(qt, isUnderstandingCheck);
  }

  private computeCycleStage(qt: SocraticQuestionType, isUnderstandingCheck?: boolean, initial?: boolean): CycleStage {
    return computeCycleStage(qt, isUnderstandingCheck, initial);
  }

  // Initialize session with enhanced features
  initializeSession(sessionId: string, studentProfile?: EnhancedStudentProfile): void {
    this.sessionId = sessionId;
    this.studentProfile = studentProfile;
    this.sessionStartTime = new Date();
    this.strugglingTurns = 0;
    
    if (studentProfile) {
      // Set initial difficulty based on student's performance history
      const avgPerformance = studentProfile.performanceHistory.length > 0
        ? studentProfile.performanceHistory.reduce((sum, p) => sum + p.masteryScore, 0) / studentProfile.performanceHistory.length
        : 0.5;
      
      if (avgPerformance < 0.4) this.currentDifficulty = DifficultyLevel.BEGINNER;
      else if (avgPerformance > 0.7) this.currentDifficulty = DifficultyLevel.ADVANCED;
      else this.currentDifficulty = DifficultyLevel.INTERMEDIATE;
    }
  }

  async startProblem(problem: string, options?: { studentFirst?: boolean }): Promise<string> {
    this.problem = problem;
    
    // Build enhanced system prompt
    const enhancedPrompt = this.buildEnhancedSystemPrompt(problem);
    
    this.conversation = [
      { role: 'system', content: enhancedPrompt, timestamp: new Date() }
    ];
    
    // Determine initial question type
    const initialQuestionType = this.selectInitialQuestionType(problem);
    
    // Student-first mode: do not generate an initial assistant question.
    if (options?.studentFirst) {
      // Initialize tracker minimally for a fresh dialogue.
      this.depthTrackerManager.updateQuestionType(initialQuestionType);
      this.depthTrackerManager.updateDialogueLevel(DialogueLevel.DIALOGUE);
      this.depthTrackerManager.updateCycleStage(this.computeCycleStage(initialQuestionType, false, true));
      // Do not push assistant message; let the student speak first.
      return '';
    }

    let baseResponse: string;
    const llmContent = await chatCompletion([
      ...this.conversation.map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'system', content: `Use ${initialQuestionType} questioning approach. Keep response to 1-2 sentences maximum. Ask an indirect, exploratory question rather than a direct one.` }
    ], { temperature: 0.8, max_tokens: 150, retryContext: 'Starting problem' });
    if (!llmContent) {
      throw new Error('LLM failed to generate an opening question');
    }
    baseResponse = this.adaptQuestionToProblem(llmContent);

    // Sanitize the very first question to avoid directive phrasing
    const initialAssessment = this.assessStudentResponse('');
    const sanitizedResponse = this.sanitizeToSocraticQuestion(
      baseResponse,
      initialAssessment,
      initialQuestionType,
      problem
    );
    
    const enhancedMessage: EnhancedMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      questionType: initialQuestionType,
      depthLevel: 1,
      targetedConcepts: this.extractConcepts(problem),
      dialogueLevel: DialogueLevel.DIALOGUE,
      cycleStage: this.computeCycleStage(initialQuestionType, false, true)
    };
    const polishedResponse = sanitizedResponse;
    enhancedMessage.content = polishedResponse;

    this.conversation.push(enhancedMessage);
    this.questionTypeSequence.push(initialQuestionType);
    // Reflect initial metadata into tracker
    if (enhancedMessage.dialogueLevel) {
      this.depthTrackerManager.updateDialogueLevel(enhancedMessage.dialogueLevel);
    }
    if (enhancedMessage.cycleStage) {
      this.depthTrackerManager.updateCycleStage(enhancedMessage.cycleStage);
    }
    
    return polishedResponse;
  }

  // ======================== ASSESSMENT MODE METHODS ========================

  /**
   * Enable assessment mode for this session
   * In assessment mode, the tutor accepts direct answers and focuses on reasoning
   */
  enableAssessmentMode(expectedAnswer?: string): void {
    this.isAssessmentMode = true;
    this.expectedAnswer = expectedAnswer;
    this.studentHasAnswered = false;
  }

  /**
   * Disable assessment mode (return to normal tutoring)
   */
  disableAssessmentMode(): void {
    this.isAssessmentMode = false;
    this.expectedAnswer = undefined;
    this.studentHasAnswered = false;
  }

  /**
   * Start a problem in assessment mode
   * Different behavior: asks for direct answer instead of Socratic questioning
   */
  async startAssessmentProblem(problem: string, expectedAnswer?: string): Promise<string> {
    this.enableAssessmentMode(expectedAnswer);
    this.problem = problem;
    
    const assessmentPrompt = `You are a learning assessment tutor. The student will provide a direct answer to this problem:

"${problem}"

ASSESSMENT MODE BEHAVIOR:
1. Accept their direct answer first
2. Then ask them to explain their reasoning: "How did you arrive at that answer?"
3. DO NOT guide them to the answer like in tutoring mode
4. If they're stuck, ask if they want help or want to review prerequisite concepts
5. Be encouraging but don't give away the answer
6. Keep responses short and focused (1-2 sentences)

Start by asking for their answer in a warm, encouraging way.`;

    this.conversation = [
      { role: 'system', content: assessmentPrompt, timestamp: new Date() }
    ];
    // Apply the same goal-framing principle used in tutoring mode
    const goalOpening = this.buildGoalFramingOpening(problem);
    // Combine goal clarification with assessment-mode direct answer request
    const opening = `${goalOpening} Then, what's your direct answer? Take your time and show your work if needed.`;
    return opening;
  }

  /**
   * Check if student's answer matches the expected answer
   * Uses flexible matching to account for different formats
   */
  private checkAnswer(studentAnswer: string): boolean {
    if (!this.expectedAnswer) return false;
    
    const normalizedStudent = studentAnswer.toLowerCase().trim()
      .replace(/[^\w\s.-]/g, '') // Remove special chars except numbers, letters, dots, hyphens
      .replace(/\s+/g, ' ');
    
    const normalizedExpected = this.expectedAnswer.toLowerCase().trim()
      .replace(/[^\w\s.-]/g, '')
      .replace(/\s+/g, ' ');
    
    // Check various matching patterns
    return (
      normalizedStudent.includes(normalizedExpected) ||
      normalizedExpected.includes(normalizedStudent) ||
      normalizedStudent === normalizedExpected ||
      // Check if both contain the same number
      (this.extractNumbers(normalizedStudent).some(num => 
        this.extractNumbers(normalizedExpected).includes(num)))
    );
  }

  /**
   * Extract numbers from a string for answer comparison
   */
  private extractNumbers(str: string): string[] {
    const matches = str.match(/\d+\.?\d*/g);
    return matches || [];
  }

  /**
   * Suggest prerequisites when student is struggling in assessment mode
   */
  suggestPrerequisites(prerequisites?: string[]): string {
    if (!prerequisites || prerequisites.length === 0) {
      return "Would you like me to help guide you through this problem step by step?";
    }
    
    // Note: In production, this would fetch the actual prerequisite titles from the database
    const prereqText = prerequisites.length === 1 
      ? "a prerequisite concept"
      : "some prerequisite concepts";
    
    return `This assessment builds on ${prereqText}. Would you like to:
1. Review those concepts first?
2. Get some guidance on this problem?
3. Try again on your own?`;
  }

  /**
   * Get the current assessment mode status
   */
  isInAssessmentMode(): boolean {
    return this.isAssessmentMode;
  }

  // ======================== END ASSESSMENT MODE METHODS ========================

  async respondToStudent(studentInput: string): Promise<string> {
    const responseStartTime = Date.now();
    
    // Validate API key is configured before attempting LLM call
    // Reload dotenv to ensure fresh env vars
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey || apiKey.length === 0) {
      console.error('[SocraticEngine] API key check failed at start of respondToStudent', {
        hasKey: !!process.env.OPENAI_API_KEY,
        keyLength: process.env.OPENAI_API_KEY?.length || 0,
        keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) || 'none'
      });
      throw new Error(
        'OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables. ' +
        'The Socratic engine requires a valid OpenAI API key to generate responses.'
      );
    }
    
    console.log('[SocraticEngine] Starting LLM call', {
      hasApiKey: true,
      keyPrefix: apiKey.substring(0, 7),
      conversationLength: this.conversation.length
    });
    
    const assessment = this.assessStudentResponse(studentInput);
    
    // ======================== ASSESSMENT MODE HANDLING ========================
    // Assessment mode: Quick check, immediate feedback, done!
    if (this.isAssessmentMode && !this.studentHasAnswered) {
      this.studentHasAnswered = true;
      this.conversation.push({ 
        role: 'user', 
        content: studentInput, 
        timestamp: new Date(),
        studentConfidence: assessment.confidenceLevel
      });
      
      // Check if answer is correct
      const isCorrect = this.checkAnswer(studentInput);
      
      let response: string;
      if (isCorrect) {
        // Correct answer - assessment complete!
        response = `✅ Correct! Great job!\n\nYou've successfully completed this assessment. Your progress has been recorded.`;
      } else {
        // Incorrect answer - provide the correct answer
        if (this.expectedAnswer) {
          response = `❌ Not quite. The correct answer is: ${this.expectedAnswer}\n\nWould you like to review this topic or try a related assessment?`;
        } else {
          response = `❌ That's not quite right. Would you like to review this topic or try again?`;
        }
      }
      
      this.conversation.push({
        role: 'assistant',
        content: response,
        timestamp: new Date()
      });
      
      // Mark assessment as complete
      this.isAssessmentMode = false;
      
      return response;
    }
    
    // If student tries to continue after assessment is done
    if (!this.isAssessmentMode && this.studentHasAnswered && this.problem) {
      return "This assessment is complete! You can return to the Learning Assessments page to try another one, or review related topics.";
    }
    // ======================== END ASSESSMENT MODE HANDLING ========================
    
    const nextQuestionType = this.selectNextQuestionType(assessment);
    
    this.conversation.push({ 
      role: 'user', 
      content: studentInput, 
      timestamp: new Date(),
      studentConfidence: assessment.confidenceLevel
    });
    
    this.updateDepthTracker(assessment, studentInput);
    this.updateStruggling(assessment);
    
    // Enhanced contextual guidance with specific examples
    const contextualGuidance = this.buildDetailedGuidance(
      assessment, 
      nextQuestionType, 
      studentInput
    );
    
    // Add recent responses to guidance to avoid repetition
    const recentAssistantMessages = this.conversation
      .filter(msg => msg.role === 'assistant')
      .slice(-3)
      .map(msg => msg.content);
    
    const repetitionWarning = recentAssistantMessages.length > 0
      ? `\n\nCRITICAL: Avoid repeating similar questions. Recent questions asked: ${recentAssistantMessages.join(' | ')}. Your question must be DIFFERENT and varied. Use different words, different phrasing, and approach from a different angle.`
      : '';
    
    const systemGuidance = `${contextualGuidance}${repetitionWarning}\n\nStyle guide: vary phrasing, avoid templates and repetitive stems; ask one adaptive Socratic question; avoid stock endings like "What do you think?"; keep it conversational and specific to the student's response. NEVER repeat questions you've already asked.`;
    
    // If the student asks for the final solution directly, craft a gentle redirect
    if (this.detectFinalSolutionRequest(studentInput)) {
      const redirect = this.adaptQuestionToProblem(
        'I won’t jump to the final solution. Could you share what steps you’ve already tried and exactly where you feel stuck? Looking at this problem, what does finding the goal actually mean here?'
      );
      const reframed = this.sanitizeToSocraticQuestion(redirect, assessment, nextQuestionType, studentInput);
      const enhancedMessage: EnhancedMessage = {
        role: 'assistant',
        content: reframed,
        timestamp: new Date(),
        questionType: nextQuestionType,
        depthLevel: this.depthTracker.currentDepth,
        studentConfidence: assessment.confidenceLevel,
        targetedConcepts: this.depthTracker.conceptualConnections.slice(-2)
      };
      this.conversation.push(enhancedMessage);
      this.questionTypeSequence.push(nextQuestionType);
      const responseTime = Date.now() - responseStartTime;
      this.updateStudentProfile(nextQuestionType, assessment, responseTime);
      this.lastResponseTime = Date.now();
      return reframed;
    }

    let tutorResponse: string;
    let llmResponse: string | null = null;
    let llmError: Error | null = null;
    
    // Try LLM call with proper error handling and retries
    try {
      llmResponse = await chatCompletion([
        { role: 'system', content: systemGuidance },
        ...this.conversation.map(msg => ({ role: msg.role, content: msg.content }))
      ], {
        temperature: 0.9,
        max_tokens: 160,
        presence_penalty: 0.8,
        frequency_penalty: 0.5,
        retryContext: 'Enhanced interaction'
      });
      
      // Validate response
      if (!llmResponse || llmResponse.trim().length === 0) {
        throw new Error('LLM returned empty response');
      }
    } catch (err: any) {
      llmError = err instanceof Error ? err : new Error(String(err));
      
      // Log detailed error information
      console.error('[SocraticEngine] LLM call failed:', {
        error: llmError.message,
        errorType: llmError.constructor.name,
        stack: llmError.stack,
        conversationLength: this.conversation.length,
        hasApiKey: !!process.env.OPENAI_API_KEY,
        apiKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) || 'none',
        apiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
        systemGuidanceLength: systemGuidance.length,
        lastUserMessage: studentInput.substring(0, 100)
      });
      
      // Check for specific error types
      if (llmError.message?.includes('API key')) {
        throw new Error(
          'OpenAI API key is missing or invalid. Please set OPENAI_API_KEY in your environment variables. ' +
          'The Socratic engine requires a valid OpenAI API key to generate responses.'
        );
      }
      
      if (llmError.message?.includes('rate limit') || llmError.message?.includes('429')) {
        throw new Error(
          'OpenAI API rate limit exceeded. Please wait a moment and try again. ' +
          'If this persists, check your OpenAI account limits.'
        );
      }
      
      if (llmError.message?.includes('quota') || llmError.message?.includes('billing')) {
        throw new Error(
          'OpenAI API quota exceeded. Please check your OpenAI account billing and usage limits.'
        );
      }
      
      // Re-throw the error instead of silently falling back
      // This ensures we know when LLM is failing
      throw new Error(
        `Failed to get LLM response: ${llmError.message}. ` +
        `Please check your OpenAI API key configuration and account status. ` +
        `Error details logged to console.`
      );
    }
    
    // If we get here, we have a valid LLM response
    tutorResponse = llmResponse;

    // Check if response is too similar to recent responses - retry with different approach if repetitive
    let retryCount = 0;
    const maxRetries = 3;
    while (this.isResponseRepetitive(tutorResponse) && retryCount < maxRetries) {
      retryCount++;
      console.warn(`Detected repetitive response (attempt ${retryCount}/${maxRetries}), generating alternative...`);
      
      // Try a different question type to force variation
      const alternativeQuestionType = this.getAlternativeQuestionType(nextQuestionType);
      
      // Generate a different response using contextual question bank with different question type
      const contextualQuestion = this.selectContextualQuestion(assessment, alternativeQuestionType, studentInput);
      tutorResponse = this.sanitizeToSocraticQuestion(
        contextualQuestion,
        assessment,
        alternativeQuestionType,
        studentInput
      );
      
      // If still repetitive, try asking LLM again with explicit instruction to avoid repetition
      if (this.isResponseRepetitive(tutorResponse) && retryCount < maxRetries) {
        const recentResponses = this.conversation
          .filter(msg => msg.role === 'assistant')
          .slice(-3)
          .map(msg => msg.content);
        
        const antiRepetitionGuidance = `${systemGuidance}\n\nCRITICAL: Your response must be COMPLETELY DIFFERENT from these recent questions: ${recentResponses.join(' | ')}. Use different words, different phrasing, and a different angle.`;
        
        try {
          const retryResponse = await chatCompletion([
            { role: 'system', content: antiRepetitionGuidance },
            ...this.conversation.map(msg => ({ role: msg.role, content: msg.content }))
          ], {
            temperature: 0.95, // Higher temperature for more variation
            max_tokens: 160,
            presence_penalty: 1.0, // Higher presence penalty to avoid repetition
            frequency_penalty: 0.8,
            retryContext: 'Anti-repetition retry'
          });
          
          if (retryResponse && retryResponse.trim().length > 0) {
            tutorResponse = retryResponse;
          }
        } catch (retryErr) {
          // If retry fails, continue with contextual question
          console.warn('Retry LLM call failed, using contextual question', retryErr);
        }
      }
    }

    // Enforce strict Socratic guardrails and reframe if needed
    tutorResponse = this.sanitizeToSocraticQuestion(
      tutorResponse,
      assessment,
      nextQuestionType,
      studentInput
    );
    
    const enhancedMessage: EnhancedMessage = {
      role: 'assistant',
      content: tutorResponse,
      timestamp: new Date(),
      questionType: nextQuestionType,
      depthLevel: this.depthTracker.currentDepth,
      studentConfidence: assessment.confidenceLevel,
      targetedConcepts: this.depthTracker.conceptualConnections.slice(-2),
      dialogueLevel: this.computeDialogueLevel(nextQuestionType),
      cycleStage: this.computeCycleStage(nextQuestionType, false, false)
    };
    
    this.conversation.push(enhancedMessage);
    this.questionTypeSequence.push(nextQuestionType);
    // Update tracker with dialogue metadata
    if (enhancedMessage.dialogueLevel) {
      this.depthTrackerManager.updateDialogueLevel(enhancedMessage.dialogueLevel);
    }
    if (enhancedMessage.cycleStage) {
      this.depthTrackerManager.updateCycleStage(enhancedMessage.cycleStage);
    }
    
    const responseTime = Date.now() - responseStartTime;
    this.updateStudentProfile(nextQuestionType, assessment, responseTime);
    
    this.lastResponseTime = Date.now();
    return tutorResponse;
  }

  private getVariedClosing(type: SocraticQuestionType): string {
    const options: Record<SocraticQuestionType, string[]> = {
      [SocraticQuestionType.CLARIFICATION]: [
        'How would you describe that in your own words?'
      ],
      [SocraticQuestionType.ASSUMPTIONS]: [
        'What are you assuming when you say that?'
      ],
      [SocraticQuestionType.EVIDENCE]: [
        'What in the problem supports that idea?'
      ],
      [SocraticQuestionType.PERSPECTIVE]: [
        'How might someone look at this differently?'
      ],
      [SocraticQuestionType.IMPLICATIONS]: [
        'If that were true, what would follow from it?'
      ],
      [SocraticQuestionType.META_QUESTIONING]: [
        'Why is exploring that step useful here?'
      ]
    };
    const list = options[type] || ['What makes you think that fits here?'];
    return list[Math.floor(Math.random() * list.length)] + '?';
  }

  private buildDetailedGuidance(
    assessment: SocraticAssessment,
    questionType: SocraticQuestionType,
    studentInput: string
  ): string {
    let guidance = `IMMEDIATE CONTEXT: The student just said: "${studentInput.substring(0, 100)}..."

RESPOND AS: ${questionType.toUpperCase()} question type.

`;
    
    // Confidence-based strategy
    if (assessment.confidenceLevel < 0.3) {
      guidance += `STUDENT STATE: Struggling (confidence: ${Math.round(assessment.confidenceLevel * 100)}%)
YOUR APPROACH: SCAFFOLDING ALLOWED. You can tell them what the goal is or what facts are given.
STYLE: Supportive with scaffolding
EXAMPLE: "We're trying to find [state goal]. What does that tell you about what we need to do?"
OR: "The problem tells us [restate given facts]. What does that suggest about our approach?"
DO NOT tell them specific operations or HOW to solve.
`;
    } else if (assessment.confidenceLevel > 0.8) {
      guidance += `STUDENT STATE: Confident (confidence: ${Math.round(assessment.confidenceLevel * 100)}%)
YOUR APPROACH: Reference what they just said or did. Challenge them to explain the principle behind it.
STYLE: Probing deeper into their thinking
EXAMPLE: "You mentioned [their idea] - what makes that approach work for this kind of problem?"
DO NOT suggest specific operations or methods.
`;
    } else {
      guidance += `STUDENT STATE: Building understanding (confidence: ${Math.round(assessment.confidenceLevel * 100)}%)
YOUR APPROACH: Reference the problem structure and nudge them toward the nature of the work.
STYLE: Contextual nudging
EXAMPLE: "Looking at this problem, what does finding [goal] actually mean?"
DO NOT mention specific numbers or suggest specific operations.
`;
    }
    
    // Depth-based strategy
    guidance += `\nCONVERSATION DEPTH: Level ${this.depthTracker.currentDepth}/5
`;
    
    if (this.depthTracker.currentDepth === 1) {
      guidance += `DEPTH STRATEGY: Reference what they're looking at and nudge toward the type of work needed.
EXAMPLE: "When you see a problem structured like this, what kind of work does that suggest?"
`;
    } else if (this.depthTracker.currentDepth >= 3) {
      guidance += `DEPTH STRATEGY: Probe WHY their approach works or how principles connect.
EXAMPLE: "What makes that approach work for this type of problem?"
`;
    }
    
    // Misconception handling
    if (assessment.misconceptions.length > 0) {
      guidance += `\nALERT: Possible misconception detected. Reference their thinking and nudge them to test it.
APPROACH: "You mentioned [their idea] - what would that look like if we tried it?"
`;
    }
    
    // Struggling pattern
    if (this.strugglingTurns > 2) {
      guidance += `\nALERT: Student has struggled for ${this.strugglingTurns} turns. 
APPROACH: SCAFFOLDING IS ALLOWED. You can TELL them:
- What the goal is: "We're trying to find [state the goal]"
- What facts are given: "The problem tells us [restate given information]"
- What finding/solving means: "Finding [X] means [describe what the end result looks like]"
Then ask: "Now that we know what we're looking for, what does that suggest about our approach?"
DO NOT tell them HOW to solve or suggest specific methods/operations.
`;
    }
    
    guidance += `\nCRITICAL STYLE RULES - FOLLOW EXACTLY: 
- REFERENCE the problem structure/pattern (describe what they're seeing, not specific values)
- NUDGE them to recall relevant knowledge without stating it directly
- PROBE their thinking by referencing what they just said
- DO NOT suggest ANY specific method, formula, operation, or step
 - DO NOT be too generic - make it contextual to the problem they're facing
 - Use the problem structure as a CLUE about what kind of work is needed
 - Maximum 1-2 sentences (unless giving scaffolding help)
 - MUST end with a question mark (after scaffolding, always ask a follow-up question)
 - Be warm and conversational
 - NEVER introduce metaphors or "imagine" scenarios
 - NEVER ask them to rate their confidence
  - NEVER say: "solve for X", "isolate X", "what operation isolates X", "plug in", "substitute", "apply the formula", "use the derivative", or any instruction that gives away a method

 SCAFFOLDING EXCEPTION - If student is really stuck, you CAN tell them:
 ✅ "We're trying to find [the goal]. What does that tell you about what we need to do?"
 ✅ "The problem tells us [restate facts]. What does that suggest about our approach?"
 ✅ "Finding [X] means [describe end result]. What would that look like here?"
BUT still NEVER tell them specific methods, formulas, or operations.

WRONG EXAMPLES (TOO SPECIFIC OR TOO GENERIC - works for ANY problem):
❌ "Should we use the Pythagorean theorem?" (TOO SPECIFIC - gives away method)
❌ "What if we subtract 5?" (TOO SPECIFIC - suggests operation)
❌ "Based on what you know, what should we do?" (TOO GENERIC - not helpful)
❌ "What's our goal here?" (TOO GENERIC - not helpful when they're stuck)

RIGHT EXAMPLES (CONTEXTUAL NUDGING + SCAFFOLDING - works for ANY problem):
✅ "When you see [describe pattern], what does that usually tell you about the work ahead?"
✅ "Looking at this problem, what does finding [goal] actually mean?"
✅ "We're trying to find [goal]. What does that tell you about what we need?"
✅ "The problem tells us [facts]. What does that suggest about our approach?"

TUTOR POLICY (STRICT):
1) Never immediately provide the answer.
2) First ask the student to explain steps taken and exactly where they’re stuck.
3) Provide incremental hints or nudges, not full steps.
4) If a mistake appears, point out gently and explain the misconception briefly.
5) Use metacognitive prompts: ask for summaries, reflections, and strategy evaluations.
6) Adapt question difficulty to the student’s responses; challenge when strong, simplify when struggling.
7) If asked for the final solution, respectfully decline and redirect with a guiding question.
8) Be encouraging and supportive throughout; reinforce effort and progress.

Meta prompts to weave in naturally:
- "Can you explain your thinking so far?"
- "What might you try next, given what the problem is asking?"
- "What information from the problem haven’t you used yet?"
- "Where do you think your understanding is breaking down?"

RESPOND NOW:`;

    return guidance;
  }

  private buildEnhancedSystemPrompt(problem: string): string {
    return `Role: You are a thoughtful and patient tutor whose goal is to help the student master concepts through independent problem solving. Your job is to encourage critical thinking, provide detailed feedback, and promote metacognitive awareness. 

 Guidelines: 

 1.  Never immediately provide the answer to the student's question. 
 2.  First, ask the student to clearly explain what steps they've already taken and precisely where they're getting stuck. 
 3.  Provide incremental hints or small nudges, not complete steps. Guide the student to think critically about the next logical action. 
 4.  Error Analysis and Feedback: 
     -If the student makes a mistake, point out gently where and why the misunderstanding occurred. 
     -Explain the underlying misconceptions and provide clear, concise explanations. 
     -Provide the student with resources that can help them understand the problem better. 
 5.  Metacognitive Prompts: 
     -Frequently prompt students to summarize their current understanding before moving forward. 
     -Ask students to reflect on their learning process and identify their strengths and weaknesses. 
     -Ask questions that promote self-evaluation, such as: 
         -"What strategies did you use to solve this problem?" 
         -"What could you have done differently?" 
         -"How confident are you in your understanding of this concept?" 
         -"What are some areas where you feel you need more practice?" 
 6.  Adaptive Questioning: 
     -Adapt the difficulty of your questions based on the student's responses. 
     -If the student demonstrates a strong understanding, introduce more challenging questions. 
     -If the student is struggling, provide simpler questions and additional support. 
 7.  If the student directly asks for the final solution, respectfully decline and instead redirect them by providing another hint or asking guiding questions. 
 8.  Be encouraging and supportive throughout your interactions. Reinforce effort, progress, and persistence. 

 Example phrases you can use: 

 -   "Can you explain your thinking so far?" 
 -   "That's an interesting approach; what might you try next?" 
 -   "You're on the right track, but check your previous step carefully, do you see anything unusual?" 
 -   "Let's slow down here. What information from the problem haven't you used yet?" 
 -   "What are some strategies you used to come to that conclusion?" 
 -   "Where do you think your understanding is breaking down?" 
 -   "Explain this concept as if you were teaching it to a friend." 

 Remember: your primary goal is to help the student develop problem-solving skills, confidence, and a deeper understanding, rather than simply providing solutions.`;
  }  

  private selectInitialQuestionType(problem: string): SocraticQuestionType {
    return this.questionSelector.selectInitialQuestionType(problem);
  }

  private assessStudentResponse(response: string): SocraticAssessment {
    return this.studentAssessor.assessStudentResponse(response);
  }

  private selectNextQuestionType(assessment: SocraticAssessment): SocraticQuestionType {
    const lastQuestionType = this.questionTypeSequence[this.questionTypeSequence.length - 1];
    
    // Use contextual selection if we have a previous question type
    // Pass recent question types to avoid repetition
    if (lastQuestionType) {
      return this.questionSelector.selectContextualQuestionType(
        assessment, 
        lastQuestionType,
        this.questionTypeSequence // Pass full sequence to check for repetition
      );
    }
    
    // Otherwise use standard selection
    return this.questionSelector.selectNextQuestionType(assessment);
  }

  /**
   * Enhanced contextual question selection with rich question bank
   * Selects appropriate questions based on question type, confidence level, and special contexts
   */
  private selectContextualQuestion(
    assessment: SocraticAssessment,
    questionType: SocraticQuestionType,
    studentResponse: string
  ): string {
    
    const questionBank = {
      clarification: {
        high_confidence: [
          "Walk me through your thinking—how did you arrive at that?",
          "Can you explain that in your own words?",
          "What exactly are we trying to find here?"
        ],
        low_confidence: [
          "Let's start simple. What information do we have?",
          "What's the very first thing you notice about this problem?",
          "If you had to describe this to a friend, what would you say?"
        ],
        stuck: [
          "Let's break this down. What's just one small piece you understand?",
          "What's the easiest part of this problem?",
          "What do the numbers in the problem tell us?"
        ]
      },
      
      assumptions: {
        high_confidence: [
          "What are you assuming must be true for that to work?",
          "Does that hold true in every case?",
          "What if we didn't make that assumption—what changes?"
        ],
        low_confidence: [
          "What do we know for certain about this type of problem?",
          "Are there any rules or patterns that always apply here?",
          "What properties of this concept can we count on?"
        ],
        misconception: [
          "Let's test that. If that were true, what would happen?",
          "Hmm, can you think of a case where that might not work?",
          "What would need to be different for that to be correct?"
        ]
      },
      
      evidence: {
        high_confidence: [
          "Excellent thinking! What evidence supports that conclusion?",
          "How do you know that's the right approach?",
          "Can you prove that works?"
        ],
        low_confidence: [
          "What makes you lean toward that answer?",
          "How could we check if that's on the right track?",
          "What part of the problem suggests that?"
        ],
        after_correct: [
          "You got it! Now explain why that works.",
          "Perfect! Can you show me the reasoning behind that?",
          "Good! What rule or principle did you use there?"
        ]
      },
      
      perspective: {
        high_confidence: [
          "Great! Is there another way you could approach this?",
          "How might someone else solve this differently?",
          "What if we looked at this backwards—started from the answer and worked back?"
        ],
        low_confidence: [
          "Let's think about this from a different angle. What if we...",
          "Sometimes it helps to draw a picture. What would that look like?",
          "What's a simpler version of this problem we could try first?"
        ]
      },
      
      implications: {
        high_confidence: [
          "If that's true, what does it tell us about the next step?",
          "How does this connect to what we learned earlier?",
          "What pattern do you notice emerging?"
        ],
        low_confidence: [
          "If we tried that, what would happen?",
          "Let's follow that thought. Where does it lead?",
          "What's the next logical step from here?"
        ],
        building: [
          "You're building toward something! What comes next?",
          "You've got part of it. How does this piece fit with what you found before?",
          "We're getting closer! What does this tell us about our goal?"
        ]
      },
      
      meta_questioning: {
        high_confidence: [
          "How did you decide to try that approach?",
          "What strategy are you using here?",
          "This reminds me of... what does it remind you of?"
        ],
        reflection: [
          "What made this problem challenging?",
          "How is this similar to problems you've solved before?",
          "If you saw this problem again, what would you do first?"
        ],
        after_success: [
          "You figured it out! What was the key insight?",
          "How did your thinking change as you worked through this?",
          "What strategy worked best for you here?"
        ]
      }
    };

    // Select appropriate question based on context
    let selectedQuestions: string[];
    
    const confidenceLevel: 'low_confidence' | 'high_confidence' = assessment.confidenceLevel < 0.3 
      ? 'low_confidence' 
      : 'high_confidence'; // Medium confidence defaults to high_confidence for question selection

    // Special case handling
    if (questionType === SocraticQuestionType.ASSUMPTIONS && assessment.misconceptions.length > 0) {
      selectedQuestions = questionBank.assumptions.misconception;
    } else if (questionType === SocraticQuestionType.EVIDENCE && assessment.readinessForAdvancement) {
      selectedQuestions = questionBank.evidence.after_correct;
    } else if (questionType === SocraticQuestionType.IMPLICATIONS && studentResponse.length > 50) {
      selectedQuestions = questionBank.implications.building;
    } else if (questionType === SocraticQuestionType.META_QUESTIONING && assessment.confidenceLevel > 0.8) {
      selectedQuestions = questionBank.meta_questioning.after_success;
    } else if (questionType === SocraticQuestionType.CLARIFICATION && assessment.confidenceLevel < 0.2) {
      selectedQuestions = questionBank.clarification.stuck;
    } else if (questionType === SocraticQuestionType.META_QUESTIONING && assessment.depthOfThinking >= 3) {
      selectedQuestions = questionBank.meta_questioning.reflection;
    } else {
      // Use confidence-based selection
      const questionTypeKey = questionType.replace('_', '') as keyof typeof questionBank;
      const categoryQuestions = questionBank[questionTypeKey];
      
      if (categoryQuestions) {
        selectedQuestions = (categoryQuestions as any)[confidenceLevel] 
          || (categoryQuestions as any).high_confidence
          || Object.values(categoryQuestions)[0];
      } else {
        // Fallback to clarification questions
        selectedQuestions = questionBank.clarification[confidenceLevel];
      }
    }

    // Return random question from selected pool, adapted to the current problem/domain
    const baseQuestion = selectedQuestions[Math.floor(Math.random() * selectedQuestions.length)];
    return this.adaptQuestionToProblem(baseQuestion);
  }

  private updateDepthTracker(assessment: SocraticAssessment, studentInput: string): void {
    this.depthTrackerManager.updateDepthTracker(
      assessment,
      studentInput,
      (text: string) => this.extractConcepts(text)
    );
  }

  private updateStruggling(assessment: SocraticAssessment): void {
    const isStruggling = assessment.confidenceLevel < 0.3 || assessment.misconceptions.length > 0;
    
    if (isStruggling) {
      this.strugglingTurns++;
    } else {
      this.strugglingTurns = Math.max(0, this.strugglingTurns - 1); // Gradually reduce
    }
  }

  private buildContextualGuidance(assessment: SocraticAssessment, questionType: SocraticQuestionType, studentResponse: string = '', isUnderstandingCheck: boolean = false): string {
    // Get contextual question template
    const contextualQuestion = this.adaptQuestionToProblem(
      this.selectContextualQuestion(assessment, questionType, studentResponse)
    );
    
    let guidance = `Use ${questionType} questioning. `;
    
    // Add the contextual question as an example/template
    guidance += `Here's a good question to consider (you may adapt or use directly): "${contextualQuestion}" `;
    
    if (isUnderstandingCheck) {
      guidance += "This is an understanding check - assess if the student truly grasps the concept. Ask a question that reveals their depth of understanding. ";
    }
    
    if (assessment.confidenceLevel < 0.3) {
      guidance += "Student is struggling - be supportive and break down into smaller steps. ";
    } else if (assessment.confidenceLevel > 0.8) {
      guidance += "Student is confident - challenge with deeper implications. ";
    }
    
    if (assessment.misconceptions.length > 0) {
      guidance += "Address potential misconceptions gently through evidence-seeking questions. ";
    }
    
    guidance += `Current depth level: ${this.depthTracker.currentDepth}. `;
    
    if (this.depthTracker.shouldDeepenInquiry) {
      guidance += "Ready to deepen the inquiry with more sophisticated questions. ";
    }

    if (this.strugglingTurns > 2) {
      guidance += "Student has been struggling - provide more scaffolding and encouragement. ";
    }
    
    guidance += "Ask one short, natural question that helps the student think next. Avoid meta phrasing or restating instructions. ";
    if (assessment.confidenceLevel < 0.4) {
      guidance += "Use a supportive tone, like helping them rediscover a forgotten idea. ";
    } else if (assessment.confidenceLevel > 0.8) {
      guidance += "Challenge the student a bit more, asking them to justify their reasoning. ";
    }
    
    return guidance;
  }

  /**
   * Determine if an understanding check is needed
   * Cycles through teach-back, transfer, and question generation probes
   */
  private shouldPerformUnderstandingCheck(assessment: SocraticAssessment, turnNumber: number): boolean {
    const turnsSinceLastCheck = turnNumber - this.lastUnderstandingCheckTurn;
    
    // Get env-configurable interval (default: 3)
    const checkInterval = parseInt(process.env.UNDERSTANDING_CHECK_INTERVAL || '3', 10);
    const enableTransferProbes = process.env.ENABLE_TRANSFER_PROBES !== 'false';
    const enableTeachbackProbes = process.env.ENABLE_TEACHBACK_PROBES !== 'false';
    
    // Check at configured interval
    if (turnsSinceLastCheck >= checkInterval) {
      return true;
    }
    
    // Check when confidence is uncertain for 2 consecutive responses
    if (assessment.confidenceLevel < 0.4 && turnsSinceLastCheck >= 2) {
      const recentConfidences = this.conversation
        .filter(msg => msg.studentConfidence !== undefined)
        .slice(-2)
        .map(msg => msg.studentConfidence!);
      if (recentConfidences.length === 2 && recentConfidences.every(c => c < 0.4)) {
        return true;
      }
    }
    
    // Check when misconceptions detected
    if (assessment.misconceptions.length > 0 && turnsSinceLastCheck >= 2) {
      return true;
    }
    
    // Check before advancing to next concept (if depth is increasing)
    if (this.depthTracker.shouldDeepenInquiry && turnsSinceLastCheck >= 3) {
      return true;
    }
    
    return false;
  }

  /**
   * Select appropriate question type for understanding check
   */
  private selectUnderstandingCheckQuestionType(assessment: SocraticAssessment): SocraticQuestionType {
    return this.questionSelector.selectUnderstandingCheckQuestionType(assessment);
  }

  private assessConceptualUnderstanding(response: string): number {
    return this.studentAssessor.assessConceptualUnderstanding(response);
  }

  private assessThinkingDepth(response: string): number {
    return this.studentAssessor.assessThinkingDepth(response);
  }

  private extractConcepts(text: string): string[] {
    // Create a conceptual framework map from prompt manager
    const framework = new Map<string, string[]>();
    for (const category of this.promptManager.getAllDomains()) {
      framework.set(category, this.promptManager.getConceptualFramework(category));
    }
    return this.studentAssessor.extractConcepts(text, framework);
  }

  /**
   * Choose a primary domain (algebra, geometry, calculus, statistics, fractions, arithmetic)
   * based on the current problem text.
   */
  private getPrimaryDomain(): 'algebra' | 'geometry' | 'calculus' | 'statistics' | 'fractions' | 'arithmetic' | 'general' {
    const concepts = this.extractConcepts(this.problem || '');
    return (concepts[0] as any) || 'general';
  }

  /**
   * Detect rough algebra subtype for equations: linear, quadratic, system, proportion, unknown
   */
  private detectEquationSubtype(problem: string): 'linear' | 'quadratic' | 'system' | 'proportion' | 'unknown' {
    const text = (problem || '').toLowerCase();
    if (/system of equations|solve for x and y|two equations|simultaneous/i.test(text)) return 'system';
    if (/(x\s*\^\s*2|x²|squared|quadratic)/i.test(text)) return 'quadratic';
    if (/(ratio|proportion|percent)/i.test(text)) return 'proportion';
    if (/=/.test(text) && /\b[a-z]\b/i.test(text) && !/(x\s*\^\s*2|x²|squared)/i.test(text)) return 'linear';
    return 'unknown';
  }

  /**
   * Try to detect a primary variable symbol in the problem (defaults to 'x').
   */
  private detectPrimaryVariable(problem: string): string {
    const match = (problem || '').match(/\b([a-z])\b/i);
    return match ? match[1] : 'x';
  }

  /**
   * Adapt a generic question to be domain-specific based on the current problem.
   * Example: "What information do we have?" -> "What does the equation tell us?" (algebra)
   */
  private adaptQuestionToProblem(question: string): string {
    const domain = this.getPrimaryDomain();
    const problemText = this.problem || '';
    const subtype = domain === 'algebra' ? this.detectEquationSubtype(problemText) : 'unknown';

    // Domain terms to swap in
    const terms: Record<string, { problem: string; info: string; approach?: string }> = {
      algebra: { problem: subtype === 'system' ? 'system' : 'equation', info: 'equation and the given numbers', approach: subtype === 'linear' ? 'isolating the variable' : 'understanding the structure' },
      geometry: { problem: 'figure', info: 'sides, angles, or the diagram', approach: 'recognizing shapes and relationships' },
      calculus: { problem: 'function', info: 'rates, derivative, or integral given', approach: 'interpreting change and accumulation' },
      statistics: { problem: 'dataset', info: 'distribution or values provided', approach: 'interpreting data and variability' },
      fractions: { problem: 'fractions', info: 'numerators and denominators', approach: 'simplifying and comparing parts' },
      arithmetic: { problem: 'numbers', info: 'the values and operations shown', approach: 'reasoning about operations' },
      general: { problem: 'problem', info: 'the given information', approach: 'your strategy' }
    };

    const t = terms[domain];

    // Targeted replacements
    let q = question
      .replace(/\bthis problem\b/gi, `this ${t.problem}`)
      .replace(/\bthe problem\b/gi, `the ${t.problem}`)
      .replace(/\bproblem\b/gi, t.problem)
      .replace(/\binformation do we have\b/gi, `does the ${t.info} tell us`)
      .replace(/\bwhat do we know\b/gi, `what do we know from the ${t.info}`)
      .replace(/\bapproach\b/gi, t.approach || 'thinking');

    // Domain-specific enhancements for algebra equations
    if (domain === 'algebra') {
      const variable = this.detectPrimaryVariable(problemText);
      q = q.replace(/\bexplain that\b/gi, `explain what this ${t.problem} is asking in your own words`)
           .replace(/\bwhat exactly are we trying to find here\b/gi, `what would getting ${variable} by itself actually mean here`);
    }

    // Ensure a question mark ending
    q = q.trim();
    if (!q.endsWith('?')) q += '?';
    return q;
  }

  

  private generateLearningObjective(problem: string, concepts: string[]): string {
    if (concepts.includes('algebra')) {
      return "Understand how to isolate variables through inverse operations";
    }
    if (concepts.includes('geometry')) {
      return "Apply appropriate formulas and understand spatial relationships";
    }
    if (concepts.includes('calculus')) {
      return "Understand rates of change and accumulation";
    }
    if (concepts.includes('arithmetic')) {
      return "Apply basic mathematical operations accurately";
    }
    return "Develop problem-solving strategies and mathematical reasoning";
  }

  private determineStudentLevel(): 'novice' | 'intermediate' | 'advanced' {
    if (!this.studentProfile?.performanceHistory?.length) return 'intermediate';
    
    const avgPerformance = this.studentProfile.performanceHistory.reduce((sum, p) => sum + p.masteryScore, 0) / 
                           this.studentProfile.performanceHistory.length;
    
    if (avgPerformance < 0.4) return 'novice';
    if (avgPerformance > 0.7) return 'advanced';
    return 'intermediate';
  }

  private updateStudentProfile(questionType: SocraticQuestionType, assessment: SocraticAssessment, responseTime: number): void {
    if (!this.studentProfile) return;
    
    if (!this.studentProfile.questionResponseHistory) {
      this.studentProfile.questionResponseHistory = [];
    }
    
    this.studentProfile.questionResponseHistory.push({
      questionType,
      effectiveness: assessment.conceptualUnderstanding,
      responseTime,
      comprehensionLevel: assessment.depthOfThinking / 5,
      timestamp: new Date()
    });
    
    // Keep only last 20 interactions for efficiency
    if (this.studentProfile.questionResponseHistory.length > 20) {
      this.studentProfile.questionResponseHistory = this.studentProfile.questionResponseHistory.slice(-20);
    }

    // Update engagement metrics
    if (!this.studentProfile.engagementMetrics) {
      this.studentProfile.engagementMetrics = {
        averageResponseTime: responseTime,
        totalInteractions: 1,
        engagementScore: assessment.confidenceLevel
      };
    } else {
      const metrics = this.studentProfile.engagementMetrics;
      metrics.averageResponseTime = (metrics.averageResponseTime * metrics.totalInteractions + responseTime) / (metrics.totalInteractions + 1);
      metrics.totalInteractions++;
      metrics.engagementScore = (metrics.engagementScore + assessment.confidenceLevel) / 2;
    }
  }

  // Original methods maintained for compatibility
  getConversationHistory(): EnhancedMessage[] {
    return this.conversation.filter(msg => msg.role !== 'system');
  }

  getCurrentProblem(): string {
    return this.problem;
  }

  getConversationLength(): number {
    return this.conversation.filter(msg => msg.role !== 'system').length;
  }

  /**
   * Restore conversation history from database interactions
   * This allows the engine to maintain context across API calls
   */
  restoreConversationHistory(interactions: Array<{ role: 'user' | 'assistant', content: string, timestamp?: Date, questionType?: SocraticQuestionType, depthLevel?: number }>): void {
    // Add all historical messages to the conversation and restore question type sequence
    for (const interaction of interactions) {
      const enhancedMessage: EnhancedMessage = {
        role: interaction.role,
        content: interaction.content,
        timestamp: interaction.timestamp || new Date(),
        questionType: interaction.questionType,
        depthLevel: interaction.depthLevel
      };
      this.conversation.push(enhancedMessage);
      
      // Restore question type sequence from assistant messages
      if (interaction.role === 'assistant' && interaction.questionType) {
        this.questionTypeSequence.push(interaction.questionType);
      }
    }
    
    console.log(`[SocraticEngine] Restored ${interactions.length} messages and ${this.questionTypeSequence.length} question types from history`);
  }

  getCurrentDifficulty(): DifficultyLevel {
    return this.currentDifficulty;
  }

  updateDifficulty(newDifficulty: DifficultyLevel): void {
    this.currentDifficulty = newDifficulty;
  }

  /**
   * Automatically adjust difficulty level based on student assessment
   */
  private autoAdjustDifficulty(assessment: SocraticAssessment): void {
    // Track recent assessments for smoother transitions
    const recentAssessments = this.conversation
      .filter(msg => msg.studentConfidence !== undefined)
      .slice(-5)
      .map(msg => msg.studentConfidence!);
    
    const avgConfidence = recentAssessments.length > 0
      ? recentAssessments.reduce((sum, c) => sum + c, 0) / recentAssessments.length
      : assessment.confidenceLevel;

    const hasMisconceptions = assessment.misconceptions.length > 0;
    const isStruggling = this.strugglingTurns > 2;
    const isThriving = avgConfidence > 0.7 && assessment.depthOfThinking >= 3 && !hasMisconceptions;

    // Adjust difficulty based on student performance
    if (isStruggling || (avgConfidence < 0.3 && hasMisconceptions)) {
      // Student struggling - lower difficulty
      if (this.currentDifficulty === DifficultyLevel.ADVANCED) {
        this.currentDifficulty = DifficultyLevel.INTERMEDIATE;
      } else if (this.currentDifficulty === DifficultyLevel.INTERMEDIATE) {
        this.currentDifficulty = DifficultyLevel.BEGINNER;
      }
    } else if (isThriving && this.depthTracker.currentDepth >= 3) {
      // Student thriving - raise difficulty
      if (this.currentDifficulty === DifficultyLevel.BEGINNER) {
        this.currentDifficulty = DifficultyLevel.INTERMEDIATE;
      } else if (this.currentDifficulty === DifficultyLevel.INTERMEDIATE) {
        this.currentDifficulty = DifficultyLevel.ADVANCED;
      }
    }
    // If intermediate performance, keep current difficulty
  }

  // Enhanced public methods
  public getDepthTracker(): ConversationDepthTracker {
    return this.depthTrackerManager.getTracker();
  }

  public getQuestionTypeSequence(): SocraticQuestionType[] {
    return [...this.questionTypeSequence];
  }

  public getMetacognitivePrompt(category: string): string {
    return this.promptManager.getMetacognitivePrompt(category);
  }

  /**
   * Get understanding check information
   */
  public getUnderstandingCheckInfo(): {
    count: number;
    checks: Array<{ turn: number; questionType: SocraticQuestionType; confidence: number }>;
    averageConfidenceAfterCheck: number;
  } {
    const checks = this.conversation
      .map((msg, idx) => ({ msg, idx }))
      .filter(({ msg }) => msg.isUnderstandingCheck === true);
    
    const checkInfo = checks.map(({ msg, idx }) => {
      const studentConfidence = msg.studentConfidence || 0;
      return {
        turn: Math.floor(idx / 2),
        questionType: msg.questionType || SocraticQuestionType.CLARIFICATION,
        confidence: studentConfidence
      };
    });
    
    // Get average confidence after understanding checks
    const confidencesAfterChecks = checks.map(({ idx }) => {
      const nextStudentMsg = this.conversation.slice(idx + 1).find(m => m.role === 'user');
      return nextStudentMsg?.studentConfidence || 0;
    }).filter(c => c > 0);
    
    const avgConfidence = confidencesAfterChecks.length > 0
      ? confidencesAfterChecks.reduce((sum, c) => sum + c, 0) / confidencesAfterChecks.length
      : 0;

    return {
      count: this.understandingCheckCount,
      checks: checkInfo,
      averageConfidenceAfterCheck: avgConfidence
    };
  }

  

  // Detect if the student directly requests the final solution
  private detectFinalSolutionRequest(input: string): boolean {
    const text = (input || '').toLowerCase();
    const patterns = [
      /what(?:'s| is) the (?:answer|final answer)/,
      /just give me (?:the )?answer/,
      /tell me (?:the )?answer/,
      /solve (?:it|this) for me/,
      /i want the (?:final )?solution/,
      /can you (?:just )?solve (?:it|this)/,
      /give me the (?:result|value)/
    ];
    return patterns.some(p => p.test(text));
  }

  // Strong detector for instructional phrasing that gives away methods/operations
  private containsInstructionalPhrasing(text: string): boolean {
    const t = (text || '').toLowerCase();
    const patterns: RegExp[] = [
      /solve\s+for\s+[a-z]/,
      /isolate\s+[a-z]/,
      /what\s+operation\s+(?:helps\s+)?isolate\s+[a-z]/,
      /plug\s+in/,
      /substitute\b/,
      /apply\s+(?:the\s+)?formula/,
      /use\s+(?:the\s+)?derivative/,
      /take\s+the\s+derivative/,
      /integrate\b/,
      /factor\b/,
      /expand\b/,
      /complete\s+the\s+square/,
      /set\s+up\s+an?\s+equation/,
      /rearrange\s+terms/,
      /multiply\s+both\s+sides/,
      /divide\s+both\s+sides/,
      /add\s+both\s+sides/,
      /subtract\s+both\s+sides/
    ];
    return patterns.some(p => p.test(t));
  }

  // Helper to reframe instructional phrasing into goal-oriented metacognitive questions
  private reframeInstructionalToGoal(input: string, assessment: SocraticAssessment, questionType: SocraticQuestionType, studentInput: string): string {
    const prompt = `Let’s stay focused on the goal. What is this problem asking us to find or show, and what would be a good first move toward that?`;
    return this.sanitizeToSocraticQuestion(prompt, assessment, questionType, studentInput);
  }

  // Build the opening prompt in a less-direct, goal-framing style
  private buildGoalFramingOpening(problem: string): string {
    const concepts = this.extractConcepts(problem);
    const objective = this.generateLearningObjective(problem, concepts);
    // Prefer a simple, warm, student-centered phrasing
    const base = `Let's tackle this together—what are we trying to solve here? In your own words, what is the main goal of this problem?`;
    // If we can infer an objective, lightly contextualize without being prescriptive
    if (objective && typeof objective === 'string' && objective.length > 0) {
      return `Let’s tackle this together—what are we trying to find or show? What’s a small first step you might try?`;
    }
    return base;
  }

  // Detect step-by-step instructional phrasing that gives away methods
  private looksInstructional(response: string): boolean {
    const patterns = [
      /(then|next|first|second|finally)\s+(add|subtract|multiply|divide|plug|apply|use|factor|expand|simplify)/i,
      /(solve|compute|calculate|substitute)\b.*\b(x|y|value|number)/i,
      /(use|apply)\s+(theorem|formula|method)/i
    ];
    return patterns.some(p => p.test(response));
  }

  // Reframe any direct or instructional answers into Socratic questions
  private sanitizeToSocraticQuestion(
    response: string,
    assessment: SocraticAssessment,
    questionType: SocraticQuestionType,
    studentInput: string
  ): string {
    let text = (response || '').trim();

    const violates = this.looksInstructional(text) || this.containsInstructionalPhrasing(text);
    if (violates) {
      const reframed = this.reframeInstructionalToGoal(text, assessment, questionType, studentInput);
      text = (reframed || 'What is this problem asking us to find or show?').trim();
    }

    // Ensure the response ends with a varied, concise question
    if (!text.endsWith('?')) {
      const closing = this.getVariedClosing(questionType);
      text = text.replace(/[.!]*$/, '') + ' ' + closing;
    }

    // Limit to at most two sentences for brevity
    const parts = text.split(/(?<=[?!.])\s+/);
    if (parts.length > 2) {
      text = parts.slice(0, 2).join(' ');
      if (!text.endsWith('?')) {
        text = text.replace(/[.!]*$/, '') + '?';
      }
    }

    return text;
  }

  // Confidence Calibration Methods

  /**
   * Parses predicted confidence from student response
   * Looks for pattern: "confidence: <0-1>" or similar
   */
  private parsePredictedConfidence(response: string): number | undefined {
    // Look for explicit confidence declaration
    const confidencePattern = /confidence:\s*([0-9.]+)/i;
    const match = response.match(confidencePattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value) && value >= 0 && value <= 1) {
        return value;
      }
    }
    
    // Look for percentage
    const percentPattern = /(\d+)%\s*(?:confident|sure)/i;
    const percentMatch = response.match(percentPattern);
    if (percentMatch) {
      const value = parseFloat(percentMatch[1]) / 100;
      if (!isNaN(value) && value >= 0 && value <= 1) {
        return value;
      }
    }
    
    return undefined;
  }

  /**
   * Computes confidence delta from previous turn
   */
  private computeConfidenceDelta(currentConfidence: number | undefined): number | undefined {
    if (currentConfidence === undefined) return undefined;
    
    const previousUserMessage = this.conversation
      .filter(msg => msg.role === 'user')
      .slice(-2, -1)[0];
    
    if (!previousUserMessage || previousUserMessage.studentConfidence === undefined) {
      return undefined;
    }
    
    return currentConfidence - previousUserMessage.studentConfidence;
  }

  /**
   * Computes calibration error: abs(predicted - actual)
   */
  private computeCalibrationError(predicted: number | undefined, actual: number | undefined): number | undefined {
    if (predicted === undefined || actual === undefined) return undefined;
    return Math.abs(predicted - actual);
  }

  // Behavioral Assessment Methods

  /**
   * Scores reasoning chain quality (0-4) based on rubric:
   * - Identifies assumptions (1 point)
   * - States evidence/reasoning (1 point)
   * - Makes logical connections (1 point)
   * - Acknowledges limitations (1 point)
   */
  async scoreReasoningChain(explanation: string, concept: string): Promise<number> {
    try {
      const content = await chatCompletion([
        {
          role: 'system',
          content: `You are evaluating a student's explanation of the concept "${concept}". Score the explanation from 0-4 based on this rubric:\n- 1 point if the explanation identifies assumptions made\n- 1 point if the explanation states evidence or reasoning\n- 1 point if the explanation makes logical connections\n- 1 point if the explanation acknowledges limitations or uncertainties\n\nRespond with ONLY a single integer from 0-4, nothing else.`
        },
        {
          role: 'user',
          content: `Student explanation: "${explanation}"`
        }
      ], { temperature: 0.3, max_tokens: 10, retryContext: 'Score reasoning' });

      const scoreText = (content || '0').trim();
      const score = parseInt(scoreText, 10);
      return Math.max(0, Math.min(4, isNaN(score) ? 0 : score));
    } catch (error) {
      console.error('Error scoring reasoning chain:', error);
      return 0;
    }
  }

  /**
   * Assesses teach-back quality (0-4) by reusing reasoning chain scoring
   * with added coherence criterion
   */
  async assessTeachBack(explanation: string, concept: string): Promise<number> {
    const reasoningScore = await this.scoreReasoningChain(explanation, concept);
    
    // Check for coherence (basic check: explanation length and structure)
    const hasCoherence = explanation.length > 50 && 
                         (explanation.includes('because') || 
                          explanation.includes('since') || 
                          explanation.includes('therefore') ||
                          explanation.split('.').length >= 2);
    
    // If reasoning score is good but lacks coherence, reduce by 1
    if (reasoningScore >= 2 && !hasCoherence) {
      return Math.max(0, reasoningScore - 1);
    }
    
    return reasoningScore;
  }

  /**
   * Generates a transfer challenge for a given concept and difficulty level
   * Uses curated templates to avoid LLM drift
   */
  generateTransferChallenge(concept: string, difficulty: DifficultyLevel): { prompt: string; expectedApproach: string } {
    // Curated templates for common math concepts
    const templates: Record<string, Record<string, { prompt: string; expectedApproach: string }>> = {
      'algebra': {
        'beginner': {
          prompt: 'If you have 3x + 7 = 22, how would you solve for x?',
          expectedApproach: 'Subtract 7 from both sides, then divide by 3'
        },
        'intermediate': {
          prompt: 'Solve 2(x - 3) + 5 = 13. What steps would you take?',
          expectedApproach: 'Distribute 2, combine like terms, isolate x'
        },
        'advanced': {
          prompt: 'How would you solve the system: 2x + 3y = 12 and x - y = 1?',
          expectedApproach: 'Use substitution or elimination method'
        }
      },
      'geometry': {
        'beginner': {
          prompt: 'If a rectangle has length 8 and width 5, how would you find its area?',
          expectedApproach: 'Multiply length by width'
        },
        'intermediate': {
          prompt: 'A triangle has sides of length 3, 4, and 5. How would you determine if it\'s a right triangle?',
          expectedApproach: 'Use Pythagorean theorem: check if 3² + 4² = 5²'
        },
        'advanced': {
          prompt: 'Given a circle with radius r, how would you find the area of a sector with central angle θ?',
          expectedApproach: 'Use formula: (θ/360) × πr²'
        }
      },
      'calculus': {
        'beginner': {
          prompt: 'If f(x) = x², what is the derivative f\'(x)?',
          expectedApproach: 'Apply power rule: 2x'
        },
        'intermediate': {
          prompt: 'How would you find the maximum value of f(x) = -x² + 4x + 1?',
          expectedApproach: 'Take derivative, set to zero, find critical point, verify maximum'
        },
        'advanced': {
          prompt: 'How would you evaluate the integral ∫(2x + 3)dx?',
          expectedApproach: 'Apply power rule for integration: x² + 3x + C'
        }
      }
    };

    // Try to match concept to template category
    const conceptLower = concept.toLowerCase();
    let category = 'algebra'; // default
    if (conceptLower.includes('geometry') || conceptLower.includes('triangle') || conceptLower.includes('circle')) {
      category = 'geometry';
    } else if (conceptLower.includes('calculus') || conceptLower.includes('derivative') || conceptLower.includes('integral')) {
      category = 'calculus';
    }

    const difficultyKey = difficulty.toLowerCase() as 'beginner' | 'intermediate' | 'advanced';
    const template = templates[category]?.[difficultyKey] || templates['algebra']['intermediate'];

    return {
      prompt: template.prompt,
      expectedApproach: template.expectedApproach
    };
  }

  /**
   * Assesses if a transfer response matches the expected approach
   */
  async assessTransferResponse(response: string, expectedApproach: string): Promise<boolean> {
    try {
      const content = await chatCompletion([
        {
          role: 'system',
          content: `You are evaluating if a student's response demonstrates the expected approach to solving a problem. The expected approach is: "${expectedApproach}"\n\nRespond with ONLY "yes" if the response matches the expected approach, or "no" if it does not.`
        },
        {
          role: 'user',
          content: `Student response: "${response}"`
        }
      ], { temperature: 0.2, max_tokens: 10, retryContext: 'Assess transfer' });

      const result = (content || 'no').trim().toLowerCase();
      return result.startsWith('yes');
    } catch (error) {
      console.error('Error assessing transfer response:', error);
      return false;
    }
  }

  /**
   * Computes behavioral depth level (1-5) based on assessment evidence
   */
  computeBehavioralDepthLevel(assessment: BehavioralAssessment): number {
    return this.depthTrackerManager.computeBehavioralDepthLevel(assessment);
  }

  /**
   * Assesses student question quality (1-5) from "What is X?" to "How does X connect to Y?"
   */
  async assessStudentQuestionQuality(question: string, concept: string): Promise<number> {
    try {
      const content = await chatCompletion([
        {
          role: 'system',
          content: `You are evaluating the quality of a student's question about "${concept}". Score from 1-5:\n- 1: Basic recall question ("What is X?")\n- 2: Simple application question ("How do I use X?")\n- 3: Analysis question ("Why does X work?")\n- 4: Synthesis question ("How does X relate to Y?")\n- 5: Evaluation/connection question ("How does X connect to Y in different contexts?")\n\nRespond with ONLY a single integer from 1-5, nothing else.`
        },
        {
          role: 'user',
          content: `Student question: "${question}"`
        }
      ], { temperature: 0.3, max_tokens: 10, retryContext: 'Assess question quality' });

      const scoreText = (content || '1').trim();
      const score = parseInt(scoreText, 10);
      return Math.max(1, Math.min(5, isNaN(score) ? 1 : score));
    } catch (error) {
      console.error('Error assessing question quality:', error);
      return 1;
    }
  }

  

  /**
   * Computes session-level learning gains from behavioral assessments
   */
  computeSessionLearningGains(): {
    depthTrajectory: number[];
    teachBackScores: number[];
    transferSuccessRate: number;
    reasoningScoreAvg: number;
    calibrationErrorAvg: number;
    breakthroughs: number;
  } {
    // Extract depth trajectory from conversation
    const depthTrajectory = this.conversation
      .filter(msg => msg.depthLevel !== undefined)
      .map(msg => msg.depthLevel!);

    // Extract teach-back scores
    const teachBackScores = this.conversation
      .filter(msg => msg.teachBackScore !== undefined)
      .map(msg => msg.teachBackScore!);

    // Calculate transfer success rate
    const transferAttempts = this.conversation
      .filter(msg => msg.transferAttempt !== undefined);
    const successfulTransfers = transferAttempts
      .filter(msg => msg.transferAttempt!.success).length;
    const transferSuccessRate = transferAttempts.length > 0
      ? successfulTransfers / transferAttempts.length
      : 0;

    // Calculate average reasoning score
    const reasoningScores = this.conversation
      .filter(msg => msg.reasoningScore !== undefined)
      .map(msg => msg.reasoningScore!);
    const reasoningScoreAvg = reasoningScores.length > 0
      ? reasoningScores.reduce((sum, score) => sum + score, 0) / reasoningScores.length
      : 0;

    // Calculate average calibration error
    // Calibration error is computed from predicted vs actual confidence
    // We need to compute it from messages that have both predictedConfidence and studentConfidence
    const calibrationErrors: number[] = [];
    this.conversation.forEach(msg => {
      if (msg.predictedConfidence !== undefined && msg.studentConfidence !== undefined) {
        const error = Math.abs(msg.predictedConfidence - msg.studentConfidence);
        calibrationErrors.push(error);
      }
    });
    const calibrationErrorAvg = calibrationErrors.length > 0
      ? calibrationErrors.reduce((sum, error) => sum + error, 0) / calibrationErrors.length
      : 0;

    // Count breakthrough moments
    const breakthroughs = this.conversation
      .filter(msg => msg.breakthroughMoment === true).length;

    return {
      depthTrajectory,
      teachBackScores,
      transferSuccessRate,
      reasoningScoreAvg,
      calibrationErrorAvg,
      breakthroughs
    };
  }

  // Get session performance data for analytics
  getSessionPerformance(): SessionPerformance {
    const userMessages = this.conversation.filter(msg => msg.role === 'user');
    
    return {
      sessionId: this.sessionId,
      startTime: this.sessionStartTime,
      endTime: new Date(),
      totalInteractions: userMessages.length,
      problemsSolved: this.problem ? 1 : 0,
      averageResponseTime: this.studentProfile?.engagementMetrics?.averageResponseTime || 0,
      strugglingTurns: this.strugglingTurns,
      difficultyLevel: this.currentDifficulty,
      engagementScore: this.studentProfile?.engagementMetrics?.engagementScore || 0.5,
      completionRate: this.calculateCompletionRate(),
      conceptsExplored: this.depthTracker.conceptualConnections,
      masteryScore: this.calculateCompletionRate(),
      conceptsLearned: [...new Set(this.depthTracker.conceptualConnections)],
      hintsUsed: this.strugglingTurns,
      struggledConcepts: []
    };
  }

  private calculateCompletionRate(): number {
    const meaningfulExchanges = this.conversation.filter(msg => 
      msg.role === 'user' && msg.content.length > 10
    ).length;
    
    return Math.min(1, meaningfulExchanges / 5);
  }

  // Generate analytics for enhanced session
  public generateAnalytics(): {
    questionTypesUsed: string[];
    questionTypeDistribution: Record<string, number>;
    averageDepth: number;
    currentDepth: number;
    conceptsExplored: string[];
    confidenceProgression: number[];
    engagementScore: number;
    totalInteractions: number;
    metacognitivePrompts: number;
    learningGains: {
      depthTrajectory: number[];
      teachBackScores: number[];
      transferSuccessRate: number;
      reasoningScoreAvg: number;
      calibrationErrorAvg: number;
      breakthroughs: number;
    };
  } {
    // Count question types used
    const questionTypeCounts = this.questionTypeSequence.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate confidence progression
    const confidenceProgression = this.conversation
      .filter(msg => msg.role === 'user' && msg.studentConfidence !== undefined)
      .map(msg => msg.studentConfidence!);

    // Calculate engagement score
    const avgResponseTime = this.studentProfile?.engagementMetrics?.averageResponseTime || 30000;
    const engagementScore = Math.min(
      (this.depthTracker.maxDepthReached / 5) * 0.6 + 
      (avgResponseTime > 5000 && avgResponseTime < 60000 ? 0.4 : 0.2), 
      1.0
    );

    // Get learning gains
    const learningGains = this.computeSessionLearningGains();

    return {
      questionTypesUsed: Object.keys(questionTypeCounts),
      questionTypeDistribution: questionTypeCounts,
      averageDepth: this.depthTracker.maxDepthReached,
      currentDepth: this.depthTracker.currentDepth,
      conceptsExplored: [...new Set(this.depthTracker.conceptualConnections)],
      confidenceProgression,
      engagementScore,
      totalInteractions: this.conversation.filter(msg => msg.role !== 'system').length,
      metacognitivePrompts: this.depthTracker.maxDepthReached >= 3 ? 2 : 0,
      learningGains
    };
  }

  // Add method to detect if problem is solved
  private detectProblemSolved(studentInput: string): boolean {
    // Look for indicators that student has solved it
    const solvedIndicators = [
      /answer is/i,
      /solution is/i,
      /equals? \d+/i,
      /x\s*=\s*\d+/i,
      /i got/i,
      /it's \d+/i,
      /the answer/i
    ];
    
    // Also check if they're expressing high confidence with a specific answer
    const hasAnswer = solvedIndicators.some(pattern => pattern.test(studentInput));
    const highConfidence = this.assessStudentResponse(studentInput).confidenceLevel > 0.8;
    
    return hasAnswer && highConfidence;
  }

  // Add method to advance phase
  private advancePhase(): void {
    switch (this.sessionPhase) {
      case 'goal':
        this.sessionPhase = 'assess_knowledge';
        break;
      case 'assess_knowledge':
        this.sessionPhase = 'first_steps';
        break;
      case 'first_steps':
        this.sessionPhase = 'working';
        break;
      case 'working':
        // Stay in working until solved or stuck
        break;
      case 'hint_needed':
        this.sessionPhase = 'working'; // Return to working after hint
        break;
    }
  }

  /**
   * Check if a response contains a direct answer (violates Socratic method)
   */
  containsDirectAnswer(response: string): boolean {
    if (!response || typeof response !== 'string') {
      return false;
    }

    const text = response.toLowerCase().trim();
    
    // Patterns that indicate direct answers
    const directAnswerPatterns = [
      /^(the answer is|the solution is|the result is|therefore|so,?|thus)/i,
      /^(x\s*=\s*\d+|y\s*=\s*\d+)/i, // Direct equation solutions like "x = 4"
      /^(it's\s+\d+|it is \d+)/i,
      /^(you get \d+|we get \d+)/i,
      /^(the final answer is|the correct answer is)/i,
    ];

    // Check for direct answer patterns
    for (const pattern of directAnswerPatterns) {
      if (pattern.test(text)) {
        return true;
      }
    }

    // Check for standalone numeric answers at the start
    const startsWithNumber = /^\d+\.?\s*$/.test(text.split(/[.!?]/)[0]);
    if (startsWithNumber && text.length < 50) {
      return true;
    }

    return false;
  }

  /**
   * Check if a response is too similar to recent responses (repetitive)
   * Returns true if the response is too similar to the last 2-3 responses
   */
  private isResponseRepetitive(response: string): boolean {
    if (!response || response.trim().length === 0) {
      return false;
    }

    // Get recent assistant responses (last 3)
    const recentResponses = this.conversation
      .filter(msg => msg.role === 'assistant')
      .slice(-3)
      .map(msg => msg.content.toLowerCase().trim());

    if (recentResponses.length === 0) {
      return false;
    }

    const normalizedResponse = response.toLowerCase().trim();
    
    // Check similarity using simple word overlap
    for (const recentResponse of recentResponses) {
      const similarity = this.calculateSimilarity(normalizedResponse, recentResponse);
      // Lower threshold (60%) to catch more repetitive responses
      if (similarity > 0.6) {
        return true;
      }
    }

    // Check for exact phrase repetition (first 10 words)
    const responseWords = normalizedResponse.split(/\s+/).slice(0, 10).join(' ');
    for (const recentResponse of recentResponses) {
      const recentWords = recentResponse.split(/\s+/).slice(0, 10).join(' ');
      if (responseWords === recentWords && responseWords.length > 20) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate similarity between two strings using word overlap
   * Returns a value between 0 and 1
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 2));
    
    if (words1.size === 0 || words2.size === 0) {
      return 0;
    }

    let intersection = 0;
    for (const word of words1) {
      if (words2.has(word)) {
        intersection++;
      }
    }

    const union = words1.size + words2.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Get an alternative question type to avoid repetition
   */
  private getAlternativeQuestionType(currentType: SocraticQuestionType): SocraticQuestionType {
    const allTypes = [
      SocraticQuestionType.CLARIFICATION,
      SocraticQuestionType.ASSUMPTIONS,
      SocraticQuestionType.EVIDENCE,
      SocraticQuestionType.PERSPECTIVE,
      SocraticQuestionType.IMPLICATIONS,
      SocraticQuestionType.META_QUESTIONING
    ];
    
    // Get recently used question types
    const recentTypes = this.questionTypeSequence.slice(-3);
    
    // Find types that haven't been used recently
    const availableTypes = allTypes.filter(type => !recentTypes.includes(type));
    
    if (availableTypes.length > 0) {
      // Return a random type from available ones
      return availableTypes[Math.floor(Math.random() * availableTypes.length)];
    }
    
    // If all types have been used, pick one that's different from current
    const differentTypes = allTypes.filter(type => type !== currentType);
    return differentTypes[Math.floor(Math.random() * differentTypes.length)];
  }
}
