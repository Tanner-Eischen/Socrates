/**
 * Problem Parser - Parses text-based math problems
 */
export interface ParsedProblem {
    isValid: boolean;
    errors?: string[];
    problemType: string;
    difficulty: string;
    content: string;
    originalText: string;
    mathConcepts: string[];
    metadata: Record<string, any>;
}
export declare class ProblemParser {
    static parseProblem(text: string): ParsedProblem;
}
//# sourceMappingURL=problem-parser.d.ts.map