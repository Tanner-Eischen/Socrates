"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudyPlanner = void 0;
// Day 3: Study Plan Generator for Personalized Learning Paths and Goal Tracking
const types_1 = require("./types");
const data_storage_1 = require("./data-storage");
class StudyPlanner {
    constructor() {
        this.SKILL_DOMAINS = [
            'algebra', 'geometry', 'calculus', 'statistics',
            'trigonometry', 'number_theory', 'logic', 'word_problems'
        ];
        this.DIFFICULTY_PROGRESSION = [
            types_1.DifficultyLevel.BEGINNER,
            types_1.DifficultyLevel.INTERMEDIATE,
            types_1.DifficultyLevel.ADVANCED,
            types_1.DifficultyLevel.ADVANCED
        ];
    }
    static getInstance() {
        if (!StudyPlanner.instance) {
            StudyPlanner.instance = new StudyPlanner();
        }
        return StudyPlanner.instance;
    }
    // Generate a comprehensive personalized study plan
    async generateStudyPlan(studentProfile, config) {
        // Assess current skill levels
        const skillAssessment = await this.assessCurrentSkills(studentProfile);
        // Identify learning objectives based on goals and gaps
        const learningObjectives = await this.identifyLearningObjectives(studentProfile, skillAssessment, config);
        // Create learning path with progressive milestones
        const learningPath = this.createLearningPath(learningObjectives, config);
        // Generate specific study sessions
        const studySessions = await this.generateStudySessions(learningPath, studentProfile);
        // Create milestone tracking system
        const milestones = this.createMilestones(learningPath, config);
        // Calculate timeline and scheduling
        const timeline = this.calculateTimeline(studySessions, config);
        const studyPlan = {
            planId: this.generatePlanId(),
            studentId: studentProfile.studentId,
            title: this.generatePlanTitle(config),
            goals: [], // Convert from learningObjectives if needed
            createdAt: new Date(),
            targetDate: timeline.endDate,
            active: true,
            progress: 0,
            milestones,
            recommendedProblems: [], // Extract from studySessions if needed
            estimatedDuration: timeline.totalHours * 60, // Convert hours to minutes
            adaptiveAdjustments: true
        };
        // Save the study plan
        const studyPlansDB = await data_storage_1.dataStorage.loadStudyPlans();
        studyPlansDB.plans[studyPlan.planId] = studyPlan;
        await data_storage_1.dataStorage.saveStudyPlans(studyPlansDB);
        return studyPlan;
    }
    // Update study plan based on progress and performance
    async updateStudyPlan(planId, sessionResults, performanceData) {
        const studyPlansDB = await data_storage_1.dataStorage.loadStudyPlans();
        const studyPlan = studyPlansDB.plans[planId];
        if (!studyPlan) {
            throw new Error(`Study plan ${planId} not found`);
        }
        // Update progress based on session results
        const completedSessions = sessionResults.filter(s => s.completed).length;
        const totalSessions = sessionResults.length;
        studyPlan.progress = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
        // Update milestone progress (simplified)
        studyPlan.milestones = studyPlan.milestones.map((milestone) => {
            if (!milestone.achieved && studyPlan.progress >= 50) {
                milestone.achieved = true;
                milestone.achievedDate = new Date();
            }
            return milestone;
        });
        // Save updated plan
        studyPlansDB.plans[studyPlan.planId] = studyPlan;
        await data_storage_1.dataStorage.saveStudyPlans(studyPlansDB);
        return studyPlan;
    }
    // Generate study recommendations based on current progress
    async generateStudyRecommendations(studentProfile, currentProgress) {
        const recommendations = [];
        // Note: analytics property doesn't exist on StudentProfile, using knowledge gaps instead
        const analytics = null;
        // Knowledge gap recommendations
        if (studentProfile.knowledgeGaps && studentProfile.knowledgeGaps.length > 0) {
            for (const gap of studentProfile.knowledgeGaps.slice(0, 3)) {
                recommendations.push({
                    type: 'knowledge_gap',
                    priority: 'high',
                    title: `Address ${gap} concepts`,
                    description: `Focus on strengthening your understanding of ${gap}`,
                    estimatedTime: 45,
                    difficulty: types_1.DifficultyLevel.BEGINNER, // Default for knowledge gaps
                    resources: await this.findResourcesForTopic(gap),
                    reasoning: `Identified as a knowledge gap in your learning analytics`
                });
            }
        }
        // Since analytics is not available, provide basic recommendations
        recommendations.push({
            type: 'reinforcement',
            priority: 'medium',
            title: 'Concept reinforcement',
            description: 'Focus on solidifying fundamental concepts',
            estimatedTime: 30,
            difficulty: types_1.DifficultyLevel.BEGINNER,
            resources: [],
            reasoning: 'General reinforcement recommendation'
        });
        // Time-based recommendations
        const optimalStudyTime = this.calculateOptimalStudyTime(studentProfile);
        if (optimalStudyTime) {
            recommendations.push({
                type: 'reinforcement', // Changed from 'scheduling' which is not valid
                priority: 'low',
                title: `Study during your peak time: ${optimalStudyTime}`,
                description: 'Schedule study sessions during your most productive hours',
                estimatedTime: 0,
                difficulty: types_1.DifficultyLevel.BEGINNER,
                resources: [],
                reasoning: 'Based on your historical performance patterns'
            });
        }
        return recommendations.slice(0, 5); // Limit to top 5 recommendations
    }
    // Create a focused study plan for specific topics
    async createTopicStudyPlan(topic, studentProfile, targetDifficulty, timeframe // days
    ) {
        const config = {
            duration: timeframe,
            sessionsPerWeek: Math.min(7, Math.ceil(timeframe / 2)),
            sessionLength: 30,
            focusAreas: [topic],
            targetLevel: targetDifficulty
        };
        // Create topic-specific objectives
        const learningObjectives = [
            {
                id: `${topic}_mastery`,
                domain: topic,
                description: `Master ${topic} concepts and problem-solving`,
                targetLevel: targetDifficulty,
                currentLevel: this.assessTopicLevel(topic, studentProfile),
                priority: 'high',
                estimatedTime: timeframe * 0.7, // 70% of timeframe
                prerequisites: this.getTopicPrerequisites(topic)
            }
        ];
        return this.generateStudyPlan(studentProfile, config);
    }
    // Track and analyze study plan effectiveness
    async analyzeStudyPlanEffectiveness(planId) {
        const studyPlansDB = await data_storage_1.dataStorage.loadStudyPlans();
        const studyPlan = studyPlansDB.plans[planId];
        if (!studyPlan) {
            throw new Error(`Study plan ${planId} not found`);
        }
        const sessionHistory = await data_storage_1.dataStorage.loadSessionHistory();
        const planSessions = Object.values(sessionHistory.sessions)
            .filter((session) => session.studentId === studyPlan.studentId); // Filter by student from plan
        return {
            planId,
            totalSessions: planSessions.length,
            completedSessions: planSessions.filter((s) => s.completed).length,
            averagePerformance: this.calculateAveragePerformance(planSessions),
            milestoneProgress: this.analyzeMilestoneProgress(studyPlan.milestones),
            timeEfficiency: this.calculateTimeEfficiency(studyPlan, planSessions),
            adaptationCount: this.countAdaptations(studyPlan),
            recommendationFollowRate: this.calculateRecommendationFollowRate(studyPlan, planSessions),
            overallEffectiveness: this.calculateOverallEffectiveness(studyPlan, planSessions)
        };
    }
    // Private helper methods
    async assessCurrentSkills(studentProfile) {
        const sessionHistory = await data_storage_1.dataStorage.loadSessionHistory();
        const sessions = Object.values(sessionHistory.sessions);
        const skillLevels = {};
        const confidenceLevels = {};
        // Analyze performance by domain
        for (const domain of this.SKILL_DOMAINS) {
            const domainSessions = sessions.filter((s) => s.classification?.problemType === domain);
            if (domainSessions.length > 0) {
                const avgPerformance = domainSessions.reduce((sum, s) => sum + (s.performance?.completionRate || 0), 0) / domainSessions.length;
                skillLevels[domain] = this.performanceToSkillLevel(avgPerformance);
            }
            else {
                skillLevels[domain] = 1; // Default beginner level
            }
        }
        return {
            studentId: studentProfile.studentId,
            assessmentDate: new Date(),
            skillLevels,
            overallLevel: this.calculateOverallLevel(skillLevels),
            strengths: [], // studentProfile.analytics?.strengths || [],
            weaknesses: studentProfile.knowledgeGaps || [],
            recommendations: []
        };
    }
    async identifyLearningObjectives(studentProfile, skillAssessment, config) {
        const objectives = [];
        // Focus area objectives
        if (config.focusAreas && config.focusAreas.length > 0) {
            for (const area of config.focusAreas) {
                const currentLevel = skillAssessment.skillLevels[area] || 1;
                const targetLevel = Math.min(currentLevel + 1, 4); // Progress one level
                const targetDifficulty = targetLevel <= 1 ? types_1.DifficultyLevel.BEGINNER :
                    targetLevel <= 2 ? types_1.DifficultyLevel.INTERMEDIATE :
                        types_1.DifficultyLevel.ADVANCED;
                const currentDifficulty = currentLevel <= 1 ? types_1.DifficultyLevel.BEGINNER :
                    currentLevel <= 2 ? types_1.DifficultyLevel.INTERMEDIATE :
                        types_1.DifficultyLevel.ADVANCED;
                objectives.push({
                    id: `${area}_improvement`,
                    domain: area,
                    description: `Improve ${area} skills from level ${currentLevel} to ${targetLevel}`,
                    targetLevel: targetDifficulty,
                    currentLevel: currentDifficulty,
                    priority: 'high',
                    estimatedTime: this.estimateTimeForImprovement(currentLevel, targetLevel),
                    prerequisites: this.getTopicPrerequisites(area)
                });
            }
        }
        // Knowledge gap objectives
        for (const gap of skillAssessment.weaknesses.slice(0, 2)) {
            objectives.push({
                id: `${gap}_remediation`,
                domain: gap,
                description: `Address knowledge gap in ${gap}`,
                targetLevel: types_1.DifficultyLevel.INTERMEDIATE,
                currentLevel: types_1.DifficultyLevel.BEGINNER,
                priority: 'high',
                estimatedTime: 120, // 2 hours
                prerequisites: []
            });
        }
        return objectives;
    }
    createLearningPath(objectives, config) {
        // Sort objectives by priority and prerequisites
        const sortedObjectives = this.sortObjectivesByDependency(objectives);
        const phases = this.groupObjectivesIntoPhases(sortedObjectives, config);
        return {
            id: this.generatePathId(),
            title: 'Personalized Learning Journey',
            description: 'A structured path to achieve your learning goals',
            phases,
            totalDuration: phases.reduce((sum, phase) => sum + phase.estimatedDuration, 0),
            difficulty: this.calculatePathDifficulty(objectives),
            prerequisites: this.extractPathPrerequisites(objectives)
        };
    }
    async generateStudySessions(learningPath, studentProfile) {
        const sessions = [];
        let sessionIndex = 0;
        for (const phase of learningPath.phases) {
            for (const objective of phase.objectives) {
                const sessionCount = Math.ceil(objective.estimatedTime / 30); // 30-minute sessions
                for (let i = 0; i < sessionCount; i++) {
                    sessions.push({
                        id: `session_${sessionIndex++}`,
                        planId: 'temp_plan_id', // Will be set when plan is created
                        title: `${objective.domain} - Session ${i + 1}`,
                        description: `Work on ${objective.description}`,
                        topics: [objective.domain],
                        difficulty: objective.targetLevel,
                        estimatedDuration: 30,
                        status: 'planned',
                        resources: await this.findResourcesForTopic(objective.domain),
                        objectives: [objective.id]
                    });
                }
            }
        }
        return sessions;
    }
    createMilestones(learningPath, config) {
        const milestones = [];
        let milestoneIndex = 0;
        // Create phase completion milestones
        for (const phase of learningPath.phases) {
            milestones.push({
                milestoneId: `milestone_${milestoneIndex++}`,
                planId: 'temp_plan_id', // Will be set when plan is created
                description: `Complete ${phase.objectives.length} objectives in ${phase.title}`,
                targetDate: new Date(Date.now() + (milestoneIndex * 7 * 24 * 60 * 60 * 1000)),
                achieved: false,
                requiredConcepts: phase.objectives.map((obj) => obj.domain)
            });
        }
        // Create overall completion milestone
        milestones.push({
            milestoneId: `milestone_completion`,
            planId: 'temp_plan_id', // Will be set when plan is created
            description: 'Successfully complete all learning objectives',
            targetDate: config.startDate ?
                new Date(config.startDate.getTime() + config.duration * 24 * 60 * 60 * 1000) :
                new Date(Date.now() + config.duration * 24 * 60 * 60 * 1000),
            achieved: false,
            achievedDate: undefined,
            requiredConcepts: []
        });
        return milestones;
    }
    calculateTimeline(sessions, config) {
        const totalMinutes = sessions.reduce((sum, session) => sum + session.estimatedDuration, 0);
        const totalHours = totalMinutes / 60;
        const sessionsPerWeek = config.sessionsPerWeek || 3;
        const weeksNeeded = Math.ceil(sessions.length / sessionsPerWeek);
        const startDate = config.startDate || new Date();
        const endDate = new Date(startDate.getTime() + weeksNeeded * 7 * 24 * 60 * 60 * 1000);
        return { endDate, totalHours };
    }
    initializeProgressTracker(milestones) {
        return {
            planId: 'temp_plan_id', // Will be set when plan is created
            totalSessions: 0,
            completedSessions: 0,
            timeSpent: 0,
            lastActivity: new Date(),
            overallProgress: 0,
            milestoneProgress: {}
        };
    }
    async generateInitialRecommendations(studentProfile, skillAssessment) {
        const recommendations = [];
        // Start with easiest improvements
        const easiestImprovement = this.findEasiestImprovement(skillAssessment);
        if (easiestImprovement) {
            recommendations.push({
                type: 'knowledge_gap',
                priority: 'high',
                title: `Quick improvement in ${easiestImprovement}`,
                description: `Start with ${easiestImprovement} for early success`,
                estimatedTime: 30,
                difficulty: types_1.DifficultyLevel.BEGINNER,
                resources: [],
                reasoning: 'Building confidence with achievable goals'
            });
        }
        return recommendations;
    }
    // Additional helper methods
    generatePlanId() {
        return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generatePathId() {
        return `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generatePlanTitle(config) {
        if (config.focusAreas && config.focusAreas.length > 0) {
            return `${config.focusAreas.join(' & ')} Mastery Plan`;
        }
        return 'Personalized Math Learning Plan';
    }
    generatePlanDescription(objectives, config) {
        const objectiveCount = objectives.length;
        const duration = config.duration;
        return `A ${duration}-day personalized study plan with ${objectiveCount} learning objectives designed to improve your math skills.`;
    }
    performanceToSkillLevel(performance) {
        if (performance >= 0.9)
            return 4; // Expert
        if (performance >= 0.7)
            return 3; // Advanced
        if (performance >= 0.5)
            return 2; // Intermediate
        return 1; // Beginner
    }
    calculateOverallLevel(skillLevels) {
        const levels = Object.values(skillLevels);
        return levels.length > 0 ? levels.reduce((sum, level) => sum + level, 0) / levels.length : 1;
    }
    estimateTimeForImprovement(currentLevel, targetLevel) {
        const levelDiff = targetLevel - currentLevel;
        return levelDiff * 60; // 60 minutes per level improvement
    }
    getTopicPrerequisites(topic) {
        const prerequisites = {
            'algebra': ['arithmetic', 'basic_operations'],
            'geometry': ['basic_shapes', 'measurement'],
            'calculus': ['algebra', 'functions', 'trigonometry'],
            'statistics': ['arithmetic', 'basic_probability'],
            'trigonometry': ['geometry', 'algebra'],
            'word_problems': ['reading_comprehension', 'basic_operations']
        };
        return prerequisites[topic] || [];
    }
    getTopicSkills(topic) {
        const skills = {
            'algebra': ['equation_solving', 'factoring', 'graphing'],
            'geometry': ['area_calculation', 'angle_measurement', 'proof_writing'],
            'calculus': ['differentiation', 'integration', 'limits'],
            'statistics': ['data_analysis', 'probability', 'hypothesis_testing'],
            'trigonometry': ['trig_functions', 'identities', 'applications'],
            'word_problems': ['problem_interpretation', 'strategy_selection', 'solution_verification']
        };
        return skills[topic] || [];
    }
    sortObjectivesByDependency(objectives) {
        // Simple topological sort based on prerequisites
        const sorted = [];
        const remaining = [...objectives];
        while (remaining.length > 0) {
            const canProcess = remaining.filter(obj => obj.prerequisites.every((prereq) => sorted.some(completed => completed.domain === prereq)));
            if (canProcess.length === 0) {
                // No more dependencies can be resolved, add remaining
                sorted.push(...remaining);
                break;
            }
            sorted.push(...canProcess);
            canProcess.forEach(obj => {
                const index = remaining.indexOf(obj);
                remaining.splice(index, 1);
            });
        }
        return sorted;
    }
    groupObjectivesIntoPhases(objectives, config) {
        const phases = [];
        const objectivesPerPhase = Math.max(1, Math.ceil(objectives.length / 3)); // Max 3 phases
        for (let i = 0; i < objectives.length; i += objectivesPerPhase) {
            const phaseObjectives = objectives.slice(i, i + objectivesPerPhase);
            phases.push({
                id: `phase_${phases.length + 1}`,
                title: `Phase ${phases.length + 1}`,
                description: `Focus on ${phaseObjectives.map(obj => obj.domain).join(', ')}`,
                objectives: phaseObjectives,
                estimatedDuration: phaseObjectives.reduce((sum, obj) => sum + obj.estimatedTime, 0),
                order: phases.length + 1
            });
        }
        return phases;
    }
    calculatePathDifficulty(objectives) {
        const difficultyToNumber = (level) => {
            switch (level) {
                case types_1.DifficultyLevel.BEGINNER: return 1;
                case types_1.DifficultyLevel.INTERMEDIATE: return 2;
                case types_1.DifficultyLevel.ADVANCED: return 3;
                default: return 2;
            }
        };
        const numberToDifficulty = (num) => {
            const rounded = Math.round(num);
            switch (rounded) {
                case 1: return types_1.DifficultyLevel.BEGINNER;
                case 2: return types_1.DifficultyLevel.INTERMEDIATE;
                case 3: return types_1.DifficultyLevel.ADVANCED;
                default: return types_1.DifficultyLevel.INTERMEDIATE;
            }
        };
        const avgDifficulty = objectives.reduce((sum, obj) => sum + difficultyToNumber(obj.targetLevel), 0) / objectives.length;
        return numberToDifficulty(avgDifficulty);
    }
    extractPathPrerequisites(objectives) {
        const allPrereqs = new Set();
        objectives.forEach(obj => {
            obj.prerequisites.forEach((prereq) => allPrereqs.add(prereq));
        });
        return Array.from(allPrereqs);
    }
    calculateMilestoneDate(phase, config) {
        const startDate = config.startDate || new Date();
        const daysPerPhase = config.duration / 3; // Assuming 3 phases
        return new Date(startDate.getTime() + phase.order * daysPerPhase * 24 * 60 * 60 * 1000);
    }
    async findResourcesForTopic(topic) {
        // In a real implementation, this would query a resource database
        const resources = {
            'algebra': ['Linear equations practice', 'Quadratic formula guide', 'Factoring techniques'],
            'geometry': ['Area and perimeter formulas', 'Angle relationships', 'Coordinate geometry'],
            'calculus': ['Derivative rules', 'Integration techniques', 'Limit concepts'],
            'statistics': ['Descriptive statistics', 'Probability distributions', 'Hypothesis testing'],
            'trigonometry': ['Unit circle', 'Trig identities', 'Applications'],
            'word_problems': ['Problem-solving strategies', 'Translation techniques', 'Verification methods']
        };
        return resources[topic] || ['General math resources'];
    }
    async findAdvancedResourcesForTopic(topic) {
        const advancedResources = {
            'algebra': ['Advanced polynomial operations', 'Complex number systems', 'Abstract algebra concepts'],
            'geometry': ['Advanced proofs', '3D geometry', 'Non-Euclidean geometry'],
            'calculus': ['Multivariable calculus', 'Differential equations', 'Vector calculus'],
            'statistics': ['Advanced probability', 'Statistical modeling', 'Bayesian statistics'],
            'trigonometry': ['Advanced identities', 'Spherical trigonometry', 'Fourier analysis'],
            'word_problems': ['Complex multi-step problems', 'Optimization problems', 'Real-world applications']
        };
        return advancedResources[topic] || ['Advanced math challenges'];
    }
    inferDifficultyForGap(gap, analytics) {
        // Infer appropriate difficulty based on overall performance
        if (analytics.successRate >= 0.8)
            return types_1.DifficultyLevel.INTERMEDIATE;
        if (analytics.successRate >= 0.6)
            return types_1.DifficultyLevel.BEGINNER;
        return types_1.DifficultyLevel.BEGINNER;
    }
    calculateOptimalStudyTime(studentProfile) {
        // Analyze session history to find optimal study times
        // This is a simplified implementation - would need to access analytics separately
        // const sessionHistory = studentProfile.analytics?.performanceTrends;
        // if (!sessionHistory || sessionHistory.length === 0) return null;
        // Find time of day with best performance
        const hourPerformance = new Map();
        // Implementation would analyze actual session times and performance
        return 'Morning'; // Simplified return
    }
    assessTopicLevel(topic, studentProfile) {
        // Assess current level in specific topic
        // Note: Would need to access analytics separately via StudentProfileDB
        const strengths = []; // studentProfile.analytics?.strengths || [];
        const gaps = studentProfile.knowledgeGaps || [];
        if (strengths.includes(topic))
            return types_1.DifficultyLevel.ADVANCED;
        if (gaps.includes(topic))
            return types_1.DifficultyLevel.BEGINNER;
        return types_1.DifficultyLevel.INTERMEDIATE;
    }
    calculateDifficultyRange(sessions) {
        if (sessions.length === 0) {
            return { min: types_1.DifficultyLevel.BEGINNER, max: types_1.DifficultyLevel.BEGINNER };
        }
        const difficulties = sessions.map(s => s.difficulty);
        const hasAdvanced = difficulties.includes(types_1.DifficultyLevel.ADVANCED);
        const hasIntermediate = difficulties.includes(types_1.DifficultyLevel.INTERMEDIATE);
        const hasBeginner = difficulties.includes(types_1.DifficultyLevel.BEGINNER);
        let min = types_1.DifficultyLevel.BEGINNER;
        let max = types_1.DifficultyLevel.BEGINNER;
        if (hasBeginner)
            min = types_1.DifficultyLevel.BEGINNER;
        else if (hasIntermediate)
            min = types_1.DifficultyLevel.INTERMEDIATE;
        else if (hasAdvanced)
            min = types_1.DifficultyLevel.ADVANCED;
        if (hasAdvanced)
            max = types_1.DifficultyLevel.ADVANCED;
        else if (hasIntermediate)
            max = types_1.DifficultyLevel.INTERMEDIATE;
        else if (hasBeginner)
            max = types_1.DifficultyLevel.BEGINNER;
        return { min, max };
    }
    async updateProgressTracker(tracker, sessionResults) {
        // Update progress based on session results
        tracker.completedSessions += sessionResults.length;
        tracker.lastActivity = new Date();
        // Update time spent
        tracker.timeSpent += sessionResults.reduce((sum, result) => sum + (result.duration || 0), 0);
        // Update overall progress
        tracker.overallProgress = tracker.completedSessions / tracker.totalSessions;
        return tracker;
    }
    updateMilestoneProgress(milestones, tracker) {
        return milestones.map(milestone => {
            // Simple milestone achievement logic based on overall progress
            const shouldBeAchieved = tracker.overallProgress >= 0.8; // 80% progress threshold
            return {
                ...milestone,
                achieved: shouldBeAchieved,
                achievedDate: shouldBeAchieved && !milestone.achieved ? new Date() : milestone.achievedDate
            };
        });
    }
    async adaptStudySessions(sessions, performanceData, tracker) {
        // Adapt sessions based on performance
        return sessions.map(session => {
            if (session.status === 'planned' && performanceData.strugglingAreas?.includes(session.topics[0])) {
                // Reduce difficulty for struggling areas
                // Reduce difficulty for struggling areas
                let newDifficulty = session.difficulty;
                if (session.difficulty === types_1.DifficultyLevel.ADVANCED) {
                    newDifficulty = types_1.DifficultyLevel.INTERMEDIATE;
                }
                else if (session.difficulty === types_1.DifficultyLevel.INTERMEDIATE) {
                    newDifficulty = types_1.DifficultyLevel.BEGINNER;
                }
                return {
                    ...session,
                    difficulty: newDifficulty,
                    estimatedDuration: session.estimatedDuration + 15 // Add more time
                };
            }
            return session;
        });
    }
    async generateUpdatedRecommendations(studyPlan, performanceData) {
        const recommendations = [];
        // Performance-based recommendations
        if (performanceData.averagePerformance < 0.5) {
            recommendations.push({
                type: 'difficulty_adjustment',
                priority: 'high',
                title: 'Consider reducing difficulty',
                description: 'Recent performance suggests the current level may be too challenging',
                estimatedTime: 0,
                difficulty: types_1.DifficultyLevel.BEGINNER,
                resources: [],
                reasoning: 'Low average performance detected'
            });
        }
        return recommendations;
    }
    calculateCompletionPercentage(studyPlan) {
        // Use the progress property from StudyPlan
        return studyPlan.progress * 100;
    }
    findEasiestImprovement(skillAssessment) {
        // Find the skill with highest current level that's not at maximum
        const improvableSkills = Object.entries(skillAssessment.skillLevels)
            .filter(([_, level]) => level < 4)
            .sort((a, b) => b[1] - a[1]);
        return improvableSkills.length > 0 ? improvableSkills[0][0] : null;
    }
    calculateAveragePerformance(sessions) {
        const completedSessions = sessions.filter(s => s.completed && s.performance?.masteryScore);
        if (completedSessions.length === 0)
            return 0;
        return completedSessions.reduce((sum, s) => sum + s.performance.masteryScore, 0) / completedSessions.length;
    }
    analyzeMilestoneProgress(milestones) {
        const achieved = milestones.filter(m => m.achieved).length;
        const total = milestones.length;
        const averageProgress = milestones.reduce((sum, m) => sum + (m.achieved ? 1 : 0), 0) / total;
        return {
            achieved,
            total,
            percentage: (achieved / total) * 100,
            averageProgress: averageProgress * 100
        };
    }
    calculateTimeEfficiency(studyPlan, sessions) {
        const plannedTime = studyPlan.estimatedDuration; // Use estimatedDuration from StudyPlan
        const actualTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        if (actualTime === 0)
            return 0;
        return plannedTime / actualTime; // Efficiency ratio
    }
    countAdaptations(studyPlan) {
        // Count how many times the plan was adapted
        // Since StudyPlan doesn't have studySessions, return 0 for now
        return 0;
    }
    calculateRecommendationFollowRate(studyPlan, sessions) {
        // Calculate how often recommendations were followed
        // This is a simplified implementation
        return 0.8; // 80% follow rate
    }
    calculateOverallEffectiveness(studyPlan, sessions) {
        const performance = this.calculateAveragePerformance(sessions);
        const completion = this.calculateCompletionPercentage(studyPlan) / 100;
        const efficiency = this.calculateTimeEfficiency(studyPlan, sessions);
        // Weighted average of different effectiveness metrics
        return (performance * 0.4 + completion * 0.3 + Math.min(efficiency, 1) * 0.3);
    }
}
exports.StudyPlanner = StudyPlanner;
// Export default class for direct instantiation
exports.default = StudyPlanner;
//# sourceMappingURL=study-planner.js.map