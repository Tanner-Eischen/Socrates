import { ParsedProblem } from './types';
export declare class ProblemParser {
    private static readonly MATH_PATTERNS;
    private static readonly DIFFICULTY_INDICATORS;
    /**
     * Parse and validate a custom text problem input
     */
    static parseProblem(input: string): ParsedProblem;
    /**
     * Normalize text input for consistent processing
     */
    private static normalizeText;
    /**
     * Validate input text for mathematical content and format
     */
    private static validateInput;
    /**
     * Check if text contains mathematical content
     */
    private static containsMathematicalContent;
    /**
     * Detect the type of mathematical problem
     */
    private static detectProblemType;
    /**
     * Assess the difficulty level of the problem
     */
    private static assessDifficulty;
    /**
     * Extract mathematical concepts from the problem
     */
    private static extractMathConcepts;
    /**
     * Generate a preview of the parsed problem
     */
    static generatePreview(parsed: ParsedProblem): string;
    /**
     * Validate if a problem is suitable for Socratic tutoring
     */
    static isSuitableForTutoring(parsed: ParsedProblem): {
        suitable: boolean;
        reason?: string;
    };
}
//# sourceMappingURL=problem-parser.d.ts.map