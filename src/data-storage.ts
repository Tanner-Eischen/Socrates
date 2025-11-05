// Day 3: Local Data Storage System with Privacy-Focused Encryption
import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  StudentProfileDB, 
  SessionHistoryDB, 
  StudyPlanDB, 
  SessionStateDB,
  StudentProfile,
  LearningAnalytics,
  SessionPerformance,
  StudyPlan,
  SessionState,
  LearningStyle
} from './types';

export class LocalStorageManager {
  private dataPath: string;
  private encryptionEnabled: boolean;

  constructor(dataDirectory: string = './data', enableEncryption: boolean = true) {
    this.dataPath = path.resolve(dataDirectory);
    this.encryptionEnabled = enableEncryption;
  }

  // Initialize storage directory
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      console.log(`📁 Data storage initialized at: ${this.dataPath}`);
    } catch (error) {
      console.error('❌ Failed to initialize data storage:', error);
      throw error;
    }
  }

  // Student Profile Management
  async saveStudentProfile(profile: StudentProfileDB): Promise<void> {
    try {
      const filePath = path.join(this.dataPath, 'profile.json');
      const data = this.encryptionEnabled ? this.encrypt(JSON.stringify(profile, null, 2)) : JSON.stringify(profile, null, 2);
      await fs.writeFile(filePath, data, 'utf8');
    } catch (error) {
      console.error('❌ Failed to save student profile:', error);
      throw error;
    }
  }

  async loadStudentProfile(): Promise<StudentProfileDB | null> {
    try {
      const filePath = path.join(this.dataPath, 'profile.json');
      const data = await fs.readFile(filePath, 'utf8');
      const decrypted = this.encryptionEnabled ? this.decrypt(data) : data;
      const parsed = JSON.parse(decrypted);
      
      // Convert date strings back to Date objects
      return this.deserializeProfile(parsed);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null; // File doesn't exist yet
      }
      console.error('❌ Failed to load student profile:', error);
      return null;
    }
  }

  // Session History Management
  async saveSessionHistory(history: SessionHistoryDB): Promise<void> {
    try {
      const filePath = path.join(this.dataPath, 'sessions.json');
      const data = this.encryptionEnabled ? this.encrypt(JSON.stringify(history, null, 2)) : JSON.stringify(history, null, 2);
      await fs.writeFile(filePath, data, 'utf8');
    } catch (error) {
      console.error('❌ Failed to save session history:', error);
      throw error;
    }
  }

  async loadSessionHistory(): Promise<SessionHistoryDB> {
    try {
      const filePath = path.join(this.dataPath, 'sessions.json');
      const data = await fs.readFile(filePath, 'utf8');
      const decrypted = this.encryptionEnabled ? this.decrypt(data) : data;
      const parsed = JSON.parse(decrypted);
      
      // Convert date strings back to Date objects
      return this.deserializeSessionHistory(parsed);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return { sessions: {} }; // Return empty structure if file doesn't exist
      }
      console.error('❌ Failed to load session history:', error);
      return { sessions: {} };
    }
  }

  // Study Plans Management
  async saveStudyPlans(plans: StudyPlanDB): Promise<void> {
    try {
      const filePath = path.join(this.dataPath, 'study-plans.json');
      const data = this.encryptionEnabled ? this.encrypt(JSON.stringify(plans, null, 2)) : JSON.stringify(plans, null, 2);
      await fs.writeFile(filePath, data, 'utf8');
    } catch (error) {
      console.error('❌ Failed to save study plans:', error);
      throw error;
    }
  }

  async loadStudyPlans(): Promise<StudyPlanDB> {
    try {
      const filePath = path.join(this.dataPath, 'study-plans.json');
      const data = await fs.readFile(filePath, 'utf8');
      const decrypted = this.encryptionEnabled ? this.decrypt(data) : data;
      const parsed = JSON.parse(decrypted);
      
      // Convert date strings back to Date objects
      return this.deserializeStudyPlans(parsed);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return { plans: {} }; // Return empty structure if file doesn't exist
      }
      console.error('❌ Failed to load study plans:', error);
      return { plans: {} };
    }
  }

  // Session State Management (for resumable sessions)
  async saveSessionState(sessionId: string, state: SessionState): Promise<void>;
  async saveSessionState(state: SessionState): Promise<void>;
  async saveSessionState(sessionIdOrState: string | SessionState, state?: SessionState): Promise<void> {
    try {
      let sessionState: SessionState;
      
      if (typeof sessionIdOrState === 'string' && state) {
        // Called with sessionId and state
        sessionState = state;
        sessionState.sessionId = sessionIdOrState;
      } else if (typeof sessionIdOrState === 'object') {
        // Called with just state
        sessionState = sessionIdOrState;
      } else {
        throw new Error('Invalid arguments for saveSessionState');
      }

      const states = await this.loadSessionStates();
      states.states[sessionState.sessionId] = sessionState;
      
      const filePath = path.join(this.dataPath, 'session-states.json');
      const data = this.encryptionEnabled ? this.encrypt(JSON.stringify(states, null, 2)) : JSON.stringify(states, null, 2);
      await fs.writeFile(filePath, data, 'utf8');
    } catch (error) {
      console.error('❌ Failed to save session state:', error);
      throw error;
    }
  }

  async loadSessionStates(): Promise<SessionStateDB> {
    try {
      const filePath = path.join(this.dataPath, 'session-states.json');
      const data = await fs.readFile(filePath, 'utf8');
      const decrypted = this.encryptionEnabled ? this.decrypt(data) : data;
      const parsed = JSON.parse(decrypted);
      
      // Convert date strings back to Date objects
      return this.deserializeSessionStates(parsed);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return { states: {} }; // Return empty structure if file doesn't exist
      }
      console.error('❌ Failed to load session states:', error);
      return { states: {} };
    }
  }

  async loadSessionState(sessionId: string): Promise<SessionState | null> {
    try {
      const states = await this.loadSessionStates();
      return states.states[sessionId] || null;
    } catch (error) {
      console.error('❌ Failed to load session state:', error);
      return null;
    }
  }

  async getResumableSessions(): Promise<SessionState[]> {
    const states = await this.loadSessionStates();
    return Object.values(states.states).filter((state: SessionState) => state.canResume);
  }

  async clearOldSessionStates(maxAgeHours: number = 24): Promise<void> {
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
  async exportData(format: 'json' | 'csv' | 'txt' = 'json'): Promise<string> {
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
    } catch (error) {
      console.error('❌ Failed to export data:', error);
      throw error;
    }
  }

  async createBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(this.dataPath, 'backups');
      await fs.mkdir(backupDir, { recursive: true });
      
      const exportData = await this.exportData('json');
      const backupPath = path.join(backupDir, `backup-${timestamp}.json`);
      await fs.writeFile(backupPath, exportData, 'utf8');
      
      return backupPath;
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw error;
    }
  }

  // Privacy-focused encryption (simple but effective for local storage)
  private encrypt(data: string): string {
    if (!this.encryptionEnabled) return data;
    
    // Simple Base64 encoding with rotation for local privacy
    // Note: This is not cryptographically secure, but provides basic privacy for local files
    const rotated = data.split('').map(char => 
      String.fromCharCode(char.charCodeAt(0) + 3)
    ).join('');
    return Buffer.from(rotated).toString('base64');
  }

  private decrypt(data: string): string {
    if (!this.encryptionEnabled) return data;
    
    try {
      const decoded = Buffer.from(data, 'base64').toString();
      return decoded.split('').map(char => 
        String.fromCharCode(char.charCodeAt(0) - 3)
      ).join('');
    } catch (error) {
      console.error('❌ Failed to decrypt data:', error);
      throw error;
    }
  }

  // Deserialization helpers to convert date strings back to Date objects
  private deserializeProfile(data: any): StudentProfileDB {
    if (data.profile) {
      data.profile.createdAt = new Date(data.profile.createdAt);
      data.profile.lastActive = new Date(data.profile.lastActive);
    }
    if (data.analytics) {
      data.analytics.lastUpdated = new Date(data.analytics.lastUpdated);
      if (data.analytics.performanceTrends) {
        data.analytics.performanceTrends = data.analytics.performanceTrends.map((trend: any) => ({
          ...trend,
          date: new Date(trend.date)
        }));
      }
    }
    return data;
  }

  private deserializeSessionHistory(data: any): SessionHistoryDB {
    Object.keys(data.sessions).forEach(sessionId => {
      const session = data.sessions[sessionId];
      session.startTime = new Date(session.startTime);
      if (session.endTime) session.endTime = new Date(session.endTime);
      if (session.conversationHistory) {
        session.conversationHistory = session.conversationHistory.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    });
    return data;
  }

  private deserializeStudyPlans(data: any): StudyPlanDB {
    Object.keys(data.plans).forEach(planId => {
      const plan = data.plans[planId];
      plan.createdAt = new Date(plan.createdAt);
      plan.targetDate = new Date(plan.targetDate);
      if (plan.goals) {
        plan.goals = plan.goals.map((goal: any) => ({
          ...goal,
          targetDate: new Date(goal.targetDate),
          achievedDate: goal.achievedDate ? new Date(goal.achievedDate) : undefined
        }));
      }
      if (plan.milestones) {
        plan.milestones = plan.milestones.map((milestone: any) => ({
          ...milestone,
          targetDate: new Date(milestone.targetDate),
          achievedDate: milestone.achievedDate ? new Date(milestone.achievedDate) : undefined
        }));
      }
    });
    return data;
  }

  private deserializeSessionStates(data: any): SessionStateDB {
    Object.keys(data.states).forEach(sessionId => {
      const state = data.states[sessionId];
      state.lastActivity = new Date(state.lastActivity);
      if (state.conversationHistory) {
        state.conversationHistory = state.conversationHistory.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    });
    return data;
  }

  // Format conversion helpers
  private convertToCSV(data: any): string {
    let csv = 'Type,Date,Value,Details\n';
    
    // Add session data
    Object.values(data.sessions.sessions).forEach((session: any) => {
      csv += `Session,${session.startTime},${session.performance.masteryScore},"${session.summary}"\n`;
    });
    
    return csv;
  }

  private convertToText(data: any): string {
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
  createDefaultProfile(studentId: string = 'default'): StudentProfileDB {
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
        learningStyle: LearningStyle.ANALYTICAL,
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

// Singleton instance for global access
export const dataStorage = new LocalStorageManager();