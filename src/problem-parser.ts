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

export class ProblemParser {
  static parseProblem(text: string): ParsedProblem {
    return {
      isValid: true,
      problemType: 'math',
      difficulty: 'intermediate',
      content: text,
      originalText: text,
      mathConcepts: [],
      metadata: {},
    };
  }
}
