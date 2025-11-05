import { ClassificationResult, ParsedProblem } from './types';
/**
 * Problem Classifier for SocraTeach Day 2
 * Automatically classifies mathematical problems by type and difficulty
 */
export declare class ProblemClassifier {
    private static readonly TYPE_PATTERNS;
    private static readonly DIFFICULTY_INDICATORS;
    /**
     * Classify a problem's type and difficulty
     */
    static classify(problem: ParsedProblem): ClassificationResult;
    /**
     * Classify problem type based on content analysis
     */
    private static classifyType;
    /**
     * Classify difficulty level
     */
    private static classifyDifficulty;
    /**
     * Calculate confidence score for classification
     */
    private static calculateConfidence;
    /**
     * Generate reasoning for classification
     */
    private static generateReasoning;
    /**
     * Suggest teaching approach based on classification
     */
    private static suggestApproach;
    /**
     * Estimate time needed for problem
     */
    private static estimateTime;
    /**
     * Get prerequisites for problem type and difficulty
     */
    private static getPrerequisites;
    /**
     * Validate classification result
     */
    static validateClassification(result: ClassificationResult): boolean;
    /**
     * Get classification summary for display
     */
    static getClassificationSummary(result: ClassificationResult): string;
}
//# sourceMappingURL=problem-classifier.d.ts.map