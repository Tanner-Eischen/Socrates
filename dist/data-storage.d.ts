import { StudentProfileDB, SessionHistoryDB, StudyPlanDB, SessionStateDB, SessionState } from './types';
export declare class LocalStorageManager {
    private dataPath;
    private encryptionEnabled;
    constructor(dataDirectory?: string, enableEncryption?: boolean);
    initialize(): Promise<void>;
    saveStudentProfile(profile: StudentProfileDB): Promise<void>;
    loadStudentProfile(): Promise<StudentProfileDB | null>;
    saveSessionHistory(history: SessionHistoryDB): Promise<void>;
    loadSessionHistory(): Promise<SessionHistoryDB>;
    saveStudyPlans(plans: StudyPlanDB): Promise<void>;
    loadStudyPlans(): Promise<StudyPlanDB>;
    saveSessionState(sessionId: string, state: SessionState): Promise<void>;
    saveSessionState(state: SessionState): Promise<void>;
    loadSessionStates(): Promise<SessionStateDB>;
    loadSessionState(sessionId: string): Promise<SessionState | null>;
    getResumableSessions(): Promise<SessionState[]>;
    clearOldSessionStates(maxAgeHours?: number): Promise<void>;
    exportData(format?: 'json' | 'csv' | 'txt'): Promise<string>;
    createBackup(): Promise<string>;
    private encrypt;
    private decrypt;
    private deserializeProfile;
    private deserializeSessionHistory;
    private deserializeStudyPlans;
    private deserializeSessionStates;
    private convertToCSV;
    private convertToText;
    createDefaultProfile(studentId?: string): StudentProfileDB;
}
export declare const dataStorage: LocalStorageManager;
//# sourceMappingURL=data-storage.d.ts.map