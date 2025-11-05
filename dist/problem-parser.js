"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProblemParser = void 0;
class ProblemParser {
    static parseProblem(text) {
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
exports.ProblemParser = ProblemParser;
//# sourceMappingURL=problem-parser.js.map