"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdaptiveController = void 0;
// Day 3: Adaptive Learning Controller for Dynamic Difficulty and Personalized Teaching
const types_1 = require("./types");
const analytics_engine_1 = require("./analytics-engine");
const data_storage_1 = require("./data-storage");
class AdaptiveController {
    constructor() {
        this.PERFORMANCE_WINDOW = 5; // Number of recent sessions to consider
        this.ADJUSTMENT_THRESHOLD = 0.2; // Minimum change needed for adjustment
        this.analyticsEngine = new analytics_engine_1.AnalyticsEngine();
        this.dataStorage = new data_storage_1.LocalStorageManager();
    }
    // Main adaptive difficulty calculation
    calculateAdaptiveDifficulty(recentPerformance, knowledgeGaps, learningStyle) {
        const performanceAnalysis = this.analyzeRecentPerformance(recentPerformance);
        const confidenceLevel = this.calculateConfidenceLevel(recentPerformance);
        const learningVelocity = this.calculateLearningVelocity(recentPerformance);
        let currentLevel = types_1.DifficultyLevel.INTERMEDIATE;
        let recommendedLevel = types_1.DifficultyLevel.INTERMEDIATE;
        let adjustmentReason = 'Maintaining current level';
        // Determine current level from recent performance
        if (recentPerformance.length > 0) {
            currentLevel = recentPerformance[recentPerformance.length - 1].difficultyLevel;
            recommendedLevel = currentLevel;
        }
        // Difficulty adjustment logic
        if (performanceAnalysis.averageSuccess >= 0.85 && confidenceLevel >= 0.8) {
            // Student is excelling - increase difficulty
            recommendedLevel = this.increaseDifficulty(currentLevel);
            adjustmentReason = 'Excellent performance - ready for more challenge';
        }
        else if (performanceAnalysis.averageSuccess <= 0.4 && confidenceLevel >= 0.7) {
            // Student is struggling consistently - decrease difficulty
            recommendedLevel = this.decreaseDifficulty(currentLevel);
            adjustmentReason = 'Struggling with current level - stepping back to build confidence';
        }
        else if (learningVelocity < -0.1 && performanceAnalysis.trendDirection === 'declining') {
            // Performance is declining - provide support
            recommendedLevel = this.decreaseDifficulty(currentLevel);
            adjustmentReason = 'Performance declining - providing additional support';
        }
        // Consider learning style preferences
        const styleAdjustment = this.adjustForLearningStyle(recommendedLevel, learningStyle, performanceAnalysis);
        return {
            currentLevel,
            recommendedLevel: styleAdjustment.difficulty,
            confidence: confidenceLevel,
            adjustmentReason: styleAdjustment.reason || adjustmentReason
        };
    }
    // Generate personalized teaching strategy
    generateTeachingStrategy(learningStyle, currentDifficulty, knowledgeGaps) {
        // Determine primary approach based on learning style
        let primaryApproach = this.getPrimaryApproach(learningStyle);
        // Adjust approach based on difficulty level
        if (currentDifficulty === types_1.DifficultyLevel.BEGINNER) {
            primaryApproach = 'scaffolding'; // More support needed
        }
        // Generate specific strategies
        const questioningStyle = this.getQuestioningStyle(learningStyle);
        const feedbackStyle = this.getFeedbackStyle(learningStyle);
        const pacing = this.calculateOptimalPacing(learningStyle);
        return {
            primaryApproach,
            questioningStyle,
            feedbackStyle,
            pacing,
            focusAreas: this.identifyFocusAreas(knowledgeGaps),
            adaptations: this.generateAdaptations(learningStyle)
        };
    }
    // Generate recommendations based on performance and knowledge gaps
    generateRecommendations(performanceHistory, knowledgeGaps, currentDifficulty) {
        const recommendations = [];
        if (performanceHistory.length > 0) {
            const recentPerformance = performanceHistory.slice(-3);
            const avgSuccess = recentPerformance.reduce((sum, p) => sum + p.completionRate, 0) / recentPerformance.length;
            if (avgSuccess < 0.5) {
                recommendations.push('Consider reviewing fundamental concepts before proceeding');
            }
            if (recentPerformance.some((p) => p.strugglingTurns > 3)) {
                recommendations.push('Take breaks when feeling stuck - fresh perspective helps');
            }
        }
        if (knowledgeGaps.length > 0) {
            recommendations.push(`Focus on strengthening: ${knowledgeGaps[0]}`);
        }
        return recommendations;
    }
    // Generate adaptive recommendations for the session
    async generateAdaptiveRecommendations(sessionContext, studentProfile) {
        const recommendations = [];
        const sessionHistory = await this.dataStorage.loadSessionHistory();
        const recentSessions = Object.values(sessionHistory.sessions)
            .slice(-this.PERFORMANCE_WINDOW)
            .filter((s) => s.completed);
        // Performance-based recommendations
        if (recentSessions.length >= 3) {
            const performanceAnalysis = this.analyzeRecentPerformance(recentSessions.map((s) => s.performance).filter((p) => p));
            if (performanceAnalysis.averageSuccess < 0.5) {
                recommendations.push({
                    type: 'difficulty',
                    priority: 'high',
                    message: 'Consider reviewing fundamental concepts before proceeding',
                    action: 'reduce_difficulty',
                    reasoning: 'Recent performance indicates need for additional support'
                });
            }
            if (performanceAnalysis.averageTime > 300) { // 5 minutes
                recommendations.push({
                    type: 'pacing',
                    priority: 'medium',
                    message: 'Take your time - deep thinking is valuable',
                    action: 'encourage_reflection',
                    reasoning: 'Student shows thoughtful problem-solving approach'
                });
            }
        }
        // Learning style recommendations
        const styleRecommendations = this.generateStyleBasedRecommendations(studentProfile.learningStyle, sessionContext);
        recommendations.push(...styleRecommendations);
        // Knowledge gap recommendations
        if (studentProfile.analytics?.knowledgeGaps && studentProfile.analytics.knowledgeGaps.length > 0) {
            recommendations.push({
                type: 'content',
                priority: 'medium',
                message: `Consider exploring: ${studentProfile.analytics.knowledgeGaps[0]}`,
                action: 'suggest_topic',
                reasoning: 'Addressing identified knowledge gap'
            });
        }
        return recommendations.slice(0, 5); // Limit to most important recommendations
    }
    // Adjust problem selection based on adaptive insights
    async adaptProblemSelection(availableProblems, studentProfile, currentDifficulty) {
        const sessionHistory = await this.dataStorage.loadSessionHistory();
        const recentSessions = Object.values(sessionHistory.sessions).slice(-10);
        // Analyze problem type preferences
        const typePreferences = this.analyzeProblemTypePreferences(recentSessions);
        const knowledgeGaps = studentProfile.analytics?.knowledgeGaps || [];
        // Score and sort problems
        const scoredProblems = availableProblems.map(problem => ({
            ...problem,
            adaptiveScore: this.calculateProblemScore(problem, typePreferences, knowledgeGaps, currentDifficulty, studentProfile.learningStyle)
        }));
        // Return top problems, ensuring variety
        return this.ensureProblemVariety(scoredProblems.sort((a, b) => b.adaptiveScore - a.adaptiveScore)).slice(0, Math.min(5, availableProblems.length));
    }
    // Monitor and update adaptive parameters during session
    async updateAdaptiveParameters(sessionId, interactionData) {
        const profile = await this.dataStorage.loadStudentProfile();
        if (!profile)
            return;
        // Update real-time performance indicators
        const currentSession = await this.dataStorage.loadSessionState(sessionId);
        if (currentSession) {
            // Track response patterns
            if (interactionData.responseTime) {
                currentSession.adaptiveData = currentSession.adaptiveData || {};
                currentSession.adaptiveData.responseTimes =
                    currentSession.adaptiveData.responseTimes || [];
                currentSession.adaptiveData.responseTimes.push(interactionData.responseTime);
            }
            // Track struggle indicators
            if (interactionData.strugglingIndicators) {
                currentSession.adaptiveData = currentSession.adaptiveData || {};
                currentSession.adaptiveData.strugglePoints =
                    currentSession.adaptiveData.strugglePoints || [];
                currentSession.adaptiveData.strugglePoints.push({
                    timestamp: new Date(),
                    indicators: interactionData.strugglingIndicators
                });
            }
            await this.dataStorage.saveSessionState(sessionId, currentSession);
        }
    }
    // Private helper methods
    analyzeRecentPerformance(performances) {
        if (performances.length === 0) {
            return {
                averageSuccess: 0.5,
                averageTime: 0,
                trendDirection: 'stable',
                consistency: 0
            };
        }
        const successRates = performances.map((p) => p.masteryScore || 0);
        const times = performances.map((p) => p.responseTime || 0);
        const averageSuccess = successRates.reduce((a, b) => a + b, 0) / successRates.length;
        const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
        // Calculate trend
        let trendDirection = 'stable';
        if (successRates.length >= 3) {
            const recent = successRates.slice(-3);
            const earlier = successRates.slice(0, -3);
            if (earlier.length > 0) {
                const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
                const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
                const change = (recentAvg - earlierAvg) / earlierAvg;
                if (change > 0.1)
                    trendDirection = 'improving';
                else if (change < -0.1)
                    trendDirection = 'declining';
            }
        }
        // Calculate consistency (inverse of standard deviation)
        const variance = successRates.reduce((sum, rate) => sum + Math.pow(rate - averageSuccess, 2), 0) / successRates.length;
        const consistency = 1 / (1 + Math.sqrt(variance));
        return {
            averageSuccess,
            averageTime,
            trendDirection,
            consistency
        };
    }
    calculateConfidenceLevel(performances) {
        if (performances.length < 3)
            return 0.5;
        const analysis = this.analyzeRecentPerformance(performances);
        // Confidence based on consistency and sample size
        const sampleSizeConfidence = Math.min(performances.length / 10, 1);
        const consistencyConfidence = analysis.consistency;
        return (sampleSizeConfidence + consistencyConfidence) / 2;
    }
    calculateLearningVelocity(performances) {
        if (performances.length < 2)
            return 0;
        const scores = performances.map((p) => p.masteryScore || 0);
        const timePoints = scores.length;
        // Simple linear regression to find slope
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        for (let i = 0; i < timePoints; i++) {
            sumX += i;
            sumY += scores[i];
            sumXY += i * scores[i];
            sumXX += i * i;
        }
        const slope = (timePoints * sumXY - sumX * sumY) / (timePoints * sumXX - sumX * sumX);
        return slope;
    }
    increaseDifficulty(current) {
        switch (current) {
            case types_1.DifficultyLevel.BEGINNER: return types_1.DifficultyLevel.INTERMEDIATE;
            case types_1.DifficultyLevel.INTERMEDIATE: return types_1.DifficultyLevel.ADVANCED;
            case types_1.DifficultyLevel.ADVANCED: return types_1.DifficultyLevel.ADVANCED; // Max level
            default: return types_1.DifficultyLevel.INTERMEDIATE;
        }
    }
    decreaseDifficulty(current) {
        switch (current) {
            case types_1.DifficultyLevel.ADVANCED: return types_1.DifficultyLevel.INTERMEDIATE;
            case types_1.DifficultyLevel.INTERMEDIATE: return types_1.DifficultyLevel.BEGINNER;
            case types_1.DifficultyLevel.BEGINNER: return types_1.DifficultyLevel.BEGINNER; // Min level
            default: return types_1.DifficultyLevel.BEGINNER;
        }
    }
    adjustForLearningStyle(difficulty, style, performance) {
        // Analytical learners can handle complexity better
        if (style === types_1.LearningStyle.ANALYTICAL && performance.averageSuccess >= 0.7) {
            return {
                difficulty: this.increaseDifficulty(difficulty),
                reason: 'Analytical learning style - ready for increased complexity'
            };
        }
        // Visual learners may need more time with concepts
        if (style === types_1.LearningStyle.VISUAL && performance.averageTime > 200) {
            return {
                difficulty,
                reason: 'Visual learning style - allowing time for conceptual understanding'
            };
        }
        return { difficulty };
    }
    getPrimaryApproach(style) {
        switch (style) {
            case types_1.LearningStyle.VISUAL: return 'visual_scaffolding';
            case types_1.LearningStyle.ANALYTICAL: return 'logical_progression';
            case types_1.LearningStyle.EXPLORATORY: return 'guided_discovery';
            default: return 'balanced_approach';
        }
    }
    getQuestioningStyle(style) {
        switch (style) {
            case types_1.LearningStyle.ANALYTICAL: return 'probing_questions';
            case types_1.LearningStyle.EXPLORATORY: return 'open_ended_questions';
            case types_1.LearningStyle.VISUAL: return 'concrete_examples';
            default: return 'socratic_method';
        }
    }
    getQuestioningStyleWithPerformance(style, performance) {
        if (performance.averageSuccess < 0.5) {
            return 'leading_questions'; // More guidance needed
        }
        switch (style) {
            case types_1.LearningStyle.ANALYTICAL: return 'probing_questions';
            case types_1.LearningStyle.EXPLORATORY: return 'open_ended_questions';
            case types_1.LearningStyle.VISUAL: return 'concrete_examples';
            default: return 'socratic_method';
        }
    }
    getFeedbackStyle(style) {
        switch (style) {
            case types_1.LearningStyle.ANALYTICAL: return 'precise_analytical';
            case types_1.LearningStyle.VISUAL: return 'descriptive_visual';
            case types_1.LearningStyle.EXPLORATORY: return 'discovery_oriented';
            default: return 'balanced_supportive';
        }
    }
    getFeedbackStyleWithPerformance(style, performance) {
        if (performance.averageSuccess < 0.4) {
            return 'encouraging_detailed'; // More support needed
        }
        switch (style) {
            case types_1.LearningStyle.ANALYTICAL: return 'precise_analytical';
            case types_1.LearningStyle.VISUAL: return 'descriptive_visual';
            case types_1.LearningStyle.EXPLORATORY: return 'discovery_oriented';
            default: return 'balanced_supportive';
        }
    }
    calculateOptimalPacing(style) {
        switch (style) {
            case types_1.LearningStyle.ANALYTICAL: return 'deliberate';
            case types_1.LearningStyle.EXPLORATORY: return 'moderate';
            case types_1.LearningStyle.VISUAL: return 'moderate';
            default: return 'moderate';
        }
    }
    calculateOptimalPacingWithPerformance(performances, style) {
        const avgTime = performances.length > 0
            ? performances.reduce((sum, p) => sum + (p.responseTime || 0), 0) / performances.length
            : 0;
        if (avgTime > 300)
            return 'deliberate'; // 5+ minutes
        if (avgTime < 60)
            return 'rapid'; // < 1 minute
        return 'moderate';
    }
    identifyFocusAreas(gaps) {
        const areas = [];
        // Prioritize knowledge gaps
        if (gaps.length > 0) {
            areas.push(`Address gap: ${gaps[0]}`);
        }
        return areas.slice(0, 3);
    }
    identifyFocusAreasDetailed(gaps, strengths, currentTopic) {
        const areas = [];
        // Prioritize knowledge gaps
        if (gaps.length > 0) {
            areas.push(`Address gap: ${gaps[0]}`);
        }
        // Build on strengths
        if (strengths.length > 0) {
            areas.push(`Leverage strength: ${strengths[0]}`);
        }
        // Current topic focus
        areas.push(`Master: ${currentTopic}`);
        return areas.slice(0, 3);
    }
    generateAdaptations(style) {
        const adaptations = [];
        if (style === types_1.LearningStyle.VISUAL) {
            adaptations.push('Use visual representations');
            adaptations.push('Provide concrete examples');
        }
        return adaptations;
    }
    generateAdaptationsWithPerformance(style, performance) {
        const adaptations = [];
        if (performance.averageSuccess < 0.5) {
            adaptations.push('Provide additional scaffolding');
            adaptations.push('Break down complex problems');
        }
        if (style === types_1.LearningStyle.VISUAL) {
            adaptations.push('Use visual representations');
            adaptations.push('Provide concrete examples');
        }
        if (performance.averageTime > 200) {
            adaptations.push('Allow processing time');
            adaptations.push('Encourage reflection');
        }
        return adaptations;
    }
    generateStyleBasedRecommendations(style, context) {
        const recommendations = [];
        switch (style) {
            case types_1.LearningStyle.VISUAL:
                recommendations.push({
                    type: 'strategy',
                    priority: 'medium',
                    message: 'Try visualizing the problem or drawing a diagram',
                    action: 'suggest_visualization',
                    reasoning: 'Visual learning style preference'
                });
                break;
            case types_1.LearningStyle.ANALYTICAL:
                recommendations.push({
                    type: 'strategy',
                    priority: 'medium',
                    message: 'Break this down step by step',
                    action: 'encourage_analysis',
                    reasoning: 'Analytical learning style preference'
                });
                break;
            case types_1.LearningStyle.EXPLORATORY:
                recommendations.push({
                    type: 'strategy',
                    priority: 'medium',
                    message: 'What patterns do you notice?',
                    action: 'encourage_exploration',
                    reasoning: 'Exploratory learning style preference'
                });
                break;
        }
        return recommendations;
    }
    analyzeProblemTypePreferences(sessions) {
        const preferences = new Map();
        sessions.forEach(session => {
            if (session.classification?.problemType && session.performance?.masteryScore >= 0.7) {
                const type = session.classification.problemType;
                preferences.set(type, (preferences.get(type) || 0) + 1);
            }
        });
        return preferences;
    }
    calculateProblemScore(problem, typePreferences, knowledgeGaps, difficulty, style) {
        let score = 0;
        // Preference bonus
        const typePreference = typePreferences.get(problem.type) || 0;
        score += typePreference * 0.3;
        // Knowledge gap bonus
        if (knowledgeGaps.some(gap => problem.concepts?.includes(gap))) {
            score += 0.4;
        }
        // Difficulty match
        if (problem.difficulty === difficulty) {
            score += 0.3;
        }
        // Learning style match
        if (this.matchesLearningStyle(problem, style)) {
            score += 0.2;
        }
        return score;
    }
    matchesLearningStyle(problem, style) {
        switch (style) {
            case types_1.LearningStyle.VISUAL:
                return problem.hasVisualElements || problem.type === 'geometry';
            case types_1.LearningStyle.ANALYTICAL:
                return problem.type === 'algebra' || problem.type === 'logic';
            case types_1.LearningStyle.EXPLORATORY:
                return problem.type === 'word_problem' || problem.openEnded;
            default:
                return true;
        }
    }
    ensureProblemVariety(problems) {
        const types = new Set();
        const varied = [];
        // First pass: ensure type variety
        for (const problem of problems) {
            if (!types.has(problem.type) || varied.length < 3) {
                varied.push(problem);
                types.add(problem.type);
            }
        }
        // Second pass: fill remaining slots
        for (const problem of problems) {
            if (varied.length >= 5)
                break;
            if (!varied.includes(problem)) {
                varied.push(problem);
            }
        }
        return varied;
    }
}
exports.AdaptiveController = AdaptiveController;
// Export the class for direct instantiation
//# sourceMappingURL=adaptive-controller.js.map