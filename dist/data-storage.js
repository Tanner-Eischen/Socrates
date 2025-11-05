"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataStorage = exports.LocalStorageManager = void 0;
// Day 3: Local Data Storage System with Privacy-Focused Encryption
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const types_1 = require("./types");
class LocalStorageManager {
    constructor(dataDirectory = './data', enableEncryption = true) {
        this.dataPath = path.resolve(dataDirectory);
        this.encryptionEnabled = enableEncryption;
    }
    // Initialize storage directory
    async initialize() {
        try {
            await fs.mkdir(this.dataPath, { recursive: true });
            console.log(`📁 Data storage initialized at: ${this.dataPath}`);
        }
        catch (error) {
            console.error('❌ Failed to initialize data storage:', error);
            throw error;
        }
    }
    // Student Profile Management
    async saveStudentProfile(profile) {
        try {
            const filePath = path.join(this.dataPath, 'profile.json');
            const data = this.encryptionEnabled ? this.encrypt(JSON.stringify(profile, null, 2)) : JSON.stringify(profile, null, 2);
            await fs.writeFile(filePath, data, 'utf8');
        }
        catch (error) {
            console.error('❌ Failed to save student profile:', error);
            throw error;
        }
    }
    async loadStudentProfile() {
        try {
            const filePath = path.join(this.dataPath, 'profile.json');
            const data = await fs.readFile(filePath, 'utf8');
            const decrypted = this.encryptionEnabled ? this.decrypt(data) : data;
            const parsed = JSON.parse(decrypted);
            // Convert date strings back to Date objects
            return this.deserializeProfile(parsed);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null; // File doesn't exist yet
            }
            console.error('❌ Failed to load student profile:', error);
            return null;
        }
    }
    // Session History Management
    async saveSessionHistory(history) {
        try {
            const filePath = path.join(this.dataPath, 'sessions.json');
            const data = this.encryptionEnabled ? this.encrypt(JSON.stringify(history, null, 2)) : JSON.stringify(history, null, 2);
            await fs.writeFile(filePath, data, 'utf8');
        }
        catch (error) {
            console.error('❌ Failed to save session history:', error);
            throw error;
        }
    }
    async loadSessionHistory() {
        try {
            const filePath = path.join(this.dataPath, 'sessions.json');
            const data = await fs.readFile(filePath, 'utf8');
            const decrypted = this.encryptionEnabled ? this.decrypt(data) : data;
            const parsed = JSON.parse(decrypted);
            // Convert date strings back to Date objects
            return this.deserializeSessionHistory(parsed);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return { sessions: {} }; // Return empty structure if file doesn't exist
            }
            console.error('❌ Failed to load session history:', error);
            return { sessions: {} };
        }
    }
    // Study Plans Management
    async saveStudyPlans(plans) {
        try {
            const filePath = path.join(this.dataPath, 'study-plans.json');
            const data = this.encryptionEnabled ? this.encrypt(JSON.stringify(plans, null, 2)) : JSON.stringify(plans, null, 2);
            await fs.writeFile(filePath, data, 'utf8');
        }
        catch (error) {
            console.error('❌ Failed to save study plans:', error);
            throw error;
        }
    }
    async loadStudyPlans() {
        try {
            const filePath = path.join(this.dataPath, 'study-plans.json');
            const data = await fs.readFile(filePath, 'utf8');
            const decrypted = this.encryptionEnabled ? this.decrypt(data) : data;
            const parsed = JSON.parse(decrypted);
            // Convert date strings back to Date objects
            return this.deserializeStudyPlans(parsed);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return { plans: {} }; // Return empty structure if file doesn't exist
            }
            console.error('❌ Failed to load study plans:', error);
            return { plans: {} };
        }
    }
    async saveSessionState(sessionIdOrState, state) {
        try {
            let sessionState;
            if (typeof sessionIdOrState === 'string' && state) {
                // Called with sessionId and state
                sessionState = state;
                sessionState.sessionId = sessionIdOrState;
            }
            else if (typeof sessionIdOrState === 'object') {
                // Called with just state
                sessionState = sessionIdOrState;
            }
            else {
                throw new Error('Invalid arguments for saveSessionState');
            }
            const states = await this.loadSessionStates();
            states.states[sessionState.sessionId] = sessionState;
            const filePath = path.join(this.dataPath, 'session-states.json');
            const data = this.encryptionEnabled ? this.encrypt(JSON.stringify(states, null, 2)) : JSON.stringify(states, null, 2);
            await fs.writeFile(filePath, data, 'utf8');
        }
        catch (error) {
            console.error('❌ Failed to save session state:', error);
            throw error;
        }
    }
    async loadSessionStates() {
        try {
            const filePath = path.join(this.dataPath, 'session-states.json');
            const data = await fs.readFile(filePath, 'utf8');
            const decrypted = this.encryptionEnabled ? this.decrypt(data) : data;
            const parsed = JSON.parse(decrypted);
            // Convert date strings back to Date objects
            return this.deserializeSessionStates(parsed);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return { states: {} }; // Return empty structure if file doesn't exist
            }
            console.error('❌ Failed to load session states:', error);
            return { states: {} };
        }
    }
    async loadSessionState(sessionId) {
        try {
            const states = await this.loadSessionStates();
            return states.states[sessionId] || null;
        }
        catch (error) {
            console.error('❌ Failed to load session state:', error);
            return null;
        }
    }
    async getResumableSessions() {
        const states = await this.loadSessionStates();
        return Object.values(states.states).filter((state) => state.canResume);
    }
    async clearOldSessionStates(maxAgeHours = 24) {
        const states = await this.loadSessionStates();
        const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
        Object.keys(states.states).forEach(sessionId => {
            if (states.states[sessionId].lastActivity < cutoffTime) {
                delete states.states[sessionId];
            }
        });
        const filePath = path.join(this.dataPath, 'session-states.json');
        const data = this.encryptionEnabled ? this.encrypt(JSON.stringify(states, null, 2)) : JSON.stringify(states, null, 2);
        await fs.writeFile(filePath, data, 'utf8');
    }
    // Data Export and Backup
    async exportData(format = 'json') {
        try {
            const profile = await this.loadStudentProfile();
            const sessions = await this.loadSessionHistory();
            const plans = await this.loadStudyPlans();
            const exportData = {
                exportDate: new Date().toISOString(),
                profile,
                sessions,
                plans,
                metadata: {
                    totalSessions: Object.keys(sessions.sessions).length,
                    totalPlans: Object.keys(plans.plans).length,
                    dataVersion: '3.0'
                }
            };
            switch (format) {
                case 'json':
                    return JSON.stringify(exportData, null, 2);
                case 'csv':
                    return this.convertToCSV(exportData);
                case 'txt':
                    return this.convertToText(exportData);
                default:
                    return JSON.stringify(exportData, null, 2);
            }
        }
        catch (error) {
            console.error('❌ Failed to export data:', error);
            throw error;
        }
    }
    async createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = path.join(this.dataPath, 'backups');
            await fs.mkdir(backupDir, { recursive: true });
            const exportData = await this.exportData('json');
            const backupPath = path.join(backupDir, `backup-${timestamp}.json`);
            await fs.writeFile(backupPath, exportData, 'utf8');
            return backupPath;
        }
        catch (error) {
            console.error('❌ Failed to create backup:', error);
            throw error;
        }
    }
    // Privacy-focused encryption (simple but effective for local storage)
    encrypt(data) {
        if (!this.encryptionEnabled)
            return data;
        // Simple Base64 encoding with rotation for local privacy
        // Note: This is not cryptographically secure, but provides basic privacy for local files
        const rotated = data.split('').map(char => String.fromCharCode(char.charCodeAt(0) + 3)).join('');
        return Buffer.from(rotated).toString('base64');
    }
    decrypt(data) {
        if (!this.encryptionEnabled)
            return data;
        try {
            const decoded = Buffer.from(data, 'base64').toString();
            return decoded.split('').map(char => String.fromCharCode(char.charCodeAt(0) - 3)).join('');
        }
        catch (error) {
            console.error('❌ Failed to decrypt data:', error);
            throw error;
        }
    }
    // Deserialization helpers to convert date strings back to Date objects
    deserializeProfile(data) {
        if (data.profile) {
            data.profile.createdAt = new Date(data.profile.createdAt);
            data.profile.lastActive = new Date(data.profile.lastActive);
        }
        if (data.analytics) {
            data.analytics.lastUpdated = new Date(data.analytics.lastUpdated);
            if (data.analytics.performanceTrends) {
                data.analytics.performanceTrends = data.analytics.performanceTrends.map((trend) => ({
                    ...trend,
                    date: new Date(trend.date)
                }));
            }
        }
        return data;
    }
    deserializeSessionHistory(data) {
        Object.keys(data.sessions).forEach(sessionId => {
            const session = data.sessions[sessionId];
            session.startTime = new Date(session.startTime);
            if (session.endTime)
                session.endTime = new Date(session.endTime);
            if (session.conversationHistory) {
                session.conversationHistory = session.conversationHistory.map((msg) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));
            }
        });
        return data;
    }
    deserializeStudyPlans(data) {
        Object.keys(data.plans).forEach(planId => {
            const plan = data.plans[planId];
            plan.createdAt = new Date(plan.createdAt);
            plan.targetDate = new Date(plan.targetDate);
            if (plan.goals) {
                plan.goals = plan.goals.map((goal) => ({
                    ...goal,
                    targetDate: new Date(goal.targetDate),
                    achievedDate: goal.achievedDate ? new Date(goal.achievedDate) : undefined
                }));
            }
            if (plan.milestones) {
                plan.milestones = plan.milestones.map((milestone) => ({
                    ...milestone,
                    targetDate: new Date(milestone.targetDate),
                    achievedDate: milestone.achievedDate ? new Date(milestone.achievedDate) : undefined
                }));
            }
        });
        return data;
    }
    deserializeSessionStates(data) {
        Object.keys(data.states).forEach(sessionId => {
            const state = data.states[sessionId];
            state.lastActivity = new Date(state.lastActivity);
            if (state.conversationHistory) {
                state.conversationHistory = state.conversationHistory.map((msg) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));
            }
        });
        return data;
    }
    // Format conversion helpers
    convertToCSV(data) {
        let csv = 'Type,Date,Value,Details\n';
        // Add session data
        Object.values(data.sessions.sessions).forEach((session) => {
            csv += `Session,${session.startTime},${session.performance.masteryScore},"${session.summary}"\n`;
        });
        return csv;
    }
    convertToText(data) {
        let text = `SocraTeach Learning Report\n`;
        text += `Generated: ${data.exportDate}\n\n`;
        if (data.profile) {
            text += `Student Profile:\n`;
            text += `- Total Sessions: ${data.profile.profile.totalSessions}\n`;
            text += `- Current Level: ${data.profile.profile.currentLevel}\n`;
            text += `- Learning Style: ${data.profile.profile.learningStyle}\n`;
            text += `- Success Rate: ${(data.profile.analytics.successRate * 100).toFixed(1)}%\n\n`;
        }
        return text;
    }
    // Create default student profile
    createDefaultProfile(studentId = 'default') {
        const now = new Date();
        return {
            studentId,
            profile: {
                id: studentId,
                studentId,
                name: 'Student',
                createdAt: now,
                lastActive: now,
                totalSessions: 0,
                currentLevel: 1,
                learningStyle: types_1.LearningStyle.ANALYTICAL,
                preferences: {
                    sessionLength: 30,
                    difficultyPreference: 'adaptive',
                    feedbackLevel: 'detailed',
                    feedbackStyle: 'encouraging'
                },
                performanceHistory: [],
                knowledgeGaps: []
            },
            analytics: {
                studentId,
                successRate: 0,
                averageSessionTime: 0,
                learningVelocity: 0,
                knowledgeGaps: [],
                strengths: [],
                performanceTrends: [],
                lastUpdated: now
            }
        };
    }
}
exports.LocalStorageManager = LocalStorageManager;
// Singleton instance for global access
exports.dataStorage = new LocalStorageManager();
//# sourceMappingURL=data-storage.js.map