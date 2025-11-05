import { StudentProfile, LearningAnalytics, PerformanceTrend, LearningPattern, AnalyticsReport, VisualizationData } from './types';
export declare class AnalyticsEngine {
    private static instance;
    static getInstance(): AnalyticsEngine;
    calculateSuccessRate(sessions: any[]): number;
    calculateLearningVelocity(sessions: any[]): number;
    identifyKnowledgeGaps(sessions: any[]): string[];
    identifyStrengths(sessions: any[]): string[];
    generatePerformanceTrends(sessions: any[], days?: number): PerformanceTrend[];
    analyzeLearningPatterns(sessions: any[], profile: StudentProfile): LearningPattern;
    generateRecommendations(analytics: LearningAnalytics, patterns: LearningPattern): string[];
    generateAnalyticsReport(studentId: string, days?: number): Promise<AnalyticsReport>;
    updateStudentAnalytics(sessionData: any): Promise<void>;
    createVisualizationData(type: 'performance' | 'progress' | 'breakdown', data: any): VisualizationData;
    private averageMasteryScore;
    private averageSessionTime;
    private averageDifficulty;
    private average;
    private calculateProblemTypePreference;
    private calculateOptimalSessionLength;
    private calculateBestPerformanceTime;
    private analyzeResponsePatterns;
    private calculateTrend;
    private inferLearningStyle;
    private groupByProblemType;
    private groupByDifficulty;
    private groupByTimeOfDay;
    private identifyAchievements;
}
export declare const analyticsEngine: AnalyticsEngine;
//# sourceMappingURL=analytics-engine.d.ts.map