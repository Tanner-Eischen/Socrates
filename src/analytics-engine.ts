// Day 3: Analytics Engine for Performance Tracking and Learning Pattern Recognition
import { 
  StudentProfile,
  LearningAnalytics,
  SessionPerformance,
  PerformanceTrend,
  LearningPattern,
  ResponsePattern,
  AnalyticsReport,
  VisualizationData,
  LearningStyle,
  SessionHistoryDB,
  StudentProfileDB
} from './types';
import { dataStorage } from './data-storage';

export class AnalyticsEngine {
  private static instance: AnalyticsEngine;

  static getInstance(): AnalyticsEngine {
    if (!AnalyticsEngine.instance) {
      AnalyticsEngine.instance = new AnalyticsEngine();
    }
    return AnalyticsEngine.instance;
  }

  // Calculate comprehensive success rate across all sessions
  calculateSuccessRate(sessions: any[]): number {
    if (sessions.length === 0) return 0;
    
    const completedSessions = sessions.filter(s => s.completed);
    if (completedSessions.length === 0) return 0;
    
    const totalMastery = completedSessions.reduce((sum, session) => 
      sum + (session.performance?.masteryScore || 0), 0);
    
    return totalMastery / completedSessions.length;
  }

  // Calculate learning velocity (improvement rate over time)
  calculateLearningVelocity(sessions: any[]): number {
    if (sessions.length < 2) return 0;
    
    // Sort sessions by date
    const sortedSessions = sessions
      .filter(s => s.completed && s.performance?.masteryScore !== undefined)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    if (sortedSessions.length < 2) return 0;
    
    // Calculate improvement over the last 10 sessions vs previous 10
    const recentSessions = sortedSessions.slice(-10);
    const previousSessions = sortedSessions.slice(-20, -10);
    
    if (previousSessions.length === 0) {
      // If no previous sessions, calculate improvement from first to recent
      const firstSession = sortedSessions[0];
      const recentAvg = this.averageMasteryScore(recentSessions);
      return (recentAvg - firstSession.performance.masteryScore) / sortedSessions.length;
    }
    
    const recentAvg = this.averageMasteryScore(recentSessions);
    const previousAvg = this.averageMasteryScore(previousSessions);
    
    return (recentAvg - previousAvg) / Math.max(previousSessions.length, 1);
  }

  // Identify knowledge gaps based on performance patterns
  identifyKnowledgeGaps(sessions: any[]): string[] {
    const conceptPerformance = new Map<string, number[]>();
    
    sessions.forEach(session => {
      if (session.performance?.conceptsLearned) {
        session.performance.conceptsLearned.forEach((concept: string) => {
          if (!conceptPerformance.has(concept)) {
            conceptPerformance.set(concept, []);
          }
          conceptPerformance.get(concept)!.push(session.performance.masteryScore || 0);
        });
      }
      
      // Also track struggled concepts
      if (session.performance?.struggledConcepts) {
        session.performance.struggledConcepts.forEach((concept: string) => {
          if (!conceptPerformance.has(concept)) {
            conceptPerformance.set(concept, []);
          }
          conceptPerformance.get(concept)!.push(Math.max(0, (session.performance.masteryScore || 0) - 0.3));
        });
      }
    });

    // Identify concepts with consistently low performance
    return Array.from(conceptPerformance.entries())
      .filter(([_, scores]) => this.average(scores) < 0.6)
      .map(([concept, _]) => concept)
      .slice(0, 5); // Limit to top 5 knowledge gaps
  }

  // Identify student strengths
  identifyStrengths(sessions: any[]): string[] {
    const conceptPerformance = new Map<string, number[]>();
    
    sessions.forEach(session => {
      if (session.performance?.conceptsLearned) {
        session.performance.conceptsLearned.forEach((concept: string) => {
          if (!conceptPerformance.has(concept)) {
            conceptPerformance.set(concept, []);
          }
          conceptPerformance.get(concept)!.push(session.performance.masteryScore || 0);
        });
      }
    });

    // Identify concepts with consistently high performance
    return Array.from(conceptPerformance.entries())
      .filter(([_, scores]) => scores.length >= 2 && this.average(scores) >= 0.8)
      .map(([concept, _]) => concept)
      .slice(0, 5); // Limit to top 5 strengths
  }

  // Generate performance trends over time
  generatePerformanceTrends(sessions: any[], days: number = 30): PerformanceTrend[] {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentSessions = sessions.filter(s => 
      new Date(s.startTime) >= cutoffDate && s.completed
    );

    // Group sessions by day
    const dailyData = new Map<string, any[]>();
    recentSessions.forEach(session => {
      const dateKey = new Date(session.startTime).toDateString();
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, []);
      }
      dailyData.get(dateKey)!.push(session);
    });

    // Calculate daily trends
    return Array.from(dailyData.entries())
      .map(([dateStr, daySessions]) => ({
        date: new Date(dateStr),
        successRate: this.calculateSuccessRate(daySessions),
        averageTime: this.averageSessionTime(daySessions),
        problemsSolved: daySessions.length,
        difficultyLevel: this.averageDifficulty(daySessions)
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // Analyze learning patterns
  analyzeLearningPatterns(sessions: any[], profile: StudentProfile): LearningPattern {
    const problemTypePreference = this.calculateProblemTypePreference(sessions);
    const optimalSessionLength = this.calculateOptimalSessionLength(sessions);
    const bestPerformanceTime = this.calculateBestPerformanceTime(sessions);
    const responsePatterns = this.analyzeResponsePatterns(sessions);

    return {
      preferredProblemTypes: problemTypePreference,
      optimalSessionLength,
      bestPerformanceTime,
      learningStyle: profile.learningStyle,
      responsePatterns
    };
  }

  // Generate personalized recommendations
  generateRecommendations(analytics: LearningAnalytics, patterns: LearningPattern): string[] {
    const recommendations: string[] = [];
    
    // Success rate recommendations
    if (analytics.successRate < 0.5) {
      recommendations.push("Consider reviewing fundamental concepts before tackling new problems");
      recommendations.push("Try starting with easier problems to build confidence");
    } else if (analytics.successRate > 0.8) {
      recommendations.push("Great progress! Consider increasing problem difficulty for more challenge");
    }
    
    // Knowledge gap recommendations
    if (analytics.knowledgeGaps.length > 0) {
      recommendations.push(`Focus on improving: ${analytics.knowledgeGaps.slice(0, 3).join(', ')}`);
    }
    
    // Learning velocity recommendations
    if (analytics.learningVelocity > 0.1) {
      recommendations.push("Excellent improvement trend! Keep up the great work");
    } else if (analytics.learningVelocity < -0.05) {
      recommendations.push("Consider taking breaks between sessions to avoid fatigue");
    }
    
    // Session length recommendations
    if (patterns.optimalSessionLength > 0) {
      if (patterns.optimalSessionLength < 15) {
        recommendations.push("Short, focused sessions work well for you - consider 10-15 minute sessions");
      } else if (patterns.optimalSessionLength > 45) {
        recommendations.push("You perform well in longer sessions - consider 45-60 minute focused study blocks");
      }
    }
    
    // Problem type recommendations
    if (patterns.preferredProblemTypes.length > 0) {
      recommendations.push(`You excel at ${patterns.preferredProblemTypes[0]} problems - consider exploring related topics`);
    }
    
    return recommendations.slice(0, 5); // Limit to 5 most relevant recommendations
  }

  // Generate comprehensive analytics report
  async generateAnalyticsReport(studentId: string, days: number = 30): Promise<AnalyticsReport> {
    const profile = await dataStorage.loadStudentProfile();
    const sessionHistory = await dataStorage.loadSessionHistory();
    
    if (!profile) {
      throw new Error('Student profile not found');
    }

    const sessions = Object.values(sessionHistory.sessions);
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentSessions = sessions.filter((s: any) => new Date(s.startTime) >= cutoffDate);

    const summary = {
      totalSessions: recentSessions.length,
      totalTime: recentSessions.reduce((sum, s: any) => sum + s.duration, 0),
      averageSessionTime: this.averageSessionTime(recentSessions),
      problemsSolved: recentSessions.filter((s: any) => s.completed).length,
      successRate: this.calculateSuccessRate(recentSessions),
      improvementRate: this.calculateLearningVelocity(recentSessions)
    };

    const breakdown = {
      byProblemType: this.groupByProblemType(recentSessions),
      byDifficulty: this.groupByDifficulty(recentSessions),
      byTimeOfDay: this.groupByTimeOfDay(recentSessions)
    };

    const patterns = this.analyzeLearningPatterns(sessions, profile.profile);
    const recommendations = this.generateRecommendations(profile.analytics, patterns);
    const achievements = this.identifyAchievements(profile.analytics, recentSessions);

    return {
      studentId,
      reportDate: new Date(),
      timeRange: {
        start: cutoffDate,
        end: new Date()
      },
      summary,
      breakdown,
      recommendations,
      achievements
    };
  }

  // Update student analytics based on new session data
  async updateStudentAnalytics(sessionData: any): Promise<void> {
    let profile = await dataStorage.loadStudentProfile();
    if (!profile) {
      profile = dataStorage.createDefaultProfile();
    }

    const sessionHistory = await dataStorage.loadSessionHistory();
    const allSessions = Object.values(sessionHistory.sessions);

    // Update basic metrics
    profile.profile.totalSessions = allSessions.length;
    profile.profile.lastActive = new Date();

    // Recalculate analytics
    profile.analytics.successRate = this.calculateSuccessRate(allSessions);
    profile.analytics.averageSessionTime = this.averageSessionTime(allSessions);
    profile.analytics.learningVelocity = this.calculateLearningVelocity(allSessions);
    profile.analytics.knowledgeGaps = this.identifyKnowledgeGaps(allSessions);
    profile.analytics.strengths = this.identifyStrengths(allSessions);
    profile.analytics.performanceTrends = this.generatePerformanceTrends(allSessions);
    profile.analytics.lastUpdated = new Date();

    // Update learning style based on patterns (if enough data)
    if (allSessions.length >= 5) {
      const patterns = this.analyzeLearningPatterns(allSessions, profile.profile);
      profile.profile.learningStyle = this.inferLearningStyle(patterns);
    }

    await dataStorage.saveStudentProfile(profile);
  }

  // Create visualization data for CLI display
  createVisualizationData(type: 'performance' | 'progress' | 'breakdown', data: any): VisualizationData {
    switch (type) {
      case 'performance':
        return {
          type: 'line',
          title: 'Performance Trend',
          data: data.performanceTrends.map((trend: PerformanceTrend) => ({
            label: trend.date.toLocaleDateString(),
            value: Math.round(trend.successRate * 100)
          })),
          maxValue: 100,
          unit: '%'
        };
      
      case 'progress':
        return {
          type: 'progress',
          title: 'Learning Progress',
          data: [
            { label: 'Success Rate', value: Math.round(data.successRate * 100) },
            { label: 'Current Level', value: data.currentLevel * 10 }
          ],
          maxValue: 100,
          unit: '%'
        };
      
      case 'breakdown':
        return {
          type: 'bar',
          title: 'Problem Type Distribution',
          data: Object.entries(data.byProblemType).map(([type, count]) => ({
            label: type,
            value: count as number
          }))
        };
      
      default:
        return {
          type: 'bar',
          title: 'Data',
          data: []
        };
    }
  }

  // Helper methods
  private averageMasteryScore(sessions: any[]): number {
    if (sessions.length === 0) return 0;
    const scores = sessions
      .filter(s => s.performance?.masteryScore !== undefined)
      .map(s => s.performance.masteryScore);
    return scores.length > 0 ? this.average(scores) : 0;
  }

  private averageSessionTime(sessions: any[]): number {
    if (sessions.length === 0) return 0;
    return this.average(sessions.map(s => s.duration || 0));
  }

  private averageDifficulty(sessions: any[]): number {
    if (sessions.length === 0) return 1;
    const difficulties = sessions
      .filter(s => s.performance?.difficultyLevel !== undefined)
      .map(s => s.performance.difficultyLevel);
    return difficulties.length > 0 ? this.average(difficulties) : 1;
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  private calculateProblemTypePreference(sessions: any[]): string[] {
    const typeCount = new Map<string, number>();
    
    sessions.forEach(session => {
      if (session.classification?.problemType) {
        const type = session.classification.problemType;
        typeCount.set(type, (typeCount.get(type) || 0) + 1);
      }
    });

    return Array.from(typeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, _]) => type);
  }

  private calculateOptimalSessionLength(sessions: any[]): number {
    const sessionsByLength = sessions
      .filter(s => s.completed && s.performance?.masteryScore !== undefined)
      .map(s => ({
        duration: s.duration,
        performance: s.performance.masteryScore
      }));

    if (sessionsByLength.length < 3) return 0;

    // Group by duration ranges and find the range with best average performance
    const ranges = [
      { min: 0, max: 15, sessions: [] as any[] },
      { min: 15, max: 30, sessions: [] as any[] },
      { min: 30, max: 45, sessions: [] as any[] },
      { min: 45, max: 60, sessions: [] as any[] },
      { min: 60, max: Infinity, sessions: [] as any[] }
    ];

    sessionsByLength.forEach(session => {
      const durationMinutes = session.duration / 60;
      const range = ranges.find(r => durationMinutes >= r.min && durationMinutes < r.max);
      if (range) range.sessions.push(session);
    });

    const bestRange = ranges
      .filter(r => r.sessions.length >= 2)
      .sort((a, b) => {
        const avgA = this.average(a.sessions.map(s => s.performance));
        const avgB = this.average(b.sessions.map(s => s.performance));
        return avgB - avgA;
      })[0];

    return bestRange ? (bestRange.min + bestRange.max) / 2 : 0;
  }

  private calculateBestPerformanceTime(sessions: any[]): string {
    const hourPerformance = new Map<number, number[]>();
    
    sessions
      .filter(s => s.completed && s.performance?.masteryScore !== undefined)
      .forEach(session => {
        const hour = new Date(session.startTime).getHours();
        if (!hourPerformance.has(hour)) {
          hourPerformance.set(hour, []);
        }
        hourPerformance.get(hour)!.push(session.performance.masteryScore);
      });

    if (hourPerformance.size === 0) return 'Unknown';

    const bestHour = Array.from(hourPerformance.entries())
      .filter(([_, scores]) => scores.length >= 2)
      .sort((a, b) => this.average(b[1]) - this.average(a[1]))[0];

    if (!bestHour) return 'Unknown';

    const hour = bestHour[0];
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  }

  private analyzeResponsePatterns(sessions: any[]): ResponsePattern[] {
    const conceptPatterns = new Map<string, {
      times: number[];
      successes: number;
      total: number;
      mistakes: string[];
    }>();

    sessions.forEach(session => {
      if (session.performance?.conceptsLearned) {
        session.performance.conceptsLearned.forEach((concept: string) => {
          if (!conceptPatterns.has(concept)) {
            conceptPatterns.set(concept, { times: [], successes: 0, total: 0, mistakes: [] });
          }
          const pattern = conceptPatterns.get(concept)!;
          pattern.times.push(session.performance.responseTime || 0);
          pattern.total++;
          if (session.performance.masteryScore >= 0.7) {
            pattern.successes++;
          }
        });
      }
    });

    return Array.from(conceptPatterns.entries())
      .filter(([_, data]) => data.total >= 2)
      .map(([concept, data]) => ({
        concept,
        averageTime: this.average(data.times),
        successRate: data.successes / data.total,
        commonMistakes: data.mistakes.slice(0, 3),
        improvementTrend: this.calculateTrend(data.times) as 'improving' | 'stable' | 'declining'
      }))
      .slice(0, 5);
  }

  private calculateTrend(values: number[]): string {
    if (values.length < 3) return 'stable';
    
    const recent = values.slice(-3);
    const earlier = values.slice(-6, -3);
    
    if (earlier.length === 0) return 'stable';
    
    const recentAvg = this.average(recent);
    const earlierAvg = this.average(earlier);
    
    const change = (recentAvg - earlierAvg) / earlierAvg;
    
    if (change > 0.1) return 'declining'; // Higher response time = declining
    if (change < -0.1) return 'improving'; // Lower response time = improving
    return 'stable';
  }

  private inferLearningStyle(patterns: LearningPattern): LearningStyle {
    // Simple heuristic based on response patterns and preferences
    if (patterns.responsePatterns.some((p: ResponsePattern) => p.averageTime < 30)) {
      return LearningStyle.ANALYTICAL; // Quick, analytical responses
    }
    if (patterns.optimalSessionLength > 45) {
      return LearningStyle.EXPLORATORY; // Longer sessions suggest exploratory learning
    }
    return LearningStyle.VISUAL; // Default to visual
  }

  private groupByProblemType(sessions: any[]): { [type: string]: number } {
    const groups: { [type: string]: number } = {};
    sessions.forEach(session => {
      const type = session.classification?.problemType || 'unknown';
      groups[type] = (groups[type] || 0) + 1;
    });
    return groups;
  }

  private groupByDifficulty(sessions: any[]): { [level: string]: number } {
    const groups: { [level: string]: number } = {};
    sessions.forEach(session => {
      const level = session.classification?.difficulty || 'unknown';
      groups[level] = (groups[level] || 0) + 1;
    });
    return groups;
  }

  private groupByTimeOfDay(sessions: any[]): { [hour: string]: number } {
    const groups: { [hour: string]: number } = {};
    sessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      let timeOfDay = 'Night';
      if (hour >= 6 && hour < 12) timeOfDay = 'Morning';
      else if (hour >= 12 && hour < 18) timeOfDay = 'Afternoon';
      else if (hour >= 18 && hour < 22) timeOfDay = 'Evening';
      
      groups[timeOfDay] = (groups[timeOfDay] || 0) + 1;
    });
    return groups;
  }

  private identifyAchievements(analytics: LearningAnalytics, recentSessions: any[]): string[] {
    const achievements: string[] = [];
    
    if (analytics.successRate >= 0.9) {
      achievements.push('🏆 Excellence Award - 90%+ success rate!');
    }
    if (analytics.learningVelocity > 0.15) {
      achievements.push('🚀 Rapid Learner - Outstanding improvement!');
    }
    if (recentSessions.length >= 10) {
      achievements.push('💪 Consistent Learner - 10+ recent sessions!');
    }
    if (analytics.strengths.length >= 3) {
      achievements.push('🌟 Multi-talented - Strong in multiple areas!');
    }
    
    return achievements;
  }
}

// Export singleton instance
export const analyticsEngine = AnalyticsEngine.getInstance();