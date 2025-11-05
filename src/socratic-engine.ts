// Complete Socratic Engine - Standalone Implementation
// Replaces the existing socratic-engine.ts with all enhancements built-in

import OpenAI from 'openai';

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

  constructor(sessionManager?: any) {
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
    this.sessionManager = sessionManager;
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
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        ...this.conversation.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'system', content: `Use ${initialQuestionType} questioning approach. Keep response to 1-2 sentences maximum.` }
      ],
      temperature: 0.8,
      max_tokens: 80
    });

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

  async respondToStudent(studentInput: string): Promise<string> {
    const responseStartTime = Date.now();
    
    // Enhanced student response analysis
    const assessment = this.assessStudentResponse(studentInput);
    const nextQuestionType = this.selectNextQuestionType(assessment);
    
    this.conversation.push({ 
      role: 'user', 
      content: studentInput, 
      timestamp: new Date(),
      studentConfidence: assessment.confidenceLevel
    });
    
    // Update depth tracker and struggling turns
    this.updateDepthTracker(assessment, studentInput);
    this.updateStruggling(assessment);
    
    // Automatically adjust difficulty based on student assessment
    this.autoAdjustDifficulty(assessment);
    
    // Check if understanding check is needed
    const turnNumber = this.conversation.filter(msg => msg.role !== 'system').length / 2;
    const needsUnderstandingCheck = this.shouldPerformUnderstandingCheck(assessment, turnNumber);
    
    // If understanding check needed, use special question type and mark it
    let questionType = nextQuestionType;
    let isUnderstandingCheck = false;
    if (needsUnderstandingCheck) {
      questionType = this.selectUnderstandingCheckQuestionType(assessment);
      isUnderstandingCheck = true;
      this.lastUnderstandingCheckTurn = turnNumber;
      this.understandingCheckCount++;
    }
    
    // Build contextual guidance for AI
    const contextualGuidance = this.buildContextualGuidance(assessment, questionType, isUnderstandingCheck);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        ...this.conversation.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'system', content: contextualGuidance }
      ],
      temperature: 0.8,
      max_tokens: 80
    });

    const tutorResponse = response.choices[0]?.message?.content || 
      "That's interesting thinking! Can you tell me more about your reasoning?";
    
    // Create enhanced message with metadata
    const enhancedMessage: EnhancedMessage = {
      role: 'assistant',
      content: tutorResponse,
      timestamp: new Date(),
      questionType: questionType,
      depthLevel: this.depthTracker.currentDepth,
      studentConfidence: assessment.confidenceLevel,
      targetedConcepts: this.depthTracker.conceptualConnections.slice(-2),
      isUnderstandingCheck: isUnderstandingCheck
    };
    
    this.conversation.push(enhancedMessage);
    this.questionTypeSequence.push(questionType);
    
    // Track response time and update student profile
    const responseTime = Date.now() - responseStartTime;
    this.updateStudentProfile(questionType, assessment, responseTime);
    
    // Save session progress if we have a session manager
    if (this.sessionId && this.sessionManager) {
      await this.sessionManager.saveSessionProgress(this.sessionId, {
        conversation: this.conversation,
        currentProblem: this.problem,
        difficulty: this.currentDifficulty,
        strugglingTurns: this.strugglingTurns
      });
    }
    
    this.lastResponseTime = Date.now();
    return tutorResponse;
  }

  private buildEnhancedSystemPrompt(problem: string): string {
    const studentLevel = this.determineStudentLevel();
    const concepts = this.extractConcepts(problem);
    const learningObjective = this.generateLearningObjective(problem, concepts);

    let teachingStrategy = '';
    if (this.studentProfile) {
      teachingStrategy = `\n\nADAPTIVE TEACHING APPROACH:
- Student Level: ${studentLevel}
- Questioning Style: ${this.studentProfile.preferredQuestioningStyle}
- Difficulty Level: ${this.currentDifficulty}
- Cognitive Load: ${this.studentProfile.cognitiveLoadPreference}`;
    }

    return `You are a warm, rigorous Socratic tutor. 
Your goal is to help the student reason step by step, never by giving answers, 
but by asking short, thoughtful questions that reveal their reasoning.

Guidelines:
- Keep every message under 2 sentences.
- End every message with a question.
- Match your tone to the student’s confidence: gentle when unsure, challenging when confident.
- Use natural language instead of meta-language (e.g. “Why might that be true?” instead of “What assumption did you make?”).

Question styles:
• Clarification — "Can you explain what you mean by that?"
• Evidence — "What makes you think that works here?"
• Implications — "If that's true, what follows?"
• Comparison — "How is this similar or different from before?"
• Reflection — "Why do you think this step matters?"

Be concise, human, and curious. Stay focused on thinking, not correctness.


Problem: ${problem}
Key Concepts: ${concepts.join(', ')}
Learning Objective: ${learningObjective}${teachingStrategy}

Keep responses to 1-2 sentences maximum. End every response with a question.
Be warm and encouraging while maintaining rigorous Socratic questioning.`;
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
      /i don't know/i, /not sure/i, /confused/i, /don't understand/i
    ];
    
    const confidenceIndicators = [
      /i'm sure/i, /definitely/i, /certainly/i, /obviously/i
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
    } else if (/maybe|perhaps|might|could/i.test(response)) {
      confidenceLevel = 0.6;
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

  private buildContextualGuidance(assessment: SocraticAssessment, questionType: SocraticQuestionType, isUnderstandingCheck: boolean = false): string {
    let guidance = `Use ${questionType} questioning. `;
    
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
    
    guidance += "Ask one short, natural question that helps the student think next. Avoid meta phrasing or restating instructions.";
    if (assessment.confidenceLevel < 0.4) {
      guidance += "Use a supportive tone, like helping them rediscover a forgotten idea. ";
    } else if (assessment.confidenceLevel > 0.8) {
      guidance += "Challenge the student a bit more, asking them to justify their reasoning. ";
    }
    
    return guidance;
  }

  /**
   * Determine if an understanding check is needed
   */
  private shouldPerformUnderstandingCheck(assessment: SocraticAssessment, turnNumber: number): boolean {
    const turnsSinceLastCheck = turnNumber - this.lastUnderstandingCheckTurn;
    
    // Check every 3-4 interactions
    if (turnsSinceLastCheck >= 4) {
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

    return {
      questionTypesUsed: Object.keys(questionTypeCounts),
      questionTypeDistribution: questionTypeCounts,
      averageDepth: this.depthTracker.maxDepthReached,
      currentDepth: this.depthTracker.currentDepth,
      conceptsExplored: [...new Set(this.depthTracker.conceptualConnections)],
      confidenceProgression,
      engagementScore,
      totalInteractions: this.conversation.filter(msg => msg.role !== 'system').length,
      metacognitivePrompts: this.depthTracker.maxDepthReached >= 3 ? 2 : 0
    };
  }
}
