"use strict";
// Problem Parser Module for SocraTeach Day 2
// Handles custom text input parsing, validation, and normalization
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProblemParser = void 0;
const types_1 = require("./types");
class ProblemParser {
    /**
     * Parse and validate a custom text problem input
     */
    static parseProblem(input) {
        const startTime = Date.now();
        try {
            // Clean and normalize input
            const normalizedText = this.normalizeText(input);
            // Validate input
            const validation = this.validateInput(normalizedText);
            if (!validation.isValid) {
                return {
                    originalText: input,
                    normalizedText,
                    content: normalizedText,
                    problemType: types_1.ProblemType.ARITHMETIC,
                    difficulty: types_1.DifficultyLevel.BEGINNER,
                    mathConcepts: [],
                    metadata: {
                        wordCount: normalizedText.split(/\s+/).length,
                        hasEquations: false,
                        hasVariables: false,
                        complexity: 'low'
                    },
                    isValid: false,
                    errors: validation.errors
                };
            }
            // Detect problem type
            const problemType = this.detectProblemType(normalizedText);
            // Assess difficulty
            const difficulty = this.assessDifficulty(normalizedText, problemType);
            // Extract mathematical concepts
            const mathConcepts = this.extractMathConcepts(normalizedText, problemType);
            return {
                originalText: input,
                normalizedText,
                content: normalizedText,
                problemType,
                difficulty,
                mathConcepts,
                metadata: {
                    wordCount: normalizedText.split(/\s+/).length,
                    hasEquations: /=/.test(normalizedText),
                    hasVariables: /[a-z]/i.test(normalizedText),
                    complexity: difficulty === types_1.DifficultyLevel.BEGINNER ? 'low' :
                        difficulty === types_1.DifficultyLevel.INTERMEDIATE ? 'medium' : 'high'
                },
                isValid: true
            };
        }
        catch (error) {
            return {
                originalText: input,
                normalizedText: input,
                content: input,
                problemType: types_1.ProblemType.ARITHMETIC,
                difficulty: types_1.DifficultyLevel.BEGINNER,
                mathConcepts: [],
                metadata: {
                    wordCount: input.split(/\s+/).length,
                    hasEquations: false,
                    hasVariables: false,
                    complexity: 'low'
                },
                isValid: false,
                errors: [`Parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`]
            };
        }
    }
    /**
     * Normalize text input for consistent processing
     */
    static normalizeText(input) {
        return input
            .trim()
            .replace(/\s+/g, ' ') // Multiple spaces to single space
            .replace(/[""'']/g, '"') // Normalize quotes
            .replace(/×/g, '*') // Multiplication symbol
            .replace(/÷/g, '/') // Division symbol
            .replace(/−/g, '-') // Minus symbol
            .replace(/\b(\d+)\s*\^\s*(\d+)/g, '$1^$2') // Normalize exponents
            .replace(/\b(\d+)\s*squared\b/gi, '$1^2') // Convert "squared" to ^2
            .replace(/\b(\d+)\s*cubed\b/gi, '$1^3'); // Convert "cubed" to ^3
    }
    /**
     * Validate input text for mathematical content and format
     */
    static validateInput(text) {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        // Check minimum length
        if (text.length < 3) {
            errors.push('Problem text is too short. Please provide a complete mathematical problem.');
        }
        // Check maximum length
        if (text.length > 2000) {
            errors.push('Problem text is too long. Please keep it under 2000 characters.');
        }
        // Check for mathematical content
        const hasMathContent = this.containsMathematicalContent(text);
        if (!hasMathContent) {
            errors.push('No mathematical content detected. Please include numbers, variables, or mathematical operations.');
            suggestions.push('Example: "Solve for x: 2x + 5 = 13" or "Find the area of a circle with radius 5"');
        }
        // Check for common formatting issues
        if (text.includes('=') && !text.match(/\d+\s*=\s*\d+/) && !text.match(/[a-z]\s*=\s*\d+/i)) {
            warnings.push('Equation format detected. Make sure variables and numbers are properly spaced.');
        }
        // Check for unsupported symbols
        const unsupportedSymbols = text.match(/[§¶†‡•‰‱]/g);
        if (unsupportedSymbols) {
            warnings.push(`Unsupported symbols detected: ${unsupportedSymbols.join(', ')}. These may not be processed correctly.`);
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions
        };
    }
    /**
     * Check if text contains mathematical content
     */
    static containsMathematicalContent(text) {
        // Check for numbers
        if (/\d/.test(text))
            return true;
        // Check for variables
        if (/\b[a-z]\b/i.test(text))
            return true;
        // Check for mathematical operations
        if (/[+\-*/=^√∫∑∏]/.test(text))
            return true;
        // Check for mathematical keywords
        if (/solve|find|calculate|determine|equation|formula|area|volume|derivative|integral/i.test(text))
            return true;
        return false;
    }
    /**
     * Detect the type of mathematical problem
     */
    static detectProblemType(text) {
        // Check patterns in order of specificity
        if (this.MATH_PATTERNS.calculus.test(text))
            return types_1.ProblemType.CALCULUS;
        if (this.MATH_PATTERNS.trigonometry.test(text))
            return types_1.ProblemType.TRIGONOMETRY;
        if (this.MATH_PATTERNS.statistics.test(text))
            return types_1.ProblemType.STATISTICS;
        if (this.MATH_PATTERNS.geometry.test(text))
            return types_1.ProblemType.GEOMETRY;
        if (this.MATH_PATTERNS.quadratic.test(text))
            return types_1.ProblemType.ALGEBRA;
        if (this.MATH_PATTERNS.linear.test(text))
            return types_1.ProblemType.ALGEBRA;
        if (this.MATH_PATTERNS.arithmetic.test(text))
            return types_1.ProblemType.ARITHMETIC;
        // Default to algebra for equation-like content
        if (text.includes('=') || /[a-z]/i.test(text))
            return types_1.ProblemType.ALGEBRA;
        return types_1.ProblemType.ARITHMETIC;
    }
    /**
     * Assess the difficulty level of the problem
     */
    static assessDifficulty(text, problemType) {
        const lowerText = text.toLowerCase();
        // Check for advanced indicators first
        for (const indicator of this.DIFFICULTY_INDICATORS.advanced) {
            if (lowerText.includes(indicator))
                return types_1.DifficultyLevel.ADVANCED;
        }
        // Check for intermediate indicators
        for (const indicator of this.DIFFICULTY_INDICATORS.intermediate) {
            if (lowerText.includes(indicator))
                return types_1.DifficultyLevel.INTERMEDIATE;
        }
        // Problem type based difficulty
        if (problemType === types_1.ProblemType.CALCULUS)
            return types_1.DifficultyLevel.ADVANCED;
        if (problemType === types_1.ProblemType.TRIGONOMETRY)
            return types_1.DifficultyLevel.INTERMEDIATE;
        if (problemType === types_1.ProblemType.STATISTICS)
            return types_1.DifficultyLevel.INTERMEDIATE;
        // Check for multiple variables or complex operations
        const variableCount = (text.match(/\b[a-z]\b/gi) || []).length;
        if (variableCount > 2)
            return types_1.DifficultyLevel.INTERMEDIATE;
        // Check for exponents or complex operations
        if (/\^|squared|cubed|sqrt|log|ln/i.test(text))
            return types_1.DifficultyLevel.INTERMEDIATE;
        return types_1.DifficultyLevel.BEGINNER;
    }
    /**
     * Extract mathematical concepts from the problem
     */
    static extractMathConcepts(text, problemType) {
        const concepts = [];
        const lowerText = text.toLowerCase();
        // Add primary concept based on problem type
        concepts.push(problemType.replace('_', ' '));
        // Extract specific concepts based on content
        const conceptMap = {
            'equation': ['linear equations', 'solving equations'],
            'system': ['system of equations', 'multiple variables'],
            'quadratic': ['quadratic equations', 'factoring'],
            'area': ['geometry', 'area calculation'],
            'volume': ['geometry', 'volume calculation'],
            'perimeter': ['geometry', 'perimeter calculation'],
            'circle': ['geometry', 'circles'],
            'triangle': ['geometry', 'triangles'],
            'derivative': ['calculus', 'differentiation'],
            'integral': ['calculus', 'integration'],
            'limit': ['calculus', 'limits'],
            'sin': ['trigonometry', 'sine function'],
            'cos': ['trigonometry', 'cosine function'],
            'tan': ['trigonometry', 'tangent function'],
            'probability': ['statistics', 'probability theory'],
            'mean': ['statistics', 'measures of central tendency'],
            'percentage': ['arithmetic', 'percentages'],
            'fraction': ['arithmetic', 'fractions']
        };
        for (const [keyword, relatedConcepts] of Object.entries(conceptMap)) {
            if (lowerText.includes(keyword)) {
                concepts.push(...relatedConcepts);
            }
        }
        // Remove duplicates and limit to 5 concepts
        return [...new Set(concepts)].slice(0, 5);
    }
    /**
     * Generate a preview of the parsed problem
     */
    static generatePreview(parsed) {
        if (!parsed.isValid) {
            return `❌ Invalid Problem:\n${parsed.errors?.join('\n') || 'Unknown error'}`;
        }
        const preview = [
            `📝 Problem Preview:`,
            `   Text: "${parsed.normalizedText}"`,
            `   Type: ${parsed.problemType.replace('_', ' ').toUpperCase()}`,
            `   Difficulty: ${parsed.difficulty.toUpperCase()}`,
            `   Concepts: ${parsed.mathConcepts.join(', ')}`
        ];
        return preview.join('\n');
    }
    /**
     * Validate if a problem is suitable for Socratic tutoring
     */
    static isSuitableForTutoring(parsed) {
        if (!parsed.isValid) {
            return { suitable: false, reason: 'Problem contains validation errors' };
        }
        // Check if problem is too simple
        if (parsed.problemType === 'arithmetic' && parsed.difficulty === 'beginner') {
            const hasOnlyBasicOps = /^\s*\d+\s*[+\-*/]\s*\d+\s*=?\s*$/.test(parsed.normalizedText);
            if (hasOnlyBasicOps) {
                return { suitable: false, reason: 'Problem is too simple for Socratic method. Try a more complex problem.' };
            }
        }
        // Check if problem has learning potential
        if (parsed.mathConcepts.length === 0) {
            return { suitable: false, reason: 'No clear mathematical concepts identified for tutoring' };
        }
        return { suitable: true };
    }
}
exports.ProblemParser = ProblemParser;
ProblemParser.MATH_PATTERNS = {
    // Linear equations: ax + b = c, x + y = z, etc.
    linear: /(?:\d*\.?\d*\s*[a-z]\s*[+\-]\s*\d+\s*=\s*\d+)|(?:[a-z]\s*[+\-]\s*[a-z]\s*=\s*\d+)/i,
    // Quadratic equations: ax^2 + bx + c = 0
    quadratic: /\d*\.?\d*\s*[a-z]\s*\^\s*2|[a-z]\s*squared|[a-z]\s*²/i,
    // Geometry: area, perimeter, volume, etc.
    geometry: /area|perimeter|volume|radius|diameter|circumference|triangle|circle|rectangle|square|polygon/i,
    // Calculus: derivatives, integrals, limits
    calculus: /derivative|integral|limit|differentiate|integrate|d\/dx|∫|lim/i,
    // Trigonometry: sin, cos, tan, etc.
    trigonometry: /sin|cos|tan|cot|sec|csc|sine|cosine|tangent|θ|angle/i,
    // Statistics: mean, median, mode, probability
    statistics: /mean|median|mode|average|probability|standard deviation|variance|distribution/i,
    // Word problems indicators
    wordProblem: /if|when|how many|how much|what is|find|calculate|determine|solve for/i,
    // Arithmetic operations
    arithmetic: /^\s*\d+\.?\d*\s*[+\-*/÷×]\s*\d+\.?\d*\s*=?\s*$/
};
ProblemParser.DIFFICULTY_INDICATORS = {
    beginner: [
        'basic', 'simple', 'elementary', 'add', 'subtract', 'multiply', 'divide',
        'single variable', 'one step', 'whole numbers'
    ],
    intermediate: [
        'solve', 'equation', 'system', 'two variables', 'fractions', 'decimals',
        'multi-step', 'word problem', 'graph'
    ],
    advanced: [
        'complex', 'advanced', 'calculus', 'derivative', 'integral', 'matrix',
        'polynomial', 'logarithm', 'exponential', 'trigonometric'
    ]
};
//# sourceMappingURL=problem-parser.js.map