// Complete Socratic Engine - Standalone Implementation
// Replaces the existing socratic-engine.ts with all enhancements built-in

import OpenAI from 'openai';
import { handleOpenAIError, retryWithBackoff } from './lib/error-utils';
import { LLMServiceError } from './api/middleware/errorHandler';
import { BehavioralAssessment } from './types';

// Enhanced Types (can also be added to types.ts)
export enum SocraticQuestionType {
  CLARIFICATION = "clarification",        // "What do you mean by...?"
  ASSUMPTIONS = "assumptions",            // "What assumptions are you making?"
  EVIDENCE = "evidence",                  // "What evidence supports this?"
  PERSPECTIVE = "perspective",            // "How might someone disagree?"
  IMPLICATIONS = "implications",          // "What might happen if...?"
  META_QUESTIONING = "meta_questioning"   // "Why is this question important?"
}

export interface ConversationDepthTracker {
  currentDepth: number;
  maxDepthReached: number;
  conceptualConnections: string[];
  shouldDeepenInquiry: boolean;
  suggestedNextLevel: number;
  questionType: SocraticQuestionType;
}

export interface SocraticAssessment {
  confidenceLevel: number;
  misconceptions: string[];
  readinessForAdvancement: boolean;
  conceptualUnderstanding: number;
  depthOfThinking: number;
}

export interface EnhancedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  questionType?: SocraticQuestionType;
  depthLevel?: number;
  effectiveness?: number;
  targetedConcepts?: string[];
  studentConfidence?: number;
  isUnderstandingCheck?: boolean;
  // Behavioral assessment fields
  confidenceDelta?: number;
  reasoningScore?: number;
  teachBackScore?: number;
  transferAttempt?: { problemId: string; success: boolean };
  predictedConfidence?: number;
  breakthroughMoment?: boolean;
}

export interface EnhancedStudentProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  performanceHistory: Array<{
    sessionId: string;
    masteryScore: number;
    completionRate: number;
    conceptsLearned: string[];
    hintsUsed: number;
    struggledConcepts: string[];
  }>;
  knowledgeGaps: string[];
  learningStyle: 'visual' | 'auditory' | 'kinesthetic';
  engagementMetrics?: {
    averageResponseTime: number;
    totalInteractions: number;
    engagementScore: number;
  };
  // Enhanced properties
  preferredQuestioningStyle: 'direct' | 'exploratory' | 'analogical';
  conceptualConnections: Map<string, string[]>;
  motivationalTriggers: string[];
  cognitiveLoadPreference: 'low' | 'medium' | 'high';
  questionResponseHistory: {
    questionType: SocraticQuestionType;
    effectiveness: number;
    responseTime: number;
    comprehensionLevel: number;
    timestamp: Date;
  }[];
}

export enum DifficultyLevel {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate", 
  ADVANCED = "advanced"
}

export interface SessionPerformance {
  sessionId: string;
  startTime: Date;
  endTime: Date;
  totalInteractions: number;
  problemsSolved: number;
  averageResponseTime: number;
  strugglingTurns: number;
  difficultyLevel: DifficultyLevel;
  engagementScore: number;
  completionRate: number;
  conceptsExplored: string[];
  masteryScore: number;
  conceptsLearned: string[];
  hintsUsed: number;
  struggledConcepts: string[];
}

// Complete Socratic Engine Implementation
export class SocraticEngine {
  private openai: OpenAI;
  private conversation: EnhancedMessage[] = [];
  private problem: string = '';
  private sessionId: string = '';
  private studentProfile?: EnhancedStudentProfile;
  private currentDifficulty: DifficultyLevel = DifficultyLevel.INTERMEDIATE;
  private sessionStartTime: Date = new Date();
  private strugglingTurns: number = 0;
  private lastResponseTime: number = 0;
  
  // Enhanced properties
  private depthTracker!: ConversationDepthTracker;
  private questionTypeSequence: SocraticQuestionType[] = [];
  private metacognitivePrompts!: Map<string, string[]>;
  private conceptualFramework!: Map<string, string[]>;
  private sessionManager?: any;
  private lastUnderstandingCheckTurn: number = 0;
  private understandingCheckCount: number = 0;
  private probeType?: 'teachback' | 'transfer' | 'question';
  private lastProbeTurn: number = 0;
  private strictMode: boolean = false;
  private isAssessmentMode: boolean = false; // New: Assessment mode flag
  private expectedAnswer?: string; // New: Expected answer for assessment
  private studentHasAnswered: boolean = false; // New: Track if student gave an answer

  constructor(sessionManager?: any, strictMode: boolean = false) {
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
    this.sessionManager = sessionManager;
    this.strictMode = strictMode;
    this.initializeEnhancedFeatures();
  }

  // Initialize enhanced features
  private initializeEnhancedFeatures(): void {
    this.initializeMetacognitivePrompts();
    this.initializeConceptualFramework();
    this.depthTracker = {
      currentDepth: 1,
      maxDepthReached: 1,
      conceptualConnections: [],
      shouldDeepenInquiry: false,
      suggestedNextLevel: 1,
      questionType: SocraticQuestionType.CLARIFICATION
    };
  }

  private initializeMetacognitivePrompts(): void {
    this.metacognitivePrompts = new Map([
      ['processReflection', [
        "How did you decide to take that approach?",
        "What was your thinking process here?",
        "What made you choose this method?"
      ]],
      ['confidenceCheck', [
        "How confident are you in this answer? What makes you feel that way?",
        "On a scale of 1-10, how sure are you about this step?",
        "What part of this solution feels most solid to you?"
      ]],
      ['strategyAwareness', [
        "What strategy are you using here? Have you used it before?",
        "Is this approach similar to problems you've solved before?",
        "What other methods could work for this problem?"
      ]],
      ['errorAnalysis', [
        "What do you think might have led to this mistake?",
        "If you were to start over, what would you do differently?",
        "What could help you avoid this error next time?"
      ]]
    ]);
  }

  private initializeConceptualFramework(): void {
    this.conceptualFramework = new Map([
      ['algebra', ['variables', 'equations', 'solving', 'substitution', 'elimination']],
      ['geometry', ['shapes', 'area', 'perimeter', 'angles', 'theorems']],
      ['calculus', ['derivatives', 'integrals', 'limits', 'rates', 'optimization']],
      ['statistics', ['mean', 'median', 'distribution', 'probability', 'correlation']],
      ['arithmetic', ['addition', 'subtraction', 'multiplication', 'division']],
      ['fractions', ['numerator', 'denominator', 'equivalent', 'simplify']]
    ]);
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

  async startProblem(problem: string): Promise<string> {
    this.problem = problem;
    
    // Build enhanced system prompt
    const enhancedPrompt = this.buildEnhancedSystemPrompt(problem);
    
    this.conversation = [
      { role: 'system', content: enhancedPrompt, timestamp: new Date() }
    ];
    
    // Determine initial question type
    const initialQuestionType = this.selectInitialQuestionType(problem);
    
    const response = await handleOpenAIError(
      () => retryWithBackoff(
        () => this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            ...this.conversation.map(msg => ({ role: msg.role, content: msg.content })),
            { role: 'system', content: `Use ${initialQuestionType} questioning approach. Keep response to 1-2 sentences maximum. Ask an indirect, exploratory question rather than a direct one.` }
          ],
          temperature: 0.8,
          max_tokens: 150  // Increased to allow more thoughtful opening questions
        }),
        2, // max retries
        1000, // initial delay
        'Starting problem'
      ),
      'Tutoring service'
    );

    const tutorResponse = response.choices[0]?.message?.content || 
      "I'm excited to explore this problem with you! What's your initial understanding of what we're looking for?";
    
    const enhancedMessage: EnhancedMessage = {
      role: 'assistant',
      content: tutorResponse,
      timestamp: new Date(),
      questionType: initialQuestionType,
      depthLevel: 1,
      targetedConcepts: this.extractConcepts(problem)
    };
   const polishedResponse = tutorResponse
  .replace(/assumption/gi, "idea")
  .replace(/clarify/gi, "explain")
  .replace(/evidence/gi, "reasoning")
  .replace(/concept/gi, "idea")
  .replace(/\.\s*$/, '?'); // Ensure it ends with a question

// Use `polishedResponse` instead of `tutorResponse`

    this.conversation.push(enhancedMessage);
    this.questionTypeSequence.push(initialQuestionType);
    
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

    return "What's your answer to this problem? Take your time and show your work if needed.";
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
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        ...this.conversation.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'system', content: contextualGuidance }
      ],
      temperature: 0.75, // Balanced for following instructions while staying exploratory
      max_tokens: 100,
      presence_penalty: 0.7, // Strong encouragement for variety
      frequency_penalty: 0.4 // Reduce repetition
    });

    let tutorResponse = response.choices[0]?.message?.content || 
      "That's interesting thinking! Can you tell me more about your reasoning?";
    
    // Ensure response ends with question
    if (!tutorResponse.trim().endsWith('?')) {
      tutorResponse += " What do you think?";
    }
    
    const enhancedMessage: EnhancedMessage = {
      role: 'assistant',
      content: tutorResponse,
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
    return tutorResponse;
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

RESPOND NOW:`;

    return guidance;
  }

  private buildEnhancedSystemPrompt(problem: string): string {
    const studentLevel = this.determineStudentLevel();
    const concepts = this.extractConcepts(problem);
    const learningObjective = this.generateLearningObjective(problem, concepts);

    return `You are an expert Socratic AI tutor combining ancient wisdom with modern pedagogy. Your role is to guide students to discover solutions through strategic, well-timed questions.

=== CORE IDENTITY ===
You are warm, patient, and genuinely curious about the student's thinking process. You care more about their intellectual growth than efficiency. You believe every student can learn—you just need to ask the right questions.

=== FUNDAMENTAL RULES ===
1. NEVER give direct answers or solutions to the ACTUAL PROBLEM
2. ALWAYS respond with a question (except brief encouragement OR scaffolding help)
3. NEVER suggest specific operations (NO "subtract 5", "divide by 2", etc.)
4. REFERENCE the equation structure to nudge thinking - not generic, not specific
5. Questions must be SHORT (1-2 sentences max)
6. End EVERY response with a question mark
7. When student is correct, probe deeper before moving on
8. STAY GROUNDED in the actual problem - NO metaphors, stories, or "imagine" scenarios
9. AVOID generic questions like "What's our goal?" - be contextual and nudging

SCAFFOLDING EXCEPTION (You CAN tell them these):
✅ Restate the goal: "We're trying to find [what the problem asks for]"
✅ Restate given information: "The problem tells us that [restate the given facts]"
✅ Clarify what solving/finding means in context: "Finding X means [what the end result looks like]"
BUT NEVER tell them HOW to solve it or suggest specific operations.

CRITICAL EXAMPLES (work for ANY problem):
❌ TOO GENERIC: "Based on what you know, what should we do?"
❌ TOO SPECIFIC: "Should we subtract 5?" or "Use the Pythagorean theorem"
✅ CONTEXTUAL NUDGE: "When you see [describe pattern they're looking at], what does that tell you?"
✅ SCAFFOLDING HELP: "We're trying to find [the goal]. What does that tell you about what we need?"

=== THE SIX QUESTION TYPES (Use strategically) ===

**CLARIFICATION** - When student is vague or starting out:
- "When you see a problem like this, what are we actually trying to find?"
- "What would it look like if we were done with this problem?"
- "What pattern do you notice in what you're looking at?"
- Reference the problem structure/pattern, not generic strategies
- NEVER suggest specific operations or give away methods

**ASSUMPTIONS** - When student makes unstated assumptions:
- "What are you assuming about...?"
- "Does that always hold true?"
- "What if that assumption wasn't correct?"
- "What would need to be true for that to work?"

**EVIDENCE** - When student makes claims without support:
- "What makes you think that?"
- "How do you know that's true?"
- "What supports this conclusion?"
- "Can you show me why that works?"

**PERSPECTIVE** - When student needs to see alternatives:
- "How might someone solve this differently?"
- "What's another way to look at this?"
- "Could there be a simpler approach?"
- "What would happen if we tried it backwards?"

**IMPLICATIONS** - When exploring consequences:
- "If that's true, what would happen next?"
- "How does this connect to...?"
- "What pattern do you notice?"
- "What does this tell us about...?"

**META-QUESTIONING** - When building awareness:
- "How did you decide to try that approach?"
- "What made this problem tricky?"
- "How is this similar to problems you've solved before?"
- "Why do you think this question matters?"

=== ADAPTIVE RESPONSE PATTERNS ===

**When student is STUCK (confidence < 0.3):**
- Reference problem structure: "When you see [describe what they're looking at], what does that pattern suggest?"
- Nudge toward goal: "What would it look like if we found what we're looking for?"
- Connect to prior work: "Remember the last problem? What was similar about what we needed to do?"
- Be extra encouraging: "You're thinking hard about this—that's exactly right. Now..."
- Stay concrete and contextual: Focus on the actual problem structure, not metaphors or generic strategies

**When student is CONFIDENT (confidence > 0.7):**
- Challenge deeper: "Interesting! Why does that work?"
- Seek connections: "How does this relate to...?"
- Ask for alternative methods: "Great! Is there another way you could solve this?"
- Test understanding: "If I changed X, how would your answer change?"

**When student is OFF-TRACK:**
- Redirect gently: "Hmm, let's think about that. What are we actually trying to find?"
- Highlight contradiction: "I notice you said X, but also Y. How do those fit together?"
- Return to basics: "Let's step back. What do we know for certain?"

**When student is CORRECT:**
- Don't just validate: "You got it! Now why does that work?"
- Deepen understanding: "Good! Can you explain it in your own words?"
- Make connections: "How would you apply this to a different problem?"
- Build confidence: "See how you figured that out? What strategy did you use?"

=== DIALOGUE FLOW PATTERNS ===

**Pattern 1: The Scaffolding Ladder**
1. "What's the goal?" (Clarify objective)
2. "What do we know?" (Gather facts from the actual problem)
3. "What can we do with that?" (Explore operations on the actual equation)
4. "What happens when we try it?" (Test approach with the real numbers)
5. "Does that get us closer?" (Evaluate progress)

**Pattern 2: The Error Recovery**
Student: [makes mistake]
Teacher: "Let's test that. If X = [wrong answer], what would happen?"
Student: [sees contradiction]
Teacher: "Interesting! So what does that tell us?"

**Pattern 3: The Connection Builder**
Teacher: "How is this like [previous problem]?"
Student: [makes connection]
Teacher: "Exactly! So what strategy worked there that might work here?"

CRITICAL: All patterns should reference the ACTUAL problem, equation, or numbers they're working with. NO metaphors, stories, or abstract examples.

=== TONE AND STYLE ===
- Conversational, not formal: "Hmm, interesting!" not "That is an intriguing observation"
- Encouraging: "You're onto something!" "That's good thinking!"
- Curious: "I wonder..." "What if..."
- Patient: Never rush, never show frustration
- Specific: Refer to exact parts of their work

=== EXAMPLES OF EXCELLENT SOCRATIC EXCHANGES ===
(These show the APPROACH - apply the same style to ANY problem type)

**Example 1 (Algebra):**
Problem: Solve 2x + 5 = 11

BAD: "To solve this, subtract 5 from both sides to get 2x = 6..."
GOOD: "What's happening to x in this equation?"
→ "It's being multiplied by 2 and having 5 added"
"Perfect! So if we want to get x by itself, what would we need to undo first?"

**Example 2 (Geometry):**
Problem: Find the diagonal of a 3x4 rectangle

BAD: "Use the Pythagorean theorem: a² + b² = c²"
GOOD: "If you drew that diagonal, what shape would it create?"
→ "A triangle"
"What kind of triangle?"
→ "A right triangle"
"Excellent! And what do you know about right triangles?"

NOTE: Use this same questioning APPROACH for calculus, word problems, proofs, or ANY math topic.

=== FORBIDDEN BEHAVIORS ===
❌ "The answer is X"
❌ "Here's how you solve it: step 1..."
❌ "That's wrong. Try again."
❌ "Do you understand?" (too vague)
❌ Long explanations without questions
❌ Asking multiple questions at once
❌ Using technical jargon without checking understanding

=== SUCCESS METRICS ===
You're succeeding when:
✅ Student says "Oh! I see it now!"
✅ Student explains their reasoning unprompted
✅ Student catches their own errors
✅ Student makes connections to other concepts
✅ Student asks you a question back

=== CURRENT CONTEXT ===
Student Level: ${studentLevel}
Problem: ${problem}
Key Concepts: ${concepts.join(', ')}
Learning Goal: ${learningObjective}

Remember: Your job isn't to teach them the answer—it's to teach them to think. One well-placed question is worth a hundred explanations.

Now, begin with your first Socratic question to start this student's journey of discovery.`;
  }  

  private selectInitialQuestionType(problem: string): SocraticQuestionType {
    if (problem.includes('solve') || problem.includes('find')) {
      return SocraticQuestionType.CLARIFICATION;
    }
    if (problem.includes('why') || problem.includes('explain')) {
      return SocraticQuestionType.EVIDENCE;
    }
    if (problem.includes('compare') || problem.includes('evaluate')) {
      return SocraticQuestionType.PERSPECTIVE;
    }
    return SocraticQuestionType.CLARIFICATION;
  }

  private assessStudentResponse(response: string): SocraticAssessment {
    const uncertaintyIndicators = [
      /i don't know/i, 
      /not sure/i, 
      /confused/i, 
      /don't understand/i,
      /i need help/i,
      /help me/i,
      /stuck/i,
      /lost/i,
      /no idea/i,
      /can't figure/i,
      /don't get it/i
    ];
    
    const confidenceIndicators = [
      /i'm sure/i, 
      /definitely/i, 
      /certainly/i, 
      /obviously/i,
      /i know/i,
      /i think i got it/i,
      /that makes sense/i
    ];

    const misconceptionIndicators = [
      /always/i, /never/i, /every time/i // Overgeneralization
    ];

    let confidenceLevel = 0.5; // Default moderate confidence
    
    // Adjust confidence based on language
    if (uncertaintyIndicators.some(pattern => pattern.test(response))) {
      confidenceLevel = 0.2;
    } else if (confidenceIndicators.some(pattern => pattern.test(response))) {
      confidenceLevel = 0.9;
    } else if (/maybe|perhaps|might|could|guess|think so/i.test(response)) {
      confidenceLevel = 0.6;
    }
    
    // Lower confidence if response is very short (likely struggling)
    if (response.trim().length < 10 && !confidenceIndicators.some(pattern => pattern.test(response))) {
      confidenceLevel = Math.min(confidenceLevel, 0.4);
    }

    const misconceptions = misconceptionIndicators
      .filter(pattern => pattern.test(response))
      .map(() => 'Potential overgeneralization detected');

    return {
      confidenceLevel,
      misconceptions,
      readinessForAdvancement: confidenceLevel > 0.6 && misconceptions.length === 0,
      conceptualUnderstanding: this.assessConceptualUnderstanding(response),
      depthOfThinking: this.assessThinkingDepth(response)
    };
  }

  private selectNextQuestionType(assessment: SocraticAssessment): SocraticQuestionType {
    const lastQuestionType = this.questionTypeSequence[this.questionTypeSequence.length - 1];
    
    // Strategy: Cycle through question types based on student state
    if (assessment.confidenceLevel < 0.3) {
      // Student struggling - use clarification or break down assumptions
      return Math.random() < 0.7 ? SocraticQuestionType.CLARIFICATION : SocraticQuestionType.ASSUMPTIONS;
    }
    
    if (assessment.misconceptions.length > 0) {
      // Address misconceptions with evidence-seeking
      return SocraticQuestionType.EVIDENCE;
    }
    
    if (assessment.readinessForAdvancement && this.depthTracker.currentDepth >= 3) {
      // Student ready for deeper thinking
      const advancedTypes = [SocraticQuestionType.IMPLICATIONS, SocraticQuestionType.PERSPECTIVE, SocraticQuestionType.META_QUESTIONING];
      return advancedTypes[Math.floor(Math.random() * advancedTypes.length)];
    }
    
    // Default progression through question types
    const typeOrder = [
      SocraticQuestionType.CLARIFICATION,
      SocraticQuestionType.ASSUMPTIONS,
      SocraticQuestionType.EVIDENCE,
      SocraticQuestionType.PERSPECTIVE,
      SocraticQuestionType.IMPLICATIONS,
      SocraticQuestionType.META_QUESTIONING
    ];
    
    const currentIndex = typeOrder.indexOf(lastQuestionType);
    return typeOrder[(currentIndex + 1) % typeOrder.length];
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

    // Return random question from selected pool
    return selectedQuestions[Math.floor(Math.random() * selectedQuestions.length)];
  }

  private updateDepthTracker(assessment: SocraticAssessment, studentInput: string): void {
    // Increase depth if student shows good understanding
    if (assessment.readinessForAdvancement && assessment.depthOfThinking >= 3) {
      this.depthTracker.currentDepth = Math.min(this.depthTracker.currentDepth + 1, 5);
      this.depthTracker.maxDepthReached = Math.max(this.depthTracker.maxDepthReached, this.depthTracker.currentDepth);
    }
    
    // Track conceptual connections mentioned
    const concepts = this.extractConcepts(studentInput);
    this.depthTracker.conceptualConnections.push(...concepts);
    
    // Determine if we should deepen inquiry
    this.depthTracker.shouldDeepenInquiry = 
      this.depthTracker.currentDepth < 4 && 
      assessment.conceptualUnderstanding > 0.7;
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
    const contextualQuestion = this.selectContextualQuestion(assessment, questionType, studentResponse);
    
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
    // Understanding checks should probe for deep comprehension
    if (assessment.misconceptions.length > 0) {
      return SocraticQuestionType.EVIDENCE; // Test if they can support their understanding
    }
    
    if (assessment.confidenceLevel < 0.4) {
      return SocraticQuestionType.CLARIFICATION; // Check basic understanding
    }
    
    if (assessment.depthOfThinking >= 3) {
      return SocraticQuestionType.IMPLICATIONS; // Test deeper understanding
    }
    
    // Default to evidence-based check
    return SocraticQuestionType.EVIDENCE;
  }

  private assessConceptualUnderstanding(response: string): number {
    const mathematicalTerms = ['equation', 'variable', 'solve', 'isolate', 'substitute', 'eliminate', 'derivative', 'integral', 'area', 'perimeter'];
    const correctTermUsage = mathematicalTerms.filter(term => 
      new RegExp(`\\b${term}\\b`, 'i').test(response)
    ).length;
    
    return Math.min(correctTermUsage / 3, 1.0);
  }

  private assessThinkingDepth(response: string): number {
    let depth = 1;
    
    if (response.length > 50) depth++; // Detailed response
    if (/because|since|therefore|so that/i.test(response)) depth++; // Reasoning
    if (/if.*then|when.*then/i.test(response)) depth++; // Conditional thinking
    if (/similar to|different from|like|unlike/i.test(response)) depth++; // Comparative thinking
    if (/what if|suppose|imagine/i.test(response)) depth++; // Hypothetical thinking
    
    return Math.min(depth, 5);
  }

  private extractConcepts(text: string): string[] {
    const concepts: string[] = [];
    
    for (const [category, terms] of this.conceptualFramework.entries()) {
      if (terms.some(term => new RegExp(`\\b${term}\\b`, 'i').test(text))) {
        concepts.push(category);
      }
    }
    
    return [...new Set(concepts)];
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
  restoreConversationHistory(interactions: Array<{ role: 'user' | 'assistant', content: string, timestamp?: Date }>): void {
    // Add all historical messages to the conversation
    for (const interaction of interactions) {
      const enhancedMessage: EnhancedMessage = {
        role: interaction.role,
        content: interaction.content,
        timestamp: interaction.timestamp || new Date()
      };
      this.conversation.push(enhancedMessage);
    }
    
    console.log(`[SocraticEngine] Restored ${interactions.length} messages from history`);
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
    return this.depthTracker;
  }

  public getQuestionTypeSequence(): SocraticQuestionType[] {
    return [...this.questionTypeSequence];
  }

  public getMetacognitivePrompt(category: string): string {
    const prompts = this.metacognitivePrompts.get(category);
    if (!prompts || prompts.length === 0) return "How are you thinking about this problem?";
    return prompts[Math.floor(Math.random() * prompts.length)];
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

  // Direct answer detection (enhanced)
  containsDirectAnswer(response: string): boolean {
    // Legitimate Socratic guidance patterns (should NOT be flagged)
    const socraticGuidancePatterns = [
      /what does.*become\?/i,
      /how.*do.*that\?/i,
      /what.*next.*step\?/i,
      /how.*arrive.*conclusion\?/i,
      /can you.*tell me/i,
      /what.*think/i,
      /do you.*know/i,
      /\?.*$/
    ];
    
    // If it's clearly Socratic guidance, don't flag it
    if (socraticGuidancePatterns.some(pattern => pattern.test(response))) {
      return false;
    }
    
    // Direct answer patterns (should be flagged)
    const directAnswerPatterns = [
      /^the answer is\s*\d+/i,
      /^the solution is\s*\d+/i,
      /^x\s*=\s*\d+\.?$/i,
      /^therefore,?\s*x\s*=\s*\d+/i,
      /^so,?\s*x\s*=\s*\d+\.?$/i,
      /^the final answer is/i,
      /^the result is\s*\d+/i,
      /we get\s*x\s*=\s*\d+\.?$/i,
      /this gives us\s*x\s*=\s*\d+/i
    ];
    
    return directAnswerPatterns.some(pattern => pattern.test(response.trim()));
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
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are evaluating a student's explanation of the concept "${concept}". Score the explanation from 0-4 based on this rubric:
- 1 point if the explanation identifies assumptions made
- 1 point if the explanation states evidence or reasoning
- 1 point if the explanation makes logical connections
- 1 point if the explanation acknowledges limitations or uncertainties

Respond with ONLY a single integer from 0-4, nothing else.`
          },
          {
            role: 'user',
            content: `Student explanation: "${explanation}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 10
      });

      const scoreText = response.choices[0]?.message?.content?.trim() || '0';
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
      const assessment = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are evaluating if a student's response demonstrates the expected approach to solving a problem. The expected approach is: "${expectedApproach}"

Respond with ONLY "yes" if the response matches the expected approach, or "no" if it does not.`
          },
          {
            role: 'user',
            content: `Student response: "${response}"`
          }
        ],
        temperature: 0.2,
        max_tokens: 10
      });

      const result = assessment.choices[0]?.message?.content?.trim().toLowerCase() || 'no';
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
    let level = 1;

    // Level 2: coherent explanation (teachBackScore >= 2)
    if (assessment.teachBackScore >= 2) {
      level = Math.max(level, 2);
    }

    // Level 3: transfer success once (transferSuccess = true)
    if (assessment.transferSuccess) {
      level = Math.max(level, 3);
    }

    // Level 4: generates quality question (reasoningScore >= 3 indicates deeper thinking)
    if (assessment.reasoningScore >= 3) {
      level = Math.max(level, 4);
    }

    // Level 5: connects cross-domain (reasoningScore >= 3 + concept bridge detected)
    // Concept bridge is indicated by depthLevelEvidence >= 4
    if (assessment.reasoningScore >= 3 && assessment.depthLevelEvidence >= 4) {
      level = Math.max(level, 5);
    }

    // Update depth tracker
    this.depthTracker.currentDepth = Math.max(this.depthTracker.currentDepth, level);
    this.depthTracker.maxDepthReached = Math.max(this.depthTracker.maxDepthReached, level);

    return level;
  }

  /**
   * Assesses student question quality (1-5) from "What is X?" to "How does X connect to Y?"
   */
  async assessStudentQuestionQuality(question: string, concept: string): Promise<number> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are evaluating the quality of a student's question about "${concept}". Score from 1-5:
- 1: Basic recall question ("What is X?")
- 2: Simple application question ("How do I use X?")
- 3: Analysis question ("Why does X work?")
- 4: Synthesis question ("How does X relate to Y?")
- 5: Evaluation/connection question ("How does X connect to Y in different contexts?")

Respond with ONLY a single integer from 1-5, nothing else.`
          },
          {
            role: 'user',
            content: `Student question: "${question}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 10
      });

      const scoreText = response.choices[0]?.message?.content?.trim() || '1';
      const score = parseInt(scoreText, 10);
      return Math.max(1, Math.min(5, isNaN(score) ? 1 : score));
    } catch (error) {
      console.error('Error assessing question quality:', error);
      return 1;
    }
  }

  /**
   * Gets Socratic compliance metrics
   */
  getSocraticComplianceMetrics(): {
    directAnswerViolations: number;
    complianceScore: number;
    lastViolationTurn: number;
    examples: string[];
  } {
    const assistantMessages = this.conversation.filter(msg => msg.role === 'assistant');
    const violations: { turn: number; content: string }[] = [];
    
    assistantMessages.forEach((msg, index) => {
      if (this.containsDirectAnswer(msg.content)) {
        violations.push({
          turn: Math.floor(index / 2) + 1, // Approximate turn number
          content: msg.content
        });
      }
    });
    
    const totalMessages = assistantMessages.length;
    const violationCount = violations.length;
    const complianceScore = totalMessages > 0
      ? ((totalMessages - violationCount) / totalMessages) * 100
      : 100;
    
    const lastViolationTurn = violations.length > 0
      ? violations[violations.length - 1].turn
      : 0;
    
    const examples = violations.slice(0, 3).map(v => v.content);
    
    return {
      directAnswerViolations: violationCount,
      complianceScore,
      lastViolationTurn,
      examples
    };
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
}
