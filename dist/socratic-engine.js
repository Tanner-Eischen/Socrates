"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocraticEngine = void 0;
// Core Socratic dialogue engine - Pure logic, no UI
const openai_1 = __importDefault(require("openai"));
const types_1 = require("./types");
const analytics_engine_1 = require("./analytics-engine");
const adaptive_controller_1 = require("./adaptive-controller");
const session_manager_1 = require("./session-manager");
class SocraticEngine {
    constructor(sessionManager) {
        this.conversation = [];
        this.problem = '';
        this.sessionId = '';
        this.currentDifficulty = types_1.DifficultyLevel.INTERMEDIATE;
        this.sessionStartTime = new Date();
        this.strugglingTurns = 0;
        this.lastResponseTime = 0;
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.analyticsEngine = new analytics_engine_1.AnalyticsEngine();
        this.adaptiveController = new adaptive_controller_1.AdaptiveController();
        this.sessionManager = sessionManager || session_manager_1.SessionManager.getInstance();
    }
    // Initialize session with student profile and adaptive features
    initializeSession(sessionId, studentProfile) {
        this.sessionId = sessionId;
        this.studentProfile = studentProfile;
        this.sessionStartTime = new Date();
        this.strugglingTurns = 0;
        if (studentProfile) {
            // Set initial difficulty based on student's performance history
            const adaptiveDifficulty = this.adaptiveController.calculateAdaptiveDifficulty(studentProfile.performanceHistory, studentProfile.knowledgeGaps, studentProfile.learningStyle);
            this.currentDifficulty = adaptiveDifficulty.currentLevel;
        }
    }
    async startProblem(problem) {
        this.problem = problem;
        // Get adaptive teaching strategy based on student profile
        let teachingStrategy = '';
        if (this.studentProfile) {
            const strategy = this.adaptiveController.generateTeachingStrategy(this.studentProfile.learningStyle, this.currentDifficulty, this.studentProfile.knowledgeGaps);
            teachingStrategy = `\n\nADAPTIVE TEACHING APPROACH:
- Primary Approach: ${strategy.primaryApproach}
- Difficulty Level: ${this.currentDifficulty}
- Focus Areas: ${strategy.focusAreas.join(', ')}
- Questioning Style: ${strategy.questioningStyle}
- Feedback Style: ${strategy.feedbackStyle}
- Pacing: ${strategy.pacing}`;
        }
        const systemPrompt = `You are a warm, supportive math tutor using the Socratic method. You're like a friendly mentor who believes in your student's ability to learn.

CRITICAL RULES - NEVER BREAK THESE:
- NEVER give direct answers or solutions
- NEVER solve the problem for the student
- If student stuck 1 turns, try reframing your guiding question
- If student stuck 2+ turns, explain an important concept or give a concrete hint followed by a guiding question.

- Keep responses focused but warm (2-3 sentences maximum)
- Ask ONE thoughtful question at a time
- Include encouraging language where appropriate: "Great thinking!", "You're on the right track!", "Let's explore this together"
- Acknowledge student efforts: "I can see you're really thinking about this", "That's a good observation"
- Use supportive questioning: "What do you think we're trying to find here?", "How might we approach this together?"
- Build confidence while guiding discovery
- Make students feel supported, not interrogated

TONE EXAMPLES:
- Instead of: "What are we solving for?" 
- Say: "Great question! Let's work through this together. What do you think we're trying to find in this equation?"
- Instead of: "What's the first step?"
- Say: "You're thinking well! What feels like a good first step to you?"

Problem to guide through: ${problem}${teachingStrategy}

Start with a warm, encouraging question about what we're trying to find. Show enthusiasm for learning together!`;
        this.conversation = [
            { role: 'system', content: systemPrompt, timestamp: new Date() }
        ];
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4',
            messages: this.conversation.map(msg => ({ role: msg.role, content: msg.content })),
            temperature: 0.7,
            max_tokens: 80
        });
        const tutorResponse = response.choices[0].message?.content || "I'm excited to work through this problem with you! What do you think we should focus on first?";
        this.conversation.push({
            role: 'assistant',
            content: tutorResponse,
            timestamp: new Date()
        });
        return tutorResponse;
    }
    async respondToStudent(studentInput) {
        const responseStartTime = Date.now();
        this.conversation.push({
            role: 'user',
            content: studentInput,
            timestamp: new Date()
        });
        // Track response time and analyze student engagement
        if (this.lastResponseTime > 0) {
            const responseTime = responseStartTime - this.lastResponseTime;
            this.trackStudentEngagement(studentInput, responseTime);
        }
        // Check if student is struggling and adjust approach
        const isStruggling = this.detectStruggling(studentInput);
        if (isStruggling) {
            this.strugglingTurns++;
        }
        else {
            this.strugglingTurns = 0;
        }
        // Get adaptive response strategy
        let adaptiveGuidance = '';
        if (this.studentProfile && this.strugglingTurns > 1) {
            const recommendations = this.adaptiveController.generateRecommendations(this.studentProfile.performanceHistory, this.studentProfile.knowledgeGaps, this.currentDifficulty);
            adaptiveGuidance = `\n\nADAPTIVE GUIDANCE: Student struggling for ${this.strugglingTurns} turns. ${recommendations.slice(0, 1).join(' ')}`;
        }
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                ...this.conversation.map(msg => ({ role: msg.role, content: msg.content })),
                ...(adaptiveGuidance ? [{ role: 'system', content: adaptiveGuidance }] : [])
            ],
            temperature: 0.7,
            max_tokens: 80
        });
        const tutorResponse = response.choices[0].message?.content || "That's interesting! Can you tell me more about your thinking?";
        this.conversation.push({
            role: 'assistant',
            content: tutorResponse,
            timestamp: new Date()
        });
        this.lastResponseTime = Date.now();
        // Save session progress if we have a session manager
        if (this.sessionId) {
            await this.sessionManager.saveSessionProgress(this.sessionId, {
                conversation: this.conversation,
                currentProblem: this.problem,
                difficulty: this.currentDifficulty,
                strugglingTurns: this.strugglingTurns
            });
        }
        return tutorResponse;
    }
    getConversationHistory() {
        return this.conversation.filter(msg => msg.role !== 'system');
    }
    getCurrentProblem() {
        return this.problem;
    }
    getConversationLength() {
        return this.conversation.filter(msg => msg.role !== 'system').length;
    }
    // Analytics and adaptive learning methods
    trackStudentEngagement(input, responseTime) {
        if (!this.studentProfile)
            return;
        // Analyze engagement based on response time and input quality
        const engagement = this.analyzeEngagement(input, responseTime);
        // Update student profile with engagement data
        if (!this.studentProfile.engagementMetrics) {
            this.studentProfile.engagementMetrics = {
                averageResponseTime: responseTime,
                totalInteractions: 1,
                engagementScore: engagement
            };
        }
        else {
            const metrics = this.studentProfile.engagementMetrics;
            metrics.averageResponseTime = (metrics.averageResponseTime * metrics.totalInteractions + responseTime) / (metrics.totalInteractions + 1);
            metrics.totalInteractions++;
            metrics.engagementScore = (metrics.engagementScore + engagement) / 2;
        }
    }
    analyzeEngagement(input, responseTime) {
        let score = 0.5; // Base engagement score
        // Response time analysis (optimal range: 10-60 seconds)
        if (responseTime >= 10000 && responseTime <= 60000) {
            score += 0.2; // Good thinking time
        }
        else if (responseTime < 5000) {
            score -= 0.1; // Too quick, might not be thinking deeply
        }
        else if (responseTime > 120000) {
            score -= 0.2; // Too long, might be disengaged
        }
        // Input quality analysis
        if (input.length > 20)
            score += 0.1; // Detailed responses
        if (input.includes('?'))
            score += 0.1; // Asking questions
        if (/because|since|therefore|so/i.test(input))
            score += 0.1; // Reasoning
        if (/i think|i believe|maybe|perhaps/i.test(input))
            score += 0.1; // Thoughtful language
        return Math.max(0, Math.min(1, score));
    }
    detectStruggling(input) {
        const strugglingIndicators = [
            /i don't know/i,
            /i'm confused/i,
            /i don't understand/i,
            /help/i,
            /stuck/i,
            /^no$/i,
            /^i give up/i,
            /^what/i // Single word "what" responses
        ];
        return strugglingIndicators.some(pattern => pattern.test(input.trim()));
    }
    // Get session performance data for analytics
    getSessionPerformance() {
        const userMessages = this.conversation.filter(msg => msg.role === 'user');
        const assistantMessages = this.conversation.filter(msg => msg.role === 'assistant');
        return {
            sessionId: this.sessionId,
            startTime: this.sessionStartTime,
            endTime: new Date(),
            totalInteractions: userMessages.length,
            problemsSolved: this.problem ? 1 : 0,
            averageResponseTime: this.studentProfile?.engagementMetrics?.averageResponseTime || 0,
            strugglingTurns: this.strugglingTurns,
            difficultyLevel: this.currentDifficulty,
            engagementScore: this.studentProfile?.engagementMetrics?.engagementScore || 0.5,
            completionRate: this.calculateCompletionRate(),
            conceptsExplored: this.extractConceptsFromConversation(),
            masteryScore: this.calculateCompletionRate(),
            conceptsLearned: this.extractConceptsFromConversation(),
            hintsUsed: this.strugglingTurns,
            struggledConcepts: []
        };
    }
    calculateCompletionRate() {
        // Simple heuristic: if conversation has meaningful exchanges, consider it progressing
        const meaningfulExchanges = this.conversation.filter(msg => msg.role === 'user' && msg.content.length > 10).length;
        return Math.min(1, meaningfulExchanges / 5); // Assume 5 exchanges for completion
    }
    extractConceptsFromConversation() {
        const concepts = [];
        const conversationText = this.conversation
            .filter(msg => msg.role !== 'system')
            .map(msg => msg.content)
            .join(' ');
        // Extract mathematical concepts mentioned
        const mathConcepts = [
            'equation', 'variable', 'solve', 'algebra', 'fraction', 'decimal',
            'addition', 'subtraction', 'multiplication', 'division', 'exponent',
            'geometry', 'triangle', 'circle', 'area', 'perimeter', 'volume'
        ];
        mathConcepts.forEach(concept => {
            if (new RegExp(concept, 'i').test(conversationText)) {
                concepts.push(concept);
            }
        });
        return [...new Set(concepts)]; // Remove duplicates
    }
    // Get current difficulty level
    getCurrentDifficulty() {
        return this.currentDifficulty;
    }
    // Update difficulty based on performance
    updateDifficulty(newDifficulty) {
        this.currentDifficulty = newDifficulty;
    }
    // Validation helper - check if response contains direct answers (for testing)
    containsDirectAnswer(response) {
        // First check if this is legitimate Socratic guidance (should NOT be flagged)
        const socraticGuidancePatterns = [
            /what does.*become\?/i, // "what does the equation become?"
            /how.*do.*that\?/i, // "how might we do that?"
            /what.*next.*step\?/i, // "what's our next step?"
            /how.*arrive.*conclusion\?/i, // "how did you arrive at that conclusion?"
            /can you.*tell me/i, // "can you tell me more?"
            /what.*think/i, // "what do you think?"
            /do you.*know/i, // "do you know how?"
            /\?.*$/ // ends with a question mark
        ];
        // If it's clearly Socratic guidance, don't flag it
        if (socraticGuidancePatterns.some(pattern => pattern.test(response))) {
            return false;
        }
        // Now check for actual direct answers (definitive statements without questions)
        const directAnswerPatterns = [
            /^the answer is\s*\d+/i, // "The answer is 4"
            /^the solution is\s*\d+/i, // "The solution is 4"
            /^x\s*=\s*\d+\.?$/i, // "x = 4." (as final statement)
            /^therefore,?\s*x\s*=\s*\d+/i, // "Therefore, x = 4"
            /^so,?\s*x\s*=\s*\d+\.?$/i, // "So, x = 4."
            /^the final answer is/i, // "The final answer is..."
            /^the result is\s*\d+/i, // "The result is 4"
            /we get\s*x\s*=\s*\d+\.?$/i, // "we get x = 4."
            /this gives us\s*x\s*=\s*\d+/i // "this gives us x = 4"
        ];
        return directAnswerPatterns.some(pattern => pattern.test(response.trim()));
    }
    convertNumericToDifficultyLevel(numericLevel) {
        if (numericLevel <= 1) {
            return types_1.DifficultyLevel.BEGINNER;
        }
        else if (numericLevel <= 2) {
            return types_1.DifficultyLevel.INTERMEDIATE;
        }
        else {
            return types_1.DifficultyLevel.ADVANCED;
        }
    }
}
exports.SocraticEngine = SocraticEngine;
//# sourceMappingURL=socratic-engine.js.map