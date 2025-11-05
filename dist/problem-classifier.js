"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProblemClassifier = void 0;
const types_1 = require("./types");
/**
 * Problem Classifier for SocraTeach Day 2
 * Automatically classifies mathematical problems by type and difficulty
 */
class ProblemClassifier {
    /**
     * Classify a problem's type and difficulty
     */
    static classify(problem) {
        const content = problem.content.toLowerCase();
        // Classify problem type
        const problemType = this.classifyType(content);
        // Classify difficulty
        const difficulty = this.classifyDifficulty(content, problemType);
        // Calculate confidence score
        const confidence = this.calculateConfidence(content, problemType, difficulty);
        // Generate reasoning
        const reasoning = this.generateReasoning(content, problemType, difficulty);
        return {
            problemType,
            difficulty,
            confidence,
            reasoning,
            suggestedApproach: this.suggestApproach(problemType, difficulty),
            estimatedTime: this.estimateTime(difficulty),
            prerequisites: this.getPrerequisites(problemType, difficulty)
        };
    }
    /**
     * Classify problem type based on content analysis
     */
    static classifyType(content) {
        const scores = {
            [types_1.ProblemType.ALGEBRA]: 0,
            [types_1.ProblemType.GEOMETRY]: 0,
            [types_1.ProblemType.CALCULUS]: 0,
            [types_1.ProblemType.STATISTICS]: 0,
            [types_1.ProblemType.TRIGONOMETRY]: 0,
            [types_1.ProblemType.ARITHMETIC]: 0
        };
        // Score based on keywords and patterns
        for (const [type, indicators] of Object.entries(this.TYPE_PATTERNS)) {
            const problemType = type;
            // Keyword scoring
            for (const keyword of indicators.keywords) {
                if (content.includes(keyword)) {
                    scores[problemType] += 2;
                }
            }
            // Pattern scoring
            for (const pattern of indicators.patterns) {
                if (pattern.test(content)) {
                    scores[problemType] += 3;
                }
            }
        }
        // Return type with highest score, default to algebra
        const maxScore = Math.max(...Object.values(scores));
        if (maxScore === 0)
            return types_1.ProblemType.ALGEBRA;
        return Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] || types_1.ProblemType.ALGEBRA;
    }
    /**
     * Classify difficulty level
     */
    static classifyDifficulty(content, problemType) {
        const scores = {
            [types_1.DifficultyLevel.BEGINNER]: 0,
            [types_1.DifficultyLevel.INTERMEDIATE]: 0,
            [types_1.DifficultyLevel.ADVANCED]: 0
        };
        // Analyze content complexity
        const wordCount = content.split(/\s+/).length;
        const hasMultipleSteps = /and|then|next|also|furthermore|moreover/.test(content);
        const hasComplexMath = /derivative|integral|matrix|vector|complex|advanced/.test(content);
        // Base scoring on content characteristics
        if (wordCount < 20)
            scores[types_1.DifficultyLevel.BEGINNER] += 2;
        else if (wordCount < 50)
            scores[types_1.DifficultyLevel.INTERMEDIATE] += 2;
        else
            scores[types_1.DifficultyLevel.ADVANCED] += 2;
        if (hasMultipleSteps)
            scores[types_1.DifficultyLevel.INTERMEDIATE] += 3;
        if (hasComplexMath)
            scores[types_1.DifficultyLevel.ADVANCED] += 4;
        // Score based on difficulty indicators
        for (const [level, indicators] of Object.entries(this.DIFFICULTY_INDICATORS)) {
            const diffLevel = level;
            for (const keyword of indicators.keywords) {
                if (content.includes(keyword)) {
                    scores[diffLevel] += 2;
                }
            }
        }
        // Adjust based on problem type
        if (problemType === types_1.ProblemType.CALCULUS) {
            scores[types_1.DifficultyLevel.ADVANCED] += 3;
        }
        else if (problemType === types_1.ProblemType.ARITHMETIC) {
            scores[types_1.DifficultyLevel.BEGINNER] += 2;
        }
        // Return level with highest score
        const maxScore = Math.max(...Object.values(scores));
        return Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] || types_1.DifficultyLevel.INTERMEDIATE;
    }
    /**
     * Calculate confidence score for classification
     */
    static calculateConfidence(content, type, difficulty) {
        let confidence = 0.5; // Base confidence
        const typeIndicators = this.TYPE_PATTERNS[type];
        const keywordMatches = typeIndicators.keywords.filter(keyword => content.includes(keyword)).length;
        const patternMatches = typeIndicators.patterns.filter(pattern => pattern.test(content)).length;
        // Increase confidence based on matches
        confidence += (keywordMatches * 0.1);
        confidence += (patternMatches * 0.15);
        // Adjust for content length and clarity
        const wordCount = content.split(/\s+/).length;
        if (wordCount > 10 && wordCount < 100)
            confidence += 0.1;
        // Mathematical symbols increase confidence
        if (/[+\-*/=<>∫∂∆∑∏√π]/.test(content))
            confidence += 0.1;
        return Math.min(0.95, Math.max(0.3, confidence));
    }
    /**
     * Generate reasoning for classification
     */
    static generateReasoning(content, type, difficulty) {
        const reasons = [];
        // Type reasoning
        const typeIndicators = this.TYPE_PATTERNS[type];
        const matchedKeywords = typeIndicators.keywords.filter(keyword => content.includes(keyword));
        if (matchedKeywords.length > 0) {
            reasons.push(`Classified as ${type} due to keywords: ${matchedKeywords.slice(0, 3).join(', ')}`);
        }
        // Difficulty reasoning
        const wordCount = content.split(/\s+/).length;
        if (difficulty === types_1.DifficultyLevel.BEGINNER) {
            reasons.push(`Beginner level due to straightforward language and basic concepts`);
        }
        else if (difficulty === types_1.DifficultyLevel.INTERMEDIATE) {
            reasons.push(`Intermediate level due to multi-step nature or moderate complexity`);
        }
        else {
            reasons.push(`Advanced level due to complex concepts or abstract reasoning required`);
        }
        return reasons.join('. ');
    }
    /**
     * Suggest teaching approach based on classification
     */
    static suggestApproach(type, difficulty) {
        const approaches = {
            [types_1.ProblemType.ALGEBRA]: {
                [types_1.DifficultyLevel.BEGINNER]: "Start with identifying variables and constants, then guide through step-by-step solving",
                [types_1.DifficultyLevel.INTERMEDIATE]: "Focus on problem setup and systematic equation solving techniques",
                [types_1.DifficultyLevel.ADVANCED]: "Emphasize multiple solution methods and verification strategies"
            },
            [types_1.ProblemType.GEOMETRY]: {
                [types_1.DifficultyLevel.BEGINNER]: "Use visual aids and basic shape properties",
                [types_1.DifficultyLevel.INTERMEDIATE]: "Apply geometric theorems and formulas systematically",
                [types_1.DifficultyLevel.ADVANCED]: "Integrate multiple geometric concepts and proof techniques"
            },
            [types_1.ProblemType.CALCULUS]: {
                [types_1.DifficultyLevel.BEGINNER]: "Focus on conceptual understanding before computational techniques",
                [types_1.DifficultyLevel.INTERMEDIATE]: "Practice standard techniques with guided problem-solving",
                [types_1.DifficultyLevel.ADVANCED]: "Explore connections between concepts and advanced applications"
            },
            [types_1.ProblemType.STATISTICS]: {
                [types_1.DifficultyLevel.BEGINNER]: "Start with data interpretation and basic measures",
                [types_1.DifficultyLevel.INTERMEDIATE]: "Apply statistical methods with real-world context",
                [types_1.DifficultyLevel.ADVANCED]: "Analyze complex distributions and inference techniques"
            },
            [types_1.ProblemType.TRIGONOMETRY]: {
                [types_1.DifficultyLevel.BEGINNER]: "Use unit circle and basic triangle relationships",
                [types_1.DifficultyLevel.INTERMEDIATE]: "Apply trigonometric identities and equations",
                [types_1.DifficultyLevel.ADVANCED]: "Integrate with calculus and complex number concepts"
            },
            [types_1.ProblemType.ARITHMETIC]: {
                [types_1.DifficultyLevel.BEGINNER]: "Focus on number sense and basic operations",
                [types_1.DifficultyLevel.INTERMEDIATE]: "Practice multi-step calculations and estimation",
                [types_1.DifficultyLevel.ADVANCED]: "Explore number theory and advanced computational techniques"
            }
        };
        return approaches[type][difficulty];
    }
    /**
     * Estimate time needed for problem
     */
    static estimateTime(difficulty) {
        switch (difficulty) {
            case types_1.DifficultyLevel.BEGINNER: return "5-10 minutes";
            case types_1.DifficultyLevel.INTERMEDIATE: return "10-20 minutes";
            case types_1.DifficultyLevel.ADVANCED: return "20-45 minutes";
            default: return "10-20 minutes";
        }
    }
    /**
     * Get prerequisites for problem type and difficulty
     */
    static getPrerequisites(type, difficulty) {
        const prerequisites = {
            [types_1.ProblemType.ALGEBRA]: {
                [types_1.DifficultyLevel.BEGINNER]: ["Basic arithmetic", "Understanding of variables"],
                [types_1.DifficultyLevel.INTERMEDIATE]: ["Linear equations", "Basic factoring"],
                [types_1.DifficultyLevel.ADVANCED]: ["Quadratic equations", "Polynomial operations", "Function concepts"]
            },
            [types_1.ProblemType.GEOMETRY]: {
                [types_1.DifficultyLevel.BEGINNER]: ["Basic shapes", "Measurement concepts"],
                [types_1.DifficultyLevel.INTERMEDIATE]: ["Area and perimeter formulas", "Pythagorean theorem"],
                [types_1.DifficultyLevel.ADVANCED]: ["Coordinate geometry", "Trigonometry", "Proof techniques"]
            },
            [types_1.ProblemType.CALCULUS]: {
                [types_1.DifficultyLevel.BEGINNER]: ["Algebra", "Functions", "Limits concept"],
                [types_1.DifficultyLevel.INTERMEDIATE]: ["Derivatives", "Basic integration"],
                [types_1.DifficultyLevel.ADVANCED]: ["Advanced integration", "Series", "Multivariable concepts"]
            },
            [types_1.ProblemType.STATISTICS]: {
                [types_1.DifficultyLevel.BEGINNER]: ["Basic arithmetic", "Data interpretation"],
                [types_1.DifficultyLevel.INTERMEDIATE]: ["Probability concepts", "Descriptive statistics"],
                [types_1.DifficultyLevel.ADVANCED]: ["Probability distributions", "Hypothesis testing", "Regression"]
            },
            [types_1.ProblemType.TRIGONOMETRY]: {
                [types_1.DifficultyLevel.BEGINNER]: ["Basic geometry", "Angle measurement"],
                [types_1.DifficultyLevel.INTERMEDIATE]: ["Right triangle trigonometry", "Unit circle"],
                [types_1.DifficultyLevel.ADVANCED]: ["Trigonometric identities", "Inverse functions", "Complex numbers"]
            },
            [types_1.ProblemType.ARITHMETIC]: {
                [types_1.DifficultyLevel.BEGINNER]: ["Number recognition", "Basic operations"],
                [types_1.DifficultyLevel.INTERMEDIATE]: ["Fractions", "Decimals", "Percentages"],
                [types_1.DifficultyLevel.ADVANCED]: ["Number theory", "Advanced computational methods"]
            }
        };
        return prerequisites[type][difficulty];
    }
    /**
     * Validate classification result
     */
    static validateClassification(result) {
        return (result.confidence >= 0.3 &&
            result.confidence <= 1.0 &&
            result.reasoning.length > 10 &&
            result.suggestedApproach.length > 20 &&
            result.prerequisites.length > 0);
    }
    /**
     * Get classification summary for display
     */
    static getClassificationSummary(result) {
        return `Type: ${result.problemType} | Difficulty: ${result.difficulty} | Confidence: ${(result.confidence * 100).toFixed(0)}% | Time: ${result.estimatedTime}`;
    }
}
exports.ProblemClassifier = ProblemClassifier;
// Problem type patterns and keywords
ProblemClassifier.TYPE_PATTERNS = {
    [types_1.ProblemType.ALGEBRA]: {
        keywords: ['solve', 'equation', 'variable', 'x', 'y', 'unknown', 'linear', 'quadratic', 'polynomial'],
        patterns: [
            /\b\w*x\w*\s*[=+\-*/]\s*\w*/i,
            /\b\d*x\^?\d*\s*[+\-]\s*\d*/i,
            /solve\s+for\s+\w+/i,
            /find\s+\w+\s+if/i
        ]
    },
    [types_1.ProblemType.GEOMETRY]: {
        keywords: ['triangle', 'circle', 'rectangle', 'square', 'angle', 'area', 'perimeter', 'volume', 'radius', 'diameter', 'polygon', 'vertex', 'side', 'hypotenuse'],
        patterns: [
            /\b(triangle|circle|rectangle|square|polygon)\b/i,
            /\b(area|perimeter|volume|circumference)\b/i,
            /\b\d+\s*(degrees?|°)\b/i,
            /\bangle\s+\w+/i
        ]
    },
    [types_1.ProblemType.CALCULUS]: {
        keywords: ['derivative', 'integral', 'limit', 'differentiate', 'integrate', 'slope', 'tangent', 'rate of change', 'maximum', 'minimum'],
        patterns: [
            /\b(derivative|integral|limit)\b/i,
            /\bd\/dx\b/i,
            /\b∫\b/i,
            /\blim\b/i,
            /\bf'?\([x\w]+\)/i
        ]
    },
    [types_1.ProblemType.STATISTICS]: {
        keywords: ['mean', 'median', 'mode', 'standard deviation', 'probability', 'distribution', 'sample', 'population', 'variance', 'correlation'],
        patterns: [
            /\b(mean|median|mode|average)\b/i,
            /\bprobability\s+of\b/i,
            /\bstandard\s+deviation\b/i,
            /\b\d+%\s+chance\b/i
        ]
    },
    [types_1.ProblemType.TRIGONOMETRY]: {
        keywords: ['sin', 'cos', 'tan', 'sine', 'cosine', 'tangent', 'angle', 'radian', 'degree', 'triangle'],
        patterns: [
            /\b(sin|cos|tan|sec|csc|cot)\b/i,
            /\b(sine|cosine|tangent)\b/i,
            /\b\d+\s*(degrees?|radians?|°)\b/i
        ]
    },
    [types_1.ProblemType.ARITHMETIC]: {
        keywords: ['add', 'subtract', 'multiply', 'divide', 'sum', 'difference', 'product', 'quotient', 'fraction', 'decimal', 'percentage'],
        patterns: [
            /^\s*\d+\s*[+\-*/]\s*\d+/,
            /\b\d+\s*\/\s*\d+\b/,
            /\b\d+\.\d+\b/,
            /\b\d+%\b/
        ]
    }
};
// Difficulty indicators
ProblemClassifier.DIFFICULTY_INDICATORS = {
    [types_1.DifficultyLevel.BEGINNER]: {
        keywords: ['basic', 'simple', 'easy', 'elementary', 'introduction'],
        complexity: ['single step', 'one operation', 'direct calculation'],
        mathLevel: ['arithmetic', 'basic algebra', 'simple geometry']
    },
    [types_1.DifficultyLevel.INTERMEDIATE]: {
        keywords: ['solve', 'find', 'calculate', 'determine', 'moderate'],
        complexity: ['multi-step', 'multiple operations', 'substitution'],
        mathLevel: ['algebra', 'geometry', 'basic trigonometry']
    },
    [types_1.DifficultyLevel.ADVANCED]: {
        keywords: ['prove', 'derive', 'optimize', 'analyze', 'complex', 'advanced'],
        complexity: ['multiple concepts', 'integration of topics', 'abstract reasoning'],
        mathLevel: ['calculus', 'advanced algebra', 'complex analysis']
    }
};
//# sourceMappingURL=problem-classifier.js.map