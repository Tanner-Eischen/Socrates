// Day 3: Session Manager for Multi-Session Continuity and State Preservation
import { 
  SessionState,
  SessionMetadata,
  ConversationContext,
  SessionPerformance,
  StudentProfile,
  LearningGoal,
  SessionResumption,
  SessionSummary,
  InterruptionPoint,
  ContinuityData
} from './types';
import { dataStorage } from './data-storage';
import { analyticsEngine } from './analytics-engine';
import { AdaptiveController } from './adaptive-controller';

export class SessionManager {
  private static instance: SessionManager;
  private activeSessions: Map<string, SessionState> = new Map();
  private readonly MAX_ACTIVE_SESSIONS = 5;
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  private adaptiveController: AdaptiveController;

  private constructor() {
    this.adaptiveController = new AdaptiveController();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // Create a new session with full context
  async createSession(
    problemData: any,
    studentProfile?: StudentProfile,
    parentSessionId?: string
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    
    // Load or create student profile
    let profile = studentProfile;
    if (!profile) {
      const savedProfile = await dataStorage.loadStudentProfile();
      profile = savedProfile?.profile || this.createDefaultProfile();
    }

    // Create session state
    const sessionState: SessionState = {
      sessionId,
      problemId: problemData.id || sessionId,
      currentContext: '',
      studentUnderstanding: 0,
      hintsUsed: 0,
      timeElapsed: 0,
      canResume: true,
      duration: 0,
      startTime: now,
      lastActivity: now,
      status: 'active',
      problemData,
      conversationHistory: [],
      currentStep: 0,
      totalSteps: this.estimateSteps(problemData),
      problemContext: {
        currentStep: 0,
        conceptsIntroduced: [],
        difficultyAdjustments: []
      },
      performance: {
        sessionId,
        startTime: now,
        endTime: now,
        totalInteractions: 0,
        problemsSolved: 0,
        averageResponseTime: 0,
        responseTime: 0,
        mistakesMade: 0,
        strugglingTurns: 0,
        difficultyLevel: problemData.difficulty || 'intermediate' as any,
        engagementScore: 0,
        completionRate: 0,
        conceptsExplored: [],
        masteryScore: 0,
        conceptsLearned: [],
        hintsUsed: 0,
        struggledConcepts: []
      },
      learningGoals: await this.generateSessionGoals(problemData, profile),
      adaptiveData: {
        difficultyAdjustments: [],
        teachingStrategies: [],
        personalizations: []
      },
      continuityData: {
        keyInsights: [],
        progressMarkers: [],
        contextualNotes: [],
        interruptionPoints: []
      },
      metadata: {
        sessionType: problemData.source || 'standard',
        difficulty: problemData.difficulty || 1,
        estimatedDuration: this.estimateDuration(problemData),
        tags: this.extractTags(problemData),
        parentSessionId
      }
    };

    // Store session
    this.activeSessions.set(sessionId, sessionState);
    await dataStorage.saveSessionState(sessionId, sessionState);

    // Update analytics
    await this.updateSessionAnalytics(sessionId, 'created');

    return sessionId;
  }

  // Resume an interrupted session
  async resumeSession(sessionId: string): Promise<SessionResumption> {
    // Try to load from active sessions first
    let sessionState = this.activeSessions.get(sessionId);
    
    // If not active, load from storage
    if (!sessionState) {
      const loadedState = await dataStorage.loadSessionState(sessionId);
      sessionState = loadedState || undefined;
      if (!sessionState) {
        throw new Error(`Session ${sessionId} not found`);
      }
    }

    // Check if session is resumable
    if (sessionState.status === 'completed') {
      throw new Error('Cannot resume completed session');
    }

    // Calculate time since last activity
    const timeSinceLastActivity = Date.now() - sessionState.lastActivity.getTime();
    const needsContextRefresh = timeSinceLastActivity > this.SESSION_TIMEOUT_MS;

    // Prepare resumption data
    const resumptionData: SessionResumption = {
      sessionId,
      resumptionPoint: `Step ${sessionState.currentStep} of ${sessionState.totalSteps}`,
      canResume: true,
      timeSinceLastActivity,
      needsContextRefresh,
      lastProgress: {
        currentStep: sessionState.currentStep,
        totalSteps: sessionState.totalSteps,
        completionPercentage: (sessionState.currentStep / sessionState.totalSteps) * 100
      },
      contextSummary: this.generateContextSummary(sessionState),
      suggestedActions: await this.generateResumptionSuggestions(sessionState),
      continuityNotes: sessionState.continuityData.contextualNotes
    };

    // Reactivate session
    sessionState.status = 'active';
    sessionState.lastActivity = new Date();
    this.activeSessions.set(sessionId, sessionState);

    // Log resumption
    await this.logSessionEvent(sessionId, 'resumed', {
      timeSinceLastActivity,
      needsContextRefresh
    });

    return resumptionData;
  }

  // Save session progress and context
  async saveSessionProgress(
    sessionId: string,
    conversationUpdate: any,
    performanceUpdate?: Partial<SessionPerformance>
  ): Promise<void> {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState) {
      throw new Error(`Active session ${sessionId} not found`);
    }

    // Update conversation history
    if (conversationUpdate) {
      sessionState.conversationHistory.push({
        timestamp: new Date(),
        ...conversationUpdate
      });
    }

    // Update performance metrics
    if (performanceUpdate) {
      Object.assign(sessionState.performance, performanceUpdate);
    }

    // Update progress tracking
    sessionState.currentStep = Math.max(sessionState.currentStep, 
      sessionState.conversationHistory.length);
    sessionState.lastActivity = new Date();

    // Create progress marker
    const progressMarker = {
      step: sessionState.currentStep,
      timestamp: new Date(),
      context: this.captureCurrentContext(sessionState),
      keyInsights: this.extractKeyInsights(conversationUpdate)
    };
    sessionState.continuityData.progressMarkers.push(progressMarker);

    // Save to storage
    await dataStorage.saveSessionState(sessionId, sessionState);

    // Update adaptive parameters
    await this.adaptiveController.updateAdaptiveParameters(sessionId, {
      responseTime: performanceUpdate?.responseTime,
      strugglingIndicators: performanceUpdate?.struggledConcepts
    });
  }

  // Handle session interruption gracefully
  async handleSessionInterruption(
    sessionId: string,
    interruptionReason: string,
    currentContext: any
  ): Promise<InterruptionPoint> {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState) {
      throw new Error(`Active session ${sessionId} not found`);
    }

    // Create interruption point
    const interruptionPoint: InterruptionPoint = {
      timestamp: new Date(),
      step: sessionState.currentStep,
      reason: interruptionReason,
      context: currentContext,
      resumptionHints: this.generateResumptionHints(sessionState, currentContext),
      criticalState: this.captureCriticalState(sessionState)
    };

    // Add to session continuity data
    sessionState.continuityData.interruptionPoints.push(interruptionPoint);
    sessionState.status = 'interrupted';
    sessionState.lastActivity = new Date();

    // Save state
    await dataStorage.saveSessionState(sessionId, sessionState);

    // Log interruption
    await this.logSessionEvent(sessionId, 'interrupted', {
      reason: interruptionReason,
      step: sessionState.currentStep
    });

    return interruptionPoint;
  }

  // Complete a session with comprehensive summary
  async completeSession(
    sessionId: string,
    finalPerformance: SessionPerformance,
    learningOutcomes: string[]
  ): Promise<SessionSummary> {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState) {
      throw new Error(`Active session ${sessionId} not found`);
    }

    // Update final performance
    sessionState.performance = { ...sessionState.performance, ...finalPerformance };
    sessionState.status = 'completed';
    sessionState.endTime = new Date();
    sessionState.duration = sessionState.endTime.getTime() - sessionState.startTime.getTime();

    // Generate comprehensive summary
    const summary: SessionSummary = {
      sessionId,
      startTime: sessionState.startTime,
      endTime: sessionState.endTime,
      completedAt: new Date(),
      duration: sessionState.duration,
      totalDuration: sessionState.duration,
      problemsSolved: sessionState.performance.problemsSolved,
      performance: sessionState.performance,
      finalPerformance: sessionState.performance,
      learningOutcomes,
      goalsAchieved: this.assessGoalAchievement(sessionState.learningGoals, finalPerformance),
      keyInsights: sessionState.continuityData.keyInsights,
      adaptiveAdjustments: sessionState.adaptiveData.difficultyAdjustments.length,
      continuityScore: this.calculateContinuityScore(sessionState),
      recommendations: await this.generatePostSessionRecommendations(sessionState)
    };

    // Save final state
    await dataStorage.saveSessionState(sessionId, sessionState);

    // Update session history
    await this.updateSessionHistory(sessionState);

    // Update analytics
    await analyticsEngine.updateStudentAnalytics(sessionState);

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    // Log completion
    await this.logSessionEvent(sessionId, 'completed', {
      duration: sessionState.duration,
      performance: finalPerformance
    });

    return summary;
  }

  // Get all resumable sessions for a student
  async getResumableSessions(): Promise<SessionMetadata[]> {
    const sessionHistory = await dataStorage.loadSessionHistory();
    const resumableSessions: SessionMetadata[] = [];

    for (const [sessionId, session] of Object.entries(sessionHistory.sessions) as [string, any][]) {
      if (session.status === 'interrupted' || session.status === 'active') {
        const timeSinceLastActivity = Date.now() - new Date(session.lastActivity).getTime();
        
        // Only include sessions from the last 7 days
        if (timeSinceLastActivity < 7 * 24 * 60 * 60 * 1000) {
          resumableSessions.push({
            sessionId,
            problemId: session.problemId,
            startTime: new Date(session.startTime),
            lastActivity: new Date(session.startTime), // Use startTime as fallback
            canResume: true,
            estimatedRemainingTime: this.estimateRemainingTime(session),
            progressPercentage: (session.currentStep / session.totalSteps) * 100,
            status: session.status
          });
        }
      }
    }

    return resumableSessions.sort((a, b) => 
      b.lastActivity.getTime() - a.lastActivity.getTime()
    );
  }

  // Generate session analytics for dashboard
  async generateSessionAnalytics(timeRange: number = 30): Promise<any> {
    const sessionHistory = await dataStorage.loadSessionHistory();
    const cutoffDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
    
    const recentSessions = Object.values(sessionHistory.sessions)
      .filter((s: any) => new Date(s.startTime) >= cutoffDate);

    return {
      totalSessions: recentSessions.length,
      completedSessions: recentSessions.filter((s: any) => s.status === 'completed').length,
      interruptedSessions: recentSessions.filter((s: any) => s.status === 'interrupted').length,
      averageDuration: this.calculateAverageDuration(recentSessions),
      averageContinuityScore: this.calculateAverageContinuityScore(recentSessions),
      mostCommonInterruptions: this.analyzeMostCommonInterruptions(recentSessions),
      sessionPatterns: this.analyzeSessionPatterns(recentSessions)
    };
  }

  // Private helper methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createDefaultProfile(): StudentProfile {
    return {
      id: 'default',
      studentId: 'default',
      name: 'Student',
      createdAt: new Date(),
      lastActive: new Date(),
      totalSessions: 0,
      currentLevel: 1,
      learningStyle: 'visual' as any,
      preferences: {
        sessionLength: 30,
        difficultyPreference: 'adaptive',
        feedbackLevel: 'detailed',
        feedbackStyle: 'encouraging'
      },
      performanceHistory: [],
      knowledgeGaps: []
    };
  }

  private estimateSteps(problemData: any): number {
    // Estimate based on problem complexity
    const baseSteps = 5;
    const difficultyMultiplier = (problemData.difficulty || 1) * 1.5;
    const typeMultiplier = this.getTypeMultiplier(problemData.type);
    
    return Math.ceil(baseSteps * difficultyMultiplier * typeMultiplier);
  }

  private estimateDuration(problemData: any): number {
    // Estimate in minutes
    const baseDuration = 15;
    const difficultyMultiplier = (problemData.difficulty || 1) * 1.3;
    const typeMultiplier = this.getTypeMultiplier(problemData.type);
    
    return Math.ceil(baseDuration * difficultyMultiplier * typeMultiplier);
  }

  private getTypeMultiplier(type: string): number {
    const multipliers: { [key: string]: number } = {
      'word_problem': 1.5,
      'multi_step': 1.8,
      'proof': 2.0,
      'algebra': 1.2,
      'geometry': 1.3,
      'calculus': 1.6
    };
    return multipliers[type] || 1.0;
  }

  private extractTags(problemData: any): string[] {
    const tags: string[] = [];
    
    if (problemData.type) tags.push(problemData.type);
    if (problemData.difficulty) tags.push(`difficulty_${problemData.difficulty}`);
    if (problemData.source) tags.push(`source_${problemData.source}`);
    if (problemData.concepts) tags.push(...problemData.concepts);
    
    return tags;
  }

  private async generateSessionGoals(problemData: any, profile: StudentProfile): Promise<LearningGoal[]> {
    const goals: LearningGoal[] = [];
    
    // Primary goal: solve the problem
    goals.push({
      id: 'solve_problem',
      goalId: 'solve_problem',
      studentId: profile.studentId,
      description: `Solve the ${problemData.type || 'math'} problem successfully`,
      category: 'problem_solving',
      targetLevel: 1,
      currentLevel: 0,
      targetDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      type: 'problem_solving',
      priority: 'high',
      targetValue: 1,
      currentValue: 0,
      achieved: false
    });

    // Secondary goal: understand concepts
    if (problemData.concepts && problemData.concepts.length > 0) {
      goals.push({
        id: 'understand_concepts',
        goalId: 'understand_concepts',
        studentId: profile.studentId,
        description: `Understand key concepts: ${problemData.concepts.join(', ')}`,
        category: 'conceptual_understanding',
        targetLevel: problemData.concepts.length,
        currentLevel: 0,
        targetDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        type: 'conceptual_understanding',
        priority: 'medium',
        targetValue: problemData.concepts.length,
        currentValue: 0,
        achieved: false
      });
    }

    // Adaptive goal based on profile
    if (profile.analytics?.knowledgeGaps && profile.analytics.knowledgeGaps.length > 0) {
      const relevantGap = profile.analytics.knowledgeGaps.find((gap: string) => 
        problemData.concepts?.includes(gap)
      );
      if (relevantGap) {
        goals.push({
          id: 'address_gap',
          goalId: 'address_gap',
          studentId: profile.studentId,
          description: `Address knowledge gap: ${relevantGap}`,
          category: 'knowledge_gap',
          targetLevel: 1,
          currentLevel: 0,
          targetDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          type: 'knowledge_gap',
          priority: 'high',
          targetValue: 1,
          currentValue: 0,
          achieved: false
        });
      }
    }

    return goals;
  }

  private generateContextSummary(sessionState: SessionState): string {
    const progress = (sessionState.currentStep / sessionState.totalSteps) * 100;
    const lastMessages = sessionState.conversationHistory.slice(-3);
    
    let summary = `You were ${progress.toFixed(0)}% through solving a ${sessionState.problemData.type || 'math'} problem. `;
    
    if (lastMessages.length > 0) {
      summary += `Last discussion: ${lastMessages[lastMessages.length - 1].content?.substring(0, 100)}...`;
    }
    
    return summary;
  }

  private async generateResumptionSuggestions(sessionState: SessionState): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Based on progress
    if (sessionState.currentStep < sessionState.totalSteps * 0.3) {
      suggestions.push('Review the problem statement and your initial approach');
    } else if (sessionState.currentStep < sessionState.totalSteps * 0.7) {
      suggestions.push('Continue with your current solution strategy');
    } else {
      suggestions.push('Focus on completing and verifying your solution');
    }

    // Based on performance
    if (sessionState.performance.hintsUsed > 2) {
      suggestions.push('Take time to understand the concepts before proceeding');
    }

    // Based on time since last activity
    const timeSinceLastActivity = Date.now() - sessionState.lastActivity.getTime();
    if (timeSinceLastActivity > 60 * 60 * 1000) { // 1 hour
      suggestions.push('Refresh your memory by reviewing what you\'ve learned so far');
    }

    return suggestions;
  }

  private captureCurrentContext(sessionState: SessionState): any {
    return {
      currentStep: sessionState.currentStep,
      recentMessages: sessionState.conversationHistory.slice(-5),
      currentConcepts: sessionState.performance.conceptsLearned,
      strugglingAreas: sessionState.performance.struggledConcepts,
      adaptiveState: sessionState.adaptiveData
    };
  }

  private extractKeyInsights(conversationUpdate: any): string[] {
    const insights: string[] = [];
    
    // Simple keyword-based insight extraction
    if (conversationUpdate.content) {
      const content = conversationUpdate.content.toLowerCase();
      
      if (content.includes('understand') || content.includes('got it')) {
        insights.push('Student showed understanding');
      }
      if (content.includes('confused') || content.includes('don\'t get')) {
        insights.push('Student expressed confusion');
      }
      if (content.includes('mistake') || content.includes('error')) {
        insights.push('Student recognized an error');
      }
    }
    
    return insights;
  }

  private generateResumptionHints(sessionState: SessionState, currentContext: any): string[] {
    const hints: string[] = [];
    
    // Context-specific hints
    if (currentContext.strugglingWith) {
      hints.push(`You were working on: ${currentContext.strugglingWith}`);
    }
    
    // Progress-based hints
    const progress = (sessionState.currentStep / sessionState.totalSteps) * 100;
    if (progress < 50) {
      hints.push('Focus on understanding the problem setup');
    } else {
      hints.push('Continue with your solution approach');
    }
    
    return hints;
  }

  private captureCriticalState(sessionState: SessionState): any {
    return {
      problemData: sessionState.problemData,
      currentStep: sessionState.currentStep,
      performance: sessionState.performance,
      lastFewMessages: sessionState.conversationHistory.slice(-3),
      adaptiveSettings: sessionState.adaptiveData
    };
  }

  private assessGoalAchievement(goals: LearningGoal[], performance: SessionPerformance): LearningGoal[] {
    return goals.map(goal => {
      let achieved = false;
      
      switch (goal.type) {
        case 'problem_solving':
          achieved = performance.masteryScore >= 0.7;
          break;
        case 'conceptual_understanding':
          achieved = performance.conceptsLearned.length >= goal.targetValue;
          break;
        case 'knowledge_gap':
          achieved = performance.masteryScore >= 0.6;
          break;
      }
      
      return { ...goal, achieved: achieved };
    });
  }

  private calculateContinuityScore(sessionState: SessionState): number {
    let score = 1.0;
    
    // Penalize for interruptions
    score -= sessionState.continuityData.interruptionPoints.length * 0.1;
    
    // Reward for progress markers
    score += sessionState.continuityData.progressMarkers.length * 0.05;
    
    // Reward for key insights
    score += sessionState.continuityData.keyInsights.length * 0.03;
    
    return Math.max(0, Math.min(1, score));
  }

  private async generatePostSessionRecommendations(sessionState: SessionState): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Understanding-based recommendations
    if (sessionState.studentUnderstanding >= 0.8) {
      recommendations.push('Excellent work! Consider trying more challenging problems');
    } else if (sessionState.studentUnderstanding < 0.5) {
      recommendations.push('Review the concepts covered in this session');
    }
    
    // Hints-based recommendations
    if (sessionState.hintsUsed > 3) {
      recommendations.push('Try to work through problems with fewer hints for better learning');
    }
    
    return recommendations;
  }

  private async updateSessionHistory(sessionState: SessionState): Promise<void> {
    const sessionHistory = await dataStorage.loadSessionHistory();
    
    // Convert SessionState to SessionHistoryDB entry format
    const historyEntry = {
      studentId: 'default', // Would need to be passed in or stored in SessionState
      problemId: sessionState.problemId,
      startTime: new Date(Date.now() - sessionState.timeElapsed),
      endTime: new Date(),
      duration: sessionState.timeElapsed,
      completed: true,
      resumed: false,
      summary: `Session completed with ${sessionState.hintsUsed} hints used`,
      performance: {
        sessionId: sessionState.sessionId,
        startTime: new Date(Date.now() - sessionState.timeElapsed),
        endTime: new Date(),
        totalInteractions: sessionState.conversationHistory.length,
        problemsSolved: 1,
        averageResponseTime: sessionState.timeElapsed / Math.max(sessionState.conversationHistory.length, 1),
        strugglingTurns: sessionState.hintsUsed,
        difficultyLevel: 'intermediate' as any,
        engagementScore: sessionState.studentUnderstanding,
        completionRate: sessionState.studentUnderstanding,
        conceptsExplored: sessionState.problemContext.conceptsIntroduced,
        masteryScore: sessionState.studentUnderstanding,
        conceptsLearned: sessionState.problemContext.conceptsIntroduced,
        hintsUsed: sessionState.hintsUsed,
        struggledConcepts: []
      },
      conversationHistory: sessionState.conversationHistory,
      problemSource: 'custom_text' as any,
      status: sessionState.status,
      currentStep: sessionState.currentStep,
      totalSteps: sessionState.totalSteps,
      lastActivity: sessionState.lastActivity
    };
    
    sessionHistory.sessions[sessionState.sessionId] = historyEntry;
    await dataStorage.saveSessionHistory(sessionHistory);
  }

  private async updateSessionAnalytics(sessionId: string, event: string): Promise<void> {
    // Update analytics based on session events
    // This could trigger analytics recalculation
  }

  private async logSessionEvent(sessionId: string, event: string, data?: any): Promise<void> {
    // Log session events for debugging and analytics
    console.log(`Session ${sessionId}: ${event}`, data);
  }

  private estimateRemainingTime(session: any): number {
    const totalEstimated = session.metadata?.estimatedDuration || 30;
    const progress = (session.currentStep / session.totalSteps);
    return Math.ceil(totalEstimated * (1 - progress));
  }

  private calculateAverageDuration(sessions: any[]): number {
    const completedSessions = sessions.filter(s => s.status === 'completed' && s.duration);
    if (completedSessions.length === 0) return 0;
    
    const totalDuration = completedSessions.reduce((sum, s) => sum + s.duration, 0);
    return totalDuration / completedSessions.length / 60000; // Convert to minutes
  }

  private calculateAverageContinuityScore(sessions: any[]): number {
    const scores = sessions
      .filter(s => s.continuityData)
      .map(s => this.calculateContinuityScore(s));
    
    if (scores.length === 0) return 0;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private analyzeMostCommonInterruptions(sessions: any[]): string[] {
    const interruptions = new Map<string, number>();
    
    sessions.forEach(session => {
      if (session.continuityData?.interruptionPoints) {
        session.continuityData.interruptionPoints.forEach((point: any) => {
          const reason = point.reason || 'unknown';
          interruptions.set(reason, (interruptions.get(reason) || 0) + 1);
        });
      }
    });
    
    return Array.from(interruptions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, _]) => reason);
  }

  private analyzeSessionPatterns(sessions: any[]): any {
    // Analyze patterns in session timing, duration, etc.
    const hourCounts = new Map<number, number>();
    
    sessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });
    
    const mostActiveHour = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    return {
      mostActiveHour: mostActiveHour ? mostActiveHour[0] : null,
      averageSessionsPerDay: sessions.length / 30, // Assuming 30-day range
      sessionLengthTrend: this.calculateSessionLengthTrend(sessions)
    };
  }

  private calculateSessionLengthTrend(sessions: any[]): string {
    const completedSessions = sessions
      .filter(s => s.status === 'completed' && s.duration)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    if (completedSessions.length < 3) return 'insufficient_data';
    
    const recent = completedSessions.slice(-5);
    const earlier = completedSessions.slice(0, 5);
    
    const recentAvg = recent.reduce((sum, s) => sum + s.duration, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, s) => sum + s.duration, 0) / earlier.length;
    
    const change = (recentAvg - earlierAvg) / earlierAvg;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();