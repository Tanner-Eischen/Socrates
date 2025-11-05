import { StudentProfile, AdaptiveDifficulty, SessionPerformance, DifficultyLevel, LearningStyle, AdaptiveRecommendation, TeachingStrategy } from './types';
export declare class AdaptiveController {
    private analyticsEngine;
    private dataStorage;
    private readonly PERFORMANCE_WINDOW;
    private readonly ADJUSTMENT_THRESHOLD;
    constructor();
    calculateAdaptiveDifficulty(recentPerformance: SessionPerformance[], knowledgeGaps: string[], learningStyle: LearningStyle): AdaptiveDifficulty;
    generateTeachingStrategy(learningStyle: LearningStyle, currentDifficulty: DifficultyLevel, knowledgeGaps: string[]): TeachingStrategy;
    generateRecommendations(performanceHistory: SessionPerformance[], knowledgeGaps: string[], currentDifficulty: DifficultyLevel): string[];
    generateAdaptiveRecommendations(sessionContext: any, studentProfile: StudentProfile): Promise<AdaptiveRecommendation[]>;
    adaptProblemSelection(availableProblems: any[], studentProfile: StudentProfile, currentDifficulty: DifficultyLevel): Promise<any[]>;
    updateAdaptiveParameters(sessionId: string, interactionData: any): Promise<void>;
    private analyzeRecentPerformance;
    private calculateConfidenceLevel;
    private calculateLearningVelocity;
    private increaseDifficulty;
    private decreaseDifficulty;
    private adjustForLearningStyle;
    private getPrimaryApproach;
    private getQuestioningStyle;
    private getQuestioningStyleWithPerformance;
    private getFeedbackStyle;
    private getFeedbackStyleWithPerformance;
    private calculateOptimalPacing;
    private calculateOptimalPacingWithPerformance;
    private identifyFocusAreas;
    private identifyFocusAreasDetailed;
    private generateAdaptations;
    private generateAdaptationsWithPerformance;
    private generateStyleBasedRecommendations;
    private analyzeProblemTypePreferences;
    private calculateProblemScore;
    private matchesLearningStyle;
    private ensureProblemVariety;
}
//# sourceMappingURL=adaptive-controller.d.ts.map