export declare enum ProblemType {
    ALGEBRA = "algebra",
    GEOMETRY = "geometry",
    CALCULUS = "calculus",
    ARITHMETIC = "arithmetic",
    TRIGONOMETRY = "trigonometry",
    STATISTICS = "statistics"
}
export declare enum DifficultyLevel {
    BEGINNER = "beginner",
    INTERMEDIATE = "intermediate",
    ADVANCED = "advanced"
}
export declare enum LearningStyle {
    VISUAL = "visual",
    ANALYTICAL = "analytical",
    EXPLORATORY = "exploratory"
}
export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp: Date;
}
export interface ConversationContext {
    problem: string;
    messages: Message[];
    sessionId: string;
    startTime: Date;
}
export type ProblemSource = 'bank' | 'custom_text' | 'image_upload';
export interface ClassificationResult {
    problemType: ProblemType;
    difficulty: DifficultyLevel;
    confidence: number;
    reasoning: string;
    suggestedApproach: string;
    estimatedTime: string;
    prerequisites: string[];
}
export interface EnhancedProblem {
    id: string;
    originalText: string;
    normalizedText: string;
    source: ProblemSource;
    classification: ClassificationResult;
    metadata: {
        createdAt: Date;
        processingTime?: number;
        imageMetadata?: {
            originalFileName: string;
            fileSize: number;
            ocrConfidence: number;
        };
    };
}
export interface ParsedProblem {
    content: string;
    originalText: string;
    normalizedText: string;
    problemType: ProblemType;
    difficulty: DifficultyLevel;
    mathConcepts: string[];
    isValid: boolean;
    errors?: string[];
    metadata: {
        wordCount: number;
        hasEquations: boolean;
        hasVariables: boolean;
        complexity: 'low' | 'medium' | 'high';
    };
}
export interface ImageProcessResult {
    extractedText: string;
    confidence: number;
    processingTime: number;
    success: boolean;
    error?: string;
}
export interface UploadedFile {
    originalName: string;
    path: string;
    size: number;
    mimeType: string;
    uploadedAt: Date;
}
export interface EnhancedSession {
    id: string;
    problemId: string;
    startTime: Date;
    endTime?: Date;
    interactions: SessionInteraction[];
    summary?: string;
    userSatisfaction?: number;
    problemSource: ProblemSource;
}
export interface SessionInteraction {
    id: string;
    sessionId: string;
    type: 'question' | 'answer' | 'hint' | 'validation';
    content: string;
    timestamp: Date;
}
export interface StudentProfile {
    id: string;
    studentId: string;
    name: string;
    createdAt: Date;
    lastActive: Date;
    totalSessions: number;
    currentLevel: number;
    learningStyle: LearningStyle;
    preferences: {
        sessionLength: number;
        difficultyPreference: 'adaptive' | 'fixed';
        feedbackLevel: 'minimal' | 'detailed';
        feedbackStyle: string;
    };
    performanceHistory: SessionPerformance[];
    knowledgeGaps: string[];
    engagementMetrics?: {
        averageResponseTime: number;
        totalInteractions: number;
        engagementScore: number;
    };
    analytics?: LearningAnalytics;
}
export interface LearningAnalytics {
    studentId: string;
    successRate: number;
    averageSessionTime: number;
    learningVelocity: number;
    knowledgeGaps: string[];
    strengths: string[];
    performanceTrends: PerformanceTrend[];
    lastUpdated: Date;
}
export interface PerformanceTrend {
    date: Date;
    successRate: number;
    averageTime: number;
    problemsSolved: number;
    difficultyLevel: number;
}
export interface SessionPerformance {
    sessionId: string;
    startTime: Date;
    endTime: Date;
    totalInteractions: number;
    problemsSolved: number;
    averageResponseTime: number;
    responseTime?: number;
    mistakesMade?: number;
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
export interface AdaptiveDifficulty {
    currentLevel: DifficultyLevel;
    recommendedLevel: DifficultyLevel;
    adjustmentReason: string;
    confidence: number;
}
export interface LearningPattern {
    preferredProblemTypes: string[];
    optimalSessionLength: number;
    bestPerformanceTime: string;
    learningStyle: LearningStyle;
    responsePatterns: ResponsePattern[];
}
export interface ResponsePattern {
    concept: string;
    averageTime: number;
    successRate: number;
    commonMistakes: string[];
    improvementTrend: 'improving' | 'stable' | 'declining';
}
export interface SessionState {
    sessionId: string;
    problemId: string;
    conversationHistory: Message[];
    currentContext: string;
    studentUnderstanding: number;
    hintsUsed: number;
    timeElapsed: number;
    lastActivity: Date;
    canResume: boolean;
    status: 'active' | 'completed' | 'interrupted';
    startTime: Date;
    endTime?: Date;
    duration: number;
    learningGoals: LearningGoal[];
    problemContext: {
        currentStep: number;
        conceptsIntroduced: string[];
        difficultyAdjustments: number[];
    };
    continuityData: ContinuityData;
    performance: SessionPerformance;
    adaptiveData: any;
    currentStep: number;
    totalSteps: number;
    problemData: any;
    metadata?: any;
}
export interface LearningGoal {
    id: string;
    goalId: string;
    studentId: string;
    description: string;
    category: string;
    targetLevel: number;
    currentLevel: number;
    targetDate: Date;
    achieved: boolean;
    achievedDate?: Date;
    type: string;
    targetValue: number;
    priority: string;
    currentValue: number;
}
export interface LearningObjective {
    id: string;
    domain: string;
    description: string;
    targetLevel: DifficultyLevel;
    currentLevel: DifficultyLevel;
    prerequisites: string[];
    estimatedTime: number;
    priority: 'low' | 'medium' | 'high';
}
export interface LearningPath {
    id: string;
    title: string;
    description: string;
    phases: any[];
    totalDuration: number;
    difficulty: DifficultyLevel;
    prerequisites: string[];
}
export interface SkillAssessment {
    studentId: string;
    assessmentDate: Date;
    skillLevels: {
        [skill: string]: number;
    };
    strengths: string[];
    weaknesses: string[];
    overallLevel: number;
    recommendations: string[];
}
export interface StudySession {
    id: string;
    planId: string;
    title: string;
    description: string;
    topics: string[];
    difficulty: DifficultyLevel;
    estimatedDuration: number;
    status: 'planned' | 'in_progress' | 'completed' | 'skipped';
    scheduledDate?: Date;
    completedDate?: Date;
    resources: string[];
    objectives: string[];
}
export interface StudyRecommendation {
    type: 'knowledge_gap' | 'strength_building' | 'acceleration' | 'reinforcement' | 'difficulty_adjustment';
    priority: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    estimatedTime: number;
    difficulty: DifficultyLevel;
    resources: string[];
    reasoning: string;
}
export interface ProgressTracker {
    planId: string;
    totalSessions: number;
    completedSessions: number;
    timeSpent: number;
    lastActivity: Date;
    overallProgress: number;
    milestoneProgress: {
        [milestoneId: string]: number;
    };
}
export interface StudyPlanConfig {
    focusAreas?: string[];
    targetLevel?: DifficultyLevel;
    duration: number;
    sessionsPerWeek?: number;
    sessionLength?: number;
    startDate?: Date;
    goals?: string[];
    preferences?: {
        learningStyle?: LearningStyle;
        difficultyProgression?: 'gradual' | 'adaptive' | 'aggressive';
        includeReview?: boolean;
    };
}
export interface Milestone {
    milestoneId: string;
    planId: string;
    description: string;
    targetDate: Date;
    achieved: boolean;
    achievedDate?: Date;
    requiredConcepts: string[];
}
export interface StudyPlan {
    planId: string;
    studentId: string;
    title: string;
    goals: LearningGoal[];
    createdAt: Date;
    targetDate: Date;
    active: boolean;
    progress: number;
    milestones: Milestone[];
    recommendedProblems: string[];
    estimatedDuration: number;
    adaptiveAdjustments: boolean;
}
export interface StudentProfileDB {
    studentId: string;
    profile: StudentProfile;
    analytics: LearningAnalytics;
}
export interface SessionHistoryDB {
    sessions: {
        [sessionId: string]: {
            studentId: string;
            problemId: string;
            startTime: Date;
            endTime?: Date;
            duration: number;
            completed: boolean;
            resumed: boolean;
            summary: string;
            performance: SessionPerformance;
            conversationHistory: Message[];
            classification?: ClassificationResult;
            problemSource: ProblemSource;
            status: 'active' | 'completed' | 'interrupted';
            currentStep: number;
            totalSteps: number;
            lastActivity: Date;
        };
    };
}
export interface StudyPlanDB {
    plans: {
        [planId: string]: StudyPlan;
    };
}
export interface SessionStateDB {
    states: {
        [sessionId: string]: SessionState;
    };
}
export interface AnalyticsReport {
    studentId: string;
    reportDate: Date;
    timeRange: {
        start: Date;
        end: Date;
    };
    summary: {
        totalSessions: number;
        totalTime: number;
        averageSessionTime: number;
        problemsSolved: number;
        successRate: number;
        improvementRate: number;
    };
    breakdown: {
        byProblemType: {
            [type: string]: number;
        };
        byDifficulty: {
            [level: string]: number;
        };
        byTimeOfDay: {
            [hour: string]: number;
        };
    };
    recommendations: string[];
    achievements: string[];
}
export interface VisualizationData {
    type: 'bar' | 'line' | 'progress' | 'pie';
    title: string;
    data: {
        label: string;
        value: number;
    }[];
    maxValue?: number;
    unit?: string;
}
export interface Day2Config {
    openai: {
        apiKey: string;
        model: string;
        maxTokens: number;
    };
    vision: {
        model: 'gpt-4-vision-preview';
        maxTokens: 300;
        imageFormats: ['png', 'jpg', 'jpeg', 'gif'];
        maxFileSize: 10485760;
    };
    problemProcessing: {
        textParsingTimeout: 5000;
        imageProcessingTimeout: 30000;
        maxProblemLength: 2000;
        supportedMathNotation: ['latex', 'ascii', 'unicode'];
    };
    classification: {
        confidenceThreshold: 0.7;
        maxConcepts: 5;
        difficultyLevels: ['beginner', 'intermediate', 'advanced'];
    };
}
export interface Day3Config extends Day2Config {
    analytics: {
        dataRetentionDays: number;
        performanceCalculationWindow: number;
        trendAnalysisMinSessions: number;
        adaptiveLearningEnabled: boolean;
    };
    storage: {
        dataDirectory: string;
        encryptionEnabled: boolean;
        backupEnabled: boolean;
        maxFileSize: number;
    };
    adaptive: {
        difficultyAdjustmentThreshold: number;
        learningVelocityWindow: number;
        personalizedRecommendations: boolean;
        sessionContinuityEnabled: boolean;
    };
}
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
}
export interface MenuOption {
    id: number;
    label: string;
    description: string;
    handler: () => Promise<void>;
}
export interface AdaptiveRecommendation {
    type: 'difficulty' | 'pacing' | 'content' | 'strategy';
    priority: 'low' | 'medium' | 'high';
    message: string;
    action: string;
    reasoning: string;
}
export interface TeachingStrategy {
    primaryApproach: string;
    questioningStyle: string;
    feedbackStyle: string;
    pacing: string;
    focusAreas: string[];
    adaptations: string[];
}
export interface SessionMetadata {
    sessionId: string;
    problemId: string;
    startTime: Date;
    lastActivity: Date;
    canResume: boolean;
    estimatedRemainingTime: number;
    progressPercentage: number;
    status: 'active' | 'completed' | 'interrupted';
}
export interface SessionResumption {
    sessionId: string;
    resumptionPoint: string;
    contextSummary: string;
    suggestedActions: string[];
    continuityNotes: string[];
    canResume: boolean;
    timeSinceLastActivity?: number;
    needsContextRefresh?: boolean;
    lastProgress?: any;
}
export interface SessionSummary {
    sessionId: string;
    startTime: Date;
    endTime?: Date;
    completedAt: Date;
    duration: number;
    totalDuration: number;
    problemsSolved: number;
    performance?: SessionPerformance;
    finalPerformance: SessionPerformance;
    goalsAchieved?: LearningGoal[];
    adaptiveAdjustments?: number;
    continuityScore?: number;
    learningOutcomes: string[];
    keyInsights: string[];
    recommendations: string[];
}
export interface InterruptionPoint {
    timestamp: Date;
    reason: string;
    context: any;
    resumptionHints: string[];
    step?: number;
    criticalState?: any;
}
export interface ContinuityData {
    interruptionPoints: InterruptionPoint[];
    progressMarkers: any[];
    keyInsights: string[];
    contextualNotes: string[];
}
//# sourceMappingURL=types.d.ts.map